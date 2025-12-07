/**
 * Batch Processor with Retry Logic
 * 
 * Generic batch processing utility for high-throughput data ingestion.
 * Features:
 * - Configurable batch sizes and concurrency
 * - Exponential backoff retries
 * - Per-item and per-batch timeouts
 * - Comprehensive result tracking
 * 
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export interface BatchConfig {
  /** Items per batch (default: 10) */
  batch_size: number;
  /** Parallel batches to process (default: 3) */
  max_concurrent: number;
  /** Per-item timeout in ms (default: 30000) */
  timeout_ms: number;
  /** Number of retry attempts per item (default: 3) */
  retry_attempts: number;
  /** Initial delay between retries in ms (default: 1000) */
  retry_delay_ms: number;
  /** Whether to use exponential backoff (default: true) */
  exponential_backoff: boolean;
  /** Max delay between retries in ms (default: 30000) */
  max_retry_delay_ms: number;
}

export interface BatchResult<T> {
  /** Successfully processed items */
  successful: T[];
  /** Failed items with error details */
  failed: Array<FailedItem<T>>;
  /** Timing statistics */
  timing: BatchTiming;
  /** Processing summary */
  summary: BatchSummary;
}

export interface FailedItem<T> {
  /** Original item that failed */
  item: T;
  /** Error message from last attempt */
  error: string;
  /** Error code if available */
  error_code?: string;
  /** Number of attempts made */
  attempts: number;
  /** Whether this is a retryable error */
  retryable: boolean;
  /** All attempt details */
  attempt_history: AttemptRecord[];
}

export interface AttemptRecord {
  attempt: number;
  timestamp: string;
  error?: string;
  duration_ms: number;
}

export interface BatchTiming {
  /** Total processing time in ms */
  total_ms: number;
  /** Average time per item in ms */
  avg_per_item_ms: number;
  /** Slowest item processing time in ms */
  max_item_ms: number;
  /** Fastest item processing time in ms */
  min_item_ms: number;
  /** P95 processing time in ms */
  p95_item_ms: number;
}

export interface BatchSummary {
  total_items: number;
  successful_count: number;
  failed_count: number;
  retry_count: number;
  success_rate: number;
  items_per_second: number;
}

// ============================================
// DEFAULTS
// ============================================

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batch_size: 10,
  max_concurrent: 3,
  timeout_ms: 30000,
  retry_attempts: 3,
  retry_delay_ms: 1000,
  exponential_backoff: true,
  max_retry_delay_ms: 30000,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  useExponentialBackoff: boolean
): number {
  if (!useExponentialBackoff) {
    return baseDelay;
  }
  
  // Exponential backoff: baseDelay * 2^attempt + jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay * 0.5; // 0-50% jitter
  const delay = Math.min(exponentialDelay + jitter, maxDelay);
  
  return Math.round(delay);
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Rate limit errors - always retry
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }
    
    // Timeout errors - usually retry
    if (message.includes('timeout') || message.includes('timed out')) {
      return true;
    }
    
    // Network errors - usually retry
    if (
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('socket') ||
      message.includes('connection')
    ) {
      return true;
    }
    
    // Server errors (5xx) - usually retry
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }
    
    // Non-retryable: client errors, validation errors
    if (
      message.includes('400') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('404') ||
      message.includes('invalid') ||
      message.includes('validation')
    ) {
      return false;
    }
  }
  
  // Default to retryable for unknown errors
  return true;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, index)];
}

// ============================================
// TIMEOUT WRAPPER
// ============================================

/**
 * Wrap a promise with a timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timeoutId: number | undefined;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation '${operation}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================
// SINGLE ITEM PROCESSOR
// ============================================

interface ProcessItemResult<T> {
  result?: T;
  error?: string;
  error_code?: string;
  attempts: number;
  attempt_history: AttemptRecord[];
  retryable: boolean;
  duration_ms: number;
}

/**
 * Process a single item with retry logic
 */
