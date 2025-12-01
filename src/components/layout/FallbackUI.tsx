/**
 * User-friendly error fallback UIs:
 * - Generic error
 * - Network error
 * - Permission error
 * - Not found
 * - Maintenance mode
 */

export interface FallbackProps {
  retry?: () => void;
}

/**
 * Generic error fallback
 */
export function GenericErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h2>

          <p className="text-gray-600 mb-6">
            We encountered an unexpected error. Please try again.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-sm font-semibold text-red-800 mb-2">Error Details:</p>
              <p className="text-xs font-mono text-red-700 break-all">
                {error.message}
              </p>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Network error fallback
 */
export function NetworkErrorFallback({ retry }: { retry: () => void }): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-orange-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connection Lost
          </h2>

          <p className="text-gray-600 mb-2">
            We're having trouble connecting to the server.
          </p>

          <p className="text-sm text-gray-500 mb-6">
            Please check your internet connection and try again.
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={retry}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Retry Connection
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Permission error fallback
 */
export function PermissionErrorFallback({
  permission,
  retry,
}: {
  permission: 'camera' | 'microphone' | 'location';
  retry: () => void;
}): JSX.Element {
  const permissionDetails = {
    camera: {
      icon: (
        <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      title: 'Camera Access Required',
      description: 'This feature requires access to your camera to record video prayers.',
    },
    microphone: {
      icon: (
        <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      ),
      title: 'Microphone Access Required',
      description: 'This feature requires access to your microphone to record audio.',
    },
    location: {
      icon: (
        <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      title: 'Location Access Required',
      description: 'This feature requires access to your location to place prayers on the map.',
    },
  };

  const details = permissionDetails[permission];

  return (
    <div className="flex items-center justify-center min-h-[300px] p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            {details.icon}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">{details.title}</h2>

          <p className="text-gray-600 mb-6">{details.description}</p>

          <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 mb-2 font-medium">How to enable:</p>
            <ol className="text-sm text-blue-700 text-left list-decimal list-inside space-y-1">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find the {permission} permission</li>
              <li>Change it to "Allow"</li>
              <li>Click "Try Again" below</li>
            </ol>
          </div>

          <button
            onClick={retry}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Not found fallback
 */
export function NotFoundFallback(): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Page Not Found</h2>
          <p className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go Back
          </button>

          <button
            onClick={() => (window.location.href = '/')}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Maintenance mode fallback
 */
export function MaintenanceFallback(): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Under Maintenance
          </h1>

          <p className="text-gray-600 mb-2">
            We're currently performing scheduled maintenance.
          </p>

          <p className="text-sm text-gray-500 mb-6">
            We'll be back up and running shortly. Thank you for your patience!
          </p>

          <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Follow us on social media for updates on when we'll be back online.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading fallback
 */
export function LoadingFallback(): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[300px] p-6">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Offline indicator
 */
export function OfflineIndicator(): JSX.Element {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white py-2 px-4 text-center text-sm font-medium">
      <div className="flex items-center justify-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
        <span>You're currently offline. Some features may not be available.</span>
      </div>
    </div>
  );
}

/**
 * Error toast notification
 */
export function ErrorToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}): JSX.Element {
  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-red-600 text-white rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-up z-50">
      <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="flex-1">
        <p className="font-medium mb-1">Error</p>
        <p className="text-sm opacity-90">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

/**
 * Success toast notification
 */
export function SuccessToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}): JSX.Element {
  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-green-600 text-white rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-up z-50">
      <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="flex-1">
        <p className="font-medium mb-1">Success</p>
        <p className="text-sm opacity-90">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
