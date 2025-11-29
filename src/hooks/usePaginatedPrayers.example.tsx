/**
 * USAGE EXAMPLES: usePaginatedPrayers Hook
 *
 * This file demonstrates how to use cursor-based pagination for infinite scroll
 * in the PrayerMap application.
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePaginatedPrayers, getAllPrayers } from './usePaginatedPrayers';
import type { Prayer } from '../types/prayer';

// ============================================================================
// Example 1: Basic Infinite Scroll with Intersection Observer
// ============================================================================

export function PrayerFeedInfiniteScroll() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = usePaginatedPrayers({
    pageSize: 50,
  });

  // Reference to the sentinel element at the bottom
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // When sentinel comes into view, load next page
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '100px', // Start loading 100px before reaching sentinel
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Get all prayers from all pages
  const allPrayers = getAllPrayers(data);

  if (isLoading) {
    return <div>Loading prayers...</div>;
  }

  if (isError) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="prayer-feed">
      {allPrayers.map((prayer) => (
        <PrayerCard key={prayer.id} prayer={prayer} />
      ))}

      {/* Sentinel element for intersection observer */}
      <div ref={sentinelRef} className="h-20 flex items-center justify-center">
        {isFetchingNextPage && <LoadingSpinner />}
        {!hasNextPage && allPrayers.length > 0 && (
          <p className="text-muted-foreground">No more prayers to load</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Example 2: Manual "Load More" Button
// ============================================================================

export function PrayerFeedWithLoadMoreButton() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    usePaginatedPrayers({
      pageSize: 20, // Smaller page size for "Load More" pattern
    });

  const allPrayers = getAllPrayers(data);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="prayer-feed">
      <div className="grid gap-4">
        {allPrayers.map((prayer) => (
          <PrayerCard key={prayer.id} prayer={prayer} />
        ))}
      </div>

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="load-more-button mt-6"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More Prayers'}
        </button>
      )}

      {!hasNextPage && allPrayers.length > 0 && (
        <p className="text-center text-muted-foreground mt-6">
          You've reached the end
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Example 3: Scroll-to-Top with Virtualization (Advanced)
// ============================================================================

export function VirtualizedPrayerFeed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePaginatedPrayers({
    pageSize: 100, // Larger pages for virtualization
  });

  const allPrayers = getAllPrayers(data);

  // Handle scroll near bottom
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      // When user scrolls to 80% of the content, load more
      if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  return (
    <div
      className="prayer-feed-virtualized overflow-y-auto h-screen"
      onScroll={handleScroll}
    >
      {allPrayers.map((prayer) => (
        <PrayerCard key={prayer.id} prayer={prayer} />
      ))}
      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  );
}

// ============================================================================
// Example 4: Conditional Loading (Only When Needed)
// ============================================================================

export function ConditionalPrayerFeed({ shouldLoad }: { shouldLoad: boolean }) {
  const { data, isLoading } = usePaginatedPrayers({
    pageSize: 50,
    enabled: shouldLoad, // Only fetch when shouldLoad is true
  });

  const allPrayers = getAllPrayers(data);

  if (!shouldLoad) {
    return <div>Prayer feed is disabled</div>;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {allPrayers.map((prayer) => (
        <PrayerCard key={prayer.id} prayer={prayer} />
      ))}
    </div>
  );
}

// ============================================================================
// Example 5: Using with React Query DevTools
// ============================================================================

export function PrayerFeedWithDevTools() {
  const query = usePaginatedPrayers({ pageSize: 50 });

  // You can inspect the query in React Query DevTools
  // It will show up as ['prayers', 'paginated', 50]

  return (
    <div>
      {/* Your UI here */}
      <pre>{JSON.stringify(query.data, null, 2)}</pre>
    </div>
  );
}

// ============================================================================
// Placeholder Components (implement these in your actual components)
// ============================================================================

function PrayerCard({ prayer }: { prayer: Prayer }) {
  return (
    <div className="prayer-card p-4 border rounded-lg">
      <h3>{prayer.title || 'Prayer Request'}</h3>
      <p>{prayer.content}</p>
      <small>
        {prayer.is_anonymous ? 'Anonymous' : prayer.user_name} -{' '}
        {prayer.created_at.toLocaleDateString()}
      </small>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// ============================================================================
// PERFORMANCE TIPS
// ============================================================================

/*
1. PAGE SIZE OPTIMIZATION:
   - Mobile (3G/4G): 20-30 items for faster initial load
   - Desktop (WiFi): 50-100 items for smoother scrolling
   - Virtualized lists: 100+ items

2. STALE TIME CONFIGURATION:
   - Real-time updates needed: staleTime: 0 (always refetch)
   - Static content: staleTime: 5 * 60 * 1000 (5 minutes)
   - Default: staleTime: 60 * 1000 (1 minute)

3. PREFETCHING:
   - Consider prefetching next page when user scrolls to 50%
   - Use queryClient.prefetchInfiniteQuery() in useEffect

4. VIRTUALIZATION:
   - For 1000+ items, use react-window or @tanstack/react-virtual
   - Reduces DOM nodes, improves scroll performance

5. MOBILE CONSIDERATIONS:
   - Smaller page sizes on slow connections
   - Show skeleton loaders during fetch
   - Use Intersection Observer with generous rootMargin
   - Add pull-to-refresh for first page
*/

// ============================================================================
// MIGRATION FROM usePrayers
// ============================================================================

/*
BEFORE (offset-based, usePrayers):
```tsx
const { prayers, loading, error, refetch } = usePrayers({
  location: { lat: 37.7749, lng: -122.4194 },
  globalMode: true,
});
```

AFTER (cursor-based, usePaginatedPrayers):
```tsx
const { data, isLoading, isError, error } = usePaginatedPrayers({
  pageSize: 50,
});
const prayers = getAllPrayers(data);
```

BENEFITS:
- ✅ O(1) pagination performance (vs O(n) offset)
- ✅ Stable results during concurrent updates
- ✅ Infinite scroll support built-in
- ✅ Better mobile performance
- ✅ Automatic deduplication via React Query
*/
