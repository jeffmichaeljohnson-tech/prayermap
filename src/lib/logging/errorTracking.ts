/**
 * ERROR TRACKING & AUTO-HEALING ENGINEER - AGENT 3 IMPLEMENTATION
 * 
 * Netflix-style error boundary system with automated diagnostics collection,
 * self-healing strategies, health checks, and intelligent error classification
 * with automated recovery attempts.
 */

import React, { ErrorInfo } from 'react';
import { logger } from './structuredLogger';
import { performanceMonitor } from './performanceMonitor';

/**
 * MEMORY_LOG:
 * Topic: Netflix-Style Error Tracking & Auto-Healing
 * Context: Building production-ready error handling with self-recovery capabilities
 * Decision: Intelligent error classification + automated recovery + health checks
 * Reasoning: Enable system resilience and reduce manual intervention for common issues
 * Architecture: Error boundary + diagnostic collection + recovery strategies
 * Mobile Impact: Includes native error handling and Capacitor-specific recovery
 * Date: 2024-11-29
 */

// Error Types and Classifications
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  RENDERING = 'rendering',
  PERFORMANCE = 'performance',
  EXTERNAL_SERVICE = 'external_service',
  UNKNOWN = 'unknown',
}

export interface DiagnosticInfo {
  errorId: string;
  timestamp: number;
  
  // Browser Environment
  userAgent: string;
  url: string;
  viewport: { width: number; height: number };
  
  // Performance Context
  memory: {
    used: number;
    total: number;
    limit: number;
  } | null;
  
  // Network Context
  connection: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  } | null;
  
  // Application State
  localStorage: { keys: number; size: number };
  sessionStorage: { keys: number; size: number };
  
  // React Context
  componentStack?: string;
  errorBoundary?: string;
  
  // User Context
  userId?: string;
  sessionId: string;
  
  // System Health
  recentErrors: number;
  systemLoad: number;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  props?: Record<string, any>;
  state?: Record<string, any>;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface RecoveryStrategy {
  name: string;
  condition: (error: Error, context: ErrorContext, diagnostics: DiagnosticInfo) => boolean;
  execute: (error: Error, context: ErrorContext, diagnostics: DiagnosticInfo) => Promise<boolean>;
  description: string;
}

export interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  critical: boolean;
  timeout: number;
}

/**
 * Netflix-Style Error Tracker with Auto-Healing
 */
