/**
 * STRUCTURED LOGGING SERVICE - AGENT 1 IMPLEMENTATION
 * 
 * World-class structured logging following OpenTelemetry standards with JSON formatting,
 * contextual metadata, and multiple output targets. Includes performance tracking,
 * error correlation, and user journey mapping.
 * 
 * Based on industry leader patterns from Google SRE, Stripe, and Netflix.
 */

import { supabase } from '@/lib/supabase';

/**
 * MEMORY_LOG:
 * Topic: Structured Logging Implementation
 * Context: Creating production-ready logging system for instant self-diagnosis
 * Decision: OpenTelemetry standards + Stripe canonical log lines + Netflix observability
 * Reasoning: Need comprehensive observability for rapid problem resolution
 * Architecture: Multi-output structured JSON with automatic correlation
 * Mobile Impact: Includes Capacitor platform detection and native error handling
 * Date: 2024-11-29
 */

// Core Types - Following OpenTelemetry Standards
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type LogEnvironment = 'development' | 'staging' | 'production';
export type LogSource = 'frontend' | 'backend' | 'mobile' | 'worker';

export interface LogContext {
  // User Journey Tracking
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  
  // Prayer-Specific Context
  prayerId?: string;
  requestId?: string;
  action: string;
  
  // Performance Context
  performance?: {
    duration?: number;
    memory?: number;
    cpuUsage?: number;
    networkLatency?: number;
  };
  
  // Error Context
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    cause?: any;
    fingerprint?: string;
  };
  
  // Business Context
  feature?: string;
  component?: string;
  workflow?: string;
  
  // Technical Context
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
  
  // Correlation Context
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
}

export interface StructuredLogEntry {
  // OpenTelemetry Standard Fields
  timestamp: string;           // ISO 8601 format
  level: LogLevel;
  service: string;
  environment: LogEnvironment;
  version: string;
  
  // Core Message
  message: string;
  
  // Correlation
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  
  // Context
  userId?: string;
  sessionId?: string;
  requestId?: string;
  
  // Structured Data
  context: LogContext;
  
  // Resource Attributes
  resource: {
    serviceName: string;
    serviceVersion: string;
    deploymentEnvironment: string;
    platform: string;
    device?: {
      type: 'mobile' | 'tablet' | 'desktop';
      os: string;
      browser?: string;
    };
  };
  
  // Metrics (for performance logs)
  metrics?: Record<string, number>;
  
  // Fingerprinting (for error deduplication)
  fingerprint?: string;
}

interface LogOutput {
  name: string;
  send: (entry: StructuredLogEntry) => Promise<void>;
  filter?: (entry: StructuredLogEntry) => boolean;
}

interface LoggerConfig {
  level: LogLevel;
  environment: LogEnvironment;
  serviceName: string;
  serviceVersion: string;
  outputs: LogOutput[];
  enableContextCollection: boolean;
  enablePerformanceTracking: boolean;
  bufferSize: number;
  flushInterval: number;
}

/**
 * World-Class Structured Logger
 * 
 * Implements patterns from:
 * - Google SRE: Structured logging with correlation
 * - Stripe: Canonical log lines for request tracking
 * - Netflix: Distributed tracing and performance metrics
 * - OpenTelemetry: Standard observability formats
 */
export class StructuredLogger {
  private config: LoggerConfig;
  private context: Partial<LogContext> = {};
  private buffer: StructuredLogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private sessionId: string;
  private requestId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'INFO',
      environment: (import.meta.env.VITE_ENVIRONMENT as LogEnvironment) || 'development',
      serviceName: 'prayermap-frontend',
      serviceVersion: import.meta.env.VITE_VERSION || '1.0.0',
      outputs: [],
      enableContextCollection: true,
      enablePerformanceTracking: true,
      bufferSize: 100,
      flushInterval: 5000,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.requestId = this.generateRequestId();
    
    // Initialize default outputs
    this.initializeOutputs();
    
