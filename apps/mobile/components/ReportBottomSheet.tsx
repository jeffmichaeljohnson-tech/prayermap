/**
 * ReportBottomSheet - User reporting component
 *
 * Minimalist ethereal-themed bottom sheet for reporting inappropriate content.
 * Supports reporting prayers, users, and responses.
 *
 * Features:
 * - Ethereal glass styling matching PrayerMap theme
 * - Self-harm detection with crisis resource redirect
 * - Simple reason selection with optional details
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/lib/supabase';
import { colors, glass, borderRadius, shadows, spacing } from '@/constants/theme';

// Report reason types matching database schema
type ReportReason =
  | 'inappropriate'
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'self_harm'
  | 'other';

type TargetType = 'prayer' | 'user' | 'response';

interface ReportBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  targetType: TargetType;
  targetId: string;
  onReportSubmitted?: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; emoji: string }[] = [
  { value: 'inappropriate', label: 'Inappropriate Content', emoji: '🚫' },
  { value: 'spam', label: 'Spam', emoji: '📧' },
  { value: 'harassment', label: 'Harassment', emoji: '😔' },
  { value: 'hate_speech', label: 'Hate Speech', emoji: '🛑' },
  { value: 'self_harm', label: 'Self-Harm Concern', emoji: '💔' },
  { value: 'other', label: 'Other', emoji: '📝' },
];

export function ReportBottomSheet({
  visible,
  onClose,
  targetType,
  targetId,
  onReportSubmitted,
}: ReportBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCrisisResources, setShowCrisisResources] = useState(false);

  const resetForm = useCallback(() => {
    setSelectedReason(null);
    setDetails('');
    setShowCrisisResources(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleReasonSelect = useCallback((reason: ReportReason) => {
    setSelectedReason(reason);

    // Show crisis resources for self-harm reports
    if (reason === 'self_harm') {
      setShowCrisisResources(true);
    } else {
      setShowCrisisResources(false);
    }
  }, []);

  const handleCall988 = useCallback(() => {
    Linking.openURL('tel:988');
  }, []);

  const handleCall911 = useCallback(() => {
    Linking.openURL('tel:911');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'You must be signed in to report content.');
        return;
      }

      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason: selectedReason,
        details: details.trim() || null,
      });

      if (error) throw error;

      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep PrayerMap safe. Our team will review this report.',
        [{ text: 'OK', onPress: handleClose }]
      );

      onReportSubmitted?.();
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedReason, details, targetType, targetId, handleClose, onReportSubmitted]);

  const targetLabel = targetType === 'prayer' ? 'Prayer' : targetType === 'user' ? 'User' : 'Response';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Report {targetLabel}</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <FontAwesome name="times" size={20} color={colors.gray[500]} />
            </Pressable>
          </View>

          {/* Crisis Resources (shown for self-harm) */}
          {showCrisisResources && (
            <View style={styles.crisisBox}>
              <Text style={styles.crisisTitle}>Need immediate help?</Text>
              <Text style={styles.crisisText}>
                If you or someone you know is in crisis, please reach out for support.
              </Text>
              <View style={styles.crisisButtons}>
                <Pressable style={styles.crisisButton988} onPress={handleCall988}>
                  <FontAwesome name="phone" size={16} color="#fff" />
                  <Text style={styles.crisisButtonText}>Call 988</Text>
                </Pressable>
                <Pressable style={styles.crisisButton911} onPress={handleCall911}>
                  <FontAwesome name="phone" size={16} color="#fff" />
                  <Text style={styles.crisisButtonText}>Call 911</Text>
                </Pressable>
              </View>
              <Text style={styles.crisisSubtext}>
                988 Suicide & Crisis Lifeline - Available 24/7
              </Text>
            </View>
          )}

          {/* Reason Selection */}
          <Text style={styles.sectionLabel}>Why are you reporting this?</Text>
          <View style={styles.reasonList}>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason.value}
                style={[
                  styles.reasonItem,
                  selectedReason === reason.value && styles.reasonItemSelected,
                ]}
                onPress={() => handleReasonSelect(reason.value)}
              >
                <Text style={styles.reasonEmoji}>{reason.emoji}</Text>
                <Text style={[
                  styles.reasonLabel,
                  selectedReason === reason.value && styles.reasonLabelSelected,
                ]}>
                  {reason.label}
                </Text>
                {selectedReason === reason.value && (
                  <FontAwesome name="check" size={16} color={colors.purple[500]} />
                )}
              </Pressable>
            ))}
          </View>

          {/* Optional Details */}
          {selectedReason && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionLabel}>Additional details (optional)</Text>
              <TextInput
                style={styles.detailsInput}
                placeholder="Provide any additional context..."
                placeholderTextColor={colors.gray[400]}
                multiline
                numberOfLines={3}
                value={details}
                onChangeText={setDetails}
                maxLength={500}
              />
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            style={[
              styles.submitButton,
              !selectedReason && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            False reports may result in action against your account.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.glass.white92,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
    maxHeight: '90%',
    ...shadows.xl,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[800],
  },
  closeButton: {
    padding: spacing.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
    marginBottom: spacing.md,
  },
  reasonList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  reasonItemSelected: {
    backgroundColor: 'rgba(216, 180, 254, 0.2)',
    borderColor: colors.purple[400],
  },
  reasonEmoji: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  reasonLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[700],
  },
  reasonLabelSelected: {
    color: colors.purple[600],
    fontWeight: '600',
  },
  detailsSection: {
    marginBottom: spacing.lg,
  },
  detailsInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.md,
    fontSize: 16,
    color: colors.gray[800],
    minHeight: 80,
    textAlignVertical: 'top',
  },
  crisisBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  crisisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
    marginBottom: spacing.xs,
  },
  crisisText: {
    fontSize: 14,
    color: colors.gray[700],
    marginBottom: spacing.md,
  },
  crisisButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  crisisButton988: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  crisisButton911: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  crisisButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  crisisSubtext: {
    fontSize: 12,
    color: colors.gray[500],
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.purple[500],
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: colors.gray[400],
    textAlign: 'center',
  },
});

export default ReportBottomSheet;
