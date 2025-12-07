/**
 * Unified Query Pipeline
 *
 * Orchestrates all RAG query components into a single, configurable pipeline:
 * - Intent Detection
 * - Query Expansion
 * - Hybrid Search (Dense + Sparse)
 * - Reranking (Cohere / Pinecone)
 * - Recency Weighting
 *
 * Usage:
 *   import { executeQueryPipeline } from './_shared/query-pipeline.ts';
 *   const response = await executeQueryPipeline(request, context);
 *
 * 💭 ➡️ 📈
 */

import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2';
import OpenAI from 'https://esm.sh/openai@4';
import { loadConfig, type RAGConfig } from './config.ts';
import { isFeatureFlagEnabled } from './feature-flags.ts';
import { expandQuery, expandQuerySync } from './query-expansion.ts';
import { detectIntent, type DetectedIntent } from './intent-detection.ts';
import {
  generateSparseEmbedding,
  containsBoostKeywords,
  type SparseValues,
} from './sparse-embedding.ts';
import { getAlphaForDataType, autoTuneAlpha, DEFAULT_ALPHA } from './hybrid-search.ts';
import {
  rerank,
  calculateRerankMetrics,
  type RerankConfig,
  type RerankDocument,
  type RerankResult,
  type RerankProvider,
} from './rerank.ts';
import {
  type RecencyWeight,
  applyRecencyWeighting,
  type WeightedResult,
} from './recency.ts';

// ============================================
// TYPES
// ============================================

export interface QueryRequest {
  query: string;
  limit?: number;
  filters?: Record<string, unknown>;
  options?: Partial<QueryOptions>;
}

export interface QueryOptions {
  // Feature toggles (override global config)
  use_rerank: boolean;
  use_hybrid: boolean;
  use_expansion: boolean;
  use_recency: boolean;
  use_intent_detection: boolean;

  // Custom parameters
  alpha?: number;
  recency_weight?: RecencyWeight;
  rerank_top_n?: number;
  rerank_provider?: RerankProvider;
  fetch_multiplier?: number;

  // LLM options
  use_llm_expansion?: boolean;
  anthropic_api_key?: string;
}

export interface QueryContext {
  openai: OpenAI;
  pinecone: Pinecone;
  pinecone_index: string;
  cohere_api_key?: string;
  anthropic_api_key?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
  content?: string;
}

export interface PipelineStep {
  name: string;
  duration_ms: number;
  input_count?: number;
  output_count?: number;
  skipped?: boolean;
  skip_reason?: string;
  details?: Record<string, unknown>;
}

export interface QueryResponse {
  results: QueryResult[];
  metadata: {
    query_id: string;
    original_query: string;
    expanded_query?: string;
    detected_intent?: DetectedIntent;
    pipeline_steps: PipelineStep[];
    total_time_ms: number;
    config_used: Partial<RAGConfig>;
    features_enabled: string[];
  };
}

export interface QueryResult {
  id: string;
  score: number;
  semantic_score?: number;
  rerank_score?: number;
  recency_decay?: number;
  recency_boost?: number;
  age_days?: number;
  metadata: Record<string, unknown>;
  content?: string;
}

// ============================================
// MAIN PIPELINE
// ============================================

/**
 * Execute the unified query pipeline
 *
 * Pipeline order:
 * 1. Intent Detection (fast, pattern-based)
 * 2. Query Expansion (synonyms, related terms)
 * 3. Hybrid Retrieval (dense + sparse vectors)
 * 4. Reranking (Cohere or Pinecone)
 * 5. Recency Weighting (time decay + boost)
 * 6. Result formatting
 */