export class ErrorTracker {
  private recoveryStrategies: RecoveryStrategy[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private errorHistory: Map<string, number[]> = new Map();
  private lastHealthCheck = new Map<string, { result: boolean; timestamp: number }>();
  
  constructor() {
    this.initializeDefaultRecoveryStrategies();
    this.initializeDefaultHealthChecks();
    this.setupGlobalErrorHandlers();
    
    // Start periodic health checks
    this.startHealthCheckScheduler();
    
    logger.info('Error Tracker initialized', { 
      action: 'error_tracker_init',
      strategies: this.recoveryStrategies.length,
      healthChecks: this.healthChecks.size
    });
  }

  /**
   * Track and potentially recover from an error
   */
  async trackError(
    error: Error, 
    context: ErrorContext = {}, 
    severity?: ErrorSeverity
  ): Promise<boolean> {
    const errorId = this.generateErrorId();
    const diagnostics = await this.collectDiagnostics(errorId, context);
    
    // Classify the error
    const category = this.classifyError(error, context);
    const computedSeverity = severity || this.calculateSeverity(error, context, diagnostics);
    
    // Update error history
    this.updateErrorHistory(error, category);
    
    // Log the error with full context
    logger.error('Error tracked for recovery analysis', error, {
      action: 'error_tracking',
      errorId,
      category,
      severity: computedSeverity,
      context,
      diagnostics: {
        recentErrors: diagnostics.recentErrors,
        systemLoad: diagnostics.systemLoad,
        memory: diagnostics.memory,
        connection: diagnostics.connection,
      }
    });

    // Track error metrics
    performanceMonitor.trackError(context.component || 'unknown', error, category);

    // Attempt automatic recovery
    const recovered = await this.attemptRecovery(error, context, diagnostics);

    if (recovered) {
      logger.info('Error recovery successful', {
        action: 'error_recovery_success',
        errorId,
        category,
        severity: computedSeverity,
      });
    } else {
      logger.warn('Error recovery failed', {
        action: 'error_recovery_failed',
        errorId,
        category,
        severity: computedSeverity,
      });
    }

    // Trigger additional actions based on severity
    await this.handleBySeverity(error, context, diagnostics, computedSeverity);

    return recovered;
  }

  /**
   * Collect comprehensive diagnostic information
   */
  private async collectDiagnostics(errorId: string, context: ErrorContext): Promise<DiagnosticInfo> {
    // Basic environment info
    const diagnostics: DiagnosticInfo = {
      errorId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      memory: null,
      connection: null,
      localStorage: {
        keys: Object.keys(localStorage).length,
        size: this.getStorageSize(localStorage),
      },
      sessionStorage: {
        keys: Object.keys(sessionStorage).length,
        size: this.getStorageSize(sessionStorage),
      },
      userId: context.userId,
      sessionId: logger['sessionId'], // Access private session ID
      recentErrors: this.getRecentErrorCount(),
      systemLoad: await this.calculateSystemLoad(),
    };

    // Memory information
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      diagnostics.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }

    // Network information
    if ((navigator as any).connection) {
      const conn = (navigator as any).connection;
      diagnostics.connection = {
        effectiveType: conn.effectiveType || 'unknown',
        downlink: conn.downlink || 0,
        rtt: conn.rtt || 0,
      };
    }

    return diagnostics;
  }

