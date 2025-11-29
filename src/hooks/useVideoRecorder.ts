import { useState, useRef, useCallback, useEffect } from 'react';

export interface VideoRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  videoBlob: Blob | null;
  videoUrl: string | null;
  error: string | null;
  isCameraReady: boolean;
  facingMode: 'user' | 'environment';
}

export interface UseVideoRecorderReturn extends VideoRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  switchCamera: () => void;
  initializeCamera: () => Promise<void>;
  stopCamera: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  streamRef: React.RefObject<MediaStream | null>;
}

/**
 * Hook for recording video using the MediaRecorder API
 * Provides Instagram-like video recording experience
 */
export function useVideoRecorder(): UseVideoRecorderReturn {
  const [state, setState] = useState<VideoRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    videoBlob: null,
    videoUrl: null,
    error: null,
    isCameraReady: false,
    facingMode: 'user',
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (state.videoUrl) {
        URL.revokeObjectURL(state.videoUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - pausedDurationRef.current * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState(prev => ({ ...prev, duration: elapsed }));
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const initializeCamera = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: state.facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Set the video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      setState(prev => ({ ...prev, isCameraReady: true, error: null }));
    } catch (error) {
      console.error('Error initializing camera:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';

      setState(prev => ({
        ...prev,
        isCameraReady: false,
        error: errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')
          ? 'Camera access denied. Please allow camera access in your browser settings.'
          : `Camera failed: ${errorMessage}`,
      }));
    }
  }, [state.facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState(prev => ({ ...prev, isCameraReady: false }));
  }, []);

  const switchCamera = useCallback(async () => {
    const newFacingMode = state.facingMode === 'user' ? 'environment' : 'user';

    // Stop current stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setState(prev => ({ ...prev, facingMode: newFacingMode }));

    // Reinitialize with new facing mode
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9 / 16 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to switch camera',
      }));
    }
  }, [state.facingMode]);

  const startRecording = useCallback(async () => {
    if (!streamRef.current) {
      await initializeCamera();
      if (!streamRef.current) return;
    }

    try {
      // Reset state
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        duration: 0,
        videoBlob: null,
        videoUrl: prev.videoUrl ? (URL.revokeObjectURL(prev.videoUrl), null) : null,
        error: null,
      }));
      chunksRef.current = [];
      pausedDurationRef.current = 0;

      // Create MediaRecorder with best available format
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);

        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          videoBlob,
          videoUrl,
        }));
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
      mediaRecorder.start(100); // Collect data every 100ms
      startTimer();

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        error: null,
      }));
    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';

      setState(prev => ({
        ...prev,
        isRecording: false,
        error: `Recording failed: ${errorMessage}`,
      }));
    }
  }, [initializeCamera, startTimer]);

  const stopRecording = useCallback(() => {
    stopTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [stopTimer]);

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

  const resetRecording = useCallback(() => {
    stopTimer();

    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Revoke old URL if exists
    if (state.videoUrl) {
      URL.revokeObjectURL(state.videoUrl);
    }

    chunksRef.current = [];
    pausedDurationRef.current = 0;

    setState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
      duration: 0,
      videoBlob: null,
      videoUrl: null,
      error: null,
    }));
  }, [state.videoUrl, stopTimer]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    switchCamera,
    initializeCamera,
    stopCamera,
    videoRef,
    streamRef,
  };
}

/**
 * Format seconds to MM:SS
 */
export function formatVideoDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
