/**
 * NewConnectionEffect - Dramatic entrance animation for new prayer connections
 *
 * When someone prays for another person in real-time, this component creates
 * a celebratory animation that makes "the invisible visible" - showing the
 * spiritual connection forming on the map.
 *
 * Features:
 * - Dramatic line drawing from supporter to requester (2s ease-out)
 * - Particle trail following the line as it draws
 * - Burst effects at both endpoints (small at supporter, large at requester)
 * - Sound and haptic integration hooks
 * - Fades to normal memorial line appearance
 * - GPU-accelerated animations (transform/opacity only)
 * - Gradient from gold (#F7E7CE) to purple (#D4C5F9)
 *
 * Performance: 60fps target, uses requestAnimationFrame
 * Accessibility: Respects prefers-reduced-motion
 * Mobile: Haptic feedback integration
 *
 * MEMORY LOG:
 * Decision: Use canvas + requestAnimationFrame for particle effects
 * Context: Need smooth 60fps particle trails following curved paths
 * Reasoning:
 *   - Canvas performs better than SVG for many particles
 *   - RAF gives precise control over animation timing
 *   - Framer Motion for line drawing (pathLength animation)
 *   - Hybrid approach: SVG for line, canvas for particles
 * Alternatives Considered: Pure SVG, pure canvas, WebGL
 * Mobile Impact: Canvas is GPU-accelerated on mobile, excellent performance
 * Date: 2025-11-29
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { PrayerConnection } from '../../types/prayer';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getAnimationComplexity } from '../../utils/animationPerformance';

export interface NewConnectionEffectProps {
  connection: PrayerConnection;
  map: MapboxMap;
  onAnimationStart?: () => void;
  onAnimationMidpoint?: () => void; // When line reaches destination
  onAnimationComplete?: () => void;
  onRequestHaptic?: (pattern: 'light' | 'medium' | 'heavy') => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  hue: number; // For color variation
  life: number; // 0-1, decreases over time
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  hue: number;
  life: number;
}

const ANIMATION_DURATION_MS = 2000; // 2 seconds for line drawing
const PARTICLE_SPAWN_RATE = 3; // Particles per frame
const PARTICLE_LIFETIME = 800; // ms
const SUPPORTER_BURST_COUNT = 12; // Small burst at start
const REQUESTER_BURST_COUNT = 24; // Large celebration burst at end

/**
 * Calculate point along quadratic bezier curve
 */
function getPointOnQuadraticBezier(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { x: number; y: number } {
  const oneMinusT = 1 - t;
  const oneMinusTSquared = oneMinusT * oneMinusT;
  const tSquared = t * t;

  return {
    x: oneMinusTSquared * p0.x + 2 * oneMinusT * t * p1.x + tSquared * p2.x,
    y: oneMinusTSquared * p0.y + 2 * oneMinusT * t * p1.y + tSquared * p2.y
  };
}

/**
 * Calculate tangent (direction) at point on quadratic bezier
 */
function getTangentOnQuadraticBezier(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { x: number; y: number } {
  const oneMinusT = 1 - t;

  return {
    x: 2 * oneMinusT * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * oneMinusT * (p1.y - p0.y) + 2 * t * (p2.y - p1.y)
  };
}

/**
 * Create burst particles at a point
 */
function createBurst(
  x: number,
  y: number,
  count: number,
  baseHue: number
): BurstParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 50 + Math.random() * 100;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    return {
      x,
      y,
      vx,
      vy,
      opacity: 0.8 + Math.random() * 0.2,
      size: 2 + Math.random() * 3,
      hue: baseHue + (Math.random() - 0.5) * 30,
      life: 1.0
    };
  });
}

/**
 * NewConnectionEffect Component
 *
 * Orchestrates the dramatic entrance sequence:
 * 1. Small burst at supporter location (0ms)
 * 2. Line draws from supporter to requester with particle trail (0-2000ms)
 * 3. Large celebration burst at requester location (2000ms)
 * 4. Fade to normal memorial line appearance (2000-2500ms)
 */
