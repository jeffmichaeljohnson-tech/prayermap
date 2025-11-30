/**
 * Enhanced Media Message Component with Ethereal Glass Styling
 * Supports images, videos, audio, and voice messages with spiritual context
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Download, 
  Heart, 
  MessageCircle, 
  Share, 
  Volume2,
  VolumeX,
  Expand,
  FileText,
  MapPin,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { WaveformVisualization } from './WaveformVisualization';
import type { MediaMessage as MediaMessageType, MediaUpload } from '../../types/media';

interface MediaMessageProps {
  message: MediaMessageType;
  isOwn: boolean;
  onMediaClick?: (mediaUrl: string, type: MediaUpload['type']) => void;
  onReply?: (messageId: string) => void;
  onReact?: (messageId: string, reaction: string) => void;
  onShare?: (messageId: string) => void;
  showMetadata?: boolean;
  className?: string;
}

export function MediaMessage({ 
  message, 
  isOwn, 
  onMediaClick,
  onReply,
  onReact,
  onShare,
  showMetadata = true,
  className 
}: MediaMessageProps) {
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const renderMediaContent = () => {
    const { mediaUpload } = message;

    switch (mediaUpload.type) {
      case 'image':
        return (
          <ImageContent 
            upload={mediaUpload}
            isOwn={isOwn}
            onLoad={() => setIsMediaLoading(false)}
            onClick={() => onMediaClick?.(mediaUpload.url!, 'image')}
          />
        );
      case 'video':
        return (
          <VideoContent 
            upload={mediaUpload}
            isOwn={isOwn}
            onLoad={() => setIsMediaLoading(false)}
            onClick={() => onMediaClick?.(mediaUpload.url!, 'video')}
          />
        );
      case 'voice_message':
        return (
          <VoiceMessageContent 
            upload={mediaUpload}
            isOwn={isOwn}
            onLoad={() => setIsMediaLoading(false)}
          />
        );
      case 'audio':
        return (
          <AudioContent 
            upload={mediaUpload}
            isOwn={isOwn}
            onLoad={() => setIsMediaLoading(false)}
          />
        );
      default:
        return (
          <FileContent 
            upload={mediaUpload}
            isOwn={isOwn}
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'group relative max-w-[80%]',
        isOwn ? 'ml-auto' : 'mr-auto',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Media Container */}
      <div 
        className={cn(
          'relative overflow-hidden rounded-2xl shadow-lg backdrop-blur-md border border-white/20',
          isOwn 
            ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' 
            : 'bg-white/10 glass-effect'
        )}
      >
        {/* Loading Overlay */}
        <AnimatePresence>
          {isMediaLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm z-10"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media Content */}
        {renderMediaContent()}

        {/* Spiritual Context Indicators */}
        {message.mediaUpload.spiritualContext && (
          <SpiritualContextOverlay 
            context={message.mediaUpload.spiritualContext}
            isOwn={isOwn}
          />
        )}

        {/* Hover Actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-2 right-2 flex gap-1"
            >
              <MediaActionButton 
                icon={Expand}
                onClick={() => onMediaClick?.(message.mediaUpload.url!, message.mediaUpload.type)}
                tooltip="View full size"
              />
              {onShare && (
                <MediaActionButton 
                  icon={Share}
                  onClick={() => onShare(message.id)}
                  tooltip="Share"
                />
              )}
              <MediaActionButton 
                icon={Download}
                onClick={() => downloadMedia(message.mediaUpload)}
                tooltip="Download"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Caption */}
      {message.content && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'mt-2 px-3 py-2 rounded-xl text-sm',
            isOwn 
              ? 'bg-purple-500/10 text-purple-900' 
              : 'bg-white/10 text-gray-700'
          )}
        >
          {message.content}
        </motion.div>
      )}

      {/* Message Metadata */}
      {showMetadata && (
        <MessageMetadata 
          message={message}
          isOwn={isOwn}
        />
      )}

      {/* Quick Actions */}
      <MessageActions 
        message={message}
        isOwn={isOwn}
        isVisible={isHovered}
        onReply={onReply}
        onReact={onReact}
      />
    </motion.div>
  );
}

// Individual media content components
function ImageContent({ 
  upload, 
  isOwn, 
  onLoad, 
  onClick 
}: {
  upload: MediaUpload;
  isOwn: boolean;
  onLoad: () => void;
  onClick: () => void;
}) {
  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <img
        src={upload.url}
        alt="Shared image"
        className="max-w-[300px] max-h-[400px] object-cover rounded-xl transition-transform group-hover:scale-105"
        onLoad={onLoad}
      />
      
      {/* Overlay gradient for better text visibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
      
      {/* Image info overlay */}
      {upload.metadata.dimensions && (
        <div className="absolute bottom-2 left-2 text-xs text-white/90 bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {upload.metadata.dimensions.width} × {upload.metadata.dimensions.height}
        </div>
      )}
    </div>
  );
}

