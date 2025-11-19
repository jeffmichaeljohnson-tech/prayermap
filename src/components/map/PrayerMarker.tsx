import mapboxgl from 'mapbox-gl'
import type { Marker } from 'mapbox-gl'

export interface PrayerMarkerProps {
  /**
   * Prayer ID for identification
   */
  prayerId: number | string

  /**
   * Longitude coordinate
   */
  longitude: number

  /**
   * Latitude coordinate
   */
  latitude: number

  /**
   * Optional prayer title or preview text
   */
  title?: string

  /**
   * Optional distance from user (in km)
   */
  distance?: number

  /**
   * Callback when marker is clicked
   */
  onClick?: (prayerId: number | string) => void

  /**
   * Whether to show preview bubble on hover
   */
  showPreview?: boolean
}

/**
 * Custom prayer marker component using 🙏 emoji
 * Creates a MapBox marker with glassmorphic styling
 * 
 * @param _map - MapBox map instance (not used but kept for API consistency)
 * @param props - Marker properties
 * @returns MapBox Marker instance with cleanup function attached
 */
export function createPrayerMarker(
  _map: mapboxgl.Map,
  props: PrayerMarkerProps
): Marker {
  const { longitude, latitude, title, distance, onClick, prayerId } = props

  // Create marker element
  const el = document.createElement('div')
  el.className = 'prayer-marker'
  el.setAttribute('data-prayer-id', String(prayerId))
  el.innerHTML = '🙏'
  
  // Apply glassmorphic styling
  el.style.cssText = `
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border: 3px solid #D4C5F9;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(31, 38, 135, 0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    user-select: none;
  `

  // Event handlers (stored for cleanup)
  const handleMouseEnter = () => {
    el.style.transform = 'scale(1.1)'
    el.style.boxShadow = '0 6px 16px rgba(31, 38, 135, 0.25)'
    
    // Show preview bubble if title exists
    if (title && props.showPreview !== false) {
      showPreviewBubble(el, title, distance)
    }
  }

  const handleMouseLeave = () => {
    el.style.transform = 'scale(1)'
    el.style.boxShadow = '0 4px 12px rgba(31, 38, 135, 0.15)'
    hidePreviewBubble(el)
  }

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    onClick?.(prayerId)
  }

  // Add event listeners
  el.addEventListener('mouseenter', handleMouseEnter)
  el.addEventListener('mouseleave', handleMouseLeave)
  
  if (onClick) {
    el.addEventListener('click', handleClick)
  }

  // Create MapBox marker
  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat([longitude, latitude])

  // Attach cleanup function to marker for proper event listener removal
  // This will be called when marker is removed
  ;(marker as Marker & { _cleanup?: () => void })._cleanup = () => {
    el.removeEventListener('mouseenter', handleMouseEnter)
    el.removeEventListener('mouseleave', handleMouseLeave)
    if (onClick) {
      el.removeEventListener('click', handleClick)
    }
    hidePreviewBubble(el)
  }

  return marker
}

/**
 * Show preview bubble above marker
 */
function showPreviewBubble(
  markerEl: HTMLElement,
  title: string,
  distance?: number
) {
  // Remove existing bubble if present
  hidePreviewBubble(markerEl)

  const bubble = document.createElement('div')
  bubble.className = 'prayer-marker-preview'
  bubble.style.cssText = `
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #2C3E50;
    pointer-events: none;
    z-index: 1000;
  `

  const titleEl = document.createElement('div')
  titleEl.textContent = title
  titleEl.style.cssText = `
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `
  bubble.appendChild(titleEl)

  if (distance !== undefined) {
    const distanceEl = document.createElement('div')
    distanceEl.textContent = `${distance.toFixed(1)} miles away`
    distanceEl.style.cssText = `
      margin-top: 2px;
      font-size: 10px;
      font-weight: 400;
      color: #95A5A6;
    `
    bubble.appendChild(distanceEl)
  }

  markerEl.style.position = 'relative'
  markerEl.appendChild(bubble)
}

/**
 * Hide preview bubble
 */
function hidePreviewBubble(markerEl: HTMLElement) {
  const bubble = markerEl.querySelector('.prayer-marker-preview')
  if (bubble) {
    bubble.remove()
  }
}

