# ANIMATION-SPEC.md - Animation Preservation & Translation Guide

> **PURPOSE:** Document all current animations for preservation during the Expo + React Native migration. Every animation must be recreated with equivalent or better quality.

> **Status:** ACTIVE - Reference during Phase 2 development
> **Created:** 2025-12-08

---

## Animation Philosophy

PrayerMap animations are not decorative - they ARE the product experience. The "Living Map" vision requires:

1. **Spiritual Presence** - Animations convey the feeling of prayer in motion
2. **Immediate Feedback** - Users see their actions have impact instantly
3. **Smooth Performance** - 60 FPS minimum, no jank or stuttering
4. **Consistent Timing** - Same animation durations across platforms

---

## Current Animation Inventory

### 1. Prayer Connection Animation (CRITICAL - Living Map Core)

**File:** `src/features/prayers/components/PrayerAnimationLayer.tsx`

**Description:** When a user responds to a prayer, an animated line travels from the user's location to the prayer location and back, leaving a permanent memorial line.

**Sequence (6 seconds total):**
1. **0-1.5s** - Map zooms to show both locations
2. **0-2.4s** - Outbound line draws from replier → prayer (golden gradient)
3. **0-2.4s** - Glowing orb travels along the outbound path
4. **2.4-3.6s** - Pause at prayer location (pulse effect)
5. **3.6-5.4s** - Return line draws from prayer → replier (purple gradient)
6. **5.4-6s** - Permanent memorial line fades in (0.7 opacity)

**Technical Details:**
```
Path Type: Quadratic Bezier curve (smooth arc)
Control Point: midpoint with -80px Y offset (arc above straight line)
Stroke Width: 3px (traveling), 2px (permanent)
Gradients:
  - Outbound: gold (#FFD700) → blue (#70B8E8) → purple (#A78BFA)
  - Return: purple → blue → gold (reversed)
  - Permanent: Same gradient, 0.7 opacity
Orb: 20x20px rounded, shadow glow
Pulse: 48x48px blur, scale 1→1.8→1
```

**React Native Translation:**
```tsx
// Framer Motion → Reanimated
const pathLength = useSharedValue(0);
const animatedStyle = useAnimatedStyle(() => ({
  strokeDashoffset: interpolate(
    pathLength.value,
    [0, 1],
    [totalPathLength, 0]
  ),
}));

// Memorial line with Skia
<Path
  path={createCurvedPath(from, to)}
  style="stroke"
  strokeWidth={2}
  color={gradient}
>
  <LinearGradient colors={['#FFD700', '#70B8E8', '#A78BFA']} />
</Path>
```

---

### 2. Prayer Creation Animation

**File:** `src/features/prayers/components/PrayerCreationAnimation.tsx`

**Description:** When a user creates a new prayer, an animated prayer emoji flies from the bottom of the screen to the map location with ethereal trail effects.

**Sequence (3 seconds):**
1. **0-2.5s** - Emoji (🙏) flies along curved path with scale pulse
2. **0-2.5s** - Ethereal trail draws behind (gradient path)
3. **0.2-2s** - Sparkle particles follow path (4 particles, staggered)
4. **2-3s** - Landing burst (radial gradient scale out)
5. **2.2-3s** - Sparkle burst (8 particles, radial direction)

**Technical Details:**
```
Path: Quadratic Bezier from bottom-center to target location
  Start: (window.width/2, window.height - 100)
  Control: ((start.x + end.x)/2, min(start.y, end.y) - 100)
Trail:
  Gradient: gold → pink → purple → light blue
  Width: 4px with glow filter (blur stdDeviation: 4)
  Ease: easeInOut
Emoji:
  Size: 48px (text-5xl)
  Scale: 1 → 1.3 → 1
  Glow: 80x80px gradient blob behind
Sparkle Burst:
  Count: 8 particles
  Direction: Radial (i * 45deg)
  Distance: 60px from center
```

**React Native Translation:**
```tsx
// Sparkle burst with Reanimated
const sparkles = Array(8).fill(0).map((_, i) => {
  const angle = (i * Math.PI * 2) / 8;
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  useEffect(() => {
    offsetX.value = withDelay(2200, withTiming(Math.cos(angle) * 60));
    offsetY.value = withDelay(2200, withTiming(Math.sin(angle) * 60));
  }, []);

  return <AnimatedSparkle style={{ transform: [{ translateX: offsetX }, { translateY: offsetY }] }} />;
});
```

---

### 3. Prayer Marker Animation

**File:** `src/features/prayers/components/PrayerMarker.tsx`

**Description:** Prayer markers on the map have continuous floating animations and response badge animations.

