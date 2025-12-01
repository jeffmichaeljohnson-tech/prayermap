/**
 * Datadog RUM + APM Integration
 * 
 * Full-stack distributed tracing for PrayerMap
 * - Frontend: React component performance
 * - Backend: Supabase query tracing
 * - Database: PostgreSQL query performance
 * - Real-time: WebSocket/Realtime subscription monitoring
 * 
 * Why Datadog:
 * - Automatic correlation between frontend errors and backend queries
 * - Intelligent root cause analysis
 * - Supabase native support
 * - Perfect for debugging chat/messaging issues
 */

import { datadogRum } from '@datadog/browser-rum';
import { reactPlugin } from '@datadog/browser-rum-react';
import { datadogLogs } from '@datadog/browser-logs';

// Initialize Datadog RUM and Logs
let initialized = false;
let logsInitialized = false;

export function initDatadog() {
  if (initialized) return;
  
  const appId = import.meta.env.VITE_DATADOG_APP_ID;
  const clientToken = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;
  
  if (!appId || !clientToken) {
    console.warn('Datadog RUM not configured - missing VITE_DATADOG_APP_ID or VITE_DATADOG_CLIENT_TOKEN');
    return;
  }
  
  try {
    // Get Supabase URL for distributed tracing
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const allowedTracingUrls = supabaseUrl 
      ? [{ match: supabaseUrl, propagatorTypes: ['datadog'] }]
      : undefined;
    
    datadogRum.init({
    applicationId: appId,
    clientToken: clientToken,
    site: 'datadoghq.com',
    service: 'prayermap',
    env: import.meta.env.NODE_ENV || 'development',
    version: import.meta.env.VITE_APP_VERSION || '0.0.0',
    
    // Session sampling
    sessionSampleRate: 100, // 100% for debugging (reduce in production)
    sessionReplaySampleRate: 20, // 20% session replay (matching Datadog recommendation)
    
    // Performance tracking
    trackResources: true,
    trackLongTasks: true,
    trackUserInteractions: true,
    
    // Distributed tracing - enables APM Service Map
    // This allows RUM traces to appear in APM
    allowedTracingUrls: allowedTracingUrls,
    allowedTracingOrigins: supabaseUrl ? [new URL(supabaseUrl).origin] : undefined,
    
    // Privacy - mask user input by default (production-ready)
    defaultPrivacyLevel: 'mask-user-input',
    
    // React plugin for component-level tracking
    plugins: [reactPlugin({ router: false })], // Main app doesn't use React Router
    
    // Custom context
    beforeSend: (event) => {
      // Add Supabase context to all events
      if (event.type === 'resource' && event.resource?.url?.includes('supabase')) {
        const url = event.resource.url;
        event.context = {
          ...event.context,
          supabase_url: url,
          supabase_table: extractTableFromUrl(url),
          supabase_operation: extractOperationFromUrl(url),
        };
      }
      
      // Add user context if available
      const userId = getCurrentUserId();
      if (userId) {
        event.context = {
          ...event.context,
          user_id: userId,
        };
      }
      
      return true;
    },
    
    // Error handling - removed duplicate beforeSend
    });
    
    initialized = true;
    console.log('✅ Datadog RUM initialized');
  } catch (error) {
    // Datadog initialization errors shouldn't crash the app
    console.warn('⚠️ Datadog RUM initialization failed (non-fatal):', error);
    console.warn('App will continue without Datadog monitoring');
    // Don't set initialized = true so it can retry later if needed
  }
}

/**
 * Extract table name from Supabase URL
 */
