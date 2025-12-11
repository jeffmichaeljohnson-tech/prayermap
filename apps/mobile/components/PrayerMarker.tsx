import React, { useEffect, memo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Prayer, PrayerCategory } from '@/lib/types/prayer';
import { CATEGORY_GLOW_COLORS } from '@/lib/types/prayer';

interface PrayerMarkerProps {
  prayer: Prayer;
  onPress: () => void;
  isPrayed?: boolean;
}

// Animated Pressable component
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PrayerMarkerComponent({ prayer, onPress, isPrayed = false }: PrayerMarkerProps) {
  // Debug log for each marker render
  useEffect(() => {
    console.log(`[PrayerMarker] Rendering: ${prayer.content_type} | ${prayer.id.substring(0, 8)} | ${prayer.title || prayer.content.substring(0, 15)}`);
  }, [prayer.id]);

  // Animation values
  const floatProgress = useSharedValue(0);
  const glowProgress = useSharedValue(0);
  const badgeScale = useSharedValue(0);
  const pressScale = useSharedValue(1);

  // Get category-specific styling (but always use prayer hands emoji for pin)
  const category = prayer.category || 'other';
  const emoji = '🙏'; // Always use prayer hands for map markers
  const glowColor = CATEGORY_GLOW_COLORS[category] || 'rgba(254, 240, 138, 0.3)';

  // Start animations on mount
  useEffect(() => {
    if (!isPrayed) {
      // Floating animation: 0 → 1 → 0 over 2 seconds
      floatProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Infinite
        false
      );

      // Glow pulse animation: 0 → 1 → 0 over 2 seconds
      glowProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }

    // Badge spring animation
    if ((prayer.response_count || 0) > 0) {
      badgeScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  }, [isPrayed, prayer.response_count]);

  // Floating animation style (Y offset)
  const floatingStyle = useAnimatedStyle(() => {
    const translateY = interpolate(floatProgress.value, [0, 1], [0, -5]);
    return {
      transform: [{ translateY }],
    };
  });

  // Glow animation style (scale and opacity)
  const glowStyle = useAnimatedStyle(() => {
    const scale = interpolate(glowProgress.value, [0, 1], [1, 1.5]);
    const opacity = interpolate(glowProgress.value, [0, 1], [0.3, 0.6]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Badge animation style
  const badgeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: badgeScale.value }],
    };
  });

  // Press animation style
  const pressAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pressScale.value }],
    };
  });

  // Handle press in/out for scale animation
  const handlePressIn = () => {
    pressScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  // Check if this is a media prayer
  const isAudioPrayer = prayer.content_type === 'audio';
  const isVideoPrayer = prayer.content_type === 'video';
  const isMediaPrayer = isAudioPrayer || isVideoPrayer;

  // Get preview text (first 50 chars or title)
  const getPreviewText = () => {
    if (prayer.title) return prayer.title;
    // For media prayers without title, return null (we'll show icon instead)
    if (isMediaPrayer) return null;
    const words = prayer.content.split(' ').slice(0, 6).join(' ');
    return words.length < prayer.content.length ? words + '...' : words;
  };

  const previewText = getPreviewText();
  const responseCount = prayer.response_count || 0;

  // Render preview bubble content based on content type
  const renderPreviewContent = () => {
    if (isAudioPrayer) {
      return (
        <View style={styles.mediaPreview}>
          <FontAwesome name="microphone" size={14} color="#4169E1" />
          <Text style={styles.mediaDuration}>
            {prayer.media_duration ? `${prayer.media_duration}s` : 'Audio'}
          </Text>
        </View>
      );
    }
    if (isVideoPrayer) {
      return (
        <View style={styles.mediaPreview}>
          <FontAwesome name="video-camera" size={14} color="#4169E1" />
          <Text style={styles.mediaDuration}>
            {prayer.media_duration ? `${prayer.media_duration}s` : 'Video'}
          </Text>
        </View>
      );
    }
    return (
      <Text style={styles.previewText} numberOfLines={1}>
        {previewText}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Preview Bubble - Glassmorphic style */}
      <Animated.View style={[styles.previewBubble, floatingStyle]}>
        <View style={[styles.previewContent, isMediaPrayer && styles.mediaPreviewContent]}>
          {renderPreviewContent()}
        </View>
        {/* Bubble arrow */}
        <View style={styles.bubbleArrow} />
      </Animated.View>

      {/* Main Marker with Glow */}
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.markerContainer, floatingStyle, pressAnimatedStyle]}
      >
        {/* Glow Effect */}
        {!isPrayed && (
          <Animated.View
            style={[
              styles.glow,
              glowStyle,
              { backgroundColor: glowColor },
            ]}
          />
        )}

        {/* Emoji Marker */}
        <View style={[styles.emojiContainer, isPrayed && styles.emojiPrayed]}>
          <Text style={styles.emoji}>{isPrayed ? '✓' : emoji}</Text>
        </View>

        {/* Response Count Badge */}
        {responseCount > 0 && (
          <Animated.View style={[styles.badge, badgeStyle]}>
            <Text style={styles.badgeText}>
              {responseCount > 99 ? '99+' : responseCount}
            </Text>
          </Animated.View>
        )}
      </AnimatedPressable>
    </View>
  );
}

// Memoize to prevent unnecessary re-renders
export const PrayerMarker = memo(PrayerMarkerComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    // Debug: add visible background to confirm marker renders
    // backgroundColor: 'rgba(255,0,0,0.1)',
    minWidth: 60,
    minHeight: 60,
  },
  previewBubble: {
    marginBottom: 4,
  },
  previewContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 160,
    // Glassmorphic shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewText: {
    fontSize: 12,
    color: '#374151', // gray-700
    fontWeight: '500',
  },
  mediaPreviewContent: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mediaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaDuration: {
    fontSize: 12,
    color: '#4169E1',
    fontWeight: '600',
  },
  bubbleArrow: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255, 255, 255, 0.7)',
    marginTop: -1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiPrayed: {
    opacity: 0.6,
  },
  emoji: {
    fontSize: 36,
  },
  badge: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EC4899', // pink-500
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default PrayerMarker;
