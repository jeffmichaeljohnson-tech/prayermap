/**
 * Real-time FPS Monitor and Alerting System
 * 
 * Monitors frame rate in real-time and provides:
 * - Live FPS tracking with 60fps target
 * - Automatic performance degradation alerts
 * - Device-specific optimization triggers
 * - Spiritual animation quality assurance
 * 
 * Integrated with Datadog for observability and PrayerMap animation system.
 */

import { datadogRum } from '@datadog/browser-rum';

export interface FPSAlert {
  type: 'warning' | 'critical' | 'recovery';
  message: string;
  fps: number;
  timestamp: number;
  deviceCategory?: string;
  recommendations?: string[];
}

export interface FPSMetrics {
  current: number;
  average: number;
  min: number;
  max: number;
  jankFrames: number;
  totalFrames: number;
  uptime: number;
}

type AlertCallback = (alert: FPSAlert) => void;
type MetricsCallback = (metrics: FPSMetrics) => void;

export class FPSMonitor {
  private isRunning = false;
  private frameCount = 0;
  private jankFrames = 0;
  private startTime = 0;
  private lastFrameTime = 0;
  private fpsHistory: number[] = [];
  private alertCallbacks: AlertCallback[] = [];
  private metricsCallbacks: MetricsCallback[] = [];
  private animationFrameId: number | null = null;
  
  // Performance thresholds
  private readonly WARNING_THRESHOLD = 50;
  private readonly CRITICAL_THRESHOLD = 30;
  private readonly JANK_THRESHOLD = 20; // ms
  private readonly HISTORY_SIZE = 300; // 5 seconds at 60fps
  
  // Alert state tracking
  private lastAlertType: 'warning' | 'critical' | null = null;
  private alertCooldown = 0;
  private readonly ALERT_COOLDOWN_MS = 2000;

  /**
   * Start monitoring FPS in real-time
   */
  start(): void {
    if (this.isRunning) return;
    
    console.log('🎯 Starting real-time FPS monitoring for spiritual animations...');
    
    this.isRunning = true;
    this.frameCount = 0;
    this.jankFrames = 0;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.fpsHistory = [];
    this.lastAlertType = null;
    
    // Report monitoring start to Datadog
    datadogRum.addAction('fps_monitor.started', () => {}, {
      targetFps: 60,
      warningThreshold: this.WARNING_THRESHOLD,
      criticalThreshold: this.CRITICAL_THRESHOLD
    });
    
    this.measureFrame();
  }

  /**
   * Stop FPS monitoring
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Report final metrics to Datadog
    const finalMetrics = this.getMetrics();
    datadogRum.addAction('fps_monitor.stopped', () => {}, {
      ...finalMetrics,
      sessionDuration: finalMetrics.uptime / 1000
    });
    
    console.log('🎯 FPS monitoring stopped. Final metrics:', finalMetrics);
  }

  /**
   * Core frame measurement loop
   */
  private measureFrame = (timestamp = performance.now()): void => {
    if (!this.isRunning) return;

    const frameTime = timestamp - this.lastFrameTime;
    
    // Skip first frame to avoid large initial delta
    if (this.frameCount > 0) {
      const fps = 1000 / frameTime;
      this.fpsHistory.push(fps);
      
      // Keep history size manageable
      if (this.fpsHistory.length > this.HISTORY_SIZE) {
        this.fpsHistory.shift();
      }
      
      // Track jank frames (>20ms for 50fps, >16.67ms for 60fps)
      if (frameTime > this.JANK_THRESHOLD) {
        this.jankFrames++;
      }
      
      // Performance analysis every 30 frames (~500ms)
      if (this.frameCount % 30 === 0) {
        this.analyzePerformance(fps);
      }
      
      // Metrics callback every 60 frames (~1s)
      if (this.frameCount % 60 === 0) {
        this.notifyMetricsCallbacks();
      }
    }
    
    this.frameCount++;
    this.lastFrameTime = timestamp;
    this.animationFrameId = requestAnimationFrame(this.measureFrame);
  };

