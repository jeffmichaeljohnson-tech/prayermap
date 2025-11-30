/**
 * Enhanced In-App Notification Component for PrayerMap
 *
 * A world-class notification toast system that shows when push notifications
 * arrive while the app is in foreground.
 *
 * Features:
 * - Slides down from top with spring animation
 * - Glassmorphic design with blur backdrop
 * - Different styles per notification type (heart burst, message icon, etc.)
 * - Swipe up to dismiss gesture
 * - Tap to navigate
 * - Auto-dismiss after 5 seconds with progress indicator
 * - Rich content: avatar, title, preview text, timestamp
 * - Sound & haptic feedback
 * - Stacking (max 3 visible)
 * - Full accessibility support
 *
 * @module InAppNotificationEnhanced
 */

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { Heart, MessageCircle, X, MapPin, Bell } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { haptic } from '../services/hapticService';
import { audioService } from '../services/audioService';
import type { NotificationType } from '../services/pushNotificationService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  avatarUrl?: string;
  userName?: string;
  timestamp: Date;
  data?: {
    prayer_id?: string;
    user_id?: string;
    response_id?: string;
    connection_id?: string;
  };
}

interface InAppNotificationEnhancedProps {
  notification: InAppNotification;
  onClose: (id: string) => void;
  onClick?: (notification: InAppNotification) => void;
  index?: number; // For stacking offset
  playSound?: boolean;
}

// ============================================================================
// Notification Type Configurations
// ============================================================================

interface NotificationStyle {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  accentColor: string;
  borderColor: string;
  animation?: 'heartBurst' | 'pulse' | 'glow';
}

