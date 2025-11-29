/**
 * useHaptic Hook
 *
 * React hook for triggering haptic feedback
 *
 * Provides haptic feedback for user interactions on native platforms.
 * Falls back gracefully on web platforms using Vibration API.
 * Respects user's reduced motion preferences.
 *
 * Usage:
 * const haptic = useHaptic();
 * haptic.light(); // Light tap feedback
 * haptic.medium(); // Medium impact feedback
 * haptic.heavy(); // Heavy impact feedback
 * haptic.success(); // Success notification
 * haptic.prayerStart(); // Prayer animation starts
 * haptic.prayerConnect(); // Prayer lines connect
 * haptic.prayerComplete(); // Prayer animation completes
 * haptic.playPrayerAnimation(); // Full 6-second prayer animation haptic timeline
 */

import { useCallback } from 'react';
import { haptic, hapticSequence, prayerAnimationHaptics, HapticPattern } from '../services/hapticService';
import { useReducedMotion } from './useReducedMotion';

export interface HapticFeedback {
  trigger: (pattern: HapticPattern) => void;
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
  warning: () => void;
  error: () => void;
  selection: () => void;
  prayerStart: () => void;
  prayerConnect: () => void;
  prayerComplete: () => void;
  heartbeat: () => void;
  playPrayerAnimation: () => void;
  sequence: typeof hapticSequence;
}

export function useHaptic(): HapticFeedback {
  const reducedMotion = useReducedMotion();

  const trigger = useCallback((pattern: HapticPattern = 'medium') => {
    if (reducedMotion) return;
    haptic(pattern);
  }, [reducedMotion]);

  const playPrayerAnimation = useCallback(() => {
    if (reducedMotion) return;
    prayerAnimationHaptics();
  }, [reducedMotion]);

  return {
    trigger,
    light: () => trigger('light'),
    medium: () => trigger('medium'),
    heavy: () => trigger('heavy'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    error: () => trigger('error'),
    selection: () => trigger('selection'),
    prayerStart: () => trigger('prayer_start'),
    prayerConnect: () => trigger('prayer_connect'),
    prayerComplete: () => trigger('prayer_complete'),
    heartbeat: () => trigger('heartbeat'),
    playPrayerAnimation,
    sequence: hapticSequence
  };
}
