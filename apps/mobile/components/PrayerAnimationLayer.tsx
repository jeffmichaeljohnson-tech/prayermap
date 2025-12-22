import React, { useEffect, useState, memo, useCallback } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { ShapeSource, LineLayer, CircleLayer } from '@rnmapbox/maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CONNECTION_COLORS, ANIMATION_TIMING } from '@/lib/types/connection';

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning') => {
  if (Platform.OS === 'web') return;

  switch (type) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
  }
};

interface PrayerAnimationProps {
  // Start point (responder location)
  startLng: number;
  startLat: number;
  // End point (prayer location)
  endLng: number;
  endLat: number;
  // Callback when animation completes
  onComplete?: () => void;
  // Whether to show the animation
  isPlaying: boolean;
}

// Create curved path points for the animation
function createCurvedPath(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
  numPoints: number = 30
): [number, number][] {
  const points: [number, number][] = [];

  // Calculate midpoint with offset for curve
  const midLng = (startLng + endLng) / 2;
  const midLat = (startLat + endLat) / 2;

  // Add perpendicular offset for curve (10% of distance)
  const perpLng = -(endLat - startLat) * 0.1;
  const perpLat = (endLng - startLng) * 0.1;

  const controlLng = midLng + perpLng;
  const controlLat = midLat + perpLat;

  // Generate quadratic Bézier curve points
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const invT = 1 - t;

    const lng = invT * invT * startLng + 2 * invT * t * controlLng + t * t * endLng;
    const lat = invT * invT * startLat + 2 * invT * t * controlLat + t * t * endLat;

    points.push([lng, lat]);
  }

  return points;
}

// Get point on path at given progress (0-1)
function getPointOnPath(path: [number, number][], progress: number): [number, number] {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const index = Math.floor(clampedProgress * (path.length - 1));
  const nextIndex = Math.min(index + 1, path.length - 1);
  const localProgress = (clampedProgress * (path.length - 1)) - index;

  const lng = path[index][0] + (path[nextIndex][0] - path[index][0]) * localProgress;
  const lat = path[index][1] + (path[nextIndex][1] - path[index][1]) * localProgress;

  return [lng, lat];
}

// Get partial path from start to progress point (0-1)
function getPartialPath(path: [number, number][], progress: number): [number, number][] {
  if (progress <= 0) return [path[0]];
  if (progress >= 1) return path;

  const endIndex = Math.ceil(progress * (path.length - 1));
  const partialPath = path.slice(0, endIndex + 1);
  const endPoint = getPointOnPath(path, progress);
  partialPath[partialPath.length - 1] = endPoint;
  return partialPath;
}

// Get partial path from end back to progress point (for reverse direction)
function getPartialPathReverse(path: [number, number][], progress: number): [number, number][] {
  if (progress <= 0) return [path[path.length - 1]];
  if (progress >= 1) return [...path].reverse();

  const startIndex = Math.floor((1 - progress) * (path.length - 1));
  const partialPath = path.slice(startIndex);
  const startPoint = getPointOnPath(path, 1 - progress);
  partialPath[0] = startPoint;
  return partialPath;
}

