# FirstImpressionAnimation Integration Guide

## Overview

The `FirstImpressionAnimation` component orchestrates a dramatic reveal of existing prayer connections when a new user first opens PrayerMap. This creates a memorable first impression that immediately conveys "this is a place where prayer happens."

## Features

- **5-second orchestrated sequence**: Map fade → Line cascade → Pulse → Settle
- **Performance optimized**: Up to 200 lines, staggered in groups of 20
- **User-friendly**: Skippable with prominent button
- **One-time experience**: Tracked via localStorage
- **Smooth 60fps animations**: GPU-accelerated only
- **Audio enhancement**: Optional sound effect on reveal

## Installation

The component is located at `/src/components/map/FirstImpressionAnimation.tsx` and exports:
- `FirstImpressionAnimation` - Main component
- `useFirstImpression` - Convenience hook
- `FirstImpressionAnimationProps` - TypeScript interface

## Basic Usage

### Option 1: Using the Hook (Recommended)

```tsx
import { FirstImpressionAnimation, useFirstImpression } from './components/map/FirstImpressionAnimation';
import { MemorialLinesLayer } from './components/map/MemorialLinesLayer';

function MapView() {
  const [connections, setConnections] = useState<PrayerConnection[]>([]);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);

  // Hook handles localStorage checking and state management
  const { shouldShowAnimation, onComplete, onSkip } = useFirstImpression(connections);

  return (
    <div className="relative w-full h-full">
      {/* MapBox container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* First impression animation (shows once) */}
      {shouldShowAnimation && (
        <FirstImpressionAnimation
          connections={connections}
          map={map}
          onComplete={onComplete}
          onSkip={onSkip}
        />
      )}

      {/* Memorial lines (always rendered) */}
      <MemorialLinesLayer
        connections={connections}
        map={map}
        mapLoaded={mapLoaded}
        mapBounds={mapBounds}
      />
    </div>
  );
}
```

### Option 2: Manual Integration

```tsx
import { FirstImpressionAnimation } from './components/map/FirstImpressionAnimation';

function MapView() {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    const hasShown = localStorage.getItem('prayermap:first_impression_shown');
    setShowAnimation(!hasShown && connections.length > 0);
  }, [connections.length]);

  const handleComplete = () => {
    setShowAnimation(false);
    console.log('First impression animation completed');
  };

  const handleSkip = () => {
    setShowAnimation(false);
    console.log('User skipped animation');
  };

  return (
    <div className="relative w-full h-full">
      {showAnimation && (
        <FirstImpressionAnimation
          connections={connections}
          map={map}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
```

## How It Works

### Animation Sequence

**Phase 1 (0-1s): Map Fade In**
- Full-screen overlay with `bg-heavenly-blue`
- Fades out over 1 second
- Sets the stage for the reveal

**Phase 2 (1-3s): Line Cascade**
- Connections sorted by age (oldest first)
- Animated in groups of 20
- 50ms stagger within each group
- 200ms delay between groups
- Creates a "spreading" effect across the map
- Camera zooms out by 0.8 levels

**Phase 3 (3-4s): Pulse**
- Gentle radial gradient pulse
- Opacity animates [0, 0.15, 0]
- Draws attention to the complete network

**Phase 4 (4-5s): Settle**
- Camera zooms back to original level
- Transitions to normal viewing mode
- Calls `onComplete` callback

### State Management

The component tracks visible connection IDs in a Set:

```tsx
const [visibleConnectionIds, setVisibleConnectionIds] = useState<Set<string>>(new Set());
```

During Phase 2, connections are progressively added to this Set, which can be used by parent components to filter which connections to render.

### Performance Optimizations

1. **Limited Scope**: Max 200 connections animated (configurable via `MAX_ANIMATED_LINES`)
2. **Staggered Rendering**: Groups of 20 prevent frame drops
3. **GPU Acceleration**: Only opacity and transform animations (no repaints)
4. **Cleanup**: All timeouts tracked in `timeoutsRef` and cleared on unmount
5. **Animation Complexity Check**: Respects user's `prefers-reduced-motion`

## Props API

```typescript
interface FirstImpressionAnimationProps {
  connections: PrayerConnection[];  // All available connections
  map: mapboxgl.Map | null;        // MapBox GL instance
  onComplete: () => void;           // Called when animation finishes
  onSkip: () => void;               // Called when user skips
}
```

## Hook API

```typescript
function useFirstImpression(connections: PrayerConnection[]) {
  return {
    shouldShowAnimation: boolean,  // True if animation should play
    hasShown: boolean,             // True if animation was shown before
    onComplete: () => void,        // Completion handler
    onSkip: () => void            // Skip handler
  };
}
```

