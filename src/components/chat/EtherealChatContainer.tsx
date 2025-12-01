/**
 * Ethereal Glass Chat Container Component
 * Agent 5 - Chat UI Designer
 * 
 * Complete chat experience with PrayerMap's ethereal glass design system
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  MoreVertical, 
  Phone, 
  Video, 
  Info,
  VolumeX,
  Volume2,
  Users,
  MapPin,
  Star,
  Heart
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConversationList } from './ConversationList';
import { EtherealMessageBubble } from './EtherealMessageBubble';
import { EtherealChatInput } from './EtherealChatInput';
import { TypingIndicator } from './TypingIndicator';
import type { 
  Conversation, 
  ChatMessage, 
  TypingIndicator as TypingIndicatorType,
  FileAttachment 
} from '../../types/chat';

interface EtherealChatContainerProps {
  conversations: Conversation[];
  activeConversation?: Conversation;
  messages: ChatMessage[];
  typingIndicators: TypingIndicatorType[];
  currentUserId: string;
  onSelectConversation: (conversation: Conversation) => void;
  onSendMessage: (content: string, type: 'text' | 'audio' | 'video' | 'image', attachment?: FileAttachment) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onRecordingStart: (mode: 'audio' | 'video') => void;
  onRecordingStop: () => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
  onReplyToMessage: (message: ChatMessage) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onResendMessage: (messageId: string) => void;
  onBack?: () => void;
  loading?: boolean;
  error?: string;
}

export function EtherealChatContainer({
  conversations,
  activeConversation,
  messages,
  typingIndicators,
  currentUserId,
  onSelectConversation,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onRecordingStart,
  onRecordingStop,
  onReactToMessage,
  onReplyToMessage,
  onEditMessage,
  onDeleteMessage,
  onResendMessage,
  onBack,
  loading = false,
  error
}: EtherealChatContainerProps) {
  const [replyingTo, setReplyingTo] = useState<ChatMessage | undefined>();
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end' 
        });
      }
    };

    const timeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeout);
  }, [messages, typingIndicators]);

  const handleReply = useCallback((message: ChatMessage) => {
    setReplyingTo(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(undefined);
  }, []);

  const formatParticipantNames = (conversation: Conversation) => {
    if (conversation.title) return conversation.title;
    return conversation.participants
      .filter(p => p.id !== currentUserId)
      .slice(0, 2)
      .map(p => p.name)
      .join(', ');
  };

  const getOnlineParticipants = (conversation: Conversation) => {
    return conversation.participants.filter(p => p.isOnline).length;
  };

  const getPrayingParticipants = (conversation: Conversation) => {
    return conversation.participants.filter(p => p.isPraying).length;
  };

  // Group messages by sender and time proximity
  const groupedMessages = React.useMemo(() => {
    const groups: Array<{
      senderId: string;
      messages: Array<ChatMessage & { isPrevious?: boolean; isNext?: boolean }>;
    }> = [];

    messages.forEach((message, index) => {
      const prevMessage = messages[index - 1];
      const nextMessage = messages[index + 1];
      
      const isPrevious = prevMessage && 
        prevMessage.senderId === message.senderId &&
        (message.timestamp.getTime() - prevMessage.timestamp.getTime()) < 60000; // 1 minute

      const isNext = nextMessage &&
        nextMessage.senderId === message.senderId &&
        (nextMessage.timestamp.getTime() - message.timestamp.getTime()) < 60000; // 1 minute

      if (groups.length === 0 || groups[groups.length - 1].senderId !== message.senderId) {
        groups.push({
          senderId: message.senderId,
          messages: [{ ...message, isPrevious, isNext }]
        });
      } else {
        groups[groups.length - 1].messages.push({ ...message, isPrevious, isNext });
      }
    });

    return groups.flatMap(group => group.messages);
  }, [messages]);

  if (!activeConversation) {
    return (
      <div className="flex h-full">
        <div className="flex-1">
          <ConversationList
            conversations={conversations}
            onSelectConversation={onSelectConversation}
            loading={loading}
            error={error}
          />
        </div>
        
        {/* Empty state */}
        <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 glass-strong rounded-full flex items-center justify-center">
              <Heart className="w-10 h-10 text-primary-gold" />
            </div>
            <h3 className="text-xl font-cinzel font-semibold text-gray-800 mb-2">
              Welcome to Prayer Conversations
            </h3>
            <p className="text-gray-600 max-w-sm mx-auto">
              Select a conversation to start praying with others and sharing God's love
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Conversation List - Desktop sidebar */}
      <div className="hidden lg:block lg:w-80 border-r border-white/20">
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversation.id}
          onSelectConversation={onSelectConversation}
          loading={loading}
          error={error}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong p-4 border-b border-white/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {/* Back button for mobile */}
            {onBack && (
              <button
                onClick={onBack}
                className="lg:hidden p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
            )}

            {/* Conversation info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {activeConversation.type === 'direct' && activeConversation.participants[0] ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue/20 to-primary-purple/20 flex items-center justify-center">
                    {activeConversation.participants[0].avatar ? (
                      <img 
                        src={activeConversation.participants[0].avatar} 
                        alt={activeConversation.participants[0].name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="font-cinzel text-sm font-medium text-gray-700">
                        {activeConversation.participants[0].name.charAt(0)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-gold/30 to-primary-purple/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-700" />
                  </div>
                )}

                {/* Status indicators */}
                {activeConversation.type === 'direct' && activeConversation.participants[0]?.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-white"></div>
                )}
                {getPrayingParticipants(activeConversation) > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-gold rounded-full border border-white flex items-center justify-center">
                    <span className="text-xs">🙏</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-cinzel font-medium text-gray-800 truncate">
                  {formatParticipantNames(activeConversation)}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {activeConversation.type === 'prayer_circle' && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Prayer Circle
                    </span>
                  )}
                  {getOnlineParticipants(activeConversation) > 0 && (
                    <span>
                      {getOnlineParticipants(activeConversation)} online
                    </span>
                  )}
                  {getPrayingParticipants(activeConversation) > 0 && (
                    <span>
                      {getPrayingParticipants(activeConversation)} praying
                    </span>
                  )}
                  {activeConversation.originalPrayer?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {activeConversation.originalPrayer.location.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            {activeConversation.isMuted ? (
              <VolumeX className="w-5 h-5 text-gray-500" />
            ) : (
              <Volume2 className="w-5 h-5 text-gray-500" />
            )}
            
            <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <Phone className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <Video className="w-5 h-5 text-gray-700" />
            </button>
            <button 
              onClick={() => setShowConversationInfo(!showConversationInfo)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Info className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </motion.div>

        {/* Original Prayer Context */}
        {activeConversation.originalPrayer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="glass-subtle p-4 border-b border-white/10"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-gold/30 to-primary-purple/30 flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-primary-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-primary-blue">Original Prayer Request</span>
                  {activeConversation.originalPrayer.title && (
                    <span className="text-xs bg-primary-blue/10 text-primary-blue px-2 py-0.5 rounded-full">
                      {activeConversation.originalPrayer.title}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {activeConversation.originalPrayer.content}
                </p>
                {activeConversation.originalPrayer.location && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">
                      {activeConversation.originalPrayer.location.address}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Messages Container */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-1"
          style={{
            scrollBehavior: 'smooth',
            overscrollBehavior: 'contain'
          }}
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary-blue border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          ) : groupedMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Start the conversation with a prayer</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {groupedMessages.map((message, index) => (
                <EtherealMessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === currentUserId}
                  isPrevious={message.isPrevious}
                  isNext={message.isNext}
                  showAvatar={!message.isPrevious}
                  showTimestamp={!message.isNext}
                  onReact={onReactToMessage}
                  onReply={handleReply}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onResend={onResendMessage}
                />
              ))}
            </AnimatePresence>
          )}

          {/* Typing indicators */}
          <TypingIndicator indicators={typingIndicators} />

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <EtherealChatInput
          conversation={activeConversation}
          onSendMessage={onSendMessage}
          onStartTyping={onStartTyping}
          onStopTyping={onStopTyping}
          onRecordingStart={onRecordingStart}
          onRecordingStop={onRecordingStop}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          placeholder={
            activeConversation.type === 'prayer_circle' 
              ? "Send a prayer or encouragement..."
              : "Type your message..."
          }
        />
      </div>

      {/* Conversation Info Sidebar */}
      <AnimatePresence>
        {showConversationInfo && (
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            className="w-80 border-l border-white/20 glass-strong p-6 overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-blue/20 to-primary-purple/20 flex items-center justify-center mx-auto mb-4">
                  {activeConversation.type === 'direct' && activeConversation.participants[0]?.avatar ? (
                    <img 
                      src={activeConversation.participants[0].avatar} 
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Users className="w-8 h-8 text-gray-700" />
                  )}
                </div>
                <h3 className="font-cinzel text-lg font-semibold text-gray-800">
                  {formatParticipantNames(activeConversation)}
                </h3>
                <p className="text-sm text-gray-600">
                  {activeConversation.participants.length} participants
                </p>
              </div>

              {/* Participants */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">Participants</h4>
                <div className="space-y-2">
                  {activeConversation.participants.map(participant => (
                    <div key={participant.id} className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue/20 to-primary-purple/20 flex items-center justify-center">
                        {participant.avatar ? (
                          <img 
                            src={participant.avatar} 
                            alt={participant.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {participant.name.charAt(0)}
                          </span>
                        )}
                        {participant.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{participant.name}</p>
                        <p className="text-xs text-gray-500">
                          {participant.isOnline ? 'Online' : 'Offline'}
                          {participant.isPraying && ' • Praying'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prayer stats */}
              {activeConversation.type === 'prayer_circle' && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">Prayer Stats</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 glass-subtle rounded-lg">
                      <div className="text-lg font-bold text-primary-blue">
                        {messages.filter(m => m.isPrayerMessage).length}
                      </div>
                      <div className="text-xs text-gray-600">Prayers Sent</div>
                    </div>
                    <div className="text-center p-3 glass-subtle rounded-lg">
                      <div className="text-lg font-bold text-primary-gold">
                        {getPrayingParticipants(activeConversation)}
                      </div>
                      <div className="text-xs text-gray-600">Currently Praying</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}