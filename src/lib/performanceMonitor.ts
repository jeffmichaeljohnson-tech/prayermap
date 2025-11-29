/**
 * Performance Monitoring
 *
 * Features:
 * - Core Web Vitals tracking (LCP, FID, CLS)
 * - Custom performance marks
 * - Resource timing
 * - Long task detection
 * - Memory monitoring
 * - Frame rate tracking
 */

import { useEffect, useRef, useState } from 'react';
import { logger } from './logger';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
  inp?: number; // Interaction to Next Paint

  // Custom metrics
  timeToInteractive?: number;
  domContentLoaded?: number;
  windowLoad?: number;

  // Resource metrics
  resourceCount: number;
  totalTransferSize: number;

  // Memory (if available)
  jsHeapSize?: number;
  jsHeapLimit?: number;
  jsHeapUsagePercent?: number;
}

export interface ComponentMetric {
  name: string;
  renderCount: number;
  avgRenderTime: number;
  maxRenderTime: number;
  lastRenderTime: number;
}

export interface ApiMetric {
  endpoint: string;
  count: number;
  successCount: number;
  errorCount: number;
  avgDuration: number;
  maxDuration: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = { resourceCount: 0, totalTransferSize: 0 };
  private observers: PerformanceObserver[] = [];
  private customMarks: Map<string, number> = new Map();
  private componentMetrics: Map<string, ComponentMetric> = new Map();
  private apiMetrics: Map<string, ApiMetric> = new Map();
  private longTasks: PerformanceEntry[] = [];
  private initialized = false;

  init(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    try {
      this.observeWebVitals();
      this.observeLongTasks();
      this.observeResources();
      this.trackMemory();
      this.trackNavigationTiming();

      logger.info('Performance monitoring initialized', {
        action: 'performance_init',
      });
    } catch (error) {
      logger.error('Failed to initialize performance monitoring', error as Error, {
        action: 'performance_init_failed',
      });
    }
  }

  // Custom performance mark
  mark(name: string): void {
    try {
      performance.mark(name);
      this.customMarks.set(name, performance.now());

      logger.debug(`Performance mark: ${name}`, {
        action: 'performance_mark',
        metadata: { mark: name },
      });
    } catch (error) {
      logger.warn('Failed to create performance mark', {
        action: 'performance_mark_failed',
        metadata: { name, error },
      });
    }
  }

