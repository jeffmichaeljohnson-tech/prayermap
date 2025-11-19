# PrayerMap - Interactions & Animations Guide

Complete documentation of all user interactions, animations, and state transitions.

---

## User Flow Overview

```
App Launch
    ↓
[Loading Screen] (2s animation)
    ↓
[Auth Modal] (Sign in with Apple)
    ↓
[Map View] ← Main Hub
    |
    ├─→ Click Prayer Marker → [Prayer Detail Modal]
    |                              ↓
    |                         Send Prayer
    |                              ↓
    |                     [Prayer Animation] (6s)
    |                              ↓
    |                    [Memorial Line Created]
    |                              ↓
    |                       Return to Map
    |
    ├─→ Click Request Prayer → [Request Prayer Modal]
    |                              ↓
    |                         Submit Request
    |                              ↓
    |                     [New Marker Created]
    |                              ↓
    |                       Return to Map
    |
    ├─→ Click Inbox → [Inbox Modal]
    |                     ↓
    |              Click Prayer Card
    |                     ↓
    |           [Prayer Detail Modal]
    |
    └─→ Click Settings → [Future: Settings Screen]
```

---

## Interaction Specifications

### 1. Loading Screen

#### Initial Load
**Trigger:** App launch
**Duration:** 2000ms

**Animation Sequence:**
1. **0ms:** Screen fades in (opacity 0 → 1, 300ms)
2. **0ms - 2000ms:** Prayer hands pulse continuously
   - Scale: [1, 1.1, 1]
   - Duration: 1000ms
   - Repeat: Infinite
   - Easing: ease-in-out
3. **2000ms:** Screen fades out (opacity 1 → 0, 300ms)
4. **2300ms:** Auth Modal appears

**Code:**
```javascript
// Fade in
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ duration: 0.3 }}

// Prayer hands pulse
animate={{ scale: [1, 1.1, 1] }}
transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}

// Auto-dismiss after 2s
useEffect(() => {
  const timer = setTimeout(() => setIsLoading(false), 2000);
  return () => clearTimeout(timer);
}, []);
```

---

### 2. Authentication Modal

#### Modal Entrance
**Trigger:** Loading screen completes
**Duration:** 300ms

**Animation:**
- **Overlay:** Fade in (opacity 0 → 1)
- **Card:** Scale up + fade in (scale 0.9 → 1, opacity 0 → 1)
- **Easing:** ease-out

**Code:**
```javascript
// Overlay
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ duration: 0.3 }}

// Card
initial={{ opacity: 0, scale: 0.9 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ duration: 0.3 }}
```

#### Floating Particles
**Animation:** Continuous
**Duration:** 6000ms per cycle
**Repeat:** Infinite

**Each Particle:**
- **Y Position:** [-20px, 20px, -20px]
- **Background Position:** ['0% 50%', '100% 50%', '0% 50%'] (gradient flow)
- **Easing:** ease-in-out

**Code:**
```javascript
animate={{
  y: [-20, 20, -20],
  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
}}
transition={{
  duration: 6,
  repeat: Infinity,
  ease: "easeInOut"
}}
```

#### Sign in with Apple Button

**Hover:**
- **Shadow:** xl → 2xl
- **Transition:** 300ms

**Click:**
- **Scale:** 1 → 0.98
- **Duration:** 100ms

**Loading State:**
- **Content:** Replaced with spinner
- **Spinner:** 20px, white, continuous rotation
- **Text:** Hidden

**Code:**
```javascript
// Hover
whileHover={{ boxShadow: "0 25px 80px 0 rgba(0,0,0,0.2)" }}

// Tap
whileTap={{ scale: 0.98 }}

// Loading
{isLoading ? (
  <Spinner className="w-5 h-5 text-white" />
) : (
  <>
    <AppleIcon />
    <span>Sign in with Apple</span>
  </>
)}
```

#### Success Transition
**Trigger:** Successful authentication
**Duration:** 300ms

**Animation:**
- **Modal:** Scale down + fade out (scale 1 → 0.9, opacity 1 → 0)
- **Overlay:** Fade out (opacity 1 → 0)
- **Map View:** Fades in as modal fades out

---

### 3. Map View

#### Initial Load
**Map:**
- Tiles load progressively
- Zoom to user location (Beverly Hills, MI)
- Markers appear after map loads

#### Map Interactions

