/**
 * Pinecone Inference API Module
 *
 * Provides reranking and embedding capabilities using Pinecone's Inference API.
 * This is an alternative/fallback to direct Cohere integration.
 *
 * Available Rerank Models:
 * - pinecone-rerank-v0: Pinecone's native model (60% BEIR improvement)
 * - cohere-rerank-3.5: Cohere model hosted on Pinecone infrastructure
 * - bge-reranker-v2-m3: Open-source multilingual model
 *
 * Benefits:
 * - Single API for embed, search, and rerank
 * - Reduced latency (no external API call)
 * - Simpler billing (one vendor)
 * - Fallback redundancy
 *
 * 💭 ➡️ 📈
 */

import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2';

// ============================================
// TYPES
// ============================================

/**
 * Available rerank models via Pinecone Inference
 */
export type PineconeRerankModel =
  | 'pinecone-rerank-v0'    // Pinecone's native model
  | 'cohere-rerank-3.5'     // Cohere hosted on Pinecone
  | 'bge-reranker-v2-m3';   // Open-source BAAI model

/**
 * Document to be reranked
 */
export interface PineconeRerankDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result from reranking
 */
export interface PineconeRerankResult {
  id: string;
  index: number;
  score: number;
  document?: PineconeRerankDocument;
}

/**
 * Options for rerank request
 */
export interface PineconeRerankOptions {
  model?: PineconeRerankModel;
  top_n?: number;
  return_documents?: boolean;
  truncate?: 'END' | 'NONE';
}

/**
 * Response from Pinecone Inference rerank
 */
export interface PineconeRerankResponse {
  results: PineconeRerankResult[];
  model_used: PineconeRerankModel;
  timing_ms: number;
}

/**
 * Error from Pinecone Inference
 */
export class PineconeInferenceError extends Error {
  type: 'auth' | 'rate_limit' | 'invalid_request' | 'server' | 'timeout' | 'unknown';
  statusCode?: number;
  retryable: boolean;

