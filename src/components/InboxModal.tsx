import { motion } from 'framer-motion';
import { X, Heart, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ConversationThread } from './ConversationThread';
import { useInbox } from '../hooks/useInbox';
import type { InboxItem } from '../hooks/useInbox';
import { useAuth } from '../hooks/useAuth';

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
  responses: import('../types/prayer').PrayerResponse[];
}

export function InboxModal({ onClose }: InboxModalProps) {
  const { user } = useAuth();
  const { inbox, loading, error, totalUnread, markAsRead } = useInbox({
    userId: user?.id || '',
    autoFetch: !!user?.id,
    enableRealtime: true,
  });
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);

  // Transform inbox items to display format
  const getDisplayItems = () => {
    return inbox.flatMap((item: InboxItem) =>
      item.responses.map((response) => ({
        id: response.id,
        prayerId: item.prayer.id,
        senderName: response.is_anonymous ? 'Anonymous' : (response.responder_name || 'Someone'),
        message: response.message,
        date: response.created_at,
        prayerTitle: item.prayer.title || item.prayer.content.substring(0, 30) + '...',
        originalPrayerContent: item.prayer.content,
        contentType: response.content_type,
        unread: item.unreadCount > 0, // Simplified - could track per-response
      }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const displayItems = getDisplayItems();

  const getTimeAgo = (date: Date) => {
    const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime();
    // eslint-disable-next-line react-hooks/purity
    const hours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
                  className={`bg-white/50 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/70 transition-all cursor-pointer active:scale-[0.98] relative shadow-sm ${
                    item.unread ? 'ring-1 ring-blue-300/40' : ''
                  }`}
                  onClick={() => handleSelectConversation(item)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Unread indicator */}
                  {item.unread && (
                    <div className="absolute top-4 right-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"
                      />
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-2 mt-0 mr-[50px] ml-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🙏</span>
                      <div>
                        <p className={`text-gray-800 ${item.unread ? 'font-semibold' : ''}`}>
                          {item.senderName}
                        </p>
                        <p className="text-xs text-gray-500">{getTimeAgo(item.date)}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-purple-600 mb-1">Re: {item.prayerTitle}</p>
                  <p className={`text-sm text-gray-700 leading-relaxed ${
                    item.unread ? 'font-medium' : ''
                  }`}>
                    {item.message}
                  </p>
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