/**
 * PrayerMap Cursor-Based Pagination Hook
 *
 * PERFORMANCE OPTIMIZATION:
 * Uses cursor-based pagination instead of offset pagination for:
 * - O(1) performance regardless of page number
 * - Stable results during concurrent data changes
 * - Better infinite scroll UX on mobile
 *
 * MEMORY LOG:
 * Topic: Infinite scroll with cursor pagination
 * Context: Scalability for large prayer datasets
 * Decision: Use React Query's useInfiniteQuery with composite cursor
 * Pattern: Cursor = (created_at, id) from last item in previous page
 * Performance: Constant-time pagination vs linear-time offset
 * Mobile Impact: Faster scrolling, reduced data usage, smoother UX
 * Date: 2025-01-29
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Prayer } from '../types/prayer';

// ============================================================================
// Types
// ============================================================================

interface PrayerRow {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  media_url?: string;
  location: string; // PostGIS POINT format: "POINT(lng lat)"
  user_name?: string;
  is_anonymous: boolean;
  status?: 'pending' | 'approved' | 'active' | 'hidden' | 'removed';
  created_at: string;
  updated_at?: string;
  has_more: boolean;
}

interface PaginationCursor {
  id: string;
  created_at: string;
}

interface UsePaginatedPrayersOptions {
  pageSize?: number;
  enabled?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parses PostGIS POINT format to lat/lng object
 * Format: "POINT(lng lat)" -> { lat: number, lng: number }
 */
function parsePostGISPoint(point: string): { lat: number; lng: number } {
  const match = point.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!match) {
    console.warn('Invalid PostGIS point format:', point);
    return { lat: 0, lng: 0 };
  }
  return {
    lng: parseFloat(match[1]),
    lat: parseFloat(match[2]),
  };
}

/**
 * Converts database row to Prayer type
 */
function convertPrayerRow(row: PrayerRow): Prayer {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    content: row.content,
    content_type: row.content_type,
    content_url: row.media_url,
    location: parsePostGISPoint(row.location),
    user_name: row.user_name,
    is_anonymous: row.is_anonymous,
    status: row.status,
    created_at: new Date(row.created_at),
    updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Fetches prayers using cursor-based pagination for infinite scroll
 *
 * @param options.pageSize - Number of prayers per page (default: 50, max: 200)
 * @param options.enabled - Whether the query is enabled (default: true)
 *
 * @returns React Query infinite query result with:
 *   - data.pages - Array of prayer pages
 *   - data.pages[].prayers - Prayer items in the page
 *   - data.pages[].hasMore - Whether there are more pages
 *   - fetchNextPage() - Function to load next page
 *   - hasNextPage - Whether there are more pages to load
 *   - isFetchingNextPage - Loading state for next page
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = usePaginatedPrayers({
 *   pageSize: 50
 * });
 *
 * // In infinite scroll component:
 * useEffect(() => {
 *   if (inView && hasNextPage && !isFetchingNextPage) {
 *     fetchNextPage();
 *   }
 * }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
 *
 * // Render all prayers from all pages:
 * const allPrayers = data?.pages.flatMap(page => page.prayers) ?? [];
 * ```
 */
export function usePaginatedPrayers({
  pageSize = 50,
  enabled = true,
}: UsePaginatedPrayersOptions = {}) {
  return useInfiniteQuery({
    queryKey: ['prayers', 'paginated', pageSize],
    queryFn: async ({ pageParam }) => {
      // Validate Supabase client
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Extract cursor from pageParam
      const cursor = pageParam as PaginationCursor | undefined;

      // Call RPC function with cursor
      const { data, error } = await supabase.rpc('get_prayers_paginated', {
        page_size: pageSize,
        cursor_id: cursor?.id ?? null,
        cursor_created_at: cursor?.created_at ?? null,
      });

      if (error) {
        console.error('Error fetching paginated prayers:', error);
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        return {
          prayers: [],
          hasMore: false,
          nextCursor: undefined,
        };
      }

      // All rows have the same has_more value (from the query)
      const hasMore = data[0]?.has_more ?? false;

      // Convert rows to Prayer objects
      const prayers = data.map((row: PrayerRow) => convertPrayerRow(row));

      // Get cursor for next page from last item
      const lastItem = prayers[prayers.length - 1];
      const nextCursor: PaginationCursor | undefined = hasMore
        ? {
            id: lastItem.id,
            created_at: lastItem.created_at.toISOString(),
          }
        : undefined;

      return {
        prayers,
        hasMore,
        nextCursor,
      };
    },
    getNextPageParam: (lastPage) => {
      // Return cursor for next page, or undefined if no more pages
      return lastPage.nextCursor;
    },
    initialPageParam: undefined as PaginationCursor | undefined,
    enabled,
    // Optional: Configure stale time and cache time
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
  });
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Extract all prayers from paginated data
 *
 * @example
 * ```tsx
 * const query = usePaginatedPrayers();
 * const allPrayers = getAllPrayers(query.data);
 * ```
 */
export function getAllPrayers(
  data: ReturnType<typeof usePaginatedPrayers>['data']
): Prayer[] {
  return data?.pages.flatMap((page) => page.prayers) ?? [];
}

/**
 * Check if there are any prayers loaded
 */
export function hasPrayers(
  data: ReturnType<typeof usePaginatedPrayers>['data']
): boolean {
  return (data?.pages.flatMap((page) => page.prayers).length ?? 0) > 0;
}

/**
 * Get total number of prayers loaded so far
 */
export function getPrayerCount(
  data: ReturnType<typeof usePaginatedPrayers>['data']
): number {
  return data?.pages.flatMap((page) => page.prayers).length ?? 0;
}
