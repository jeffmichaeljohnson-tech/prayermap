import type { ButtonHTMLAttributes } from 'react'

interface FloatingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Click handler
   */
  onClick: () => void

  /**
   * Button label (optional, defaults to "+")
   */
  label?: string

  /**
   * Show label text (default: false for mobile-friendly icon-only)
   */
  showLabel?: boolean
}

/**
 * FloatingButton Component
 * 
 * Circular "+" button with glassmorphic design
 * - Fixed position: bottom-right
 * - Gold accent on hover
 * - Mobile-friendly (60px diameter)
 * - Accessible with ARIA labels
 */
export function FloatingButton({
  onClick,
  label = '+',
  showLabel = false,
  className = '',
  ...props
}: FloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-8 right-8 z-40
        w-[60px] h-[60px]
        rounded-full
        bg-gradient-to-r from-primary-blue to-primary-purple
        text-white
        shadow-lg hover:shadow-xl
        transform hover:-translate-y-0.5 hover:scale-105
        transition-all duration-200
        flex items-center justify-center
        font-display font-bold text-3xl
        hover:from-primary-gold hover:to-primary-gold
        active:scale-95
        ${showLabel ? 'px-6 py-3 gap-2' : ''}
        ${className}
      `}
      aria-label={showLabel ? label : 'Request Prayer'}
      {...props}
    >
      <span className="text-3xl leading-none">{label}</span>
      {showLabel && label !== '+' && (
        <span className="text-lg font-semibold hidden sm:inline">
          {label.replace('+', '').trim()}
        </span>
      )}
    </button>
  )
}

