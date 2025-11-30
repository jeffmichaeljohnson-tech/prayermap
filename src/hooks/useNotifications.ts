/**
 * Notification Hooks with React Query and Real-time Subscriptions
 *
 * FEATURES:
 * - Fetch user notifications with caching
 * - Real-time subscription for new notifications
 * - Mark as read mutations (single & batch)
 * - Badge count tracking
 * - Optimistic updates for instant UI feedback
 *
 * NOTIFICATION TYPES:
 * - SUPPORT_RECEIVED: Someone pressed "Prayer Sent"
 * - RESPONSE_RECEIVED: Someone responded to your prayer
 * - PRAYER_ANSWERED: Someone marked prayer as answered (future)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType = 'SUPPORT_RECEIVED' | 'RESPONSE_RECEIVED' | 'PRAYER_ANSWERED';

export interface NotificationPayload {
  prayer_id?: string;
  response_id?: string;
  supporter_name?: string;
  responder_name?: string;
  message?: string;
  content_type?: 'text' | 'audio' | 'video';
  [key: string]: unknown;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  payload: NotificationPayload;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (userId: string) => [...notificationKeys.lists(), userId] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
} as const;

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Fetch notifications for a user
 */
async function fetchNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  return (data || []) as Notification[];
}

/**
 * Get unread notification count
 */
async function getUnreadCount(userId: string): Promise<number> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return 0;
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }

  return count || 0;
}

/**
 * Mark a notification as read
 */
async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return;
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('notification_id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsAsRead(userId: string): Promise<number> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return 0;
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select();

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }

  return data?.length || 0;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch notifications with caching and real-time updates
 *
 * USAGE:
 * ```typescript
 * const { notifications, isLoading, unreadCount } = useNotifications(userId);
 * ```
 */
export function useNotifications(userId: string | null, options?: { enabled?: boolean; limit?: number }) {
  const { enabled = true, limit = 50 } = options || {};
  const queryClient = useQueryClient();
  const [hasNewNotification, setHasNewNotification] = useState(false);

  // Fetch notifications
  const notificationsQuery = useQuery({
    queryKey: notificationKeys.list(userId || ''),
    queryFn: () => fetchNotifications(userId!, limit),
    enabled: enabled && !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch unread count
  const unreadCountQuery = useQuery({
    queryKey: notificationKeys.unreadCount(userId || ''),
    queryFn: () => getUnreadCount(userId!),
    enabled: enabled && !!userId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!supabase || !userId || !enabled) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New notification received:', payload);

          // Trigger pulse animation
          setHasNewNotification(true);
          setTimeout(() => setHasNewNotification(false), 3000);

          // Invalidate queries to refetch
          queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
          queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, enabled, queryClient]);

  return {
    notifications: notificationsQuery.data || [],
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
    unreadCount: unreadCountQuery.data || 0,
    hasNewNotification,
    refetch: notificationsQuery.refetch,
  };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to mark a notification as read with optimistic update
 *
 * USAGE:
 * ```typescript
 * const { mutate: markAsRead } = useMarkNotificationAsRead();
 * markAsRead(notificationId);
 * ```
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationAsRead,

    // Optimistic update
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });

      // Get all notification query keys
      const allKeys = queryClient.getQueryCache().getAll()
        .filter(query => query.queryKey[0] === 'notifications' && query.queryKey[1] === 'list')
        .map(query => query.queryKey);

      // Snapshot previous values
      const previousData = allKeys.map(key => ({
        key,
        data: queryClient.getQueryData(key)
      }));

      // Optimistically update
      allKeys.forEach(key => {
        queryClient.setQueryData<Notification[]>(key, (old) => {
          if (!old) return old;
          return old.map(notification =>
            notification.notification_id === notificationId
              ? { ...notification, is_read: true, read_at: new Date().toISOString() }
              : notification
          );
        });
      });

      return { previousData };
    },

    // Rollback on error
    onError: (err, notificationId, context) => {
      if (context?.previousData) {
        context.previousData.forEach(({ key, data }) => {
          queryClient.setQueryData(key, data);
        });
      }
      console.error('Failed to mark notification as read:', err);
    },

    // Invalidate on success
    onSuccess: (data, notificationId) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook to mark all notifications as read
 *
 * USAGE:
 * ```typescript
 * const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead();
 * markAllAsRead(userId);
 * ```
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,

    // Optimistic update
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list(userId) });

      const previousNotifications = queryClient.getQueryData(notificationKeys.list(userId));

      // Mark all as read
      queryClient.setQueryData<Notification[]>(
        notificationKeys.list(userId),
        (old) => {
          if (!old) return old;
          return old.map(notification => ({
            ...notification,
            is_read: true,
            read_at: notification.read_at || new Date().toISOString(),
          }));
        }
      );

      // Update unread count to 0
      queryClient.setQueryData(notificationKeys.unreadCount(userId), 0);

      return { previousNotifications };
    },

    onError: (err, userId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationKeys.list(userId),
          context.previousNotifications
        );
      }
      console.error('Failed to mark all notifications as read:', err);
    },

    onSuccess: (count, userId) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      console.log(`Marked ${count} notifications as read`);
    },
  });
}

/*
MEMORY LOG:
Topic: Notification System with React Query
Context: Need notification center with real-time updates and badge count
Decision: Use React Query + Supabase Realtime for notification management
Reasoning:
  - React Query provides caching and optimistic updates
  - Supabase Realtime gives instant notification delivery
  - Optimistic updates ensure instant UI feedback
  - Separate unread count query with frequent polling
Mobile Impact:
  - Real-time subscriptions work on mobile
  - Optimistic updates reduce perceived latency
  - Polling interval balanced for battery life (30s)
Date: 2025-11-30
*/
