import { supabase } from './supabase'

/**
 * Notification helper functions
 */

export interface Notification {
  notification_id: number
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  metadata?: Record<string, unknown>
}

/**
 * Get user notifications
 */
export async function getNotifications(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as Notification[]
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('notifications')
    .select('notification_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw error
  return data?.length ?? 0
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: number) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true } as never)
    .eq('notification_id', notificationId)

  if (error) throw error
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true } as never)
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw error
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: number) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('notification_id', notificationId)

  if (error) throw error
}

