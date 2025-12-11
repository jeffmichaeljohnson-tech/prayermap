import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, Alert, Platform } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { formatDuration } from '@/lib/mediaUpload';

interface AudioRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds, default 120 (2 minutes)
}

// Modern iOS-optimized recording settings
// AAC-LC codec in M4A container - best compatibility and quality for speech
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MAX,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/mp4',
    bitsPerSecond: 128000,
  },
};

// Number of bars in the waveform visualization
const WAVEFORM_BARS = 40;

export function AudioRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 120,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [meterLevel, setMeterLevel] = useState(-160); // dB level

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformData = useRef<number[]>(new Array(WAVEFORM_BARS).fill(0));

  // Animation values
  const pulseScale = useSharedValue(1);
  const recordingProgress = useSharedValue(0);
  const waveformAnimations = useRef(
    new Array(WAVEFORM_BARS).fill(0).map(() => useSharedValue(0.1))
  ).current;

  // Pulse animation style
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: interpolate(pulseScale.value, [1, 1.3], [1, 0.5], Extrapolation.CLAMP),
  }));

  // Start pulse animation when recording
  useEffect(() => {
    if (isRecording && !isPaused) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording, isPaused]);

  // Timer and metering
  useEffect(() => {
    if (isRecording && !isPaused) {
      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration(d => {
          const newDuration = d + 1;
          recordingProgress.value = withTiming(newDuration / maxDuration, { duration: 1000 });
          if (newDuration >= maxDuration) {
            stopRecording();
            return d;
          }
          return newDuration;
        });
      }, 1000);

      // Audio metering for waveform
      meterRef.current = setInterval(async () => {
        if (recordingRef.current) {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            const db = status.metering;
            setMeterLevel(db);

            // Normalize dB to 0-1 range (-60dB to 0dB)
            const normalized = Math.max(0, Math.min(1, (db + 60) / 60));

            // Shift waveform data and add new value
            waveformData.current.shift();
            waveformData.current.push(normalized);

            // Update waveform animations
            waveformData.current.forEach((value, index) => {
              waveformAnimations[index].value = withSpring(Math.max(0.1, value), {
                damping: 15,
                stiffness: 150,
              });
            });
          }
        }
      }, 50);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (meterRef.current) {
        clearInterval(meterRef.current);
        meterRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (meterRef.current) clearInterval(meterRef.current);
    };
  }, [isRecording, isPaused, maxDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      console.log('[AudioRecorder] Starting recording...');

      // Request permissions FIRST - this is critical for UX
      // Permission dialog must appear immediately on first tap
      console.log('[AudioRecorder] Requesting permissions...');
      const { status } = await Audio.requestPermissionsAsync();
      console.log('[AudioRecorder] Permission status:', status);
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed to record audio.');
        return;
      }

      // Haptic feedback AFTER permission granted (don't await - fire and forget)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Configure audio mode for recording
      console.log('[AudioRecorder] Configuring audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      console.log('[AudioRecorder] Audio mode configured');

      // Create and start recording with optimized settings
      console.log('[AudioRecorder] Creating recording with options:', JSON.stringify(RECORDING_OPTIONS.ios));
      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      console.log('[AudioRecorder] Recording created successfully');

      recordingRef.current = recording;
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setHasRecording(false);
      setRecordingUri(null);
      recordingProgress.value = 0;

      // Reset waveform
      waveformData.current = new Array(WAVEFORM_BARS).fill(0);
      waveformAnimations.forEach(anim => {
        anim.value = 0.1;
      });

      console.log('[AudioRecorder] Recording started successfully');
    } catch (error: any) {
      console.error('[AudioRecorder] Failed to start recording:', error);
      console.error('[AudioRecorder] Error details:', JSON.stringify(error, null, 2));
      // More helpful error message
      const isSimulator = error?.message?.includes('simulator') || error?.message?.includes('Simulator');
      if (isSimulator) {
        Alert.alert(
          'Simulator Limitation',
          'Audio recording requires a physical device. Please test on a real iPhone.'
        );
      } else {
        Alert.alert('Recording Error', `Failed to start recording: ${error?.message || 'Unknown error'}`);
      }
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) return;

      // Haptic feedback (ignore errors for simulator)
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      setIsRecording(false);
      setIsPaused(false);
      setHasRecording(true);
      setRecordingUri(uri);
      recordingRef.current = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, []);

  const playRecording = useCallback(async () => {
    if (!recordingUri) return;

    try {
      // Haptic feedback (ignore errors for simulator)
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      // Unload any existing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Load and play
      const { sound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setIsPlaying(true);

      // Set up playback status handler
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Failed to play recording:', error);
    }
  }, [recordingUri]);

  const stopPlayback = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setIsPlaying(false);
    }
  }, []);

  const discardRecording = useCallback(() => {
    // Haptic feedback (ignore errors for simulator)
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    Alert.alert(
      'Discard Recording?',
      'Are you sure you want to discard this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setHasRecording(false);
            setRecordingUri(null);
            setDuration(0);
            onCancel();
          },
        },
      ]
    );
  }, [onCancel]);

  const confirmRecording = useCallback(async () => {
    if (recordingUri) {
      // Haptic feedback (ignore errors for simulator)
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onRecordingComplete(recordingUri, duration);
    }
  }, [recordingUri, duration, onRecordingComplete]);

  // Waveform bar component
  const WaveformBar = ({ index }: { index: number }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      height: interpolate(
        waveformAnimations[index].value,
        [0, 1],
        [4, 40],
        Extrapolation.CLAMP
      ),
    }));

    return (
      <Animated.View
        style={[
          styles.waveformBar,
          animatedStyle,
          isRecording && styles.waveformBarActive,
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Waveform Visualization */}
      <View style={styles.waveformContainer}>
        {waveformAnimations.map((_, index) => (
          <WaveformBar key={index} index={index} />
        ))}
      </View>

      {/* Recording Indicator & Timer */}
      <View style={styles.timerContainer}>
        {isRecording && (
          <Animated.View style={[styles.recordingIndicator, pulseStyle]} />
        )}
        {hasRecording && !isRecording && (
          <View style={styles.completedIcon}>
            <FontAwesome name="check" size={20} color="#10B981" />
          </View>
        )}
        <Text style={styles.timer}>
          {formatDuration(duration)}
        </Text>
        <Text style={styles.maxDuration}>
          / {formatDuration(maxDuration)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${(duration / maxDuration) * 100}%` },
            isRecording && styles.progressBarRecording,
            hasRecording && styles.progressBarComplete,
          ]}
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isRecording && !hasRecording && (
          <>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.recordButton} onPress={startRecording}>
              <View style={styles.recordButtonInner}>
                <FontAwesome name="microphone" size={28} color="#fff" />
              </View>
            </Pressable>
            <View style={styles.spacer} />
          </>
        )}

        {isRecording && (
          <>
            <View style={styles.spacer} />
            <Pressable style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopButtonInner} />
            </Pressable>
            <View style={styles.spacer} />
          </>
        )}

        {hasRecording && !isRecording && (
          <>
            <Pressable style={styles.discardButton} onPress={discardRecording}>
              <FontAwesome name="trash" size={18} color="#DC2626" />
            </Pressable>
            <Pressable
              style={styles.playButton}
              onPress={isPlaying ? stopPlayback : playRecording}
            >
              <FontAwesome
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color="#4169E1"
              />
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={confirmRecording}>
              <FontAwesome name="check" size={18} color="#fff" />
            </Pressable>
          </>
        )}
      </View>

      {/* Hint Text */}
      <Text style={styles.hint}>
        {!isRecording && !hasRecording && 'Tap to start recording your prayer'}
        {isRecording && 'Recording... Tap the stop button when finished'}
        {hasRecording && 'Preview your recording before sharing'}
      </Text>

      {/* Format Badge */}
      <View style={styles.formatBadge}>
        <FontAwesome name="volume-up" size={10} color="#6B7280" />
        <Text style={styles.formatText}>High Quality Audio (AAC)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 2,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  waveformBarActive: {
    backgroundColor: '#4169E1',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
  },
  completedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    fontSize: 36,
    fontWeight: '200',
    color: '#1a1a1a',
    fontVariant: ['tabular-nums'],
  },
  maxDuration: {
    fontSize: 18,
    fontWeight: '300',
    color: '#9CA3AF',
    fontVariant: ['tabular-nums'],
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 28,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#9CA3AF',
    borderRadius: 2,
  },
  progressBarRecording: {
    backgroundColor: '#DC2626',
  },
  progressBarComplete: {
    backgroundColor: '#10B981',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 20,
  },
  spacer: {
    width: 56,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  recordButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4169E1',
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  discardButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  hint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  formatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  formatText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default AudioRecorder;
