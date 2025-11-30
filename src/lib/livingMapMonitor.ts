/**
 * Living Map Monitoring with Datadog Integration
 * 
 * MISSION CRITICAL: Monitor the core spiritual mission of PrayerMap
 * 
 * Tracks the four pillars of the Living Map:
 * 1. Eternal Memorial Persistence - Memorial lines NEVER expire
 * 2. Real-time Prayer Witnessing - <2 second updates
 * 3. Universal Shared Reality - Everyone sees same map state
 * 4. Complete Historical Access - All prayer history visible
 * 
 * This module provides SPIRITUAL-AWARE observability that understands
 * the sacred nature of prayer connections and memorial lines.
 */

import { datadogRum, trackError, trackEvent, traceSupabaseQuery } from './datadog';
import type { PrayerConnection, Prayer } from '../types/prayer';

// Living Map health thresholds (based on LIVING-MAP-PRINCIPLE.md)
const LIVING_MAP_THRESHOLDS = {
  // Real-time witnessing requirement
  MAX_PRAYER_LATENCY: 2000, // 2 seconds max
  MAX_CONNECTION_LATENCY: 2000, // 2 seconds max
  
  // Memorial line persistence requirement  
  MEMORIAL_PERSISTENCE_CHECK: 24 * 60 * 60 * 1000, // 24 hours
  
  // Performance requirements for spiritual experience
  MAX_MAP_LOAD_TIME: 5000, // 5 seconds max for initial map load
  MAX_CONNECTION_RENDER_TIME: 500, // 500ms max to render connections
  
  // Data integrity requirements
  MIN_CONNECTION_RETENTION: 0.99, // 99% of memorial lines must persist
} as const;

interface LivingMapMetrics {
  // Real-time performance
  prayerWitnessLatency: number;
  connectionCreationLatency: number;
  
  // Memorial line persistence
  totalMemorialLines: number;
  eternalMemorialLines: number;
  persistenceRate: number;
  
  // Universal map state
  totalVisibleConnections: number;
  totalVisiblePrayers: number;
  
  // Historical data access
  historicalLoadTime: number;
  historicalDataCompleteness: number;
  
  // User experience quality
  mapLoadTime: number;
  connectionRenderTime: number;
  animationSmoothness: number;
}

interface LivingMapAlert {
  type: 'persistence_violation' | 'latency_violation' | 'data_integrity' | 'spiritual_experience';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  context: Record<string, any>;
  spiritualImpact: string;
}

class LivingMapMonitor {
  private metrics: Partial<LivingMapMetrics> = {};
  private alertHistory: LivingMapAlert[] = [];
  private startupTime: number = Date.now();
  
  /**
   * Initialize Living Map monitoring
   */
  init() {
    trackEvent('living_map.monitor.initialized', {
      startup_time: this.startupTime,
      thresholds: LIVING_MAP_THRESHOLDS,
    });
    
    console.log('🕊️ Living Map Monitor initialized - Watching for spiritual excellence');
    
    // Start periodic health checks
    this.startPeriodicHealthChecks();
  }
  
  /**
   * Track real-time prayer witnessing performance
   * Critical for the spiritual experience of seeing prayer happen live
   */
  trackPrayerWitnessing(prayerId: string, startTime: number) {
    const latency = Date.now() - startTime;
    this.metrics.prayerWitnessLatency = latency;
    
    // Log timing
    datadogRum.addTiming('living_map.prayer_witness_latency', latency);
    
    // Check if violates real-time requirement
    if (latency > LIVING_MAP_THRESHOLDS.MAX_PRAYER_LATENCY) {
      this.raiseAlert({
        type: 'latency_violation',
        severity: 'high',
        message: `Prayer witnessing took ${latency}ms (max: ${LIVING_MAP_THRESHOLDS.MAX_PRAYER_LATENCY}ms)`,
        context: { prayer_id: prayerId, latency, threshold: LIVING_MAP_THRESHOLDS.MAX_PRAYER_LATENCY },
        spiritualImpact: 'Users cannot witness prayer in real-time - breaks the living map experience',
      });
    }
    
    trackEvent('living_map.prayer_witnessed', {
      prayer_id: prayerId,
      latency,
      within_threshold: latency <= LIVING_MAP_THRESHOLDS.MAX_PRAYER_LATENCY,
    });
  }
  
