/**
 * Conversation Messages Management Hooks
 * React Query hooks for fetching and managing conversation messages in the admin dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'

// Types
export interface AdminConversationMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_email: string | null
  sender_name: string | null
  content: string
  content_type: string
  media_url: string | null
  media_duration_seconds: number | null
  read_at: string | null
  created_at: string
  prayer_id: string
  prayer_title: string | null
  participant_1_id: string
  participant_2_id: string
  total_count: number
}

interface UseConversationMessagesOptions {
  page?: number
  pageSize?: number
  search?: string
}

interface UpdateConversationMessageParams {
  id: string
  content: string
}

/**
 * Fetch all conversation messages with pagination and search
 */
export function useConversationMessages(options: UseConversationMessagesOptions = {}) {
  const { page = 0, pageSize = 10, search } = options

  return useQuery({
    queryKey: ['admin-conversation-messages', page, pageSize, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_conversation_messages_admin', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_search: search || null,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error fetching conversation messages:', error)
        // Return empty result if RPC function doesn't exist yet
        if (error.code === 'PGRST202' || error.message.includes('function') || error.message.includes('does not exist')) {
          console.warn('Admin conversation messages RPC function not found - will create it')
          return {
            messages: [],
            totalCount: 0,
            pageCount: 0,
          }
        }
        throw new Error(error.message)
      }

      const messages = (data as AdminConversationMessage[]) || []
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
 * Update a conversation message content
 */
export function useUpdateConversationMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateConversationMessageParams) => {
      const { data, error } = await supabase.rpc('update_conversation_message_admin', {
        p_message_id: params.id,
        p_content: params.content,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error updating conversation message:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversation-messages'] })
      toast.success('Message updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update message: ${error.message}`)
    },
  })
}

/**
 * Delete a conversation message
 */
export function useDeleteConversationMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('delete_conversation_message_admin', {
        p_message_id: id,
      } as Record<string, unknown>)

      if (error) {
        console.error('Error deleting conversation message:', error)
        throw new Error(error.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversation-messages'] })
      toast.success('Message deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete message: ${error.message}`)
    },
  })
}
