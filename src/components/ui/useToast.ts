import { useState, useCallback } from 'react'
import type { ToastType } from './Toast'

export interface ToastMessage {
  id: string
  message: string
  type?: ToastType
  duration?: number
}

/**
 * Hook for managing toast notifications
 * 
 * @example
 * ```tsx
 * const { showToast, toasts, removeToast } = useToast()
 * 
 * showToast('Prayer posted successfully!', 'success')
 * ```
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = Math.random().toString(36).substring(7)
      const newToast: ToastMessage = { id, message, type, duration }

      setToasts((prev) => [...prev, newToast])

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration + 200) // Add small buffer for animation
      }

      return id
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    showToast,
    removeToast,
    clearAll,
  }
}

