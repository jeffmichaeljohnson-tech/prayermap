/**
 * Performance Monitoring Usage Examples
 *
 * This file demonstrates how to integrate the performance monitoring
 * system with PrayerMap's existing services.
 */

import { supabase } from '../../src/lib/supabase';
import {
  logQueryPerformance,
  withPerformanceLogging,
  getPerformanceStats,
  checkPerformanceTarget,
} from '../../src/services/performanceService';

// ============================================================================
// EXAMPLE 1: Manual Performance Logging
// ============================================================================

/**
 * Add performance logging to an existing query
 */
async function getPrayersManual(limit: number = 100) {
  const startTime = performance.now();

  try {
    const { data, error } = await supabase
      .from('prayers')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const endTime = performance.now();

    // Log the performance (non-blocking)
    await logQueryPerformance({
      functionName: 'get_prayers_manual',
      executionTimeMs: Math.round(endTime - startTime),
      rowsReturned: data?.length,
      parameters: { limit },
    });

    return data;
  } catch (error) {
    const endTime = performance.now();

    // Log even failed queries
    await logQueryPerformance({
      functionName: 'get_prayers_manual',
      executionTimeMs: Math.round(endTime - startTime),
      parameters: { limit, error: String(error) },
    });

    throw error;
  }
}

// ============================================================================
// EXAMPLE 2: Automatic Performance Logging with HOF
// ============================================================================

/**
 * Wrap a function to automatically log performance
 * This is the recommended approach for consistency
 */
const getPrayersAutomatic = withPerformanceLogging(
  'get_prayers_automatic',
  async (params: { limit?: number; status?: string } = {}) => {
    const { data, error } = await supabase
      .from('prayers')
      .select('*')
      .eq('status', params.status || 'active')
      .order('created_at', { ascending: false })
      .limit(params.limit || 100);

    if (error) throw error;
    return data;
  }
);

// Usage: Performance is logged automatically
// const prayers = await getPrayersAutomatic({ limit: 50 });

// ============================================================================
// EXAMPLE 3: RPC Function with Performance Logging
// ============================================================================

/**
 * Call a database RPC function and log its performance
 */
const getNearbyPrayersWithLogging = withPerformanceLogging(
  'get_nearby_prayers_rpc',
  async (lat: number, lng: number, radiusKm: number = 10) => {
    const { data, error } = await supabase.rpc('get_prayers_within_radius', {
      lat,
      lng,
      radius_km: radiusKm,
    });

    if (error) throw error;
    return data;
  }
);

// Usage:
// const nearbyPrayers = await getNearbyPrayersWithLogging(37.7749, -122.4194, 25);

// ============================================================================
// EXAMPLE 4: React Hook with Performance Monitoring
// ============================================================================

/**
 * Custom React hook with built-in performance logging
 */
import { useQuery } from '@tanstack/react-query';

function usePrayersWithMonitoring(options: { limit?: number } = {}) {
  const getPrayersQuery = withPerformanceLogging(
    'use_prayers_hook',
    async () => {
      const { data, error } = await supabase
        .from('prayers')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(options.limit || 100);

      if (error) throw error;
      return data;
    }
  );

  return useQuery({
    queryKey: ['prayers', options.limit],
    queryFn: getPrayersQuery,
    staleTime: 60000, // 1 minute
  });
}

// Usage in a React component:
// const { data: prayers, isLoading } = usePrayersWithMonitoring({ limit: 50 });

// ============================================================================
// EXAMPLE 5: Batch Operations with Performance Tracking
// ============================================================================

/**
 * Track performance of multiple related operations
 */
async function bulkCreatePrayers(prayers: Array<{ content: string; location: { lat: number; lng: number } }>) {
  const startTime = performance.now();
  const results = [];

  try {
    for (const prayer of prayers) {
      const { data, error } = await supabase
        .from('prayers')
        .insert(prayer)
        .select()
        .single();

      if (error) throw error;
      results.push(data);
    }

    const endTime = performance.now();

    await logQueryPerformance({
      functionName: 'bulk_create_prayers',
      executionTimeMs: Math.round(endTime - startTime),
      rowsReturned: results.length,
      parameters: { count: prayers.length },
    });

    return results;
  } catch (error) {
    const endTime = performance.now();

    await logQueryPerformance({
      functionName: 'bulk_create_prayers',
      executionTimeMs: Math.round(endTime - startTime),
      rowsReturned: results.length,
      parameters: { count: prayers.length, error: String(error) },
    });

    throw error;
  }
}

// ============================================================================
// EXAMPLE 6: Performance Monitoring in Admin Dashboard
// ============================================================================

/**
 * Check if critical functions meet performance targets
 */
async function performanceHealthCheck() {
  const criticalFunctions = [
    { name: 'get_prayers', target: 150 },
    { name: 'get_nearby_prayers', target: 200 },
    { name: 'create_prayer', target: 100 },
  ];

  const results = await Promise.all(
    criticalFunctions.map(({ name, target }) =>
      checkPerformanceTarget(name, target)
    )
  );

  const failing = results.filter((r) => !r.meetsTarget);

  if (failing.length > 0) {
    console.warn('⚠️ Performance issues detected:');
    failing.forEach((result) => {
      console.warn(
        `  ${result.functionName}: p95=${result.actualP95Ms}ms (target: ${result.targetP95Ms}ms)`
      );
    });
  } else {
    console.log('✅ All critical functions meet performance targets');
  }

  return {
    healthy: failing.length === 0,
    failing,
  };
}

