/**
 * Users Management Hooks
 * React Query hooks for fetching and mutating user data in the admin dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

// Types
export interface AdminUser {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  last_sign_in: string | null
  prayer_count: number
  is_admin: boolean
  admin_role: string | null
  is_banned: boolean
  ban_type: string | null
  ban_reason: string | null
  banned_at: string | null
  total_count: number
}

interface UseUsersOptions {
  page?: number
  pageSize?: number
  search?: string
}

interface UpdateUserParams {
  id: string
  display_name?: string
  avatar_url?: string
}

/**
 * Fetch all users with pagination and search
 */
export function useUsers(options: UseUsersOptions = {}) {
  const { page = 0, pageSize = 10, search } = options

  return useQuery({
    queryKey: ['admin-users', page, pageSize, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_admin', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_search: search || null,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching users:', error)
        // Return empty result instead of throwing - allows page to load
        // This happens when the RPC function doesn't exist yet
        if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
          console.warn('Admin users RPC function not found - run the admin schema SQL')
          return {
            users: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      const users = (data as AdminUser[]) || []
      // Extract total count from first row
      const totalCount = users[0]?.total_count ?? 0

      return {
        users,
        totalCount: Number(totalCount),
        pageCount: Math.ceil(Number(totalCount) / pageSize),
      }
    },
  })
}

/**
 * Fetch a single user by ID
 */
export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching user:', error)
        throw new Error(error.message)
      }

      return data
    },
    enabled: !!id,
  })
}

/**
 * Update a user profile
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateUserParams) => {
      const { data, error } = await supabase.rpc('update_user_admin', {
        p_user_id: params.id,
        p_display_name: params.display_name ?? null,
        p_avatar_url: params.avatar_url ?? null,
        p_user_agent: navigator.userAgent,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error updating user:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`)
    },
  })
}

/**
 * Delete a user (cascades to prayers, profiles, etc.)
 * USE WITH EXTREME CAUTION
 */
export function useDeleteUser() {
  return useMutation({
    mutationFn: async () => {
      // Note: This deletes from auth.users which cascades to profiles and prayers
      // This requires service role access, which we don't have in the frontend
      // Instead, we'll just soft-delete by removing admin roles or implement via Edge Function

      // For now, just throw an error explaining the limitation
      throw new Error('User deletion requires backend service role access. Please use Supabase dashboard.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * Ban a user - re-exported from useModeration for convenience
 */
export { useBanUser, useUnbanUser } from './useModeration'
