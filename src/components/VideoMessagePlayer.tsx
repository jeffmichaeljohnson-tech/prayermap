import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Maximize2, X, Pause } from 'lucide-react';
import { formatDuration } from '../hooks/useAudioRecorder';

interface VideoMessagePlayerProps {
  src: string;
  thumbnailUrl?: string;
  duration?: number;
  className?: string;
}

export function VideoMessagePlayer({
  src,
  thumbnailUrl,
  duration: initialDuration,
  className = ''
}: VideoMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fullscreenVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError('Failed to load video');
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const handlePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      setIsPlaying(true);

      // Hide controls after 2 seconds
      hideControlsAfterDelay();
    } catch (err) {
      console.error('Video playback error:', err);
      setError('Playback failed');
    }
  };

  const handlePause = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setIsPlaying(false);
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const hideControlsAfterDelay = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2000);
  };

  const openFullscreen = () => {
    setIsFullscreen(true);
    // Sync time with main video
    const mainVideo = videoRef.current;
    if (mainVideo) {
      mainVideo.pause();
    }
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    const fullscreenVideo = fullscreenVideoRef.current;
    const mainVideo = videoRef.current;
    
    if (fullscreenVideo && mainVideo) {
      mainVideo.currentTime = fullscreenVideo.currentTime;
      if (!fullscreenVideo.paused) {
        mainVideo.play().catch(console.error);
      }
    }
  };

  const handleContainerClick = () => {
    setShowControls(true);
    if (isPlaying) {
      hideControlsAfterDelay();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-red-500 text-sm">{error}</span>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-black cursor-pointer ${className}`}
        onClick={handleContainerClick}
      >
        {/* Thumbnail (before playing) */}
        {!isPlaying && thumbnailUrl && currentTime === 0 && (
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        )}

        {/* Video */}
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="metadata"
          className={`w-full h-full object-cover ${!isPlaying && thumbnailUrl && currentTime === 0 ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Play button overlay */}
        <AnimatePresence>
          {(!isPlaying || showControls) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 flex items-center justify-center z-20"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayback();
                }}
                className="w-16 h-16 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 text-gray-800" />
                ) : (
                  <Play className="w-7 h-7 text-gray-800 ml-1" />
                )}
              </button>

              {/* Duration badge */}
              {duration > 0 && !isPlaying && currentTime === 0 && (
                <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(Math.floor(duration))}
                </span>
              )}

              {/* Current time during playback */}
              {(isPlaying || currentTime > 0) && (
                <span className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
                </span>
              )}

              {/* Fullscreen button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openFullscreen();
                }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                aria-label="Enter fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={fullscreenVideoRef}
              src={src}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              onLoadedMetadata={() => {
                const fullscreenVideo = fullscreenVideoRef.current;
                const mainVideo = videoRef.current;
                if (fullscreenVideo && mainVideo) {
                  fullscreenVideo.currentTime = mainVideo.currentTime;
                }
              }}
            />
            <button
              type="button"
              onClick={closeFullscreen}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              aria-label="Exit fullscreen"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