  /**
   * Analyze performance and trigger alerts if needed
   */
  private analyzePerformance(currentFps: number): void {
    const now = performance.now();
    
    // Cool down between alerts
    if (this.alertCooldown > now) return;
    
    const avgFps = this.getAverageFPS();
    const jankRate = (this.jankFrames / Math.max(this.frameCount, 1)) * 100;
    
    let alertType: 'warning' | 'critical' | 'recovery' | null = null;
    let message = '';
    let recommendations: string[] = [];
    
    // Critical performance issues
    if (avgFps < this.CRITICAL_THRESHOLD) {
      alertType = 'critical';
      message = `Critical FPS drop detected: ${avgFps.toFixed(1)} FPS (target: 60 FPS)`;
      recommendations = [
        'Consider reducing animation complexity',
        'Close other browser tabs/applications',
        'Check for background processes',
        'Enable battery saver mode if on mobile'
      ];
    }
    // Warning level issues
    else if (avgFps < this.WARNING_THRESHOLD) {
      alertType = 'warning';
      message = `Low FPS detected: ${avgFps.toFixed(1)} FPS (target: 60 FPS)`;
      recommendations = [
        'Monitor performance for spiritual animation quality',
        'Consider device-specific optimizations'
      ];
    }
    // Recovery from previous issues
    else if (this.lastAlertType && avgFps >= this.WARNING_THRESHOLD) {
      alertType = 'recovery';
      message = `Performance recovered: ${avgFps.toFixed(1)} FPS`;
    }
    
    // High jank rate alert
    if (jankRate > 15 && avgFps > this.WARNING_THRESHOLD) {
      alertType = 'warning';
      message = `High jank rate detected: ${jankRate.toFixed(1)}% of frames are janky`;
      recommendations = [
        'GPU acceleration issues detected',
        'Check for CSS layout thrashing',
        'Reduce concurrent animations'
      ];
    }

    if (alertType && alertType !== 'recovery') {
      // Report to Datadog
      datadogRum.addError(
        new Error(`FPS Performance Issue: ${message}`),
        {
          type: 'fps_performance',
          alertType,
          currentFps: currentFps.toFixed(1),
          averageFps: avgFps.toFixed(1),
          jankRate: jankRate.toFixed(1),
          frameCount: this.frameCount,
          uptime: now - this.startTime
        }
      );
    }
    
    if (alertType) {
      this.triggerAlert({
        type: alertType,
        message,
        fps: avgFps,
        timestamp: now,
        recommendations
      });
      
      this.lastAlertType = alertType === 'recovery' ? null : alertType;
      this.alertCooldown = now + this.ALERT_COOLDOWN_MS;
    }
  }

  /**
   * Calculate average FPS from recent history
   */
  private getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    
    // Use recent frames for more responsive average
    const recentFrames = this.fpsHistory.slice(-60); // Last 60 frames (~1 second)
    const sum = recentFrames.reduce((acc, fps) => acc + fps, 0);
    return sum / recentFrames.length;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): FPSMetrics {
    const currentFps = this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1] : 0;
    
    return {
      current: currentFps,
      average: this.getAverageFPS(),
      min: this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0,
      max: this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0,
      jankFrames: this.jankFrames,
      totalFrames: this.frameCount,
      uptime: this.isRunning ? performance.now() - this.startTime : 0
    };
  }

  /**
   * Check if current performance is acceptable for spiritual animations
   */
  isSpiritualQualityMaintained(): boolean {
    const avgFps = this.getAverageFPS();
    const jankRate = (this.jankFrames / Math.max(this.frameCount, 1)) * 100;
    
    return avgFps >= this.WARNING_THRESHOLD && jankRate <= 10;
  }

  /**
   * Get performance recommendation based on current state
   */
  getPerformanceRecommendation(): 'excellent' | 'good' | 'degraded' | 'critical' {
    const avgFps = this.getAverageFPS();
    
    if (avgFps >= 58) return 'excellent';
    if (avgFps >= this.WARNING_THRESHOLD) return 'good';
    if (avgFps >= this.CRITICAL_THRESHOLD) return 'degraded';
    return 'critical';
  }

  /**
   * Register alert callback
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register metrics callback
   */
  onMetrics(callback: MetricsCallback): () => void {
    this.metricsCallbacks.push(callback);
    
    return () => {
      const index = this.metricsCallbacks.indexOf(callback);
      if (index > -1) {
        this.metricsCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Trigger alert to all registered callbacks
   */
  private triggerAlert(alert: FPSAlert): void {
    console.warn('⚠️ FPS Alert:', alert);
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in FPS alert callback:', error);
      }
    });
  }

  /**
   * Notify metrics callbacks
   */
  private notifyMetricsCallbacks(): void {
    const metrics = this.getMetrics();
    this.metricsCallbacks.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in FPS metrics callback:', error);
      }
    });
  }

  /**
   * Get current monitoring state
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }

  /**
   * Force performance analysis (useful for testing)
   */
  forceAnalysis(): void {
    const currentFps = this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1] : 0;
    this.analyzePerformance(currentFps);
  }
}

// Global FPS monitor instance
export const fpsMonitor = new FPSMonitor();

/**
 * React hook for FPS monitoring
 */
export function useFPSMonitor() {
  const [metrics, setMetrics] = useState<FPSMetrics | null>(null);
  const [alerts, setAlerts] = useState<FPSAlert[]>([]);
  
  useEffect(() => {
    const unsubscribeMetrics = fpsMonitor.onMetrics(setMetrics);
    const unsubscribeAlerts = fpsMonitor.onAlert((alert) => {
      setAlerts(prev => [...prev.slice(-4), alert]); // Keep last 5 alerts
    });
    
    // Start monitoring
    fpsMonitor.start();
    
    return () => {
      unsubscribeMetrics();
      unsubscribeAlerts();
      fpsMonitor.stop();
    };
  }, []);
  
  return {
    metrics,
    alerts,
    isMonitoring: fpsMonitor.isMonitoring(),
    isSpiritualQuality: fpsMonitor.isSpiritualQualityMaintained(),
    recommendation: fpsMonitor.getPerformanceRecommendation()
  };
}