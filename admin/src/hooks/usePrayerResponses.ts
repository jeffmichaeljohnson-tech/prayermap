/**
 * Prayer Response Management Hooks
 * React Query hooks for fetching and managing prayer response data in the admin dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

// Types
export interface AdminPrayerResponse {
  id: string
  prayer_id: string
  responder_id: string
  responder_email: string | null
  responder_name: string | null
  is_anonymous: boolean
  message: string
  content_type: 'text' | 'audio' | 'video'
  content_url: string | null
  created_at: string
  read_at: string | null
  // Prayer context for this response
  prayer_title: string | null
  prayer_content: string
  prayer_user_email: string | null
  prayer_user_name: string | null
  prayer_is_anonymous: boolean
  // Moderation fields
  status?: 'active' | 'hidden' | 'removed' | 'pending_review'
  flagged_count: number
  flag_reasons: string[]
  moderation_notes: ModerationNote[]
  last_moderated_at: string | null
  last_moderated_by: string | null
  // Total count for pagination
  total_count: number
}

export interface ModerationNote {
  timestamp: string
  admin_id: string
  action: string
  note: string
}

interface UsePrayerResponsesOptions {
  page?: number
  pageSize?: number
  search?: string
  filter?: 'all' | 'flagged' | 'pending' | 'text' | 'audio' | 'video'
  prayerId?: string // Filter by specific prayer
  responderId?: string // Filter by specific responder
}

interface UpdatePrayerResponseParams {
  id: string
  message?: string
  content_type?: 'text' | 'audio' | 'video'
  content_url?: string | null
}

/**
 * Fetch all prayer responses with pagination, search, and filtering
 */
export function usePrayerResponses(options: UsePrayerResponsesOptions = {}) {
  const { page = 0, pageSize = 20, search, filter = 'all', prayerId, responderId } = options

  return useQuery({
    queryKey: ['admin-prayer-responses', page, pageSize, search, filter, prayerId, responderId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_prayer_responses_admin', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_search: search || null,
        p_filter: filter,
        p_prayer_id: prayerId || null,
        p_responder_id: responderId || null,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching prayer responses:', error)
        // Return empty result instead of throwing - allows dashboard to load
        // This happens when the RPC function doesn't exist yet
        if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
          console.warn('Admin prayer responses RPC function not found - run the admin schema SQL')
          return {
            responses: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      const responses = (data as AdminPrayerResponse[]) || []
      // Extract total count from first row (all rows have same total_count)
      const totalCount = responses[0]?.total_count ?? 0

      return {
        responses,
        totalCount: Number(totalCount),
        pageCount: Math.ceil(Number(totalCount) / pageSize),
      }
    },
  })
}

/**
 * Fetch a single prayer response by ID with full context
 */
export function usePrayerResponse(id: string | null) {
  return useQuery({
    queryKey: ['admin-prayer-response', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase.rpc('get_prayer_response_admin', {
        p_response_id: id,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching prayer response:', error)
        // Return null if function doesn't exist
        if (error.code === 'PGRST202' || error.message.includes('function')) {
          return null
        }
        throw new Error(error.message)
      }

      // Return first result or null
      return (data as AdminPrayerResponse[])?.[0] || null
    },
    enabled: !!id,
  })
}

/**
 * Fetch all responses for a specific prayer
 */
export function usePrayerResponsesByPrayer(prayerId: string | null, options: Omit<UsePrayerResponsesOptions, 'prayerId'> = {}) {
  const { page = 0, pageSize = 50, search, filter = 'all' } = options

  return useQuery({
    queryKey: ['prayer-responses-by-prayer', prayerId, page, pageSize, search, filter],
    queryFn: async () => {
      if (!prayerId) return null

      const { data, error } = await supabase.rpc('get_prayer_responses_by_prayer_admin', {
        p_prayer_id: prayerId,
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_search: search || null,
        p_filter: filter,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching prayer responses by prayer:', error)
        if (error.code === 'PGRST202' || error.message.includes('function')) {
          return {
            responses: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      const responses = (data as AdminPrayerResponse[]) || []
      const totalCount = responses[0]?.total_count ?? 0

      return {
        responses,
        totalCount: Number(totalCount),
        pageCount: Math.ceil(Number(totalCount) / pageSize),
      }
    },
    enabled: !!prayerId,
  })
}

/**
 * Fetch responses by a specific user
 */
export function usePrayerResponsesByUser(responderId: string | null, options: Omit<UsePrayerResponsesOptions, 'responderId'> = {}) {
  const { page = 0, pageSize = 20, search, filter = 'all' } = options

  return useQuery({
    queryKey: ['prayer-responses-by-user', responderId, page, pageSize, search, filter],
    queryFn: async () => {
      if (!responderId) return null

      const { data, error } = await supabase.rpc('get_prayer_responses_by_user_admin', {
        p_responder_id: responderId,
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_search: search || null,
        p_filter: filter,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching prayer responses by user:', error)
        if (error.code === 'PGRST202' || error.message.includes('function')) {
          return {
            responses: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      const responses = (data as AdminPrayerResponse[]) || []
      const totalCount = responses[0]?.total_count ?? 0

      return {
        responses,
        totalCount: Number(totalCount),
        pageCount: Math.ceil(Number(totalCount) / pageSize),
      }
    },
    enabled: !!responderId,
  })
}

/**
 * Update a prayer response
 */
export function useUpdatePrayerResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdatePrayerResponseParams) => {
      const { data, error } = await supabase.rpc('update_prayer_response_admin', {
        p_response_id: params.id,
        p_message: params.message ?? null,
        p_content_type: params.content_type ?? null,
        p_content_url: params.content_url ?? null,
        p_user_agent: navigator.userAgent,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error updating prayer response:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-responses'] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-response', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['prayer-responses-by-prayer'] })
      queryClient.invalidateQueries({ queryKey: ['prayer-responses-by-user'] })
      toast.success('Prayer response updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update prayer response: ${error.message}`)
    },
  })
}

/**
 * Delete a prayer response
 */
export function useDeletePrayerResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('delete_prayer_response_admin', {
        p_response_id: id,
        p_user_agent: navigator.userAgent,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error deleting prayer response:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-responses'] })
      queryClient.invalidateQueries({ queryKey: ['prayer-responses-by-prayer'] })
      queryClient.invalidateQueries({ queryKey: ['prayer-responses-by-user'] })
      toast.success('Prayer response deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete prayer response: ${error.message}`)
    },
  })
}

/**
 * Get prayer response statistics
 */
export function usePrayerResponseStats() {
  return useQuery({
    queryKey: ['prayer-response-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_prayer_response_stats_admin')

      if (error) {
        console.error('Error fetching prayer response stats:', error)
        if (error.code === 'PGRST202' || error.message.includes('function')) {
          return {
            total_responses: 0,
            responses_today: 0,
            responses_this_week: 0,
            responses_this_month: 0,
            flagged_responses: 0,
            pending_responses: 0,
            text_responses: 0,
            audio_responses: 0,
            video_responses: 0,
            anonymous_responses: 0,
            avg_response_length: 0,
          }
        }
        throw new Error(error.message)
      }

      return data || {}
    },
  })
}

/**
 * Mark response as read (for admin testing)
 */
export function useMarkResponseAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (responseId: string) => {
      const { data, error } = await supabase.rpc('mark_response_as_read', {
        response_id: responseId,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error marking response as read:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-responses'] })
      queryClient.invalidateQueries({ queryKey: ['prayer-responses-by-prayer'] })
      toast.success('Response marked as read')
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark response as read: ${error.message}`)
    },
  })
}