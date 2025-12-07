/**
 * Unified Reranking Module
 *
 * Provides a consistent interface for reranking documents using different providers:
 * - Cohere Rerank (primary) - Direct API
 * - Pinecone Inference Rerank (fallback) - Multiple models available:
 *   - pinecone-rerank-v0: Pinecone's native model (fastest)
 *   - cohere-rerank-3.5: Cohere hosted on Pinecone
 *   - bge-reranker-v2-m3: Open-source multilingual
 * - None (passthrough for testing/comparison)
 *
 * Features:
 * - Automatic fallback chain on failure
 * - Multiple Pinecone model support
 * - Detailed timing metrics
 * - Cost estimation
 * - Provider abstraction
 * - Health check capabilities
 * - Circuit breaker pattern for failing providers
 * - Structured logging for observability
 *
 * Production Configuration:
 * - Cohere timeout: 10,000ms
 * - Pinecone timeout: 8,000ms
 * - Max retries: 3 (Cohere), 2 (Pinecone)
 * - Exponential backoff: 500ms initial, max 5,000ms
 * - Circuit breaker: 5 failures, 60s reset
 *
 * 💭 ➡️ 📈
 */

import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2';
import {
  cohereRerank,
  CohereError,
  estimateCohereRerankCost,
  type CohereRerankModel,
  type CohereDocument,
} from './cohere.ts';
import {
  pineconeInferenceRerank,
  PineconeInferenceError,
  estimatePineconeRerankCost,
  checkPineconeRerankHealth,
  type PineconeRerankModel,
  PINECONE_RERANK_MODELS,
} from './pinecone-inference.ts';

// ============================================
// CIRCUIT BREAKER
// ============================================

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 failures
const CIRCUIT_BREAKER_RESET_MS = 60000; // Reset after 60 seconds

// Circuit breaker state per provider
const circuitBreakers: Map<RerankProvider, CircuitBreakerState> = new Map();

/**
 * Check if circuit breaker allows a request to the provider
 */
function isCircuitOpen(provider: RerankProvider): boolean {
  const state = circuitBreakers.get(provider);
  if (!state) return false;

  // Check if we should reset the circuit
  if (state.isOpen && Date.now() - state.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
    state.isOpen = false;
    state.failures = 0;
    logStructured('info', 'circuit_breaker_reset', { provider });
    return false;
  }

  return state.isOpen;
}

/**
 * Record a failure for circuit breaker
 */
function recordFailure(provider: RerankProvider, error: string): void {
  let state = circuitBreakers.get(provider);
  if (!state) {
    state = { failures: 0, lastFailure: 0, isOpen: false };
    circuitBreakers.set(provider, state);
  }

  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.isOpen = true;
    logStructured('warn', 'circuit_breaker_opened', {
      provider,
      failures: state.failures,
      error,
    });
  }
}

/**
 * Record a success for circuit breaker (resets failure count)
 */
function recordSuccess(provider: RerankProvider): void {
  const state = circuitBreakers.get(provider);
  if (state) {
    state.failures = 0;
    state.isOpen = false;
  }
}

// ============================================
// STRUCTURED LOGGING
// ============================================

interface LogContext {
  provider?: RerankProvider;
  model?: string;
  query_length?: number;
  doc_count?: number;
  latency_ms?: number;
  error?: string;
  fallback_used?: boolean;
  attempt?: number;
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured logging for rerank operations
 * Outputs JSON for easy parsing by logging systems
 */
function logStructured(
  level: LogLevel,
  event: string,
  context: LogContext = {}
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'rerank',
    event,
    ...context,
  };

  const logFn = level === 'error' ? console.error :
                level === 'warn' ? console.warn :
                level === 'debug' ? console.debug : console.log;

  logFn(JSON.stringify(logEntry));
}

// ============================================
// TYPES
// ============================================

