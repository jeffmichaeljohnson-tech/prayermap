/**
 * Moderation Hooks
 * React Query hooks for content moderation in the admin dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

// Types
export interface ModerationPrayer {
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
  status: 'active' | 'hidden' | 'removed' | 'pending_review'
  flagged_count: number
  flag_reasons: string[]
  moderation_notes: ModerationNote[]
  created_at: string
  updated_at: string
  last_moderated_at: string | null
  last_moderated_by: string | null
  total_count: number
}

export interface ModerationNote {
  timestamp: string
  admin_id: string
  action: string
  note: string
}

export interface UserBan {
  id: string
  user_id: string
  banned_by: string
  reason: string
  ban_type: 'soft' | 'hard'
  notes: Array<{
    timestamp: string
    admin_id: string
    note: string
    action?: string
  }>
  banned_at: string
  expires_at: string | null
  is_active: boolean
}

export interface UserBanStatus {
  is_banned: boolean
  ban_type: string | null
  reason: string | null
  banned_at: string | null
  expires_at: string | null
  banned_by_email: string | null
}

interface UseModerationQueueOptions {
  page?: number
  pageSize?: number
  filter?: 'all' | 'flagged' | 'pending'
}

interface ModeratePrayerParams {
  prayerId: string
  status: 'active' | 'hidden' | 'removed' | 'pending_review'
  note?: string
}

interface BulkModeratePrayersParams {
  prayerIds: string[]
  status: 'active' | 'hidden' | 'removed' | 'pending_review'
  note?: string
}

interface BanUserParams {
  userId: string
  reason: string
  banType?: 'soft' | 'hard'
  durationDays?: number | null
  note?: string
}

/**
 * Fetch moderation queue with flagged/pending prayers
 */
export function useModerationQueue(options: UseModerationQueueOptions = {}) {
  const { page = 0, pageSize = 20, filter = 'all' } = options

  return useQuery({
    queryKey: ['moderation-queue', page, pageSize, filter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_moderation_queue', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_filter: filter,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching moderation queue:', error)
        // Return empty result if function doesn't exist yet
        if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
          console.warn('Moderation queue RPC function not found - run the moderation migration SQL')
          return {
            prayers: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      const prayers = (data as ModerationPrayer[]) || []
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
 * Moderate a prayer (approve, hide, remove)
 */
export function useModeratePrayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ prayerId, status, note }: ModeratePrayerParams) => {
      const { data, error } = await supabase.rpc('moderate_prayer', {
        p_prayer_id: prayerId,
        p_new_status: status,
        p_note: note ?? null,
        p_user_agent: navigator.userAgent,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error moderating prayer:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayers'] })

      const actionText = {
        active: 'approved',
        hidden: 'hidden',
        removed: 'removed',
        pending_review: 'marked for review',
      }[variables.status]

      toast.success(`Prayer ${actionText} successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to moderate prayer: ${error.message}`)
    },
  })
}

/**
 * Bulk moderate multiple prayers (approve, hide, remove)
 */
export function useBulkModeratePrayers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ prayerIds, status, note }: BulkModeratePrayersParams) => {
      // Process prayers one at a time
      const results = await Promise.allSettled(
        prayerIds.map(prayerId =>
          supabase.rpc('moderate_prayer', {
            p_prayer_id: prayerId,
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
        console.error('Some prayers failed to moderate:', failures)
        // If all failed, throw error
        if (successes.length === 0) {
          throw new Error('Failed to moderate all prayers')
        }
        // Otherwise just return partial success
        return {
          total: prayerIds.length,
          succeeded: successes.length,
          failed: failures.length
        }
      }

      return {
        total: prayerIds.length,
        succeeded: successes.length,
        failed: 0
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayers'] })

      const actionText = {
        active: 'approved',
        hidden: 'hidden',
        removed: 'removed',
        pending_review: 'marked for review',
      }[variables.status]

      if (data.failed > 0) {
        toast.success(`${data.succeeded} of ${data.total} prayers ${actionText} successfully (${data.failed} failed)`)
      } else {
        toast.success(`${data.total} prayer(s) ${actionText} successfully`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to moderate prayers: ${error.message}`)
    },
  })
}

/**
 * Ban a user
 */
export function useBanUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, reason, banType = 'soft', durationDays, note }: BanUserParams) => {
      const { data, error } = await supabase.rpc('ban_user', {
        p_user_id: userId,
        p_reason: reason,
        p_ban_type: banType,
        p_duration_days: durationDays ?? null,
        p_note: note ?? null,
        p_user_agent: navigator.userAgent,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error banning user:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['user-ban-status', variables.userId] })
      toast.success(`User banned successfully (${variables.banType} ban)`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to ban user: ${error.message}`)
    },
  })
}

/**
 * Unban a user
 */
export function useUnbanUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, note }: { userId: string; note?: string }) => {
      const { data, error } = await supabase.rpc('unban_user', {
        p_user_id: userId,
        p_note: note ?? null,
        p_user_agent: navigator.userAgent,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error unbanning user:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['user-ban-status', variables.userId] })
      toast.success('User unbanned successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to unban user: ${error.message}`)
    },
  })
}

/**
 * Get user ban status
 */
export function useUserBanStatus(userId: string | null) {
  return useQuery({
    queryKey: ['user-ban-status', userId],
    queryFn: async () => {
      if (!userId) return null

      const { data, error } = await supabase.rpc('get_user_ban_status', {
        p_user_id: userId,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching user ban status:', error)
        // Return null if function doesn't exist
        if (error.code === 'PGRST202' || error.message.includes('function')) {
          return null
        }
        throw new Error(error.message)
      }

      // Return first result or null
      const banStatus = (data as UserBanStatus[])?.[0]
      return banStatus || { is_banned: false, ban_type: null, reason: null, banned_at: null, expires_at: null, banned_by_email: null }
    },
    enabled: !!userId,
  })
}

/**
 * Get all active user bans
 */
export function useActiveBans() {
  return useQuery({
    queryKey: ['active-bans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_bans')
        .select(`
          *,
          user:user_id(email),
          banned_by_user:banned_by(email)
        `)
        .eq('is_active', true)
        .order('banned_at', { ascending: false })

      if (error) {
        console.error('Error fetching active bans:', error)
        throw new Error(error.message)
      }

      return (data as unknown as UserBan[]) || []
    },
  })
}

/**
 * Flag a prayer (for testing or admin flagging)
 */
export function useFlagPrayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ prayerId, reason, details }: { prayerId: string; reason: string; details?: string }) => {
      const { data, error } = await supabase
        .from('prayer_flags')
        .insert({
          prayer_id: prayerId,
          flagged_by: (await supabase.auth.getUser()).data.user?.id,
          reason,
          details: details ?? null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error flagging prayer:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayers'] })
      toast.success('Prayer flagged for review')
    },
    onError: (error: Error) => {
      toast.error(`Failed to flag prayer: ${error.message}`)
    },
  })
}
