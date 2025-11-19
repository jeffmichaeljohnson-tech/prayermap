# PrayerMap - Component Library

Detailed specifications for all reusable components.

---

## ShadCN UI Components Used

PrayerMap uses the following components from ShadCN UI library. These are located in `/components/ui/`.

### Button (`button.tsx`)
**Usage:** Primary actions, secondary actions, icon buttons

**Variants Used:**
- **Default:** Solid background, medium shadow
- **Ghost:** Transparent background, hover effect

**Sizes Used:**
- **Default:** 16px padding vertical, 32px horizontal
- **Small:** 8px padding vertical, 16px horizontal
- **Icon:** Square padding 8px

### Input (`input.tsx`)
**Usage:** Single-line text inputs

**Specifications:**
- **Background:** Glass (white 80% opacity)
- **Border:** None (overridden)
- **Focus Ring:** 2px purple 300
- **Padding:** 12px
- **Border Radius:** 12px (rounded-xl)
- **Font:** Inter, Regular, 14px

### Textarea (`textarea.tsx`)
**Usage:** Multi-line text inputs for prayer content

**Specifications:**
- **Background:** Glass
- **Border:** None
- **Focus Ring:** 2px purple 300
- **Padding:** 12px
- **Border Radius:** 12px
- **Resize:** None (disabled)
- **Font:** Inter, Regular, 14px
- **Min Rows:** 4-5

### Switch (`switch.tsx`)
**Usage:** Anonymous toggle, settings toggles

**Specifications:**
- **Track Width:** 44px
- **Track Height:** 24px
- **Thumb Size:** 20px circle
- **Active Color:** Purple 300
- **Inactive Color:** Gray 300
- **Transition:** 200ms ease

**States:**
- **Off:** Gray track, thumb left
- **On:** Purple track, thumb right
- **Disabled:** Opacity 0.5

### Dialog (`dialog.tsx`)
**Note:** Not directly used, but modal patterns follow Dialog structure

---

## Custom Components

### Glass Effect Utilities

#### .glass-strong
**CSS Class Definition:**
```css
.glass-strong {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}
```

**Usage:**
- Modal cards
- Map header
- Primary cards and containers
- Floating action buttons

#### .glass
**CSS Class Definition:**
```css
.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
}
```

**Usage:**
- Input fields
- Secondary cards
- List items
- Inbox prayer cards

#### .glass-subtle
**CSS Class Definition:**
```css
.glass-subtle {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
}
```

**Usage:**
- Hover states
- Preview bubbles
- Subtle overlays

---

## Prayer Marker

**File:** `/components/PrayerMarker.tsx`

### Props
```typescript
interface PrayerMarkerProps {
  prayer: Prayer;
  map: mapboxgl.Map | null;
  onClick: () => void;
  isPrayed: boolean;
}
```

### Component Structure
```
<div> (positioned container)
  └─ <div> (marker circle with glass effect)
      ├─ <span> (🙏 emoji)
      └─ {isPrayed && <div>} (checkmark overlay)
  └─ {isHovered && <PreviewBubble />}
```

### Specifications

#### Root Container
- **Position:** Absolute
- **Top/Left:** Calculated from `map.project([lng, lat])`
- **Transform:** `translate(-50%, -50%)`
- **Z-Index:** 10
- **Pointer Events:** Auto
- **Cursor:** Pointer

#### Marker Circle
- **Width/Height:** 48px (`w-12 h-12`)
- **Background:** `rgba(255, 255, 255, 0.8)`
- **Backdrop Filter:** blur(12px)
- **Border:** 2px solid `rgba(255, 255, 255, 0.4)`
- **Border Radius:** 50% (full circle)
- **Box Shadow:** `0 4px 16px 0 rgba(0, 0, 0, 0.08)`
- **Display:** Flex
- **Align Items:** Center
- **Justify Content:** Center
- **Transition:** transform 200ms, box-shadow 200ms, border-color 200ms

