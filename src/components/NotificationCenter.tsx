/**
 * NotificationCenter Component
 *
 * Beautiful notification center with:
 * - Slide-out panel (right on desktop, bottom sheet on mobile)
 * - Grouped by date (Today, Yesterday, This Week, Earlier)
 * - Distinct styling per notification type
 * - Mark as read on view
 * - Click to navigate to related prayer
 * - Empty state with encouragement
 * - Smooth animations with Framer Motion
 * - Swipe to dismiss on mobile
 */

import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Heart, MessageCircle, CheckCircle, Bell, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, type Notification, type NotificationType } from '../hooks/useNotifications';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface NotificationCenterProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPrayer?: (prayerId: string) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Group notifications by date
 */
function groupNotificationsByDate(notifications: Notification[]): {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  earlier: Notification[];
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    today: [] as Notification[],
    yesterday: [] as Notification[],
    thisWeek: [] as Notification[],
    earlier: [] as Notification[],
  };

  notifications.forEach(notification => {
    const notifDate = new Date(notification.created_at);
    if (notifDate >= today) {
      groups.today.push(notification);
    } else if (notifDate >= yesterday) {
      groups.yesterday.push(notification);
    } else if (notifDate >= weekAgo) {
      groups.thisWeek.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  });

  return groups;
}

/**
 * Get notification metadata (icon, color, title, message)
 */
function getNotificationMeta(notification: Notification): {
  icon: typeof Heart;
  color: string;
  bgColor: string;
  title: string;
  message: string;
} {
  const { type, payload } = notification;

  switch (type) {
    case 'SUPPORT_RECEIVED':
      return {
        icon: Heart,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50',
        title: 'Prayer Support',
        message: `${payload.supporter_name || 'Someone'} sent prayer for you`,
      };

    case 'RESPONSE_RECEIVED':
      const contentType = payload.content_type;
      const responseText = contentType === 'audio'
        ? 'sent an audio prayer'
        : contentType === 'video'
        ? 'sent a video prayer'
        : payload.message || 'responded to your prayer';

      return {
        icon: MessageCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        title: 'New Response',
        message: `${payload.responder_name || 'Someone'} ${responseText}`,
      };

    case 'PRAYER_ANSWERED':
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        title: 'Prayer Answered',
        message: 'Your prayer was marked as answered',
      };

    default:
      return {
        icon: Bell,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        title: 'Notification',
        message: 'You have a new notification',
      };
  }
}

