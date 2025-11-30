/**
 * Hook for managing notification preferences
 *
 * Handles fetching and updating user notification preferences stored in
 * the notification_preferences JSONB column on the users table.
 *
 * Features:
 * - React Query integration for caching
 * - Optimistic updates for instant UI feedback
 * - Default values for new users
 * - Type-safe preference structure
 *
 * @module useNotificationPreferences
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Type Definitions
// ============================================================================

export interface NotificationPreferences {
  // Master toggle
  enabled: boolean;

  // Notification types
  prayerResponses: boolean;      // When someone responds to your prayer
  prayerSupport: boolean;        // When someone prays for you
  nearbyPrayers: boolean;        // New prayers in your area
  prayerReminders: boolean;      // Daily reminder to pray

  // Nearby prayer radius (in miles)
  nearbyRadius: number;          // 5-50 miles

  // Quiet hours
  quietHours: {
    enabled: boolean;
    startTime: string;           // HH:mm format (e.g., "22:00")
    endTime: string;             // HH:mm format (e.g., "08:00")
  };

  // Sound & Vibration
  sound: boolean;
  vibration: boolean;
}

// Default preferences for new users
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  prayerResponses: true,
  prayerSupport: true,
  nearbyPrayers: true,
  prayerReminders: false,
  nearbyRadius: 30, // miles
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
  },
  sound: true,
  vibration: true,
};

// ============================================================================
// Query Keys
// ============================================================================

const notificationKeys = {
  all: ['notification-preferences'] as const,
  user: (userId: string) => [...notificationKeys.all, userId] as const,
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to fetch and update notification preferences
 *
 * @returns Object with preferences data and mutation functions
 */
export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch preferences query
  const {
    data: preferences = DEFAULT_PREFERENCES,
    isLoading,
    error,
  } = useQuery({
    queryKey: notificationKeys.user(user?.id || ''),
    queryFn: async () => {
      if (!user?.id) {
        return DEFAULT_PREFERENCES;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('notification_preferences')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching notification preferences:', error);
          return DEFAULT_PREFERENCES;
        }

        // If no preferences set, return defaults
        if (!data?.notification_preferences) {
          return DEFAULT_PREFERENCES;
        }

        // Merge with defaults to ensure all fields exist
        return {
          ...DEFAULT_PREFERENCES,
          ...data.notification_preferences as NotificationPreferences,
        };
      } catch (err) {
        console.error('Error in notification preferences query:', err);
        return DEFAULT_PREFERENCES;
      }
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<NotificationPreferences>) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const updatedPreferences = {
        ...preferences,
        ...newPreferences,
      };

      const { data, error } = await supabase
        .from('users')
        .update({
          notification_preferences: updatedPreferences,
        })
        .eq('user_id', user.id)
        .select('notification_preferences')
        .single();

      if (error) {
        console.error('Error updating notification preferences:', error);
        throw error;
      }

      return data.notification_preferences as NotificationPreferences;
    },

    // Optimistic update
    onMutate: async (newPreferences) => {
      if (!user?.id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: notificationKeys.user(user.id),
      });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<NotificationPreferences>(
        notificationKeys.user(user.id)
      );

      // Optimistically update
      queryClient.setQueryData<NotificationPreferences>(
        notificationKeys.user(user.id),
        (old) => ({
          ...(old || DEFAULT_PREFERENCES),
          ...newPreferences,
        })
      );

      return { previousPreferences };
    },

    // On error, rollback
    onError: (err, newPreferences, context) => {
      if (user?.id && context?.previousPreferences) {
        queryClient.setQueryData(
          notificationKeys.user(user.id),
          context.previousPreferences
        );
      }
      console.error('Failed to update notification preferences:', err);
    },

    // On success, invalidate to refetch
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.user(user.id),
        });
      }
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updatePreferencesMutation.mutate,
    updatePreferencesAsync: updatePreferencesMutation.mutateAsync,
    isUpdating: updatePreferencesMutation.isPending,
  };
}

/**
 * Hook to get a single preference value
 * Useful for components that only need one preference
 */
export function useNotificationPreference<K extends keyof NotificationPreferences>(
  key: K
): NotificationPreferences[K] {
  const { preferences } = useNotificationPreferences();
  return preferences[key];
}
