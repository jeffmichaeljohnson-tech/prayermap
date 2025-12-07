/**
 * Instagram-Style Full-Screen Video Recorder
 *
 * Features:
 * - Full-screen 9:16 vertical video preview
 * - Minimalist UI with large record button
 * - Camera flip, close, and flash controls
 * - Circular progress indicator around record button
 * - Smooth animations and haptic feedback
 * - Recording timer overlay
 * - Preview and confirm flow
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCcw,
  Check,
  SwitchCamera,
  Pause,
  Play,
} from 'lucide-react';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { formatDuration } from '../hooks/useAudioRecorder';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface FullScreenVideoRecorderProps {
  onRecordingComplete: (videoBlob: Blob, duration: number, thumbnailUrl: string | null) => void;
  onClose: () => void;
  maxDuration?: number; // Default 60 seconds for stories
}

export function FullScreenVideoRecorder({
  onRecordingComplete,
  onClose,
  maxDuration = 60,
}: FullScreenVideoRecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    videoBlob,
    videoUrl,
    thumbnailUrl,
    error,
    previewStream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    switchCamera,
    videoRef,
  } = useVideoRecorder(maxDuration);

  // Calculate progress for circular indicator (0 to 1)
  const progress = duration / maxDuration;

  // Trigger haptic feedback
  const triggerHaptic = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      await Haptics.impact({ style });
    } catch {
      // Haptics not available (web browser)
    }
  }, []);

  // Auto-stop when max duration reached
  useEffect(() => {
    if (isRecording && !isPaused && duration >= maxDuration) {
      stopRecording();
      triggerHaptic(ImpactStyle.Heavy);
    }
  }, [isRecording, isPaused, duration, maxDuration, stopRecording, triggerHaptic]);

  // Start preview on mount
  useEffect(() => {
    if (!previewStream && !isRecording && !videoBlob) {
      // Initialize camera preview without recording
      startRecording().then(() => {
        // Immediately pause to show preview only
        setTimeout(() => {
          if (!videoBlob) {
            resetRecording();
          }
        }, 100);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartRecording = async () => {
    await triggerHaptic(ImpactStyle.Heavy);
    await startRecording();
  };

  const handleStopRecording = async () => {
    await triggerHaptic(ImpactStyle.Medium);
    stopRecording();
  };

  const handleConfirm = async () => {
    await triggerHaptic(ImpactStyle.Light);
    if (videoBlob) {
      onRecordingComplete(videoBlob, duration, thumbnailUrl);
    }
  };

  const handleReset = async () => {
    await triggerHaptic(ImpactStyle.Light);
    resetRecording();
  };

  const handleSwitchCamera = async () => {
    await triggerHaptic(ImpactStyle.Light);
    await switchCamera();
  };

  const handleClose = async () => {
    await triggerHaptic(ImpactStyle.Light);
    resetRecording();
    onClose();
  };

  const hasRecording = !!videoBlob && !!videoUrl;
  const showPreview = previewStream || isRecording;

  // SVG circle properties for progress indicator
  const circleRadius = 38;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* Video Preview / Playback - Full Screen */}
      <div className="absolute inset-0">
        {/* Live Preview */}
        {showPreview && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // Mirror for selfie camera
          />
        )}

        {/* Recorded Video Playback */}
        {hasRecording && !showPreview && (
          <video
            src={videoUrl}
            autoPlay
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Error state */}
        {error && !showPreview && !hasRecording && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8">
            <div className="text-6xl mb-4">📹</div>
            <p className="text-center text-lg mb-2">Camera Access Required</p>
            <p className="text-center text-sm text-white/70">{error}</p>
          </div>
        )}
      </div>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-safe">
        <div className="flex items-center justify-between p-4">
          {/* Close Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <X className="w-6 h-6 text-white" />
          </motion.button>

          {/* Recording Timer */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2"
              >
                {!isPaused && (
                  <motion.div
                    className="w-2 h-2 bg-red-500 rounded-full"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
                <span className="text-white font-mono text-sm">
                  {formatDuration(duration)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera Switch Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSwitchCamera}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            disabled={hasRecording}
          >
            <SwitchCamera className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Paused Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center z-10"
          >
            <div className="bg-white/20 backdrop-blur-md rounded-2xl px-6 py-3">
              <span className="text-white font-medium text-lg">Paused</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-safe">
        <div className="flex items-center justify-center gap-8 p-6 pb-8">
          {/* Left Action - Reset or Pause */}
          <div className="w-14 h-14 flex items-center justify-center">
            {hasRecording && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleReset}
                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <RotateCcw className="w-6 h-6 text-white" />
              </motion.button>
            )}
            {isRecording && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                {isPaused ? (
                  <Play className="w-6 h-6 text-white" />
                ) : (
                  <Pause className="w-6 h-6 text-white" />
                )}
              </motion.button>
            )}
          </div>

          {/* Center - Main Record Button */}
          <div className="relative">
            {/* Progress Ring */}
            {isRecording && (
              <svg
                className="absolute inset-0 -rotate-90"
                width="88"
                height="88"
                viewBox="0 0 88 88"
              >
                {/* Background circle */}
                <circle
                  cx="44"
                  cy="44"
                  r={circleRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="4"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="44"
                  cy="44"
                  r={circleRadius}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.1 }}
                />
              </svg>
            )}

            {/* Not recording - Start button */}
            {!isRecording && !hasRecording && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleStartRecording}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg"
              >
                <div className="w-16 h-16 rounded-full bg-red-500" />
              </motion.button>
            )}

            {/* Recording - Stop button */}
            {isRecording && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleStopRecording}
                className="w-[88px] h-[88px] rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <motion.div
                  initial={{ borderRadius: '50%' }}
                  animate={{ borderRadius: '8px' }}
                  className="w-8 h-8 bg-red-500"
                />
              </motion.button>
            )}

            {/* Has recording - Confirm button */}
            {hasRecording && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleConfirm}
                className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.button>
            )}
          </div>

          {/* Right Action - Placeholder for symmetry or future feature */}
          <div className="w-14 h-14" />
        </div>

        {/* Helper Text */}
        <div className="text-center pb-4">
          {!isRecording && !hasRecording && (
            <p className="text-white/70 text-sm">Tap to record</p>
          )}
          {isRecording && (
            <p className="text-white/70 text-sm">
              {maxDuration - duration}s remaining
            </p>
          )}
          {hasRecording && (
            <p className="text-white/70 text-sm">
              Tap check to use this video
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
