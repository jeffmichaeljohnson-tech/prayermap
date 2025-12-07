import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Prayer, PrayerCategory } from '../types/prayer';
import {
  fetchNearbyPrayers,
  fetchPrayersInBounds,
  createPrayer as createPrayerService,
  respondToPrayer as respondToPrayerService,
  deletePrayer as deletePrayerService,
  subscribeToNearbyPrayers,
} from '../services/prayerService';
import { supabase } from '../../../lib/supabase';
import { getBlockedUsers } from '../../../services/moderationService';

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
  categories?: PrayerCategory[]; // Filter by prayer categories
  autoFetch?: boolean;
  enableRealtime?: boolean;
  userId?: string; // For blocked user filtering
}

interface UsePrayersReturn {
  prayers: Prayer[];
  loading: boolean;
  error: string | null;
  blockedUsers: string[];
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
  deletePrayer: (prayerId: string, userId: string) => Promise<boolean>;
  addBlockedUser: (userId: string) => void;
}

/**
 * Hook to manage prayers state with real-time updates
 * Supports both radius-based and bounds-based fetching
 */
export function usePrayers({
  location,
  radiusKm = 50,
  bounds,
  categories,
  autoFetch = true,
  enableRealtime = true,
  userId,
}: UsePrayersOptions): UsePrayersReturn {
  const [allPrayers, setAllPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const currentBoundsRef = useRef<MapBounds | null>(bounds || null);

  // Fetch blocked users on mount and when userId changes
  useEffect(() => {
    if (!userId) {
      setBlockedUsers([]);
      return;
    }

    getBlockedUsers(userId).then(setBlockedUsers);
  }, [userId]);

  // Add a blocked user to local state (for immediate UI feedback)
  const addBlockedUser = useCallback((blockedId: string) => {
    setBlockedUsers((prev) => [...prev, blockedId]);
  }, []);

  // Filter prayers by category and blocked users (client-side for responsiveness)
  const prayers = useMemo(() => {
    let filtered = allPrayers;

    // Filter out blocked users' prayers
    if (blockedUsers.length > 0) {
      filtered = filtered.filter((p) => !blockedUsers.includes(p.user_id));
    }

    // Filter by category if specified
    if (categories && categories.length > 0) {
      filtered = filtered.filter((p) => categories.includes(p.category || 'other'));
    }

    return filtered;
  }, [allPrayers, categories, blockedUsers]);

  // Fetch prayers by bounds (for map viewport)
  const fetchByBounds = useCallback(async (newBounds: MapBounds) => {
    setLoading(true);
    setError(null);
    currentBoundsRef.current = newBounds;

    try {
      const fetchedPrayers = await fetchPrayersInBounds(newBounds);
      setAllPrayers(fetchedPrayers);
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
      setAllPrayers(fetchedPrayers);
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
            setAllPrayers(fetchedPrayers);
          } else {
            const fetchedPrayers = await fetchNearbyPrayers(location.lat, location.lng, radiusKm);
            setAllPrayers(fetchedPrayers);
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
          setAllPrayers((prev) => [newPrayer, ...prev]);
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
          setAllPrayers((prev) =>
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

  // Delete a prayer (only owner can delete)
  const deletePrayer = useCallback(
    async (prayerId: string, userId: string): Promise<boolean> => {
      setError(null);

      try {
        const success = await deletePrayerService(prayerId, userId);

        if (success) {
          // Remove from local state
          setAllPrayers((prev) => prev.filter((p) => p.id !== prayerId));
        }

        return success;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete prayer';
        setError(errorMessage);
        console.error('Error deleting prayer:', err);
        return false;
      }
    },
    []
  );

  return {
    prayers,
    loading,
    error,
    blockedUsers,
    refetch: fetchPrayers,
    fetchByBounds,
    createPrayer,
    respondToPrayer,
    deletePrayer,
    addBlockedUser,
  };
}