**Pan (Drag):**
- **Trigger:** Touch drag or mouse drag
- **Behavior:** Map follows finger/cursor
- **Inertia:** Continues briefly after release
- **Easing:** Deceleration curve

**Zoom:**
- **Mobile:** Pinch gesture
- **Desktop:** Scroll wheel
- **Behavior:** Smooth zoom in/out
- **Limits:** Min zoom 2, Max zoom 20

**Rotate (Mobile):**
- **Trigger:** Two-finger rotation gesture
- **Behavior:** Map rotates around center
- **Snap:** Returns to north-up on release (optional)

#### Prayer Marker Interactions

**Hover (Desktop):**
1. **Marker scales up:** 1 → 1.1 (200ms)
2. **Shadow increases:** medium → large
3. **Preview bubble appears:** Fade + slide up (150ms)

**Hover End:**
1. **Marker scales down:** 1.1 → 1 (200ms)
2. **Shadow decreases:** large → medium
3. **Preview bubble disappears:** Fade + slide down (150ms)

**Click/Tap:**
1. **Marker scales:** 1 → 0.95 → 1 (quick bounce)
2. **Prayer Detail Modal opens**
3. **Map stays in current position**

**Code:**
```javascript
// Marker container
<motion.div
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.2 }}
>
  {/* Marker circle */}
</motion.div>

// Preview bubble
{isHovered && (
  <motion.div
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 4 }}
    transition={{ duration: 0.15 }}
  >
    <PreviewBubble />
  </motion.div>
)}
```

#### Connection Line Interactions

**Hover:**
1. **Line brightens:** Gradient changes to hover variant
2. **Stroke width increases:** 2px → 3px
3. **Glow appears:** Subtle drop shadow
4. **Tooltip appears:** At mouse position
5. **Transition:** All 200ms

**Hover End:**
1. **Line returns to default:** All properties revert
2. **Tooltip fades out:** 150ms

**Code:**
```javascript
<path
  stroke={isHovered ? "url(#connectionGradientHover)" : "url(#connectionGradient)"}
  strokeWidth={isHovered ? 3 : 2}
  opacity={isHovered ? 1 : 0.8}
  onMouseEnter={onHover}
  onMouseLeave={onLeave}
  style={{ transition: "all 0.2s ease" }}
/>
```

#### Header Buttons

**Inbox Button:**
- **Hover:** Background changes to white 20%
- **Click:** Opens Inbox Modal
- **Badge:** Pulse animation if unread count > 0

**Settings Button:**
- **Hover:** Background changes to white 20%
- **Click:** Opens Settings (future feature)

**Code:**
```javascript
<button className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200">
  <Icon className="w-6 h-6 text-gray-700" />
</button>
```

#### Request Prayer Button

**Hover:**
- **Scale:** 1 → 1.05
- **Shadow:** xl → 2xl
- **Duration:** 200ms

**Click:**
- **Scale:** 1.05 → 0.95 → 1
- **Duration:** 300ms total
- **Modal opens** immediately after scale animation

**Code:**
```javascript
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.2 }}
  onClick={() => setShowRequestModal(true)}
>
  <span>🙏</span>
  <span>Request Prayer</span>
</motion.button>
```

---

### 4. Prayer Detail Modal

#### Modal Entrance
**Mobile:**
- **Initial:** Positioned below screen (y: 100%)
- **Animate:** Slides up to position (y: 0)
- **Type:** Spring animation (damping: 25, stiffness: 300)
- **Duration:** ~400ms

**Desktop:**
- **Initial:** Centered, scaled down (scale: 0.9), transparent
- **Animate:** Scales to full size (scale: 1), opaque
- **Duration:** 300ms

**Code:**
```javascript
// Mobile
initial={{ y: "100%", opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
transition={{ type: "spring", damping: 25, stiffness: 300 }}

// Desktop (sm and up)
initial={{ scale: 0.9, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
transition={{ duration: 0.3 }}
```

#### Reply Type Selection

**Click on Type Button:**
1. **Button background:** glass → glass-strong
2. **Shadow increases:** none → large
3. **Animated border appears:**
   - Rainbow gradient
   - Flows continuously (3s cycle)
   - 2px width using mask composite
4. **Reply form expands:** Height auto from 0
5. **Duration:** 300ms

**Code:**
```javascript
// Button state
className={`
  relative flex-1 p-3 rounded-xl transition-all duration-200
  ${replyType === 'text' ? 'glass-strong shadow-lg' : 'glass hover:glass-strong'}
