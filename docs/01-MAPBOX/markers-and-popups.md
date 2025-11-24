# Mapbox GL JS v3 - Custom Markers & Popups

**Official Source:** [Mapbox GL JS API Reference - Marker](https://docs.mapbox.com/mapbox-gl-js/api/markers/)

**Version:** 3.16.0

**Last Updated:** December 2024

## Overview

This document covers creating custom HTML markers, implementing marker clustering for dense areas, styling popups, and handling events on markers and popups in Mapbox GL JS v3.

## Prerequisites

- Mapbox GL JS v3 map instance initialized
- Understanding of HTML/CSS for custom marker styling
- Basic React knowledge (for React examples)

## Core Concepts

- **HTML Markers:** Custom DOM elements positioned on the map
- **Marker Clustering:** Grouping nearby markers to improve performance and readability
- **Popups:** Information displays attached to markers or map locations
- **Event Handling:** Responding to user interactions with markers

## Implementation

### Basic HTML Marker

```typescript
import mapboxgl from 'mapbox-gl';

// Create custom marker element
const el = document.createElement('div');
el.className = 'custom-marker';
el.style.width = '20px';
el.style.height = '20px';
el.style.borderRadius = '50%';
el.style.backgroundColor = '#4A90E2';
el.style.border = '2px solid white';
el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
el.style.cursor = 'pointer';

// Create marker
const marker = new mapboxgl.Marker({
  element: el,
  anchor: 'center', // 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | etc.
})
  .setLngLat([-74.5, 40])
  .addTo(map);
```

**Notes:**

- Marker element must be a DOM element (not a React component directly)
- Use `anchor` to control which part of marker aligns with coordinates
- Markers are positioned using CSS transforms for performance

### Marker with Popup

```typescript
// Create popup
const popup = new mapboxgl.Popup({
  offset: 25, // Offset in pixels from marker
  closeButton: true,
  closeOnClick: false, // Don't close when map is clicked
  maxWidth: '300px',
  className: 'custom-popup',
})
  .setHTML('<h3>Prayer Request</h3><p>Please pray for...</p>')
  .setText('Simple text content'); // Alternative to setHTML

// Attach popup to marker
const marker = new mapboxgl.Marker()
  .setLngLat([-74.5, 40])
  .setPopup(popup)
  .addTo(map);

// Open popup programmatically
marker.togglePopup();
```

**Notes:**

- Popups can contain HTML or plain text
- `closeOnClick: false` keeps popup open when clicking map
- Use `offset` to position popup relative to marker

### Custom Marker Element Factory

```typescript
function createPrayerMarker(
  color: string = '#4A90E2',
  emoji: string = '🙏'
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'prayer-marker';
  
  // Create emoji element
  const emojiEl = document.createElement('div');
  emojiEl.textContent = emoji;
  emojiEl.style.fontSize = '20px';
  emojiEl.style.textAlign = 'center';
  emojiEl.style.lineHeight = '30px';
  
  // Create circle background
  const circle = document.createElement('div');
  circle.style.width = '30px';
  circle.style.height = '30px';
  circle.style.borderRadius = '50%';
  circle.style.backgroundColor = color;
  circle.style.border = '3px solid white';
  circle.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  circle.style.display = 'flex';
  circle.style.alignItems = 'center';
  circle.style.justifyContent = 'center';
  circle.style.cursor = 'pointer';
  
  circle.appendChild(emojiEl);
  el.appendChild(circle);
  
  return el;
}

// Usage
const marker = new mapboxgl.Marker({
  element: createPrayerMarker('#FF6B6B', '🙏'),
})
  .setLngLat([-74.5, 40])
  .addTo(map);
```

### Marker with Click Event

```typescript
const marker = new mapboxgl.Marker({
  element: createPrayerMarker(),
})
  .setLngLat([-74.5, 40])
  .addTo(map);

// Add click event listener
marker.getElement().addEventListener('click', () => {
  console.log('Marker clicked');
  // Open prayer detail modal, etc.
});

// Or use Mapbox's click event
marker.getElement().addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent map click event
  handleMarkerClick(marker);
});
```

### Removing Markers

```typescript
// Remove single marker
marker.remove();

// Remove multiple markers
const markers: mapboxgl.Marker[] = [];
// ... add markers to array

// Cleanup all markers
markers.forEach(marker => marker.remove());
markers.length = 0; // Clear array
```

## PrayerMap Use Cases

### Use Case 1: Prayer Request Marker

```typescript
import mapboxgl from 'mapbox-gl';

interface PrayerMarkerProps {
  prayerId: string | number;
  longitude: number;
  latitude: number;
  title?: string;
  onClick?: (prayerId: string | number) => void;
}

export function createPrayerMarker(
  map: mapboxgl.Map,
  props: PrayerMarkerProps
): mapboxgl.Marker {
  // Create marker element
  const el = document.createElement('div');
  el.className = 'prayer-marker';
  el.style.cssText = `
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    transition: transform 0.2s;
  `;
  el.textContent = '🙏';
  
  // Hover effect
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.2)';
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
  });
  
  // Create popup
  const popup = new mapboxgl.Popup({
    offset: 25,
    closeButton: true,
    closeOnClick: false,
    maxWidth: '300px',
    className: 'prayer-popup',
  });
  
  if (props.title) {
    popup.setHTML(`
      <div class="prayer-popup-content">
        <h3 class="font-semibold text-gray-900 mb-1">${props.title}</h3>
        <p class="text-sm text-gray-600">Click to view details</p>
      </div>
    `);
  }
  
  // Create marker
  const marker = new mapboxgl.Marker({
    element: el,
    anchor: 'center',
  })
    .setLngLat([props.longitude, props.latitude])
    .setPopup(popup)
    .addTo(map);
  
  // Add click handler
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    props.onClick?.(props.prayerId);
    marker.togglePopup();
  });
  
  return marker;
}
```

### Use Case 2: User Location Marker

```typescript
export function createUserLocationMarker(
  map: mapboxgl.Map,
  position: { longitude: number; latitude: number }
): mapboxgl.Marker {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 20px;
    height: 20px;
    background: #4A90E2;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  `;
  
  return new mapboxgl.Marker({
    element: el,
    anchor: 'center',
  })
    .setLngLat([position.longitude, position.latitude])
    .addTo(map);
}
```

### Use Case 3: React Component Pattern

```typescript
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface PrayerMarkerComponentProps {
  map: mapboxgl.Map;
  prayer: {
    id: string;
    longitude: number;
    latitude: number;
    title: string;
  };
  onClick: (id: string) => void;
}

