/**
 * Admin Dashboard: Performance Monitoring Hook
 *
 * Provides React Query hooks for accessing database performance metrics.
 * Used in the admin dashboard to monitor query performance and identify
 * optimization opportunities.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getPerformanceStats,
  getSlowQueryDetails,
  getPerformanceSummary,
  type PerformanceStats,
  type SlowQueryDetails,
} from '../../../src/services/performanceService';

/**
 * Hook to fetch performance statistics
 *
 * @param options - Date range for stats
 * @returns React Query result with performance stats
 *
 * @example
 * ```tsx
 * const { data: stats, isLoading } = usePerformanceStats({
 *   startDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
 * });
 * ```
 */
export function usePerformanceStats(options?: {
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}) {
  return useQuery<PerformanceStats[], Error>({
    queryKey: ['performance-stats', options?.startDate, options?.endDate],
    queryFn: () =>
      getPerformanceStats({
        startDate: options?.startDate,
        endDate: options?.endDate,
      }),
    enabled: options?.enabled !== false,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to fetch slow query details
 *
 * @param options - Threshold and limit for slow queries
 * @returns React Query result with slow query details
 *
 * @example
 * ```tsx
 * const { data: slowQueries } = useSlowQueries({
 *   thresholdMs: 500
 * });
 * ```
 */
export function useSlowQueries(options?: {
  thresholdMs?: number;
  limit?: number;
  enabled?: boolean;
}) {
  return useQuery<SlowQueryDetails[], Error>({
    queryKey: ['slow-queries', options?.thresholdMs, options?.limit],
    queryFn: () =>
      getSlowQueryDetails({
        thresholdMs: options?.thresholdMs,
        limit: options?.limit,
      }),
    enabled: options?.enabled !== false,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to fetch performance summary
 *
 * @returns React Query result with performance summary
 *
 * @example
 * ```tsx
 * const { data: summary } = usePerformanceSummary();
 * ```
 */
export function usePerformanceSummary(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['performance-summary'],
    queryFn: getPerformanceSummary,
    enabled: options?.enabled !== false,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}
