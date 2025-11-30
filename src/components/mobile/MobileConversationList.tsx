/**
 * Mobile-Optimized Conversation List Component
 * 
 * WhatsApp/Instagram-level conversation list with:
 * - Pull-to-refresh
 * - Swipe actions
 * - Virtual scrolling
 * - Touch-optimized interactions
 * 
 * SPIRITUAL MISSION: Effortless navigation through prayer conversations
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  ChevronRight, 
  MoreHorizontal,
  Archive,
  Bell,
  BellOff,
  Trash2
} from 'lucide-react';
import { useMobileTouchGestures } from '../../hooks/useMobileTouchGestures';
import { useMobileVirtualScroll } from '../../hooks/useMobilePerformance';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard';
import { nativeMobile } from '../../services/nativeMobileIntegration';

interface ConversationItem {
  id: string;
  otherPersonName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
  avatarUrl?: string;
  isPinned: boolean;
  isMuted: boolean;
  lastMessageType: 'text' | 'audio' | 'video' | 'image';
  isTyping?: boolean;
}

interface ConversationAction {
  id: 'pin' | 'mute' | 'archive' | 'delete';
  label: string;
  icon: React.ReactNode;
  color: string;
  destructive?: boolean;
}

interface MobileConversationListProps {
  conversations: ConversationItem[];
  onSelectConversation: (conversation: ConversationItem) => void;
  onRefresh: () => Promise<void>;
  onConversationAction: (conversationId: string, action: string) => void;
  loading?: boolean;
}

export function MobileConversationList({
  conversations,
  onSelectConversation,
  onRefresh,
  onConversationAction,
  loading = false
}: MobileConversationListProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { keyboardInfo } = useMobileKeyboard();

  // Virtual scrolling for performance
  const {
    visibleMessages: visibleConversations,
    totalHeight,
    offsetY,
    handleScroll,
    registerItem
  } = useMobileVirtualScroll(conversations as any, 600);

  // Pull-to-refresh gesture
  const pullToRefreshGestures = useMobileTouchGestures({
    onSwipeReply: (direction, distance) => {
      if (direction === 'down' && containerRef.current?.scrollTop === 0) {
        setPullDistance(Math.min(distance, 80));
      }
    },
    onSwipeComplete: async (direction) => {
      if (direction === 'down' && pullDistance > 50) {
        setRefreshing(true);
        await nativeMobile.triggerHaptic();
        
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      }
    }
  });

  // Conversation swipe actions
  const conversationActions: ConversationAction[] = [
    {
      id: 'pin',
      label: 'Pin',
      icon: <ChevronRight className="w-5 h-5" />,
      color: 'bg-blue-500'
    },
    {
      id: 'mute',
      label: 'Mute',
      icon: <BellOff className="w-5 h-5" />,
      color: 'bg-gray-500'
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: <Archive className="w-5 h-5" />,
      color: 'bg-orange-500'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-5 h-5" />,
      color: 'bg-red-500',
      destructive: true
    }
  ];

  // Pull-to-refresh header
  const PullToRefreshHeader = () => (
    <AnimatePresence>
      {pullDistance > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: pullDistance / 50 }}
          exit={{ opacity: 0 }}
          className="absolute top-0 left-0 right-0 flex justify-center py-4"
          style={{ transform: `translateY(-${40 - pullDistance}px)` }}
        >
          <div className="glass-strong rounded-full p-3 flex items-center gap-2">
            {refreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-600">Refreshing...</span>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ rotate: pullDistance > 50 ? 180 : 0 }}
                  className="text-blue-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.div>
                <span className="text-sm text-gray-600">
                  {pullDistance > 50 ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <PullToRefreshHeader />
      
      {/* Conversation List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        style={{
          transform: `translateY(${Math.min(pullDistance, 80)}px)`,
          paddingBottom: keyboardInfo.isVisible ? keyboardInfo.height : 0
        }}
        {...pullToRefreshGestures.bindGestures}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation as ConversationItem}
                onSelect={() => onSelectConversation(conversation as ConversationItem)}
                onAction={(action) => onConversationAction(conversation.id, action)}
                actions={conversationActions}
                registerRef={(el) => registerItem(conversation.id, el)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual conversation item with swipe actions
interface ConversationItemProps {
  conversation: ConversationItem;
  onSelect: () => void;
  onAction: (action: string) => void;
  actions: ConversationAction[];
  registerRef: (el: HTMLElement | null) => void;
}

function ConversationItem({ 
  conversation, 
  onSelect, 
  onAction, 
  actions,
  registerRef 
}: ConversationItemProps) {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [activeAction, setActiveAction] = useState<ConversationAction | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const gestures = useMobileTouchGestures({
    onTap: () => {
      if (swipeDistance === 0) {
        onSelect();
        nativeMobile.triggerHaptic();
      }
    },
    onSwipeReply: (direction, distance) => {
      if (direction === 'left') {
        const maxSwipe = 240; // 60px per action * 4 actions
        const constrainedDistance = Math.min(distance, maxSwipe);
        setSwipeDistance(constrainedDistance);
        
        // Determine active action based on swipe distance
        const actionIndex = Math.floor(constrainedDistance / 60);
        setActiveAction(actions[actionIndex] || null);
        
        // Haptic feedback when entering new action zone
        if (Math.floor(distance / 60) !== Math.floor((distance - 10) / 60)) {
          nativeMobile.triggerHaptic();
        }
      }
    },
    onSwipeComplete: (direction) => {
      if (direction === 'left' && activeAction) {
        onAction(activeAction.id);
        nativeMobile.triggerHaptic();
      }
      
      // Reset swipe state
      setSwipeDistance(0);
      setActiveAction(null);
    }
  });

  useEffect(() => {
    if (itemRef.current) {
      registerRef(itemRef.current);
    }
  }, [registerRef]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return 'now';
    if (hours < 24) return `${Math.floor(hours)}h`;
    if (hours < 48) return 'yesterday';
    return `${Math.floor(hours / 24)}d`;
  };

  const getMessageTypeIcon = () => {
    switch (conversation.lastMessageType) {
      case 'audio': return '🎤';
      case 'video': return '📹';
      case 'image': return '📷';
      default: return null;
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Swipe Action Background */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center"
        style={{ width: Math.min(swipeDistance, 240) }}
      >
        {actions.map((action, index) => {
          const actionWidth = 60;
          const actionStart = index * actionWidth;
          const actionEnd = (index + 1) * actionWidth;
          const isActive = swipeDistance > actionStart && swipeDistance <= actionEnd;
          
          return (
            <motion.div
              key={action.id}
              className={`
                w-15 h-full flex items-center justify-center text-white
                ${action.color}
                ${isActive ? 'opacity-100' : 'opacity-70'}
              `}
              initial={{ scale: 0.8 }}
              animate={{ 
                scale: isActive ? 1.1 : 0.8,
                width: isActive ? 80 : 60
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {action.icon}
            </motion.div>
          );
        })}
      </div>

      {/* Conversation Item */}
      <motion.div
        ref={itemRef}
        className={`
          bg-white/50 backdrop-blur-sm border-b border-white/20 
          ${conversation.unreadCount > 0 ? 'bg-blue-50/30' : ''}
          ${conversation.isPinned ? 'bg-yellow-50/20' : ''}
        `}
        style={{
          transform: `translateX(-${swipeDistance}px)`,
          transition: swipeDistance === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
        {...gestures.bindGestures}
      >
        <div className="p-4 flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
              {conversation.avatarUrl ? (
                <img 
                  src={conversation.avatarUrl} 
                  alt={conversation.otherPersonName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-medium text-lg">
                  {conversation.otherPersonName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            {/* Online status */}
            {conversation.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
            
            {/* Pinned indicator */}
            {conversation.isPinned && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-xs">📌</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className={`
                text-gray-800 truncate
                ${conversation.unreadCount > 0 ? 'font-semibold' : 'font-medium'}
              `}>
                {conversation.otherPersonName}
                {conversation.isMuted && (
                  <BellOff className="w-4 h-4 text-gray-400 ml-1 inline" />
                )}
              </h3>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-500">
                  {formatTime(conversation.lastMessageTime)}
                </span>
                
                {conversation.unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="min-w-[20px] h-5 bg-blue-500 rounded-full flex items-center justify-center px-1"
                  >
                    <span className="text-white text-xs font-medium">
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </span>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getMessageTypeIcon() && (
                <span className="text-sm">{getMessageTypeIcon()}</span>
              )}
              
              <p className={`
                text-sm text-gray-600 truncate flex-1
                ${conversation.unreadCount > 0 ? 'font-medium' : ''}
              `}>
                {conversation.isTyping ? (
                  <span className="text-blue-500 italic">typing...</span>
                ) : (
                  conversation.lastMessage
                )}
              </p>
            </div>
          </div>

          {/* More actions indicator */}
          <motion.div
            animate={{ x: swipeDistance > 0 ? -swipeDistance : 0 }}
            className="text-gray-400"
          >
            <MoreHorizontal className="w-5 h-5" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}