/**
 * Enhanced Messages Management Page
 * View and manage prayer_responses with split-panel detail view and conversation threading
 */

import { useState, useMemo } from 'react'
import { useMessages, useDeleteMessage, type AdminMessage } from '../hooks/useMessages'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { ConversationViewer } from '../components/ConversationViewer'
import {
  MessageSquare,
  Search,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Eye,
  Loader2,
  X,
  Mic,
  Video,
  FileText,
  User,
  ExternalLink,
} from 'lucide-react'

type ContentTypeFilter = 'all' | 'text' | 'audio' | 'video'

export function MessagesPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null)
  const [deletingMessage, setDeletingMessage] = useState<AdminMessage | null>(null)
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all')
  const [showConversation, setShowConversation] = useState(false)

  const pageSize = 20
  const { data, isLoading, error } = useMessages({ page, pageSize, search })
  const deleteMessage = useDeleteMessage()

  // Filter messages by content type (client-side since we have limited data)
  const filteredMessages = useMemo(() => {
    if (!data?.messages) return []
    if (contentTypeFilter === 'all') return data.messages
    return data.messages.filter((m) => m.content_type === contentTypeFilter)
  }, [data?.messages, contentTypeFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  const handleClearSearch = () => {
    setSearch('')
    setSearchInput('')
    setPage(0)
  }

  const handleSelectMessage = (message: AdminMessage) => {
    setSelectedMessage(message)
    setShowConversation(false)
  }

  const handleDelete = (message: AdminMessage) => {
    setDeletingMessage(message)
  }

  const confirmDelete = async () => {
    if (!deletingMessage) return
    await deleteMessage.mutateAsync(deletingMessage.id)
    setDeletingMessage(null)
    if (selectedMessage?.id === deletingMessage.id) {
      setSelectedMessage(null)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const truncateText = (text: string | null, maxLength: number = 80) => {
    if (!text) return '(No message)'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return <Mic className="w-3.5 h-3.5" />
      case 'video':
        return <Video className="w-3.5 h-3.5" />
      default:
        return <FileText className="w-3.5 h-3.5" />
    }
  }

  const getContentTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'audio':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
      case 'video':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      case 'flagged':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'hidden':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Messages List Panel */}
      <div
        className={`${
          selectedMessage ? 'w-1/2' : 'w-full'
        } border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900 transition-all duration-200`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Messages
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredMessages.length}
              {data?.totalCount ? ` of ${data.totalCount}` : ''} messages
            </span>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search messages, emails..."
                className="pl-10 pr-10 bg-white dark:bg-gray-800"
              />
              {(search || searchInput) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value as ContentTypeFilter)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="all">All Types</option>
              <option value="text">Text</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            Error loading messages: {error.message}
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No messages found</p>
              {search && (
                <button onClick={handleClearSearch} className="text-blue-600 text-sm mt-2 hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    selectedMessage?.id === msg.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {msg.is_anonymous ? (
                            <span className="italic text-gray-500">Anonymous</span>
                          ) : (
                            msg.responder_name || msg.responder_email || 'Unknown'
                          )}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          Prayer #{msg.prayer_id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${getContentTypeBadgeClass(
                          msg.content_type
                        )}`}
                      >
                        {getContentTypeIcon(msg.content_type)}
                        {msg.content_type}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {msg.content_type === 'text' ? truncateText(msg.message) : `[${msg.content_type} message]`}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(msg.status)}`}>
                      {msg.status}
                    </span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(msg.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Page {page + 1} of {data.pageCount}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
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

      {/* Detail Panel */}
      {selectedMessage && (
        <div className="w-1/2 flex flex-col bg-white dark:bg-gray-900">
          {/* Detail Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-semibold text-gray-900 dark:text-white">Message Details</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConversation(true)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Eye className="w-4 h-4 mr-1" />
                View Thread
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(selectedMessage)}
                className="bg-red-100 text-red-700 hover:bg-red-200 border-0"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Detail Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wide">Message ID</p>
                <p className="font-mono text-xs text-gray-900 dark:text-white break-all">{selectedMessage.id}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wide">Prayer ID</p>
                <p className="font-mono text-xs text-gray-900 dark:text-white break-all">{selectedMessage.prayer_id}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wide">From (Responder)</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white">
                      {selectedMessage.is_anonymous ? (
                        <span className="italic text-gray-500">Sent anonymously</span>
                      ) : (
                        selectedMessage.responder_email || 'Unknown'
                      )}
                    </p>
                    {selectedMessage.responder_name && !selectedMessage.is_anonymous && (
                      <p className="text-xs text-gray-500">{selectedMessage.responder_name}</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wide">Responder ID</p>
                <p className="font-mono text-xs text-gray-900 dark:text-white break-all">
                  {selectedMessage.responder_id}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wide">Sent At</p>
                <p className="text-gray-900 dark:text-white">{formatFullDate(selectedMessage.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wide">Content Type</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getContentTypeBadgeClass(
                    selectedMessage.content_type
                  )}`}
                >
                  {getContentTypeIcon(selectedMessage.content_type)}
                  {selectedMessage.content_type}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wide">Status</p>
                <span className={`inline-flex px-2 py-1 rounded text-xs ${getStatusBadgeClass(selectedMessage.status)}`}>
                  {selectedMessage.status}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-wide">Read At</p>
                <p className="text-gray-900 dark:text-white">
                  {selectedMessage.read_at ? formatFullDate(selectedMessage.read_at) : 'Not read yet'}
                </p>
              </div>
            </div>

            {/* Message Content */}
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-2 uppercase tracking-wide">Message Content</p>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {selectedMessage.content_type === 'text' ? (
                  <p className="whitespace-pre-wrap text-gray-900 dark:text-white">
                    {selectedMessage.message || '(No message text)'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-500 italic">[{selectedMessage.content_type} message]</p>
                    {selectedMessage.media_url && (
                      <a
                        href={selectedMessage.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View media file
                      </a>
                    )}
                    {selectedMessage.message && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">Transcription/Description:</p>
                        <p className="text-gray-900 dark:text-white">{selectedMessage.message}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 uppercase tracking-wide">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="text-yellow-700 border-yellow-200 hover:bg-yellow-50">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Warn Sender
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/users?id=${selectedMessage.responder_id}`, '_blank')}
                >
                  <User className="w-4 h-4 mr-1" />
                  View Sender Profile
                </Button>
                <Button variant="outline" onClick={() => window.open(`/prayers?id=${selectedMessage.prayer_id}`, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View Prayer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Thread Modal */}
      {showConversation && selectedMessage && (
        <ConversationViewer prayerResponseId={selectedMessage.id} onClose={() => setShowConversation(false)} />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingMessage}
        onClose={() => setDeletingMessage(null)}
        onConfirm={confirmDelete}
        title="Delete Message"
        description="Are you sure you want to delete this message? This action cannot be undone and will also delete any associated conversation."
        confirmText="Delete"
        isDestructive
        isLoading={deleteMessage.isPending}
      />
    </div>
  )
}
