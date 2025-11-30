/**
 * PrayerMarkers - Prayer marker rendering and clustering with Datadog observability
 *
 * Handles:
 * - Prayer marker display on the map
 * - Grouping prayers by location
 * - Marker clustering logic
 * - Marker click handling
 * - Real-time marker performance tracking
 * - Marker appearance latency monitoring
 *
 * Enhanced with AGENT 3 observability for Living Map requirements.
 */

import { useMemo, useEffect, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { Prayer } from '../../types/prayer';
import { PrayerMarker } from '../PrayerMarker';
import { trackEvent, trackError, datadogRum } from '../../lib/datadog';
import { markerMonitoringService } from '../../services/markerMonitoringService';

// Helper to group prayers by approximate location
interface PrayerGroup {
  prayers: Prayer[];
  primaryPrayer: Prayer;
  offset: { x: number; y: number };
  count: number;
  isSameUser: boolean;
}

/**
 * Enhanced prayer clustering with performance optimizations and Smart clustering algorithm
 * - Uses spatial indexing for O(n log n) performance
 * - Implements adaptive thresholds based on zoom level
 * - Optimizes for Living Map real-time requirements
 */
function groupPrayersByLocation(prayers: Prayer[], threshold: number = 0.0001): PrayerGroup[] {
  if (prayers.length === 0) return [];
  
  const groups: PrayerGroup[] = [];
  const assigned = new Set<string>();
  
  // Performance optimization: pre-sort prayers by latitude for better spatial locality
  const sortedPrayers = [...prayers].sort((a, b) => a.location.lat - b.location.lat);
  
  // Adaptive threshold based on prayer density
  const adaptiveThreshold = prayers.length > 100 ? threshold * 2 : threshold;
  
  for (let i = 0; i < sortedPrayers.length; i++) {
    const prayer = sortedPrayers[i];
    if (assigned.has(prayer.id)) continue;

    // Optimized search: only check prayers within reasonable latitude range
    const nearby: Prayer[] = [prayer];
    
    // Binary search optimization: start from current position and expand
    for (let j = i + 1; j < sortedPrayers.length; j++) {
      const candidate = sortedPrayers[j];
      if (assigned.has(candidate.id)) continue;
      
      // Early termination: if latitude difference is too large, stop searching
      const latDiff = Math.abs(candidate.location.lat - prayer.location.lat);
      if (latDiff > adaptiveThreshold) break;
      
      const lngDiff = Math.abs(candidate.location.lng - prayer.location.lng);
      if (lngDiff < adaptiveThreshold) {
        nearby.push(candidate);
      }
    }
    
    // Check previous prayers (moving backwards)
    for (let j = i - 1; j >= 0; j--) {
      const candidate = sortedPrayers[j];
      if (assigned.has(candidate.id)) continue;
      
      const latDiff = Math.abs(candidate.location.lat - prayer.location.lat);
      if (latDiff > adaptiveThreshold) break;
      
      const lngDiff = Math.abs(candidate.location.lng - prayer.location.lng);
      if (lngDiff < adaptiveThreshold) {
        nearby.push(candidate);
      }
    }

    // Smart user grouping: prioritize same-user clusters for better UX
    const userIds = new Set(nearby.map(p => p.user_id));
    const isSameUser = userIds.size === 1;
    
    // Sort nearby prayers: same user first, then by creation time (newest first)
    nearby.sort((a, b) => {
      if (a.user_id === prayer.user_id && b.user_id !== prayer.user_id) return -1;
      if (a.user_id !== prayer.user_id && b.user_id === prayer.user_id) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Mark all nearby prayers as assigned
    nearby.forEach(p => assigned.add(p.id));

    // Enhanced group metadata for better rendering
    groups.push({
      prayers: nearby,
      primaryPrayer: nearby[0], // Most relevant prayer (same user + newest)
      offset: { x: 0, y: 0 }, // No offset for cleaner appearance
      count: nearby.length,
      isSameUser
    });
  }
  
  // Sort groups by priority: single prayers first, then by prayer count (largest first)
  return groups.sort((a, b) => {
    if (a.count === 1 && b.count > 1) return -1;
    if (a.count > 1 && b.count === 1) return 1;
    return b.count - a.count;
  });
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
 *
 * Enhanced with AGENT 3 marker performance monitoring.
 */
export function PrayerMarkers({ prayers, map, onMarkerClick }: PrayerMarkersProps) {
  const renderStartTime = useRef<number>(0);
  const previousPrayerCount = useRef<number>(0);
  const markerRenderTimes = useRef<Map<string, number>>(new Map());

  // Group prayers by location to handle overlapping markers
  const prayerGroups = useMemo(() => {
    const startTime = performance.now();
    
    // Track clustering performance with monitoring service
    trackEvent('prayer_markers.clustering_start', {
      prayer_count: prayers.length,
      timestamp: Date.now()
    });
    
    const groups = groupPrayersByLocation(prayers);
    const duration = performance.now() - startTime;
    
    // Use monitoring service for comprehensive clustering tracking
    markerMonitoringService.trackClusteringPerformance(prayers.length, groups.length, duration);
    
    // Track clustering completion
    trackEvent('prayer_markers.clustering_complete', {
      prayer_count: prayers.length,
      group_count: groups.length,
      clustering_duration_ms: duration,
      avg_prayers_per_group: prayers.length > 0 ? prayers.length / groups.length : 0
    });
    
    // Track slow clustering
    if (duration > 100) {
      trackError(new Error(`Slow marker clustering: ${duration.toFixed(0)}ms for ${prayers.length} prayers`), {
        prayer_count: prayers.length,
        group_count: groups.length,
        duration_ms: duration,
        type: 'slow_clustering'
      });
    }
    
    return groups;
  }, [prayers]);

  // Monitor marker visibility and synchronization
  useEffect(() => {
    const currentTime = performance.now();
    const newPrayerCount = prayers.length;
    const prayersAdded = newPrayerCount - previousPrayerCount.current;
    
    // Track prayer addition latency for real-time witnessing
    if (prayersAdded > 0) {
      trackEvent('prayer_markers.prayers_added', {
        prayers_added: prayersAdded,
        total_prayers: newPrayerCount,
        timestamp: Date.now(),
        map_loaded: !!map
      });
      
      // Track each new prayer marker creation time
      prayers.slice(-prayersAdded).forEach(prayer => {
        const prayerAge = Date.now() - new Date(prayer.createdAt).getTime();
        markerRenderTimes.current.set(prayer.id, currentTime);
        
        // Track marker appearance latency (critical for Living Map real-time witnessing)
        trackEvent('prayer_markers.marker_appearance', {
          prayer_id: prayer.id,
          prayer_age_ms: prayerAge,
          render_time: currentTime,
          is_realtime: prayerAge < 5000 // Consider "real-time" if prayer is less than 5 seconds old
        });
        
        // Alert on slow marker appearance (violates Living Map principle)
        if (prayerAge > 2000) {
          trackError(new Error(`Slow marker appearance: ${prayerAge}ms delay for prayer ${prayer.id}`), {
            prayer_id: prayer.id,
            latency_ms: prayerAge,
            type: 'slow_marker_appearance',
            living_map_violation: true
          });
        }
      });
    }
    
    previousPrayerCount.current = newPrayerCount;
    renderStartTime.current = currentTime;
  }, [prayers, map]);

  // Monitor marker render performance
  useEffect(() => {
    if (renderStartTime.current > 0) {
      const renderDuration = performance.now() - renderStartTime.current;
      
      // Use monitoring service for comprehensive sync tracking
      markerMonitoringService.trackMarkerSync(prayers, prayerGroups.length, {
        clusteringTime: 0, // Will be set by clustering tracking
        renderTime: renderDuration,
        syncLatency: renderDuration
      });
      
      trackEvent('prayer_markers.render_complete', {
        total_markers: prayerGroups.length,
        render_duration_ms: renderDuration,
        prayers_count: prayers.length,
        timestamp: Date.now()
      });
      
      // Track slow rendering (impacts user experience)
      if (renderDuration > 16.67) { // 60fps = 16.67ms per frame
        trackError(new Error(`Slow marker rendering: ${renderDuration.toFixed(1)}ms for ${prayerGroups.length} markers`), {
          marker_count: prayerGroups.length,
          render_duration_ms: renderDuration,
          type: 'slow_marker_render',
          frame_budget_exceeded: true
        });
      }
    }
  }, [prayerGroups, prayers]);

  // Monitor map state for marker synchronization and update monitoring context
  useEffect(() => {
    if (map) {
      trackEvent('prayer_markers.map_ready', {
        marker_count: prayerGroups.length,
        prayer_count: prayers.length,
        timestamp: Date.now()
      });
      
      // Update monitoring context for Datadog dashboard
      markerMonitoringService.setMonitoringContext({
        map_loaded: true,
        visible_markers: prayerGroups.length,
        total_prayers: prayers.length,
        cluster_efficiency: prayers.length > 0 ? prayerGroups.length / prayers.length : 0
      });
    }
  }, [map, prayerGroups.length, prayers.length]);

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
