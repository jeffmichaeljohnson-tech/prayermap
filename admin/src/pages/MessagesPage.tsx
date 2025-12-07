/**
 * Messages Management Page
 * View and manage prayer_responses (user messages) from the admin dashboard
 */

import { useState } from 'react'
import { useMessages, useDeleteMessage, type AdminMessage } from '../hooks/useMessages'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/confirm-dialog'

export function MessagesPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [viewingMessage, setViewingMessage] = useState<AdminMessage | null>(null)
  const [deletingMessage, setDeletingMessage] = useState<AdminMessage | null>(null)

  const pageSize = 10
  const { data, isLoading, error } = useMessages({ page, pageSize, search })
  const deleteMessage = useDeleteMessage()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  const handleDelete = (message: AdminMessage) => {
    setDeletingMessage(message)
  }

  const confirmDelete = async () => {
    if (!deletingMessage) return
    await deleteMessage.mutateAsync(deletingMessage.id)
    setDeletingMessage(null)
  }

  const truncateText = (text: string | null, maxLength: number = 50) => {
    if (!text) return '(No message)'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const formatStatus = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800' },
      flagged: { label: 'Flagged', className: 'bg-yellow-100 text-yellow-800' },
      hidden: { label: 'Hidden', className: 'bg-red-100 text-red-800' },
      removed: { label: 'Removed', className: 'bg-gray-100 text-gray-800' },
    }
    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">View and manage prayer responses</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search messages by content..."
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
          Error loading messages: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Prayer ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Responder</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Message</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : data?.messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No messages found
                  </td>
                </tr>
              ) : (
                data?.messages.map((message) => (
                  <tr
                    key={message.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setViewingMessage(message)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">
                      {message.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">
                      {message.prayer_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {message.is_anonymous ? (
                        <span className="text-gray-400 italic">Anonymous</span>
                      ) : (
                        message.responder_name || message.responder_email || 'Unknown'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="max-w-xs truncate">
                        {truncateText(message.message)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatStatus(message.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(message.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingMessage(message)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(message)}
                        >
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
              {data.totalCount} messages
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

      {/* View Message Dialog */}
      <Dialog isOpen={!!viewingMessage} onClose={() => setViewingMessage(null)}>
        <DialogHeader onClose={() => setViewingMessage(null)}>
          <DialogTitle>Message Details</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {viewingMessage && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Message ID</label>
                <p className="font-mono text-sm">{viewingMessage.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Prayer ID</label>
                <p className="font-mono text-sm">{viewingMessage.prayer_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Responder</label>
                <p>
                  {viewingMessage.is_anonymous
                    ? 'Anonymous'
                    : viewingMessage.responder_name || viewingMessage.responder_email || 'Unknown'}
                </p>
                <p className="font-mono text-xs text-gray-400 mt-1">ID: {viewingMessage.responder_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Message</label>
                <p className="whitespace-pre-wrap">{viewingMessage.message || '(No message text)'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Content Type</label>
                <p className="capitalize">{viewingMessage.content_type}</p>
              </div>
              {viewingMessage.media_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Media URL</label>
                  <p className="break-all text-sm">{viewingMessage.media_url}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div>{formatStatus(viewingMessage.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p>{new Date(viewingMessage.created_at).toLocaleString()}</p>
              </div>
              {viewingMessage.read_at && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Read At</label>
                  <p>{new Date(viewingMessage.read_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewingMessage(null)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingMessage}
        onClose={() => setDeletingMessage(null)}
        onConfirm={confirmDelete}
        title="Delete Message"
        description="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        isDestructive
        isLoading={deleteMessage.isPending}
      />
    </div>
  )
}
