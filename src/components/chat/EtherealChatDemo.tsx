/**
 * Ethereal Glass Chat UI Demo Component
 * Agent 5 - Chat UI Designer
 * 
 * Showcase of PrayerMap's ethereal glass chat system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { EtherealChatContainer } from './EtherealChatContainer';
import type { 
  Conversation, 
  ChatMessage, 
  TypingIndicator,
  FileAttachment,
  ConversationParticipant
} from '../../types/chat';

// Mock data
const mockParticipants: ConversationParticipant[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    avatar: undefined,
    isOnline: true,
    isPraying: true,
    prayerStreak: 7,
    role: 'prayer_leader'
  },
  {
    id: '2',
    name: 'Michael Rodriguez', 
    avatar: undefined,
    isOnline: true,
    isPraying: false,
    prayerStreak: 3,
    role: 'member'
  },
  {
    id: '3',
    name: 'Emily Johnson',
    avatar: undefined,
    isOnline: false,
    isPraying: false,
    prayerStreak: 12,
    role: 'member'
  },
  {
    id: 'current',
    name: 'You',
    avatar: undefined,
    isOnline: true,
    isPraying: false,
    prayerStreak: 5,
    role: 'member'
  }
];

const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'Prayer for Healing',
    type: 'prayer_circle',
    participants: mockParticipants,
    lastActivity: new Date(),
    unreadCount: 2,
    originalPrayerId: 'prayer-1',
    originalPrayer: {
      title: 'Please pray for my mother',
      content: 'My mother was just diagnosed with cancer. Please pray for her healing and for our family to have strength during this difficult time.',
      contentType: 'text',
      userId: '1',
      location: {
        lat: 37.7749,
        lng: -122.4194,
        address: 'San Francisco, CA'
      }
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: '2',
    type: 'direct',
    participants: [mockParticipants[1], mockParticipants[3]],
    lastActivity: new Date(Date.now() - 30 * 60 * 1000),
    unreadCount: 0,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000)
  },
  {
    id: '3',
    title: 'Youth Prayer Group',
    type: 'group',
    participants: mockParticipants.slice(0, 3),
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unreadCount: 5,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
];

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    content: 'I just saw your prayer request. I\'m so sorry to hear about your mother. I\'ll be praying for her healing and for strength for your family.',
    contentType: 'text',
    senderId: '2',
    senderName: 'Michael Rodriguez',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'read',
    isPrayerMessage: true,
    prayerType: 'response'
  },
  {
    id: '2', 
    content: 'Thank you so much, Michael. Your prayers mean the world to us right now. 🙏',
    contentType: 'text',
    senderId: '1',
    senderName: 'Sarah Chen',
    timestamp: new Date(Date.now() - 90 * 60 * 1000),
    status: 'read',
    reactions: {
      '2': '❤️',
      '3': '🙏'
    }
  },
  {
    id: '3',
    content: 'I\'m also praying for your mother. God is the Great Healer, and I believe He has a plan for her recovery. Sending love to your whole family.',
    contentType: 'text',
    senderId: '3',
    senderName: 'Emily Johnson',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    status: 'read',
    isPrayerMessage: true,
    prayerType: 'response'
  },
  {
    id: '4',
    content: 'Just wanted to share this verse that\'s been on my heart: "He healeth the broken in heart, and bindeth up their wounds." Psalm 147:3. Praying for comfort and peace for your family.',
    contentType: 'text',
    senderId: 'current',
    senderName: 'You',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: 'read',
    isPrayerMessage: true,
    prayerType: 'response',
    reactions: {
      '1': '❤️',
      '2': '🙏',
      '3': '✨'
    }
  },
  {
    id: '5',
    content: 'That verse is perfect. Thank you all so much for your prayers and support. Update: Mom starts treatment next week. Please continue to pray for wisdom for the doctors and strength for her.',
    contentType: 'text', 
    senderId: '1',
    senderName: 'Sarah Chen',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: 'read'
  }
];

export function EtherealChatDemo() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | undefined>(
    mockConversations[0]
  );
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentUserId = 'current';

  // Simulate typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const shouldShowTyping = Math.random() > 0.8;
      if (shouldShowTyping && typingIndicators.length === 0) {
        setTypingIndicators([{
          userId: '2',
          userName: 'Michael Rodriguez',
          timestamp: new Date(),
          mode: 'text'
        }]);
        
        setTimeout(() => {
          setTypingIndicators([]);
        }, 3000);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [typingIndicators.length]);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    
    // Simulate loading messages
    setIsLoading(true);
    setTimeout(() => {
      if (conversation.id === '1') {
        setMessages(mockMessages);
      } else {
        setMessages([]);
      }
      setIsLoading(false);
    }, 500);
  }, []);

  const handleSendMessage = useCallback(async (
    content: string, 
    type: 'text' | 'audio' | 'video' | 'image',
    attachment?: FileAttachment
  ) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      contentType: type,
      senderId: currentUserId,
      senderName: 'You',
      timestamp: new Date(),
      status: 'sending'
    };

    // Add message optimistically
    setMessages(prev => [...prev, newMessage]);

    // Simulate sending
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id 
          ? { ...msg, status: 'sent' as const }
          : msg
      ));
    }, 500);

    // Simulate delivery
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id 
          ? { ...msg, status: 'delivered' as const }
          : msg
      ));
    }, 1000);

    // Simulate read
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id 
          ? { ...msg, status: 'read' as const }
          : msg
      ));
    }, 2000);
  }, [currentUserId]);

  const handleStartTyping = useCallback(() => {
    // In real implementation, this would send typing indicators to other users
    console.log('User started typing');
  }, []);

  const handleStopTyping = useCallback(() => {
    // In real implementation, this would stop typing indicators
    console.log('User stopped typing');
  }, []);

  const handleRecordingStart = useCallback((mode: 'audio' | 'video') => {
    console.log(`Started recording ${mode}`);
  }, []);

  const handleRecordingStop = useCallback(() => {
    console.log('Stopped recording');
  }, []);

  const handleReactToMessage = useCallback((messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const newReactions = { ...msg.reactions };
        if (newReactions[currentUserId] === emoji) {
          delete newReactions[currentUserId];
        } else {
          newReactions[currentUserId] = emoji;
        }
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));
  }, [currentUserId]);

  const handleReplyToMessage = useCallback((message: ChatMessage) => {
    console.log('Reply to message:', message);
  }, []);

  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            content: newContent,
            metadata: { ...msg.metadata, isEdited: true, editedAt: new Date() }
          }
        : msg
    ));
  }, []);

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const handleResendMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, status: 'sending' as const }
        : msg
    ));
    
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'sent' as const }
          : msg
      ));
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-heavenly-blue via-dawn-gold to-prayer-purple">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-cinzel font-bold text-primary-blue mb-4">
            Ethereal Glass Chat UI
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Experience PrayerMap's beautiful chat interface with ethereal glass design, 
            prayer-themed interactions, and mobile-optimized touch gestures.
          </p>
        </motion.div>

        {/* Chat Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-6xl mx-auto h-[600px] glass rounded-2xl overflow-hidden border border-white/30"
        >
          <EtherealChatContainer
            conversations={mockConversations}
            activeConversation={selectedConversation}
            messages={messages}
            typingIndicators={typingIndicators}
            currentUserId={currentUserId}
            onSelectConversation={handleSelectConversation}
            onSendMessage={handleSendMessage}
            onStartTyping={handleStartTyping}
            onStopTyping={handleStopTyping}
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            onReactToMessage={handleReactToMessage}
            onReplyToMessage={handleReplyToMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onResendMessage={handleResendMessage}
            loading={isLoading}
          />
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <div className="glass p-6 rounded-xl">
            <h3 className="font-cinzel text-lg font-semibold text-primary-blue mb-3">
              Ethereal Glass Design
            </h3>
            <p className="text-gray-700 text-sm">
              Beautiful glassmorphism effects with prayer-themed gradients and spiritual aesthetics.
            </p>
          </div>

          <div className="glass p-6 rounded-xl">
            <h3 className="font-cinzel text-lg font-semibold text-primary-blue mb-3">
              Mobile Optimized
            </h3>
            <p className="text-gray-700 text-sm">
              Touch gestures, haptic feedback, and 44px touch targets for perfect mobile experience.
            </p>
          </div>

          <div className="glass p-6 rounded-xl">
            <h3 className="font-cinzel text-lg font-semibold text-primary-blue mb-3">
              Prayer Features
            </h3>
            <p className="text-gray-700 text-sm">
              Special prayer message types, spiritual emojis, and prayer circle conversations.
            </p>
          </div>

          <div className="glass p-6 rounded-xl">
            <h3 className="font-cinzel text-lg font-semibold text-primary-blue mb-3">
              Rich Media
            </h3>
            <p className="text-gray-700 text-sm">
              Audio, video, and image messages with beautiful preview and playback controls.
            </p>
          </div>

          <div className="glass p-6 rounded-xl">
            <h3 className="font-cinzel text-lg font-semibold text-primary-blue mb-3">
              Reactions & Replies
            </h3>
            <p className="text-gray-700 text-sm">
              Express yourself with emoji reactions and threaded replies for meaningful conversations.
            </p>
          </div>

          <div className="glass p-6 rounded-xl">
            <h3 className="font-cinzel text-lg font-semibold text-primary-blue mb-3">
              Accessibility
            </h3>
            <p className="text-gray-700 text-sm">
              WCAG 2.1 AA compliant with screen reader support and keyboard navigation.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}