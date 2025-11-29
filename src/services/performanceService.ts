/**
 * PrayerMap Performance Monitoring Service
 *
 * Tracks database query performance to measure optimization impact.
 * Logs execution times, calculates p95 latency (critical for mobile),
 * and provides admin dashboard integration.
 *
 * USAGE:
 * - Call logQueryPerformance() after database operations
 * - Use getPerformanceStats() in admin dashboard
 * - Monitor slow queries with getSlowQueryDetails()
 *
 * MOBILE CONSIDERATIONS:
 * - Target p95 latency: <200ms for optimal mobile UX
 * - Logs help identify queries that need optimization for 3G/4G users
 * - Performance data informs caching and prefetching strategies
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// Types
// ============================================================================

/**
 * Performance log entry
 */
export interface PerformanceLog {
  id: string;
  function_name: string;
  execution_time_ms: number;
  rows_returned: number | null;
  parameters: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}

/**
 * Aggregated performance statistics for a function
 */
export interface PerformanceStats {
  function_name: string;
  call_count: number;
  avg_time_ms: number;
  p50_time_ms: number;  // Median
  p95_time_ms: number;  // 95th percentile (key mobile metric)
  p99_time_ms: number;  // 99th percentile
  max_time_ms: number;
  total_rows: number;
  slow_queries: number; // Count of queries >200ms
}

/**
 * Detailed slow query information
 */
export interface SlowQueryDetails {
  id: string;
  function_name: string;
  execution_time_ms: number;
  rows_returned: number | null;
  parameters: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}

/**
 * Options for logging query performance
 */
export interface LogPerformanceOptions {
  functionName: string;
  executionTimeMs: number;
  rowsReturned?: number;
  parameters?: Record<string, unknown>;
}

/**
 * Options for querying performance stats
 */
