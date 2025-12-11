import { create } from 'zustand';
import { supabase } from './supabase';
import type { PrayerCategory } from './types/prayer';

export interface InboxItem {
  id: string;
  prayer_id: string;
  responder_name: string | null;
  is_anonymous: boolean;
  message: string | null;
  created_at: string;
  read_at: string | null;
  // Joined from prayers table
  prayer_title: string | null;
  prayer_content: string;
  prayer_category: PrayerCategory;
}

interface InboxState {
  items: InboxItem[];
  isLoading: boolean;
  error: string | null;
  unreadCount: number;

  // Actions
  fetchInbox: () => Promise<void>;
  markAsRead: (itemId: string) => Promise<void>;
  clearError: () => void;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  unreadCount: 0,

  fetchInbox: async () => {
    set({ isLoading: true, error: null });

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        set({ isLoading: false, items: [], unreadCount: 0 });
        return;
      }

      // Fetch prayer responses for prayers owned by the current user
      // We need to join with prayers to get prayer info and filter by owner
      const { data, error } = await supabase
        .from('prayer_responses')
        .select(`
          id,
          prayer_id,
          responder_name,
          is_anonymous,
          message,
          created_at,
          read_at,
          prayers!inner (
            user_id,
            title,
            content,
            category
          )
        `)
        .eq('prayers.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching inbox:', error);
        set({ isLoading: false, error: error.message });
        return;
      }

      // Transform data to flatten the structure
      const items: InboxItem[] = (data || []).map((item: any) => ({
        id: item.id,
        prayer_id: item.prayer_id,
        responder_name: item.responder_name,
        is_anonymous: item.is_anonymous,
        message: item.message,
        created_at: item.created_at,
        read_at: item.read_at,
        prayer_title: item.prayers?.title || null,
        prayer_content: item.prayers?.content || '',
        prayer_category: item.prayers?.category || 'other',
      }));

      const unreadCount = items.filter(item => !item.read_at).length;

      set({
        items,
        isLoading: false,
        error: null,
        unreadCount,
      });
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch inbox';
      set({ isLoading: false, error: errorMessage });
    }
  },

  markAsRead: async (itemId) => {
    try {
      const { error } = await supabase
        .from('prayer_responses')
        .update({ read_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) {
        console.error('Error marking as read:', error);
        return;
      }

      // Update local state
      set(state => ({
        items: state.items.map(item =>
          item.id === itemId
            ? { ...item, read_at: new Date().toISOString() }
            : item
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Convenience hook
export function useInbox() {
  return useInboxStore();
}
