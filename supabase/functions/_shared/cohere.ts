/**
 * Cohere Rerank Client
 *
 * Provides reranking capabilities using Cohere's Rerank API.
 * Features:
 * - Exponential backoff retry logic
 * - Rate limit handling
 * - Timeout protection (10s max)
 * - Detailed error classification
 *
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export interface CohereDocument {
  text: string;
  [key: string]: unknown;
}

export interface CohereRerankResult {
  index: number;
  relevance_score: number;
  document?: CohereDocument;
}

export interface CohereRerankResponse {
  results: CohereRerankResult[];
  meta?: {
    api_version?: { version: string };
    billed_units?: { search_units: number };
  };
}

export interface CohereRerankOptions {
  model?: CohereRerankModel;
  top_n?: number;
  max_chunks_per_doc?: number;
  return_documents?: boolean;
}

export type CohereRerankModel =
  | 'rerank-v3.5'
  | 'rerank-english-v3.0'
  | 'rerank-multilingual-v3.0';

export type CohereErrorType =
  | 'rate_limit'
  | 'auth'
  | 'server'
  | 'timeout'
  | 'invalid_request'
  | 'unknown';

export class CohereError extends Error {
  type: CohereErrorType;
  statusCode?: number;
  retryable: boolean;

  constructor(
    message: string,
    type: CohereErrorType,
    statusCode?: number,
    retryable = false
  ) {
    super(message);
    this.name = 'CohereError';
    this.type = type;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

// ============================================
// CONSTANTS
// ============================================

const COHERE_API_URL = 'https://api.cohere.com/v2/rerank';
const DEFAULT_MODEL: CohereRerankModel = 'rerank-v3.5';
const DEFAULT_TOP_N = 10;
const MAX_DOCUMENTS = 100; // Cohere limit
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;
const REQUEST_TIMEOUT_MS = 10000;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Classify error type from HTTP response
 */
function classifyError(
  statusCode: number,
  responseBody?: string
): { type: CohereErrorType; retryable: boolean; message: string } {
  switch (statusCode) {
    case 401:
      return {
        type: 'auth',
        retryable: false,
        message: 'Invalid or missing Cohere API key',
      };
    case 429:
      return {
        type: 'rate_limit',
        retryable: true,
        message: 'Cohere rate limit exceeded',
      };
    case 400:
      return {
        type: 'invalid_request',
        retryable: false,
        message: responseBody || 'Invalid request to Cohere API',
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: 'server',
        retryable: true,
        message: `Cohere server error (${statusCode})`,
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
// MAIN RERANK FUNCTION
// ============================================

/**
 * Rerank documents using Cohere's Rerank API.
 *
 * @param apiKey - Cohere API key
 * @param query - The search query
 * @param documents - Array of documents to rerank (max 100)
 * @param options - Optional configuration
 * @returns Reranked results with relevance scores
 */
export async function cohereRerank(
  apiKey: string,
  query: string,
  documents: CohereDocument[],
  options?: CohereRerankOptions
): Promise<{
  results: CohereRerankResult[];
  timing_ms: number;
  model_used: CohereRerankModel;
  billed_units?: number;
}> {
  if (!apiKey) {
    throw new CohereError('Cohere API key is required', 'auth', undefined, false);
  }

  if (!query || query.trim().length === 0) {
    throw new CohereError('Query cannot be empty', 'invalid_request', undefined, false);
  }

  if (!documents || documents.length === 0) {
    throw new CohereError('Documents array cannot be empty', 'invalid_request', undefined, false);
  }

  if (documents.length > MAX_DOCUMENTS) {
    throw new CohereError(
      `Too many documents (${documents.length}). Maximum is ${MAX_DOCUMENTS}`,
      'invalid_request',
      undefined,
      false
    );
  }

  const model = options?.model || DEFAULT_MODEL;
  const top_n = Math.min(options?.top_n || DEFAULT_TOP_N, documents.length);
  const return_documents = options?.return_documents ?? false;

  const requestBody = {
    model,
    query,
    documents: documents.map((doc) => doc.text),
    top_n,
    return_documents,
    ...(options?.max_chunks_per_doc && {
      max_chunks_per_doc: options.max_chunks_per_doc,
    }),
  };

  const startTime = Date.now();
  let lastError: CohereError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(COHERE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        const errorInfo = classifyError(response.status, responseText);

        lastError = new CohereError(
          errorInfo.message,
          errorInfo.type,
          response.status,
          errorInfo.retryable
        );

        if (!errorInfo.retryable) {
          throw lastError;
        }

        console.warn(
          `Cohere rerank attempt ${attempt + 1} failed (${errorInfo.type}): ${errorInfo.message}`
        );

        if (attempt < MAX_RETRIES - 1) {
          const delay = calculateBackoffDelay(attempt);
          console.log(`Retrying in ${Math.round(delay)}ms...`);
          await sleep(delay);
          continue;
        }

        throw lastError;
      }

      const data: CohereRerankResponse = await response.json();
      const timing_ms = Date.now() - startTime;

      // Map results back with original document data
      const results: CohereRerankResult[] = data.results.map((result) => ({
        index: result.index,
        relevance_score: result.relevance_score,
        document: documents[result.index],
      }));

      console.log(
        `Cohere rerank completed: ${documents.length} docs → ${results.length} results in ${timing_ms}ms`
      );

      return {
        results,
        timing_ms,
        model_used: model,
        billed_units: data.meta?.billed_units?.search_units,
      };
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new CohereError(
          `Request timed out after ${REQUEST_TIMEOUT_MS}ms`,
          'timeout',
          undefined,
          true
        );

        if (attempt < MAX_RETRIES - 1) {
          const delay = calculateBackoffDelay(attempt);
          console.warn(`Cohere rerank timeout, retrying in ${Math.round(delay)}ms...`);
          await sleep(delay);
          continue;
        }
      }

      // Re-throw CohereErrors
      if (error instanceof CohereError) {
        throw error;
      }

      // Wrap unknown errors
      throw new CohereError(
        error instanceof Error ? error.message : 'Unknown error during reranking',
        'unknown',
        undefined,
        false
      );
    }
  }

  // Should not reach here, but just in case
  throw lastError || new CohereError('Rerank failed after all retries', 'unknown');
}

// ============================================
// COST ESTIMATION
// ============================================

/**
 * Estimate the cost of a Cohere rerank operation.
 * 
 * Pricing (as of Dec 2024):
 * - rerank-v3.5: $2 per 1000 searches
 * - Each search = 1 query + up to 100 documents
 */
export function estimateCohereRerankCost(
  searchCount: number,
  model: CohereRerankModel = 'rerank-v3.5'
): number {
  // All models currently have the same pricing
  const costPer1000 = 2.0;
  return (searchCount / 1000) * costPer1000;
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Check if Cohere API is accessible with the given key.
 * Uses a minimal rerank request to verify connectivity.
 */
export async function checkCohereHealth(apiKey: string): Promise<{
  healthy: boolean;
  latency_ms?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    await cohereRerank(apiKey, 'test query', [{ text: 'test document' }], {
      top_n: 1,
      model: 'rerank-v3.5',
    });

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