`}

// Animated border (when selected)
{replyType === 'text' && (
  <motion.div
    className="absolute inset-0 rounded-xl pointer-events-none"
    style={{
      background: 'linear-gradient(90deg, rgba(255,215,0,0.4), ...)',
      backgroundSize: '300% 300%',
      padding: '2px',
      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      maskComposite: 'exclude'
    }}
    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
  />
)}

// Form expansion
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* Form content */}
</motion.div>
```

#### Send Prayer Button

**Click:**
1. **Button stays in place**
2. **Spotlight animations begin** (2 yellow + purple beams)
   - From bottom to top
   - Scale Y: [0, 1]
   - Opacity: [0, 1, 0]
   - Duration: 2s
3. **After 2s:** Success state appears
4. **Success state:**
   - Sparkle emoji (✨) pulses
   - "Prayer sent..." text
   - Duration: 500ms
5. **After 2.5s total:** Modal closes
6. **Prayer Animation Layer begins**

**Code:**
```javascript
const handlePray = () => {
  setIsPraying(true);
  setShowSpotlight(true);
  
  setTimeout(() => {
    onPray(prayer);
  }, 2500);
};

// Spotlight animation
<motion.div
  className="absolute left-1/4 bottom-0 w-24 h-full bg-gradient-to-t from-yellow-300/60"
  animate={{ scaleY: [0, 1], opacity: [0, 1, 0] }}
  transition={{ duration: 2, ease: "easeOut" }}
/>

// Success state
{isPraying && (
  <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
  >
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      ✨
    </motion.div>
    <p>Prayer sent...</p>
  </motion.div>
)}
```

#### Close Button

**Click:**
- **Modal exit animation:** Reverse of entrance
- **Duration:** 300ms
- **Overlay fades out** simultaneously

#### Overlay Click

**Click outside modal:**
- **Modal closes** (same as close button)
- **Click inside modal:** Event propagation stopped

**Code:**
```javascript
<div onClick={onClose}>
  <div onClick={(e) => e.stopPropagation()}>
    {/* Modal content */}
  </div>
</div>
```

---

### 5. Request Prayer Modal

#### Modal Entrance/Exit
Same specifications as Prayer Detail Modal

#### Content Type Selection
Same interaction as reply type selection in Prayer Detail Modal

#### Form Validation

**Real-time Validation:**
- **Empty content:** Submit button disabled
- **Valid content:** Submit button enabled
- **Transition:** 200ms opacity/color change

**Submit Click (Invalid):**
- **Form shakes:** translateX([-10px, 10px, -10px, 0])
- **Error message appears:** Fade in below invalid field
- **Duration:** 500ms

**Code:**
```javascript
// Validation
const isValid = content.trim().length > 0;

// Submit button state
<Button
  disabled={!isValid}
  className={isValid ? 'opacity-100' : 'opacity-50'}
>
  Share Prayer Request
</Button>

// Error shake animation
{error && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1, x: [-10, 10, -10, 0] }}
    transition={{ duration: 0.5 }}
    className="text-red-600 text-sm mt-2"
  >
    {error}
  </motion.div>
)}
```

#### Submit Success

**Animation Sequence:**
1. **Button shows loading:** Spinner replaces content
2. **After API success:** Success state appears
   - Sparkle emoji (✨) scales in
   - "Prayer shared!" text
   - Duration: 1s
3. **Modal closes**
4. **New marker appears on map** at user location

**Code:**
```javascript
const handleSubmit = async () => {
  setIsSubmitting(true);
  
  try {
    await onSubmit(newPrayer);
    setShowSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  } catch (error) {
    setError('Failed to share prayer');
    setIsSubmitting(false);
  }
};
```

---

### 6. Inbox Modal

#### Modal Entrance/Exit
Same as Prayer Detail Modal, but larger max width (512px vs 448px)

#### Tab Switching

**Click on Tab:**
1. **Active tab highlight moves:** Smooth transition
2. **Content fades out:** 150ms
3. **New content fades in:** 150ms (staggered)
4. **Total duration:** 300ms

**Code:**
```javascript
const [activeTab, setActiveTab] = useState('all');

// Tab button
<button
  className={`
    py-2 px-4 rounded-lg transition-all duration-200
    ${activeTab === tab.id 
      ? 'bg-white text-gray-800 shadow-sm' 
      : 'text-gray-600 hover:text-gray-800'}
  `}
  onClick={() => setActiveTab(tab.id)}
>
  {tab.label}
</button>

// Content transition
<AnimatePresence mode="wait">
  <motion.div
    key={activeTab}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
  >
    {filteredPrayers.map(prayer => <PrayerCard />)}
  </motion.div>
</AnimatePresence>
```

