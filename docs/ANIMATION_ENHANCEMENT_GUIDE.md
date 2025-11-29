# Prayer Animation Enhancement Guide

## Overview

The 6-second prayer animation has been enhanced with world-class effects:

- **Spotlight Beams** - Dramatic vertical light beams
- **Particle Effects** - Subtle sparkles along the connection path
- **Celebration Burst** - Stars and rings at animation completion
- **Haptic Feedback** - Tactile feedback synced to animation phases
- **Sound Design** - Optional audio cues (user opt-in)
- **Performance Optimization** - Adaptive complexity based on device

## Quick Start

### Using the Enhanced Animation

Replace `PrayerAnimationLayer` with `PrayerAnimationLayerEnhanced`:

```tsx
// Before
import { PrayerAnimationLayer } from '@/components/PrayerAnimationLayer';

// After
import { PrayerAnimationLayerEnhanced } from '@/components/PrayerAnimationLayerEnhanced';

// Usage
<PrayerAnimationLayerEnhanced
  prayer={selectedPrayer}
  userLocation={userLocation}
  map={mapRef.current}
  onComplete={handleAnimationComplete}
  enableSound={userPreferences.soundEnabled}
/>
```

### Using the Enhanced Button

Replace the prayer button with `PrayButton`:

```tsx
import { PrayButton } from '@/components/PrayButton';

<PrayButton
  onPray={handlePrayerSend}
  showQuickOption={true}
/>
```

## Feature Flags

Control which features are enabled:

```tsx
import { useAnimationFeatures } from '@/hooks/useAnimationFeatures';

function MyComponent() {
  const { features, updateFeature } = useAnimationFeatures();

  // Check features
  if (features.showSpotlights) {
    // Render spotlights
  }

  // Update features (persists to localStorage)
  updateFeature('enableSound', true);
}
```

## Component Reference

### SpotlightBeams

Dramatic vertical light beams at both endpoints.

```tsx
<SpotlightBeams
  prayerPosition={{ x: 100, y: 200 }}
  userPosition={{ x: 300, y: 400 }}
  delay={4}        // Seconds before appearing
  duration={2}     // Duration of effect
  show={true}
/>
```

### PrayerParticles

Sparkles along the connection path.

```tsx
<PrayerParticles
  prayerPosition={{ x: 100, y: 200 }}
  userPosition={{ x: 300, y: 400 }}
  show={true}
/>
```

### CelebrationBurst

Stars and rings at animation completion.

```tsx
<CelebrationBurst
  position={{ x: 100, y: 200 }}
  show={animationComplete}
  onComplete={() => console.log('Celebration done')}
/>
```

## Haptic Feedback

```tsx
import { useHaptic } from '@/hooks/useHaptic';

function MyComponent() {
  const haptic = useHaptic();

  // Trigger specific patterns
  haptic.light();           // Subtle tap
  haptic.medium();          // Standard tap
  haptic.success();         // Positive feedback
  haptic.prayerStart();     // Animation begins
  haptic.prayerConnect();   // Lines connect
  haptic.prayerComplete();  // Animation ends

  // Play full animation sequence
  haptic.playPrayerAnimation();
}
```

## Audio Cues

```tsx
import { useAudio } from '@/hooks/useAudio';

function MyComponent() {
  const audio = useAudio();

  // Initialize (required for iOS - must be after user interaction)
  await audio.init();

  // Play sounds
  audio.play('prayer_start');
  audio.play('prayer_complete');

  // Play full animation sequence
  audio.playPrayerAnimation();

  // Toggle mute
  audio.toggleMute();
}
```

## Performance

### Device Capability Detection

The system automatically detects device capabilities:

- **Full**: All effects enabled (high-end devices)
- **Reduced**: Spotlights + core animation (mid-range)
- **Minimal**: Core animation only (low-end / reduced motion)

```tsx
import { useAnimationPerformance } from '@/hooks/useAnimationPerformance';

function MyComponent() {
  const { complexity, timing, shouldShowParticles } = useAnimationPerformance();

  // complexity: 'full' | 'reduced' | 'minimal'
  // timing: Animation timing configuration
  // shouldShowParticles: boolean
}
```

### Performance Tips

1. **Use will-change sparingly** - Only on elements being animated
2. **Prefer transform/opacity** - GPU-accelerated properties
3. **Limit particle count** - Max ~30 particles
4. **Test on real devices** - Especially older iPhones

## Accessibility

All animations respect `prefers-reduced-motion`:

- **Full motion**: Complete 6-second animation
- **Reduced motion**: 500ms instant version with no particles

Users with reduced motion preferences automatically get the minimal experience without needing to configure anything.

## File Structure

```
src/
├── components/
│   ├── PrayerAnimationLayer.tsx        # Original (kept for fallback)
│   ├── PrayerAnimationLayerEnhanced.tsx # Enhanced version
│   ├── PrayButton.tsx                   # New pray button
│   └── animations/
│       ├── SpotlightBeams.tsx          # Spotlight effects
│       ├── PrayerParticles.tsx         # Particle system
│       └── CelebrationBurst.tsx        # Celebration effect
├── hooks/
│   ├── useHaptic.ts                    # Haptic feedback
│   ├── useAudio.ts                     # Audio playback
│   ├── useAnimationPerformance.ts      # Performance detection
│   └── useAnimationFeatures.ts         # Feature flags
├── services/
│   ├── hapticService.ts                # Haptic service
│   └── audioService.ts                 # Audio service
└── utils/
    └── animationPerformance.ts         # Performance utilities
```

## Rollout Strategy

1. **Phase 1**: Enable for 10% of users, monitor performance
2. **Phase 2**: Enable for 50% of users, gather feedback
3. **Phase 3**: Enable for all users
4. **Phase 4**: Make enhanced version the default

Use the feature flags to control rollout:

```tsx
// In your app initialization
const rolloutPercentage = 0.1; // 10%
const isInRollout = Math.random() < rolloutPercentage;

if (isInRollout) {
  updateFeature('useEnhancedAnimation', true);
}
```

## Troubleshooting

### Animations are laggy

1. Check device capability: `getAnimationComplexity()`
2. Reduce particle count
3. Disable spotlights on low-end devices

### Haptics not working

1. Ensure Capacitor Haptics plugin is installed
2. Check iOS Settings > Accessibility > Touch > Vibration
3. Test on physical device (not simulator)

### Audio not playing

1. Call `audio.init()` after user interaction
2. Check browser autoplay policies
3. Ensure not muted: `audio.isMuted`

### Animation timing is off

1. Use the timing from `useAnimationPerformance()`
2. Don't mix manual delays with Framer Motion transitions
3. Test with `FrameRateMonitor` to verify 60fps
```
