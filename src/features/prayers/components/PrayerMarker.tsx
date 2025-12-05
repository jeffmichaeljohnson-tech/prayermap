import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { Prayer } from '../types/prayer';

interface PrayerMarkerProps {
  prayer: Prayer;
  map: MapboxMap | null;
  onClick: () => void;
  isPrayed?: boolean;
  stackCount?: number;
  allPrayers?: Prayer[];
  onSelectPrayer?: (prayer: Prayer) => void;
}

export function PrayerMarker({
  prayer,
  map,
  onClick,
  isPrayed,
  stackCount = 1,
  allPrayers = [],
  onSelectPrayer
}: PrayerMarkerProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [showPrayerList, setShowPrayerList] = useState(false);

  useEffect(() => {
    if (!map) return;

    // Validate location data
    const lat = prayer.location?.lat;
    const lng = prayer.location?.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid prayer location:', prayer.id, prayer.location);
      return;
    }

    const updatePosition = () => {
      try {
        const point = map.project([lng, lat]);
        setPosition({ x: point.x, y: point.y });
      } catch (error) {
        console.error('Error projecting prayer location:', error);
      }
    };

    updatePosition();
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);

    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
    };
  }, [map, prayer.location, prayer.id]);

  if (!position) return null;

  const getPreviewText = () => {
    if (prayer.title) return prayer.title;
    const words = prayer.content.split(' ').slice(0, 3).join(' ');
    return words + '...';
  };

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 20, // Ensure markers are above everything
        padding: '20px', // Invisible padding for larger hit area
        margin: '-20px' // Negative margin to maintain visual position
      }}
    >
      {/* Preview Bubble - Always visible with floating animation */}
      <motion.div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 glass-strong rounded-xl px-3 py-1.5 whitespace-nowrap max-w-[160px]"
        style={{ pointerEvents: 'none' }}
        animate={isPrayed ? {} : {
          y: [0, -3, 0],
        }}
        transition={isPrayed ? {} : {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <p className="text-xs text-gray-700 truncate">{getPreviewText()}</p>
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-white/40"
        />
      </motion.div>

      {/* Prayer Emoji Marker */}
      <motion.button
        onClick={() => {
          if (stackCount > 1) {
            setShowPrayerList(!showPrayerList);
          } else {
            onClick();
          }
        }}
        className="relative z-10"
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        animate={isPrayed ? {} : {
          y: [0, -5, 0],
        }}
        transition={isPrayed ? {} : {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className={`text-4xl ${isPrayed ? 'opacity-60' : 'animate-pulse-glow'}`}>
          🙏
        </div>

        {/* Stack count badge */}
        {stackCount > 1 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
            {stackCount}
          </div>
        )}

        {/* Glow effect for active prayers */}
        {!isPrayed && (
          <motion.div
            className="absolute inset-0 rounded-full bg-yellow-300/30 blur-xl"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{ pointerEvents: 'none' }} // Don't interfere with clicks
          />
        )}
      </motion.button>

      {/* Expanded prayer list for stacked markers */}
      <AnimatePresence>
        {showPrayerList && stackCount > 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 glass-strong rounded-xl p-2 min-w-[200px] max-w-[280px] shadow-xl z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-gray-500 px-2 py-1 border-b border-gray-200/50 mb-1">
              {stackCount} prayers at this location
            </p>
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {allPrayers.map((p, index) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setShowPrayerList(false);
                    onSelectPrayer?.(p);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <p className="text-sm text-gray-800 font-medium truncate">
                    {p.title || `Prayer ${index + 1}`}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {p.content.substring(0, 50)}...
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}