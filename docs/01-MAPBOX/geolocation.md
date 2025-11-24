# Mapbox GL JS v3 - Geolocation & User Location

**Official Source:** [Mapbox GL JS API Reference - GeolocateControl](https://docs.mapbox.com/mapbox-gl-js/api/markers/#geolocatecontrol)

**Version:** 3.16.0

**Last Updated:** December 2024

## Overview

This document covers implementing geolocation features in Mapbox GL JS v3, including the GeolocateControl, user location tracking, permission handling, and accuracy settings.

## Prerequisites

- Mapbox GL JS v3 map instance initialized
- Understanding of browser Geolocation API
- HTTPS connection (required for geolocation in production)

## Core Concepts

- **GeolocateControl:** Built-in control button for user location
- **User Location Tracking:** Continuous tracking of user's position
- **Permission Handling:** Managing browser geolocation permissions
- **Accuracy Settings:** Configuring location accuracy requirements

## Implementation

### Basic GeolocateControl

```typescript
import mapboxgl from 'mapbox-gl';

const geolocateControl = new mapboxgl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true, // Request high accuracy
  },
  trackUserLocation: true, // Show user location dot
  showUserHeading: true, // Show heading indicator
  showUserLocation: true, // Show user location on map
});

map.addControl(geolocateControl, 'top-right');
```

**Notes:**

- `enableHighAccuracy: true` uses GPS (slower, more accurate)
- `enableHighAccuracy: false` uses network location (faster, less accurate)
- Control automatically handles permission requests

### GeolocateControl Options

```typescript
const geolocateControl = new mapboxgl.GeolocateControl({
  // Position options (passed to Geolocation API)
  positionOptions: {
    enableHighAccuracy: true,
    timeout: 10000, // Maximum time to wait for location (ms)
    maximumAge: 0, // Maximum age of cached position (ms)
  },
  
  // Control behavior
  trackUserLocation: true, // Show user location dot and track movement
  showUserHeading: true, // Show compass/heading indicator
  showUserLocation: true, // Show user location on map
  
  // Styling
  fitBoundsOptions: {
    maxZoom: 15, // Maximum zoom when fitting to user location
    duration: 2000, // Animation duration (ms)
  },
  
  // Custom button
  position: 'top-right', // Control position
});
```

### Handling Geolocate Events

```typescript
const geolocateControl = new mapboxgl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true,
  },
  trackUserLocation: true,
});

// Event: User activates geolocation
geolocateControl.on('geolocate', (e) => {
  console.log('User location:', e.coords);
  const { longitude, latitude } = e.coords;
  // Use location for prayer request radius, etc.
});

// Event: Error getting location
geolocateControl.on('error', (e) => {
  console.error('Geolocation error:', e.error);
  if (e.error.code === 1) {
    // Permission denied
    showPermissionDeniedMessage();
  } else if (e.error.code === 2) {
    // Position unavailable
    showLocationUnavailableMessage();
  } else if (e.error.code === 3) {
    // Timeout
    showTimeoutMessage();
  }
});

// Event: Geolocation active state changes
geolocateControl.on('trackuserlocationstart', () => {
  console.log('Started tracking user location');
});

geolocateControl.on('trackuserlocationend', () => {
  console.log('Stopped tracking user location');
});

map.addControl(geolocateControl);
```

### Programmatic Control

```typescript
// Trigger geolocation programmatically
geolocateControl.trigger(); // Simulates button click

// Check if tracking is active
const isTracking = geolocateControl._watchState === 'ACTIVE_LOCK';

// Stop tracking
geolocateControl._watchState = 'OFF';
```

## PrayerMap Use Cases

### Use Case 1: Custom Geolocation Hook

```typescript
import { useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

interface GeolocationState {
  position: { longitude: number; latitude: number } | null;
  loading: boolean;
  error: GeolocationPositionError | null;
  accuracy: number | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    loading: true,
    error: null,
    accuracy: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: {
          code: 0,
          message: 'Geolocation not supported',
        } as GeolocationPositionError,
      }));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          position: {
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          },
          loading: false,
          error: null,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        setState(prev => ({
          ...prev,
          loading: false,
          error,
        }));
      },
      options
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}
```

### Use Case 2: Center Map on User Location

```typescript
import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

interface UseUserLocationProps {
  map: mapboxgl.Map | null;
  onLocationFound?: (position: { lng: number; lat: number }) => void;
}

export function useUserLocation({ map, onLocationFound }: UseUserLocationProps) {
  useEffect(() => {
    if (!map || !navigator.geolocation) return;

    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
    });

    geolocateControl.on('geolocate', (e) => {
      const { longitude, latitude } = e.coords;
      
      // Center map on user location
      map.flyTo({
        center: [longitude, latitude],
        zoom: 12,
        duration: 1000,
      });

      onLocationFound?.({ lng: longitude, lat: latitude });
    });

    geolocateControl.on('error', (e) => {
      console.error('Geolocation error:', e.error);
      // Show user-friendly error message
    });

    map.addControl(geolocateControl, 'top-right');

    // Auto-trigger on mount (optional)
    // geolocateControl.trigger();

    return () => {
      // Cleanup handled by map.remove()
    };
  }, [map, onLocationFound]);
}
```

### Use Case 3: Permission Handling with Fallback

```typescript
async function requestGeolocationPermission(): Promise<boolean> {
  if (!navigator.geolocation) {
    return false;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      (error) => {
        if (error.code === 1) {
          // Permission denied
          showPermissionRequestModal();
        }
        resolve(false);
      },
      { timeout: 5000 }
    );
  });
}

function showPermissionRequestModal() {
  // Show modal explaining why location is needed
  // "Location access helps us show prayer requests near you"
}
```

### Use Case 4: User Location Marker

```typescript
function createUserLocationMarker(
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

// Update marker position when location changes
function updateUserLocationMarker(
  marker: mapboxgl.Marker,
  position: { longitude: number; latitude: number }
) {
  marker.setLngLat([position.longitude, position.latitude]);
}
```

### Use Case 5: Accuracy Circle

```typescript
function addAccuracyCircle(
  map: mapboxgl.Map,
  center: [number, number],
  accuracy: number // in meters
) {
  map.addSource('accuracy-circle', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: center,
      },
      properties: {
        radius: accuracy,
      },
    },
  });

  map.addLayer({
    id: 'accuracy-circle',
    type: 'circle',
    source: 'accuracy-circle',
    paint: {
      'circle-radius': {
        stops: [
          [0, 0],
          [20, accuracy],
        ],
        base: 2,
      },
      'circle-color': '#4A90E2',
      'circle-opacity': 0.1,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#4A90E2',
      'circle-stroke-opacity': 0.3,
    },
  });
}
```

## Error Handling

### Permission Denied

```typescript
geolocateControl.on('error', (e) => {
  if (e.error.code === 1) {
    // Permission denied
    showMessage({
      type: 'error',
      title: 'Location Access Denied',
      message: 'Please enable location access in your browser settings to see prayer requests near you.',
      action: {
        label: 'Open Settings',
        onClick: () => {
          // Guide user to browser settings
        },
      },
    });
  }
});
```

### Location Unavailable

```typescript
geolocateControl.on('error', (e) => {
  if (e.error.code === 2) {
    // Position unavailable
    showMessage({
      type: 'warning',
      title: 'Location Unavailable',
      message: 'Unable to determine your location. Please check your GPS/WiFi settings.',
    });
  }
});
```

### Timeout Handling

```typescript
geolocateControl.on('error', (e) => {
  if (e.error.code === 3) {
    // Timeout
    showMessage({
      type: 'warning',
      title: 'Location Timeout',
      message: 'Location request timed out. Please try again.',
      action: {
        label: 'Retry',
        onClick: () => geolocateControl.trigger(),
      },
    });
  }
});
```

## Performance Considerations

### Reduce Update Frequency

```typescript
// Throttle location updates
let lastUpdate = 0;
const UPDATE_INTERVAL = 5000; // 5 seconds

geolocateControl.on('geolocate', (e) => {
  const now = Date.now();
  if (now - lastUpdate < UPDATE_INTERVAL) {
    return; // Skip update
  }
  lastUpdate = now;
  
  // Process location update
  handleLocationUpdate(e.coords);
});
```

### Use Network Location When Appropriate

```typescript
// Use network location for faster initial load
const geolocateControl = new mapboxgl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: false, // Faster, less accurate
  },
});

// Switch to high accuracy after initial location
geolocateControl.on('geolocate', () => {
  // Update to high accuracy for subsequent updates
  geolocateControl._options.positionOptions.enableHighAccuracy = true;
});
```

## Security Notes

- **HTTPS Required:** Geolocation API only works over HTTPS (except localhost)
- **Permission Privacy:** Always explain why location is needed
- **Data Storage:** Don't store precise location data longer than necessary
- **User Control:** Allow users to disable location tracking

## Testing

### Test Permission Handling

```typescript
test('handles permission denied', () => {
  const mockGeolocation = {
    watchPosition: jest.fn((success, error) => {
      error({ code: 1, message: 'Permission denied' });
      return 1;
    }),
    clearWatch: jest.fn(),
  };
  
  global.navigator.geolocation = mockGeolocation;
  
  // Test error handling
});
```

### Test Location Updates

```typescript
test('updates map center on location change', () => {
  const map = new mapboxgl.Map({ /* ... */ });
  const flyToSpy = jest.spyOn(map, 'flyTo');
  
  const geolocateControl = new mapboxgl.GeolocateControl();
  geolocateControl.on('geolocate', (e) => {
    map.flyTo({
      center: [e.coords.longitude, e.coords.latitude],
      zoom: 12,
    });
  });
  
  // Simulate geolocate event
  geolocateControl.fire('geolocate', {
    coords: { longitude: -74.5, latitude: 40 },
  });
  
  expect(flyToSpy).toHaveBeenCalled();
});
```

## Troubleshooting

### Geolocation Not Working

**Issue:** Control doesn't request location or shows error

**Solutions:**
1. Verify HTTPS connection (required in production)
2. Check browser permissions in settings
3. Test on different browsers/devices
4. Verify `navigator.geolocation` is available
5. Check for browser extensions blocking geolocation

### Inaccurate Location

**Issue:** Location is far from actual position

**Solutions:**
1. Enable `enableHighAccuracy: true`
2. Wait for GPS lock (may take 10-30 seconds)
3. Check device GPS/WiFi settings
4. Use `maximumAge: 0` to prevent stale cached locations

### Location Updates Too Frequent

**Issue:** Too many location updates causing performance issues

**Solutions:**
1. Implement throttling/debouncing
2. Only update when location changes significantly
3. Reduce `enableHighAccuracy` if not needed
4. Stop tracking when not needed

## References

- [Mapbox GeolocateControl API](https://docs.mapbox.com/mapbox-gl-js/api/markers/#geolocatecontrol)
- [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [GeolocateControl Example](https://docs.mapbox.com/mapbox-gl-js/example/locate-user/)
- [Browser Geolocation Guide](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API/Using_the_Geolocation_API)