**Hover State:**
- **Transform:** `scale(1.1)`
- **Box Shadow:** `0 8px 32px 0 rgba(0, 0, 0, 0.1)`

**Prayed State:**
- **Border:** 3px solid `#FFD700` (gold)
- **Border Color:** `#FFD700`

#### Emoji Icon
- **Content:** 🙏
- **Font Size:** 24px (`text-2xl`)
- **Line Height:** 1
- **User Select:** None

#### Checkmark Overlay (Prayed State Only)
- **Position:** Absolute
- **Top:** -4px
- **Right:** -4px
- **Width/Height:** 16px
- **Background:** `#FFD700` (gold)
- **Border:** 2px solid white
- **Border Radius:** 50% (full circle)
- **Display:** Flex
- **Align Items:** Center
- **Justify Content:** Center
- **Font Size:** 10px
- **Color:** White
- **Content:** ✓

### Interactions
1. **Hover:** Scale up marker, show preview bubble
2. **Click:** Fire onClick callback → Opens Prayer Detail Modal
3. **Prayed:** Show checkmark overlay, gold border

### Position Updates
```javascript
useEffect(() => {
  if (!map) return;
  
  const updatePosition = () => {
    const point = map.project([prayer.location.lng, prayer.location.lat]);
    setPosition({ x: point.x, y: point.y });
  };
  
  map.on('move', updatePosition);
  map.on('zoom', updatePosition);
  
  updatePosition(); // Initial position
  
  return () => {
    map.off('move', updatePosition);
    map.off('zoom', updatePosition);
  };
}, [map, prayer.location]);
```

### Example Usage
```jsx
<PrayerMarker
  prayer={prayer}
  map={map.current}
  onClick={() => handlePrayerClick(prayer)}
  isPrayed={prayer.prayedBy && prayer.prayedBy.length > 0}
/>
```

---

## Preview Bubble

**File:** `/components/PreviewBubble.tsx`

### Props
```typescript
interface PreviewBubbleProps {
  prayer: Prayer;
}
```

### Component Structure
```
<motion.div> (container)
  ├─ <div> (arrow/tail)
  └─ <div> (content)
      ├─ <p> (user name)
      └─ <p> (prayer preview text)
```

### Specifications

#### Container
- **Position:** Absolute
- **Bottom:** calc(100% + 8px) (8px above marker)
- **Left:** 50%
- **Transform:** `translateX(-50%)`
- **Min Width:** 200px
- **Max Width:** 280px
- **Background:** `rgba(255, 255, 255, 0.95)`
- **Backdrop Filter:** blur(20px)
- **Border:** 1px solid `rgba(255, 255, 255, 0.3)`
- **Border Radius:** 12px (`rounded-xl`)
- **Padding:** 12px (`p-3`)
- **Box Shadow:** `0 8px 32px 0 rgba(0, 0, 0, 0.1)`
- **Pointer Events:** None
- **Z-Index:** 20

#### Arrow/Tail
- **Position:** Absolute
- **Bottom:** -6px
- **Left:** 50%
- **Transform:** `translateX(-50%) rotate(45deg)`
- **Width/Height:** 12px
- **Background:** `rgba(255, 255, 255, 0.95)`
- **Border Right:** 1px solid `rgba(255, 255, 255, 0.3)`
- **Border Bottom:** 1px solid `rgba(255, 255, 255, 0.3)`