    // Start periodic flush
    this.startPeriodicFlush();
    
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Initialize context collection
    if (this.config.enableContextCollection) {
      this.collectEnvironmentContext();
    }
  }

  /**
   * Set persistent context that applies to all log entries
   */
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear specific context fields
   */
  clearContext(keys?: string[]): void {
    if (keys) {
      keys.forEach(key => delete this.context[key as keyof LogContext]);
    } else {
      this.context = {};
    }
  }

  /**
   * Start a new trace span
   */
  startSpan(operation: string): LogSpan {
    const traceId = this.context.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    
    this.setContext({ traceId, spanId });
    
    const startTime = performance.now();
    
    this.debug(`Span started: ${operation}`, { 
      operation, 
      traceId, 
      spanId,
      startTime 
    });

    return new LogSpan(this, operation, traceId, spanId, startTime);
  }

  /**
   * Canonical Log Line Pattern (Stripe-inspired)
   * 
   * One comprehensive log line containing all key request characteristics
   */
  requestComplete(requestData: {
    method: string;
    url: string;
    duration: number;
    statusCode: number;
    userId?: string;
    responseSize?: number;
    userAgent?: string;
  }): void {
    const canonicalEntry = this.createLogEntry('INFO', 'Request completed', {
      action: 'request_complete',
      metadata: {
        request: {
          method: requestData.method,
          url: requestData.url,
          status_code: requestData.statusCode,
          response_size: requestData.responseSize || 0,
          user_agent: requestData.userAgent || this.context.userAgent,
        },
        performance: {
          duration: requestData.duration,
          navigation_type: performance.navigation?.type,
          memory_used: this.getMemoryUsage(),
          connection_type: this.getConnectionType(),
        },
        user: {
          id: requestData.userId || this.context.userId,
          session_id: this.sessionId,
        }
      }
    });

    this.sendLog(canonicalEntry);
  }

  /**
   * Standard log methods
   */
  debug(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('DEBUG')) {
      const entry = this.createLogEntry('DEBUG', message, context);
      this.sendLog(entry);
    }
  }

  info(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('INFO')) {
      const entry = this.createLogEntry('INFO', message, context);
      this.sendLog(entry);
    }
  }

  warn(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('WARN')) {
      const entry = this.createLogEntry('WARN', message, context);
      this.sendLog(entry);
    }
  }

  error(message: string, error?: Error, context?: Partial<LogContext>): void {
    if (this.shouldLog('ERROR')) {
      const errorContext: Partial<LogContext> = {
        ...context,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
          fingerprint: this.generateErrorFingerprint(error),
        } : undefined
      };

      const entry = this.createLogEntry('ERROR', message, errorContext);
      this.sendLog(entry);
    }
  }

  fatal(message: string, error?: Error, context?: Partial<LogContext>): void {
    const errorContext: Partial<LogContext> = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        fingerprint: this.generateErrorFingerprint(error),
      } : undefined
    };

    const entry = this.createLogEntry('FATAL', message, errorContext);
    this.sendLog(entry);
  }

  /**
   * Performance tracking methods
   */
  trackPerformance(operation: string, duration: number, metadata?: any): void {
    this.info(`Performance: ${operation}`, {
      action: 'performance_tracking',
      performance: { duration },
      metadata
    });
  }

  trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    const entry = this.createLogEntry('INFO', `Metric: ${name}`, {
      action: 'metric_tracking',
      metadata: { metric_name: name, metric_value: value },
      tags
    });

    entry.metrics = { [name]: value };
    this.sendLog(entry);
  }

  /**
   * User journey tracking
   */
  trackUserAction(action: string, context?: Partial<LogContext>): void {
    this.info(`User action: ${action}`, {
      ...context,
      action: `user_${action}`,
      workflow: context?.workflow || 'user_journey'
    });
  }

  trackPageView(page: string, context?: Partial<LogContext>): void {
    this.info(`Page view: ${page}`, {
      ...context,
      action: 'page_view',
      metadata: {
        page,
        referrer: document.referrer,
        url: window.location.href
      }
    });
  }

  /**
   * Business logic tracking
   */
  trackPrayerInteraction(type: 'create' | 'view' | 'respond' | 'share', prayerId: string, context?: Partial<LogContext>): void {
    this.info(`Prayer ${type}: ${prayerId}`, {
      ...context,
      action: `prayer_${type}`,
      prayerId,
      feature: 'prayers'
    });
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(level: LogLevel, message: string, context?: Partial<LogContext>): StructuredLogEntry {
    const now = new Date();
    const mergedContext = { ...this.context, ...context };

    return {
      timestamp: now.toISOString(),
      level,
      service: this.config.serviceName,
      environment: this.config.environment,
      version: this.config.serviceVersion,
      message,
      
      traceId: mergedContext.traceId,
      spanId: mergedContext.spanId,
      parentSpanId: mergedContext.parentSpanId,
      
      userId: mergedContext.userId,
      sessionId: this.sessionId,
      requestId: this.requestId,
      
      context: {
        ...mergedContext,
        timestamp_ms: now.getTime(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
      
      resource: {
        serviceName: this.config.serviceName,
        serviceVersion: this.config.serviceVersion,
        deploymentEnvironment: this.config.environment,
        platform: this.detectPlatform(),
        device: this.detectDevice(),
      },
      
      fingerprint: level === 'ERROR' ? this.generateLogFingerprint(message, mergedContext) : undefined
    };
  }

  /**
   * Send log to configured outputs
   */
  private sendLog(entry: StructuredLogEntry): void {
    // Add to buffer
    this.buffer.push(entry);
    
    // Immediate send for errors and fatal logs
    if (entry.level === 'ERROR' || entry.level === 'FATAL') {
      this.flushBuffer();
    }
    
    // Flush buffer if full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Flush log buffer to all outputs
   */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    for (const output of this.config.outputs) {
      try {
        for (const entry of entries) {
          if (!output.filter || output.filter(entry)) {
            await output.send(entry);
          }
        }
      } catch (error) {
        console.error(`Failed to send logs to ${output.name}:`, error);
      }
    }
  }

  /**
   * Initialize default log outputs
   */
  private initializeOutputs(): void {
    // Console output (always enabled in development)
    if (this.config.environment === 'development') {
      this.config.outputs.push({
        name: 'console',
        send: async (entry: StructuredLogEntry) => {
          const color = this.getConsoleColor(entry.level);
          console.log(
            `%c[${entry.timestamp}] ${entry.level} ${entry.message}`,
            `color: ${color}`,
            entry.context
          );
        }
      });
    }

    // Supabase output (for persistence and analysis)
    this.config.outputs.push({
      name: 'supabase',
      send: async (entry: StructuredLogEntry) => {
        try {
          await supabase.from('application_logs').insert({
            timestamp: entry.timestamp,
            level: entry.level,
            service: entry.service,
            message: entry.message,
            context: entry.context,
            resource: entry.resource,
            trace_id: entry.traceId,
            span_id: entry.spanId,
            user_id: entry.userId,
            session_id: entry.sessionId,
            fingerprint: entry.fingerprint,
          });
        } catch (error) {
          // Fallback to console if Supabase fails
          console.error('Failed to send log to Supabase:', error);
        }
      },
      filter: (entry) => entry.level !== 'DEBUG' // Don't send debug logs to Supabase
    });

    // External services (Sentry, DataDog, etc.) in production
    if (this.config.environment === 'production') {
      this.addProductionOutputs();
    }
  }

  /**
   * Add production-specific outputs
   */
  private addProductionOutputs(): void {
    // Sentry for error tracking
    this.config.outputs.push({
      name: 'sentry',
      send: async (entry: StructuredLogEntry) => {
        // Implementation would integrate with Sentry SDK
        if (window.Sentry) {
          window.Sentry.addBreadcrumb({
            message: entry.message,
            level: entry.level.toLowerCase(),
            data: entry.context,
          });
        }
      },
      filter: (entry) => ['ERROR', 'FATAL', 'WARN'].includes(entry.level)
    });
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled error', event.error, {
        action: 'global_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          source: 'window_error'
        }
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', 
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)), 
        {
          action: 'global_promise_rejection',
          metadata: {
            reason: event.reason,
            source: 'unhandled_rejection'
          }
        }
      );
    });
  }

  /**
   * Collect environment context
   */
  private collectEnvironmentContext(): void {
    this.setContext({
      userAgent: navigator.userAgent,
      metadata: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth,
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        online: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
      }
    });
  }

  /**
   * Utility methods
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, FATAL: 4
    };
    return levels[level] >= levels[this.config.level];
  }

  private getConsoleColor(level: LogLevel): string {
    const colors = {
      DEBUG: '#888888',
      INFO: '#0066cc',
      WARN: '#ff9900',
      ERROR: '#cc0000',
      FATAL: '#990000'
    };
    return colors[level];
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorFingerprint(error: Error): string {
    const content = `${error.name}:${error.message}:${error.stack?.split('\n')[0] || ''}`;
    return btoa(content).slice(0, 16);
  }

  private generateLogFingerprint(message: string, context: Partial<LogContext>): string {
    const content = `${message}:${context.action || ''}`;
    return btoa(content).slice(0, 16);
  }

  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }

  private getConnectionType(): string {
    return (navigator as any).connection?.effectiveType || 'unknown';
  }

  private detectPlatform(): string {
    if ((window as any).Capacitor) {
      return (window as any).Capacitor.getPlatform();
    }
    return 'web';
  }

  private detectDevice(): StructuredLogEntry['resource']['device'] {
    const userAgent = navigator.userAgent;
    
    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (/Mobi/i.test(userAgent)) type = 'mobile';
    else if (/Tablet/i.test(userAgent)) type = 'tablet';

    let os = 'unknown';
    if (/Windows/i.test(userAgent)) os = 'Windows';
    else if (/Mac/i.test(userAgent)) os = 'macOS';
    else if (/Linux/i.test(userAgent)) os = 'Linux';
    else if (/iOS/i.test(userAgent)) os = 'iOS';
    else if (/Android/i.test(userAgent)) os = 'Android';

    let browser: string | undefined;
    if (/Chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/Safari/i.test(userAgent)) browser = 'Safari';
    else if (/Edge/i.test(userAgent)) browser = 'Edge';

    return { type, os, browser };
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.config.flushInterval);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBuffer();
  }
}

/**
 * Log Span for distributed tracing
 */
