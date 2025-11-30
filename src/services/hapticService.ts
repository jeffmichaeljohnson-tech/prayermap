/**
 * Haptic Feedback Service for PrayerMap
 *
 * Provides tactile feedback during key interactions:
 * - Button presses
 * - Animation milestones
 * - Notifications
 *
 * Uses Capacitor Haptics plugin on native, falls back to
 * Vibration API on web (where supported).
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export type HapticPattern =
  | 'light'      // Subtle tap
  | 'medium'     // Standard tap
  | 'heavy'      // Strong tap
  | 'success'    // Positive feedback
  | 'warning'    // Caution
  | 'error'      // Problem
  | 'selection'  // UI selection
  | 'prayer_start'    // Animation begins
  | 'prayer_connect'  // Lines connect
  | 'prayer_complete' // Animation ends
  | 'heartbeat';      // Rhythmic pulse

/**
 * Trigger haptic feedback
 * @param pattern - The type of haptic feedback
 */
export async function haptic(pattern: HapticPattern = 'medium'): Promise<void> {
  // Skip if user prefers reduced motion
  if (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      await nativeHaptic(pattern);
    } else {
      await webHaptic(pattern);
    }
  } catch (error) {
    // Silently fail - haptics are enhancement, not critical
    console.debug('[Haptic] Not available:', error);
  }
}

/**
 * Native haptic feedback using Capacitor
 */
async function nativeHaptic(pattern: HapticPattern): Promise<void> {
  switch (pattern) {
    case 'light':
      await Haptics.impact({ style: ImpactStyle.Light });
      break;
    case 'medium':
      await Haptics.impact({ style: ImpactStyle.Medium });
      break;
    case 'heavy':
      await Haptics.impact({ style: ImpactStyle.Heavy });
      break;
    case 'success':
      await Haptics.notification({ type: NotificationType.Success });
      break;
    case 'warning':
      await Haptics.notification({ type: NotificationType.Warning });
      break;
    case 'error':
      await Haptics.notification({ type: NotificationType.Error });
      break;
    case 'selection':
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
      break;
    case 'prayer_start':
      // Build anticipation: light -> medium
      await Haptics.impact({ style: ImpactStyle.Light });
      await delay(100);
      await Haptics.impact({ style: ImpactStyle.Medium });
      break;
    case 'prayer_connect':
      // Connection moment: two quick taps
      await Haptics.impact({ style: ImpactStyle.Medium });
      await delay(80);
      await Haptics.impact({ style: ImpactStyle.Medium });
      break;
    case 'prayer_complete':
      // Celebration: success notification + light flourish
      await Haptics.notification({ type: NotificationType.Success });
      await delay(200);
      await Haptics.impact({ style: ImpactStyle.Light });
      break;
    case 'heartbeat':
      // Rhythmic pulse like a heartbeat
      await Haptics.impact({ style: ImpactStyle.Heavy });
      await delay(100);
      await Haptics.impact({ style: ImpactStyle.Light });
      break;
    default:
      await Haptics.impact({ style: ImpactStyle.Medium });
  }
}

/**
 * Web fallback using Vibration API
 */
async function webHaptic(pattern: HapticPattern): Promise<void> {
  if (!('vibrate' in navigator)) return;

  const patterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [30, 50, 30],
    warning: [50, 30, 50],
    error: [100, 50, 100],
    selection: 15,
    prayer_start: [15, 50, 30],
    prayer_connect: [25, 50, 25],
    prayer_complete: [30, 50, 30, 50, 30],
    heartbeat: [50, 100, 20]
  };

  navigator.vibrate(patterns[pattern] || 25);
}

/**
 * Play a sequence of haptics with timing
 */
export async function hapticSequence(
  patterns: Array<{ pattern: HapticPattern; delay: number }>
): Promise<void> {
  for (const { pattern, delay: delayMs } of patterns) {
    await haptic(pattern);
    if (delayMs > 0) await delay(delayMs);
  }
}

/**
 * Prayer animation haptic timeline
 * Synced with the 6-second animation phases
 */
export async function prayerAnimationHaptics(): Promise<void> {
  // Phase 1 (0s): Animation starts - anticipation
  await haptic('prayer_start');

  // Phase 2 (2.4s): Line reaches prayer - connection
  await delay(2400);
  await haptic('prayer_connect');

  // Phase 3 (4.5s): Return journey midpoint - heartbeat
  await delay(2100);
  await haptic('heartbeat');

  // Phase 4 (6s): Animation complete - celebration
  await delay(1500);
  await haptic('prayer_complete');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export singleton for convenience
export const hapticService = {
  trigger: haptic,
  sequence: hapticSequence,
  prayerAnimation: prayerAnimationHaptics
};
