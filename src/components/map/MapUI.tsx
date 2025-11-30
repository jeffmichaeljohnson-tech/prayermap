/**
 * MapUI - UI chrome for PrayerMap
 *
 * Handles:
 * - Header with inbox and settings buttons
 * - Request prayer button
 * - Info button
 *
 * Extracted from PrayerMap.tsx to reduce component complexity.
 */

import { motion } from 'framer-motion';
import { Inbox, Settings, Info } from 'lucide-react';

export interface MapUIProps {
  totalUnread: number;
  onOpenInbox: () => void;
  onOpenSettings: () => void;
  onOpenRequestModal: () => void;
  onOpenInfo: () => void;
}

/**
 * MapUI component
 *
 * Renders all UI chrome elements that sit on top of the map.
 */
export function MapUI({
  totalUnread,
  onOpenInbox,
  onOpenSettings,
  onOpenRequestModal,
  onOpenInfo,
}: MapUIProps) {
  return (
    <>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none" style={{ zIndex: 30 }}>
        <div className="glass-strong rounded-2xl p-4 flex items-center justify-between pointer-events-auto">
          <button
            onClick={onOpenInbox}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors relative"
          >
            <Inbox className="w-6 h-6 text-gray-700" />
            {totalUnread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, type: "spring" }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse border-2 border-white"
              >
                {totalUnread > 9 ? '9+' : totalUnread}
              </motion.span>
            )}
          </button>

          <h1 className="text-2xl text-gray-800">PrayerMap</h1>

          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Settings className="w-6 h-6 text-gray-700" />
          </button>
        </div>
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