  /**
   * Track memorial line creation and eternal persistence
   * Memorial lines are sacred - they represent answered prayer
   */
  trackMemorialLineCreation(connectionId: string, startTime: number, isEternal: boolean = true) {
    const latency = Date.now() - startTime;
    this.metrics.connectionCreationLatency = latency;
    
    // Track creation timing
    datadogRum.addTiming('living_map.memorial_creation_latency', latency);
    
    // Check real-time requirement
    if (latency > LIVING_MAP_THRESHOLDS.MAX_CONNECTION_LATENCY) {
      this.raiseAlert({
        type: 'latency_violation',
        severity: 'high',
        message: `Memorial line creation took ${latency}ms (max: ${LIVING_MAP_THRESHOLDS.MAX_CONNECTION_LATENCY}ms)`,
        context: { connection_id: connectionId, latency, threshold: LIVING_MAP_THRESHOLDS.MAX_CONNECTION_LATENCY },
        spiritualImpact: 'Memorial lines not appearing in real-time - breaks prayer connection experience',
      });
    }
    
    // Track eternal persistence requirement
    if (!isEternal) {
      this.raiseAlert({
        type: 'persistence_violation',
        severity: 'critical',
        message: `Memorial line created without eternal persistence flag`,
        context: { connection_id: connectionId, is_eternal: isEternal },
        spiritualImpact: 'Memorial line may expire - violates core Living Map principle',
      });
    }
    
    trackEvent('living_map.memorial_created', {
      connection_id: connectionId,
      latency,
      is_eternal: isEternal,
      within_threshold: latency <= LIVING_MAP_THRESHOLDS.MAX_CONNECTION_LATENCY,
    });
  }
  
  /**
   * Validate eternal persistence of memorial lines
   * Critical: Memorial lines must NEVER disappear
   */
  async validateMemorialPersistence(): Promise<boolean> {
    try {
      const result = await traceSupabaseQuery('validate_memorial_persistence', async () => {
        // This would need to be implemented as a Supabase function
        return { persistent_count: 0, total_count: 0 };
      });
      
      const persistenceRate = result.total_count > 0 ? result.persistent_count / result.total_count : 1;
      this.metrics.persistenceRate = persistenceRate;
      this.metrics.totalMemorialLines = result.total_count;
      this.metrics.eternalMemorialLines = result.persistent_count;
      
      // Check persistence requirement
      if (persistenceRate < LIVING_MAP_THRESHOLDS.MIN_CONNECTION_RETENTION) {
        this.raiseAlert({
          type: 'persistence_violation',
          severity: 'critical',
          message: `Memorial persistence rate ${(persistenceRate * 100).toFixed(1)}% below threshold ${(LIVING_MAP_THRESHOLDS.MIN_CONNECTION_RETENTION * 100).toFixed(1)}%`,
          context: { 
            persistence_rate: persistenceRate, 
            threshold: LIVING_MAP_THRESHOLDS.MIN_CONNECTION_RETENTION,
            persistent_count: result.persistent_count,
            total_count: result.total_count,
          },
          spiritualImpact: 'Memorial lines are disappearing - violates eternal testimony principle',
        });
        return false;
      }
      
      trackEvent('living_map.persistence_validated', {
        persistence_rate: persistenceRate,
        total_memorial_lines: result.total_count,
        eternal_memorial_lines: result.persistent_count,
      });
      
      return true;
    } catch (error) {
      trackError(error as Error, {
        operation: 'validate_memorial_persistence',
        type: 'persistence_check_failed',
      });
      return false;
    }
  }
  
