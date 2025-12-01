import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { PrayerVideoPlayer } from './PrayerVideoPlayer';
import type { Prayer } from '../../types/prayer';

interface PrayerVideoFeedProps {
  prayers: Prayer[];
  initialIndex?: number;
  userLocation?: { lat: number; lng: number };
  onClose: () => void;
  onPray: (prayer: Prayer) => void;
  onShare?: (prayer: Prayer) => void;
  onReport?: (prayer: Prayer) => void;
  onLoadMore?: () => void;
}

/**
 * Full-screen video feed with infinite scroll
 * Inspired by TikTok/Reels but adapted for prayer content
 */
export function PrayerVideoFeed({
  prayers,
  initialIndex = 0,
  userLocation,
  onClose,
  onPray,
  onShare,
  onReport,
  onLoadMore
}: PrayerVideoFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number>(0);
  const lastPanY = useRef<number>(0);

  // Filter only video prayers
  const videoPrayers = prayers.filter(p => p.content_type === 'video' && p.content_url);

  const currentPrayer = videoPrayers[currentIndex];

  // Navigate to next video
  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (currentIndex < videoPrayers.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (onLoadMore) {
      onLoadMore();
    }
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentIndex, videoPrayers.length, isTransitioning, onLoadMore]);

  // Navigate to previous video
  const goToPrevious = useCallback(() => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentIndex, isTransitioning]);

  // Handle pan gestures for swipe navigation
  const handlePan = useCallback((event: any, info: PanInfo) => {
    if (isTransitioning) return;
    
    const deltaY = info.offset.y;
    lastPanY.current = deltaY;
    
    // Apply transform during pan for smooth feel
    if (containerRef.current) {
      containerRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, [isTransitioning]);

  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    if (isTransitioning) return;

    // Reset transform
    if (containerRef.current) {
      containerRef.current.style.transform = '';
    }

    const threshold = 100;
    const velocity = Math.abs(info.velocity.y);
    const offset = Math.abs(info.offset.y);
    
    // Determine if gesture was strong enough to trigger navigation
    const shouldNavigate = offset > threshold || velocity > 500;
    
    if (shouldNavigate) {
      if (info.offset.y < 0 || info.velocity.y < -500) {
        // Swipe up - next video
        goToNext();
      } else if (info.offset.y > 0 || info.velocity.y > 500) {
        // Swipe down - previous video
        goToPrevious();
      }
    }
  }, [goToNext, goToPrevious, isTransitioning]);

  // Preload adjacent videos for smooth playback
  useEffect(() => {
    const preloadVideo = (index: number) => {
      const prayer = videoPrayers[index];
      if (prayer?.content_url) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = prayer.content_url;
      }
    };

    // Preload next and previous videos
    if (currentIndex > 0) {
      preloadVideo(currentIndex - 1);
    }
    if (currentIndex < videoPrayers.length - 1) {
      preloadVideo(currentIndex + 1);
    }
    if (currentIndex < videoPrayers.length - 2) {
      preloadVideo(currentIndex + 2);
    }
  }, [currentIndex, videoPrayers]);

  // Load more content when approaching the end
  useEffect(() => {
    if (currentIndex >= videoPrayers.length - 2 && onLoadMore) {
      onLoadMore();
    }
  }, [currentIndex, videoPrayers.length, onLoadMore]);

  // Keyboard navigation for desktop
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, onClose]);

  // Prevent scrolling on document body while video feed is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!currentPrayer) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-center"
        >
          <div className="text-4xl mb-4">🙏</div>
          <p>No video prayers available</p>
          <button
            onClick={onClose}
            className="mt-4 glass-strong px-6 py-2 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-50 p-3 glass-strong rounded-full hover:bg-white/20 transition-colors"
        style={{ top: 'env(safe-area-inset-top, 1rem)' }}
      >
        <ArrowLeft className="w-6 h-6 text-white" />
      </button>

      {/* Video Counter */}
      <div className="absolute top-4 right-4 z-50 glass-strong px-3 py-1 rounded-full">
        <span className="text-white text-sm font-medium">
          {currentIndex + 1} / {videoPrayers.length}
        </span>
      </div>

      {/* Main Video Container */}
      <motion.div
        ref={containerRef}
        className="w-full h-full relative"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Current Video */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`video-${currentIndex}`}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ 
              duration: 0.3, 
              ease: "easeInOut"
            }}
          >
            <PrayerVideoPlayer
              prayer={currentPrayer}
              isActive={!isTransitioning}
              onNext={goToNext}
              onPrevious={goToPrevious}
              onPray={onPray}
              onShare={onShare}
              onReport={onReport}
              userLocation={userLocation}
            />
          </motion.div>
        </AnimatePresence>

        {/* Subtle gradient indicators for swipe direction */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-30" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-30" />

        {/* Swipe indicators */}
        {videoPrayers.length > 1 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 space-y-2">
            {videoPrayers.map((_, index) => (
              <motion.div
                key={index}
                className={`w-1 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-white h-8'
                    : index === currentIndex - 1 || index === currentIndex + 1
                    ? 'bg-white/60 h-4'
                    : 'bg-white/30 h-2'
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Loading indicator when transitioning */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Easter egg: Gesture hints for first-time users */}
      <motion.div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 3, duration: 1 }}
      >
        <div className="glass-strong px-4 py-2 rounded-full">
          <p className="text-white/70 text-xs text-center">
            Swipe up/down to navigate • Double tap to pray
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}