function PrayerAnimationLayerComponent({
  startLng,
  startLat,
  endLng,
  endLat,
  onComplete,
  isPlaying,
}: PrayerAnimationProps) {
  // Animation progress values
  const phase1Progress = useSharedValue(0); // Yellow light outbound (0-1)
  const phase2Progress = useSharedValue(0); // Purple light inbound (0-1)
  const permanentOpacity = useSharedValue(0); // Permanent line fade in

  // State for animated positions
  const [yellowLightPos, setYellowLightPos] = useState<[number, number] | null>(null);
  const [purpleLightPos, setPurpleLightPos] = useState<[number, number] | null>(null);
  const [showPermanent, setShowPermanent] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Trail states - coordinates for the growing trail behind each light
  const [yellowTrailProgress, setYellowTrailProgress] = useState(0);
  const [purpleTrailProgress, setPurpleTrailProgress] = useState(0);

  // Pre-calculate the curved path
  const path = createCurvedPath(startLng, startLat, endLng, endLat);

  const handleAnimationComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    if (!isPlaying) {
      // Reset animation state
      setYellowLightPos(null);
      setPurpleLightPos(null);
      setShowPermanent(false);
      setYellowTrailProgress(0);
      setPurpleTrailProgress(0);
      phase1Progress.value = 0;
      phase2Progress.value = 0;
      permanentOpacity.value = 0;
      return;
    }

    // Reset for new animation
    setAnimationKey(prev => prev + 1);
    setYellowLightPos(path[0]);
    setPurpleLightPos(null);
    setShowPermanent(false);

    // Haptic: Animation starting - light tap to signal beginning
    triggerHaptic('light');

    // Phase 1: Yellow light travels from responder to prayer (0-2.4s)
    const phase1Duration = ANIMATION_TIMING.phase1.end - ANIMATION_TIMING.phase1.start;
    phase1Progress.value = withTiming(1, {
      duration: phase1Duration,
      easing: Easing.inOut(Easing.ease),
    });

    // Update yellow light position and trail during phase 1
    let phase1HapticTriggered = false;
    const yellowInterval = setInterval(() => {
      const progress = phase1Progress.value;
      if (progress < 1) {
        const pos = getPointOnPath(path, progress);
        setYellowLightPos(pos);
        setYellowTrailProgress(progress);
      } else {
        // Haptic: Yellow light reached destination - medium impact
        if (!phase1HapticTriggered) {
          phase1HapticTriggered = true;
          triggerHaptic('medium');
        }
        setYellowLightPos(null);
        setYellowTrailProgress(1); // Full trail
        clearInterval(yellowInterval);
      }
    }, 50);

    // Phase 2: Purple light travels back (after delay)
    const phase2Delay = ANIMATION_TIMING.phase2.start;
    const phase2Duration = ANIMATION_TIMING.phase2.end - ANIMATION_TIMING.phase2.start;

    const phase2Timeout = setTimeout(() => {
      // Haptic: Purple light starting - light tap
      triggerHaptic('light');
      setPurpleLightPos(path[path.length - 1]);
      phase2Progress.value = withTiming(1, {
        duration: phase2Duration,
        easing: Easing.inOut(Easing.ease),
      });

      // Update purple light position and trail during phase 2
      const purpleInterval = setInterval(() => {
        const progress = phase2Progress.value;
        if (progress < 1) {
          const pos = getPointOnPath(path, 1 - progress); // Reverse direction
          setPurpleLightPos(pos);
          setPurpleTrailProgress(progress);
        } else {
          setPurpleLightPos(null);
          setPurpleTrailProgress(1); // Full trail
          clearInterval(purpleInterval);
        }
      }, 50);

      // Clean up purple interval after phase 2
      setTimeout(() => clearInterval(purpleInterval), phase2Duration + 100);
    }, phase2Delay);

    // Phase 3: Permanent line fades in
    const phase3Timeout = setTimeout(() => {
      // Haptic: Memorial line appearing - success notification
      triggerHaptic('success');
      setShowPermanent(true);
      permanentOpacity.value = withTiming(1, {
        duration: ANIMATION_TIMING.phase3.end - ANIMATION_TIMING.phase3.start,
        easing: Easing.out(Easing.ease),
      });
    }, ANIMATION_TIMING.phase3.start);

    // Animation complete callback
    const completeTimeout = setTimeout(() => {
      runOnJS(handleAnimationComplete)();
    }, ANIMATION_TIMING.totalDuration);

    // Cleanup
    return () => {
      clearInterval(yellowInterval);
      clearTimeout(phase2Timeout);
      clearTimeout(phase3Timeout);
      clearTimeout(completeTimeout);
    };
  }, [isPlaying, startLng, startLat, endLng, endLat]);

  // GeoJSON for the path line
  const pathGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: path,
      },
    }],
  };

  // GeoJSON for yellow light (traveling point)
  const yellowLightGeoJSON: GeoJSON.FeatureCollection | null = yellowLightPos ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: yellowLightPos,
      },
    }],
  } : null;

  // GeoJSON for purple light (returning point)
  const purpleLightGeoJSON: GeoJSON.FeatureCollection | null = purpleLightPos ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: purpleLightPos,
      },
    }],
  } : null;

  // GeoJSON for yellow trail (growing line behind yellow light)
  const yellowTrailPath = yellowTrailProgress > 0 ? getPartialPath(path, yellowTrailProgress) : null;
  const yellowTrailGeoJSON: GeoJSON.FeatureCollection | null = yellowTrailPath && yellowTrailPath.length >= 2 ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: yellowTrailPath,
      },
    }],
  } : null;

  // GeoJSON for purple trail (growing line behind purple light - reverse direction)
  const purpleTrailPath = purpleTrailProgress > 0 ? getPartialPathReverse(path, purpleTrailProgress) : null;
  const purpleTrailGeoJSON: GeoJSON.FeatureCollection | null = purpleTrailPath && purpleTrailPath.length >= 2 ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: purpleTrailPath,
      },
    }],
  } : null;

  if (!isPlaying && !showPermanent) {
    return null;
  }

  return (
    <>
      {/* Path trail (faint during animation, permanent after) */}
      {showPermanent && (
        <>
          {/* Glow layer - full spectrum gradient glow */}
          <ShapeSource
            id={`prayer-anim-glow-${animationKey}`}
            shape={pathGeoJSON}
            lineMetrics={true}
          >
            <LineLayer
              id={`prayer-anim-glow-layer-${animationKey}`}
              slot="top"
              style={{
                lineWidth: 8,
                lineOpacity: 0.3,
                lineBlur: 4,
                lineCap: 'round',
                lineJoin: 'round',
                lineEmissiveStrength: 1,
                // Full spectrum gradient glow
                lineGradient: [
                  'interpolate',
                  ['linear'],
                  ['line-progress'],
                  0, CONNECTION_COLORS.gradient.purple,
                  0.25, CONNECTION_COLORS.gradient.blue,
                  0.5, CONNECTION_COLORS.gradient.green,
                  0.75, CONNECTION_COLORS.gradient.yellow,
                  1, CONNECTION_COLORS.gradient.gold,
                ],
              }}
            />
          </ShapeSource>

          {/* Main gradient line - full spectrum */}
          <ShapeSource
            id={`prayer-anim-main-${animationKey}`}
            shape={pathGeoJSON}
            lineMetrics={true}
          >
            <LineLayer
              id={`prayer-anim-main-layer-${animationKey}`}
              slot="top"
              style={{
                lineWidth: 3,
                lineOpacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
                lineEmissiveStrength: 1,
                // Full spectrum: Purple → Blue → Green → Yellow → Gold
                lineGradient: [
                  'interpolate',
                  ['linear'],
                  ['line-progress'],
                  0, CONNECTION_COLORS.gradient.purple,
                  0.25, CONNECTION_COLORS.gradient.blue,
                  0.5, CONNECTION_COLORS.gradient.green,
                  0.75, CONNECTION_COLORS.gradient.yellow,
                  1, CONNECTION_COLORS.gradient.gold,
                ],
              }}
            />
          </ShapeSource>

          {/* White highlight center for glow effect */}
          <ShapeSource
            id={`prayer-anim-highlight-${animationKey}`}
            shape={pathGeoJSON}
            lineMetrics={true}
          >
            <LineLayer
              id={`prayer-anim-highlight-layer-${animationKey}`}
              slot="top"
              style={{
                lineWidth: 1,
                lineOpacity: 0.6,
                lineCap: 'round',
                lineJoin: 'round',
                lineEmissiveStrength: 1,
                lineColor: 'rgba(255, 255, 255, 0.8)',
              }}
            />
          </ShapeSource>
        </>
      )}

      {/* Yellow/Gold trail (growing line during Phase 1) */}
      {yellowTrailGeoJSON && (
        <>
          {/* Trail glow */}
          <ShapeSource id={`yellow-trail-glow-${animationKey}`} shape={yellowTrailGeoJSON}>
            <LineLayer
              id={`yellow-trail-glow-layer-${animationKey}`}
              slot="top"
              style={{
                lineColor: CONNECTION_COLORS.gradient.gold,
                lineWidth: 6,
                lineOpacity: 0.5,
                lineBlur: 3,
                lineCap: 'round',
                lineJoin: 'round',
                lineEmissiveStrength: 1,
              }}
            />
          </ShapeSource>
          {/* Trail main line */}
          <ShapeSource id={`yellow-trail-main-${animationKey}`} shape={yellowTrailGeoJSON}>
            <LineLayer
              id={`yellow-trail-main-layer-${animationKey}`}
              slot="top"
              style={{
                lineColor: CONNECTION_COLORS.gradient.gold,
                lineWidth: 2.5,
                lineOpacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
                lineEmissiveStrength: 1,
              }}
            />
          </ShapeSource>
        </>
      )}

      {/* Yellow/Gold traveling light (Phase 1) */}
      {yellowLightGeoJSON && (
        <>
          {/* Outer glow */}
          <ShapeSource id={`yellow-light-glow-${animationKey}`} shape={yellowLightGeoJSON}>
            <CircleLayer
              id={`yellow-light-glow-layer-${animationKey}`}
              slot="top"
              style={{
                circleRadius: 20,
                circleColor: CONNECTION_COLORS.gradient.gold,
                circleBlur: 1,
                circleOpacity: 0.6,
                circleEmissiveStrength: 1,
              }}
            />
          </ShapeSource>
          {/* Inner bright core */}
          <ShapeSource id={`yellow-light-core-${animationKey}`} shape={yellowLightGeoJSON}>
            <CircleLayer
              id={`yellow-light-core-layer-${animationKey}`}
              slot="top"
              style={{
                circleRadius: 8,
                circleColor: CONNECTION_COLORS.gradient.gold,
                circleStrokeColor: '#FFFFFF',
                circleStrokeWidth: 2,
                circleOpacity: 1,
                circleEmissiveStrength: 1,
              }}
            />
          </ShapeSource>
        </>
      )}

      {/* Purple trail (growing line during Phase 2) */}
      {purpleTrailGeoJSON && (
        <>
          {/* Trail glow */}
          <ShapeSource id={`purple-trail-glow-${animationKey}`} shape={purpleTrailGeoJSON}>
            <LineLayer
              id={`purple-trail-glow-layer-${animationKey}`}
              slot="top"
              style={{
                lineColor: CONNECTION_COLORS.gradient.purple,
                lineWidth: 6,
                lineOpacity: 0.5,
                lineBlur: 3,
                lineCap: 'round',
                lineJoin: 'round',
                lineEmissiveStrength: 1,
              }}
            />
          </ShapeSource>
          {/* Trail main line */}
          <ShapeSource id={`purple-trail-main-${animationKey}`} shape={purpleTrailGeoJSON}>
            <LineLayer
              id={`purple-trail-main-layer-${animationKey}`}
              slot="top"
              style={{
                lineColor: CONNECTION_COLORS.gradient.purple,
                lineWidth: 2.5,
                lineOpacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
                lineEmissiveStrength: 1,
              }}
            />
          </ShapeSource>
        </>
      )}

      {/* Purple returning light (Phase 2) */}
      {purpleLightGeoJSON && (
        <>
          {/* Outer glow */}
          <ShapeSource id={`purple-light-glow-${animationKey}`} shape={purpleLightGeoJSON}>
            <CircleLayer
              id={`purple-light-glow-layer-${animationKey}`}
              slot="top"
              style={{
                circleRadius: 20,
                circleColor: CONNECTION_COLORS.gradient.purple,
                circleBlur: 1,
                circleOpacity: 0.6,
                circleEmissiveStrength: 1,
              }}
            />
          </ShapeSource>
          {/* Inner bright core */}
          <ShapeSource id={`purple-light-core-${animationKey}`} shape={purpleLightGeoJSON}>
            <CircleLayer
              id={`purple-light-core-layer-${animationKey}`}
              slot="top"
              style={{
                circleRadius: 8,
                circleColor: CONNECTION_COLORS.gradient.purple,
                circleStrokeColor: '#FFFFFF',
                circleStrokeWidth: 2,
                circleOpacity: 1,
                circleEmissiveStrength: 1,
              }}
            />
          </ShapeSource>
        </>
      )}
    </>
  );
}

export const PrayerAnimationLayer = memo(PrayerAnimationLayerComponent);

export default PrayerAnimationLayer;
