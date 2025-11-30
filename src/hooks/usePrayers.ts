import { useState, useEffect, useCallback, useRef } from 'react';
import type { Prayer } from '../types/prayer';
import {
  fetchNearbyPrayers,
  fetchAllPrayers,
  createPrayer as createPrayerService,
  respondToPrayer as respondToPrayerService,
  subscribeToNearbyPrayers,
  subscribeToAllPrayers,
} from '../services/prayerService';

interface UsePrayersOptions {
  location: { lat: number; lng: number };
  radiusKm?: number;
  autoFetch?: boolean;
  enableRealtime?: boolean;
  globalMode?: boolean; // GLOBAL LIVING MAP: When true, fetches all prayers worldwide
}

interface UsePrayersReturn {
  prayers: Prayer[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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
 *
 * GLOBAL LIVING MAP: Set globalMode to true to fetch and subscribe to ALL prayers worldwide
 * instead of just nearby prayers within a radius.
 */
export function usePrayers({
  location,
  radiusKm = 50,
  autoFetch = true,
  enableRealtime = true,
  globalMode = false, // GLOBAL LIVING MAP: Default to global mode
}: UsePrayersOptions): UsePrayersReturn {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Fetch prayers from the database
  const fetchPrayers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // GLOBAL LIVING MAP: Fetch all prayers globally or nearby prayers based on mode
      const fetchedPrayers = globalMode
        ? await fetchAllPrayers()
        : await fetchNearbyPrayers(location.lat, location.lng, radiusKm);
      setPrayers(fetchedPrayers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prayers';
      setError(errorMessage);
      console.error('Error fetching prayers:', err);
    } finally {
      setLoading(false);
    }
  }, [location.lat, location.lng, radiusKm, globalMode]);

  // Fetch prayers on mount and when location or mode changes
  useEffect(() => {
    if (autoFetch) {
      fetchPrayers();
    }
  }, [autoFetch, fetchPrayers]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // GLOBAL LIVING MAP: Subscribe to all prayers globally or nearby prayers based on mode
    // PERFORMANCE: Uses incremental updates (updater function) instead of full refetches
    const unsubscribe = globalMode
      ? subscribeToAllPrayers((updater) => {
          setPrayers(updater);
        })
      : subscribeToNearbyPrayers(
          location.lat,
          location.lng,
          radiusKm,
          (updater) => {
            setPrayers(updater);
          }
        );

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or when location/mode changes
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [location.lat, location.lng, radiusKm, enableRealtime, globalMode]);

  // Create a new prayer
  const createPrayer = useCallback(
    async (prayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>): Promise<Prayer | null> => {
      setError(null);

      try {
        const newPrayer = await createPrayerService(prayer);

        // PERFORMANCE FIX: Don't add to local state here
        // The real-time subscription will add it within ~100ms
        // This prevents duplicates from optimistic updates
        // The subscription now uses incremental updates with deduplication

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
    createPrayer,
    respondToPrayer,
  };
}
