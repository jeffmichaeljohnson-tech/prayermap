import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useGeolocation } from '../../hooks/useGeolocation'
import { createPrayerMarker } from './PrayerMarker'
import type { Marker } from 'mapbox-gl'

// Set MapBox access token
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

if (!mapboxToken) {
  console.warn('VITE_MAPBOX_TOKEN is not set. Map will not render.')
}

if (mapboxToken) {
  mapboxgl.accessToken = mapboxToken
}

export interface MapProps {
  /**
   * Initial center coordinates [lng, lat]
   * If not provided, uses user's geolocation
   */
  initialCenter?: [number, number]

  /**
   * Initial zoom level (default: 12)
   */
  initialZoom?: number

  /**
   * Map style URL (default: light-v11)
   */
  style?: string

  /**
   * Prayer markers to display on map
   */
  prayers?: Array<{
    prayerId: number | string
    longitude: number
    latitude: number
    title?: string
    distance?: number
  }>

  /**
   * Callback when a prayer marker is clicked
   */
  onPrayerClick?: (prayerId: number | string) => void

  /**
   * Callback when map is ready
   */
  onMapReady?: (map: mapboxgl.Map) => void

  /**
   * Show user location marker
   */
  showUserLocation?: boolean

  /**
   * Custom CSS class name
   */
  className?: string
}

/**
 * Main Map component using MapBox GL JS
 * Features:
 * - Glassmorphic controls
 * - User location marker
 * - Prayer markers with 🙏 emoji
 * - Responsive design
 */
export default function Map({
  initialCenter,
  initialZoom = 12,
  style = 'mapbox://styles/mapbox/light-v11',
  prayers = [],
  onPrayerClick,
  onMapReady,
  showUserLocation = true,
  className = '',
}: MapProps) {
  console.log('[Map] RENDERING - prayers:', prayers.length, 'className:', className)
  
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const userLocationMarkerRef = useRef<Marker | null>(null)

  const { position: userPosition, loading: geolocationLoading } =
    useGeolocation()

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return
    if (!mapboxToken) {
      console.error('MapBox token is missing')
      return
    }

    // Determine initial center
    let center: [number, number] = initialCenter || [-87.6298, 41.8781] // Default: Chicago

    if (!initialCenter && userPosition) {
      center = [userPosition.longitude, userPosition.latitude]
    }

    // Create map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style,
      center,
      zoom: initialZoom,
      attributionControl: false, // We'll add custom attribution
    })

    // Add navigation controls with glassmorphic styling
    const nav = new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
    })
    map.current.addControl(nav, 'top-right')

    // Add custom attribution
    map.current.addControl(
      new mapboxgl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    )

    // Style navigation controls with glassmorphic effect
    const styleNavControls = () => {
      const navControls = mapContainer.current?.querySelector(
        '.mapboxgl-ctrl-group'
      )
      if (navControls) {
        ;(navControls as HTMLElement).style.cssText = `
          background: rgba(255, 255, 255, 0.9) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 12px rgba(31, 38, 135, 0.15) !important;
          overflow: hidden;
        `
      }
    }

    // Handle map load event
    const handleMapLoad = () => {
      styleNavControls()
      onMapReady?.(map.current!)
    }

    // Wait for map to load, then style controls
    map.current.on('load', handleMapLoad)

    // Cleanup
    return () => {
      // Remove map event listeners
      if (map.current) {
        map.current.off('load', handleMapLoad)
      }

      // Remove all markers with cleanup
      markersRef.current.forEach((marker) => {
        // Call cleanup function if it exists
        const markerWithCleanup = marker as Marker & { _cleanup?: () => void }
        if (markerWithCleanup._cleanup) {
          markerWithCleanup._cleanup()
        }
        marker.remove()
      })
      markersRef.current = []

      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove()
        userLocationMarkerRef.current = null
      }

      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, []) // Only run once on mount

  // Update map center when user location is available
  useEffect(() => {
    if (
      !map.current ||
      initialCenter ||
      !userPosition ||
      geolocationLoading
    ) {
      return
    }

    const center: [number, number] = [
      userPosition.longitude,
      userPosition.latitude,
    ]

    map.current.flyTo({
      center,
      zoom: initialZoom,
      duration: 1000,
    })
  }, [userPosition, initialCenter, initialZoom, geolocationLoading])

  // Add user location marker
  useEffect(() => {
    if (!map.current || !showUserLocation || !userPosition) return

    // Remove existing user location marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove()
    }

    // Create user location marker (blue dot)
    const userEl = document.createElement('div')
    userEl.style.cssText = `
      width: 20px;
      height: 20px;
      background: #4A90E2;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    `

    userLocationMarkerRef.current = new mapboxgl.Marker({ element: userEl })
      .setLngLat([userPosition.longitude, userPosition.latitude])
      .addTo(map.current)
  }, [map.current, userPosition, showUserLocation])

  // Add prayer markers
  useEffect(() => {
    if (!map.current) return

    // Remove existing markers with cleanup
    markersRef.current.forEach((marker) => {
      // Call cleanup function if it exists
      const markerWithCleanup = marker as Marker & { _cleanup?: () => void }
      if (markerWithCleanup._cleanup) {
        markerWithCleanup._cleanup()
      }
      marker.remove()
    })
    markersRef.current = []

    // Add new markers if prayers exist
    if (prayers.length > 0) {
      prayers.forEach((prayer) => {
        const marker = createPrayerMarker(map.current!, {
          prayerId: prayer.prayerId,
          longitude: prayer.longitude,
          latitude: prayer.latitude,
          title: prayer.title,
          distance: prayer.distance,
          onClick: onPrayerClick,
          showPreview: true,
        })

        marker.addTo(map.current!)
        markersRef.current.push(marker)
      })
    }
  }, [map.current, prayers, onPrayerClick])

  // Show loading state
  if (geolocationLoading && !initialCenter) {
    console.log('[Map] RENDERING: Loading state')
    return (
      <div
        className={`flex items-center justify-center bg-heavenly-blue ${className}`}
        style={{ minHeight: '100vh' }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🙏</div>
          <p className="text-gray-600 font-body">Loading your community...</p>
        </div>
      </div>
    )
  }

  // Show error state if no token
  if (!mapboxToken) {
    console.log('[Map] RENDERING: No token error state')
    return (
      <div
        className={`flex items-center justify-center bg-heavenly-blue ${className}`}
        style={{ minHeight: '100vh' }}
      >
        <div className="text-center p-8 glass-card max-w-md">
          <div className="text-4xl mb-4">🙏</div>
          <h2 className="text-xl font-display font-semibold text-gray-900 mb-2">
            Map Unavailable
          </h2>
          <p className="text-gray-600 font-body">
            MapBox token is not configured. Please set VITE_MAPBOX_TOKEN in your
            environment variables.
          </p>
        </div>
      </div>
    )
  }

  console.log('[Map] RENDERING: Map container')
  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />

      {/* Glassmorphic loading overlay */}
      {geolocationLoading && !initialCenter && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="glass-card p-6">
            <div className="text-3xl mb-2 animate-pulse">🙏</div>
            <p className="text-sm text-gray-600 font-body">
              Finding your location...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

