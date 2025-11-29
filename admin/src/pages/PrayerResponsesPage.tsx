/**
 * Prayer Responses Management Page
 * View, moderate, and manage prayer responses from the admin dashboard
 */

import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { MediaPlayer } from '../components/ui/media-player'
import { Textarea } from '../components/ui/textarea'
import { Mic, Video, FileText, Eye, EyeOff } from 'lucide-react'

// For now, using mock data structure until we implement the actual hooks
interface AdminPrayerResponse {
  id: string
  prayer_id: string
  prayer_title?: string
  prayer_content?: string
  responder_id: string
  responder_name?: string
  responder_email?: string
  is_anonymous: boolean
  message: string
  content_type: 'text' | 'audio' | 'video'
  content_url?: string
  created_at: string
  read_at?: string
  flagged_count?: number
  flag_reasons?: string[]
  status?: 'active' | 'hidden' | 'removed' | 'pending_review'
  moderation_notes?: Array<{
    action: string
    note: string
    timestamp: string
  }>
}

type FilterType = 'all' | 'flagged' | 'pending_review'

export function PrayerResponsesPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [viewingResponse, setViewingResponse] = useState<AdminPrayerResponse | null>(null)
  const [moderatingResponse, setModeratingResponse] = useState<{
    response: AdminPrayerResponse
    action: 'approve' | 'hide' | 'remove'
  } | null>(null)
  const [moderationNote, setModerationNote] = useState('')
  const [selectedResponseIds, setSelectedResponseIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<{
    action: 'approve' | 'hide' | 'remove'
    note: string
  } | null>(null)
  const [blurredContent, setBlurredContent] = useState<Set<string>>(new Set())

  const pageSize = 10
  
  // Mock data for now - replace with actual hook
  const isLoading = false
  const error = null
  const data = {
    responses: [] as AdminPrayerResponse[],
    totalCount: 0,
    pageCount: 0
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  const handleModerate = (response: AdminPrayerResponse, action: 'approve' | 'hide' | 'remove') => {
    setModeratingResponse({ response, action })
    setModerationNote('')
  }

  const confirmModerate = async () => {
    if (!moderatingResponse) return
    
    // TODO: Implement moderation mutation
    console.log('Moderating response:', moderatingResponse.response.id, moderatingResponse.action, moderationNote)
    
    setModeratingResponse(null)
    setModerationNote('')
  }

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (!data?.responses) return

    if (selectedResponseIds.size === data.responses.length) {
      setSelectedResponseIds(new Set())
    } else {
      setSelectedResponseIds(new Set(data.responses.map(r => r.id)))
    }
  }

  const handleSelectResponse = (responseId: string) => {
    setSelectedResponseIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(responseId)) {
        newSet.delete(responseId)
      } else {
        newSet.add(responseId)
      }
      return newSet
    })
  }

  const handleBulkAction = (action: 'approve' | 'hide' | 'remove') => {
    setBulkAction({ action, note: '' })
  }

  const confirmBulkAction = async () => {
    if (!bulkAction) return

    // TODO: Implement bulk moderation mutation
    console.log('Bulk action:', Array.from(selectedResponseIds), bulkAction.action, bulkAction.note)

    setSelectedResponseIds(new Set())
    setBulkAction(null)
  }

  const toggleContentBlur = (responseId: string) => {
    setBlurredContent(prev => {
      const newSet = new Set(prev)
      if (newSet.has(responseId)) {
        newSet.delete(responseId)
      } else {
        newSet.add(responseId)
      }
      return newSet
    })
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      hidden: 'bg-yellow-100 text-yellow-800',
      removed: 'bg-red-100 text-red-800',
      pending_review: 'bg-blue-100 text-blue-800',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getFlagReasonBadge = (reason: string) => {
    const badges = {
      inappropriate: 'bg-orange-100 text-orange-800',
      spam: 'bg-purple-100 text-purple-800',
      offensive: 'bg-red-100 text-red-800',
      harassment: 'bg-pink-100 text-pink-800',
      violence: 'bg-red-200 text-red-900',
      other: 'bg-gray-100 text-gray-800',
    }
    return badges[reason as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prayer Responses</h1>
          <p className="text-gray-600">Manage prayer responses and community interactions</p>
        </div>

        {/* Bulk Actions */}
        {selectedResponseIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">
              {selectedResponseIds.size} selected
            </span>
            <Button
              size="sm"
              variant="default"
              onClick={() => handleBulkAction('approve')}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('hide')}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
            >
              Hide Selected
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction('remove')}
            >
              Remove Selected
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search responses by content, prayer title, or user..."
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

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['all', 'flagged', 'pending_review'] as FilterType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setFilter(tab)
                  setPage(0)
                }}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  filter === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'all' && 'All Responses'}
                {tab === 'flagged' && 'Flagged'}
                {tab === 'pending_review' && 'Pending Review'}
                {data && tab === filter && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                    {data.totalCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border-t border-red-200 text-red-700">
            Error loading prayer responses: {error.message}
          </div>
        )}

        {/* Response List */}
        <div className="divide-y divide-gray-200">
          {/* Select All Header */}
          {!isLoading && data && data.responses.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedResponseIds.size === data.responses.length && data.responses.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({data.responses.length})
                </span>
              </label>
            </div>
          )}

          {isLoading ? (
            <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
          ) : data?.responses.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <div className="text-4xl mb-2">✓</div>
              <div className="text-lg font-medium">No responses found</div>
              <div className="text-sm">No prayer responses match your current filter</div>
            </div>
          ) : (
            data?.responses.map((response) => (
              <div key={response.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  {/* Checkbox */}
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={selectedResponseIds.has(response.id)}
                      onChange={() => handleSelectResponse(response.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <ContentTypeIcon contentType={response.content_type} />
                          <span className="text-sm font-medium text-gray-500">Response to:</span>
                          <span className="font-medium text-gray-900 truncate max-w-xs">
                            {response.prayer_title || response.prayer_content?.substring(0, 40) + '...' || 'Untitled Prayer'}
                          </span>
                          {response.status && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(response.status)}`}>
                              {response.status.replace('_', ' ')}
                            </span>
                          )}
                          {response.flagged_count && response.flagged_count > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              {response.flagged_count} flags
                            </span>
                          )}
                        </div>
                        
                        {/* Response Content */}
                        <div className="relative">
                          {response.content_type === 'text' ? (
                            <div className="flex items-center gap-2">
                              <p className={`text-sm text-gray-600 line-clamp-2 flex-1 ${
                                blurredContent.has(response.id) ? 'filter blur-sm' : ''
                              }`}>
                                {response.message}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleContentBlur(response.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {blurredContent.has(response.id) ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-500 italic flex-1">
                                {response.content_type === 'audio' ? 'Audio response - click View Details to listen' : 'Video response - click View Details to watch'}
                              </p>
                              {response.message && (
                                <p className={`text-xs text-gray-400 ${
                                  blurredContent.has(response.id) ? 'filter blur-sm' : ''
                                }`}>
                                  "{response.message.substring(0, 30)}..."
                                </p>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleContentBlur(response.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {blurredContent.has(response.id) ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Flags */}
                    {response.flag_reasons && response.flag_reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-xs text-gray-500">Flagged for:</span>
                        {response.flag_reasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 text-xs font-medium rounded ${getFlagReasonBadge(reason)}`}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>
                        {response.is_anonymous ? 'Anonymous' : response.responder_name || response.responder_email || 'Unknown user'}
                      </span>
                      <span>•</span>
                      <span>{new Date(response.created_at).toLocaleString()}</span>
                      {response.read_at && (
                        <>
                          <span>•</span>
                          <span className="text-green-600">Read</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewingResponse(response)}>
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleModerate(response, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleModerate(response, 'hide')}
                      className="text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                    >
                      Hide
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleModerate(response, 'remove')}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {data && data.pageCount > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-gray-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data.totalCount)} of{' '}
              {data.totalCount} responses
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

      {/* View Response Details Dialog */}
      <ResponseDetailsDialog response={viewingResponse} onClose={() => setViewingResponse(null)} />

      {/* Moderate Response Confirmation */}
      <Dialog isOpen={!!moderatingResponse} onClose={() => setModeratingResponse(null)}>
        <DialogHeader onClose={() => setModeratingResponse(null)}>
          <DialogTitle>
            {moderatingResponse?.action === 'approve' && 'Approve Response'}
            {moderatingResponse?.action === 'hide' && 'Hide Response'}
            {moderatingResponse?.action === 'remove' && 'Remove Response'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {moderatingResponse?.action === 'approve' &&
                'This response will be visible to users and marked as active.'}
              {moderatingResponse?.action === 'hide' &&
                'This response will be hidden from users but not deleted.'}
              {moderatingResponse?.action === 'remove' &&
                'This response will be permanently removed. This action cannot be undone.'}
            </p>
            {moderatingResponse?.response && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm line-clamp-3">{moderatingResponse.response.message}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a note (optional)
              </label>
              <Textarea
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                placeholder="Reason for this action, additional context, etc."
                rows={3}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModeratingResponse(null)}>
            Cancel
          </Button>
          <Button
            onClick={confirmModerate}
            className={
              moderatingResponse?.action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : moderatingResponse?.action === 'remove'
                ? 'bg-red-600 hover:bg-red-700'
                : undefined
            }
          >
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog isOpen={!!bulkAction} onClose={() => setBulkAction(null)}>
        <DialogHeader onClose={() => setBulkAction(null)}>
          <DialogTitle>
            {bulkAction?.action === 'approve' && 'Approve Selected Responses'}
            {bulkAction?.action === 'hide' && 'Hide Selected Responses'}
            {bulkAction?.action === 'remove' && 'Remove Selected Responses'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {bulkAction?.action === 'approve' &&
                `You are about to approve ${selectedResponseIds.size} response(s). They will be visible to users and marked as active.`}
              {bulkAction?.action === 'hide' &&
                `You are about to hide ${selectedResponseIds.size} response(s). They will be hidden from users but not deleted.`}
              {bulkAction?.action === 'remove' &&
                `You are about to permanently remove ${selectedResponseIds.size} response(s). This action cannot be undone.`}
            </p>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">
                Selected responses: {selectedResponseIds.size}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add a note (optional)
              </label>
              <Textarea
                value={bulkAction?.note || ''}
                onChange={(e) => setBulkAction(prev => prev ? { ...prev, note: e.target.value } : null)}
                placeholder="Reason for this action, additional context, etc."
                rows={3}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBulkAction(null)}>
            Cancel
          </Button>
          <Button
            onClick={confirmBulkAction}
            className={
              bulkAction?.action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : bulkAction?.action === 'remove'
                ? 'bg-red-600 hover:bg-red-700'
                : undefined
            }
          >
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

// Response Details Dialog Component
interface ResponseDetailsDialogProps {
  response: AdminPrayerResponse | null
  onClose: () => void
}

function ResponseDetailsDialog({ response, onClose }: ResponseDetailsDialogProps) {
  if (!response) return null

  return (
    <Dialog isOpen={!!response} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>Response Details</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">ID</label>
            <p className="font-mono text-sm">{response.id}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Original Prayer</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium">{response.prayer_title || 'Untitled'}</p>
              <p className="text-sm text-gray-600 mt-1">{response.prayer_content}</p>
            </div>
          </div>

          {response.status && (
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="mt-1 text-sm">
                <span className="px-2 py-1 rounded bg-gray-100">{response.status.replace('_', ' ')}</span>
              </p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-gray-500">Content Type</label>
            <p className="mt-1 flex items-center gap-2">
              <ContentTypeIcon contentType={response.content_type} />
              <span className="capitalize">{response.content_type}</span>
            </p>
          </div>
          
          {/* Show media player for audio/video responses */}
          {(response.content_type === 'audio' || response.content_type === 'video') && response.content_url && (
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">
                {response.content_type === 'audio' ? 'Audio Response' : 'Video Response'}
              </label>
              <MediaPlayer
                src={response.content_url}
                contentType={response.content_type}
              />
            </div>
          )}
          
          {/* Show text message for all responses */}
          <div>
            <label className="text-sm font-medium text-gray-500">Message</label>
            <p className="mt-1 whitespace-pre-wrap">{response.message}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">User</label>
            <p className="mt-1">
              {response.is_anonymous ? 'Anonymous' : response.responder_name || response.responder_email || 'Unknown'}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="mt-1 text-sm">{new Date(response.created_at).toLocaleString()}</p>
          </div>
          
          {response.read_at && (
            <div>
              <label className="text-sm font-medium text-gray-500">Read</label>
              <p className="mt-1 text-sm text-green-600">
                {new Date(response.read_at).toLocaleString()}
              </p>
            </div>
          )}
          
          {response.flagged_count && response.flagged_count > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500">Flags</label>
              <p className="mt-1 text-sm">{response.flagged_count} flag(s)</p>
              {response.flag_reasons && response.flag_reasons.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {response.flag_reasons.map((reason, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800">
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {response.moderation_notes && response.moderation_notes.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500">Moderation History</label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {response.moderation_notes.map((note, idx) => (
                  <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                    <div className="font-medium">{note.action}</div>
                    <div className="text-gray-600">{note.note}</div>
                    <div className="text-gray-500 mt-1">
                      {new Date(note.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// Helper component to display content type icon
function ContentTypeIcon({ contentType }: { contentType: string }) {
  const iconClasses = 'w-4 h-4'

  switch (contentType) {
    case 'audio':
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100" title="Audio Response">
          <Mic className={`${iconClasses} text-purple-600`} />
        </span>
      )
    case 'video':
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100" title="Video Response">
          <Video className={`${iconClasses} text-blue-600`} />
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100" title="Text Response">
          <FileText className={`${iconClasses} text-gray-600`} />
        </span>
      )
  }
}