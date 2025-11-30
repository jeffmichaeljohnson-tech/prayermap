import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Mic, Video, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import type { PrayerConnection } from '../../types/prayer';

interface ConnectionTooltipProps {
  connection: PrayerConnection & {
    prayerTitle?: string;
    responseType?: 'text' | 'audio' | 'video';
  };
  position: { x: number; y: number };
  visible: boolean;
  mapDimensions: { width: number; height: number };
}

/**
 * Calculate distance in miles between two lat/lng coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format time ago in a human-readable format
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  if (name === 'Anonymous') return 'A';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get response type icon
 */
function ResponseTypeIcon({ type }: { type?: 'text' | 'audio' | 'video' }) {
  const iconProps = { size: 14, className: 'text-purple-600' };

  switch (type) {
    case 'audio':
      return <Mic {...iconProps} />;
    case 'video':
      return <Video {...iconProps} />;
    case 'text':
    default:
      return <MessageSquare {...iconProps} />;
  }
}

/**
 * Avatar component with initials or anonymous indicator
 */
function Avatar({ name, isAnonymous }: { name: string; isAnonymous?: boolean }) {
  const displayName = isAnonymous ? 'Anonymous' : name;
  const initials = getInitials(displayName);

  // Color variations for different initials
  const colorVariants = {
    A: 'bg-gradient-to-br from-purple-400 to-purple-600',
    B: 'bg-gradient-to-br from-blue-400 to-blue-600',
    C: 'bg-gradient-to-br from-pink-400 to-pink-600',
    D: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    E: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
  };

  const firstChar = initials.charAt(0);
  const bgColor = colorVariants[firstChar as keyof typeof colorVariants] ||
    'bg-gradient-to-br from-gray-400 to-gray-600';

  return (
    <div
      className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center text-white font-semibold text-sm shadow-md ring-2 ring-white/50`}
      aria-label={displayName}
    >
      {initials}
    </div>
  );
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function ConnectionTooltip({
  connection,
  position,
  visible,
  mapDimensions,
}: ConnectionTooltipProps) {
  const TOOLTIP_WIDTH = 320;
  const TOOLTIP_HEIGHT = 140;
  const OFFSET_X = 16;
  const OFFSET_Y = 16;

  // Calculate smart positioning to keep tooltip within viewport
  const tooltipPosition = useMemo(() => {
    let x = position.x + OFFSET_X;
    let y = position.y - TOOLTIP_HEIGHT - OFFSET_Y;

    // Check if tooltip would overflow right edge
    if (x + TOOLTIP_WIDTH > mapDimensions.width) {
      x = position.x - TOOLTIP_WIDTH - OFFSET_X;
    }

    // Check if tooltip would overflow left edge
    if (x < 0) {
      x = Math.max(8, mapDimensions.width - TOOLTIP_WIDTH - 8);
    }

    // Check if tooltip would overflow top edge
    if (y < 0) {
      y = position.y + OFFSET_Y;
    }

    // Check if tooltip would overflow bottom edge
    if (y + TOOLTIP_HEIGHT > mapDimensions.height) {
      y = mapDimensions.height - TOOLTIP_HEIGHT - 8;
    }

    return { x, y };
  }, [position, mapDimensions]);

  const distance = useMemo(
    () =>
      calculateDistance(
        connection.fromLocation.lat,
        connection.fromLocation.lng,
        connection.toLocation.lat,
        connection.toLocation.lng
      ),
    [connection]
  );

  const timeAgo = useMemo(
    () => formatTimeAgo(connection.createdAt),
    [connection.createdAt]
  );

  // Determine if names should show as anonymous
  const isRequesterAnonymous = connection.requesterName === 'Anonymous';
  const isReplierAnonymous = connection.replierName === 'Anonymous';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            width: TOOLTIP_WIDTH,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
          role="tooltip"
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Main glass card */}
          <div className="glass-strong rounded-xl p-4 shadow-2xl border-2 border-white/60 overflow-hidden">
            {/* Gradient accent border */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-400/20 via-blue-400/20 to-pink-400/20 pointer-events-none" />

            {/* Content */}
            <div className="relative space-y-3">
              {/* Header: Avatars and Names */}
              <div className="flex items-center gap-3">
                <Avatar name={connection.replierName} isAnonymous={isReplierAnonymous} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {isReplierAnonymous ? 'Anonymous' : connection.replierName}
                  </p>
                  <p className="text-xs text-gray-600">
                    prayed for{' '}
                    <span className="font-medium">
                      {isRequesterAnonymous ? 'Anonymous' : connection.requesterName}
                    </span>
                  </p>
                </div>

                <Avatar name={connection.requesterName} isAnonymous={isRequesterAnonymous} />
              </div>

              {/* Prayer Title (if provided) */}
              {connection.prayerTitle && (
                <div className="flex items-start gap-2">
                  <ResponseTypeIcon type={connection.responseType} />
                  <p className="text-xs text-gray-700 font-medium line-clamp-2">
                    "{truncate(connection.prayerTitle, 60)}"
                  </p>
                </div>
              )}

              {/* Footer: Time and Distance */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin size={12} className="text-purple-500" />
                  <span className="font-medium">{distance.toLocaleString()} miles</span>
                </div>

                <div className="text-xs text-gray-500 font-medium">
                  {timeAgo}
                </div>
              </div>
            </div>
          </div>

          {/* Subtle pointer/arrow pointing to the connection line */}
          <div
            className="absolute w-3 h-3 bg-white/90 rotate-45 shadow-md"
            style={{
              left: '50%',
              bottom: -4,
              transform: 'translateX(-50%) rotate(45deg)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
