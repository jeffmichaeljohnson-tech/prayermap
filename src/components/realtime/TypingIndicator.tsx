import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Video, Edit3 } from 'lucide-react';
import { TypingActivity, typingIndicatorService } from '../../services/typingIndicatorService';
import type { TypingState } from '../../services/typingIndicatorService';

interface TypingIndicatorProps {
  conversationId: string;
  className?: string;
  showActivityIcons?: boolean;
  maxUsersShown?: number;
}

export function TypingIndicator({ 
  conversationId, 
  className = '',
  showActivityIcons = true,
  maxUsersShown = 3
}: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([]);

  useEffect(() => {
    const unsubscribe = typingIndicatorService.subscribeToTypingIndicators(
      conversationId,
      setTypingUsers
    );

    return unsubscribe;
  }, [conversationId]);

  if (typingUsers.length === 0) {
    return null;
  }

  const displayText = typingIndicatorService.getTypingIndicatorText(typingUsers);
  const displayUsers = typingUsers.slice(0, maxUsersShown);
  const hiddenCount = Math.max(0, typingUsers.length - maxUsersShown);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0, y: 10 }}
        animate={{ opacity: 1, height: 'auto', y: 0 }}
        exit={{ opacity: 0, height: 0, y: -10 }}
        transition={{ 
          duration: 0.3, 
          ease: [0.4, 0, 0.2, 1],
          height: { duration: 0.2 }
        }}
        className={`px-4 py-2 ${className}`}
      >
        <motion.div 
          className="glass-subtle rounded-xl p-3 border border-white/10 shadow-lg backdrop-blur-xl"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center space-x-3">
            {/* Activity indicators */}
            <div className="flex items-center space-x-2">
              {showActivityIcons && (
                <div className="flex space-x-1">
                  {displayUsers.map((user, index) => (
                    <ActivityIcon 
                      key={user.userId} 
                      activity={user.activity}
                      delay={index * 150}
                    />
                  ))}
                  {hiddenCount > 0 && (
                    <div className="text-xs text-primary/70 ml-1">
                      +{hiddenCount}
                    </div>
                  )}
                </div>
              )}
              
              {/* Default pulsing dots if no activity icons */}
              {!showActivityIcons && <TypingDots />}
            </div>

            {/* Typing text */}
            <motion.span 
              className="text-sm text-secondary font-inter"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {displayText}
            </motion.span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ActivityIcon({ activity, delay }: { activity: TypingActivity; delay: number }) {
  const getIcon = () => {
    switch (activity) {
      case TypingActivity.TYPING:
        return Edit3;
      case TypingActivity.RECORDING_AUDIO:
        return Mic;
      case TypingActivity.RECORDING_VIDEO:
        return Video;
      default:
        return Edit3;
    }
  };

  const getColor = () => {
    switch (activity) {
      case TypingActivity.TYPING:
        return 'text-blue-400';
      case TypingActivity.RECORDING_AUDIO:
        return 'text-purple-400';
      case TypingActivity.RECORDING_VIDEO:
        return 'text-pink-400';
      default:
        return 'text-blue-400';
    }
  };

  const Icon = getIcon();

  return (
    <motion.div
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{ 
        repeat: Infinity, 
        duration: 1.5,
        delay: delay / 1000,
        ease: "easeInOut"
      }}
      className={`w-4 h-4 ${getColor()}`}
    >
      <Icon className="w-full h-full" />
    </motion.div>
  );
}

function TypingDots() {
  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 1.4,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
          className="w-2 h-2 bg-primary rounded-full"
        />
      ))}
    </div>
  );
}

// Compact version for message bubbles
export function CompactTypingIndicator({ 
  conversationId,
  className = ''
}: Pick<TypingIndicatorProps, 'conversationId' | 'className'>) {
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([]);

  useEffect(() => {
    const unsubscribe = typingIndicatorService.subscribeToTypingIndicators(
      conversationId,
      setTypingUsers
    );

    return unsubscribe;
  }, [conversationId]);

  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`inline-flex items-center space-x-2 glass-subtle rounded-full px-3 py-1 ${className}`}
      >
        <TypingDots />
        <span className="text-xs text-secondary">
          {typingUsers.length === 1 ? 'typing' : `${typingUsers.length} typing`}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for component integration
export function useTypingIndicator(conversationId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([]);

  useEffect(() => {
    const unsubscribe = typingIndicatorService.subscribeToTypingIndicators(
      conversationId,
      setTypingUsers
    );

    return unsubscribe;
  }, [conversationId]);

  return {
    typingUsers,
    isAnyoneTyping: typingUsers.length > 0,
    displayText: typingIndicatorService.getTypingIndicatorText(typingUsers),
    startTyping: (userId: string, userName: string, activity?: TypingActivity) => 
      typingIndicatorService.startTyping(conversationId, userId, userName, activity),
    stopTyping: (userId: string) => 
      typingIndicatorService.stopTyping(conversationId, userId)
  };
}