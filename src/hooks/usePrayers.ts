/**
 * React Query hooks for prayer data management
 * 
 * Provides hooks for fetching prayers with geospatial queries,
 * caching, and error handling using React Query
 */

import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { getPrayersNearby, getPrayerById, PrayerApiError } from '../lib/api/prayers'
import { DEFAULT_RADIUS_MILES } from '../lib/constants'
import type { Prayer } from '../lib/types'

/**
 * Query keys for React Query
 */
const QUERY_KEYS = {
  PRAYER: (id: number) => ['prayer', id] as const,
}

/**
 * Default values for prayer queries
 */
const PRAYER_DEFAULTS = {
  STALE_TIME_MS: 60000, // 1 minute
}

/**
 * Hook to fetch prayers within a radius of a location (in miles)
 * 
 * Uses React Query for caching, automatic refetching, and error handling.
 * Data is considered stale after 1 minute (60 seconds).
 * 
 * @param lat - Latitude (-90 to 90)
 * @param lng - Longitude (-180 to 180)
 * @param radiusMiles - Search radius in miles (default: 30)
 * @param options - Additional React Query options
 * @returns Query result with prayers data, loading state, and error
 * 
 * @example
 * ```typescript
 * const { data: prayers, isLoading, error } = usePrayers(41.8781, -87.6298, 30)
 * ```
 */
export function usePrayers(
  lat: number | null,
  lng: number | null,
  radiusMiles: number = DEFAULT_RADIUS_MILES,
  options?: {
    enabled?: boolean
    refetchOnWindowFocus?: boolean
    refetchOnMount?: boolean
  }
): UseQueryResult<Prayer[], PrayerApiError> {
  return useQuery({
    queryKey: ['prayers', lat, lng, radiusMiles],
    queryFn: () => {
      if (lat === null || lng === null) {
        throw new PrayerApiError(
          'Location parameters are required',
          'MISSING_PARAMS'
        )
      }
      return getPrayersNearby(lat, lng, radiusMiles)
    },
    enabled: options?.enabled !== false && lat !== null && lng !== null,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
    refetchOnMount: options?.refetchOnMount ?? true,
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error instanceof PrayerApiError) {
        const code = error.code
        if (
          code === 'INVALID_LATITUDE' ||
          code === 'INVALID_LONGITUDE' ||
          code === 'INVALID_RADIUS' ||
          code === 'INVALID_PRAYER_ID' ||
          code === 'MISSING_PARAMS' ||
          code === 'INVALID_LIMIT' ||
          code === 'INVALID_OFFSET'
        ) {
          return false
        }
      }
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Hook to fetch prayers within a radius of a location (legacy - uses kilometers)
 * 
 * @deprecated Use usePrayers instead, which accepts miles
 * 
 * @param params - Location and radius parameters
 * @param options - Additional React Query options
 * @returns Query result with prayers data, loading state, and error
 */
export function usePrayersNearby(
  params: { lat: number; lng: number; radiusKm: number } | null,
  options?: {
    enabled?: boolean
    refetchOnWindowFocus?: boolean
    refetchOnMount?: boolean
  }
): UseQueryResult<Prayer[], PrayerApiError> {
  const { lat, lng, radiusKm } = params || { lat: 0, lng: 0, radiusKm: 30 }
  
  // Convert km to miles for the new hook
  const radiusMiles = radiusKm / 1.60934
  
  return usePrayers(lat, lng, radiusMiles, options)
}

/**
 * Hook to fetch a single prayer by ID
 * 
 * @param prayerId - The ID of the prayer to fetch
 * @param options - Additional React Query options
 * @returns Query result with prayer data, loading state, and error
 * 
 * @example
 * ```typescript
 * const { data: prayer, isLoading, error } = usePrayer(123)
 * ```
 */
export function usePrayer(
  prayerId: number | null,
  options?: {
    enabled?: boolean
  }
): UseQueryResult<Prayer | null, PrayerApiError> {
  return useQuery({
    queryKey: QUERY_KEYS.PRAYER(prayerId ?? 0),
    queryFn: () => {
      if (!prayerId) {
        throw new PrayerApiError(
          'Prayer ID is required',
          'MISSING_PRAYER_ID'
        )
      }
      return getPrayerById(prayerId)
    },
    enabled: options?.enabled !== false && prayerId !== null,
    staleTime: PRAYER_DEFAULTS.STALE_TIME_MS, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on client errors
      if (error instanceof PrayerApiError) {
        const code = error.code
        if (
          code === 'INVALID_PRAYER_ID' ||
          code === 'MISSING_PRAYER_ID'
        ) {
          return false
        }
      }
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Type guard to check if an error is a PrayerApiError
 */
export function isPrayerApiError(error: unknown): error is PrayerApiError {
  return error instanceof PrayerApiError
}

