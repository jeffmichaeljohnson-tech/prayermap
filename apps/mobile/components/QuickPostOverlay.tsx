import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreatePrayerStore } from '@/lib/useCreatePrayer';
import type { PrayerCategory } from '@/lib/types/prayer';
import { AudioPlayer } from './AudioPlayer';
import { SuccessAnimation } from './SuccessAnimation';

type ContentType = 'text' | 'audio' | 'video';

interface QuickPostOverlayProps {
  visible: boolean;
  contentType: ContentType;
  // For text
  textContent?: string;
  // For audio
  audioUri?: string;
  audioDuration?: number;
  // For video
  videoUri?: string;
  videoDuration?: number;
  // Callbacks
  onClose: () => void;
  onSuccess: (location?: { lat: number; lng: number }) => void;
}

const CATEGORIES: { value: PrayerCategory; label: string; emoji: string }[] = [
  { value: 'pray_for', label: 'Pray For', emoji: '🙏' },
  { value: 'prayer_request', label: 'Request', emoji: '💙' },
  { value: 'gratitude', label: 'Gratitude', emoji: '💛' },
];

export function QuickPostOverlay({
  visible,
  contentType,
  textContent = '',
  audioUri,
  audioDuration = 0,
  videoUri,
  videoDuration = 0,
  onClose,
  onSuccess,
}: QuickPostOverlayProps) {
  const insets = useSafeAreaInsets();
  const { createPrayer, isCreating, error, clearError } = useCreatePrayerStore();

  const [category, setCategory] = useState<PrayerCategory>('prayer_request');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(textContent);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdLocation, setCreatedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const resetForm = useCallback(() => {
    setCategory('prayer_request');
    setTitle('');
    setContent('');
    setIsAnonymous(false);
    setShowTitleInput(false);
    setCreatedLocation(null);
    clearError();
  }, [clearError]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(async () => {
    // Generate content text based on type
    let contentText = content.trim();
    if (contentType === 'audio') {
      contentText = `[Audio prayer - ${Math.floor(audioDuration)}s]`;
    } else if (contentType === 'video') {
      contentText = `[Video prayer - ${Math.floor(videoDuration)}s]`;
    }

    if (contentType === 'text' && !contentText) {
      return;
    }

    const mediaUri = contentType === 'audio' ? audioUri : contentType === 'video' ? videoUri : undefined;
    const mediaDuration = contentType === 'audio' ? audioDuration : contentType === 'video' ? videoDuration : undefined;

    const result = await createPrayer({
      title: title.trim() || undefined,
      content: contentText,
      category,
      isAnonymous,
      contentType,
      mediaUri: mediaUri || undefined,
      mediaDuration: mediaDuration || undefined,
    });

    if (result.success) {
      if (result.location) {
        setCreatedLocation(result.location);
      }
      setShowSuccess(true);
    }
  }, [content, contentType, audioDuration, videoDuration, audioUri, videoUri, title, category, isAnonymous, createPrayer]);

  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false);
    const location = createdLocation;
    resetForm();
    onSuccess(location || undefined);
  }, [resetForm, onSuccess, createdLocation]);

  const isValid =
    (contentType === 'text' && content.trim().length > 0) ||
    (contentType === 'audio' && !!audioUri) ||
    (contentType === 'video' && !!videoUri);

  const renderMediaPreview = () => {
    if (contentType === 'audio' && audioUri) {
      return (
        <View style={styles.audioPreviewContainer}>
          <View style={styles.audioWaveform}>
            <FontAwesome name="microphone" size={32} color="#DC2626" />
          </View>
          <Text style={styles.mediaDurationText}>
            {Math.floor(audioDuration)}s audio prayer
          </Text>
          <View style={styles.audioPlayerWrapper}>
            <AudioPlayer uri={audioUri} duration={audioDuration} autoPlay={false} />
          </View>
        </View>
      );
    }

    if (contentType === 'video' && videoUri) {
      return (
        <View style={styles.videoPreviewContainer}>
          <Image source={{ uri: videoUri }} style={styles.videoThumbnail} />
          <View style={styles.videoPlayOverlay}>
            <FontAwesome name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={styles.videoDurationBadge}>
            <Text style={styles.videoDurationText}>{Math.floor(videoDuration)}s</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <Pressable onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>
              {contentType === 'text' ? 'New Prayer' : 'Share Prayer'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Media Preview (Audio/Video) */}
            {(contentType === 'audio' || contentType === 'video') && (
              <View style={styles.mediaPreview}>
                {renderMediaPreview()}
              </View>
            )}

            {/* Text Input (for text prayers) */}
            {contentType === 'text' && (
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Share what's on your heart..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                  autoFocus
                />
                <Text style={styles.charCount}>{content.length}/2000</Text>
              </View>
            )}

            {/* Category Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.value}
                    style={[
                      styles.categoryPill,
                      category === cat.value && styles.categoryPillSelected,
                    ]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        styles.categoryText,
                        category === cat.value && styles.categoryTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Optional Title */}
            <View style={styles.section}>
              {showTitleInput ? (
                <TextInput
                  style={styles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Add a title (optional)"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  maxLength={100}
                />
              ) : (
                <Pressable
                  style={styles.addTitleButton}
                  onPress={() => setShowTitleInput(true)}
                >
                  <FontAwesome name="plus" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.addTitleText}>Add title</Text>
                </Pressable>
              )}
            </View>

            {/* Anonymous Toggle */}
            <Pressable
              style={styles.anonymousToggle}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
                {isAnonymous && <FontAwesome name="check" size={12} color="#fff" />}
              </View>
              <Text style={styles.anonymousText}>Post anonymously</Text>
            </Pressable>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <FontAwesome name="exclamation-circle" size={16} color="#FCA5A5" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
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
                  <Text style={styles.submitButtonText}>Post Prayer</Text>
                  <Text style={styles.submitEmoji}>🙏</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* Success Animation */}
        <SuccessAnimation
          visible={showSuccess}
          message="Prayer Shared!"
          onComplete={handleSuccessComplete}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cancelButton: {
    padding: 8,
    width: 70,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 70,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  mediaPreview: {
    marginBottom: 24,
  },
  audioPreviewContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  audioWaveform: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mediaDurationText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 16,
  },
  audioPlayerWrapper: {
    width: '100%',
  },
  videoPreviewContainer: {
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  textInputContainer: {
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryPillSelected: {
    backgroundColor: 'rgba(65, 105, 225, 0.3)',
    borderColor: '#4169E1',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  titleInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  addTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addTitleText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  anonymousText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4169E1',
    paddingVertical: 18,
    borderRadius: 16,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  submitEmoji: {
    fontSize: 20,
  },
});

export default QuickPostOverlay;
