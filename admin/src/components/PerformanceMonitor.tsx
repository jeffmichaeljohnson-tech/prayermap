/**
 * Performance Monitor Component
 *
 * Displays database query performance metrics in the admin dashboard.
 * Shows:
 * - High-level summary (total queries, slow queries, avg p95)
 * - Per-function statistics (call count, latency percentiles)
 * - Recent slow queries with details
 *
 * MOBILE CONTEXT:
 * - p95 target: <200ms (optimal for 3G/4G users)
 * - Highlights queries exceeding mobile performance targets
 * - Helps identify optimization opportunities for rural/low-bandwidth users
 */

import { useState } from 'react';
import {
  usePerformanceStats,
  useSlowQueries,
  usePerformanceSummary,
} from '../hooks/usePerformance';

export function PerformanceMonitor() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  // Calculate date range based on selection
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const { data: summary, isLoading: summaryLoading } = usePerformanceSummary();
  const { data: stats, isLoading: statsLoading } = usePerformanceStats({
    startDate,
    endDate,
  });
  const { data: slowQueries, isLoading: slowQueriesLoading } = useSlowQueries({
    thresholdMs: 200,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Performance Monitoring
          </h2>
          <p className="text-sm text-gray-600">
            Database query performance metrics (Last 24 hours)
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['1h', '24h', '7d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '1h' && 'Last Hour'}
              {range === '24h' && 'Last 24h'}
              {range === '7d' && 'Last 7 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="text-gray-500">Loading summary...</div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Queries"
            value={summary.totalQueries.toLocaleString()}
            subtitle="in last 24h"
          />
          <SummaryCard
            title="Slow Queries"
            value={summary.slowQueries.toLocaleString()}
            subtitle={`${summary.slowQueryPercentage.toFixed(1)}% of total`}
            alert={summary.slowQueryPercentage > 10}
          />
          <SummaryCard
            title="Avg p95 Latency"
            value={`${summary.avgP95Ms.toFixed(0)}ms`}
            subtitle="mobile target: <200ms"
            alert={summary.avgP95Ms > 200}
          />
          <SummaryCard
            title="Functions Tracked"
            value={summary.functionsTracked.toString()}
            subtitle="active functions"
          />
        </div>
      ) : null}

      {/* Function Statistics Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Query Performance by Function
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Latency percentiles and call counts
          </p>
        </div>

        {statsLoading ? (
          <div className="p-6 text-gray-500">Loading statistics...</div>
        ) : !stats || stats.length === 0 ? (
          <div className="p-6 text-gray-500">No performance data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Function
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg (ms)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    p50 (ms)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    p95 (ms)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max (ms)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slow
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.map((stat) => (
                  <tr key={stat.function_name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.function_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(stat.call_count).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(stat.avg_time_ms).toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(stat.p50_time_ms).toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <LatencyBadge value={Number(stat.p95_time_ms)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(stat.max_time_ms).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {Number(stat.slow_queries) > 0 ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          {Number(stat.slow_queries)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Slow Queries */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Slow Queries
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Queries exceeding 200ms threshold
          </p>
        </div>

        {slowQueriesLoading ? (
          <div className="p-6 text-gray-500">Loading slow queries...</div>
        ) : !slowQueries || slowQueries.length === 0 ? (
          <div className="p-6 text-gray-500 flex items-center gap-2">
            <span className="text-green-500 text-xl">✓</span>
            <span>No slow queries detected! All queries under 200ms.</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {slowQueries.slice(0, 10).map((query) => (
              <div key={query.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">
                        {query.function_name}
                      </span>
                      <LatencyBadge value={query.execution_time_ms} />
                    </div>

                    {query.parameters && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View parameters
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(query.parameters, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-xs text-gray-500">
                      {new Date(query.created_at).toLocaleTimeString()}
                    </div>
                    {query.rows_returned !== null && (
                      <div className="text-xs text-gray-500 mt-1">
                        {query.rows_returned} rows
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  alert?: boolean;
}

function SummaryCard({ title, value, subtitle, alert }: SummaryCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow p-6 ${
        alert ? 'border-l-4 border-red-500' : ''
      }`}
    >
      <div className="text-sm font-medium text-gray-600">{title}</div>
      <div
        className={`text-2xl font-bold mt-2 ${
          alert ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

interface LatencyBadgeProps {
  value: number;
}

function LatencyBadge({ value }: LatencyBadgeProps) {
  const getColor = (ms: number) => {
    if (ms < 100) return 'bg-green-100 text-green-800';
    if (ms < 200) return 'bg-yellow-100 text-yellow-800';
    if (ms < 500) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getIcon = (ms: number) => {
    if (ms < 100) return '⚡';
    if (ms < 200) return '✓';
    if (ms < 500) return '⚠';
    return '⚠';
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getColor(
        value
      )}`}
    >
      <span>{getIcon(value)}</span>
      <span>{value.toFixed(0)}ms</span>
    </span>
  );
}