export function NewConnectionEffect({
  connection,
  map,
  onAnimationStart,
  onAnimationMidpoint,
  onAnimationComplete,
  onRequestHaptic
}: NewConnectionEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const burstParticlesRef = useRef<BurstParticle[]>([]);
  const nextParticleIdRef = useRef(0);
  const hasTriggeredMidpointRef = useRef(false);
  const [isComplete, setIsComplete] = useState(false);

  const lineControls = useAnimation();
  const glowControls = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const complexity = getAnimationComplexity();

  // Calculate positions
  const fromPoint = map.project([
    connection.fromLocation.lng,
    connection.fromLocation.lat
  ]);
  const toPoint = map.project([
    connection.toLocation.lng,
    connection.toLocation.lat
  ]);

  const positions = {
    from: { x: fromPoint.x, y: fromPoint.y },
    to: { x: toPoint.x, y: toPoint.y }
  };

  // Calculate quadratic curve control point
  const midX = (positions.from.x + positions.to.x) / 2;
  const midY = (positions.from.y + positions.to.y) / 2 - 40; // Arc upward

  const controlPoint = { x: midX, y: midY };

  // Generate SVG path
  const pathD = `M ${positions.from.x} ${positions.from.y} Q ${midX} ${midY} ${positions.to.x} ${positions.to.y}`;

  /**
   * Spawn trailing particles as line draws
   */
  const spawnTrailParticles = useCallback(
    (progress: number) => {
      if (complexity === 'minimal') return;

      const point = getPointOnQuadraticBezier(
        progress,
        positions.from,
        controlPoint,
        positions.to
      );

      const tangent = getTangentOnQuadraticBezier(
        progress,
        positions.from,
        controlPoint,
        positions.to
      );

      const spawnCount = complexity === 'reduced' ? 1 : PARTICLE_SPAWN_RATE;

      for (let i = 0; i < spawnCount; i++) {
        // Perpendicular to tangent for spread
        const perpX = -tangent.y;
        const perpY = tangent.x;
        const magnitude = Math.sqrt(perpX * perpX + perpY * perpY);
        const normalizedPerpX = perpX / magnitude;
        const normalizedPerpY = perpY / magnitude;

        const spread = (Math.random() - 0.5) * 20;

        particlesRef.current.push({
          id: nextParticleIdRef.current++,
          x: point.x + normalizedPerpX * spread,
          y: point.y + normalizedPerpY * spread,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10 - 5, // Slight upward drift
          opacity: 0.6 + Math.random() * 0.4,
          size: 1.5 + Math.random() * 2,
          // Gradient from gold (45) at start to purple (270) at end
          hue: 45 + progress * (270 - 45) + (Math.random() - 0.5) * 20,
          life: 1.0
        });
      }
    },
    [complexity, positions.from, positions.to, controlPoint]
  );

  /**
   * Update particle positions and opacity
   */
  const updateParticles = useCallback((deltaTime: number) => {
    const deltaSeconds = deltaTime / 1000;

    // Update trail particles
    particlesRef.current = particlesRef.current
      .map(p => ({
        ...p,
        x: p.x + p.vx * deltaSeconds,
        y: p.y + p.vy * deltaSeconds,
        life: p.life - deltaSeconds / (PARTICLE_LIFETIME / 1000),
        opacity: p.opacity * (p.life - deltaSeconds / (PARTICLE_LIFETIME / 1000))
      }))
      .filter(p => p.life > 0);

    // Update burst particles
    burstParticlesRef.current = burstParticlesRef.current
      .map(p => ({
        ...p,
        x: p.x + p.vx * deltaSeconds,
        y: p.y + p.vy * deltaSeconds,
        vx: p.vx * 0.95, // Deceleration
        vy: p.vy * 0.95,
        life: p.life - deltaSeconds * 1.5,
        opacity: p.opacity * p.life
      }))
      .filter(p => p.life > 0);
  }, []);

  /**
   * Render particles to canvas
   */
  const renderParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render trail particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Render burst particles with glow
    burstParticlesRef.current.forEach(p => {
      // Glow
      ctx.fillStyle = `hsla(${p.hue}, 100%, 80%, ${p.opacity * 0.3})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  /**
   * Main animation loop
   */
  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);

      // Spawn particles along the line as it draws
      if (progress < 1) {
        spawnTrailParticles(progress);
      }

      // Trigger midpoint callback (when line is halfway drawn)
      if (progress >= 0.5 && !hasTriggeredMidpointRef.current) {
        hasTriggeredMidpointRef.current = true;
        onAnimationMidpoint?.();
        onRequestHaptic?.('light');
      }

      // Update and render particles
      const deltaTime = 16.67; // Assume 60fps
      updateParticles(deltaTime);
      renderParticles();

      // Check if animation is complete
      if (progress >= 1 && particlesRef.current.length === 0 && burstParticlesRef.current.length === 0) {
        setIsComplete(true);
        onAnimationComplete?.();
        return;
      }

      // Continue animation
      rafRef.current = requestAnimationFrame(animate);
    },
    [
      spawnTrailParticles,
      updateParticles,
      renderParticles,
      onAnimationMidpoint,
      onAnimationComplete,
      onRequestHaptic
    ]
  );

  /**
   * Start animation sequence
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to match map container
    const container = map.getContainer();
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Trigger start callback
    onAnimationStart?.();

    // Initial haptic feedback (supporter burst)
    onRequestHaptic?.('light');

    // Create supporter burst (gold/yellow hue)
    if (complexity !== 'minimal') {
      burstParticlesRef.current.push(
        ...createBurst(positions.from.x, positions.from.y, SUPPORTER_BURST_COUNT, 45)
      );
    }

    // Start line drawing animation
    const duration = prefersReducedMotion ? 0 : ANIMATION_DURATION_MS / 1000;

    lineControls.start({
      pathLength: 1,
      opacity: 0.9,
      transition: {
        pathLength: {
          duration,
          ease: 'easeOut'
        },
        opacity: {
          duration: duration * 0.3
        }
      }
    });

    // Glow effect
    if (!prefersReducedMotion && complexity === 'full') {
      glowControls.start({
        opacity: [0, 0.6, 0.3],
        scale: [1, 1.1, 1],
        transition: {
          duration,
          ease: 'easeOut'
        }
      });
    }

    // Start particle animation loop
    rafRef.current = requestAnimationFrame(animate);

    // Schedule requester burst and final haptic
    const burstTimeout = setTimeout(() => {
      if (complexity !== 'minimal') {
        // Large celebration burst (purple hue)
        burstParticlesRef.current.push(
          ...createBurst(positions.to.x, positions.to.y, REQUESTER_BURST_COUNT, 270)
        );
      }
      // Strong haptic for celebration
      onRequestHaptic?.('heavy');
    }, prefersReducedMotion ? 0 : ANIMATION_DURATION_MS);

    // Cleanup
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      clearTimeout(burstTimeout);
    };
  }, [
    map,
    positions.from,
    positions.to,
    complexity,
    prefersReducedMotion,
    animate,
    lineControls,
    glowControls,
    onAnimationStart,
    onRequestHaptic
  ]);

  // If animation is complete, don't render anything (parent will show normal memorial line)
  if (isComplete) {
    return null;
  }

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Canvas for particles (positioned absolutely) */}
      <foreignObject x="0" y="0" width="100%" height="100%">
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 10
          }}
        />
      </foreignObject>

      {/* Glow effect behind line */}
      {!prefersReducedMotion && complexity === 'full' && (
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#newConnectionGlowGradient)"
          strokeWidth="10"
          initial={{ opacity: 0, scale: 1 }}
          animate={glowControls}
          style={{
            filter: 'blur(12px)',
            transformOrigin: 'center'
          }}
        />
      )}

      {/* Main animated line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="url(#newConnectionGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={lineControls}
      />

      {/* Endpoint glow at supporter (fades in at start) */}
      {!prefersReducedMotion && (
        <motion.circle
          cx={positions.from.x}
          cy={positions.from.y}
          r="6"
          fill="url(#supporterGlowGradient)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.8, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ filter: 'blur(4px)' }}
        />
      )}

      {/* Endpoint glow at requester (appears when line completes) */}
      {!prefersReducedMotion && (
        <motion.circle
          cx={positions.to.x}
          cy={positions.to.y}
          r="10"
          fill="url(#requesterGlowGradient)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: prefersReducedMotion ? 0 : ANIMATION_DURATION_MS / 1000,
            duration: 0.4,
            ease: 'easeOut'
          }}
          style={{ filter: 'blur(6px)' }}
        />
      )}
    </g>
  );
}

/**
 * SVG gradient definitions for new connection animations
 * Include these in your parent SVG <defs> section
 *
 * Example usage:
 * ```tsx
 * <svg>
 *   <defs>
 *     {NewConnectionGradients}
 *   </defs>
 *   <NewConnectionEffect ... />
 * </svg>
 * ```
 */
export const NewConnectionGradients = (
  <>
    {/* Main line gradient - gold to purple */}
    <linearGradient id="newConnectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#F7E7CE" stopOpacity="1" />
      <stop offset="50%" stopColor="#E8C4F8" stopOpacity="1" />
      <stop offset="100%" stopColor="#D4C5F9" stopOpacity="1" />
    </linearGradient>

    {/* Glow gradient - brighter, more vibrant */}
    <linearGradient id="newConnectionGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#F7E7CE" stopOpacity="0.8" />
      <stop offset="50%" stopColor="#E8C4F8" stopOpacity="0.8" />
      <stop offset="100%" stopColor="#D4C5F9" stopOpacity="0.8" />
    </linearGradient>

    {/* Supporter endpoint glow - gold/dawn */}
    <radialGradient id="supporterGlowGradient">
      <stop offset="0%" stopColor="#F7E7CE" stopOpacity="1" />
      <stop offset="70%" stopColor="#F7E7CE" stopOpacity="0.6" />
      <stop offset="100%" stopColor="#F7E7CE" stopOpacity="0" />
    </radialGradient>

    {/* Requester endpoint glow - purple */}
    <radialGradient id="requesterGlowGradient">
      <stop offset="0%" stopColor="#D4C5F9" stopOpacity="1" />
      <stop offset="70%" stopColor="#D4C5F9" stopOpacity="0.6" />
      <stop offset="100%" stopColor="#D4C5F9" stopOpacity="0" />
    </radialGradient>
  </>
);
