/**
 * NotificationBell Component
 *
 * Trigger button for the notification center:
 * - Bell icon with unread badge count
 * - Pulse animation when new notification arrives
 * - Opens NotificationCenter on click
 * - Integrates with NotificationCenter for panel state
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { NotificationCenter } from './NotificationCenter';

interface NotificationBellProps {
  userId: string | null;
  onNavigateToPrayer?: (prayerId: string) => void;
  className?: string;
}

export function NotificationBell({ userId, onNavigateToPrayer, className = '' }: NotificationBellProps) {
  const reducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, hasNewNotification } = useNotifications(userId);

  // Trigger haptic feedback when new notification arrives (mobile)
  useEffect(() => {
    if (hasNewNotification && 'vibrate' in navigator) {
      navigator.vibrate(50); // Subtle vibration
    }
  }, [hasNewNotification]);

  return (
    <>
      {/* Bell Button */}
      <motion.button
        whileHover={reducedMotion ? {} : { scale: 1.1 }}
        whileTap={reducedMotion ? {} : { scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-3 rounded-full
          bg-white/80 backdrop-blur-md
          border border-white/60
          shadow-lg shadow-purple-100/20
          hover:shadow-xl hover:shadow-purple-200/30
          transition-all duration-200
          ${className}
        `}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        {/* Bell Icon */}
        <motion.div
          animate={hasNewNotification && !reducedMotion ? {
            rotate: [0, -15, 15, -15, 15, 0],
          } : {}}
          transition={{
            duration: 0.6,
            ease: 'easeInOut',
          }}
        >
          <Bell className="w-5 h-5 text-gray-700" />
        </motion.div>

        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center"
            >
              {/* Pulse effect for new notifications */}
              {hasNewNotification && !reducedMotion && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.8, 0, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: 3,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 rounded-full bg-pink-500"
                />
              )}

              {/* Badge */}
              <div className="relative z-10 bg-gradient-to-br from-pink-500 to-pink-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-lg">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring for new notifications */}
        {hasNewNotification && !reducedMotion && (
          <motion.div
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{
              scale: [1, 1.4],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: 3,
              ease: 'easeOut',
            }}
            className="absolute inset-0 rounded-full border-2 border-purple-400 pointer-events-none"
          />
        )}
      </motion.button>

      {/* Notification Center Panel */}
      <NotificationCenter
        userId={userId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNavigateToPrayer={onNavigateToPrayer}
      />
    </>
  );
}

/*
MEMORY LOG:
Topic: Notification Bell Trigger Button
Context: Need a button to open notification center with visual feedback
Decision: Bell icon with badge and pulse animation
Reasoning:
  - Bell is universally recognized notification icon
  - Badge count shows unread at a glance
  - Ring pulse animation when new notification arrives (3x repeat)
  - Bell shake animation for delight
  - Haptic feedback on mobile for tactile response
Mobile Impact:
  - 48x48px touch target (p-3 + icon)
  - Haptic vibration (50ms) on new notification
  - Reduced motion support disables animations
Animation Notes:
  - Bell shake: 0.6s, eases in/out
  - Badge entrance: Spring animation (feels bouncy)
  - Pulse ring: 1.5s, repeats 3 times
  - All animations respect prefers-reduced-motion
Date: 2025-11-30
*/
