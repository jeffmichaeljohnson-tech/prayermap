# Feature Flags System

Centralized feature flag system for gradual rollout of PrayerMap enhancements.

## Files in This Directory

### Core System
- **`featureFlags.ts`** - Main configuration file with all flag definitions, environment configs, and utilities

### Documentation
- **`FEATURE_FLAGS_GUIDE.md`** - Complete usage guide with examples, testing workflow, and best practices
- **`FEATURE_FLAGS_QUICKREF.md`** - One-page quick reference cheat sheet
- **`featureFlags.integration.example.tsx`** - 12 real-world integration examples
- **`README.md`** - This file

### Related Files
- **`/src/contexts/FeatureFlagsContext.tsx`** - React Context provider and hooks
- **`/FEATURE_FLAGS_IMPLEMENTATION.md`** - Top-level implementation summary

## Quick Start

### 1. Read the Main Implementation Guide
Start here: [`/FEATURE_FLAGS_IMPLEMENTATION.md`](/FEATURE_FLAGS_IMPLEMENTATION.md)

### 2. Review the Quick Reference
For daily use: [`FEATURE_FLAGS_QUICKREF.md`](./FEATURE_FLAGS_QUICKREF.md)

### 3. Check Integration Examples
See real code: [`featureFlags.integration.example.tsx`](./featureFlags.integration.example.tsx)

## Available Feature Flags (16 total)

### Animation Features (6)
- `enhancedAnimations` - Master switch
- `spotlightBeams` - Spotlight effects
- `particleEffects` - Particle celebrations
- `celebrationBurst` - Burst animations
- `soundEffects` - Sound effects
- `hapticFeedback` - Haptic feedback (mobile)

### Memorial Lines Features (5)
- `memorialLinesDensity` - Density overlay
- `timelineSlider` - Timeline slider
- `connectionFilters` - Connection filters
- `connectionStats` - Statistics dashboard
- `firstImpressionAnimation` - Welcome animation

### Notification Features (3)
- `inAppNotifications` - In-app notifications
- `prayerReminders` - Prayer reminders
- `nearbyPrayerAlerts` - Nearby alerts

### New Components (2)
- `enhancedPrayButton` - Enhanced pray button
- `notificationCenter` - Notification center UI

## Usage

```typescript
import { useFeature } from '@/contexts/FeatureFlagsContext';

function MyComponent() {
  const hasEnhancedAnimations = useFeature('enhancedAnimations');

  return hasEnhancedAnimations ? <Enhanced /> : <Basic />;
}
```

## Testing

```javascript
// Browser console
window.debugFeatureFlags();

// Toggle flag
localStorage.setItem('featureFlags', JSON.stringify({ enhancedAnimations: true }));
location.reload();

// Reset
window.resetFeatureFlags();
location.reload();
```

## Documentation

- **Full Guide:** [`FEATURE_FLAGS_GUIDE.md`](./FEATURE_FLAGS_GUIDE.md)
- **Quick Ref:** [`FEATURE_FLAGS_QUICKREF.md`](./FEATURE_FLAGS_QUICKREF.md)
- **Examples:** [`featureFlags.integration.example.tsx`](./featureFlags.integration.example.tsx)

---

**Created:** 2025-11-30
**Total Flags:** 16
**Total Documentation:** ~1,800+ lines
