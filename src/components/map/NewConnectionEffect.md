# NewConnectionEffect Component

> **Dramatic entrance animation for real-time prayer connections**

When someone prays for another person in real-time, this component creates a celebratory animation that makes "the invisible visible" - showing the spiritual connection forming on the map.

---

## Features

### 1. Dramatic Line Drawing (2 seconds)
- Line draws from supporter location to prayer requester
- Smooth ease-out timing curve for natural finish
- GPU-accelerated pathLength animation via Framer Motion
- Quadratic bezier curve for elegant arc

### 2. Particle Trail
- Particles spawn and follow the line as it draws
- Color gradient from gold (#F7E7CE) to purple (#D4C5F9)
- Perpendicular spread for visual richness
- Canvas-based rendering for 60fps performance
- Particle count adapts to device capabilities

### 3. Endpoint Bursts
- **Small burst at supporter** (12 particles, gold hue)
  - Appears immediately when animation starts
  - Light haptic feedback
- **Large burst at requester** (24 particles, purple hue)
  - Appears when line completes drawing
  - Heavy haptic feedback for celebration

### 4. Integration Hooks
- `onAnimationStart()` - Fires when animation begins
- `onAnimationMidpoint()` - Fires when line is halfway drawn
- `onAnimationComplete()` - Fires when all effects finish
- `onRequestHaptic(pattern)` - Requests haptic feedback at key moments

### 5. Performance
- 60fps target via requestAnimationFrame
- GPU-accelerated (transform/opacity only)
- Respects prefers-reduced-motion
- Adapts to device capabilities (full/reduced/minimal)
- Automatic cleanup after completion

---

## Interface

```typescript
interface NewConnectionEffectProps {
  connection: PrayerConnection;
  map: MapboxMap;
  onAnimationStart?: () => void;
  onAnimationMidpoint?: () => void;
  onAnimationComplete?: () => void;
  onRequestHaptic?: (pattern: 'light' | 'medium' | 'heavy') => void;
}
```

---

## Basic Usage

```tsx
import { NewConnectionEffect, NewConnectionGradients } from './NewConnectionEffect';

function MyMapComponent({ map, newConnection }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      <defs>{NewConnectionGradients}</defs>

      <NewConnectionEffect
        connection={newConnection}
        map={map}
        onAnimationComplete={() => {
          console.log('Connection animation finished!');
        }}
      />
    </svg>
  );
}
```

---

## Advanced Usage with Sound & Haptics

```tsx
import { audioService } from '../../services/audioService';
import { hapticService } from '../../services/hapticService';

<NewConnectionEffect
  connection={newConnection}
  map={map}
  onAnimationStart={() => {
    // Play soft "whoosh" sound
    audioService.play('connection_start', 0.3);
  }}
  onAnimationMidpoint={() => {
    // Play gentle chime when line reaches destination
    audioService.play('connection_chime', 0.5);
  }}
  onAnimationComplete={() => {
    // Play completion sound
    audioService.play('connection_complete', 0.4);
  }}
  onRequestHaptic={(pattern) => {
    // Trigger device haptics
    hapticService.trigger(pattern);
  }}
/>
```

---

## Animation Timeline

```
0ms     ┌─ Animation starts
        ├─ onAnimationStart() fires
        ├─ Light haptic (supporter burst)
        └─ Small gold burst at supporter location

0-2000ms├─ Line draws from supporter to requester
        ├─ Particle trail follows the line
        └─ Glow effect pulses

1000ms  └─ onAnimationMidpoint() fires (line halfway)

2000ms  ┌─ Line drawing completes
        ├─ Heavy haptic (requester burst)
        └─ Large purple burst at requester location

2000-2500ms
        └─ Particles fade out

2500ms  └─ onAnimationComplete() fires
            Component returns null (cleanup)
```

---

## Performance Characteristics

### Animation Complexity Levels

**Full** (high-end devices):
- 3 particles per frame
- All visual effects enabled
- Glow and burst animations

**Reduced** (mid-range devices):
- 1 particle per frame
- Simplified effects
- No glow

**Minimal** (low-end or prefers-reduced-motion):
- No particles
- Instant line appearance
- Duration: 0ms

### GPU Acceleration

All animations use GPU-accelerated properties:
- `transform` (for scale, position)
- `opacity` (for fading)
- Canvas rendering (GPU-composited)

Avoids layout-triggering properties:
- ❌ No `width`, `height`, `top`, `left`
- ✅ Uses `transform` for all movement

---

## Accessibility

### Reduced Motion Support

Respects `prefers-reduced-motion: reduce`:
- Animations skip to completion
- No particle effects
- No camera movements
- Haptic feedback still fires (can be disabled)

### Visual Indicators

Even without motion:
- Connection line still appears
- Endpoint glows still visible
- Color gradient preserved

---

## Integration Patterns

### Real-time Supabase Integration

```typescript
import { supabase } from '../../lib/supabase';

function useRealtimeConnections(map: MapboxMap) {
  const [newConnections, setNewConnections] = useState([]);

  useEffect(() => {
    const channel = supabase
      .channel('prayer-connections')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'prayer_connections'
      }, (payload) => {
        setNewConnections(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return newConnections;
}
```

### Animation Queue Management

If multiple connections arrive simultaneously:

```typescript
function ConnectionAnimationQueue({ map, connections }) {
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (!active && queue.length > 0) {
      setActive(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [active, queue]);

  useEffect(() => {
    setQueue(prev => [...prev, ...connections]);
  }, [connections]);

  return active ? (
    <NewConnectionEffect
      connection={active}
      map={map}
      onAnimationComplete={() => setActive(null)}
    />
  ) : null;
}
```

---

## Color Palette

```css
/* Supporter (prayer sender) */
Gold: #F7E7CE (hue: 45°)

/* Gradient middle */
Lavender: #E8C4F8

/* Requester (prayer receiver) */
Purple: #D4C5F9 (hue: 270°)
```

---

## Technical Implementation

### Hybrid Rendering Approach

**SVG** - Used for:
- Connection line path (smooth curves)
- Gradient definitions
- Endpoint glows
- Blur filters

**Canvas** - Used for:
- Particle trail (many small elements)
- Burst particles (dynamic, short-lived)
- 60fps rendering via RAF

### Bezier Curve Math

Quadratic bezier formula:
```
B(t) = (1-t)² P0 + 2(1-t)t P1 + t² P2

where:
  P0 = supporter location
  P1 = control point (midpoint, 40px above)
  P2 = requester location
  t = 0 to 1 (animation progress)
```

---

## Files Created

1. **`NewConnectionEffect.tsx`** - Main component (582 lines)
   - Complete animation implementation
   - Export: `NewConnectionEffect`, `NewConnectionGradients`

2. **`NewConnectionEffect.example.tsx`** - Usage examples
   - Basic integration
   - Real-time subscription patterns
   - Sound and haptic integration

3. **`NewConnectionEffect.md`** - This documentation

---

## Memory Log

```
Topic: NewConnectionEffect Implementation
Decision: Hybrid SVG + Canvas rendering approach
Context: Need 60fps particle effects following curved paths
Reasoning:
  - Canvas excels at many small, dynamic particles
  - SVG excels at smooth curves and filters
  - Framer Motion provides pathLength animation
  - requestAnimationFrame for precise timing
Alternatives Considered:
  - Pure SVG: Too slow for many particles
  - Pure Canvas: Harder to achieve smooth curves
  - WebGL: Overkill for this use case
Mobile Impact:
  - Canvas is GPU-accelerated on iOS/Android
  - Excellent performance on all devices
  - Adapts to device capabilities
Performance:
  - 60fps on high-end devices
  - Graceful degradation on low-end
  - Respects user accessibility preferences
Date: 2025-11-29
```

---

## Next Steps

### Recommended Enhancements

1. **Sound Library**
   - Create audio assets for connection events
   - Integrate with audioService

2. **Analytics**
   - Track animation completion rates
   - Monitor performance metrics
   - A/B test particle counts

3. **Viewport Culling**
   - Only animate connections in view
   - Pause animations when map moves

4. **Connection Types**
   - Different colors for different prayer types
   - Varied particle effects for urgency levels

---

## Troubleshooting

### Animation Not Appearing

1. Check that gradients are included:
   ```tsx
   <defs>{NewConnectionGradients}</defs>
   ```

2. Verify map instance is ready:
   ```tsx
   if (!map) return null;
   ```

3. Check z-index layering:
   ```tsx
   <svg style={{ zIndex: 10 }}>
   ```

### Performance Issues

1. Reduce particle spawn rate:
   ```tsx
   const PARTICLE_SPAWN_RATE = 1; // Default: 3
   ```

2. Check animation complexity:
   ```tsx
   const complexity = getAnimationComplexity();
   console.log('Complexity:', complexity);
   ```

3. Monitor frame rate:
   ```tsx
   import { FrameRateMonitor } from '../../utils/animationPerformance';

   const monitor = new FrameRateMonitor();
   monitor.start((fps) => console.log('FPS:', fps));
   ```

---

*Built with love for PrayerMap - Making the invisible visible.*
