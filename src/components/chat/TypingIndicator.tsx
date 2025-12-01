/**
 * Ethereal Typing Indicator Component
 * Agent 5 - Chat UI Designer
 * 
 * Beautiful typing indicator with PrayerMap's ethereal glass design
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Video } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TypingIndicator as TypingIndicatorType } from '../../types/chat';

interface TypingIndicatorProps {
  indicators: TypingIndicatorType[];
  maxVisible?: number;
}

export function TypingIndicator({ 
  indicators, 
  maxVisible = 3 
}: TypingIndicatorProps) {
  if (indicators.length === 0) return null;

  const visibleIndicators = indicators.slice(0, maxVisible);
  const remainingCount = Math.max(0, indicators.length - maxVisible);

  const getIndicatorText = () => {
    if (visibleIndicators.length === 1) {
      const indicator = visibleIndicators[0];
      switch (indicator.mode) {
        case 'audio':
          return `${indicator.userName} is recording audio...`;
        case 'video':
          return `${indicator.userName} is recording video...`;
        default:
          return `${indicator.userName} is typing...`;
      }
    } else if (visibleIndicators.length === 2) {
      const names = visibleIndicators.map(i => i.userName);
      return `${names.join(' and ')} are typing...`;
    } else {
      const firstName = visibleIndicators[0].userName;
      const count = visibleIndicators.length - 1 + remainingCount;
      return `${firstName} and ${count} others are typing...`;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'audio':
        return <Mic className="w-3 h-3 text-red-500" />;
      case 'video':
        return <Video className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const hasSpecialMode = visibleIndicators.some(i => i.mode !== 'text');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-start mb-2"
    >
      <div className="max-w-[85%] flex items-start gap-2">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue/20 to-primary-purple/20 flex items-center justify-center flex-shrink-0">
          <span className="font-cinzel text-xs font-medium text-gray-700">
            {visibleIndicators[0].userName.charAt(0)}
          </span>
        </div>

        {/* Indicator bubble */}
        <div className={cn(
          "px-4 py-3 rounded-2xl rounded-bl-md",
          "message-bubble--received",
          "flex items-center gap-2 min-w-[60px]"
        )}>
          <div className="flex items-center gap-2">
            {hasSpecialMode && getModeIcon(visibleIndicators[0].mode)}
            
            {visibleIndicators[0].mode === 'text' ? (
              <div className="flex space-x-1">
                <motion.div
                  className="w-2 h-2 bg-current rounded-full opacity-60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: 0
                  }}
                />
                <motion.div
                  className="w-2 h-2 bg-current rounded-full opacity-60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: 0.2
                  }}
                />
                <motion.div
                  className="w-2 h-2 bg-current rounded-full opacity-60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: 0.4
                  }}
                />
              </div>
            ) : (
              <motion.div
                className="flex items-center gap-1"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity
                }}
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                <span className="text-xs text-gray-600">
                  {visibleIndicators[0].mode === 'audio' ? 'Recording' : 'Recording video'}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      {/* Text description */}
      <div className="ml-2">
        <span className="text-xs text-gray-500 font-inter">
          {getIndicatorText()}
        </span>
      </div>
    </motion.div>
  );
}

export default TypingIndicator;