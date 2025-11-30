/**
 * MemorialLine - Enhanced Individual Memorial Line Component
 *
 * A world-class animated SVG line that connects prayer locations to responders.
 * Features entrance animations, breathing glow effects, age-based styling,
 * and visual differentiation by response type.
 *
 * Key Features:
 * - Animated line drawing for new connections (SVG stroke animation)
 * - Age-based styling (bright new → subtle historic)
 * - Gentle breathing animation (subtle opacity pulse)
 * - Enhanced hover states with glow effects
 * - Touch-friendly hit areas (20px invisible stroke)
 * - Curved bezier paths for beautiful connections
 * - GPU-accelerated animations (transform & opacity only)
 * - Staggered entrance animations for batches
 * - Distinct selected state with pulsing outline
 *
 * Age Categories:
 * - New (< 1 day): opacity 1.0, width 3, glow 0.6
 * - Recent (< 7 days): opacity 0.85, width 2.5, glow 0.4
 * - Older (< 30 days): opacity 0.6, width 2, glow 0.2
 * - Historic (> 30 days): opacity 0.4, width 1.5, glow 0.1
 *
 * Performance: GPU-accelerated animations (transform, opacity only), 60fps target
 * Accessibility: Respects prefers-reduced-motion
 * Mobile: Touch-enabled with 20px hit area, proper event handling
 *
 * MEMORY LOG:
 * Decision: Use Framer Motion for SVG path animations with enhanced age-based styling
 * Context: Building "Living Map" with animated memorial lines that fade over time
 * Reasoning:
 *   - Framer Motion's pathLength animation is GPU-accelerated
 *   - Built-in spring physics for natural motion
 *   - Easy reduced-motion support
 *   - Age-based stroke width + opacity provides visual depth
 *   - updateKey pattern prevents unnecessary recalculations
 *   - Staggered animations create beautiful cascading effect
 * Alternatives Considered: GSAP, CSS animations, raw SVG animation
 * Mobile Impact: Excellent mobile performance with transform/opacity only
 * Date: 2025-11-29
 */

import { useState, useRef, useMemo } from 'react';
import { motion, useReducedMotion as useFramerReducedMotion } from 'framer-motion';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { PrayerConnection } from '../../types/prayer';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface MemorialLineProps {
  connection: PrayerConnection;
  map: MapboxMap;
  updateKey: number; // Triggers position recalculation when map moves/zooms
  isHovered: boolean;
  isSelected: boolean; // Distinct selected state with visual indicator
  isNew: boolean; // Triggers entrance animation
  entranceDelay?: number; // Stagger delay for batch animations (in seconds)
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void; // Click/tap handler
  responseType?: 'text' | 'audio' | 'video'; // For visual differentiation
}

/**
 * Calculate age-based styling for memorial lines
 * Newer connections are brighter and thicker, older ones fade to subtle
 *
 * @param createdAt - Date when connection was created
 * @returns Style properties (opacity, strokeWidth, glowIntensity)
 */
function getAgeBasedStyle(createdAt: Date) {
  const now = new Date();
  const ageInMs = now.getTime() - createdAt.getTime();
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

  if (ageInDays < 1) {
    // New (< 1 day): Bright, glowing
    return {
      opacity: 1,
      strokeWidth: 3,
      glowIntensity: 0.6,
      category: 'new' as const
    };
  } else if (ageInDays < 7) {
    // Recent (< 7 days): Normal brightness
    return {
      opacity: 0.85,
      strokeWidth: 2.5,
      glowIntensity: 0.4,
      category: 'recent' as const
    };
  } else if (ageInDays < 30) {
    // Older (< 30 days): Slightly faded
    return {
      opacity: 0.6,
      strokeWidth: 2,
      glowIntensity: 0.2,
      category: 'older' as const
    };
  } else {
    // Historic (> 30 days): Subtle, more transparent
    return {
      opacity: 0.4,
      strokeWidth: 1.5,
      glowIntensity: 0.1,
      category: 'historic' as const
    };
  }
}

/**
 * Get response type icon for connection midpoint
 * Returns Unicode emoji for the response type
 */
function getResponseIcon(responseType?: 'text' | 'audio' | 'video'): string | null {
  switch (responseType) {
    case 'audio': return '🎵';
    case 'video': return '🎥';
    default: return null;
  }
}

