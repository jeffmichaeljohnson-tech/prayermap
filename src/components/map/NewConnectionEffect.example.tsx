/**
 * Example usage of NewConnectionEffect component
 *
 * This demonstrates how to integrate the dramatic new connection animation
 * into your map visualization layer.
 */

import { useState, useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { NewConnectionEffect, NewConnectionGradients } from './NewConnectionEffect';
import type { PrayerConnection } from '../../types/prayer';

interface Props {
  map: MapboxMap;
  newConnections: PrayerConnection[];
}

export function MapWithNewConnectionEffects({ map, newConnections }: Props) {
  const [activeAnimations, setActiveAnimations] = useState<PrayerConnection[]>([]);

  // Monitor for new connections and add them to animation queue
  useEffect(() => {
    if (newConnections.length > 0) {
      // Add the latest connection to animations
      const latest = newConnections[newConnections.length - 1];
      setActiveAnimations(prev => [...prev, latest]);
    }
  }, [newConnections]);

  // Handle animation completion
  const handleAnimationComplete = (connectionId: string) => {
    setActiveAnimations(prev =>
      prev.filter(conn => conn.id !== connectionId)
    );
  };

  // Handle haptic feedback requests
  const handleHapticRequest = (pattern: 'light' | 'medium' | 'heavy') => {
    // Integrate with Capacitor Haptics plugin
    if ('vibrate' in navigator) {
      switch (pattern) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(25);
          break;
        case 'heavy':
          navigator.vibrate([50, 20, 50]);
          break;
      }
    }
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      {/* Gradient definitions */}
      <defs>{NewConnectionGradients}</defs>

      {/* Render all active connection animations */}
      {activeAnimations.map(connection => (
        <NewConnectionEffect
          key={connection.id}
          connection={connection}
          map={map}
          onAnimationStart={() => {
            console.log('[Animation] New connection starting:', connection.id);
          }}
          onAnimationMidpoint={() => {
            console.log('[Animation] Connection halfway:', connection.id);
          }}
          onAnimationComplete={() => {
            console.log('[Animation] Connection complete:', connection.id);
            handleAnimationComplete(connection.id);
          }}
          onRequestHaptic={handleHapticRequest}
        />
      ))}
    </svg>
  );
}

/**
 * Real-time integration example with Supabase
 */
export function useRealtimeConnectionAnimations(map: MapboxMap | null) {
  const [newConnections, setNewConnections] = useState<PrayerConnection[]>([]);

  useEffect(() => {
    // Subscribe to real-time prayer_connections inserts
    // This is a simplified example - adjust based on your Supabase setup
    // Import: import { supabase } from '../../lib/supabase';

    // Example implementation (uncomment and adjust):
    /*
    const channel = supabase
      .channel('prayer-connections')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prayer_connections'
        },
        (payload) => {
          const newConnection = payload.new as PrayerConnection;
          setNewConnections(prev => [...prev, newConnection]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    */
  }, []);

  if (!map) return null;

  return <MapWithNewConnectionEffects map={map} newConnections={newConnections} />;
}

/**
 * Performance considerations:
 *
 * 1. **Animation Queue**: If many connections are created simultaneously,
 *    consider implementing a stagger queue to prevent overwhelming the GPU.
 *
 * 2. **Viewport Culling**: Only animate connections visible in the current
 *    map viewport for better performance.
 *
 * 3. **Reduced Motion**: The component automatically respects the user's
 *    prefers-reduced-motion setting.
 *
 * 4. **Device Capabilities**: Particle counts automatically adjust based on
 *    device hardware using getAnimationComplexity().
 */

/**
 * Integration with audio:
 *
 * ```typescript
 * import { audioService } from '../../services/audioService';
 *
 * <NewConnectionEffect
 *   onAnimationStart={() => {
 *     audioService.play('connection_start', 0.3);
 *   }}
 *   onAnimationMidpoint={() => {
 *     audioService.play('connection_chime', 0.5);
 *   }}
 *   onAnimationComplete={() => {
 *     audioService.play('connection_complete', 0.4);
 *   }}
 * />
 * ```
 */
