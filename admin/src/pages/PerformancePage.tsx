/**
 * Performance Monitoring Dashboard
 *
 * Shows database query performance metrics:
 * - Query response times
 * - P95 latency
 * - Call counts by function
 * - Slow query alerts
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface PerformanceStats {
  function_name: string;
  call_count: number;
  avg_time_ms: number;
  p95_time_ms: number;
  max_time_ms: number;
  total_rows: number;
}

export function PerformancePage() {
  const [timeRange, setTimeRange] = useState('7d');

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['performance-stats', timeRange],
    queryFn: async (): Promise<PerformanceStats[]> => {
      const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase.rpc('get_performance_stats', {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const totalCalls = stats?.reduce((sum, s) => sum + s.call_count, 0) || 0;
  const avgLatency = stats?.length
    ? (stats.reduce((sum, s) => sum + s.avg_time_ms * s.call_count, 0) / totalCalls).toFixed(1)
    : '0';
  const slowQueries = stats?.filter(s => s.p95_time_ms > 200).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Database Performance
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor query performance and identify bottlenecks
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="1d">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading performance stats: {error.message}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Queries"
          value={totalCalls.toLocaleString()}
          icon="🗄️"
          loading={isLoading}
        />
        <StatCard
          title="Avg Latency"
          value={`${avgLatency}ms`}
          icon="⏱️"
          loading={isLoading}
        />
        <StatCard
          title="Functions Tracked"
          value={(stats?.length || 0).toString()}
          icon="📈"
          loading={isLoading}
        />
        <StatCard
          title="Slow Queries"
          value={slowQueries.toString()}
          subtitle="P95 > 200ms"
          icon="⚠️"
          alert={slowQueries > 0}
          loading={isLoading}
        />
      </div>

      {/* Detailed Stats Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Query Performance by Function</h2>
          <p className="text-sm text-gray-600 mt-1">
            Detailed breakdown of database function performance
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Function</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Calls</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Avg (ms)</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">P95 (ms)</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Max (ms)</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                      Loading performance data...
                    </div>
                  </td>
                </tr>
              ) : stats?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No performance data available for this time range
                  </td>
                </tr>
              ) : (
                stats?.map((stat) => (
                  <tr key={stat.function_name} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900">
                      {stat.function_name}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {stat.call_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {stat.avg_time_ms.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {stat.p95_time_ms.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {stat.max_time_ms}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <LatencyBadge p95={stat.p95_time_ms} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Tips */}
      {slowQueries > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-amber-800 flex items-center gap-2">
            <span>⚠️</span>
            Performance Alert
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            {slowQueries} function{slowQueries > 1 ? 's have' : ' has'} P95 latency above 200ms.
            Consider optimizing queries or adding database indexes.
          </p>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  alert?: boolean;
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon, alert, loading }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-20 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className={`text-3xl font-bold ${alert ? 'text-amber-600' : 'text-gray-900'}`}>
          {value}
        </p>
      )}
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}

function LatencyBadge({ p95 }: { p95: number }) {
  if (p95 < 100) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
        Fast
      </span>
    );
  }
  if (p95 < 200) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        OK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
      Slow
    </span>
  );
}