#### User Name
- **Font:** Inter, Semi-Bold, 14px
- **Color:** Gray 800 (#1F2937)
- **Margin Bottom:** 4px
- **Line Height:** 1.2
- **Content:** `prayer.isAnonymous ? 'Anonymous' : prayer.userName`

#### Prayer Preview
- **Font:** Inter, Regular, 13px
- **Color:** Gray 600 (#4B5563)
- **Line Height:** 1.4
- **Display:** -webkit-box
- **-webkit-line-clamp:** 2
- **-webkit-box-orient:** vertical
- **Overflow:** Hidden
- **Text Overflow:** Ellipsis
- **Content:** `prayer.title || prayer.content` (max 2 lines)

### Animation
```javascript
initial={{ opacity: 0, y: 4 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 4 }}
transition={{ duration: 0.15 }}
```

### Example Usage
```jsx
{isHovered && (
  <AnimatePresence>
    <PreviewBubble prayer={prayer} />
  </AnimatePresence>
)}
```

---

## Prayer Connection

**File:** `/components/PrayerConnection.tsx`

### Props
```typescript
interface PrayerConnectionProps {
  connection: PrayerConnection;
  map: mapboxgl.Map;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}
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
  expiresAt: Date;
}
```

### Component Structure
```
<g> (SVG group)
  ├─ <path> (curved line)
  └─ {isHovered && <Tooltip />}
```

### Specifications

#### SVG Path
- **Element:** `<path>`
- **d:** Calculated quadratic Bezier curve
- **Stroke:** `url(#connectionGradient)` or `url(#connectionGradientHover)`
- **Stroke Width:** 2px (default) or 3px (hover)
- **Fill:** None
- **Stroke Linecap:** Round
- **Opacity:** 0.8 (default) or 1 (hover)
- **Pointer Events:** Stroke
- **Cursor:** Pointer
- **Transition:** All 200ms ease

#### Path Calculation
```javascript
const fromPoint = map.project([connection.fromLocation.lng, connection.fromLocation.lat]);
const toPoint = map.project([connection.toLocation.lng, connection.toLocation.lat]);

const midX = (fromPoint.x + toPoint.x) / 2;
const midY = (fromPoint.y + toPoint.y) / 2;
const controlY = midY + 50; // Arc downward

const pathD = `M ${fromPoint.x} ${fromPoint.y} Q ${midX} ${controlY} ${toPoint.x} ${toPoint.y}`;
```

#### Tooltip (Hover)
- **Position:** Fixed at mouse position
- **Background:** Glass strong
- **Padding:** 8px 12px
- **Border Radius:** 8px
- **Box Shadow:** Medium
- **Font:** Inter, Regular, 12px
- **Color:** Gray 700
- **Max Width:** 200px
- **Z-Index:** 100
- **Pointer Events:** None

**Content:**
```
Prayer from {requesterName}
Prayed by {replierName}
{relativeTime(createdAt)}
```

### Lifecycle Management
```javascript
// Check if connection is expired
const isExpired = new Date() > connection.expiresAt;

// Don't render if expired
if (isExpired) return null;

// Update position on map move
useEffect(() => {
  const handleUpdate = () => forceUpdate();
  map.on('move', handleUpdate);
  map.on('zoom', handleUpdate);
  return () => {
    map.off('move', handleUpdate);
    map.off('zoom', handleUpdate);
  };
}, [map]);
```

### Example Usage
```jsx
<svg className="absolute inset-0 w-full h-full">
  <defs>
    <linearGradient id="connectionGradient">...</linearGradient>
  </defs>
  
  {connections.map(conn => (
    <PrayerConnection
      key={conn.id}
      connection={conn}
      map={map.current}
      isHovered={hoveredConnection === conn.id}
      onHover={() => setHoveredConnection(conn.id)}
      onLeave={() => setHoveredConnection(null)}
    />
  ))}
</svg>
```

---

## Prayer Animation Layer

**File:** `/components/PrayerAnimationLayer.tsx`

### Props
```typescript
interface PrayerAnimationLayerProps {
  prayer: Prayer;
  userLocation: { lat: number; lng: number };
  map: mapboxgl.Map | null;
  onComplete: () => void;
}
```

### Component Structure
```
<motion.div> (full screen overlay)
  └─ <svg> (animation canvas)
      ├─ <defs>
      │   └─ <linearGradient id="lineGradient">
      ├─ <path> (animated line)
      ├─ <circle> (pulsing start point)
      ├─ <circle> (pulsing end point)
      └─ <motion.div> (spotlight beams - 2x)
```

### Specifications

#### Root Container
- **Position:** Fixed, full screen
- **Z-Index:** 70
- **Pointer Events:** None
- **Width:** 100vw
- **Height:** 100vh

#### SVG Canvas
- **Width:** 100%
- **Height:** 100%
- **Position:** Absolute inset-0
- **Overflow:** Visible

#### Line Gradient
```svg
<linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
  <stop offset="100%" stopColor="#9370DB" stopOpacity="1" />
</linearGradient>
```

#### Animated Path
- **d:** Quadratic Bezier from user to prayer location
- **Stroke:** `url(#lineGradient)`
- **Stroke Width:** 3px
- **Fill:** None
- **Stroke Linecap:** Round
- **Initial:** `strokeDashoffset: pathLength`
- **Animate:** `strokeDashoffset: 0`
- **Duration:** 2 seconds
- **Delay:** 2 seconds (after map movement)
- **Easing:** Linear

#### Pulsing Circles
**Start Circle (User Location):**
- **cx/cy:** Calculated from projection
- **Fill:** `#FFD700` (gold)
- **Initial r:** 10
- **Animate r:** [10, 20, 10]
- **Initial opacity:** 0.8
- **Animate opacity:** [0.8, 0.4, 0.8]
- **Duration:** 1.5 seconds
- **Delay:** 2 seconds
- **Repeat:** 1

**End Circle (Prayer Location):**
- Same specs but purple fill (`#9370DB`)

#### Spotlight Beams
**Yellow Spotlight:**
- **Element:** `<motion.div>`
- **Position:** Absolute, calculated from prayer location
- **Width:** 100px
- **Height:** 100%
- **Bottom:** 0
- **Background:** `linear-gradient(to top, rgba(255,215,0,0.6), rgba(255,215,0,0.4), transparent)`
- **Initial:** `scaleY: 0, opacity: 0`
- **Animate:** `scaleY: [0, 1], opacity: [0, 1, 0]`
- **Duration:** 2 seconds
- **Delay:** 4 seconds
- **Easing:** ease-out

**Purple Spotlight:**
- Same specs but at user location with purple gradient

### Animation Sequence

#### Phase 1: Map Movement (0-2s)
```javascript
useEffect(() => {
  if (!map) return;
  
  const midpoint = [
    (userLocation.lng + prayer.location.lng) / 2,
    (userLocation.lat + prayer.location.lat) / 2
  ];
  
  const idealZoom = calculateIdealZoom(userLocation, prayer.location);
  
  map.easeTo({
    center: midpoint,
    zoom: idealZoom,
    pitch: 60,
    bearing: calculateBearing(userLocation, prayer.location),
    duration: 2000,
    easing: t => t * (2 - t)
  });
}, []);
```

#### Phase 2: Line Draw (2-4s)
Motion animate on path strokeDashoffset

#### Phase 3: Spotlights (4-6s)
Motion animate on spotlight divs

#### Phase 4: Map Return (4-6s, concurrent)
```javascript
setTimeout(() => {
  map.easeTo({
    center: originalCenter,
    zoom: originalZoom,
    pitch: 0,
    bearing: originalBearing,
    duration: 2000
  });
}, 4000);
```

#### Phase 5: Complete (6s)
```javascript
setTimeout(() => {
  onComplete();
}, 6000);
```

### Example Usage
```jsx
<AnimatePresence>
  {animatingPrayer && (
    <PrayerAnimationLayer
      prayer={animatingPrayer.prayer}
      userLocation={animatingPrayer.userLocation}
      map={map.current}
      onComplete={handleAnimationComplete}
    />
  )}
</AnimatePresence>
```

---

## Tab System (Inbox)

### Component Structure
```jsx
<div className="glass rounded-xl p-2 flex gap-1">
  {tabs.map(tab => (
    <button
      key={tab.id}
      className={`
        py-2 px-4 rounded-lg transition-all duration-200
        ${activeTab === tab.id 
          ? 'bg-white text-gray-800 shadow-sm' 
          : 'text-gray-600 hover:text-gray-800'}
      `}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### Specifications

#### Container
- **Background:** Glass (white 80% opacity)
- **Border Radius:** 12px (`rounded-xl`)
- **Padding:** 8px (`p-2`)
- **Flexbox:** Row, gap 4px (`gap-1`)

#### Tab Button (Default)
- **Padding:** 8px vertical, 16px horizontal (`py-2 px-4`)
- **Border Radius:** 8px (`rounded-lg`)
- **Font:** Inter, Medium, 14px
- **Color:** Gray 600
- **Background:** Transparent
- **Cursor:** Pointer
- **Transition:** All 200ms

**Hover State:**
- **Color:** Gray 800

#### Tab Button (Active)
- **Background:** White (#FFFFFF)
- **Color:** Gray 800
- **Shadow:** Small (0 2px 8px rgba(0,0,0,0.05))

### Example Usage
```jsx
const [activeTab, setActiveTab] = useState('all');

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'received', label: 'Received' },
  { id: 'sent', label: 'Sent' }
];

