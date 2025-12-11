import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, borderRadius, shadows } from '@/constants/theme';

type PrayerType = 'text' | 'audio' | 'video';

interface AddToMapFABProps {
  onSelectType: (type: PrayerType) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AddToMapFAB({ onSelectType }: AddToMapFABProps) {
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(false);
  const expandProgress = useSharedValue(0);
  const rotateProgress = useSharedValue(0);

  const toggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    expandProgress.value = withSpring(newExpanded ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
    rotateProgress.value = withSpring(newExpanded ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [isExpanded, expandProgress, rotateProgress]);

  const handleSelectType = useCallback((type: PrayerType) => {
    // Close the menu first
    setIsExpanded(false);
    expandProgress.value = withTiming(0, { duration: 150 });
    rotateProgress.value = withTiming(0, { duration: 150 });
    // Then trigger the selection
    setTimeout(() => {
      onSelectType(type);
    }, 100);
  }, [onSelectType, expandProgress, rotateProgress]);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
    expandProgress.value = withSpring(0);
    rotateProgress.value = withSpring(0);
  }, [expandProgress, rotateProgress]);

  // Main FAB rotation animation
  const fabAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      rotateProgress.value,
      [0, 1],
      [0, 45],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  // Options container animation
  const optionsAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      expandProgress.value,
      [0, 1],
      [20, 0],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      expandProgress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  // Label animation
  const labelAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      expandProgress.value,
      [0, 0.5],
      [1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity,
    };
  });

  return (
    <>
      {/* Backdrop Modal for expanded state */}
      <Modal
        visible={isExpanded}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* Expanded Options */}
        <View style={[styles.expandedContainer, { bottom: insets.bottom + 190 }]}>
          <Animated.View style={[styles.optionsContainer, optionsAnimatedStyle]}>
            <Text style={styles.prayerTypeLabel}>Prayer Type</Text>

            <View style={styles.optionsRow}>
              {/* Text Option - Soft Gold */}
              <Pressable
                style={styles.optionButton}
                onPress={() => handleSelectType('text')}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.amber[400] }]}>
                  <FontAwesome name="pencil" size={24} color={colors.white} />
                </View>
                <Text style={styles.optionText}>Text</Text>
              </Pressable>

              {/* Audio Option - Sky Blue */}
              <Pressable
                style={styles.optionButton}
                onPress={() => handleSelectType('audio')}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.sky[400] }]}>
                  <FontAwesome name="microphone" size={24} color={colors.white} />
                </View>
                <Text style={styles.optionText}>Audio</Text>
              </Pressable>

              {/* Video Option - Gentle Purple */}
              <Pressable
                style={styles.optionButton}
                onPress={() => handleSelectType('video')}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.purple[400] }]}>
                  <FontAwesome name="video-camera" size={24} color={colors.white} />
                </View>
                <Text style={styles.optionText}>Video</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>

        {/* FAB in expanded state (to close) */}
        <View style={[styles.fabContainer, { bottom: insets.bottom + 110 }]}>
          <Pressable onPress={handleClose}>
            <Animated.View style={[styles.fab, styles.fabExpanded, fabAnimatedStyle]}>
              <FontAwesome name="plus" size={28} color={colors.white} />
            </Animated.View>
          </Pressable>
        </View>
      </Modal>

      {/* Main FAB (when not expanded) */}
      {!isExpanded && (
        <View style={[styles.fabContainer, { bottom: insets.bottom + 110 }]}>
          <Animated.Text style={[styles.addToMapLabel, labelAnimatedStyle]}>
            Add to Map
          </Animated.Text>
          <AnimatedPressable onPress={toggleExpanded}>
            <Animated.View style={[styles.fab, fabAnimatedStyle]}>
              <FontAwesome name="plus" size={28} color={colors.white} />
            </Animated.View>
          </AnimatedPressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  addToMapLabel: {
    color: colors.gray[700],
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.purple[400], // Ethereal purple
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    // Add subtle border for glass effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fabExpanded: {
    backgroundColor: colors.gray[700],
    shadowColor: '#000',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  expandedContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  optionsContainer: {
    alignItems: 'center',
    backgroundColor: colors.glass.white92,
    borderRadius: borderRadius['2xl'],
    padding: 20,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: colors.glass.white30,
    ...shadows.large,
  },
  prayerTypeLabel: {
    color: colors.gray[700],
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  optionButton: {
    alignItems: 'center',
    gap: 8,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  optionText: {
    color: colors.gray[700],
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
});

export default AddToMapFAB;