  // Measure between marks
  measure(name: string, startMark: string, endMark?: string): number {
    try {
      const measureName = `measure_${name}`;

      if (endMark) {
        performance.measure(measureName, startMark, endMark);
      } else {
        performance.measure(measureName, startMark);
      }

      const entries = performance.getEntriesByName(measureName, 'measure');
      const duration = entries[0]?.duration || 0;

      logger.info(`Performance measure: ${name}`, {
        action: 'performance_measure',
        duration,
        metadata: { name, startMark, endMark },
      });

      return duration;
    } catch (error) {
      logger.warn('Failed to measure performance', {
        action: 'performance_measure_failed',
        metadata: { name, startMark, endMark, error },
      });
      return 0;
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    this.updateMemoryMetrics();

    return {
      resourceCount: 0,
      totalTransferSize: 0,
      ...this.metrics,
    };
  }

  // Track component render time
  trackRender(componentName: string, duration: number): void {
    const existing = this.componentMetrics.get(componentName);

    if (existing) {
      const newRenderCount = existing.renderCount + 1;
      const newAvgRenderTime =
        (existing.avgRenderTime * existing.renderCount + duration) / newRenderCount;

      this.componentMetrics.set(componentName, {
        name: componentName,
        renderCount: newRenderCount,
        avgRenderTime: newAvgRenderTime,
        maxRenderTime: Math.max(existing.maxRenderTime, duration),
        lastRenderTime: duration,
      });
    } else {
      this.componentMetrics.set(componentName, {
        name: componentName,
        renderCount: 1,
        avgRenderTime: duration,
        maxRenderTime: duration,
        lastRenderTime: duration,
      });
    }

    // Log slow renders
    if (duration > 16) {
      // More than one frame
      logger.warn(`Slow render: ${componentName}`, {
        action: 'slow_render',
        duration,
        component: componentName,
      });
    }
  }

  // Track API call duration
  trackApiCall(endpoint: string, duration: number, success: boolean): void {
    const existing = this.apiMetrics.get(endpoint);

    if (existing) {
      const newCount = existing.count + 1;
      const newAvgDuration = (existing.avgDuration * existing.count + duration) / newCount;

      this.apiMetrics.set(endpoint, {
        endpoint,
        count: newCount,
        successCount: existing.successCount + (success ? 1 : 0),
        errorCount: existing.errorCount + (success ? 0 : 1),
        avgDuration: newAvgDuration,
        maxDuration: Math.max(existing.maxDuration, duration),
      });
    } else {
      this.apiMetrics.set(endpoint, {
        endpoint,
        count: 1,
        successCount: success ? 1 : 0,
        errorCount: success ? 0 : 1,
        avgDuration: duration,
        maxDuration: duration,
      });
    }

    logger.debug(`API call: ${endpoint}`, {
      action: 'api_call',
      duration,
      metadata: { endpoint, success },
    });
  }

  // Get component metrics
  getComponentMetrics(): ComponentMetric[] {
    return Array.from(this.componentMetrics.values()).sort(
      (a, b) => b.avgRenderTime - a.avgRenderTime
    );
  }

  // Get API metrics
  getApiMetrics(): ApiMetric[] {
    return Array.from(this.apiMetrics.values()).sort((a, b) => b.avgDuration - a.avgDuration);
  }

  // Get long tasks
  getLongTasks(): PerformanceEntry[] {
    return [...this.longTasks];
  }

  // Report metrics
  report(): void {
    const metrics = this.getMetrics();

    logger.info('Performance report', {
      action: 'performance_report',
      metadata: {
        metrics,
        componentMetrics: this.getComponentMetrics().slice(0, 10),
        apiMetrics: this.getApiMetrics().slice(0, 10),
        longTaskCount: this.longTasks.length,
      },
    });
  }

  // Clear metrics
  clear(): void {
    this.customMarks.clear();
    this.componentMetrics.clear();
    this.apiMetrics.clear();
    this.longTasks = [];

    logger.info('Performance metrics cleared', {
      action: 'performance_cleared',
    });
  }

  // Cleanup
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.initialized = false;
  }

  // Private methods

