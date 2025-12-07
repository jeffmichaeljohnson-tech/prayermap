/**
 * Archived Prayers Management Hooks
 * React Query hooks for fetching and managing archived prayers in the admin dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

// Types
export interface ArchivedPrayer {
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
  expires_at: string | null
  archived_at: string
  archive_reason: string | null
  total_count: number
}

interface UseArchivedPrayersOptions {
  page?: number
  pageSize?: number
  search?: string
  archiveReason?: string | null
}

/**
 * Fetch all archived prayers with pagination and search
 */
export function useArchivedPrayers(options: UseArchivedPrayersOptions = {}) {
  const { page = 0, pageSize = 10, search, archiveReason } = options

  return useQuery({
    queryKey: ['admin-archived-prayers', page, pageSize, search, archiveReason],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_archived_prayers_admin', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_search: search || null,
        p_archive_reason: archiveReason || null,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching archived prayers:', error)
        // Return empty result if function doesn't exist yet
        if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
          console.warn('Archived prayers RPC function not found - run the migration SQL')
          return {
            prayers: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      const prayers = (data as ArchivedPrayer[]) || []
      // Extract total count from first row
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
 * Restore an archived prayer
 */
export function useRestorePrayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, newExpirationDays }: { id: string; newExpirationDays?: number }) => {
      const { data, error } = await supabase.rpc('restore_prayer_admin', {
        p_prayer_id: id,
        p_new_expiration_days: newExpirationDays ?? null,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error restoring prayer:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-archived-prayers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-prayers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Prayer restored successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore prayer: ${error.message}`)
    },
  })
}

/**
 * Manually archive a prayer
 */
export function useArchivePrayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('archive_prayer_admin', {
        p_prayer_id: id,
        p_reason: reason || 'manual',
      } as Record<string, unknown>)

      if (error) {
        console.error('Error archiving prayer:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prayers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-archived-prayers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Prayer archived successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive prayer: ${error.message}`)
    },
  })
}

/**
 * Get count of expired prayers pending archive
 */
export function useExpiredPrayersCount() {
  return useQuery({
    queryKey: ['admin-expired-count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_expired_prayers_count')

      if (error) {
        console.error('Error fetching expired count:', error)
        return 0
      }

      return Number(data) || 0
    },
    refetchInterval: 60000, // Refetch every minute
  })
}

/**
 * Trigger manual archive of expired prayers
 */
export function useTriggerArchive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (_options: { dryRun?: boolean } = {}) => {
      const response = await supabase.functions.invoke('archive-expired-prayers', {
        body: {},
        headers: {},
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-prayers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-archived-prayers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin-expired-count'] })
      
      if (data.archived > 0) {
        toast.success(`Archived ${data.archived} expired prayers`)
      } else {
        toast.info('No expired prayers to archive')
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive expired prayers: ${error.message}`)
    },
  })
}

