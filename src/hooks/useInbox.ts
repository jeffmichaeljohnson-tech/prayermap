import { useState, useEffect, useCallback, useRef } from 'react';
import type { Prayer, PrayerResponse } from '../types/prayer';
import { fetchUserInbox, markAllResponsesRead } from '../services/prayerService';
import { inboxSyncService } from '../services/inboxSyncService';

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
  connectionHealth: any; // Connection state for debugging
  forceRefresh: () => Promise<void>;
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
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Calculate total unread messages directly from database state
  // This ensures persistence across browser sessions and refreshes
  const totalUnread = inbox.reduce((sum, item) => {
    return sum + item.unreadCount;
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

  // Set up enhanced real-time subscription with multi-device support
  useEffect(() => {
    if (!enableRealtime || !userId) {
      console.log('Real-time disabled or no userId, skipping subscription');
      return;
    }

    console.log('Setting up enhanced inbox subscription for user:', userId);

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      console.log('Cleaning up existing subscription');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Subscribe using enhanced inbox sync service
    const unsubscribe = inboxSyncService.subscribeToInbox(
      userId,
      (updatedInbox) => {
        console.log('Received enhanced real-time inbox update:', updatedInbox.length, 'items');
        setInbox(updatedInbox);
        setError(null); // Clear any previous errors
      },
      (error) => {
        console.error('Enhanced inbox subscription error:', error);
        setError(`Real-time sync error: ${error.message}`);
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or dependency change
    return () => {
      console.log('Cleaning up enhanced inbox subscription hook');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId, enableRealtime]);

  // Mark a prayer as read - persists to database and triggers cross-device sync
  const markAsRead = useCallback(async (prayerId: string) => {
    try {
      const count = await markAllResponsesRead(prayerId);
      console.log(`Marked ${count} responses as read for prayer ${prayerId}`);
      
      // Optimistically update local state for immediate UI feedback
      setInbox((prevInbox) => 
        prevInbox.map((item) => {
          if (item.prayer.id === prayerId) {
            return {
              ...item,
              unreadCount: 0, // Mark all responses as read
              responses: item.responses.map(response => ({
                ...response,
                read_at: response.read_at || new Date().toISOString() // Mark as read if not already
              }))
            };
          }
          return item;
        })
      );
      
      // Trigger force refresh to sync across all devices
      if (userId) {
        await inboxSyncService.forceRefresh(userId, (refreshedInbox) => {
          setInbox(refreshedInbox);
        });
      }
    } catch (error) {
      console.error('Failed to mark responses as read:', error);
      setError('Failed to mark messages as read. Please try again.');
      
      // Refetch to ensure consistency
      fetchInbox();
    }
  }, [fetchInbox, userId]);

  // Force refresh function that bypasses debouncing
  const forceRefresh = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await inboxSyncService.forceRefresh(userId, (refreshedInbox) => {
        setInbox(refreshedInbox);
        setError(null);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to force refresh inbox';
      setError(errorMessage);
      console.error('Force refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Get connection health for debugging
  const connectionHealth = userId ? inboxSyncService.getConnectionHealth(userId) : null;

  return {
    inbox,
    loading,
    error,
    totalUnread,
    refetch: fetchInbox,
    markAsRead,
    connectionHealth,
    forceRefresh,
  };
}
