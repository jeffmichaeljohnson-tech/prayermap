/**
 * Feed Prayers Store
 * Zustand store for TikTok-style prayer feed with global fetching (no radius limit initially)
 * Designed for infinite scroll pagination
 */

import { create } from 'zustand';
import { supabase } from './supabase';
import type { Prayer, PrayerCategory } from './types/prayer';

// Database row type from RPC
interface FeedPrayerRow {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  media_url?: string;
  media_duration?: number;
  text_overlays?: Prayer['text_overlays'];
  location: string;
  location_lat: number;
  location_lng: number;
  user_name?: string;
  is_anonymous: boolean;
  category?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  response_count?: number;
  total_count?: number;
}

// Convert database row to Prayer type
function rowToPrayer(row: FeedPrayerRow): Prayer {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title || null,
    content: row.content,
    content_type: row.content_type,
    media_url: row.media_url || null,
    media_duration: row.media_duration || null,
    text_overlays: row.text_overlays || null,
    category: (row.category || 'other') as PrayerCategory,
    location: {
      type: 'Point',
      coordinates: [row.location_lng, row.location_lat], // GeoJSON format: [lng, lat]
    },
    user_name: row.user_name || null,
    is_anonymous: row.is_anonymous,
    status: (row.status || 'active') as Prayer['status'],
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
    expires_at: row.expires_at || null,
    response_count: row.response_count,
  };
}

// Feed configuration - can be adjusted as userbase grows
interface FeedConfig {
  pageSize: number;
  radiusKm: number | null; // null = no radius limit (global)
}

interface FeedPrayersState {
  prayers: Prayer[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  config: FeedConfig;
  currentIndex: number; // Currently viewed prayer index

  // Actions
  fetchFeedPrayers: (refresh?: boolean) => Promise<void>;
  loadMorePrayers: () => Promise<void>;
  setCurrentIndex: (index: number) => void;
  refreshFeed: () => Promise<void>;
  updateConfig: (config: Partial<FeedConfig>) => void;
  clearFeed: () => void;
}

export const useFeedPrayersStore = create<FeedPrayersState>((set, get) => ({
  prayers: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,
  totalCount: 0,
  currentPage: 0,
  currentIndex: 0,
  config: {
    pageSize: 10,
    radiusKm: null, // Start with global feed - no radius limit
  },

  fetchFeedPrayers: async (refresh = false) => {
    const state = get();

    // Don't fetch if already loading
    if (state.isLoading) return;

    set({ isLoading: true, error: null });

    if (refresh) {
      set({ currentPage: 0, prayers: [], hasMore: true });
    }

    try {
      const { pageSize, radiusKm } = state.config;
      const offset = refresh ? 0 : state.currentPage * pageSize;

      console.log('[FeedPrayers] Fetching feed prayers:', { pageSize, offset, radiusKm });

      const { data, error } = await supabase.rpc('get_feed_prayers', {
        p_limit: pageSize,
        p_offset: offset,
        p_user_lat: null, // Global feed - no location filtering
        p_user_lng: null,
        p_radius_km: radiusKm,
      });

      if (error) {
        console.error('[FeedPrayers] Error fetching prayers:', error);
        set({ error: error.message, isLoading: false });
        return;
      }

      const rows = (data as FeedPrayerRow[]) || [];
      const prayers = rows.map(rowToPrayer);
      const totalCount = rows[0]?.total_count ?? 0;

      console.log('[FeedPrayers] Fetched:', prayers.length, 'prayers, total:', totalCount);

      set({
        prayers: refresh ? prayers : [...state.prayers, ...prayers],
        totalCount: Number(totalCount),
        hasMore: prayers.length === pageSize && (state.prayers.length + prayers.length) < totalCount,
        currentPage: refresh ? 1 : state.currentPage + 1,
        isLoading: false,
      });
    } catch (err) {
      console.error('[FeedPrayers] Failed to fetch prayers:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch prayers',
        isLoading: false,
      });
    }
  },

  loadMorePrayers: async () => {
    const state = get();

    // Don't load more if already loading, no more data, or loading initial
    if (state.isLoadingMore || state.isLoading || !state.hasMore) return;

    set({ isLoadingMore: true, error: null });

    try {
      const { pageSize, radiusKm } = state.config;
      const offset = state.currentPage * pageSize;

      console.log('[FeedPrayers] Loading more prayers:', { pageSize, offset });

      const { data, error } = await supabase.rpc('get_feed_prayers', {
        p_limit: pageSize,
        p_offset: offset,
        p_user_lat: null,
        p_user_lng: null,
        p_radius_km: radiusKm,
      });

      if (error) {
        console.error('[FeedPrayers] Error loading more:', error);
        set({ error: error.message, isLoadingMore: false });
        return;
      }

      const rows = (data as FeedPrayerRow[]) || [];
      const prayers = rows.map(rowToPrayer);

      set({
        prayers: [...state.prayers, ...prayers],
        hasMore: prayers.length === pageSize,
        currentPage: state.currentPage + 1,
        isLoadingMore: false,
      });
    } catch (err) {
      console.error('[FeedPrayers] Failed to load more:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to load more',
        isLoadingMore: false,
      });
    }
  },

  setCurrentIndex: (index) => {
    set({ currentIndex: index });

    // Preload more when approaching end
    const state = get();
    if (index >= state.prayers.length - 3 && state.hasMore && !state.isLoadingMore) {
      get().loadMorePrayers();
    }
  },

  refreshFeed: async () => {
    await get().fetchFeedPrayers(true);
  },

  updateConfig: (newConfig) => {
    set((state) => ({
      config: { ...state.config, ...newConfig },
    }));
  },

  clearFeed: () => {
    set({
      prayers: [],
      currentPage: 0,
      hasMore: true,
      totalCount: 0,
      currentIndex: 0,
      error: null,
    });
  },
}));

// Convenience hook
export function useFeedPrayers() {
  return useFeedPrayersStore();
}
