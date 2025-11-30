/**
 * Comprehensive Messaging Performance Monitor
 * 
 * Monitors all aspects of the messaging system for LIVING MAP compliance:
 * - Message delivery latency (<2 seconds)
 * - Real-time subscription health
 * - Connection stability
 * - User experience metrics
 * 
 * Reports to Datadog for complete observability
 */

import { datadogRum, trackEvent, trackError } from '../../lib/datadog';
import { realtimeMonitor } from '../../lib/realtime-monitor';
import { messagingChannelManager } from './MessagingChannelManager';

export interface MessagingPerformanceMetrics {
  // LIVING MAP requirements
  avgMessageLatency: number;
  messageDeliverySuccess: number; // percentage
  realTimeCompliance: number; // percentage under 2 seconds
  
  // Connection health
  connectionStability: number; // percentage uptime
  reconnectionRate: number; // reconnects per hour
  errorRate: number; // errors per message
  
  // User experience
  typingIndicatorLatency: number;
  readReceiptLatency: number;
  offlineMessageSync: number; // messages synced when back online
  
  // System performance
  memoryUsage: number;
  cpuImpact: number;
  networkEfficiency: number;
}

export class MessagingPerformanceMonitor {
  private metrics: MessagingPerformanceMetrics;
  private reportInterval: number | null = null;
  private messageLatencies: number[] = [];
  private reconnectEvents: Array<{ timestamp: number; reason: string }> = [];
  private errorEvents: Array<{ timestamp: number; type: string; context: string }> = [];
  private startTime: number = Date.now();
  
  constructor() {
    this.metrics = this.initializeMetrics();
    this.startMonitoring();
  }

  private initializeMetrics(): MessagingPerformanceMetrics {
    return {
      avgMessageLatency: 0,
      messageDeliverySuccess: 100,
      realTimeCompliance: 100,
      connectionStability: 100,
      reconnectionRate: 0,
      errorRate: 0,
      typingIndicatorLatency: 0,
      readReceiptLatency: 0,
      offlineMessageSync: 0,
      memoryUsage: 0,
      cpuImpact: 0,
      networkEfficiency: 100,
    };
  }

  /**
   * Track message delivery for LIVING MAP compliance
   */
  trackMessageDelivery(messageId: string, latency: number, success: boolean): void {
    this.messageLatencies.push(latency);
    
    // Keep only last 100 measurements for rolling average
    if (this.messageLatencies.length > 100) {
      this.messageLatencies.shift();
    }
    
    // Update metrics
    this.updateMessageMetrics();
    
    // Track with Datadog
    datadogRum.addTiming('messaging.delivery_latency', latency);
    
    trackEvent('messaging.delivery_tracked', {
      message_id: messageId,
      latency_ms: latency,
      success,
      meets_living_map_requirement: latency < 2000,
      timestamp: Date.now(),
    });
    
    // Alert if LIVING MAP requirement is violated
    if (latency > 2000) {
      this.recordLivingMapViolation(messageId, latency);
    }
  }

  /**
   * Record LIVING MAP violation for immediate attention
   */
  private recordLivingMapViolation(messageId: string, latency: number): void {
    trackError(new Error(`LIVING MAP VIOLATION: Message delivery ${latency}ms exceeds 2 second requirement`), {
      type: 'living_map_violation',
      message_id: messageId,
      latency_ms: latency,
      requirement_ms: 2000,
      severity: 'critical',
      impact: 'user_experience',
    });
    
    // Track violation trend
    const recentViolations = this.messageLatencies.filter(l => l > 2000).length;
    const violationRate = recentViolations / this.messageLatencies.length * 100;
    
    if (violationRate > 10) { // More than 10% violations
      trackError(new Error(`HIGH VIOLATION RATE: ${violationRate.toFixed(1)}% of messages exceed LIVING MAP requirement`), {
        type: 'living_map_degradation',
        violation_rate: violationRate,
        recent_violations: recentViolations,
        total_messages: this.messageLatencies.length,
        severity: 'critical',
      });
    }
  }

  /**
   * Track connection events (reconnects, errors)
   */
  trackConnectionEvent(type: 'reconnect' | 'error', reason: string, context?: any): void {
    const timestamp = Date.now();
    
    if (type === 'reconnect') {
      this.reconnectEvents.push({ timestamp, reason });
      
      // Keep only last hour of events
      const oneHourAgo = timestamp - 3600000;
      this.reconnectEvents = this.reconnectEvents.filter(e => e.timestamp > oneHourAgo);
      
      trackEvent('messaging.reconnect', {
        reason,
        reconnect_count: this.reconnectEvents.length,
        ...context,
      });
      
    } else if (type === 'error') {
      this.errorEvents.push({ timestamp, type: reason, context: JSON.stringify(context) });
      
      // Keep only last hour
      const oneHourAgo = timestamp - 3600000;
      this.errorEvents = this.errorEvents.filter(e => e.timestamp > oneHourAgo);
      
      trackEvent('messaging.error', {
        error_type: reason,
        error_count: this.errorEvents.length,
        ...context,
      });
    }
    
    this.updateConnectionMetrics();
  }

  /**
   * Track typing indicator performance
   */
  trackTypingIndicator(latency: number): void {
    this.metrics.typingIndicatorLatency = this.calculateRollingAverage(
      this.metrics.typingIndicatorLatency,
      latency,
      0.1 // 10% weight for new value
    );
    
    datadogRum.addTiming('messaging.typing_indicator_latency', latency);
  }

