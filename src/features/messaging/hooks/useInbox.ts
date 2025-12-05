import { useState, useEffect, useCallback, useRef } from 'react';
import type { Prayer, PrayerResponse } from '../../prayers/types/prayer';
import { fetchUserInbox, subscribeToUserInbox } from '../../prayers/services/prayerService';

export interface InboxItem {
  prayer: Prayer;
  responses: PrayerResponse[];
  unreadCount: number;
}

interface UseInboxOptions {
  userId: string;
  autoFetch?: boolean;
  enableRealtime?: boolean;
}

interface UseInboxReturn {
  inbox: InboxItem[];
  loading: boolean;
  error: string | null;
  totalUnread: number;
  refetch: () => Promise<void>;
  markAsRead: (prayerId: string) => void;
}

/**
 * Hook to manage user's inbox with real-time updates
 * Shows prayers created by the user that have received responses
 */
export function useInbox({
  userId,
  autoFetch = true,
  enableRealtime = true,
}: UseInboxOptions): UseInboxReturn {
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readPrayers, setReadPrayers] = useState<Set<string>>(new Set());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Calculate total unread messages
  const totalUnread = inbox.reduce((sum, item) => {
    if (!readPrayers.has(item.prayer.id)) {
      return sum + item.unreadCount;
    }
    return sum;
  }, 0);

  // Fetch inbox from the database
  const fetchInbox = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedInbox = await fetchUserInbox(userId);
      setInbox(fetchedInbox);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch inbox';
      setError(errorMessage);
      console.error('Error fetching inbox:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch inbox on mount
  useEffect(() => {
    if (autoFetch && userId) {
      fetchInbox();
    }
  }, [autoFetch, userId, fetchInbox]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealtime || !userId) return;

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to inbox updates
    const unsubscribe = subscribeToUserInbox(userId, (updatedInbox) => {
      setInbox(updatedInbox);
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, enableRealtime]);

  // Mark a prayer as read
  const markAsRead = useCallback((prayerId: string) => {
    setReadPrayers((prev) => {
      const next = new Set(prev);
      next.add(prayerId);
      return next;
    });
  }, []);

  return {
    inbox,
    loading,
    error,
    totalUnread,
    refetch: fetchInbox,
    markAsRead,
  };
}
