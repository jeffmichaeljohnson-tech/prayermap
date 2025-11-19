# PrayerMap - Technical Implementation Guide

Complete technical specifications for developers building PrayerMap.

---

## Tech Stack

### Core Framework
- **React** 18.x
- **TypeScript** 5.x
- **Vite** 5.x (Build tool)

### Styling
- **Tailwind CSS** 4.0
- **Custom CSS** for glassmorphic effects (`/styles/globals.css`)

### Animation
- **Motion** (formerly Framer Motion)
  - Import: `import { motion } from 'motion/react'`
  - Package: `motion/react`

### Mapping
- **Mapbox GL JS** 3.x
  - Package: `mapbox-gl`
  - Styles: `mapbox-gl/dist/mapbox-gl.css`
  - API Token required

### UI Components
- **ShadCN UI** (Local components in `/components/ui/`)
  - Button, Input, Textarea, Switch
  - Pre-configured with Tailwind

### Icons
- **Lucide React**
  - Package: `lucide-react`
  - Icons used: Inbox, Settings, Send, X, Type, Mic, Video, Upload

### Backend (Planned)
- **Supabase** (Not yet implemented)
  - Authentication
  - Database (PostgreSQL)
  - Real-time subscriptions

---

## Project Structure

```
prayermap/
├── public/
│   └── (static assets)
├── src/
│   ├── components/
│   │   ├── ui/                      # ShadCN components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── switch.tsx
│   │   ├── AuthModal.tsx            # Authentication screen
│   │   ├── PrayerMap.tsx            # Main map view
│   │   ├── PrayerMarker.tsx         # Map markers
│   │   ├── PreviewBubble.tsx        # Hover preview
│   │   ├── PrayerDetailModal.tsx    # View/respond to prayers
│   │   ├── RequestPrayerModal.tsx   # Create prayer requests
│   │   ├── InboxModal.tsx           # View received prayers
│   │   ├── PrayerAnimationLayer.tsx # Prayer send animation
│   │   └── PrayerConnection.tsx     # Memorial lines
│   ├── types/
│   │   └── prayer.ts                # TypeScript interfaces
│   ├── styles/
│   │   └── globals.css              # Global styles + glassmorphic
│   ├── App.tsx                      # Root component
│   └── main.tsx                     # Entry point
├── .env                             # Environment variables
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## TypeScript Interfaces

### Prayer Interface

```typescript
// /src/types/prayer.ts

export interface Prayer {
  id: string;
  title?: string;
  content: string;
  contentType: 'text' | 'audio' | 'video';
  location: {
    lat: number;
    lng: number;
  };
  userName?: string;
  isAnonymous: boolean;
  createdAt: Date;
  prayedBy: string[]; // Array of user IDs who prayed
}
```

### Prayer Connection Interface

```typescript
export interface PrayerConnection {
  id: string;
  prayerId: string;
  fromLocation: {
    lat: number;
    lng: number;
  };
  toLocation: {
    lat: number;
    lng: number;
  };
  requesterName: string;
  replierName: string;
  createdAt: Date;
  expiresAt: Date; // createdAt + 1 year
}
```

### Component Props Interfaces

```typescript
// PrayerMap
interface PrayerMapProps {
  userLocation: { lat: number; lng: number };
  onOpenSettings: () => void;
}

// PrayerMarker
interface PrayerMarkerProps {
  prayer: Prayer;
  map: mapboxgl.Map | null;
  onClick: () => void;
  isPrayed: boolean;
}

// PrayerDetailModal
interface PrayerDetailModalProps {
  prayer: Prayer;
  userLocation: { lat: number; lng: number };
  onClose: () => void;
  onPray: (prayer: Prayer) => void;
}

// RequestPrayerModal
interface RequestPrayerModalProps {
  userLocation: { lat: number; lng: number };
  onClose: () => void;
  onSubmit: (prayer: Omit<Prayer, 'id' | 'createdAt' | 'prayedBy'>) => void;
}

// InboxModal
interface InboxModalProps {
  onClose: () => void;
}

