/**
 * Enhanced Mobile Conversation Thread
 * 
 * WhatsApp/Instagram-level conversation experience integrating all mobile optimizations:
 * - Advanced touch gestures with haptic feedback
 * - Mobile keyboard handling and auto-expanding input
 * - Virtual scrolling for performance
 * - Progressive media loading
 * - Voice recording with waveforms
 * - Battery and memory optimization
 * 
 * SPIRITUAL MISSION: Effortless prayer conversations that feel divine
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  MoreVertical,
  Phone,
  VideoIcon,
  Info,
  Search
} from 'lucide-react';
import { 
  useMobileTouchGestures, 
  MessageContextMenu, 
  MessageContextAction 
} from '../../hooks/useMobileTouchGestures';
import { useMobileVirtualScroll } from '../../hooks/useMobilePerformance';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard';
import { useProgressiveImage, useAudioWithWaveform } from '../../hooks/useProgressiveMedia';
import { MobileMessageInput } from './MobileMessageInput';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import { nativeMobile } from '../../services/nativeMobileIntegration';
import { realtimeOptimizer } from '../../services/mobileRealtimeOptimizer';

interface Message {
  id: string;
  content: string;
  contentType: 'text' | 'audio' | 'video' | 'image';
  sender: 'user' | 'other';
  senderName: string;
  timestamp: Date;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  duration?: number; // for audio/video
  isDelivered?: boolean;
  isRead?: boolean;
  replyTo?: string; // Message ID being replied to
}

interface Conversation {
  id: string;
  otherPersonName: string;
  otherPersonAvatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  isTyping?: boolean;
}

interface EnhancedConversationThreadProps {
  conversation: Conversation;
  messages: Message[];
  onBack: () => void;
  onSendMessage: (content: string, type: 'text' | 'audio' | 'video' | 'image', mediaUrl?: string) => Promise<void>;
  onMarkAsRead: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onForwardMessage: (messageId: string) => void;
  onReplyToMessage: (messageId: string) => void;
  loading?: boolean;
}

export function EnhancedConversationThread({
  conversation,
  messages,
  onBack,
  onSendMessage,
  onMarkAsRead,
  onDeleteMessage,
  onForwardMessage,
  onReplyToMessage,
  loading = false
}: EnhancedConversationThreadProps) {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { keyboardInfo, adjustLayoutForKeyboard } = useMobileKeyboard();

  // Virtual scrolling for performance
  const {
    visibleMessages,
    totalHeight,
    offsetY,
    handleScroll,
    registerItem,
    scrollToBottom
  } = useMobileVirtualScroll(messages, 600);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isScrolledToBottom && messages.length > 0) {
      setTimeout(() => scrollToBottom('smooth'), 100);
    }
  }, [messages.length, isScrolledToBottom, scrollToBottom]);

  // Handle keyboard layout adjustment
  useEffect(() => {
    if (containerRef.current) {
      adjustLayoutForKeyboard(containerRef.current, undefined, {
        maintainScrollPosition: true
      });
    }
  }, [keyboardInfo, adjustLayoutForKeyboard]);

  // Handle scroll position tracking
  const handleMessageScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    handleScroll(event);
    
    const container = event.currentTarget;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
    setIsScrolledToBottom(isAtBottom);
  }, [handleScroll]);

  // Message context actions
  const getMessageActions = useCallback((message: Message): MessageContextAction[] => {
    const actions: MessageContextAction[] = [
      {
        label: 'Reply',
        icon: '↩️',
        action: () => {
          setReplyingTo(message);
          onReplyToMessage(message.id);
        }
      },
      {
        label: 'React',
        icon: '😊',
        action: () => {
          // Handle reaction
        }
      },
      {
        label: 'Forward',
        icon: '➡️',
        action: () => onForwardMessage(message.id)
      },
      {
        label: 'Copy',
        icon: '📋',
        action: () => {
          navigator.clipboard.writeText(message.content);
          nativeMobile.triggerHaptic();
        }
      }
    ];

    if (message.sender === 'user') {
      actions.push({
        label: 'Delete',
        icon: '🗑️',
        action: () => onDeleteMessage(message.id),
        destructive: true
      });
    }

    return actions;
  }, [onReplyToMessage, onForwardMessage, onDeleteMessage]);

  // Handle message send
  const handleSendMessage = useCallback(async (content: string, attachments: any[] = []) => {
    try {
      if (attachments.length > 0) {
        // Handle media attachments
        for (const attachment of attachments) {
          await onSendMessage('', attachment.type, attachment.url);
        }
      }
      
      if (content.trim()) {
        await onSendMessage(content, 'text');
      }
      
      // Clear reply state
      setReplyingTo(null);
      
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [onSendMessage]);

  // Handle voice recording
  const handleVoiceRecordingComplete = useCallback(async (
    audioBlob: Blob, 
    duration: number
  ) => {
    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      await onSendMessage('', 'audio', audioUrl);
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Failed to send voice message:', error);
    }
  }, [onSendMessage]);

  // Format last seen time
  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return 'Active now';
    if (hours < 24) return `Last seen ${Math.floor(hours)}h ago`;
    return `Last seen ${Math.floor(hours / 24)}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full bg-gradient-to-b from-blue-50/20 to-purple-50/20"
    >
      {/* Header */}
      <div className="glass-strong border-b border-white/20 px-4 py-3 safe-area-padding-top">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>

          {/* Avatar and Info */}
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                {conversation.otherPersonAvatar ? (
                  <img 
                    src={conversation.otherPersonAvatar} 
                    alt={conversation.otherPersonName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium">
                    {conversation.otherPersonName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Online indicator */}
              {conversation.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-gray-800 font-semibold truncate">
                {conversation.otherPersonName}
              </h3>
              <p className="text-xs text-gray-500">
                {conversation.isTyping ? (
                  <span className="text-blue-500 italic">typing...</span>
                ) : conversation.isOnline ? (
                  'Online'
                ) : conversation.lastSeen ? (
                  formatLastSeen(conversation.lastSeen)
                ) : (
                  'Prayer conversation'
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1">
            <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <Phone className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <VideoIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleMessageScroll}
        style={{ paddingBottom: keyboardInfo.isVisible ? keyboardInfo.height + 20 : 20 }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleMessages.map((message) => (
              <EnhancedMessageBubble
                key={message.id}
                message={message as Message}
                actions={getMessageActions(message as Message)}
                onRef={(el) => registerItem(message.id, el)}
                onMarkAsRead={() => onMarkAsRead(message.id)}
              />
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-subtle border-t border-white/20 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-blue-400 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-600 font-medium">
                  Replying to {replyingTo.senderName}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {replyingTo.content}
                </p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-400 rotate-45" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <MobileMessageInput
        onSendMessage={handleSendMessage}
        onStartTyping={() => {
          // Emit typing indicator
        }}
        onStopTyping={() => {
          // Stop typing indicator
        }}
        placeholder={replyingTo ? "Reply to prayer..." : "Send a prayer..."}
      />

      {/* Scroll to Bottom FAB */}
      <AnimatePresence>
        {!isScrolledToBottom && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-20 right-4 w-12 h-12 bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white"
          >
            <ArrowLeft className="w-5 h-5 rotate-[-90deg]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Voice Recorder Modal */}
      <AnimatePresence>
        {showVoiceRecorder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <VoiceMessageRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Enhanced Message Bubble with all mobile optimizations
interface EnhancedMessageBubbleProps {
  message: Message;
  actions: MessageContextAction[];
  onRef: (el: HTMLElement | null) => void;
  onMarkAsRead: () => void;
}

function EnhancedMessageBubble({ 
  message, 
  actions, 
  onRef, 
  onMarkAsRead 
}: EnhancedMessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isUser = message.sender === 'user';

  // Progressive image loading
  const { currentSrc: imageSrc, isLoading: imageLoading } = useProgressiveImage(
    message.imageUrl || '',
    message.imageUrl ? `${message.imageUrl}_thumb` : undefined
  );

  // Audio playback
  const {
    isPlaying,
    progress,
    togglePlay,
    waveformData,
    audioRef,
    handlers
  } = useAudioWithWaveform(message.audioUrl || '', true);

  // Touch gestures
  const gestures = useMobileTouchGestures({
    onLongPress: (position) => {
      const contextMenu = new MessageContextMenu({
        message,
        position,
        actions
      });
      contextMenu.show();
      nativeMobile.triggerHaptic();
    },
    onDoubleTap: () => {
      // Quick reaction
      nativeMobile.triggerHaptic();
    },
    onTap: () => {
      if (message.contentType === 'audio' && message.audioUrl) {
        togglePlay();
      }
      onMarkAsRead();
    }
  });

  useEffect(() => {
    if (bubbleRef.current) {
      onRef(bubbleRef.current);
    }
  }, [onRef]);

  const renderContent = () => {
    switch (message.contentType) {
      case 'text':
        return (
          <p className="text-sm leading-relaxed break-words">
            {message.content}
          </p>
        );

      case 'image':
        return (
          <div className="relative rounded-lg overflow-hidden max-w-xs">
            <img
              src={imageSrc}
              alt="Shared image"
              className="w-full h-auto"
              style={{ aspectRatio: '4/3' }}
            />
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px] p-2">
            <audio ref={audioRef} src={message.audioUrl} {...handlers} />
            
            <button
              onClick={togglePlay}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              {isPlaying ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-3 h-3 bg-current rounded-sm"
                />
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-0 h-0 border-l-[6px] border-l-current border-y-[4px] border-y-transparent ml-0.5"
                />
              )}
            </button>

            {/* Waveform */}
            <div className="flex-1 flex items-center gap-1 h-8">
              {waveformData.length > 0 ? waveformData.map((level, index) => (
                <motion.div
                  key={index}
                  className="bg-white/40 rounded-full"
                  style={{ width: '2px' }}
                  animate={{ 
                    height: Math.max(4, level * 20),
                    opacity: (index / waveformData.length) <= progress / 100 ? 1 : 0.4
                  }}
                />
              )) : (
                // Default waveform when no data
                Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-white/40 rounded-full"
                    style={{ height: `${8 + Math.sin(i) * 4}px` }}
                  />
                ))
              )}
            </div>

            {/* Duration */}
            <span className="text-xs opacity-70 tabular-nums">
              {message.duration ? formatDuration(message.duration) : '0:00'}
            </span>
          </div>
        );

      case 'video':
        return (
          <div className="relative rounded-lg overflow-hidden max-w-xs">
            <video
              src={message.videoUrl}
              controls
              preload="metadata"
              className="w-full h-auto"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      {...gestures.bindGestures}
    >
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`
            px-4 py-3 rounded-2xl relative
            ${isUser
              ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-br-md'
              : 'glass-strong rounded-bl-md'
            }
            ${message.contentType === 'audio' ? 'px-2 py-2' : ''}
          `}
        >
          {renderContent()}
          
          {/* Message status indicators */}
          <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs opacity-60">
              {formatTime(message.timestamp)}
            </span>
            
            {isUser && (
              <div className="flex gap-1">
                {message.isDelivered && (
                  <div className="w-1 h-1 bg-current rounded-full opacity-60" />
                )}
                {message.isRead && (
                  <div className="w-1 h-1 bg-blue-500 rounded-full" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}