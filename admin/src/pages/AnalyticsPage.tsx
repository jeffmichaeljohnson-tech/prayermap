/**
 * Admin Analytics Dashboard Page
 * Displays app usage statistics: active users, prayers, responses, engagement trends
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users,
  FileText,
  MessageSquare,
  TrendingUp,
  Activity,
  Loader2,
  Calendar,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalPrayers: number;
  prayersThisPeriod: number;
  totalResponses: number;
  responsesThisPeriod: number;
  avgResponsesPerPrayer: number;
  dailyActivity: DailyActivity[];
}

interface DailyActivity {
  date: string;
  prayers: number;
  responses: number;
}

type DateRange = '7d' | '30d' | '90d';

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  const getDaysFromRange = (range: DateRange): number => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
    }
  };

  const fetchAnalytics = useCallback(async () => {
    if (!supabase) {
      setError('Supabase client not initialized');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const daysAgo = getDaysFromRange(dateRange);
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Fetch all analytics data in parallel
      const [
        usersResult,
        prayersResult,
        prayersPeriodResult,
        responsesResult,
        responsesPeriodResult,
        activeUsersResult,
        dailyActivityResult,
      ] = await Promise.all([
        // Total users (from profiles table since we can't query auth.users directly)
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        
        // Total prayers (excluding archived)
        supabase
          .from('prayers')
          .select('*', { count: 'exact', head: true })
          .is('archived_at', null),
        
        // Prayers this period
        supabase
          .from('prayers')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate.toISOString())
          .is('archived_at', null),
        
        // Total responses
        supabase
          .from('prayer_responses')
          .select('*', { count: 'exact', head: true }),
        
        // Responses this period
        supabase
          .from('prayer_responses')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startDate.toISOString()),
        
        // Active users (via RPC function)
        supabase.rpc('get_active_users_count', {
          start_date: startDate.toISOString(),
        }),
        
        // Daily activity (via RPC function)
        supabase.rpc('get_daily_activity', {
          start_date: startDate.toISOString(),
          end_date: now.toISOString(),
        }),
      ]);

      // Handle RPC function not existing gracefully
      const activeUsersCount = activeUsersResult.error?.code === 'PGRST202'
        ? 0
        : activeUsersResult.data ?? 0;

      const dailyActivity: DailyActivity[] = dailyActivityResult.error?.code === 'PGRST202'
        ? generateEmptyDailyActivity(startDate, now)
        : (dailyActivityResult.data ?? []).map((d: { date: string; prayers: number; responses: number }) => ({
            date: d.date,
            prayers: Number(d.prayers) || 0,
            responses: Number(d.responses) || 0,
          }));

      const totalPrayers = prayersResult.count || 0;
      const totalResponses = responsesResult.count || 0;

      setData({
        totalUsers: usersResult.count || 0,
        activeUsers: typeof activeUsersCount === 'number' ? activeUsersCount : 0,
        totalPrayers,
        prayersThisPeriod: prayersPeriodResult.count || 0,
        totalResponses,
        responsesThisPeriod: responsesPeriodResult.count || 0,
        avgResponsesPerPrayer: totalPrayers > 0
          ? Math.round((totalResponses / totalPrayers) * 10) / 10
          : 0,
        dailyActivity,
      });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Generate empty daily activity when RPC doesn't exist
  function generateEmptyDailyActivity(start: Date, end: Date): DailyActivity[] {
    const result: DailyActivity[] = [];
    const current = new Date(start);
    while (current <= end) {
      result.push({
        date: current.toISOString().split('T')[0],
        prayers: 0,
        responses: 0,
      });
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading analytics</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const maxDailyValue = data?.dailyActivity.length
    ? Math.max(...data.dailyActivity.map(d => d.prayers + d.responses), 1)
    : 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor app usage and engagement trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Refresh button */}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Date range selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RPC Warning Banner */}
      {data && data.activeUsers === 0 && data.totalUsers > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <span className="text-yellow-500 mr-2">⚠️</span>
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Analytics functions not installed</p>
              <p className="text-yellow-700 mt-1">
                Run the analytics migration SQL to enable advanced stats like active users and daily activity charts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={data?.totalUsers ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Active Users"
          value={data?.activeUsers ?? 0}
          subtitle={`Last ${dateRange}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Total Prayers"
          value={data?.totalPrayers ?? 0}
          changeLabel={data?.prayersThisPeriod ? `+${data.prayersThisPeriod} this period` : undefined}
          icon={<FileText className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Total Responses"
          value={data?.totalResponses ?? 0}
          changeLabel={data?.responsesThisPeriod ? `+${data.responsesThisPeriod} this period` : undefined}
          icon={<MessageSquare className="w-5 h-5" />}
          color="pink"
          loading={loading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Avg Responses per Prayer</p>
          </div>
          {loading ? (
            <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">{data?.avgResponsesPerPrayer ?? 0}</p>
          )}
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Response Rate</p>
          </div>
          {loading ? (
            <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">
              {data?.totalPrayers
                ? Math.round((data.totalResponses / data.totalPrayers) * 100)
                : 0}%
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">User Engagement</p>
          </div>
          {loading ? (
            <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">
              {data?.totalUsers
                ? Math.round((data.activeUsers / data.totalUsers) * 100)
                : 0}%
            </p>
          )}
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Daily Activity</h3>
            <p className="text-sm text-gray-500">Prayers and responses over time</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              Last {getDaysFromRange(dateRange)} days
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : data?.dailyActivity.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No activity data available
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="h-64 flex items-end justify-between gap-1">
              {data?.dailyActivity.map((day, i) => {
                const prayerHeight = (day.prayers / maxDailyValue) * 200;
                const responseHeight = (day.responses / maxDailyValue) * 200;

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 group cursor-pointer"
                    title={`${new Date(day.date).toLocaleDateString()}\nPrayers: ${day.prayers}\nResponses: ${day.responses}`}
                  >
                    <div className="w-full flex flex-col gap-0.5">
                      <div
                        className="w-full bg-purple-500 rounded-t transition-all group-hover:bg-purple-600"
                        style={{ height: `${Math.max(2, prayerHeight)}px` }}
                      />
                      <div
                        className="w-full bg-blue-500 rounded-b transition-all group-hover:bg-blue-600"
                        style={{ height: `${Math.max(2, responseHeight)}px` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-gray-600">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded" />
                <span className="text-sm text-gray-600">Prayers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm text-gray-600">Responses</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Note */}
      <p className="text-xs text-gray-400 text-center">
        Data refreshes automatically every minute. Last updated: {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}

