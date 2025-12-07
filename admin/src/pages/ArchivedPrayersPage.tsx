/**
 * Archived Prayers Management Page
 * View and restore archived prayers from the admin dashboard
 */

import { useState } from 'react'
import { 
  useArchivedPrayers, 
  useRestorePrayer, 
  type ArchivedPrayer 
} from '../hooks/useArchivedPrayers'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/confirm-dialog'

// Archive reason filter options
const ARCHIVE_REASONS = [
  { value: '', label: 'All Reasons' },
  { value: 'expired', label: 'Expired' },
  { value: 'manual', label: 'Manual' },
  { value: 'moderation', label: 'Moderation' },
  { value: 'user_deleted', label: 'User Deleted' },
]

export function ArchivedPrayersPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [archiveReason, setArchiveReason] = useState<string | null>(null)
  const [viewingPrayer, setViewingPrayer] = useState<ArchivedPrayer | null>(null)
  const [restoringPrayer, setRestoringPrayer] = useState<ArchivedPrayer | null>(null)

  const pageSize = 10
  const { data, isLoading, error } = useArchivedPrayers({ 
    page, 
    pageSize, 
    search,
    archiveReason 
  })
  const restorePrayer = useRestorePrayer()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  const handleReasonFilter = (reason: string) => {
    setArchiveReason(reason || null)
    setPage(0)
  }

  const confirmRestore = async () => {
    if (!restoringPrayer) return
    await restorePrayer.mutateAsync({ id: restoringPrayer.id })
    setRestoringPrayer(null)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatArchiveReason = (reason: string | null) => {
    if (!reason) return '-'
    return reason.charAt(0).toUpperCase() + reason.slice(1).replace('_', ' ')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Archived Prayers</h1>
          <p className="text-gray-600">
            View and restore archived prayers. Total: {data?.totalCount ?? 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <Input
            placeholder="Search archived prayers..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit">Search</Button>
          {search && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('')
                setSearchInput('')
              }}
            >
              Clear
            </Button>
          )}
        </form>

        {/* Reason Filter */}
        <select
          value={archiveReason || ''}
          onChange={(e) => handleReasonFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ARCHIVE_REASONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading archived prayers: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title/Content</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Reason</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Archived</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : data?.prayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No archived prayers found
                  </td>
                </tr>
              ) : (
                data?.prayers.map((prayer) => (
                  <tr
                    key={prayer.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setViewingPrayer(prayer)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">
                      {prayer.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="max-w-xs truncate">
                        {prayer.title || prayer.content.substring(0, 40) + '...'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {prayer.is_anonymous ? (
                        <span className="text-gray-400 italic">Anonymous</span>
                      ) : (
                        prayer.user_name || prayer.user_email || 'Unknown'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        prayer.archive_reason === 'expired' 
                          ? 'bg-amber-100 text-amber-700'
                          : prayer.archive_reason === 'moderation'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {formatArchiveReason(prayer.archive_reason)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(prayer.archived_at)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setRestoringPrayer(prayer)}
                        >
                          Restore
                        </Button>
                      </div>
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
              {data.totalCount} archived prayers
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

      {/* View Prayer Dialog */}
      <Dialog isOpen={!!viewingPrayer} onClose={() => setViewingPrayer(null)}>
        <DialogHeader onClose={() => setViewingPrayer(null)}>
          <DialogTitle>Archived Prayer Details</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {viewingPrayer && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">ID</label>
                <p className="font-mono text-sm">{viewingPrayer.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p>{viewingPrayer.title || '(No title)'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Content</label>
                <p className="whitespace-pre-wrap">{viewingPrayer.content}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">User</label>
                <p>
                  {viewingPrayer.is_anonymous
                    ? 'Anonymous'
                    : viewingPrayer.user_name || viewingPrayer.user_email || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Location</label>
                <p>
                  Lat: {viewingPrayer.latitude.toFixed(4)}, Lng: {viewingPrayer.longitude.toFixed(4)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm">{formatDate(viewingPrayer.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Expired</label>
                  <p className="text-sm">{formatDate(viewingPrayer.expires_at)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Archived</label>
                  <p className="text-sm">{formatDate(viewingPrayer.archived_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Reason</label>
                  <p className="text-sm">{formatArchiveReason(viewingPrayer.archive_reason)}</p>
                </div>
              </div>
              {viewingPrayer.media_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Media URL</label>
                  <p className="break-all text-sm">{viewingPrayer.media_url}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewingPrayer(null)}>
            Close
          </Button>
          <Button
            onClick={() => {
              if (viewingPrayer) {
                setRestoringPrayer(viewingPrayer)
                setViewingPrayer(null)
              }
            }}
          >
            Restore
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Restore Confirmation */}
      <ConfirmDialog
        isOpen={!!restoringPrayer}
        onClose={() => setRestoringPrayer(null)}
        onConfirm={confirmRestore}
        title="Restore Prayer"
        description={`Are you sure you want to restore this prayer? It will become visible on the map again with a new 30-day expiration.`}
        confirmText="Restore"
        isLoading={restorePrayer.isPending}
      />
    </div>
  )
}

