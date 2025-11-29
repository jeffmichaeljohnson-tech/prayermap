/**
 * MapContainer - MapBox GL initialization and management
 *
 * Handles:
 * - MapBox GL instance creation
 * - Map styling and configuration
 * - Ethereal theme customization
 * - Map lifecycle (load, error, cleanup)
 *
 * Extracted from PrayerMap.tsx to isolate map initialization logic.
 */

import { useRef, useEffect, ReactNode } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox access token from environment variable
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
mapboxgl.accessToken = mapboxToken;

export interface MapContainerProps {
  userLocation: { lat: number; lng: number };
  onMapLoad?: (map: mapboxgl.Map) => void;
  onMapLoaded?: () => void;
  children?: ReactNode;
}

export interface MapContainerRef {
  map: mapboxgl.Map | null;
  container: HTMLDivElement | null;
}

/**
 * MapContainer component
 *
 * Initializes and manages the MapBox GL instance with ethereal styling.
 * Starts centered on user's location but allows global zoom out to see the entire world.
 */
export function MapContainer({ userLocation, onMapLoad, onMapLoaded, children }: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // Initialize map with ethereal style
  // GLOBAL LIVING MAP: Starts centered on user's location but allows zooming out to see the entire world
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    console.log('Initializing GLOBAL LIVING MAP at user location:', userLocation);

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [userLocation.lng, userLocation.lat],
      zoom: 12, // Start at local zoom but allow global zoom out
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      // Allow zooming out to see the entire world
      minZoom: 1, // World view
      maxZoom: 18 // Street-level detail
    });

    // Notify parent of map instance
    if (onMapLoad && map.current) {
      onMapLoad(map.current);
    }

    // Add custom styling for ethereal look
    map.current.on('load', () => {
      console.log('Map loaded successfully');
      if (!map.current) return;

      // Mark map as loaded
      onMapLoaded?.();

      // Customize map colors for ethereal theme
      try {
        if (map.current.getLayer('water')) {
          map.current.setPaintProperty('water', 'fill-color', 'hsl(210, 80%, 85%)');
        }
        if (map.current.getLayer('landuse')) {
          map.current.setPaintProperty('landuse', 'fill-opacity', 0.3);
        }
      } catch (e) {
        console.log('Layer customization:', e);
      }
    });

    map.current.on('error', (e) => {
      console.error('Map error:', e);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [userLocation, onMapLoad, onMapLoaded]);

  return (
    <>
      {/* Map Container - ensure it has explicit height */}
      <div
        ref={mapContainer}
        className="absolute inset-0"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#e8f4f8' // Light blue background while map loads
        }}
      />

      {/* Children rendered on top of map */}
      {children}
    </>
  );
}

/**
 * Hook to expose map instance to parent components
 */
export function useMapInstance(
  onMapReady: (map: mapboxgl.Map) => void
): [(map: mapboxgl.Map) => void, () => void] {
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const handleMapLoad = (map: mapboxgl.Map) => {
    mapRef.current = map;
    onMapReady(map);
  };

  const handleMapLoaded = () => {
    if (mapRef.current) {
      onMapReady(mapRef.current);
    }
  };

  return [handleMapLoad, handleMapLoaded];
}
