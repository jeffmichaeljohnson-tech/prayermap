/**
 * MapUI - UI chrome for PrayerMap
 *
 * Handles:
 * - Header with notification bell and settings buttons
 * - Sun/moon indicator
 * - Request prayer button
 * - Info button
 *
 * Extracted from PrayerMap.tsx to reduce component complexity.
 */

import { motion } from 'framer-motion';
import { Settings, Info } from 'lucide-react';
import { SunMoonIndicator } from '../SunMoonIndicator';
import { NotificationBell } from '../NotificationBell';

export interface MapUIProps {
  userLocation: { lat: number; lng: number };
  userId: string | null;
  onNavigateToPrayer?: (prayerId: string) => void;
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
  userLocation,
  userId,
  onNavigateToPrayer,
  onOpenSettings,
  onOpenRequestModal,
  onOpenInfo,
}: MapUIProps) {
  return (
    <>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none" style={{ zIndex: 30 }}>
        <div className="glass-strong rounded-2xl p-4 flex items-center justify-between pointer-events-auto">
          {/* Notification Bell */}
          <NotificationBell
            userId={userId}
            onNavigateToPrayer={onNavigateToPrayer}
          />

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
