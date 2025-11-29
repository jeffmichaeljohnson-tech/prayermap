import { useState, useCallback, useRef, useEffect } from 'react';
import { usePrayers } from './usePrayers';
import type { Prayer } from '../types/prayer';

interface UseVideoFeedProps {
  initialPrayers?: Prayer[];
  userLocation?: { lat: number; lng: number };
  radius?: number;
  category?: string;
}

interface VideoFeedState {
  prayers: Prayer[];
  currentIndex: number;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

/**
 * Hook for managing video prayer feed state and interactions
 * Integrates with existing PrayerMap data layer
 */
export function useVideoFeed({ 
  initialPrayers = [], 
  userLocation,
  radius = 50,
  category
}: UseVideoFeedProps = {}) {
  const [state, setState] = useState<VideoFeedState>({
    prayers: initialPrayers,
    currentIndex: 0,
    isLoading: false,
    hasMore: true,
    error: null
  });

  const [page, setPage] = useState(0);
  const loadedPrayersRef = useRef(new Set<string>());

  // Use existing prayers hook for data fetching
  const { 
    prayers: allPrayers, 
    loading: prayersLoading, 
    error: prayersError,
    refreshPrayers,
    sendPrayerSupport 
  } = usePrayers(userLocation);

  // Filter video prayers from all prayers
  const videoPrayers = allPrayers.filter(prayer => 
    prayer.content_type === 'video' && 
    prayer.content_url &&
    (!category || prayer.category === category) &&
    !loadedPrayersRef.current.has(prayer.id)
  );

  // Load initial video prayers
  useEffect(() => {
    if (videoPrayers.length > 0 && state.prayers.length === 0) {
      const newPrayers = videoPrayers.slice(0, 10); // Load first 10
      newPrayers.forEach(prayer => loadedPrayersRef.current.add(prayer.id));
      
      setState(prev => ({
        ...prev,
        prayers: newPrayers,
        hasMore: videoPrayers.length > 10
      }));
    }
  }, [videoPrayers, state.prayers.length]);

  // Load more prayers for infinite scroll
  const loadMore = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get next batch of video prayers
      const startIndex = state.prayers.length;
      const endIndex = startIndex + 10;
      const newPrayers = videoPrayers.slice(startIndex, endIndex);

      if (newPrayers.length > 0) {
        newPrayers.forEach(prayer => loadedPrayersRef.current.add(prayer.id));
        
        setState(prev => ({
          ...prev,
          prayers: [...prev.prayers, ...newPrayers],
          hasMore: endIndex < videoPrayers.length,
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          hasMore: false,
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load more prayers',
        isLoading: false
      }));
    }
  }, [state.isLoading, state.hasMore, state.prayers.length, videoPrayers]);

  // Navigate to specific index
  const navigateToIndex = useCallback((index: number) => {
    if (index >= 0 && index < state.prayers.length) {
      setState(prev => ({ ...prev, currentIndex: index }));
    }
  }, [state.prayers.length]);

  // Navigate to next prayer
  const goToNext = useCallback(() => {
    const nextIndex = state.currentIndex + 1;
    
    if (nextIndex >= state.prayers.length - 2 && state.hasMore && !state.isLoading) {
      // Load more when approaching end
      loadMore();
    }
    
    if (nextIndex < state.prayers.length) {
      setState(prev => ({ ...prev, currentIndex: nextIndex }));
    }
  }, [state.currentIndex, state.prayers.length, state.hasMore, state.isLoading, loadMore]);

  // Navigate to previous prayer
  const goToPrevious = useCallback(() => {
    const prevIndex = state.currentIndex - 1;
    if (prevIndex >= 0) {
      setState(prev => ({ ...prev, currentIndex: prevIndex }));
    }
  }, [state.currentIndex]);

  // Handle prayer interaction
  const handlePrayForVideo = useCallback(async (prayer: Prayer) => {
    try {
      await sendPrayerSupport(prayer.id, {
        message: 'Praying for you! 🙏',
        contentType: 'text',
        isAnonymous: false
      });

      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 100, 50]);
      }

      return true;
    } catch (error) {
      console.error('Failed to send prayer support:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to send prayer support'
      }));
      return false;
    }
  }, [sendPrayerSupport]);

  // Share prayer
  const sharePrayer = useCallback(async (prayer: Prayer) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: prayer.title || 'Prayer on PrayerMap',
          text: prayer.content || 'Join me in praying for this request',
          url: `https://prayermap.net/prayer/${prayer.id}`
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback to clipboard
      const shareText = `${prayer.title || 'Prayer Request'}\n\n${prayer.content}\n\nPray with me at: https://prayermap.net/prayer/${prayer.id}`;
      
      try {
        await navigator.clipboard.writeText(shareText);
        // Show toast notification (to be implemented)
      } catch (error) {
        console.error('Failed to copy to clipboard');
      }
    }
  }, []);

  // Report prayer
  const reportPrayer = useCallback((prayer: Prayer) => {
    // Open report modal (to be implemented)
    console.log('Report prayer:', prayer.id);
  }, []);

  // Refresh feed
  const refreshFeed = useCallback(async () => {
    setState(prev => ({
      ...prev,
      prayers: [],
      currentIndex: 0,
      isLoading: true,
      hasMore: true,
      error: null
    }));

    loadedPrayersRef.current.clear();
    setPage(0);
    
    try {
      await refreshPrayers();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh',
        isLoading: false
      }));
    }
  }, [refreshPrayers]);

  // Get current prayer
  const currentPrayer = state.prayers[state.currentIndex] || null;

  // Calculate position info
  const position = {
    current: state.currentIndex + 1,
    total: state.prayers.length,
    hasNext: state.currentIndex < state.prayers.length - 1 || state.hasMore,
    hasPrevious: state.currentIndex > 0
  };

  return {
    // State
    prayers: state.prayers,
    currentPrayer,
    currentIndex: state.currentIndex,
    isLoading: state.isLoading || prayersLoading,
    hasMore: state.hasMore,
    error: state.error || prayersError,
    position,

    // Actions
    loadMore,
    navigateToIndex,
    goToNext,
    goToPrevious,
    handlePrayForVideo,
    sharePrayer,
    reportPrayer,
    refreshFeed
  };
}