/**
 * Hot Cache for PrayerMap Memory System
 * In-memory cache for frequently accessed data with TTL
 */

import type {
  AgentMemoryEntry,
  DecisionNode,
  ErrorFingerprint,
  Pattern,
} from './types';
import { findDecisions, findPatterns, findErrorsInFiles } from './query';
import { pineconeClient } from './pinecone-client';

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
}

/**
 * Hot cache interface
 */
export interface HotCache {
  recent_decisions: DecisionNode[];
  recent_errors: ErrorFingerprint[];
  common_patterns: Pattern[];
  important_memories: AgentMemoryEntry[];
  last_refresh: Date;
}

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  REFRESH_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  DEFAULT_TTL_MS: 10 * 60 * 1000, // 10 minutes
  MAX_CACHE_SIZE: 1000, // Maximum number of entries
};

/**
 * In-memory cache storage
 */
class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hotCache: HotCache | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start auto-refresh
    this.startAutoRefresh();
  }

  /**
   * Start automatic cache refresh
   */
  private startAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Initial refresh
    this.refreshCache().catch((error) => {
      console.error('Failed to refresh cache:', error);
    });

    // Set up periodic refresh
    this.refreshTimer = setInterval(() => {
      this.refreshCache().catch((error) => {
        console.error('Failed to refresh cache:', error);
      });
    }, CACHE_CONFIG.REFRESH_INTERVAL_MS);
  }

  /**
   * Stop automatic refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Refresh the hot cache
   */
  async refreshCache(): Promise<void> {
    console.log('Refreshing hot cache...');

    try {
      // Fetch recent decisions
      const recentDecisions = await findDecisions(undefined, 20);

      // Fetch recent errors
      const errorFilter = {
        entry_type: ['bug_found', 'bug_fixed'] as any,
      };
      const errorEntries = await pineconeClient.queryByMetadata(errorFilter, 50);
      const recentErrors = errorEntries
        .filter((entry) => entry.metadata?.error_fingerprint)
        .map((entry) => entry.metadata!.error_fingerprint as ErrorFingerprint)
        .slice(0, 20);

      // Fetch common patterns
      const patternEntries = await findPatterns(undefined, 20);
      const commonPatterns = patternEntries
        .map((entry) => this.extractPattern(entry))
        .filter((p): p is Pattern => p !== null);

      // Fetch important memories (high importance + auto-include)
      const importantFilter = {
        min_importance: 0.7,
        auto_include_only: true,
      };
      const importantMemories = await pineconeClient.queryByMetadata(
        importantFilter,
        30
      );

      // Update hot cache
      this.hotCache = {
        recent_decisions: recentDecisions,
        recent_errors: recentErrors,
        common_patterns: commonPatterns,
        important_memories: importantMemories,
        last_refresh: new Date(),
      };

      console.log(
        `Hot cache refreshed: ${recentDecisions.length} decisions, ${recentErrors.length} errors, ${commonPatterns.length} patterns, ${importantMemories.length} important memories`
      );
    } catch (error) {
      console.error('Error refreshing hot cache:', error);
      throw error;
    }
  }

  /**
   * Extract pattern from memory entry
   */
  private extractPattern(entry: AgentMemoryEntry): Pattern | null {
    if (!entry.metadata?.pattern) {
      return null;
    }

    return entry.metadata.pattern as Pattern;
  }

  /**
   * Get the hot cache
   */
  getHotCache(): HotCache | null {
    return this.hotCache;
  }

  /**
   * Set a cache entry
   */
  set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.DEFAULT_TTL_MS): void {
    // Check cache size limit
    if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl,
    });
  }

  /**
   * Get a cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp.getTime();

    if (age > entry.ttl) {
      // Expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp.getTime() < oldestTime) {
        oldestTime = entry.timestamp.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp.getTime();
      if (age > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.MAX_CACHE_SIZE,
    };
  }
}

// Export singleton instance
export const memoryCache = new MemoryCache();

/**
 * Get item from cache
 */
export function getFromCache<T = AgentMemoryEntry>(key: string): T | null {
  return memoryCache.get<T>(key);
}

/**
 * Set item in cache
 */
export function setInCache<T = AgentMemoryEntry>(
  key: string,
  data: T,
  ttl?: number
): void {
  memoryCache.set(key, data, ttl);
}

/**
 * Get the hot cache
 */
export function getHotCache(): HotCache | null {
  return memoryCache.getHotCache();
}

/**
 * Manually refresh the cache
 */
export async function refreshCache(): Promise<void> {
  await memoryCache.refreshCache();
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  memoryCache.clear();
}

/**
 * Clean up expired entries
 */
export function cleanupCache(): void {
  memoryCache.cleanup();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  hotCache: HotCache | null;
} {
  return {
    ...memoryCache.getStats(),
    hotCache: memoryCache.getHotCache(),
  };
}

/**
 * Stop auto-refresh (useful for testing or shutdown)
 */
export function stopCacheRefresh(): void {
  memoryCache.stopAutoRefresh();
}

/**
 * Cache helper for common queries
 */
export class CacheHelper {
  /**
   * Get or fetch recent decisions
   */
  static async getRecentDecisions(
    forceRefresh: boolean = false
  ): Promise<DecisionNode[]> {
    const cacheKey = 'recent_decisions';

    if (!forceRefresh) {
      const cached = getFromCache<DecisionNode[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const decisions = await findDecisions(undefined, 20);
    setInCache(cacheKey, decisions, 5 * 60 * 1000); // 5 minutes TTL
    return decisions;
  }

  /**
   * Get or fetch unresolved errors
   */
  static async getUnresolvedErrors(
    forceRefresh: boolean = false
  ): Promise<ErrorFingerprint[]> {
    const cacheKey = 'unresolved_errors';

    if (!forceRefresh) {
      const cached = getFromCache<ErrorFingerprint[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const errorFilter = {
      entry_type: ['bug_found'] as any,
    };
    const errorEntries = await pineconeClient.queryByMetadata(errorFilter, 100);
    const errors = errorEntries
      .filter((entry) => entry.metadata?.error_fingerprint)
      .map((entry) => entry.metadata!.error_fingerprint as ErrorFingerprint)
      .filter((error) => !error.resolved);

    setInCache(cacheKey, errors, 3 * 60 * 1000); // 3 minutes TTL
    return errors;
  }

  /**
   * Get or fetch common patterns
   */
  static async getCommonPatterns(
    forceRefresh: boolean = false
  ): Promise<AgentMemoryEntry[]> {
    const cacheKey = 'common_patterns';

    if (!forceRefresh) {
      const cached = getFromCache<AgentMemoryEntry[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const patterns = await findPatterns(undefined, 20);
    setInCache(cacheKey, patterns, 10 * 60 * 1000); // 10 minutes TTL
    return patterns;
  }
}

// Set up periodic cleanup (every 15 minutes)
setInterval(() => {
  cleanupCache();
}, 15 * 60 * 1000);
