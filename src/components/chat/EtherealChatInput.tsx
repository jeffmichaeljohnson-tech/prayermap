/**
 * Ethereal Glass Chat Input Component
 * Agent 5 - Chat UI Designer
 * 
 * Advanced chat input with PrayerMap's ethereal glass design system
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  Video, 
  Image, 
  Plus, 
  Smile, 
  Paperclip,
  X,
  StopCircle,
  Pause,
  Play,
  Camera,
  Upload,
  FileText,
  Heart,
  MapPin
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { 
  ChatInputProps, 
  ChatInputState, 
  FileAttachment,
  ChatMessage,
  Conversation 
} from '../../types/chat';

const PRAYER_EMOJIS = ['🙏', '❤️', '🙌', '✨', '💝', '🕊️', '⭐', '🌟', '💫', '🤲', '🔥', '💪'];
const COMMON_EMOJIS = ['😊', '😂', '😍', '😢', '😮', '👍', '👏', '🎉', '💯', '😇'];

export function EtherealChatInput({
  conversation,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onRecordingStart,
  onRecordingStop,
  placeholder = "Send a prayer or message...",
  disabled = false,
  replyingTo,
  onCancelReply,
  maxLength = 1000
}: ChatInputProps) {
  const [inputState, setInputState] = useState<ChatInputState>({
    mode: 'text',
    content: '',
    isRecording: false,
    recordingDuration: 0,
    attachments: [],
    isTyping: false
  });

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [inputState.content]);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!inputState.isTyping) {
      setInputState(prev => ({ ...prev, isTyping: true }));
      onStartTyping();
    }
    
    // Reset typing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    typingTimerRef.current = setTimeout(() => {
      setInputState(prev => ({ ...prev, isTyping: false }));
      onStopTyping();
    }, 3000);
  }, [inputState.isTyping, onStartTyping, onStopTyping]);

  const handleContentChange = (value: string) => {
    if (value.length > maxLength) return;
    
    setInputState(prev => ({ ...prev, content: value }));
    
    if (value.trim()) {
      handleTypingStart();
    } else {
      onStopTyping();
      setInputState(prev => ({ ...prev, isTyping: false }));
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    }
  };

  const handleSend = async () => {
    if (disabled) return;

    const content = inputState.content.trim();
    if (!content && inputState.attachments.length === 0) return;

    try {
      // Send text message
      if (content) {
        await onSendMessage(content, 'text');
      }

      // Send attachments
      for (const attachment of inputState.attachments) {
        if (attachment.uploadStatus === 'completed') {
          await onSendMessage(
            attachment.type === 'audio' ? 'Audio message' :
            attachment.type === 'video' ? 'Video message' :
            attachment.type === 'image' ? 'Photo' :
            attachment.file.name,
            attachment.type as any,
            attachment
          );
        }
      }

      // Reset input
      setInputState({
        mode: 'text',
        content: '',
        isRecording: false,
        recordingDuration: 0,
        attachments: [],
        isTyping: false
      });

      onStopTyping();
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const startRecording = async (mode: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video'
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.addEventListener('dataavailable', (event) => {
        chunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
        const blob = new Blob(chunks, { 
          type: mode === 'audio' ? 'audio/webm' : 'video/webm' 
        });
        setRecordingBlob(blob);
        setRecordingUrl(URL.createObjectURL(blob));

        // Create attachment
        const attachment: FileAttachment = {
          id: Date.now().toString(),
          file: new File([blob], `recording_${Date.now()}.webm`, {
            type: blob.type
          }),
          type: mode,
          preview: mode === 'video' ? URL.createObjectURL(blob) : undefined,
          uploadProgress: 0,
          uploadStatus: 'pending'
        };

        setInputState(prev => ({
          ...prev,
          attachments: [...prev.attachments, attachment],
          isRecording: false,
          recordingDuration: 0,
          mode: 'text'
        }));

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorder.start();
      onRecordingStart(mode);
      
      setInputState(prev => ({ 
        ...prev, 
        isRecording: true, 
        mode,
        recordingDuration: 0 
      }));

      // Start timer
      let duration = 0;
      recordingTimerRef.current = setInterval(() => {
        duration += 1;
        setInputState(prev => ({ ...prev, recordingDuration: duration }));
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && inputState.isRecording) {
      mediaRecorderRef.current.stop();
      onRecordingStop();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      const attachment: FileAttachment = {
        id: Date.now().toString() + Math.random().toString(),
        file,
        type: file.type.startsWith('image/') ? 'image' :
              file.type.startsWith('video/') ? 'video' :
              file.type.startsWith('audio/') ? 'audio' : 'document',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        uploadProgress: 0,
        uploadStatus: 'pending'
      };

      setInputState(prev => ({
        ...prev,
        attachments: [...prev.attachments, attachment]
      }));
    });
    
    setShowAttachmentMenu(false);
    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setInputState(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id)
    }));
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = 
        inputState.content.slice(0, start) + 
        emoji + 
        inputState.content.slice(end);
      
      handleContentChange(newContent);
      
      // Reset cursor position after emoji
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
  };

  const canSend = () => {
    return !disabled && 
           !inputState.isRecording && 
           (inputState.content.trim() || inputState.attachments.length > 0);
  };

  return (
    <div className="glass-strong border-t border-white/20 p-4">
      {/* Reply indicator */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 glass-subtle rounded-lg border-l-4 border-primary-blue/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-primary-blue">
                    Replying to {replyingTo.senderName}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {replyingTo.content}
                </p>
              </div>
              <button
                onClick={onCancelReply}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachments preview */}
      <AnimatePresence>
        {inputState.attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <div className="flex gap-2 overflow-x-auto pb-2">
              {inputState.attachments.map(attachment => (
                <div 
                  key={attachment.id}
                  className="relative flex-shrink-0 w-16 h-16 glass-subtle rounded-lg overflow-hidden"
                >
                  {attachment.type === 'image' && attachment.preview ? (
                    <img 
                      src={attachment.preview} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : attachment.type === 'video' && attachment.preview ? (
                    <video 
                      src={attachment.preview}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {attachment.type === 'audio' && <Mic className="w-6 h-6" />}
                      {attachment.type === 'document' && <FileText className="w-6 h-6" />}
                    </div>
                  )}
                  
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  
                  {attachment.uploadProgress > 0 && attachment.uploadProgress < 100 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-xs">{attachment.uploadProgress}%</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording interface */}
      <AnimatePresence>
        {inputState.isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 glass-subtle rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-3 h-3 bg-red-500 rounded-full"
                />
                <span className="font-inter text-sm text-gray-800">
                  Recording {inputState.mode}...
                </span>
              </div>
              <span className="font-mono text-sm text-gray-600">
                {formatRecordingTime(inputState.recordingDuration)}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={stopRecording}
              className="w-full mt-3 py-3 bg-gradient-to-r from-red-500/30 to-pink-500/30 hover:from-red-500/40 hover:to-pink-500/40 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <StopCircle className="w-5 h-5" />
              <span>Stop & Add to Message</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input area */}
      <div className="flex items-end gap-3">
        {/* Attachment button */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            disabled={inputState.isRecording}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              inputState.isRecording 
                ? "bg-gray-300/50 cursor-not-allowed" 
                : "glass-subtle hover:glass text-primary-blue"
            )}
          >
            <Plus className="w-5 h-5" />
          </motion.button>

          {/* Attachment menu */}
          <AnimatePresence>
            {showAttachmentMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute bottom-full mb-2 left-0 glass-strong rounded-lg border border-white/30 p-2 min-w-[140px]"
              >
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                  className="w-full p-2 rounded-lg hover:bg-white/20 flex items-center gap-2 text-sm"
                >
                  <Image className="w-4 h-4" />
                  Photo
                </button>
                <button
                  onClick={() => startRecording('audio')}
                  className="w-full p-2 rounded-lg hover:bg-white/20 flex items-center gap-2 text-sm"
                >
                  <Mic className="w-4 h-4" />
                  Audio
                </button>
                <button
                  onClick={() => startRecording('video')}
                  className="w-full p-2 rounded-lg hover:bg-white/20 flex items-center gap-2 text-sm"
                >
                  <Video className="w-4 h-4" />
                  Video
                </button>
                <button
                  onClick={() => {
                    const input = fileInputRef.current;
                    if (input) {
                      input.accept = "*";
                      input.click();
                    }
                    setShowAttachmentMenu(false);
                  }}
                  className="w-full p-2 rounded-lg hover:bg-white/20 flex items-center gap-2 text-sm"
                >
                  <Paperclip className="w-4 h-4" />
                  File
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputState.content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={placeholder}
            disabled={disabled || inputState.isRecording}
            className={cn(
              "w-full min-h-[44px] max-h-[120px] p-3 pr-10 rounded-2xl resize-none",
              "chat-input font-inter text-sm leading-relaxed",
              "text-gray-800 placeholder-gray-500",
              "focus:outline-none transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            style={{ 
              lineHeight: '1.5',
              scrollbarWidth: 'thin'
            }}
          />
          
          {/* Character count */}
          {inputState.content.length > maxLength * 0.8 && (
            <div className={cn(
              "absolute bottom-1 left-2 text-xs",
              inputState.content.length > maxLength * 0.95 
                ? "text-red-500" 
                : "text-gray-500"
            )}>
              {inputState.content.length}/{maxLength}
            </div>
          )}

          {/* Emoji button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={inputState.isRecording}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Emoji picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full mb-2 right-0 glass-strong rounded-2xl p-4 border border-white/30 w-80"
              >
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Prayer Emojis</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {PRAYER_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="w-8 h-8 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Common</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {COMMON_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="w-8 h-8 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Send button */}
        <motion.button
          whileHover={{ scale: canSend() ? 1.05 : 1 }}
          whileTap={{ scale: canSend() ? 0.95 : 1 }}
          onClick={handleSend}
          disabled={!canSend()}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
            canSend()
              ? "bg-gradient-to-r from-primary-blue to-primary-purple text-white shadow-lg shadow-primary-blue/25" 
              : "bg-gray-300/50 text-gray-500 cursor-not-allowed"
          )}
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Prayer context for prayer conversations */}
      {conversation.type === 'prayer_circle' && conversation.originalPrayer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 glass-subtle rounded-lg border-l-4 border-primary-gold/50"
        >
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-primary-gold" />
            <span className="text-xs font-medium text-primary-gold">
              Praying for
            </span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-2">
            {conversation.originalPrayer.content}
          </p>
          {conversation.originalPrayer.location && (
            <div className="flex items-center gap-1 mt-2">
              <MapPin className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-500">
                {conversation.originalPrayer.location.address}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}