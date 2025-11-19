import { useEffect, useState } from 'react'
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

// Add CSS animation for toast slide-in
const toastStyles = `
@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`

// Inject styles if not already present
if (typeof document !== 'undefined') {
  const styleId = 'toast-animations'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = toastStyles
    document.head.appendChild(style)
  }
}

export type ToastType = 'success' | 'error' | 'info'

export interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose?: () => void
}

/**
 * Toast notification component with glassmorphic design
 * Auto-dismisses after duration, can be manually closed
 */
export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 200) // Wait for fade-out animation
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  if (!isVisible) return null

  const iconMap = {
    success: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
    error: <XCircleIcon className="w-5 h-5 text-red-600" />,
    info: <CheckCircleIcon className="w-5 h-5 text-blue-600" />,
  }

  const bgColorMap = {
    success: 'bg-green-50/90 border-green-200/50',
    error: 'bg-red-50/90 border-red-200/50',
    info: 'bg-blue-50/90 border-blue-200/50',
  }

  return (
    <div
      className={`fixed top-4 right-4 z-[100] glass-card p-4 rounded-xl shadow-lg transition-all duration-200 ${
        bgColorMap[type]
      }`}
      style={{
        background: type === 'success' 
          ? 'rgba(212, 237, 218, 0.9)' 
          : type === 'error'
          ? 'rgba(254, 226, 226, 0.9)'
          : 'rgba(239, 246, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${
          type === 'success'
            ? 'rgba(34, 197, 94, 0.3)'
            : type === 'error'
            ? 'rgba(239, 68, 68, 0.3)'
            : 'rgba(59, 130, 246, 0.3)'
        }`,
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15)',
        maxWidth: '400px',
        animation: 'slideInFromTop 0.2s ease-out',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{iconMap[type]}</div>
        <p
          className="flex-1 text-sm font-medium"
          style={{
            fontFamily: "'Inter', sans-serif",
            color: type === 'success' ? '#166534' : type === 'error' ? '#991b1b' : '#1e40af',
          }}
        >
          {message}
        </p>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onClose?.(), 200)
          }}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded transition-colors"
          aria-label="Close notification"
        >
          <XMarkIcon className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  )
}

/**
 * Toast container component that manages multiple toasts
 */
export interface ToastContainerProps {
  toasts: Array<ToastProps & { id: string }>
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  )
}

