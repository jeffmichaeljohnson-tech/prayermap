import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { Prayer } from '../../types/prayer';
import { trackEvent, trackError, datadogRum } from '../../lib/datadog';
import { livingMapMonitor } from '../../lib/livingMapMonitor';

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
  const mountTime = useRef<number>(performance.now());
  const firstRenderTime = useRef<number>(0);
  const projectionErrors = useRef<number>(0);
  const positionUpdateCount = useRef<number>(0);
  const markerId = useRef<string>('');
  
  // Initialize marker monitoring on mount
  useEffect(() => {
    markerId.current = `marker_${prayer.id}`;
    return () => {
      // Cleanup tracked via livingMapMonitor automatically
    };
  }, [prayer]);

  // Enhanced position tracking with performance monitoring
  const updatePosition = useCallback(() => {
    if (!map) return;
    
    const lat = prayer.location?.lat;
    const lng = prayer.location?.lng;
    
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      trackError(new Error(`Invalid prayer location for marker ${prayer.id}`), {
        prayer_id: prayer.id,
        location: prayer.location,
        type: 'invalid_location'
      });
      return;
    }

    try {
      const startTime = performance.now();
      const point = map.project([lng, lat]);
      const projectionTime = performance.now() - startTime;
      
      setPosition({ x: point.x, y: point.y });
      positionUpdateCount.current++;
      
      // Track first render time for Living Map real-time requirements
      if (firstRenderTime.current === 0) {
        firstRenderTime.current = performance.now();
        const totalRenderTime = firstRenderTime.current - mountTime.current;
        
        // Use monitoring service for comprehensive tracking
        livingMapMonitor.trackMapRenderPerformance(firstRenderTime.current, 60);
        
        trackEvent('prayer_marker.first_render', {
          prayer_id: prayer.id,
          mount_to_render_ms: totalRenderTime,
          is_stacked: stackCount > 1,
          is_prayed: isPrayed,
          projection_time_ms: projectionTime
        });
        
        // Alert on slow first render (critical for Living Map experience)
        if (totalRenderTime > 100) {
          trackError(new Error(`Slow marker first render: ${totalRenderTime.toFixed(1)}ms for prayer ${prayer.id}`), {
            prayer_id: prayer.id,
            render_time_ms: totalRenderTime,
            type: 'slow_first_render',
            living_map_violation: true
          });
        }
      }
      
      // Track excessive position updates (performance issue)
      if (positionUpdateCount.current > 100) {
        trackError(new Error(`Excessive position updates for prayer marker ${prayer.id}: ${positionUpdateCount.current}`), {
          prayer_id: prayer.id,
          update_count: positionUpdateCount.current,
          type: 'excessive_updates'
        });
      }
      
    } catch (error) {
      projectionErrors.current++;
      // Track position update performance with livingMapMonitor if needed
      trackError(error as Error, {
        prayer_id: prayer.id,
        location: { lat, lng },
        error_count: projectionErrors.current,
        type: 'projection_error'
      });
    }
  }, [map, prayer.location, prayer.id, stackCount, isPrayed]);

  useEffect(() => {
    if (!map) {
      trackEvent('prayer_marker.waiting_for_map', {
        prayer_id: prayer.id,
        timestamp: Date.now()
      });
      return;
    }

    // Track marker initialization
    trackEvent('prayer_marker.initialized', {
      prayer_id: prayer.id,
      has_valid_location: !!(prayer.location?.lat && prayer.location?.lng),
      stack_count: stackCount,
      is_prayed: isPrayed
    });

    updatePosition();
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);

    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
      
      // Track marker cleanup
      trackEvent('prayer_marker.unmounted', {
        prayer_id: prayer.id,
        lifetime_ms: performance.now() - mountTime.current,
        position_updates: positionUpdateCount.current,
        projection_errors: projectionErrors.current
      });
    };
  }, [map, updatePosition]);

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
      {/* Preview Bubble - Static for performance (no infinite animations) */}
      <motion.div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 glass-strong rounded-xl px-3 py-1.5 whitespace-nowrap max-w-[160px]"
        style={{ pointerEvents: 'none' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-xs text-gray-700 truncate">{getPreviewText()}</p>
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-white/40"
        />
      </motion.div>

      {/* Prayer Emoji Marker - Enhanced with interaction tracking */}
      <motion.button
        onClick={() => {
          // Track marker interaction using Living Map monitoring
          trackEvent('prayer_marker.click', {
            is_stacked: stackCount > 1,
            stack_count: stackCount,
            is_prayed: isPrayed
          });
          
          trackEvent('prayer_marker.click', {
            prayer_id: prayer.id,
            is_stacked: stackCount > 1,
            stack_count: stackCount,
            is_prayed: isPrayed,
            timestamp: Date.now()
          });
          
          if (stackCount > 1) {
            setShowPrayerList(!showPrayerList);
            trackEvent('prayer_marker.expand_stack', {
              stack_count: stackCount,
              showing: !showPrayerList
            });
            trackEvent('prayer_marker.expand_stack', {
              prayer_id: prayer.id,
              stack_count: stackCount,
              showing: !showPrayerList
            });
          } else {
            onClick();
            trackEvent('prayer_marker.open_detail', {
              is_prayed: isPrayed
            });
            trackEvent('prayer_marker.open_detail', {
              prayer_id: prayer.id,
              is_prayed: isPrayed
            });
          }
        }}
        onAnimationComplete={() => {
          // Track animation completion for performance monitoring
          trackEvent('prayer_marker.animation_complete', {
            prayer_id: prayer.id,
            animation_type: 'entrance',
            render_time_ms: performance.now() - mountTime.current
          });
        }}
        className="relative z-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ 
          scale: 1.2,
          rotateZ: 5,
          transition: { 
            duration: 0.2,
            ease: "easeOut",
            type: "spring",
            stiffness: 300
          }
        }}
        whileTap={{ 
          scale: 0.9,
          rotateZ: -2,
          transition: { 
            duration: 0.1,
            ease: "easeInOut"
          }
        }}
        transition={{ 
          duration: 0.4, 
          ease: "easeOut",
          type: "spring",
          stiffness: 260,
          damping: 20
        }}
      >
        <div className={`text-4xl ${isPrayed ? 'opacity-60' : ''}`}>
          🙏
        </div>

        {/* Stack count badge */}
        {stackCount > 1 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
            {stackCount}
          </div>
        )}

        {/* Enhanced glow effect for active prayers - GPU accelerated */}
        {!isPrayed && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300/50 to-purple-300/50 blur-xl"
            style={{ pointerEvents: 'none' }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse"
            }}
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
                    trackEvent('prayer_marker.stack_item_click', {
                      selected_prayer_id: p.id,
                      stack_position: index,
                      total_stack_count: stackCount
                    });
                    trackEvent('prayer_marker.stack_item_click', {
                      prayer_id: p.id,
                      parent_prayer_id: prayer.id,
                      stack_position: index,
                      total_stack_count: stackCount
                    });
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