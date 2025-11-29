/**
 * PrayerParticles Component
 *
 * Subtle sparkle/star particles that appear during the animation:
 * - Stars along the connection path
 * - Burst of particles at endpoints
 * - Floating ambient particles
 *
 * Performance optimized with CSS animations where possible.
 */

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  color: 'gold' | 'purple' | 'white';
}

interface PrayerParticlesProps {
  prayerPosition: { x: number; y: number };
  userPosition: { x: number; y: number };
  show?: boolean;
}

/**
 * Generate particles along the path and at endpoints
 */
function generateParticles(
  from: { x: number; y: number },
  to: { x: number; y: number }
): Particle[] {
  const particles: Particle[] = [];
  let id = 0;

  // Particles along the path (appear as line draws)
  const pathCount = 12;
  for (let i = 0; i < pathCount; i++) {
    const t = i / (pathCount - 1);
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t - 30 * Math.sin(Math.PI * t); // Slight arc

    particles.push({
      id: id++,
      x,
      y,
      size: 3 + Math.random() * 4,
      delay: 1.5 + t * 2, // Follow the line drawing
      duration: 1 + Math.random() * 0.5,
      color: Math.random() > 0.5 ? 'gold' : 'white'
    });
  }

  // Burst at prayer location (gold)
  const burstCount = 8;
  for (let i = 0; i < burstCount; i++) {
    const angle = (i / burstCount) * Math.PI * 2;
    const radius = 20 + Math.random() * 30;
    particles.push({
      id: id++,
      x: to.x + Math.cos(angle) * radius,
      y: to.y + Math.sin(angle) * radius,
      size: 4 + Math.random() * 4,
      delay: 2.4 + Math.random() * 0.3, // When line reaches
      duration: 0.8 + Math.random() * 0.4,
      color: 'gold'
    });
  }

  // Burst at user location (purple)
  for (let i = 0; i < burstCount; i++) {
    const angle = (i / burstCount) * Math.PI * 2;
    const radius = 20 + Math.random() * 30;
    particles.push({
      id: id++,
      x: from.x + Math.cos(angle) * radius,
      y: from.y + Math.sin(angle) * radius,
      size: 4 + Math.random() * 4,
      delay: 5.5 + Math.random() * 0.3, // When return line arrives
      duration: 0.8 + Math.random() * 0.4,
      color: 'purple'
    });
  }

  // Ambient floating particles
  const ambientCount = 6;
  for (let i = 0; i < ambientCount; i++) {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    particles.push({
      id: id++,
      x: midX + (Math.random() - 0.5) * 200,
      y: midY + (Math.random() - 0.5) * 150,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 4,
      duration: 2 + Math.random(),
      color: 'white'
    });
  }

  return particles;
}

const COLORS = {
  gold: 'rgb(255, 215, 100)',
  purple: 'rgb(180, 150, 240)',
  white: 'rgb(255, 255, 255)'
};

export function PrayerParticles({ prayerPosition, userPosition, show = true }: PrayerParticlesProps) {
  const particles = useMemo(
    () => generateParticles(userPosition, prayerPosition),
    [prayerPosition.x, prayerPosition.y, userPosition.x, userPosition.y]
  );

  if (!show) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: COLORS[particle.color],
            boxShadow: `0 0 ${particle.size * 2}px ${COLORS[particle.color]}`,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.5, 1, 0],
            opacity: [0, 1, 0.8, 0],
            y: [0, -10 - Math.random() * 20]
          }}
          transition={{
            delay: particle.delay,
            duration: particle.duration,
            ease: 'easeOut'
          }}
        />
      ))}

      {/* Star shapes at key moments */}
      <StarBurst
        x={prayerPosition.x}
        y={prayerPosition.y}
        delay={2.5}
        color="gold"
      />
      <StarBurst
        x={userPosition.x}
        y={userPosition.y}
        delay={5.6}
        color="purple"
      />
    </div>
  );
}

/**
 * Star-shaped burst effect
 */
function StarBurst({ x, y, delay, color }: { x: number; y: number; delay: number; color: 'gold' | 'purple' }) {
  const starColor = color === 'gold' ? 'rgb(255, 215, 100)' : 'rgb(180, 150, 240)';

  return (
    <motion.div
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ scale: 0, opacity: 0, rotate: 0 }}
      animate={{
        scale: [0, 1.2, 0],
        opacity: [0, 1, 0],
        rotate: [0, 180]
      }}
      transition={{
        delay,
        duration: 0.6,
        ease: 'easeOut'
      }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40">
        <path
          d="M20 0 L23 15 L40 20 L23 25 L20 40 L17 25 L0 20 L17 15 Z"
          fill={starColor}
          style={{ filter: `drop-shadow(0 0 8px ${starColor})` }}
        />
      </svg>
    </motion.div>
  );
}
