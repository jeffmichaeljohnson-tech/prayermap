/**
 * CelebrationBurst Component
 *
 * A subtle celebration effect when prayer animation completes.
 * Not over-the-top confetti - more like gentle sparkles/stars
 * that feel spiritual and appropriate.
 */

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface CelebrationBurstProps {
  /** Center position of the burst */
  position: { x: number; y: number };
  /** Trigger the celebration */
  show: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
}

interface SparkleParticle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
}

const COLORS = [
  'rgb(255, 215, 100)', // Gold
  'rgb(180, 150, 240)', // Purple
  'rgb(255, 255, 255)', // White
  'rgb(200, 230, 255)', // Light blue
  'rgb(255, 200, 220)', // Light pink
];

function generateSparkles(count: number): SparkleParticle[] {
  const sparkles: SparkleParticle[] = [];

  for (let i = 0; i < count; i++) {
    sparkles.push({
      id: i,
      angle: (i / count) * Math.PI * 2 + Math.random() * 0.5,
      distance: 50 + Math.random() * 100,
      size: 4 + Math.random() * 6,
      delay: Math.random() * 0.3,
      duration: 0.6 + Math.random() * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360
    });
  }

  return sparkles;
}

export function CelebrationBurst({ position, show, onComplete }: CelebrationBurstProps) {
  const sparkles = useMemo(() => generateSparkles(16), []);

  if (!show) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Central glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 60,
          height: 60,
          left: -30,
          top: -30,
          background: 'radial-gradient(circle, rgba(255, 215, 100, 0.6) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 2, 2.5],
          opacity: [0, 0.8, 0]
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
      />

      {/* Sparkle particles */}
      {sparkles.map(sparkle => {
        const x = Math.cos(sparkle.angle) * sparkle.distance;
        const y = Math.sin(sparkle.angle) * sparkle.distance;

        return (
          <motion.div
            key={sparkle.id}
            className="absolute"
            style={{
              width: sparkle.size,
              height: sparkle.size,
              left: -sparkle.size / 2,
              top: -sparkle.size / 2,
            }}
            initial={{
              x: 0,
              y: 0,
              scale: 0,
              opacity: 0,
              rotate: 0
            }}
            animate={{
              x: [0, x * 0.5, x],
              y: [0, y * 0.5 - 20, y],
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
              rotate: [0, sparkle.rotation]
            }}
            transition={{
              delay: sparkle.delay,
              duration: sparkle.duration,
              ease: 'easeOut'
            }}
          >
            {/* Star shape */}
            <svg
              viewBox="0 0 24 24"
              fill={sparkle.color}
              style={{ filter: `drop-shadow(0 0 4px ${sparkle.color})` }}
            >
              <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z" />
            </svg>
          </motion.div>
        );
      })}

      {/* Ring burst */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{
          width: 20,
          height: 20,
          left: -10,
          top: -10,
          borderColor: 'rgba(255, 215, 100, 0.8)'
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 4, 6],
          opacity: [0, 0.6, 0]
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Second ring with delay */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{
          width: 20,
          height: 20,
          left: -10,
          top: -10,
          borderColor: 'rgba(180, 150, 240, 0.8)'
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 3, 5],
          opacity: [0, 0.5, 0]
        }}
        transition={{ delay: 0.15, duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

/**
 * Mini celebration for smaller interactions
 */
export function MiniCelebration({ position, show }: { position: { x: number; y: number }; show: boolean }) {
  if (!show) return null;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1, 0] }}
      transition={{ duration: 0.4 }}
    >
      <span className="text-2xl">✨</span>
    </motion.div>
  );
}