function VideoContent({ 
  upload, 
  isOwn, 
  onLoad, 
  onClick 
}: {
  upload: MediaUpload;
  isOwn: boolean;
  onLoad: () => void;
  onClick: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative max-w-[300px] max-h-[400px] rounded-xl overflow-hidden group">
      <video
        ref={videoRef}
        src={upload.url}
        poster={upload.thumbnailUrl}
        className="w-full h-full object-cover cursor-pointer"
        onLoadedData={onLoad}
        onClick={onClick}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        muted
        loop
      />
      
      {/* Play/Pause Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={togglePlay}
          className="bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </motion.button>
      </div>

      {/* Duration Badge */}
      {upload.metadata.duration && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(upload.metadata.duration)}
        </div>
      )}
    </div>
  );
}

function VoiceMessageContent({ 
  upload, 
  isOwn, 
  onLoad 
}: {
  upload: MediaUpload;
  isOwn: boolean;
  onLoad: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      onLoad();
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onLoad]);

  return (
    <div className={cn(
      'flex items-center gap-3 p-4 min-w-[250px] max-w-[350px]',
      isOwn ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10' : 'bg-white/5'
    )}>
      <audio ref={audioRef} src={upload.url} preload="metadata" />
      
      {/* Play Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={togglePlay}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors',
          isOwn ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'
        )}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </motion.button>
      
      {/* Waveform */}
      <div className="flex-1">
        <WaveformVisualization 
          audioData={[]} // Would be populated with actual waveform data
          isActive={isPlaying}
          width={180}
          height={32}
          variant="voice"
          progress={duration > 0 ? currentTime / duration : 0}
        />
      </div>
      
      {/* Duration */}
      <span className="text-xs text-gray-600 tabular-nums min-w-[40px]">
        {formatDuration(isPlaying ? currentTime : duration)}
      </span>
    </div>
  );
}

function AudioContent({ 
  upload, 
  isOwn, 
  onLoad 
}: {
  upload: MediaUpload;
  isOwn: boolean;
  onLoad: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      onLoad();
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onLoad]);

  return (
    <div className="p-4 max-w-[350px]">
      <audio ref={audioRef} src={upload.url} preload="metadata" />
      
      {/* File Info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-lg flex items-center justify-center text-white">
          <Volume2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 truncate">{upload.metadata.fileName}</p>
          <p className="text-xs text-gray-500">
            {formatFileSize(upload.metadata.size)} • {formatDuration(duration)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={togglePlay}
          className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </motion.button>
        
        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        
        <button onClick={toggleMute} className="text-gray-500 hover:text-gray-700">
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function FileContent({ 
  upload, 
  isOwn 
}: {
  upload: MediaUpload;
  isOwn: boolean;
}) {
  return (
    <div className="p-4 flex items-center gap-3 max-w-[300px]">
      <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center text-white">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{upload.metadata.fileName}</p>
        <p className="text-xs text-gray-500">{formatFileSize(upload.metadata.size)}</p>
      </div>
    </div>
  );
}

function SpiritualContextOverlay({ 
  context, 
  isOwn 
}: {
  context: NonNullable<MediaUpload['spiritualContext']>;
  isOwn: boolean;
}) {
  return (
    <div className="absolute top-2 left-2 flex gap-1">
      {context.containsScripture && (
        <div className="bg-blue-500/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          📖 <span>Scripture</span>
        </div>
      )}
      {context.prayerLocation && (
        <div className="bg-green-500/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <MapPin className="w-3 h-3" /> <span>Location</span>
        </div>
      )}
      {context.isPrayerImage && (
        <div className="bg-purple-500/80 text-white text-xs px-2 py-1 rounded-full">
          🙏 Prayer
        </div>
      )}
    </div>
  );
}

function MediaActionButton({ 
  icon: Icon, 
  onClick, 
  tooltip 
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
      title={tooltip}
    >
      <Icon className="w-4 h-4" />
    </motion.button>
  );
}

function MessageMetadata({ 
  message, 
  isOwn 
}: {
  message: MediaMessageType;
  isOwn: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between mt-2 px-2 text-xs text-gray-500',
      isOwn ? 'flex-row-reverse' : ''
    )}>
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3" />
        <span>{formatMessageTime(message.timestamp)}</span>
      </div>
      
      {isOwn && (
        <div className="flex items-center gap-1">
          <span className="capitalize">{message.deliveryStatus}</span>
          {message.deliveryStatus === 'read' && (
            <CheckCircle2 className="w-3 h-3 text-blue-500" />
          )}
        </div>
      )}
    </div>
  );
}

function MessageActions({ 
  message, 
  isOwn, 
  isVisible,
  onReply,
  onReact 
}: {
  message: MediaMessageType;
  isOwn: boolean;
  isVisible: boolean;
  onReply?: (messageId: string) => void;
  onReact?: (messageId: string, reaction: string) => void;
}) {
  if (!isVisible || isOwn) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex gap-2 mt-2"
    >
      {onReply && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onReply(message.id)}
          className="text-gray-500 hover:text-blue-500 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
        </motion.button>
      )}
      {onReact && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onReact(message.id, '❤️')}
          className="text-gray-500 hover:text-red-500 transition-colors"
        >
          <Heart className="w-4 h-4" />
        </motion.button>
      )}
    </motion.div>
  );
}

// Utility functions
function formatDuration(seconds: number): string {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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

function downloadMedia(upload: MediaUpload): void {
  if (!upload.url) return;
  
  const link = document.createElement('a');
  link.href = upload.url;
  link.download = upload.metadata.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}