/**
 * Audit Logs Hook
 * Fetches audit log entries for the admin dashboard
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface AuditLog {
  id: string
  admin_id: string
  action: string
  table_name: string | null
  record_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface UseAuditLogsOptions {
  page?: number
  pageSize?: number
  action?: string
  tableName?: string
}

/**
 * Fetch audit logs with pagination and filtering
 */
export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { page = 0, pageSize = 20, action, tableName } = options

  return useQuery({
    queryKey: ['admin-audit-logs', page, pageSize, action, tableName],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (action) {
        query = query.eq('action', action)
      }

      if (tableName) {
        query = query.eq('table_name', tableName)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching audit logs:', error)
        // Return empty result instead of throwing - allows dashboard to load
        // This happens when the audit_logs table doesn't exist yet
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('Audit logs table not found - run the admin schema SQL')
          return {
            logs: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      return {
        logs: (data as AuditLog[]) || [],
        totalCount: count ?? 0,
        pageCount: Math.ceil((count ?? 0) / pageSize),
      }
    },
  })
}
