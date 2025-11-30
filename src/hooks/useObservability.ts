/**
 * REACT OBSERVABILITY HOOKS
 * 
 * Comprehensive React hooks for component-level monitoring, performance tracking,
 * and integration with the world-class observability system.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { logger } from '@/lib/logging/structuredLogger';
import { performanceMonitor } from '@/lib/logging/performanceMonitor';
import { errorTracker } from '@/lib/logging/errorTracking';
import { logAnalyzer } from '@/lib/logging/logAnalyzer';
import { monitoringOrchestrator } from '@/lib/logging/monitoringOrchestrator';

/**
 * MEMORY_LOG:
 * Topic: React Observability Hooks Integration
 * Context: Seamless integration of world-class observability into React components
 * Decision: Comprehensive hooks for automatic monitoring without manual intervention
 * Reasoning: Enable zero-config observability for all React components
 * Architecture: Hook-based automatic instrumentation + performance tracking + error handling
 * Mobile Impact: Includes React Native and Capacitor-specific optimizations
 * Date: 2024-11-29
 */

// Hook Types
interface ObservabilityOptions {
  component: string;
  trackPerformance?: boolean;
  trackUserActions?: boolean;
  trackErrors?: boolean;
  autoContext?: boolean;
  enableTracing?: boolean;
}

interface PerformanceHookOptions {
  operation: string;
  autoStart?: boolean;
  threshold?: number; // Alert if operation takes longer than this (ms)
}

interface UserActionTrackingOptions {
  category?: string;
  autoTrackClicks?: boolean;
  autoTrackForms?: boolean;
  autoTrackNavigation?: boolean;
}

interface ErrorBoundaryHookOptions {
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: any) => void;
  resetKeys?: any[];
}

/**
 * Main observability hook for React components
 */
export function useObservability(options: ObservabilityOptions) {
  const {
    component,
    trackPerformance = true,
    trackUserActions = true,
    trackErrors = true,
    autoContext = true,
    enableTracing = true,
  } = options;

  const mountTime = useRef(performance.now());
  const traceRef = useRef<any>(null);

  // Set component context for logging
  useEffect(() => {
    if (autoContext) {
      logger.setContext({
        component,
        feature: component.toLowerCase().includes('prayer') ? 'prayers' : 'general',
      });
    }

    // Start component trace
    if (enableTracing) {
      traceRef.current = logger.startSpan(`component_${component}`);
    }

    // Log component mount
    logger.trackUserAction('component_mount', {
      component,
      metadata: {
        timestamp: mountTime.current,
        url: window.location.href,
      },
    });

    return () => {
      // Log component unmount
      const duration = performance.now() - mountTime.current;
      
      if (trackPerformance) {
        performanceMonitor.trackLatency(`component_${component}`, duration);
      }

      logger.trackUserAction('component_unmount', {
        component,
        metadata: {
          mountDuration: duration,
        },
      });

      // End trace
      if (traceRef.current) {
        traceRef.current.end(true);
      }

      // Clear context
      if (autoContext) {
        logger.clearContext(['component', 'feature']);
      }
    };
  }, [component, trackPerformance, autoContext, enableTracing]);

  // Performance tracking
  const trackMetric = useCallback((name: string, value: number, tags?: Record<string, string>) => {
    performanceMonitor.trackLatency(name, value, { component, ...tags });
    logger.trackMetric(`${component}.${name}`, value, tags);
  }, [component]);

  // Error tracking
  const trackError = useCallback(async (error: Error, context?: any) => {
    if (!trackErrors) return;
    
    await errorTracker.trackError(error, {
      component,
      ...context,
    });
  }, [component, trackErrors]);

  // User action tracking
  const trackUserAction = useCallback((action: string, metadata?: any) => {
    if (!trackUserActions) return;
    
    logger.trackUserAction(`${component}_${action}`, {
      component,
      metadata,
    });
  }, [component, trackUserActions]);

  // Performance measurement
  const measureOperation = useCallback((operationName: string) => {
    const startTime = performance.now();
    
    return {
      end: (success: boolean = true, metadata?: any) => {
        const duration = performance.now() - startTime;
        
        if (trackPerformance) {
          trackMetric(operationName, duration, { success: String(success) });
        }
        
        logger.info(`Operation ${operationName} completed`, {
          component,
          action: `operation_${operationName}`,
          performance: { duration },
          metadata: { success, ...metadata },
        });
      },
    };
  }, [trackMetric, trackPerformance, component]);

  // Component health check
  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      // Basic component health verification
      const healthChecks = [
        () => document.querySelector(`[data-component="${component}"]`) !== null,
        () => performance.now() > 0, // Basic performance API check
        () => window.location !== undefined, // Basic DOM access
      ];

      return healthChecks.every(check => {
        try {
          return check();
        } catch {
          return false;
        }
      });
    } catch (error) {
      await trackError(error as Error, { action: 'health_check' });
      return false;
    }
  }, [component, trackError]);

  return {
    // Core tracking
    trackMetric,
    trackError,
    trackUserAction,
    measureOperation,
    checkHealth,
    
    // Context management
    setContext: (context: any) => logger.setContext({ component, ...context }),
    clearContext: (keys?: string[]) => logger.clearContext(keys),
    
    // Performance utilities
    startSpan: (operation: string) => logger.startSpan(`${component}_${operation}`),
    
    // Component info
    component,
    mountTime: mountTime.current,
    isHealthy: true, // Could be enhanced with real-time health monitoring
  };
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitoring(options: PerformanceHookOptions) {
  const { operation, autoStart = false, threshold = 1000 } = options;
  const [isRunning, setIsRunning] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (isRunning) return;
    
    startTimeRef.current = performance.now();
    setIsRunning(true);
    setDuration(null);
    
    logger.debug(`Performance monitoring started: ${operation}`, {
      action: 'performance_start',
      operation,
    });
  }, [isRunning, operation]);

  const end = useCallback((success: boolean = true, metadata?: any) => {
    if (!isRunning || !startTimeRef.current) return null;
    
    const endTime = performance.now();
    const operationDuration = endTime - startTimeRef.current;
    
    setIsRunning(false);
    setDuration(operationDuration);
    
    // Track performance
    performanceMonitor.trackLatency(operation, operationDuration, { success: String(success) });
    
    // Log completion
    logger.trackPerformance(operation, operationDuration, { success, ...metadata });
    
    // Alert if threshold exceeded
    if (operationDuration > threshold) {
      logger.warn(`Performance threshold exceeded: ${operation}`, {
        action: 'performance_threshold_exceeded',
        operation,
        duration: operationDuration,
        threshold,
        success,
      });
    }
    
    return operationDuration;
  }, [isRunning, operation, threshold]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setDuration(null);
    startTimeRef.current = null;
  }, []);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      start();
    }
  }, [autoStart, start]);

  return {
    start,
    end,
    reset,
    isRunning,
    duration,
    
    // Utilities
    measure: (fn: () => Promise<any>) => async () => {
      start();
      try {
        const result = await fn();
        end(true);
        return result;
      } catch (error) {
        end(false);
        throw error;
      }
    },
  };
}

