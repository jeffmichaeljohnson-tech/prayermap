/**
 * Admin Search Hook
 * Unified search across users, prayers, and reports
 * Debounced for performance, max 5 results per type
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface SearchResult {
  type: 'user' | 'prayer' | 'report'
  id: string
  title: string
  subtitle: string
}

interface UseSearchOptions {
  query: string
  enabled?: boolean
}

/**
 * Unified admin search hook
 * Searches users, prayers, and reports simultaneously
 */
export function useSearch({ query, enabled = true }: UseSearchOptions) {
  return useQuery({
    queryKey: ['admin-search', query],
    queryFn: async (): Promise<SearchResult[]> => {
      if (query.length < 2) return []
      
      const results: SearchResult[] = []
      const searchTerm = query.toLowerCase()

      try {
        // Search users via profiles table (email, display_name)
        const { data: users } = await supabase
          .from('profiles')
          .select('id, email, display_name')
          .or(`email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
          .limit(5)

        users?.forEach(user => {
          results.push({
            type: 'user',
            id: user.id,
            title: user.email || 'No email',
            subtitle: user.display_name || 'No name set',
          })
        })

        // Search prayers by content (title or content text)
        const { data: prayers } = await supabase
          .from('prayers')
          .select('id, title, content, user_id')
          .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(5)

        prayers?.forEach(prayer => {
          const displayTitle = prayer.title || prayer.content.substring(0, 40)
          results.push({
            type: 'prayer',
            id: prayer.id,
            title: displayTitle.length > 40 ? displayTitle.substring(0, 40) + '...' : displayTitle,
            subtitle: prayer.content.substring(0, 60) + (prayer.content.length > 60 ? '...' : ''),
          })
        })

        // Search reports by reason or details
        const { data: reports } = await supabase
          .from('reports')
          .select('id, reason, details, status, target_type')
          .or(`reason.ilike.%${searchTerm}%,details.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(5)

        reports?.forEach(report => {
          results.push({
            type: 'report',
            id: report.id,
            title: `Report: ${report.reason}`,
            subtitle: `${report.target_type} • ${report.status}${report.details ? ` • ${report.details.substring(0, 30)}` : ''}`,
          })
        })

      } catch (error) {
        console.error('Search error:', error)
        // Return partial results on error
      }

      return results
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30000, // 30 seconds
  })
}

