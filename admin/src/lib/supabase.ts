/**
 * Supabase client configuration for admin dashboard
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

/**
 * Supabase client instance
 * Used for all database operations in the admin dashboard
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error checking admin role:', error)
    return false
  }

  return !!data?.role
}

/**
 * Check if user has admin role in admin_roles table
 */
export async function checkAdminRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error checking admin role:', error)
    return null
  }

  return data?.role || null
}