  private observeWebVitals(): void {
    try {
      // LCP (Largest Contentful Paint)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          renderTime?: number;
          loadTime?: number;
        };

        this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime || 0;

        logger.info('LCP measured', {
          action: 'web_vital_lcp',
          duration: this.metrics.lcp,
        });
      });

      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(lcpObserver);

      // FID (First Input Delay)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: PerformanceEntry) => {
          const fidEntry = entry as PerformanceEntry & {
            processingStart?: number;
            startTime?: number;
          };
          this.metrics.fid = fidEntry.processingStart! - fidEntry.startTime!;

          logger.info('FID measured', {
            action: 'web_vital_fid',
            duration: this.metrics.fid,
          });
        });
      });

      fidObserver.observe({ type: 'first-input', buffered: true });
      this.observers.push(fidObserver);

      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: PerformanceEntry) => {
          const clsEntry = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!clsEntry.hadRecentInput) {
            clsValue += clsEntry.value || 0;
            this.metrics.cls = clsValue;
          }
        });

        logger.debug('CLS updated', {
          action: 'web_vital_cls',
          metadata: { cls: clsValue },
        });
      });

      clsObserver.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(clsObserver);

      // INP (Interaction to Next Paint) - newer metric
      try {
        const inpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: PerformanceEntry) => {
            const inpEntry = entry as PerformanceEntry & { duration?: number };
            this.metrics.inp = Math.max(this.metrics.inp || 0, inpEntry.duration || 0);
          });
        });

        inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 });
        this.observers.push(inpObserver);
      } catch {
        // INP might not be supported
      }
    } catch (error) {
      logger.warn('Failed to observe web vitals', {
        action: 'web_vitals_failed',
        metadata: { error },
      });
    }
  }

  private observeLongTasks(): void {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.longTasks.push(entry);

          logger.warn('Long task detected', {
            action: 'long_task',
            duration: entry.duration,
            metadata: {
              name: entry.name,
              startTime: entry.startTime,
            },
          });
        });

        // Keep only last 50 long tasks
        if (this.longTasks.length > 50) {
          this.longTasks = this.longTasks.slice(-50);
        }
      });

      longTaskObserver.observe({ type: 'longtask', buffered: true });
      this.observers.push(longTaskObserver);
    } catch (error) {
      // Long task API might not be supported
      logger.debug('Long task observation not supported', {
        action: 'long_task_unsupported',
      });
    }
  }

  private observeResources(): void {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        let totalSize = 0;
        entries.forEach((entry) => {
          const resourceEntry = entry as PerformanceResourceTiming;
          totalSize += resourceEntry.transferSize || 0;
        });

        this.metrics.resourceCount = (this.metrics.resourceCount || 0) + entries.length;
        this.metrics.totalTransferSize = (this.metrics.totalTransferSize || 0) + totalSize;
      });

      resourceObserver.observe({ type: 'resource', buffered: true });
      this.observers.push(resourceObserver);
    } catch (error) {
      logger.warn('Failed to observe resources', {
        action: 'resource_observation_failed',
        metadata: { error },
      });
    }
  }

  private trackMemory(): void {
    // Check if memory API is available
    const performanceMemory = (performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    }).memory;

    if (performanceMemory) {
      // Update memory metrics periodically
      setInterval(() => {
        this.updateMemoryMetrics();
      }, 5000);
    }
  }

  private updateMemoryMetrics(): void {
    const performanceMemory = (performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    }).memory;

    if (performanceMemory) {
      this.metrics.jsHeapSize = performanceMemory.usedJSHeapSize;
      this.metrics.jsHeapLimit = performanceMemory.jsHeapSizeLimit;
      this.metrics.jsHeapUsagePercent =
        (performanceMemory.usedJSHeapSize / performanceMemory.jsHeapSizeLimit) * 100;

      // Warn if memory usage is high
      if (this.metrics.jsHeapUsagePercent > 90) {
        logger.warn('High memory usage', {
          action: 'high_memory',
          metadata: {
            usagePercent: this.metrics.jsHeapUsagePercent,
            used: this.metrics.jsHeapSize,
            limit: this.metrics.jsHeapLimit,
          },
        });
      }
    }
  }

  private trackNavigationTiming(): void {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navTiming) {
          this.metrics.ttfb = navTiming.responseStart - navTiming.requestStart;
          this.metrics.domContentLoaded = navTiming.domContentLoadedEventEnd - navTiming.fetchStart;
          this.metrics.windowLoad = navTiming.loadEventEnd - navTiming.fetchStart;

          // FCP
          const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
          if (fcpEntry) {
            this.metrics.fcp = fcpEntry.startTime;
          }

          logger.info('Navigation timing captured', {
            action: 'navigation_timing',
            metadata: {
              ttfb: this.metrics.ttfb,
              domContentLoaded: this.metrics.domContentLoaded,
              windowLoad: this.metrics.windowLoad,
              fcp: this.metrics.fcp,
            },
          });
        }
      }, 0);
    });
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance
export function usePerformance(componentName: string): {
  trackRender: () => void;
  trackInteraction: (name: string) => () => void;
} {
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    performanceMonitor.trackRender(componentName, renderTime);
  });

  const trackRender = () => {
    const renderTime = performance.now() - renderStartTime.current;
    performanceMonitor.trackRender(componentName, renderTime);
  };

  const trackInteraction = (name: string) => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      logger.info(`Interaction: ${name}`, {
        action: 'user_interaction',
        component: componentName,
        duration,
        metadata: { interaction: name },
      });
    };
  };

  return {
    trackRender,
    trackInteraction,
  };
}

// React hook to get current metrics
export function usePerformanceMetrics(): {
  metrics: PerformanceMetrics;
  componentMetrics: ComponentMetric[];
  apiMetrics: ApiMetric[];
  refresh: () => void;
} {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(performanceMonitor.getMetrics());
  const [componentMetrics, setComponentMetrics] = useState<ComponentMetric[]>([]);
  const [apiMetrics, setApiMetrics] = useState<ApiMetric[]>([]);

  const refresh = () => {
    setMetrics(performanceMonitor.getMetrics());
    setComponentMetrics(performanceMonitor.getComponentMetrics());
    setApiMetrics(performanceMonitor.getApiMetrics());
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    componentMetrics,
    apiMetrics,
    refresh,
  };
}