function extractTableFromUrl(url: string): string | undefined {
  try {
    const match = url.match(/\/rest\/v1\/([^?/]+)/);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract operation from Supabase URL
 */
function extractOperationFromUrl(url: string): string | undefined {
  try {
    if (url.includes('/rest/v1/')) {
      return 'query';
    }
    if (url.includes('/realtime/v1/')) {
      return 'realtime';
    }
    if (url.includes('/auth/v1/')) {
      return 'auth';
    }
    if (url.includes('/storage/v1/')) {
      return 'storage';
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get current user ID from localStorage or context
 */
function getCurrentUserId(): string | undefined {
  try {
    // Try to get from Supabase session
    const session = localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
    if (session) {
      const parsed = JSON.parse(session);
      return parsed?.user?.id;
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Trace a Supabase query with automatic error tracking
 * 
 * Usage:
 * ```typescript
 * const result = await traceSupabaseQuery('getPrayers', async () => {
 *   return await supabase.from('prayers').select('*');
 * });
 * ```
 */
export async function traceSupabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  // Enhanced tracing with APM context for Service Map
  return datadogRum.addAction(`supabase.query.${queryName}`, async () => {
    const startTime = performance.now();
    
    // Add APM context for Service Map visualization
    datadogRum.setGlobalContextProperty('service', 'supabase-api');
    datadogRum.setGlobalContextProperty('resource', queryName);
    datadogRum.setGlobalContextProperty('db.type', 'postgresql');
    datadogRum.setGlobalContextProperty('db.name', 'supabase');
    
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      // Add timing
      datadogRum.addTiming(`supabase.query.${queryName}.duration`, duration);
      
      // Add APM tags for Service Map
      datadogRum.setGlobalContextProperty('query.duration', duration);
      datadogRum.setGlobalContextProperty('query.status', 'success');
      
      // Log slow queries
      if (duration > 1000) {
        datadogRum.addError(new Error(`Slow query: ${queryName} took ${duration.toFixed(0)}ms`), {
          query: queryName,
          duration,
          type: 'slow_query',
          service: 'supabase-api',
          ...metadata,
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Track error with full context
      datadogRum.addError(error as Error, {
        query: queryName,
        duration,
        type: 'supabase_error',
        service: 'supabase-api',
        ...metadata,
      });
      
      // Add APM error tags
      datadogRum.setGlobalContextProperty('query.status', 'error');
      datadogRum.setGlobalContextProperty('error.type', error instanceof Error ? error.name : 'unknown');
      
      throw error;
    }
  });
}

/**
 * Trace a Supabase Realtime subscription
 * 
 * Usage:
 * ```typescript
 * const subscription = traceRealtimeSubscription('prayers', () => {
 *   return supabase.channel('prayers').subscribe();
 * });
 * ```
 */
export function traceRealtimeSubscription(
  channelName: string,
  subscribeFn: () => any
): any {
  return datadogRum.addAction(`supabase.realtime.subscribe.${channelName}`, () => {
    const subscription = subscribeFn();
    
    // Monitor subscription health
    if (subscription && typeof subscription === 'object') {
      // Track subscription events
      const originalOn = subscription.on?.bind(subscription);
      if (originalOn) {
        subscription.on = (event: string, callback: any) => {
          datadogRum.addAction(`supabase.realtime.${channelName}.${event}`, () => {
            return originalOn(event, callback);
          });
        };
      }
      
      // Track errors
      if (subscription.on) {
        subscription.on('error', (error: Error) => {
          datadogRum.addError(error, {
            channel: channelName,
            type: 'realtime_error',
          });
        });
      }
    }
    
    return subscription;
  });
}

/**
 * Add custom context to all future events
 */
export function setDatadogContext(context: Record<string, any>) {
  datadogRum.setGlobalContextProperty('custom', context);
}

/**
 * Get current trace ID (for correlation with backend)
 */
export function getCurrentTraceId(): string | undefined {
  return datadogRum.getSessionReplayLink();
}

/**
 * Manually track an error
 */
export function trackError(error: Error, context?: Record<string, any>) {
  datadogRum.addError(error, context);
}

/**
 * Manually track a custom event
 */
export function trackEvent(name: string, context?: Record<string, any>) {
  datadogRum.addAction(name, () => {}, context);
}

/**
 * Initialize Datadog Log Management
 * 
 * Captures structured logs for debugging and monitoring during refactoring
 */
export function initDatadogLogs() {
  if (logsInitialized) return;
  
  const clientToken = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;
  
  if (!clientToken) {
    console.warn('Datadog Logs not configured - missing VITE_DATADOG_CLIENT_TOKEN');
    return;
  }
  
  try {
    datadogLogs.init({
      clientToken: clientToken,
      site: 'datadoghq.com',
      service: 'prayermap',
      env: import.meta.env.NODE_ENV || 'development',
      version: import.meta.env.VITE_APP_VERSION || '0.0.0',
      
      // Forward console errors to Datadog
      forwardErrorsToLogs: true,
      
      // Forward console logs to Datadog
      forwardConsoleLogs: ['error', 'warn'],
      
      // Sample rate (100% for debugging, reduce in production)
      sampleRate: 100,
      
      // Add user context
      beforeSend: (log) => {
        const userId = getCurrentUserId();
        if (userId) {
          log.context = {
            ...log.context,
            user_id: userId,
          };
        }
        return true;
      },
    });
    
    logsInitialized = true;
    console.log('✅ Datadog Logs initialized');
  } catch (error) {
    console.warn('⚠️ Datadog Logs initialization failed (non-fatal):', error);
  }
}

/**
 * Structured logging helpers for refactoring and debugging
 */
export const logger = {
  /**
   * Log refactoring progress
   */
  refactoring: (message: string, context?: Record<string, any>) => {
    datadogLogs.logger.info(message, {
      type: 'refactoring',
      ...context,
    });
  },
  
  /**
   * Log component changes
   */
  component: (component: string, action: string, context?: Record<string, any>) => {
    datadogLogs.logger.info(`Component ${action}: ${component}`, {
      type: 'component_change',
      component,
      action,
      ...context,
    });
  },
  
  /**
   * Log performance metrics
   */
  performance: (metric: string, value: number, context?: Record<string, any>) => {
    datadogLogs.logger.info(`Performance: ${metric} = ${value}ms`, {
      type: 'performance',
      metric,
      value,
      ...context,
    });
  },
  
  /**
   * Log refactoring milestone
   */
  milestone: (milestone: string, context?: Record<string, any>) => {
    datadogLogs.logger.info(`Milestone: ${milestone}`, {
      type: 'milestone',
      milestone,
      ...context,
    });
  },
  
  /**
   * Standard info log
   */
  info: (message: string, context?: Record<string, any>) => {
    datadogLogs.logger.info(message, context);
  },
  
  /**
   * Warning log
   */
  warn: (message: string, context?: Record<string, any>) => {
    datadogLogs.logger.warn(message, context);
  },
  
  /**
   * Error log
   */
  error: (message: string, error?: Error, context?: Record<string, any>) => {
    datadogLogs.logger.error(message, {
      error: error?.message,
      stack: error?.stack,
      ...(context || {}),
    });
  },
};

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  initDatadog();
  initDatadogLogs();
}

export { datadogRum, datadogLogs };