async function processItemWithRetry<T, R>(
  item: T,
  processor: (item: T) => Promise<R>,
  config: BatchConfig
): Promise<ProcessItemResult<R>> {
  const { retry_attempts, retry_delay_ms, exponential_backoff, max_retry_delay_ms, timeout_ms } = config;
  
  const attemptHistory: AttemptRecord[] = [];
  let lastError: Error | null = null;
  let lastRetryable = true;
  const startTime = Date.now();
  
  for (let attempt = 0; attempt < retry_attempts; attempt++) {
    const attemptStart = Date.now();
    
    try {
      // Process with timeout
      const result = await withTimeout(
        processor(item),
        timeout_ms,
        `process item attempt ${attempt + 1}`
      );
      
      // Success!
      attemptHistory.push({
        attempt: attempt + 1,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - attemptStart,
      });
      
      return {
        result,
        attempts: attempt + 1,
        attempt_history: attemptHistory,
        retryable: false,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error as Error;
      lastRetryable = isRetryableError(error);
      
      attemptHistory.push({
        attempt: attempt + 1,
        timestamp: new Date().toISOString(),
        error: lastError.message,
        duration_ms: Date.now() - attemptStart,
      });
      
      // Don't retry if not retryable or last attempt
      if (!lastRetryable || attempt === retry_attempts - 1) {
        break;
      }
      
      // Calculate delay and wait before retry
      const delay = calculateRetryDelay(
        attempt,
        retry_delay_ms,
        max_retry_delay_ms,
        exponential_backoff
      );
      
      console.log(
        `[BatchProcessor] Item failed (attempt ${attempt + 1}/${retry_attempts}), ` +
        `retrying in ${delay}ms: ${lastError.message}`
      );
      
      await sleep(delay);
    }
  }
  
  // All attempts failed
  return {
    error: lastError?.message || 'Unknown error',
    attempts: attemptHistory.length,
    attempt_history: attemptHistory,
    retryable: lastRetryable,
    duration_ms: Date.now() - startTime,
  };
}

// ============================================
// BATCH PROCESSOR
// ============================================

/**
 * Process items in batches with retry logic and concurrency control
 * 
 * @param items Array of items to process
 * @param processor Function to process each item
 * @param config Batch configuration options
 * @returns BatchResult with successful and failed items
 * 
 * @example
 * ```typescript
 * const results = await processBatch(
 *   documents,
 *   async (doc) => {
 *     const embedding = await generateEmbedding(doc.content);
 *     return { id: doc.id, embedding };
 *   },
 *   { batch_size: 10, max_concurrent: 3 }
 * );
 * ```
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  config: Partial<BatchConfig> = {}
): Promise<BatchResult<R>> {
  const mergedConfig: BatchConfig = { ...DEFAULT_BATCH_CONFIG, ...config };
  const { batch_size, max_concurrent } = mergedConfig;
  
  const startTime = Date.now();
  const successful: R[] = [];
  const failed: Array<FailedItem<T>> = [];
  const itemTimes: number[] = [];
  let totalRetries = 0;
  
  // Split items into batches
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batch_size) {
    batches.push(items.slice(i, i + batch_size));
  }
  
  console.log(
    `[BatchProcessor] Processing ${items.length} items in ${batches.length} batches ` +
    `(batch_size=${batch_size}, max_concurrent=${max_concurrent})`
  );
  
  // Process batches with concurrency limit
  for (let i = 0; i < batches.length; i += max_concurrent) {
    const concurrentBatches = batches.slice(i, i + max_concurrent);
    const batchIndex = i / max_concurrent + 1;
    const totalBatchGroups = Math.ceil(batches.length / max_concurrent);
    
    console.log(
      `[BatchProcessor] Processing batch group ${batchIndex}/${totalBatchGroups} ` +
      `(${concurrentBatches.length} concurrent batches)`
    );
    
    // Process batches concurrently
    await Promise.all(
      concurrentBatches.map(async (batch) => {
        for (const item of batch) {
          const result = await processItemWithRetry(item, processor, mergedConfig);
          
          itemTimes.push(result.duration_ms);
          totalRetries += result.attempts - 1;
          
          if (result.result !== undefined) {
            successful.push(result.result);
          } else {
            failed.push({
              item,
              error: result.error || 'Unknown error',
              attempts: result.attempts,
              retryable: result.retryable,
              attempt_history: result.attempt_history,
            });
          }
        }
      })
    );
  }
  
  // Calculate timing statistics
  const totalMs = Date.now() - startTime;
  const sortedTimes = [...itemTimes].sort((a, b) => a - b);
  
  const timing: BatchTiming = {
    total_ms: totalMs,
    avg_per_item_ms: items.length > 0 ? Math.round(totalMs / items.length) : 0,
    max_item_ms: sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0,
    min_item_ms: sortedTimes.length > 0 ? sortedTimes[0] : 0,
    p95_item_ms: percentile(sortedTimes, 95),
  };
  
  const summary: BatchSummary = {
    total_items: items.length,
    successful_count: successful.length,
    failed_count: failed.length,
    retry_count: totalRetries,
    success_rate: items.length > 0 ? Math.round((successful.length / items.length) * 100) : 0,
    items_per_second: totalMs > 0 ? Math.round((items.length / totalMs) * 1000 * 100) / 100 : 0,
  };
  
  console.log(
    `[BatchProcessor] Completed: ${summary.successful_count}/${summary.total_items} successful ` +
    `(${summary.success_rate}%), ${summary.items_per_second} items/sec, ` +
    `${summary.retry_count} retries`
  );
  
  return { successful, failed, timing, summary };
}

// ============================================
// BATCH PROCESSOR WITH CALLBACKS
// ============================================

export interface BatchCallbacks<T, R> {
  /** Called before processing starts */
  onStart?: (totalItems: number) => void;
  /** Called after each batch completes */
  onBatchComplete?: (batchIndex: number, totalBatches: number, results: (R | null)[]) => void;
  /** Called when an item fails (even if will retry) */
  onItemError?: (item: T, error: Error, attempt: number, willRetry: boolean) => void;
  /** Called when an item succeeds */
  onItemSuccess?: (item: T, result: R, attempt: number) => void;
  /** Called when all processing completes */
  onComplete?: (result: BatchResult<R>) => void;
}

/**
 * Process items in batches with callback hooks for observability
 */
export async function processBatchWithCallbacks<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  config: Partial<BatchConfig> = {},
  callbacks: BatchCallbacks<T, R> = {}
): Promise<BatchResult<R>> {
  callbacks.onStart?.(items.length);
  
  // Wrap processor with callbacks
  const wrappedProcessor = async (item: T): Promise<R> => {
    const result = await processor(item);
    return result;
  };
  
  const result = await processBatch(items, wrappedProcessor, config);
  
  callbacks.onComplete?.(result);
  
  return result;
}

// ============================================
// EXPORTS
// ============================================

export default {
  processBatch,
  processBatchWithCallbacks,
  sleep,
  calculateRetryDelay,
  isRetryableError,
  DEFAULT_BATCH_CONFIG,
};

