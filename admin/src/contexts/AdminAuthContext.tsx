/**
 * Admin Authentication Context
 *
 * Provides authentication state and methods for the admin dashboard.
 * Verifies users have admin privileges by checking the admin_roles table.
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AdminUser, AdminRole } from '../types/admin'

export interface AdminAuthContextType {
  user: AdminUser | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  checkAdminStatus: (userId: string) => Promise<AdminRole | null>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

interface AdminAuthProviderProps {
  children: React.ReactNode
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Refs to track state for callbacks (avoids stale closure)
  const userRef = useRef(user)
  userRef.current = user
  const isAdminRef = useRef(isAdmin)
  isAdminRef.current = isAdmin

  // Track initialization completion directly (not relying on state re-render timing)
  const initCompletedRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Check if a user has admin privileges
   * Uses a SECURITY DEFINER function to bypass RLS safely
   */
  const checkAdminStatus = async (userId: string): Promise<AdminRole | null> => {
    try {
      console.log('Admin: Checking admin status for user:', userId)

      // Use RPC function that bypasses RLS to check admin status
      const { data, error } = await supabase
        .rpc('check_user_admin_role', { check_user_id: userId })

      if (error) {
        console.error('Admin: Error checking admin status:', error.message)
        return null
      }

      // Function returns null if not an admin, or the role string if admin
      if (!data) {
        console.log('Admin: User is not an admin')
        return null
      }

      console.log('Admin: User role found:', data)
      return data as AdminRole
    } catch (error) {
      console.error('Admin: Exception checking admin status:', error)
      return null
    }
  }

  /**
   * Initialize admin user from auth user
   */
  const initializeAdminUser = async (authUser: User) => {
    setLoading(true)

    try {
      // Check if user is an admin
      const role = await checkAdminStatus(authUser.id)

      if (!role) {
        // User is authenticated but not an admin
        setIsAdmin(false)
        setUser(null)
        setLoading(false)
        return
      }

      // User is an admin
      const adminUser: AdminUser = {
        id: authUser.id,
        email: authUser.email || '',
        role,
        createdAt: authUser.created_at,
        user: authUser,
      }

      setUser(adminUser)
      setIsAdmin(true)
      console.log('Admin: User initialized successfully')
    } catch (error) {
      console.error('Error initializing admin user:', error)
      setUser(null)
      setIsAdmin(false)
    } finally {
      // Mark initialization as complete and clear timeout
      initCompletedRef.current = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setLoading(false)
    }
  }

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)

      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'No user data returned' }
      }

      // Check if user is an admin
      const role = await checkAdminStatus(data.user.id)

      if (!role) {
        // User authenticated but not an admin - sign them out
        await supabase.auth.signOut()
        return { success: false, error: 'You do not have admin privileges' }
      }

      // User is an admin - set state directly to avoid race condition
      // Don't rely on auth listener since we're about to navigate
      const adminUser: AdminUser = {
        id: data.user.id,
        email: data.user.email || '',
        role,
        createdAt: data.user.created_at,
        user: data.user,
      }

      // CRITICAL: Update refs IMMEDIATELY before state updates
      // This prevents race condition where auth listener fires before React re-renders
      // and sees stale ref values (null user, false isAdmin)
      userRef.current = adminUser
      isAdminRef.current = true
      initCompletedRef.current = true

      // Now update React state (these are batched and async)
      setUser(adminUser)
      setSession(data.session)
      setIsAdmin(true)

      // Clear timeout since initialization is complete
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      console.log('Admin: Sign in successful')
      return { success: true }
    } catch (error) {
      console.error('Sign in error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setIsAdmin(false)
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Initialize auth state and set up auth listener
   * OPTIMIZED: Uses hasInitialized flag to prevent duplicate RPC calls
   */
  useEffect(() => {
    let mounted = true
    let hasInitialized = false // Track if we've already initialized to prevent duplicate calls

    // Listen for auth changes - this handles BOTH initial session AND subsequent changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Admin: Auth state changed:', event, 'session:', !!session)
      if (!mounted) return

      // IMPORTANT: Only process SIGNED_OUT event for logout
      // Other events with null session should be ignored if we have a valid user
      // This prevents spurious logout from browser timing issues
      if (event === 'SIGNED_OUT') {
        console.log('Admin: User signed out')
        hasInitialized = false
        setSession(null)
        setUser(null)
        setIsAdmin(false)
        setLoading(false)
        return
      }

      // If session is null but we already have a user, ignore this event
      // This protects against browser quirks and timing issues
      if (!session?.user && userRef.current && isAdminRef.current) {
        console.log('Admin: Ignoring null session event - user already authenticated')
        return
      }

      setSession(session)

      if (session?.user) {
        // Skip initialization if:
        // 1. Already initialized this session, OR
        // 2. User was just set by signIn (check if user.id matches via refs)
        // This prevents race conditions and duplicate RPC calls
        // Uses refs to get current values (not stale closure values)
        const alreadySetBySignIn = userRef.current?.id === session.user.id && isAdminRef.current

        console.log('Admin: Auth check - hasInitialized:', hasInitialized,
          'alreadySetBySignIn:', alreadySetBySignIn,
          'userRef.id:', userRef.current?.id,
          'session.user.id:', session.user.id,
          'isAdminRef:', isAdminRef.current)

        if (!hasInitialized && !alreadySetBySignIn) {
          hasInitialized = true
          console.log('Admin: Initializing user from auth listener')
          await initializeAdminUser(session.user)
        } else if (event === 'TOKEN_REFRESHED') {
          // Only re-initialize on token refresh (not on SIGNED_IN since signIn handles that)
          console.log('Admin: Re-initializing due to token refresh')
          await initializeAdminUser(session.user)
        } else {
          // User already initialized, just make sure loading is false
          console.log('Admin: User already initialized, skipping')
          setLoading(false)
        }
      } else {
        // No session and no existing user - this is initial state
        hasInitialized = false
        setUser(null)
        setIsAdmin(false)
        setLoading(false)
      }
    })

    // Safety timeout - ensure loading is false after 5 seconds
    // Only fires if initialization hasn't completed yet
    timeoutRef.current = setTimeout(() => {
      if (mounted && !initCompletedRef.current) {
        console.warn('Admin: Auth initialization timed out - forcing loading to false')
        setLoading(false)
      }
    }, 5000)

    return () => {
      mounted = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      subscription.unsubscribe()
    }
  }, [])

  const value: AdminAuthContextType = {
    user,
    session,
    loading,
    isAdmin,
    signIn,
    signOut,
    checkAdminStatus,
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

/**
 * Hook to use admin auth context
 */
export function useAdminAuth() {
  const context = useContext(AdminAuthContext)

  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }

  return context
}
