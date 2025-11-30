/**
 * useAnimationFeatures Hook
 *
 * Feature flags for animation enhancements.
 * Allows gradual rollout and A/B testing.
 */

import { useState, useEffect, useCallback } from 'react';

export interface AnimationFeatures {
  /** Use enhanced animation layer (all new effects) */
  useEnhancedAnimation: boolean;
  /** Show spotlight beam effects */
  showSpotlights: boolean;
  /** Show particle effects */
  showParticles: boolean;
  /** Show celebration burst */
  showCelebration: boolean;
  /** Enable haptic feedback */
  enableHaptics: boolean;
  /** Enable sound effects */
  enableSound: boolean;
  /** Use new PrayButton component */
  useNewPrayButton: boolean;
}

const DEFAULT_FEATURES: AnimationFeatures = {
  useEnhancedAnimation: true,
  showSpotlights: true,
  showParticles: true,
  showCelebration: true,
  enableHaptics: true,
  enableSound: false, // Off by default - user must opt-in
  useNewPrayButton: true,
};

const STORAGE_KEY = 'prayermap_animation_features';

/**
 * Hook for managing animation feature flags
 */
export function useAnimationFeatures() {
  const [features, setFeatures] = useState<AnimationFeatures>(DEFAULT_FEATURES);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFeatures({ ...DEFAULT_FEATURES, ...parsed });
      }
    } catch {
      // Use defaults
    }
  }, []);

  // Save to localStorage when features change
  const updateFeature = useCallback(<K extends keyof AnimationFeatures>(
    key: K,
    value: AnimationFeatures[K]
  ) => {
    setFeatures(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setFeatures(DEFAULT_FEATURES);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    features,
    updateFeature,
    resetToDefaults,
    // Convenience getters
    isEnhanced: features.useEnhancedAnimation,
    hasSound: features.enableSound,
    hasHaptics: features.enableHaptics
  };
}

/**
 * Simple feature check without state management
 */
export function getAnimationFeature(key: keyof AnimationFeatures): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed[key] ?? DEFAULT_FEATURES[key];
    }
  } catch {
    // Fall through to default
  }
  return DEFAULT_FEATURES[key];
}
