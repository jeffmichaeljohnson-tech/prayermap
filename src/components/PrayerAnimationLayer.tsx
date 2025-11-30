import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import type { Prayer } from '../types/prayer';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { animationMonitor } from '../lib/animation-monitor';

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
  const animationStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!map) return;

    // Reset completion tracking when animation starts
    hasCompletedRef.current = false;

    console.log('🎬 Starting 6-second prayer animation sequence...');

    // Start monitoring animation performance
    const animationName = 'prayer_send_animation';
    animationStartTimeRef.current = performance.now();
    animationMonitor.start(animationName);

    // Calculate bounds that include both points
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([prayer.location.lng, prayer.location.lat]);
    bounds.extend([userLocation.lng, userLocation.lat]);

    // PHASE 1: DRAMATIC CAMERA APPROACH (0-1.5s)
    // Zoom out and pitch up for dramatic effect, then focus on prayer location
    const originalCenter = map.getCenter();
    const originalZoom = map.getZoom();
    const originalPitch = map.getPitch();

    if (reducedMotion) {
      // Simple instant view for reduced motion
      map.fitBounds(bounds, {
        padding: 150,
        pitch: 45,
        bearing: 0,
        duration: 0,
        maxZoom: 13
      });
    } else {
      // DRAMATIC SEQUENCE: Start with high pitch overview, then focus
      console.log('📹 Phase 1: Camera zoom and pitch to 60°');
      
      map.fitBounds(bounds, {
        padding: 200,
        pitch: 60, // Higher pitch for more dramatic effect
        bearing: 0,
        duration: 1500, // 1.5 seconds for camera movement
        maxZoom: 12
      });

      // PHASE 2: GENTLE ZOOM TO OPTIMAL VIEW (1.5-2.5s)
      setTimeout(() => {
        console.log('📹 Phase 2: Adjusting to optimal prayer view');
        map.fitBounds(bounds, {
          padding: 150,
          pitch: 45, // Slightly lower pitch for line animation
          bearing: 0,
          duration: 1000, // 1 second transition
          maxZoom: 13
        });
      }, 1500);

      // PHASE 4: RETURN TO NORMAL VIEW (4.5-6s)
      setTimeout(() => {
        console.log('📹 Phase 4: Returning to normal view');
        map.easeTo({
          center: originalCenter,
          zoom: Math.max(originalZoom, 10), // Ensure we're not too zoomed out
          pitch: originalPitch,
          bearing: 0,
          duration: 1500, // 1.5 seconds to return
          essential: false
        });
      }, 4500);
    }

    // Calculate positions and update when map moves
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

    // Complete after full animation sequence
    const expectedDuration = reducedMotion ? 500 : 6000;
    const timer = setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        
        // Track animation completion
        const actualDuration = performance.now() - animationStartTimeRef.current;
        animationMonitor.trackCompletion(animationName, actualDuration, expectedDuration);
        animationMonitor.stop(animationName);
        
        console.log('✅ Prayer animation sequence complete - calling onComplete');
        onCompleteRef.current();
      }
    }, expectedDuration);

    return () => {
      map.off('move', updatePositions);
      clearTimeout(timer);
      // Stop monitoring if component unmounts
      animationMonitor.stop(animationName);
    };
  }, [map, prayer.location.lat, prayer.location.lng, userLocation.lat, userLocation.lng, reducedMotion]);

  if (!positions.from || !positions.to) return null;

  const midX = (positions.from.x + positions.to.x) / 2;
  const midY = (positions.from.y + positions.to.y) / 2 - 80;

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ 
        willChange: 'transform', 
        transform: 'translateZ(0)', // Force GPU layer
        isolation: 'isolate' // Create stacking context for performance
      }}
    >
      {/* Permanent Connection Line (appears at the end, or immediately if reduced motion) */}
      <svg 
        className="absolute inset-0 w-full h-full"
        style={{ 
          willChange: 'opacity', 
          transform: 'translateZ(0)',
          vectorEffect: 'non-scaling-stroke' // Optimize SVG rendering
        }}
      >
        <motion.path
          d={`M ${positions.from.x} ${positions.from.y} Q ${midX} ${midY} ${positions.to.x} ${positions.to.y}`}
          stroke="url(#permanentGradient)"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: reducedMotion ? 1 : 0, opacity: reducedMotion ? 0.7 : 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={reducedMotion ? { duration: 0 } : { 
            delay: 5.5, 
            duration: 0.5, 
            ease: "easeOut",
            type: "tween" // Ensure consistent timing
          }}
          style={{ 
            willChange: 'stroke-dasharray, opacity',
            transform: 'translateZ(0)'
          }}
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
          <svg 
            className="absolute inset-0 w-full h-full"
            style={{ 
              willChange: 'opacity',
              transform: 'translateZ(0)',
              vectorEffect: 'non-scaling-stroke'
            }}
          >
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
                ease: "easeInOut",
                type: "tween"
              }}
              style={{ 
                willChange: 'stroke-dasharray, opacity',
                transform: 'translateZ(0)'
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
              ease: "easeInOut",
              type: "tween"
            }}
            style={{ 
              transform: 'translate(-50%, -50%) translateZ(0)', 
              willChange: 'transform, opacity, filter',
              backfaceVisibility: 'hidden', // Prevent flickering
              perspective: 1000 // Enable 3D hardware acceleration
            }}
          />

          {/* Second Phase: Line shoots back from prayer TO replier (3.5-5.5s) */}
          <svg 
            className="absolute inset-0 w-full h-full"
            style={{ 
              willChange: 'opacity',
              transform: 'translateZ(0)',
              vectorEffect: 'non-scaling-stroke'
            }}
          >
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
                ease: "easeInOut",
                type: "tween"
              }}
              style={{ 
                willChange: 'stroke-dasharray, opacity',
                transform: 'translateZ(0)'
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
              ease: "easeInOut",
              type: "tween"
            }}
            style={{ 
              transform: 'translate(-50%, -50%) translateZ(0)', 
              willChange: 'transform, opacity, filter',
              backfaceVisibility: 'hidden',
              perspective: 1000
            }}
          />

          {/* Pulsing marker at prayer request location */}
          <motion.div
            className="absolute"
            style={{
              transform: `translate(calc(${positions.to.x}px - 50%), calc(${positions.to.y}px - 50%)) translateZ(0)`,
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              perspective: 1000
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0, 0.6, 0.6, 0]
            }}
            transition={{
              duration: 6,
              times: [0, 0.15, 0.85, 1],
              repeat: 0,
              type: "tween"
            }}
          >
            <div 
              className="w-12 h-12 rounded-full bg-yellow-300/40"
              style={{ 
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
            />
          </motion.div>

          {/* Pulsing marker at replier location */}
          <motion.div
            className="absolute"
            style={{
              transform: `translate(calc(${positions.from.x}px - 50%), calc(${positions.from.y}px - 50%)) translateZ(0)`,
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              perspective: 1000
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0, 0.6, 0.6, 0]
            }}
            transition={{
              duration: 6,
              times: [0, 0.15, 0.85, 1],
              repeat: 0,
              type: "tween"
            }}
          >
            <div 
              className="w-12 h-12 rounded-full bg-purple-300/40"
              style={{ 
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
            />
          </motion.div>
        </>
      )}
    </div>
  );
}