<TabSystem tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
```

---

## Prayer Card (Inbox)

### Component Structure
```jsx
<div className="glass rounded-2xl p-4 cursor-pointer transition-all">
  <div className="flex justify-between items-start mb-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-purple-300 flex items-center justify-center">
        {firstLetter}
      </div>
      <div>
        <p className="font-semibold">{userName}</p>
        <p className="text-sm text-gray-500">{relativeTime}</p>
      </div>
    </div>
    {isUnread && <div className="w-2 h-2 bg-pink-500 rounded-full" />}
  </div>
  <p className="text-gray-700 line-clamp-2">{content}</p>
  <div className="flex justify-between items-center mt-3">
    <p className="text-sm text-gray-600">{replyCount} replies</p>
    {type === 'audio' && <span className="text-xs">🎵 Audio</span>}
    {type === 'video' && <span className="text-xs">🎥 Video</span>}
  </div>
</div>
```

### Specifications

#### Container
- **Background:** Glass (white 80% opacity)
- **Padding:** 16px (`p-4`)
- **Border Radius:** 16px (`rounded-2xl`)
- **Cursor:** Pointer
- **Transition:** All 200ms

**Hover State:**
- **Background:** Glass subtle (white 60% opacity)
- **Transform:** `translateY(-2px)`
- **Shadow:** Medium → Large

#### Avatar
- **Size:** 40px (`w-10 h-10`)
- **Border Radius:** Full
- **Background:** Gradient (yellow → purple) OR gray 200
- **Display:** Flex
- **Align Items:** Center
- **Justify Content:** Center
- **Font:** Inter, Semi-Bold, 16px
- **Color:** White (if gradient) or Gray 700 (if gray bg)
- **Content:** First letter of name OR 🙏 emoji if anonymous

#### User Name
- **Font:** Inter, Semi-Bold, 14px
- **Color:** Gray 800
- **Line Height:** 1.2

#### Timestamp
- **Font:** Inter, Regular, 12px
- **Color:** Gray 500
- **Line Height:** 1.2
- **Format:** Relative time (e.g., "2h ago", "1d ago")

#### Unread Badge
- **Size:** 8px circle (`w-2 h-2`)
- **Background:** Pink 500 (#EC4899)
- **Border Radius:** Full
- **Position:** Top-right of card header

#### Content Preview
- **Font:** Inter, Regular, 14px
- **Color:** Gray 700
- **Line Height:** 1.5
- **Display:** -webkit-box
- **-webkit-line-clamp:** 2
- **-webkit-box-orient:** vertical
- **Overflow:** Hidden

#### Reply Count
- **Font:** Inter, Medium, 12px
- **Color:** Gray 600
- **Format:** "X replies" or "No replies"

#### Type Badge (Audio/Video)
- **Padding:** 4px 8px
- **Background:** Gray 100
- **Border Radius:** 6px (`rounded-md`)
- **Font:** Inter, Medium, 11px
- **Color:** Gray 700
- **Content:** Emoji + "Audio" or "Video"

### Example Usage
```jsx
<PrayerCard
  userName="Sarah"
  userAvatar="S"
  content="Thank you for praying for my mother..."
  timestamp={new Date(Date.now() - 2 * 60 * 60 * 1000)}
  isUnread={true}
  replyCount={2}
  contentType="text"
  onClick={() => openPrayerDetail(prayer.id)}
