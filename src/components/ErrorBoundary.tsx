/**
 * React Error Boundary with:
 * - Multiple recovery strategies
 * - Error reporting integration
 * - User-friendly fallback UI
 * - Automatic retry mechanism
 * - Component-level and app-level variants
 */

import { Component, ErrorInfo, ReactNode, useState, useCallback } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  retryDelay?: number;
  level?: 'component' | 'route' | 'app';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, maxRetries = 3, retryDelay = 1000 } = this.props;
    const { retryCount } = this.state;

    // Log error
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error in onError handler:', handlerError);
      }
    }

    // Report to error tracking service
    this.reportError(error, errorInfo);

    // Auto-retry for certain errors
    if (this.shouldAutoRetry(error) && retryCount < maxRetries) {
      const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff
      console.log(`Auto-retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

      this.retryTimeout = setTimeout(() => {
        this.setState((prevState) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prevState.retryCount + 1,
        }));
      }, delay);
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private shouldAutoRetry(error: Error): boolean {
    // Auto-retry for network errors and chunk loading failures
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('loading chunk') ||
      message.includes('dynamically imported module')
    );
  }

  private reportError(error: Error, errorInfo: ErrorInfo): void {
    // In production, send to error tracking service
    // For now, log to console
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Send to analytics/monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, etc.
      console.log('Error report:', errorReport);
    }
  }

  private reset = (): void => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.reset);
        }
        return fallback;
      }

      // Default fallback UI based on level
      return this.renderDefaultFallback(error, level);
    }

    return children;
  }

  private renderDefaultFallback(error: Error, level: string): ReactNode {
    if (level === 'app') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-6">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="w-full mb-6 p-4 bg-red-50 border border-red-200 rounded text-left">
                  <p className="text-sm font-mono text-red-800 break-all">
                    {error.message}
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={this.reset}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 mb-1">
              An error occurred
            </h3>
            <p className="text-sm text-red-700 mb-3">
              {error.message || 'Something went wrong with this component.'}
            </p>
            <button
              onClick={this.reset}
              className="text-sm text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * HOC version of ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Hook for error handling within components
 */
export function useErrorHandler(): {
  error: Error | null;
  handleError: (error: Error) => void;
  clearError: () => void;
} {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    setError(error);

    // Report error
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking service
      console.log('Error report:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }

    // Re-throw to let error boundary catch it
    throw error;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

/**
 * App-level error boundary with full-screen fallback
 */
export function AppErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      level="app"
      maxRetries={2}
      retryDelay={2000}
      onError={(error, errorInfo) => {
        // Log to error tracking service
        console.error('App-level error:', { error, errorInfo });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Route-level error boundary with contextual fallback
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  const handleRouteError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('Route-level error:', { error, errorInfo });
  };

  const routeFallback = (error: Error, reset: () => void) => (
    <div className="min-h-[400px] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Page Error
          </h2>
          <p className="text-gray-600 mb-4">
            This page encountered an error and couldn't load properly.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-left">
              <p className="text-xs font-mono text-orange-800 break-all">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      level="route"
      maxRetries={1}
      retryDelay={1000}
      onError={handleRouteError}
      fallback={routeFallback}
    >
      {children}
    </ErrorBoundary>
  );
}
