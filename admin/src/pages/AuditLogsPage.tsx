/**
 * Audit Logs Page
 * View all admin actions and changes
 */

import { useState } from 'react'
import { useAuditLogs, type AuditLog } from '../hooks/useAuditLogs'
import { Button } from '../components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/dialog'

export function AuditLogsPage() {
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState<string | undefined>()
  const [tableFilter, setTableFilter] = useState<string | undefined>()
  const [viewingLog, setViewingLog] = useState<AuditLog | null>(null)

  const pageSize = 20
  const { data, isLoading, error } = useAuditLogs({
    page,
    pageSize,
    action: actionFilter,
    tableName: tableFilter,
  })

  const actionBadgeColor = (action: string) => {
    switch (action) {
      case 'delete_prayer':
      case 'delete_user':
        return 'bg-red-100 text-red-800'
      case 'update_prayer':
      case 'update_user':
        return 'bg-blue-100 text-blue-800'
      case 'create_prayer':
      case 'create_user':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600">Track all admin actions and changes</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <select
          value={actionFilter || ''}
          onChange={(e) => {
            setActionFilter(e.target.value || undefined)
            setPage(0)
          }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Actions</option>
          <option value="update_prayer">Update Prayer</option>
          <option value="delete_prayer">Delete Prayer</option>
          <option value="update_user">Update User</option>
        </select>

        <select
          value={tableFilter || ''}
          onChange={(e) => {
            setTableFilter(e.target.value || undefined)
            setPage(0)
          }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Tables</option>
          <option value="prayers">Prayers</option>
          <option value="profiles">Profiles</option>
          <option value="admin_roles">Admin Roles</option>
        </select>

        {(actionFilter || tableFilter) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActionFilter(undefined)
              setTableFilter(undefined)
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading audit logs: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Table</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Record ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Admin ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : data?.logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                data?.logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${actionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.table_name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">
                      {log.record_id ? log.record_id.slice(0, 8) + '...' : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">
                      {log.admin_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button size="sm" variant="ghost" onClick={() => setViewingLog(log)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pageCount > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data.totalCount)} of{' '}
              {data.totalCount} logs
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pageCount - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View Log Dialog */}
      <Dialog isOpen={!!viewingLog} onClose={() => setViewingLog(null)}>
        <DialogHeader onClose={() => setViewingLog(null)}>
          <DialogTitle>Audit Log Details</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {viewingLog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Log ID</label>
                <p className="font-mono text-sm">{viewingLog.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Timestamp</label>
                <p>{new Date(viewingLog.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Action</label>
                <p>
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${actionBadgeColor(viewingLog.action)}`}>
                    {viewingLog.action}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Table</label>
                <p>{viewingLog.table_name || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Record ID</label>
                <p className="font-mono text-sm">{viewingLog.record_id || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Admin ID</label>
                <p className="font-mono text-sm">{viewingLog.admin_id}</p>
              </div>
              {viewingLog.old_values && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Old Values</label>
                  <pre className="mt-1 p-3 bg-gray-50 rounded-md text-xs overflow-auto max-h-48">
                    {JSON.stringify(viewingLog.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {viewingLog.new_values && (
                <div>
                  <label className="text-sm font-medium text-gray-500">New Values</label>
                  <pre className="mt-1 p-3 bg-gray-50 rounded-md text-xs overflow-auto max-h-48">
                    {JSON.stringify(viewingLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewingLog(null)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
