/**
 * Mobile Message Input Component
 * 
 * WhatsApp/Instagram-level message input with:
 * - Auto-expanding textarea
 * - Voice recording with waveform
 * - Media sharing
 * - Keyboard optimization
 * 
 * SPIRITUAL MISSION: Effortless prayer sharing in any format
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  Camera, 
  Image, 
  Paperclip,
  X,
  Play,
  Pause,
  StopCircle,
  Check
} from 'lucide-react';
import { useMobileKeyboard, useVoiceMessageRecording } from '../../hooks/useMobileKeyboard';
import { useProgressiveImage, useAudioWithWaveform } from '../../hooks/useProgressiveMedia';
import { useMobileTouchGestures } from '../../hooks/useMobileTouchGestures';
import { nativeMobile } from '../../services/nativeMobileIntegration';

interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnailUrl?: string;
  size?: number;
  duration?: number;
  name?: string;
}

interface MobileMessageInputProps {
  onSendMessage: (content: string, attachments?: MediaAttachment[]) => Promise<void>;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  enableVoice?: boolean;
  enableMedia?: boolean;
  enableFiles?: boolean;
}

export function MobileMessageInput({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  placeholder = "Send a prayer...",
  disabled = false,
  maxLength = 2000,
  enableVoice = true,
  enableMedia = true,
  enableFiles = true
}: MobileMessageInputProps) {
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'media'>('text');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    keyboardInfo, 
    useAutoExpandingTextarea, 
    getInputSafeAreaStyle, 
    handleInputFocus 
  } = useMobileKeyboard();

  // Auto-expanding textarea
  const {
    textareaRef,
    value: messageText,
    setValue: setMessageText,
    height: textareaHeight,
    handleKeyDown,
    reset: resetTextarea
  } = useAutoExpandingTextarea('', (value) => {
    if (value.length > 0 && !onStartTyping) {
      onStartTyping?.();
    } else if (value.length === 0) {
      onStopTyping?.();
    }
  });

  // Voice recording
  const {
    isRecording,
    duration: recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    hasPermission: hasAudioPermission
  } = useVoiceMessageRecording(async (audioBlob) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const attachment: MediaAttachment = {
      id: Date.now().toString(),
      type: 'audio',
      url: audioUrl,
      duration: recordingDuration,
      size: audioBlob.size
    };
    
    await onSendMessage('', [attachment]);
  });

  // Handle message sending
  const handleSend = useCallback(async () => {
    if (isSending || disabled) return;

    const trimmedText = messageText.trim();
    if (!trimmedText && attachments.length === 0) return;

    setIsSending(true);
    
    try {
      await nativeMobile.triggerHaptic();
      await onSendMessage(trimmedText, attachments);
      
      // Reset input
      resetTextarea();
      setAttachments([]);
      onStopTyping?.();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [messageText, attachments, onSendMessage, isSending, disabled, resetTextarea, onStopTyping]);

  // Handle keyboard events
  const handleTextareaKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const result = handleKeyDown(event);
    if (result.shouldSend) {
      handleSend();
    }
  }, [handleKeyDown, handleSend]);

  // Voice recording controls
  const handleVoicePress = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      const success = await startRecording();
      if (!success && hasAudioPermission === false) {
        // Show permission request UI
        alert('Please enable microphone access to send voice messages');
      }
    }
  }, [isRecording, startRecording, stopRecording, hasAudioPermission]);

  // Media selection
  const handleMediaSelect = useCallback((type: 'camera' | 'gallery' | 'file') => {
    setShowMediaPicker(false);
    
    switch (type) {
      case 'camera':
        openCamera();
        break;
      case 'gallery':
        openGallery();
        break;
      case 'file':
        openFilePicker();
        break;
    }
  }, []);

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      // Camera implementation would go here
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Camera access failed:', error);
    }
  }, []);

  const openGallery = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*,video/*';
      fileInputRef.current.click();
    }
  }, []);

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = '*/*';
      fileInputRef.current.click();
    }
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: MediaAttachment[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' :
            file.type.startsWith('audio/') ? 'audio' : 'file',
      url: URL.createObjectURL(file),
      size: file.size,
      name: file.name
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id));
  }, []);

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine send button state
  const canSend = messageText.trim().length > 0 || attachments.length > 0;
  const sendButtonColor = canSend ? 'bg-blue-500' : 'bg-gray-400';

  return (
    <>
      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/20 p-3"
          >
            <div className="flex gap-2 overflow-x-auto">
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={() => removeAttachment(attachment.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      <div 
        className="glass-strong border-t border-white/20 p-3"
        style={getInputSafeAreaStyle()}
      >
        {isRecording ? (
          <VoiceRecordingInterface
            duration={recordingDuration}
            onStop={handleVoicePress}
            onCancel={cancelRecording}
          />
        ) : (
          <div className="flex items-end gap-2">
            {/* Media Button */}
            {enableMedia && (
              <button
                onClick={() => setShowMediaPicker(true)}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors flex-shrink-0"
                disabled={disabled}
              >
                <Paperclip className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {/* Text Input */}
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                onFocus={handleInputFocus}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={maxLength}
                className={`
                  w-full px-4 py-3 glass-subtle rounded-2xl 
                  text-gray-800 placeholder-gray-500 
                  focus:outline-none focus:ring-2 focus:ring-blue-400/50
                  resize-none
                `}
                style={{ 
                  height: textareaHeight,
                  fontSize: '16px' // Prevent iOS zoom
                }}
              />
            </div>

            {/* Voice/Send Button */}
            <div className="flex gap-2 flex-shrink-0">
              {enableVoice && !canSend && (
                <button
                  onClick={handleVoicePress}
                  className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors text-white"
                  disabled={disabled}
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={handleSend}
                disabled={!canSend || isSending || disabled}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center 
                  transition-all text-white
                  ${canSend ? 'bg-blue-500 hover:bg-blue-600 scale-100' : 'bg-gray-400 scale-90'}
                  disabled:opacity-50
                `}
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Media Picker Modal */}
      <AnimatePresence>
        {showMediaPicker && (
          <MediaPickerModal
            onSelect={handleMediaSelect}
            onClose={() => setShowMediaPicker(false)}
            enableCamera={enableMedia}
            enableGallery={enableMedia}
            enableFiles={enableFiles}
          />
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </>
  );
}

// Voice Recording Interface
interface VoiceRecordingInterfaceProps {
  duration: number;
  onStop: () => void;
  onCancel: () => void;
}

function VoiceRecordingInterface({ 
  duration, 
  onStop, 
  onCancel 
}: VoiceRecordingInterfaceProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-2">
      {/* Recording Indicator */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-3 h-3 bg-red-500 rounded-full"
        />
        <span className="text-gray-800 font-medium">Recording</span>
      </div>

      {/* Waveform Visualization */}
      <div className="flex-1 flex items-center gap-1 h-8 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="bg-blue-400 rounded-full"
            style={{ width: '2px' }}
            animate={{ 
              height: [4, Math.random() * 20 + 8, 4],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 0.5 + Math.random() * 0.5,
              delay: i * 0.05
            }}
          />
        ))}
      </div>

      {/* Duration */}
      <span className="text-gray-600 font-mono text-sm">
        {formatDuration(duration)}
      </span>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        
        <button
          onClick={onStop}
          className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors text-white"
        >
          <StopCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Attachment Preview Component
interface AttachmentPreviewProps {
  attachment: MediaAttachment;
  onRemove: () => void;
}

function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  const { currentSrc, isLoading } = useProgressiveImage(attachment.url);

  return (
    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
      {attachment.type === 'image' && (
        <img 
          src={currentSrc} 
          alt="Attachment" 
          className="w-full h-full object-cover"
        />
      )}
      
      {attachment.type === 'video' && (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <Play className="w-6 h-6 text-white" />
        </div>
      )}
      
      {attachment.type === 'audio' && (
        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
          <Mic className="w-6 h-6 text-blue-600" />
        </div>
      )}
      
      {attachment.type === 'file' && (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <Paperclip className="w-6 h-6 text-gray-600" />
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// Media Picker Modal
interface MediaPickerModalProps {
  onSelect: (type: 'camera' | 'gallery' | 'file') => void;
  onClose: () => void;
  enableCamera: boolean;
  enableGallery: boolean;
  enableFiles: boolean;
}

function MediaPickerModal({ 
  onSelect, 
  onClose, 
  enableCamera, 
  enableGallery, 
  enableFiles 
}: MediaPickerModalProps) {
  const options = [
    { id: 'camera', label: 'Camera', icon: Camera, enabled: enableCamera },
    { id: 'gallery', label: 'Gallery', icon: Image, enabled: enableGallery },
    { id: 'file', label: 'Document', icon: Paperclip, enabled: enableFiles },
  ].filter(option => option.enabled);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="w-full bg-white rounded-t-3xl p-6 pb-safe-area"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Share Media
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelect(option.id as any)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <option.icon className="w-8 h-8 text-gray-600" />
              <span className="text-sm text-gray-800">{option.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}