import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  compact?: boolean;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ src, autoPlay = true, onEnded, compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Audio visualization bars (simulated waveform)
  const [waveformBars] = useState(() =>
    Array.from({ length: 40 }, () => 0.2 + Math.random() * 0.8)
  );

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      if (autoPlay && !hasPlayed) {
        audio.play().catch(console.error);
        setHasPlayed(true);
      }
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
    };
  }, [autoPlay, hasPlayed, isDragging, onEnded]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(console.error);
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress) return;

    const rect = progress.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
    setCurrentTime(percent * duration);
  }, [duration]);

  const handleProgressDrag = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress) return;

    const rect = progress.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = percent * duration;
    setCurrentTime(percent * duration);
  }, [isDragging, duration]);

  const startDrag = useCallback(() => setIsDragging(true), []);
  const endDrag = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', endDrag);
      document.addEventListener('touchend', endDrag);
      return () => {
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
      };
    }
  }, [isDragging, endDrag]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 glass rounded-full px-4 py-2">
        <audio ref={audioRef} src={src} preload="metadata" />

        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-purple-300 flex items-center justify-center shadow-lg"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-gray-800" />
          ) : (
            <Play className="w-5 h-5 text-gray-800 ml-0.5" />
          )}
        </button>

        <div className="flex-1">
          <div
            ref={progressRef}
            className="h-1 bg-gray-300/50 rounded-full cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-purple-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <span className="text-xs text-gray-600 tabular-nums">
          {formatTime(currentTime)}
        </span>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Animated Waveform Visualization */}
      <div className="relative h-16 flex items-center justify-center gap-[2px] overflow-hidden rounded-xl bg-gradient-to-br from-purple-50/50 to-yellow-50/50 px-2">
        {waveformBars.map((height, i) => {
          const barProgress = (i / waveformBars.length) * 100;
          const isPast = barProgress < progress;
          const isCurrent = Math.abs(barProgress - progress) < 3;

          return (
            <motion.div
              key={i}
              className={`w-1 rounded-full transition-colors duration-150 ${
                isPast
                  ? 'bg-gradient-to-t from-yellow-400 to-purple-400'
                  : 'bg-gray-300/60'
              }`}
              style={{ height: `${height * 100}%` }}
              animate={isPlaying && isCurrent ? {
                scaleY: [1, 1.3, 1],
              } : {}}
              transition={{
                duration: 0.3,
                repeat: isPlaying && isCurrent ? Infinity : 0,
              }}
            />
          );
        })}

        {/* Glow effect on current position */}
        <motion.div
          className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-yellow-300/30 to-transparent pointer-events-none"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
          animate={isPlaying ? { opacity: [0.3, 0.6, 0.3] } : { opacity: 0.3 }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>

      {/* Progress Bar (Seekable) */}
      <div
        ref={progressRef}
        className="relative h-2 bg-gray-200/50 rounded-full cursor-pointer group"
        onClick={handleProgressClick}
        onMouseDown={startDrag}
        onMouseMove={handleProgressDrag}
        onTouchStart={startDrag}
        onTouchMove={handleProgressDrag}
      >
        {/* Progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 rounded-full"
          style={{ width: `${progress}%` }}
        />

        {/* Draggable thumb */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        />

        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ width: '50%' }}
        />
      </div>

      {/* Time Display */}
      <div className="flex justify-between text-sm text-gray-600 tabular-nums">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Restart */}
        <motion.button
          onClick={restart}
          className="p-3 glass rounded-full hover:bg-white/30 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <RotateCcw className="w-5 h-5 text-gray-700" />
        </motion.button>

        {/* Play/Pause */}
        <motion.button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 via-pink-300 to-purple-300 flex items-center justify-center shadow-xl shadow-purple-200/50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={isPlaying ? {
            boxShadow: [
              '0 10px 30px -10px rgba(168, 85, 247, 0.4)',
              '0 10px 40px -10px rgba(168, 85, 247, 0.6)',
              '0 10px 30px -10px rgba(168, 85, 247, 0.4)',
            ]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="w-6 h-6 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"
              />
            ) : isPlaying ? (
              <motion.div
                key="pause"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Pause className="w-7 h-7 text-gray-800" />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Play className="w-7 h-7 text-gray-800 ml-1" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Mute/Unmute */}
        <motion.button
          onClick={toggleMute}
          className="p-3 glass rounded-full hover:bg-white/30 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-gray-700" />
          ) : (
            <Volume2 className="w-5 h-5 text-gray-700" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
