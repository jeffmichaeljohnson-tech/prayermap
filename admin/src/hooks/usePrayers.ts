/**
 * Prayers Management Hooks
 * React Query hooks for fetching and mutating prayer data in the admin dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

// Types
export interface AdminPrayer {
  id: string
  user_id: string
  user_email: string | null
  user_name: string | null
  title: string | null
  content: string
  content_type: string
  media_url: string | null
  latitude: number
  longitude: number
  is_anonymous: boolean
  created_at: string
  updated_at: string
  total_count: number
}

interface UsePrayersOptions {
  page?: number
  pageSize?: number
  search?: string
}

interface UpdatePrayerParams {
  id: string
  title?: string
  content?: string
  latitude?: number
  longitude?: number
}

/**
 * Fetch all prayers with pagination and search
 */
export function usePrayers(options: UsePrayersOptions = {}) {
  const { page = 0, pageSize = 10, search } = options

  return useQuery({
    queryKey: ['admin-prayers', page, pageSize, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_prayers_admin', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_search: search || null,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching prayers:', error)
        // Return empty result instead of throwing - allows dashboard to load
        // This happens when the RPC function doesn't exist yet
        if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
          console.warn('Admin prayers RPC function not found - run the admin schema SQL')
          return {
            prayers: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      const prayers = (data as AdminPrayer[]) || []
      // Extract total count from first row (all rows have same total_count)
      const totalCount = prayers[0]?.total_count ?? 0

      return {
        prayers,
        totalCount: Number(totalCount),
        pageCount: Math.ceil(Number(totalCount) / pageSize),
      }
    },
  })
}

/**
 * Fetch a single prayer by ID
 */
export function usePrayer(id: string | null) {
  return useQuery({
    queryKey: ['admin-prayer', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('prayers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching prayer:', error)
        throw new Error(error.message)
      }

      return data
    },
    enabled: !!id,
  })
}

/**
 * Update a prayer
 */
export function useUpdatePrayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdatePrayerParams) => {
      const { data, error } = await supabase.rpc('update_prayer_admin', {
        p_prayer_id: params.id,
        p_title: params.title ?? null,
        p_content: params.content ?? null,
        p_latitude: params.latitude ?? null,
        p_longitude: params.longitude ?? null,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error updating prayer:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prayers'] })
      toast.success('Prayer updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update prayer: ${error.message}`)
    },
  })
}

/**
 * Delete a prayer
 */
export function useDeletePrayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('delete_prayer_admin', {
        p_prayer_id: id,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error deleting prayer:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prayers'] })
      toast.success('Prayer deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete prayer: ${error.message}`)
    },
  })
}
