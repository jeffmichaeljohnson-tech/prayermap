import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Prayer } from '../types/prayer';

interface SavedPrayerRow {
  prayer_id: string;
  prayers: {
    id: string;
    user_id: string;
    title: string | null;
    content: string;
    content_type: 'text' | 'audio' | 'video';
    media_url: string | null;
    location: unknown;
    is_anonymous: boolean;
    created_at: string;
    updated_at: string;
    category: string | null;
    profiles: {
      display_name: string | null;
    } | null;
  };
}

interface UseSavedPrayersReturn {
  savedPrayerIds: Set<string>;
  savedPrayers: Prayer[];
  loading: boolean;
  savePrayer: (prayerId: string) => Promise<boolean>;
  unsavePrayer: (prayerId: string) => Promise<boolean>;
  isSaved: (prayerId: string) => boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage saved/bookmarked prayers
 * Allows users to save prayers to pray for later
 */
export function useSavedPrayers(userId: string | undefined): UseSavedPrayersReturn {
  const [savedPrayerIds, setSavedPrayerIds] = useState<Set<string>>(new Set());
  const [savedPrayers, setSavedPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Transform database row to Prayer type
  const transformToPrayer = useCallback((row: SavedPrayerRow): Prayer | null => {
    if (!row.prayers) return null;
    
    const prayerData = row.prayers;
    
    // Parse location from PostGIS format or JSON
    let location = { lat: 0, lng: 0 };
    if (prayerData.location) {
      if (typeof prayerData.location === 'object' && 'lat' in (prayerData.location as Record<string, unknown>)) {
        const loc = prayerData.location as { lat: number; lng: number };
        location = { lat: loc.lat, lng: loc.lng };
      } else if (typeof prayerData.location === 'string') {
        // Handle PostGIS POINT format: "POINT(lng lat)"
        const match = prayerData.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
        if (match) {
          location = { lat: parseFloat(match[2]), lng: parseFloat(match[1]) };
        }
      }
    }

    return {
      id: prayerData.id,
      user_id: prayerData.user_id,
      title: prayerData.title || undefined,
      content: prayerData.content,
      content_type: prayerData.content_type,
      content_url: prayerData.media_url || undefined,
      category: (prayerData.category as Prayer['category']) || undefined,
      location,
      user_name: prayerData.profiles?.display_name || undefined,
      is_anonymous: prayerData.is_anonymous,
      created_at: new Date(prayerData.created_at),
      updated_at: prayerData.updated_at ? new Date(prayerData.updated_at) : undefined,
    };
  }, []);

  // Fetch saved prayers from the database
  const fetchSavedPrayers = useCallback(async () => {
    if (!userId || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_prayers')
        .select(`
          prayer_id,
          prayers (
            id,
            user_id,
            title,
            content,
            content_type,
            media_url,
            location,
            is_anonymous,
            created_at,
            updated_at,
            category,
            profiles (
              display_name
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Extract prayer IDs into a Set
      const ids = new Set((data as unknown as SavedPrayerRow[])?.map(d => d.prayer_id) || []);
      
      // Transform prayer data
      const prayers = (data as unknown as SavedPrayerRow[])
        ?.map(transformToPrayer)
        .filter((p): p is Prayer => p !== null) || [];

      setSavedPrayerIds(ids);
      setSavedPrayers(prayers);
    } catch (error) {
      console.error('Failed to fetch saved prayers:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, transformToPrayer]);

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchSavedPrayers();
  }, [fetchSavedPrayers]);

  // Save a prayer
  const savePrayer = useCallback(async (prayerId: string): Promise<boolean> => {
    if (!userId || !supabase) return false;

    try {
      const { error } = await supabase
        .from('saved_prayers')
        .insert({ user_id: userId, prayer_id: prayerId });

      if (error) {
        // Handle duplicate - prayer already saved
        if (error.code === '23505') return true;
        throw error;
      }

      // Optimistically update local state
      setSavedPrayerIds(prev => new Set([...prev, prayerId]));
      
      // Refresh to get full prayer data
      await fetchSavedPrayers();
      return true;
    } catch (error) {
      console.error('Failed to save prayer:', error);
      return false;
    }
  }, [userId, fetchSavedPrayers]);

  // Unsave a prayer
  const unsavePrayer = useCallback(async (prayerId: string): Promise<boolean> => {
    if (!userId || !supabase) return false;

    try {
      const { error } = await supabase
        .from('saved_prayers')
        .delete()
        .eq('user_id', userId)
        .eq('prayer_id', prayerId);

      if (error) throw error;

      // Update local state
      setSavedPrayerIds(prev => {
        const next = new Set(prev);
        next.delete(prayerId);
        return next;
      });
      setSavedPrayers(prev => prev.filter(p => p.id !== prayerId));
      
      return true;
    } catch (error) {
      console.error('Failed to unsave prayer:', error);
      return false;
    }
  }, [userId]);

  // Check if a prayer is saved
  const isSaved = useCallback((prayerId: string) => {
    return savedPrayerIds.has(prayerId);
  }, [savedPrayerIds]);

  return {
    savedPrayerIds,
    savedPrayers,
    loading,
    savePrayer,
    unsavePrayer,
    isSaved,
    refresh: fetchSavedPrayers,
  };
}

