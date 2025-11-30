/**
 * Enhanced Media Input Component
 * Instagram/WhatsApp-style media sharing interface with spiritual context
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Image as ImageIcon, 
  Mic, 
  MicOff,
  Video, 
  Send,
  X,
  Plus,
  Smile,
  MapPin,
  BookOpen,
  Loader2,
  StopCircle,
  Pause,
  Play
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { MediaUploadManager } from '../../services/mediaUploadManager';
import { ImageCaptureManager } from '../../services/imageCaptureManager';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { WaveformVisualization } from './WaveformVisualization';
import type { MediaUpload, MediaProcessingOptions, ImageCaptureOptions } from '../../types/media';

interface MediaInputProps {
  /** Current conversation ID */
  conversationId: string;
  /** Text input value */
  textValue: string;
  /** Text input change handler */
  onTextChange: (value: string) => void;
  /** Send message handler */
  onSend: (content: string, mediaUpload?: MediaUpload) => Promise<void>;
  /** Whether currently sending a message */
  isSending?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show spiritual context options */
  enableSpiritualContext?: boolean;
  /** Custom CSS classes */
  className?: string;
}

type InputMode = 'text' | 'voice' | 'camera' | 'media';

export function MediaInput({
  conversationId,
  textValue,
  onTextChange,
  onSend,
  isSending = false,
  placeholder = "Type your prayer response...",
  enableSpiritualContext = true,
  className
}: MediaInputProps) {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [selectedMedia, setSelectedMedia] = useState<MediaUpload | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Refs and managers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaUploadManager = useRef(new MediaUploadManager());
  const imageCaptureManager = useRef(new ImageCaptureManager());
  
  // Voice recording
  const {
    state: voiceState,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    isSupported: isVoiceSupported
  } = useVoiceRecorder({
    maxDuration: 300, // 5 minutes
    onError: (error) => console.error('Voice recording error:', error)
  });

  // Handle text input
  const handleTextSubmit = useCallback(async () => {
    if (!textValue.trim() && !selectedMedia) return;
    
    try {
      await onSend(textValue, selectedMedia || undefined);
      onTextChange('');
      setSelectedMedia(null);
      setMediaPreview(null);
      setInputMode('text');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [textValue, selectedMedia, onSend, onTextChange]);

  // Handle voice message
  const handleVoiceSubmit = useCallback(async () => {
    if (!audioBlob) return;
    
    setIsProcessing(true);
    try {
      const voiceFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
        type: 'audio/webm'
      });

      const mediaUpload = await mediaUploadManager.current.uploadMedia(
        voiceFile,
        conversationId,
        {
          compress: true,
          generateThumbnail: false,
          detectSpiritual: false
        }
      );

      await onSend('', mediaUpload);
      setInputMode('text');
    } catch (error) {
      console.error('Failed to send voice message:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [audioBlob, conversationId, onSend]);

  // Handle camera capture
  const handleCameraCapture = useCallback(async (options: ImageCaptureOptions) => {
    setIsProcessing(true);
    try {
      const imageFile = await imageCaptureManager.current.captureImage(options);
      await processAndPreviewMedia(imageFile);
    } catch (error) {
      console.error('Camera capture failed:', error);
      setInputMode('text');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsProcessing(true);
    try {
      await processAndPreviewMedia(files[0]);
    } catch (error) {
      console.error('File processing failed:', error);
      setInputMode('text');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Process and preview media
  const processAndPreviewMedia = useCallback(async (file: File) => {
    try {
      const options: MediaProcessingOptions = {
        compress: true,
        generateThumbnail: true,
        detectSpiritual: enableSpiritualContext && file.type.startsWith('image/'),
        compressionQuality: 0.8
      };

      // Set up progress tracking
      const uploadId = crypto.randomUUID();
      mediaUploadManager.current.setProgressCallback(uploadId, (progress) => {
        setUploadProgress(progress);
      });

      const mediaUpload = await mediaUploadManager.current.uploadMedia(
        file,
        conversationId,
        options
      );

      setSelectedMedia(mediaUpload);
      setMediaPreview(mediaUpload.url || URL.createObjectURL(file));
      setInputMode('text'); // Switch back to text mode for caption
      setUploadProgress(0);

    } catch (error) {
      console.error('Media processing failed:', error);
      setSelectedMedia(null);
      setMediaPreview(null);
    }
  }, [conversationId, enableSpiritualContext]);

  // Clear media selection
  const clearMedia = useCallback(() => {
    setSelectedMedia(null);
    setMediaPreview(null);
    setUploadProgress(0);
  }, []);

  // Format time for voice recording
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('relative', className)}>
      {/* Media Preview */}
      <AnimatePresence>
        {mediaPreview && selectedMedia && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-4 relative"
          >
            <div className="relative glass-strong rounded-xl p-4 border border-white/20">
              {/* Close Button */}
              <button
                onClick={clearMedia}
                className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Media Content */}
              <div className="flex items-start gap-3">
                {selectedMedia.type === 'image' ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : selectedMedia.type === 'video' ? (
                  <video
                    src={mediaPreview}
                    className="w-20 h-20 object-cover rounded-lg"
                    muted
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                    <Mic className="w-8 h-8" />
                  </div>
                )}

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {selectedMedia.metadata.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedMedia.type} • {formatFileSize(selectedMedia.metadata.size)}
                  </p>
                  
                  {/* Spiritual Context Indicators */}
                  {selectedMedia.spiritualContext && (
                    <div className="flex gap-1 mt-2">
                      {selectedMedia.spiritualContext.containsScripture && (
                        <span className="text-xs bg-blue-500/20 text-blue-700 px-2 py-1 rounded">
                          📖 Scripture
                        </span>
                      )}
                      {selectedMedia.spiritualContext.prayerLocation && (
                        <span className="text-xs bg-green-500/20 text-green-700 px-2 py-1 rounded">
                          📍 Location
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Uploading...</span>
                    <span className="text-xs text-gray-500">{uploadProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Recording Interface */}
      <AnimatePresence>
        {inputMode === 'voice' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-4"
          >
            <div className="glass-strong rounded-xl p-4 border border-white/20">
              {voiceState.isRecording ? (
                <div className="space-y-4">
                  {/* Recording Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-4 h-4 bg-red-500 rounded-full"
                      />
                      <span className="text-gray-800 font-medium">Recording voice message...</span>
                    </div>
                    <span className="text-gray-600 tabular-nums font-mono">
                      {formatTime(voiceState.duration)}
                    </span>
                  </div>

                  {/* Waveform Visualization */}
                  <div className="flex justify-center">
                    <WaveformVisualization
                      audioData={voiceState.waveformData}
                      isActive={true}
                      width={300}
                      height={60}
                      variant="prayer"
                      animated={true}
                    />
                  </div>

                  {/* Recording Controls */}
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={cancelRecording}
                      className="flex-1 py-3 bg-gray-500/20 hover:bg-gray-500/30 rounded-xl transition-colors flex items-center justify-center gap-2 text-gray-700"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        await stopRecording();
                        await handleVoiceSubmit();
                      }}
                      disabled={isProcessing}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 hover:from-blue-500/40 hover:to-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-2 text-gray-800"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <StopCircle className="w-5 h-5" />
                      )}
                      Send
                    </motion.button>
                  </div>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startRecording}
                  disabled={!isVoiceSupported || isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-blue-500/30 to-purple-500/30 hover:from-blue-500/40 hover:to-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-3 text-gray-800"
                >
                  <Mic className="w-6 h-6" />
                  <span className="font-medium">Hold to record voice message</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4">
        {/* Mode Selector */}
        <div className="flex gap-2 mb-3">
          <InputModeButton
            icon={<span>💬</span>}
            label="Text"
            isActive={inputMode === 'text'}
            onClick={() => setInputMode('text')}
          />
          <InputModeButton
            icon={<Mic className="w-4 h-4" />}
            label="Voice"
            isActive={inputMode === 'voice'}
            onClick={() => setInputMode('voice')}
            disabled={!isVoiceSupported}
          />
          <InputModeButton
            icon={<Camera className="w-4 h-4" />}
            label="Camera"
            isActive={inputMode === 'camera'}
            onClick={() => setInputMode('camera')}
          />
          <InputModeButton
            icon={<ImageIcon className="w-4 h-4" />}
            label="Gallery"
            isActive={inputMode === 'media'}
            onClick={() => setInputMode('media')}
          />
        </div>

        {/* Input Controls */}
        {inputMode === 'text' && (
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={textValue}
                onChange={(e) => onTextChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-white/20 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 border border-white/10"
              />
              
              {/* Quick Actions */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <QuickActionButton
                  icon={<Smile className="w-4 h-4" />}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  tooltip="Add emoji"
                />
                {enableSpiritualContext && (
                  <QuickActionButton
                    icon={<BookOpen className="w-4 h-4" />}
                    onClick={() => {/* Add scripture reference */}}
                    tooltip="Add scripture"
                  />
                )}
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleTextSubmit}
              disabled={(!textValue.trim() && !selectedMedia) || isSending}
              className="px-6 py-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 hover:from-blue-500/40 hover:to-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 text-gray-800 animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-gray-800" />
              )}
            </motion.button>
          </div>
        )}

        {/* Camera Controls */}
        {inputMode === 'camera' && (
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCameraCapture({ source: 'camera', allowEditing: true })}
              disabled={isProcessing}
              className="py-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 hover:from-blue-500/40 hover:to-purple-500/40 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Take Photo
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCameraCapture({ source: 'gallery', allowEditing: true })}
              disabled={isProcessing}
              className="py-3 bg-gradient-to-r from-green-500/30 to-blue-500/30 hover:from-green-500/40 hover:to-blue-500/40 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-5 h-5" />
              From Gallery
            </motion.button>
          </div>
        )}

        {/* Media Selection */}
        {inputMode === 'media' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              multiple
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full py-4 bg-gradient-to-r from-purple-500/30 to-pink-500/30 hover:from-purple-500/40 hover:to-pink-500/40 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-3"
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Plus className="w-6 h-6" />
              )}
              <span>Choose Media Files</span>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function InputModeButton({
  icon,
  label,
  isActive,
  onClick,
  disabled = false
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 py-2 px-4 rounded-xl transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
        isActive
          ? 'bg-gradient-to-r from-yellow-300/80 to-purple-300/80 text-gray-800 shadow-lg'
          : 'bg-white/10 text-gray-600 hover:bg-white/20'
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
    </motion.button>
  );
}

function QuickActionButton({
  icon,
  onClick,
  tooltip
}: {
  icon: React.ReactNode;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="w-8 h-8 text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center"
      title={tooltip}
    >
      {icon}
    </motion.button>
  );
}

// Utility function
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}