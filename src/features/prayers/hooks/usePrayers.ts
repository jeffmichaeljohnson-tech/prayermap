import { useState, useEffect, useCallback, useRef } from 'react';
import type { Prayer } from '../types/prayer';
import {
  fetchNearbyPrayers,
  fetchPrayersInBounds,
  createPrayer as createPrayerService,
  respondToPrayer as respondToPrayerService,
  subscribeToNearbyPrayers,
} from '../services/prayerService';
import { supabase } from '../../../lib/supabase';

interface MapBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

interface UsePrayersOptions {
  location: { lat: number; lng: number };
  radiusKm?: number;
  bounds?: MapBounds;
  autoFetch?: boolean;
  enableRealtime?: boolean;
}

interface UsePrayersReturn {
  prayers: Prayer[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchByBounds: (bounds: MapBounds) => Promise<void>;
  createPrayer: (prayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>) => Promise<Prayer | null>;
  respondToPrayer: (
    prayerId: string,
    responderId: string,
    responderName: string,
    message: string,
    contentType: 'text' | 'audio' | 'video',
    contentUrl?: string,
    isAnonymous?: boolean,
    responderLocation?: { lat: number; lng: number }
  ) => Promise<boolean>;
}

/**
 * Hook to manage prayers state with real-time updates
 * Supports both radius-based and bounds-based fetching
 */
export function usePrayers({
  location,
  radiusKm = 50,
  bounds,
  autoFetch = true,
  enableRealtime = true,
}: UsePrayersOptions): UsePrayersReturn {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const currentBoundsRef = useRef<MapBounds | null>(bounds || null);

  // Fetch prayers by bounds (for map viewport)
  const fetchByBounds = useCallback(async (newBounds: MapBounds) => {
    setLoading(true);
    setError(null);
    currentBoundsRef.current = newBounds;

    try {
      const fetchedPrayers = await fetchPrayersInBounds(newBounds);
      setPrayers(fetchedPrayers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prayers';
      setError(errorMessage);
      console.error('Error fetching prayers by bounds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch prayers by radius (legacy/fallback)
  const fetchByRadius = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedPrayers = await fetchNearbyPrayers(location.lat, location.lng, radiusKm);
      setPrayers(fetchedPrayers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prayers';
      setError(errorMessage);
      console.error('Error fetching prayers:', err);
    } finally {
      setLoading(false);
    }
  }, [location.lat, location.lng, radiusKm]);

  // Main fetch function - uses bounds if available, otherwise radius
  const fetchPrayers = useCallback(async () => {
    if (currentBoundsRef.current) {
      await fetchByBounds(currentBoundsRef.current);
    } else if (bounds) {
      await fetchByBounds(bounds);
    } else {
      await fetchByRadius();
    }
  }, [bounds, fetchByBounds, fetchByRadius]);

  // Initial fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchPrayers();
    }
  }, [autoFetch, fetchPrayers]);

  // Set up real-time subscription for prayer changes
  useEffect(() => {
    if (!enableRealtime || !supabase) return;

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to all prayer changes (insert, update, delete)
    // When a change occurs, refetch using current bounds or radius
    const subscription = supabase
      .channel('prayers_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayers',
        },
        async () => {
          // Refetch prayers when any change occurs
          if (currentBoundsRef.current) {
            const fetchedPrayers = await fetchPrayersInBounds(currentBoundsRef.current);
            setPrayers(fetchedPrayers);
          } else {
            const fetchedPrayers = await fetchNearbyPrayers(location.lat, location.lng, radiusKm);
            setPrayers(fetchedPrayers);
          }
        }
      )
      .subscribe();

    unsubscribeRef.current = () => {
      subscription.unsubscribe();
    };

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [location.lat, location.lng, radiusKm, enableRealtime]);

  // Create a new prayer
  const createPrayer = useCallback(
    async (prayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>): Promise<Prayer | null> => {
      setError(null);

      try {
        const newPrayer = await createPrayerService(prayer);

        if (newPrayer) {
          // Optimistically add to local state
          setPrayers((prev) => [newPrayer, ...prev]);
        }

        return newPrayer;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create prayer';
        setError(errorMessage);
        console.error('Error creating prayer:', err);
        return null;
      }
    },
    []
  );

  // Respond to a prayer
  const respondToPrayer = useCallback(
    async (
      prayerId: string,
      responderId: string,
      responderName: string,
      message: string,
      contentType: 'text' | 'audio' | 'video',
      contentUrl?: string,
      isAnonymous: boolean = false,
      responderLocation?: { lat: number; lng: number }
    ): Promise<boolean> => {
      setError(null);

      try {
        const result = await respondToPrayerService(
          prayerId,
          responderId,
          responderName,
          message,
          contentType,
          contentUrl,
          isAnonymous,
          responderLocation
        );

        if (result) {
          // Update the prayer in local state to mark it as prayed
          setPrayers((prev) =>
            prev.map((p) =>
              p.id === prayerId
                ? { ...p, prayedBy: [...(p.prayedBy || []), responderId] }
                : p
            )
          );
          return true;
        }

        return false;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to respond to prayer';
        setError(errorMessage);
        console.error('Error responding to prayer:', err);
        return false;
      }
    },
    []
  );

  return {
    prayers,
    loading,
    error,
    refetch: fetchPrayers,
    fetchByBounds,
    createPrayer,
    respondToPrayer,
  };
}
