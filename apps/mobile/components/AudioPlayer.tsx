import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
  cancelAnimation,
  makeMutable,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { formatDuration } from '@/lib/mediaUpload';

interface AudioPlayerProps {
  uri?: string; // can be undefined if audio hasn't uploaded yet
  duration?: number | null; // optional pre-known duration in seconds
  compact?: boolean; // compact mode for inline display
  autoPlay?: boolean; // auto-start playback when loaded (reduces friction)
}

// Number of bars in the waveform visualization - use max for hook stability
const WAVEFORM_BARS = 32;
const WAVEFORM_BARS_COMPACT = 20;
const MAX_WAVEFORM_BARS = WAVEFORM_BARS; // Always create max for consistent hook count

// Generate pseudo-random but consistent waveform pattern from URI
function generateWaveformPattern(uri: string | undefined, numBars: number): number[] {
  // Handle undefined/null uri
  if (!uri) {
    return new Array(numBars).fill(0.3);
  }

  // Use URI as seed for consistent pattern
  let hash = 0;
  for (let i = 0; i < uri.length; i++) {
    const char = uri.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const pattern: number[] = [];
  for (let i = 0; i < numBars; i++) {
    // Generate smooth wave-like pattern
    const seed = Math.abs((hash + i * 31) % 1000) / 1000;
    const wave = Math.sin(i * 0.3) * 0.2 + 0.3;
    const variation = seed * 0.5;
    pattern.push(Math.min(1, Math.max(0.15, wave + variation)));
  }
  return pattern;
}

export function AudioPlayer({ uri, duration: initialDuration, compact = false, autoPlay = false }: AudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(initialDuration ?? 0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const numBars = compact ? WAVEFORM_BARS_COMPACT : WAVEFORM_BARS;

  // Animation values
  const progressWidth = useSharedValue(0);
  const playPulse = useSharedValue(1);

  // Create shared values for waveform bars using useRef for stable reference
  // We create MAX_WAVEFORM_BARS to ensure consistent hook count regardless of compact mode
  const waveformAnimationsRef = useRef<SharedValue<number>[] | null>(null);

  // Lazy initialization - only create shared values once
  if (waveformAnimationsRef.current === null) {
    waveformAnimationsRef.current = Array.from({ length: MAX_WAVEFORM_BARS }, () =>
      makeMutable(0.15)
    );
  }

  // Get the animations array (guaranteed non-null after initialization)
  const waveformAnimations = waveformAnimationsRef.current;

  // Generate consistent waveform pattern for this audio
  const waveformPattern = useMemo(() =>
    generateWaveformPattern(uri, numBars),
    [uri, numBars]
  );

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Play button pulse animation
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playPulse.value }],
  }));

  // Start/stop waveform animation based on playback
  useEffect(() => {
    if (isPlaying) {
      // Animate only the bars we need (numBars, not all MAX_WAVEFORM_BARS)
      for (let index = 0; index < numBars; index++) {
        const anim = waveformAnimations[index];
        const baseHeight = waveformPattern[index] ?? 0.3;

        anim.value = withRepeat(
          withSequence(
            withTiming(baseHeight * 1.3, {
              duration: 300 + Math.random() * 200,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(baseHeight * 0.7, {
              duration: 300 + Math.random() * 200,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          true
        );
      }

      // Subtle pulse on play button
      playPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      // Reset to static pattern for the bars we use
      for (let index = 0; index < numBars; index++) {
        const anim = waveformAnimations[index];
        cancelAnimation(anim);
        anim.value = withSpring(waveformPattern[index] ?? 0.3, {
          damping: 15,
          stiffness: 120,
        });
      }

      cancelAnimation(playPulse);
      playPulse.value = withTiming(1, { duration: 200 });
    }
  }, [isPlaying, waveformPattern, numBars]);

  // Load sound on mount
  useEffect(() => {
    if (uri) {
      loadSound();
    }

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [uri]);

  const loadSound = useCallback(async () => {
    // Guard against undefined uri
    if (!uri) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Unload existing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // Load new sound
      const { sound, status } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;

      if (status.isLoaded) {
        const loadedDuration = status.durationMillis ? status.durationMillis / 1000 : 0;
        console.log('[AudioPlayer] Loaded audio:', { uri: uri.substring(0, 50), loadedDuration, initialDuration, autoPlay });
        setDuration(loadedDuration > 0 ? loadedDuration : (initialDuration ?? 0));

        // Auto-play if enabled and not already played (reduces friction for user)
        if (autoPlay && !hasAutoPlayed) {
          setHasAutoPlayed(true);
          try {
            await sound.playAsync();
            // Haptic feedback for auto-play start
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
          } catch (playErr) {
            console.warn('[AudioPlayer] Auto-play failed:', playErr);
          }
        }
      } else {
        console.log('[AudioPlayer] Audio status not loaded on create');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load audio:', err);
      setError('Failed to load audio');
      setIsLoading(false);
    }
  }, [uri, initialDuration]);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      const currentPosition = (status.positionMillis ?? 0) / 1000;
      const totalDuration = (status.durationMillis ?? 0) / 1000;

      setPosition(currentPosition);
      setIsPlaying(status.isPlaying);

      // Update duration if we didn't have it before (some formats provide it late)
      if (totalDuration > 0) {
        setDuration((prev) => prev === 0 ? totalDuration : prev);

        progressWidth.value = withTiming((currentPosition / totalDuration) * 100, {
          duration: 100,
        });
      }

      // Reset when finished
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        progressWidth.value = withTiming(0, { duration: 200 });
      }
    }
  }, []);

  const togglePlayback = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      // Haptic feedback (ignore errors for simulator)
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        // If at the end, restart
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.positionMillis >= (status.durationMillis || 0) - 100) {
          await soundRef.current.setPositionAsync(0);
        }
        await soundRef.current.playAsync();
      }
    } catch (err) {
      console.error('Playback error:', err);
    }
  }, [isPlaying]);

  // Waveform bar component
  const WaveformBar = useCallback(({ index, isCompact }: { index: number; isCompact: boolean }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      height: interpolate(
        waveformAnimations[index].value,
        [0, 1],
        isCompact ? [3, 20] : [4, 36],
        Extrapolation.CLAMP
      ),
    }));

    const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
    const barPosition = (index / numBars) * 100;
    const isPassed = barPosition <= progressPercent;

    return (
      <Animated.View
        style={[
          isCompact ? styles.waveformBarCompact : styles.waveformBar,
          animatedStyle,
          isPassed && (isCompact ? styles.waveformBarActiveCompact : styles.waveformBarActive),
        ]}
      />
    );
  }, [position, duration, numBars, waveformAnimations]);

  // Handle undefined uri - show loading state
  if (!uri) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.loadingText, compact && { fontSize: 10 }]}>Loading audio...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={compact ? 14 : 18} color="#DC2626" />
          <Text style={[styles.errorText, compact && styles.errorTextCompact]}>
            Audio unavailable
          </Text>
        </View>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.containerCompact}>
        <Animated.View style={pulseStyle}>
          <Pressable
            style={[
              styles.playButtonCompact,
              isPlaying && styles.playButtonCompactPlaying,
            ]}
            onPress={togglePlayback}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.loadingDot}>•••</Text>
            ) : (
              <FontAwesome
                name={isPlaying ? 'pause' : 'play'}
                size={10}
                color={isPlaying ? '#fff' : '#4169E1'}
                style={!isPlaying && { marginLeft: 2 }}
              />
            )}
          </Pressable>
        </Animated.View>

        {/* Compact Waveform */}
        <View style={styles.waveformContainerCompact}>
          {Array.from({ length: numBars }, (_, index) => (
            <WaveformBar key={index} index={index} isCompact />
          ))}
        </View>

        <Text style={styles.durationCompact}>
          {formatDuration(isPlaying ? position : duration)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Play Button */}
      <Animated.View style={pulseStyle}>
        <Pressable
          style={[
            styles.playButton,
            isPlaying && styles.playButtonPlaying,
          ]}
          onPress={togglePlayback}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.loadingText}>•••</Text>
          ) : (
            <FontAwesome
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color={isPlaying ? '#fff' : '#4169E1'}
              style={!isPlaying && { marginLeft: 3 }}
            />
          )}
        </Pressable>
      </Animated.View>

      {/* Waveform + Progress */}
      <View style={styles.waveformSection}>
        {/* Waveform Visualization */}
        <View style={styles.waveformContainer}>
          {Array.from({ length: numBars }, (_, index) => (
            <WaveformBar key={index} index={index} isCompact={false} />
          ))}
        </View>

        {/* Time Display */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatDuration(position)}</Text>
          <Text style={styles.timeTextDuration}>{formatDuration(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4169E1',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  playButtonPlaying: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  playButtonCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#4169E1',
  },
  playButtonCompactPlaying: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  waveformSection: {
    flex: 1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    gap: 2,
    marginBottom: 8,
  },
  waveformContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 24,
    gap: 2,
  },
  waveformBar: {
    flex: 1,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    minWidth: 3,
    maxWidth: 6,
  },
  waveformBarActive: {
    backgroundColor: '#4169E1',
  },
  waveformBarCompact: {
    flex: 1,
    backgroundColor: '#D1D5DB',
    borderRadius: 1.5,
    minWidth: 2,
    maxWidth: 4,
  },
  waveformBarActiveCompact: {
    backgroundColor: '#4169E1',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 13,
    color: '#4169E1',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timeTextDuration: {
    fontSize: 13,
    color: '#9CA3AF',
    fontVariant: ['tabular-nums'],
  },
  durationCompact: {
    fontSize: 11,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
  },
  errorTextCompact: {
    fontSize: 12,
  },
  loadingDot: {
    color: '#9CA3AF',
    fontSize: 10,
    letterSpacing: 1,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
    letterSpacing: 2,
  },
});

export default AudioPlayer;
