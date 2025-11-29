/**
 * PrayerMarkers - Prayer marker rendering and clustering
 *
 * Handles:
 * - Prayer marker display on the map
 * - Grouping prayers by location
 * - Marker clustering logic
 * - Marker click handling
 *
 * Extracted from PrayerMap.tsx to isolate marker rendering logic.
 */

import { useMemo } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { Prayer } from '../../types/prayer';
import { PrayerMarker } from '../PrayerMarker';

// Helper to group prayers by approximate location
interface PrayerGroup {
  prayers: Prayer[];
  primaryPrayer: Prayer;
  offset: { x: number; y: number };
  count: number;
  isSameUser: boolean;
}

/**
 * Groups prayers that are at the same or very close locations
 */
function groupPrayersByLocation(prayers: Prayer[], threshold: number = 0.0001): PrayerGroup[] {
  const groups: PrayerGroup[] = [];
  const assigned = new Set<string>();

  for (const prayer of prayers) {
    if (assigned.has(prayer.id)) continue;

    // Find all prayers at similar coordinates
    const nearby = prayers.filter(p => {
      if (assigned.has(p.id)) return false;
      const latDiff = Math.abs(p.location.lat - prayer.location.lat);
      const lngDiff = Math.abs(p.location.lng - prayer.location.lng);
      return latDiff < threshold && lngDiff < threshold;
    });

    // Check if all nearby prayers are from the same user
    const userIds = new Set(nearby.map(p => p.user_id));
    const isSameUser = userIds.size === 1;

    // Calculate offset based on group index
    const groupIndex = groups.length;
    const offsetAngle = (groupIndex * 45) * (Math.PI / 180);
    const offsetDistance = 0; // No offset for primary marker

    nearby.forEach(p => assigned.add(p.id));

    groups.push({
      prayers: nearby,
      primaryPrayer: nearby[0], // Most recent (assuming sorted)
      offset: { x: Math.cos(offsetAngle) * offsetDistance, y: Math.sin(offsetAngle) * offsetDistance },
      count: nearby.length,
      isSameUser
    });
  }

  return groups;
}

export interface PrayerMarkersProps {
  prayers: Prayer[];
  map: mapboxgl.Map | null;
  onMarkerClick: (prayer: Prayer) => void;
}

/**
 * PrayerMarkers component
 *
 * Renders all prayer markers on the map with intelligent clustering
 * for prayers at the same location.
 */
export function PrayerMarkers({ prayers, map, onMarkerClick }: PrayerMarkersProps) {
  // Group prayers by location to handle overlapping markers
  const prayerGroups = useMemo(() => groupPrayersByLocation(prayers), [prayers]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {prayerGroups.map(group => (
        <PrayerMarker
          key={group.primaryPrayer.id}
          prayer={group.primaryPrayer}
          map={map}
          onClick={() => onMarkerClick(group.primaryPrayer)}
          isPrayed={group.primaryPrayer.prayedBy && group.primaryPrayer.prayedBy.length > 0}
          stackCount={group.isSameUser ? group.count : 1}
          allPrayers={group.isSameUser ? group.prayers : [group.primaryPrayer]}
          onSelectPrayer={onMarkerClick}
        />
      ))}
    </div>
  );
}
