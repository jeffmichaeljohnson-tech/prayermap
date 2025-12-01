/**
 * Ethereal Glass Message Bubble Component
 * Agent 5 - Chat UI Designer
 * 
 * Beautiful message bubbles with PrayerMap's ethereal glass design system
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  MoreHorizontal, 
  Reply, 
  Copy, 
  Edit3, 
  Trash2,
  RefreshCw,
  Check,
  CheckCheck,
  Clock,
  Heart,
  ThumbsUp,
  Smile,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChatMessage, MessageBubbleProps, EmojiReaction } from '../../types/chat';

const QUICK_REACTIONS = ['❤️', '🙏', '🙌', '😊', '💪', '🔥', '✨', '🎉'];

export function EtherealMessageBubble({
  message,
  isOwn,
  isPrevious = false,
  isNext = false,
  showAvatar = true,
  showTimestamp = true,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onResend
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Handle audio/video playback
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    const media = audio || video;
    
    if (!media) return;

    const handleTimeUpdate = () => setCurrentTime(media.currentTime);
    const handleLoadedMetadata = () => setDuration(media.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('loadedmetadata', handleLoadedMetadata);
    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('ended', handleEnded);

    return () => {
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('loadedmetadata', handleLoadedMetadata);
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('ended', handleEnded);
    };
  }, [message.audioUrl, message.videoUrl]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    const video = videoRef.current;
    const media = audio || video;
    
    if (!media) return;
    
    if (isPlaying) {
      media.pause();
    } else {
      media.play().catch(console.error);
    }
  };

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const getBubbleStyles = () => {
    if (message.isPrayerMessage) {
      return 'message-bubble--prayer';
    }
    return isOwn ? 'message-bubble--sent' : 'message-bubble--received';
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;
    
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 opacity-50" />;
      case 'sent':
        return <Check className="w-3 h-3 opacity-50" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 opacity-50" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-400" />;
      case 'failed':
        return (
          <button 
            onClick={() => onResend?.(message.id)}
            className="text-red-500 hover:text-red-600"
            title="Tap to resend"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (message.contentType) {
      case 'text':
        return (
          <div className="font-inter text-sm leading-relaxed break-words">
            {message.content}
          </div>
        );

      case 'audio':
        if (!message.audioUrl) {
          return (
            <div className="flex items-center gap-2 text-sm opacity-70">
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
              Loading audio...
            </div>
          );
        }
        
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <audio ref={audioRef} src={message.audioUrl} preload="metadata" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={togglePlayback}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </motion.button>
            
            <div className="flex-1">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white/60 rounded-full"
                  style={{ 
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` 
                  }}
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` 
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs opacity-70 font-mono">
                  {formatDuration(isPlaying ? currentTime : duration)}
                </span>
                {message.duration && (
                  <span className="text-xs opacity-50">
                    {formatDuration(message.duration)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );

      case 'video':
        if (!message.videoUrl) {
          return (
            <div className="flex items-center gap-2 text-sm opacity-70">
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
              Loading video...
            </div>
          );
        }
        
        return (
          <div className="relative rounded-lg overflow-hidden max-w-xs bg-black/20">
            <video
              ref={videoRef}
              src={message.videoUrl}
              poster={message.imageUrl}
              controls
              preload="metadata"
              className="w-full h-auto"
              style={{ maxHeight: '300px' }}
            />
          </div>
        );

      case 'image':
        return (
          <div className="relative rounded-lg overflow-hidden max-w-xs">
            <img
              src={message.imageUrl}
              alt="Shared image"
              className="w-full h-auto"
              style={{ maxHeight: '300px' }}
              loading="lazy"
            />
          </div>
        );

      default:
        return (
          <div className="text-sm opacity-70 italic">
            Unsupported message type
          </div>
        );
    }
  };

  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) {
      return null;
    }

    const reactionCounts = Object.values(message.reactions).reduce((acc, emoji) => {
      acc[emoji] = (acc[emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex gap-1 mt-2"
      >
        {Object.entries(reactionCounts).map(([emoji, count]) => (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onReact?.(message.id, emoji)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
              "bg-white/30 hover:bg-white/40 transition-colors",
              "border border-white/20"
            )}
          >
            <span>{emoji}</span>
            {count > 1 && <span className="font-medium">{count}</span>}
          </motion.button>
        ))}
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex group relative",
        isOwn ? "justify-end" : "justify-start",
        "mb-1"
      )}
    >
      <div className={cn(
        "max-w-[85%] sm:max-w-[75%] flex",
        isOwn ? "flex-row-reverse" : "flex-row",
        "items-end gap-2"
      )}>
        {/* Avatar */}
        {!isOwn && showAvatar && !isPrevious && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue/20 to-primary-purple/20 flex items-center justify-center flex-shrink-0">
            {message.senderAvatar ? (
              <img 
                src={message.senderAvatar} 
                alt={message.senderName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="font-cinzel text-xs font-medium text-gray-700">
                {message.senderName.charAt(0)}
              </span>
            )}
          </div>
        )}
        {!isOwn && showAvatar && isPrevious && (
          <div className="w-8 h-8"></div> // Spacer for alignment
        )}

        {/* Message bubble */}
        <div className="relative flex flex-col">
          {/* Sender name for received messages */}
          {!isOwn && !isPrevious && (
            <span className="text-xs text-gray-500 font-medium mb-1 ml-3">
              {message.senderName}
            </span>
          )}

          <motion.div
            ref={bubbleRef}
            whileHover={{ scale: 1.01 }}
            className={cn(
              "relative px-4 py-3 shadow-lg",
              getBubbleStyles(),
              // Adjust border radius based on message position
              isPrevious && isNext && (isOwn ? "rounded-l-2xl rounded-r-md" : "rounded-r-2xl rounded-l-md"),
              isPrevious && !isNext && (isOwn ? "rounded-l-2xl rounded-br-2xl rounded-tr-md" : "rounded-r-2xl rounded-bl-2xl rounded-tl-md"),
              !isPrevious && isNext && (isOwn ? "rounded-tl-2xl rounded-bl-md rounded-r-2xl" : "rounded-tr-2xl rounded-br-md rounded-l-2xl"),
              !isPrevious && !isNext && "rounded-2xl"
            )}
            onHoverStart={() => setShowReactions(true)}
            onHoverEnd={() => setShowReactions(false)}
          >
            {renderContent()}

            {/* Message metadata */}
            <div className="flex items-center justify-between mt-2 gap-2">
              {showTimestamp && (
                <time className="text-xs opacity-70 font-inter">
                  {formatTime(message.timestamp)}
                  {message.metadata?.isEdited && (
                    <span className="ml-1 italic">(edited)</span>
                  )}
                </time>
              )}
              
              <div className="flex items-center gap-1">
                {getStatusIcon()}
              </div>
            </div>

            {renderReactions()}

            {/* Quick reaction panel */}
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "absolute z-10 glass-strong rounded-full p-1 flex gap-1",
                    isOwn ? "bottom-full right-0 mb-2" : "bottom-full left-0 mb-2"
                  )}
                >
                  {QUICK_REACTIONS.map(emoji => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => {
                        onReact?.(message.id, emoji);
                        setShowReactions(false);
                      }}
                      className="w-8 h-8 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center text-base"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setShowMenu(true)}
                    className="w-8 h-8 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Context menu */}
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className={cn(
                    "absolute z-20 glass-strong rounded-lg border border-white/30 py-1 min-w-[140px]",
                    isOwn ? "bottom-full right-0 mb-2" : "bottom-full left-0 mb-2"
                  )}
                  onMouseLeave={() => setShowMenu(false)}
                >
                  {onReply && (
                    <button
                      onClick={() => {
                        onReply(message);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/20 flex items-center gap-2"
                    >
                      <Reply className="w-4 h-4" />
                      Reply
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/20 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>

                  {isOwn && onEdit && message.contentType === 'text' && (
                    <button
                      onClick={() => {
                        onEdit(message.id, message.content);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/20 flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  )}

                  {isOwn && onDelete && (
                    <button
                      onClick={() => {
                        onDelete(message.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/20 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}