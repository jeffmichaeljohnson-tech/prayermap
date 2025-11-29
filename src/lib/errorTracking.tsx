/**
 * Error Tracking and Reporting
 *
 * Features:
 * - Automatic error capture
 * - Error deduplication
 * - Context enrichment
 * - User feedback collection
 * - Error grouping/fingerprinting
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from './logger';

export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    userId?: string;
    sessionId?: string;
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    correlationId?: string;
  };
  breadcrumbs: Breadcrumb[];
  tags: Record<string, string>;
  extra: Record<string, unknown>;
  fingerprint?: string;
}

export interface Breadcrumb {
  timestamp: string;
  category: 'navigation' | 'click' | 'xhr' | 'console' | 'error' | 'custom';
  message: string;
  data?: Record<string, unknown>;
  level: 'info' | 'warning' | 'error';
}

class ErrorTracker {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private errors: ErrorReport[] = [];
  private maxErrors = 100;
  private userId: string | null = null;
  private sessionId: string;
  private tags: Record<string, string> = {};
  private extra: Record<string, unknown> = {};
  private errorFingerprints = new Set<string>();

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  // Initialize error tracking
  init(): void {
    // Global error handler
    window.addEventListener('error', this.handleGlobalError);

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    // Instrument console
    this.instrumentConsole();

    // Instrument fetch
    this.instrumentFetch();

    // Instrument navigation
    this.instrumentNavigation();

    // Add initial breadcrumb
    this.addBreadcrumb({
      category: 'custom',
      message: 'Error tracking initialized',
      level: 'info',
    });

    logger.info('Error tracking initialized', {
      action: 'error_tracking_init',
      metadata: { sessionId: this.sessionId },
    });
  }

  // Capture exception manually
  captureException(error: Error, context?: Record<string, unknown>): string {
    const errorReport = this.createErrorReport(error, context);

    // Check for duplicate errors using fingerprint
    if (this.errorFingerprints.has(errorReport.fingerprint!)) {
      logger.debug('Duplicate error ignored', {
        action: 'error_duplicate',
        metadata: { fingerprint: errorReport.fingerprint },
      });
      return errorReport.id;
    }

    this.errorFingerprints.add(errorReport.fingerprint!);
    this.errors.push(errorReport);

    // Maintain circular buffer
    if (this.errors.length > this.maxErrors) {
      const removed = this.errors.shift();
      if (removed?.fingerprint) {
        this.errorFingerprints.delete(removed.fingerprint);
      }
    }

    // Log to logger
    logger.error('Exception captured', error, {
      action: 'error_captured',
      metadata: {
        errorId: errorReport.id,
        fingerprint: errorReport.fingerprint,
        ...context,
      },
    });

    // Store in localStorage for persistence
    this.persistErrors();

    return errorReport.id;
  }

  // Add breadcrumb
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Maintain circular buffer
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    logger.debug('Breadcrumb added', {
      action: 'breadcrumb_added',
      metadata: { breadcrumb: fullBreadcrumb },
    });
  }

  // Set user context
  setUser(userId: string | null): void {
    this.userId = userId;
    logger.info('User context set', {
      action: 'error_tracker_user_set',
      userId: userId || undefined,
    });
  }

  // Set tags
  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  // Set extra context
  setExtra(key: string, value: unknown): void {
    this.extra[key] = value;
  }

  // Get error report for display/debugging
  getRecentErrors(limit = 10): ErrorReport[] {
    return this.errors.slice(-limit).reverse();
  }

  // Get all errors
  getAllErrors(): ErrorReport[] {
    return [...this.errors];
  }

  // Clear stored errors
  clearErrors(): void {
    this.errors = [];
    this.errorFingerprints.clear();
    this.breadcrumbs = [];
    localStorage.removeItem('prayermap_errors');
    logger.info('Error tracking cleared', { action: 'error_tracking_cleared' });
  }

  // Export errors as JSON
  exportErrors(): string {
    return JSON.stringify(
      {
        errors: this.errors,
        breadcrumbs: this.breadcrumbs,
        sessionId: this.sessionId,
        userId: this.userId,
        tags: this.tags,
      },
      null,
      2
    );
  }

  // Private methods

  private handleGlobalError = (event: ErrorEvent): void => {
    const error = event.error || new Error(event.message);

    this.addBreadcrumb({
      category: 'error',
      message: `Global error: ${event.message}`,
      level: 'error',
      data: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });

    this.captureException(error, {
      type: 'global_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    this.addBreadcrumb({
      category: 'error',
      message: `Unhandled rejection: ${error.message}`,
      level: 'error',
    });

    this.captureException(error, {
      type: 'unhandled_rejection',
      reason: event.reason,
    });
  };

  private instrumentConsole(): void {
    const originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      this.addBreadcrumb({
        category: 'console',
        message: args.map(arg => String(arg)).join(' '),
        level: 'error',
      });

      originalConsoleError.apply(console, args);
    };

    const originalConsoleWarn = console.warn;

    console.warn = (...args: unknown[]) => {
      this.addBreadcrumb({
        category: 'console',
        message: args.map(arg => String(arg)).join(' '),
        level: 'warning',
      });

      originalConsoleWarn.apply(console, args);
    };
  }

  private instrumentFetch(): void {
    const originalFetch = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;

      this.addBreadcrumb({
        category: 'xhr',
        message: `Fetch: ${url}`,
        level: 'info',
        data: {
          url,
          method: args[1]?.method || 'GET',
        },
      });

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;

        this.addBreadcrumb({
          category: 'xhr',
          message: `Fetch completed: ${url}`,
          level: response.ok ? 'info' : 'warning',
          data: {
            url,
            status: response.status,
            statusText: response.statusText,
            duration,
          },
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        this.addBreadcrumb({
          category: 'xhr',
          message: `Fetch failed: ${url}`,
          level: 'error',
          data: {
            url,
            duration,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        throw error;
      }
    };
  }

  private instrumentNavigation(): void {
    // Track navigation changes
    let currentPath = window.location.pathname;

    const checkNavigation = () => {
      if (window.location.pathname !== currentPath) {
        this.addBreadcrumb({
          category: 'navigation',
          message: `Navigation: ${currentPath} -> ${window.location.pathname}`,
          level: 'info',
          data: {
            from: currentPath,
            to: window.location.pathname,
          },
        });

        currentPath = window.location.pathname;
      }
    };

    // Check for navigation changes
    setInterval(checkNavigation, 1000);

    // Track initial page load
    this.addBreadcrumb({
      category: 'navigation',
      message: `Page loaded: ${window.location.pathname}`,
      level: 'info',
      data: {
        url: window.location.href,
        referrer: document.referrer,
      },
    });
  }

  private createErrorReport(
    error: Error,
    context?: Record<string, unknown>
  ): ErrorReport {
    const id = this.generateErrorId();
    const fingerprint = this.generateFingerprint(error);

    return {
      id,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        userId: this.userId || undefined,
        sessionId: this.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        correlationId: logger.getCorrelationId(),
      },
      breadcrumbs: [...this.breadcrumbs],
      tags: { ...this.tags },
      extra: { ...this.extra, ...context },
      fingerprint,
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateFingerprint(error: Error): string {
    // Create a fingerprint based on error name, message, and stack
    const parts = [
      error.name,
      error.message,
      // Use first few lines of stack trace for grouping
      ...(error.stack?.split('\n').slice(0, 3) || []),
    ];

    return this.hashString(parts.join('|'));
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private persistErrors(): void {
    try {
      localStorage.setItem(
        'prayermap_errors',
        JSON.stringify({
          errors: this.errors.slice(-20), // Store last 20 errors
          sessionId: this.sessionId,
        })
      );
    } catch (error) {
      // Storage might be full
      logger.warn('Failed to persist errors', {
        action: 'error_persist_failed',
        metadata: { error },
      });
    }
  }

  private loadPersistedErrors(): void {
    try {
      const stored = localStorage.getItem('prayermap_errors');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.errors && Array.isArray(data.errors)) {
          this.errors = data.errors;
          // Rebuild fingerprint set
          data.errors.forEach((err: ErrorReport) => {
            if (err.fingerprint) {
              this.errorFingerprints.add(err.fingerprint);
            }
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to load persisted errors', {
        action: 'error_load_failed',
        metadata: { error },
      });
    }
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// React Error Boundary
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Capture the error
    errorTracker.captureException(error, {
      componentStack: errorInfo.componentStack,
      type: 'react_error_boundary',
    });

    // Store error info in state
    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    logger.error('React Error Boundary caught error', error, {
      action: 'error_boundary',
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-lg">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We've been notified and are looking into it.
            </p>
            {import.meta.env.DEV && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                  Error details (dev only)
                </summary>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-yellow-300 to-purple-300 rounded-full text-gray-800 font-medium hover:shadow-lg transition-all"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC to wrap component with error tracking
export function withErrorTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary
        onError={(error) => {
          errorTracker.addBreadcrumb({
            category: 'error',
            message: `Error in ${componentName || Component.name}`,
            level: 'error',
          });
        }}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorTracking(${componentName || Component.name})`;

  return WrappedComponent;
}