/>
```

---

## Loading States

### Skeleton Card
```jsx
<div className="glass rounded-2xl p-4 animate-pulse">
  <div className="flex items-center gap-3 mb-3">
    <div className="w-10 h-10 rounded-full bg-gray-200" />
    <div className="flex-1">
      <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-16" />
    </div>
  </div>
  <div className="space-y-2">
    <div className="h-3 bg-gray-200 rounded w-full" />
    <div className="h-3 bg-gray-200 rounded w-3/4" />
  </div>
</div>
```

### Spinner
```jsx
<div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
```

**Specifications:**
- **Size:** 20px (can vary)
- **Border:** 2px
- **Colors:** Light gray track, dark gray spinner
- **Animation:** Continuous rotation (spin)
- **Duration:** 1 second per rotation

### Usage
```jsx
{isLoading ? (
  <div className="flex justify-center py-6">
    <Spinner />
  </div>
) : (
  <ContentComponent />
)}
```

---

## Empty States

### Prayer List Empty State
```jsx
<div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
  <span className="text-6xl opacity-50">🙏</span>
  <p className="text-gray-500">No prayers yet</p>
  <p className="text-sm text-gray-400">Tap a prayer on the map to get started</p>
</div>
```

### Specifications
- **Padding:** 48px vertical
- **Alignment:** Center (both axes)
- **Gap:** 12px between elements

**Icon:**
- **Content:** 🙏 emoji (or relevant emoji)
- **Font Size:** 64px (`text-6xl`)
- **Opacity:** 0.5

**Primary Text:**
- **Font:** Inter, Regular, 16px
- **Color:** Gray 500

**Secondary Text:**
- **Font:** Inter, Regular, 14px
- **Color:** Gray 400

### Usage
```jsx
{prayers.length === 0 ? (
  <EmptyState
    icon="🙏"
    message="No prayers yet"
    subMessage="Tap a prayer on the map to get started"
  />
) : (
  <PrayerList prayers={prayers} />
)}
```

---

## Notification Badge

### Component
```jsx
<span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center">
  {count}
</span>
```

### Specifications
- **Position:** Absolute top-right (-4px, -4px)
- **Size:** 20px circle (`w-5 h-5`)
- **Background:** Pink 500 (#EC4899)
- **Color:** White
- **Font:** Inter, Bold, 12px (`text-xs`)
- **Border Radius:** Full
- **Display:** Flex
- **Align Items:** Center
- **Justify Content:** Center
- **Content:** Number (1-99, or "99+" if over 99)

### Optional: Pulse Animation
```javascript
<motion.span
  animate={{ scale: [1, 1.1, 1] }}
  transition={{ duration: 2, repeat: Infinity }}
>
  {count}
</motion.span>
```

### Usage
```jsx
<button className="relative">
  <Inbox className="w-6 h-6" />
  {unreadCount > 0 && (
    <NotificationBadge count={unreadCount} />
  )}
</button>
```
