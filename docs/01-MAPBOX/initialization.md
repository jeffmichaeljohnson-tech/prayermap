# Mapbox GL JS v3 - Map Initialization & Configuration

**Official Source:** [Mapbox GL JS API Reference](https://docs.mapbox.com/mapbox-gl-js/api/)

**Version:** 3.16.0

**Last Updated:** December 2024

## Overview

This document covers the initialization and configuration of a Mapbox GL JS v3 map instance, including constructor options, style specifications, initial viewport settings, and performance optimization strategies.

## Prerequisites

- Mapbox account with access token
- Basic understanding of JavaScript/TypeScript
- React 18+ (for React integration examples)

## Core Concepts

- **Map Constructor:** Creates a new map instance with specified options
- **Style Specification:** Defines the visual appearance using Mapbox Style Specification
- **Viewport Settings:** Controls initial center, zoom, pitch, and bearing
- **Performance Optimization:** Configuration options to enhance rendering performance

## Implementation

### Basic Map Initialization

```typescript
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set access token (should be from environment variable)
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: 'map', // ID of HTML container element
  style: 'mapbox://styles/mapbox/streets-v12', // Map style URL
  center: [-74.5, 40], // Initial center [longitude, latitude]
  zoom: 9, // Initial zoom level (0-22)
});
```

**Notes:**

- The `container` must be an existing HTML element ID or element reference
- Access token should be stored in environment variables, never hardcoded
- Map styles are loaded asynchronously; wait for 'load' event before adding layers

### Map Constructor Options

```typescript
const map = new mapboxgl.Map({
  container: 'map',
  
  // Style Configuration
  style: 'mapbox://styles/mapbox/light-v11', // Pre-built style
  // OR custom style:
  // style: {
  //   version: 8,
  //   sources: { ... },
  //   layers: [ ... ]
  // },
  
  // Viewport Settings
  center: [-98.5795, 39.8283], // [lng, lat]
  zoom: 4, // 0 (world) to 22 (building level)
  pitch: 0, // 0-60 degrees (tilt)
  bearing: 0, // 0-360 degrees (rotation)
  
  // Performance Options
  antialias: true, // Smooth edges (may impact performance)
  preserveDrawingBuffer: false, // Required for map.toDataURL()
  fadeDuration: 300, // Transition duration in ms
  
  // Interaction Options
  interactive: true, // Enable all interactions
  dragRotate: true, // Enable drag to rotate
  touchZoomRotate: true, // Enable pinch to zoom/rotate
  doubleClickZoom: true, // Enable double-click zoom
  scrollZoom: true, // Enable scroll wheel zoom
  boxZoom: true, // Enable shift+drag box zoom
  dragPan: true, // Enable drag to pan
  
  // Attribution & Controls
  attributionControl: true, // Show attribution
  customAttribution: '© PrayerMap', // Custom attribution text
  
  // Bounds
  maxBounds: [ // Constrain map to specific area
    [-180, -85], // Southwest corner
    [180, 85]    // Northeast corner
  ],
  
  // Limits
  minZoom: 0, // Minimum zoom level
  maxZoom: 22, // Maximum zoom level
  maxPitch: 60, // Maximum pitch angle
  
  // Render Options
  renderWorldCopies: true, // Show multiple world copies at low zoom
  refreshExpiredTiles: true, // Refresh expired tiles
  transformRequest: (url, resourceType) => {
    // Transform requests (e.g., add headers)
    return { url };
  },
});
```

**Notes:**

- `preserveDrawingBuffer: true` is required if you need to export the map as an image
- `antialias: true` improves visual quality but may reduce performance on low-end devices
- `maxBounds` prevents users from panning outside specified geographic area

### Style Specification

Mapbox provides several pre-built styles:

```typescript
// Light theme (good for overlaying data)
style: 'mapbox://styles/mapbox/light-v11'

// Dark theme
style: 'mapbox://styles/mapbox/dark-v11'

// Streets (default)
style: 'mapbox://styles/mapbox/streets-v12'

// Satellite imagery
style: 'mapbox://styles/mapbox/satellite-v9'

// Outdoors (terrain-focused)
style: 'mapbox://styles/mapbox/outdoors-v12'

// Navigation (for routing)
style: 'mapbox://styles/mapbox/navigation-day-v1'
```

**Notes:**

- Light styles work best for glassmorphic UI designs
- Custom styles can be created in Mapbox Studio
- Style changes trigger a 'style.load' event

### React Integration Pattern

```typescript
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export function MapComponent() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283],
      zoom: 4,
      antialias: true,
    });

    // Wait for map to load before adding layers
    map.current.on('load', () => {
      console.log('Map loaded');
      // Add layers, sources, etc.
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return <div ref={mapContainer} className="w-full h-full" />;
}
```

**Notes:**

- Always check if map instance exists before cleanup
- Remove event listeners in cleanup to prevent memory leaks
- Use refs to persist map instance across re-renders

## PrayerMap Use Cases

### Use Case 1: Initialize Map with User Location

```typescript
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  onMapReady?: (map: mapboxgl.Map) => void;
}

export function PrayerMap({ 
  initialCenter, 
  initialZoom = 12,
  onMapReady 
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      console.error('VITE_MAPBOX_TOKEN is not set');
      return;
    }

    mapboxgl.accessToken = token;

    // Default to Chicago if no center provided
    const center: [number, number] = initialCenter || [-87.6298, 41.8781];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11', // Light theme for glassmorphic UI
      center,
      zoom: initialZoom,
      attributionControl: false, // We'll add custom attribution
      antialias: true, // Smooth rendering
    });

    // Add custom attribution
    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    // Handle map load
    map.current.on('load', () => {
      onMapReady?.(map.current!);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Only run once

  return <div ref={mapContainer} className="w-full h-full" />;
}
```

### Use Case 2: Initialize Map with Geolocation

```typescript
// Initialize map, then center on user location when available
useEffect(() => {
  if (!map.current || !userPosition) return;

  map.current.flyTo({
    center: [userPosition.longitude, userPosition.latitude],
    zoom: 12,
    duration: 1000, // Smooth animation
  });
}, [userPosition]);
```

## Error Handling

### Missing Access Token

```typescript
const token = import.meta.env.VITE_MAPBOX_TOKEN;
if (!token) {
  console.error('Mapbox access token is missing');
  return (
    <div className="error-message">
      Map configuration error. Please contact support.
    </div>
  );
}
```

### Container Not Found

```typescript
useEffect(() => {
  if (!mapContainer.current) {
    console.error('Map container element not found');
    return;
  }
  // ... initialize map
}, []);
```

### Style Load Errors

```typescript
map.current.on('error', (e) => {
  console.error('Map error:', e.error);
  if (e.error?.message?.includes('style')) {
    // Fallback to default style
    map.current?.setStyle('mapbox://styles/mapbox/streets-v12');
  }
});
```

## Performance Considerations

### Optimize Initial Load

```typescript
// Disable unnecessary features for faster initial load
const map = new mapboxgl.Map({
  // ... other options
  renderWorldCopies: false, // Don't render multiple world copies
  refreshExpiredTiles: false, // Don't refresh expired tiles immediately
});
```

### Reduce Render Calls

```typescript
// Batch multiple updates
map.current.once('idle', () => {
  // Map is idle, safe to make multiple changes
  map.current?.addSource('source1', data1);
  map.current?.addSource('source2', data2);
  // Changes will be batched
});
```

### Memory Management

```typescript
// Always remove map instance on unmount
useEffect(() => {
  return () => {
    if (map.current) {
      map.current.remove(); // Removes all event listeners and resources
      map.current = null;
    }
  };
}, []);
```

## Security Notes

- **Never expose access tokens in client-side code repositories**
- Use environment variables for all sensitive configuration
- Implement token rotation if tokens are exposed
- Use scoped tokens with minimal required permissions
- Consider using Mapbox's token restrictions (URL, referrer)

## Testing

### Test Map Initialization

```typescript
test('map initializes correctly', () => {
  const container = document.createElement('div');
  container.id = 'test-map';
  document.body.appendChild(container);

  const map = new mapboxgl.Map({
    container: 'test-map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [0, 0],
    zoom: 2,
  });

  expect(map).toBeDefined();
  expect(map.getCenter().lng).toBe(0);
  expect(map.getCenter().lat).toBe(0);
  
  map.remove();
  document.body.removeChild(container);
});
```

### Test Error Handling

```typescript
test('handles missing token gracefully', () => {
  const originalToken = mapboxgl.accessToken;
  mapboxgl.accessToken = '';
  
  expect(() => {
    new mapboxgl.Map({
      container: 'test-map',
      style: 'mapbox://styles/mapbox/light-v11',
    });
  }).toThrow();
  
  mapboxgl.accessToken = originalToken;
});
```

## Troubleshooting

### Map Not Rendering

**Issue:** Map container is empty or shows gray background

**Solutions:**
1. Verify access token is set correctly
2. Check container element exists and has dimensions
3. Check browser console for errors
4. Verify network requests to Mapbox API succeed
5. Ensure CSS is imported: `import 'mapbox-gl/dist/mapbox-gl.css'`

### Style Not Loading

**Issue:** Map shows default style instead of custom style

**Solutions:**
1. Verify style URL is correct
2. Check style is published in Mapbox Studio
3. Verify access token has permission to access style
4. Listen for 'style.load' event before adding layers

### Performance Issues

**Issue:** Map is slow or laggy

**Solutions:**
1. Reduce number of layers and sources
2. Use data-driven styling instead of individual markers
3. Implement clustering for dense marker areas
4. Disable `antialias` if not needed
5. Use `maxZoom` to limit detail level

## References

- [Mapbox GL JS API Reference](https://docs.mapbox.com/mapbox-gl-js/api/)
- [Mapbox Style Specification](https://docs.mapbox.com/mapbox-gl-js/style-spec/)
- [Mapbox GL JS Examples](https://docs.mapbox.com/mapbox-gl-js/example/)
- [Mapbox Studio](https://studio.mapbox.com/)

