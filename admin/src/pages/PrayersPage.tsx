/**
 * Prayers Management Page
 * View, edit, and delete prayers from the admin dashboard
 */

import { useState } from 'react'
import { usePrayers, useUpdatePrayer, useDeletePrayer, type AdminPrayer } from '../hooks/usePrayers'
import { useArchivePrayer } from '../hooks/useArchivedPrayers'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/confirm-dialog'

export function PrayersPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [editingPrayer, setEditingPrayer] = useState<AdminPrayer | null>(null)
  const [deletingPrayer, setDeletingPrayer] = useState<AdminPrayer | null>(null)
  const [archivingPrayer, setArchivingPrayer] = useState<AdminPrayer | null>(null)
  const [viewingPrayer, setViewingPrayer] = useState<AdminPrayer | null>(null)

  const pageSize = 10
  const { data, isLoading, error } = usePrayers({ page, pageSize, search })
  const updatePrayer = useUpdatePrayer()
  const deletePrayer = useDeletePrayer()
  const archivePrayer = useArchivePrayer()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  const handleEdit = (prayer: AdminPrayer) => {
    setEditingPrayer(prayer)
  }

  const handleDelete = (prayer: AdminPrayer) => {
    setDeletingPrayer(prayer)
  }

  const handleArchive = (prayer: AdminPrayer) => {
    setArchivingPrayer(prayer)
  }

  const confirmDelete = async () => {
    if (!deletingPrayer) return
    await deletePrayer.mutateAsync(deletingPrayer.id)
    setDeletingPrayer(null)
  }

  const confirmArchive = async () => {
    if (!archivingPrayer) return
    await archivePrayer.mutateAsync({ id: archivingPrayer.id, reason: 'manual' })
    setArchivingPrayer(null)
  }

  // Helper to check if prayer is expiring soon (within 7 days)
  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false
    const expDate = new Date(expiresAt)
    const now = new Date()
    const daysUntilExpiry = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prayers</h1>
          <p className="text-gray-600">Manage all prayer requests</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search prayers by title or content..."
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

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading prayers: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Expires</th>
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
                    No prayers found
                  </td>
                </tr>
              ) : (
                data?.prayers.map((prayer) => (
                  <tr
                    key={prayer.id}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      isExpired(prayer.expires_at) ? 'bg-red-50' : 
                      isExpiringSoon(prayer.expires_at) ? 'bg-amber-50' : ''
                    }`}
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
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(prayer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {prayer.expires_at ? (
                        <span className={`${
                          isExpired(prayer.expires_at) ? 'text-red-600 font-medium' :
                          isExpiringSoon(prayer.expires_at) ? 'text-amber-600' : 'text-gray-500'
                        }`}>
                          {isExpired(prayer.expires_at) ? 'Expired' : new Date(prayer.expires_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(prayer)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleArchive(prayer)}>
                          Archive
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(prayer)}>
                          Delete
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
              {data.totalCount} prayers
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
          <DialogTitle>Prayer Details</DialogTitle>
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
                  Lat: {viewingPrayer.latitude}, Lng: {viewingPrayer.longitude}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm">{new Date(viewingPrayer.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Expires</label>
                  <p className={`text-sm ${
                    viewingPrayer.expires_at && isExpired(viewingPrayer.expires_at) 
                      ? 'text-red-600 font-medium' 
                      : viewingPrayer.expires_at && isExpiringSoon(viewingPrayer.expires_at)
                      ? 'text-amber-600'
                      : ''
                  }`}>
                    {viewingPrayer.expires_at 
                      ? isExpired(viewingPrayer.expires_at) 
                        ? `Expired ${new Date(viewingPrayer.expires_at).toLocaleDateString()}`
                        : new Date(viewingPrayer.expires_at).toLocaleString()
                      : '(No expiration)'}
                  </p>
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
            variant="outline"
            onClick={() => {
              if (viewingPrayer) {
                setArchivingPrayer(viewingPrayer)
                setViewingPrayer(null)
              }
            }}
          >
            Archive
          </Button>
          <Button
            onClick={() => {
              if (viewingPrayer) {
                setEditingPrayer(viewingPrayer)
                setViewingPrayer(null)
              }
            }}
          >
            Edit
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Prayer Dialog */}
      <EditPrayerDialog
        prayer={editingPrayer}
        onClose={() => setEditingPrayer(null)}
        onSave={async (updates) => {
          if (!editingPrayer) return
          await updatePrayer.mutateAsync({ id: editingPrayer.id, ...updates })
          setEditingPrayer(null)
        }}
        isLoading={updatePrayer.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingPrayer}
        onClose={() => setDeletingPrayer(null)}
        onConfirm={confirmDelete}
        title="Delete Prayer"
        description={`Are you sure you want to delete this prayer? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive
        isLoading={deletePrayer.isPending}
      />

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={!!archivingPrayer}
        onClose={() => setArchivingPrayer(null)}
        onConfirm={confirmArchive}
        title="Archive Prayer"
        description={`Are you sure you want to archive this prayer? It will be removed from the map but can be restored later from the Archived Prayers page.`}
        confirmText="Archive"
        isLoading={archivePrayer.isPending}
      />
    </div>
  )
}

interface EditPrayerDialogProps {
  prayer: AdminPrayer | null
  onClose: () => void
  onSave: (updates: { title?: string; content?: string; latitude?: number; longitude?: number }) => Promise<void>
  isLoading: boolean
}

function EditPrayerDialog({ prayer, onClose, onSave, isLoading }: EditPrayerDialogProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')

  // Reset form when prayer changes
  useState(() => {
    if (prayer) {
      setTitle(prayer.title || '')
      setContent(prayer.content)
      setLatitude(prayer.latitude.toString())
      setLongitude(prayer.longitude.toString())
    }
  })

  // Also update when dialog opens with new prayer
  if (prayer && title === '' && content === '') {
    setTitle(prayer.title || '')
    setContent(prayer.content)
    setLatitude(prayer.latitude.toString())
    setLongitude(prayer.longitude.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      title: title || undefined,
      content,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
    })
    // Reset form
    setTitle('')
    setContent('')
    setLatitude('')
    setLongitude('')
  }

  return (
    <Dialog isOpen={!!prayer} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogHeader onClose={onClose}>
          <DialogTitle>Edit Prayer</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Prayer title (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                placeholder="Prayer content"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g. 42.6885"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g. -83.1751"
                />
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
