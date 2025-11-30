/**
 * PrayerAnimationLayerEnhanced
 *
 * World-class prayer animation combining:
 * - Original line drawing and traveling lights
 * - Spotlight beams
 * - Particle effects
 * - Celebration burst
 * - Haptic feedback
 * - Audio cues (optional)
 *
 * Performance-aware: adapts to device capability
 */

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import type { Prayer } from '../types/prayer';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAnimationPerformance } from '../hooks/useAnimationPerformance';
import { useHaptic } from '../hooks/useHaptic';
import { useAudio } from '../hooks/useAudio';

// Enhancement components
import { SpotlightBeams } from './animations/SpotlightBeams';
import { PrayerParticles } from './animations/PrayerParticles';
import { CelebrationBurst } from './animations/CelebrationBurst';

interface PrayerAnimationLayerEnhancedProps {
  prayer: Prayer;
  userLocation: { lat: number; lng: number };
  map: mapboxgl.Map | null;
  onComplete: () => void;
  /** Enable sound effects */
  enableSound?: boolean;
}

export function PrayerAnimationLayerEnhanced({
  prayer,
  userLocation,
  map,
  onComplete,
  enableSound = false
}: PrayerAnimationLayerEnhancedProps) {
  const reducedMotion = useReducedMotion();
  const {
    complexity,
    timing,
    shouldShowParticles,
    shouldShowSpotlights,
    shouldTriggerHaptics
  } = useAnimationPerformance();

  const haptic = useHaptic();
  const audio = useAudio();

  const [positions, setPositions] = useState<{
    from: { x: number; y: number } | null;
    to: { x: number; y: number } | null;
  }>({ from: null, to: null });

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPos, setCelebrationPos] = useState({ x: 0, y: 0 });

  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Main animation setup
  useEffect(() => {
    if (!map) return;

    hasCompletedRef.current = false;

    // Calculate bounds
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([prayer.location.lng, prayer.location.lat]);
    bounds.extend([userLocation.lng, userLocation.lat]);

    // Camera movement
    map.fitBounds(bounds, {
      padding: 150,
      pitch: reducedMotion ? 0 : 45,
      bearing: 0,
      duration: reducedMotion ? 0 : timing.cameraMove,
      maxZoom: 13
    });

    // Update positions for overlay
    const updatePositions = () => {
      const fromPoint = map.project([userLocation.lng, userLocation.lat]);
      const toPoint = map.project([prayer.location.lng, prayer.location.lat]);
      setPositions({
        from: { x: fromPoint.x, y: fromPoint.y },
        to: { x: toPoint.x, y: toPoint.y }
      });
    };

    updatePositions();
    map.on('move', updatePositions);

    // Trigger haptics and audio at appropriate times
    if (shouldTriggerHaptics) {
      haptic.prayerStart();

      // Connection haptic
      setTimeout(() => haptic.prayerConnect(), timing.lineDrawEnd);

      // Completion haptic
      setTimeout(() => haptic.prayerComplete(), timing.total - 200);
    }

    if (enableSound && !audio.isMuted) {
      audio.playPrayerAnimation();
    }

    // Celebration at the end
    setTimeout(() => {
      if (positions.to) {
        setCelebrationPos(positions.to);
        setShowCelebration(true);
      }
    }, timing.celebrationStart);

    // Complete callback
    const timer = setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onCompleteRef.current();
      }
    }, timing.total);

    return () => {
      map.off('move', updatePositions);
      clearTimeout(timer);
    };
  }, [map, prayer.location.lat, prayer.location.lng, userLocation.lat, userLocation.lng, reducedMotion, timing, shouldTriggerHaptics, haptic, enableSound, audio, positions.to]);

  if (!positions.from || !positions.to) return null;

  const midX = (positions.from.x + positions.to.x) / 2;
  const midY = (positions.from.y + positions.to.y) / 2 - 80;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Spotlight Beams (Phase 3) */}
      {shouldShowSpotlights && !reducedMotion && (
        <SpotlightBeams
          prayerPosition={positions.to}
          userPosition={positions.from}
          delay={timing.spotlightStart / 1000}
          duration={timing.spotlightDuration / 1000}
        />
      )}

      {/* Particles along the path */}
      {shouldShowParticles && !reducedMotion && (
        <PrayerParticles
          prayerPosition={positions.to}
          userPosition={positions.from}
        />
      )}

      {/* Permanent Connection Line */}
      <svg className="absolute inset-0 w-full h-full">
        <motion.path
          d={`M ${positions.from.x} ${positions.from.y} Q ${midX} ${midY} ${positions.to.x} ${positions.to.y}`}
          stroke="url(#permanentGradient)"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: reducedMotion ? 1 : 0, opacity: reducedMotion ? 0.7 : 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={reducedMotion ? { duration: 0 } : {
            delay: (timing.total - 500) / 1000,
            duration: 0.5,
            ease: "easeOut"
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

      {/* Animated elements - hidden if reduced motion */}
      {!reducedMotion && complexity !== 'minimal' && (
        <>
          {/* Outbound line animation */}
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
                duration: timing.total / 1000,
                times: [0, timing.lineDrawEnd / timing.total, timing.returnStart / timing.total, (timing.returnStart + 200) / timing.total],
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

          {/* Traveling Light - Outbound */}
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
              duration: timing.total / 1000,
              times: [0, timing.lineDrawEnd / timing.total, timing.returnStart / timing.total, (timing.returnStart + 200) / timing.total],
              ease: "easeInOut"
            }}
            style={{ transform: 'translate(-50%, -50%)', willChange: 'transform, opacity' }}
          />

          {/* Return line animation */}
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
                duration: timing.total / 1000,
                times: [0, timing.returnStart / timing.total, timing.returnEnd / timing.total, (timing.returnEnd + 200) / timing.total],
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

          {/* Traveling Light - Return */}
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
              duration: timing.total / 1000,
              times: [0, timing.returnStart / timing.total, timing.returnEnd / timing.total, (timing.returnEnd + 100) / timing.total, 1],
              ease: "easeInOut"
            }}
            style={{ transform: 'translate(-50%, -50%)', willChange: 'transform, opacity' }}
          />

          {/* Pulsing markers */}
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
              duration: timing.total / 1000,
              times: [0, 0.15, 0.85, 1]
            }}
          >
            <div className="w-12 h-12 rounded-full bg-yellow-300/40" />
          </motion.div>

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
              duration: timing.total / 1000,
              times: [0, 0.15, 0.85, 1]
            }}
          >
            <div className="w-12 h-12 rounded-full bg-purple-300/40" />
          </motion.div>
        </>
      )}

      {/* Celebration burst at completion */}
      {shouldShowParticles && (
        <CelebrationBurst
          position={celebrationPos}
          show={showCelebration}
        />
      )}
    </div>
  );
}
