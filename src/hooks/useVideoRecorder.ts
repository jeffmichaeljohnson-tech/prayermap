import { useState, useRef, useCallback, useEffect } from 'react';

export interface VideoRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  videoBlob: Blob | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
  previewStream: MediaStream | null;
}

export interface UseVideoRecorderReturn extends VideoRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  switchCamera: () => Promise<void>;
  videoRef: React.RefObject<HTMLVideoElement>;
}

/**
 * Hook for recording video using the MediaRecorder API
 * Supports front/back camera switching for mobile
 */
export function useVideoRecorder(maxDuration: number = 90): UseVideoRecorderReturn {
  const [state, setState] = useState<VideoRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    videoBlob: null,
    videoUrl: null,
    thumbnailUrl: null,
    error: null,
    previewStream: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const facingModeRef = useRef<'user' | 'environment'>('user');

  // Generate thumbnail from video blob
  const generateThumbnail = useCallback(async (videoBlob: Blob): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        // Seek to 0.5 seconds for thumbnail
        video.currentTime = Math.min(0.5, video.duration);
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        // Cap thumbnail resolution for size
        const maxWidth = 480;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(thumbnailUrl);
        } else {
          resolve(null);
        }
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        resolve(null);
      };

      video.src = URL.createObjectURL(videoBlob);
    });
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecordingInternal = useCallback(() => {
    stopTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [stopTimer]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - pausedDurationRef.current * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState(prev => ({ ...prev, duration: elapsed }));

      // Auto-stop at max duration
      if (elapsed >= maxDuration) {
        stopRecordingInternal();
      }
    }, 100);
  }, [maxDuration, stopRecordingInternal]);

  const startRecording = useCallback(async () => {
    try {
      // Reset state
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        duration: 0,
        videoBlob: null,
        videoUrl: null,
        thumbnailUrl: null,
        error: null,
      }));
      chunksRef.current = [];
      pausedDurationRef.current = 0;

      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingModeRef.current,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Show preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }

      setState(prev => ({ ...prev, previewStream: stream }));

      // Determine best mime type
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(chunksRef.current, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);

        // Generate thumbnail
        const thumbnailUrl = await generateThumbnail(videoBlob);

        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          videoBlob,
          videoUrl,
          thumbnailUrl,
          previewStream: null,
        }));

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setState(prev => ({
          ...prev,
          isRecording: false,
          error: 'Recording error occurred',
        }));
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every 1 second
      startTimer();

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        error: null,
      }));
    } catch (error) {
      console.error('Error starting video recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';

      setState(prev => ({
        ...prev,
        isRecording: false,
        error: errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')
          ? 'Camera access denied. Please allow camera access in your browser settings.'
          : errorMessage.includes('NotFoundError')
          ? 'No camera found. Please connect a camera.'
          : `Recording failed: ${errorMessage}`,
      }));
    }
  }, [startTimer, generateThumbnail]);

  const stopRecording = useCallback(() => {
    stopRecordingInternal();
  }, [stopRecordingInternal]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      stopTimer();
      pausedDurationRef.current = state.duration;
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.duration, stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimer();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [startTimer]);

  const switchCamera = useCallback(async () => {
    facingModeRef.current = facingModeRef.current === 'user' ? 'environment' : 'user';

    if (state.isRecording || state.previewStream) {
      // Stop current stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Restart with new camera
      await startRecording();
    }
  }, [state.isRecording, state.previewStream, startRecording]);

  const resetRecording = useCallback(() => {
    stopTimer();

    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Clean up stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Revoke old URLs
    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl);
    }

    chunksRef.current = [];
    pausedDurationRef.current = 0;

    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      videoBlob: null,
      videoUrl: null,
      thumbnailUrl: null,
      error: null,
      previewStream: null,
    });
  }, [state.videoUrl, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (state.videoUrl) {
        URL.revokeObjectURL(state.videoUrl);
      }
    };
  }, [state.videoUrl, stopTimer]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    switchCamera,
    videoRef,
  };
}

