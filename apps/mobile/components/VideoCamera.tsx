/**
 * VideoCamera - TikTok/Instagram-style custom video camera
 *
 * UI Layout:
 * - Full-screen camera preview
 * - Top bar: Close (left), Flash toggle (right)
 * - Bottom: Recording timer, Record button, Flip camera
 * - Tap record button to start/stop recording
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoCameraProps {
  onVideoRecorded: (uri: string, duration: number) => void;
  onCancel: () => void;
  onOpenLibrary?: () => void; // Open photo library picker
  maxDuration?: number; // in seconds, default 600 (10 min like TikTok)
}

export function VideoCamera({
  onVideoRecorded,
  onCancel,
  onOpenLibrary,
  maxDuration = 600,
}: VideoCameraProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);

  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // State - default to front camera for selfie-style videos (TikTok default)
  const [facing, setFacing] = useState<CameraType>('front');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Animation for recording indicator
  const recordingScale = useSharedValue(1);
  const recordingOpacity = useSharedValue(1);

  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!micPermission?.granted) {
        await requestMicPermission();
      }
    };
    requestPermissions();
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Recording animation
  useEffect(() => {
    if (isRecording) {
      recordingScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
      recordingOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(recordingScale);
      cancelAnimation(recordingOpacity);
      recordingScale.value = 1;
      recordingOpacity.value = 1;
    }
  }, [isRecording]);

  const recordingIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordingScale.value }],
    opacity: recordingOpacity.value,
  }));

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording || !isCameraReady) return;

    try {
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordingDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsed);

        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);

      // Start recording
      const video = await cameraRef.current.recordAsync({
        maxDuration,
      });

      // Recording finished (either manually stopped or hit max duration)
      if (video?.uri) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        onVideoRecorded(video.uri, duration);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  }, [isRecording, isCameraReady, maxDuration, onVideoRecorded]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsRecording(false);
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
    }
  }, [isRecording]);

  // Toggle camera facing
  const toggleFacing = useCallback(() => {
    if (!isRecording) {
      setFacing(current => (current === 'back' ? 'front' : 'back'));
    }
  }, [isRecording]);

  // Toggle flash
  const toggleFlash = useCallback(() => {
    setFlashEnabled(current => !current);
  }, []);

  // Handle record button press
  const handleRecordPress = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Check permissions
  if (!cameraPermission || !micPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Loading...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={64} color="#fff" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Please grant camera and microphone access to record video prayers.
          </Text>
          <Pressable
            style={styles.permissionButton}
            onPress={async () => {
              await requestCameraPermission();
              await requestMicPermission();
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Access</Text>
          </Pressable>
          <Pressable style={styles.cancelTextButton} onPress={onCancel}>
            <Text style={styles.cancelTextButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Camera Preview */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
        flash={flashEnabled ? 'on' : 'off'}
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.topButton} onPress={onCancel}>
          <Ionicons name="close" size={32} color="#fff" />
        </Pressable>

        <Pressable style={styles.topButton} onPress={toggleFlash}>
          <Ionicons
            name={flashEnabled ? 'flash' : 'flash-off'}
            size={28}
            color={flashEnabled ? '#FFD700' : '#fff'}
          />
        </Pressable>
      </View>

      {/* Recording Timer */}
      {isRecording && (
        <View style={[styles.timerContainer, { top: insets.top + 70 }]}>
          <Animated.View style={[styles.recordingDot, recordingIndicatorStyle]} />
          <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
          <Text style={styles.maxDurationText}>/ {formatDuration(maxDuration)}</Text>
        </View>
      )}

      {/* Bottom Controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 30 }]}>
        {/* Library Button (bottom left - TikTok style) */}
        <Pressable
          style={[styles.sideButton, isRecording && styles.sideButtonDisabled]}
          onPress={onOpenLibrary}
          disabled={isRecording || !onOpenLibrary}
        >
          {onOpenLibrary && (
            <View style={styles.libraryButtonBg}>
              <Ionicons name="images" size={24} color="#fff" />
            </View>
          )}
        </Pressable>

        {/* Record Button */}
        <Pressable
          style={styles.recordButtonOuter}
          onPress={handleRecordPress}
          disabled={!isCameraReady}
        >
          <View
            style={[
              styles.recordButtonInner,
              isRecording && styles.recordButtonInnerRecording,
            ]}
          />
        </Pressable>

        {/* Flip Camera Button */}
        <Pressable
          style={[styles.sideButton, isRecording && styles.sideButtonDisabled]}
          onPress={toggleFacing}
          disabled={isRecording}
        >
          <View style={styles.flipButtonBg}>
            <Ionicons name="camera-reverse" size={24} color="#fff" />
          </View>
        </Pressable>
      </View>

      {/* Instructions */}
      {!isRecording && isCameraReady && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Tap to {isRecording ? 'stop' : 'start'} recording
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF0000',
  },
  timerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  maxDurationText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  sideButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonDisabled: {
    opacity: 0.3,
  },
  flipButtonBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryButtonBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF0050',
  },
  recordButtonInnerRecording: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FF0050',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#FF0050',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelTextButton: {
    marginTop: 20,
    padding: 10,
  },
  cancelTextButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
});

export default VideoCamera;
