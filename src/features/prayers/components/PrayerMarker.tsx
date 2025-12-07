import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { Prayer } from '../types/prayer';
import { PRAYER_CATEGORIES } from '../types/prayer';
import { useAuth } from '@/features/authentication';

// Get category-specific gradient for marker glow
const getCategoryGlowColor = (category?: string): string => {
  const categoryInfo = PRAYER_CATEGORIES.find(c => c.id === category);
  if (!categoryInfo) return 'bg-yellow-300/30'; // Default
  
  const glowColors: Record<string, string> = {
    red: 'bg-red-300/30',
    blue: 'bg-blue-300/30',
    amber: 'bg-amber-300/30',
    pink: 'bg-pink-300/30',
    purple: 'bg-purple-300/30',
    green: 'bg-green-300/30',
    indigo: 'bg-indigo-300/30',
    yellow: 'bg-yellow-300/30',
    gray: 'bg-gray-300/30',
  };
  
  return glowColors[categoryInfo.color] || 'bg-yellow-300/30';
};

// Get category emoji for marker display
const getCategoryEmoji = (category?: string): string => {
  const categoryInfo = PRAYER_CATEGORIES.find(c => c.id === category);
  return categoryInfo?.emoji || '🙏';
};

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
  const [isReady, setIsReady] = useState(false);
  const [showPrayerList, setShowPrayerList] = useState(false);
  const { user } = useAuth();

  // Use refs to track position without triggering re-renders
  const rafRef = useRef<number | null>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  // Prayer response count
  const responseCount = prayer.prayedBy?.length || 0;
  const hasUserPrayed = prayer.prayedBy?.includes(user?.id || '');

  // Optimized position update using direct DOM manipulation
  const updatePosition = useCallback(() => {
    if (!map || !markerRef.current) return;

    const lat = prayer.location?.lat;
    const lng = prayer.location?.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return;
    }

    try {
      const point = map.project([lng, lat]);
      // Update DOM directly - this is the ONLY place position is set
      markerRef.current.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
    } catch {
      // Silently handle projection errors during rapid movement
    }
  }, [map, prayer.location?.lat, prayer.location?.lng]);

  useEffect(() => {
    if (!map) return;

    // Validate location data
    const lat = prayer.location?.lat;
    const lng = prayer.location?.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid prayer location:', prayer.id, prayer.location);
      return;
    }

    // Set initial position and mark as ready
    updatePosition();
    setIsReady(true);

    // Update on every frame during map movement for smooth tracking
    const handleMapMove = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    map.on('move', handleMapMove);
    map.on('zoom', handleMapMove);

    return () => {
      map.off('move', handleMapMove);
      map.off('zoom', handleMapMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [map, prayer.location, prayer.id, updatePosition]);

  if (!isReady) return null;

  const getPreviewText = () => {
    if (prayer.title) return prayer.title;
    const words = prayer.content.split(' ').slice(0, 3).join(' ');
    return words + '...';
  };

  return (
    <div
      ref={markerRef}
      className="absolute pointer-events-auto"
      style={{
        left: 0,
        top: 0,
        zIndex: 20, // Ensure markers are above everything
        padding: '20px', // Invisible padding for larger hit area
        margin: '-20px', // Negative margin to maintain visual position
        willChange: 'transform' // GPU acceleration hint for transform
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
        <p className="text-xs text-gray-700 dark:text-gray-200 truncate">{getPreviewText()}</p>
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
        {/* Marker with optional user-prayed ring indicator */}
        <div className={`text-4xl ${isPrayed ? 'opacity-60' : 'animate-pulse-glow'} ${hasUserPrayed ? 'ring-2 ring-green-400 ring-offset-2 rounded-full p-1' : ''}`}>
          {hasUserPrayed ? '✓' : '🙏'}
        </div>

        {/* Response count badge - shows how many people have prayed */}
        <AnimatePresence mode="wait">
          {responseCount > 0 && (
            <motion.div
              key={responseCount}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="absolute -top-1 -left-1 min-w-[18px] h-[18px] bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center px-1 shadow-lg"
            >
              <span className="text-white text-[10px] font-bold">
                {responseCount > 99 ? '99+' : responseCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stack count badge - shows number of prayers at this location */}
        {stackCount > 1 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
            {stackCount}
          </div>
        )}

        {/* Glow effect for active prayers - color based on category */}
        {!isPrayed && (
          <motion.div
            className={`absolute inset-0 rounded-full ${getCategoryGlowColor(prayer.category)} blur-xl`}
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
              {allPrayers.map((p, index) => {
                const prayerResponseCount = p.prayedBy?.length || 0;
                const userPrayedForThis = p.prayedBy?.includes(user?.id || '');
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setShowPrayerList(false);
                      onSelectPrayer?.(p);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/50 transition-colors relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">
                          {p.title || `Prayer ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {p.content.substring(0, 50)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {userPrayedForThis && (
                          <span className="text-green-500 text-xs">✓</span>
                        )}
                        {prayerResponseCount > 0 && (
                          <span className="text-xs text-purple-600 font-medium bg-purple-100 px-1.5 py-0.5 rounded-full">
                            {prayerResponseCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}