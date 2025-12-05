import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Square, Pause, Play, RotateCcw, Check, SwitchCamera } from 'lucide-react';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { formatDuration } from '../hooks/useAudioRecorder';
import { Button } from '../../../components/ui/button';

interface VideoRecorderProps {
  onRecordingComplete: (videoBlob: Blob, duration: number, thumbnailUrl: string | null) => void;
  onCancel?: () => void;
  maxDuration?: number; // Default 90 seconds
}

export function VideoRecorder({ onRecordingComplete, onCancel, maxDuration = 90 }: VideoRecorderProps) {
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

  // Auto-stop when max duration reached
  useEffect(() => {
    if (isRecording && !isPaused && duration >= maxDuration) {
      stopRecording();
    }
  }, [isRecording, isPaused, duration, maxDuration, stopRecording]);

  const handleConfirm = () => {
    if (videoBlob) {
      onRecordingComplete(videoBlob, duration, thumbnailUrl);
    }
  };

  const hasRecording = !!videoBlob && !!videoUrl;
  const showPreview = previewStream || isRecording;

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

      {/* Video Preview / Playback */}
      <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden">
        {/* Live Preview */}
        {showPreview && (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Recording indicator */}
            {isRecording && !isPaused && (
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <motion.div
                  className="w-3 h-3 bg-red-500 rounded-full"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-white text-sm font-medium drop-shadow-lg">REC</span>
              </div>
            )}
            {/* Paused indicator */}
            {isPaused && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="bg-white/90 rounded-xl px-4 py-2">
                  <span className="text-gray-700 font-medium">Paused</span>
                </div>
              </div>
            )}
            {/* Camera switch button */}
            <Button
              type="button"
              onClick={switchCamera}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border-0"
            >
              <SwitchCamera className="w-5 h-5 text-white" />
            </Button>
          </>
        )}

        {/* Recorded Video Playback */}
        {hasRecording && !showPreview && (
          <video
            src={videoUrl}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Idle state */}
        {!showPreview && !hasRecording && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <Video className="w-12 h-12 mb-2" />
            <span className="text-sm">Tap to record video</span>
          </div>
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
            type="button"
            onClick={startRecording}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 border-0"
          >
            <Video className="w-6 h-6" />
          </Button>
        )}

        {/* Currently recording */}
        {isRecording && (
          <>
            {/* Pause/Resume */}
            <Button
              type="button"
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="w-12 h-12 rounded-full glass-strong border-0"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </Button>

            {/* Stop */}
            <Button
              type="button"
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 border-0"
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
              type="button"
              onClick={resetRecording}
              variant="outline"
              className="w-12 h-12 rounded-full glass-strong"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>

            {/* Confirm */}
            <Button
              type="button"
              onClick={handleConfirm}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 border-0"
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
            type="button"
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