  constructor(
    message: string,
    type: 'auth' | 'rate_limit' | 'invalid_request' | 'server' | 'timeout' | 'unknown',
    statusCode?: number,
    retryable = false
  ) {
    super(message);
    this.name = 'PineconeInferenceError';
    this.type = type;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Model characteristics for decision making
 */
export const PINECONE_RERANK_MODELS = {
  'pinecone-rerank-v0': {
    provider: 'pinecone',
    context_length: 512,  // tokens
    strengths: ['Speed', 'BEIR benchmark leader', 'Native integration'],
    weaknesses: ['English only', 'Newer model'],
    cost_per_1k: 0.002,   // $0.002 per 1000 queries
    latency_p50_ms: 50,
    multilingual: false,
  },
  'cohere-rerank-3.5': {
    provider: 'cohere',
    context_length: 4096,  // tokens - much longer!
    strengths: ['Multilingual', 'Long context', 'Battle-tested'],
    weaknesses: ['Slightly slower', 'Higher cost'],
    cost_per_1k: 0.002,
    latency_p50_ms: 80,
    multilingual: true,
  },
  'bge-reranker-v2-m3': {
    provider: 'baai',
    context_length: 512,
    strengths: ['Open source', 'Multilingual', 'Cheapest'],
    weaknesses: ['Lower accuracy than commercial models'],
    cost_per_1k: 0.002,
    latency_p50_ms: 60,
    multilingual: true,
  },
} as const;

const DEFAULT_MODEL: PineconeRerankModel = 'pinecone-rerank-v0';
const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 300;
const REQUEST_TIMEOUT_MS = 8000;

// Pinecone Inference API base URL
const INFERENCE_API_BASE = 'https://api.pinecone.io';

// ============================================
// HELPER FUNCTIONS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 0.2 * exponentialDelay;
  return exponentialDelay + jitter;
}

// ============================================
// MAIN RERANK FUNCTION (SDK-based)
// ============================================

/**
 * Rerank documents using Pinecone's Inference API via SDK
 *
 * @param pinecone - Initialized Pinecone client
 * @param query - The search query
 * @param documents - Documents to rerank
 * @param options - Rerank configuration
 * @returns Reranked results with scores
 */
export async function pineconeInferenceRerank(
  pinecone: Pinecone,
  query: string,
  documents: PineconeRerankDocument[],
  options: PineconeRerankOptions = {}
): Promise<PineconeRerankResponse> {
  const {
    model = DEFAULT_MODEL,
    top_n = Math.min(10, documents.length),
    return_documents = true,
    truncate = 'END',
  } = options;

  if (!query?.trim()) {
    throw new PineconeInferenceError('Query cannot be empty', 'invalid_request');
  }

  if (!documents || documents.length === 0) {
    return {
      results: [],
      model_used: model,
      timing_ms: 0,
    };
  }

  const startTime = Date.now();

  try {
    // Use Pinecone SDK inference.rerank method
    // Note: The SDK may not have rerank yet - fall back to REST if needed
    const response = await pinecone.inference.rerank(
      model,
      query,
      documents.map((d) => ({ id: d.id, text: d.text })),
      top_n,
      return_documents,
      { truncate }
    );

    const timing_ms = Date.now() - startTime;

    // Map response to our format
    const results: PineconeRerankResult[] = response.data.map((item: {
      index: number;
      score: number;
      document?: { id?: string; text?: string };
    }) => ({
      id: item.document?.id || documents[item.index].id,
      index: item.index,
      score: item.score,
      document: return_documents ? documents[item.index] : undefined,
    }));

    console.log(
      `Pinecone rerank (${model}): ${documents.length} docs → ${results.length} results in ${timing_ms}ms`
    );

    return {
      results,
      model_used: model,
      timing_ms,
    };
  } catch (sdkError) {
    // If SDK method doesn't exist or fails, fall back to REST API
    console.warn('Pinecone SDK rerank failed, trying REST API:', sdkError);
    return pineconeInferenceRerankRest(query, documents, options, startTime);
  }
}

// ============================================
// REST API FALLBACK
// ============================================

/**
 * Rerank documents using Pinecone's Inference REST API directly
 * Used as fallback when SDK method unavailable
 *
 * @param query - The search query
 * @param documents - Documents to rerank
 * @param options - Rerank configuration
 * @param startTime - Start time for timing
 * @returns Reranked results with scores
 */
async function pineconeInferenceRerankRest(
  query: string,
  documents: PineconeRerankDocument[],
  options: PineconeRerankOptions = {},
  startTime = Date.now()
): Promise<PineconeRerankResponse> {
  const {
    model = DEFAULT_MODEL,
    top_n = Math.min(10, documents.length),
    return_documents = true,
    truncate = 'END',
  } = options;

  const apiKey = Deno.env.get('PINECONE_API_KEY');
  if (!apiKey) {
    throw new PineconeInferenceError('PINECONE_API_KEY not configured', 'auth');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${INFERENCE_API_BASE}/rerank`, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          'X-Pinecone-API-Version': '2024-10',
        },
        body: JSON.stringify({
          model,
          query,
          documents: documents.map((d) => ({
            id: d.id,
            text: d.text,
          })),
          top_n,
          return_documents,
          parameters: { truncate },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const errorInfo = classifyPineconeError(response.status, errorText);

        if (!errorInfo.retryable || attempt >= MAX_RETRIES) {
          throw new PineconeInferenceError(
            errorInfo.message,
            errorInfo.type,
            response.status,
            errorInfo.retryable
          );
        }

        console.warn(`Pinecone rerank attempt ${attempt + 1} failed: ${errorInfo.message}`);
        await sleep(calculateBackoffDelay(attempt));
        continue;
      }

      const data = await response.json();
      const timing_ms = Date.now() - startTime;

      // Map response to our format
      const results: PineconeRerankResult[] = data.data.map(
        (item: { index: number; relevance_score?: number; score?: number; document?: { id?: string } }) => ({
          id: item.document?.id || documents[item.index].id,
          index: item.index,
          score: item.relevance_score ?? item.score ?? 0,
          document: return_documents ? documents[item.index] : undefined,
        })
      );

      console.log(
        `Pinecone rerank REST (${model}): ${documents.length} docs → ${results.length} results in ${timing_ms}ms`
      );

      return {
        results,
        model_used: model,
        timing_ms,
      };
    } catch (error) {
      if (error instanceof PineconeInferenceError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new PineconeInferenceError(
          `Request timed out after ${REQUEST_TIMEOUT_MS}ms`,
          'timeout',
          undefined,
          true
        );

        if (attempt < MAX_RETRIES) {
          console.warn(`Pinecone rerank timeout, retrying...`);
          await sleep(calculateBackoffDelay(attempt));
          continue;
        }
      }

      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
  }

  throw lastError || new PineconeInferenceError('Rerank failed after all retries', 'unknown');
}

/**
 * Classify error type from HTTP response
 */
function classifyPineconeError(
  statusCode: number,
  responseBody?: string
): { type: PineconeInferenceError['type']; retryable: boolean; message: string } {
  switch (statusCode) {
    case 401:
    case 403:
      return {
        type: 'auth',
        retryable: false,
        message: 'Invalid or missing Pinecone API key',
      };
    case 429:
      return {
        type: 'rate_limit',
        retryable: true,
        message: 'Pinecone rate limit exceeded',
      };
    case 400:
      return {
        type: 'invalid_request',
        retryable: false,
        message: responseBody || 'Invalid request to Pinecone API',
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: 'server',
        retryable: true,
        message: `Pinecone server error (${statusCode})`,
      };
    default:
      return {
        type: 'unknown',
        retryable: false,
        message: responseBody || `Unexpected error (${statusCode})`,
      };
  }
}

// ============================================
// MODEL SELECTION HELPERS
// ============================================

/**
 * Get the best model for a given use case
 */
export function recommendRerankModel(options: {
  needsMultilingual?: boolean;
  maxLatency?: number;
  contentLength?: 'short' | 'medium' | 'long';
}): PineconeRerankModel {
  const { needsMultilingual = false, maxLatency, contentLength = 'medium' } = options;

  // Long content needs Cohere's 4096 token context
  if (contentLength === 'long') {
    return 'cohere-rerank-3.5';
  }

  // Multilingual needs Cohere or BGE
  if (needsMultilingual) {
    // BGE is faster for strict latency requirements
    if (maxLatency && maxLatency < 70) {
      return 'bge-reranker-v2-m3';
    }
    return 'cohere-rerank-3.5';
  }

  // Default: Pinecone's native model (fastest, best for English)
  if (maxLatency && maxLatency < 60) {
    return 'pinecone-rerank-v0';
  }

  return 'pinecone-rerank-v0';
}

/**
 * Estimate cost for a rerank operation
 */
export function estimatePineconeRerankCost(
  queryCount: number,
  _model: PineconeRerankModel = 'pinecone-rerank-v0'
): number {
  // All Pinecone-hosted models currently have the same pricing
  const costPer1000 = 0.002;
  return (queryCount / 1000) * costPer1000;
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Check if a Pinecone rerank model is available
 */
export async function checkPineconeRerankHealth(
  pinecone: Pinecone,
  model: PineconeRerankModel = 'pinecone-rerank-v0'
): Promise<{
  healthy: boolean;
  latency_ms?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    await pineconeInferenceRerank(
      pinecone,
      'test query',
      [{ id: 'test', text: 'test document' }],
      { model, top_n: 1 }
    );

    return {
      healthy: true,
      latency_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      healthy: false,
      latency_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check health of all Pinecone rerank models
 */
export async function checkAllPineconeRerankHealth(
  pinecone: Pinecone
): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  models: Record<PineconeRerankModel, { available: boolean; latency_ms: number }>;
}> {
  const models: PineconeRerankModel[] = [
    'pinecone-rerank-v0',
    'cohere-rerank-3.5',
    'bge-reranker-v2-m3',
  ];

  const results = await Promise.all(
    models.map(async (model) => {
      const health = await checkPineconeRerankHealth(pinecone, model);
      return {
        model,
        available: health.healthy,
        latency_ms: health.latency_ms ?? -1,
      };
    })
  );

  const modelResults = Object.fromEntries(
    results.map((r) => [r.model, { available: r.available, latency_ms: r.latency_ms }])
  ) as Record<PineconeRerankModel, { available: boolean; latency_ms: number }>;

  const availableCount = results.filter((r) => r.available).length;
  const status = availableCount === models.length ? 'healthy' : availableCount >= 1 ? 'degraded' : 'unhealthy';

  return { status, models: modelResults };
}


