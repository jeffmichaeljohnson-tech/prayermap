/**
 * Alpha Calibration Edge Function
 *
 * Experimental endpoint for calibrating hybrid search alpha values.
 * This function runs controlled experiments to find optimal alpha
 * per data_type by measuring retrieval quality metrics.
 *
 * Endpoint: POST /functions/v1/alpha-calibration
 *
 * Request Body:
 * {
 *   action: 'sweep' | 'single' | 'report'
 *   data_type?: string          // For single sweep
 *   alpha?: number              // For single test
 *   query?: string              // Test query
 *   relevant_ids?: string[]     // Ground truth relevant document IDs
 * }
 *
 * 💭 ➡️ 📈
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2';
import OpenAI from 'https://esm.sh/openai@4';
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { generateSparseEmbedding } from '../_shared/sparse-embedding.ts';
import {
  DATA_TYPE_ALPHA,
  DEFAULT_ALPHA,
  autoTuneAlpha,
} from '../_shared/hybrid-search.ts';

// ============================================
// TYPES
// ============================================

interface CalibrationRequest {
  action: 'sweep' | 'single' | 'report' | 'test_query';
  data_type?: string;
  alpha?: number;
  query?: string;
  relevant_ids?: string[];
  alpha_values?: number[];
  top_k?: number;
}

interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

interface AlphaTestResult {
  alpha: number;
  mrr: number;                    // Mean Reciprocal Rank
  precision_at_5: number;         // Precision @ 5
  recall_at_10: number;           // Recall @ 10
  first_relevant_rank: number | null;
  ndcg: number;                   // Normalized Discounted Cumulative Gain
  results: string[];              // Top 5 result IDs
  timing_ms: number;
}

interface SweepResults {
  data_type: string;
  query: string;
  relevant_ids: string[];
  results: AlphaTestResult[];
  best_alpha: number;
  best_mrr: number;
  current_default: number;
  improvement_vs_default: number;
}

// ============================================
// METRICS CALCULATION
// ============================================

/**
 * Calculate Mean Reciprocal Rank
 */