const NOTIFICATION_STYLES: Record<NotificationType, NotificationStyle> = {
  PRAYER_RESPONSE: {
    icon: MessageCircle,
    gradient: 'from-blue-400/20 via-blue-500/10 to-transparent',
    accentColor: 'text-blue-500',
    borderColor: 'border-blue-200/50',
    animation: 'pulse'
  },
  PRAYER_SUPPORT: {
    icon: Heart,
    gradient: 'from-pink-400/20 via-pink-500/10 to-transparent',
    accentColor: 'text-pink-500',
    borderColor: 'border-pink-200/50',
    animation: 'heartBurst'
  },
  NEARBY_PRAYER: {
    icon: MapPin,
    gradient: 'from-purple-400/20 via-purple-500/10 to-transparent',
    accentColor: 'text-purple-500',
    borderColor: 'border-purple-200/50',
    animation: 'glow'
  },
  CONNECTION_CREATED: {
    icon: Heart,
    gradient: 'from-pink-400/20 via-rose-500/10 to-transparent',
    accentColor: 'text-rose-500',
    borderColor: 'border-rose-200/50',
    animation: 'heartBurst'
  },
  GENERAL: {
    icon: Bell,
    gradient: 'from-gray-400/20 via-gray-500/10 to-transparent',
    accentColor: 'text-gray-500',
    borderColor: 'border-gray-200/50',
    animation: 'pulse'
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format timestamp as relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get initials from name for avatar fallback
 */
function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

// ============================================================================
// Notification Component
// ============================================================================

export function InAppNotificationEnhanced({
  notification,
  onClose,
  onClick,
  index = 0,
  playSound = true
}: InAppNotificationEnhancedProps) {
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const [relativeTime, setRelativeTime] = useState(formatRelativeTime(notification.timestamp));

  // Drag controls for swipe-to-dismiss
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, -100], [1, 0]);

  const style = NOTIFICATION_STYLES[notification.type];
  const Icon = style.icon;

  // Auto-dismiss timer
  useEffect(() => {
    if (isHovered) return; // Pause on hover

    const duration = 5000; // 5 seconds
    const interval = 50; // Update every 50ms
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev - decrement;
        if (next <= 0) {
          clearInterval(timer);
          onClose(notification.id);
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [notification.id, onClose, isHovered]);

  // Update relative time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setRelativeTime(formatRelativeTime(notification.timestamp));
    }, 60000);
    return () => clearInterval(timer);
  }, [notification.timestamp]);

  // Play sound and haptic on mount
  useEffect(() => {
    if (playSound && !reducedMotion) {
      audioService.play('soft_chime', 0.4).catch(() => {
        // Silent fail - sound is enhancement
      });
    }

    // Haptic feedback based on notification type
    const hapticPattern = notification.type === 'PRAYER_SUPPORT' || notification.type === 'CONNECTION_CREATED'
      ? 'success'
      : 'medium';
    haptic(hapticPattern).catch(() => {
      // Silent fail
    });
  }, [notification.type, playSound, reducedMotion]);

  // Handle swipe to dismiss
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = -50;
    if (info.offset.y < swipeThreshold) {
      haptic('light');
      onClose(notification.id);
    }
  }, [notification.id, onClose]);

  // Handle click
  const handleClick = useCallback(() => {
    if (onClick) {
      haptic('selection');
      onClick(notification);
    }
  }, [onClick, notification]);

  // Handle keyboard dismiss (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(notification.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notification.id, onClose]);

  // Animation variants
  const containerVariants = {
    hidden: reducedMotion
      ? { opacity: 0, y: 0 }
      : { opacity: 0, y: -100, scale: 0.9 },
    visible: reducedMotion
      ? { opacity: 1, y: 0 }
      : {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: 'spring',
            damping: 20,
            stiffness: 300,
            duration: 0.4
          }
        },
    exit: reducedMotion
      ? { opacity: 0 }
      : {
          opacity: 0,
          y: -50,
          scale: 0.95,
          transition: { duration: 0.2, ease: 'easeIn' }
        }
  };

  const iconVariants = {
    heartBurst: reducedMotion ? {} : {
      scale: [1, 1.3, 1],
      rotate: [0, 10, -10, 0],
      transition: {
        duration: 0.6,
        times: [0, 0.3, 0.6, 1],
        ease: 'easeOut'
      }
    },
    pulse: reducedMotion ? {} : {
      scale: [1, 1.1, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    glow: reducedMotion ? {} : {
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  // Calculate vertical offset for stacking
  const stackOffset = index * 8; // Each notification pushed down by 8px

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ y, opacity, top: `${16 + stackOffset}px` }}
      className={`fixed left-1/2 -translate-x-1/2 z-[${50 + index}] pointer-events-auto`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`
          relative min-w-[320px] max-w-[420px] rounded-2xl overflow-hidden
          cursor-pointer transition-transform hover:scale-[1.02]
          ${onClick ? 'active:scale-[0.98]' : ''}
        `}
        onClick={handleClick}
      >
        {/* Glassmorphic background */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border border-white/40" />

        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />

        {/* Border accent */}
        <div className={`absolute inset-0 border ${style.borderColor} rounded-2xl`} />

        {/* Content */}
        <div className="relative p-4">
          <div className="flex items-start gap-3">
            {/* Avatar or Icon */}
            <div className="flex-shrink-0">
              {notification.avatarUrl ? (
                <img
                  src={notification.avatarUrl}
                  alt={notification.userName || 'User'}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white/50"
                />
              ) : (
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center ring-2 ring-white/50`}>
                  {notification.userName ? (
                    <span className={`text-sm font-semibold ${style.accentColor}`}>
                      {getInitials(notification.userName)}
                    </span>
                  ) : (
                    <motion.div
                      variants={iconVariants}
                      animate={style.animation}
                    >
                      <Icon className={`w-6 h-6 ${style.accentColor}`} />
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                  {truncate(notification.title, 50)}
                </h3>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {relativeTime}
                </span>
              </div>

              <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                {truncate(notification.body, 100)}
              </p>

              {onClick && (
                <div className="flex items-center gap-1 mt-2">
                  <span className={`text-xs font-medium ${style.accentColor}`}>
                    Tap to view
                  </span>
                  <span className={`text-xs ${style.accentColor}`}>→</span>
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptic('light');
                onClose(notification.id);
              }}
              className="flex-shrink-0 p-1.5 hover:bg-gray-100/80 rounded-full transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/30 overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${style.gradient.replace('/20', '/60').replace('/10', '/40')}`}
              style={{ width: `${progress}%` }}
              initial={{ width: '100%' }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
        </div>

        {/* Swipe indicator (subtle hint) */}
        {!reducedMotion && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300/50 rounded-full" />
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Notification Stack Container
// ============================================================================

interface NotificationStackProps {
  notifications: InAppNotification[];
  onClose: (id: string) => void;
  onClick?: (notification: InAppNotification) => void;
  maxVisible?: number;
  playSound?: boolean;
}

/**
 * Container that manages multiple stacked notifications
 */
export function NotificationStack({
  notifications,
  onClose,
  onClick,
  maxVisible = 3,
  playSound = true
}: NotificationStackProps) {
  // Only show the most recent N notifications
  const visibleNotifications = notifications.slice(-maxVisible).reverse();

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification, index) => (
          <InAppNotificationEnhanced
            key={notification.id}
            notification={notification}
            onClose={onClose}
            onClick={onClick}
            index={index}
            playSound={playSound && index === 0} // Only play sound for newest
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