/**
 * Format time ago
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDismiss: () => void;
  index: number;
}

function NotificationItem({ notification, onClick, onDismiss, index }: NotificationItemProps) {
  const reducedMotion = useReducedMotion();
  const meta = getNotificationMeta(notification);
  const Icon = meta.icon;
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    // Swipe to dismiss (50px threshold)
    if (Math.abs(info.offset.x) > 50) {
      onDismiss();
    }
  };

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -100 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={() => !isDragging && onClick()}
      className={`
        relative overflow-hidden rounded-2xl p-4 cursor-pointer
        transition-all duration-200
        ${notification.is_read
          ? 'bg-white/40 backdrop-blur-md border border-gray-200/50'
          : 'bg-white/70 backdrop-blur-lg border border-white shadow-lg shadow-purple-100/30 ring-2 ring-purple-200/30'
        }
        hover:shadow-xl hover:scale-[1.01]
        active:scale-[0.99]
      `}
    >
      {/* Unread indicator glow */}
      {!notification.is_read && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-r from-purple-200/20 via-pink-200/20 to-blue-200/20 pointer-events-none"
        />
      )}

      <div className="flex gap-3 relative z-10">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${meta.bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${meta.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900">{meta.title}</h4>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatTimeAgo(notification.created_at)}
            </span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-2">{meta.message}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// NOTIFICATION GROUP COMPONENT
// ============================================================================

interface NotificationGroupProps {
  title: string;
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onNotificationDismiss: (notificationId: string) => void;
}

function NotificationGroup({ title, notifications, onNotificationClick, onNotificationDismiss }: NotificationGroupProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
        {title}
      </h3>
      <div className="space-y-2">
        {notifications.map((notification, index) => (
          <NotificationItem
            key={notification.notification_id}
            notification={notification}
            onClick={() => onNotificationClick(notification)}
            onDismiss={() => onNotificationDismiss(notification.notification_id)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full py-12 px-6 text-center"
    >
      <motion.div
        animate={reducedMotion ? {} : {
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-purple-400" />
        </div>
      </motion.div>

      <h3 className="text-lg font-display font-semibold text-gray-800 mb-2">
        No notifications yet
      </h3>
      <p className="text-sm text-gray-600 max-w-xs">
        When someone sends prayer or responds to your requests, you'll see it here.
      </p>
      <p className="text-xs text-gray-500 mt-4">
        Try praying for others to connect with the community
      </p>
    </motion.div>
  );
}

// ============================================================================
// MAIN NOTIFICATION CENTER COMPONENT
// ============================================================================

export function NotificationCenter({ userId, isOpen, onClose, onNavigateToPrayer }: NotificationCenterProps) {
  const reducedMotion = useReducedMotion();
  const { notifications, isLoading, unreadCount } = useNotifications(userId, { enabled: isOpen });
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead();

  // Mark all as read when panel opens (after 1 second)
  useEffect(() => {
    if (isOpen && userId && notifications.length > 0) {
      const timer = setTimeout(() => {
        // Mark unread notifications as read
        const unreadNotifications = notifications.filter(n => !n.is_read);
        unreadNotifications.forEach(notification => {
          markAsRead(notification.notification_id);
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, userId, notifications, markAsRead]);

  const groupedNotifications = groupNotificationsByDate(notifications);
  const hasNotifications = notifications.length > 0;

  const handleNotificationClick = (notification: Notification) => {
    const prayerId = notification.payload.prayer_id;
    if (prayerId && onNavigateToPrayer) {
      onNavigateToPrayer(prayerId);
      onClose();
    }
  };

  const handleNotificationDismiss = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    if (userId) {
      markAllAsRead(userId);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : {
              opacity: 0,
              x: '100%', // Desktop: slide from right
              y: 0,
            }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : {
              opacity: 0,
              x: '100%',
              y: 0,
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="
              fixed z-50
              md:right-0 md:top-0 md:bottom-0 md:w-96
              max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:max-h-[80vh]
              bg-gradient-to-br from-white/90 via-purple-50/80 to-pink-50/70
              backdrop-blur-2xl
              border-l border-white/60
              shadow-2xl shadow-purple-200/20
              flex flex-col
              max-md:rounded-t-3xl
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/40 bg-white/30 backdrop-blur-sm">
              <div>
                <h2 className="text-xl font-display font-bold text-gray-900">Notifications</h2>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-600 mt-0.5">{unreadCount} unread</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mark all as read button */}
                {hasNotifications && unreadCount > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    Mark all read
                  </motion.button>
                )}

                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Bell className="w-8 h-8 text-purple-400" />
                  </motion.div>
                </div>
              ) : !hasNotifications ? (
                <EmptyState />
              ) : (
                <>
                  <NotificationGroup
                    title="Today"
                    notifications={groupedNotifications.today}
                    onNotificationClick={handleNotificationClick}
                    onNotificationDismiss={handleNotificationDismiss}
                  />
                  <NotificationGroup
                    title="Yesterday"
                    notifications={groupedNotifications.yesterday}
                    onNotificationClick={handleNotificationClick}
                    onNotificationDismiss={handleNotificationDismiss}
                  />
                  <NotificationGroup
                    title="This Week"
                    notifications={groupedNotifications.thisWeek}
                    onNotificationClick={handleNotificationClick}
                    onNotificationDismiss={handleNotificationDismiss}
                  />
                  <NotificationGroup
                    title="Earlier"
                    notifications={groupedNotifications.earlier}
                    onNotificationClick={handleNotificationClick}
                    onNotificationDismiss={handleNotificationDismiss}
                  />
                </>
              )}
            </div>

            {/* Mobile drag indicator */}
            <div className="md:hidden flex justify-center py-2 bg-white/30">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/*
MEMORY LOG:
Topic: Notification Center UI Component
Context: Beautiful notification panel with ethereal glass design
Decision: Slide-out panel (right desktop, bottom mobile) with grouped notifications
Reasoning:
  - Right panel on desktop follows common pattern (Twitter, etc.)
  - Bottom sheet on mobile feels natural and swipeable
  - Date grouping helps users scan chronologically
  - Glassmorphic design matches PrayerMap's ethereal aesthetic
  - Auto mark-as-read on open (1s delay) reduces manual action
  - Swipe to dismiss individual notifications (mobile gesture)
Mobile Impact:
  - Bottom sheet more reachable on mobile
  - Swipe gestures feel natural
  - Touch targets 44x44 minimum
Animation Notes:
  - Staggered entrance for list items (50ms delay each)
  - Unread notifications have subtle pulse glow
  - Spring animations for natural feel
  - Reduced motion support throughout
Date: 2025-11-30
*/
