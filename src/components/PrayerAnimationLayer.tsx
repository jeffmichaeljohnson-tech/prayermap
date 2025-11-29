import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import type { Prayer } from '../types/prayer';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface PrayerAnimationLayerProps {
  prayer: Prayer;
  userLocation: { lat: number; lng: number };
  map: mapboxgl.Map | null;
  onComplete: () => void;
}

export function PrayerAnimationLayer({ prayer, userLocation, map, onComplete }: PrayerAnimationLayerProps) {
  const reducedMotion = useReducedMotion();
  const [positions, setPositions] = useState<{
    from: { x: number; y: number } | null;
    to: { x: number; y: number } | null;
  }>({ from: null, to: null });

  // Use ref to store onComplete so we don't re-run effect when it changes
  const onCompleteRef = useRef(onComplete);

  // Update ref when onComplete changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Track if we've already completed to prevent double-calls
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    // Reset completion tracking when animation starts
    hasCompletedRef.current = false;

    // Calculate bounds that include both points
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([prayer.location.lng, prayer.location.lat]);
    bounds.extend([userLocation.lng, userLocation.lat]);

    // Zoom out to show both locations with padding (instant if reduced motion)
    map.fitBounds(bounds, {
      padding: 150,
      pitch: 45,
      bearing: 0,
      duration: reducedMotion ? 0 : 1500,
      maxZoom: 13
    });

    // Calculate positions
    const updatePositions = () => {
      const fromPoint = map.project([userLocation.lng, userLocation.lat]); // Replier location
      const toPoint = map.project([prayer.location.lng, prayer.location.lat]); // Prayer location
      setPositions({
        from: { x: fromPoint.x, y: fromPoint.y },
        to: { x: toPoint.x, y: toPoint.y }
      });
    };

    updatePositions();
    map.on('move', updatePositions);

    // Complete after animation (6s total, or instantly if reduced motion)
    const timer = setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onCompleteRef.current();
      }
    }, reducedMotion ? 500 : 6000);

    return () => {
      map.off('move', updatePositions);
      clearTimeout(timer);
    };
  }, [map, prayer.location.lat, prayer.location.lng, userLocation.lat, userLocation.lng, reducedMotion]);

  if (!positions.from || !positions.to) return null;

  const midX = (positions.from.x + positions.to.x) / 2;
  const midY = (positions.from.y + positions.to.y) / 2 - 80;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Permanent Connection Line (appears at the end, or immediately if reduced motion) */}
      <svg className="absolute inset-0 w-full h-full">
        <motion.path
          d={`M ${positions.from.x} ${positions.from.y} Q ${midX} ${midY} ${positions.to.x} ${positions.to.y}`}
          stroke="url(#permanentGradient)"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: reducedMotion ? 1 : 0, opacity: reducedMotion ? 0.7 : 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 5.5, duration: 0.5, ease: "easeOut" }}
        />
        
        <defs>
          <linearGradient id="permanentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(45, 100%, 65%)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(200, 80%, 70%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(270, 60%, 70%)" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Animated traveling elements - hidden if reduced motion */}
      {!reducedMotion && (
        <>
          {/* First Phase: Line travels from replier TO prayer request (0-2.5s) */}
          <svg className="absolute inset-0 w-full h-full">
            <motion.path
              d={`M ${positions.from.x} ${positions.from.y} Q ${midX} ${midY} ${positions.to.x} ${positions.to.y}`}
              stroke="url(#outboundGradient)"
              strokeWidth="3"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1, 1],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: 6,
                times: [0, 0.4, 0.6, 0.65],
                ease: "easeInOut"
              }}
            />

            <defs>
              <linearGradient id="outboundGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(45, 100%, 60%)" />
                <stop offset="50%" stopColor="hsl(200, 80%, 70%)" />
                <stop offset="100%" stopColor="hsl(270, 60%, 70%)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Traveling Light - Outbound (replier -> prayer) */}
          <motion.div
            className="absolute w-5 h-5 rounded-full bg-yellow-300 shadow-lg shadow-yellow-300/70"
            initial={{ x: positions.from.x, y: positions.from.y, opacity: 0, scale: 0 }}
            animate={{
              x: [positions.from.x, positions.to.x, positions.to.x],
              y: [positions.from.y, positions.to.y, positions.to.y],
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0]
            }}
            transition={{
              duration: 6,
              times: [0, 0.4, 0.6, 0.65],
              ease: "easeInOut"
            }}
            style={{ transform: 'translate(-50%, -50%)', willChange: 'transform, opacity' }}
          />

          {/* Second Phase: Line shoots back from prayer TO replier (3.5-5.5s) */}
          <svg className="absolute inset-0 w-full h-full">
            <motion.path
              d={`M ${positions.to.x} ${positions.to.y} Q ${midX} ${midY} ${positions.from.x} ${positions.from.y}`}
              stroke="url(#returnGradient)"
              strokeWidth="3"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 0, 1, 1],
                opacity: [0, 0, 1, 0]
              }}
              transition={{
                duration: 6,
                times: [0, 0.6, 0.9, 0.95],
                ease: "easeInOut"
              }}
            />

            <defs>
              <linearGradient id="returnGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(270, 60%, 70%)" />
                <stop offset="50%" stopColor="hsl(200, 80%, 70%)" />
                <stop offset="100%" stopColor="hsl(45, 100%, 60%)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Traveling Light - Return (prayer -> replier) */}
          <motion.div
            className="absolute w-5 h-5 rounded-full bg-purple-300 shadow-lg shadow-purple-300/70"
            initial={{ x: positions.to.x, y: positions.to.y, opacity: 0, scale: 0 }}
            animate={{
              x: [positions.to.x, positions.to.x, positions.from.x],
              y: [positions.to.y, positions.to.y, positions.from.y],
              opacity: [0, 0, 1, 1, 0],
              scale: [0, 0, 1.2, 1, 0]
            }}
            transition={{
              duration: 6,
              times: [0, 0.6, 0.9, 0.95, 1],
              ease: "easeInOut"
            }}
            style={{ transform: 'translate(-50%, -50%)', willChange: 'transform, opacity' }}
          />

          {/* Pulsing marker at prayer request location */}
          <motion.div
            className="absolute"
            style={{
              transform: `translate(calc(${positions.to.x}px - 50%), calc(${positions.to.y}px - 50%))`,
              willChange: 'transform, opacity'
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0, 0.6, 0.6, 0]
            }}
            transition={{
              duration: 6,
              times: [0, 0.15, 0.85, 1],
              repeat: 0
            }}
          >
            <div className="w-12 h-12 rounded-full bg-yellow-300/40" />
          </motion.div>

          {/* Pulsing marker at replier location */}
          <motion.div
            className="absolute"
            style={{
              transform: `translate(calc(${positions.from.x}px - 50%), calc(${positions.from.y}px - 50%))`,
              willChange: 'transform, opacity'
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0, 0.6, 0.6, 0]
            }}
            transition={{
              duration: 6,
              times: [0, 0.15, 0.85, 1],
              repeat: 0
            }}
          >
            <div className="w-12 h-12 rounded-full bg-purple-300/40" />
          </motion.div>
        </>
      )}
    </div>
  );
}