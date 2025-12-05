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

  // Ref to track loading state for timeout (avoids stale closure)
  const loadingRef = useRef(loading)
  loadingRef.current = loading

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
    } catch (error) {
      console.error('Error initializing admin user:', error)
      setUser(null)
      setIsAdmin(false)
    } finally {
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

      // User is an admin - will be initialized by the auth state change listener
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
      console.log('Admin: Auth state changed:', event)
      if (!mounted) return

      setSession(session)

      if (session?.user) {
        // Only initialize once per session to prevent duplicate RPC calls
        // INITIAL_SESSION fires on page load, SIGNED_IN fires on login
        if (!hasInitialized || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          hasInitialized = true
          await initializeAdminUser(session.user)
        }
      } else {
        hasInitialized = false
        setUser(null)
        setIsAdmin(false)
        setLoading(false)
      }
    })

    // Safety timeout - ensure loading is false after 5 seconds (reduced from 10)
    // Uses ref to avoid stale closure capturing initial loading value
    const timeout = setTimeout(() => {
      if (mounted && loadingRef.current) {
        console.warn('Admin: Auth initialization timed out')
        setLoading(false)
      }
    }, 5000)

    return () => {
      mounted = false
      clearTimeout(timeout)
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
