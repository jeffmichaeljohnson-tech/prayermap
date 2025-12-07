import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type mapboxgl from 'mapbox-gl';

interface ClusterMarkerProps {
  count: number;
  coordinates: [number, number];
  map: mapboxgl.Map;
  onClick: () => void;
}

export function ClusterMarker({ count, coordinates, map, onClick }: ClusterMarkerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const markerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Size based on count - scales logarithmically
  const size = Math.min(60, Math.max(40, 30 + Math.log10(count) * 15));

  // Optimized position update using RAF and direct DOM manipulation
  const updatePositionDirect = useCallback(() => {
    if (!markerRef.current) return;

    try {
      const point = map.project(coordinates);
      // Update DOM directly without React re-render
      markerRef.current.style.left = `${point.x - size / 2}px`;
      markerRef.current.style.top = `${point.y - size / 2}px`;
    } catch (error) {
      // Silently handle projection errors during rapid movement
    }
  }, [map, coordinates, size]);

  // Update position when map moves
  useEffect(() => {
    // Initial position set (triggers React render once)
    const updatePositionState = () => {
      const point = map.project(coordinates);
      setPosition({ x: point.x, y: point.y });
    };

    // Throttled update using RAF for smooth performance
    const handleMapMove = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(updatePositionDirect);
    };

    updatePositionState();
    map.on('move', handleMapMove);
    map.on('zoom', handleMapMove);

    return () => {
      map.off('move', handleMapMove);
      map.off('zoom', handleMapMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [map, coordinates, updatePositionDirect]);

  return (
    <motion.div
      ref={markerRef}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute pointer-events-auto cursor-pointer"
      style={{
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        height: size,
        willChange: 'left, top', // GPU acceleration hint
      }}
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
  );
}
