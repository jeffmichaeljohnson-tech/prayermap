/**
 * Advanced Voice Message Recorder
 * 
 * WhatsApp-level voice recording with:
 * - Real-time waveform visualization
 * - Audio level monitoring
 * - Gesture controls (hold to record)
 * - Audio enhancement
 * 
 * SPIRITUAL MISSION: Capture prayer in voice with perfect clarity
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Play, 
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useMobileTouchGestures } from '../../hooks/useMobileTouchGestures';
import { nativeMobile } from '../../services/nativeMobileIntegration';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number, waveformData: number[]) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
  enablePlayback?: boolean;
  enableWaveform?: boolean;
  audioConstraints?: MediaTrackConstraints;
}

interface AudioLevels {
  input: number;
  peak: number;
  average: number;
}

interface RecordingState {
  phase: 'idle' | 'recording' | 'paused' | 'completed' | 'playing';
  duration: number;
  audioBlob: Blob | null;
  waveformData: number[];
  audioLevels: AudioLevels;
}

export function VoiceMessageRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 300, // 5 minutes
  enablePlayback = true,
  enableWaveform = true,
  audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 1
  }
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>({
    phase: 'idle',
    duration: 0,
    audioBlob: null,
    waveformData: [],
    audioLevels: { input: 0, peak: 0, average: 0 }
  });

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Refs for audio processing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio context and request permissions
  const initializeAudio = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      setHasPermission(true);
      streamRef.current = stream;

      // Set up audio context for waveform analysis
      if (enableWaveform) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
        sourceRef.current.connect(analyserRef.current);
      }

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        setState(prev => ({ ...prev, audioBlob, phase: 'completed' }));
      };

      return true;
    } catch (error) {
      console.error('Audio initialization failed:', error);
      setHasPermission(false);
      return false;
    }
  }, [audioConstraints, enableWaveform]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!hasPermission) {
      const initialized = await initializeAudio();
      if (!initialized) return false;
    }

    if (!mediaRecorderRef.current) return false;

    try {
      chunksRef.current = [];
      mediaRecorderRef.current.start();
      
      setState(prev => ({
        ...prev,
        phase: 'recording',
        duration: 0,
        waveformData: [],
        audioBlob: null
      }));

      // Start timer
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);

      // Start waveform animation
      if (enableWaveform && analyserRef.current) {
        startWaveformAnalysis();
      }

      // Haptic feedback
      await nativeMobile.triggerHaptic();

      // Auto-stop at max duration
      setTimeout(() => {
        if (state.phase === 'recording') {
          stopRecording();
        }
      }, maxDuration * 1000);

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }, [hasPermission, initializeAudio, enableWaveform, maxDuration, state.phase]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && state.phase === 'recording') {
      mediaRecorderRef.current.stop();
      
      // Stop timer and animation
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Cleanup stream
      streamRef.current?.getTracks().forEach(track => track.stop());

      await nativeMobile.triggerHaptic();
    }
  }, [state.phase]);

  // Cancel recording
  const cancelRecording = useCallback(async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    // Cleanup
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    chunksRef.current = [];
    
    setState({
      phase: 'idle',
      duration: 0,
      audioBlob: null,
      waveformData: [],
      audioLevels: { input: 0, peak: 0, average: 0 }
    });

    onCancel();
  }, [onCancel]);

  // Send recording
  const sendRecording = useCallback(async () => {
    if (state.audioBlob) {
      await nativeMobile.triggerHaptic();
      onRecordingComplete(state.audioBlob, state.duration, state.waveformData);
    }
  }, [state.audioBlob, state.duration, state.waveformData, onRecordingComplete]);

  // Waveform analysis
  const startWaveformAnalysis = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (state.phase !== 'recording') return;

      analyserRef.current!.getByteFrequencyData(dataArray);
      
      // Calculate audio levels
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const average = sum / bufferLength;
      const peak = Math.max(...dataArray);
      const normalized = average / 255;

      setState(prev => ({
        ...prev,
        audioLevels: {
          input: normalized,
          peak: peak / 255,
          average: normalized
        },
        waveformData: [...prev.waveformData.slice(-50), normalized] // Keep last 50 samples
      }));

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, [state.phase]);

  // Playback controls
  const togglePlayback = useCallback(() => {
    if (!state.audioBlob || !audioRef.current) return;

    if (state.phase === 'playing') {
      audioRef.current.pause();
      setState(prev => ({ ...prev, phase: 'completed' }));
    } else {
      audioRef.current.play();
      setState(prev => ({ ...prev, phase: 'playing' }));
    }
  }, [state.audioBlob, state.phase]);

  // Gesture controls for hold-to-record
  const recordingGestures = useMobileTouchGestures({
    onLongPress: () => {
      if (state.phase === 'idle') {
        startRecording();
      }
    }
  }, {
    longPress: { duration: 200 } // Quick response
  });

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle audio events
  const handleAudioTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'completed' }));
    setPlaybackTime(0);
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
      audioContextRef.current?.close();
    };
  }, []);

  // Permission check UI
  if (hasPermission === false) {
    return (
      <div className="p-6 text-center">
        <MicOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Microphone Access Required
        </h3>
        <p className="text-gray-600 mb-4">
          Please allow microphone access to send voice messages
        </p>
        <button
          onClick={initializeAudio}
          className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
        >
          Enable Microphone
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          {state.phase === 'recording' ? 'Recording...' : 'Voice Message'}
        </h3>
        <button
          onClick={cancelRecording}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Recording State UI */}
      <AnimatePresence mode="wait">
        {state.phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <motion.button
              {...recordingGestures.bindGestures}
              whileTap={{ scale: 0.95 }}
              className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg mx-auto mb-4"
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
            >
              <Mic className="w-8 h-8" />
            </motion.button>
            <p className="text-gray-600">Hold to record</p>
          </motion.div>
        )}

        {state.phase === 'recording' && (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            {/* Duration */}
            <div className="text-2xl font-mono text-gray-800 mb-4">
              {formatDuration(state.duration)}
            </div>

            {/* Waveform Visualization */}
            {enableWaveform && (
              <div className="flex items-center justify-center gap-1 h-16 mb-6">
                {state.waveformData.slice(-20).map((level, index) => (
                  <motion.div
                    key={index}
                    className="bg-blue-500 rounded-full"
                    style={{ width: '3px' }}
                    animate={{
                      height: Math.max(4, level * 40)
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                ))}
              </div>
            )}

            {/* Audio Level Indicator */}
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                {state.audioLevels.input > 0.1 ? (
                  <Volume2 className="w-4 h-4 text-green-500" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
                <div className="flex-1 max-w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500 rounded-full"
                    animate={{ width: `${state.audioLevels.input * 100}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* Stop Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg mx-auto"
            >
              <div className="w-6 h-6 bg-white rounded-sm" />
            </motion.button>
          </motion.div>
        )}

        {state.phase === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Playback UI */}
            {enablePlayback && state.audioBlob && (
              <div className="mb-6">
                <audio
                  ref={audioRef}
                  src={URL.createObjectURL(state.audioBlob)}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={handleAudioEnded}
                />

                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={togglePlayback}
                    className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white"
                  >
                    {state.phase === 'playing' ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">
                      {formatDuration(Math.floor(playbackTime))} / {formatDuration(state.duration)}
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500 rounded-full"
                        animate={{ width: `${(playbackTime / state.duration) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Static Waveform */}
                <div className="flex items-center justify-center gap-1 h-12 mb-4">
                  {state.waveformData.map((level, index) => (
                    <div
                      key={index}
                      className="bg-gray-300 rounded-full"
                      style={{
                        width: '2px',
                        height: `${Math.max(4, level * 30)}px`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={cancelRecording}
                className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={sendRecording}
                className="flex-1 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}