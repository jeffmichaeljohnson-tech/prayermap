/**
 * Prayer Response Moderation Hooks
 * React Query hooks for moderating prayer response content in the admin dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import type { AdminPrayerResponse, ModerationNote } from './usePrayerResponses'

// Types for moderation
export interface ModerationPrayerResponse {
  id: string
  prayer_id: string
  responder_id: string
  responder_email: string | null
  responder_name: string | null
  is_anonymous: boolean
  message: string
  content_type: 'text' | 'audio' | 'video'
  content_url: string | null
  status: 'active' | 'hidden' | 'removed' | 'pending_review'
  flagged_count: number
  flag_reasons: string[]
  moderation_notes: ModerationNote[]
  created_at: string
  read_at: string | null
  last_moderated_at: string | null
  last_moderated_by: string | null
  // Prayer context
  prayer_title: string | null
  prayer_content: string
  prayer_user_email: string | null
  prayer_user_name: string | null
  prayer_is_anonymous: boolean
  total_count: number
}

export interface ResponseFlag {
  id: string
  response_id: string
  flagged_by: string
  flagged_by_email: string | null
  reason: string
  details: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}

interface UseModerationResponseQueueOptions {
  page?: number
  pageSize?: number
  filter?: 'all' | 'flagged' | 'pending' | 'audio' | 'video' | 'text'
  severity?: 'all' | 'high' | 'medium' | 'low'
}

interface ModerateResponseParams {
  responseId: string
  status: 'active' | 'hidden' | 'removed' | 'pending_review'
  note?: string
}

interface BulkModerateResponsesParams {
  responseIds: string[]
  status: 'active' | 'hidden' | 'removed' | 'pending_review'
  note?: string
}

interface FlagResponseParams {
  responseId: string
  reason: string
  details?: string
}

/**
 * Fetch moderation queue for prayer responses
 */
export function usePrayerResponseModerationQueue(options: UseModerationResponseQueueOptions = {}) {
  const { page = 0, pageSize = 20, filter = 'all', severity = 'all' } = options

  return useQuery({
    queryKey: ['prayer-response-moderation-queue', page, pageSize, filter, severity],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_prayer_response_moderation_queue', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_filter: filter,
        p_severity: severity,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching prayer response moderation queue:', error)
        // Return empty result if function doesn't exist yet
        if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
          console.warn('Prayer response moderation queue RPC function not found - run the moderation migration SQL')
          return {
            responses: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      const responses = (data as ModerationPrayerResponse[]) || []
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
 * Moderate a single prayer response (approve, hide, remove)
 */
export function useModeratePrayerResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ responseId, status, note }: ModerateResponseParams) => {
      const { data, error } = await supabase.rpc('moderate_prayer_response', {
        p_response_id: responseId,
        p_new_status: status,
        p_note: note ?? null,
        p_user_agent: navigator.userAgent,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error moderating prayer response:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prayer-response-moderation-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-responses'] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-response', variables.responseId] })

      const actionText = {
        active: 'approved',
        hidden: 'hidden',
        removed: 'removed',
        pending_review: 'marked for review',
      }[variables.status]

      toast.success(`Prayer response ${actionText} successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to moderate prayer response: ${error.message}`)
    },
  })
}

/**
 * Bulk moderate multiple prayer responses
 */