// PrayerConnection
interface PrayerConnectionProps {
  connection: PrayerConnection;
  map: mapboxgl.Map;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

// PrayerAnimationLayer
interface PrayerAnimationLayerProps {
  prayer: Prayer;
  userLocation: { lat: number; lng: number };
  map: mapboxgl.Map | null;
  onComplete: () => void;
}
```

---

## Environment Variables

### `.env` File

```env
# Mapbox
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiamVmZm1pY2hhZWxqb2huc29uLXRlY2giLCJhIjoiY21pM28wNWw2MXNlZDJrcHdhaHJuY3M4ZyJ9.LD85_bwC_M-3JKjhjtDhqQ

# Supabase (when implemented)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Apple Sign In (when implemented)
VITE_APPLE_CLIENT_ID=your_apple_client_id
```

### Usage in Code

```typescript
// Access in Vite project
const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Set in code (for Mapbox)
import mapboxgl from 'mapbox-gl';
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
```

---

## Key Implementation Details

### 1. Glassmorphic Effect

**CSS (in `/styles/globals.css`):**

```css
/* Strong glassmorphic effect */
.glass-strong {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}

/* Medium glassmorphic effect */
.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
}

/* Subtle glassmorphic effect */
.glass-subtle {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
}
```

**Usage:**
```tsx
<div className="glass-strong rounded-3xl p-6">
  {/* Content */}
</div>
```

---

### 2. Mapbox Integration

**Initialization:**

```typescript
import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function MapComponent({ userLocation }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [userLocation.lng, userLocation.lat],
      zoom: 12,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    // Customize map on load
    map.current.on('load', () => {
      if (!map.current) return;
      
      // Change water color
      if (map.current.getLayer('water')) {
        map.current.setPaintProperty('water', 'fill-color', 'hsl(210, 80%, 85%)');
      }
      
      // Reduce landuse opacity
      if (map.current.getLayer('landuse')) {
        map.current.setPaintProperty('landuse', 'fill-opacity', 0.3);
      }
    });

    // Cleanup
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [userLocation]);

  return (
    <div 
      ref={mapContainer} 
      className="absolute inset-0"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
```

**Map Camera Animation:**

```typescript
// Smooth camera movement
map.current.easeTo({
  center: [lng, lat],
  zoom: 14,
  pitch: 60,
  bearing: 45,
  duration: 2000,
  easing: (t) => t * (2 - t) // Custom easing function
});

// Jump to location (no animation)
map.current.jumpTo({
  center: [lng, lat],
  zoom: 12
});

// Fly to location (curved path)
map.current.flyTo({
  center: [lng, lat],
  zoom: 14,
  duration: 3000
});
```

**Projection (Convert lat/lng to screen coordinates):**

```typescript
const point = map.current.project([lng, lat]);
// point = { x: number, y: number } in pixels from top-left

// Reverse: screen to lat/lng
const lngLat = map.current.unproject([x, y]);
// lngLat = { lng: number, lat: number }
```

---

### 3. Distance Calculation (Haversine Formula)

```typescript
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles (use 6371 for kilometers)
  
  // Convert degrees to radians
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * 
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in miles
}

// Usage
const distance = calculateDistance(
  userLocation.lat,
  userLocation.lng,
  prayer.location.lat,
  prayer.location.lng
);

console.log(`${distance.toFixed(1)} miles away`);
```

---

### 4. SVG Path Animation (Prayer Connection Line)

**Creating Curved Path:**

```typescript
// Get screen coordinates
const start = map.project([fromLng, fromLat]);
const end = map.project([toLng, toLat]);

// Calculate curve control point (arc downward)
const midX = (start.x + end.x) / 2;
const midY = (start.y + end.y) / 2;
const controlY = midY + 50; // Arc height

// Create quadratic Bezier path
const pathD = `M ${start.x} ${start.y} Q ${midX} ${controlY} ${end.x} ${end.y}`;
```

**Animating Line Draw:**

```tsx
import { motion } from 'motion/react';
import { useRef, useEffect, useState } from 'react';

