import type { Prayer } from '../../lib/types'
import { SupportButton } from './SupportButton'
import { Modal } from '../ui/Modal'

export interface PrayerDetailModalProps {
  prayer: Prayer | null
  isOpen: boolean
  onClose: () => void
  onSupport?: (prayerId: number) => void | Promise<void>
  isSupported?: boolean
}

const textStyle = { fontFamily: "'Inter', sans-serif", color: '#7F8C8D' }
const mutedStyle = { fontFamily: "'Inter', sans-serif", color: '#95A5A6' }
const titleStyle = { fontFamily: "'Cinzel', serif", color: '#2C3E50' }

/**
 * PrayerDetailModal - Full prayer detail view with glassmorphic modal
 * Shows full title, full text, location, time, and SupportButton
 * ESC key and click outside to close
 */
export function PrayerDetailModal({
  prayer,
  isOpen,
  onClose,
  onSupport,
  isSupported = false,
}: PrayerDetailModalProps) {
  if (!prayer) return null

  const displayName = prayer.is_anonymous ? 'Anonymous' : prayer.poster_first_name || 'Someone'
  const distanceText = prayer.distance_km
    ? `${(prayer.distance_km * 0.621371).toFixed(1)} miles away`
    : null

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close"
        >
          <span className="text-xl">←</span>
        </button>
        <button
          onClick={() => {}}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="More"
        >
          <span className="text-xl">⋯</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {prayer.title && (
          <h2 className="text-xl font-normal mb-4" style={titleStyle}>
            {prayer.title}
          </h2>
        )}

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <span style={textStyle}>Posted by {displayName}</span>
          {distanceText && (
            <>
              <span style={mutedStyle}>•</span>
              <span style={textStyle}>{distanceText}</span>
            </>
          )}
          <div className="w-full mt-1">
            <span style={mutedStyle}>{formatTimeAgo(prayer.created_at)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 mb-4" style={{ background: 'rgba(0, 0, 0, 0.08)' }} />

        {/* Prayer Content */}
        <div className="mb-6">
          {prayer.media_type === 'TEXT' && (
            <p
              className="text-base leading-relaxed whitespace-pre-wrap"
              style={{ ...textStyle, color: '#2C3E50' }}
            >
              {prayer.text_body}
            </p>
          )}
          {prayer.media_type === 'AUDIO' && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-2">Audio prayer</p>
              <p className="text-xs text-gray-500">Audio playback coming soon</p>
            </div>
          )}
          {prayer.media_type === 'VIDEO' && (
            <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center">
              <p className="text-white text-sm">Video playback coming soon</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 mb-4" style={{ background: 'rgba(0, 0, 0, 0.08)' }} />
      </div>

      {/* Footer with Support Button */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white">
        <SupportButton
          prayerId={prayer.prayer_id}
          currentSupportCount={prayer.support_count}
          isSupported={isSupported}
          onSupport={onSupport}
        />
        <p className="text-center text-xs mt-3" style={textStyle}>
          {prayer.support_count || 0} prayers sent
        </p>
      </div>
    </Modal>
  )
}

function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(timestamp).toLocaleDateString()
}