**Animations:**
- **Float**: Marker moves up/down 5px continuously
- **Preview Float**: Text bubble moves up/down 3px
- **Glow Pulse**: Category-colored glow scales 1→1.5→1
- **Badge Pop**: Response count badge springs in on update
- **Hover**: Scale to 1.2x
- **Tap**: Scale to 0.9x

**Technical Details:**
```
Float Motion:
  Y offset: [0, -5, 0]
  Duration: 2s
  Repeat: Infinite
  Ease: easeInOut

Glow Pulse:
  Scale: [1, 1.5, 1]
  Opacity: [0.3, 0.6, 0.3]
  Duration: 2s
  Repeat: Infinite

Badge Spring:
  Type: spring
  Damping: 15
  Stiffness: 300

Category Glow Colors:
  - Health (red): bg-red-300/30
  - Peace (blue): bg-blue-300/30
  - Gratitude (amber): bg-amber-300/30
  - Relationships (pink): bg-pink-300/30
  - Guidance (purple): bg-purple-300/30
  - Financial (green): bg-green-300/30
  - Spiritual (indigo): bg-indigo-300/30
  - General (yellow): bg-yellow-300/30
```

**React Native Translation:**
```tsx
// Infinite float with Reanimated
const offsetY = useSharedValue(0);

useEffect(() => {
  offsetY.value = withRepeat(
    withSequence(
      withTiming(-5, { duration: 1000 }),
      withTiming(0, { duration: 1000 })
    ),
    -1,
    true
  );
}, []);

// Badge spring
const scale = useSharedValue(0);
useEffect(() => {
  scale.value = withSpring(1, { damping: 15, stiffness: 300 });
}, [count]);
```

---

### 4. Sun/Moon Indicator Animation

**File:** `src/features/map/components/SunMoonIndicator.tsx`

**Description:** Time-of-day indicator shows ethereal sun or moon with ambient animations.

**Sun Animations:**
- **Body Glow**: Box shadow pulses
- **Float**: Y position [0, -2, 0] over 8s
- **Rays**: 6 rays pulse opacity and height
- **Transition Pulse**: During sunset/sunrise, radial gradient pulses

**Moon Animations:**
- **Scale Breath**: [1, 1.05, 1] over 4s
- **Outer Glow**: Opacity [0.2, 0.5, 0.2], Scale [1.5, 1.7, 1.5] over 3s

**Technical Details:**
```
Sun:
  Size: 24x24px
  Gradient: amber-200 → yellow-300 → orange-300
  Shadow Animation:
    - Base: 0 0 20px rgba(251, 191, 36, 0.5)
    - Pulse: 0 0 30px rgba(251, 146, 60, 0.6)
  Ray Count: 6
  Ray Heights: 12px → 14px → 12px

Moon:
  Size: 24x24px
  Gradient: blue-100/95 → indigo-50/85 → purple-100/90
  Glow: purple-200/30 with 150% scale
  Has crescent shadow overlay

Panel Entry:
  Initial: opacity: 0, x: 20
  Animate: opacity: 1, x: 0
  Delay: 0.5s
  Duration: 0.8s
```

---

### 5. Modal Transitions

**Files:** Various modal components

**Description:** Modals (Prayer Detail, Inbox, Settings, etc.) use consistent enter/exit animations.

**Standard Modal Animation:**
```
Entry:
  Initial: opacity: 0, y: 50
  Animate: opacity: 1, y: 0
  Duration: 0.3s
  Ease: easeOut

Exit:
  Animate: opacity: 0, y: 50
  Duration: 0.2s
  Ease: easeIn
```

**Bottom Sheet Animation:**
```
Entry:
  Initial: y: "100%"
  Animate: y: 0
  Type: spring
  Damping: 30
  Stiffness: 300

Exit:
  Animate: y: "100%"
  Duration: 0.2s
```

**React Native Translation:**
```tsx
// Use react-native-reanimated + react-native-gesture-handler
// Or use @gorhom/bottom-sheet for bottom sheets

const translateY = useSharedValue(windowHeight);
const openModal = () => {
  translateY.value = withSpring(0, { damping: 30, stiffness: 300 });
};
```

---

### 6. Cluster Marker Animation

**File:** `src/features/prayers/components/ClusterMarker.tsx`

**Description:** When multiple prayers are clustered, the cluster marker has special animations.

**Animations:**
- **Glow Pulse**: Same as individual markers but larger
- **Count Badge**: Springs in when cluster forms
- **Expand Effect**: When tapped, expands to show individual markers

---

### 7. Onboarding Flow Animations

**File:** `src/features/onboarding/components/OnboardingFlow.tsx`

**Description:** Multi-step onboarding with page transitions and illustrations.

**Animations:**
- **Page Slide**: Horizontal slide between steps
- **Progress Indicator**: Animated progress bar
- **Illustration Entrance**: Fade + scale for images
- **Button Pulse**: CTA button subtle pulse

