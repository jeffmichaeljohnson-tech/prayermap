/**
 * MapUI - UI chrome for PrayerMap
 *
 * Handles:
 * - Header with notification bell, inbox button, and settings buttons
 * - Sun/moon indicator
 * - Request prayer button
 * - Info button
 *
 * Extracted from PrayerMap.tsx to reduce component complexity.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Info, MessageCircle } from 'lucide-react';
import { SunMoonIndicator } from '../SunMoonIndicator';
import { NotificationBell } from '../NotificationBell';
import { useInbox } from '../../hooks/useInbox';

export interface MapUIProps {
  userLocation: { lat: number; lng: number };
  userId: string | null;
  onNavigateToPrayer?: (prayerId: string) => void;
  onOpenSettings: () => void;
  onOpenRequestModal: () => void;
  onOpenInfo: () => void;
  onOpenInbox?: () => void;
}

/**
 * MapUI component
 *
 * Renders all UI chrome elements that sit on top of the map.
 */
export function MapUI({
  userLocation,
  userId,
  onNavigateToPrayer,
  onOpenSettings,
  onOpenRequestModal,
  onOpenInfo,
  onOpenInbox,
}: MapUIProps) {
  // Get inbox unread count for badge
  const { totalUnread } = useInbox({
    userId: userId || '',
    autoFetch: !!userId,
    enableRealtime: true
  });

  return (
    <>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none" style={{ zIndex: 30 }}>
        <div className="glass-strong rounded-2xl p-4 flex items-center justify-between pointer-events-auto">
          {/* Left side: Notification Bell + Inbox Button */}
          <div className="flex items-center gap-2">
            {/* Notification Bell - System notifications */}
            <NotificationBell
              userId={userId}
              onNavigateToPrayer={onNavigateToPrayer}
            />

            {/* Inbox Button - Prayer Response Conversations */}
            {userId && onOpenInbox && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenInbox}
                className="relative p-3 rounded-full bg-white/80 backdrop-blur-md border border-white/60 shadow-lg shadow-purple-100/20 hover:shadow-xl hover:shadow-purple-200/30 transition-all duration-200"
                aria-label={`Inbox ${totalUnread > 0 ? `(${totalUnread} unread)` : ''}`}
              >
                <MessageCircle className="w-5 h-5 text-gray-700" />

                {/* Unread Badge */}
                <AnimatePresence>
                  {totalUnread > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center"
                    >
                      <div className="relative z-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-lg">
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )}
          </div>

          <h1 className="text-2xl text-gray-800">PrayerMap</h1>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Settings className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Sunset/Sunrise Indicator */}
      <div className="absolute top-24 right-4 pointer-events-none" style={{ zIndex: 30 }}>
        <SunMoonIndicator location={userLocation} />
      </div>

      {/* Request Prayer Button */}
      <motion.button
        onClick={onOpenRequestModal}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-strong rounded-full px-8 py-4 flex items-center gap-3 shadow-xl hover:shadow-2xl transition-shadow"
        style={{ zIndex: 40 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-2xl">🙏</span>
        <span className="text-gray-800 text-[16px]">Request Prayer</span>
      </motion.button>

      {/* Info Button */}
      <motion.button
        onClick={onOpenInfo}
        className="absolute bottom-20 right-6 glass-strong rounded-full p-4 shadow-xl hover:shadow-2xl transition-shadow"
        style={{ zIndex: 40 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Info className="w-6 h-6 text-gray-700" />
      </motion.button>
    </>
  );
}