## Customization

### Adjust Timing

Edit constants at the top of the file:

```tsx
const MAX_ANIMATED_LINES = 200;         // Max connections to animate
const LINES_PER_GROUP = 20;            // Lines per stagger group
const STAGGER_WITHIN_GROUP = 50;       // ms between lines in group
const STAGGER_BETWEEN_GROUPS = 200;    // ms between groups
```

### Change Colors

The component uses Tailwind classes:
- `bg-heavenly-blue` - Initial overlay color
- `from-dawn-gold/30` - Pulse gradient color (via inline style)

Modify these in `tailwind.config.js`:

```js
colors: {
  'heavenly-blue': '#E8F4F8',
  'dawn-gold': '#F7E7CE'
}
```

### Disable Audio

The component attempts to play a sound effect via `audioService`. To disable:

```tsx
// Remove or comment out in the component:
audioService.init().then(() => {
  audioService.play('gentle_whoosh', 0.3);
});
```

### Skip Button Styling

The skip button uses Tailwind classes. Customize in the component:

```tsx
<button className="px-6 py-3 bg-white/90 backdrop-blur-sm rounded-full...">
  Skip
</button>
```

## Testing

### Reset localStorage

To test the animation again:

```js
localStorage.removeItem('prayermap:first_impression_shown');
// Refresh the page
```

### Force Animation

Bypass localStorage check:

```tsx
// In parent component
const [forceShow, setForceShow] = useState(true);

// ...

{forceShow && (
  <FirstImpressionAnimation
    connections={connections}
    map={map}
    onComplete={() => setForceShow(false)}
    onSkip={() => setForceShow(false)}
  />
)}
```

### Test Performance

Open Chrome DevTools:
1. Performance tab → Record
2. Trigger animation (clear localStorage, refresh)
3. Stop recording
4. Check FPS graph - should be steady 60fps
5. Check "Scripting" time - should be minimal

## Integration with MemorialLinesLayer

The `FirstImpressionAnimation` is designed to work alongside `MemorialLinesLayer`:

```tsx
function MapView() {
  const { shouldShowAnimation, onComplete, onSkip } = useFirstImpression(connections);

  return (
    <>
      {/* First Impression - plays once */}
      {shouldShowAnimation && (
        <FirstImpressionAnimation
          connections={connections}
          map={map}
          onComplete={onComplete}
          onSkip={onSkip}
        />
      )}

      {/* Memorial Lines - always present */}
      <MemorialLinesLayer
        connections={connections}
        map={map}
        mapLoaded={mapLoaded}
        mapBounds={mapBounds}
      />
    </>
  );
}
```

**Note**: The `FirstImpressionAnimation` only provides UI overlays (skip button, pulse effect, instructional text). The actual memorial lines should still be rendered by `MemorialLinesLayer`, which handles viewport culling, entrance animations, and interactive features.

## Accessibility

- **Skip button**: Clearly labeled with `aria-label`
- **Reduced motion**: Respects `getAnimationComplexity()` check
- **Keyboard accessible**: Skip button is focusable
- **Non-blocking**: User can skip at any time

## Mobile Considerations

- **Touch targets**: Skip button is 44x44pt minimum (iOS guideline)
- **Performance**: Tested on iPhone 8 (oldest supported)
- **Network**: Animation doesn't block data loading
- **Battery**: Limited to 5 seconds, GPU-accelerated only

## Troubleshooting

**Animation doesn't play:**
- Check localStorage: `localStorage.getItem('prayermap:first_impression_shown')`
- Verify `connections.length > 0`
- Check animation complexity: `getAnimationComplexity() !== 'minimal'`

**Performance issues:**
- Reduce `MAX_ANIMATED_LINES` (currently 200)
- Increase `STAGGER_BETWEEN_GROUPS` (currently 200ms)
- Check for other heavy rendering during animation

**Skip button not visible:**
- Check z-index conflicts (button is `z-50`)
- Verify Tailwind classes are compiled
- Check viewport size (button may be off-screen)

## Future Enhancements

Potential improvements:
- [ ] Configurable animation duration via props
- [ ] Custom sound effect support
- [ ] Different reveal patterns (spiral, wave, random)
- [ ] Integration with analytics to track skip rate
- [ ] A/B testing different sequences

---

**Created**: 2025-11-29
**Version**: 1.0
**Component**: `/src/components/map/FirstImpressionAnimation.tsx`
