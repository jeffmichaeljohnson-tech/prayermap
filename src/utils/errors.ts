/**
 * Error handling utilities
 */

export interface AppError {
  message: string
  code?: string
  details?: string
  statusCode?: number
}

/**
 * Create standardized error object
 */
export function createError(
  message: string,
  code?: string,
  details?: string,
  statusCode?: number
): AppError {
  return {
    message,
    code,
    details,
    statusCode,
  }
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return 'An unknown error occurred'
}

/**
 * Extract error code from Supabase error
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code)
  }
  return undefined
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('NetworkError')
    )
  }
  return false
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const code = getErrorCode(error)
  return (
    code === 'PGRST301' ||
    code === '401' ||
    getErrorMessage(error).toLowerCase().includes('unauthorized') ||
    getErrorMessage(error).toLowerCase().includes('authentication')
  )
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): string {
  const message = getErrorMessage(error)

  // Map common error messages to user-friendly ones
  if (isNetworkError(error)) {
    return 'Network error. Please check your connection and try again.'
  }

  if (isAuthError(error)) {
    return 'Authentication required. Please sign in to continue.'
  }

  // Return original message if no mapping found
  return message
}

/**
 * Log error to console (and potentially error tracking service)
 */
export function logError(error: unknown, context?: string): void {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)

  console.error(`[${context || 'Error'}]`, {
    message,
    code,
    error,
    timestamp: new Date().toISOString(),
  })

  // TODO: Integrate with error tracking service (e.g., Sentry)
  // if (window.Sentry) {
  //   window.Sentry.captureException(error, { contexts: { context } })
  // }
}




