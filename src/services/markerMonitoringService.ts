/**
 * AGENT 3 - Prayer Marker Monitoring Service
 *
 * Comprehensive tracking for prayer marker performance and synchronization.
 * Ensures Living Map real-time witnessing requirements are met.
 *
 * Key Metrics:
 * - Marker appearance latency (<2 seconds for real-time witnessing)
 * - Marker render performance (60fps requirement)
 * - Marker visibility synchronization across users
 * - Clustering performance for large datasets
 * - User interaction patterns
 */

import { trackEvent, trackError, datadogRum, setDatadogContext } from '../lib/datadog';
import type { Prayer } from '../types/prayer';

interface MarkerPerformanceMetrics {
  markerId: string;
  prayerId: string;
  creationTime: number;
  firstRenderTime?: number;
  visibilityTime?: number;
  interactionCount: number;
  projectionErrors: number;
  positionUpdates: number;
}

interface MarkerSyncMetrics {
  totalMarkers: number;
  visibleMarkers: number;
  syncLatency: number;
  clusteringTime: number;
  renderTime: number;
}

class MarkerMonitoringService {
  private markerMetrics = new Map<string, MarkerPerformanceMetrics>();
  private syncHistory: MarkerSyncMetrics[] = [];
  private performanceThresholds = {
    maxRenderTime: 16.67, // 60fps
    maxAppearanceLatency: 2000, // 2 seconds for Living Map real-time
    maxClusteringTime: 100, // 100ms for smooth interaction
    maxPositionUpdates: 50 // Prevent excessive updates
  };

  /**
   * Track marker creation and initial metrics
   */
  trackMarkerCreation(prayer: Prayer): string {
    const markerId = `marker_${prayer.id}_${Date.now()}`;
    const creationTime = performance.now();
    
    this.markerMetrics.set(markerId, {
      markerId,
      prayerId: prayer.id,
      creationTime,
      interactionCount: 0,
      projectionErrors: 0,
      positionUpdates: 0
    });

    // Track prayer-to-marker latency (critical for Living Map)
    const prayerAge = Date.now() - new Date(prayer.createdAt).getTime();
    
    trackEvent('marker_monitoring.marker_created', {
      marker_id: markerId,
      prayer_id: prayer.id,
      prayer_age_ms: prayerAge,
      creation_timestamp: Date.now(),
      is_realtime: prayerAge < this.performanceThresholds.maxAppearanceLatency
    });

    // Alert on delayed marker creation (Living Map violation)
    if (prayerAge > this.performanceThresholds.maxAppearanceLatency) {
      this.reportLivingMapViolation('delayed_marker_creation', {
        marker_id: markerId,
        prayer_id: prayer.id,
        latency_ms: prayerAge,
        threshold_ms: this.performanceThresholds.maxAppearanceLatency
      });
    }

    return markerId;
  }

  /**
   * Track marker first render (visibility)
   */
  trackMarkerFirstRender(markerId: string, renderTime: number) {
    const metrics = this.markerMetrics.get(markerId);
    if (!metrics) return;

    metrics.firstRenderTime = renderTime;
    metrics.visibilityTime = renderTime - metrics.creationTime;

    trackEvent('marker_monitoring.first_render', {
      marker_id: markerId,
      prayer_id: metrics.prayerId,
      creation_to_render_ms: metrics.visibilityTime,
      render_timestamp: Date.now()
    });

    // Alert on slow first render
    if (metrics.visibilityTime > this.performanceThresholds.maxRenderTime * 2) {
      this.reportPerformanceIssue('slow_first_render', {
        marker_id: markerId,
        prayer_id: metrics.prayerId,
        render_time_ms: metrics.visibilityTime,
        threshold_ms: this.performanceThresholds.maxRenderTime
      });
    }
  }

