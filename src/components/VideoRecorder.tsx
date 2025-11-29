import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Square, Pause, Play, RotateCcw, Check, RefreshCw, Camera, Sparkles } from 'lucide-react';
import { useVideoRecorder, formatVideoDuration } from '../hooks/useVideoRecorder';
import { Button } from './ui/button';

interface VideoRecorderProps {
  onRecordingComplete: (videoBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  maxDuration?: number; // Maximum recording duration in seconds
}

/**
 * Instagram-like video recorder with ethereal glass aesthetic
 */
export function VideoRecorder({ onRecordingComplete, onCancel, maxDuration = 90 }: VideoRecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    videoBlob,
    videoUrl,
    error,
    isCameraReady,
    facingMode,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    switchCamera,
    initializeCamera,
    stopCamera,
    videoRef,
  } = useVideoRecorder();

  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize camera on mount
  useEffect(() => {
    initializeCamera();
    return () => stopCamera();
  }, [initializeCamera, stopCamera]);

  // Auto-stop when max duration reached
  useEffect(() => {
    if (isRecording && !isPaused && duration >= maxDuration) {
      stopRecording();
    }
  }, [isRecording, isPaused, duration, maxDuration, stopRecording]);

  const handleConfirm = () => {
    if (videoBlob) {
      onRecordingComplete(videoBlob, duration);
    }
  };

  const handleReset = () => {
    resetRecording();
    initializeCamera();
  };

  // Recording has been made and stopped
  const hasRecording = !!videoBlob && !!videoUrl;

  // Progress percentage for the ring
  const progress = (duration / maxDuration) * 100;

  return (
    <div className="space-y-4">
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl p-3 text-sm text-red-700"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instagram-style Video Preview Container */}
      <div className="relative aspect-[9/16] max-h-[400px] rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 border border-white/30 shadow-2xl">
        {/* Ethereal Glass Overlay Effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none z-10" />

        {/* Animated Sparkle Border when Recording */}
        {isRecording && !isPaused && (
          <motion.div
            className="absolute inset-0 rounded-3xl pointer-events-none z-20"
            style={{
              background: 'linear-gradient(90deg, rgba(255,215,0,0.5), rgba(255,192,203,0.5), rgba(147,112,219,0.5), rgba(135,206,250,0.5), rgba(255,215,0,0.5))',
              backgroundSize: '300% 300%',
              padding: '3px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear'
            }}
          />
        )}

        {/* Live Camera Preview */}
        {!hasRecording && (
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
        )}

        {/* Recorded Video Preview */}
        {hasRecording && (
          <video
            ref={previewVideoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            controls
            playsInline
          />
        )}

        {/* Camera Loading State */}
        {!isCameraReady && !hasRecording && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mb-4"
            >
              <Camera className="w-12 h-12 text-white/70" />
            </motion.div>
            <p className="text-white/70 text-sm">Initializing camera...</p>
          </div>
        )}

        {/* Idle State Overlay */}
        {isCameraReady && !isRecording && !hasRecording && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-8 h-8 text-yellow-300/80" />
              </motion.div>
              <p className="text-white/90 text-sm mt-2 font-medium">Tap to record your prayer</p>
            </motion.div>
          </div>
        )}

        {/* Recording Paused Overlay */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/30">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 glass-strong px-4 py-2 rounded-full"
            >
              <Pause className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Paused</span>
            </motion.div>
          </div>
        )}

        {/* Top Controls Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30">
          {/* Timer */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`glass-strong px-3 py-1.5 rounded-full flex items-center gap-2 ${
              isRecording && !isPaused ? 'bg-red-500/30' : ''
            }`}
          >
            {isRecording && !isPaused && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 bg-red-500 rounded-full"
              />
            )}
            <span className="text-white font-mono text-sm font-medium">
              {formatVideoDuration(duration)} / {formatVideoDuration(maxDuration)}
            </span>
          </motion.div>

          {/* Camera Switch Button */}
          {isCameraReady && !hasRecording && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={switchCamera}
              className="glass-strong p-2 rounded-full"
              aria-label="Switch camera"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </div>

        {/* Recording Progress Ring (at bottom) */}
        {isRecording && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            <svg className="w-20 h-20 -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="transparent"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="4"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                fill="transparent"
                stroke="url(#progressGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={226}
                strokeDashoffset={226 - (226 * progress) / 100}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="50%" stopColor="#FF69B4" />
                  <stop offset="100%" stopColor="#9370DB" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-2">
        {/* Not recording yet and camera is ready */}
        {isCameraReady && !isRecording && !hasRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white shadow-xl shadow-red-500/40 border-4 border-white/50"
              aria-label="Start recording"
            >
              <Video className="w-8 h-8" />
            </Button>
          </motion.div>
        )}

        {/* Currently recording */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4"
          >
            {/* Pause/Resume */}
            <Button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="w-14 h-14 rounded-full glass-strong hover:bg-white/30 border border-white/40"
              aria-label={isPaused ? "Resume recording" : "Pause recording"}
            >
              {isPaused ? <Play className="w-6 h-6 text-white" /> : <Pause className="w-6 h-6 text-white" />}
            </Button>

            {/* Stop */}
            <Button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white shadow-xl shadow-red-500/40 border-4 border-white/50"
              aria-label="Stop recording"
            >
              <Square className="w-8 h-8 fill-current" />
            </Button>
          </motion.div>
        )}

        {/* Has recording - show confirm/reset */}
        {hasRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4"
          >
            {/* Reset */}
            <Button
              onClick={handleReset}
              className="w-14 h-14 rounded-full glass-strong hover:bg-white/30 border border-white/40"
              aria-label="Reset recording"
            >
              <RotateCcw className="w-6 h-6 text-gray-700" />
            </Button>

            {/* Confirm */}
            <Button
              onClick={handleConfirm}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 hover:from-green-500 hover:to-emerald-700 text-white shadow-xl shadow-green-500/40 border-4 border-white/50"
              aria-label="Confirm recording"
            >
              <Check className="w-8 h-8" />
            </Button>
          </motion.div>
        )}
      </div>

      {/* Recording Ready Message */}
      {hasRecording && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-green-600 text-center"
        >
          Recording ready ({formatVideoDuration(duration)})
        </motion.p>
      )}

      {/* Cancel button */}
      {onCancel && (
        <div className="text-center">
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
