/**
 * Audio and Video Player Components for Admin Dashboard
 * Simple, clean players for reviewing prayer content
 */

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react'

interface AudioPlayerProps {
  src: string
  className?: string
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AudioPlayer({ src, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
      setError(null)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = () => {
      setError('Failed to load audio')
      setIsLoading(false)
    }

    const handleCanPlay = () => setIsLoading(false)

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [src])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(console.error)
    }
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setIsMuted(!isMuted)
  }

  const restart = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(console.error)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audio.currentTime = percent * duration
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm ${className}`}>
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Progress Bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="h-2 bg-gray-200 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Restart Button */}
      <button
        onClick={restart}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        title="Restart"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Mute Button */}
      <button
        onClick={toggleMute}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}

interface VideoPlayerProps {
  src: string
  className?: string
}

export function VideoPlayer({ src, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleError = () => {
      setError('Failed to load video')
    }

    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('error', handleError)
    }
  }, [src])

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm ${className}`}>
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        src={src}
        controls
        preload="metadata"
        className="w-full max-h-64"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

interface MediaPlayerProps {
  src: string | null
  contentType: string
  className?: string
}

export function MediaPlayer({ src, contentType, className = '' }: MediaPlayerProps) {
  if (!src) {
    return (
      <div className={`p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm ${className}`}>
        No media URL available
      </div>
    )
  }

  if (contentType === 'audio') {
    return <AudioPlayer src={src} className={className} />
  }

  if (contentType === 'video') {
    return <VideoPlayer src={src} className={className} />
  }

  return null
}
