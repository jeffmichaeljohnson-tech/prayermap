/**
 * Resilience Patterns:
 * - Retry with exponential backoff
 * - Circuit breaker
 * - Timeout handling
 * - Fallback values
 * - Request deduplication
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error: Error) => {
      // Retry on network errors, timeouts, and server errors
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('fetch') ||
        message.includes('50') || // 500-level errors
        message.includes('429') // Rate limit
      );
    },
  };

  const finalConfig = { ...defaultConfig, ...config };
  let lastError: Error;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const shouldRetry =
        attempt < finalConfig.maxAttempts &&
        (!finalConfig.retryCondition || finalConfig.retryCondition(lastError));

      if (!shouldRetry) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelay
      );

      // Add jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      const finalDelay = delay + jitter;

      console.log(
        `Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${Math.round(finalDelay)}ms`,
        { error: lastError.message }
      );

      // Call retry callback
      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt, lastError);
      }

      // Wait before retrying
      await sleep(finalDelay);
    }
  }

  throw lastError!;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private lastFailure: number | null = null;
  private successCount = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000, // 1 minute
      halfOpenRequests: config.halfOpenRequests ?? 3,
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from open to half-open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - (this.lastFailure || 0);
      if (timeSinceLastFailure >= this.config.resetTimeout) {
        console.log('Circuit breaker: Transitioning to half-open');
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - requests blocked');
      }
    }

    try {
      const result = await operation();

      // Handle success
      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= this.config.halfOpenRequests) {
          console.log('Circuit breaker: Transitioning to closed');
          this.reset();
        }
      } else if (this.state === 'closed') {
        // Reset failure count on success
        this.failures = 0;
      }

      return result;
    } catch (error) {
      // Handle failure
      this.failures++;
      this.lastFailure = Date.now();

      if (this.state === 'half-open' || this.failures >= this.config.failureThreshold) {
        console.log('Circuit breaker: Opening circuit', {
          failures: this.failures,
          threshold: this.config.failureThreshold,
        });
        this.state = 'open';
      }

      throw error;
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailure = null;
    this.successCount = 0;
  }

  getStats(): {
    state: string;
    failures: number;
    lastFailure: number | null;
    successCount: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
      successCount: this.successCount,
    };
  }
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`)
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Fallback wrapper
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallbackValue: T | (() => T)
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn('Operation failed, using fallback', { error });
    return typeof fallbackValue === 'function'
      ? (fallbackValue as () => T)()
      : fallbackValue;
  }
}

/**
 * Request deduplication
 */
export interface Deduplicator<T> {
  execute: (key: string, operation: () => Promise<T>) => Promise<T>;
  clear: (key?: string) => void;
  getPending: () => string[];
}

export function createDeduplicator<T>(): Deduplicator<T> {
  const pending = new Map<string, Promise<T>>();

  return {
    execute: async (key: string, operation: () => Promise<T>): Promise<T> => {
      // Return existing promise if operation is already pending
      const existingPromise = pending.get(key);
      if (existingPromise) {
        console.log(`Deduplicating request: ${key}`);
        return existingPromise;
      }

      // Execute new operation
      const promise = operation()
        .then((result) => {
          pending.delete(key);
          return result;
        })
        .catch((error) => {
          pending.delete(key);
          throw error;
        });

      pending.set(key, promise);
      return promise;
    },

    clear: (key?: string): void => {
      if (key) {
        pending.delete(key);
      } else {
        pending.clear();
      }
    },

    getPending: (): string[] => {
      return Array.from(pending.keys());
    },
  };
}

/**
 * Batch operations
 */
export interface BatchConfig<T, R> {
  maxBatchSize: number;
  maxWaitTime: number;
  executor: (items: T[]) => Promise<R[]>;
}

export function createBatcher<T, R>(config: BatchConfig<T, R>): {
  add: (item: T) => Promise<R>;
  flush: () => Promise<void>;
} {
  let batch: Array<{
    item: T;
    resolve: (value: R) => void;
    reject: (error: Error) => void;
  }> = [];
  let timeoutId: NodeJS.Timeout | null = null;

  const executeBatch = async (): Promise<void> => {
    if (batch.length === 0) return;

    const currentBatch = batch;
    batch = [];

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    try {
      const items = currentBatch.map((b) => b.item);
      const results = await config.executor(items);

      // Resolve all promises
      currentBatch.forEach((b, index) => {
        b.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      currentBatch.forEach((b) => {
        b.reject(error as Error);
      });
    }
  };

  return {
    add: (item: T): Promise<R> => {
      return new Promise<R>((resolve, reject) => {
        batch.push({ item, resolve, reject });

        // Execute if batch is full
        if (batch.length >= config.maxBatchSize) {
          void executeBatch();
        } else if (!timeoutId) {
          // Schedule execution
          timeoutId = setTimeout(() => {
            void executeBatch();
          }, config.maxWaitTime);
        }
      });
    },

    flush: executeBatch,
  };
}

/**
 * Rate limiter
 */
export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private readonly config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.waitIfNeeded();
    this.recordRequest();
    return operation();
  }

  canProceed(): boolean {
    this.cleanOldRequests();
    return this.requests.length < this.config.maxRequests;
  }

  getRemainingRequests(): number {
    this.cleanOldRequests();
    return Math.max(0, this.config.maxRequests - this.requests.length);
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    return oldestRequest + this.config.windowMs;
  }

  private async waitIfNeeded(): Promise<void> {
    while (!this.canProceed()) {
      const resetTime = this.getResetTime();
      const waitTime = resetTime - Date.now();
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await sleep(waitTime);
      }
      this.cleanOldRequests();
    }
  }

  private recordRequest(): void {
    this.requests.push(Date.now());
  }

  private cleanOldRequests(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.requests = this.requests.filter((time) => time > cutoff);
  }

  reset(): void {
    this.requests = [];
  }
}

/**
 * Combine resilience patterns
 */
export function createResilientOperation<T>(config: {
  operation: () => Promise<T>;
  retry?: Partial<RetryConfig>;
  timeout?: number;
  circuitBreaker?: CircuitBreaker;
  fallback?: T | (() => T);
}): () => Promise<T> {
  const { operation, retry, timeout, circuitBreaker, fallback } = config;

  return async () => {
    let finalOperation = operation;

    // Wrap with timeout
    if (timeout) {
      const originalOp = finalOperation;
      finalOperation = () => withTimeout(originalOp(), timeout);
    }

    // Wrap with circuit breaker
    if (circuitBreaker) {
      const originalOp = finalOperation;
      finalOperation = () => circuitBreaker.execute(originalOp);
    }

    // Wrap with retry
    if (retry) {
      const originalOp = finalOperation;
      finalOperation = () => withRetry(originalOp, retry);
    }

    // Wrap with fallback
    if (fallback !== undefined) {
      return withFallback(finalOperation, fallback);
    }

    return finalOperation();
  };
}

/**
 * Utility: Sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