/**
 * Available rerank providers
 * - cohere: Direct Cohere API (best quality, requires API key)
 * - pinecone: Pinecone Inference API (multiple models, single API)
 * - pinecone-cohere: Cohere model hosted on Pinecone
 * - pinecone-bge: BGE model hosted on Pinecone
 * - none: No reranking (passthrough)
 */
export type RerankProvider = 'cohere' | 'pinecone' | 'pinecone-cohere' | 'pinecone-bge' | 'none';

export interface RerankDocument {
  id: string;
  text: string;
  score: number; // Original semantic score
  metadata?: Record<string, unknown>;
}

export interface RankedDocument {
  id: string;
  text: string;
  semantic_score: number;
  rerank_score: number;
  final_score: number; // Combined score
  rank: number; // Position after reranking (1-based)
  original_rank: number; // Position before reranking (1-based)
  rank_change: number; // Positive = moved up, negative = moved down
  metadata?: Record<string, unknown>;
}

export interface RerankOptions {
  top_n?: number;
  model?: CohereRerankModel;
  pinecone_model?: PineconeRerankModel;
  fallback?: boolean; // Whether to allow fallback providers (default: true)
  score_weight?: number; // Weight for rerank score vs semantic (default: 0.7 for rerank)
  provider?: RerankProvider; // Override default provider
}

// Default fallback chain: Cohere → Pinecone native → BGE → none
const DEFAULT_FALLBACK_CHAIN: RerankProvider[] = ['cohere', 'pinecone', 'pinecone-bge', 'none'];

export interface RerankResult {
  documents: RankedDocument[];
  provider_used: RerankProvider;
  fallback_used: boolean;
  timing: {
    total_ms: number;
    rerank_ms: number;
  };
  cost_estimate?: {
    cohere_usd: number;
  };
  error?: string; // Present if fallback was used due to error
  metrics?: {
    providers_tried: RerankProvider[];
    circuit_breaker_skipped: RerankProvider[];
    retry_count: number;
  };
}

export interface RerankConfig {
  cohere_api_key?: string;
  pinecone_client?: Pinecone;          // Pinecone SDK client (preferred)
  pinecone_api_key?: string;           // Fallback: API key for REST calls
  pinecone_host?: string;              // Fallback: Custom host (deprecated)
  default_provider?: RerankProvider;
  default_model?: CohereRerankModel;
  pinecone_model?: PineconeRerankModel; // Model for Pinecone Inference
  fallback_chain?: RerankProvider[];    // Ordered fallback providers
}

// Re-export Pinecone model info for consumers
export { PINECONE_RERANK_MODELS, type PineconeRerankModel } from './pinecone-inference.ts';

// Export circuit breaker configuration for testing/debugging
export const CIRCUIT_BREAKER_CONFIG = {
  threshold: CIRCUIT_BREAKER_THRESHOLD,
  reset_ms: CIRCUIT_BREAKER_RESET_MS,
};

/**
 * Reset circuit breaker for a provider (for testing or manual recovery)
 */
export function resetCircuitBreaker(provider: RerankProvider): void {
  const state = circuitBreakers.get(provider);
  if (state) {
    state.failures = 0;
    state.isOpen = false;
    state.lastFailure = 0;
    logStructured('info', 'circuit_breaker_manual_reset', { provider });
  }
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear();
  logStructured('info', 'circuit_breaker_all_reset', {});
}

/**
 * Get circuit breaker status for a provider
 */
export function getCircuitBreakerStatus(provider: RerankProvider): {
  isOpen: boolean;
  failures: number;
  lastFailure: number;
  timeUntilReset: number;
} {
  const state = circuitBreakers.get(provider);
  if (!state) {
    return { isOpen: false, failures: 0, lastFailure: 0, timeUntilReset: 0 };
  }

  const timeUntilReset = state.isOpen
    ? Math.max(0, CIRCUIT_BREAKER_RESET_MS - (Date.now() - state.lastFailure))
    : 0;

  return {
    isOpen: state.isOpen,
    failures: state.failures,
    lastFailure: state.lastFailure,
    timeUntilReset,
  };
}

