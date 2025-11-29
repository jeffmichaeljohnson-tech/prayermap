/**
 * PrayerMap Admin Dashboard
 * Main application component with routing
 */

import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'

import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext'
import { AdminLayout } from './components/layout/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ModerationPage } from './pages/ModerationPage'
import { PrayersPage } from './pages/PrayersPage'
import { PrayerResponsesPage } from './pages/PrayerResponsesPage'
import { UsersPage } from './pages/UsersPage'
import { AuditLogsPage } from './pages/AuditLogsPage'
import { SettingsPage } from './pages/SettingsPage'

// NOTE: QueryClient is now only in main.tsx to prevent duplicate instances

// Login Page Component
function LoginPage() {
  const navigate = useNavigate()
  const { signIn, isAdmin, loading, user } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already logged in as admin
  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate('/admin')
    }
  }, [loading, user, isAdmin, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await signIn(email, password)

    if (!result.success) {
      setError(result.error || 'Login failed')
    } else {
      navigate('/admin')
    }

    setIsLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <div className="flex justify-center text-5xl mb-4">🙏</div>
          <h2 className="text-3xl font-bold text-center text-gray-900">PrayerMap Admin</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the admin dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-600 text-center">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAdminAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/login')
    }
  }, [loading, user, isAdmin, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  return <>{children}</>
}

// Admin Layout Wrapper with auth context
function AdminLayoutWrapper() {
  const { user, signOut } = useAdminAuth()

  return (
    <AdminLayout
      userEmail={user?.email}
      userRole={user?.role as 'admin' | 'moderator'}
      onSignOut={signOut}
    />
  )
}

// Main App Component
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="prayers" element={<PrayersPage />} />
        <Route path="prayer-responses" element={<PrayerResponsesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AdminAuthProvider>
      <AppRoutes />
      <Toaster position="top-right" />
    </AdminAuthProvider>
  )
}

export default App
