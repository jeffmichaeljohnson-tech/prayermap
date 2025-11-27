# PrayerMap - Screen Inventory

## Complete Screen List (8 Screens + Components)

### Main Screens

#### 01 - Loading Screen
**File:** `/App.tsx` (loading state)
**Purpose:** App initialization with prayer hands animation
**Duration:** 2 seconds
**Transition:** Fades to Auth Modal

#### 02 - Auth Modal
**File:** `/components/AuthModal.tsx`
**Purpose:** User authentication with Sign in with Apple
**States:** 
- Default state with floating particles
- Loading state during authentication
**Key Feature:** "Prayer. Shared." tagline

#### 03 - Map View (Main Screen)
**File:** `/components/PrayerMap.tsx`
**Purpose:** Interactive map displaying prayer requests
**Key Features:**
- Full-screen Mapbox GL integration
- Prayer markers with 🙏 emoji
- Prayer connection memorial lines
- Floating glassmorphic header
- Request Prayer button (centered bottom)
- Settings button (top right)
- Inbox button with notification badge (top left)

#### 04 - Prayer Detail Modal
**File:** `/components/PrayerDetailModal.tsx`
**Purpose:** View and respond to prayer requests
**Key Features:**
- Distance display (in miles from user)
- Three response types: Text, Audio, Video
- Anonymous toggle
- Send Prayer button with gradient
- Spotlight animation on send
- Expandable reply form

#### 05 - Request Prayer Modal
**File:** `/components/RequestPrayerModal.tsx`
**Purpose:** Create new prayer requests
**Key Features:**
- Optional title field
- Multi-format content (Text/Audio/Video)
- Anonymous toggle
- Location automatically set to user's position
- Glassmorphic design with gradient submit button

#### 06 - Inbox Modal
**File:** `/components/InboxModal.tsx`
**Purpose:** View received prayers and responses
**Key Features:**
- Tab system: All / Received / Sent
- Prayer cards with previews
- User avatars
- Timestamp display
- Reply count indicators
- Empty state messaging

### Animation & Interaction Screens

#### 07 - Prayer Animation Layer
**File:** `/components/PrayerAnimationLayer.tsx`
**Purpose:** Dramatic 3D animation when sending prayer
**Duration:** 6 seconds total
**Sequence:**
1. Map zooms and tilts (3D perspective) - 2 seconds
2. Animated line travels from user to prayer location - 2 seconds
3. Spotlight effects at both locations - 2 seconds
4. Return to normal view - 2 seconds
**Key Features:**
- SVG animated path with gradient
- Pulsing circles at endpoints
- Dual spotlight beams (yellow and purple)
- Smooth camera transitions

#### 08 - Prayer Connection Component
**File:** `/components/PrayerConnection.tsx`
**Purpose:** Persistent memorial lines showing prayer connections
**Duration:** Visible for 1 year from creation
**Key Features:**
- Curved lines connecting prayer locations
- Rainbow gradient (gold → sky blue → purple)
- Hover state with glow effect
- Tooltip on hover showing names and date
- Automatic expiration after 1 year

### Supporting Components

#### Prayer Marker
**File:** `/components/PrayerMarker.tsx`
**Purpose:** Individual prayer location markers on map
**States:**
- Default: 🙏 emoji in white circle
- Prayed: Gold border with checkmark overlay
- Hover: Scale animation
**Features:**
- Glassmorphic background
- Shadow effects
- Preview bubble on hover

#### Preview Bubble
**File:** `/components/PreviewBubble.tsx`
**Purpose:** Hover preview of prayer content
**Features:**
- Glassmorphic design
- Shows prayer title or content preview
- Username or "Anonymous"
- Appears above marker
- Arrow pointing to marker

---

## Screen Flow Diagram

```
[Loading Screen] (2s)
         ↓
[Auth Modal] → Sign in with Apple
         ↓
[Map View] ← Main hub
    ├─→ [Prayer Detail Modal] → Prayer Animation → Returns to Map
    ├─→ [Request Prayer Modal] → Creates marker → Returns to Map
    ├─→ [Inbox Modal] → View prayers → Can open Prayer Detail
    └─→ Settings (future implementation)
```

---

## Screen State Matrix

| Screen | Loading | Empty | Default | Error | Success |
|--------|---------|-------|---------|-------|---------|
| Loading Screen | ✓ | - | - | - | - |
| Auth Modal | ✓ | - | ✓ | ✓ | - |
| Map View | ✓ | ✓ | ✓ | - | - |
| Prayer Detail | - | - | ✓ | - | ✓ |
| Request Prayer | ✓ | - | ✓ | ✓ | ✓ |
| Inbox Modal | - | ✓ | ✓ | - | - |
| Animation Layer | - | - | ✓ | - | - |
| Connection Lines | - | - | ✓ | - | - |

---

## Responsive Behavior

### Mobile (< 768px)
- Modals slide up from bottom
- Full-screen map
- Touch gestures for map navigation
- Bottom-anchored buttons

### Desktop (≥ 768px)
- Modals centered on screen
- Same map view
- Mouse controls for map
- Hover states active

---

## Z-Index Layering (Bottom to Top)

1. **Z-0:** Map base layer
2. **Z-5:** Prayer connection lines (SVG overlay)
3. **Z-10:** Prayer markers
4. **Z-20:** Preview bubbles
5. **Z-30:** Map header (glassmorphic)
6. **Z-40:** Request Prayer button
7. **Z-50:** Modals (Prayer Detail, Request Prayer, Inbox)
8. **Z-60:** Auth Modal
9. **Z-70:** Animation Layer (when active)
10. **Z-100:** Loading Screen (when active)
