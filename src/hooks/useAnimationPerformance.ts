/**
 * useAnimationPerformance Hook
 *
 * Provides performance-aware animation configurations
 */

import { useMemo, useState, useEffect } from 'react';
import {
  getAnimationComplexity,
  getPrayerAnimationTiming,
  OPTIMIZED_TRANSITIONS,
  AnimationComplexity
} from '@/utils/animationPerformance';
import { useReducedMotion } from './useReducedMotion';

export function useAnimationPerformance() {
  const reducedMotion = useReducedMotion();
  const [complexity, setComplexity] = useState<AnimationComplexity>('full');

  useEffect(() => {
    setComplexity(getAnimationComplexity());
  }, []);

  const timing = useMemo(() => getPrayerAnimationTiming(), [complexity]);

  const shouldShowParticles = complexity === 'full';
  const shouldShowSpotlights = complexity !== 'minimal';
  const shouldPlaySounds = complexity !== 'minimal' && !reducedMotion;
  const shouldTriggerHaptics = !reducedMotion;

  return {
    complexity,
    timing,
    transitions: OPTIMIZED_TRANSITIONS,
    shouldShowParticles,
    shouldShowSpotlights,
    shouldPlaySounds,
    shouldTriggerHaptics,
    reducedMotion
  };
}