---

### 8. Media Player Animations

**Files:** Audio/Video player components

**Description:** Playback controls and waveform visualizations.

**Animations:**
- **Waveform**: Bars animate to audio levels
- **Progress Indicator**: Smooth scrubbing
- **Play/Pause**: Icon transition with scale
- **Loading Spinner**: Rotating loader

---

## Translation Reference Table

| Framer Motion | React Native Reanimated |
|--------------|------------------------|
| `motion.div` | `Animated.View` |
| `motion.button` | `AnimatedPressable` |
| `animate={{ x: 100 }}` | `useAnimatedStyle + translateX` |
| `initial={{ opacity: 0 }}` | `useSharedValue(0)` |
| `transition={{ duration: 0.3 }}` | `withTiming(value, { duration: 300 })` |
| `transition={{ type: 'spring' }}` | `withSpring(value, { damping, stiffness })` |
| `whileHover` | `Pressable onPressIn/onPressOut` |
| `whileTap` | `Pressable onPressIn` |
| `AnimatePresence` | `entering/exiting` props |
| `variants` | Worklet functions |
| `repeat: Infinity` | `withRepeat(animation, -1)` |

---

## SVG/Path Translation

| Framer Motion SVG | React Native Skia |
|------------------|------------------|
| `<motion.path>` | `<Path>` with animated props |
| `pathLength` | Custom stroke dash animation |
| `<linearGradient>` | `<LinearGradient>` shader |
| `filter: blur()` | `<Blur>` image filter |
| `d="M x y Q cx cy x2 y2"` | `Skia.Path.Make().moveTo().quadTo()` |

**Example - Animated Path Drawing:**
```tsx
// Skia animated memorial line
const progress = useSharedValue(0);
const path = useMemo(() => {
  const p = Skia.Path.Make();
  p.moveTo(from.x, from.y);
  p.quadTo(control.x, control.y, to.x, to.y);
  return p;
}, [from, to, control]);

const animatedPath = useDerivedValue(() => {
  return path.trim(0, progress.value, false);
});

// In render
<Path path={animatedPath} style="stroke" strokeWidth={2}>
  <LinearGradient
    start={vec(from.x, from.y)}
    end={vec(to.x, to.y)}
    colors={['#FFD700', '#70B8E8', '#A78BFA']}
  />
</Path>
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frame Rate | 60 FPS | React Native Performance Monitor |
| Animation Start | < 16ms | Time to first frame |
| JS Thread | < 5ms per frame | No blocking during animations |
| Memory | < 50MB for animations | Profiler |

### Optimization Techniques

1. **Use `useNativeDriver`** (automatic in Reanimated)
2. **Avoid JS thread** for animations (worklets)
3. **Memoize paths** with `useMemo`
4. **Shared values** instead of state for animating values
5. **Skia for complex graphics** (GPU accelerated)

---

## Testing Strategy

### Visual Regression Testing

Use **Storybook** for React Native to create isolated animation stories:

```tsx
// PrayerAnimation.stories.tsx
export const ConnectionAnimation = () => (
  <PrayerAnimationLayer
    prayer={mockPrayer}
    userLocation={mockLocation}
    map={mockMap}
    onComplete={() => console.log('Complete')}
  />
);
```

### Performance Testing

1. **Animation Inspector** in Flipper
2. **React Native Performance Monitor**
3. **Skia debug mode** for path rendering
4. **Real device testing** (simulator can mask issues)

---

## Development Tools

### Recommended for Animation Creation

| Tool | Use Case |
|------|----------|
| **Rive** | Complex vector animations, AI-assisted |
| **Lottie** | After Effects exports |
| **Storybook RN** | Isolated component development |
| **Flipper** | Performance debugging |
| **React DevTools** | Component tree inspection |

### AI-Assisted Animation

**Rive** now includes AI animation assistant:
- Describe animation in natural language
- Generate keyframes automatically
- Export to React Native Rive player

---

## Migration Checklist

For each animation, verify:

- [ ] Visual fidelity matches web version
- [ ] Timing matches (use stopwatch if needed)
- [ ] 60 FPS on low-end devices (iPhone SE, Pixel 3a)
- [ ] No JS thread blocking during animation
- [ ] Works with reduced motion accessibility setting
- [ ] Memory doesn't leak on repeat plays

---

## Related Documentation

- **[MOBILE-STRATEGY.md](./MOBILE-STRATEGY.md)** - Overall mobile approach
- **[LIVING-MAP-PRINCIPLE.md](./LIVING-MAP-PRINCIPLE.md)** - Why animations matter
- **[PRD.md](./PRD.md)** - Product requirements

---

**Last Updated:** 2025-12-08
**Version:** 1.0
