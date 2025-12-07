/**
 * Conversation Viewer Component
 * Modal that displays the full conversation thread for admin review
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, User, MessageSquare, Mic, Video, FileText, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ConversationMessage {
  id: string
  sender_id: string
  sender_email: string | null
  sender_name: string | null
  content: string
  content_type: string
  media_url: string | null
  created_at: string
  read_at: string | null
}

interface ConversationInfo {
  conversation_id: string | null
  participant_1_id: string
  participant_1_email: string | null
  participant_1_name: string | null
  participant_2_id: string
  participant_2_email: string | null
  participant_2_name: string | null
  participant_2_anonymous: boolean
  prayer_id: string
  prayer_title: string | null
  prayer_response_message: string | null
  prayer_response_content_type: string
  prayer_response_created_at: string
}

interface ConversationViewerProps {
  prayerResponseId: string
  onClose: () => void
}

export function ConversationViewer({ prayerResponseId, onClose }: ConversationViewerProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null)

  useEffect(() => {
    fetchConversation()
  }, [prayerResponseId])

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const fetchConversation = async () => {
    try {
      setError(null)

      // First get the prayer_response details with prayer info
      const { data: prData, error: prError } = await supabase
        .from('prayer_responses')
        .select(
          `
          id,
          prayer_id,
          responder_id,
          message,
          content_type,
          is_anonymous,
          created_at,
          prayers (
            id,
            title,
            user_id
          )
        `
        )
        .eq('id', prayerResponseId)
        .single()

      if (prError) throw prError
      if (!prData) throw new Error('Prayer response not found')

      // Type assertion for the joined prayers data (single object, not array)
      const prayerData = prData.prayers as unknown as { id: string; title: string | null; user_id: string } | null

      // Get participant info
      const participantIds = [prayerData?.user_id, prData.responder_id].filter(Boolean) as string[]

      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, first_name, email')
        .in('user_id', participantIds)

      // Also try to get from auth.users for emails (admin only)
      // This requires service role or admin-level access
      const userMap = new Map<string, { email: string | null; name: string | null }>()

      usersData?.forEach((u) => {
        userMap.set(u.user_id, {
          email: u.email || null,
          name: u.first_name || null,
        })
      })

      const participant1 = userMap.get(prayerData?.user_id || '') || { email: null, name: null }
      const participant2 = userMap.get(prData.responder_id) || { email: null, name: null }

      // Check if there's an existing conversation
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .eq('prayer_response_id', prayerResponseId)
        .single()

      setConversationInfo({
        conversation_id: convData?.id || null,
        participant_1_id: prayerData?.user_id || '',
        participant_1_email: participant1.email,
        participant_1_name: participant1.name,
        participant_2_id: prData.responder_id,
        participant_2_email: participant2.email,
        participant_2_name: participant2.name,
        participant_2_anonymous: prData.is_anonymous,
        prayer_id: prData.prayer_id,
        prayer_title: prayerData?.title || null,
        prayer_response_message: prData.message,
        prayer_response_content_type: prData.content_type,
        prayer_response_created_at: prData.created_at,
      })

      // If there's a conversation, fetch all messages
      if (convData?.id) {
        const { data: msgsData, error: msgsError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convData.id)
          .order('created_at', { ascending: true })

        if (msgsError) throw msgsError

        // Map messages with user info
        const formattedMessages: ConversationMessage[] =
          msgsData?.map((m) => {
            const sender = userMap.get(m.sender_id) || { email: null, name: null }
            return {
              id: m.id,
              sender_id: m.sender_id,
              sender_email: sender.email,
              sender_name: sender.name,
              content: m.content,
              content_type: m.content_type,
              media_url: m.media_url,
              created_at: m.created_at,
              read_at: m.read_at,
            }
          }) || []

        setMessages(formattedMessages)
      }
    } catch (err) {
      console.error('Failed to fetch conversation:', err)
      setError(err instanceof Error ? err.message : 'Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return <Mic className="w-4 h-4" />
      case 'video':
        return <Video className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getParticipantLabel = (participantId: string) => {
    if (!conversationInfo) return 'Unknown'

    if (participantId === conversationInfo.participant_1_id) {
      return conversationInfo.participant_1_name || conversationInfo.participant_1_email || 'Prayer Owner'
    }

    if (participantId === conversationInfo.participant_2_id) {
      if (conversationInfo.participant_2_anonymous) {
        return 'Anonymous Responder'
      }
      return conversationInfo.participant_2_name || conversationInfo.participant_2_email || 'Responder'
    }

    return 'Unknown'
  }

  const isParticipant1 = (participantId: string) => {
    return conversationInfo?.participant_1_id === participantId
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Conversation Thread
              </h2>
              {conversationInfo && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {getParticipantLabel(conversationInfo.participant_1_id)} ↔{' '}
                  {getParticipantLabel(conversationInfo.participant_2_id)}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Prayer Context */}
          {conversationInfo && (
            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Conversation about prayer:
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {conversationInfo.prayer_title || 'Untitled Prayer'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: {conversationInfo.prayer_id}</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <p>{error}</p>
              </div>
            ) : (
              <>
                {/* Initial Prayer Response (always first) */}
                {conversationInfo && (
                  <div className="flex gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        conversationInfo.participant_2_anonymous
                          ? 'bg-gray-200 dark:bg-gray-700'
                          : 'bg-purple-100 dark:bg-purple-900/30'
                      }`}
                    >
                      <User
                        className={`w-4 h-4 ${
                          conversationInfo.participant_2_anonymous
                            ? 'text-gray-500'
                            : 'text-purple-600 dark:text-purple-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {getParticipantLabel(conversationInfo.participant_2_id)}
                        </span>
                        <span className="text-xs text-gray-400">{formatTime(conversationInfo.prayer_response_created_at)}</span>
                        <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                          Initial Response
                        </span>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-3">
                        {conversationInfo.prayer_response_content_type === 'text' ? (
                          <p className="text-sm text-gray-900 dark:text-white">
                            {conversationInfo.prayer_response_message || '(No message)'}
                          </p>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {getContentTypeIcon(conversationInfo.prayer_response_content_type)}
                            <span className="capitalize">{conversationInfo.prayer_response_content_type} message</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Subsequent Messages */}
                {messages.length === 0 && conversationInfo && (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No follow-up messages in this thread yet.</p>
                    <p className="text-xs mt-1">Only the initial prayer response has been sent.</p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isParticipant1(msg.sender_id)
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-purple-100 dark:bg-purple-900/30'
                      }`}
                    >
                      <User
                        className={`w-4 h-4 ${
                          isParticipant1(msg.sender_id)
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {getParticipantLabel(msg.sender_id)}
                        </span>
                        <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                        {msg.read_at && <span className="text-xs text-green-600">✓ Read</span>}
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          isParticipant1(msg.sender_id)
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
                            : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {msg.content_type === 'text' ? (
                          <p className="text-sm text-gray-900 dark:text-white">{msg.content}</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              {getContentTypeIcon(msg.content_type)}
                              <span className="capitalize">{msg.content_type} message</span>
                            </div>
                            {msg.media_url && (
                              <a
                                href={msg.media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View media
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {loading ? (
                'Loading...'
              ) : conversationInfo?.conversation_id ? (
                <>
                  {messages.length + 1} message{messages.length !== 0 ? 's' : ''} in this thread
                </>
              ) : (
                'No conversation started (only initial response)'
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

