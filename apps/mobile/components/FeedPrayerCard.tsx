/**
 * FeedPrayerCard - Full-screen prayer card for TikTok-style feed
 * Features:
 * - Dark ethereal map background at city-level zoom
 * - Cinematic camera movement (slow drift/zoom)
 * - Large, centered prayer content
 * - TikTok-style action buttons on the right
 * - View on PrayerMap link to navigate to prayer location
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Mapbox, { MapView, Camera } from '@rnmapbox/maps';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Audio } from 'expo-av';
import Animated, {
  useSharedValue,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Constants from 'expo-constants';
import type { Prayer, TextOverlay } from '@/lib/types/prayer';
import { CATEGORY_COLORS, CATEGORY_EMOJIS, CATEGORY_LABELS } from '@/lib/types/prayer';
import { AudioPlayer } from '@/components/AudioPlayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Initialize Mapbox
const mapboxToken = Constants.expoConfig?.extra?.mapboxToken || process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

// Get font family based on fontStyle for text overlays
function getFontFamily(fontStyle: TextOverlay['fontStyle']): string {
  switch (fontStyle) {
    case 'bold':
      return 'System'; // Will use fontWeight: 'bold'
    case 'serif':
      return 'Georgia';
    case 'script':
      return 'Snell Roundhand'; // iOS script font
    default:
      return 'System';
  }
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface FeedPrayerCardProps {
  prayer: Prayer;
  isVisible: boolean;
  index: number;
}

export function FeedPrayerCard({ prayer, isVisible, index }: FeedPrayerCardProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  // Track current visibility in a ref for use in callbacks (avoids stale closures)
  const isVisibleRef = useRef(isVisible);

  // Keep the ref in sync with the prop
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // State
  const [isMapReady, setIsMapReady] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Video player for video prayers (expo-video)
  const isVideoPrayer = prayer.content_type === 'video' && prayer.media_url;
  const player = useVideoPlayer(isVideoPrayer ? prayer.media_url : null, (player) => {
    player.loop = true;
  });

  // Animation values for cinematic camera movement
  const cameraProgress = useSharedValue(0);

  // Get prayer location
  const [lng, lat] = prayer.location.coordinates;

  // Audio playback for audio prayers (manual control for better visibility sync)
  useEffect(() => {
    if (prayer.content_type !== 'audio' || !prayer.media_url) return;

    const loadAndPlayAudio = async () => {
      try {
        // Configure audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        // Unload existing
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }

        // Load new sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: prayer.media_url! },
          { shouldPlay: isVisibleRef.current, isLooping: false },
          (status) => {
            if (status.isLoaded) {
              setIsAudioPlaying(status.isPlaying);
              // When audio finishes, loop only if still visible (use ref to avoid stale closure)
              if (status.didJustFinish) {
                sound.setPositionAsync(0);
                if (isVisibleRef.current) {
                  sound.playAsync();
                }
              }
            }
          }
        );

        soundRef.current = sound;
      } catch (err) {
        console.error('[FeedPrayerCard] Audio load error:', err);
      }
    };

    loadAndPlayAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [prayer.media_url, prayer.content_type]);

  // Handle audio play/pause based on visibility
  useEffect(() => {
    if (prayer.content_type === 'audio' && soundRef.current) {
      if (isVisible) {
        soundRef.current.playAsync();
      } else {
        soundRef.current.pauseAsync();
        soundRef.current.setPositionAsync(0);
      }
    }
  }, [isVisible, prayer.content_type]);

  // Cinematic camera animation - slow drift when visible
  useEffect(() => {
    if (isVisible && isMapReady && cameraRef.current) {
      // Start cinematic camera movement
      cameraProgress.value = 0;
      cameraProgress.value = withRepeat(
        withTiming(1, {
          duration: 30000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );

      // City-level zoom (10-11) instead of street-level (14)
      const driftDistance = 0.02; // Larger drift for city level
      cameraRef.current.setCamera({
        centerCoordinate: [lng, lat],
        zoomLevel: 10,
        pitch: 45,
        heading: 0,
        animationDuration: 0,
      });

      // Animate camera drift
      const interval = setInterval(() => {
        if (cameraRef.current) {
          const progress = cameraProgress.value;
          const offsetLng = Math.sin(progress * Math.PI * 2) * driftDistance;
          const offsetLat = Math.cos(progress * Math.PI * 2) * driftDistance * 0.5;
          const heading = progress * 20;

          cameraRef.current.setCamera({
            centerCoordinate: [lng + offsetLng, lat + offsetLat],
            zoomLevel: 10 + Math.sin(progress * Math.PI) * 0.3,
            pitch: 45,
            heading: heading,
            animationDuration: 2000,
          });
        }
      }, 2000);

      return () => {
        clearInterval(interval);
        cancelAnimation(cameraProgress);
      };
    }
  }, [isVisible, isMapReady, lng, lat]);

  // Handle video playback based on visibility
  useEffect(() => {
    if (isVideoPrayer && player) {
      if (isVisible) {
        player.muted = false;
        player.play();
      } else {
        // Mute first to immediately stop audio, then pause
        player.muted = true;
        player.pause();
        player.currentTime = 0;
      }
    }
  }, [isVisible, isVideoPrayer, player]);

  // Navigate to prayer on map
  const handleViewOnMap = useCallback(() => {
    // Navigate to map tab with prayer coordinates and open modal
    router.push({
      pathname: '/(tabs)',
      params: {
        viewPrayerId: prayer.id,
        lat: lat.toString(),
        lng: lng.toString(),
      },
    });
  }, [router, prayer.id, lat, lng]);

  // Action button press handlers
  const handlePray = useCallback(() => {
    console.log('Pray pressed for:', prayer.id);
    // TODO: Implement pray action with slide-out
  }, [prayer.id]);

  const handleBookmark = useCallback(() => {
    console.log('Bookmark pressed for:', prayer.id);
  }, [prayer.id]);

  const handleShare = useCallback(() => {
    console.log('Share pressed for:', prayer.id);
  }, [prayer.id]);

  const handleReport = useCallback(() => {
    console.log('Report pressed for:', prayer.id);
    // Report functionality will be handled by parent component
  }, [prayer.id]);

  const handleAmen = useCallback(() => {
    console.log('Amen pressed for:', prayer.id);
  }, [prayer.id]);

  return (
    <View style={styles.container}>
      {/* Full-screen video background for video prayers */}
      {isVideoPrayer && player && (
        <View style={styles.fullScreenVideoContainer}>
          <VideoView
            player={player}
            style={styles.fullScreenVideo}
            contentFit="cover"
            nativeControls={false}
          />
          {/* Dark overlay for better text readability on video */}
          <View style={styles.videoOverlay} />

          {/* Render text overlays on top of video */}
          {prayer.text_overlays && prayer.text_overlays.length > 0 && (
            <View style={styles.textOverlayContainer} pointerEvents="none">
              {prayer.text_overlays.map((overlay) => (
                <Text
                  key={overlay.id}
                  style={[
                    styles.textOverlayText,
                    {
                      position: 'absolute',
                      left: overlay.x * SCREEN_WIDTH,
                      top: overlay.y * SCREEN_HEIGHT,
                      color: overlay.color,
                      fontFamily: getFontFamily(overlay.fontStyle),
                      fontWeight: overlay.fontStyle === 'bold' ? 'bold' : 'normal',
                      transform: [
                        { translateX: -50 }, // Center horizontally
                        { translateY: -12 }, // Center vertically (approx half line height)
                        { scale: overlay.scale },
                        { rotate: `${overlay.rotation}deg` },
                      ],
                    },
                  ]}
                >
                  {overlay.text}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Dark Ethereal Map Background (only for non-video prayers) */}
      {!isVideoPrayer && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            styleURL="mapbox://styles/mapbox/dark-v11"
            projection="globe"
            onDidFinishLoadingMap={() => setIsMapReady(true)}
            logoEnabled={false}
            attributionEnabled={false}
            scaleBarEnabled={false}
            compassEnabled={false}
            zoomEnabled={false}
            scrollEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Camera
              ref={cameraRef}
              defaultSettings={{
                centerCoordinate: [lng, lat],
                zoomLevel: 10,
                pitch: 45,
                heading: 0,
              }}
            />
          </MapView>

          {/* Dark overlay for better text readability */}
          <View style={styles.darkOverlay} />

          {/* Vignette effect */}
          <View style={styles.vignetteTop} />
          <View style={styles.vignetteBottom} />
        </View>
      )}

      {/* Category badge - upper left corner */}
      <View style={[styles.categoryBadge, { top: insets.top + 12, backgroundColor: CATEGORY_COLORS[prayer.category] + '50' }]}>
        <Text style={styles.categoryEmoji}>{CATEGORY_EMOJIS[prayer.category]}</Text>
        <Text style={[styles.categoryText, { color: CATEGORY_COLORS[prayer.category] }]}>
          {CATEGORY_LABELS[prayer.category]}
        </Text>
      </View>

      {/* Main Content - Centered and Large */}
      <View style={[styles.mainContent, { paddingTop: insets.top + 60 }]}>
        {/* Prayer Content - LARGE and CENTERED */}
        <View style={styles.prayerContentContainer}>
          {prayer.content_type === 'text' && (
            <View style={styles.textPrayerContainer}>
              {prayer.title && (
                <Text style={styles.prayerTitleLarge}>{prayer.title}</Text>
              )}
              <Text style={styles.prayerTextLarge} numberOfLines={12}>
                {prayer.content}
              </Text>
            </View>
          )}

          {prayer.content_type === 'audio' && (
            <View style={styles.audioPrayerContainer}>
              {prayer.title && (
                <Text style={styles.prayerTitleLarge}>{prayer.title}</Text>
              )}
              {/* Large audio waveform visualization placeholder */}
              <View style={styles.audioVisualizerLarge}>
                <View style={styles.audioIconContainer}>
                  <Text style={styles.audioIcon}>
                    {isAudioPlaying ? '🔊' : '🎧'}
                  </Text>
                  <Text style={styles.audioStatusText}>
                    {isAudioPlaying ? 'Playing...' : 'Audio Prayer'}
                  </Text>
                </View>
                {/* Animated waveform bars */}
                <View style={styles.waveformBarsLarge}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.waveformBar,
                        {
                          height: 20 + Math.random() * 60,
                          opacity: isAudioPlaying ? 0.8 : 0.4,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
              {prayer.content && (
                <Text style={styles.audioCaption} numberOfLines={3}>
                  "{prayer.content}"
                </Text>
              )}
            </View>
          )}

          {/* Video prayers render as full-screen background - no text overlay needed */}
        </View>

        {/* User info and View on Map link */}
        <View style={styles.bottomInfo}>
          <View style={styles.userInfo}>
            <FontAwesome name="user-circle" size={18} color="#fff" />
            <Text style={styles.userName}>
              {prayer.is_anonymous ? 'Anonymous' : prayer.user_name || 'Someone'}
            </Text>
            <Text style={styles.timeAgo}>• {formatRelativeTime(prayer.created_at)}</Text>
          </View>

          {/* Response count */}
          {(prayer.response_count ?? 0) > 0 && (
            <View style={styles.responseInfo}>
              <FontAwesome name="heart" size={14} color="#EC4899" />
              <Text style={styles.responseText}>
                {prayer.response_count} {prayer.response_count === 1 ? 'prayer' : 'prayers'}
              </Text>
            </View>
          )}

          {/* View on PrayerMap link */}
          <Pressable style={styles.viewOnMapButton} onPress={handleViewOnMap}>
            <FontAwesome name="map-marker" size={14} color="#4169E1" />
            <Text style={styles.viewOnMapText}>View on PrayerMap</Text>
          </Pressable>
        </View>
      </View>

      {/* Right side - Action buttons (TikTok style) */}
      <View style={[styles.actionButtons, { bottom: insets.bottom + 100 }]}>
        {/* Pray button - now with prayer hands emoji */}
        <Pressable style={styles.actionButton} onPress={handlePray}>
          <View style={styles.actionIconContainer}>
            <Text style={styles.prayEmoji}>🙏</Text>
          </View>
          <Text style={styles.actionLabel}>Pray</Text>
        </Pressable>

        {/* Amen button - now with heart icon */}
        <Pressable style={styles.actionButton} onPress={handleAmen}>
          <View style={[styles.actionIconContainer, styles.amenIconContainer]}>
            <FontAwesome name="heart" size={26} color="#EC4899" />
          </View>
          <Text style={styles.actionLabel}>Amen</Text>
        </Pressable>

        {/* Bookmark button */}
        <Pressable style={styles.actionButton} onPress={handleBookmark}>
          <View style={styles.actionIconContainer}>
            <FontAwesome name="bookmark-o" size={26} color="#fff" />
          </View>
          <Text style={styles.actionLabel}>Save</Text>
        </Pressable>

        {/* Share button */}
        <Pressable style={styles.actionButton} onPress={handleShare}>
          <View style={styles.actionIconContainer}>
            <FontAwesome name="share" size={24} color="#fff" />
          </View>
          <Text style={styles.actionLabel}>Share</Text>
        </Pressable>

        {/* Report button - more subtle styling */}
        <Pressable style={styles.actionButton} onPress={handleReport}>
          <View style={[styles.actionIconContainer, styles.reportIconContainer]}>
            <FontAwesome name="flag-o" size={20} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={[styles.actionLabel, styles.reportLabel]}>Report</Text>
        </Pressable>
      </View>

      {/* Prayer counter */}
      <View style={[styles.counter, { top: insets.top + 12 }]}>
        <Text style={styles.counterText}>{index + 1}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    flex: 1,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'transparent',
    // Gradient simulation with opacity
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  categoryEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  prayerContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  textPrayerContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  prayerTitleLarge: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  prayerTextLarge: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    fontWeight: '500',
  },
  audioPrayerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  audioVisualizerLarge: {
    alignItems: 'center',
    marginVertical: 24,
  },
  audioIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  audioIcon: {
    fontSize: 60,
    marginBottom: 8,
  },
  audioStatusText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  waveformBarsLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 80,
  },
  waveformBar: {
    width: 6,
    backgroundColor: '#4169E1',
    borderRadius: 3,
  },
  audioCaption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  fullScreenVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  fullScreenVideo: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  textOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  textOverlayText: {
    fontSize: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  videoCaptionContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  videoCaption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  bottomInfo: {
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginLeft: 8,
  },
  responseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  responseText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  viewOnMapText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 18,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  amenIconContainer: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  prayEmoji: {
    fontSize: 28,
  },
  reportIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reportLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
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
});

export default FeedPrayerCard;
