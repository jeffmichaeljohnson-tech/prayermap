/**
 * Protected Admin Route Component
 *
 * Wraps admin routes to ensure only authenticated admins can access them.
 * Redirects to login if not authenticated, or to unauthorized if not an admin.
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'

interface ProtectedAdminRouteProps {
  children: React.ReactNode
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Verifying admin access...</p>
      </div>
    </div>
  )
}

/**
 * Protected route component that requires admin authentication
 */
export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { user, loading, isAdmin } = useAdminAuth()
  const location = useLocation()

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Authenticated but not an admin - redirect to unauthorized
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />
  }

  // Authenticated and is an admin - render children
  return <>{children}</>
}
