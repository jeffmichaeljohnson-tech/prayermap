/**
 * SpotlightBeams Component
 *
 * Dramatic vertical light beams that appear during Phase 3 of the
 * 6-second prayer animation. Creates a "heavenly" effect.
 *
 * - Gold spotlight at prayer location
 * - Purple spotlight at user location
 * - Both fade up, hold, then fade down
 */

import { motion } from 'framer-motion';

interface SpotlightBeamsProps {
  prayerPosition: { x: number; y: number };
  userPosition: { x: number; y: number };
  /** Delay before spotlights appear (synced with animation phase 3) */
  delay?: number;
  /** Total duration of spotlight effect */
  duration?: number;
  /** Whether to show (respects reduced motion externally) */
  show?: boolean;
}

export function SpotlightBeams({
  prayerPosition,
  userPosition,
  delay = 4,
  duration = 2,
  show = true
}: SpotlightBeamsProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Gold Spotlight at Prayer Location */}
      <motion.div
        className="absolute"
        style={{
          left: prayerPosition.x,
          bottom: 0,
          width: '120px',
          height: '100%',
          transform: 'translateX(-50%)',
          background: `linear-gradient(
            to top,
            rgba(255, 215, 0, 0) 0%,
            rgba(255, 215, 0, 0.15) 20%,
            rgba(255, 215, 0, 0.4) 50%,
            rgba(255, 215, 0, 0.15) 80%,
            rgba(255, 215, 0, 0) 100%
          )`,
          filter: 'blur(20px)',
        }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{
          scaleY: [0, 1, 1, 0],
          opacity: [0, 0.8, 0.8, 0]
        }}
        transition={{
          delay,
          duration,
          times: [0, 0.3, 0.7, 1],
          ease: 'easeInOut'
        }}
      />

      {/* Gold Spotlight Core (brighter center) */}
      <motion.div
        className="absolute"
        style={{
          left: prayerPosition.x,
          bottom: 0,
          width: '40px',
          height: '100%',
          transform: 'translateX(-50%)',
          background: `linear-gradient(
            to top,
            rgba(255, 223, 100, 0) 0%,
            rgba(255, 223, 100, 0.3) 30%,
            rgba(255, 223, 100, 0.6) 50%,
            rgba(255, 223, 100, 0.3) 70%,
            rgba(255, 223, 100, 0) 100%
          )`,
          filter: 'blur(8px)',
        }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{
          scaleY: [0, 1, 1, 0],
          opacity: [0, 1, 1, 0]
        }}
        transition={{
          delay: delay + 0.1,
          duration: duration - 0.2,
          times: [0, 0.3, 0.7, 1],
          ease: 'easeOut'
        }}
      />

      {/* Gold Ground Glow */}
      <motion.div
        className="absolute"
        style={{
          left: prayerPosition.x,
          top: prayerPosition.y,
          width: '200px',
          height: '100px',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(255, 215, 0, 0.5) 0%, transparent 70%)',
          filter: 'blur(15px)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 1.5, 1.2, 0],
          opacity: [0, 0.8, 0.6, 0]
        }}
        transition={{
          delay: delay + 0.2,
          duration: duration,
          times: [0, 0.3, 0.7, 1],
          ease: 'easeOut'
        }}
      />

      {/* Purple Spotlight at User Location */}
      <motion.div
        className="absolute"
        style={{
          left: userPosition.x,
          bottom: 0,
          width: '120px',
          height: '100%',
          transform: 'translateX(-50%)',
          background: `linear-gradient(
            to top,
            rgba(147, 112, 219, 0) 0%,
            rgba(147, 112, 219, 0.15) 20%,
            rgba(147, 112, 219, 0.4) 50%,
            rgba(147, 112, 219, 0.15) 80%,
            rgba(147, 112, 219, 0) 100%
          )`,
          filter: 'blur(20px)',
        }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{
          scaleY: [0, 1, 1, 0],
          opacity: [0, 0.8, 0.8, 0]
        }}
        transition={{
          delay: delay + 0.15,
          duration,
          times: [0, 0.3, 0.7, 1],
          ease: 'easeInOut'
        }}
      />

      {/* Purple Spotlight Core */}
      <motion.div
        className="absolute"
        style={{
          left: userPosition.x,
          bottom: 0,
          width: '40px',
          height: '100%',
          transform: 'translateX(-50%)',
          background: `linear-gradient(
            to top,
            rgba(180, 150, 240, 0) 0%,
            rgba(180, 150, 240, 0.3) 30%,
            rgba(180, 150, 240, 0.6) 50%,
            rgba(180, 150, 240, 0.3) 70%,
            rgba(180, 150, 240, 0) 100%
          )`,
          filter: 'blur(8px)',
        }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{
          scaleY: [0, 1, 1, 0],
          opacity: [0, 1, 1, 0]
        }}
        transition={{
          delay: delay + 0.25,
          duration: duration - 0.2,
          times: [0, 0.3, 0.7, 1],
          ease: 'easeOut'
        }}
      />

      {/* Purple Ground Glow */}
      <motion.div
        className="absolute"
        style={{
          left: userPosition.x,
          top: userPosition.y,
          width: '200px',
          height: '100px',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(147, 112, 219, 0.5) 0%, transparent 70%)',
          filter: 'blur(15px)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 1.5, 1.2, 0],
          opacity: [0, 0.8, 0.6, 0]
        }}
        transition={{
          delay: delay + 0.35,
          duration: duration,
          times: [0, 0.3, 0.7, 1],
          ease: 'easeOut'
        }}
      />
    </div>
  );
}
