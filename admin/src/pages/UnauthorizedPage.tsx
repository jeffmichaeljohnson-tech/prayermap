/**
 * Unauthorized Access Page
 *
 * Displayed when a user is authenticated but does not have admin privileges.
 */

import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'

export function UnauthorizedPage() {
  const navigate = useNavigate()
  const { signOut, user } = useAdminAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-red-100">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 p-3">
              <svg
                className="h-12 w-12 text-red-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">
              You do not have admin privileges to access this dashboard.
            </p>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-gray-50 rounded-md p-4 mb-6 border border-gray-200">
              <p className="text-sm text-gray-600">
                Currently signed in as:
              </p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {user.email}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Sign out and try a different account
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Go to main app
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              If you believe you should have admin access, please contact your
              system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
