# PrayerMap - Detailed Screen Specifications

---

## 01 - Loading Screen

### Overview
**File:** `/App.tsx` (initial loading state)
**Duration:** 2 seconds
**Purpose:** App initialization with animated prayer hands
**Transition:** Fades to Auth Modal

### Visual Specifications

#### Layout
- **Type:** Full screen overlay
- **Background:** White (`#FFFFFF`)
- **Centering:** Flexbox center (both axes)
- **Z-Index:** 100

#### Elements

**Prayer Hands Emoji**
- **Content:** 🙏
- **Font Size:** 80px (`text-8xl`)
- **Animation:** Scale pulse [1, 1.1, 1]
- **Duration:** 1s
- **Repeat:** Infinite
- **Easing:** ease-in-out

**App Title**
- **Text:** "PrayerMap"
- **Font:** Cinzel, Bold (700)
- **Size:** 48px (`text-5xl`)
- **Color:** Gray 800 (#1F2937)
- **Position:** Below emoji
- **Margin Top:** 24px (`mt-6`)

### Animation Sequence
1. Component mounts with opacity 0
2. Fade in over 300ms
3. Prayer hands pulse continuously
4. After 2000ms, fade out over 300ms
5. Unmount and show Auth Modal

### Technical Notes
```javascript
// State management
const [isLoading, setIsLoading] = useState(true);

// Timing
useEffect(() => {
  const timer = setTimeout(() => {
    setIsLoading(false);
  }, 2000);
  return () => clearTimeout(timer);
}, []);

// Animation
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
>
```

---

## 02 - Auth Modal

### Overview
**File:** `/components/AuthModal.tsx`
**Purpose:** User authentication with Apple sign-in
**Authentication:** Sign in with Apple integration
**Appearance:** After loading screen, before map

### Visual Specifications

#### Modal Container
- **Position:** Fixed, full screen
- **Background:** `rgba(0, 0, 0, 0.3)` with backdrop blur
- **Backdrop Blur:** 8px (`backdrop-blur-sm`)
- **Alignment:** Center (both axes)
- **Padding:** 16px all sides (`p-4`)
- **Z-Index:** 60

#### Modal Card
- **Width:** 100% max 384px (`max-w-sm`)
- **Background:** Glass strong (white 95% opacity)
- **Backdrop Filter:** 20px blur
- **Border Radius:** 24px (`rounded-3xl`)
- **Border:** 1px solid white 30% opacity
- **Shadow:** Large shadow (0 8px 32px rgba(0,0,0,0.1))
- **Padding:** 48px vertical, 32px horizontal (`py-12 px-8`)
- **Overflow:** Hidden (for particle effects)
- **Position:** Relative (for absolute children)

### Elements

#### Floating Particles Background (5 particles)

**Particle Specs:**
- **Shape:** Rounded rectangles
- **Width:** 64px (`w-16`)
- **Height:** 64px (`h-16`)
- **Border Radius:** 12px (`rounded-xl`)
- **Background:** Ethereal gradient (gold → pink → purple → sky blue → gold)
- **Background Size:** 300% 300%
- **Opacity:** 0.3
- **Blur:** 16px (`blur-sm`)
- **Position:** Absolute
- **Animation:** Floating motion (y-axis movement)

**Particle Positions:**
1. Top-left: `top-0 left-0`
2. Top-right: `top-0 right-0`
3. Center: `top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`
4. Bottom-left: `bottom-0 left-0`
5. Bottom-right: `bottom-0 right-0`

**Animation:**
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

#### Content (Z-Index: 10, relative)

**Prayer Hands Icon**
- **Content:** 🙏
- **Font Size:** 64px (`text-6xl`)
- **Margin Bottom:** 24px (`mb-6`)
- **Alignment:** Center

**Tagline**
- **Text:** "Prayer. Shared."
- **Font:** Cinzel, Regular (400)
- **Size:** 20px (`text-xl`)
- **Color:** Gray 700 (#374151)
- **Letter Spacing:** 0.125rem (`tracking-widest`)
- **Margin Bottom:** 32px (`mb-8`)
- **Alignment:** Center

**Sign in with Apple Button**
- **Width:** 100%
- **Background:** Black (#000000)
- **Text Color:** White (#FFFFFF)
- **Font:** Inter, Semi-Bold (600)
- **Font Size:** 16px
- **Padding:** 16px vertical, 32px horizontal (`py-4 px-8`)
- **Border Radius:** Full (`rounded-full`)
- **Alignment:** Center
- **Flex:** Row with center alignment
- **Gap:** 12px (`gap-3`)
- **Shadow:** Extra large (`shadow-xl`)
- **Transition:** All 300ms
- **Hover:** Shadow 2xl

**Button Icon (Apple Logo)**
- **Content:** 
- **Size:** 20px (`w-5 h-5`)
- **Color:** White

**Button States:**
- **Default:** Black background, white text, XL shadow
- **Hover:** 2XL shadow increase
- **Active:** Scale 0.95
- **Loading:** Spinner replaces content

### Interaction Flow

1. **Modal appears** after loading screen with fade + scale animation
2. **Particles float** continuously in background
3. **User clicks** "Sign in with Apple" button
4. **Button shows loading** state (spinner)
5. **On success:** Modal fades out, Map View appears
6. **On error:** Error message appears below button (red text)

### Animation Specifications

#### Modal Entry
```javascript
initial={{ opacity: 0, scale: 0.9 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.9 }}
transition={{ duration: 0.3 }}
```

#### Button Interaction
```javascript
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}
```

### States

#### Default State
- All elements visible
- Particles animating
- Button ready for interaction

#### Loading State
- Button disabled
- Text replaced with spinner
- Spinner: 20px, white color, continuous rotation

#### Error State
- Error message appears below button
- Text: Red 600 color
- Small size (14px)
- Fade in animation

### Technical Notes

```javascript
// Sign in handler
const handleSignIn = async () => {
  setIsLoading(true);
  try {
    // Apple sign-in logic
    await signInWithApple();
    onAuthComplete();
  } catch (error) {
    setError('Failed to sign in');
    setIsLoading(false);
  }
};
```

---

## 03 - Map View (Main Screen)

### Overview
**File:** `/components/PrayerMap.tsx`
**Purpose:** Main app interface with interactive prayer map
**Map Provider:** Mapbox GL JS
**Map Style:** `mapbox://styles/mapbox/light-v11`
**Access Token:** Required (stored in environment)

### Layout Structure

```
┌─────────────────────────────────────┐
│ [Glassmorphic Header]               │ ← Top (Z-30)
│ [Inbox] PrayerMap [Settings]        │
├─────────────────────────────────────┤
│                                     │
│                                     │
│        [Full Mapbox Map]            │ ← Z-0
│     with Prayer Markers 🙏          │
│     and Connection Lines            │
│                                     │
│                                     │
│                                     │
│      [Request Prayer Button]        │ ← Bottom center (Z-40)
└─────────────────────────────────────┘
```

### Visual Specifications

#### Map Container
- **Position:** Absolute, full screen (`inset-0`)
- **Width:** 100%
- **Height:** 100%
- **Background:** Light blue (#e8f4f8) while loading
- **Z-Index:** 0

#### Mapbox Configuration
```javascript
{
  container: mapContainer,
  style: 'mapbox://styles/mapbox/light-v11',
  center: [userLocation.lng, userLocation.lat],
  zoom: 12,
  pitch: 0,
  bearing: 0,
  attributionControl: false
}
```

#### Map Customization
- **Water Color:** `hsl(210, 80%, 85%)` (light dawn blue)
- **Landuse Opacity:** 0.3
- **Center:** Beverly Hills, Michigan (default)
- **Coordinates:** Approx. 42.5361° N, 83.2316° W

### Header Component

**Container:**
- **Position:** Absolute top
- **Padding:** 16px (`p-4`)
- **Z-Index:** 30
- **Pointer Events:** None (container), Auto (glass card)

**Glass Card:**
- **Background:** Glass strong
- **Padding:** 16px (`p-4`)
- **Border Radius:** 16px (`rounded-2xl`)
- **Flexbox:** Row, space-between, items-center
- **Shadow:** Medium

**Left Button (Inbox):**
- **Icon:** Inbox (Lucide)
- **Size:** 24px (`w-6 h-6`)
- **Color:** Gray 700
- **Padding:** 8px (`p-2`)
- **Border Radius:** 8px (`rounded-lg`)
- **Hover:** White 20% background
- **Transition:** Colors 200ms
- **Position:** Relative (for notification badge)

**Notification Badge:**
- **Position:** Absolute top-right (-4px, -4px)
- **Width:** 20px (`w-5`)
- **Height:** 20px (`h-5`)
- **Background:** Pink 500 (`#EC4899`)
- **Color:** White
- **Font Size:** 12px (`text-xs`)
- **Border Radius:** Full (`rounded-full`)
- **Flexbox:** Center (both axes)
- **Content:** "3" (number of unread prayers)

**Center Text (Title):**
- **Text:** "PrayerMap"
- **Font:** Cinzel (inherited from h2)
- **Color:** Gray 800
- **Size:** 20px (from typography system)

**Right Button (Settings):**
- **Icon:** Settings (Lucide)
- **Size:** 24px (`w-6 h-6`)
- **Color:** Gray 700
- **Padding:** 8px (`p-2`)
- **Border Radius:** 8px (`rounded-lg`)
- **Hover:** White 20% background
- **Transition:** Colors 200ms

### Prayer Markers (Overlay Layer)

**Container:**
- **Position:** Absolute, full screen (`inset-0`)
- **Pointer Events:** None (container)
- **Z-Index:** 10

**Individual Markers:** (See Prayer Marker component specs)
- Positioned using Mapbox projection
- Pointer events enabled per marker
- 🙏 emoji in glassmorphic circle
- Hover shows preview bubble

### Prayer Connection Lines (SVG Layer)

**Container:**
- **Element:** `<svg>`
- **Position:** Absolute, full screen (`inset-0`)
- **Width:** 100%
- **Height:** 100%
- **Pointer Events:** None
- **Z-Index:** 5

**SVG Definitions:**
```svg
<defs>
  <linearGradient id="connectionGradient">
    <!-- Gold → Sky Blue → Purple -->
  </linearGradient>
  <linearGradient id="connectionGradientHover">
    <!-- Brighter version for hover -->
  </linearGradient>
  <linearGradient id="glowGradient">
    <!-- For glow effects -->
  </linearGradient>
</defs>
```

**Connection Lines:** (See Prayer Connection component specs)
- Curved paths between prayer locations
- Rainbow gradient stroke
- Hover state with glow
- Tooltip on hover

### Request Prayer Button

**Container:**
- **Position:** Absolute bottom
- **Bottom:** 80px (`bottom-20`)
- **Horizontal:** Centered (`left-1/2 -translate-x-1/2`)
- **Z-Index:** 40

**Button:**
- **Background:** Glass strong
- **Padding:** 16px vertical, 32px horizontal (`py-4 px-8`)
- **Border Radius:** Full (`rounded-full`)
- **Flexbox:** Row, center, gap 12px (`gap-3`)
- **Shadow:** Extra large (`shadow-xl`)
- **Hover Shadow:** 2XL (`hover:shadow-2xl`)
- **Transition:** Shadow 300ms
- **Width:** Auto (content-based)

**Button Content:**
- **Icon:** 🙏 emoji, 32px (`text-2xl`)
- **Text:** "Request Prayer"
- **Font:** Inter, from button styles
- **Size:** 16px
- **Color:** Gray 800

**Button Interactions:**
```javascript
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

### Responsive Behavior

#### Mobile (< 768px)
- Header: Full width with padding
- Markers: Touch-friendly (48px min touch target)
- Buttons: Bottom-anchored for thumb access
- Map: Touch gestures (pinch zoom, pan, rotate)

#### Desktop (≥ 768px)
- Header: Same layout
- Markers: Mouse hover shows previews
- Buttons: Mouse interactions
- Map: Mouse controls (scroll zoom, click-drag pan)

### Map Interactions

**Touch/Mouse Gestures:**
- **Pan:** Drag to move
- **Zoom:** Pinch (mobile) or scroll (desktop)
- **Rotate:** Two-finger rotate (mobile)
- **Tilt:** Not enabled by default (pitch: 0)

**Marker Click:**
1. User clicks/taps prayer marker
2. Prayer Detail Modal opens
3. Map stays in current position

**Connection Line Hover:**
1. User hovers over memorial line
2. Line brightens (glow effect)
3. Tooltip appears showing names and date
4. Hover state removed on mouse leave

### States

#### Loading State
- Light blue background visible
- Map tiles loading
- Markers not yet rendered

#### Default State
- Map fully loaded
- Markers positioned correctly
- Connection lines rendered
- All interactions enabled

#### Empty State (No Prayers)
- Map visible
- No markers displayed
- Request Prayer button emphasized
- Optional: Empty state message

#### Animation State
- When prayer sent, Prayer Animation Layer overlays
- Map camera animates (zoom, tilt, pan)
- Interactive markers disabled during animation
- Returns to default after 6 seconds

### Technical Notes

#### Map Initialization
```javascript
useEffect(() => {
  if (!mapContainer.current || map.current) return;

  map.current = new mapboxgl.Map({
    container: mapContainer.current,
    style: 'mapbox://styles/mapbox/light-v11',
    center: [lng, lat],
    zoom: 12,
    pitch: 0,
    bearing: 0,
    attributionControl: false
  });

  map.current.on('load', () => {
    // Customize colors
  });

  return () => {
    map.current?.remove();
  };
}, []);
```

#### Marker Projection
```javascript
const project = (lng: number, lat: number) => {
  if (!map) return { x: 0, y: 0 };
  const point = map.project([lng, lat]);
  return { x: point.x, y: point.y };
};
```

#### Map State Tracking
```javascript
map.on('move', () => {
  setMapState({
    center: [map.getCenter().lng, map.getCenter().lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing()
  });
});
```

---

## 04 - Prayer Detail Modal

### Overview
**File:** `/components/PrayerDetailModal.tsx`
**Purpose:** View prayer details and send prayer response
**Trigger:** Click on prayer marker
**Features:** Distance display, multi-format replies, anonymous option

### Visual Specifications

#### Modal Overlay
- **Position:** Fixed, full screen (`inset-0`)
- **Background:** `rgba(0, 0, 0, 0.3)` with backdrop blur
- **Backdrop Blur:** 8px (`backdrop-blur-sm`)
- **Z-Index:** 50
- **Flexbox:** End (mobile) or center (desktop) alignment
- **Padding:** 16px (`p-4`)

**Click Behavior:** Click overlay to close modal

#### Modal Card
- **Width:** 100%, max 448px (`max-w-md`)
- **Background:** Glass strong
- **Padding:** 24px (`p-6`)
- **Border Radius:** 24px (`rounded-3xl`)
- **Position:** Relative
- **Overflow:** Hidden (for spotlight effects)

**Entry Animation (Mobile):**
```javascript
initial={{ y: "100%", opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
exit={{ y: "100%", opacity: 0 }}
transition={{ type: "spring", damping: 25, stiffness: 300 }}
```

**Entry Animation (Desktop):**
```javascript
initial={{ scale: 0.9, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
exit={{ scale: 0.9, opacity: 0 }}
transition={{ duration: 0.3 }}
```

### Elements

#### Spotlight Effects (When Praying)

**Yellow Spotlight:**
- **Position:** Absolute, `left-1/4 bottom-0`
- **Width:** 96px (`w-24`)
- **Height:** 100%
- **Background:** Gradient to top (yellow 60% → yellow 40% → transparent)
- **Animation:** Scale Y [0, 1], Opacity [0, 1, 0]
- **Duration:** 2s, ease out

**Purple Spotlight:**
- **Position:** Absolute, `right-1/4 bottom-0`
- **Width:** 96px (`w-24`)
- **Height:** 100%
- **Background:** Gradient to top (purple 60% → purple 40% → transparent)
- **Animation:** Scale Y [0, 1], Opacity [0, 1, 0]
- **Duration:** 2s, ease out

#### Close Button
- **Position:** Absolute top-right (16px, 16px)
- **Icon:** X (Lucide)
- **Size:** 20px (`w-5 h-5`)
- **Color:** Gray 700
- **Padding:** 8px (`p-2`)
- **Border Radius:** Full (`rounded-full`)
- **Hover:** White 20% background
- **Transition:** Colors 200ms

#### Header Section
- **Margin Bottom:** 24px (`mb-6`)

**User Info Container:**
- **Flexbox:** Row, items-center, gap 12px (`gap-3`)
- **Margin Bottom:** 8px (`mb-2`)

**Prayer Emoji:**
- **Content:** 🙏
- **Font Size:** 48px (`text-4xl`)

**User Details:**
- **Container:** Flex column

**User Name:**
- **Font:** H3 style (Inter, Semi-Bold, 18px)
- **Color:** Gray 800
- **Content:** User's name or "Anonymous"

**Distance Display:**
- **Font:** Body Small (Inter, Regular, 12px)
- **Color:** Gray 600
- **Format:** "[X.X] miles away"
- **Calculation:** Haversine formula from user location

#### Content Section
- **Margin Bottom:** 24px (`mb-6`)

**Prayer Title (Optional):**
- **Font:** H4 style (Inter, Semi-Bold, 16px)
- **Color:** Gray 800
- **Margin Bottom:** 8px (`mb-2`)
- **Display:** Only if prayer has title

**Prayer Content (Text):**
- **Font:** Body Large (Inter, Regular, 16px)
- **Line Height:** 1.6 (`leading-relaxed`)
- **Color:** Gray 700
- **Font Family:** Explicitly set to Inter (`font-[Inter]`)

**Prayer Content (Audio):**
- **Container:** Glass background, 16px padding, rounded-xl
- **Alignment:** Center
- **Icon:** 🎵 emoji, 48px (`text-4xl`)
- **Label:** "Audio Prayer" (small gray text)
- **Progress Bar:**
  - Height: 4px (`h-1`)
  - Background: Gray 300
  - Border Radius: Full
  - Fill: Gradient (yellow → purple), 33% width

**Prayer Content (Video):**
- **Container:** Glass background, 16px padding, rounded-xl
- **Aspect Ratio:** 16:9 (`aspect-video`)
- **Background:** Gray 100
- **Alignment:** Center (both axes)
- **Icon:** 🎥 emoji, 48px (`text-4xl`)
- **Label:** "Video Prayer" (small gray text)

#### Reply Type Selector
- **Flexbox:** Row, gap 8px (`gap-2`)
- **Margin Bottom:** 16px (`mb-4`)

**Each Button (3 total: Text, Audio, Video):**
- **Position:** Relative
- **Width:** Flex 1 (equal width)
- **Padding:** 12px (`p-3`)
- **Border Radius:** 12px (`rounded-xl`)
- **Flexbox:** Column, center, gap 8px (`gap-2`)
- **Transition:** All 200ms

**Default State:**
- Background: Glass
- Hover: Glass strong

**Selected State:**
- Background: Glass strong
- Shadow: Large
- Animated rainbow border (see border animation below)

**Animated Border (Selected State):**
```javascript
<motion.div
  className="absolute inset-0 rounded-xl"
  style={{
    background: 'linear-gradient(90deg, rgba(255,215,0,0.4), rgba(255,192,203,0.4), rgba(147,112,219,0.4), rgba(135,206,250,0.4), rgba(255,215,0,0.4))',
    backgroundSize: '300% 300%',
    padding: '2px',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    opacity: 0.6
  }}
  animate={{
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
  }}
  transition={{
    duration: 3,
    repeat: Infinity,
    ease: "linear"
  }}
/>
```

**Button Content:**
- **Icon:** Type/Mic/Video (Lucide), 20px, Gray 700
- **Label:** "Text"/"Voice"/"Video", 14px, Gray 700

#### Reply Form (Expandable)

**Container:**
- **Animation:** Height auto expand/collapse
- **Duration:** 300ms
- **Overflow:** Hidden
- **Margin Bottom:** 16px (`mb-4`)

**Text Reply:**
- **Label:** "Your Prayer", 12px, Gray 600, margin bottom 8px
- **Input:** Textarea component (ShadCN)
  - Rows: 4
  - Placeholder: "Type your prayer here..."
  - Background: Glass
  - Border: None
  - Focus Ring: 2px purple 300
  - Resize: None

**Audio Reply:**
- **Container:** Glass, rounded-xl, 24px padding, center aligned
- **Icon Container:**
  - Width/Height: 64px
  - Border Radius: Full
  - Background: Gradient (yellow → purple)
  - Icon: Mic (Lucide), 32px, white
- **Instruction:** "Tap to record your prayer"
- **Time Limit:** "Max 2 minutes" (extra small gray text)

**Video Reply:**
- **Container:** Glass, rounded-xl, 24px padding, center aligned
- **Icon Container:**
  - Width/Height: 64px
  - Border Radius: Full
  - Background: Gradient (yellow → purple)
  - Icon: Video (Lucide), 32px, white
- **Instruction:** "Tap to record video prayer"
- **Time Limit:** "Max 1 minute" (extra small gray text)

**Anonymous Toggle:**
- **Container:** Glass, rounded-xl, 16px padding
- **Flexbox:** Row, space-between, items-center
- **Label:** "Send Anonymously"
- **Description:** "Your identity will be hidden" (extra small, gray 600)
- **Toggle:** Switch component (ShadCN)

#### Send Prayer Button

**Default State:**
- **Width:** 100%
- **Background:** Gradient (yellow → purple)
- **Hover Background:** Brighter gradient (yellow 400 → purple 400)
- **Color:** Gray 800
- **Padding:** 24px vertical (`py-6`)
- **Border Radius:** Full
- **Flexbox:** Row, center, gap 8px (`gap-2`)
- **Shadow:** Large
- **Icon:** Send (Lucide), 20px
- **Text:** "Send Prayer", 16px, Semi-Bold

**Praying State:**
- **Background:** Transparent
- **Content:** Replaced with success message

**Success Message:**
- **Animation:** Fade in, scale 0.9 → 1
- **Icon:** ✨ emoji, 64px, pulse animation [1, 1.2, 1] repeat infinite
- **Text:** "Prayer sent...", Gray 700
- **Padding:** 24px vertical

### Interaction Flow

1. **Modal opens** from prayer marker click
2. **Default view** shows prayer details
3. **User selects reply type** (Text/Audio/Video)
4. **Form expands** with selected input type
5. **User fills form** and toggles anonymous if desired
6. **User clicks "Send Prayer"**
7. **Spotlight animations play** (2 seconds)
8. **Success state shows** (2 seconds)
9. **Modal closes** and map animation begins

### States

#### Default State
- Prayer details visible
- Reply type selector visible
- Reply form collapsed
- Send button active

#### Form Expanded State
- Prayer details visible
- Reply type selector with one selected
- Reply form expanded for selected type
- Send button active

#### Praying State (After Send Click)
- Spotlight animations play
- Form disabled
- Success message visible
- Auto-close after animation

### Responsive Behavior

#### Mobile (< 768px)
- Slides up from bottom
- Full width minus padding
- Larger touch targets (48px min)

#### Desktop (≥ 768px)
- Centered on screen
- Fixed max width (448px)
- Scales in from center

### Technical Notes

#### Distance Calculation
```javascript
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

#### Prayer Send Handler
```javascript
const handlePray = () => {
  setIsPraying(true);
  setShowSpotlight(true);
  
  setTimeout(() => {
    onPray(prayer);
  }, 2500);
};
```

---

## 05 - Request Prayer Modal

### Overview
**File:** `/components/RequestPrayerModal.tsx`
**Purpose:** Create and submit new prayer requests
**Trigger:** Click "Request Prayer" button on map
**Location:** Automatically set to user's current location

### Visual Specifications

#### Modal Overlay
- **Position:** Fixed, full screen
- **Background:** `rgba(0, 0, 0, 0.3)` with backdrop blur
- **Backdrop Blur:** 8px
- **Z-Index:** 50
- **Alignment:** End (mobile) or center (desktop)
- **Padding:** 16px

#### Modal Card
- **Width:** 100%, max 448px (`max-w-md`)
- **Background:** Glass strong
- **Padding:** 24px (`p-6`)
- **Border Radius:** 24px (`rounded-3xl`)
- **Position:** Relative

**Entry Animation:** Same as Prayer Detail Modal

### Elements

#### Header
- **Flexbox:** Row, space-between, items-center
- **Margin Bottom:** 24px (`mb-6`)

**Title:**
- **Text:** "Request Prayer"
- **Font:** H1 style (Cinzel, Semi-Bold, 24px)
- **Color:** Gray 800

**Close Button:**
- **Icon:** X (Lucide), 20px
- **Color:** Gray 700
- **Padding:** 8px
- **Border Radius:** Full
- **Hover:** White 20% background

#### Form Container
- **Element:** `<form>`
- **Layout:** Flex column, gap 16px (`gap-4`)

#### Title Input (Optional)

**Label:**
- **Text:** "Title (optional)"
- **Font:** Label Medium (Inter, Medium, 14px)
- **Color:** Gray 700
- **Margin Bottom:** 8px (`mb-2`)

**Input:**
- **Component:** ShadCN Input
- **Type:** Text
- **Placeholder:** "e.g., Health and healing"
- **Background:** Glass
- **Border:** None
- **Focus Ring:** 2px purple 300
- **Padding:** 12px
- **Border Radius:** 12px (`rounded-xl`)

#### Content Type Selector
- **Flexbox:** Row, gap 8px (`gap-2`)
- **Margin Bottom:** 8px (`mb-2`)

**Buttons:** Same specs as Prayer Detail Modal reply type selector
- Text / Audio / Video options
- Animated border when selected
- Icons and labels

#### Content Input

**Label:**
- **Text:** "Your Prayer Request"
- **Font:** Label Medium
- **Color:** Gray 700
- **Margin Bottom:** 8px

**Text Input:**
- **Component:** Textarea (ShadCN)
- **Rows:** 5
- **Placeholder:** "Share what's on your heart..."
- **Background:** Glass
- **Border:** None
- **Focus Ring:** 2px purple 300
- **Resize:** None
- **Border Radius:** 12px

**Audio Input:**
- **Container:** Glass, rounded-xl, 32px padding, center
- **Icon Container:** 64px circle, gradient background
- **Icon:** Mic (32px, white)
- **Text:** "Tap to record" + "Max 2 minutes"
- **Gap:** 12px between elements

**Video Input:**
- **Container:** Glass, rounded-xl, 32px padding, center
- **Icon Container:** 64px circle, gradient background
- **Icon:** Video (32px, white)
- **Text:** "Tap to record" + "Max 1 minute"

#### Anonymous Toggle
- **Container:** Glass, rounded-xl, 16px padding
- **Flexbox:** Row, space-between, items-center
- **Label:** "Post Anonymously"
- **Description:** "Hide your identity"
- **Toggle:** Switch component

#### Submit Button
- **Width:** 100%
- **Background:** Gradient (yellow → purple)
- **Hover:** Brighter gradient
- **Color:** Gray 800
- **Padding:** 24px vertical (`py-6`)
- **Border Radius:** Full
- **Text:** "Share Prayer Request"
- **Font:** Inter, Semi-Bold, 16px
- **Shadow:** Large
- **Disabled:** When form invalid or submitting

**Loading State:**
- **Background:** Same gradient
- **Content:** Spinner (20px, gray 800)
- **Text:** "Sharing..."

**Success State:**
- **Icon:** ✨ emoji (64px)
- **Text:** "Prayer shared!"
- **Animation:** Scale pulse

### Form Validation

**Required Fields:**
- Content (text/audio/video) - Must not be empty

**Optional Fields:**
- Title
- Anonymous toggle

**Validation Messages:**
- Appear below invalid fields
- Red 600 color
- Small size (12px)
- Fade in animation

### Interaction Flow

1. **User clicks** "Request Prayer" button on map
2. **Modal opens** with form
3. **User fills** title (optional) and content (required)
4. **User selects** content type (default: text)
5. **User toggles** anonymous if desired
6. **User submits** form
7. **Validation** runs
8. **If valid:** Show loading state
9. **On success:** Show success state (1s)
10. **Modal closes** and new marker appears on map

### States

#### Default State
- Empty form
- Text type selected
- Submit button enabled
- No validation errors

#### Filling State
- User typing/recording
- Live character count (if applicable)
- Submit button enabled when valid

#### Submitting State
- Form disabled
- Submit button shows loading spinner
- "Sharing..." text

#### Success State
- Success message visible
- Auto-close after 1 second

#### Error State
- Validation messages shown
- Invalid fields highlighted
- Submit button disabled

### Technical Notes

```javascript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!content.trim()) {
    setError('Please enter your prayer request');
    return;
  }
  
  setIsSubmitting(true);
  
  const newPrayer = {
    title,
    content,
    contentType,
    location: userLocation,
    isAnonymous,
    userName: isAnonymous ? undefined : currentUser.name
  };
  
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

## 06 - Inbox Modal

### Overview
**File:** `/components/InboxModal.tsx`
**Purpose:** View received prayers and prayer responses
**Trigger:** Click inbox icon in map header
**Features:** Tabbed interface, prayer cards, empty states

### Visual Specifications

#### Modal Overlay
- **Position:** Fixed, full screen
- **Background:** `rgba(0, 0, 0, 0.3)` with backdrop blur
- **Backdrop Blur:** 8px
- **Z-Index:** 50
- **Alignment:** End (mobile) or center (desktop)
- **Padding:** 16px

#### Modal Card
- **Width:** 100%, max 512px (`max-w-lg`)
- **Height:** Mobile: 80vh, Desktop: max 600px
- **Background:** Glass strong
- **Padding:** 24px (`p-6`)
- **Border Radius:** 24px (`rounded-3xl`)
- **Display:** Flex column
- **Overflow:** Hidden

### Elements

#### Header
- **Flexbox:** Row, space-between, items-center
- **Margin Bottom:** 20px (`mb-5`)
- **Flex Shrink:** 0

**Title:**
- **Text:** "Inbox"
- **Font:** H1 style (Cinzel, Semi-Bold, 24px)
- **Color:** Gray 800

**Close Button:**
- **Icon:** X (Lucide), 20px
- **Color:** Gray 700
- **Padding:** 8px
- **Border Radius:** Full
- **Hover:** White 20% background

#### Tab System
- **Container:** Glass background, rounded-xl, 8px padding
- **Flexbox:** Row, gap 4px
- **Margin Bottom:** 16px (`mb-4`)
- **Flex Shrink:** 0

**Each Tab (3 total: All, Received, Sent):**
- **Padding:** 8px vertical, 16px horizontal (`py-2 px-4`)
- **Border Radius:** 8px (`rounded-lg`)
- **Font:** Label Medium (Inter, Medium, 14px)
- **Transition:** All 200ms
- **Cursor:** Pointer

**Default Tab State:**
- **Background:** Transparent
- **Color:** Gray 600

**Active Tab State:**
- **Background:** White
- **Color:** Gray 800
- **Shadow:** Small

#### Prayer List Container
- **Flex:** 1 (takes remaining space)
- **Overflow Y:** Auto (scrollable)
- **Padding Right:** 4px (for scrollbar)
- **Display:** Flex column
- **Gap:** 12px (`gap-3`)

**Scrollbar Styling:**
```css
/* Webkit browsers */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
```

#### Prayer Card

**Container:**
- **Background:** Glass
- **Padding:** 16px (`p-4`)
- **Border Radius:** 16px (`rounded-2xl`)
- **Cursor:** Pointer
- **Transition:** All 200ms
- **Hover:** Glass subtle background, transform translate-y -2px

**Header Row:**
- **Flexbox:** Row, space-between, items-start
- **Margin Bottom:** 12px (`mb-3`)

**User Info (Left):**
- **Flexbox:** Row, items-center, gap 12px (`gap-3`)

**Avatar:**
- **Size:** 40px (`w-10 h-10`)
- **Border Radius:** Full
- **Background:** Gradient (yellow → purple) or gray 200
- **Flexbox:** Center (both axes)
- **Content:** First letter of name or 🙏 emoji

**User Details:**
- **Display:** Flex column, gap 2px

**Name:**
- **Font:** Inter, Semi-Bold, 14px
- **Color:** Gray 800
- **Content:** User name or "Anonymous"

**Time:**
- **Font:** Inter, Regular, 12px
- **Color:** Gray 500
- **Content:** Relative time (e.g., "2 hours ago")

**Badge (Right):**
- **Condition:** Show if unread
- **Size:** 8px circle (`w-2 h-2`)
- **Background:** Pink 500
- **Border Radius:** Full

**Prayer Content:**
- **Font:** Inter, Regular, 14px
- **Color:** Gray 700
- **Line Height:** 1.5
- **Display:** -webkit-box
- **Line Clamp:** 2 (show max 2 lines)
- **Overflow:** Hidden
- **Text Overflow:** Ellipsis

**Footer Row:**
- **Flexbox:** Row, space-between, items-center
- **Margin Top:** 12px (`mt-3`)

**Reply Count:**
- **Font:** Inter, Medium, 12px
- **Color:** Gray 600
- **Content:** "X replies" or "No replies"

**Type Badge:**
- **Condition:** Show if audio or video
- **Padding:** 4px 8px
- **Background:** Gray 100
- **Border Radius:** 6px (`rounded-md`)
- **Font:** Inter, Medium, 11px
- **Color:** Gray 700
- **Content:** "Audio" or "Video"
- **Icon:** 🎵 or 🎥 before text

#### Empty State

**Container:**
- **Flexbox:** Column, center (both axes), gap 12px
- **Padding:** 48px vertical
- **Color:** Gray 500

**Icon:**
- **Content:** 🙏 emoji
- **Font Size:** 64px (`text-6xl`)
- **Opacity:** 0.5

**Text:**
- **Font:** Inter, Regular, 16px
- **Color:** Gray 500
- **Content:** 
  - All tab: "No prayers yet"
  - Received: "No prayers received yet"
  - Sent: "You haven't sent any prayers yet"

**Subtext:**
- **Font:** Inter, Regular, 14px
- **Color:** Gray 400
- **Content:** "Tap a prayer on the map to get started"

### Tab Content

#### All Tab
- Shows all prayers (both received and sent)
- Sorted by most recent first
- Includes type indicator on each card

#### Received Tab
- Shows only prayers sent to user
- Sorted by most recent first
- Unread badge visible on new prayers

#### Sent Tab
- Shows only prayers user has sent
- Sorted by most recent first
- No unread badges

### Interaction Flow

1. **User clicks** inbox button (with badge showing "3")
2. **Modal opens** to "All" tab
3. **List displays** all prayers
4. **User switches** to "Received" tab
5. **List filters** to received prayers only
6. **User clicks** a prayer card
7. **Prayer Detail Modal** opens showing that prayer
8. **Inbox Modal** closes

### States

#### Loading State
- Skeleton cards (3-4 shimmer placeholders)
- Tab system visible but disabled

#### Default State (With Content)
- Tab system active
- Prayer cards listed
- Scrollbar if needed

#### Empty State (No Content)
- Empty state message shown
- Tab system still functional

#### Filtered State
- Active tab highlighted
- Relevant prayers shown
- Empty state if filter yields no results

### Responsive Behavior

#### Mobile (< 768px)
- Full width minus padding
- Height: 80vh
- Slides up from bottom
- Touch-friendly scrolling

#### Desktop (≥ 768px)
- Fixed width (512px)
- Max height: 600px
- Centered on screen
- Mouse scroll

### Technical Notes

```javascript
// Mock data structure
const mockPrayers = [
  {
    id: '1',
    userName: 'Sarah',
    userAvatar: 'S',
    content: 'Thank you for praying for my mother. She is doing much better now!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    type: 'received',
    contentType: 'text',
    isRead: false,
    replyCount: 2
  },
  // ... more prayers
];

// Filter logic
const filteredPrayers = mockPrayers.filter(prayer => {
  if (activeTab === 'all') return true;
  if (activeTab === 'received') return prayer.type === 'received';
  if (activeTab === 'sent') return prayer.type === 'sent';
  return true;
});

// Relative time formatting
const getRelativeTime = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
```

---

## 07 - Prayer Animation Layer

### Overview
**File:** `/components/PrayerAnimationLayer.tsx`
**Purpose:** Dramatic 3D animation when user sends a prayer
**Trigger:** After clicking "Send Prayer" in Prayer Detail Modal
**Duration:** 6 seconds total
**Z-Index:** 70 (above all modals)

### Animation Sequence

#### Phase 1: Map Movement (0-2s)
**Camera Animation:**
- **Zoom:** Current zoom → Zoom out to fit both points
- **Center:** Pan to midpoint between user and prayer location
- **Pitch:** 0° → 60° (3D tilt)
- **Bearing:** Slight rotation for dramatic effect
- **Easing:** ease-in-out
- **Duration:** 2 seconds

```javascript
map.easeTo({
  center: midpoint,
  zoom: idealZoom,
  pitch: 60,
  bearing: bearing,
  duration: 2000,
  easing: (t) => t * (2 - t) // ease-in-out
});
```

#### Phase 2: Animated Line (2-4s)
**SVG Path Animation:**
- **Path:** Curved line from user location to prayer location
- **Stroke:** Gradient (gold → purple)
- **Stroke Width:** 3px
- **Animation:** Draw from 0% to 100% using stroke-dasharray
- **Duration:** 2 seconds
- **Easing:** Linear

**Pulsing Circles:**
- **Start Point:** User location
- **End Point:** Prayer location
- **Radius:** 10px → 20px → 10px
- **Opacity:** 0.8 → 0.4 → 0.8
- **Fill:** Gold (start), Purple (end)
- **Animation:** Continuous pulse during line draw

#### Phase 3: Spotlight Effects (4-6s)
**Yellow Spotlight (Left):**
- **Position:** At prayer request location
- **Width:** 100px
- **Height:** Full screen
- **Gradient:** Bottom to top (yellow 60% → transparent)
- **Animation:** Scale Y [0, 1], Opacity [0, 1, 0]
- **Duration:** 2 seconds

**Purple Spotlight (Right):**
- **Position:** At user location
- **Width:** 100px
- **Height:** Full screen
- **Gradient:** Bottom to top (purple 60% → transparent)
- **Animation:** Scale Y [0, 1], Opacity [0, 1, 0]
- **Duration:** 2 seconds

#### Phase 4: Return (Concurrent with Phase 3)
**Camera Reset:**
- **Zoom:** Return to original zoom
- **Center:** Return to original center
- **Pitch:** 60° → 0°
- **Bearing:** Return to original bearing
- **Duration:** 2 seconds
- **Easing:** ease-in-out

### Visual Specifications

#### SVG Overlay
- **Position:** Fixed, full screen
- **Width:** 100vw
- **Height:** 100vh
- **Pointer Events:** None
- **Z-Index:** 70

#### Animated Path
**Calculation:**
```javascript
// Get screen coordinates
const start = map.project([userLng, userLat]);
const end = map.project([prayerLng, prayerLat]);

// Create curved path (quadratic Bezier)
const midX = (start.x + end.x) / 2;
const midY = (start.y + end.y) / 2 - 100; // Arc upward

const pathD = `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
```

**SVG Path Element:**
```svg
<path
  d={pathD}
  stroke="url(#lineGradient)"
  strokeWidth="3"
  fill="none"
  strokeLinecap="round"
  strokeDasharray={pathLength}
  strokeDashoffset={pathLength}
/>
```

**Gradient Definition:**
```svg
<linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
  <stop offset="100%" stopColor="#9370DB" stopOpacity="1" />
</linearGradient>
```

**Animation:**
```javascript
animate={{
  strokeDashoffset: [pathLength, 0]
}}
transition={{
  duration: 2,
  delay: 2,
  ease: "linear"
}}
```

#### Pulsing Circles
**Start Circle (User Location):**
```svg
<circle
  cx={start.x}
  cy={start.y}
  r={circleRadius}
  fill="#FFD700"
  opacity={0.6}
/>
```

**Animation:**
```javascript
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
```

**End Circle (Prayer Location):**
- Same as start circle but purple color

#### Spotlight Beams
**HTML Div Elements (Not SVG):**
```javascript
<motion.div
  className="absolute bottom-0"
  style={{
    left: `${spotlightLeftX}px`,
    width: '100px',
    height: '100%',
    background: 'linear-gradient(to top, rgba(255,215,0,0.6), rgba(255,215,0,0.4), transparent)',
    pointerEvents: 'none'
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
```

### Interaction Behavior
- **No User Interaction:** During animation, map interactions disabled
- **Cannot Close:** User cannot dismiss during animation
- **Auto-Complete:** Automatically completes and creates memorial line
- **Callback:** Fires onComplete callback when done

### States

#### Preparation (0s)
- Calculate midpoint, zoom, and bearing
- Measure path length for dash animation
- Set up SVG elements

#### Animating (0-6s)
- All animations running in sequence
- Map interactions disabled
- Z-index 70 (above everything)

#### Complete (6s)
- Animation layer unmounts
- Memorial line appears on map
- Prayer marked as "prayed"
- User returns to normal map view

### Technical Notes

#### Midpoint Calculation
```javascript
const midpoint = [
  (userLng + prayerLng) / 2,
  (userLat + prayerLat) / 2
];
```

#### Ideal Zoom Calculation
```javascript
// Calculate distance between points
const distance = Math.sqrt(
  Math.pow(end.x - start.x, 2) + 
  Math.pow(end.y - start.y, 2)
);

// Adjust zoom to fit both points with padding
const idealZoom = map.getZoom() - Math.log2(distance / 400);
```

#### Bearing Calculation
```javascript
const dx = prayerLng - userLng;
const dy = prayerLat - userLat;
const bearing = (Math.atan2(dy, dx) * 180 / Math.PI + 90) % 360;
```

#### Path Length Measurement
```javascript
const pathElement = useRef<SVGPathElement>(null);
const [pathLength, setPathLength] = useState(0);

useEffect(() => {
  if (pathElement.current) {
    setPathLength(pathElement.current.getTotalLength());
  }
}, []);
```

---

## 08 - Prayer Connection Component

### Overview
**File:** `/components/PrayerConnection.tsx`
**Purpose:** Persistent memorial lines showing prayer connections
**Visibility:** Appear after prayer animation completes
**Duration:** Visible for 1 year from creation date
**Layer:** SVG overlay on map (Z-5)

### Visual Specifications

#### SVG Path
**Element:** `<path>` within map's SVG overlay
**Position:** Calculated from Mapbox projection
**Re-renders:** On map move/zoom to maintain position

#### Path Calculation
```javascript
// Get screen coordinates from map projection
const fromPoint = map.project([fromLng, fromLat]);
const toPoint = map.project([toLng, toLat]);

// Create curved path (quadratic Bezier curve)
const midX = (fromPoint.x + toPoint.x) / 2;
const midY = (fromPoint.y + toPoint.y) / 2;

// Arc downward for visual separation
const controlY = midY + 50;

const pathD = `M ${fromPoint.x} ${fromPoint.y} Q ${midX} ${controlY} ${toPoint.x} ${toPoint.y}`;
```

#### Default State
- **Stroke:** `url(#connectionGradient)`
- **Stroke Width:** 2px
- **Fill:** None
- **Opacity:** 0.8
- **Stroke Linecap:** Round
- **Pointer Events:** Stroke (only the line is interactive)
- **Cursor:** Pointer

#### Hover State
- **Stroke:** `url(#connectionGradientHover)` (brighter)
- **Stroke Width:** 3px
- **Opacity:** 1
- **Filter:** Drop shadow (0 0 8px gold/purple glow)
- **Transition:** All 200ms

#### Gradients (Defined in parent SVG)
```svg
<!-- Default Gradient -->
<linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stopColor="hsl(45, 100%, 70%)" stopOpacity="0.8" />
  <stop offset="50%" stopColor="hsl(200, 80%, 70%)" stopOpacity="0.8" />
  <stop offset="100%" stopColor="hsl(270, 60%, 70%)" stopOpacity="0.8" />
</linearGradient>

<!-- Hover Gradient (Brighter) -->
<linearGradient id="connectionGradientHover" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stopColor="hsl(45, 100%, 65%)" stopOpacity="1" />
  <stop offset="50%" stopColor="hsl(200, 80%, 75%)" stopOpacity="1" />
  <stop offset="100%" stopColor="hsl(270, 60%, 75%)" stopOpacity="1" />
</linearGradient>
```

### Tooltip (Hover State)

**Container:**
- **Position:** Fixed at mouse position
- **Background:** Glass strong
- **Padding:** 8px 12px
- **Border Radius:** 8px (`rounded-lg`)
- **Shadow:** Medium
- **Pointer Events:** None
- **Z-Index:** 100
- **Max Width:** 200px

**Content:**
- **Line 1:** "Prayer from [RequesterName]"
- **Line 2:** "Prayed by [ReplierName]"
- **Line 3:** Relative date (e.g., "3 days ago")
- **Font:** Inter, Regular, 12px
- **Color:** Gray 700
- **Line Height:** 1.4

**Tooltip Animation:**
```javascript
initial={{ opacity: 0, scale: 0.9 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.9 }}
transition={{ duration: 0.15 }}
```

### Data Structure

```typescript
interface PrayerConnection {
  id: string;
  prayerId: string;
  fromLocation: { lat: number; lng: number };
  toLocation: { lat: number; lng: number };
  requesterName: string;
  replierName: string;
  createdAt: Date;
  expiresAt: Date; // createdAt + 1 year
}
```

### Lifecycle

#### Creation
- Created when prayer animation completes
- Initially rendered with fade-in (opacity 0 → 0.8)
- Added to connections array in map state

#### Active Period
- Visible on map for entire year
- Updates position on map move/zoom
- Interactive hover state
- Persists across app sessions (stored in database)

#### Expiration
- After 1 year, connection is removed
- Fade-out animation (opacity 0.8 → 0)
- Removed from connections array
- Deleted from database

### Technical Notes

#### Expiration Check
```javascript
useEffect(() => {
  const checkExpiration = () => {
    const now = new Date();
    const expired = connections.filter(conn => now > conn.expiresAt);
    
    if (expired.length > 0) {
      // Remove expired connections
      setConnections(connections.filter(conn => now <= conn.expiresAt));
    }
  };
  
  // Check daily
  const interval = setInterval(checkExpiration, 24 * 60 * 60 * 1000);
  checkExpiration(); // Initial check
  
  return () => clearInterval(interval);
}, [connections]);
```

#### Position Update on Map Move
```javascript
useEffect(() => {
  if (!map) return;
  
  const updatePositions = () => {
    // Force re-render to recalculate path positions
    setMapState(prev => ({ ...prev }));
  };
  
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  
  return () => {
    map.off('move', updatePositions);
    map.off('zoom', updatePositions);
  };
}, [map]);
```

#### Hover Detection
```javascript
const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

// In render
<path
  d={pathD}
  stroke={isHovered ? "url(#connectionGradientHover)" : "url(#connectionGradient)"}
  strokeWidth={isHovered ? 3 : 2}
  onMouseEnter={() => setHoveredConnection(conn.id)}
  onMouseLeave={() => setHoveredConnection(null)}
/>
```

### Responsive Behavior

#### Mobile
- Touch events work same as mouse
- Tap to show tooltip
- Tap outside to hide tooltip
- Slightly thicker lines (3px default) for easier touch

#### Desktop
- Mouse hover shows tooltip
- Follows mouse cursor
- Auto-hides on mouse leave

### Performance Considerations

- **Max Connections:** Recommend limit of 100 visible connections
- **Rendering:** Use React.memo for connection components
- **Updates:** Throttle position updates to 60fps max
- **Cleanup:** Remove expired connections daily

---

## Supporting Components

### Prayer Marker Component

**File:** `/components/PrayerMarker.tsx`

#### Container
- **Position:** Absolute (positioned via Mapbox projection)
- **Transform:** `translate(-50%, -50%)` to center on coordinates
- **Pointer Events:** Auto
- **Cursor:** Pointer
- **Transition:** Transform 200ms

#### Marker Circle
- **Size:** 48px diameter (`w-12 h-12`)
- **Background:** Glass (white 80% opacity)
- **Backdrop Filter:** 12px blur
- **Border:** 2px solid white 40% opacity
- **Border Radius:** Full
- **Shadow:** Medium (0 4px 16px rgba(0,0,0,0.08))
- **Flexbox:** Center (both axes)

**Hover State:**
- **Transform:** Scale 1.1
- **Shadow:** Large (0 8px 32px rgba(0,0,0,0.1))

**Prayed State:**
- **Border:** 3px solid gold (#FFD700)
- **Additional Element:** Checkmark overlay (top-right corner)

#### Emoji Icon
- **Content:** 🙏
- **Font Size:** 24px (`text-2xl`)

#### Checkmark Overlay (Prayed State)
- **Position:** Absolute top-right (-4px, -4px)
- **Size:** 16px circle
- **Background:** Gold (#FFD700)
- **Border:** 2px solid white
- **Border Radius:** Full
- **Content:** ✓ checkmark (white, 10px)

#### Preview Bubble (Hover State)
- See PreviewBubble component below
- Appears 8px above marker
- Fades in over 150ms

### Preview Bubble Component

**File:** `/components/PreviewBubble.tsx`

#### Container
- **Position:** Absolute bottom (8px above marker)
- **Transform:** `translateX(-50%)` to center horizontally
- **Min Width:** 200px
- **Max Width:** 280px
- **Background:** Glass strong
- **Padding:** 12px (`p-3`)
- **Border Radius:** 12px (`rounded-xl`)
- **Shadow:** Large
- **Pointer Events:** None

#### Arrow
- **Position:** Absolute bottom (-6px), centered
- **Size:** 12px triangle
- **Color:** Same as container background
- **Transform:** Rotate 45deg

#### Content

**User Name:**
- **Font:** Inter, Semi-Bold, 14px
- **Color:** Gray 800
- **Margin Bottom:** 4px

**Prayer Preview:**
- **Font:** Inter, Regular, 13px
- **Color:** Gray 600
- **Line Height:** 1.4
- **Max Lines:** 2 (line-clamp-2)
- **Text Overflow:** Ellipsis

**Animation:**
```javascript
initial={{ opacity: 0, y: 4 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 4 }}
transition={{ duration: 0.15 }}
```
