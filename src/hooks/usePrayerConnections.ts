import { useState, useEffect, useCallback, useRef } from 'react';
import type { PrayerConnection } from '../types/prayer';
import {
  fetchPrayerConnections,
  subscribeToPrayerConnections,
} from '../services/prayerService';
import { datadogActions } from '../lib/datadog';

interface UsePrayerConnectionsOptions {
  autoFetch?: boolean;
  enableRealtime?: boolean;
}

interface UsePrayerConnectionsReturn {
  connections: PrayerConnection[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addConnection: (connection: PrayerConnection) => void;
}

/**
 * Hook to manage prayer connections (memorial lines) with real-time updates
 *
 * Memorial lines are ETERNAL (12 months) - they should NEVER disappear unexpectedly.
 * This hook ensures connections persist across page refreshes and component remounts.
 */
export function usePrayerConnections({
  autoFetch = true,
  enableRealtime = true,
}: UsePrayerConnectionsOptions = {}): UsePrayerConnectionsReturn {
  const [connections, setConnections] = useState<PrayerConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Fetch connections from the database
  const fetchConnections = useCallback(async () => {
    console.log('[usePrayerConnections] Fetching connections from database...');
    setLoading(true);
    setError(null);

    try {
      const fetchedConnections = await fetchPrayerConnections();
      console.log('[usePrayerConnections] Loaded connections:', fetchedConnections.length);
      setConnections(fetchedConnections);

      // Track in Datadog
      datadogActions.connectionsLoaded(fetchedConnections.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch connections';
      setError(errorMessage);
      console.error('[usePrayerConnections] Error fetching connections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch connections on mount
  useEffect(() => {
    if (autoFetch) {
      fetchConnections();
    }
  }, [autoFetch, fetchConnections]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    console.log('[usePrayerConnections] Setting up real-time subscription...');

    // Subscribe to updates
    const unsubscribe = subscribeToPrayerConnections((updatedConnections) => {
      console.log('[usePrayerConnections] Real-time update received:', updatedConnections.length, 'connections');
      setConnections(updatedConnections);
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      console.log('[usePrayerConnections] Cleaning up subscription...');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [enableRealtime]);

  // Add a connection optimistically (for animation purposes)
  // The real connection should already be in the database
  const addConnection = useCallback((connection: PrayerConnection) => {
    console.log('[usePrayerConnections] Adding connection optimistically:', connection.id);

    // Track in Datadog
    datadogActions.connectionCreated(connection.id, connection.prayerId);

    setConnections((prev) => {
      // Avoid duplicates
      if (prev.some((c) => c.id === connection.id)) {
        console.log('[usePrayerConnections] Connection already exists, skipping');
        return prev;
      }
      return [...prev, connection];
    });
  }, []);

  return {
    connections,
    loading,
    error,
    refetch: fetchConnections,
    addConnection,
  };
}
