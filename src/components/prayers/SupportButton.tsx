import { useState, useEffect } from 'react'
import { supportPrayer } from '../../lib/api/support'
import { supabase } from '../../lib/supabase'

export interface SupportButtonProps {
  /**
   * Prayer ID to support
   */
  prayerId: number

  /**
   * Current support count (for optimistic updates)
   */
  currentSupportCount: number

  /**
   * Whether the user has already supported this prayer
   */
  isSupported?: boolean

  /**
   * Optional callback after support is sent
   */
  onSupport?: (prayerId: number) => void | Promise<void>

  /**
   * Whether the button is disabled
   */
  disabled?: boolean
}

/**
 * SupportButton - "Pray First. Then Press." button component
 * Calls supportPrayer API on click, shows loading state, increments count optimistically
 * Uses gold accent color (#F5D76E) per Figma specs
 */
export function SupportButton({
  prayerId,
  currentSupportCount,
  isSupported = false,
  onSupport,
  disabled = false,
}: SupportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [localSupported, setLocalSupported] = useState(isSupported)

  // Sync local state with props when they change
  useEffect(() => {
    setLocalSupported(isSupported)
  }, [isSupported])

  const handleClick = async () => {
    if (disabled || isLoading || localSupported) return

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // User not authenticated - could trigger auth modal here
      return
    }

    setIsLoading(true)

    // Optimistic update
    setLocalSupported(true)

    try {
      const result = await supportPrayer(prayerId, user.id)

      if (result.success) {
        // Success - call optional callback (parent can update count)
        await onSupport?.(prayerId)
      } else if (result.alreadySupported) {
        // Already supported - keep optimistic state
        setLocalSupported(true)
      } else {
        // Error - revert optimistic update
        setLocalSupported(false)
      }
    } catch (error) {
      // Error - revert optimistic update
      console.error('Error supporting prayer:', error)
      setLocalSupported(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (localSupported) {
    return (
      <button
        disabled
        className="w-full py-4 px-6 rounded-xl transition-all relative overflow-hidden animate-pulse-glow"
        style={{
          background: '#D4EDDA',
          border: 'none',
          fontFamily: "'Inter', sans-serif",
          boxShadow: '0 0 20px rgba(76, 175, 80, 0.4)',
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl">✓</span>
          <span className="text-base font-semibold" style={{ color: '#2E7D32' }}>
            Prayer Sent
          </span>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="w-full py-4 px-6 rounded-xl transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: `linear-gradient(135deg, rgba(245, 215, 110, 0.3), rgba(245, 215, 110, 0.5))`,
        border: '2px solid #F5D76E',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(245, 215, 110, 0.3)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl">🙏</span>
        <span className="text-base font-semibold" style={{ color: '#2C3E50' }}>
          Pray First.
        </span>
        <span className="text-xs font-medium" style={{ color: '#7F8C8D' }}>
          Then Press.
        </span>
        {isLoading && (
          <div className="mt-2">
            <div
              className="w-5 h-5 border-2 border-yellow-300 border-t-yellow-600 rounded-full animate-spin"
            />
          </div>
        )}
      </div>
    </button>
  )
}