#### Prayer Card Interactions

**Hover:**
- **Background:** glass → glass-subtle
- **Transform:** translateY(0 → -2px)
- **Shadow:** medium → large
- **Duration:** 200ms

**Click:**
1. **Card scales briefly:** 1 → 0.98 → 1
2. **Inbox Modal closes**
3. **Prayer Detail Modal opens** with that prayer

**Code:**
```javascript
<motion.div
  className="glass rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:glass-subtle hover:-translate-y-0.5 hover:shadow-lg"
  whileTap={{ scale: 0.98 }}
  onClick={() => handlePrayerClick(prayer)}
>
  {/* Card content */}
</motion.div>
```

#### Scrolling

**Behavior:**
- **Scroll container:** Prayer list area only
- **Smooth scroll:** Native browser smooth scroll
- **Scrollbar:** Custom styled (thin, semi-transparent)

**Scrollbar Styles:**
```css
.prayer-list::-webkit-scrollbar {
  width: 6px;
}

.prayer-list::-webkit-scrollbar-track {
  background: transparent;
}

.prayer-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.prayer-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
```

---

### 7. Prayer Animation Layer

This is the most complex animation sequence in the app.

#### Trigger
**Event:** User clicks "Send Prayer" in Prayer Detail Modal
**Delay:** 2.5s after click (after modal spotlight animation)

#### Full 6-Second Sequence

**Phase 1: Map Camera Movement (0-2s)**

```javascript
// Calculate midpoint between user and prayer
const midpoint = [
  (userLng + prayerLng) / 2,
  (userLat + prayerLat) / 2
];

// Calculate ideal zoom to fit both points
const distance = calculateDistance(userLocation, prayerLocation);
const idealZoom = currentZoom - Math.log2(distance / 400);

// Calculate bearing (rotation toward prayer)
const bearing = calculateBearing(userLocation, prayerLocation);

// Animate camera
map.easeTo({
  center: midpoint,
  zoom: idealZoom,
  pitch: 60, // 3D tilt
  bearing: bearing,
  duration: 2000,
  easing: (t) => t * (2 - t) // ease-in-out
});
```

**Visual:**
- Map smoothly moves and rotates
- Tilts to 60° for 3D perspective
- Both user and prayer locations visible
- Duration: 2 seconds

---

**Phase 2: Animated Line Draw (2-4s)**

```javascript
// SVG path from user to prayer
const pathD = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

// Measure path length
const pathLength = pathElement.getTotalLength();

// Animate line drawing
<motion.path
  d={pathD}
  stroke="url(#lineGradient)"
  strokeWidth="3"
  fill="none"
  strokeDasharray={pathLength}
  strokeDashoffset={pathLength}
  animate={{ strokeDashoffset: [pathLength, 0] }}
  transition={{ duration: 2, delay: 2, ease: "linear" }}
/>
```

**Visual:**
- Curved line appears to "draw" from user to prayer
- Gold-to-purple gradient
- Smooth, linear progression
- Duration: 2 seconds
- Delay: 2 seconds (after camera movement)

**Concurrent: Pulsing Circles**

```javascript
// At both endpoints
<motion.circle
  cx={startX}
  cy={startY}
  r={10}
  fill="#FFD700"
  animate={{
    r: [10, 20, 10],
    opacity: [0.8, 0.4, 0.8]
  }}
  transition={{
    duration: 1.5,
    delay: 2,
    repeat: 1,
    ease: "easeInOut"
  }}
/>
```

**Visual:**
- Circles pulse at both locations
- Synchronized with line drawing
- 2 cycles total

---

**Phase 3: Spotlight Effects (4-6s)**

```javascript
// Yellow spotlight at prayer location
<motion.div
  style={{
    position: 'absolute',
    left: `${prayerX}px`,
    bottom: 0,
    width: '100px',
    height: '100%',
    background: 'linear-gradient(to top, rgba(255,215,0,0.6), ...)',
  }}
  animate={{
    scaleY: [0, 1],
    opacity: [0, 1, 0]
  }}
  transition={{
    duration: 2,
    delay: 4,
    ease: "easeOut"
  }}
/>

// Purple spotlight at user location (similar)
```

