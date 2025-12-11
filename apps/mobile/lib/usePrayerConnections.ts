import { create } from 'zustand';
import { supabase } from './supabase';
import type { PrayerConnection } from './types/connection';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PrayerConnectionsState {
  connections: PrayerConnection[];
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  realtimeChannel: RealtimeChannel | null;

  // Actions
  fetchConnections: (forceRefresh?: boolean) => Promise<void>;
  subscribeToConnections: () => void;
  unsubscribeFromConnections: () => void;
  clearConnections: () => void;
  clearError: () => void;
}

export const usePrayerConnectionsStore = create<PrayerConnectionsState>((set, get) => ({
  connections: [],
  isLoading: false,
  error: null,
  lastFetchTime: null,
  realtimeChannel: null,

  fetchConnections: async (forceRefresh = false) => {
    // Debounce: don't re-fetch if we fetched recently (within 10 seconds)
    // Unless forceRefresh is true (e.g., after creating a new connection)
    const { lastFetchTime } = get();
    const now = Date.now();
    if (!forceRefresh && lastFetchTime && now - lastFetchTime < 10000) {
      return; // Skip fetch, too recent
    }

    set({ isLoading: true, error: null, lastFetchTime: now });

    try {
      console.log('[PrayerConnections] Calling get_prayer_connections RPC...');
      const { data, error } = await supabase.rpc('get_prayer_connections');

      console.log('[PrayerConnections] RPC response:', {
        hasData: !!data,
        dataLength: data?.length,
        error: error ? { code: error.code, message: error.message } : null,
        rawData: JSON.stringify(data)
      });

      if (error) {
        // Handle case where function doesn't exist yet
        if (error.code === '42883') {
          console.warn('Prayer connections function not yet deployed, skipping');
          set({ isLoading: false, connections: [] });
          return;
        }
        console.error('Error fetching prayer connections:', error);
        set({ isLoading: false, error: error.message });
        return;
      }

      const connections: PrayerConnection[] = (data || []).map((item: any) => ({
        id: item.id,
        prayer_id: item.prayer_id,
        from_user_id: item.from_user_id,
        to_user_id: item.to_user_id,
        from_lat: item.from_lat,
        from_lng: item.from_lng,
        to_lat: item.to_lat,
        to_lng: item.to_lng,
        created_at: item.created_at,
        expires_at: item.expires_at,
      }));

      console.log(`[PrayerConnections] Fetched ${connections.length} connections`);
      if (connections.length > 0) {
        console.log('[PrayerConnections] First connection:', JSON.stringify(connections[0], null, 2));
      }

      set({
        connections,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to fetch prayer connections:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch connections';
      set({ isLoading: false, error: errorMessage });
    }
  },

  subscribeToConnections: () => {
    const { realtimeChannel } = get();

    // Don't create duplicate subscriptions
    if (realtimeChannel) {
      console.log('[PrayerConnections] Already subscribed to realtime');
      return;
    }

    console.log('[PrayerConnections] Subscribing to realtime updates');

    const channel = supabase
      .channel('prayer_connections_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prayer_connections',
        },
        async (payload) => {
          console.log('[PrayerConnections] New connection detected via realtime:', payload);
          // Force refresh to get full connection data with coordinates
          await get().fetchConnections(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'prayer_connections',
        },
        async (payload) => {
          console.log('[PrayerConnections] Connection deleted via realtime:', payload);
          // Force refresh
          await get().fetchConnections(true);
        }
      )
      .subscribe((status) => {
        console.log('[PrayerConnections] Realtime subscription status:', status);
      });

    set({ realtimeChannel: channel });
  },

  unsubscribeFromConnections: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      console.log('[PrayerConnections] Unsubscribing from realtime');
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },

  clearConnections: () => {
    set({ connections: [], lastFetchTime: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Convenience hook
export function usePrayerConnections() {
  return usePrayerConnectionsStore();
}