  /**
   * Track read receipt performance
   */
  trackReadReceipt(latency: number): void {
    this.metrics.readReceiptLatency = this.calculateRollingAverage(
      this.metrics.readReceiptLatency,
      latency,
      0.1
    );
    
    datadogRum.addTiming('messaging.read_receipt_latency', latency);
  }

  /**
   * Track offline message synchronization
   */
  trackOfflineSync(messageCount: number, syncTime: number): void {
    this.metrics.offlineMessageSync = messageCount;
    
    trackEvent('messaging.offline_sync', {
      message_count: messageCount,
      sync_time_ms: syncTime,
      messages_per_second: messageCount / (syncTime / 1000),
    });
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): MessagingPerformanceMetrics & {
    status: 'excellent' | 'good' | 'degraded' | 'critical';
    recommendations: string[];
    livingMapCompliance: boolean;
  } {
    const recommendations: string[] = [];
    let status: 'excellent' | 'good' | 'degraded' | 'critical' = 'excellent';
    
    // Assess LIVING MAP compliance
    const livingMapCompliance = this.metrics.realTimeCompliance > 95 && this.metrics.avgMessageLatency < 2000;
    
    if (!livingMapCompliance) {
      status = 'critical';
      recommendations.push('CRITICAL: LIVING MAP requirements not met - investigate message delivery pipeline');
    }
    
    if (this.metrics.avgMessageLatency > 2000) {
      status = status === 'excellent' ? 'degraded' : status;
      recommendations.push('Message latency exceeds 2 second LIVING MAP requirement');
    }
    
    if (this.metrics.connectionStability < 95) {
      status = status === 'excellent' ? 'degraded' : status;
      recommendations.push('Connection stability below 95% - check network conditions');
    }
    
    if (this.metrics.errorRate > 1) {
      status = status === 'excellent' ? 'good' : status;
      recommendations.push('Error rate above 1% - investigate error patterns');
    }
    
    if (this.metrics.reconnectionRate > 5) {
      status = status === 'excellent' ? 'good' : status;
      recommendations.push('High reconnection rate - optimize connection management');
    }
    
    return {
      ...this.metrics,
      status,
      recommendations,
      livingMapCompliance,
    };
  }

  /**
   * Start continuous performance monitoring
   */
  private startMonitoring(): void {
    // Report metrics every 30 seconds
    this.reportInterval = window.setInterval(() => {
      this.reportMetrics();
    }, 30000);
    
    // Monitor system resources
    this.startResourceMonitoring();
    
    // Initial report
    setTimeout(() => this.reportMetrics(), 5000);
  }

  /**
   * Monitor system resource usage
   */
  private startResourceMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        this.metrics.memoryUsage = memInfo.usedJSHeapSize / 1024 / 1024; // MB
        
        if (this.metrics.memoryUsage > 50) { // Alert if over 50MB
          trackEvent('messaging.high_memory_usage', {
            memory_mb: this.metrics.memoryUsage,
            heap_limit_mb: memInfo.totalJSHeapSize / 1024 / 1024,
          });
        }
      }, 10000);
    }
  }

  /**
   * Update message-related metrics
   */
  private updateMessageMetrics(): void {
    if (this.messageLatencies.length === 0) return;
    
    this.metrics.avgMessageLatency = this.messageLatencies.reduce((a, b) => a + b, 0) / this.messageLatencies.length;
    this.metrics.realTimeCompliance = (this.messageLatencies.filter(l => l < 2000).length / this.messageLatencies.length) * 100;
    this.metrics.messageDeliverySuccess = 100; // Assuming successful delivery for tracked messages
  }

  /**
   * Update connection-related metrics
   */
  private updateConnectionMetrics(): void {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Calculate stability (uptime percentage)
    const totalDowntime = this.reconnectEvents.length * 5000; // Assume 5s downtime per reconnect
    this.metrics.connectionStability = Math.max(0, 100 - (totalDowntime / uptime * 100));
    
    // Calculate reconnection rate (per hour)
    this.metrics.reconnectionRate = this.reconnectEvents.length / (uptime / 3600000);
    
    // Calculate error rate
    const recentMessages = this.messageLatencies.length;
    this.metrics.errorRate = recentMessages > 0 ? (this.errorEvents.length / recentMessages * 100) : 0;
  }

  /**
   * Calculate rolling average
   */
  private calculateRollingAverage(current: number, newValue: number, weight: number): number {
    return current === 0 ? newValue : (current * (1 - weight)) + (newValue * weight);
  }

  /**
   * Report comprehensive metrics to Datadog
   */
  private reportMetrics(): void {
    const report = this.getPerformanceReport();
    
    trackEvent('messaging.performance_report', {
      ...report,
      uptime_seconds: (Date.now() - this.startTime) / 1000,
      channel_manager_status: messagingChannelManager.getStatus(),
      realtime_monitor_health: realtimeMonitor.getHealthMetrics(),
    });
    
    // Critical alerts
    if (!report.livingMapCompliance) {
      trackError(new Error('LIVING MAP compliance violation detected'), {
        type: 'living_map_compliance_failure',
        metrics: report,
        severity: 'critical',
      });
    }
    
    if (report.status === 'critical') {
      trackError(new Error('Messaging system in critical state'), {
        type: 'messaging_critical_state',
        status: report.status,
        recommendations: report.recommendations,
        metrics: report,
        severity: 'critical',
      });
    }
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
  }
}

// Global singleton instance
export const messagingPerformanceMonitor = new MessagingPerformanceMonitor();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    messagingPerformanceMonitor.destroy();
  });
}