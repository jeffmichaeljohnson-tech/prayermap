/**
 * Example Admin App.tsx
 *
 * This file shows how to set up the admin dashboard with authentication.
 * Copy this to App.tsx and customize as needed.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { LoginPage } from './pages/LoginPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'

// Import your admin pages here
// import { DashboardPage } from './pages/DashboardPage'
// import { PrayersPage } from './pages/PrayersPage'
// import { UsersPage } from './pages/UsersPage'
// etc.

function App() {
  return (
    <AdminAuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected admin routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedAdminRoute>
                <div className="p-8">
                  <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                  <p className="mt-4">Welcome to the admin dashboard!</p>
                </div>
              </ProtectedAdminRoute>
            }
          />

          {/* Add more protected routes as needed */}
          {/*
          <Route
            path="/prayers"
            element={
              <ProtectedAdminRoute>
                <PrayersPage />
              </ProtectedAdminRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedAdminRoute>
                <UsersPage />
              </ProtectedAdminRoute>
            }
          />
          */}

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 page */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900">404</h1>
                  <p className="mt-2 text-gray-600">Page not found</p>
                  <a href="/dashboard" className="mt-4 text-indigo-600 hover:text-indigo-500">
                    Go to dashboard
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </Router>
    </AdminAuthProvider>
  )
}

export default App
