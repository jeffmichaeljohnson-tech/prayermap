import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Check, Pause, Play, RefreshCw } from 'lucide-react';

interface FullscreenVideoRecorderProps {
  onRecordingComplete: (
    videoBlob: Blob,
    duration: number,
    thumbnailDataUrl: string | null
  ) => void;
  onCancel: () => void;
  maxDuration?: number;
}

type RecordingState = 'preview' | 'recording' | 'paused' | 'recorded';

export function FullscreenVideoRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 90,
}: FullscreenVideoRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('preview');
  const [duration, setDuration] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    initCamera();
    return () => {
      cleanup();
    };
  }, [facingMode]);

  const initCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please grant permission and try again.');
    }
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setDuration(0);

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9,opus',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      generateThumbnail(blob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setRecordingState('recording');

    timerRef.current = setInterval(() => {
      setDuration(prev => {
        if (prev >= maxDuration - 1) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      setRecordingState('recording');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setRecordingState('recorded');
  };

  const generateThumbnail = (blob: Blob) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(blob);
    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.8));
        }
      }
      URL.revokeObjectURL(video.src);
    };
  };

  const flipCamera = () => {
    if (recordingState === 'preview') {
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }
  };

  const resetRecording = async () => {
    setRecordedBlob(null);
    setThumbnailUrl(null);
    setDuration(0);
    setRecordingState('preview');
    await initCamera();
  };

  const confirmRecording = () => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob, duration, thumbnailUrl);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ':' + String(secs).padStart(2, '0');
  };

  const progress = (duration / maxDuration) * 100;
  const circumference = 2 * Math.PI * 44;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex-1 relative overflow-hidden">
        {recordingState !== 'recorded' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={'w-full h-full object-cover ' + (facingMode === 'user' ? 'scale-x-[-1]' : '')}
          />
        ) : (
          <video
            ref={playbackRef}
            src={recordedBlob ? URL.createObjectURL(recordedBlob) : undefined}
            autoPlay
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center p-6"
            >
              <div className="text-center">
                <p className="text-white text-lg mb-4">{error}</p>
                <button
                  onClick={onCancel}
                  className="px-6 py-3 bg-white text-black rounded-full font-medium"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
            aria-label="Cancel recording"
          >
            <X className="w-6 h-6 text-white" aria-hidden="true" />
          </button>

          {(recordingState === 'recording' || recordingState === 'paused' || recordingState === 'recorded') && (
            <div className="flex items-center gap-2">
              {recordingState === 'recording' && (
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
              )}
              <span className="text-white font-mono text-lg">
                {formatTime(duration)} / {formatTime(maxDuration)}
              </span>
            </div>
          )}

          {recordingState === 'preview' && (
            <button
              onClick={flipCamera}
              className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
              aria-label="Switch camera"
            >
              <RefreshCw className="w-5 h-5 text-white" aria-hidden="true" />
            </button>
          )}

          {recordingState !== 'preview' && recordingState !== 'recorded' && (
            <div className="w-10" />
          )}
        </div>
      </div>

      <div className="bg-black p-6 pb-safe">
        {recordingState === 'preview' && (
          <div className="flex justify-center">
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
              aria-label="Start recording"
            >
              <div className="w-16 h-16 rounded-full bg-red-500" aria-hidden="true" />
            </button>
          </div>
        )}

        {(recordingState === 'recording' || recordingState === 'paused') && (
          <div className="flex justify-center items-center gap-8">
            <button
              onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
              className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
              aria-label={recordingState === 'recording' ? 'Pause recording' : 'Resume recording'}
            >
              {recordingState === 'recording' ? (
                <Pause className="w-6 h-6 text-white" aria-hidden="true" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" aria-hidden="true" />
              )}
            </button>

            <div className="relative">
              <svg className="w-24 h-24 -rotate-90" aria-hidden="true">
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <button
                onClick={stopRecording}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full border-4 border-white flex items-center justify-center"
                aria-label="Stop recording"
              >
                <div className="w-8 h-8 rounded-sm bg-red-500" aria-hidden="true" />
              </button>
            </div>

            <div className="w-14" />
          </div>
        )}

        {recordingState === 'recorded' && (
          <div className="flex justify-center items-center gap-8">
            <button
              onClick={resetRecording}
              className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
              aria-label="Re-record video"
            >
              <RotateCcw className="w-7 h-7 text-white" aria-hidden="true" />
            </button>

            <button
              onClick={confirmRecording}
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center"
              aria-label="Use this video"
            >
              <Check className="w-10 h-10 text-white" aria-hidden="true" />
            </button>

            <div className="w-16" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
