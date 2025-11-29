import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Play,
  Pause,
  Volume2,
  VolumeX,
  User,
  MapPin
} from 'lucide-react';
import type { Prayer } from '../types/prayer';

interface PrayerVideoPlayerProps {
  prayer: Prayer;
  isActive?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  onPray?: (prayer: Prayer) => void;
  onShare?: (prayer: Prayer) => void;
  onReport?: (prayer: Prayer) => void;
  userLocation?: { lat: number; lng: number };
}

// Safe zones for vertical video (optimized for all platforms)
const SAFE_ZONES = {
  top: 140,      // Space for status bar and top controls
  bottom: 200,   // Space for bottom controls and home indicator
  right: 120,    // Space for action buttons
  left: 60       // Minimal left margin
};

/**
 * Full-screen vertical video player inspired by TikTok/Reels
 * with PrayerMap's ethereal spiritual aesthetic
 */
export function PrayerVideoPlayer({
  prayer,
  isActive = true,
  onNext,
  onPrevious,
  onPray,
  onShare,
  onReport,
  userLocation
}: PrayerVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(isActive);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPraying, setIsPraying] = useState(false);
  const [showPrayerAnimation, setShowPrayerAnimation] = useState(false);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-hide controls after 3 seconds
  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  // Video controls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onNext?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onNext]);

  // Play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && isPlaying) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [isActive, isPlaying]);

  // Gesture handlers
  const handleTap = useCallback(() => {
    setIsPlaying(prev => !prev);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleDoubleTap = useCallback(() => {
    if (!isPraying && onPray) {
      setIsPraying(true);
      setShowPrayerAnimation(true);
      
      // Trigger haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }

      setTimeout(() => {
        onPray(prayer);
        setIsPraying(false);
        setShowPrayerAnimation(false);
      }, 2000);
    }
  }, [isPraying, onPray, prayer]);

  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.y;

    if (Math.abs(info.offset.y) > threshold || Math.abs(velocity) > 500) {
      if (info.offset.y < 0 || velocity < -500) {
        onNext?.();
      } else if (info.offset.y > 0 || velocity > 500) {
        onPrevious?.();
      }
    }
  }, [onNext, onPrevious]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateDistance = useCallback((
    lat1: number, lng1: number, lat2: number, lng2: number
  ): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden touch-pan-y"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onPanEnd={handlePanEnd}
      onTap={handleTap}
      onTapStart={(event) => {
        // Detect double tap
        const now = Date.now();
        const lastTap = (event.target as any).lastTapTime || 0;
        if (now - lastTap < 300) {
          event.preventDefault();
          handleDoubleTap();
        }
        (event.target as any).lastTapTime = now;
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={prayer.content_url || ''}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted={isMuted}
        loop
        preload="metadata"
      />

      {/* Gradient Overlays for Better Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

      {/* Prayer Animation Overlay */}
      <AnimatePresence>
        {showPrayerAnimation && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 1, repeat: 1 }}
            >
              {/* Multiple hearts floating up */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-4xl"
                  initial={{ 
                    opacity: 0,
                    y: 0,
                    x: Math.random() * 60 - 30,
                    scale: 0
                  }}
                  animate={{ 
                    opacity: [0, 1, 1, 0],
                    y: -100,
                    scale: [0, 1.2, 1, 0.8]
                  }}
                  transition={{ 
                    duration: 2,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                >
                  🙏
                </motion.div>
              ))}
              <div className="text-6xl">✨</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause Icon Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {!isPlaying && (
              <motion.div
                className="glass-strong p-4 rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Play className="w-12 h-12 text-white fill-white" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Safe Zone - Prayer Info */}
      <div 
        className="absolute top-0 left-0 right-0 z-40"
        style={{ paddingTop: `${SAFE_ZONES.top}px` }}
      >
        <AnimatePresence>
          {showControls && (
            <motion.div
              className="px-4 pb-4"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
            >
              {/* Progress Bar */}
              <div className="w-full h-1 bg-white/20 rounded-full mb-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-300 to-purple-300 origin-left"
                  style={{ scaleX: progress / 100 }}
                />
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-white/70 via-white/50 to-white/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-lg">
                  <User className="w-4 h-4 text-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm drop-shadow-lg">
                    {prayer.is_anonymous ? 'Anonymous Prayer' : prayer.user_name || 'Anonymous'}
                  </p>
                  {userLocation && (
                    <div className="flex items-center gap-1 text-white/80 text-xs drop-shadow-md">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {calculateDistance(
                          userLocation.lat,
                          userLocation.lng,
                          prayer.location.lat,
                          prayer.location.lng
                        ).toFixed(1)} miles away
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-white/70 via-white/50 to-white/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/40 shadow-lg">
                  <span className="text-gray-700 font-mono text-xs font-medium">
                    {formatTime(duration - (duration * progress / 100))}
                  </span>
                </div>
              </div>

              {/* Prayer Title */}
              {prayer.title && (
                <p className="text-white text-sm font-medium mb-2 line-clamp-2 drop-shadow-lg">
                  {prayer.title}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Side Action Buttons */}
      <div 
        className="absolute top-1/2 right-0 -translate-y-1/2 z-40"
        style={{ paddingRight: `${SAFE_ZONES.right - 60}px` }}
      >
        <div className="flex flex-col gap-6 items-center">
          {/* Pray Button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              handleDoubleTap();
            }}
            className="group relative"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            disabled={isPraying}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-300/80 to-purple-300/80 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:from-yellow-400/90 group-hover:to-purple-400/90 transition-all">
              <Heart className={`w-6 h-6 ${isPraying ? 'text-red-500 fill-red-500' : 'text-gray-800'} transition-colors`} />
            </div>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-medium">
              Pray
            </span>
          </motion.button>

          {/* Comment/Respond Button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              // Open response modal (to be implemented)
            }}
            className="group"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-12 h-12 glass-strong rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-medium">
              Respond
            </span>
          </motion.button>

          {/* Share Button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onShare?.(prayer);
            }}
            className="group"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-12 h-12 glass-strong rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-medium">
              Share
            </span>
          </motion.button>

          {/* More Options */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onReport?.(prayer);
            }}
            className="group"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-12 h-12 glass-strong rounded-full flex items-center justify-center group-hover:bg-white/30 transition-all">
              <MoreHorizontal className="w-6 h-6 text-white" />
            </div>
          </motion.button>
        </div>
      </div>

      {/* Bottom Safe Zone - Prayer Description */}
      <div 
        className="absolute bottom-0 left-0 right-0 z-40"
        style={{ 
          paddingBottom: `${SAFE_ZONES.bottom}px`,
          paddingRight: `${SAFE_ZONES.right}px`,
          paddingLeft: `${SAFE_ZONES.left}px`
        }}
      >
        <AnimatePresence>
          {showControls && (
            <motion.div
              className="pt-4"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              {/* Prayer Content */}
              <div className="mb-4">
                <p className="text-white text-sm leading-relaxed line-clamp-3">
                  {prayer.content}
                </p>
              </div>

              {/* Bottom Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Mute Toggle */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(prev => !prev);
                      showControlsTemporarily();
                    }}
                    className="p-2"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white/70" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white" />
                    )}
                  </motion.button>
                </div>

                {/* Prayer Category Badge */}
                {prayer.category && (
                  <div className="glass-strong px-3 py-1 rounded-full">
                    <span className="text-white/90 text-xs font-medium">
                      {prayer.category}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading Indicator */}
      {prayer.content_url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
}