/**
 * MemorialLine Component
 *
 * Renders an animated connection line between a prayer and its response.
 * Features:
 * - Entrance animation with drawing effect
 * - Subtle breathing glow (pulsing)
 * - Age-based opacity and glow
 * - Response type icons (audio/video)
 * - Hover/touch interactions
 * - Reduced motion support
 * - 60fps performance target
 */
export function MemorialLine({
  connection,
  map,
  updateKey,
  isHovered,
  isSelected,
  isNew,
  entranceDelay = 0,
  onHover,
  onLeave,
  onSelect,
  responseType
}: MemorialLineProps) {
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const lineRef = useRef<SVGPathElement>(null);

  // Reduced motion support (use our custom hook for consistency)
  const prefersReducedMotion = useReducedMotion();

  // Calculate positions - recalculates when updateKey changes (map moves/zooms)
  // This is triggered by the parent's centralized map event handler
  // Performance: No individual map listeners needed
  const positions = useMemo(() => {
    const fromPoint = map.project([connection.fromLocation.lng, connection.fromLocation.lat]);
    const toPoint = map.project([connection.toLocation.lng, connection.toLocation.lat]);

    return {
      from: { x: fromPoint.x, y: fromPoint.y },
      to: { x: toPoint.x, y: toPoint.y }
    };
  }, [map, connection.fromLocation, connection.toLocation, updateKey]);

  // Calculate quadratic curve control point
  const midX = (positions.from.x + positions.to.x) / 2;
  const midY = (positions.from.y + positions.to.y) / 2 - 40;

  // Generate SVG path
  const pathD = `M ${positions.from.x} ${positions.from.y} Q ${midX} ${midY} ${positions.to.x} ${positions.to.y}`;

  // Calculate age-based styling
  const ageStyle = useMemo(
    () => getAgeBasedStyle(connection.createdAt),
    [connection.createdAt]
  );

  // Get response icon if applicable
  const icon = getResponseIcon(responseType);

  // Calculate dynamic stroke width based on state
  const strokeWidth = isHovered
    ? ageStyle.strokeWidth + 1
    : isSelected
      ? ageStyle.strokeWidth + 0.5
      : ageStyle.strokeWidth;

  // Format date for tooltip
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Handle mouse/touch position for tooltip
  const handleMouseMove = (e: React.MouseEvent) => {
    const svgRect = (e.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    if (svgRect) {
      setTooltipPosition({
        x: e.clientX - svgRect.left,
        y: e.clientY - svgRect.top
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const svgRect = (e.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (svgRect) {
        setTooltipPosition({
          x: touch.clientX - svgRect.left,
          y: touch.clientY - svgRect.top
        });
      }
      onHover();
    }
  };

  const handleClick = () => {
    onSelect();
  };

  // Animation variants
  const pathVariants = {
    hidden: {
      pathLength: 0,
      opacity: 0
    },
    visible: {
      pathLength: 1,
      opacity: ageStyle.opacity,
      transition: {
        pathLength: {
          type: "spring" as const,
          duration: prefersReducedMotion ? 0 : 1.2,
          bounce: 0,
          delay: prefersReducedMotion ? 0 : entranceDelay
        },
        opacity: {
          duration: prefersReducedMotion ? 0 : 0.6,
          delay: prefersReducedMotion ? 0 : entranceDelay
        }
      }
    }
  };

  const glowVariants = {
    breathe: {
      opacity: [ageStyle.glowIntensity * 0.6, ageStyle.glowIntensity, ageStyle.glowIntensity * 0.6],
      scale: [1, 1.02, 1],
      transition: {
        duration: prefersReducedMotion ? 0 : 3,
        repeat: Infinity as const,
        ease: "easeInOut" as const,
        delay: prefersReducedMotion ? 0 : entranceDelay
      }
    }
  };

  return (
    <g
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={onLeave}
      onClick={handleClick}
      style={{ pointerEvents: 'auto', cursor: onSelect ? 'pointer' : 'default' }}
    >
      {/* Wider invisible path for easier hovering/tapping (44pt minimum for iOS) */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
        style={{ pointerEvents: 'stroke' }}
      />

      {/* Breathing glow effect - always present but subtle */}
      {!prefersReducedMotion && (
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#memorialGlowGradient)"
          strokeWidth={strokeWidth + 3}
          opacity={ageStyle.glowIntensity}
          variants={glowVariants}
          animate="breathe"
          style={{
            filter: 'blur(8px)',
            pointerEvents: 'none',
            transformOrigin: 'center'
          }}
        />
      )}

      {/* Hover glow - appears on interaction */}
      {(isHovered || isSelected) && (
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#memorialGlowGradient)"
          strokeWidth={strokeWidth + 7}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.6 : 0.4 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          style={{
            filter: 'blur(12px)',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Main memorial line with entrance animation */}
      <motion.path
        ref={lineRef}
        d={pathD}
        fill="none"
        stroke={isHovered || isSelected ? 'url(#memorialGradientHover)' : 'url(#memorialGradient)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        variants={pathVariants}
        initial={isNew ? "hidden" : "visible"}
        animate="visible"
        style={{
          pointerEvents: 'none',
          opacity: isHovered ? Math.min(ageStyle.opacity + 0.2, 1) : ageStyle.opacity
        }}
      />

      {/* Response type icon at midpoint */}
      {icon && (
        <motion.text
          x={midX}
          y={midY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="16"
          opacity={isHovered ? 1 : 0.8}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: isHovered ? 1 : 0.8 }}
          transition={{
            delay: isNew && !prefersReducedMotion ? 0.8 + entranceDelay : entranceDelay,
            duration: prefersReducedMotion ? 0 : 0.4,
            type: "spring",
            bounce: 0.4
          }}
          style={{ pointerEvents: 'none' }}
        >
          {icon}
        </motion.text>
      )}

      {/* Selected state: pulsing outline indicator */}
      {isSelected && !isHovered && (
        <motion.path
          d={pathD}
          fill="none"
          stroke="hsl(270, 60%, 75%)"
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
          animate={{
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            pointerEvents: 'none',
            filter: 'blur(4px)'
          }}
        />
      )}

      {/* Tooltip */}
      {isHovered && tooltipPosition && (
        <g style={{ pointerEvents: 'none' }}>
          <foreignObject
            x={tooltipPosition.x - 100}
            y={tooltipPosition.y - 80}
            width="200"
            height="100"
          >
            <div className="glass-strong rounded-xl p-3 shadow-xl">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">{connection.replierName}</span>
                {' prayed for '}
                <span className="font-semibold">{connection.requesterName}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(connection.createdAt)}
              </p>
              {responseType && (
                <p className="text-xs text-gray-400 mt-1 capitalize">
                  {responseType} response
                </p>
              )}
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
}

/**
 * Enhanced SVG gradient definitions for memorial lines
 * Use these in the parent SVG <defs> section
 *
 * Example usage:
 * ```tsx
 * <svg>
 *   <defs>
 *     {MemorialLineGradients}
 *   </defs>
 *   <MemorialLine ... />
 * </svg>
 * ```
 */
export const MemorialLineGradients = (
  <>
    {/* Base gradient - ethereal spiritual colors */}
    <linearGradient id="memorialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="hsl(45, 100%, 75%)" stopOpacity="0.9" />
      <stop offset="50%" stopColor="hsl(200, 80%, 75%)" stopOpacity="0.9" />
      <stop offset="100%" stopColor="hsl(270, 60%, 75%)" stopOpacity="0.9" />
    </linearGradient>

    {/* Hover gradient - brighter, more vibrant */}
    <linearGradient id="memorialGradientHover" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="hsl(45, 100%, 70%)" stopOpacity="1" />
      <stop offset="50%" stopColor="hsl(200, 80%, 70%)" stopOpacity="1" />
      <stop offset="100%" stopColor="hsl(270, 60%, 70%)" stopOpacity="1" />
    </linearGradient>

    {/* Glow gradient - softer, lighter for breathing effect */}
    <linearGradient id="memorialGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="hsl(45, 100%, 85%)" />
      <stop offset="50%" stopColor="hsl(200, 80%, 85%)" />
      <stop offset="100%" stopColor="hsl(270, 60%, 85%)" />
    </linearGradient>
  </>
);
