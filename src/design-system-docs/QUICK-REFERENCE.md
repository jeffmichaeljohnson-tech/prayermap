# PrayerMap - Quick Reference Guide

One-page reference for the most commonly needed information.

---

## 🎨 Design Tokens (Most Used)

### Colors
```
Primary Gold:    #FFD700
Primary Purple:  #9370DB  
Sky Blue:        #87CEEB
Soft Pink:       #FFC0CB

White 95%:       rgba(255, 255, 255, 0.95)
White 80%:       rgba(255, 255, 255, 0.8)
Black 30%:       rgba(0, 0, 0, 0.3)

Gray 800:        #1F2937 (primary text)
Gray 700:        #374151 (secondary text)
Gray 600:        #4B5563 (tertiary text)
```

### Typography
```
Display (App Title):    Cinzel 700, 48px
Modal Titles:          Cinzel 600, 24px
Section Headers:       Cinzel 600, 20px

Prayer Content:        Inter 400, 16px, line-height 1.6
Body Text:             Inter 400, 14px
Small Text:            Inter 400, 12px
```

### Spacing
```
xs:    4px    (gap-1, p-1)
sm:    8px    (gap-2, p-2)
base:  16px   (gap-4, p-4)
lg:    24px   (gap-6, p-6)
xl:    32px   (gap-8, p-8)
```

### Border Radius
```
Small:      8px   (rounded-lg)
Default:    12px  (rounded-xl)
Large:      16px  (rounded-2xl)
XL:         24px  (rounded-3xl)
Circle:     9999px (rounded-full)
```

---

## 💎 Glassmorphic Effects

### Glass Strong (Modals, Headers)
```css
background: rgba(255, 255, 255, 0.95);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.3);
box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
```

### Glass Medium (Cards, Inputs)
```css
background: rgba(255, 255, 255, 0.8);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.2);
box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
```

### Glass Subtle (Hover States)
```css
background: rgba(255, 255, 255, 0.6);
backdrop-filter: blur(8px);
-webkit-backdrop-filter: blur(8px);
border: 1px solid rgba(255, 255, 255, 0.15);
box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
```

---

## 🎬 Key Animations

### Prayer Send Animation (6 seconds total)
```
Phase 1 (0-2s):   Map camera movement (zoom, tilt, pan)
Phase 2 (2-4s):   Animated line draw + pulsing circles
Phase 3 (4-6s):   Spotlight effects (yellow + purple)
Phase 4 (4-6s):   Camera return (concurrent with Phase 3)
```

### Modal Animations
```javascript
// Mobile (slide up)
initial={{ y: "100%", opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
transition={{ type: "spring", damping: 25, stiffness: 300 }}

// Desktop (scale in)
initial={{ scale: 0.9, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
transition={{ duration: 0.3 }}
```

### Button Interactions
```javascript
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

---

## 🗺️ Mapbox Setup

### Initialization
```javascript
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const map = new mapboxgl.Map({
  container: mapContainer.current,
  style: 'mapbox://styles/mapbox/light-v11',
  center: [lng, lat],
  zoom: 12,
  pitch: 0,
  bearing: 0,
  attributionControl: false
});
```

### Map Customization (on load)
```javascript
map.on('load', () => {
  // Change water color
  map.setPaintProperty('water', 'fill-color', 'hsl(210, 80%, 85%)');
  
  // Reduce landuse opacity
  map.setPaintProperty('landuse', 'fill-opacity', 0.3);
});
```

### Camera Animation
```javascript
map.easeTo({
  center: [lng, lat],
  zoom: 14,
  pitch: 60,
  bearing: 45,
  duration: 2000,
  easing: (t) => t * (2 - t)
});
```

---

## 📏 Distance Calculation

### Haversine Formula
```typescript
function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * 
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

**Usage:**
```typescript
const miles = calculateDistance(
  userLocation.lat, userLocation.lng,
  prayer.location.lat, prayer.location.lng
);

console.log(`${miles.toFixed(1)} miles away`);
```