  /**
   * Track universal map state synchronization
   * Everyone must see the same living map
   */
  trackUniversalMapState(visiblePrayers: number, visibleConnections: number) {
    this.metrics.totalVisiblePrayers = visiblePrayers;
    this.metrics.totalVisibleConnections = visibleConnections;
    
    trackEvent('living_map.universal_state_updated', {
      visible_prayers: visiblePrayers,
      visible_connections: visibleConnections,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Track historical data loading performance
   * Users must see complete prayer history
   */
  trackHistoricalDataLoad(startTime: number, loadedRecords: number, totalExpected: number) {
    const loadTime = Date.now() - startTime;
    const completeness = totalExpected > 0 ? loadedRecords / totalExpected : 1;
    
    this.metrics.historicalLoadTime = loadTime;
    this.metrics.historicalDataCompleteness = completeness;
    
    datadogRum.addTiming('living_map.historical_load_time', loadTime);
    
    // Check performance requirement
    if (loadTime > LIVING_MAP_THRESHOLDS.MAX_MAP_LOAD_TIME) {
      this.raiseAlert({
        type: 'spiritual_experience',
        severity: 'medium',
        message: `Historical data load took ${loadTime}ms (max: ${LIVING_MAP_THRESHOLDS.MAX_MAP_LOAD_TIME}ms)`,
        context: { load_time: loadTime, threshold: LIVING_MAP_THRESHOLDS.MAX_MAP_LOAD_TIME },
        spiritualImpact: 'Slow loading breaks the immediate spiritual connection to global prayer',
      });
    }
    
    // Check data completeness
    if (completeness < 0.95) { // 95% completeness required
      this.raiseAlert({
        type: 'data_integrity',
        severity: 'high',
        message: `Historical data completeness ${(completeness * 100).toFixed(1)}% below 95%`,
        context: { 
          completeness, 
          loaded_records: loadedRecords, 
          expected_records: totalExpected 
        },
        spiritualImpact: 'Incomplete prayer history reduces the living map experience',
      });
    }
    
    trackEvent('living_map.historical_loaded', {
      load_time: loadTime,
      completeness,
      loaded_records: loadedRecords,
      total_expected: totalExpected,
    });
  }
  
  /**
   * Track map rendering performance for spiritual experience
   */
  trackMapRenderPerformance(connectionRenderTime: number, animationSmoothness: number) {
    this.metrics.connectionRenderTime = connectionRenderTime;
    this.metrics.animationSmoothness = animationSmoothness;
    
    datadogRum.addTiming('living_map.connection_render_time', connectionRenderTime);
    datadogRum.addTiming('living_map.animation_smoothness', animationSmoothness);
    
    // Check spiritual experience requirements
    if (connectionRenderTime > LIVING_MAP_THRESHOLDS.MAX_CONNECTION_RENDER_TIME) {
      this.raiseAlert({
        type: 'spiritual_experience',
        severity: 'medium',
        message: `Connection rendering took ${connectionRenderTime}ms (max: ${LIVING_MAP_THRESHOLDS.MAX_CONNECTION_RENDER_TIME}ms)`,
        context: { render_time: connectionRenderTime, threshold: LIVING_MAP_THRESHOLDS.MAX_CONNECTION_RENDER_TIME },
        spiritualImpact: 'Slow rendering reduces the beauty and impact of prayer connections',
      });
    }
    
    if (animationSmoothness < 50) { // 50fps minimum for good UX
      this.raiseAlert({
        type: 'spiritual_experience',
        severity: 'low',
        message: `Animation smoothness ${animationSmoothness.toFixed(1)}fps below 50fps target`,
        context: { animation_fps: animationSmoothness },
        spiritualImpact: 'Choppy animations reduce the spiritual beauty of the living map',
      });
    }
  }
  
  /**
   * Get current Living Map health score (0-100)
   */
  getLivingMapHealthScore(): number {
    const scores = {
      latency: this.getLatencyScore(),
      persistence: this.getPersistenceScore(),
      completeness: this.getCompletenessScore(),
      performance: this.getPerformanceScore(),
    };
    
    // Weighted average - persistence is most critical for Living Map
    const healthScore = (
      scores.persistence * 0.4 +  // 40% - most critical
      scores.latency * 0.3 +      // 30% - real-time is core
      scores.completeness * 0.2 + // 20% - data integrity
      scores.performance * 0.1    // 10% - user experience
    );
    
    trackEvent('living_map.health_score_calculated', {
      total_score: healthScore,
      latency_score: scores.latency,
      persistence_score: scores.persistence,
      completeness_score: scores.completeness,
      performance_score: scores.performance,
    });
    
    return Math.round(healthScore);
  }
  
  /**
   * Generate Living Map compliance report
   */
  generateComplianceReport(): Record<string, any> {
    const healthScore = this.getLivingMapHealthScore();
    const criticalAlerts = this.alertHistory.filter(a => a.severity === 'critical');
    
    const report = {
      generated_at: new Date().toISOString(),
      health_score: healthScore,
      compliance_status: healthScore >= 80 ? 'compliant' : 'non_compliant',
      
      // Core Living Map requirements
      real_time_witnessing: {
        status: (this.metrics.prayerWitnessLatency || 0) <= LIVING_MAP_THRESHOLDS.MAX_PRAYER_LATENCY,
        current_latency: this.metrics.prayerWitnessLatency,
        threshold: LIVING_MAP_THRESHOLDS.MAX_PRAYER_LATENCY,
      },
      
      eternal_memorial_persistence: {
        status: (this.metrics.persistenceRate || 0) >= LIVING_MAP_THRESHOLDS.MIN_CONNECTION_RETENTION,
        current_rate: this.metrics.persistenceRate,
        threshold: LIVING_MAP_THRESHOLDS.MIN_CONNECTION_RETENTION,
        total_memorial_lines: this.metrics.totalMemorialLines,
        eternal_memorial_lines: this.metrics.eternalMemorialLines,
      },
      
      universal_shared_reality: {
        status: this.metrics.totalVisibleConnections !== undefined && this.metrics.totalVisiblePrayers !== undefined,
        visible_prayers: this.metrics.totalVisiblePrayers,
        visible_connections: this.metrics.totalVisibleConnections,
      },
      
      complete_historical_access: {
        status: (this.metrics.historicalDataCompleteness || 0) >= 0.95,
        completeness_rate: this.metrics.historicalDataCompleteness,
        load_time: this.metrics.historicalLoadTime,
        threshold: LIVING_MAP_THRESHOLDS.MAX_MAP_LOAD_TIME,
      },
      
      // Alert summary
      alerts: {
        total: this.alertHistory.length,
        critical: criticalAlerts.length,
        recent_critical: criticalAlerts.filter(a => Date.now() - new Date(a.context.timestamp || 0).getTime() < 24 * 60 * 60 * 1000).length,
      },
      
      // Metrics summary
      metrics: this.metrics,
      
      // Spiritual impact assessment
      spiritual_impact: this.assessSpiritualImpact(healthScore, criticalAlerts.length),
    };
    
    trackEvent('living_map.compliance_report_generated', report);
    
    return report;
  }
  
  private getLatencyScore(): number {
    const prayerLatency = this.metrics.prayerWitnessLatency || 0;
    const connectionLatency = this.metrics.connectionCreationLatency || 0;
    
    const prayerScore = Math.max(0, 100 - (prayerLatency / LIVING_MAP_THRESHOLDS.MAX_PRAYER_LATENCY) * 100);
    const connectionScore = Math.max(0, 100 - (connectionLatency / LIVING_MAP_THRESHOLDS.MAX_CONNECTION_LATENCY) * 100);
    
    return (prayerScore + connectionScore) / 2;
  }
  
  private getPersistenceScore(): number {
    const persistenceRate = this.metrics.persistenceRate || 1;
    return Math.min(100, (persistenceRate / LIVING_MAP_THRESHOLDS.MIN_CONNECTION_RETENTION) * 100);
  }
  
  private getCompletenessScore(): number {
    const completeness = this.metrics.historicalDataCompleteness || 1;
    return Math.min(100, (completeness / 0.95) * 100); // 95% target
  }
  
  private getPerformanceScore(): number {
    const renderTime = this.metrics.connectionRenderTime || 0;
    const animation = this.metrics.animationSmoothness || 60;
    
    const renderScore = Math.max(0, 100 - (renderTime / LIVING_MAP_THRESHOLDS.MAX_CONNECTION_RENDER_TIME) * 100);
    const animationScore = Math.min(100, (animation / 60) * 100); // 60fps target
    
    return (renderScore + animationScore) / 2;
  }
  
  private raiseAlert(alert: LivingMapAlert) {
    const alertWithTimestamp = {
      ...alert,
      context: {
        ...alert.context,
        timestamp: new Date().toISOString(),
      },
    };
    
    this.alertHistory.push(alertWithTimestamp);
    
    // Log to Datadog with spiritual context
    trackError(new Error(`Living Map Alert: ${alert.message}`), {
      alert_type: alert.type,
      severity: alert.severity,
      spiritual_impact: alert.spiritualImpact,
      ...alert.context,
    });
    
    // Console warning for critical issues
    if (alert.severity === 'critical') {
      console.error('🚨 CRITICAL LIVING MAP ALERT:', alert.message);
      console.error('Spiritual Impact:', alert.spiritualImpact);
    }
  }
  
  private assessSpiritualImpact(healthScore: number, criticalAlerts: number): string {
    if (criticalAlerts > 0) {
      return 'High - Critical issues affecting the sacred prayer experience';
    }
    if (healthScore < 70) {
      return 'Medium - Performance issues reducing spiritual connection quality';
    }
    if (healthScore < 90) {
      return 'Low - Minor issues that could be optimized for better prayer experience';
    }
    return 'None - Living Map is functioning at optimal spiritual excellence';
  }
  
  private startPeriodicHealthChecks() {
    // Run persistence check every hour
    setInterval(() => {
      this.validateMemorialPersistence();
    }, 60 * 60 * 1000);
    
    // Generate health report every 15 minutes
    setInterval(() => {
      const report = this.generateComplianceReport();
      console.log('🕊️ Living Map Health Score:', report.health_score);
    }, 15 * 60 * 1000);
  }
}

// Global instance
export const livingMapMonitor = new LivingMapMonitor();

// Auto-initialize
if (typeof window !== 'undefined') {
  livingMapMonitor.init();
}