export interface PerformanceStatsOptions {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Options for querying slow queries
 */
export interface SlowQueryOptions {
  thresholdMs?: number;
  limit?: number;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Log query performance metrics
 *
 * Call this after executing database queries to track performance.
 * Logs are stored in the performance_logs table for analysis.
 *
 * @example
 * ```typescript
 * const startTime = performance.now();
 * const prayers = await getPrayers();
 * const endTime = performance.now();
 *
 * await logQueryPerformance({
 *   functionName: 'get_prayers',
 *   executionTimeMs: Math.round(endTime - startTime),
 *   rowsReturned: prayers.length,
 *   parameters: { limit: 100, offset: 0 }
 * });
 * ```
 */
export async function logQueryPerformance(
  options: LogPerformanceOptions
): Promise<{ success: boolean; error?: string; logId?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await supabase.rpc('log_query_performance', {
      p_function_name: options.functionName,
      p_execution_time_ms: options.executionTimeMs,
      p_rows_returned: options.rowsReturned ?? null,
      p_parameters: options.parameters ? JSON.stringify(options.parameters) : null,
    });

    if (error) {
      console.error('Failed to log query performance:', error);
      return { success: false, error: error.message };
    }

    return { success: true, logId: data };
  } catch (error) {
    console.error('Error logging query performance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get aggregated performance statistics
 *
 * Returns performance metrics for all tracked functions within a date range.
 * Calculates call count, average time, percentiles, and slow query count.
 *
 * @param options - Date range for stats (default: last 7 days)
 * @returns Array of performance stats per function
 *
 * @example
 * ```typescript
 * // Get stats for last 24 hours
 * const stats = await getPerformanceStats({
 *   startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
 *   endDate: new Date()
 * });
 *
 * stats.forEach(stat => {
 *   console.log(`${stat.function_name}: p95=${stat.p95_time_ms}ms`);
 * });
 * ```
 */
export async function getPerformanceStats(
  options: PerformanceStatsOptions = {}
): Promise<PerformanceStats[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const startDate = options.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endDate = options.endDate || new Date();

  const { data, error } = await supabase.rpc('get_performance_stats', {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  });

  if (error) {
    console.error('Failed to get performance stats:', error);
    throw error;
  }

  return (data || []) as PerformanceStats[];
}

/**
 * Get detailed information about slow queries
 *
 * Returns individual slow queries with their parameters for debugging.
 * Useful for identifying specific problematic queries.
 *
 * @param options - Threshold and limit for slow queries
 * @returns Array of slow query details
 *
 * @example
 * ```typescript
 * // Get queries slower than 500ms
 * const slowQueries = await getSlowQueryDetails({
 *   thresholdMs: 500,
 *   limit: 50
 * });
 *
 * slowQueries.forEach(query => {
 *   console.log(`Slow query: ${query.function_name} (${query.execution_time_ms}ms)`);
 *   console.log('Parameters:', query.parameters);
 * });
 * ```
 */
export async function getSlowQueryDetails(
  options: SlowQueryOptions = {}
): Promise<SlowQueryDetails[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.rpc('get_slow_query_details', {
    threshold_ms: options.thresholdMs ?? 200,
    limit_count: options.limit ?? 100,
  });

  if (error) {
    console.error('Failed to get slow query details:', error);
    throw error;
  }

  return (data || []) as SlowQueryDetails[];
}

/**
 * Clean up old performance logs
 *
 * Removes logs older than 30 days to prevent table bloat.
 * Should be called periodically (e.g., weekly via cron job).
 *
 * @returns Number of deleted rows
 *
 * @example
 * ```typescript
 * const deletedCount = await cleanupOldPerformanceLogs();
 * console.log(`Cleaned up ${deletedCount} old performance logs`);
 * ```
 */
export async function cleanupOldPerformanceLogs(): Promise<number> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.rpc('cleanup_old_performance_logs');

  if (error) {
    console.error('Failed to cleanup old performance logs:', error);
    throw error;
  }

  return data || 0;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a function meets performance targets
 *
 * Evaluates whether a function's p95 latency is within acceptable limits.
 * Mobile target: <200ms for optimal UX on 3G/4G connections.
 *
 * @param functionName - Name of the function to check
 * @param targetP95Ms - Target p95 latency in milliseconds (default: 200)
 * @returns Performance check result
 *
 * @example
 * ```typescript
 * const result = await checkPerformanceTarget('get_nearby_prayers', 200);
 * if (!result.meetsTarget) {
 *   console.warn(`Performance issue: ${result.functionName} p95=${result.actualP95Ms}ms`);
 * }
 * ```
 */
export async function checkPerformanceTarget(
  functionName: string,
  targetP95Ms: number = 200
): Promise<{
  functionName: string;
  meetsTarget: boolean;
  actualP95Ms: number | null;
  targetP95Ms: number;
}> {
  const stats = await getPerformanceStats({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    endDate: new Date(),
  });

  const functionStats = stats.find((s) => s.function_name === functionName);

  if (!functionStats) {
    return {
      functionName,
      meetsTarget: false,
      actualP95Ms: null,
      targetP95Ms,
    };
  }

  return {
    functionName,
    meetsTarget: functionStats.p95_time_ms <= targetP95Ms,
    actualP95Ms: functionStats.p95_time_ms,
    targetP95Ms,
  };
}

/**
 * Get performance summary for dashboard
 *
 * Returns a high-level summary of system performance.
 * Useful for admin dashboard overview widgets.
 *
 * @returns Performance summary
 *
 * @example
 * ```typescript
 * const summary = await getPerformanceSummary();
 * console.log(`Total queries: ${summary.totalQueries}`);
 * console.log(`Slow queries: ${summary.slowQueries} (${summary.slowQueryPercentage}%)`);
 * ```
 */
export async function getPerformanceSummary(): Promise<{
  totalQueries: number;
  slowQueries: number;
  slowQueryPercentage: number;
  avgP95Ms: number;
  functionsTracked: number;
}> {
  const stats = await getPerformanceStats({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    endDate: new Date(),
  });

  const totalQueries = stats.reduce((sum, s) => sum + Number(s.call_count), 0);
  const slowQueries = stats.reduce((sum, s) => sum + Number(s.slow_queries), 0);
  const avgP95Ms =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + Number(s.p95_time_ms), 0) / stats.length
      : 0;

  return {
    totalQueries,
    slowQueries,
    slowQueryPercentage: totalQueries > 0 ? (slowQueries / totalQueries) * 100 : 0,
    avgP95Ms: Math.round(avgP95Ms * 100) / 100,
    functionsTracked: stats.length,
  };
}

/**
 * Higher-order function to automatically log performance
 *
 * Wraps a database function to automatically log its performance.
 * Useful for consistently tracking key functions.
 *
 * @param functionName - Name to log under
 * @param fn - Async function to wrap
 * @returns Wrapped function with automatic performance logging
 *
 * @example
 * ```typescript
 * const getPrayersWithLogging = withPerformanceLogging(
 *   'get_prayers_optimized',
 *   async (params) => {
 *     const { data } = await supabase.rpc('get_prayers', params);
 *     return data;
 *   }
 * );
 *
 * // Automatically logs performance
 * const prayers = await getPrayersWithLogging({ limit: 100 });
 * ```
 */
export function withPerformanceLogging<T extends unknown[], R>(
  functionName: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      const endTime = performance.now();

      // Log performance (non-blocking)
      logQueryPerformance({
        functionName,
        executionTimeMs: Math.round(endTime - startTime),
        rowsReturned: Array.isArray(result) ? result.length : undefined,
        parameters: args.length > 0 ? { args } : undefined,
      }).catch((error) => {
        console.warn('Failed to log performance:', error);
      });

      return result;
    } catch (error) {
      const endTime = performance.now();

      // Log even failed queries
      logQueryPerformance({
        functionName,
        executionTimeMs: Math.round(endTime - startTime),
        parameters: { args, error: String(error) },
      }).catch((logError) => {
        console.warn('Failed to log performance:', logError);
      });

      throw error;
    }
  };
}

// ============================================================================
// Export all functions
// ============================================================================

export default {
  logQueryPerformance,
  getPerformanceStats,
  getSlowQueryDetails,
  cleanupOldPerformanceLogs,
  checkPerformanceTarget,
  getPerformanceSummary,
  withPerformanceLogging,
};
