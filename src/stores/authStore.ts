import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  initialized: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  initialize: () => Promise<void>
  signOut: () => Promise<void>
}

/**
 * Auth Store (Zustand)
 * 
 * Manages authentication state:
 * - user: Current authenticated user
 * - session: Current session
 * - loading: Loading state
 * - error: Error message
 * - Actions: setUser, setSession, setLoading, setError
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,
  initialized: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  initialize: async () => {
    try {
      console.log('[authStore] Starting initialization...')
      set({ loading: true, error: null })

      // Get initial session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('[authStore] Session error:', sessionError)
        set({
          error: sessionError.message,
          loading: false,
          initialized: true,
        })
        return
      }

      console.log('[authStore] Session retrieved:', session?.user?.email || 'no user')
      set({
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
        error: null,
      })

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        console.log('[authStore] Auth state changed:', _event, session?.user?.email || 'no user')
        set({
          session,
          user: session?.user ?? null,
          error: null,
        })
      })
    } catch (error) {
      console.error('[authStore] Error initializing auth:', error)
      set({
        user: null,
        session: null,
        loading: false,
        initialized: true,
        error: error instanceof Error ? error.message : 'Failed to initialize authentication',
      })
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null })
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        set({ error: error.message, loading: false })
        throw error
      }
      
      set({
        user: null,
        session: null,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error signing out:', error)
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to sign out',
      })
      throw error
    }
  },
}))

