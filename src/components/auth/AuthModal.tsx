import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'signin' | 'signup'
  showSkipOption?: boolean
}

type AuthMode = 'signin' | 'signup'

/**
 * AuthModal Component
 * 
 * Beautiful, sacred, frictionless authentication experience
 * - Glassmorphic design with heavenly gradient background
 * - Smooth transitions between Sign Up/Sign In
 * - Password visibility toggle
 * - User-friendly error messages
 * - Optimized form UX (autofocus, tab order, Enter key)
 * - Loading states with spinner
 * - Typography: Cinzel for headings, Inter for body
 */
export function AuthModal({ isOpen, onClose, defaultMode = 'signin', showSkipOption = false }: AuthModalProps) {
  console.log('[AuthModal] RENDERING - isOpen:', isOpen, 'defaultMode:', defaultMode, 'showSkipOption:', showSkipOption)
  
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const { signUp, signIn, loading } = useAuth()
  const emailInputRef = useRef<HTMLInputElement>(null)
  const firstNameInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode)
      setEmail('')
      setPassword('')
      setFirstName('')
      setShowPassword(false)
      setError(null)
      setIsTransitioning(false)
    }
  }, [isOpen, defaultMode])

  // Autofocus appropriate field when mode changes
  useEffect(() => {
    if (isOpen && !isTransitioning) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        if (mode === 'signup' && firstNameInputRef.current) {
          firstNameInputRef.current.focus()
        } else if (emailInputRef.current) {
          emailInputRef.current.focus()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [mode, isOpen, isTransitioning])

  // Handle mode transition with smooth animation
  const handleModeSwitch = (newMode: AuthMode) => {
    setIsTransitioning(true)
    setError(null)
    setTimeout(() => {
      setMode(newMode)
      setIsTransitioning(false)
    }, 150)
  }

  // Format error messages to be user-friendly
  const formatError = (errorMessage: string): string => {
    const lowerMessage = errorMessage.toLowerCase()
    
    // Email already registered
    if (lowerMessage.includes('already registered') || lowerMessage.includes('user already exists')) {
      return 'Already have an account? Sign in'
    }
    
    // Invalid credentials
    if (lowerMessage.includes('invalid') && lowerMessage.includes('password')) {
      return 'Password must be at least 6 characters'
    }
    
    if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('email or password')) {
      return 'Invalid email or password. Please try again.'
    }
    
    // Email format
    if (lowerMessage.includes('email') && (lowerMessage.includes('invalid') || lowerMessage.includes('format'))) {
      return 'Please enter a valid email address'
    }
    
    // Password too short
    if (lowerMessage.includes('password') && (lowerMessage.includes('short') || lowerMessage.includes('6'))) {
      return 'Password must be at least 6 characters'
    }
    
    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'Connection error. Please check your internet and try again.'
    }
    
    // Default: return original message but make it friendlier
    return errorMessage
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === 'signup') {
        if (!firstName.trim()) {
          setError('Please enter your first name')
          setIsSubmitting(false)
          return
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setIsSubmitting(false)
          return
        }

        const { error } = await signUp({ email, password, firstName })
        
        if (error) {
          setError(formatError(error.message || 'Failed to create account'))
        } else {
          // Success - modal will close via onClose
          onClose()
        }
      } else {
        const { error } = await signIn({ email, password })
        
        if (error) {
          setError(formatError(error.message || 'Failed to sign in'))
        } else {
          // Success - modal will close via onClose
          onClose()
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Auth error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    console.log('[AuthModal] NOT RENDERING - isOpen is false')
    return null
  }

  console.log('[AuthModal] RENDERING - Returning modal JSX')
  console.log('[AuthModal] Props - isOpen:', isOpen, 'defaultMode:', defaultMode, 'showSkipOption:', showSkipOption)
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        zIndex: 9998,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Beautiful Gradient Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #E8F4F8 0%, #F7E7CE 50%, #D4C5F9 100%)',
        }}
        aria-hidden="true"
      />
      
      {/* Subtle Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />

      {/* Backdrop - Semi-transparent with blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[8px] transition-opacity duration-300"
        onClick={showSkipOption ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Card - Enhanced Glassmorphic Design */}
      <div 
        className={`relative w-full max-w-md p-8 transition-all duration-300 ${
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15), 0 20px 60px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {!showSkipOption && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 transition-all duration-fast rounded-lg hover:bg-heavenly-blue/50 text-text-muted hover:text-text-primary"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}

        {/* Header with Sacred Typography */}
        <div className={`mb-8 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <h2 
            className="text-2xl font-display font-semibold mb-2 text-text-primary"
            style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            {mode === 'signup' ? 'Join PrayerMap' : 'Welcome Back'}
          </h2>
          <p 
            className="text-sm text-text-secondary"
            style={{
              fontFamily: "'Inter', sans-serif",
              lineHeight: '1.5',
            }}
          >
            {mode === 'signup' 
              ? 'See prayer needs near you. Pray. Press.'
              : 'Continue praying with your community'}
          </p>
        </div>

        {/* Error message - Kind and Clear */}
        {error && (
          <div 
            className={`mb-6 p-4 bg-red-50/80 border border-red-200/50 rounded-lg backdrop-blur-sm transition-all duration-300 ${
              error ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <p 
              className="text-sm text-red-700"
              style={{
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {error}
            </p>
            {/* Show helpful action if email already registered */}
            {error.includes('Already have an account') && (
              <button
                type="button"
                onClick={() => handleModeSwitch('signin')}
                className="mt-2 text-sm font-semibold text-prayer-purple hover:text-prayer-purple/80 transition-colors"
              >
                Switch to Sign In →
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={`space-y-5 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {/* First Name (sign up only) */}
          {mode === 'signup' && (
            <div>
              <label 
                htmlFor="firstName" 
                className="block text-xs font-medium mb-2 text-text-secondary uppercase tracking-wider"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.05em',
                }}
              >
                First Name
              </label>
              <input
                ref={firstNameInputRef}
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isSubmitting || loading}
                className="w-full px-4 py-3 bg-heavenly-blue/50 border border-transparent rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-prayer-purple focus:border-prayer-purple disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-fast placeholder:text-text-muted/50"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: '#2C3E50',
                }}
                placeholder="John"
                autoComplete="given-name"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label 
              htmlFor="email" 
              className="block text-xs font-medium mb-2 text-text-secondary uppercase tracking-wider"
              style={{
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.05em',
              }}
            >
              Email
            </label>
            <input
              ref={emailInputRef}
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting || loading}
              className="w-full px-4 py-3 bg-heavenly-blue/50 border border-transparent rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-prayer-purple focus:border-prayer-purple disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-fast placeholder:text-text-muted/50"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: '#2C3E50',
              }}
              placeholder="you@example.com"
              autoComplete={mode === 'signup' ? 'email' : 'email'}
            />
          </div>

          {/* Password with Visibility Toggle */}
          <div>
            <label 
              htmlFor="password" 
              className="block text-xs font-medium mb-2 text-text-secondary uppercase tracking-wider"
              style={{
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.05em',
              }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting || loading}
                className="w-full px-4 py-3 pr-12 bg-heavenly-blue/50 border border-transparent rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-prayer-purple focus:border-prayer-purple disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-fast placeholder:text-text-muted/50"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: '#2C3E50',
                }}
                placeholder="••••••••"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting || loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-text-primary transition-colors duration-fast disabled:opacity-50"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit button with Loading State */}
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full py-4 mt-6 bg-gradient-to-r from-prayer-purple to-prayer-purple/90 border-2 border-prayer-purple text-white rounded-xl shadow-[0_4px_12px_rgba(212,197,249,0.3)] hover:shadow-[0_12px_24px_rgba(212,197,249,0.4)] hover:from-prayer-purple hover:to-prayer-purple transition-all duration-smooth disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            {isSubmitting || loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {mode === 'signup' ? 'Creating Account...' : 'Signing In...'}
              </span>
            ) : (
              mode === 'signup' ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Footer links with Smooth Transitions */}
        <div 
          className={`mt-8 pt-6 border-t transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ borderColor: 'rgba(0, 0, 0, 0.08)' }}
        >
          {mode === 'signin' ? (
            <div className="text-center">
              <p 
                className="text-sm text-text-secondary"
                style={{
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signup')}
                  className="font-semibold text-prayer-purple hover:text-prayer-purple/80 transition-colors duration-fast"
                  disabled={isSubmitting || loading}
                >
                  Sign up
                </button>
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p 
                className="text-sm text-text-secondary"
                style={{
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signin')}
                  className="font-semibold text-prayer-purple hover:text-prayer-purple/80 transition-colors duration-fast"
                  disabled={isSubmitting || loading}
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* Skip for now option */}
          {showSkipOption && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(0, 0, 0, 0.08)' }}>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-fast"
              >
                Skip for now
              </button>
              <p 
                className="text-xs text-center mt-2 text-text-muted"
                style={{
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                You can explore the map. Sign in to create or support prayers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
