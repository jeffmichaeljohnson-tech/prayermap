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
import { realtimeMonitor } from '../services/realtimeMonitor';
import { 
  loadPrayersFromCache, 
  savePrayersToCache 
} from '../utils/statePersistence';

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
  ) => Promise<{ response: any; connection: any } | null>;
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
  // Initialize with cached data for instant loading
  const [prayers, setPrayers] = useState<Prayer[]>(() => {
    if (globalMode && typeof window !== 'undefined') {
      const cached = loadPrayersFromCache();
      if (cached.length > 0) {
        console.log('🚀 Fast loading with', cached.length, 'cached prayers');
        return cached;
      }
    }
    return [];
  });
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
      
      // Cache global prayers for persistence across reloads
      if (globalMode && fetchedPrayers.length > 0) {
        savePrayersToCache(fetchedPrayers);
      }
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

  // Intelligent state merging function for Living Map persistence
  const mergeWithDeduplication = useCallback((currentPrayers: Prayer[], newPrayers: Prayer[]): Prayer[] => {
    // Start with all new prayers (most recent data from server)
    const mergedPrayers = [...newPrayers];
    
    // Add any existing prayers that aren't in the new data (preserve local state)
    currentPrayers.forEach(existingPrayer => {
      const isInNewData = newPrayers.some(newPrayer => newPrayer.id === existingPrayer.id);
      if (!isInNewData) {
        mergedPrayers.push(existingPrayer);
      }
    });
    
    // Sort by creation time (newest first) and deduplicate by ID
    return mergedPrayers
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .filter((prayer, index, arr) => arr.findIndex(p => p.id === prayer.id) === index);
  }, []);

  // Set up real-time subscription with enhanced monitoring and intelligent merging
  useEffect(() => {
    if (!enableRealtime) return;

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    let unsubscribe: (() => void) | null = null;

    if (globalMode) {
      // GLOBAL LIVING MAP: Use enhanced real-time monitor for better reliability
      console.log('🔄 Setting up enhanced global prayer monitoring...');
      
      // Ensure monitor is running
      if (!realtimeMonitor.getStatus().isActive) {
        realtimeMonitor.start();
      }

      // Subscribe to enhanced monitoring with intelligent state merging
      unsubscribe = realtimeMonitor.subscribeToPrayers((updatedPrayers) => {
        console.log('📥 Enhanced real-time update received:', updatedPrayers.length, 'prayers');
        
        // CRITICAL FIX: Use intelligent merging instead of state replacement
        setPrayers(currentPrayers => {
          const merged = mergeWithDeduplication(currentPrayers, updatedPrayers);
          console.log('🔄 Prayer state merged:', currentPrayers.length, '→', merged.length, 'prayers');
          
          // Cache updated state for persistence
          if (globalMode && merged.length > 0) {
            savePrayersToCache(merged);
          }
          
          return merged;
        });
      });
    } else {
      // Fallback to original subscription for nearby prayers with same merging logic
      unsubscribe = subscribeToNearbyPrayers(
        location.lat,
        location.lng,
        radiusKm,
        (updatedPrayers) => {
          console.log('📥 Nearby prayers update received:', updatedPrayers.length, 'prayers');
          
          // Apply same intelligent merging for consistency
          setPrayers(currentPrayers => {
            const merged = mergeWithDeduplication(currentPrayers, updatedPrayers);
            console.log('🔄 Prayer state merged (nearby):', currentPrayers.length, '→', merged.length, 'prayers');
            return merged;
          });
        }
      );
    }

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or when location/mode changes
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [location.lat, location.lng, radiusKm, enableRealtime, globalMode, mergeWithDeduplication]);

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
    ): Promise<{ response: any; connection: any } | null> => {
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
          return result;
        }

        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to respond to prayer';
        setError(errorMessage);
        console.error('Error responding to prayer:', err);
        return null;
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