  /**
   * Track marker interaction
   */
  trackMarkerInteraction(markerId: string, interactionType: string, context?: Record<string, any>) {
    const metrics = this.markerMetrics.get(markerId);
    if (!metrics) return;

    metrics.interactionCount++;

    trackEvent('marker_monitoring.interaction', {
      marker_id: markerId,
      prayer_id: metrics.prayerId,
      interaction_type: interactionType,
      interaction_count: metrics.interactionCount,
      ...context
    });
  }

  /**
   * Track position update performance
   */
  trackPositionUpdate(markerId: string, updateTime: number, success: boolean) {
    const metrics = this.markerMetrics.get(markerId);
    if (!metrics) return;

    metrics.positionUpdates++;
    
    if (!success) {
      metrics.projectionErrors++;
      this.reportPerformanceIssue('projection_error', {
        marker_id: markerId,
        prayer_id: metrics.prayerId,
        error_count: metrics.projectionErrors
      });
    }

    // Alert on excessive position updates
    if (metrics.positionUpdates > this.performanceThresholds.maxPositionUpdates) {
      this.reportPerformanceIssue('excessive_position_updates', {
        marker_id: markerId,
        prayer_id: metrics.prayerId,
        update_count: metrics.positionUpdates,
        threshold: this.performanceThresholds.maxPositionUpdates
      });
    }
  }

  /**
   * Track overall marker synchronization performance
   */
  trackMarkerSync(prayers: Prayer[], visibleMarkers: number, renderMetrics: {
    clusteringTime: number;
    renderTime: number;
    syncLatency: number;
  }) {
    const syncMetrics: MarkerSyncMetrics = {
      totalMarkers: prayers.length,
      visibleMarkers,
      syncLatency: renderMetrics.syncLatency,
      clusteringTime: renderMetrics.clusteringTime,
      renderTime: renderMetrics.renderTime
    };

    this.syncHistory.push(syncMetrics);
    
    // Keep only recent history (last 100 syncs)
    if (this.syncHistory.length > 100) {
      this.syncHistory.shift();
    }

    trackEvent('marker_monitoring.sync_complete', {
      total_markers: syncMetrics.totalMarkers,
      visible_markers: syncMetrics.visibleMarkers,
      sync_latency_ms: syncMetrics.syncLatency,
      clustering_time_ms: syncMetrics.clusteringTime,
      render_time_ms: syncMetrics.renderTime,
      sync_efficiency: visibleMarkers / prayers.length,
      timestamp: Date.now()
    });

    // Performance alerts
    if (renderMetrics.clusteringTime > this.performanceThresholds.maxClusteringTime) {
      this.reportPerformanceIssue('slow_clustering', {
        clustering_time_ms: renderMetrics.clusteringTime,
        marker_count: prayers.length,
        threshold_ms: this.performanceThresholds.maxClusteringTime
      });
    }

    if (renderMetrics.renderTime > this.performanceThresholds.maxRenderTime) {
      this.reportPerformanceIssue('slow_render', {
        render_time_ms: renderMetrics.renderTime,
        visible_markers: visibleMarkers,
        threshold_ms: this.performanceThresholds.maxRenderTime
      });
    }
  }

  /**
   * Track marker clustering performance
   */
  trackClusteringPerformance(prayerCount: number, clusterCount: number, duration: number) {
    const efficiency = prayerCount > 0 ? clusterCount / prayerCount : 0;
    
    trackEvent('marker_monitoring.clustering_performance', {
      prayer_count: prayerCount,
      cluster_count: clusterCount,
      clustering_duration_ms: duration,
      clustering_efficiency: efficiency,
      avg_prayers_per_cluster: prayerCount > 0 ? prayerCount / clusterCount : 0
    });

    if (duration > this.performanceThresholds.maxClusteringTime) {
      this.reportPerformanceIssue('slow_clustering_algorithm', {
        prayer_count: prayerCount,
        cluster_count: clusterCount,
        duration_ms: duration,
        efficiency,
        threshold_ms: this.performanceThresholds.maxClusteringTime
      });
    }
  }