export async function executeQueryPipeline(
  request: QueryRequest,
  context: QueryContext
): Promise<QueryResponse> {
  const config = loadConfig();
  const startTime = Date.now();
  const pipelineSteps: PipelineStep[] = [];
  const queryId = crypto.randomUUID();

  const { query, limit = config.search.default_limit, filters, options } = request;

  // Build effective options (merge request options with config defaults)
  const effectiveOptions = buildEffectiveOptions(options, config);
  const featuresEnabled = getFeaturesEnabled(effectiveOptions);

  // Track inferred filters from intent detection
  let inferredFilters: Record<string, unknown> = {};
  let detectedIntent: DetectedIntent | undefined;

  // ===== STEP 1: Intent Detection =====
  if (effectiveOptions.use_intent_detection) {
    const intentStart = Date.now();
    try {
      detectedIntent = detectIntent(query);
      inferredFilters = detectedIntent.inferred_filters as Record<string, unknown>;

      pipelineSteps.push({
        name: 'intent_detection',
        duration_ms: Date.now() - intentStart,
        details: {
          intent_type: detectedIntent.intent_type,
          confidence: detectedIntent.confidence,
          filters_inferred: Object.keys(inferredFilters).length,
        },
      });
    } catch (error) {
      pipelineSteps.push({
        name: 'intent_detection',
        duration_ms: Date.now() - intentStart,
        skipped: true,
        skip_reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      });
    }
  } else {
    pipelineSteps.push({
      name: 'intent_detection',
      duration_ms: 0,
      skipped: true,
      skip_reason: 'Disabled in options',
    });
  }

  // Merge filters (user filters take precedence)
  const mergedFilters = { ...inferredFilters, ...filters };

  // ===== STEP 2: Query Expansion =====
  let expandedQuery = query;
  if (effectiveOptions.use_expansion) {
    const expansionStart = Date.now();
    try {
      if (effectiveOptions.use_llm_expansion && effectiveOptions.anthropic_api_key) {
        const expansion = await expandQuery(query, {
          useLLM: true,
          anthropicApiKey: effectiveOptions.anthropic_api_key,
        });
        expandedQuery = expansion.expanded;
        pipelineSteps.push({
          name: 'query_expansion',
          duration_ms: Date.now() - expansionStart,
          details: {
            method: 'llm',
            terms_added: expansion.synonyms.length + expansion.related_terms.length,
          },
        });
      } else {
        const expansion = expandQuerySync(query);
        expandedQuery = expansion.expanded;
        if (expansion.synonyms.length > 0 || expansion.related_terms.length > 0) {
          pipelineSteps.push({
            name: 'query_expansion',
            duration_ms: Date.now() - expansionStart,
            details: {
              method: 'rule-based',
              terms_added: expansion.synonyms.length + expansion.related_terms.length,
            },
          });
        } else {
          pipelineSteps.push({
            name: 'query_expansion',
            duration_ms: Date.now() - expansionStart,
            skipped: true,
            skip_reason: 'No expansion terms found',
          });
        }
      }
    } catch (error) {
      pipelineSteps.push({
        name: 'query_expansion',
        duration_ms: Date.now() - expansionStart,
        skipped: true,
        skip_reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      });
    }
  } else {
    pipelineSteps.push({
      name: 'query_expansion',
      duration_ms: 0,
      skipped: true,
      skip_reason: 'Disabled in options',
    });
  }

  // ===== STEP 3: Retrieval (Hybrid or Dense-only) =====
  const retrievalStart = Date.now();

  // Calculate how many results to fetch (over-fetch for reranking)
  const fetchMultiplier = effectiveOptions.use_rerank
    ? effectiveOptions.fetch_multiplier
    : 1;
  const retrievalLimit = Math.min(limit * fetchMultiplier, config.search.max_limit);

  let results: SearchResult[];
  let hybridInfo: Record<string, unknown> | undefined;

  try {
    if (effectiveOptions.use_hybrid) {
      const hybridResult = await executeHybridSearch(
        expandedQuery,
        context,
        retrievalLimit,
        mergedFilters,
        effectiveOptions,
        detectedIntent
      );
      results = hybridResult.results;
      hybridInfo = hybridResult.info;

      pipelineSteps.push({
        name: 'hybrid_retrieval',
        duration_ms: Date.now() - retrievalStart,
        input_count: 1,
        output_count: results.length,
        details: hybridInfo,
      });
    } else {
      results = await executeDenseSearch(
        expandedQuery,
        context,
        retrievalLimit,
        mergedFilters
      );

      pipelineSteps.push({
        name: 'dense_retrieval',
        duration_ms: Date.now() - retrievalStart,
        input_count: 1,
        output_count: results.length,
      });
    }
  } catch (error) {
    // Retrieval failure is critical
    throw new Error(`Retrieval failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // ===== STEP 4: Reranking =====
  if (effectiveOptions.use_rerank && results.length > 0) {
    const rerankStart = Date.now();
    try {
      const rerankResult = await executeReranking(
        query, // Use original query for reranking, not expanded
        results,
        context,
        effectiveOptions
      );

      results = rerankResult.results;
      const metrics = calculateRerankMetrics(
        rerankResult.result.documents.map((d) => ({
          ...d,
          id: d.id,
          text: d.text,
        }))
      );

      pipelineSteps.push({
        name: 'reranking',
        duration_ms: Date.now() - rerankStart,
        input_count: retrievalLimit,
        output_count: results.length,
        details: {
          provider: rerankResult.result.provider_used,
          fallback_used: rerankResult.result.fallback_used,
          documents_moved: metrics.documents_moved,
          avg_rank_change: Math.round(metrics.avg_rank_change * 10) / 10,
          top_5_changed: metrics.top_5_changed,
        },
      });
    } catch (error) {
      pipelineSteps.push({
        name: 'reranking',
        duration_ms: Date.now() - rerankStart,
        skipped: true,
        skip_reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      });
    }
  } else {
    pipelineSteps.push({
      name: 'reranking',
      duration_ms: 0,
      skipped: true,
      skip_reason: effectiveOptions.use_rerank ? 'No results to rerank' : 'Disabled in options',
    });
  }

  // ===== STEP 5: Recency Weighting =====
  let finalResults: QueryResult[];

  if (effectiveOptions.use_recency && results.length > 0) {
    const recencyStart = Date.now();
    try {
      const weighted = applyRecencyWeighting(
        results.map((r) => ({
          id: r.id,
          score: r.score,
          metadata: r.metadata || {},
        })),
        {
          apply_decay: true,
          apply_boost: true,
          recency_weight: effectiveOptions.recency_weight,
        }
      );

      finalResults = formatWeightedResults(weighted);

      pipelineSteps.push({
        name: 'recency_weighting',
        duration_ms: Date.now() - recencyStart,
        output_count: finalResults.length,
        details: {
          weight: effectiveOptions.recency_weight,
        },
      });
    } catch (error) {
      // Fall back to unweighted results
      finalResults = formatSearchResults(results);
      pipelineSteps.push({
        name: 'recency_weighting',
        duration_ms: Date.now() - recencyStart,
        skipped: true,
        skip_reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      });
    }
  } else {
    finalResults = formatSearchResults(results);
    pipelineSteps.push({
      name: 'recency_weighting',
      duration_ms: 0,
      skipped: true,
      skip_reason: 'Disabled or no results',
    });
  }

  // Limit final results
  finalResults = finalResults.slice(0, limit);

  return {
    results: finalResults,
    metadata: {
      query_id: queryId,
      original_query: query,
      expanded_query: expandedQuery !== query ? expandedQuery : undefined,
      detected_intent: detectedIntent,
      pipeline_steps: pipelineSteps,
      total_time_ms: Date.now() - startTime,
      config_used: {
        features: config.features,
        rerank: config.rerank,
        hybrid: config.hybrid,
      },
      features_enabled: featuresEnabled,
    },
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build effective options by merging request options with config defaults
 */
function buildEffectiveOptions(
  options: Partial<QueryOptions> | undefined,
  config: RAGConfig
): Required<Omit<QueryOptions, 'anthropic_api_key'>> & { anthropic_api_key?: string } {
  return {
    use_rerank: options?.use_rerank ?? config.features.rerank_enabled,
    use_hybrid: options?.use_hybrid ?? config.features.hybrid_search_enabled,
    use_expansion: options?.use_expansion ?? config.features.query_expansion_enabled,
    use_recency: options?.use_recency ?? config.features.recency_weighting_enabled,
    use_intent_detection: options?.use_intent_detection ?? true,
    alpha: options?.alpha,
    recency_weight: options?.recency_weight ?? 'normal',
    rerank_top_n: options?.rerank_top_n ?? config.rerank.top_n,
    rerank_provider: options?.rerank_provider ?? config.features.rerank_provider,
    fetch_multiplier: options?.fetch_multiplier ?? config.search.fetch_multiplier_for_rerank,
    use_llm_expansion: options?.use_llm_expansion ?? config.query_expansion.use_llm,
    anthropic_api_key: options?.anthropic_api_key,
  };
}

/**
 * Get list of enabled features
 */
function getFeaturesEnabled(options: ReturnType<typeof buildEffectiveOptions>): string[] {
  const features: string[] = [];
  if (options.use_rerank) features.push('rerank');
  if (options.use_hybrid) features.push('hybrid_search');
  if (options.use_expansion) features.push('query_expansion');
  if (options.use_recency) features.push('recency_weighting');
  if (options.use_intent_detection) features.push('intent_detection');
  if (options.use_llm_expansion) features.push('llm_expansion');
  return features;
}

/**
 * Execute hybrid search (dense + sparse)
 */
async function executeHybridSearch(
  query: string,
  context: QueryContext,
  limit: number,
  filters: Record<string, unknown>,
  options: ReturnType<typeof buildEffectiveOptions>,
  intent?: DetectedIntent
): Promise<{
  results: SearchResult[];
  info: Record<string, unknown>;
}> {
  const { openai, pinecone, pinecone_index } = context;
  const index = pinecone.index(pinecone_index);

  // Generate dense embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 3072,
  });
  const denseVector = embeddingResponse.data[0].embedding;

  // Generate sparse embedding
  const sparseStart = Date.now();
  const sparseResult = await generateSparseEmbedding(pinecone, query, { inputType: 'query' });
  const sparseTime = Date.now() - sparseStart;

  // Determine alpha
  let alpha: number;
  let alphaSource: 'explicit' | 'data_type' | 'auto_tuned' | 'default';
  let keywordBoostApplied = false;

  if (options.alpha !== undefined) {
    alpha = options.alpha;
    alphaSource = 'explicit';
  } else {
    // Check if we can infer data type from filters or intent
    const dataType =
      (filters?.data_type as string) ||
      (intent?.inferred_filters?.data_type as string[])?.[0];

    if (dataType) {
      alpha = getAlphaForDataType(dataType);
      alphaSource = 'data_type';
    } else {
      alpha = DEFAULT_ALPHA;
      alphaSource = 'default';
    }

    // Auto-tune if not explicit
    const originalAlpha = alpha;
    alpha = autoTuneAlpha(query, alpha);
    if (alpha !== originalAlpha) {
      alphaSource = 'auto_tuned';
      keywordBoostApplied = containsBoostKeywords(query);
    }
  }

  // Build query request
  const queryRequest: {
    vector: number[];
    sparseVector?: SparseValues;
    topK: number;
    filter?: Record<string, unknown>;
    includeMetadata: boolean;
  } = {
    vector: denseVector,
    topK: limit,
    includeMetadata: true,
  };

  if (sparseResult.sparse_values.indices.length > 0) {
    queryRequest.sparseVector = sparseResult.sparse_values;
  }

  if (Object.keys(filters).length > 0) {
    queryRequest.filter = buildPineconeFilter(filters);
  }

  // Execute query
  const searchResults = await index.query(queryRequest);

  const results: SearchResult[] = (searchResults.matches || []).map((match) => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata as Record<string, unknown> | undefined,
    content: (match.metadata?.content_preview as string) || undefined,
  }));

  return {
    results,
    info: {
      alpha_used: alpha,
      alpha_source: alphaSource,
      sparse_terms_count: sparseResult.sparse_values.indices.length,
      sparse_embedding_ms: sparseTime,
      keyword_boost_applied: keywordBoostApplied,
    },
  };
}

/**
 * Execute dense-only search
 */
async function executeDenseSearch(
  query: string,
  context: QueryContext,
  limit: number,
  filters: Record<string, unknown>
): Promise<SearchResult[]> {
  const { openai, pinecone, pinecone_index } = context;
  const index = pinecone.index(pinecone_index);

  // Generate dense embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 3072,
  });
  const denseVector = embeddingResponse.data[0].embedding;

  // Build query request
  const queryRequest: {
    vector: number[];
    topK: number;
    filter?: Record<string, unknown>;
    includeMetadata: boolean;
  } = {
    vector: denseVector,
    topK: limit,
    includeMetadata: true,
  };

  if (Object.keys(filters).length > 0) {
    queryRequest.filter = buildPineconeFilter(filters);
  }

  const searchResults = await index.query(queryRequest);

  return (searchResults.matches || []).map((match) => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata as Record<string, unknown> | undefined,
    content: (match.metadata?.content_preview as string) || undefined,
  }));
}

/**
 * Execute reranking
 */
async function executeReranking(
  query: string,
  results: SearchResult[],
  context: QueryContext,
  options: ReturnType<typeof buildEffectiveOptions>
): Promise<{
  results: SearchResult[];
  result: RerankResult;
}> {
  // Convert to rerank format
  const documents: RerankDocument[] = results.map((r) => ({
    id: r.id,
    text: r.content || (r.metadata?.content_preview as string) || '',
    score: r.score,
    metadata: r.metadata,
  }));

  // Build rerank config
  const rerankConfig: RerankConfig = {
    cohere_api_key: context.cohere_api_key,
    pinecone_client: context.pinecone,
    default_provider: options.rerank_provider,
    fallback_chain: ['cohere', 'pinecone', 'pinecone-bge', 'none'],
  };

  const rerankResult = await rerank(query, documents, rerankConfig, {
    top_n: options.rerank_top_n,
    fallback: true,
  });

  // Convert back to SearchResult format
  const rerankedResults: SearchResult[] = rerankResult.documents.map((d) => ({
    id: d.id,
    score: d.final_score,
    metadata: d.metadata,
    content: d.text,
  }));

  return {
    results: rerankedResults,
    result: rerankResult,
  };
}

/**
 * Build Pinecone filter from our filter format
 */
function buildPineconeFilter(
  filters: Record<string, unknown>
): Record<string, unknown> | undefined {
  const conditions: Record<string, unknown>[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value) && value.length > 0) {
      conditions.push({ [key]: { $in: value } });
    } else if (typeof value === 'object' && value !== null) {
      // Already a Pinecone filter expression
      conditions.push({ [key]: value });
    } else {
      conditions.push({ [key]: value });
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { $and: conditions };
}

/**
 * Format weighted results
 */
function formatWeightedResults(weighted: WeightedResult[]): QueryResult[] {
  return weighted.map((w) => ({
    id: w.id,
    score: w.final_score,
    semantic_score: w.semantic_score,
    recency_decay: Math.round(w.recency_decay * 1000) / 1000,
    recency_boost: w.recency_boost,
    age_days: Math.round(w.age_days * 10) / 10,
    metadata: w.metadata,
    content: w.metadata.content_preview as string | undefined,
  }));
}

/**
 * Format search results (no recency)
 */
function formatSearchResults(results: SearchResult[]): QueryResult[] {
  return results.map((r) => ({
    id: r.id,
    score: r.score,
    metadata: r.metadata || {},
    content: r.content,
  }));
}

