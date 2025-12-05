import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and handle React errors gracefully.
 * Prevents the entire app from crashing when a component throws.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Log to any monitoring service here
    // e.g., datadogRum.addError(error, { componentStack: errorInfo.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 p-4 z-50">
          <div className="glass-strong rounded-3xl p-8 max-w-md text-center">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-xl text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              We encountered an unexpected error. Please try again.
            </p>
            {this.state.error && (
              <p className="text-xs text-gray-500 mb-4 font-mono bg-gray-100 p-2 rounded overflow-auto max-h-20">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleRetry}
              className="px-6 py-3 bg-gradient-to-r from-yellow-300 to-purple-300 rounded-full text-gray-800 font-medium hover:from-yellow-400 hover:to-purple-400 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
