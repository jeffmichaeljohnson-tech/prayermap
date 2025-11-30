# Haptic Feedback Integration

## Overview

The haptic feedback system provides tactile feedback during key interactions in PrayerMap, creating a "living, breathing" experience on mobile devices. It uses Capacitor Haptics on native platforms and falls back to the Vibration API on web.

## Files Created

### Service Layer
- **`/home/user/prayermap/src/services/hapticService.ts`**
  - Core haptic feedback service
  - Native platform support via Capacitor Haptics
  - Web fallback via Vibration API
  - Prayer-specific haptic patterns
  - 6-second prayer animation timeline

### React Hook
- **`/home/user/prayermap/src/hooks/useHaptic.ts`**
  - React hook for haptic feedback
  - Integrates with `useReducedMotion` for accessibility
  - Provides convenient methods for all haptic patterns

### Tests
- **`/home/user/prayermap/src/services/__tests__/hapticService.test.ts`** (29 tests)
- **`/home/user/prayermap/src/hooks/__tests__/useHaptic.test.ts`** (29 tests)
- **Total: 58 tests, all passing**

### Documentation
- **`/home/user/prayermap/docs/HAPTIC_FEEDBACK.md`** (this file)

## Usage

### Basic Haptics

```typescript
import { useHaptic } from '@/hooks/useHaptic';

function MyComponent() {
  const haptic = useHaptic();

  const handleButtonPress = () => {
    haptic.light(); // Subtle tap
    // ... handle button press
  };

  const handleSuccess = () => {
    haptic.success(); // Success notification
    // ... handle success
  };

  return (
    <button onClick={handleButtonPress}>
      Press Me
    </button>
  );
}
```

### Available Patterns

#### Basic Impact Patterns
```typescript
haptic.light()      // Subtle tap (10ms vibration on web)
haptic.medium()     // Standard tap (25ms vibration on web)
haptic.heavy()      // Strong tap (50ms vibration on web)
```

#### Notification Patterns
```typescript
haptic.success()    // Positive feedback
haptic.warning()    // Caution
haptic.error()      // Problem
haptic.selection()  // UI selection changed
```

#### Prayer-Specific Patterns
```typescript
haptic.prayerStart()    // Prayer animation begins (light → medium progression)
haptic.prayerConnect()  // Prayer lines connect (two quick taps)
haptic.prayerComplete() // Prayer animation ends (success + flourish)
haptic.heartbeat()      // Rhythmic pulse (heavy → light)
```

### Prayer Animation Timeline

For the full 6-second prayer animation, use:

```typescript
const haptic = useHaptic();

// Start prayer animation visuals
startPrayerAnimation();

// Play synchronized haptic timeline
haptic.playPrayerAnimation();

// Timeline:
// 0.0s - Prayer starts (anticipation: light → medium)
// 2.4s - Line reaches prayer (connection: two quick taps)
// 4.5s - Return journey midpoint (heartbeat: heavy → light)
// 6.0s - Animation complete (celebration: success + flourish)
```

### Integration with PrayerAnimationLayer

When integrating with `/home/user/prayermap/src/components/animations/PrayerAnimationLayer.tsx`:

```typescript
import { useHaptic } from '@/hooks/useHaptic';

function PrayerAnimationLayer() {
  const haptic = useHaptic();

  const handlePrayerSent = () => {
    // Start visual animation
    triggerPrayerAnimation();

    // Start haptic timeline in parallel
    haptic.playPrayerAnimation();
  };

  return (
    // ... component JSX
  );
}
```

### Custom Sequences

For complex haptic patterns:

```typescript
const haptic = useHaptic();

await haptic.sequence([
  { pattern: 'light', delay: 0 },
  { pattern: 'medium', delay: 100 },
  { pattern: 'heavy', delay: 200 },
  { pattern: 'success', delay: 300 }
]);
```

## Accessibility

The haptic system **automatically respects** the user's reduced motion preferences:

- When `prefers-reduced-motion: reduce` is enabled, all haptics are disabled
- No additional code needed - it's built into the hook
- Follows WCAG 2.1 AA accessibility guidelines

```typescript
// This automatically respects reduced motion
const haptic = useHaptic();
haptic.medium(); // No-op if reduced motion is enabled
```

## Platform Support

### Native (iOS & Android)
- Uses Capacitor Haptics plugin
- Full support for all patterns
- Rich haptic feedback with different intensities

### Web
- Falls back to Vibration API (where supported)
- Vibration patterns simulate haptic effects
- Gracefully degrades if API not available

### Graceful Degradation
- All haptic calls fail silently if unavailable
- Never throws errors
- Logs to `console.debug` for development

## Performance

- Lightweight: No external dependencies beyond Capacitor
- Async by default: Non-blocking
- Optimized timings: Delays calculated for best feel
- Memory efficient: No retained state

## Testing

Run the haptic tests:

```bash
npm test -- src/services/__tests__/hapticService.test.ts
npm test -- src/hooks/__tests__/useHaptic.test.ts
```

All tests verify:
- ✅ Native platform haptics
- ✅ Web fallback behavior
- ✅ Reduced motion respect
- ✅ Error handling
- ✅ Prayer animation timeline
- ✅ Pattern sequences
- ✅ Accessibility compliance

## Design Principles

Following PrayerMap's "Living, Breathing App" principle:

1. **Responsive**: Every touch is acknowledged
2. **Subtle**: Haptics enhance, don't distract
3. **Meaningful**: Each pattern has purpose
4. **Accessible**: Respects user preferences
5. **Spiritual**: Custom patterns for prayer moments

## Next Steps (for Integration Agent)

1. Import `useHaptic` in `PrayerAnimationLayer.tsx`
2. Call `haptic.playPrayerAnimation()` when prayer animation starts
3. Add haptic feedback to prayer card interactions
4. Test on actual iOS and Android devices
5. Fine-tune timings based on user feedback

## API Reference

### `useHaptic()` Hook

Returns an object with:

```typescript
{
  // Generic trigger
  trigger: (pattern: HapticPattern) => void;

  // Basic impacts
  light: () => void;
  medium: () => void;
  heavy: () => void;

  // Notifications
  success: () => void;
  warning: () => void;
  error: () => void;
  selection: () => void;

  // Prayer-specific
  prayerStart: () => void;
  prayerConnect: () => void;
  prayerComplete: () => void;
  heartbeat: () => void;

  // Timeline
  playPrayerAnimation: () => void;

  // Sequences
  sequence: (patterns: Array<{ pattern: HapticPattern; delay: number }>) => Promise<void>;
}
```

### HapticPattern Type

```typescript
type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'prayer_start'
  | 'prayer_connect'
  | 'prayer_complete'
  | 'heartbeat';
```

## Examples from Other Components

### Button Press
```typescript
<button
  onClick={() => {
    haptic.light();
    handleClick();
  }}
>
  Send Prayer
</button>
```

### Form Submission
```typescript
const handleSubmit = async () => {
  haptic.medium();

  try {
    await submitPrayer();
    haptic.success();
  } catch (error) {
    haptic.error();
  }
};
```

### Map Marker Interaction
```typescript
const handleMarkerPress = () => {
  haptic.light();
  openPrayerCard();
};
```

### Prayer Card Actions
```typescript
const handlePrayButton = () => {
  haptic.prayerStart();
  sendPrayer();
};
```

---

**Created**: 2025-11-29
**Status**: Ready for integration
**Test Coverage**: 58 tests, all passing
**Dependencies**: `@capacitor/haptics` (already installed)
