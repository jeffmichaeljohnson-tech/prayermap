import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCreatePrayerStore } from '@/lib/useCreatePrayer';
import type { PrayerCategory } from '@/lib/types/prayer';
import { CATEGORY_EMOJIS } from '@/lib/types/prayer';
import { AudioRecorder } from './AudioRecorder';
import { AudioPlayer } from './AudioPlayer';
import { VideoPicker } from './VideoPicker';
import { TextOverlay } from './VideoTextEditor';
import { SuccessAnimation } from './SuccessAnimation';

type ContentType = 'text' | 'audio' | 'video';

interface CreatePrayerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (location?: { lat: number; lng: number }) => void;
}

// Simplified to 3 main categories for frictionless UX
const CATEGORIES: { value: PrayerCategory; label: string }[] = [
  { value: 'pray_for', label: 'Pray For' },
  { value: 'prayer_request', label: 'Prayer Request' },
  { value: 'gratitude', label: 'Gratitude' },
];

export function CreatePrayerModal({ visible, onClose, onSuccess }: CreatePrayerModalProps) {
  const insets = useSafeAreaInsets();
  const { createPrayer, isCreating, error, clearError } = useCreatePrayerStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PrayerCategory>('prayer_request');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [contentType, setContentType] = useState<ContentType>('text');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showRecorder, setShowRecorder] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoTextOverlays, setVideoTextOverlays] = useState<TextOverlay[]>([]);
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdPrayerLocation, setCreatedPrayerLocation] = useState<{ lat: number; lng: number } | null>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setCategory('prayer_request');
    setIsAnonymous(false);
    setContentType('text');
    setAudioUri(null);
    setAudioDuration(0);
    setShowRecorder(false);
    setVideoUri(null);
    setVideoDuration(0);
    setVideoTextOverlays([]);
    setShowVideoPicker(false);
    setCreatedPrayerLocation(null);
    clearError();
  }, [clearError]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleRecordingComplete = useCallback((uri: string, duration: number) => {
    setAudioUri(uri);
    setAudioDuration(duration);
    setShowRecorder(false);
  }, []);

  const handleRecordingCancel = useCallback(() => {
    setShowRecorder(false);
  }, []);

  const handleClearAudio = useCallback(() => {
    setAudioUri(null);
    setAudioDuration(0);
  }, []);

  const handleVideoSelected = useCallback((uri: string, duration: number, textOverlays?: TextOverlay[]) => {
    setVideoUri(uri);
    setVideoDuration(duration);
    setVideoTextOverlays(textOverlays || []);
    setShowVideoPicker(false);
  }, []);

  const handleVideoCancel = useCallback(() => {
    setShowVideoPicker(false);
  }, []);

  const handleClearVideo = useCallback(() => {
    setVideoUri(null);
    setVideoDuration(0);
    setVideoTextOverlays([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validation based on content type
    if (contentType === 'text' && !content.trim()) {
      return;
    }
    if (contentType === 'audio' && !audioUri) {
      return;
    }
    if (contentType === 'video' && !videoUri) {
      return;
    }

    // Determine media URI and duration based on content type
    const mediaUri = contentType === 'audio' ? audioUri : contentType === 'video' ? videoUri : undefined;
    const mediaDuration = contentType === 'audio' ? audioDuration : contentType === 'video' ? videoDuration : undefined;

    // Generate content text for media types
    let contentText = content.trim();
    if (contentType === 'audio') {
      contentText = `[Audio prayer - ${Math.floor(audioDuration)}s]`;
    } else if (contentType === 'video') {
      contentText = `[Video prayer - ${Math.floor(videoDuration)}s]`;
    }

    const result = await createPrayer({
      title: title.trim() || undefined,
      content: contentText,
      category,
      isAnonymous,
      contentType,
      mediaUri: mediaUri || undefined,
      mediaDuration: mediaDuration || undefined,
      textOverlays: contentType === 'video' ? videoTextOverlays : undefined,
    });

    if (result.success) {
      // Store location for zooming after success animation
      if (result.location) {
        setCreatedPrayerLocation(result.location);
      }
      setShowSuccess(true);
    }
  }, [title, content, category, isAnonymous, contentType, audioUri, audioDuration, videoUri, videoDuration, videoTextOverlays, createPrayer]);

  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false);
    const location = createdPrayerLocation;
    resetForm();
    onSuccess(location || undefined);
  }, [resetForm, onSuccess, createdPrayerLocation]);

  const isValid =
    (contentType === 'text' && content.trim().length > 0) ||
    (contentType === 'audio' && !!audioUri) ||
    (contentType === 'video' && !!videoUri);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top || 20 }]}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <FontAwesome name="times" size={24} color="#666" />
          </Pressable>
          <Text style={styles.headerTitle}>New Prayer</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Content Type Selector */}
          <View style={styles.contentTypeTabs}>
            <Pressable
              style={[
                styles.contentTypeTab,
                contentType === 'text' && styles.contentTypeTabActive,
              ]}
              onPress={() => setContentType('text')}
            >
              <FontAwesome
                name="pencil"
                size={16}
                color={contentType === 'text' ? '#4169E1' : '#6B7280'}
              />
              <Text
                style={[
                  styles.contentTypeTabText,
                  contentType === 'text' && styles.contentTypeTabTextActive,
                ]}
              >
                Text
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.contentTypeTab,
                contentType === 'audio' && styles.contentTypeTabActive,
              ]}
              onPress={() => {
                setContentType('audio');
                // Immediately show full recorder (skip the intermediate tap step)
                if (!audioUri) {
                  setShowRecorder(true);
                }
              }}
            >
              <FontAwesome
                name="microphone"
                size={16}
                color={contentType === 'audio' ? '#4169E1' : '#6B7280'}
              />
              <Text
                style={[
                  styles.contentTypeTabText,
                  contentType === 'audio' && styles.contentTypeTabTextActive,
                ]}
              >
                Audio
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.contentTypeTab,
                contentType === 'video' && styles.contentTypeTabActive,
              ]}
              onPress={() => {
                setContentType('video');
                // Immediately show video picker (skip the intermediate tap step)
                if (!videoUri) {
                  setShowVideoPicker(true);
                }
              }}
            >
              <FontAwesome
                name="video-camera"
                size={16}
                color={contentType === 'video' ? '#4169E1' : '#6B7280'}
              />
              <Text
                style={[
                  styles.contentTypeTabText,
                  contentType === 'video' && styles.contentTypeTabTextActive,
                ]}
              >
                Video
              </Text>
            </Pressable>
          </View>

          {/* Category Selection - placed before content for clearer flow */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    category === cat.value && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={styles.categoryEmoji}>
                    {CATEGORY_EMOJIS[cat.value]}
                  </Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      category === cat.value && styles.categoryLabelSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Title Input (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title (optional)</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Give your prayer a title..."
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
          </View>

          {/* Content Input - Text Mode */}
          {contentType === 'text' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Prayer</Text>
              <TextInput
                style={styles.contentInput}
                value={content}
                onChangeText={setContent}
                placeholder="Share what's on your heart..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.charCount}>{content.length}/2000</Text>
            </View>
          )}

          {/* Content Input - Audio Mode */}
          {contentType === 'audio' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Record Your Prayer</Text>
              {showRecorder ? (
                <View style={styles.recorderContainer}>
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    onCancel={handleRecordingCancel}
                    maxDuration={120}
                  />
                </View>
              ) : audioUri ? (
                <View style={styles.audioPreview}>
                  <AudioPlayer uri={audioUri} duration={audioDuration} />
                  <View style={styles.audioActions}>
                    <Pressable
                      style={styles.reRecordButton}
                      onPress={() => {
                        handleClearAudio();
                        setShowRecorder(true);
                      }}
                    >
                      <FontAwesome name="refresh" size={14} color="#4169E1" />
                      <Text style={styles.reRecordText}>Re-record</Text>
                    </Pressable>
                    <Pressable
                      style={styles.removeAudioButton}
                      onPress={handleClearAudio}
                    >
                      <FontAwesome name="trash-o" size={14} color="#DC2626" />
                      <Text style={styles.removeAudioText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={styles.startRecordButton}
                  onPress={() => setShowRecorder(true)}
                >
                  <View style={styles.micCircle}>
                    <FontAwesome name="microphone" size={24} color="#fff" />
                  </View>
                  <Text style={styles.startRecordText}>
                    Tap to record your prayer
                  </Text>
                  <Text style={styles.startRecordHint}>
                    Up to 2 minutes
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Content Input - Video Mode */}
          {contentType === 'video' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Record Video Prayer</Text>
              {showVideoPicker ? (
                <View style={styles.videoPickerContainer}>
                  <VideoPicker
                    onVideoSelected={handleVideoSelected}
                    onCancel={handleVideoCancel}
                    maxDuration={60}
                  />
                </View>
              ) : videoUri ? (
                <View style={styles.videoPreview}>
                  <View style={styles.videoThumbnail}>
                    <FontAwesome name="video-camera" size={32} color="#4169E1" />
                    <Text style={styles.videoDurationText}>
                      {Math.floor(videoDuration)}s video ready
                    </Text>
                  </View>
                  <View style={styles.videoActions}>
                    <Pressable
                      style={styles.reRecordButton}
                      onPress={() => {
                        handleClearVideo();
                        setShowVideoPicker(true);
                      }}
                    >
                      <FontAwesome name="refresh" size={14} color="#4169E1" />
                      <Text style={styles.reRecordText}>Re-record</Text>
                    </Pressable>
                    <Pressable
                      style={styles.removeAudioButton}
                      onPress={handleClearVideo}
                    >
                      <FontAwesome name="trash-o" size={14} color="#DC2626" />
                      <Text style={styles.removeAudioText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={styles.startRecordButton}
                  onPress={() => setShowVideoPicker(true)}
                >
                  <View style={[styles.micCircle, { backgroundColor: '#4169E1' }]}>
                    <FontAwesome name="video-camera" size={24} color="#fff" />
                  </View>
                  <Text style={styles.startRecordText}>
                    Tap to record your video prayer
                  </Text>
                  <Text style={styles.startRecordHint}>
                    Up to 1 minute
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Anonymous Toggle */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleInfo}>
              <FontAwesome name="user-secret" size={20} color="#666" />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Post Anonymously</Text>
                <Text style={styles.toggleHint}>
                  Your name won't be shown with this prayer
                </Text>
              </View>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={isAnonymous ? '#4169E1' : '#f4f3f4'}
            />
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <FontAwesome name="exclamation-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
          <Pressable
            style={[
              styles.submitButton,
              (!isValid || isCreating) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isValid || isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <FontAwesome name="paper-plane" size={18} color="#fff" />
                <Text style={styles.submitButtonText}>Share Prayer</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Success Animation */}
        <SuccessAnimation
          visible={showSuccess}
          message="Prayer Shared!"
          onComplete={handleSuccessComplete}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 8,
    width: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contentInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    margin: 4,
    gap: 6,
  },
  categoryButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#4169E1',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  categoryLabelSelected: {
    color: '#4169E1',
    fontWeight: '500',
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  toggleHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Content Type Tabs
  contentTypeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  contentTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  contentTypeTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contentTypeTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  contentTypeTabTextActive: {
    color: '#4169E1',
  },
  // Audio Recording
  recorderContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  audioPreview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  audioActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  reRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  reRecordText: {
    fontSize: 14,
    color: '#4169E1',
    fontWeight: '500',
  },
  removeAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  removeAudioText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  startRecordButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 32,
    alignItems: 'center',
  },
  micCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  startRecordText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  startRecordHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  comingSoon: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 40,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  // Video styles
  videoPickerContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  videoPreview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  videoThumbnail: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDurationText: {
    fontSize: 14,
    color: '#4169E1',
    fontWeight: '500',
    marginTop: 8,
  },
  videoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
});

export default CreatePrayerModal;
