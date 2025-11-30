# Memorial Lines Integration Guide

**Document Version:** 1.0
**Date:** 2025-11-29
**Author:** PrayerMap Development Team

> **Purpose:** This guide provides comprehensive instructions for integrating the enhanced Memorial Lines Visualization system into the PrayerMap application. It covers architecture, step-by-step integration, performance optimization, and testing.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Inventory](#component-inventory)
3. [Data Flow](#data-flow)
4. [Integration Steps](#integration-steps)
5. [Feature Flags & Rollout Strategy](#feature-flags--rollout-strategy)
6. [Performance Considerations](#performance-considerations)
7. [Testing Checklist](#testing-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The Memorial Lines Visualization system implements the core "Living Map" vision: **"making the invisible, visible"** through animated prayer connection lines.

### System Design Principles

1. **Performance First**: Handles 1000+ connections at 60fps through viewport culling
2. **Progressive Enhancement**: Core features work on all devices, advanced features enhance capable devices
3. **Accessibility**: Respects `prefers-reduced-motion`, provides keyboard navigation
4. **Mobile-First**: Touch-optimized, works seamlessly on iOS and Android

### Component Hierarchy

```
PrayerMap.tsx (Root Map Component)
├── MemorialLinesLayer (Orchestration Layer)
│   ├── MemorialLine (Individual Connection)
│   │   └── ConnectionTooltip (Hover Details)
│   └── NewConnectionEffect (Entrance Animation)
├── FirstImpressionAnimation (Initial Reveal)
├── ConnectionDensityOverlay (Heat Map)
├── TimelineSlider (Time Travel)
├── ConnectionFilters (Filter Panel)
├── ConnectionStats (Statistics Panel)
└── ConnectionDetailModal (Full Details)
```

### State Management Approach

**Local State (React useState/useRef):**
- Hover states
- Tooltip positions
- Animation triggers
- UI panel expansion states

**Derived State (useMemo):**
- Filtered connections (viewport culling)
- Sorted connections (z-index ordering)
- Calculated statistics
- Date ranges

**External State (Props from Parent):**
- Connection data from Supabase
- Map instance from MapBox GL
- User authentication context

---

## Component Inventory

### Core Components

#### 1. MemorialLinesLayer
**File:** `MemorialLinesLayer.tsx`
**Purpose:** Orchestrates all memorial line rendering with performance optimizations

**Features:**
- Viewport culling (60-80% fewer DOM nodes)
- Z-index management (selected > new > hovered > normal)
- Staggered entrance animations
- Centralized map event handling (single listener vs N listeners)

**Key Props:**
```typescript
interface MemorialLinesLayerProps {
  connections: PrayerConnection[];
  map: mapboxgl.Map | null;
  mapLoaded: boolean;
  mapBounds: LngLatBounds | null;
  selectedConnection?: string;
  onConnectionSelect?: (connection: PrayerConnection) => void;
}
```

**Performance Impact:**
- Renders 1000+ connections at 60fps
- Reduces map event listeners from N to 1
- Implements O(n) viewport filtering

---

#### 2. MemorialLine
**File:** `MemorialLine.tsx`
**Purpose:** Renders individual animated connection line

**Features:**
- Quadratic Bezier curve path (natural arc)
- Age-based opacity (newer = brighter)
- Breathing glow animation (pulsing effect)
- Response type icons (audio/video/text)
- GPU-accelerated animations (transform/opacity only)

**Key Props:**
```typescript
interface MemorialLineProps {
  connection: PrayerConnection;
  map: MapboxMap;
  isHovered: boolean;
  isNew?: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect?: () => void;
  responseType?: 'text' | 'audio' | 'video';
}
```

---

#### 3. ConnectionTooltip
**File:** `ConnectionTooltip.tsx`
**Purpose:** Rich hover tooltip with connection details

**Features:**
- Smart positioning (viewport-aware, never clips)
- Avatar display with initials
- Distance calculation (Haversine formula)
- Time-ago formatting
- Response type indicator

**Key Props:**
```typescript
interface ConnectionTooltipProps {
  connection: PrayerConnection & {
    prayerTitle?: string;
    responseType?: 'text' | 'audio' | 'video';
  };
  position: { x: number; y: number };
  visible: boolean;
  mapDimensions: { width: number; height: number };
}
```

---

#### 4. NewConnectionEffect
**File:** `NewConnectionEffect.tsx`
**Purpose:** Celebratory animation for real-time new connections

**Features:**
- 2.5-second animation sequence
- Audio integration (`prayer_connect` sound)
- Haptic feedback (mobile)
- Stagger queue for multiple simultaneous connections

**Hook: useNewConnectionQueue**
```typescript
const {
  addConnection,
  activeAnimations,
  queueLength,
  clearAll,
  renderAnimations
} = useNewConnectionQueue(map, {
  maxSimultaneous: 3,
  staggerDelay: 500,
  enableSound: true,
  enableHaptic: true
});
```

---

#### 5. FirstImpressionAnimation
**File:** `FirstImpressionAnimation.tsx`
**Purpose:** One-time "awakening" animation for first-time users

**Features:**
- Plays once on first visit (localStorage flag)
- 3.5-second sequence
- Proximity-based selection (closest 30 connections)
- 60fps via requestAnimationFrame
- Respects `prefers-reduced-motion`

---

#### 6. ConnectionDensityOverlay
**File:** `ConnectionDensityOverlay.tsx`
**Purpose:** Canvas-based heat map showing connection density

**Features:**
- Grid-based density calculation (20x20 cells)
- Radial gradient rendering (warm golden glow)
- Debounced updates (150ms) on map movement
- Max 50 density points rendered

**Configuration:**
```typescript
const GRID_SIZE = 20;                // Grid resolution
const MIN_DENSITY_THRESHOLD = 6;     // Min connections to show
const MAX_DENSITY_POINTS = 50;       // Max points rendered
const GRADIENT_RADIUS = 80;          // Radius in pixels
const BASE_OPACITY = 0.05;           // Medium density opacity
const MAX_OPACITY = 0.15;            // High density opacity
```

---

#### 7. TimelineSlider
**File:** `TimelineSlider.tsx`
**Purpose:** Time-travel feature for viewing prayer history

**Features:**
- Interactive timeline with date markers
- Playback modes (Cumulative, Window)
- Speed controls: 0.5x, 1x, 2x
- Period options: Day, Week, Month
- Draggable slider with smooth animations

**Hook: useTimelineFilter**
```typescript
const {
  filteredConnections,
  currentDate,
  setDate,
  isPlaying,
  play,
  pause,
  dateRange,
  playbackSpeed,
  setPlaybackSpeed,
  filterMode,
  setFilterMode,
  period,
  setPeriod,
  connectionCount
} = useTimelineFilter(connections);
```

---

#### 8. ConnectionFilters
**File:** `ConnectionFilters.tsx`
**Purpose:** Comprehensive filtering panel for connections

**Features:**
- Time range filters (All, Year, Month, Week, Today)
- Response type filters (All, Text, Audio, Video)
- Distance range filters
- Personal connection filter
- Visual options toggles
- Persistent preferences (localStorage)
- Responsive: Bottom sheet (mobile), Side panel (desktop)

**Hook: useConnectionFilters**
```typescript
const {
  filters,
  setFilter,
  resetFilters,
  applyFilters
} = useConnectionFilters();
```

---

#### 9. ConnectionStats
**File:** `ConnectionStats.tsx`
**Purpose:** Real-time statistics panel with interactive metrics

**Features:**
- Calculated statistics (total, today, week, month, distance)
- Animated counters (Framer Motion)
- Click to highlight relevant connections
- Toast notifications for new connections
- Memoized O(n) single-pass calculations

---

#### 10. ConnectionDetailModal
**File:** `ConnectionDetailModal.tsx`
**Purpose:** Full-screen detail view for connection

**Features:**
- Prayer and response summaries
- User information (respecting privacy)
- Connection metadata (distance, date)
- Mini map visualization
- Action buttons (View Prayer, View Response, Share)
- Mobile: Full-screen bottom sheet
- Desktop: Centered modal

---

## Data Flow

### High-Level Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase Database                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   prayers    │  │prayer_       │  │prayer_connections    │  │
│  │              │  │responses     │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────────┘  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  React Query    │
                    │   (Caching)     │
                    └────────┬────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
    ┌─────▼──────┐                    ┌────────▼────────┐
    │ useQuery:  │                    │ Real-time Sub:  │
    │ connections│                    │ new_connections │
    └─────┬──────┘                    └────────┬────────┘
          │                                     │
          └──────────────┬──────────────────────┘
                         │
                ┌────────▼────────┐
                │   PrayerMap     │
                │   Component     │
                └────────┬────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
   ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
   │ Memorial   │ │ Density    │ │ Timeline   │
   │ Lines      │ │ Overlay    │ │ Slider     │
   │ Layer      │ │            │ │            │
   └─────┬──────┘ └────────────┘ └────────────┘
         │
   ┌─────▼──────┐
   │ Individual │
   │ Memorial   │
   │ Lines      │
   └────────────┘
```

### State Flow Sequences

1. **Initial Load:**
   - PrayerMap mounts → useQuery fetches connections → React Query caches → MemorialLinesLayer receives → Viewport culling → Lines render

2. **Map Movement:**
   - User pans/zooms → MapBox 'move' event → MemorialLinesLayer listener → mapBounds updates → Viewport culling recalculates → Visible lines re-render

3. **Real-time New Connection:**
   - Supabase subscription fires → React Query invalidates → New connection added → NewConnectionEffect queued → Animation plays → Toast notification → Settles to permanent

4. **User Interaction:**
   - Hover line → onHover callback → isHovered updates → Glow animates in → Tooltip renders → User leaves → Tooltip animates out

---

## Integration Steps

### Prerequisites

- [ ] MapBox GL JS initialized (`map` instance available)
- [ ] Prayer connections data source (Supabase query)
- [ ] React Query set up for data fetching
- [ ] Framer Motion installed
- [ ] Lucide React installed
- [ ] Sonner toast installed

### Step 1: Install Dependencies

```bash
npm install framer-motion lucide-react sonner
```

### Step 2: Import Components

In your `PrayerMap.tsx`:

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type mapboxgl from 'mapbox-gl';

// Memorial Lines Components
import { MemorialLinesLayer } from './components/map/MemorialLinesLayer';
import { FirstImpressionAnimation } from './components/map/FirstImpressionAnimation';
import { ConnectionDensityOverlay } from './components/map/ConnectionDensityOverlay';
import { TimelineSlider, useTimelineFilter } from './components/map/TimelineSlider';
import { ConnectionFilters, useConnectionFilters } from './components/map/ConnectionFilters';
import { ConnectionStats } from './components/map/ConnectionStats';
import { ConnectionDetailModal } from './components/map/ConnectionDetailModal';
import { useNewConnectionQueue } from './components/map/NewConnectionEffect';

// Types
import type { PrayerConnection, Prayer, PrayerResponse } from './types/prayer';
```

### Step 3: Set Up State Management

```typescript
export function PrayerMap() {
  // Map state
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapBounds, setMapBounds] = useState<LngLatBounds | null>(null);

  // Connection state
  const [selectedConnection, setSelectedConnection] = useState<PrayerConnection | null>(null);

  // UI state
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Feature flags
  const [enableDensityOverlay, setEnableDensityOverlay] = useState(true);
  const [enableFirstImpression, setEnableFirstImpression] = useState(true);
  const [enableTimeline, setEnableTimeline] = useState(false); // Phase 2

  // ... rest of component
}
```

### Step 4: Fetch Connection Data

```typescript
// Fetch prayer connections from Supabase
const { data: connections = [], isLoading } = useQuery({
  queryKey: ['prayer-connections'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('prayer_connections')
      .select(`
        *,
        prayer:prayers!prayer_id (
          id,
          title,
          content,
          content_type
        ),
        response:prayer_responses!prayer_response_id (
          id,
          message,
          content_type
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(conn => ({
      id: conn.id,
      prayerId: conn.prayer_id,
      prayerResponseId: conn.prayer_response_id,
      fromLocation: conn.from_location,
      toLocation: conn.to_location,
      requesterName: conn.requester_name,
      replierName: conn.replier_name,
      createdAt: new Date(conn.created_at),
      expiresAt: new Date(conn.expires_at),
      // Extended fields for tooltip
      prayerTitle: conn.prayer?.title,
      responseType: conn.response?.content_type,
    })) as PrayerConnection[];
  },
  refetchInterval: 30000, // Refetch every 30 seconds
});
```

### Step 5: Track Map State

```typescript
// Track map bounds for viewport culling
useEffect(() => {
  if (!map) return;

  const updateBounds = () => {
    setMapBounds(map.getBounds());
  };

  map.on('load', () => {
    setMapLoaded(true);
    updateBounds();
  });

  map.on('moveend', updateBounds);
  map.on('zoomend', updateBounds);

  return () => {
    map.off('moveend', updateBounds);
    map.off('zoomend', updateBounds);
  };
}, [map]);
```

### Step 6: Initialize Filters and Timeline

```typescript
// Connection filters
const {
  filters,
  setFilter,
  resetFilters,
  applyFilters
} = useConnectionFilters();

// Apply filters to connections
const filteredConnections = useMemo(
  () => applyFilters(connections),
  [connections, applyFilters]
);

// Timeline (optional - Phase 2)
const timeline = useTimelineFilter(filteredConnections);
```

### Step 7: Render Components in Correct Z-Index Order

```typescript
return (
  <div className="relative w-full h-full">
    {/* MapBox Map Container */}
    <div ref={mapContainerRef} className="absolute inset-0" />

    {/* Z-Index Layer 3: Density Overlay */}
    {enableDensityOverlay && filters.showDensity && (
      <ConnectionDensityOverlay
        connections={filteredConnections}
        map={map}
        mapBounds={mapBounds}
        enabled={true}
      />
    )}

    {/* Z-Index Layer 5: Memorial Lines */}
    <MemorialLinesLayer
      connections={filteredConnections}
      map={map}
      mapLoaded={mapLoaded}
      mapBounds={mapBounds}
      selectedConnection={selectedConnection?.id}
      onConnectionSelect={(conn) => {
        setSelectedConnection(conn);
        setDetailModalOpen(true);
      }}
    />

    {/* Z-Index Layer 10: First Impression Animation */}
    {enableFirstImpression && (
      <FirstImpressionAnimation
        connections={connections}
        map={map!}
        onComplete={() => {}}
        enabled={connections.length > 0 && mapLoaded}
      />
    )}

    {/* Z-Index Layer 25: UI Panels */}
    {filters.showStats && (
      <ConnectionStats
        connections={filteredConnections}
        isExpanded={isStatsExpanded}
        onToggle={() => setIsStatsExpanded(!isStatsExpanded)}
      />
    )}

    {enableTimeline && (
      <TimelineSlider
        dateRange={timeline.dateRange}
        currentDate={timeline.currentDate}
        onDateChange={timeline.setDate}
        connectionCount={timeline.connectionCount}
        isPlaying={timeline.isPlaying}
        onPlay={timeline.play}
        onPause={timeline.pause}
        playbackSpeed={timeline.playbackSpeed}
        onSpeedChange={timeline.setPlaybackSpeed}
      />
    )}

    <ConnectionFilters
      filters={filters}
      onChange={(newFilters) => {
        Object.entries(newFilters).forEach(([key, value]) => {
          setFilter(key as any, value);
        });
      }}
      isOpen={isFiltersOpen}
      onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
    />

    {/* Z-Index Layer 50: Modal */}
    <ConnectionDetailModal
      connection={selectedConnection}
      isOpen={detailModalOpen}
      onClose={() => {
        setDetailModalOpen(false);
        setSelectedConnection(null);
      }}
      onViewPrayer={(prayerId) => {
        console.log('View prayer:', prayerId);
      }}
    />
  </div>
);
```

---

## Feature Flags & Rollout Strategy

### Phase 1: Core Features (MVP)

**Enabled by Default:**
- ✅ MemorialLinesLayer with viewport culling
- ✅ Basic MemorialLine rendering
- ✅ ConnectionTooltip on hover
- ✅ ConnectionStats panel
- ✅ ConnectionFilters (basic filters)

**Disabled by Default:**
- ❌ NewConnectionEffect (enable after testing)
- ❌ FirstImpressionAnimation (enable after A/B test)
- ❌ ConnectionDensityOverlay (enable for power users)
- ❌ TimelineSlider (Phase 2)

### Phase 2: Advanced Features

- TimelineSlider component
- NewConnectionEffect for all users
- FirstImpressionAnimation after validation

### Phase 3: Pro Features

- Advanced filtering
- Extended statistics
- Export capabilities

---

## Performance Considerations

### Critical Optimizations

#### 1. Viewport Culling (60-80% reduction)

Rendering 1000 connections = 1000 DOM nodes. With culling at zoom level 5: ~200-300 visible.

**Performance gain:** 70% fewer DOM nodes, 60fps maintained

#### 2. Centralized Map Listeners

**Before:** 1000 event listeners on map
**After:** 1 event listener on map
**Memory reduction:** 99%

#### 3. Debounced Density Calculations

Map panning fires ~60 events/second. With debounce: 1 calculation after movement stops.

**CPU reduction:** 98%

#### 4. GPU-Accelerated Animations

**Use ONLY these properties:**
- ✅ `transform` (translate, scale, rotate)
- ✅ `opacity`
- ❌ `width`, `height` (triggers layout)
- ❌ `top`, `left` (triggers layout)

#### 5. Mobile Optimizations

- Reduced animation complexity based on device capabilities
- Touch targets minimum 44x44 points (iOS)
- Haptic feedback budget for important interactions only

### Performance Benchmarks

**Target Metrics:**
- Initial render: < 2s
- Connection animation: 60fps (16.67ms/frame)
- Map pan/zoom: 60fps
- Memory usage: < 150MB for 1000 connections

---

## Testing Checklist

### Unit Tests

- [ ] MemorialLine renders correct path
- [ ] ConnectionTooltip calculates distance accurately
- [ ] ConnectionStats statistics are correct
- [ ] ConnectionFilters apply correctly
- [ ] TimelineSlider date filtering works

### Integration Tests

- [ ] All connections render on map load
- [ ] Viewport culling reduces visible connections
- [ ] Connections update position on map pan/zoom
- [ ] New connections trigger animation
- [ ] First impression animation plays once

### E2E Tests (Playwright)

```typescript
test('should render connections on map load', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.mapboxgl-map');

  const svg = page.locator('svg path[stroke*="url"]');
  await expect(svg).toHaveCount({ min: 1 });
});

test('should show tooltip on hover', async ({ page }) => {
  await page.goto('/');

  const line = page.locator('svg g').first();
  await line.hover();

  const tooltip = page.locator('[role="tooltip"]');
  await expect(tooltip).toBeVisible();
});
```

### Mobile Device Testing

**iOS (Safari):**
- [ ] iPhone 13 Pro (iOS 16)
- [ ] iPad Pro (iOS 16)
- [ ] Animations run at 60fps
- [ ] Touch targets are 44x44 minimum
- [ ] Haptic feedback works
- [ ] Safe area insets respected

**Android (Chrome):**
- [ ] Samsung Galaxy S21 (Android 12)
- [ ] Google Pixel 6 (Android 13)
- [ ] Animations run smoothly
- [ ] Touch gestures work

---

## Troubleshooting

### Memorial Lines Not Rendering

**Check:**
- Map loaded: `console.log('Map loaded:', mapLoaded)`
- Map bounds: `console.log('Map bounds:', mapBounds)`
- Connections: `console.log('Connections count:', connections.length)`
- SVG gradients defined: `document.getElementById('memorialGradient')`

### Poor Performance / Low FPS

**Diagnosis:**
```typescript
// Check visible connection count
console.log('Visible connections:', visibleConnections.length);

// Monitor FPS
const fpsMonitor = () => {
  let lastTime = performance.now();
  let frames = 0;

  const tick = () => {
    frames++;
    const now = performance.now();
    if (now >= lastTime + 1000) {
      console.log('FPS:', Math.round(frames * 1000 / (now - lastTime)));
      frames = 0;
      lastTime = now;
    }
    requestAnimationFrame(tick);
  };
  tick();
};
```

**Solutions:**
- Enable viewport culling
- Reduce MAX_ANIMATED_LINES
- Disable density overlay
- Use reduced animation complexity

### Tooltip Positioning Issues

```typescript
// Ensure map dimensions are calculated
const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });

useEffect(() => {
  const container = map.getContainer();
  setMapDimensions({
    width: container.offsetWidth,
    height: container.offsetHeight
  });
}, [map]);
```

### Real-Time Subscriptions Not Working

**Check:**
- Channel state: `console.log('Channel state:', channel.state)` (should be 'joined')
- Supabase real-time is enabled
- RLS policies allow reading
- Network connectivity

---

## Z-Index Reference

```
Layer 1-2:   MapBox base map
Layer 3:     ConnectionDensityOverlay
Layer 5:     MemorialLinesLayer (connection lines)
Layer 10:    NewConnectionEffect, FirstImpressionAnimation
Layer 25:    UI panels (Stats, Timeline, Filters)
Layer 40:    Floating action buttons
Layer 50:    Modals (ConnectionDetailModal)
```

---

## Performance Budget

```
Metric                    Target      Maximum
─────────────────────────────────────────────
Initial load time         < 2s        3s
Connection render         < 100ms     200ms
Animation FPS             60fps       50fps
Memory (1000 conns)       < 150MB     200MB
Bundle size (gzipped)     < 150KB     200KB
```

---

**End of Integration Guide**

*This document should be updated whenever new features are added to the Memorial Lines system.*
