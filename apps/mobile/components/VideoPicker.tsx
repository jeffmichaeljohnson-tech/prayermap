import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { formatDuration } from '@/lib/mediaUpload';
import { VideoTextEditor, TextOverlay } from './VideoTextEditor';
import { VideoCamera } from './VideoCamera';

interface VideoPickerProps {
  onVideoSelected: (uri: string, duration: number, textOverlays?: TextOverlay[]) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds, default 600 (10 min like TikTok)
}

export function VideoPicker({
  onVideoSelected,
  onCancel,
  maxDuration = 600,
}: VideoPickerProps) {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  // Start with camera open immediately (TikTok-style UX)
  const [showCamera, setShowCamera] = useState(true);

  const requestPermissions = useCallback(async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera and photo library access are needed to record and select videos.'
      );
      return false;
    }
    return true;
  }, []);

  // Open custom TikTok-style camera
  const recordVideo = useCallback(() => {
    setShowCamera(true);
  }, []);

  // Handle video recorded from custom camera - go directly to text editor
  const handleVideoRecorded = useCallback((uri: string, duration: number) => {
    setShowCamera(false);
    setVideoUri(uri);
    setVideoDuration(duration);
    setThumbnail(uri);
    // Go directly to text editor
    setShowTextEditor(true);
  }, []);

  // Handle camera cancel - exit the whole picker (TikTok-style: camera IS the picker)
  const handleCameraCancel = useCallback(() => {
    setShowCamera(false);
    onCancel(); // Exit completely when closing camera
  }, [onCancel]);

  // Select video from library - can be called from camera screen or selection screen
  const selectVideo = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: maxDuration,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Check duration (convert ms to seconds for comparison)
        const durationInSeconds = asset.duration ? Math.round(asset.duration / 1000) : 0;
        if (durationInSeconds > maxDuration) {
          Alert.alert(
            'Video Too Long',
            `Please select a video under ${formatDuration(maxDuration)}.`
          );
          return;
        }

        // Close camera if it's open
        setShowCamera(false);

        setVideoUri(asset.uri);
        setVideoDuration(durationInSeconds);
        setThumbnail(asset.uri);

        // Go directly to text editor
        setShowTextEditor(true);
      }
    } catch (error) {
      console.error('Failed to select video:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  }, [maxDuration, requestPermissions]);

  const discardVideo = useCallback(() => {
    Alert.alert(
      'Discard Video?',
      'Are you sure you want to discard this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setVideoUri(null);
            setVideoDuration(0);
            setThumbnail(null);
          },
        },
      ]
    );
  }, []);

  // Open text editor instead of directly confirming
  const openTextEditor = useCallback(() => {
    if (videoUri) {
      setShowTextEditor(true);
    }
  }, [videoUri]);

  // Handle text editor completion - receives video URI and text overlays
  // Don't set showTextEditor to false - just call onVideoSelected and let parent close the modal
  // This prevents the brief black screen flash between text editor closing and modal closing
  const handleTextEditorComplete = useCallback((videoUri: string, overlays: TextOverlay[]) => {
    onVideoSelected(videoUri, videoDuration, overlays);
  }, [videoDuration, onVideoSelected]);

  // Handle text editor cancel - go back to preview
  const handleTextEditorCancel = useCallback(() => {
    setShowTextEditor(false);
  }, []);

  // When camera or text editor is showing, render them directly (not as modals)
  // This prevents the brief flash of the selection screen
  if (showCamera) {
    return (
      <VideoCamera
        onVideoRecorded={handleVideoRecorded}
        onCancel={handleCameraCancel}
        onOpenLibrary={selectVideo}
        maxDuration={maxDuration}
      />
    );
  }

  if (showTextEditor && videoUri) {
    return (
      <VideoTextEditor
        videoUri={videoUri}
        videoDuration={videoDuration}
        onComplete={handleTextEditorComplete}
        onCancel={handleTextEditorCancel}
      />
    );
  }

  // Fallback: show selection screen (shouldn't normally be seen since we start with camera)
  return (
    <View style={styles.container}>
      {!videoUri ? (
        <>
          {/* Video Source Selection */}
          <View style={styles.optionContainer}>
            <Text style={styles.title}>Choose video source</Text>
            <Text style={styles.subtitle}>
              Max duration: {formatDuration(maxDuration)}
            </Text>

            <View style={styles.options}>
              <Pressable style={styles.optionButton} onPress={recordVideo}>
                <View style={styles.optionIconContainer}>
                  <FontAwesome name="video-camera" size={32} color="#4169E1" />
                </View>
                <Text style={styles.optionText}>Record Video</Text>
              </Pressable>

              <Pressable style={styles.optionButton} onPress={selectVideo}>
                <View style={styles.optionIconContainer}>
                  <FontAwesome name="photo" size={32} color="#4169E1" />
                </View>
                <Text style={styles.optionText}>Choose from Library</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </>
      ) : (
        <>
          {/* Video Preview */}
          <View style={styles.previewContainer}>
            {thumbnail && (
              <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
            )}
            <View style={styles.playOverlay}>
              <FontAwesome name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{formatDuration(videoDuration)}</Text>
            </View>
          </View>

          <Text style={styles.previewHint}>
            Video ready to attach
          </Text>

          {/* Controls */}
          <View style={styles.controls}>
            <Pressable style={styles.discardButton} onPress={discardVideo}>
              <FontAwesome name="trash" size={20} color="#DC2626" />
            </Pressable>

            <Pressable style={styles.confirmButton} onPress={openTextEditor}>
              <FontAwesome name="edit" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Add Text</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  optionContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  options: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  previewHint: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  discardButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VideoPicker;
