import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type mapboxgl from 'mapbox-gl';

interface ClusterMarkerProps {
  count: number;
  coordinates: [number, number];
  map: mapboxgl.Map;
  onClick: () => void;
}

export function ClusterMarker({ count, coordinates, map, onClick }: ClusterMarkerProps) {
  const positionRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Size based on count - scales logarithmically
  const size = Math.min(60, Math.max(40, 30 + Math.log10(count) * 15));

  // Optimized position update using transform for GPU acceleration
  const updatePosition = useCallback(() => {
    if (!positionRef.current) return;

    try {
      const point = map.project(coordinates);
      // Update DOM directly using transform - separate from framer-motion animations
      positionRef.current.style.transform = `translate(${point.x - size / 2}px, ${point.y - size / 2}px)`;
    } catch {
      // Silently handle projection errors during rapid movement
    }
  }, [map, coordinates, size]);

  // Update position when map moves
  useEffect(() => {
    // Set initial position
    updatePosition();

    // Update on every frame during map movement for smooth tracking
    const handleMapMove = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    map.on('move', handleMapMove);
    map.on('zoom', handleMapMove);

    return () => {
      map.off('move', handleMapMove);
      map.off('zoom', handleMapMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [map, coordinates, updatePosition]);

  return (
    // Outer div handles positioning via direct DOM manipulation
    <div
      ref={positionRef}
      className="absolute"
      style={{
        left: 0,
        top: 0,
        width: size,
        height: size,
        willChange: 'transform',
      }}
    >
      {/* Inner motion.div handles animations without position conflicts */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full h-full pointer-events-auto cursor-pointer"
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div
          className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg border-2 border-white/30"
          style={{
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
          }}
        >
          <span className="text-white font-bold text-sm">
            {count > 99 ? '99+' : count}
          </span>
        </div>
        {/* Subtle pulse animation */}
        <div
          className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20"
          style={{ animationDuration: '3s' }}
        />
      </motion.div>
    </div>
  );
}
