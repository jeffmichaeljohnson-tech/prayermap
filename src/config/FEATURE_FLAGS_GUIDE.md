# Feature Flags System Guide

Comprehensive guide for using the PrayerMap feature flags system.

## Table of Contents

- [Quick Start](#quick-start)
- [Integration](#integration)
- [Usage Examples](#usage-examples)
- [Testing & QA](#testing--qa)
- [Rollout Strategy](#rollout-strategy)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Add Provider to App

Update `/src/main.tsx`:

```typescript
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({ /* ... */ });

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <FeatureFlagsProvider>
      <App />
    </FeatureFlagsProvider>
  </QueryClientProvider>
);
```

### 2. Use in Components

```typescript
import { useFeature } from '@/contexts/FeatureFlagsContext';

function PrayerMap() {
  const hasEnhancedAnimations = useFeature('enhancedAnimations');
  const hasSpotlightBeams = useFeature('spotlightBeams');

  return (
    <div>
      <Map>
        {hasEnhancedAnimations && <EnhancedMarkers />}
        {hasSpotlightBeams && <SpotlightEffect />}
      </Map>
    </div>
  );
}
```

---

## Integration

### Step-by-Step Integration

#### 1. Wrap App with Provider

**Option A: In main.tsx (recommended)**

```typescript
// src/main.tsx
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';

createRoot(document.getElementById("root")!).render(
  <FeatureFlagsProvider>
    <App />
  </FeatureFlagsProvider>
);
```

**Option B: In App.tsx**

```typescript
// src/App.tsx
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';

function App() {
  return (
    <FeatureFlagsProvider>
      {/* Your app content */}
    </FeatureFlagsProvider>
  );
}
```

#### 2. Use Feature Flags in Components

```typescript
import { useFeature, useFeatures, useFeatureFlags } from '@/contexts/FeatureFlagsContext';

// Method 1: Single flag (most common, best performance)
function Component1() {
  const hasFeature = useFeature('enhancedAnimations');
  return hasFeature ? <Enhanced /> : <Basic />;
}

// Method 2: Multiple flags
function Component2() {
  const { enhancedAnimations, spotlightBeams } = useFeatures([
    'enhancedAnimations',
    'spotlightBeams'
  ]);

  return (
    <div>
      {enhancedAnimations && <Animation />}
      {spotlightBeams && <Spotlight />}
    </div>
  );
}

// Method 3: Full access (when you need utilities)
function Component3() {
  const { flags, isEnabled } = useFeatureFlags();

  return (
    <div>
      {isEnabled('particleEffects') && <Particles />}
      <DebugInfo flags={flags} />
    </div>
  );
}
```

---

## Usage Examples

### Example 1: Conditional Rendering

```typescript
import { useFeature } from '@/contexts/FeatureFlagsContext';

function PrayButton({ prayerId }: { prayerId: string }) {
  const useEnhancedButton = useFeature('enhancedPrayButton');

  if (useEnhancedButton) {
    return <EnhancedPrayButton prayerId={prayerId} />;
  }

  return <StandardPrayButton prayerId={prayerId} />;
}
```

### Example 2: Feature Enhancement

```typescript
import { useFeature } from '@/contexts/FeatureFlagsContext';
import { motion } from 'framer-motion';

function PrayerCard({ prayer }) {
  const hasAnimations = useFeature('enhancedAnimations');
  const hasCelebration = useFeature('celebrationBurst');

  const handlePray = () => {
    submitPrayer(prayer.id);

    if (hasCelebration) {
      triggerCelebration();
    }
  };

  const Component = hasAnimations ? motion.div : 'div';
  const animationProps = hasAnimations ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  } : {};

  return (
    <Component {...animationProps}>
      <h3>{prayer.title}</h3>
      <p>{prayer.content}</p>
      <button onClick={handlePray}>Pray</button>
    </Component>
  );
}
```

### Example 3: Map Overlays

```typescript
import { useFeatures } from '@/contexts/FeatureFlagsContext';

function MapView() {
  const {
    memorialLinesDensity,
    timelineSlider,
    connectionFilters
  } = useFeatures([
    'memorialLinesDensity',
    'timelineSlider',
    'connectionFilters'
  ]);

  return (
    <div className="relative">
      <MapboxMap>
        {/* Always show basic features */}
        <PrayerMarkers />

        {/* Conditionally show enhanced features */}
        {memorialLinesDensity && <DensityOverlay />}
        {connectionFilters && <FilterPanel />}
      </MapboxMap>

      {/* Conditionally show timeline controls */}
      {timelineSlider && (
        <div className="absolute bottom-4 left-4 right-4">
          <TimelineSlider />
        </div>
      )}
    </div>
  );
}
```

### Example 4: Notification System

```typescript
import { useFeature } from '@/contexts/FeatureFlagsContext';

function AppLayout() {
  const hasNotifications = useFeature('inAppNotifications');
  const hasNotificationCenter = useFeature('notificationCenter');

  return (
    <div>
      <Header>
        {hasNotificationCenter && <NotificationBell />}
      </Header>

      <MainContent />

      {/* Show toast notifications if enabled */}
      {hasNotifications && <NotificationToast />}
    </div>
  );
}
```

### Example 5: Sound Effects

```typescript
import { useFeature } from '@/contexts/FeatureFlagsContext';
import { useSoundEffect } from '@/hooks/useSoundEffect';

function PrayButton() {
  const hasSoundEffects = useFeature('soundEffects');
  const playSound = useSoundEffect();

  const handleClick = () => {
    submitPrayer();

    if (hasSoundEffects) {
      playSound('prayer-sent');
    }
  };

  return <button onClick={handleClick}>Pray</button>;
}
```

### Example 6: Haptic Feedback (Mobile)

```typescript
import { useFeature } from '@/contexts/FeatureFlagsContext';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

function InteractiveButton() {
  const hasHaptics = useFeature('hapticFeedback');

  const handlePress = async () => {
    if (hasHaptics && Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }

    doAction();
  };

  return <button onClick={handlePress}>Action</button>;
}
```

---

## Testing & QA

### Browser Console Commands

```javascript
// View all current flags
window.debugFeatureFlags();

// Enable a specific feature
localStorage.setItem('featureFlags', JSON.stringify({
  enhancedAnimations: true,
  spotlightBeams: true
}));
window.location.reload();

// Disable a specific feature
localStorage.setItem('featureFlags', JSON.stringify({
  enhancedAnimations: false
}));
window.location.reload();

// Reset to environment defaults
window.resetFeatureFlags();
window.location.reload();

// View current overrides
console.log(JSON.parse(localStorage.getItem('featureFlags') || '{}'));
```

### Debug Panel (Development Only)

Add the debug panel to your app:

```typescript
import { FeatureFlagDebugPanel } from '@/contexts/FeatureFlagsContext';

function App() {
  return (
    <div>
      {/* Your app content */}

      {/* Debug panel (only shows in development) */}
      {import.meta.env.DEV && <FeatureFlagDebugPanel />}
    </div>
  );
}
```

### QA Testing Workflow

1. **Test with all flags OFF:**
   ```javascript
   localStorage.setItem('featureFlags', JSON.stringify({
     enhancedAnimations: false,
     spotlightBeams: false,
     particleEffects: false,
     // ... set all to false
   }));
   ```

2. **Test with all flags ON:**
   ```javascript
   // Reset to development defaults (all on)
   window.resetFeatureFlags();
   ```

3. **Test individual features:**
   - Use debug panel to toggle one flag at a time
   - Verify feature works independently
   - Verify feature doesn't break when disabled

4. **Test flag combinations:**
   - Test common combinations (e.g., animations + particles)
   - Test edge cases (e.g., notifications without notification center)

### Automated Testing

```typescript
import { render } from '@testing-library/react';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';

// Test with specific flags
function renderWithFlags(component, flags) {
  // Mock localStorage
  const mockFlags = JSON.stringify(flags);
  jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(mockFlags);

  return render(
    <FeatureFlagsProvider>
      {component}
    </FeatureFlagsProvider>
  );
}

// Example test
test('shows enhanced button when flag is enabled', () => {
  const { getByText } = renderWithFlags(
    <PrayButton />,
    { enhancedPrayButton: true }
  );

  expect(getByText('Enhanced Pray')).toBeInTheDocument();
});
```

---

## Rollout Strategy

### Phase 1: Internal Testing (Week 1-2)

**Target:** Development team + internal testers

**Configuration:**
```typescript
// All features enabled
DEVELOPMENT_FLAGS
```

**Testing Checklist:**
- [ ] All animations run at 60fps
- [ ] No console errors
- [ ] Mobile (iOS/Android) tested
- [ ] Performance benchmarks met
- [ ] Accessibility verified
- [ ] Cross-browser testing complete

**Success Criteria:**
- All features work correctly
- No performance degradation
- Positive team feedback

### Phase 2: Beta Users (Week 3-4)

**Target:** 20-30% of users (beta testers + early adopters)

**Configuration:**
```typescript
// Most features enabled, some conservative choices
STAGING_FLAGS
```

**Monitoring:**
- User engagement metrics
- Error rates
- Performance metrics
- User feedback/ratings

**Success Criteria:**
- No increase in bounce rate
- Positive user feedback (>80%)
- No performance degradation
- Error rate < 1%

### Phase 3: Gradual Production Rollout (Week 5-8)

**Target:** 100% of users (gradual rollout)

**Week 5:** Enable visual enhancements
```typescript
{
  spotlightBeams: true,      // 50% of users
  particleEffects: true,     // 50% of users
}
```

**Week 6:** Enable data visualizations
```typescript
{
  memorialLinesDensity: true,  // 75% of users
  timelineSlider: true,        // 75% of users
}
```

**Week 7:** Enable engagement features
```typescript
{
  notificationCenter: true,    // 100% of users
  prayerReminders: true,       // 100% of users
}
```

**Week 8:** Enable advanced features
```typescript
{
  connectionFilters: true,     // 100% of users
  connectionStats: true,       // 100% of users
}
```

**Rollback Criteria:**
- Crash rate increases >2%
- Performance degrades >20%
- Negative feedback spike (>30%)
- App store violations

---

## Best Practices

### DO ✅

1. **Use the simplest hook for your needs:**
   ```typescript
   // Good: Simple and performant
   const hasFeature = useFeature('enhancedAnimations');

   // Avoid: Unnecessary complexity
   const { flags } = useFeatureFlags();
   const hasFeature = flags.enhancedAnimations;
   ```

2. **Test both states:**
   - Test component with feature ON
   - Test component with feature OFF
   - Ensure graceful degradation

3. **Document feature dependencies:**
   ```typescript
   // Good: Clear dependency
   const hasAnimations = useFeature('enhancedAnimations');
   const hasParticles = useFeature('particleEffects');

   // Only show particles if animations are enabled
   {hasAnimations && hasParticles && <Particles />}
   ```

4. **Use feature flags for risky changes:**
   - New animations
   - Experimental features
   - Performance-critical code
   - Third-party integrations

5. **Clean up old flags:**
   - Remove flags once features are stable (>4 weeks)
   - Move stable features to permanent code
   - Document removal in changelog

### DON'T ❌

1. **Don't use flags for configuration:**
   ```typescript
   // Bad: Use environment variables instead
   const apiUrl = useFeature('useProductionAPI')
     ? 'https://api.prod.com'
     : 'https://api.dev.com';

   // Good: Use environment variables
   const apiUrl = import.meta.env.VITE_API_URL;
   ```

2. **Don't nest flags too deeply:**
   ```typescript
   // Bad: Complex nesting
   {hasA && hasB && hasC && hasD && <Component />}

   // Good: Combine flags logically
   const canShowComponent = hasA && hasB && hasC && hasD;
   {canShowComponent && <Component />}
   ```

3. **Don't forget mobile implications:**
   ```typescript
   // Bad: Ignoring mobile
   const hasHaptics = useFeature('hapticFeedback');
   await Haptics.impact(); // May not be available!

   // Good: Check platform
   if (hasHaptics && Capacitor.isNativePlatform()) {
     await Haptics.impact();
   }
   ```

4. **Don't leave flags indefinitely:**
   - Flags should be temporary (weeks, not years)
   - Remove after feature proves stable
   - Document in cleanup tickets

---

## Troubleshooting

### Issue: Flags not updating

**Symptom:** Changed flags in localStorage but UI doesn't update

**Solution:**
```javascript
// Reload the page after changing flags
window.location.reload();
```

### Issue: Flags different across tabs

**Symptom:** Different tabs show different features

**Solution:** The system auto-syncs across tabs. If not working:
```javascript
// Manually trigger sync
window.dispatchEvent(new StorageEvent('storage', {
  key: 'featureFlags',
  newValue: localStorage.getItem('featureFlags')
}));
```

### Issue: Can't find debug helpers

**Symptom:** `window.debugFeatureFlags` is undefined

**Solution:** Debug helpers only available in development:
```javascript
// Check environment
console.log(import.meta.env.DEV); // Should be true

// If in production, use manual method:
console.log(JSON.parse(localStorage.getItem('featureFlags') || '{}'));
```

### Issue: Feature not respecting flag

**Symptom:** Feature shows even when flag is OFF

**Solution:**
1. Check component is using the hook correctly
2. Verify flag name matches exactly (case-sensitive)
3. Check for hardcoded values
4. Verify provider wraps component

```typescript
// Debug: Log flag value
const hasFeature = useFeature('enhancedAnimations');
console.log('enhancedAnimations:', hasFeature);
```

### Issue: Performance degradation

**Symptom:** App slower with certain flags enabled

**Solution:**
1. Use React DevTools Profiler
2. Check animation frame rate
3. Consider disabling heavy features:
   ```javascript
   localStorage.setItem('featureFlags', JSON.stringify({
     particleEffects: false,  // Heavy on GPU
     spotlightBeams: false    // Heavy on render
   }));
   ```

---

## API Reference

See:
- `/src/config/featureFlags.ts` - Configuration and utilities
- `/src/contexts/FeatureFlagsContext.tsx` - React context and hooks

### Available Hooks

- `useFeature(flag)` - Get single flag value
- `useFeatures([flags])` - Get multiple flag values
- `useFeatureFlags()` - Get all flags and utilities
- `useFeatureFlagControls()` - Get control utilities (toggle, set, reset)

### Available Utilities

- `loadFeatureFlags()` - Load flags with overrides
- `saveFeatureFlagOverrides(overrides)` - Save overrides
- `resetFeatureFlags()` - Clear all overrides
- `getFeatureFlag(flag)` - Get single flag (non-React)
- `debugFeatureFlags()` - Log flags to console

---

## Support

For questions or issues:
1. Check this guide
2. Review `/src/config/featureFlags.ts` comments
3. Check `/src/contexts/FeatureFlagsContext.tsx` examples
4. Ask in team chat

**Last Updated:** 2025-11-30
