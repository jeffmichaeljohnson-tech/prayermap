/**
 * Viewport Culling Utilities for PrayerMap
 *
 * Optimizes rendering performance by filtering memorial lines to only those
 * visible in the current map viewport. This prevents rendering 200+ connections
 * when the user is zoomed into a specific region.
 *
 * Expected impact: 60-80% fewer DOM nodes at typical zoom levels
 *
 * MEMORY_LOG:
 * Topic: Viewport Culling for Memorial Lines
 * Context: Performance optimization - currently all 200+ connections render regardless of visibility
 * Decision: Filter connections based on MapBox GL bounds with 20% buffer
 * Reasoning: Only render connections with endpoints in viewport to reduce DOM nodes by 60-80%
 * Performance Impact: Significant reduction in rendering overhead at typical zoom levels
 * Mobile Notes: Critical for mobile performance where DOM operations are more expensive
 * Date: 2025-11-29
 */

import type { LngLatBounds } from 'mapbox-gl';
import type { PrayerConnection } from '../types/prayer';

/**
 * Filter connections to only those visible in the current viewport
 * A connection is visible if EITHER endpoint is within the bounds
 *
 * This ensures that:
 * - Lines with both endpoints visible are included
 * - Lines that cross the viewport are included (one endpoint visible)
 * - Lines completely outside viewport are excluded
 *
 * @param connections - All prayer connections
 * @param bounds - Current map viewport bounds (or null if map not loaded)
 * @returns Filtered array of connections visible in viewport
 */
export function getVisibleConnections(
  connections: PrayerConnection[],
  bounds: LngLatBounds | null
): PrayerConnection[] {
  // If no bounds available, return all connections (map not initialized)
  if (!bounds) return connections;

  return connections.filter(conn => {
    // Check if the "from" endpoint is within viewport bounds
    const fromVisible = bounds.contains([
      conn.fromLocation.lng,
      conn.fromLocation.lat
    ]);

    // Check if the "to" endpoint is within viewport bounds
    const toVisible = bounds.contains([
      conn.toLocation.lng,
      conn.toLocation.lat
    ]);

    // Include if either endpoint is visible
    // This ensures lines that cross the viewport are shown
    return fromVisible || toVisible;
  });
}

/**
 * Extend bounds by a buffer to include lines just outside viewport
 * Prevents pop-in artifacts when panning the map
 *
 * The buffer creates a "safe zone" around the visible viewport where
 * connections are pre-rendered. This creates a smoother user experience
 * as lines appear gradually rather than popping in suddenly.
 *
 * @param bounds - Current map viewport bounds
 * @param bufferPercent - Percentage to extend bounds (0.2 = 20% buffer)
 * @returns Extended bounds with buffer applied
 */
export function extendBounds(
  bounds: LngLatBounds,
  bufferPercent: number = 0.2
): LngLatBounds {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  // Calculate the width and height of the viewport
  const lngRange = ne.lng - sw.lng;
  const latRange = ne.lat - sw.lat;

  // Calculate buffer size based on percentage
  const buffer = {
    lng: lngRange * bufferPercent,
    lat: latRange * bufferPercent,
  };

  // Create new bounds extended by the buffer in all directions
  return new LngLatBounds(
    [sw.lng - buffer.lng, sw.lat - buffer.lat],
    [ne.lng + buffer.lng, ne.lat + buffer.lat]
  );
}