---

## 🎯 SVG Path Animation

### Creating Curved Path
```typescript
// Screen coordinates
const start = map.project([fromLng, fromLat]);
const end = map.project([toLng, toLat]);

// Quadratic Bezier curve
const midX = (start.x + end.x) / 2;
const midY = (start.y + end.y) / 2;
const controlY = midY + 50; // Arc height

const pathD = `M ${start.x} ${start.y} Q ${midX} ${controlY} ${end.x} ${end.y}`;
```

### Animating Line Draw
```tsx
const pathLength = pathElement.current.getTotalLength();

<motion.path
  d={pathD}
  stroke="url(#gradient)"
  strokeWidth="3"
  strokeDasharray={pathLength}
  strokeDashoffset={pathLength}
  animate={{ strokeDashoffset: 0 }}
  transition={{ duration: 2, ease: "linear" }}
/>
```

---

## 🔧 TypeScript Interfaces

### Prayer
```typescript
interface Prayer {
  id: string;
  title?: string;
  content: string;
  contentType: 'text' | 'audio' | 'video';
  location: { lat: number; lng: number };
  userName?: string;
  isAnonymous: boolean;
  createdAt: Date;
  prayedBy: string[];
}
```

### Prayer Connection
```typescript
interface PrayerConnection {
  id: string;
  prayerId: string;
  fromLocation: { lat: number; lng: number };
  toLocation: { lat: number; lng: number };
  requesterName: string;
  replierName: string;
  createdAt: Date;
  expiresAt: Date;
}
```

---

## ⏱️ Animation Timing

| Element | Duration | Delay | Easing |
|---------|----------|-------|--------|
| Loading screen | 2000ms | 0ms | - |
| Modal slide up | ~400ms | 0ms | spring |
| Modal scale in | 300ms | 0ms | ease-out |
| Button hover | 200ms | 0ms | ease-out |
| Marker hover | 200ms | 0ms | ease-out |
| Preview bubble | 150ms | 0ms | ease-out |
| Map camera move | 2000ms | 0ms | custom |
| Line draw | 2000ms | 2000ms | linear |
| Spotlights | 2000ms | 4000ms | ease-out |
| Connection hover | 200ms | 0ms | ease |

---

## 📱 Responsive Breakpoints

```
sm:  640px   (Small tablets)
md:  768px   (Tablets)
lg:  1024px  (Small desktops)
xl:  1280px  (Desktops)
2xl: 1536px  (Large desktops)
```

**Mobile-first approach:**
- Default styles for mobile (< 640px)
- Use `sm:`, `md:`, `lg:` for larger screens

---

## 🎨 Gradients

### Primary Button
```css
background: linear-gradient(to right, #FFD700, #9370DB);
```

### Rainbow Connection
```css
background: linear-gradient(90deg, 
  hsl(45, 100%, 70%),   /* Gold */
  hsl(200, 80%, 70%),   /* Sky Blue */
  hsl(270, 60%, 70%)    /* Purple */
);
```

### Animated Border
```css
background: linear-gradient(90deg, 
  rgba(255,215,0,0.4),
  rgba(255,192,203,0.4),
  rgba(147,112,219,0.4),
  rgba(135,206,250,0.4),
  rgba(255,215,0,0.4)
);
background-size: 300% 300%;

/* Animate */
animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
transition={{ duration: 3, repeat: Infinity }}
```

---

## 🏗️ Z-Index Layers

```
100  Loading Screen
70   Prayer Animation Layer
60   Auth Modal
50   Modals (Prayer Detail, Request, Inbox)
40   Request Prayer Button
30   Map Header
20   Preview Bubbles
10   Prayer Markers
5    Connection Lines (SVG)
0    Map Base
```

---

## 🌐 Environment Variables

