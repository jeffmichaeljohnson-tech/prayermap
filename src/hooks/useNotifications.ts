import { useEffect, useState } from 'react'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
} from '@/lib/notifications'
import { getCurrentUser } from '@/lib/auth'

/**
 * Hook for managing user notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)

      const user = await getCurrentUser()
      if (!user) {
        setNotifications([])
        setUnreadCount(0)
        return
      }

      const [notifs, count] = await Promise.all([
        getNotifications(user.id),
        getUnreadCount(user.id),
      ])

      setNotifications(notifs)
      setUnreadCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Refetch every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as read')
    }
  }

  const markAllNotificationsAsRead = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      await markAllAsRead(user.id)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all as read')
    }
  }

  const removeNotification = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId)
      setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId))
      // Update unread count if notification was unread
      const notification = notifications.find((n) => n.notification_id === notificationId)
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification')
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    deleteNotification: removeNotification,
  }
}

