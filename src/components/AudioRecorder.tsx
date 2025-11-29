import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Pause, Play, RotateCcw, Check } from 'lucide-react';
import { useAudioRecorder, formatDuration } from '../hooks/useAudioRecorder';
import { Button } from './ui/button';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  maxDuration?: number; // Maximum recording duration in seconds
}

export function AudioRecorder({ onRecordingComplete, onCancel, maxDuration = 120 }: AudioRecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder();

  // Auto-stop when max duration reached
  useEffect(() => {
    if (isRecording && !isPaused && duration >= maxDuration) {
      stopRecording();
    }
  }, [isRecording, isPaused, duration, maxDuration, stopRecording]);

  const handleConfirm = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, duration);
    }
  };

  const handleReset = () => {
    resetRecording();
  };

  // Recording has been made and stopped
  const hasRecording = !!audioBlob && !!audioUrl;

  return (
    <div className="space-y-4">
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Visualization */}
      <div className="relative h-24 bg-white/30 rounded-2xl overflow-hidden flex items-center justify-center">
        {/* Waveform Animation (while recording) */}
        {isRecording && !isPaused && (
          <div className="flex items-center gap-1">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-purple-500 rounded-full"
                animate={{
                  height: [8, 32, 8],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.05,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}

        {/* Paused indicator */}
        {isPaused && (
          <div className="flex items-center gap-2 text-gray-600">
            <Pause className="w-5 h-5" />
            <span className="text-sm">Paused</span>
          </div>
        )}

        {/* Idle state */}
        {!isRecording && !hasRecording && !error && (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Mic className="w-8 h-8" />
            <span className="text-sm">Tap to record</span>
          </div>
        )}

        {/* Playback preview */}
        {hasRecording && (
          <audio src={audioUrl} controls className="w-full max-w-[280px] h-10" />
        )}
      </div>

      {/* Duration Display */}
      <div className="text-center">
        <span className={`text-2xl font-mono ${isRecording && !isPaused ? 'text-red-500' : 'text-gray-700'}`}>
          {formatDuration(duration)}
        </span>
        <span className="text-sm text-gray-500 ml-2">
          / {formatDuration(maxDuration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Not recording yet */}
        {!isRecording && !hasRecording && (
          <Button
            onClick={startRecording}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
            aria-label="Start recording"
          >
            <Mic className="w-6 h-6" />
          </Button>
        )}

        {/* Currently recording */}
        {isRecording && (
          <>
            {/* Pause/Resume */}
            <Button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="w-12 h-12 rounded-full glass-strong"
              aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </Button>

            {/* Stop */}
            <Button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
              aria-label="Stop recording"
            >
              <Square className="w-6 h-6 fill-current" />
            </Button>
          </>
        )}

        {/* Has recording - show confirm/reset */}
        {hasRecording && (
          <>
            {/* Reset */}
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-12 h-12 rounded-full glass-strong"
              aria-label="Reset recording"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>

            {/* Confirm */}
            <Button
              onClick={handleConfirm}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30"
              aria-label="Confirm recording"
            >
              <Check className="w-6 h-6" />
            </Button>
          </>
        )}
      </div>

      {/* Cancel button */}
      {onCancel && (
        <div className="text-center">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