export class LogSpan {
  private logger: StructuredLogger;
  private operation: string;
  private traceId: string;
  private spanId: string;
  private startTime: number;
  private attributes: Record<string, any> = {};

  constructor(
    logger: StructuredLogger, 
    operation: string, 
    traceId: string, 
    spanId: string, 
    startTime: number
  ) {
    this.logger = logger;
    this.operation = operation;
    this.traceId = traceId;
    this.spanId = spanId;
    this.startTime = startTime;
  }

  setAttributes(attributes: Record<string, any>): void {
    this.attributes = { ...this.attributes, ...attributes };
  }

  end(success: boolean = true): void {
    const duration = performance.now() - this.startTime;
    
    this.logger.info(`Span completed: ${this.operation}`, {
      action: 'span_complete',
      traceId: this.traceId,
      spanId: this.spanId,
      performance: { duration },
      metadata: {
        operation: this.operation,
        success,
        attributes: this.attributes,
      }
    });
  }

  recordError(error: Error): void {
    this.logger.error(`Span error: ${this.operation}`, error, {
      action: 'span_error',
      traceId: this.traceId,
      spanId: this.spanId,
      metadata: {
        operation: this.operation,
        attributes: this.attributes,
      }
    });
  }
}

// Global logger instance
export const logger = new StructuredLogger();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  // Set up auto-context collection
  logger.setContext({
    userAgent: navigator.userAgent,
  });

  // Track page loads
  window.addEventListener('load', () => {
    logger.trackPageView(window.location.pathname);
  });
}

export default StructuredLogger;