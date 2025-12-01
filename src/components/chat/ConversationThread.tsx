/**
 * Enhanced Conversation Thread with Advanced Media Sharing
 * Instagram/WhatsApp-level media functionality with spiritual context
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Expand } from 'lucide-react';
import { respondToPrayer } from '../../services/prayerService';
import { useAuth } from '../../contexts/AuthContext';
import { MediaInput } from '../media/MediaInput';
import { MediaMessage } from '../media/MediaMessage';
import { TypingIndicator, useTypingIndicator } from '../realtime/TypingIndicator';
import { PresenceIndicator, ConversationPresence } from '../realtime/PresenceIndicator';
import { readReceiptService } from '../../services/readReceiptService';
import { presenceService, PresenceStatus } from '../../services/presenceService';
import type { PrayerResponse } from '../../types/prayer';
import type { MediaUpload, MediaMessage as MediaMessageType } from '../../types/media';

interface EnhancedMessage {
  id: string;
  content: string;
  contentType: 'text' | 'audio' | 'video' | 'image';
  sender: 'user' | 'other';
  senderName: string;
  timestamp: Date;
  mediaUpload?: MediaUpload;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyTo?: string;
}

interface EnhancedConversationThreadProps {
  conversationId: string;
  otherPersonName: string;
  originalPrayer: {
    title?: string;
    content: string;
    contentType: 'text' | 'audio' | 'video';
    userId?: string;
  };
  initialMessage?: string;
  initialResponses?: PrayerResponse[];
  onBack: () => void;
}

export function EnhancedConversationThread({
  conversationId,
  otherPersonName,
  originalPrayer,
  initialMessage,
  initialResponses,
  onBack
}: EnhancedConversationThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [fullScreenMedia, setFullScreenMedia] = useState<{
    url: string;
    type: MediaUpload['type'];
  } | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time hooks
  const {
    typingUsers,
    startTyping,
    stopTyping
  } = useTypingIndicator(conversationId);

  // Convert PrayerResponse to EnhancedMessage format
  const responseToMessage = useCallback((response: PrayerResponse): EnhancedMessage => {
    const isCurrentUser = response.responder_id === user?.id;
    
    // Determine content type and create media upload if applicable
    let mediaUpload: MediaUpload | undefined;
    let contentType: EnhancedMessage['contentType'] = response.content_type;
    
    if (response.content_url && response.content_type !== 'text') {
      // Create a simplified MediaUpload for existing content
      mediaUpload = {
        id: response.id,
        file: new File([], 'existing_media'), // Placeholder file
        type: response.content_type === 'audio' ? 'audio' : 
              response.content_type === 'video' ? 'video' : 'image',
        metadata: {
          size: 0,
          mimeType: response.content_type === 'audio' ? 'audio/webm' :
                   response.content_type === 'video' ? 'video/mp4' : 'image/jpeg',
          fileName: `${response.content_type}_message`
        },
        uploadProgress: 100,
        status: 'ready',
        url: response.content_url
      };
    }

    return {
      id: response.id,
      content: response.message,
      contentType,
      sender: isCurrentUser ? 'user' : 'other',
      senderName: isCurrentUser ? 'You' : (response.responder_name || 'Anonymous'),
      timestamp: new Date(response.created_at),
      mediaUpload,
      deliveryStatus: 'delivered' // Assume delivered for existing messages
    };
  }, [user?.id]);

  // Initialize messages
  useEffect(() => {
    if (initialResponses && initialResponses.length > 0) {
      const convertedMessages = initialResponses.map(responseToMessage);
      setMessages(convertedMessages);
      
      // Extract participants
      const participantIds = new Set<string>();
      if (originalPrayer.userId) participantIds.add(originalPrayer.userId);
      if (user?.id) participantIds.add(user.id);
      initialResponses.forEach(response => participantIds.add(response.responder_id));
      setParticipants(Array.from(participantIds));
    } else if (initialMessage) {
      setMessages([{
        id: '1',
        content: initialMessage,
        contentType: 'text',
        sender: 'other',
        senderName: otherPersonName,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        deliveryStatus: 'delivered'
      }]);
      
      if (originalPrayer.userId && user?.id) {
        setParticipants([originalPrayer.userId, user.id]);
      }
    }
  }, [initialResponses, initialMessage, otherPersonName, responseToMessage, originalPrayer.userId, user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Setup real-time presence
  useEffect(() => {
    if (user?.id) {
      presenceService.setPresence(conversationId, user.id, PresenceStatus.ONLINE);
      return () => {
        presenceService.setPresence(conversationId, user.id, PresenceStatus.OFFLINE);
      };
    }
  }, [conversationId, user?.id]);

  // Handle typing indicators
  const handleTextChange = useCallback((value: string) => {
    setTextInput(value);
    
    if (value && !typingUsers.includes(user?.id || '')) {
      startTyping(user?.id || '');
    } else if (!value && typingUsers.includes(user?.id || '')) {
      stopTyping(user?.id || '');
    }
  }, [user?.id, typingUsers, startTyping, stopTyping]);

  // Send message (text or media)
  const handleSendMessage = useCallback(async (content: string, mediaUpload?: MediaUpload) => {
    if (!user || (!content.trim() && !mediaUpload)) return;

    setIsSending(true);
    stopTyping(user.id);

    // Create optimistic message
    const optimisticMessage: EnhancedMessage = {
      id: `temp-${Date.now()}`,
      content: content || (mediaUpload ? `${mediaUpload.type} message` : ''),
      contentType: mediaUpload ? 
        (mediaUpload.type === 'image' ? 'image' : 
         mediaUpload.type === 'video' ? 'video' : 
         mediaUpload.type === 'audio' || mediaUpload.type === 'voice_message' ? 'audio' : 'text') 
        : 'text',
      sender: 'user',
      senderName: 'You',
      timestamp: new Date(),
      mediaUpload,
      deliveryStatus: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous';
      
      const result = await respondToPrayer(
        conversationId,
        user.id,
        userName,
        content || `${mediaUpload?.type || 'media'} message`,
        mediaUpload ? 
          (mediaUpload.type === 'image' ? 'text' : // Images with captions are text type
           mediaUpload.type === 'video' ? 'video' :
           'audio') 
          : 'text',
        mediaUpload?.url,
        false
      );

      if (result) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticMessage.id
            ? { 
                ...msg, 
                id: result.response.id,
                deliveryStatus: 'delivered'
              }
            : msg
        ));

        // Mark as read by current user
        setTimeout(() => {
          setMessages(prev => prev.map(msg =>
            msg.id === result.response.id
              ? { ...msg, deliveryStatus: 'read' }
              : msg
          ));
        }, 1000);

      } else {
        // Mark as failed
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticMessage.id
            ? { ...msg, deliveryStatus: 'failed' }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Mark as failed
      setMessages(prev => prev.map(msg =>
        msg.id === optimisticMessage.id
          ? { ...msg, deliveryStatus: 'failed' }
          : msg
      ));
    } finally {
      setIsSending(false);
    }
  }, [user, conversationId, stopTyping]);

  // Handle media click (fullscreen view)
  const handleMediaClick = useCallback((mediaUrl: string, type: MediaUpload['type']) => {
    setFullScreenMedia({ url: mediaUrl, type });
  }, []);

  // Close fullscreen media
  const closeFullScreenMedia = useCallback(() => {
    setFullScreenMedia(null);
  }, []);

  // Handle message reactions
  const handleReact = useCallback((messageId: string, reaction: string) => {
    // In a full implementation, this would update the message with reactions
    console.log('React to message:', messageId, reaction);
  }, []);

  // Handle message replies
  const handleReply = useCallback((messageId: string) => {
    // In a full implementation, this would set the reply context
    console.log('Reply to message:', messageId);
  }, []);

  // Handle message sharing
  const handleShare = useCallback((messageId: string) => {
    // In a full implementation, this would show share options
    console.log('Share message:', messageId);
  }, []);

  return (
    <>
      <motion.div
        key="enhanced-conversation-thread"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex flex-col overflow-hidden -m-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-white/20 bg-white/5 backdrop-blur-sm">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          
          <div className="flex-1">
            <h3 className="text-gray-800 font-semibold">{otherPersonName}</h3>
            <div className="flex items-center gap-2">
              <PresenceIndicator 
                conversationId={conversationId}
                participants={participants}
                currentUserId={user?.id || ''}
              />
              <p className="text-xs text-gray-500">Prayer conversation</p>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Original Prayer Request */}
          <div className="glass-strong rounded-2xl p-6 border-l-4 border-blue-400 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-500 font-medium">Original Prayer Request</span>
            </div>
            {originalPrayer.title && (
              <h4 className="text-gray-800 mb-3 font-semibold text-lg">{originalPrayer.title}</h4>
            )}
            <p className="text-gray-700 leading-relaxed">{originalPrayer.content}</p>
          </div>

          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message) => {
              if (message.mediaUpload) {
                // Convert to MediaMessage format
                const mediaMessage: MediaMessageType = {
                  id: message.id,
                  conversationId,
                  senderId: message.sender === 'user' ? (user?.id || '') : 'other',
                  senderName: message.senderName,
                  content: message.content !== `${message.mediaUpload.type} message` ? message.content : undefined,
                  mediaUpload: message.mediaUpload,
                  timestamp: message.timestamp,
                  isRead: message.deliveryStatus === 'read',
                  deliveryStatus: message.deliveryStatus
                };

                return (
                  <MediaMessage
                    key={message.id}
                    message={mediaMessage}
                    isOwn={message.sender === 'user'}
                    onMediaClick={handleMediaClick}
                    onReact={handleReact}
                    onReply={handleReply}
                    onShare={handleShare}
                  />
                );
              } else {
                // Regular text message
                return (
                  <MessageBubble 
                    key={message.id} 
                    message={message} 
                  />
                );
              }
            })}
          </div>

          {/* Typing Indicator */}
          <TypingIndicator 
            conversationId={conversationId}
            currentUserId={user?.id || ''}
          />
          
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Media Input */}
        <div className="p-6 border-t border-white/20 bg-white/5 backdrop-blur-sm">
          <MediaInput
            conversationId={conversationId}
            textValue={textInput}
            onTextChange={handleTextChange}
            onSend={handleSendMessage}
            isSending={isSending}
            placeholder="Share your prayer response..."
            enableSpiritualContext={true}
          />
        </div>
      </motion.div>

      {/* Fullscreen Media Viewer */}
      <AnimatePresence>
        {fullScreenMedia && (
          <FullScreenMediaViewer
            mediaUrl={fullScreenMedia.url}
            mediaType={fullScreenMedia.type}
            onClose={closeFullScreenMedia}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Enhanced Message Bubble for text messages
function MessageBubble({ message }: { message: EnhancedMessage }) {
  const isUser = message.sender === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 rounded-2xl shadow-lg backdrop-blur-md border border-white/20 ${
            isUser
              ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-br-md'
              : 'bg-white/10 glass-effect rounded-bl-md'
          }`}
        >
          <p className="text-sm text-gray-800 leading-relaxed">{message.content}</p>
        </div>
        
        <div className={`flex items-center gap-2 px-2 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-gray-500">
            {formatMessageTime(message.timestamp)}
          </span>
          {isUser && (
            <span className="text-xs text-gray-500 capitalize">
              {message.deliveryStatus}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Fullscreen Media Viewer
function FullScreenMediaViewer({ 
  mediaUrl, 
  mediaType, 
  onClose 
}: {
  mediaUrl: string;
  mediaType: MediaUpload['type'];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 rotate-45" />
        </button>

        {/* Media Content */}
        <div onClick={(e) => e.stopPropagation()}>
          {mediaType === 'image' ? (
            <img
              src={mediaUrl}
              alt="Fullscreen view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          ) : mediaType === 'video' ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-w-full max-h-[90vh] rounded-lg"
            />
          ) : (
            <div className="bg-white rounded-lg p-8">
              <p className="text-gray-600">Audio playback</p>
              <audio src={mediaUrl} controls className="mt-4" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Utility function
function formatMessageTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}