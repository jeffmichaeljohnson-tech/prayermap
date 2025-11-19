/**
 * React Query hook for creating prayers
 * 
 * Provides mutation hook for creating new prayer requests with
 * automatic cache invalidation and error handling
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPrayer, PrayerApiError, type CreatePrayerParams } from '../lib/api/prayers'
import type { Prayer } from '../lib/types'

/**
 * Hook to create a new prayer request
 * 
 * Automatically invalidates prayers queries on success to refresh the map.
 * 
 * @returns Mutation object with mutate function, loading state, and error
 * 
 * @example
 * ```typescript
 * const { mutate, isLoading, error } = useCreatePrayer()
 * 
 * mutate({
 *   title: 'Healing prayer',
 *   textBody: 'Please pray for...',
 *   isAnonymous: false,
 *   latitude: 41.8781,
 *   longitude: -87.6298
 * })
 * ```
 */
export function useCreatePrayer() {
  const queryClient = useQueryClient()

  return useMutation<Prayer, PrayerApiError, CreatePrayerParams>({
    mutationFn: createPrayer,
    onSuccess: () => {
      // Invalidate all prayers queries to refresh the map
      queryClient.invalidateQueries({ queryKey: ['prayers'] })
    },
    retry: (failureCount, error) => {
      // Don't retry on client validation errors
      if (error instanceof PrayerApiError) {
        const code = error.code
        if (
          code === 'INVALID_TEXT_BODY' ||
          code === 'TEXT_TOO_SHORT' ||
          code === 'TEXT_TOO_LONG' ||
          code === 'INVALID_TITLE' ||
          code === 'TITLE_TOO_LONG' ||
          code === 'INVALID_LATITUDE' ||
          code === 'INVALID_LONGITUDE' ||
          code === 'UNAUTHORIZED'
        ) {
          return false
        }
      }
      // Retry up to 2 times for network/server errors
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