export function useBulkModeratePrayerResponses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ responseIds, status, note }: BulkModerateResponsesParams) => {
      // Process responses one at a time
      const results = await Promise.allSettled(
        responseIds.map(responseId =>
          supabase.rpc('moderate_prayer_response', {
            p_response_id: responseId,
            p_new_status: status,
            p_note: note ?? null,
            p_user_agent: navigator.userAgent,
          } as Record<string, unknown>)
        )
      )

      // Check for failures
      const failures = results.filter(r => r.status === 'rejected')
      const successes = results.filter(r => r.status === 'fulfilled')

      if (failures.length > 0) {
        console.error('Some prayer responses failed to moderate:', failures)
        // If all failed, throw error
        if (successes.length === 0) {
          throw new Error('Failed to moderate all prayer responses')
        }
        // Otherwise just return partial success
        return {
          total: responseIds.length,
          succeeded: successes.length,
          failed: failures.length
        }
      }

      return {
        total: responseIds.length,
        succeeded: successes.length,
        failed: 0
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prayer-response-moderation-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-responses'] })

      const actionText = {
        active: 'approved',
        hidden: 'hidden',
        removed: 'removed',
        pending_review: 'marked for review',
      }[variables.status]

      if (data.failed > 0) {
        toast.success(`${data.succeeded} of ${data.total} prayer responses ${actionText} successfully (${data.failed} failed)`)
      } else {
        toast.success(`${data.total} prayer response(s) ${actionText} successfully`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to moderate prayer responses: ${error.message}`)
    },
  })
}

/**
 * Flag a prayer response for review
 */
export function useFlagPrayerResponse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ responseId, reason, details }: FlagResponseParams) => {
      const { data, error } = await supabase
        .from('prayer_response_flags')
        .insert({
          response_id: responseId,
          flagged_by: (await supabase.auth.getUser()).data.user?.id,
          reason,
          details: details ?? null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error flagging prayer response:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-response-moderation-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-responses'] })
      toast.success('Prayer response flagged for review')
    },
    onError: (error: Error) => {
      toast.error(`Failed to flag prayer response: ${error.message}`)
    },
  })
}

/**
 * Get flags for a specific prayer response
 */
export function usePrayerResponseFlags(responseId: string | null) {
  return useQuery({
    queryKey: ['prayer-response-flags', responseId],
    queryFn: async () => {
      if (!responseId) return []

      const { data, error } = await supabase
        .from('prayer_response_flags')
        .select(`
          *,
          flagged_by_user:flagged_by(email),
          resolved_by_user:resolved_by(email)
        `)
        .eq('response_id', responseId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching prayer response flags:', error)
        throw new Error(error.message)
      }

      return (data as unknown as ResponseFlag[]) || []
    },
    enabled: !!responseId,
  })
}

/**
 * Resolve a prayer response flag
 */
export function useResolvePrayerResponseFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ flagId, note }: { flagId: string; note?: string }) => {
      const { data, error } = await supabase.rpc('resolve_prayer_response_flag', {
        p_flag_id: flagId,
        p_note: note ?? null,
        p_user_agent: navigator.userAgent,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error resolving prayer response flag:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-response-flags'] })
      queryClient.invalidateQueries({ queryKey: ['prayer-response-moderation-queue'] })
      toast.success('Prayer response flag resolved')
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve prayer response flag: ${error.message}`)
    },
  })
}

/**
 * Get prayer response moderation history
 */
export function usePrayerResponseModerationHistory(responseId: string | null) {
  return useQuery({
    queryKey: ['prayer-response-moderation-history', responseId],
    queryFn: async () => {
      if (!responseId) return []

      const { data, error } = await supabase.rpc('get_prayer_response_moderation_history', {
        p_response_id: responseId,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching prayer response moderation history:', error)
        if (error.code === 'PGRST202' || error.message.includes('function')) {
          return []
        }
        throw new Error(error.message)
      }

      return data || []
    },
    enabled: !!responseId,
  })
}

/**
 * Get prayer response moderation statistics
 */
export function usePrayerResponseModerationStats() {
  return useQuery({
    queryKey: ['prayer-response-moderation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_prayer_response_moderation_stats')

      if (error) {
        console.error('Error fetching prayer response moderation stats:', error)
        if (error.code === 'PGRST202' || error.message.includes('function')) {
          return {
            total_responses: 0,
            flagged_responses: 0,
            pending_responses: 0,
            hidden_responses: 0,
            removed_responses: 0,
            approved_responses: 0,
            flags_this_week: 0,
            moderation_actions_today: 0,
          }
        }
        throw new Error(error.message)
      }

      return data || {}
    },
  })
}

/**
 * Hide sensitive content in prayer response (blur/redact)
 */
export function useToggleResponseContentVisibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ responseId, hidden }: { responseId: string; hidden: boolean }) => {
      const { data, error } = await supabase.rpc('toggle_prayer_response_content_visibility', {
        p_response_id: responseId,
        p_hidden: hidden,
        p_user_agent: navigator.userAgent,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error toggling prayer response content visibility:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-response', variables.responseId] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-responses'] })
      
      const actionText = variables.hidden ? 'hidden' : 'shown'
      toast.success(`Prayer response content ${actionText}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle content visibility: ${error.message}`)
    },
  })
}

/**
 * Add moderation note to a prayer response
 */
export function useAddPrayerResponseModerationNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ responseId, note, action }: { responseId: string; note: string; action?: string }) => {
      const { data, error } = await supabase.rpc('add_prayer_response_moderation_note', {
        p_response_id: responseId,
        p_note: note,
        p_action: action ?? null,
        p_user_agent: navigator.userAgent,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error adding prayer response moderation note:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prayer-response-moderation-history', variables.responseId] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayer-response', variables.responseId] })
      toast.success('Moderation note added')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add moderation note: ${error.message}`)
    },
  })
}