// ============================================
// RERANK IMPLEMENTATION
// ============================================

/**
 * Rerank documents using the specified provider with automatic fallback.
 *
 * @param query - The search query
 * @param documents - Documents to rerank (must have id, text, and score)
 * @param config - API keys and default settings
 * @param options - Per-request options
 * @returns Reranked documents with detailed metrics
 */
export async function rerank(
  query: string,
  documents: RerankDocument[],
  config: RerankConfig,
  options?: RerankOptions
): Promise<RerankResult> {
  const startTime = Date.now();
  const providersTried: RerankProvider[] = [];
  const circuitBreakerSkipped: RerankProvider[] = [];

  // Handle empty input
  if (!documents || documents.length === 0) {
    logStructured('debug', 'rerank_skip_empty', { doc_count: 0 });
    return {
      documents: [],
      provider_used: 'none',
      fallback_used: false,
      timing: { total_ms: 0, rerank_ms: 0 },
      metrics: { providers_tried: [], circuit_breaker_skipped: [], retry_count: 0 },
    };
  }

  const provider = options?.provider || config.default_provider || 'cohere';
  const allowFallback = options?.fallback !== false;
  const top_n = options?.top_n || Math.min(10, documents.length);
  const scoreWeight = options?.score_weight ?? 0.7; // 70% rerank, 30% semantic

  logStructured('debug', 'rerank_start', {
    provider,
    query_length: query.length,
    doc_count: documents.length,
    top_n,
  });

  // Store original ranks
  const docsWithOriginalRank = documents.map((doc, index) => ({
    ...doc,
    original_rank: index + 1,
  }));

  // If provider is 'none', skip reranking
  if (provider === 'none') {
    logStructured('info', 'rerank_passthrough', { reason: 'provider_none' });
    return createPassthroughResult(docsWithOriginalRank, top_n, startTime);
  }

  // Build fallback chain
  const fallbackChain = allowFallback
    ? config.fallback_chain || DEFAULT_FALLBACK_CHAIN
    : [provider];

  // Ensure primary provider is first
  const orderedProviders = [
    provider,
    ...fallbackChain.filter((p) => p !== provider && p !== 'none'),
  ];

  let lastError: string | undefined;
  let fallbackUsed = false;

  // Try providers in order
  for (const currentProvider of orderedProviders) {
    // Check circuit breaker
    if (isCircuitOpen(currentProvider)) {
      circuitBreakerSkipped.push(currentProvider);
      logStructured('warn', 'rerank_circuit_breaker_skip', { provider: currentProvider });
      continue;
    }

    providersTried.push(currentProvider);

    const result = await tryProvider(
      currentProvider,
      query,
      docsWithOriginalRank,
      config,
      options,
      top_n,
      scoreWeight
    );

    if (result.success) {
      recordSuccess(currentProvider);
      const costEstimate = getCostEstimate(currentProvider, options);

      logStructured('info', 'rerank_success', {
        provider: currentProvider,
        doc_count: documents.length,
        latency_ms: result.timing_ms,
        fallback_used: fallbackUsed,
      });

      return {
        documents: result.documents.slice(0, top_n),
        provider_used: currentProvider,
        fallback_used: fallbackUsed,
        timing: {
          total_ms: Date.now() - startTime,
          rerank_ms: result.timing_ms,
        },
        cost_estimate: costEstimate,
        error: lastError, // Include last error if fallback was used
        metrics: {
          providers_tried: providersTried,
          circuit_breaker_skipped: circuitBreakerSkipped,
          retry_count: providersTried.length - 1,
        },
      };
    }

    lastError = result.error;
    fallbackUsed = true;
    recordFailure(currentProvider, result.error || 'unknown');

    logStructured('warn', 'rerank_provider_failed', {
      provider: currentProvider,
      error: result.error,
      latency_ms: result.timing_ms,
    });
  }

  // All providers failed - passthrough
  logStructured('error', 'rerank_all_failed', {
    providers_tried: providersTried,
    circuit_breaker_skipped: circuitBreakerSkipped,
    error: lastError,
    latency_ms: Date.now() - startTime,
  });

  const result = createPassthroughResult(docsWithOriginalRank, top_n, startTime);
  result.error = lastError;
  result.fallback_used = true;
  result.metrics = {
    providers_tried: providersTried,
    circuit_breaker_skipped: circuitBreakerSkipped,
    retry_count: providersTried.length,
  };
  return result;
}