**Visual:**
- Two beams of light shoot upward
- One yellow (at prayer), one purple (at user)
- Fade in, then fade out
- Duration: 2 seconds
- Delay: 4 seconds (after line finishes)

---

**Phase 4: Camera Return (4-6s, concurrent with spotlights)**

```javascript
map.easeTo({
  center: originalCenter,
  zoom: originalZoom,
  pitch: 0, // Back to flat
  bearing: originalBearing,
  duration: 2000,
  easing: (t) => t * (2 - t)
});
```

**Visual:**
- Camera smoothly returns to original position
- Pitch returns to 0° (flat view)
- Happens while spotlights are playing
- Duration: 2 seconds

---

**Phase 5: Completion (6s)**

```javascript
// After 6 seconds total
setTimeout(() => {
  // Remove animation layer
  setAnimatingPrayer(null);
  
  // Create permanent memorial line
  const newConnection = {
    id: `conn-${Date.now()}`,
    fromLocation: prayerLocation,
    toLocation: userLocation,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 year
  };
  
  setConnections([...connections, newConnection]);
  
  // Mark prayer as prayed
  setPrayers(prayers.map(p => 
    p.id === prayer.id 
      ? { ...p, prayedBy: [...p.prayedBy, 'current-user'] }
      : p
  ));
  
  // Call completion callback
  onComplete();
}, 6000);
```

**Visual:**
- Animation layer disappears
- Memorial line appears on map (permanent)
- Prayer marker shows gold border + checkmark
- User can interact with map again

---

### 8. Memorial Line Interactions

#### Hover

**Animation:**
```javascript
// Line properties transition
transition: all 0.2s ease

// Default → Hover
strokeWidth: 2 → 3
opacity: 0.8 → 1
stroke: gradient → brighterGradient
filter: none → drop-shadow(0 0 8px rgba(255,215,0,0.6))
```

**Tooltip:**
```javascript
// Appears at mouse position
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.15 }}
  style={{
    position: 'fixed',
    left: mouseX,
    top: mouseY,
    transform: 'translate(-50%, -120%)'
  }}
>
  <div className="glass-strong rounded-lg p-2">
    <p>Prayer from {requesterName}</p>
    <p>Prayed by {replierName}</p>
    <p>{relativeTime(createdAt)}</p>
  </div>
</motion.div>
```

**Visual:**
- Line brightens and thickens
- Subtle glow effect
- Tooltip shows connection details
- All transitions smooth (200ms)

---

## Animation Performance Notes

### Optimization Strategies

1. **Use GPU Acceleration:**
   - Transform and opacity animations only when possible
   - Avoid animating width, height, top, left
   - Use `will-change` hint for complex animations

2. **Throttle Map Updates:**
   - Update marker positions max 60fps
   - Debounce scroll/zoom events

3. **Conditional Rendering:**
   - Remove off-screen markers from DOM
   - Lazy load inbox prayer cards
   - Unmount inactive modals

4. **SVG Optimization:**
   - Use `path` instead of complex shapes
   - Minimize filter effects
   - Cache path lengths

### Critical Performance Code

```javascript
// GPU acceleration hint
.animated-element {
  will-change: transform, opacity;
}

// Throttle map updates
const throttledUpdate = useCallback(
  throttle(() => {
    updateMarkerPositions();
  }, 16), // ~60fps
  []
);

// Conditional marker rendering
{markers
  .filter(marker => isInViewport(marker, mapBounds))
  .map(marker => <PrayerMarker key={marker.id} {...marker} />)
}
```

---

## State Transitions

### Loading States

#### App Loading
```
Initial → Loading (2s) → Auth
```

#### Authentication
```
Idle → Loading → Success → Map View
      ↓
     Error (show message, return to Idle)
```

#### Prayer Submission
```
Form → Validating → Submitting → Success → Modal Close
       ↓            ↓
      Error       Error
```

#### Prayer Animation
```
Modal Close → Animation Start → Phase 1 (2s) → Phase 2 (2s) → Phase 3 (2s) → Complete
```

### Modal Stack

**Z-Index Hierarchy:**
```
Map (0) 
  → Connection Lines (5)
  → Markers (10)
  → Preview Bubbles (20)
  → Map Header (30)
  → Request Button (40)
  → Modals (50)
  → Auth Modal (60)
  → Animation Layer (70)
  → Loading Screen (100)
```

**Only one modal open at a time** (except Animation Layer which overlays everything)

---

## Gesture Support

### Mobile Gestures

