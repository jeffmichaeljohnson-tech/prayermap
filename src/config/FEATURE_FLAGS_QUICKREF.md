# Feature Flags Quick Reference

One-page reference for PrayerMap feature flags system.

## 🚀 Quick Start (3 Steps)

### 1. Add Provider (in main.tsx)

```typescript
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';

createRoot(document.getElementById("root")!).render(
  <FeatureFlagsProvider>
    <App />
  </FeatureFlagsProvider>
);
```

### 2. Use in Components

```typescript
import { useFeature } from '@/contexts/FeatureFlagsContext';

const hasFeature = useFeature('enhancedAnimations');
```

### 3. Test in Browser Console

```javascript
// View flags
window.debugFeatureFlags();

// Toggle a flag
localStorage.setItem('featureFlags', JSON.stringify({ enhancedAnimations: true }));
location.reload();
```

---

## 📚 Available Hooks

| Hook | Usage | When to Use |
|------|-------|-------------|
| `useFeature(flag)` | `const enabled = useFeature('enhancedAnimations')` | Most common - single flag |
| `useFeatures([flags])` | `const { a, b } = useFeatures(['a', 'b'])` | Multiple related flags |
| `useFeatureFlags()` | `const { flags, isEnabled } = useFeatureFlags()` | Need all flags or utils |
| `useFeatureFlagControls()` | `const { toggle, reset } = useFeatureFlagControls()` | QA/testing tools |

---

## 🏁 Available Feature Flags

### Animation Features
- `enhancedAnimations` - Master switch for all animations
- `spotlightBeams` - Spotlight effects on markers
- `particleEffects` - Particle celebration effects
- `celebrationBurst` - Celebration burst animations
- `soundEffects` - Sound effects for interactions
- `hapticFeedback` - Haptic feedback (mobile)

### Memorial Lines Features
- `memorialLinesDensity` - Density overlay visualization
- `timelineSlider` - Timeline slider control
- `connectionFilters` - Filter connections by type
- `connectionStats` - Statistics dashboard
- `firstImpressionAnimation` - Welcome animation

### Notification Features
- `inAppNotifications` - In-app notification system
- `prayerReminders` - Prayer reminder notifications
- `nearbyPrayerAlerts` - Nearby prayer alerts

### New Components
- `enhancedPrayButton` - Enhanced pray button
- `notificationCenter` - Notification center UI

---

## 💡 Common Patterns

### Conditional Rendering
```typescript
const hasFeature = useFeature('enhancedAnimations');

return hasFeature ? <Enhanced /> : <Basic />;
```

### Progressive Enhancement
```typescript
const { animations, particles } = useFeatures(['enhancedAnimations', 'particleEffects']);

return (
  <div>
    <Base />
    {animations && <Animations />}
    {animations && particles && <Particles />}
  </div>
);
```

### Mobile Haptics
```typescript
const hasHaptics = useFeature('hapticFeedback');

if (hasHaptics && Capacitor.isNativePlatform()) {
  await Haptics.impact({ style: ImpactStyle.Medium });
}
```

### Sound Effects
```typescript
const hasSounds = useFeature('soundEffects');

if (hasSounds) {
  playSound('prayer-sent');
}
```

---

## 🧪 Testing Commands

```javascript
// View current flags
window.debugFeatureFlags();

// Enable specific flags
localStorage.setItem('featureFlags', JSON.stringify({
  enhancedAnimations: true,
  spotlightBeams: true
}));
location.reload();

// Disable specific flags
localStorage.setItem('featureFlags', JSON.stringify({
  soundEffects: false
}));
location.reload();

// Reset to environment defaults
window.resetFeatureFlags();
location.reload();

// View raw storage
console.log(localStorage.getItem('featureFlags'));
```

---

## 🎯 Environment Defaults

| Environment | Flags |
|-------------|-------|
| **Development** | All ON |
| **Staging** | Most ON (conservative choices) |
| **Production** | Core only (gradual rollout) |

Override with `VITE_APP_ENV`:
- `development` / `dev`
- `staging` / `stage`
- `production` / `prod`

---

## ⚡ Performance Tips

1. **Use simplest hook:**
   ```typescript
   // ✅ Good
   const hasFeature = useFeature('enhancedAnimations');

   // ❌ Avoid
   const { flags } = useFeatureFlags();
   const hasFeature = flags.enhancedAnimations;
   ```

2. **Minimize re-renders:**
   ```typescript
   // ✅ Good - only re-renders when specific flags change
   const { a, b } = useFeatures(['a', 'b']);

   // ❌ Avoid - re-renders when ANY flag changes
   const { flags } = useFeatureFlags();
   ```

3. **Memoize expensive operations:**
   ```typescript
   const hasAnimations = useFeature('enhancedAnimations');

   const expensiveCalc = useMemo(() => {
     if (!hasAnimations) return null;
     return calculateAnimationPath();
   }, [hasAnimations]);
   ```

---

## 🔍 Debugging

### Check if flag is enabled
```typescript
import { getFeatureFlag } from '@/config/featureFlags';

console.log('Enhanced animations:', getFeatureFlag('enhancedAnimations'));
```

### View all flags (non-React)
```typescript
import { loadFeatureFlags } from '@/config/featureFlags';

console.log(loadFeatureFlags());
```

### Debug panel (dev only)
```typescript
import { FeatureFlagDebugPanel } from '@/contexts/FeatureFlagsContext';

// Add to app
{import.meta.env.DEV && <FeatureFlagDebugPanel />}
```

---

## ⚠️ Common Mistakes

### ❌ DON'T
```typescript
// Don't use for config
const apiUrl = useFeature('useProductionAPI') ? ... : ...;

// Don't forget mobile checks
await Haptics.impact(); // May fail!

// Don't nest too deeply
{a && b && c && d && <Component />}

// Don't leave flags forever
// Remove after feature is stable
```

### ✅ DO
```typescript
// Use environment variables for config
const apiUrl = import.meta.env.VITE_API_URL;

// Check platform for mobile features
if (Capacitor.isNativePlatform()) {
  await Haptics.impact();
}

// Combine flags logically
const canShow = a && b && c && d;
{canShow && <Component />}

// Clean up old flags
// Remove after 4-8 weeks
```

---

## 📋 Rollout Phases

### Phase 1: Internal (Week 1-2)
- All flags ON
- Test on all platforms
- Verify 60fps animations

### Phase 2: Beta (Week 3-4)
- Enable for 20-30% users
- Monitor metrics
- Gather feedback

### Phase 3: Production (Week 5-8)
- Gradual rollout
- Week 5: Visual enhancements (50%)
- Week 6: Data visualizations (75%)
- Week 7: Notifications (100%)
- Week 8: Advanced features (100%)

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Flags not updating | Reload page after changing localStorage |
| Different across tabs | Auto-syncs; wait a moment or reload |
| Debug helpers missing | Only in development mode |
| Feature ignoring flag | Check hook usage and flag name (case-sensitive) |
| Performance issues | Disable heavy features (particles, spotlights) |

---

## 📖 Full Documentation

- **Setup Guide:** `/src/config/FEATURE_FLAGS_GUIDE.md`
- **Examples:** `/src/config/featureFlags.integration.example.tsx`
- **Configuration:** `/src/config/featureFlags.ts`
- **Context:** `/src/contexts/FeatureFlagsContext.tsx`

---

**Last Updated:** 2025-11-30