/**
 * Try a specific rerank provider
 */
async function tryProvider(
  provider: RerankProvider,
  query: string,
  documents: Array<RerankDocument & { original_rank: number }>,
  config: RerankConfig,
  options: RerankOptions | undefined,
  top_n: number,
  scoreWeight: number
): Promise<ProviderResult> {
  switch (provider) {
    case 'cohere':
      return tryCohereRerank(query, documents, config, options, scoreWeight);

    case 'pinecone':
      return tryPineconeInferenceRerank(
        query,
        documents,
        config,
        options?.pinecone_model || config.pinecone_model || 'pinecone-rerank-v0',
        top_n,
        scoreWeight
      );

    case 'pinecone-cohere':
      return tryPineconeInferenceRerank(
        query,
        documents,
        config,
        'cohere-rerank-3.5',
        top_n,
        scoreWeight
      );

    case 'pinecone-bge':
      return tryPineconeInferenceRerank(
        query,
        documents,
        config,
        'bge-reranker-v2-m3',
        top_n,
        scoreWeight
      );

    case 'none':
    default:
      return {
        success: false,
        documents: [],
        timing_ms: 0,
        error: `Provider ${provider} not supported`,
      };
  }
}

/**
 * Get cost estimate for a provider
 */
function getCostEstimate(
  provider: RerankProvider,
  options?: RerankOptions
): { cohere_usd: number } | undefined {
  if (provider === 'cohere') {
    return { cohere_usd: estimateCohereRerankCost(1, options?.model) };
  }
  if (provider.startsWith('pinecone')) {
    return { cohere_usd: estimatePineconeRerankCost(1) };
  }
  return undefined;
}

// ============================================
// PROVIDER IMPLEMENTATIONS
// ============================================

interface ProviderResult {
  success: boolean;
  documents: RankedDocument[];
  timing_ms: number;
  error?: string;
}

/**
 * Try to rerank using Cohere
 */
