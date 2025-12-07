/**
 * Rate Limiter for API Calls
 * 
 * Prevents exceeding API rate limits for external services.
 * Supports both request-based and token-based limits.
 * 
 * Features:
 * - Sliding window rate limiting
 * - Token-based limits (for OpenAI)
 * - Request-based limits (for Pinecone, Cohere)
 * - Automatic waiting when at capacity
 * - Per-service configuration
 * 
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export interface RateLimiterConfig {
  /** Max requests per minute */
  requests_per_minute: number;
  /** Max tokens per minute (optional, for token-based APIs) */
  tokens_per_minute?: number;
  /** Max requests per day (optional) */
  requests_per_day?: number;
  /** Window size in ms (default: 60000 = 1 minute) */
  window_ms?: number;
  /** Name for logging */
  name: string;
}

export interface RateLimitStatus {
  /** Whether capacity is available */
  available: boolean;
  /** Current request count in window */
  current_requests: number;
  /** Current token count in window */
  current_tokens: number;
  /** Seconds until capacity available (0 if available) */
  wait_seconds: number;
  /** Percentage of capacity used */
  utilization_percent: number;
}

interface RequestRecord {
  timestamp: number;
  tokens?: number;
}

// ============================================
// RATE LIMITER CLASS
// ============================================

export class RateLimiter {
  private requests: RequestRecord[] = [];
  private dailyRequests: number[] = [];
  private config: Required<RateLimiterConfig>;
  
  constructor(config: RateLimiterConfig) {
    this.config = {
      requests_per_minute: config.requests_per_minute,
      tokens_per_minute: config.tokens_per_minute || 0,
      requests_per_day: config.requests_per_day || 0,
      window_ms: config.window_ms || 60000,
      name: config.name,
    };
  }
  
  /**
   * Clean old requests from the sliding window
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.window_ms;
    const dayStart = now - 86400000; // 24 hours
    
    // Clean minute window
    this.requests = this.requests.filter(r => r.timestamp > windowStart);
    
    // Clean daily window
    if (this.config.requests_per_day > 0) {
      this.dailyRequests = this.dailyRequests.filter(t => t > dayStart);
    }
  }
  
  /**
   * Get current rate limit status
   */
  getStatus(): RateLimitStatus {
    this.cleanup();
    
    const currentRequests = this.requests.length;
    const currentTokens = this.requests.reduce((sum, r) => sum + (r.tokens || 0), 0);
    
    // Calculate utilization
    const requestUtilization = currentRequests / this.config.requests_per_minute;
    const tokenUtilization = this.config.tokens_per_minute > 0
      ? currentTokens / this.config.tokens_per_minute
      : 0;
    const utilization = Math.max(requestUtilization, tokenUtilization);
    
    // Calculate wait time
    let waitSeconds = 0;
    if (currentRequests >= this.config.requests_per_minute && this.requests.length > 0) {
      const oldestRequest = this.requests[0];
      waitSeconds = Math.ceil((oldestRequest.timestamp + this.config.window_ms - Date.now()) / 1000);
    }
    
    // Check daily limit
    if (this.config.requests_per_day > 0 && this.dailyRequests.length >= this.config.requests_per_day) {
      const oldestDaily = this.dailyRequests[0];
      const dailyWait = Math.ceil((oldestDaily + 86400000 - Date.now()) / 1000);
      waitSeconds = Math.max(waitSeconds, dailyWait);
    }
    
    return {
      available: waitSeconds === 0 && utilization < 1,
      current_requests: currentRequests,
      current_tokens: currentTokens,
      wait_seconds: Math.max(0, waitSeconds),
      utilization_percent: Math.round(utilization * 100),
    };
  }
  