  /**
   * Get performance summary for dashboard
   */
  getPerformanceSummary() {
    const activeMarkers = Array.from(this.markerMetrics.values());
    const recentSyncs = this.syncHistory.slice(-10);

    return {
      activeMarkerCount: activeMarkers.length,
      averageRenderTime: this.calculateAverageRenderTime(activeMarkers),
      totalInteractions: activeMarkers.reduce((sum, m) => sum + m.interactionCount, 0),
      projectionErrorRate: this.calculateErrorRate(activeMarkers),
      recentSyncLatency: recentSyncs.length > 0 ? 
        recentSyncs.reduce((sum, s) => sum + s.syncLatency, 0) / recentSyncs.length : 0,
      performanceGrade: this.calculatePerformanceGrade(activeMarkers, recentSyncs)
    };
  }

  /**
   * Clean up metrics for unmounted markers
   */
  cleanupMarkerMetrics(markerId: string) {
    const metrics = this.markerMetrics.get(markerId);
    if (metrics) {
      trackEvent('marker_monitoring.marker_cleanup', {
        marker_id: markerId,
        prayer_id: metrics.prayerId,
        lifetime_ms: performance.now() - metrics.creationTime,
        interaction_count: metrics.interactionCount,
        position_updates: metrics.positionUpdates,
        projection_errors: metrics.projectionErrors
      });
      
      this.markerMetrics.delete(markerId);
    }
  }

  /**
   * Set monitoring context for Datadog
   */
  setMonitoringContext(context: Record<string, any>) {
    setDatadogContext({
      marker_monitoring: {
        active_markers: this.markerMetrics.size,
        ...this.getPerformanceSummary(),
        ...context
      }
    });
  }

  /**
   * Report Living Map principle violation
   */
  private reportLivingMapViolation(violationType: string, context: Record<string, any>) {
    trackError(new Error(`Living Map violation: ${violationType}`), {
      violation_type: violationType,
      living_map_impact: true,
      severity: 'high',
      ...context
    });
  }

  /**
   * Report performance issue
   */
  private reportPerformanceIssue(issueType: string, context: Record<string, any>) {
    trackError(new Error(`Marker performance issue: ${issueType}`), {
      issue_type: issueType,
      performance_impact: true,
      ...context
    });
  }

  /**
   * Calculate average render time
   */
  private calculateAverageRenderTime(markers: MarkerPerformanceMetrics[]): number {
    const markersWithRenderTime = markers.filter(m => m.visibilityTime !== undefined);
    if (markersWithRenderTime.length === 0) return 0;
    
    return markersWithRenderTime.reduce((sum, m) => sum + (m.visibilityTime || 0), 0) / markersWithRenderTime.length;
  }

  /**
   * Calculate projection error rate
   */
  private calculateErrorRate(markers: MarkerPerformanceMetrics[]): number {
    const totalUpdates = markers.reduce((sum, m) => sum + m.positionUpdates, 0);
    const totalErrors = markers.reduce((sum, m) => sum + m.projectionErrors, 0);
    
    return totalUpdates > 0 ? totalErrors / totalUpdates : 0;
  }

  /**
   * Calculate overall performance grade
   */
  private calculatePerformanceGrade(markers: MarkerPerformanceMetrics[], syncs: MarkerSyncMetrics[]): string {
    const avgRenderTime = this.calculateAverageRenderTime(markers);
    const errorRate = this.calculateErrorRate(markers);
    const avgSyncLatency = syncs.length > 0 ? 
      syncs.reduce((sum, s) => sum + s.syncLatency, 0) / syncs.length : 0;

    let score = 100;
    
    // Deduct points for performance issues
    if (avgRenderTime > this.performanceThresholds.maxRenderTime) score -= 30;
    if (errorRate > 0.01) score -= 20; // More than 1% error rate
    if (avgSyncLatency > 100) score -= 25;
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

// Export singleton instance
export const markerMonitoringService = new MarkerMonitoringService();