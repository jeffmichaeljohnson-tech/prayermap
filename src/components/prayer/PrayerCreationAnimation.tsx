import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Map as MapboxMap } from 'mapbox-gl';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface PrayerCreationAnimationProps {
  targetLocation: { lat: number; lng: number };
  map: MapboxMap | null;
  onComplete: () => void;
}

export function PrayerCreationAnimation({
  targetLocation,
  map,
  onComplete
}: PrayerCreationAnimationProps) {
  const reducedMotion = useReducedMotion();
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null);
  const hasStarted = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only run once
    if (hasStarted.current) return;
    hasStarted.current = true;

    if (!map) {
      // If no map, complete immediately
      onComplete();
      return;
    }

    try {
      // Get the target position on the map
      const point = map.project([targetLocation.lng, targetLocation.lat]);
      setTargetPosition({ x: point.x, y: point.y });
    } catch (error) {
      console.error('Error projecting location:', error);
      // Use center of screen as fallback
      setTargetPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
    }

    // Complete after animation (instant if reduced motion)
    timerRef.current = setTimeout(() => {
      onComplete();
    }, reducedMotion ? 300 : 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Handle map becoming null during animation
  useEffect(() => {
    if (!map && hasStarted.current && !targetPosition) {
      onComplete();
    }
  }, [map, targetPosition, onComplete]);

  if (!targetPosition) return null;

  // Start position is bottom center (where the Request Prayer button is)
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight - 100;

  // Reduced motion: Simple static visual feedback
  if (reducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }}>
        {/* Simple static indicator at target location */}
        <motion.div
          className="absolute text-5xl"
          style={{
            transform: `translate(calc(${targetPosition.x}px - 50%), calc(${targetPosition.y}px - 50%))`
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0], scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          🙏
        </motion.div>
      </div>
    );
  }

  // Full animation for users without reduced motion preference
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }}>
      {/* Ethereal trail effect */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 215, 0, 0.8)" />
            <stop offset="33%" stopColor="rgba(255, 192, 203, 0.6)" />
            <stop offset="66%" stopColor="rgba(147, 112, 219, 0.6)" />
            <stop offset="100%" stopColor="rgba(135, 206, 250, 0.4)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Animated trail path */}
        <motion.path
          d={`M ${startX} ${startY} Q ${(startX + targetPosition.x) / 2} ${Math.min(startY, targetPosition.y) - 100} ${targetPosition.x} ${targetPosition.y}`}
          fill="none"
          stroke="url(#trailGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
        />

        {/* Sparkle particles along the path */}
        {[0.2, 0.4, 0.6, 0.8].map((offset, i) => (
          <motion.circle
            key={i}
            r="3"
            fill="white"
            filter="url(#glow)"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              cx: [startX, (startX + targetPosition.x) / 2, targetPosition.x],
              cy: [startY, Math.min(startY, targetPosition.y) - 100, targetPosition.y],
            }}
            transition={{
              duration: 2,
              delay: offset,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>

      {/* The flying prayer emoji */}
      <motion.div
        className="absolute text-5xl"
        style={{
          transform: `translate(calc(${startX}px - 50%), calc(${startY}px - 50%))`,
          willChange: 'transform, opacity'
        }}
        initial={{
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1
        }}
        animate={{
          x: targetPosition.x - startX,
          y: targetPosition.y - startY,
          scale: [1, 1.3, 1],
          opacity: [1, 1, 1, 0]
        }}
        transition={{
          duration: 2.5,
          ease: [0.25, 0.1, 0.25, 1],
          times: [0, 0.3, 0.7, 1]
        }}
      >
        {/* Glow behind emoji */}
        <motion.div
          className="absolute rounded-full bg-gradient-to-br from-yellow-300 via-pink-300 to-purple-400 w-20 h-20"
          animate={{
            scale: [1, 1.5, 1, 1.5],
            opacity: [0.6, 0.8, 0.6, 0]
          }}
          transition={{
            duration: 2.5,
            ease: "easeInOut"
          }}
          style={{
            transform: 'translate(-15px, -15px)',
            willChange: 'transform, opacity'
          }}
        />
        <span className="relative z-10">🙏</span>
      </motion.div>

      {/* Landing burst effect at target */}
      <motion.div
        className="absolute"
        style={{
          transform: `translate(calc(${targetPosition.x}px - 50%), calc(${targetPosition.y}px - 50%))`,
          willChange: 'transform, opacity'
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 2, 2.5],
          opacity: [0, 0.8, 0]
        }}
        transition={{
          duration: 1,
          delay: 2,
          ease: "easeOut"
        }}
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-200 via-pink-200 to-purple-200" />
      </motion.div>

      {/* Sparkle burst at landing */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white"
          style={{
            transform: `translate(${targetPosition.x}px, ${targetPosition.y}px)`,
            filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))',
            willChange: 'transform, opacity'
          }}
          initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            x: Math.cos((i * Math.PI * 2) / 8) * 60,
            y: Math.sin((i * Math.PI * 2) / 8) * 60
          }}
          transition={{
            duration: 0.8,
            delay: 2.2,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
}
