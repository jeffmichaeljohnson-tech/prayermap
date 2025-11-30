/**
 * Advanced Voice Message Recorder Hook with Real-time Waveform Visualization
 * WhatsApp-style voice recording with spiritual context
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { VoiceMessageState } from '../types/media';

interface UseVoiceRecorderOptions {
  maxDuration?: number; // seconds (default: 300 = 5 minutes)
  sampleRate?: number; // Hz (default: 44100)
  bitRate?: number; // bps (default: 64000 for voice)
  onMaxDurationReached?: () => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onError?: (error: Error) => void;
}

interface UseVoiceRecorderReturn {
  state: VoiceMessageState;
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  getWaveformData: () => number[];
  isSupported: boolean;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const {
    maxDuration = 300, // 5 minutes
    sampleRate = 44100,
    bitRate = 64000,
    onMaxDurationReached,
    onRecordingStart,
    onRecordingStop,
    onError
  } = options;

  const [state, setState] = useState<VoiceMessageState>({
    isRecording: false,
    duration: 0,
    audioLevel: 0,
    waveformData: [],
    isPaused: false,
    maxDuration
  });

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Refs for audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check if voice recording is supported
  const isSupported = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getUserMedia' in navigator.mediaDevices &&
    typeof MediaRecorder !== 'undefined';

  // Clean up resources
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;
  }, []);

  // Update recording duration and check max duration
  const updateTimer = useCallback(() => {
    setState(prev => {
      const newDuration = prev.duration + 1;
      
      if (newDuration >= maxDuration) {
        onMaxDurationReached?.();
        stopRecording();
        return prev;
      }

      return { ...prev, duration: newDuration };
    });
  }, [maxDuration, onMaxDurationReached]);

  // Analyze audio and update waveform data
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Convert frequency data to waveform visualization
    const waveformData: number[] = [];
    const barCount = 50; // Number of bars in waveform
    const segmentSize = Math.floor(dataArrayRef.current.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const start = i * segmentSize;
      const end = start + segmentSize;
      let sum = 0;

      for (let j = start; j < end; j++) {
        sum += dataArrayRef.current[j];
      }

      const average = sum / segmentSize;
      waveformData.push(average / 255); // Normalize to 0-1
    }

    // Calculate average audio level for visual feedback
    const totalLevel = waveformData.reduce((sum, val) => sum + val, 0);
    const audioLevel = totalLevel / waveformData.length;

    setState(prev => ({
      ...prev,
      waveformData: [...prev.waveformData, ...waveformData].slice(-200), // Keep last 200 data points
      audioLevel
    }));

    // Continue analyzing if recording
    if (state.isRecording && !state.isPaused) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  }, [state.isRecording, state.isPaused]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      onError?.(new Error('Voice recording not supported in this browser'));
      return;
    }

    try {
      // Request microphone permission with high-quality settings for voice
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: sampleRate,
          channelCount: 1, // Mono for voice
          sampleSize: 16
        }
      });

      audioStreamRef.current = stream;

      // Set up audio analysis
      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Set up MediaRecorder with optimized settings for voice
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];

      let mimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        throw new Error('No supported audio format found');
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: bitRate
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlob);
        cleanup();
        onRecordingStop?.();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms

      setState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0,
        waveformData: [],
        isPaused: false
      }));

      // Start timer
      timerRef.current = setInterval(updateTimer, 1000);

      // Start audio analysis
      analyzeAudio();

      onRecordingStart?.();

    } catch (error) {
      cleanup();
      const errorMsg = error instanceof Error ? error.message : 'Failed to start recording';
      
      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        onError?.(new Error('Microphone permission is required for voice messages'));
      } else {
        onError?.(new Error(errorMsg));
      }
    }
  }, [isSupported, sampleRate, bitRate, updateTimer, analyzeAudio, onRecordingStart, onRecordingStop, onError]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false
      }));
    }
  }, [state.isRecording]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state.isRecording]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      
      // Restart timer
      timerRef.current = setInterval(updateTimer, 1000);
      analyzeAudio();
    }
  }, [state.isRecording, state.isPaused, updateTimer, analyzeAudio]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    setAudioBlob(null);
    audioChunksRef.current = [];
    
    setState({
      isRecording: false,
      duration: 0,
      audioLevel: 0,
      waveformData: [],
      isPaused: false,
      maxDuration
    });
    
    cleanup();
  }, [maxDuration, cleanup]);

  // Get current waveform data for visualization
  const getWaveformData = useCallback(() => {
    return state.waveformData;
  }, [state.waveformData]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Reset audio blob when starting new recording
  useEffect(() => {
    if (state.isRecording && !state.isPaused) {
      setAudioBlob(null);
    }
  }, [state.isRecording, state.isPaused]);

  return {
    state,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    getWaveformData,
    isSupported
  };
}