function AnimatedLine({ pathD }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [pathD]);

  return (
    <motion.path
      ref={pathRef}
      d={pathD}
      stroke="url(#lineGradient)"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeDasharray={pathLength}
      strokeDashoffset={pathLength}
      animate={{ strokeDashoffset: 0 }}
      transition={{ duration: 2, ease: "linear" }}
    />
  );
}
```

---

### 5. Modal with AnimatePresence

```tsx
import { motion, AnimatePresence } from 'motion/react';

function ModalExample({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-3xl p-6 max-w-md mx-auto mt-20"
          >
            {/* Modal content */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Important:** Always wrap conditional Motion components with `<AnimatePresence>` for exit animations.

---

### 6. Custom Hook: useMapProjection

```typescript
import { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

export function useMapProjection(
  map: mapboxgl.Map | null,
  lng: number,
  lat: number
) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!map) return;

    const updatePosition = () => {
      const point = map.project([lng, lat]);
      setPosition({ x: point.x, y: point.y });
    };

    // Initial position
    updatePosition();

    // Update on map move/zoom
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);

    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
    };
  }, [map, lng, lat]);

  return position;
}

// Usage in component
function PrayerMarker({ prayer, map }) {
  const { x, y } = useMapProjection(map, prayer.location.lng, prayer.location.lat);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      🙏
    </div>
  );
}
```

---

### 7. Relative Time Formatting

```typescript
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

// Usage
<p>{getRelativeTime(prayer.createdAt)}</p>
```

---

### 8. Connection Expiration Check

```typescript
import { useEffect } from 'react';

export function useConnectionExpiration(
  connections: PrayerConnection[],
  setConnections: (connections: PrayerConnection[]) => void
) {
  useEffect(() => {
    const checkExpiration = () => {
      const now = new Date();
      const activeConnections = connections.filter(
        conn => now <= conn.expiresAt
      );
      
      // Only update if something expired
      if (activeConnections.length !== connections.length) {
        setConnections(activeConnections);
      }
    };

    // Check immediately
    checkExpiration();

    // Check every hour
    const interval = setInterval(checkExpiration, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [connections, setConnections]);
}

// Usage in PrayerMap component
useConnectionExpiration(connections, setConnections);
```

---

### 9. Rainbow Gradient Border (Animated)

```tsx
<motion.div
  className="absolute inset-0 rounded-xl pointer-events-none"
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

**How it works:**
1. Gradient background with multiple color stops
2. Background size 300% makes it wider than container
3. Animate background position to create flow effect
4. WebKit mask creates border-only effect (content area transparent)

---

### 10. Throttle Function (Performance)

```typescript
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

// Usage
const throttledUpdate = throttle(() => {
  updateMarkerPositions();
}, 16); // ~60fps

map.on('move', throttledUpdate);
```

---

## State Management

### App-Level State (in App.tsx)

```typescript
function App() {
  // Authentication state
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // User data
  const [userLocation, setUserLocation] = useState({
    lat: 42.5361,
    lng: -83.2316
  });

  // Loading screen (2 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Render based on state
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthModal onAuthComplete={() => setIsAuthenticated(true)} />;
  }

  return <PrayerMap userLocation={userLocation} />;
}
```

### Map Component State (in PrayerMap.tsx)

```typescript
function PrayerMap({ userLocation }) {
  // Map instance
  const map = useRef<mapboxgl.Map | null>(null);
  
  // Prayer data
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [connections, setConnections] = useState<PrayerConnection[]>([]);
  
  // UI state
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  
  // Animation state
  const [animatingPrayer, setAnimatingPrayer] = useState<{
    prayer: Prayer;
    userLocation: { lat: number; lng: number };
  } | null>(null);
  
  // Map state tracking
  const [mapState, setMapState] = useState({
    center: [userLocation.lng, userLocation.lat],
    zoom: 12,
    pitch: 0,
    bearing: 0
  });

  // ... handlers and render
}
```

---

## Mock Data (Development)

### Mock Prayers

```typescript
const mockPrayers: Prayer[] = [
  {
    id: '1',
    title: 'Health and healing',
    content: 'Please pray for my mother who is recovering from surgery...',
    contentType: 'text',
    location: { 
      lat: userLocation.lat + 0.05, 
      lng: userLocation.lng - 0.03 
    },
    userName: 'Sarah',
    isAnonymous: false,
    createdAt: new Date(),
    prayedBy: []
  },
  {
    id: '2',
    content: 'Going through a difficult time at work...',
    contentType: 'text',
    location: { 
      lat: userLocation.lat - 0.08, 
      lng: userLocation.lng + 0.05 
    },
    isAnonymous: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    prayedBy: []
  },
  // ... more prayers
];
```

### Mock Connections

```typescript
const mockConnections: PrayerConnection[] = [
  {
    id: 'conn-1',
    prayerId: '1',
    fromLocation: { lat: 42.5361, lng: -83.2316 },
    toLocation: { lat: 42.5461, lng: -83.2416 },
    requesterName: 'Sarah',
    replierName: 'John',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    expiresAt: new Date(Date.now() + 362 * 24 * 60 * 60 * 1000) // ~1 year from now
  }
];
```

---

## Performance Optimization

### 1. Marker Rendering Optimization

**Only render visible markers:**

```typescript
function getVisiblePrayers(prayers: Prayer[], map: mapboxgl.Map) {
  const bounds = map.getBounds();
  
  return prayers.filter(prayer => {
    return bounds.contains([prayer.location.lng, prayer.location.lat]);
  });
}

// In render
{getVisiblePrayers(prayers, map.current).map(prayer => (
  <PrayerMarker key={prayer.id} prayer={prayer} />
))}
```

### 2. Memoization

```typescript
import { useMemo } from 'react';

function PrayerList({ prayers, filter }) {
  const filteredPrayers = useMemo(() => {
    return prayers.filter(prayer => {
      if (filter === 'all') return true;
      if (filter === 'received') return prayer.type === 'received';
      if (filter === 'sent') return prayer.type === 'sent';
      return true;
    });
  }, [prayers, filter]);

  return (
    <>
      {filteredPrayers.map(prayer => (
        <PrayerCard key={prayer.id} prayer={prayer} />
      ))}
    </>
  );
}
```

### 3. React.memo for Components

```typescript
import { memo } from 'react';

export const PrayerMarker = memo(function PrayerMarker({ prayer, map, onClick, isPrayed }) {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these change
  return (
    prevProps.prayer.id === nextProps.prayer.id &&
    prevProps.isPrayed === nextProps.isPrayed &&
    prevProps.map === nextProps.map
  );
});
```

### 4. Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const InboxModal = lazy(() => import('./components/InboxModal'));

// In render
<Suspense fallback={<LoadingSpinner />}>
  {showInbox && <InboxModal onClose={() => setShowInbox(false)} />}
</Suspense>
```

---

## Testing Considerations

### Unit Tests (Example with Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import { calculateDistance, getRelativeTime } from './utils';

describe('calculateDistance', () => {
  it('calculates distance between two points correctly', () => {
    const dist = calculateDistance(
      42.5361, -83.2316,  // Beverly Hills, MI
      42.3314, -83.0458   // Detroit, MI
    );
    expect(dist).toBeCloseTo(15.5, 1); // ~15.5 miles
  });
});

describe('getRelativeTime', () => {
  it('returns "Just now" for recent times', () => {
    const now = new Date();
    expect(getRelativeTime(now)).toBe('Just now');
  });

  it('returns minutes ago', () => {
    const past = new Date(Date.now() - 5 * 60 * 1000);
    expect(getRelativeTime(past)).toBe('5m ago');
  });
});
```

### Integration Tests (Example with React Testing Library)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PrayerDetailModal } from './PrayerDetailModal';

describe('PrayerDetailModal', () => {
  const mockPrayer = {
    id: '1',
    content: 'Test prayer',
    contentType: 'text',
    location: { lat: 42.5361, lng: -83.2316 },
    isAnonymous: false,
    userName: 'Test User',
    createdAt: new Date(),
    prayedBy: []
  };

  it('displays prayer content', () => {
    render(
      <PrayerDetailModal
        prayer={mockPrayer}
        userLocation={{ lat: 42.5361, lng: -83.2316 }}
        onClose={() => {}}
        onPray={() => {}}
      />
    );
    
    expect(screen.getByText('Test prayer')).toBeInTheDocument();
  });

  it('calls onPray when Send Prayer is clicked', () => {
    const onPray = vi.fn();
    render(
      <PrayerDetailModal
        prayer={mockPrayer}
        userLocation={{ lat: 42.5361, lng: -83.2316 }}
        onClose={() => {}}
        onPray={onPray}
      />
    );
    
    fireEvent.click(screen.getByText('Send Prayer'));
    
    // After animation delay
    setTimeout(() => {
      expect(onPray).toHaveBeenCalledWith(mockPrayer);
    }, 2500);
  });
});
```

---

## Build & Deployment

### Build Command

```bash
npm run build
```

Outputs to `/dist` directory.

### Environment Variables in Production

Ensure all `VITE_*` variables are set in your deployment platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment
- AWS/Other: Configure in deployment pipeline

### Vite Config (Production Optimizations)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'mapbox': ['mapbox-gl'],
          'motion': ['motion/react'],
          'vendor': ['react', 'react-dom']
        }
      }
    }
  }
});
```

---

## Browser Support

### Minimum Requirements
- **Chrome/Edge:** 90+
- **Firefox:** 88+
- **Safari:** 14+
- **Mobile Safari:** 14+
- **Chrome Android:** 90+

### Required Features
- ES2020 support
- CSS Grid & Flexbox
- backdrop-filter (for glassmorphic effect)
- SVG path animations
- Touch events (mobile)

### Polyfills (if needed)
```bash
npm install core-js
```

```typescript
// In main.tsx (if supporting older browsers)
import 'core-js/stable';
```

---

## Common Issues & Solutions

### Issue: Mapbox tiles not loading

**Solution:**
1. Check API token is correct
2. Verify token is set before Map initialization
3. Check network tab for 401/403 errors
4. Ensure domain is authorized in Mapbox dashboard

### Issue: Backdrop blur not working

**Solution:**
- Add `-webkit-backdrop-filter` prefix
- Check browser support (Safari < 14 doesn't support)
- Fallback: Use semi-transparent background without blur

```css
.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Fallback for unsupported browsers */
@supports not (backdrop-filter: blur(12px)) {
  .glass {
    background: rgba(255, 255, 255, 0.95);
  }
}
```

### Issue: Map markers not updating position

**Solution:**
- Ensure map event listeners are attached
- Check that component re-renders on map move
- Verify cleanup in useEffect return

### Issue: Animation performance issues

**Solution:**
1. Use `will-change` CSS hint
2. Animate only `transform` and `opacity`
3. Throttle map update handlers
4. Use React.memo for marker components
5. Limit number of visible connections/markers

```css
.animated-element {
  will-change: transform, opacity;
}
```

---

## Future Implementation: Supabase

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apple_id TEXT UNIQUE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prayers table
CREATE TABLE prayers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT,
  content TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('text', 'audio', 'video')),
  location GEOGRAPHY(POINT) NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prayer connections (memorial lines)
CREATE TABLE prayer_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prayer_id UUID REFERENCES prayers(id),
  user_id UUID REFERENCES users(id),
  from_location GEOGRAPHY(POINT) NOT NULL,
  to_location GEOGRAPHY(POINT) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_prayers_location ON prayers USING GIST (location);
CREATE INDEX idx_connections_expires ON prayer_connections (expires_at);
```

### Real-time Subscriptions

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Subscribe to new prayers
useEffect(() => {
  const subscription = supabase
    .channel('prayers')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'prayers' },
      (payload) => {
        setPrayers(prev => [...prev, payload.new]);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```