**Map:**
- **Single finger drag:** Pan
- **Pinch:** Zoom
- **Two finger rotate:** Rotate map
- **Double tap:** Zoom in
- **Two finger tap:** Zoom out

**Modals:**
- **Swipe down:** Close modal (bottom sheet style)
- **Tap outside:** Close modal
- **Scroll in content:** Scroll prayer list

**Markers:**
- **Tap:** Open detail
- **Long press:** (Future: additional options)

### Desktop Interactions

**Map:**
- **Click drag:** Pan
- **Scroll wheel:** Zoom
- **Ctrl + drag:** Rotate
- **Shift + drag:** Pitch (tilt)

**Modals:**
- **Click outside:** Close
- **Escape key:** Close
- **Mouse wheel in content:** Scroll

**Markers:**
- **Hover:** Show preview
- **Click:** Open detail

---

## Accessibility

### Keyboard Navigation

**Tab Order:**
1. Map container (focusable)
2. Inbox button
3. Settings button
4. Request Prayer button
5. Each prayer marker (when visible)

**Keyboard Shortcuts:**
- **Escape:** Close active modal
- **Tab:** Navigate between interactive elements
- **Enter/Space:** Activate focused button
- **Arrow keys:** Navigate within lists (inbox)

### Screen Reader Support

**ARIA Labels:**
```jsx
// Example implementations
<button aria-label="Open inbox (3 unread prayers)">
  <Inbox />
</button>

<button aria-label={`Prayer from ${userName}, ${distance} miles away`}>
  🙏
</button>

<div role="dialog" aria-labelledby="modal-title" aria-modal="true">
  <h2 id="modal-title">Request Prayer</h2>
  {/* Modal content */}
</div>
```

**Focus Management:**
```javascript
// Trap focus in modal
useEffect(() => {
  if (isOpen) {
    const firstFocusable = modalRef.current?.querySelector('button, input');
    firstFocusable?.focus();
  }
}, [isOpen]);
```

---

## Error Handling

### Network Errors

**Prayer Submission Failure:**
1. **Loading state continues** during retry
2. **Error message appears** below submit button
3. **Button returns to enabled** state
4. **User can retry** submission

**Map Tile Loading Failure:**
1. **Show placeholder** background color
2. **Retry automatically** (3 attempts)
3. **Display error message** if all retries fail

### Validation Errors

**Form Validation:**
- **Real-time:** Highlight invalid fields
- **On submit:** Show all errors at once
- **Clear errors:** When user starts fixing

**Example:**
```javascript
const [errors, setErrors] = useState({});

const validate = () => {
  const newErrors = {};
  if (!content.trim()) {
    newErrors.content = 'Prayer content is required';
  }
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

// In render
{errors.content && (
  <p className="text-red-600 text-sm mt-1">{errors.content}</p>
)}
```

---

## Animation Timing Reference

| Animation | Duration | Delay | Easing | Repeat |
|-----------|----------|-------|--------|--------|
| Loading screen fade in | 300ms | 0ms | ease-out | Once |
| Prayer hands pulse | 1000ms | 0ms | ease-in-out | Infinite |
| Loading screen fade out | 300ms | 2000ms | ease-in | Once |
| Auth modal entrance | 300ms | 0ms | ease-out | Once |
| Floating particles | 6000ms | 0ms | ease-in-out | Infinite |
| Modal slide up (mobile) | ~400ms | 0ms | spring | Once |
| Modal scale in (desktop) | 300ms | 0ms | ease-out | Once |
| Button hover | 200ms | 0ms | ease-out | Once |
| Button tap | 100ms | 0ms | ease-out | Once |
| Marker scale hover | 200ms | 0ms | ease-out | Once |
| Preview bubble appear | 150ms | 0ms | ease-out | Once |
| Tab switch | 300ms | 0ms | ease-in-out | Once |
| Prayer card hover | 200ms | 0ms | ease-out | Once |
| Map camera movement | 2000ms | 0ms | custom ease | Once |
| Animated line draw | 2000ms | 2000ms | linear | Once |
| Pulsing circles | 1500ms | 2000ms | ease-in-out | Twice |
| Spotlight beams | 2000ms | 4000ms | ease-out | Once |
| Camera return | 2000ms | 4000ms | custom ease | Once |
| Connection line hover | 200ms | 0ms | ease | Once |
| Tooltip appear | 150ms | 0ms | ease-out | Once |
| Rainbow border flow | 3000ms | 0ms | linear | Infinite |