export function PrayerMarkerComponent({
  map,
  prayer,
  onClick,
}: PrayerMarkerComponentProps) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  
  useEffect(() => {
    if (!map) return;
    
    // Create marker
    markerRef.current = createPrayerMarker(map, {
      prayerId: prayer.id,
      longitude: prayer.longitude,
      latitude: prayer.latitude,
      title: prayer.title,
      onClick,
    });
    
    // Cleanup
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [map, prayer, onClick]);
  
  return null; // Marker is rendered on map, not in React tree
}
```

### Use Case 4: Dynamic Marker Updates

```typescript
// Update marker position
function updateMarkerPosition(
  marker: mapboxgl.Marker,
  newPosition: [number, number]
) {
  marker.setLngLat(newPosition);
}

// Update marker popup content
function updateMarkerPopup(
  marker: mapboxgl.Marker,
  newContent: string
) {
  const popup = marker.getPopup();
  if (popup) {
    popup.setHTML(newContent);
  } else {
    // Create new popup if none exists
    marker.setPopup(
      new mapboxgl.Popup().setHTML(newContent)
    );
  }
}
```

## Marker Clustering

For dense areas with many markers, use clustering:

```typescript
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Instead of individual markers, use GeoJSON source with clustering
map.on('load', () => {
  map.addSource('prayers', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-74.5, 40],
          },
          properties: {
            id: '1',
            title: 'Prayer Request 1',
          },
        },
        // ... more features
      ],
    },
    cluster: true, // Enable clustering
    clusterMaxZoom: 14, // Max zoom to cluster points
    clusterRadius: 50, // Radius of each cluster
  });
  
  // Add cluster circles
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'prayers',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#51bbd6',
        100,
        '#f1f075',
        750,
        '#f28cb1',
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,
        100,
        30,
        750,
        40,
      ],
    },
  });
  
  // Add cluster count labels
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'prayers',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
  });
  
  // Add unclustered points
  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'prayers',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#11b4da',
      'circle-radius': 4,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff',
    },
  });
  
  // Handle cluster clicks
  map.on('click', 'clusters', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['clusters'],
    });
    const clusterId = features[0].properties?.cluster_id;
    
    map.getSource('prayers').getClusterExpansionZoom(
      clusterId,
      (err, zoom) => {
        if (err) return;
        
        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom,
        });
      }
    );
  });
});
```

**Notes:**

- Clustering improves performance with 100+ markers
- Use `clusterMaxZoom` to control when clustering stops
- `clusterRadius` controls how close points must be to cluster

## Error Handling

### Marker Creation Errors

```typescript
try {
  const marker = new mapboxgl.Marker()
    .setLngLat([lng, lat])
    .addTo(map);
} catch (error) {
  console.error('Failed to create marker:', error);
  // Handle invalid coordinates, etc.
}
```

### Popup Content Errors

```typescript
// Sanitize HTML content to prevent XSS
function sanitizeHTML(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

const popup = new mapboxgl.Popup()
  .setHTML(sanitizeHTML(userContent));
```

## Performance Considerations

### Limit Marker Count

```typescript
// Only render markers within viewport
function getVisibleMarkers(
  map: mapboxgl.Map,
  allMarkers: Array<{ lng: number; lat: number }>
): Array<{ lng: number; lat: number }> {
  const bounds = map.getBounds();
  return allMarkers.filter(marker => 
    bounds.contains([marker.lng, marker.lat])
  );
}
```

### Batch Marker Updates

```typescript
// Use requestAnimationFrame for smooth updates
function updateMarkers(markers: mapboxgl.Marker[], newData: any[]) {
  requestAnimationFrame(() => {
    markers.forEach((marker, index) => {
      if (newData[index]) {
        marker.setLngLat([newData[index].lng, newData[index].lat]);
      }
    });
  });
}
```

## Security Notes

- **Sanitize all HTML content** in popups to prevent XSS attacks
- Validate coordinates before creating markers
- Limit marker creation rate to prevent DoS
- Use Content Security Policy (CSP) headers

## Testing

### Test Marker Creation

```typescript
test('creates marker with correct position', () => {
  const marker = new mapboxgl.Marker()
    .setLngLat([-74.5, 40])
    .addTo(map);
  
  const lngLat = marker.getLngLat();
  expect(lngLat.lng).toBe(-74.5);
  expect(lngLat.lat).toBe(40);
  
  marker.remove();
});
```

### Test Popup Interaction

```typescript
test('popup opens on marker click', () => {
  const popup = new mapboxgl.Popup().setText('Test');
  const marker = new mapboxgl.Marker()
    .setLngLat([-74.5, 40])
    .setPopup(popup)
    .addTo(map);
  
  marker.togglePopup();
  expect(popup.isOpen()).toBe(true);
  
  marker.remove();
});
```

## Troubleshooting

### Markers Not Appearing

**Issue:** Markers created but not visible on map

**Solutions:**
1. Verify coordinates are valid [lng, lat] format
2. Check marker is added to correct map instance
3. Verify marker element has dimensions (width/height)
4. Check z-index conflicts with map layers
5. Ensure map is fully loaded before adding markers

### Popups Not Showing

**Issue:** Popup created but doesn't display

**Solutions:**
1. Verify popup is attached to marker: `marker.setPopup(popup)`
2. Call `marker.togglePopup()` or `popup.addTo(map)`
3. Check popup content is valid HTML/text
4. Verify popup isn't hidden by CSS

### Performance Issues with Many Markers

**Issue:** Map becomes slow with 100+ markers

**Solutions:**
1. Implement marker clustering
2. Only render markers in viewport
3. Use GeoJSON layers instead of HTML markers
4. Reduce marker complexity (simpler DOM elements)

## References

- [Mapbox Marker API](https://docs.mapbox.com/mapbox-gl-js/api/markers/)
- [Mapbox Popup API](https://docs.mapbox.com/mapbox-gl-js/api/popup/)
- [Marker Clustering Example](https://docs.mapbox.com/mapbox-gl-js/example/cluster/)
- [Custom HTML Markers Example](https://docs.mapbox.com/mapbox-gl-js/example/custom-marker-icons/)

