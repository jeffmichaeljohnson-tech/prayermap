# PrayerMap - Complete Design Handoff Document

**Version:** 1.0  
**Date:** November 19, 2025  
**Project:** PrayerMap - Location-based Prayer Platform

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Screen Inventory](#screen-inventory)
3. [Design System](#design-system)
4. [Screen Specifications](#screen-specifications)
5. [Component Library](#component-library)
6. [Interactions & Animations](#interactions--animations)
7. [Technical Implementation](#technical-implementation)
8. [Export Settings](#export-settings)
9. [Developer Notes](#developer-notes)

---

## Project Overview

### About PrayerMap

PrayerMap is a location-based spiritual platform that enables users to share prayer requests and support one another through a beautifully designed interactive map interface. The app combines cutting-edge web technologies with an ethereal, prayer-focused design language.

### Design Philosophy

**"Ethereal Glass"** - A design system that evokes spirituality, connection, and peace through:
- Glassmorphic design principles
- Heavenly color palette (dawn blues, soft golds, gentle purples)
- Elegant typography (Cinzel for headers, Inter for body)
- Light-based animations and effects

### Core User Journey

```
1. Launch → Loading Screen (Prayer hands animation, 2s)
2. Authentication → Sign in with Apple
3. Main Interface → Interactive map with prayer markers
4. Discover → Tap markers to view prayer requests
5. Support → Send prayers with dramatic 3D animation
6. Connection → Memorial lines appear showing prayer connections
7. Community → View received prayers in inbox
8. Share → Create own prayer requests
```

### Key Features

#### ✨ Completed Features
- **Loading Screen** with animated prayer hands
- **Authentication Modal** with Apple Sign In integration
- **Interactive Map** powered by Mapbox GL
- **Prayer Markers** with glassmorphic design and hover previews
- **Prayer Detail Modal** with distance calculation and multi-format responses (text/audio/video)
- **Request Prayer Modal** for creating new prayer requests
- **Inbox System** with tabbed interface (All/Received/Sent)
- **Prayer Animation** - Dramatic 6-second 3D sequence when sending prayers
- **Memorial Lines** - Persistent prayer connections visible for 1 year
- **Anonymous Mode** - Option to hide identity when praying or requesting
- **Distance Display** - Shows miles between user and prayer request

#### 🔮 Planned Features (Not Yet Implemented)
- Supabase backend integration
- Real-time prayer notifications
- Audio/video recording functionality
- Settings screen
- User profiles
- Prayer history
- Search and filters

---

## Screen Inventory

### Completed Screens (8 Total)

#### 01 - Loading Screen
**Purpose:** App initialization with prayer hands animation  
**Duration:** 2 seconds  
**File:** `/App.tsx` (loading state)

#### 02 - Auth Modal
**Purpose:** User authentication with Apple Sign In  
**File:** `/components/AuthModal.tsx`  
**Key Features:** Floating particles, glassmorphic design, "Prayer. Shared." tagline

#### 03 - Map View (Main Hub)
**Purpose:** Interactive map displaying all prayer requests  
**File:** `/components/PrayerMap.tsx`  
**Key Features:** Full-screen Mapbox integration, prayer markers, connection lines, header with inbox/settings

#### 04 - Prayer Detail Modal
**Purpose:** View and respond to prayer requests  
**File:** `/components/PrayerDetailModal.tsx`  
**Key Features:** Distance display, text/audio/video reply options, anonymous toggle, spotlight animation

#### 05 - Request Prayer Modal
**Purpose:** Create new prayer requests  
**File:** `/components/RequestPrayerModal.tsx`  
**Key Features:** Multi-format content (text/audio/video), optional title, anonymous option

#### 06 - Inbox Modal
**Purpose:** View received prayers and responses  
**File:** `/components/InboxModal.tsx`  
**Key Features:** Tabbed interface, prayer cards, empty states, notification badges

#### 07 - Prayer Animation Layer
**Purpose:** Dramatic animation when sending prayer  
**File:** `/components/PrayerAnimationLayer.tsx`  
**Duration:** 6 seconds (4 phases)  
**Key Features:** 3D map movement, animated line, pulsing circles, dual spotlights

#### 08 - Prayer Connection Component
**Purpose:** Persistent memorial lines showing prayer connections  
**File:** `/components/PrayerConnection.tsx`  
**Duration:** Visible for 1 year  
**Key Features:** Curved rainbow gradient lines, hover tooltips, auto-expiration

### Supporting Components

- **Prayer Marker** (`/components/PrayerMarker.tsx`) - Map markers with preview bubbles
- **Preview Bubble** (`/components/PreviewBubble.tsx`) - Hover tooltip showing prayer preview
- **ShadCN UI Components** (`/components/ui/*`) - Button, Input, Textarea, Switch

---

## Design System

### Color Palette

#### Primary Colors
- **Dawn Blue:** `#87CEEB` (rgb(135, 206, 235))
- **Soft Gold:** `#FFD700` (rgb(255, 215, 0))
- **Gentle Purple:** `#9370DB` (rgb(147, 112, 219))
- **Soft Pink:** `#FFC0CB` (rgb(255, 192, 203))

#### Neutral Colors
- **White:** `#FFFFFF` - Used at various opacity levels (95%, 80%, 60%, 30%, 15%)
- **Black:** `#000000` - Used for overlays and shadows (30%, 20%, 10% opacity)
- **Gray Scale:** Full range from Gray 50 to Gray 900

#### Key Gradients
```css
/* Primary Button Gradient */
linear-gradient(to right, #FFD700, #9370DB)

/* Rainbow Connection Gradient */
linear-gradient(90deg, 
  hsl(45, 100%, 70%),   /* Gold */
  hsl(200, 80%, 70%),   /* Sky Blue */
  hsl(270, 60%, 70%)    /* Purple */
)

/* Ethereal Particle Gradient */
linear-gradient(90deg, 
  rgba(255, 215, 0, 0.4),
  rgba(255, 192, 203, 0.4),
  rgba(147, 112, 219, 0.4),
  rgba(135, 206, 250, 0.4),
  rgba(255, 215, 0, 0.4)
)
```

### Typography

#### Font Families
- **Display:** Cinzel (400, 500, 600, 700) - For headers, titles, brand elements
- **Body:** Inter (300, 400, 500, 600, 700) - For body text, UI elements

#### Text Styles
| Style | Font | Weight | Size | Usage |
|-------|------|--------|------|-------|
| Display 1 | Cinzel | 700 | 48px | App title on loading screen |
| Display 2 | Cinzel | 400 | 20px | "Prayer. Shared." tagline |
| H1 | Cinzel | 600 | 24px | Modal titles |
| H2 | Cinzel | 600 | 20px | Section headers |
| H3 | Inter | 600 | 18px | Prayer titles, user names |
| H4 | Inter | 600 | 16px | Card titles |
| Body Large | Inter | 400 | 16px | Prayer content, main text |
| Body Regular | Inter | 400 | 14px | Default body text |
| Body Small | Inter | 400 | 12px | Meta info, timestamps |
| Label Medium | Inter | 500 | 14px | Form labels, button text |
| Label Small | Inter | 500 | 12px | Small labels, tags |
| Caption | Inter | 400 | 11px | Very small text |

### Spacing System

Based on 4px grid (Tailwind default):
- **xs:** 4px (`p-1`, `gap-1`)
- **sm:** 8px (`p-2`, `gap-2`)
- **md:** 12px (`p-3`, `gap-3`)
- **base:** 16px (`p-4`, `gap-4`)
- **lg:** 20px (`p-5`, `gap-5`)
- **xl:** 24px (`p-6`, `gap-6`)
- **2xl:** 32px (`p-8`, `gap-8`)
- **3xl:** 48px (`p-12`, `gap-12`)

### Border Radius
- **sm:** 8px (`rounded-lg`) - Small cards
- **md:** 12px (`rounded-xl`) - Default cards
- **lg:** 16px (`rounded-2xl`) - Large cards, modals
- **xl:** 24px (`rounded-3xl`) - Extra large modals
- **full:** 9999px (`rounded-full`) - Buttons, circles

### Glassmorphic Effects

#### Glass Strong
```css
background: rgba(255, 255, 255, 0.95);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.3);
box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
```
**Usage:** Modals, primary cards, headers

#### Glass Medium
```css
background: rgba(255, 255, 255, 0.8);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.2);
box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
```
**Usage:** Secondary cards, input fields

#### Glass Subtle
```css
background: rgba(255, 255, 255, 0.6);
backdrop-filter: blur(8px);
border: 1px solid rgba(255, 255, 255, 0.15);
box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
```
**Usage:** Hover states, preview bubbles

### Shadows
- **Small:** `0 2px 8px 0 rgba(0, 0, 0, 0.05)`
- **Medium:** `0 4px 16px 0 rgba(0, 0, 0, 0.08)`
- **Large:** `0 8px 32px 0 rgba(0, 0, 0, 0.1)`
- **Extra Large:** `0 20px 60px 0 rgba(0, 0, 0, 0.15)`
- **2XL:** `0 25px 80px 0 rgba(0, 0, 0, 0.2)`

### Icons
**Library:** Lucide React  
**Sizes:** 16px, 20px, 24px, 32px  
**Icons Used:** Inbox, Settings, Send, X, Type, Mic, Video, Upload

**Emoji Icons:**
- 🙏 Prayer hands - Primary app icon
- ✨ Sparkles - Success states
- 🎵 Music note - Audio indicator
- 🎥 Video camera - Video indicator

---

## Key Interactions

### Prayer Send Animation (6-Second Sequence)

This is the most important and complex animation in the app.

#### Phase 1: Map Camera Movement (0-2s)
- Map pans to midpoint between user and prayer
- Zooms to fit both locations
- Tilts to 60° pitch (3D perspective)
- Rotates bearing toward prayer location
- **Easing:** Custom ease-in-out

#### Phase 2: Animated Line Draw (2-4s)
- Curved line appears from user to prayer
- Gold-to-purple gradient
- Draws smoothly using SVG dash animation
- Pulsing circles at both endpoints
- **Easing:** Linear

#### Phase 3: Spotlight Effects (4-6s)
- Yellow spotlight shoots up at prayer location
- Purple spotlight shoots up at user location
- Both fade in then fade out
- **Easing:** Ease-out

#### Phase 4: Camera Return (4-6s, concurrent)
- Map returns to original position
- Pitch returns to 0° (flat)
- Zoom and center restore
- **Easing:** Custom ease-in-out

#### Phase 5: Completion (6s)
- Memorial line becomes permanent (visible 1 year)
- Prayer marker shows gold border + checkmark
- User regains map control

### Modal Animations

**Mobile:**
- Slides up from bottom
- Spring animation (damping: 25, stiffness: 300)
- Swipe down to dismiss

**Desktop:**
- Scales in from center (0.9 → 1.0)
- Fade in/out (300ms)
- Click outside to dismiss

### Marker Interactions

**Hover (Desktop):**
- Scale: 1.0 → 1.1
- Shadow increases
- Preview bubble appears

**Tap/Click:**
- Quick scale bounce (1.0 → 0.95 → 1.0)
- Opens Prayer Detail Modal

### Connection Line Interactions

**Hover:**
- Stroke width: 2px → 3px
- Brightness increases
- Glow effect appears
- Tooltip shows names and date

---

## Technical Stack

### Core Technologies
- **React** 18.x with TypeScript
- **Vite** 5.x (Build tool)
- **Tailwind CSS** 4.0
- **Motion** (Framer Motion) for animations
- **Mapbox GL JS** 3.x for mapping

### UI Libraries
- **ShadCN UI** - Pre-built components
- **Lucide React** - Icon library

### Planned Backend
- **Supabase** (PostgreSQL, Auth, Real-time)
- **Apple Sign In** for authentication

### Required Environment Variables
```env
VITE_MAPBOX_ACCESS_TOKEN=your_token_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_APPLE_CLIENT_ID=your_apple_client_id
```

---

## File Structure

```
prayermap/
├── src/
│   ├── components/
│   │   ├── ui/                      # ShadCN components
│   │   ├── AuthModal.tsx
│   │   ├── PrayerMap.tsx
│   │   ├── PrayerMarker.tsx
│   │   ├── PreviewBubble.tsx
│   │   ├── PrayerDetailModal.tsx
│   │   ├── RequestPrayerModal.tsx
│   │   ├── InboxModal.tsx
│   │   ├── PrayerAnimationLayer.tsx
│   │   └── PrayerConnection.tsx
│   ├── types/
│   │   └── prayer.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── .env
├── package.json
└── vite.config.ts
```

---

## Export Settings

### For Each Screen (Figma Export)

**All Screens:**
- **Format:** PNG
- **Scale:** 2x (@2x for Retina)
- **Include:** Background
- **Color Profile:** sRGB

**File Naming:**
- `01-loading-screen@2x.png`
- `02-auth-modal@2x.png`
- `03-map-view@2x.png`
- `04-prayer-detail-modal@2x.png`
- `05-request-prayer-modal@2x.png`
- `06-inbox-modal@2x.png`
- `07-prayer-animation-layer@2x.png`
- `08-prayer-connection@2x.png`

### Component Exports

**For Reusable Components:**
- Prayer Marker states (default, hovered, prayed)
- Preview Bubble
- Prayer Card (inbox)
- Tab System
- Loading states
- Empty states

---

## Developer Notes

### Critical Implementation Details

#### 1. Glassmorphic Effects
**Must use both prefixed and standard backdrop-filter:**
```css
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
```

**Fallback for unsupported browsers:**
```css
@supports not (backdrop-filter: blur(12px)) {
  .glass { background: rgba(255, 255, 255, 0.95); }
}
```

#### 2. Mapbox Map Initialization
- Set `mapboxgl.accessToken` before creating Map instance
- Use `attributionControl: false` to hide default attribution
- Customize water and landuse colors on map 'load' event
- Clean up map instance in useEffect return

#### 3. Distance Calculation
- Use Haversine formula for accurate distances
- Earth radius: 3959 miles (or 6371 km)
- Convert degrees to radians
- Round to 1 decimal place for display

#### 4. SVG Path Animation
- Measure path length with `getTotalLength()`
- Use `strokeDasharray` and `strokeDashoffset` for draw effect
- Animate offset from pathLength to 0
- Use linear easing for smooth drawing

#### 5. Modal Management
- Always wrap Motion components with `<AnimatePresence>`
- Use `mode="wait"` when switching between modals
- Prevent background scroll when modal is open
- Stop propagation on modal content clicks

#### 6. Performance Optimization
- Throttle map move/zoom handlers to 60fps
- Use React.memo for Prayer Marker components
- Only render markers within viewport bounds
- Use `will-change: transform, opacity` for animated elements
- Lazy load heavy modals with Suspense

#### 7. Memorial Line Expiration
- Check expiration every hour
- Filter connections where `now <= expiresAt`
- Set expiration date as `createdAt + 1 year`
- Automatically remove from state when expired

#### 8. Responsive Behavior
- Mobile: Bottom-sheet style modals (slide up)
- Desktop: Centered modals (scale in)
- Use Tailwind breakpoints: `sm:`, `md:`, `lg:`
- Touch targets minimum 48px on mobile

### Browser Support

**Minimum Versions:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+

**Required Features:**
- ES2020
- CSS Grid & Flexbox
- backdrop-filter
- SVG path animations
- Touch events

### Common Pitfalls

❌ **Don't:**
- Animate width, height, top, left (causes reflow)
- Create Map instance multiple times
- Forget to clean up map event listeners
- Mix call_mcp_tool with run_mcp_tool
- Use relative time without timezone handling

✅ **Do:**
- Animate only transform and opacity
- Store map in useRef
- Remove listeners in useEffect cleanup
- Use UTC timestamps for consistency
- Throttle expensive operations

### Testing Checklist

- [ ] Loading screen appears for exactly 2 seconds
- [ ] Auth modal has floating particle animation
- [ ] Map tiles load correctly
- [ ] Prayer markers appear at correct positions
- [ ] Markers update position on map pan/zoom
- [ ] Preview bubble shows on hover
- [ ] Distance calculation is accurate
- [ ] Prayer send animation plays full 6 seconds
- [ ] Memorial line appears after animation
- [ ] Connection line expires after 1 year
- [ ] Modals slide up on mobile, scale on desktop
- [ ] Glassmorphic effects work in all browsers
- [ ] All buttons have hover states
- [ ] Keyboard navigation works
- [ ] Screen reader labels present

---

## Animation Timing Reference

Quick reference for all animation durations:

| Animation | Duration | Delay |
|-----------|----------|-------|
| Loading screen | 2000ms | 0ms |
| Modal entrance | 300ms | 0ms |
| Button hover | 200ms | 0ms |
| Marker hover | 200ms | 0ms |
| Preview bubble | 150ms | 0ms |
| Tab switch | 300ms | 0ms |
| **Prayer Animation:** | | |
| - Camera move | 2000ms | 0ms |
| - Line draw | 2000ms | 2000ms |
| - Spotlights | 2000ms | 4000ms |
| - Camera return | 2000ms | 4000ms |
| Connection hover | 200ms | 0ms |
| Particle flow | 6000ms | 0ms (infinite) |
| Rainbow border | 3000ms | 0ms (infinite) |

---

## Z-Index Hierarchy

From bottom to top:

0. Map base layer
5. Prayer connection lines (SVG)
10. Prayer markers
20. Preview bubbles
30. Map header
40. Request Prayer button
50. Modals (Prayer Detail, Request, Inbox)
60. Auth Modal
70. Prayer Animation Layer
100. Loading Screen

---

## Accessibility Requirements

### ARIA Labels
- All buttons must have descriptive labels
- Modals must have `role="dialog"` and `aria-modal="true"`
- Prayer markers need descriptive labels with distance
- Form inputs need associated labels

### Keyboard Support
- Tab through all interactive elements
- Escape closes active modal
- Enter/Space activates buttons
- Arrow keys navigate lists

### Screen Reader
- Announce modal open/close
- Read prayer content
- Describe map state changes
- Alert on successful prayer send

### Focus Management
- Trap focus inside modals
- Return focus to trigger on close
- Visible focus indicators
- Skip link to main content

---

## Success Metrics

### Performance Targets
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Map Load Time:** < 2s
- **Modal Open Time:** < 300ms
- **Animation Frame Rate:** 60fps

### User Experience Goals
- Beautiful, spiritual aesthetic
- Smooth, delightful animations
- Intuitive navigation
- Accessible to all users
- Responsive across devices

---

## Additional Documentation

For more detailed information, refer to:

1. **`01-SCREEN-INVENTORY.md`** - Complete screen list and flow
2. **`02-DESIGN-SYSTEM.md`** - Comprehensive design token documentation
3. **`03-SCREEN-SPECIFICATIONS.md`** - Detailed specs for every screen
4. **`04-COMPONENT-LIBRARY.md`** - Reusable component specifications
5. **`05-INTERACTIONS-AND-ANIMATIONS.md`** - All interactions and animations
6. **`06-TECHNICAL-IMPLEMENTATION.md`** - Technical implementation guide

---

## Contact & Support

**Project Name:** PrayerMap  
**Version:** 1.0 (MVP)  
**Last Updated:** November 19, 2025

**For Questions:**
- Design decisions: Reference design system documentation
- Technical implementation: Reference technical guide
- Component specifications: Reference component library

---

## Next Steps for Developers

1. ✅ **Review this master document** for project overview
2. ✅ **Read design system** (`02-DESIGN-SYSTEM.md`) to understand tokens
3. ✅ **Study screen specifications** (`03-SCREEN-SPECIFICATIONS.md`) for layouts
4. ✅ **Review technical guide** (`06-TECHNICAL-IMPLEMENTATION.md`) for code patterns
5. ✅ **Set up environment** with required dependencies
6. ✅ **Configure Mapbox** token and test map loading
7. ✅ **Implement glassmorphic** effects with fallbacks
8. ✅ **Build prayer animation** sequence carefully (6-second timing critical)
9. ✅ **Test across browsers** and devices
10. ✅ **Optimize performance** for smooth 60fps animations

---

**This handoff package contains everything needed to build PrayerMap exactly as designed. Every interaction, animation, color, spacing, and technical detail has been documented. Good luck building something beautiful! 🙏✨**
