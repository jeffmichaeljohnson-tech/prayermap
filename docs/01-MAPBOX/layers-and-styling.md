# Mapbox GL JS v3 - Layers & Styling

**Official Source:** [Mapbox GL JS Style Specification](https://docs.mapbox.com/mapbox-gl-js/style-spec/)

**Version:** 3.16.0

**Last Updated:** December 2024

## Overview

This document covers creating GeoJSON sources, visualizing radius with circle layers, styling line layers with gradients for memorial connections, and advanced styling techniques in Mapbox GL JS v3.

## Prerequisites

- Mapbox GL JS v3 map instance initialized
- Understanding of GeoJSON format
- Basic CSS knowledge for styling

## Core Concepts

- **GeoJSON Sources:** Data sources containing geographic features
- **Circle Layers:** Visualizing points and radius areas
- **Line Layers:** Drawing connections between points
- **Gradient Styling:** Creating smooth color transitions
- **Data-Driven Styling:** Styling based on feature properties

## Implementation

### Creating GeoJSON Source

```typescript
import mapboxgl from 'mapbox-gl';

// Wait for map to load
map.on('load', () => {
  // Add GeoJSON source
  map.addSource('prayer-requests', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-74.5, 40], // [lng, lat]
          },
          properties: {
            id: '1',
            title: 'Prayer Request',
            type: 'prayer',
          },
        },
        // ... more features
      ],
    },
  });
});
```

**Notes:**

- Sources must be added before layers that reference them
- GeoJSON coordinates are [longitude, latitude] (not lat, lng)
- Properties can contain any JSON-serializable data

### Circle Layer for Points

```typescript
map.addLayer({
  id: 'prayer-points',
  type: 'circle',
  source: 'prayer-requests',
  paint: {
    'circle-radius': 8, // Fixed radius in pixels
    'circle-color': '#667eea',
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.8,
  },
});
```

### Circle Layer with Data-Driven Styling

```typescript
map.addLayer({
  id: 'prayer-points',
  type: 'circle',
  source: 'prayer-requests',
  paint: {
    // Radius based on property
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['get', 'support_count'],
      0, 6,   // 0 support = 6px radius
      10, 12, // 10 support = 12px radius
      50, 20, // 50 support = 20px radius
    ],
    
    // Color based on property
    'circle-color': [
      'case',
      ['==', ['get', 'type'], 'urgent'], '#ff0000',
      ['==', ['get', 'type'], 'normal'], '#667eea',
      '#cccccc', // default
    ],
    
    'circle-opacity': 0.8,
  },
});
```

### Circle Layer for Radius Visualization

```typescript
// Add source for radius circle
map.addSource('user-radius', {
  type: 'geojson',
  data: {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: userLocation, // [lng, lat]
    },
  },
});

// Add circle layer for 30-mile radius
const radiusInMeters = 30 * 1609.34; // 30 miles to meters

map.addLayer({
  id: 'radius-circle',
  type: 'circle',
  source: 'user-radius',
  paint: {
    // Radius scales with zoom level
    'circle-radius': {
      stops: [
        [0, 0],
        [5, radiusInMeters / 111320], // Approximate meters per degree at equator
        [10, radiusInMeters / 11132],
        [15, radiusInMeters / 1113.2],
        [20, radiusInMeters / 111.32],
      ],
      base: 2,
    },
    'circle-color': '#4A90E2',
    'circle-opacity': 0.1,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#4A90E2',
    'circle-stroke-opacity': 0.3,
  },
});
```

**Notes:**

- Circle radius in Mapbox is in pixels, not meters
- Use stops to scale radius with zoom level
- Calculate meters per pixel based on latitude for accurate radius

### Line Layer for Connections

```typescript
// Add source for connections
map.addSource('prayer-connections', {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-74.5, 40], // Start point
            [-74.6, 40.1], // End point
          ],
        },
        properties: {
          prayer1_id: '1',
          prayer2_id: '2',
        },
      },
    ],
  },
});

// Add line layer
map.addLayer({
  id: 'connections',
  type: 'line',
  source: 'prayer-connections',
  paint: {
    'line-color': '#667eea',
    'line-width': 2,
    'line-opacity': 0.6,
  },
});
```

### Gradient Line Layer (Rainbow Memorial Lines)

```typescript
// Create gradient line using multiple segments
function createGradientLine(
  start: [number, number],
  end: [number, number],
  segments: number = 10
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;
  
  // Create segments with different colors
  for (let i = 0; i < segments; i++) {
    const t1 = i / segments;
    const t2 = (i + 1) / segments;
    
    const lng1 = startLng + (endLng - startLng) * t1;
    const lat1 = startLat + (endLat - startLat) * t1;
    const lng2 = startLng + (endLng - startLng) * t2;
    const lat2 = startLat + (endLat - startLat) * t2;
    
    // Rainbow gradient: hue from 0 to 360
    const hue = (i / segments) * 360;
    
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[lng1, lat1], [lng2, lat2]],
      },
      properties: {
        segment: i,
        color: `hsl(${hue}, 70%, 60%)`,
      },
    });
  }
  
  return {
    type: 'FeatureCollection',
    features,
  };
}

// Add gradient line source
const gradientLineData = createGradientLine(
  [-74.5, 40],
  [-74.6, 40.1],
  20 // 20 segments for smooth gradient
);

map.addSource('gradient-connections', {
  type: 'geojson',
  data: gradientLineData,
});

// Add layer with data-driven colors
map.addLayer({
  id: 'gradient-connections',
  type: 'line',
  source: 'gradient-connections',
  paint: {
    'line-color': ['get', 'color'], // Use color from properties
    'line-width': 3,
    'line-opacity': 0.8,
    'line-blur': 1, // Soft edges
  },
});
```

### Updating Source Data

```typescript
// Update entire source
map.getSource('prayer-requests').setData(newGeoJSONData);

// Update specific feature (requires re-setting entire source)
function updateFeature(
  sourceId: string,
  featureId: string,
  updates: Partial<GeoJSON.Feature>
) {
  const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
  const data = source._data as GeoJSON.FeatureCollection;
  
  const featureIndex = data.features.findIndex(
    f => f.properties?.id === featureId
  );
  
  if (featureIndex !== -1) {
    data.features[featureIndex] = {
      ...data.features[featureIndex],
      ...updates,
    };
    source.setData(data);
  }
}
```

## PrayerMap Use Cases

### Use Case 1: 30-Mile Radius Circle

```typescript
function addPrayerRadiusCircle(
  map: mapboxgl.Map,
  center: [number, number],
  radiusMiles: number = 30
) {
  const radiusMeters = radiusMiles * 1609.34;
  
  // Calculate meters per pixel at this latitude
  const metersPerPixel = (40075017 / 256) * Math.cos((center[1] * Math.PI) / 180);
  
  map.addSource('prayer-radius', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: center,
      },
    },
  });
  
  map.addLayer({
    id: 'prayer-radius-circle',
    type: 'circle',
    source: 'prayer-radius',
    paint: {
      'circle-radius': {
        stops: [
          [0, 0],
          [10, radiusMeters / metersPerPixel],
          [15, radiusMeters / (metersPerPixel / 2)],
        ],
        base: 2,
      },
      'circle-color': '#667eea',
      'circle-opacity': 0.15,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#667eea',
      'circle-stroke-opacity': 0.4,
    },
  });
}
```

### Use Case 2: Prayer Request Markers Layer

```typescript
function addPrayerRequestsLayer(
  map: mapboxgl.Map,
  prayers: Array<{
    id: string;
    longitude: number;
    latitude: number;
    supportCount: number;
  }>
) {
  const geoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: prayers.map(prayer => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [prayer.longitude, prayer.latitude],
      },
      properties: {
        id: prayer.id,
        support_count: prayer.supportCount,
      },
    })),
  };
  
  map.addSource('prayers', {
    type: 'geojson',
    data: geoJSON,
  });
  
  map.addLayer({
    id: 'prayer-markers',
    type: 'circle',
    source: 'prayers',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'support_count'],
        0, 8,
        10, 12,
        50, 18,
      ],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'support_count'],
        0, '#667eea',
        10, '#764ba2',
        50, '#f093fb',
      ],
      'circle-opacity': 0.9,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });
}
```

### Use Case 3: Memorial Connection Lines

```typescript
function addMemorialConnections(
  map: mapboxgl.Map,
  connections: Array<{
    prayer1: { lng: number; lat: number };
    prayer2: { lng: number; lat: number };
  }>
) {
  const features: GeoJSON.Feature[] = connections.map((conn, index) => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [conn.prayer1.lng, conn.prayer1.lat],
        [conn.prayer2.lng, conn.prayer2.lat],
      ],
    },
    properties: {
      id: `connection-${index}`,
      // Create rainbow gradient by segment
      hue: (index * 137.508) % 360, // Golden angle for color distribution
    },
  }));
  
  map.addSource('memorial-connections', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features,
    },
  });
  
  map.addLayer({
    id: 'memorial-lines',
    type: 'line',
    source: 'memorial-connections',
    paint: {
      'line-color': [
        'interpolate',
        ['linear'],
        ['get', 'hue'],
        0, 'hsl(0, 70%, 60%)',
        60, 'hsl(60, 70%, 60%)',
        120, 'hsl(120, 70%, 60%)',
        180, 'hsl(180, 70%, 60%)',
        240, 'hsl(240, 70%, 60%)',
        300, 'hsl(300, 70%, 60%)',
        360, 'hsl(360, 70%, 60%)',
      ],
      'line-width': 3,
      'line-opacity': 0.7,
      'line-blur': 2,
    },
  });
}
```

### Use Case 4: Layer Ordering (Z-Index)

```typescript
// Add layers in order (bottom to top)
map.addLayer({
  id: 'radius-circle',
  type: 'circle',
  // ... radius layer config
});

map.addLayer({
  id: 'memorial-lines',
  type: 'line',
  // ... line layer config
});

map.addLayer({
  id: 'prayer-markers',
  type: 'circle',
  // ... marker layer config
});

// Move layer to different position
map.moveLayer('prayer-markers', 'memorial-lines'); // Move markers above lines
```

## Error Handling

### Source Not Found

```typescript
function safeAddLayer(
  map: mapboxgl.Map,
  layerId: string,
  sourceId: string,
  layerConfig: any
) {
  if (!map.getSource(sourceId)) {
    console.error(`Source ${sourceId} not found`);
    return;
  }
  
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
  
  map.addLayer({
    id: layerId,
    source: sourceId,
    ...layerConfig,
  });
}
```

### Invalid GeoJSON

```typescript
function validateGeoJSON(data: any): boolean {
  try {
    if (data.type !== 'FeatureCollection' && data.type !== 'Feature') {
      return false;
    }
    
    if (data.type === 'FeatureCollection' && !Array.isArray(data.features)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

const geoJSON = { /* ... */ };
if (validateGeoJSON(geoJSON)) {
  map.getSource('prayers').setData(geoJSON);
} else {
  console.error('Invalid GeoJSON data');
}
```

## Performance Considerations

### Clustering for Dense Areas

```typescript
map.addSource('prayers', {
  type: 'geojson',
  data: geoJSONData,
  cluster: true,
  clusterMaxZoom: 14,
  clusterRadius: 50,
});

// Cluster circles
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
```

### Simplify GeoJSON

```typescript
// Reduce coordinate precision for performance
function simplifyGeoJSON(
  geoJSON: GeoJSON.FeatureCollection,
  precision: number = 5
): GeoJSON.FeatureCollection {
  return {
    ...geoJSON,
    features: geoJSON.features.map(feature => ({
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: simplifyCoordinates(
          feature.geometry.coordinates,
          precision
        ),
      },
    })),
  };
}

function simplifyCoordinates(coords: any, precision: number): any {
  if (typeof coords[0] === 'number') {
    return coords.map(c => parseFloat(c.toFixed(precision)));
  }
  return coords.map(c => simplifyCoordinates(c, precision));
}
```

## Security Notes

- **Validate GeoJSON:** Always validate GeoJSON data before adding to map
- **Sanitize Properties:** Don't trust user-provided properties without validation
- **Coordinate Bounds:** Validate coordinates are within expected bounds

## Testing

### Test Layer Creation

```typescript
test('creates circle layer correctly', () => {
  map.on('load', () => {
    map.addSource('test', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    
    map.addLayer({
      id: 'test-layer',
      type: 'circle',
      source: 'test',
    });
    
    expect(map.getLayer('test-layer')).toBeDefined();
  });
});
```

## Troubleshooting

### Layer Not Appearing

**Issue:** Layer added but not visible

**Solutions:**
1. Verify source exists before adding layer
2. Check layer paint properties (opacity, color)
3. Ensure coordinates are valid [lng, lat]
4. Verify layer is added after map 'load' event
5. Check z-index/layer order

### Performance Issues

**Issue:** Map becomes slow with many features

**Solutions:**
1. Implement clustering for dense areas
2. Simplify GeoJSON coordinates
3. Use data-driven styling instead of individual features
4. Limit features rendered at once
5. Use `maxzoom` to hide layers at high zoom levels

## References

- [Mapbox Style Specification](https://docs.mapbox.com/mapbox-gl-js/style-spec/)
- [GeoJSON Format](https://geojson.org/)
- [Data-Driven Styling Guide](https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/)
- [Layer Examples](https://docs.mapbox.com/mapbox-gl-js/example/)