```env
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiamVmZm1pY2hhZWxqb2huc29uLXRlY2giLCJhIjoiY21pM28wNWw2MXNlZDJrcHdhaHJuY3M4ZyJ9.LD85_bwC_M-3JKjhjtDhqQ

# Future
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_APPLE_CLIENT_ID=your_id
```

---

## 🚀 Performance Targets

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Map Load Time:** < 2s
- **Modal Open:** < 300ms
- **Frame Rate:** 60fps

**Optimization Tips:**
- Throttle map updates to 16ms (60fps)
- Use React.memo for markers
- Only render visible markers
- Animate only transform & opacity
- Use will-change hint

---

## ⌨️ Keyboard Shortcuts

```
Tab          Navigate elements
Escape       Close modal
Enter/Space  Activate button
Arrow keys   Navigate lists
```

---

## 🎯 Screen Sizes

### Mobile Modal
```javascript
className="w-full max-w-md"  // 448px max
```

### Inbox Modal
```javascript
className="w-full max-w-lg"  // 512px max
```

### Map View
```javascript
className="absolute inset-0"  // Full screen
```

---

## 🔍 Common Selectors

### Glassmorphic Classes
```
.glass-strong
.glass
.glass-subtle
```

### Tailwind Utilities
```
rounded-3xl    (24px radius)
rounded-xl     (12px radius)
rounded-full   (circle)

p-6            (24px padding)
gap-4          (16px gap)

text-gray-800  (primary text)
text-gray-600  (secondary text)

shadow-lg      (large shadow)
backdrop-blur-sm (8px blur)
```

---

## 📦 NPM Packages

### Core
```
react
react-dom
typescript
vite
```

### Styling
```
tailwindcss
```

### Animation
```
motion/react (formerly framer-motion)
```

### Map
```
mapbox-gl
```

### UI
```
lucide-react (icons)
```

### Future
```
@supabase/supabase-js
```

---

## 🎨 Icons Used (Lucide)

```
Inbox      - Inbox button
Settings   - Settings button
Send       - Send prayer
X          - Close modals
Type       - Text input mode
Mic        - Audio mode
Video      - Video mode
Upload     - File upload
```

**Emoji:**
```
🙏  Prayer hands (primary icon)
✨  Sparkles (success)
🎵  Music note (audio)
🎥  Video camera (video)
```

---

## 📄 File Locations

```
/App.tsx                          Main app + loading screen
/components/AuthModal.tsx         Authentication
/components/PrayerMap.tsx         Main map view
/components/PrayerMarker.tsx      Map markers
/components/PreviewBubble.tsx     Hover previews
/components/PrayerDetailModal.tsx View/respond to prayers
/components/RequestPrayerModal.tsx Create prayers
/components/InboxModal.tsx        View received prayers
/components/PrayerAnimationLayer.tsx Prayer animation
/components/PrayerConnection.tsx  Memorial lines
/components/ui/*                  ShadCN components
/types/prayer.ts                  TypeScript types
/styles/globals.css               Global styles
```

---

## ⚡ Quick Commands

```bash
# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

---

## 🐛 Common Issues

**Map not loading:**
→ Check VITE_MAPBOX_ACCESS_TOKEN

**Backdrop blur not working:**
→ Add -webkit- prefix

**Markers not updating:**
→ Check map event listeners

**Animations choppy:**
→ Animate only transform/opacity

**Modal stuck open:**
→ Check AnimatePresence wrapper

---

## ✅ Testing Checklist

- [ ] Loading screen 2 seconds
- [ ] Auth modal particles animate
- [ ] Map tiles load
- [ ] Markers at correct positions
- [ ] Distance calculation accurate
- [ ] Prayer animation 6 seconds
- [ ] Memorial line appears
- [ ] Glassmorphic effects work
- [ ] Modals slide on mobile
- [ ] Keyboard navigation works

---

**This is your go-to reference. For detailed information, see the full documentation.**

**Happy coding! 🙏✨**
