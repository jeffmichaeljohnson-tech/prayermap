/**
 * Admin Dashboard Page
 * Shows overview stats, recent prayers, and recent audit logs
 */

import { useStats } from '../hooks/useStats'
import { usePrayers } from '../hooks/usePrayers'
import { useAuditLogs } from '../hooks/useAuditLogs'

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useStats()
  const { data: prayersData, isLoading: prayersLoading, isError: prayersError } = usePrayers({ pageSize: 5 })
  const { data: logsData, isLoading: logsLoading, isError: logsError } = useAuditLogs({ pageSize: 5 })

  // Show setup warning if all queries returned empty/error (likely schema not applied)
  const showSchemaWarning = !statsLoading && !prayersLoading && !logsLoading &&
    (statsError || prayersError || logsError ||
     (stats?.totalPrayers === 0 && stats?.totalUsers === 0 &&
      prayersData?.prayers.length === 0 && logsData?.logs.length === 0))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to the PrayerMap admin dashboard</p>
      </div>

      {showSchemaWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="shrink-0">
              <span className="text-yellow-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Admin Schema Not Fully Applied
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  The admin dashboard requires additional database functions to be set up.
                  Please run the SQL from <code className="bg-yellow-100 px-1 rounded">admin/supabase-admin-schema.sql</code> in your Supabase SQL Editor.
                </p>
                <p className="mt-1">
                  This will create the necessary RPC functions: <code className="bg-yellow-100 px-1 rounded">get_admin_stats</code>,
                  <code className="bg-yellow-100 px-1 rounded">get_all_prayers_admin</code>, etc.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Prayers"
          value={stats?.totalPrayers ?? 0}
          subtitle={`${stats?.prayersToday ?? 0} today`}
          loading={statsLoading}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          subtitle={`${stats?.newUsersToday ?? 0} today`}
          loading={statsLoading}
        />
        <StatCard
          title="Prayers This Week"
          value={stats?.prayersThisWeek ?? 0}
          loading={statsLoading}
        />
        <StatCard
          title="New Users This Week"
          value={stats?.newUsersThisWeek ?? 0}
          loading={statsLoading}
        />
      </div>

      {/* Recent Prayers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Prayers</h2>
        {prayersLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : prayersData?.prayers.length === 0 ? (
          <div className="text-gray-500">No prayers yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {prayersData?.prayers.map((prayer) => (
                  <tr key={prayer.id} className="border-b last:border-0">
                    <td className="py-3 text-sm">
                      {prayer.title || prayer.content.substring(0, 50) + '...'}
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {prayer.is_anonymous ? 'Anonymous' : (prayer.user_name || prayer.user_email || 'Unknown')}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(prayer.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Audit Logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {logsLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : logsData?.logs.length === 0 ? (
          <div className="text-gray-500">No activity yet</div>
        ) : (
          <div className="space-y-3">
            {logsData?.logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                    {log.action}
                  </span>
                  <span className="text-sm text-gray-600">
                    {log.table_name && `on ${log.table_name}`}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  subtitle?: string
  loading?: boolean
}

function StatCard({ title, value, subtitle, loading }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {loading ? (
        <div className="mt-2 h-8 w-20 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className="mt-2 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      )}
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  )
}