// Usage: Run this in admin dashboard or scheduled job
// const health = await performanceHealthCheck();

// ============================================================================
// EXAMPLE 7: Weekly Performance Report
// ============================================================================

/**
 * Generate a weekly performance report
 */
async function generateWeeklyReport() {
  const stats = await getPerformanceStats({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  console.log('📊 Weekly Performance Report');
  console.log('='.repeat(60));

  stats.forEach((stat) => {
    const status =
      stat.p95_time_ms < 100
        ? '🟢 Fast'
        : stat.p95_time_ms < 200
        ? '🟡 Good'
        : stat.p95_time_ms < 500
        ? '🟠 Slow'
        : '🔴 Critical';

    console.log(`
Function: ${stat.function_name}
Status: ${status}
Calls: ${Number(stat.call_count).toLocaleString()}
p50: ${Number(stat.p50_time_ms).toFixed(0)}ms
p95: ${Number(stat.p95_time_ms).toFixed(0)}ms
p99: ${Number(stat.p99_time_ms).toFixed(0)}ms
Max: ${Number(stat.max_time_ms).toLocaleString()}ms
Slow Queries: ${Number(stat.slow_queries)}
    `);
  });

  return stats;
}

// Usage: Run weekly via cron
// const report = await generateWeeklyReport();

// ============================================================================
// EXAMPLE 8: Real-Time Performance Monitoring Hook
// ============================================================================

/**
 * React hook for real-time performance monitoring
 */
import { useState, useEffect } from 'react';

function useRealtimePerformanceMonitor(functionName: string, targetP95Ms: number = 200) {
  const [status, setStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await checkPerformanceTarget(functionName, targetP95Ms);

      if (result.actualP95Ms === null) {
        setStatus('healthy');
        setLatency(null);
        return;
      }

      setLatency(result.actualP95Ms);

      if (result.actualP95Ms < targetP95Ms) {
        setStatus('healthy');
      } else if (result.actualP95Ms < targetP95Ms * 1.5) {
        setStatus('warning');
      } else {
        setStatus('critical');
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [functionName, targetP95Ms]);

  return { status, latency };
}

// Usage in React component:
// const { status, latency } = useRealtimePerformanceMonitor('get_prayers', 200);
// if (status === 'critical') {
//   return <PerformanceAlert latency={latency} />;
// }

// ============================================================================
// EXAMPLE 9: A/B Testing Performance Optimization
// ============================================================================

/**
 * Compare performance of two implementations
 */
async function abTestPerformance<T>(
  nameA: string,
  functionA: () => Promise<T>,
  nameB: string,
  functionB: () => Promise<T>,
  iterations: number = 10
): Promise<{
  winner: string;
  avgLatencyA: number;
  avgLatencyB: number;
  improvement: number;
}> {
  const timingsA: number[] = [];
  const timingsB: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Test A
    const startA = performance.now();
    await functionA();
    const endA = performance.now();
    timingsA.push(endA - startA);

    // Test B
    const startB = performance.now();
    await functionB();
    const endB = performance.now();
    timingsB.push(endB - startB);
  }

  const avgA = timingsA.reduce((sum, t) => sum + t, 0) / iterations;
  const avgB = timingsB.reduce((sum, t) => sum + t, 0) / iterations;

  const winner = avgA < avgB ? nameA : nameB;
  const improvement = Math.abs(((avgB - avgA) / avgA) * 100);

  console.log(`
A/B Performance Test Results:
${nameA}: ${avgA.toFixed(0)}ms avg
${nameB}: ${avgB.toFixed(0)}ms avg
Winner: ${winner} (${improvement.toFixed(1)}% ${avgA < avgB ? 'faster' : 'slower'})
  `);

  return {
    winner,
    avgLatencyA: avgA,
    avgLatencyB: avgB,
    improvement,
  };
}

// Usage:
// const result = await abTestPerformance(
//   'original_query',
//   () => getPrayersOriginal(),
//   'optimized_query',
//   () => getPrayersOptimized(),
//   20
// );

// ============================================================================
// EXAMPLE 10: Integration with Existing PrayerService
// ============================================================================

/**
 * Example of how to integrate with the existing prayerService.ts
 */

// In src/services/prayerService.ts, wrap existing functions:
/*
import { withPerformanceLogging } from './performanceService';

export const getPrayers = withPerformanceLogging(
  'get_prayers',
  async (filters: PrayerFilters) => {
    const { data, error } = await supabase
      .from('prayers')
      .select('*')
      .match(filters)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
);

export const createPrayer = withPerformanceLogging(
  'create_prayer',
  async (prayer: CreatePrayerInput) => {
    const { data, error } = await supabase
      .from('prayers')
      .insert(prayer)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

export const getNearbyPrayers = withPerformanceLogging(
  'get_nearby_prayers',
  async (lat: number, lng: number, radiusKm: number) => {
    const { data, error } = await supabase.rpc('get_prayers_within_radius', {
      lat,
      lng,
      radius_km: radiusKm,
    });

    if (error) throw error;
    return data;
  }
);
*/

export {
  getPrayersManual,
  getPrayersAutomatic,
  getNearbyPrayersWithLogging,
  usePrayersWithMonitoring,
  bulkCreatePrayers,
  performanceHealthCheck,
  generateWeeklyReport,
  useRealtimePerformanceMonitor,
  abTestPerformance,
};
