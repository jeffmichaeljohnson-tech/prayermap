import { useEffect } from 'react'

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean

  /**
   * Callback when modal should close
   */
  onClose: () => void

  /**
   * Modal content
   */
  children: React.ReactNode

  /**
   * Optional className for modal container
   */
  className?: string
}

/**
 * Modal - Reusable modal wrapper with glassmorphic design
 * 
 * Features:
 * - Click outside to close
 * - ESC key to close
 * - Glassmorphic overlay and container
 * - Prevents body scroll when open
 */
export function Modal({ isOpen, onClose, children, className = '' }: ModalProps) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-4 animate-fade-in"
      onClick={onClose}
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className={`w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col animate-scale-in ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