function calculateMRR(resultIds: string[], relevantIds: string[]): number {
  for (let i = 0; i < resultIds.length; i++) {
    if (relevantIds.includes(resultIds[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Calculate Precision at K
 */
function calculatePrecisionAtK(resultIds: string[], relevantIds: string[], k: number): number {
  const topK = resultIds.slice(0, k);
  const relevant = topK.filter(id => relevantIds.includes(id)).length;
  return relevant / k;
}

/**
 * Calculate Recall at K
 */
function calculateRecallAtK(resultIds: string[], relevantIds: string[], k: number): number {
  if (relevantIds.length === 0) return 0;
  const topK = resultIds.slice(0, k);
  const relevant = topK.filter(id => relevantIds.includes(id)).length;
  return relevant / relevantIds.length;
}

/**
 * Calculate Normalized Discounted Cumulative Gain
 */
function calculateNDCG(resultIds: string[], relevantIds: string[], k: number): number {
  // Calculate DCG
  let dcg = 0;
  for (let i = 0; i < Math.min(k, resultIds.length); i++) {
    const relevance = relevantIds.includes(resultIds[i]) ? 1 : 0;
    dcg += relevance / Math.log2(i + 2); // i+2 because log2(1) = 0
  }

  // Calculate IDCG (ideal DCG - all relevant docs at top)
  let idcg = 0;
  for (let i = 0; i < Math.min(k, relevantIds.length); i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * Find first relevant result rank
 */
function findFirstRelevantRank(resultIds: string[], relevantIds: string[]): number | null {
  for (let i = 0; i < resultIds.length; i++) {
    if (relevantIds.includes(resultIds[i])) {
      return i + 1; // 1-indexed
    }
  }
  return null;
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

async function executeHybridSearch(
  pinecone: Pinecone,
  openai: OpenAI,
  indexName: string,
  query: string,
  alpha: number,
  topK: number,
  dataType?: string
): Promise<{ results: SearchResult[]; timing_ms: number }> {
  const startTime = Date.now();

  // Generate dense embedding
  const denseResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 3072,
  });
  const denseVector = denseResponse.data[0].embedding;

  // Generate sparse embedding
  const sparseResult = await generateSparseEmbedding(pinecone, query, { inputType: 'query' });

  // Build filter if data_type specified
  const filter = dataType ? { data_type: dataType } : undefined;

  // Execute query
  const index = pinecone.index(indexName);
  
  const queryRequest: {
    vector: number[];
    sparseVector?: { indices: number[]; values: number[] };
    topK: number;
    filter?: Record<string, unknown>;
    includeMetadata: boolean;
  } = {
    vector: denseVector,
    topK,
    includeMetadata: true,
  };

  if (sparseResult.sparse_values.indices.length > 0) {
    queryRequest.sparseVector = sparseResult.sparse_values;
  }

  if (filter) {
    queryRequest.filter = filter;
  }

  const searchResults = await index.query(queryRequest);

  const results: SearchResult[] = (searchResults.matches || []).map(match => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata as Record<string, unknown> | undefined,
  }));

  return {
    results,
    timing_ms: Date.now() - startTime,
  };
}

// ============================================
// ALPHA SWEEP
// ============================================

const DEFAULT_ALPHA_VALUES = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

async function runAlphaSweep(
  pinecone: Pinecone,
  openai: OpenAI,
  indexName: string,
  query: string,
  relevantIds: string[],
  dataType?: string,
  alphaValues: number[] = DEFAULT_ALPHA_VALUES,
  topK: number = 10
): Promise<SweepResults> {
  const results: AlphaTestResult[] = [];

  for (const alpha of alphaValues) {
    const { results: searchResults, timing_ms } = await executeHybridSearch(
      pinecone,
      openai,
      indexName,
      query,
      alpha,
      topK,
      dataType
    );

    const resultIds = searchResults.map(r => r.id);

    results.push({
      alpha,
      mrr: calculateMRR(resultIds, relevantIds),
      precision_at_5: calculatePrecisionAtK(resultIds, relevantIds, 5),
      recall_at_10: calculateRecallAtK(resultIds, relevantIds, 10),
      first_relevant_rank: findFirstRelevantRank(resultIds, relevantIds),
      ndcg: calculateNDCG(resultIds, relevantIds, 10),
      results: resultIds.slice(0, 5),
      timing_ms,
    });
  }

  // Find best alpha
  const bestResult = results.reduce((best, curr) => 
    curr.mrr > best.mrr ? curr : best
  );

  // Get current default for this data type
  const currentDefault = dataType ? (DATA_TYPE_ALPHA[dataType] ?? DEFAULT_ALPHA) : DEFAULT_ALPHA;
  const defaultResult = results.find(r => Math.abs(r.alpha - currentDefault) < 0.01);
  const defaultMRR = defaultResult?.mrr || 0;

  return {
    data_type: dataType || 'all',
    query,
    relevant_ids: relevantIds,
    results,
    best_alpha: bestResult.alpha,
    best_mrr: bestResult.mrr,
    current_default: currentDefault,
    improvement_vs_default: defaultMRR > 0 
      ? ((bestResult.mrr - defaultMRR) / defaultMRR) * 100 
      : 0,
  };
}

// ============================================
// TEST QUERY ANALYSIS
// ============================================

async function analyzeQuery(
  query: string,
  dataType?: string
): Promise<{
  query: string;
  data_type: string | null;
  base_alpha: number;
  auto_tuned_alpha: number;
  auto_tune_triggered: boolean;
  analysis: {
    has_boost_keywords: boolean;
    acronym_count: number;
    has_code_patterns: boolean;
    is_question: boolean;
  };
}> {
  const baseAlpha = dataType ? (DATA_TYPE_ALPHA[dataType] ?? DEFAULT_ALPHA) : DEFAULT_ALPHA;
  const autoTunedAlpha = autoTuneAlpha(query, baseAlpha);

  // Analyze query characteristics
  const acronyms = query.match(/\b[A-Z]{2,}\b/g) || [];
  const codePatterns = [
    /\.[a-z]{2,4}\b/i,
    /\w+\(\)/,
    /\w+\.\w+/,
    /[a-z]+_[a-z]+/i,
    /[a-z]+[A-Z][a-z]+/,
  ];
  const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which'];

  return {
    query,
    data_type: dataType || null,
    base_alpha: baseAlpha,
    auto_tuned_alpha: autoTunedAlpha,
    auto_tune_triggered: autoTunedAlpha !== baseAlpha,
    analysis: {
      has_boost_keywords: autoTunedAlpha < baseAlpha,
      acronym_count: acronyms.length,
      has_code_patterns: codePatterns.some(p => p.test(query)),
      is_question: questionWords.some(w => query.toLowerCase().startsWith(w)),
    },
  };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    const body: CalibrationRequest = await req.json();
    const { action } = body;

    // Initialize clients
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
    const pineconeIndexName = Deno.env.get('PINECONE_INDEX') || 'prayermap-memory';

    if (!openaiApiKey) {
      return errorResponse('Missing OpenAI API key', 500);
    }
    if (!pineconeApiKey) {
      return errorResponse('Missing Pinecone API key', 500);
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const pinecone = new Pinecone({ apiKey: pineconeApiKey });

    switch (action) {
      case 'sweep': {
        // Run alpha sweep for a query
        if (!body.query) {
          return errorResponse('Missing required field: query', 400);
        }
        if (!body.relevant_ids || body.relevant_ids.length === 0) {
          return errorResponse('Missing required field: relevant_ids (at least one)', 400);
        }

        const sweepResults = await runAlphaSweep(
          pinecone,
          openai,
          pineconeIndexName,
          body.query,
          body.relevant_ids,
          body.data_type,
          body.alpha_values || DEFAULT_ALPHA_VALUES,
          body.top_k || 10
        );

        return jsonResponse({
          action: 'sweep',
          ...sweepResults,
        });
      }

      case 'single': {
        // Test a single alpha value
        if (!body.query) {
          return errorResponse('Missing required field: query', 400);
        }
        if (body.alpha === undefined) {
          return errorResponse('Missing required field: alpha', 400);
        }

        const { results, timing_ms } = await executeHybridSearch(
          pinecone,
          openai,
          pineconeIndexName,
          body.query,
          body.alpha,
          body.top_k || 10,
          body.data_type
        );

        const resultIds = results.map(r => r.id);
        const relevantIds = body.relevant_ids || [];

        return jsonResponse({
          action: 'single',
          query: body.query,
          alpha: body.alpha,
          data_type: body.data_type || 'all',
          metrics: relevantIds.length > 0 ? {
            mrr: calculateMRR(resultIds, relevantIds),
            precision_at_5: calculatePrecisionAtK(resultIds, relevantIds, 5),
            recall_at_10: calculateRecallAtK(resultIds, relevantIds, 10),
            ndcg: calculateNDCG(resultIds, relevantIds, 10),
          } : null,
          results: results.slice(0, 10),
          timing_ms,
        });
      }

      case 'test_query': {
        // Analyze a query without searching
        if (!body.query) {
          return errorResponse('Missing required field: query', 400);
        }

        const analysis = await analyzeQuery(body.query, body.data_type);

        return jsonResponse({
          action: 'test_query',
          ...analysis,
        });
      }

      case 'report': {
        // Return current alpha configuration
        return jsonResponse({
          action: 'report',
          current_configuration: {
            default_alpha: DEFAULT_ALPHA,
            alpha_by_data_type: DATA_TYPE_ALPHA,
          },
          data_types: Object.keys(DATA_TYPE_ALPHA),
          recommendation: 'Run sweep tests for each data_type to find optimal values',
        });
      }

      default:
        return errorResponse(`Invalid action: ${action}. Use 'sweep', 'single', 'test_query', or 'report'.`, 400);
    }
  } catch (error) {
    console.error('Alpha calibration error:', error);
    return errorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