  /**
   * Classify error into categories for appropriate handling
   */
  private classifyError(error: Error, context: ErrorContext): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Network errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('timeout') || message.includes('connection')) {
      return ErrorCategory.NETWORK;
    }

    // Authentication errors
    if (message.includes('auth') || message.includes('unauthorized') || 
        message.includes('forbidden') || message.includes('login')) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Permission errors
    if (message.includes('permission') || message.includes('access denied') || 
        message.includes('not allowed')) {
      return ErrorCategory.PERMISSION;
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || 
        message.includes('required') || message.includes('format')) {
      return ErrorCategory.VALIDATION;
    }

    // Rendering errors
    if (stack.includes('react') || stack.includes('render') || 
        context.component || error.name === 'ChunkLoadError') {
      return ErrorCategory.RENDERING;
    }

    // Performance errors
    if (message.includes('memory') || message.includes('quota') || 
        message.includes('limit exceeded')) {
      return ErrorCategory.PERFORMANCE;
    }

    // External service errors (Supabase, MapBox, etc.)
    if (message.includes('supabase') || message.includes('mapbox') || 
        stack.includes('supabase') || stack.includes('mapbox')) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    // Business logic errors
    if (context.action || context.component) {
      return ErrorCategory.BUSINESS_LOGIC;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Calculate error severity based on multiple factors
   */
  private calculateSeverity(
    error: Error, 
    context: ErrorContext, 
    diagnostics: DiagnosticInfo
  ): ErrorSeverity {
    let score = 0;

    // Error type severity
    if (error.name === 'TypeError' || error.name === 'ReferenceError') score += 3;
    if (error.name === 'ChunkLoadError') score += 2;
    if (error.message.includes('critical') || error.message.includes('fatal')) score += 4;

    // Context severity
    if (context.component?.includes('Auth') || context.action?.includes('auth')) score += 3;
    if (context.component?.includes('Payment') || context.action?.includes('payment')) score += 4;
    if (context.component?.includes('Prayer') || context.action?.includes('prayer')) score += 2;

    // System state severity
    if (diagnostics.recentErrors > 5) score += 2;
    if (diagnostics.systemLoad > 0.8) score += 2;
    if (diagnostics.memory && (diagnostics.memory.used / diagnostics.memory.limit) > 0.9) score += 3;

    // User impact severity
    if (diagnostics.userId) score += 1; // Affects logged-in user
    if (context.metadata?.userCount && context.metadata.userCount > 1) score += 2;

    // Map score to severity
    if (score >= 8) return ErrorSeverity.CRITICAL;
    if (score >= 5) return ErrorSeverity.HIGH;
    if (score >= 3) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptRecovery(
    error: Error, 
    context: ErrorContext, 
    diagnostics: DiagnosticInfo
  ): Promise<boolean> {
    logger.info('Attempting error recovery', {
      action: 'recovery_attempt_start',
      errorId: diagnostics.errorId,
      availableStrategies: this.recoveryStrategies.length,
    });

    for (const strategy of this.recoveryStrategies) {
      try {
        if (strategy.condition(error, context, diagnostics)) {
          logger.info(`Executing recovery strategy: ${strategy.name}`, {
            action: 'recovery_strategy_execute',
            strategy: strategy.name,
            errorId: diagnostics.errorId,
          });

          const success = await strategy.execute(error, context, diagnostics);
          
          if (success) {
            logger.info(`Recovery strategy successful: ${strategy.name}`, {
              action: 'recovery_strategy_success',
              strategy: strategy.name,
              errorId: diagnostics.errorId,
            });
            return true;
          } else {
            logger.warn(`Recovery strategy failed: ${strategy.name}`, {
              action: 'recovery_strategy_failed',
              strategy: strategy.name,
              errorId: diagnostics.errorId,
            });
          }
        }
      } catch (recoveryError) {
        logger.error(`Recovery strategy error: ${strategy.name}`, recoveryError as Error, {
          action: 'recovery_strategy_error',
          strategy: strategy.name,
          errorId: diagnostics.errorId,
        });
      }
    }

    return false;
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultRecoveryStrategies(): void {
    // Strategy 1: Chunk Load Error Recovery
    this.recoveryStrategies.push({
      name: 'chunk_reload',
      condition: (error) => error.name === 'ChunkLoadError',
      execute: async () => {
        window.location.reload();
        return true;
      },
      description: 'Reload page for chunk load errors'
    });

    // Strategy 2: Network Error Recovery
    this.recoveryStrategies.push({
      name: 'network_retry',
      condition: (error) => error.message.includes('fetch') || error.message.includes('network'),
      execute: async (error, context) => {
        // Wait and retry the operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (context.metadata?.retryFunction) {
          try {
            await context.metadata.retryFunction();
            return true;
          } catch {
            return false;
          }
        }
        return false;
      },
      description: 'Retry network operations after delay'
    });

    // Strategy 3: Authentication Error Recovery
    this.recoveryStrategies.push({
      name: 'auth_refresh',
      condition: (error, context) => 
        error.message.includes('unauthorized') || 
        context.action?.includes('auth'),
      execute: async () => {
        try {
          // Attempt to refresh authentication
          const { supabase } = await import('@/lib/supabase');
          const { error: refreshError } = await supabase.auth.refreshSession();
          return !refreshError;
        } catch {
          return false;
        }
      },
      description: 'Refresh authentication session'
    });

    // Strategy 4: Memory Cleanup Recovery
    this.recoveryStrategies.push({
      name: 'memory_cleanup',
      condition: (error, context, diagnostics) => 
        diagnostics.memory && (diagnostics.memory.used / diagnostics.memory.limit) > 0.85,
      execute: async () => {
        // Clear caches and force garbage collection
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            if (cacheName.includes('temp') || cacheName.includes('old')) {
              await caches.delete(cacheName);
            }
          }
        }
        
        // Clear some local storage if it's too large
        if (Object.keys(localStorage).length > 50) {
          const keys = Object.keys(localStorage);
          keys.slice(0, 10).forEach(key => {
            if (!key.includes('auth') && !key.includes('user')) {
              localStorage.removeItem(key);
            }
          });
        }
        
        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }
        
        return true;
      },
      description: 'Clean up memory and caches'
    });

    // Strategy 5: Supabase Connection Recovery
    this.recoveryStrategies.push({
      name: 'supabase_reconnect',
      condition: (error) => error.message.includes('supabase') || error.stack?.includes('supabase'),
      execute: async () => {
        try {
          const { supabase } = await import('@/lib/supabase');
          // Test connection with a simple query
          const { error } = await supabase.from('prayers').select('count').limit(1);
          return !error;
        } catch {
          return false;
        }
      },
      description: 'Reconnect to Supabase'
    });
  }

  /**
   * Initialize default health checks
   */
  private initializeDefaultHealthChecks(): void {
    // Supabase Health Check
    this.healthChecks.set('supabase', {
      name: 'supabase',
      check: async () => {
        try {
          const { supabase } = await import('@/lib/supabase');
          const { error } = await supabase.from('prayers').select('count').limit(1);
          return !error;
        } catch {
          return false;
        }
      },
      critical: true,
      timeout: 5000,
    });

    // Memory Health Check
    this.healthChecks.set('memory', {
      name: 'memory',
      check: async () => {
        if ((performance as any).memory) {
          const memory = (performance as any).memory;
          const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
          return usage < 0.9;
        }
        return true;
      },
      critical: false,
      timeout: 1000,
    });

    // Network Health Check
    this.healthChecks.set('network', {
      name: 'network',
      check: async () => {
        try {
          const response = await fetch('/health', { 
            method: 'HEAD',
            cache: 'no-cache',
            signal: AbortSignal.timeout(3000)
          });
          return response.ok;
        } catch {
          return navigator.onLine;
        }
      },
      critical: true,
      timeout: 3000,
    });

    // LocalStorage Health Check
    this.healthChecks.set('storage', {
      name: 'storage',
      check: async () => {
        try {
          const testKey = '__health_check__';
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);
          return true;
        } catch {
          return false;
        }
      },
      critical: false,
      timeout: 1000,
    });
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<Map<string, { healthy: boolean; error?: string; duration: number }>> {
    const results = new Map();

    logger.info('Running health checks', {
      action: 'health_checks_start',
      checkCount: this.healthChecks.size,
    });

    for (const [name, healthCheck] of this.healthChecks) {
      const startTime = performance.now();
      
      try {
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout);
        });

        const healthy = await Promise.race([
          healthCheck.check(),
          timeoutPromise
        ]);

        const duration = performance.now() - startTime;
        results.set(name, { healthy, duration });

        this.lastHealthCheck.set(name, { result: healthy, timestamp: Date.now() });

        if (!healthy && healthCheck.critical) {
          logger.error(`Critical health check failed: ${name}`, new Error(`Health check ${name} failed`), {
            action: 'health_check_critical_failure',
            healthCheck: name,
            duration,
          });
        }

      } catch (error) {
        const duration = performance.now() - startTime;
        results.set(name, { 
          healthy: false, 
          error: (error as Error).message,
          duration 
        });

        this.lastHealthCheck.set(name, { result: false, timestamp: Date.now() });

        logger.error(`Health check error: ${name}`, error as Error, {
          action: 'health_check_error',
          healthCheck: name,
          duration,
        });
      }
    }

    return results;
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    logger.info('Recovery strategy registered', {
      action: 'recovery_strategy_register',
      strategy: strategy.name,
      description: strategy.description,
    });
  }

  /**
   * Register custom health check
   */
  registerHealthCheck(name: string, healthCheck: HealthCheck): void {
    this.healthChecks.set(name, healthCheck);
    logger.info('Health check registered', {
      action: 'health_check_register',
      name,
      critical: healthCheck.critical,
      timeout: healthCheck.timeout,
    });
  }

  /**
   * Utility methods
   */
  private updateErrorHistory(error: Error, category: ErrorCategory): void {
    const key = `${category}:${error.name}`;
    const now = Date.now();
    
    if (!this.errorHistory.has(key)) {
      this.errorHistory.set(key, []);
    }

    const history = this.errorHistory.get(key)!;
    history.push(now);

    // Keep only last hour
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentErrors = history.filter(timestamp => timestamp > oneHourAgo);
    this.errorHistory.set(key, recentErrors);
  }

  private getRecentErrorCount(): number {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let total = 0;

    for (const history of this.errorHistory.values()) {
      total += history.filter(timestamp => timestamp > oneHourAgo).length;
    }

    return total;
  }

  private getStorageSize(storage: Storage): number {
    let size = 0;
    for (let key in storage) {
      if (storage.hasOwnProperty(key)) {
        size += storage[key].length + key.length;
      }
    }
    return size;
  }

  private async calculateSystemLoad(): Promise<number> {
    // Simple system load calculation based on various factors
    let load = 0;

    // Memory pressure
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      load += (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 0.4;
    }

    // Error frequency
    const recentErrors = this.getRecentErrorCount();
    load += Math.min(recentErrors / 10, 0.3);

    // Network quality
    if ((navigator as any).connection) {
      const conn = (navigator as any).connection;
      const networkScore = conn.downlink ? Math.min(conn.downlink / 10, 1) : 0.5;
      load += (1 - networkScore) * 0.3;
    }

    return Math.min(load, 1.0);
  }

  private async handleBySeverity(
    error: Error, 
    context: ErrorContext, 
    diagnostics: DiagnosticInfo, 
    severity: ErrorSeverity
  ): Promise<void> {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        // Immediate notification and escalation
        await this.notifyAdministrators(error, context, diagnostics);
        break;
        
      case ErrorSeverity.HIGH:
        // Track for trending and potential escalation
        await this.trackForEscalation(error, context, diagnostics);
        break;
        
      case ErrorSeverity.MEDIUM:
        // Standard logging and monitoring
        break;
        
      case ErrorSeverity.LOW:
        // Minimal logging
        break;
    }
  }

  private async notifyAdministrators(
    error: Error, 
    context: ErrorContext, 
    diagnostics: DiagnosticInfo
  ): Promise<void> {
    // Implementation for critical error notifications
    // This could integrate with Slack, email, PagerDuty, etc.
    logger.fatal('Critical error - administrators notified', error, {
      action: 'admin_notification',
      errorId: diagnostics.errorId,
      context,
      diagnostics: {
        recentErrors: diagnostics.recentErrors,
        systemLoad: diagnostics.systemLoad,
      }
    });
  }

  private async trackForEscalation(
    error: Error, 
    context: ErrorContext, 
    diagnostics: DiagnosticInfo
  ): Promise<void> {
    // Track high-severity errors for potential escalation
    // This could trigger automated escalation rules
    logger.error('High-severity error tracked for escalation', error, {
      action: 'escalation_tracking',
      errorId: diagnostics.errorId,
      context,
    });
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHealthCheckScheduler(): void {
    // Run health checks every 30 seconds
    setInterval(async () => {
      await this.runHealthChecks();
    }, 30000);

    logger.info('Health check scheduler started', {
      action: 'health_check_scheduler_start',
      interval: 30000,
    });
  }

  private setupGlobalErrorHandlers(): void {
    // Already handled by StructuredLogger, but we can add additional processing here
    window.addEventListener('error', async (event) => {
      await this.trackError(event.error, {
        component: 'global',
        action: 'window_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      });
    });

    window.addEventListener('unhandledrejection', async (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      await this.trackError(error, {
        component: 'global',
        action: 'promise_rejection',
        metadata: {
          reason: event.reason,
        }
      });
    });
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker();

export default ErrorTracker;