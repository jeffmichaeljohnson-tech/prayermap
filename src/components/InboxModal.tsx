import { motion } from 'framer-motion';
import { X, Heart, Loader2, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ConversationThread } from './ConversationThread';
import { useInbox } from '../hooks/useInbox';
import type { InboxItem } from '../hooks/useInbox';
import { useAuth } from '../contexts/AuthContext';
import { formatRelativeTime, formatInboxMessage, isRecentMessage } from '../lib/utils';
import type { PrayerResponse } from '../types/prayer';

interface InboxModalProps {
  onClose: () => void;
}

interface SelectedConversation {
  id: string;
  prayerId: string; // The actual prayer ID for sending responses
  senderName: string;
  message: string;
  date: Date;
  prayerTitle: string;
  originalPrayerContent: string;
  contentType: 'text' | 'audio' | 'video';
  responses: PrayerResponse[];
}

export function InboxModal({ onClose }: InboxModalProps) {
  const { user } = useAuth();
  const { inbox, loading, error, totalUnread, markAsRead } = useInbox({
    userId: user?.id || '',
    autoFetch: !!user?.id,
    enableRealtime: true,
  });
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  // Transform inbox items to display format
  const getDisplayItems = () => {
    return inbox.flatMap((item: InboxItem) =>
      item.responses.map((response) => {
        const prayerTitle = item.prayer.title || item.prayer.content.substring(0, 50);
        const formattedMessage = formatInboxMessage(
          response.responder_name,
          response.is_anonymous,
          prayerTitle,
          response.message
        );
        
        return {
          id: response.id,
          prayerId: item.prayer.id,
          senderName: formattedMessage.senderDisplay,
          message: response.message,
          messagePreview: formattedMessage.messagePreview,
          fullMessage: formattedMessage.fullMessage,
          isTruncated: formattedMessage.isTruncated,
          date: response.created_at,
          prayerTitle: prayerTitle,
          prayerContext: formattedMessage.prayerContext,
          originalPrayerContent: item.prayer.content,
          contentType: response.content_type,
          unread: !response.read_at, // Check if response has been read
          isRecent: isRecentMessage(response.created_at),
          isAnonymous: response.is_anonymous,
        };
      })
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const displayItems = getDisplayItems();

  // Handle message expansion
  const toggleMessageExpansion = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent conversation selection
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleSelectConversation = (item: typeof displayItems[0]) => {
    // Find the full inbox item to get all responses
    const inboxItem = inbox.find(i => i.prayer.id === item.prayerId);

    setSelectedConversation({
      id: item.id,
      prayerId: item.prayerId,
      senderName: item.senderName,
      message: item.message,
      date: item.date instanceof Date ? item.date : new Date(item.date),
      prayerTitle: item.prayerTitle,
      originalPrayerContent: item.originalPrayerContent,
      contentType: item.contentType,
      responses: inboxItem?.responses || [],
    });
    // Mark the prayer as read when opened
    if ('prayerId' in item) {
      markAsRead(item.prayerId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-linear-to-br from-white/80 via-white/70 to-purple-50/60 backdrop-blur-2xl rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col relative border border-white/60 shadow-xl shadow-purple-200/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-white/30">
              <Heart className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <h3 className="text-gray-800">Prayer Inbox</h3>
              <p className="text-sm text-gray-600">
                {loading ? 'Loading...' : `${displayItems.length} prayers received`}
                {totalUnread > 0 && ` (${totalUnread} unread)`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Prayers List */}
        <AnimatePresence mode="wait">
          {!selectedConversation && (
            <motion.div
              key="inbox-list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto space-y-3 py-2 px-1"
            >
              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-3" />
                  <p className="text-gray-600">Loading your inbox...</p>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-3">😕</div>
                  <p className="text-gray-600">Something went wrong</p>
                  <p className="text-sm text-gray-500 mt-2">{error}</p>
                </div>
              )}

              {/* Not Logged In State */}
              {!user && !loading && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-3">🔒</div>
                  <p className="text-gray-600">Sign in to view your inbox</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Your prayer responses will appear here
                  </p>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && user && displayItems.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-3">📬</div>
                  <p className="text-gray-600">No prayers received yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    When someone prays for you, you'll see it here
                  </p>
                </div>
              )}

              {/* Prayers List */}
              {!loading && !error && user && displayItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white/50 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/70 transition-all cursor-pointer active:scale-[0.98] relative shadow-sm border ${
                    item.unread 
                      ? 'ring-2 ring-blue-400/30 border-blue-200/50 bg-blue-50/30' 
                      : 'border-white/30'
                  }`}
                  onClick={() => handleSelectConversation(item)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Unread indicator and timestamp */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {item.isRecent && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium"
                      >
                        New
                      </motion.div>
                    )}
                    {item.unread && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"
                      />
                    )}
                  </div>

                  {/* Main content */}
                  <div className="pr-16">
                    {/* Header with sender and type indicator */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-purple-500" />
                        <div className="flex items-center gap-1">
                          <p className={`text-gray-800 text-sm ${item.unread ? 'font-semibold' : 'font-medium'}`}>
                            {item.senderName}
                          </p>
                          {item.isAnonymous && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              anonymous
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prayer context */}
                    <p className="text-xs text-purple-600/80 mb-2 font-medium">
                      {item.prayerContext}
                    </p>

                    {/* Message preview */}
                    <div className={`text-sm text-gray-700 leading-relaxed mb-2 ${
                      item.unread ? 'font-medium' : ''
                    }`}>
                      <p>
                        "{expandedMessages.has(item.id) ? item.fullMessage : item.messagePreview}"
                      </p>
                      {item.isTruncated && (
                        <button
                          onClick={(e) => toggleMessageExpansion(item.id, e)}
                          className="text-xs text-purple-600 hover:text-purple-700 mt-1 font-medium transition-colors"
                        >
                          {expandedMessages.has(item.id) ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>

                    {/* Timestamp and actions */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(item.date)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-purple-600">
                        <span>Tap to reply</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation Thread Overlay */}
        <AnimatePresence>
          {selectedConversation && (
            <ConversationThread
              conversationId={selectedConversation.prayerId}
              otherPersonName={selectedConversation.senderName}
              originalPrayer={{
                title: selectedConversation.prayerTitle,
                content: selectedConversation.originalPrayerContent,
                contentType: selectedConversation.contentType
              }}
              initialMessage={selectedConversation.message}
              initialResponses={selectedConversation.responses}
              onBack={() => setSelectedConversation(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}