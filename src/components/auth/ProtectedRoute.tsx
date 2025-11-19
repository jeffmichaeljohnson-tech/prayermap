import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { AuthModal } from './AuthModal'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * ProtectedRoute Component
 * 
 * Wrapper component for protected routes/components.
 * - Shows auth modal if user is not logged in
 * - Renders children if user is authenticated
 * - Shows loading state while checking auth
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading, initialized } = useAuthStore()
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    // Once auth is initialized, show auth modal if user is not logged in
    if (initialized && !loading && !user) {
      setShowAuthModal(true)
    } else if (user) {
      setShowAuthModal(false)
    }
  }, [user, loading, initialized])

  // Show loading state while initializing
  if (!initialized || loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen bg-heavenly-blue">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">🙏</div>
            <p className="text-gray-600 font-body">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // Show auth modal if not authenticated
  if (!user) {
    return (
      <>
        {fallback}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode="signin"
        />
      </>
    )
  }

  // User is authenticated, render children
  return <>{children}</>
}

