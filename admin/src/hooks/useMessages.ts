/**
 * Messages Management Hooks
 * React Query hooks for fetching prayer_responses (user messages) in the admin dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

// Types
export interface AdminMessage {
  id: string
  prayer_id: string
  responder_id: string
  responder_email: string | null
  responder_name: string | null
  message: string | null
  content_type: string
  media_url: string | null
  status: string
  created_at: string
  read_at: string | null
  is_anonymous: boolean
  total_count: number
}

interface UseMessagesOptions {
  page?: number
  pageSize?: number
  search?: string
}

interface UpdateMessageParams {
  id: string
  status?: string
  moderation_notes?: string
  message_content?: string
}

/**
 * Fetch all prayer_responses with pagination and search
 */
export function useMessages(options: UseMessagesOptions = {}) {
  const { page = 0, pageSize = 10, search } = options

  return useQuery({
    queryKey: ['admin-messages', page, pageSize, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_messages', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_search: search || null,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching messages:', error)
        // Return empty result if RPC function doesn't exist yet
        if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
          console.warn('Admin messages RPC function not found - will create it')
          return {
            messages: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      const messages = (data as AdminMessage[]) || []
      // Extract total count from first row (all rows have same total_count)
      const totalCount = messages[0]?.total_count ?? 0

      return {
        messages,
        totalCount: Number(totalCount),
        pageCount: Math.ceil(Number(totalCount) / pageSize),
      }
    },
  })
}

/**
 * Fetch a single message by ID
 */
export function useMessage(id: string | null) {
  return useQuery({
    queryKey: ['admin-message', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('prayer_responses')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching message:', error)
        throw new Error(error.message)
      }

      return data
    },
    enabled: !!id,
  })
}

/**
 * Update a message (for moderation)
 */
export function useUpdateMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateMessageParams) => {
      const { data, error } = await supabase.rpc('update_message_admin', {
        p_message_id: params.id,
        p_status: params.status ?? null,
        p_moderation_notes: params.moderation_notes ?? null,
        p_message_content: params.message_content ?? null,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error updating message:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] })
      toast.success('Message updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update message: ${error.message}`)
    },
  })
}

/**
 * Delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('delete_message_admin', {
        p_message_id: id,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error deleting message:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] })
      toast.success('Message deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete message: ${error.message}`)
    },
  })
}
