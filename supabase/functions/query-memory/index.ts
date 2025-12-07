/**
 * query-memory Edge Function
 *
 * Provides semantic search over the development memory stored in Pinecone.
 * Features:
 * - Query expansion (synonyms and related terms)
 * - Intent detection (infer filters from query)
 * - Query decomposition (RAG Fusion for complex queries)
 * - Recency weighting (time-decay scoring)
 * - Pinecone native rerank (pinecone-rerank-v0) for improved result ordering
 *
 * Endpoint: POST /functions/v1/query-memory
 *
 * Request Body:
 * {
 *   query: string           // Natural language query
 *   filters?: {
 *     data_type?: string[]  // Filter by data types
 *     source?: string[]     // Filter by sources
 *     project?: string      // Filter by project
 *     domain?: string[]     // Filter by domains
 *     action?: string[]     // Filter by actions
 *     status?: string[]     // Filter by statuses
 *     date_from?: string    // ISO date (YYYY-MM-DD)
 *     date_to?: string      // ISO date (YYYY-MM-DD)
 *     entities?: string[]   // Must contain any of these
 *   }
 *   top_k?: number          // Number of results (default: 10)
 *   include_content?: boolean // Include full content (default: false)
 *   enhance?: {
 *     expand?: boolean      // Enable query expansion (default: true)
 *     detect_intent?: boolean // Enable intent detection (default: true)
 *     decompose?: boolean   // Enable query decomposition (default: false)
 *     use_llm?: boolean     // Use LLM for enhancement (default: false)
 *   }
 *   recency?: {
 *     weight?: 'none' | 'light' | 'normal' | 'heavy' | 'critical'
 *                           // How much to weight recent results (default: 'normal')
 *     apply_decay?: boolean  // Apply time-decay (default: true)
 *     apply_boost?: boolean  // Apply boost for very recent docs (default: true)
 *   }
 *   rerank?: {
 *     enabled?: boolean      // Enable reranking (default: true)
 *     provider?: 'cohere' | 'pinecone' | 'none' // Rerank provider (default: 'pinecone')
 *     model?: string         // Rerank model (default: 'rerank-v3.5')
 *     fetch_multiplier?: number // How many more to fetch before rerank (default: 5)
 *   }
 * }
 *
 * Response:
 * {
 *   results: QueryResult[]
 *   processing_time_ms: number
 *   enhancement_info?: { ... }
 *   recency_applied: boolean
 *   rerank_info?: {
 *     enabled: boolean
 *     provider_used: string
 *     documents_fetched: number
 *     documents_after_rerank: number
 *     timing_ms: number
 *     fallback_used: boolean
 *   }
 *   cost_estimate?: {
 *     cohere_rerank_usd: number
 *     openai_embed_usd: number
 *     total_usd: number
 *   }
 *   timing?: {
 *     embedding_ms: number
 *     pinecone_ms: number
 *     rerank_ms: number
 *     recency_ms: number
 *     total_ms: number
 *   }
 * }
 *
 * 💭 ➡️ 📈
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2';
import OpenAI from 'https://esm.sh/openai@4';
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { expandQuery, expandQuerySync } from '../_shared/query-expansion.ts';
import { detectIntent, mergeFilters, getAlphaForIntent } from '../_shared/intent-detection.ts';
import { loadConfig, getEnvironmentInfo } from '../_shared/config.ts';
import { checkSystemHealth, healthStatusToHttpCode, getHealthSummary, type HealthCheckContext } from '../_shared/health-check.ts';
import { getFeatureFlagSummary } from '../_shared/feature-flags.ts';
import {
  decomposeQuery,
  decomposeQuerySync,
  reciprocalRankFusion,
  type SearchResult,
} from '../_shared/query-decomposition.ts';
import {
  type RecencyWeight,
  applyRecencyWeighting,
  type WeightedResult,
} from '../_shared/recency.ts';
import {
  generateSparseEmbedding,
  containsBoostKeywords,
  type SparseValues,
} from '../_shared/sparse-embedding.ts';
import {
  getAlphaForDataType,
  autoTuneAlpha,
  DEFAULT_ALPHA,
} from '../_shared/hybrid-search.ts';
import {
  rerank,
  calculateRerankMetrics,
  getRecommendedFetchMultiplier,
  type RerankProvider,
  type RerankDocument,
  type RerankResult,
  type RerankConfig,
} from '../_shared/rerank.ts';
import { estimateCohereRerankCost, type CohereRerankModel } from '../_shared/cohere.ts';
import {
  metrics,
  createRequestContext,
  finalizeRequestContext,
  logInfo,
  logError,
  logDebug,
  flushMetrics,
  type RequestContext,
} from '../_shared/datadog-metrics.ts';

// ============================================
// TYPES
// ============================================

interface QueryFilters {
  data_type?: string[];
  source?: string[];
  project?: string;
  domain?: string[];
  action?: string[];
  status?: string[];
  date_from?: string;
  date_to?: string;
  entities?: string[];
  importance?: string[];
}

interface EnhanceOptions {
  expand?: boolean;
  detect_intent?: boolean;
  decompose?: boolean;
  use_llm?: boolean;
}

interface RecencyOptions {
  weight?: RecencyWeight;
  apply_decay?: boolean;
  apply_boost?: boolean;
}

interface RerankRequestOptions {
  enabled?: boolean;
  provider?: RerankProvider;
  model?: CohereRerankModel;
  fetch_multiplier?: number;
}

interface HybridOptions {
  enabled?: boolean;        // Enable hybrid search (default: true)
  alpha?: number;           // 0.0 (pure sparse) to 1.0 (pure dense)
  auto_tune?: boolean;      // Auto-tune alpha based on query (default: true)
}

interface QueryRequest {
  query: string;
  filters?: QueryFilters;
  top_k?: number;
  include_content?: boolean;
  enhance?: EnhanceOptions;
  recency?: RecencyOptions;
  rerank?: RerankRequestOptions;
  hybrid?: HybridOptions;   // Hybrid search options
}

interface TimingMetrics {
  embedding_ms: number;
  pinecone_ms: number;
  rerank_ms: number;
  recency_ms: number;
  total_ms: number;
}

interface CostEstimate {
  cohere_rerank_usd: number;
  openai_embed_usd: number;
  total_usd: number;
}

interface RerankInfo {
  enabled: boolean;
  provider_used: RerankProvider | string;
  documents_fetched: number;
  documents_after_rerank: number;
  timing_ms: number;
  fallback_used: boolean;
  rank_metrics?: {
    documents_moved: number;
    avg_rank_change: number;
    top_5_changed: boolean;
  };
}

interface QueryResult {
  id: string;
  score: number;                    // Final weighted score
  semantic_score?: number;          // Original Pinecone score (if recency applied)
  recency_decay?: number;           // Decay multiplier applied
  recency_boost?: number;           // Boost multiplier applied
  age_days?: number;                // Document age in days
  metadata: Record<string, unknown>;
  content?: string;
}

interface EnhancementInfo {
  expanded_query?: string;
  original_query: string;
  detected_intent?: string;
  intent_confidence?: number;
  sub_queries?: string[];
  inferred_filters?: Record<string, unknown>;
  expansion_terms?: string[];
}

interface HybridInfo {
  enabled: boolean;
  alpha_used: number;
  alpha_source: 'explicit' | 'data_type' | 'auto_tuned' | 'default';
  sparse_terms_count: number;
  keyword_boost_applied: boolean;
  sparse_embedding_ms: number;
}

// ============================================
// BUILD PINECONE FILTER
// ============================================

function buildPineconeFilter(
  userFilters?: QueryFilters,
  inferredFilters?: {
    data_type?: string[];
    source?: string[];
    status?: string[];
    importance?: string[];
    domain?: string[];
    time_range?: { start: string; end: string };
  }
): Record<string, unknown> | undefined {
  // Merge inferred filters with user filters (user takes precedence)
  const filters = {
    ...inferredFilters,
    ...userFilters,
  };

  if (!filters || Object.keys(filters).length === 0) return undefined;

  const conditions: Record<string, unknown>[] = [];

  if (filters.data_type?.length) {
    conditions.push({ data_type: { $in: filters.data_type } });
  }

  if (filters.source?.length) {
    conditions.push({ source: { $in: filters.source } });
  }

  if (userFilters?.project) {
    conditions.push({ project: userFilters.project });
  }

  if (filters.domain?.length) {
    conditions.push({ domain: { $in: filters.domain } });
  }

  if (userFilters?.action?.length) {
    conditions.push({ action: { $in: userFilters.action } });
  }

  if (filters.status?.length) {
    conditions.push({ status: { $in: filters.status } });
  }

  if (filters.importance?.length) {
    conditions.push({ importance: { $in: filters.importance } });
  }

  // Date filtering - handle both explicit dates and inferred time range
  let dateFrom = userFilters?.date_from;
  let dateTo = userFilters?.date_to;

  // If no explicit dates but we have inferred time range
  if (!dateFrom && !dateTo && inferredFilters?.time_range) {
    // Convert ISO timestamps to YYYY-MM-DD for session_date field
    dateFrom = inferredFilters.time_range.start.split('T')[0];
    dateTo = inferredFilters.time_range.end.split('T')[0];
  }

  if (dateFrom && dateTo) {
    conditions.push({
      $and: [{ session_date: { $gte: dateFrom } }, { session_date: { $lte: dateTo } }],
    });
  } else if (dateFrom) {
    conditions.push({ session_date: { $gte: dateFrom } });
  } else if (dateTo) {
    conditions.push({ session_date: { $lte: dateTo } });
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];

  return { $and: conditions };
}

// ============================================
// VALIDATE REQUEST
// ============================================

const VALID_RECENCY_WEIGHTS = ['none', 'light', 'normal', 'heavy', 'critical'];

function validateRequest(body: unknown): { valid: true; data: QueryRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const req = body as Record<string, unknown>;

  if (!req.query || typeof req.query !== 'string') {
    return { valid: false, error: 'Missing or invalid required field: query' };
  }

  if (req.query.trim().length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }

  if (req.query.length > 1000) {
    return { valid: false, error: 'Query too long (max 1000 characters)' };
  }

  const topK = req.top_k !== undefined ? Number(req.top_k) : 10;
  if (isNaN(topK) || topK < 1 || topK > 100) {
    return { valid: false, error: 'top_k must be between 1 and 100' };
  }

  // Parse enhance options with defaults
  const enhance = (req.enhance as EnhanceOptions) || {};
  const enhanceOptions: EnhanceOptions = {
    expand: enhance.expand !== false, // Default true
    detect_intent: enhance.detect_intent !== false, // Default true
    decompose: enhance.decompose === true, // Default false (more expensive)
    use_llm: enhance.use_llm === true, // Default false
  };

  // Parse recency options with defaults
  const recencyInput = (req.recency as RecencyOptions) || {};
  const recencyWeight = recencyInput.weight || 'normal';
  
  // Validate recency_weight if provided
  if (recencyWeight && !VALID_RECENCY_WEIGHTS.includes(recencyWeight)) {
    return { 
      valid: false, 
      error: `Invalid recency weight: ${recencyWeight}. Must be one of: ${VALID_RECENCY_WEIGHTS.join(', ')}` 
    };
  }

  const recencyOptions: RecencyOptions = {
    weight: recencyWeight as RecencyWeight,
    apply_decay: recencyInput.apply_decay !== false, // Default true
    apply_boost: recencyInput.apply_boost !== false, // Default true
  };

  // Parse rerank options with defaults
  const rerankInput = (req.rerank as RerankRequestOptions) || {};
  const rerankOptions: RerankRequestOptions = {
    enabled: rerankInput.enabled !== false, // Default true
    provider: rerankInput.provider || 'pinecone',  // Use Pinecone's native model (included with plan)
    model: rerankInput.model || 'pinecone-rerank-v0',
    fetch_multiplier: rerankInput.fetch_multiplier || 5,
  };

  // Validate rerank provider
  const validProviders = ['cohere', 'pinecone', 'none'];
  if (rerankOptions.provider && !validProviders.includes(rerankOptions.provider)) {
    return {
      valid: false,
      error: `Invalid rerank provider: ${rerankOptions.provider}. Must be one of: ${validProviders.join(', ')}`,
    };
  }

  // Validate fetch_multiplier
  if (rerankOptions.fetch_multiplier && (rerankOptions.fetch_multiplier < 1 || rerankOptions.fetch_multiplier > 10)) {
    return {
      valid: false,
      error: 'fetch_multiplier must be between 1 and 10',
    };
  }

  // Parse hybrid options with defaults
  const hybridInput = (req.hybrid as HybridOptions) || {};
  const hybridOptions: HybridOptions = {
    enabled: hybridInput.enabled !== false, // Default true
    alpha: hybridInput.alpha,               // Explicit alpha (optional)
    auto_tune: hybridInput.auto_tune !== false, // Default true
  };

  // Validate alpha if provided
  if (hybridOptions.alpha !== undefined && (hybridOptions.alpha < 0 || hybridOptions.alpha > 1)) {
    return {
      valid: false,
      error: 'hybrid.alpha must be between 0.0 and 1.0',
    };
  }

  return {
    valid: true,
    data: {
      query: req.query as string,
      filters: req.filters as QueryFilters | undefined,
      top_k: topK,
      include_content: Boolean(req.include_content),
      enhance: enhanceOptions,
      recency: recencyOptions,
      rerank: rerankOptions,
      hybrid: hybridOptions,
    },
  };
}

// ============================================
// SINGLE QUERY SEARCH (HYBRID ENABLED)
// ============================================

interface HybridSearchContext {
  pinecone: Pinecone;
  hybridOptions: HybridOptions;
  inferredDataType?: string;
}

interface HybridSearchMetrics {
  sparse_terms_count: number;
  sparse_embedding_ms: number;
  alpha_used: number;
  alpha_source: 'explicit' | 'data_type' | 'auto_tuned' | 'default';
  keyword_boost_applied: boolean;
}

async function searchPinecone(
  queryText: string,
  openai: OpenAI,
  pineconeIndex: ReturnType<Pinecone['index']>,
  filter: Record<string, unknown> | undefined,
  topK: number,
  hybridContext?: HybridSearchContext
): Promise<{ results: SearchResult[]; hybridMetrics?: HybridSearchMetrics }> {
  const useHybrid = hybridContext?.hybridOptions?.enabled !== false;
  let hybridMetrics: HybridSearchMetrics | undefined;

  // Generate dense embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: queryText,
    dimensions: 3072,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Build query request
  const queryRequest: {
    vector: number[];
    sparseVector?: SparseValues;
    topK: number;
    filter?: Record<string, unknown>;
    includeMetadata: boolean;
  } = {
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  };

  // Add filter if provided
  if (filter && Object.keys(filter).length > 0) {
    queryRequest.filter = filter;
  }

  // Generate sparse embedding if hybrid is enabled
  if (useHybrid && hybridContext?.pinecone) {
    const sparseStart = Date.now();
    const sparseResult = await generateSparseEmbedding(
      hybridContext.pinecone,
      queryText,
      { inputType: 'query' }
    );
    const sparseTime = Date.now() - sparseStart;

    // Determine alpha value
    let alpha: number;
    let alphaSource: 'explicit' | 'data_type' | 'auto_tuned' | 'default';
    let keywordBoostApplied = false;

    if (hybridContext.hybridOptions.alpha !== undefined) {
      // Explicit alpha provided
      alpha = hybridContext.hybridOptions.alpha;
      alphaSource = 'explicit';
    } else if (hybridContext.inferredDataType) {
      // Use data-type specific alpha
      alpha = getAlphaForDataType(hybridContext.inferredDataType);
      alphaSource = 'data_type';
    } else {
      // Use default
      alpha = DEFAULT_ALPHA;
      alphaSource = 'default';
    }

    // Auto-tune if enabled
    if (hybridContext.hybridOptions.auto_tune !== false && alphaSource !== 'explicit') {
      const originalAlpha = alpha;
      alpha = autoTuneAlpha(queryText, alpha);
      if (alpha !== originalAlpha) {
        alphaSource = 'auto_tuned';
        keywordBoostApplied = containsBoostKeywords(queryText);
      }
    }

    // Add sparse vector if available
    if (sparseResult.sparse_values.indices.length > 0) {
      queryRequest.sparseVector = sparseResult.sparse_values;
    }

    hybridMetrics = {
      sparse_terms_count: sparseResult.sparse_values.indices.length,
      sparse_embedding_ms: sparseTime,
      alpha_used: alpha,
      alpha_source: alphaSource,
      keyword_boost_applied: keywordBoostApplied,
    };
  }

  // Query Pinecone
  const searchResults = await pineconeIndex.query(queryRequest);

  const results = (searchResults.matches || []).map((match) => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata as Record<string, unknown> | undefined,
    content: match.metadata?.content_preview as string | undefined,
  }));

  return { results, hybridMetrics };
}

// ============================================
// ENHANCED QUERY PIPELINE
// ============================================

async function enhancedQuery(
  originalQuery: string,
  userFilters: QueryFilters | undefined,
  enhanceOptions: EnhanceOptions,
  openai: OpenAI,
  pineconeIndex: ReturnType<Pinecone['index']>,
  topK: number,
  applyRecency: boolean,
  anthropicApiKey?: string,
  hybridContext?: HybridSearchContext
): Promise<{
  results: SearchResult[];
  enhancementInfo: EnhancementInfo;
  hybridMetrics?: HybridSearchMetrics;
}> {
  const enhancementInfo: EnhancementInfo = {
    original_query: originalQuery,
  };

  // Step 1: Detect intent (fast, pattern-based)
  let inferredFilters: {
    data_type?: string[];
    source?: string[];
    status?: string[];
    importance?: string[];
    domain?: string[];
    time_range?: { start: string; end: string; description: string };
  } = {};

  if (enhanceOptions.detect_intent) {
    const intent = detectIntent(originalQuery);
    enhancementInfo.detected_intent = intent.intent_type;
    enhancementInfo.intent_confidence = intent.confidence;
    inferredFilters = intent.inferred_filters;

    if (Object.keys(intent.inferred_filters).length > 0) {
      enhancementInfo.inferred_filters = intent.inferred_filters as Record<string, unknown>;
    }
  }

  // Step 2: Expand query (can be sync or async)
  let searchQuery = originalQuery;
  if (enhanceOptions.expand) {
    if (enhanceOptions.use_llm && anthropicApiKey) {
      const expanded = await expandQuery(originalQuery, {
        useLLM: true,
        anthropicApiKey,
      });
      searchQuery = expanded.expanded;
      enhancementInfo.expanded_query = expanded.expanded;
      enhancementInfo.expansion_terms = [...expanded.synonyms, ...expanded.related_terms];
    } else {
      const expanded = expandQuerySync(originalQuery);
      searchQuery = expanded.expanded;
      if (expanded.synonyms.length > 0 || expanded.related_terms.length > 0) {
        enhancementInfo.expanded_query = expanded.expanded;
        enhancementInfo.expansion_terms = [...expanded.synonyms, ...expanded.related_terms];
      }
    }
  }

  // Step 3: Build combined filter
  const pineconeFilter = buildPineconeFilter(userFilters, inferredFilters);

  // Determine fetch count - fetch more if recency will re-rank
  const fetchCount = applyRecency ? Math.min(topK * 2, 100) : topK;

  // Step 4: Decompose query if requested
  if (enhanceOptions.decompose) {
    let decomposed;
    if (enhanceOptions.use_llm && anthropicApiKey) {
      decomposed = await decomposeQuery(searchQuery, {
        useLLM: true,
        anthropicApiKey,
      });
    } else {
      decomposed = decomposeQuerySync(searchQuery);
    }

    // If decomposed into multiple sub-queries, use RAG Fusion
    if (decomposed.sub_queries.length > 1) {
      enhancementInfo.sub_queries = decomposed.sub_queries;

      // Execute searches in parallel (pass hybrid context, collect metrics from first query)
      const searchResults = await Promise.all(
        decomposed.sub_queries.map((subQuery) =>
          searchPinecone(subQuery, openai, pineconeIndex, pineconeFilter, fetchCount, hybridContext)
        )
      );

      // Extract result sets for fusion
      const resultSets = searchResults.map(sr => sr.results);
      
      // Use hybrid metrics from the first query (they're all similar for the same query type)
      const hybridMetrics = searchResults[0]?.hybridMetrics;

      // Fuse results using RRF
      const fusedResults = reciprocalRankFusion(resultSets);

      // Convert back to SearchResult format (trim after recency if needed)
      const results: SearchResult[] = fusedResults.map((fr) => ({
        id: fr.id,
        score: fr.fused_score,
        metadata: fr.metadata,
        content: fr.content,
      }));

      return { results, enhancementInfo, hybridMetrics };
    }
  }

  // Step 5: Single query search (with hybrid support)
  const { results, hybridMetrics } = await searchPinecone(
    searchQuery, 
    openai, 
    pineconeIndex, 
    pineconeFilter, 
    fetchCount,
    hybridContext
  );

  return { results, enhancementInfo, hybridMetrics };
}

// ============================================
// FORMAT RESULTS WITH RECENCY
// ============================================

function formatResultsWithRecency(
  weightedResults: WeightedResult[],
  includeContent: boolean
): QueryResult[] {
  return weightedResults.map(result => ({
    id: result.id,
    score: result.final_score,
    semantic_score: result.semantic_score,
    recency_decay: Math.round(result.recency_decay * 1000) / 1000, // 3 decimal places
    recency_boost: result.recency_boost,
    age_days: Math.round(result.age_days * 10) / 10, // 1 decimal place
    metadata: result.metadata,
    content: includeContent ? (result.metadata.content_preview as string) : undefined,
  }));
}

// ============================================
// HEALTH CHECK HANDLER
// ============================================

async function handleHealthCheck(req: Request): Promise<Response> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
  const cohereApiKey = Deno.env.get('COHERE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const pineconeIndexName = Deno.env.get('PINECONE_INDEX') || 'prayermap-memory';

  // Build health check context
  const healthContext: HealthCheckContext = {};

  if (openaiApiKey) {
    healthContext.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  if (pineconeApiKey) {
    healthContext.pinecone = new Pinecone({ apiKey: pineconeApiKey });
  }

  if (cohereApiKey) {
    healthContext.cohere_api_key = cohereApiKey;
  }

  if (supabaseUrl && supabaseServiceKey) {
    healthContext.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  const health = await checkSystemHealth(healthContext);
  const httpCode = healthStatusToHttpCode(health.overall);

  // Log health check results
  console.log(`Health check: ${getHealthSummary(health)}`);

  return new Response(JSON.stringify(health), {
    status: httpCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // Health check endpoint
  if (url.pathname.endsWith('/health') || url.searchParams.get('health') === 'true') {
    return handleHealthCheck(req);
  }

  // Config endpoint (for debugging)
  if (url.pathname.endsWith('/config') || url.searchParams.get('config') === 'true') {
    const config = loadConfig();
    const envInfo = getEnvironmentInfo();
    const flagSummary = getFeatureFlagSummary();

    return jsonResponse({
      environment: envInfo,
      features: config.features,
      feature_flags: flagSummary,
      rerank: config.rerank,
      hybrid: config.hybrid,
      search: config.search,
    });
  }

  // Only allow POST for main endpoint
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  const startTime = Date.now();
  const requestContext = createRequestContext('rag-query');

  try {
    // Parse and validate request
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      await metrics.queryError('invalid_json');
      return errorResponse('Invalid JSON in request body', 400);
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      return errorResponse(validation.error, 400);
    }

    const { query, filters, top_k, include_content, enhance, recency, rerank: rerankOptions, hybrid: hybridOptions } = validation.data;

    // Initialize timing metrics
    const timing: TimingMetrics = {
      embedding_ms: 0,
      pinecone_ms: 0,
      rerank_ms: 0,
      recency_ms: 0,
      total_ms: 0,
    };

    // Determine if recency should be applied
    const recencyWeight = recency?.weight || 'normal';
    const applyDecay = recency?.apply_decay !== false;
    const applyBoost = recency?.apply_boost !== false;
    const shouldApplyRecency = recencyWeight !== 'none' && (applyDecay || applyBoost);

    // Determine if reranking should be applied
    const shouldRerank = rerankOptions?.enabled !== false;
    const rerankProvider = rerankOptions?.provider || 'cohere';
    const rerankModel = rerankOptions?.model || 'rerank-v3.5';
    const fetchMultiplier = rerankOptions?.fetch_multiplier || 5;

    // Determine if hybrid search should be applied
    const shouldUseHybrid = hybridOptions?.enabled !== false;

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const cohereApiKey = Deno.env.get('COHERE_API_KEY');
    const pineconeIndexName = Deno.env.get('PINECONE_INDEX') || 'prayermap-memory';
    const pineconeHost = Deno.env.get('PINECONE_HOST');

    if (!openaiApiKey) {
      return errorResponse('Missing OpenAI API key', 500);
    }
    if (!pineconeApiKey) {
      return errorResponse('Missing Pinecone API key', 500);
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const pinecone = new Pinecone({ apiKey: pineconeApiKey });
    const pineconeIndex = pinecone.index(pineconeIndexName);

    // Create hybrid search context if enabled
    const hybridContext: HybridSearchContext | undefined = shouldUseHybrid
      ? {
          pinecone,
          hybridOptions: hybridOptions || { enabled: true, auto_tune: true },
          // Infer data type from filters if available
          inferredDataType: filters?.data_type?.[0],
        }
      : undefined;

    // Calculate fetch count: fetch more candidates if reranking or recency will re-order
    const targetResults = top_k || 10;
    const baseFetchCount = shouldRerank
      ? Math.min(targetResults * fetchMultiplier, 100) // Reranking works best with more candidates
      : shouldApplyRecency
        ? Math.min(targetResults * 2, 100) // Recency needs some buffer
        : targetResults;

    // Execute enhanced query pipeline
    logInfo('Starting enhanced query pipeline', { 
      fetch_count: baseFetchCount, 
      target_results: targetResults, 
      hybrid_enabled: shouldUseHybrid 
    }, requestContext.traceId);
    
    const queryStartTime = Date.now();
    const { results: searchResults, enhancementInfo, hybridMetrics } = await enhancedQuery(
      query,
      filters,
      enhance || { expand: true, detect_intent: true, decompose: false, use_llm: false },
      openai,
      pineconeIndex,
      baseFetchCount, // Fetch more for reranking
      false, // Don't let enhancedQuery apply its own recency logic
      anthropicApiKey,
      hybridContext
    );
    timing.pinecone_ms = Date.now() - queryStartTime;
    
    // Emit embedding/search metrics
    await metrics.embeddingLatency(timing.pinecone_ms);
    if (hybridMetrics) {
      await metrics.hybridSearchAlpha(hybridMetrics.alpha_used, hybridMetrics.alpha_source);
      await metrics.sparseTermsCount(hybridMetrics.sparse_terms_count);
    }

    // Store original fetch count for metrics
    const documentsFetched = searchResults.length;

    // Initialize rerank info
    let rerankInfo: RerankInfo | undefined;
    let rerankResult: RerankResult | undefined;

    // Apply reranking if enabled
    let workingResults = searchResults;

    if (shouldRerank && documentsFetched > 0) {
      logDebug(`Applying ${rerankProvider} reranking to ${documentsFetched} documents`, {
        provider: rerankProvider,
        document_count: documentsFetched,
      }, requestContext.traceId);
      
      const rerankStartTime = Date.now();
      await metrics.rerankAttempt(rerankProvider);

      // Convert to rerank format
      const rerankDocuments: RerankDocument[] = searchResults.map((r) => ({
        id: r.id,
        text: (r.metadata?.content_preview as string) || (r.content as string) || '',
        score: r.score,
        metadata: r.metadata,
      }));

      // Build rerank config with Pinecone client for native reranking
      const rerankConfig: RerankConfig = {
        cohere_api_key: cohereApiKey,
        pinecone_client: pinecone,           // SDK client for Pinecone Inference
        pinecone_api_key: pineconeApiKey,    // Fallback for REST API
        pinecone_host: pineconeHost,         // Legacy (deprecated)
        default_provider: rerankProvider,
        default_model: rerankModel,
        fallback_chain: ['cohere', 'pinecone', 'pinecone-bge', 'none'],
      };

      try {
        rerankResult = await rerank(query, rerankDocuments, rerankConfig, {
          top_n: targetResults,
          model: rerankModel,
          fallback: true,
        });

        timing.rerank_ms = rerankResult.timing.rerank_ms;

        // Calculate rank metrics
        const rankMetrics = calculateRerankMetrics(rerankResult.documents);

        rerankInfo = {
          enabled: true,
          provider_used: rerankResult.provider_used,
          documents_fetched: documentsFetched,
          documents_after_rerank: rerankResult.documents.length,
          timing_ms: rerankResult.timing.rerank_ms,
          fallback_used: rerankResult.fallback_used,
          rank_metrics: {
            documents_moved: rankMetrics.documents_moved,
            avg_rank_change: Math.round(rankMetrics.avg_rank_change * 10) / 10,
            top_5_changed: rankMetrics.top_5_changed,
          },
        };

        // Convert reranked results back to SearchResult format
        workingResults = rerankResult.documents.map((d) => ({
          id: d.id,
          score: d.final_score,
          metadata: d.metadata,
          content: d.text,
        }));

        logInfo('Reranking complete', {
          documents_moved: rankMetrics.documents_moved,
          total_documents: documentsFetched,
          top_5_changed: rankMetrics.top_5_changed,
          provider: rerankResult.provider_used,
        }, requestContext.traceId);
        
        // Emit rerank metrics
        await metrics.rerankLatency(rerankResult.timing.rerank_ms, rerankResult.provider_used);
        await metrics.rerankSuccess(rerankResult.provider_used, rerankResult.documents.length);
        
        if (rerankResult.fallback_used) {
          await metrics.rerankFallback(rerankProvider, rerankResult.provider_used);
        }
      } catch (error) {
        // Reranking failed - continue without it
        logError('Reranking failed, using original results', error, undefined, requestContext.traceId);
        rerankInfo = {
          enabled: true,
          provider_used: 'none',
          documents_fetched: documentsFetched,
          documents_after_rerank: documentsFetched,
          timing_ms: Date.now() - rerankStartTime,
          fallback_used: true,
        };
      }
    } else if (shouldRerank) {
      // Reranking was requested but no documents to rerank
      rerankInfo = {
        enabled: true,
        provider_used: 'none',
        documents_fetched: 0,
        documents_after_rerank: 0,
        timing_ms: 0,
        fallback_used: false,
      };
    }

    // Apply recency weighting if enabled
    let formattedResults: QueryResult[];
    const recencyStartTime = Date.now();

    if (shouldApplyRecency && workingResults.length > 0) {
      console.log(
        `Applying recency weighting (weight: ${recencyWeight}, decay: ${applyDecay}, boost: ${applyBoost})...`
      );

      // Convert to PineconeResult format for recency module
      const pineconeResults = workingResults.map((r) => ({
        id: r.id,
        score: r.score,
        metadata: r.metadata || {},
      }));

      const weightedResults = applyRecencyWeighting(pineconeResults, {
        apply_decay: applyDecay,
        apply_boost: applyBoost,
        recency_weight: recencyWeight,
      });

      timing.recency_ms = Date.now() - recencyStartTime;

      // Trim to requested top_k after re-ranking
      const trimmedResults = weightedResults.slice(0, targetResults);
      formattedResults = formatResultsWithRecency(trimmedResults, include_content || false);
    } else {
      // No recency weighting - use current scores
      formattedResults = workingResults.slice(0, targetResults).map((r) => ({
        id: r.id,
        score: r.score,
        metadata: r.metadata || {},
        content: include_content ? r.content : undefined,
      }));
    }

    // If include_content is true and we want full content, fetch from Supabase
    if (include_content && supabaseUrl && supabaseServiceKey && formattedResults.length > 0) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const pineconeIds = formattedResults.map((r) => r.id);
      const { data: contentData } = await supabase
        .from('document_content')
        .select('pinecone_id, full_content')
        .in('pinecone_id', pineconeIds);

      if (contentData) {
        const contentMap = new Map(contentData.map((c) => [c.pinecone_id, c.full_content]));
        for (const result of formattedResults) {
          const fullContent = contentMap.get(result.id);
          if (fullContent) {
            result.content = fullContent;
          }
        }
      }
    }

    const processingTime = Date.now() - startTime;
    timing.total_ms = processingTime;

    // Emit query completion metrics
    await metrics.queryLatency(processingTime, [
      `data_type:${filters?.data_type?.[0] || 'all'}`,
      `rerank:${shouldRerank}`,
      `hybrid:${shouldUseHybrid}`,
    ]);
    await metrics.queryCount([`data_type:${filters?.data_type?.[0] || 'all'}`]);

    // Calculate cost estimate
    // OpenAI embedding: ~$0.00013 per 1K tokens (text-embedding-3-large)
    // Assuming ~100 tokens per query on average
    const openaiEmbedCost = 0.00013 * (100 / 1000);
    const cohereRerankCost = rerankInfo?.provider_used === 'cohere' ? estimateCohereRerankCost(1, rerankModel) : 0;

    const costEstimate: CostEstimate = {
      cohere_rerank_usd: Math.round(cohereRerankCost * 1000000) / 1000000, // 6 decimal places
      openai_embed_usd: Math.round(openaiEmbedCost * 1000000) / 1000000,
      total_usd: Math.round((cohereRerankCost + openaiEmbedCost) * 1000000) / 1000000,
    };

    // Build hybrid info for response
    const hybridInfo: HybridInfo | undefined = shouldUseHybrid && hybridMetrics
      ? {
          enabled: true,
          alpha_used: hybridMetrics.alpha_used,
          alpha_source: hybridMetrics.alpha_source,
          sparse_terms_count: hybridMetrics.sparse_terms_count,
          keyword_boost_applied: hybridMetrics.keyword_boost_applied,
          sparse_embedding_ms: hybridMetrics.sparse_embedding_ms,
        }
      : shouldUseHybrid
        ? {
            enabled: true,
            alpha_used: DEFAULT_ALPHA,
            alpha_source: 'default',
            sparse_terms_count: 0,
            keyword_boost_applied: false,
            sparse_embedding_ms: 0,
          }
        : undefined;

    // Finalize request context and flush metrics
    await finalizeRequestContext(requestContext, true, {
      results_count: formattedResults.length,
      processing_time_ms: processingTime,
      rerank_used: shouldRerank,
      hybrid_used: shouldUseHybrid,
    });

    return jsonResponse({
      results: formattedResults,
      total_count: formattedResults.length,
      processing_time_ms: processingTime,
      enhancement_info: enhancementInfo,
      recency_applied: shouldApplyRecency,
      recency_config: shouldApplyRecency
        ? {
            weight: recencyWeight,
            decay_applied: applyDecay,
            boost_applied: applyBoost,
          }
        : undefined,
      hybrid_info: hybridInfo,
      rerank_info: rerankInfo,
      timing,
      cost_estimate: costEstimate,
      trace_id: requestContext.traceId,
    });
  } catch (error) {
    logError('Unexpected error in query-memory', error, undefined, requestContext.traceId);
    await metrics.queryError(error instanceof Error ? error.name : 'unknown');
    await finalizeRequestContext(requestContext, false, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Internal server error', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});
