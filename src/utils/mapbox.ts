/**
 * MapBox utility functions
 */

import type mapboxgl from 'mapbox-gl'

/**
 * Default map style
 */
export const DEFAULT_MAP_STYLE = 'mapbox://styles/mapbox/streets-v12'

/**
 * Create a popup for a marker
 */
export function createPopup(
  _map: mapboxgl.Map,
  content: string | HTMLElement
): mapboxgl.Popup {
  return new (window as unknown as { mapboxgl: typeof mapboxgl }).mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false,
    maxWidth: '300px',
  }).setHTML(typeof content === 'string' ? content : content.outerHTML)
}

/**
 * Create a custom marker element
 */
export function createMarkerElement(
  className: string,
  color: string = '#4A90E2'
): HTMLElement {
  const el = document.createElement('div')
  el.className = className
  el.style.width = '20px'
  el.style.height = '20px'
  el.style.borderRadius = '50%'
  el.style.backgroundColor = color
  el.style.border = '2px solid white'
  el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
  el.style.cursor = 'pointer'
  return el
}

/**
 * Fit map bounds to include all markers
 */
export function fitMapBounds(
  map: mapboxgl.Map,
  coordinates: Array<[number, number]>,
  padding: number = 50
): void {
  if (coordinates.length === 0) return

  if (coordinates.length === 1) {
    map.flyTo({
      center: coordinates[0],
      zoom: 15,
    })
    return
  }

  const bounds = coordinates.reduce(
    (bounds, coord) => {
      return bounds.extend(coord as [number, number])
    },
    new (window as unknown as { mapboxgl: typeof mapboxgl }).mapboxgl.LngLatBounds(
      coordinates[0],
      coordinates[0]
    )
  )

  map.fitBounds(bounds, {
    padding: padding,
    maxZoom: 15,
  })
}

/**
 * Get map center from bounds
 */
export function getCenterFromBounds(
  bounds: mapboxgl.LngLatBounds
): [number, number] {
  const lng = (bounds.getWest() + bounds.getEast()) / 2
  const lat = (bounds.getSouth() + bounds.getNorth()) / 2
  return [lng, lat]
}

/**
 * Convert PostGIS POINT to [lng, lat] array
 */
export function parsePostGISPoint(point: string): [number, number] | null {
  // PostGIS POINT format: "POINT(lng lat)"
  const match = point.match(/POINT\(([^ ]+) ([^ ]+)\)/)
  if (!match) return null

  const lng = parseFloat(match[1])
  const lat = parseFloat(match[2])

  if (isNaN(lng) || isNaN(lat)) return null

  return [lng, lat]
}

/**
 * Convert [lng, lat] to PostGIS POINT string
 */
export function toPostGISPoint(lng: number, lat: number): string {
  return `POINT(${lng} ${lat})`
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(lng: number, lat: number): boolean {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90 &&
    !isNaN(lng) &&
    !isNaN(lat)
  )
}

