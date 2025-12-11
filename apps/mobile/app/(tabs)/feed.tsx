/**
 * Feed Screen - TikTok-style vertical swipe prayer feed
 * Full-screen immersive experience with ethereal map backgrounds
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  ViewToken,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFeedPrayersStore } from '@/lib/useFeedPrayers';
import { useAuthStore } from '@/lib/useAuthStore';
import { FeedPrayerCard } from '@/components/FeedPrayerCard';
import type { Prayer } from '@/lib/types/prayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const isFocused = useIsFocused();

  // Store
  const {
    prayers,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    currentIndex,
    fetchFeedPrayers,
    loadMorePrayers,
    setCurrentIndex,
    refreshFeed,
  } = useFeedPrayersStore();

  const { user } = useAuthStore();

  // Track which items are visible for auto-play
  const [visibleIndex, setVisibleIndex] = useState(0);

  // Fetch prayers on mount
  useEffect(() => {
    fetchFeedPrayers();
  }, []);

  // Handle viewable items change (for auto-play and tracking)
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const index = viewableItems[0].index ?? 0;
        setVisibleIndex(index);
        setCurrentIndex(index);
      }
    },
    [setCurrentIndex]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }).current;

  // Render each prayer card
  // isVisible is true only when the item is in view AND the tab is focused
  // This ensures video/audio stops when switching to another tab
  const renderItem = useCallback(
    ({ item, index }: { item: Prayer; index: number }) => (
      <FeedPrayerCard
        prayer={item}
        isVisible={index === visibleIndex && isFocused}
        index={index}
      />
    ),
    [visibleIndex, isFocused]
  );

  // Handle end reached for infinite scroll
  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMorePrayers();
    }
  }, [hasMore, isLoadingMore, loadMorePrayers]);

  // Loading state
  if (isLoading && prayers.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading prayers...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && prayers.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load prayers</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchFeedPrayers(true)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state
  if (!isLoading && prayers.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🙏</Text>
          <Text style={styles.emptyTitle}>No prayers yet</Text>
          <Text style={styles.emptySubtext}>
            Be the first to share a prayer with the world
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* TikTok-style vertical swipe list */}
      <FlatList
        ref={flatListRef}
        data={prayers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshFeed}
            tintColor="#fff"
            progressViewOffset={insets.top}
          />
        }
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : null
        }
      />

      {/* Prayer counter (optional, can be removed) */}
      <View style={[styles.counter, { top: insets.top + 12 }]}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {prayers.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  errorSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4169E1',
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  counter: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingMore: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
