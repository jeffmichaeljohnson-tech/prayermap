/**
 * Dashboard Statistics Hook
 * Fetches aggregate stats for the admin dashboard
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface AdminStats {
  total_prayers: number
  total_users: number
  prayers_today: number
  prayers_this_week: number
  new_users_today: number
  new_users_this_week: number
}

/**
 * Fetch dashboard statistics
 */
export function useStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_stats')

      if (error) {
        console.error('Error fetching stats:', error)
        // Return empty stats instead of throwing - allows dashboard to load
        // This happens when the RPC function doesn't exist yet
        if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
          console.warn('Admin stats RPC function not found - run the admin schema SQL')
          return {
            totalPrayers: 0,
            totalUsers: 0,
            prayersToday: 0,
            prayersThisWeek: 0,
            newUsersToday: 0,
            newUsersThisWeek: 0,
          }
        }
        throw new Error(error.message)
      }

      // The RPC returns an array with one row
      const stats = data?.[0] as AdminStats | undefined

      return {
        totalPrayers: stats?.total_prayers ?? 0,
        totalUsers: stats?.total_users ?? 0,
        prayersToday: stats?.prayers_today ?? 0,
        prayersThisWeek: stats?.prayers_this_week ?? 0,
        newUsersToday: stats?.new_users_today ?? 0,
        newUsersThisWeek: stats?.new_users_this_week ?? 0,
      }
    },
    refetchInterval: 60000, // Refetch every minute
  })
}
