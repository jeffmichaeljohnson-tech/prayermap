/**
 * Media Feature Module
 *
 * Public API - Export only what other features need.
 * See docs/MODULAR-STRUCTURE-POLICY.md
 *
 * MIGRATION STATUS: Complete
 */

// Components
export { AudioPlayer } from './components/AudioPlayer';
export { AudioRecorder } from './components/AudioRecorder';
export { AudioMessagePlayer } from './components/AudioMessagePlayer';
export { VideoRecorder } from './components/VideoRecorder';
export { VideoMessagePlayer } from './components/VideoMessagePlayer';

// Hooks
export { useAudioRecorder, formatDuration } from './hooks/useAudioRecorder';
export type { AudioRecorderState, UseAudioRecorderReturn } from './hooks/useAudioRecorder';
export { useVideoRecorder } from './hooks/useVideoRecorder';
export type { VideoRecorderState, UseVideoRecorderReturn } from './hooks/useVideoRecorder';

// Services
export { uploadAudio, uploadVideo, getMediaUrl, deleteMedia } from './services/storageService';
