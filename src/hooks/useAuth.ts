import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { AuthError, User, Session } from '@supabase/supabase-js'

interface SignUpCredentials {
  email: string
  password: string
  firstName: string
}

interface SignInCredentials {
  email: string
  password: string
}

interface AuthHookReturn {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  signUp: (credentials: SignUpCredentials) => Promise<{ error: AuthError | null }>
  signIn: (credentials: SignInCredentials) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}

/**
 * useAuth Hook
 * 
 * Provides authentication functionality:
 * - signUp: Creates user account and profile
 * - signIn: Authenticates user
 * - signOut: Signs out current user
 * - Listens to auth state changes
 * - Proper error handling
 */
export function useAuth(): AuthHookReturn {
  const { user, session, loading, error, setError, initialized, initialize } = useAuthStore()
  const [authLoading, setAuthLoading] = useState(false)

  // Initialize auth on mount
  useEffect(() => {
    console.log('[useAuth] Initializing authentication...')
    if (!initialized) {
      initialize().then(() => {
        console.log('[useAuth] Authentication initialized')
      })
    }
  }, [initialized, initialize])

  // Listen to auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[useAuth] Auth state changed:', session?.user?.email || 'no user')
      useAuthStore.getState().setSession(session)
      useAuthStore.getState().setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async ({ email, password, firstName }: SignUpCredentials) => {
    try {
      setAuthLoading(true)
      setError(null)

      // Sign up user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return { error: signUpError }
      }

      // Create user profile in users table
      if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
          user_id: data.user.id,
          first_name: firstName,
          email: email,
        })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
          setError('Account created but profile setup failed. Please contact support.')
          return { error: profileError as AuthError }
        }
      }

      return { error: null }
    } catch (error) {
      const authError = error as AuthError
      setError(authError.message || 'An unexpected error occurred')
      return { error: authError }
    } finally {
      setAuthLoading(false)
    }
  }, [setError])

  const signIn = useCallback(async ({ email, password }: SignInCredentials) => {
    try {
      setAuthLoading(true)
      setError(null)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return { error: signInError }
      }

      // Update store with new session
      useAuthStore.getState().setSession(data.session)
      useAuthStore.getState().setUser(data.user)

      return { error: null }
    } catch (error) {
      const authError = error as AuthError
      setError(authError.message || 'An unexpected error occurred')
      return { error: authError }
    } finally {
      setAuthLoading(false)
    }
  }, [setError])

  const signOut = useCallback(async () => {
    try {
      setAuthLoading(true)
      setError(null)

      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        setError(signOutError.message)
        return { error: signOutError }
      }

      // Clear store
      useAuthStore.getState().setSession(null)
      useAuthStore.getState().setUser(null)

      return { error: null }
    } catch (error) {
      const authError = error as AuthError
      setError(authError.message || 'An unexpected error occurred')
      return { error: authError }
    } finally {
      setAuthLoading(false)
    }
  }, [setError])

  return {
    user,
    session,
    loading: loading || authLoading,
    error,
    signUp,
    signIn,
    signOut,
  }
}

