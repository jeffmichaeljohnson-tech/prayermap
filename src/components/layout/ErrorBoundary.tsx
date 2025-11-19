import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary Component
 * 
 * Catches React errors and displays a fallback UI
 * Prevents entire app from crashing on component errors
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-heavenly-blue">
          <div className="glass-card p-8 max-w-md mx-4 text-center">
            <div className="text-4xl mb-4">🙏</div>
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 font-body mb-6">
              {this.state.error?.message ||
                'An unexpected error occurred. Please refresh the page.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-primary-blue to-primary-purple text-white py-3 rounded-full font-semibold hover:shadow-lg transition"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