  /**
   * Check if we have capacity (without waiting)
   */
  hasCapacity(tokens?: number): boolean {
    this.cleanup();
    
    // Check request limit
    if (this.requests.length >= this.config.requests_per_minute) {
      return false;
    }
    
    // Check token limit
    if (tokens && this.config.tokens_per_minute > 0) {
      const currentTokens = this.requests.reduce((sum, r) => sum + (r.tokens || 0), 0);
      if (currentTokens + tokens > this.config.tokens_per_minute) {
        return false;
      }
    }
    
    // Check daily limit
    if (this.config.requests_per_day > 0 && this.dailyRequests.length >= this.config.requests_per_day) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Wait until capacity is available, then record the request
   */
  async waitForCapacity(tokens?: number): Promise<void> {
    while (!this.hasCapacity(tokens)) {
      const status = this.getStatus();
      const waitMs = Math.max(100, status.wait_seconds * 1000);
      
      console.log(
        `[RateLimiter:${this.config.name}] At capacity ` +
        `(${status.current_requests}/${this.config.requests_per_minute} req, ` +
        `${status.current_tokens}/${this.config.tokens_per_minute || 'N/A'} tokens). ` +
        `Waiting ${Math.ceil(waitMs / 1000)}s...`
      );
      
      await new Promise(resolve => setTimeout(resolve, waitMs));
      this.cleanup();
    }
    
    // Record this request
    this.requests.push({
      timestamp: Date.now(),
      tokens,
    });
    
    if (this.config.requests_per_day > 0) {
      this.dailyRequests.push(Date.now());
    }
  }
  
  /**
   * Record a request (use after successful API call if not using waitForCapacity)
   */
  recordRequest(tokens?: number): void {
    this.requests.push({
      timestamp: Date.now(),
      tokens,
    });
    
    if (this.config.requests_per_day > 0) {
      this.dailyRequests.push(Date.now());
    }
  }
  
  /**
   * Reset the rate limiter (for testing)
   */
  reset(): void {
    this.requests = [];
    this.dailyRequests = [];
  }
}

// ============================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================

/**
 * OpenAI API rate limits for text-embedding-3-large
 * Tier 1: 3,500 RPM, 1,000,000 TPM
 * Using conservative limits to leave headroom
 */
export const OPENAI_RATE_LIMITER = new RateLimiter({
  name: 'openai',
  requests_per_minute: 3000,  // Conservative from 3,500 limit
  tokens_per_minute: 900000,  // Conservative from 1,000,000 limit
});

/**
 * Pinecone rate limits for serverless
 * Write operations: ~100 requests per second
 * Using per-minute limit for simplicity
 */
export const PINECONE_RATE_LIMITER = new RateLimiter({
  name: 'pinecone',
  requests_per_minute: 100,   // Conservative for batch operations
});

/**
 * Cohere rate limits for rerank API
 * Production: 10,000 calls/month, trial: 1,000 calls/month
 * Using conservative per-minute limit
 */
export const COHERE_RATE_LIMITER = new RateLimiter({
  name: 'cohere',
  requests_per_minute: 100,   // ~6,000/hour, plenty of headroom
});

/**
 * Anthropic rate limits for Claude
 * Tier 1: 1,000 RPM for claude-3-haiku
 */
export const ANTHROPIC_RATE_LIMITER = new RateLimiter({
  name: 'anthropic',
  requests_per_minute: 800,   // Conservative from 1,000 limit
  tokens_per_minute: 80000,   // Conservative output token limit
});

// ============================================
// RATE LIMITER FACTORY
// ============================================

const RATE_LIMITERS = new Map<string, RateLimiter>([
  ['openai', OPENAI_RATE_LIMITER],
  ['pinecone', PINECONE_RATE_LIMITER],
  ['cohere', COHERE_RATE_LIMITER],
  ['anthropic', ANTHROPIC_RATE_LIMITER],
]);

/**
 * Get a rate limiter by service name
 */
export function getRateLimiter(service: string): RateLimiter | undefined {
  return RATE_LIMITERS.get(service.toLowerCase());
}

/**
 * Create a custom rate limiter
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const limiter = new RateLimiter(config);
  RATE_LIMITERS.set(config.name.toLowerCase(), limiter);
  return limiter;
}

// ============================================
// RATE LIMITED WRAPPER
// ============================================

/**
 * Wrap an async function with rate limiting
 * 
 * @param fn The function to wrap
 * @param limiter The rate limiter to use
 * @param getTokens Optional function to estimate tokens from args
 * @returns Rate-limited version of the function
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  limiter: RateLimiter,
  getTokens?: (...args: Parameters<T>) => number
): T {
  return (async (...args: Parameters<T>) => {
    const tokens = getTokens?.(...args);
    await limiter.waitForCapacity(tokens);
    return fn(...args);
  }) as T;
}

// ============================================
// COMBINED STATUS
// ============================================

/**
 * Get status of all rate limiters
 */
export function getAllRateLimitStatuses(): Record<string, RateLimitStatus> {
  const statuses: Record<string, RateLimitStatus> = {};
  
  for (const [name, limiter] of RATE_LIMITERS) {
    statuses[name] = limiter.getStatus();
  }
  
  return statuses;
}

/**
 * Log current rate limit status (for debugging)
 */
export function logRateLimitStatus(): void {
  const statuses = getAllRateLimitStatuses();
  
  console.log('[RateLimiter] Current status:');
  for (const [name, status] of Object.entries(statuses)) {
    console.log(
      `  ${name}: ${status.utilization_percent}% utilized, ` +
      `${status.current_requests} requests, ` +
      `${status.current_tokens} tokens, ` +
      `${status.available ? 'available' : `wait ${status.wait_seconds}s`}`
    );
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  RateLimiter,
  OPENAI_RATE_LIMITER,
  PINECONE_RATE_LIMITER,
  COHERE_RATE_LIMITER,
  ANTHROPIC_RATE_LIMITER,
  getRateLimiter,
  createRateLimiter,
  withRateLimit,
  getAllRateLimitStatuses,
  logRateLimitStatus,
};

