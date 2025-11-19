import type { Prayer } from '../../lib/types'

export interface PrayerCardProps {
  prayer: Prayer
  onClick?: () => void
  distance?: number
}

/**
 * PrayerCard - Compact prayer list item with glassmorphic design
 * Displays prayer preview with title (if exists), first 100 chars of text,
 * support count, time ago, and user name or "Anonymous"
 */
export function PrayerCard({ prayer, onClick, distance }: PrayerCardProps) {
  const displayName = prayer.is_anonymous
    ? 'Anonymous'
    : prayer.poster_first_name || 'Someone'

  const distanceText =
    distance !== undefined
      ? `${distance.toFixed(1)} miles away`
      : prayer.distance_km
        ? `${(prayer.distance_km * 0.621371).toFixed(1)} miles away`
        : null

  // Preview: first 100 characters
  const previewText =
    prayer.text_body.length > 100
      ? `${prayer.text_body.substring(0, 100)}...`
      : prayer.text_body

  return (
    <div
      onClick={onClick}
      className="glass-card cursor-pointer p-4 rounded-xl transition-all hover:shadow-lg hover:scale-[1.02]"
      style={{
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          {prayer.title && (
            <h3
              className="text-lg font-semibold mb-1 truncate"
              style={{
                fontFamily: "'Cinzel', serif",
                color: '#2C3E50',
              }}
            >
              {prayer.title}
            </h3>
          )}
          <p
            className="text-sm line-clamp-2"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: '#7F8C8D',
            }}
          >
            {previewText}
          </p>
        </div>
        <div className="text-2xl flex-shrink-0">🙏</div>
      </div>

      {/* Meta Info */}
      <div className="flex items-center gap-2 text-xs mt-3">
        <span style={{ color: '#7F8C8D', fontFamily: "'Inter', sans-serif" }}>
          {displayName}
        </span>
        {distanceText && (
          <>
            <span style={{ color: '#95A5A6' }}>•</span>
            <span style={{ color: '#95A5A6', fontFamily: "'Inter', sans-serif" }}>
              {distanceText}
            </span>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <span
          className="text-xs"
          style={{ color: '#95A5A6', fontFamily: "'Inter', sans-serif" }}
        >
          {prayer.support_count || 0} prayers sent
        </span>
        <span
          className="text-xs"
          style={{ color: '#95A5A6', fontFamily: "'Inter', sans-serif" }}
        >
          {formatTimeAgo(prayer.created_at)}
        </span>
      </div>
    </div>
  )
}

/**
 * Format timestamp to "X hours ago" format
 */
function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

