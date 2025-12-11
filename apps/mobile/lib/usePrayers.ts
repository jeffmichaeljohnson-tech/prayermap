import { create } from 'zustand';
import { supabase } from './supabase';
import type { Prayer, PrayerCategory } from './types/prayer';

// Database row type (matches RPC return)
interface PrayerRow {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  media_url?: string;
  media_duration?: number;
  text_overlays?: Prayer['text_overlays'];
  category?: string;
  location: { lat: number; lng: number } | string;
  user_name?: string;
  is_anonymous: boolean;
  status: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  response_count?: number;
  distance_km?: number;
}

// Parse PostGIS POINT(lng lat) format
function parsePostGISPoint(point: string): { lat: number; lng: number } {
  const match = point.match(/POINT\(([^ ]+) ([^)]+)\)/);
  if (match) {
    return {
      lng: parseFloat(match[1]),
      lat: parseFloat(match[2]),
    };
  }
  return { lat: 0, lng: 0 };
}

// Convert location from various formats
function convertLocation(location: PrayerRow['location']): { lat: number; lng: number } {
  if (!location) {
    return { lat: 0, lng: 0 };
  }

  // Handle POINT(lng lat) string format
  if (typeof location === 'string' && location.startsWith('POINT(')) {
    return parsePostGISPoint(location);
  }

  // Handle WKB hex string (shouldn't happen with proper RPC but fallback)
  if (typeof location === 'string' && location.startsWith('0101000020')) {
    console.warn('WKB format detected - query should use ST_AsText');
    return { lat: 0, lng: 0 };
  }

  // Handle object with lat/lng
  if (typeof location === 'object') {
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  console.warn('Unknown location format:', location);
  return { lat: 0, lng: 0 };
}

// Convert database row to Prayer type
function rowToPrayer(row: PrayerRow): Prayer {
  const { lat, lng } = convertLocation(row.location);

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
      coordinates: [lng, lat], // GeoJSON format: [lng, lat]
    },
    user_name: row.user_name || null,
    is_anonymous: row.is_anonymous,
    status: (row.status || 'active') as Prayer['status'],
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
    expires_at: row.expires_at || null,
    response_count: row.response_count,
    distance_km: row.distance_km,
  };
}

interface PrayersState {
  prayers: Prayer[];
  isLoading: boolean;
  error: string | null;
  lastFetchedBounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  } | null;

  // Actions
  fetchPrayersInBounds: (bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  }) => Promise<void>;

  fetchNearbyPrayers: (lat: number, lng: number, radiusKm?: number) => Promise<void>;

  clearPrayers: () => void;
}

export const usePrayersStore = create<PrayersState>((set, get) => ({
  prayers: [],
  isLoading: false,
  error: null,
  lastFetchedBounds: null,

  fetchPrayersInBounds: async (bounds) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.rpc('get_prayers_in_bounds', {
        min_lng: bounds.minLng,
        min_lat: bounds.minLat,
        max_lng: bounds.maxLng,
        max_lat: bounds.maxLat,
      });

      if (error) {
        console.error('Error fetching prayers in bounds:', error);
        set({ error: error.message, isLoading: false });
        return;
      }

      const prayers = (data as PrayerRow[] || []).map(rowToPrayer);
      set({
        prayers,
        isLoading: false,
        lastFetchedBounds: bounds,
      });
    } catch (err) {
      console.error('Failed to fetch prayers in bounds:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch prayers',
        isLoading: false,
      });
    }
  },

  fetchNearbyPrayers: async (lat, lng, radiusKm = 50) => {
    console.log('[usePrayers] fetchNearbyPrayers called:', { lat, lng, radiusKm });
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.rpc('get_nearby_prayers', {
        lat,
        lng,
        radius_km: radiusKm,
      });

      if (error) {
        console.error('[usePrayers] Error fetching nearby prayers:', error);
        set({ error: error.message, isLoading: false });
        return;
      }

      console.log('[usePrayers] Raw data received:', data?.length, 'prayers');
      if (data && data.length > 0) {
        console.log('[usePrayers] First prayer:', JSON.stringify(data[0], null, 2));
      }

      const prayers = (data as PrayerRow[] || []).map(rowToPrayer);
      console.log('[usePrayers] Parsed prayers:', prayers.length, 'prayers');
      if (prayers.length > 0) {
        console.log('[usePrayers] First parsed prayer location:', prayers[0].location);
      }
      set({ prayers, isLoading: false });
    } catch (err) {
      console.error('[usePrayers] Failed to fetch nearby prayers:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch prayers',
        isLoading: false,
      });
    }
  },

  clearPrayers: () => {
    set({ prayers: [], lastFetchedBounds: null, error: null });
  },
}));

// Convenience hook
export function usePrayers() {
  return usePrayersStore();
}
