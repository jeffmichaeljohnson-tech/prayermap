import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { formatDuration } from '../hooks/useAudioRecorder';

interface AudioMessagePlayerProps {
  src: string;
  duration?: number; // Duration in seconds if known
  className?: string;
}

export function AudioMessagePlayer({ src, duration: initialDuration, className = '' }: AudioMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setError('Failed to load audio');
      setIsLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Playback failed');
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate fake waveform bars for visual interest
  const waveformBars = 20;

  if (error) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl bg-red-50 text-red-600 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-white/50 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlayback}
        disabled={isLoading}
        className="w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-colors"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <motion.div
            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Waveform / Progress */}
      <div className="flex-1">
        <div
          className="h-8 flex items-center gap-0.5 cursor-pointer"
          onClick={handleSeek}
          role="slider"
          aria-label="Audio progress"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
          tabIndex={0}
        >
          {[...Array(waveformBars)].map((_, i) => {
            const barProgress = (i / waveformBars) * 100;
            const isActive = barProgress <= progress;
            // Pseudo-random heights for visual interest
            const height = 8 + Math.sin(i * 0.8) * 8 + Math.cos(i * 1.2) * 4;

            return (
              <motion.div
                key={i}
                className={`w-1 rounded-full transition-colors ${isActive ? 'bg-purple-500' : 'bg-gray-300'}`}
                style={{ height }}
                animate={isPlaying && isActive ? { scaleY: [1, 1.2, 1] } : { scaleY: 1 }}
                transition={{ duration: 0.3, repeat: isPlaying && isActive ? Infinity : 0, delay: i * 0.05 }}
              />
            );
          })}
        </div>
      </div>

      {/* Duration */}
      <span className="text-sm text-gray-600 font-mono w-12 text-right flex-shrink-0">
        {isPlaying || currentTime > 0
          ? formatDuration(Math.floor(currentTime))
          : formatDuration(Math.floor(duration))}
      </span>
    </div>
  );
}

