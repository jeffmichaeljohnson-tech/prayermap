/**
 * ConnectionDetailModal - Detailed view of prayer connection
 *
 * Shows full details when a user clicks/taps a connection line:
 * - Prayer summary
 * - Response summary
 * - User information (respecting privacy)
 * - Connection metadata (distance, date)
 * - Action buttons (view prayer, view response, share)
 *
 * Mobile-first design: Full-screen on mobile, centered modal on desktop
 * Features: Rainbow gradient header, swipe-down to dismiss, location labels
 */

import { useMemo, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, MapPin, Calendar, Share2, Eye, MessageCircle, Plus } from 'lucide-react';
import type { PrayerConnection, Prayer, PrayerResponse } from '../../types/prayer';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

export interface ConnectionDetailModalProps {
  connection: PrayerConnection | null;
  prayer?: Prayer;
  response?: PrayerResponse;
  isOpen: boolean;
  onClose: () => void;
  onViewPrayer: (prayerId: string) => void;
  onViewResponse?: (responseId: string) => void;
  onAddPrayer?: (prayerId: string) => void;
  onShare?: () => void;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Get content type display icon
 */
function getContentTypeIcon(contentType: 'text' | 'audio' | 'video'): string {
  switch (contentType) {
    case 'audio':
      return '🎤';
    case 'video':
      return '🎥';
    default:
      return '💬';
  }
}

/**
 * Get location label from coordinates
 * In production, this would use reverse geocoding
 * For now, shows formatted coordinates as fallback
 */
function getLocationLabel(lat: number, lng: number): string {
  // TODO: Implement reverse geocoding with Mapbox API
  // For now, return formatted coordinates
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lng).toFixed(2)}°${lngDir}`;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return formatDate(date);
}

/**
 * ConnectionDetailModal component
 */
export function ConnectionDetailModal({
  connection,
  prayer,
  response,
  isOpen,
  onClose,
  onViewPrayer,
  onViewResponse,
  onAddPrayer,
  onShare,
}: ConnectionDetailModalProps) {
  // Swipe-down to dismiss gesture tracking
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 100], [1, 0.5]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Calculate connection distance
  const distance = useMemo(() => {
    if (!connection) return 0;
    return calculateDistance(
      connection.fromLocation.lat,
      connection.fromLocation.lng,
      connection.toLocation.lat,
      connection.toLocation.lng
    );
  }, [connection]);

  // Calculate location labels
  const fromLocation = useMemo(() => {
    if (!connection) return '';
    return getLocationLabel(connection.fromLocation.lat, connection.fromLocation.lng);
  }, [connection]);

  const toLocation = useMemo(() => {
    if (!connection) return '';
    return getLocationLabel(connection.toLocation.lat, connection.toLocation.lng);
  }, [connection]);

  // Don't render if not open or no connection
  if (!connection) return null;

  // Handle swipe down to dismiss
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    } else {
      // Snap back to position
      y.set(0);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share implementation - copy link to clipboard
      const shareUrl = `${window.location.origin}/connection/${connection.id}`;
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          // Could add toast notification here
          console.log('Connection link copied to clipboard');
        })
        .catch((err) => {
          console.error('Failed to copy link:', err);
        });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            style={{ y, opacity }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden relative flex flex-col"
          >
            {/* Swipe indicator (mobile) */}
            <div className="sm:hidden pt-2 pb-1 flex justify-center">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors z-10 bg-white/50"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>

            {/* Rainbow Gradient Header */}
            <div
              className="relative p-6 pb-4 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(45, 100%, 75%) 0%, hsl(200, 80%, 75%) 50%, hsl(270, 60%, 75%) 100%)'
              }}
            >
              {/* Overlay for text contrast */}
              <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />

              <div className="relative z-10 flex items-center gap-3 mb-2">
                <motion.div
                  className="text-3xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                >
                  ✨
                </motion.div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-800 drop-shadow-sm">
                    Prayer Connection
                  </h2>
                  <p className="text-sm text-gray-700 drop-shadow-sm">
                    {getRelativeTime(connection.createdAt)} • {formatDate(connection.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Connection Info - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Distance & Locations */}
              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-5 h-5 text-prayer-purple flex-shrink-0" />
                  <span className="text-sm">
                    Connection spans <strong>{distance.toFixed(1)} miles</strong>
                  </span>
                </div>

                {/* Location labels */}
                <div className="flex items-start gap-2 text-xs text-gray-600 ml-7">
                  <div className="flex-1">
                    <p className="font-medium text-gray-700 mb-1">From</p>
                    <p className="text-gray-600">{fromLocation}</p>
                    <p className="text-gray-500 mt-1">{connection.requesterName}</p>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-700 mb-1">To</p>
                    <p className="text-gray-600">{toLocation}</p>
                    <p className="text-gray-500 mt-1">{connection.replierName}</p>
                  </div>
                </div>
              </div>

              {/* Prayer Section */}
              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getContentTypeIcon(prayer?.content_type || 'text')}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">
                      Prayer Request
                    </h3>
                    <p className="text-xs text-gray-600 mb-2">
                      From:{' '}
                      <span className="font-medium">
                        {connection.requesterName}
                      </span>
                    </p>
                    {prayer?.title && (
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        {prayer.title}
                      </p>
                    )}
                    {prayer?.content_type === 'text' && prayer?.content && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {truncateText(prayer.content, 150)}
                      </p>
                    )}
                    {prayer?.content_type === 'audio' && (
                      <p className="text-sm text-gray-600 italic">
                        Audio prayer
                      </p>
                    )}
                    {prayer?.content_type === 'video' && (
                      <p className="text-sm text-gray-600 italic">
                        Video prayer
                      </p>
                    )}
                    {!prayer && (
                      <p className="text-sm text-gray-500 italic">
                        Prayer details not available
                      </p>
                    )}
                  </div>
                </div>

                {/* View Prayer Button */}
                <Button
                  onClick={() => onViewPrayer(connection.prayerId)}
                  variant="outline"
                  className="w-full glass hover:bg-white/40 text-sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Prayer
                </Button>
              </div>

              {/* Response Section */}
              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getContentTypeIcon(response?.content_type || 'text')}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">
                      Prayer Response
                    </h3>
                    <p className="text-xs text-gray-600 mb-2">
                      From:{' '}
                      <span className="font-medium">
                        {connection.replierName}
                      </span>
                    </p>
                    {response?.content_type === 'text' && response?.message && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {truncateText(response.message, 150)}
                      </p>
                    )}
                    {response?.content_type === 'audio' && (
                      <p className="text-sm text-gray-600 italic">
                        Audio response
                      </p>
                    )}
                    {response?.content_type === 'video' && (
                      <p className="text-sm text-gray-600 italic">
                        Video response
                      </p>
                    )}
                    {!response && (
                      <p className="text-sm text-gray-500 italic">
                        Response details not available
                      </p>
                    )}
                  </div>
                </div>

                {/* View Response Button */}
                {response && onViewResponse && connection.prayerResponseId && (
                  <Button
                    onClick={() => onViewResponse(connection.prayerResponseId!)}
                    variant="outline"
                    className="w-full glass hover:bg-white/40 text-sm"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    View Response
                  </Button>
                )}
              </div>

              {/* Mini Map View */}
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Connection Path
                </h3>
                <div className="relative bg-gradient-to-br from-heavenly-blue to-prayer-purple rounded-xl aspect-video overflow-hidden">
                  {/* Simple visual representation of connection */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 400 200"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <linearGradient
                        id="miniMapGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(45, 100%, 70%)"
                          stopOpacity="0.9"
                        />
                        <stop
                          offset="50%"
                          stopColor="hsl(200, 80%, 70%)"
                          stopOpacity="0.9"
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(270, 60%, 70%)"
                          stopOpacity="0.9"
                        />
                      </linearGradient>
                    </defs>

                    {/* Connection line */}
                    <motion.path
                      d="M 50 100 Q 200 50 350 100"
                      fill="none"
                      stroke="url(#miniMapGradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />

                    {/* From marker */}
                    <motion.circle
                      cx="50"
                      cy="100"
                      r="8"
                      fill="hsl(45, 100%, 60%)"
                      stroke="white"
                      strokeWidth="2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.5 }}
                    />

                    {/* To marker */}
                    <motion.circle
                      cx="350"
                      cy="100"
                      r="8"
                      fill="hsl(270, 60%, 60%)"
                      stroke="white"
                      strokeWidth="2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.7 }}
                    />
                  </svg>

                  {/* Labels */}
                  <div className="absolute bottom-2 left-2 text-xs font-medium text-white bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
                    {connection.requesterName}
                  </div>
                  <div className="absolute bottom-2 right-2 text-xs font-medium text-white bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
                    {connection.replierName}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  {/* Add Your Prayer Button */}
                  {onAddPrayer && (
                    <Button
                      onClick={() => onAddPrayer(connection.prayerId)}
                      className="flex-1 bg-gradient-to-r from-prayer-purple to-primary-blue text-white hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your Prayer
                    </Button>
                  )}

                  {/* Share Button */}
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className={cn(
                      'flex-1 glass hover:bg-white/40',
                      !onAddPrayer && 'flex-1',
                      !onShare && 'opacity-75'
                    )}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="glass rounded-xl p-3 border border-white/30">
                <p className="text-xs text-gray-600 leading-relaxed">
                  🔒 This connection represents a sacred moment of shared prayer.
                  Personal details respect the privacy settings chosen by each
                  person.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
