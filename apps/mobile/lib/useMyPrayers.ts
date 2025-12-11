import { create } from 'zustand';
import { supabase } from './supabase';
import type { Prayer, PrayerCategory } from './types/prayer';

interface MyPrayerItem {
  id: string;
  title: string | null;
  content: string;
  category: PrayerCategory;
  created_at: string;
  response_count: number;
  is_anonymous: boolean;
}

interface MyPrayersState {
  prayers: MyPrayerItem[];
  isLoading: boolean;
  error: string | null;
  stats: {
    totalPrayers: number;
    totalPrayedFor: number;
  };

  // Actions
  fetchMyPrayers: () => Promise<void>;
  deletePrayer: (prayerId: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const useMyPrayersStore = create<MyPrayersState>((set, get) => ({
  prayers: [],
  isLoading: false,
  error: null,
  stats: {
    totalPrayers: 0,
    totalPrayedFor: 0,
  },

  fetchMyPrayers: async () => {
    set({ isLoading: true, error: null });

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        set({ isLoading: false, prayers: [], stats: { totalPrayers: 0, totalPrayedFor: 0 } });
        return;
      }

      // Fetch user's prayers with response counts using the RPC function
      const { data: prayersData, error: prayersError } = await supabase
        .from('prayers')
        .select('id, title, content, category, created_at, is_anonymous, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (prayersError) {
        console.error('Error fetching prayers:', prayersError);
        set({ isLoading: false, error: prayersError.message });
        return;
      }

      // Fetch response counts for each prayer
      const prayerIds = (prayersData || []).map(p => p.id);

      let responseCounts: Record<string, number> = {};
      if (prayerIds.length > 0) {
        const { data: countData, error: countError } = await supabase
          .from('prayer_responses')
          .select('prayer_id')
          .in('prayer_id', prayerIds);

        if (!countError && countData) {
          responseCounts = countData.reduce((acc: Record<string, number>, item) => {
            acc[item.prayer_id] = (acc[item.prayer_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

      // Count total responses user has made to others' prayers
      const { count: prayedForCount, error: prayedForError } = await supabase
        .from('prayer_responses')
        .select('*', { count: 'exact', head: true })
        .eq('responder_id', user.id);

      // Transform data
      const prayers: MyPrayerItem[] = (prayersData || []).map(prayer => ({
        id: prayer.id,
        title: prayer.title,
        content: prayer.content,
        category: prayer.category as PrayerCategory,
        created_at: prayer.created_at,
        response_count: responseCounts[prayer.id] || 0,
        is_anonymous: prayer.is_anonymous,
      }));

      // Calculate stats
      const totalResponses = Object.values(responseCounts).reduce((sum, count) => sum + count, 0);

      set({
        prayers,
        isLoading: false,
        error: null,
        stats: {
          totalPrayers: prayers.length,
          totalPrayedFor: prayedForCount || 0,
        },
      });
    } catch (error) {
      console.error('Failed to fetch my prayers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch prayers';
      set({ isLoading: false, error: errorMessage });
    }
  },

  deletePrayer: async (prayerId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Soft delete by updating status
      const { error } = await supabase
        .from('prayers')
        .update({ status: 'removed' })
        .eq('id', prayerId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting prayer:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        prayers: state.prayers.filter(p => p.id !== prayerId),
        stats: {
          ...state.stats,
          totalPrayers: state.stats.totalPrayers - 1,
        },
      }));

      return { success: true };
    } catch (error) {
      console.error('Failed to delete prayer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete prayer';
      return { success: false, error: errorMessage };
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Convenience hook
export function useMyPrayers() {
  return useMyPrayersStore();
}