async function tryCohereRerank(
  query: string,
  documents: Array<RerankDocument & { original_rank: number }>,
  config: RerankConfig,
  options: RerankOptions | undefined,
  scoreWeight: number
): Promise<ProviderResult> {
  if (!config.cohere_api_key) {
    return {
      success: false,
      documents: [],
      timing_ms: 0,
      error: 'Cohere API key not configured',
    };
  }

  const startTime = Date.now();

  try {
    // Convert to Cohere format
    const cohereDocuments: CohereDocument[] = documents.map((doc) => ({
      text: doc.text,
      id: doc.id,
      original_score: doc.score,
    }));

    const result = await cohereRerank(
      config.cohere_api_key,
      query,
      cohereDocuments,
      {
        model: options?.model || config.default_model || 'rerank-v3.5',
        top_n: options?.top_n || documents.length, // Get all back to calculate rank changes
        return_documents: false,
      }
    );

    // Map results back to our format
    const rankedDocs: RankedDocument[] = result.results.map((r, newRank) => {
      const original = documents[r.index];
      const semanticScore = original.score;
      const rerankScore = r.relevance_score;

      // Combined score: weighted average
      const finalScore = scoreWeight * rerankScore + (1 - scoreWeight) * semanticScore;

      return {
        id: original.id,
        text: original.text,
        semantic_score: semanticScore,
        rerank_score: rerankScore,
        final_score: finalScore,
        rank: newRank + 1,
        original_rank: original.original_rank,
        rank_change: original.original_rank - (newRank + 1),
        metadata: original.metadata,
      };
    });

    return {
      success: true,
      documents: rankedDocs,
      timing_ms: result.timing_ms,
    };
  } catch (error) {
    const errorMessage =
      error instanceof CohereError
        ? `${error.type}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error';

    return {
      success: false,
      documents: [],
      timing_ms: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Try to rerank using Pinecone's Inference API with SDK or REST fallback
 */
async function tryPineconeInferenceRerank(
  query: string,
  documents: Array<RerankDocument & { original_rank: number }>,
  config: RerankConfig,
  model: PineconeRerankModel,
  top_n: number,
  scoreWeight: number
): Promise<ProviderResult> {
  // Check if we have either SDK client or API key
  if (!config.pinecone_client && !config.pinecone_api_key) {
    return {
      success: false,
      documents: [],
      timing_ms: 0,
      error: 'Pinecone rerank not configured (no client or API key)',
    };
  }

  const startTime = Date.now();

  try {
    // Prepare documents for Pinecone
    const pineconeDocuments = documents.map((d) => ({
      id: d.id,
      text: d.text,
    }));

    // Use SDK if available, otherwise use REST API
    let response;
    if (config.pinecone_client) {
      response = await pineconeInferenceRerank(
        config.pinecone_client,
        query,
        pineconeDocuments,
        {
          model,
          top_n: documents.length, // Get all back for proper ranking
          return_documents: false,
        }
      );
    } else {
      // Legacy REST API fallback (deprecated)
      return tryPineconeRerankRest(query, documents, config, model, top_n, scoreWeight, startTime);
    }

    // Map results to our format
    const rankedDocs: RankedDocument[] = response.results.map((r, newRank) => {
      const original = documents[r.index];
      const semanticScore = original.score;
      const rerankScore = r.score;
      const finalScore = scoreWeight * rerankScore + (1 - scoreWeight) * semanticScore;

      return {
        id: original.id,
        text: original.text,
        semantic_score: semanticScore,
        rerank_score: rerankScore,
        final_score: finalScore,
        rank: newRank + 1,
        original_rank: original.original_rank,
        rank_change: original.original_rank - (newRank + 1),
        metadata: original.metadata,
      };
    });

    return {
      success: true,
      documents: rankedDocs.slice(0, top_n),
      timing_ms: response.timing_ms,
    };
  } catch (error) {
    const errorMessage =
      error instanceof PineconeInferenceError
        ? `${error.type}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown Pinecone error';

    return {
      success: false,
      documents: [],
      timing_ms: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Legacy REST API fallback for Pinecone rerank (deprecated)
 * Used when Pinecone SDK client is not available
 */
async function tryPineconeRerankRest(
  query: string,
  documents: Array<RerankDocument & { original_rank: number }>,
  config: RerankConfig,
  model: PineconeRerankModel,
  top_n: number,
  scoreWeight: number,
  startTime: number
): Promise<ProviderResult> {
  if (!config.pinecone_api_key) {
    return {
      success: false,
      documents: [],
      timing_ms: 0,
      error: 'Pinecone API key not configured',
    };
  }

  try {
    // Use Pinecone Inference API directly
    const response = await fetch('https://api.pinecone.io/rerank', {
      method: 'POST',
      headers: {
        'Api-Key': config.pinecone_api_key,
        'Content-Type': 'application/json',
        'X-Pinecone-API-Version': '2024-10',
      },
      body: JSON.stringify({
        model,
        query,
        documents: documents.map((d) => ({ id: d.id, text: d.text })),
        top_n: documents.length, // Get all back
        return_documents: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        documents: [],
        timing_ms: Date.now() - startTime,
        error: `Pinecone rerank failed (${response.status}): ${errorText}`,
      };
    }

    const result = await response.json();

    // Map results
    const rankedDocs: RankedDocument[] = result.data.map(
      (r: { index: number; score?: number; relevance_score?: number }, newRank: number) => {
        const original = documents[r.index];
        const semanticScore = original.score;
        const rerankScore = r.score ?? r.relevance_score ?? 0;
        const finalScore = scoreWeight * rerankScore + (1 - scoreWeight) * semanticScore;

        return {
          id: original.id,
          text: original.text,
          semantic_score: semanticScore,
          rerank_score: rerankScore,
          final_score: finalScore,
          rank: newRank + 1,
          original_rank: original.original_rank,
          rank_change: original.original_rank - (newRank + 1),
          metadata: original.metadata,
        };
      }
    );

    return {
      success: true,
      documents: rankedDocs.slice(0, top_n),
      timing_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      documents: [],
      timing_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown Pinecone REST error',
    };
  }
}

/**
 * Create a passthrough result (no reranking, preserves original order)
 */
function createPassthroughResult(
  documents: Array<RerankDocument & { original_rank: number }>,
  top_n: number,
  startTime: number
): RerankResult {
  const rankedDocs: RankedDocument[] = documents.slice(0, top_n).map((doc, index) => ({
    id: doc.id,
    text: doc.text,
    semantic_score: doc.score,
    rerank_score: doc.score, // Use semantic score as rerank score
    final_score: doc.score,
    rank: index + 1,
    original_rank: doc.original_rank,
    rank_change: 0,
    metadata: doc.metadata,
  }));

  return {
    documents: rankedDocs,
    provider_used: 'none',
    fallback_used: false,
    timing: {
      total_ms: Date.now() - startTime,
      rerank_ms: 0,
    },
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate metrics about how much reranking changed the order
 */
export function calculateRerankMetrics(documents: RankedDocument[]): {
  total_documents: number;
  documents_moved: number;
  avg_rank_change: number;
  max_rank_up: number;
  max_rank_down: number;
  top_5_changed: boolean;
} {
  if (documents.length === 0) {
    return {
      total_documents: 0,
      documents_moved: 0,
      avg_rank_change: 0,
      max_rank_up: 0,
      max_rank_down: 0,
      top_5_changed: false,
    };
  }

  let moved = 0;
  let maxUp = 0;
  let maxDown = 0;
  let totalChange = 0;

  for (const doc of documents) {
    if (doc.rank_change !== 0) {
      moved++;
      totalChange += Math.abs(doc.rank_change);
      maxUp = Math.max(maxUp, doc.rank_change);
      maxDown = Math.min(maxDown, doc.rank_change);
    }
  }

  // Check if top 5 order changed
  const top5Changed = documents.slice(0, 5).some((doc) => doc.rank_change !== 0);

  return {
    total_documents: documents.length,
    documents_moved: moved,
    avg_rank_change: moved > 0 ? totalChange / moved : 0,
    max_rank_up: maxUp,
    max_rank_down: Math.abs(maxDown),
    top_5_changed: top5Changed,
  };
}

/**
 * Get the recommended fetch multiplier for a given target result count
 * Fetching more candidates before reranking generally improves quality
 */
export function getRecommendedFetchMultiplier(targetResults: number): number {
  // For small result sets, fetch more candidates
  if (targetResults <= 5) return 10;
  if (targetResults <= 10) return 5;
  if (targetResults <= 20) return 3;
  return 2;
}

/**
 * Determine optimal top_n based on use case
 */
export function getOptimalTopN(
  useCase: 'search' | 'rag' | 'recommendation',
  requested: number
): number {
  switch (useCase) {
    case 'rag':
      // For RAG, fewer high-quality results are better
      return Math.min(requested, 5);
    case 'recommendation':
      // For recommendations, diversity matters
      return Math.min(requested, 20);
    case 'search':
    default:
      // For search, user controls
      return requested;
  }
}

// ============================================
// HEALTH CHECK
// ============================================

export interface ProviderHealth {
  available: boolean;
  latency_ms: number;
  error?: string;
}

export interface RerankHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: Record<string, ProviderHealth>;
  primary_available: boolean;
  fallback_available: boolean;
  circuit_breakers: Record<string, {
    isOpen: boolean;
    failures: number;
    timeUntilReset: number;
  }>;
}

/**
 * Check health of all rerank providers
 */
export async function checkRerankHealth(config: RerankConfig): Promise<RerankHealthCheck> {
  const providers: Record<string, ProviderHealth> = {};

  // Check Cohere
  if (config.cohere_api_key) {
    const start = Date.now();
    try {
      const { checkCohereHealth } = await import('./cohere.ts');
      const health = await checkCohereHealth(config.cohere_api_key);
      providers['cohere'] = {
        available: health.healthy,
        latency_ms: health.latency_ms || Date.now() - start,
        error: health.error,
      };
    } catch (error) {
      providers['cohere'] = {
        available: false,
        latency_ms: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } else {
    providers['cohere'] = {
      available: false,
      latency_ms: -1,
      error: 'API key not configured',
    };
  }

  // Check Pinecone models
  if (config.pinecone_client) {
    const models: PineconeRerankModel[] = [
      'pinecone-rerank-v0',
      'cohere-rerank-3.5',
      'bge-reranker-v2-m3',
    ];

    for (const model of models) {
      const start = Date.now();
      try {
        const health = await checkPineconeRerankHealth(config.pinecone_client, model);
        providers[`pinecone-${model}`] = {
          available: health.healthy,
          latency_ms: health.latency_ms || Date.now() - start,
          error: health.error,
        };
      } catch (error) {
        providers[`pinecone-${model}`] = {
          available: false,
          latency_ms: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  } else if (config.pinecone_api_key) {
    // Try REST API health check
    providers['pinecone'] = {
      available: true, // Assume available if key is set
      latency_ms: -1,
      error: 'SDK not configured, REST fallback available',
    };
  } else {
    providers['pinecone'] = {
      available: false,
      latency_ms: -1,
      error: 'Not configured',
    };
  }

  // Calculate status
  const availableProviders = Object.values(providers).filter((p) => p.available);
  const primaryProvider = config.default_provider || 'cohere';
  const primaryAvailable = providers[primaryProvider]?.available || false;

  // Check if any fallback is available
  const fallbackChain = config.fallback_chain || DEFAULT_FALLBACK_CHAIN;
  const fallbackAvailable = fallbackChain.some(
    (p) => p !== primaryProvider && p !== 'none' && providers[p]?.available
  );

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (primaryAvailable && availableProviders.length >= 2) {
    status = 'healthy';
  } else if (availableProviders.length >= 1) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  // Collect circuit breaker status
  const circuitBreakerStatus: Record<string, { isOpen: boolean; failures: number; timeUntilReset: number }> = {};
  const providersToCheck: RerankProvider[] = ['cohere', 'pinecone', 'pinecone-cohere', 'pinecone-bge'];
  for (const p of providersToCheck) {
    const cbStatus = getCircuitBreakerStatus(p);
    circuitBreakerStatus[p] = {
      isOpen: cbStatus.isOpen,
      failures: cbStatus.failures,
      timeUntilReset: cbStatus.timeUntilReset,
    };
  }

  return {
    status,
    providers,
    primary_available: primaryAvailable,
    fallback_available: fallbackAvailable,
    circuit_breakers: circuitBreakerStatus,
  };
}

/**
 * Get available providers from config
 */
export function getAvailableProviders(config: RerankConfig): RerankProvider[] {
  const available: RerankProvider[] = [];

  if (config.cohere_api_key) {
    available.push('cohere');
  }

  if (config.pinecone_client || config.pinecone_api_key) {
    available.push('pinecone');
    available.push('pinecone-cohere');
    available.push('pinecone-bge');
  }

  available.push('none');

  return available;
}