/**
 * User action tracking hook
 */
export function useUserActionTracking(options: UserActionTrackingOptions = {}) {
  const {
    category = 'user_interaction',
    autoTrackClicks = true,
    autoTrackForms = true,
    autoTrackNavigation = true,
  } = options;

  const trackAction = useCallback((action: string, metadata?: any) => {
    logger.trackUserAction(action, {
      action: `${category}_${action}`,
      metadata: {
        timestamp: Date.now(),
        url: window.location.href,
        ...metadata,
      },
    });
  }, [category]);

  const trackClick = useCallback((element: string, metadata?: any) => {
    trackAction('click', { element, ...metadata });
  }, [trackAction]);

  const trackFormSubmit = useCallback((form: string, metadata?: any) => {
    trackAction('form_submit', { form, ...metadata });
  }, [trackAction]);

  const trackNavigation = useCallback((from: string, to: string, metadata?: any) => {
    trackAction('navigation', { from, to, ...metadata });
  }, [trackAction]);

  const trackPrayerInteraction = useCallback((type: 'create' | 'view' | 'respond' | 'share', prayerId: string, metadata?: any) => {
    logger.trackPrayerInteraction(type, prayerId, {
      metadata: {
        timestamp: Date.now(),
        ...metadata,
      },
    });
  }, []);

  // Auto-track clicks on elements with data-track attributes
  useEffect(() => {
    if (!autoTrackClicks) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const trackAttribute = target.getAttribute('data-track');
      
      if (trackAttribute) {
        trackClick(trackAttribute, {
          tagName: target.tagName,
          className: target.className,
          id: target.id,
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [autoTrackClicks, trackClick]);

  // Auto-track form submissions
  useEffect(() => {
    if (!autoTrackForms) return;

    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      const formName = form.getAttribute('data-form-name') || form.id || 'unknown';
      
      trackFormSubmit(formName, {
        action: form.action,
        method: form.method,
      });
    };

    document.addEventListener('submit', handleSubmit);
    return () => document.removeEventListener('submit', handleSubmit);
  }, [autoTrackForms, trackFormSubmit]);

  return {
    trackAction,
    trackClick,
    trackFormSubmit,
    trackNavigation,
    trackPrayerInteraction,
  };
}

/**
 * Error boundary hook
 */
export function useErrorBoundary(options: ErrorBoundaryHookOptions = {}) {
  const { onError, resetKeys = [] } = options;
  const [error, setError] = useState<Error | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout>();

  const resetError = useCallback(() => {
    setError(null);
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
  }, []);

  const captureError = useCallback((error: Error, errorInfo?: any) => {
    setError(error);
    
    // Track error
    errorTracker.trackError(error, {
      component: 'error_boundary',
      action: 'error_capture',
      metadata: errorInfo,
    });

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Auto-reset after 10 seconds
    resetTimeoutRef.current = setTimeout(() => {
      logger.info('Auto-resetting error boundary', {
        action: 'error_boundary_auto_reset',
        error: error.message,
      });
      resetError();
    }, 10000);
  }, [onError, resetError]);

  // Reset on dependency changes
  useEffect(() => {
    if (error && resetKeys.length > 0) {
      resetError();
    }
  }, resetKeys);

  // Global error handler
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      captureError(event.error);
    };

    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, [captureError]);

  return {
    error,
    resetError,
    captureError,
    hasError: error !== null,
  };
}

/**
 * Real-time monitoring hook
 */
export function useMonitoringState() {
  const [state, setState] = useState(() => monitoringOrchestrator.getState());
  const [metrics, setMetrics] = useState(() => monitoringOrchestrator.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setState(monitoringOrchestrator.getState());
      setMetrics(monitoringOrchestrator.getMetrics());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const generateReport = useCallback(async () => {
    return await monitoringOrchestrator.generateStatusReport();
  }, []);

  const getInsights = useCallback(async () => {
    return await logAnalyzer.generateInsightReport();
  }, []);

  return {
    state,
    metrics,
    generateReport,
    getInsights,
    
    // Quick health indicators
    isHealthy: state.systemHealth === 'healthy',
    isCritical: state.systemHealth === 'critical',
    performanceScore: state.performanceScore,
    criticalIssues: state.criticalIssues,
    automationActive: state.automationActive,
  };
}

/**
 * Supabase operation monitoring hook
 */
export function useSupabaseObservability() {
  const measureQuery = useCallback((operation: string) => {
    const startTime = performance.now();
    
    return {
      end: (success: boolean, rowCount?: number, error?: any) => {
        const duration = performance.now() - startTime;
        
        performanceMonitor.trackLatency(`supabase_${operation}`, duration, {
          success: String(success),
          rowCount: rowCount?.toString() || '0',
        });
        
        logger.info(`Supabase ${operation} completed`, {
          action: `supabase_${operation}`,
          performance: { duration },
          metadata: {
            success,
            rowCount,
            error: error?.message,
          },
        });
        
        if (!success && error) {
          errorTracker.trackError(error, {
            component: 'supabase',
            action: operation,
          });
        }
      },
    };
  }, []);

  const trackQuery = useCallback(async <T>(
    operation: string,
    queryFn: () => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> => {
    const measurement = measureQuery(operation);
    
    try {
      const result = await queryFn();
      measurement.end(!result.error, Array.isArray(result.data) ? result.data.length : 1, result.error);
      return result;
    } catch (error) {
      measurement.end(false, 0, error);
      throw error;
    }
  }, [measureQuery]);

  return {
    measureQuery,
    trackQuery,
  };
}

/**
 * Page performance hook
 */
export function usePagePerformance() {
  const [metrics, setMetrics] = useState<{
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;
  } | null>(null);

  useEffect(() => {
    // Measure page load performance
    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      setMetrics({
        loadTime,
        firstContentfulPaint,
        largestContentfulPaint: 0, // Would need PerformanceObserver for LCP
        firstInputDelay: 0, // Would need PerformanceObserver for FID
        cumulativeLayoutShift: 0, // Would need PerformanceObserver for CLS
      });

      // Track metrics
      performanceMonitor.trackLatency('page_load', loadTime);
      performanceMonitor.trackLatency('first_contentful_paint', firstContentfulPaint);
      
      logger.trackPageView(window.location.pathname, {
        performance: {
          loadTime,
          firstContentfulPaint,
        },
      });
    };

    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
      return () => window.removeEventListener('load', measurePerformance);
    }
  }, []);

  return metrics;
}

/**
 * Auto-instrumentation hook for zero-config monitoring
 */
export function useAutoInstrumentation(componentName: string) {
  const observability = useObservability({ component: componentName });
  const userActions = useUserActionTracking();
  const errorBoundary = useErrorBoundary();
  const pagePerformance = usePagePerformance();

  // Auto-track component lifecycle
  useEffect(() => {
    observability.trackUserAction('component_rendered');
  }, []);

  return {
    ...observability,
    ...userActions,
    ...errorBoundary,
    pagePerformance,
    
    // Auto-instrumentation utilities
    withTracking: (fn: (...args: any[]) => any, actionName: string) => {
      return async (...args: any[]) => {
        const measurement = observability.measureOperation(actionName);
        try {
          const result = await fn(...args);
          measurement.end(true);
          return result;
        } catch (error) {
          measurement.end(false);
          errorBoundary.captureError(error as Error);
          throw error;
        }
      };
    },
  };
}