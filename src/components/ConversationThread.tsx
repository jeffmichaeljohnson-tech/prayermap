import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Mic, Video, StopCircle, Play, Pause, Loader2 } from 'lucide-react';
import { respondToPrayer } from '../services/prayerService';
import { uploadAudio } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { TypingIndicator, useTypingIndicator } from './realtime/TypingIndicator';
import { ReadReceiptStatus } from './realtime/ReadReceiptStatus';
import { PresenceIndicator, ConversationPresence } from './realtime/PresenceIndicator';
import { TypingActivity } from '../services/typingIndicatorService';
import { readReceiptService } from '../services/readReceiptService';
import { presenceService, PresenceStatus } from '../services/presenceService';
import type { PrayerResponse } from '../types/prayer';

interface Message {
  id: string;
  content: string;
  contentType: 'text' | 'audio' | 'video';
  sender: 'user' | 'other';
  senderName: string;
  timestamp: Date;
  audioUrl?: string;
  videoUrl?: string;
}

interface ConversationThreadProps {
  conversationId: string; // This is the prayer_id
  otherPersonName: string;
  originalPrayer: {
    title?: string;
    content: string;
    contentType: 'text' | 'audio' | 'video';
    userId?: string; // The prayer creator's ID
  };
  initialMessage?: string;
  initialResponses?: PrayerResponse[];
  onBack: () => void;
}

export function ConversationThread({
  conversationId,
  otherPersonName,
  originalPrayer,
  initialMessage,
  initialResponses,
  onBack
}: ConversationThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMode, setInputMode] = useState<'text' | 'audio' | 'video'>('text');
  const [textInput, setTextInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [participants, setParticipants] = useState<string[]>([]);

  // Real-time hooks
  const {
    typingUsers,
    startTyping,
    stopTyping
  } = useTypingIndicator(conversationId);

  // Audio recorder hook
  const {
    isRecording,
    duration: recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  // Convert PrayerResponse to Message format
  const responseToMessage = useCallback((response: PrayerResponse): Message => {
    const isCurrentUser = response.responder_id === user?.id;
    return {
      id: response.id,
      content: response.message,
      contentType: response.content_type,
      sender: isCurrentUser ? 'user' : 'other',
      senderName: isCurrentUser ? 'You' : (response.responder_name || 'Anonymous'),
      timestamp: new Date(response.created_at),
      audioUrl: response.content_type === 'audio' ? response.content_url : undefined,
      videoUrl: response.content_type === 'video' ? response.content_url : undefined,
    };
  }, [user?.id]);

  // Initialize messages from initial responses or initial message
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
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }]);
      
      // Set initial participants
      const participantIds = [originalPrayer.userId, user?.id].filter(Boolean) as string[];
      setParticipants(participantIds);
    }
  }, [initialResponses, initialMessage, otherPersonName, responseToMessage, originalPrayer.userId, user?.id]);

  // Start presence tracking when component mounts
  useEffect(() => {
    if (user?.id) {
      presenceService.startPresenceTracking(user.id, PresenceStatus.ONLINE);
      
      return () => {
        presenceService.stopPresenceTracking();
      };
    }
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send a text message
  const handleSendText = async () => {
    if (!textInput.trim() || !user || isSending) return;

    setIsSending(true);
    const messageContent = textInput.trim();
    setTextInput(''); // Clear input immediately for better UX

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      contentType: 'text',
      sender: 'user',
      senderName: 'You',
      timestamp: new Date()
    };

    // Add optimistic message to UI
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous';
      const result = await respondToPrayer(
        conversationId,
        user.id,
        userName,
        messageContent,
        'text',
        undefined,
        false
      );

      if (result) {
        // Replace optimistic message with real one
        setMessages(prev => prev.map(msg =>
          msg.id === optimisticMessage.id
            ? { ...msg, id: result.response.id }
            : msg
        ));
        console.log('Message sent successfully');
      } else {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  // Handle audio recording start
  const handleStartRecording = () => {
    startRecording();
  };

  // Handle audio recording stop and send
  const handleStopRecording = async () => {
    stopRecording();

    // Wait for the audioBlob to be set by the hook
    setTimeout(async () => {
      if (!user) return;

      setIsSending(true);

      try {
        const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous';

        // Upload audio first
        let contentUrl: string | undefined;
        if (audioBlob) {
          console.log('Uploading audio message...');
          const uploadedUrl = await uploadAudio(audioBlob, user.id);
          if (uploadedUrl) {
            contentUrl = uploadedUrl;
            console.log('Audio uploaded:', uploadedUrl);
          }
        }

        // Create optimistic message
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          content: 'Audio message',
          contentType: 'audio',
          sender: 'user',
          senderName: 'You',
          timestamp: new Date(),
          audioUrl: contentUrl
        };

        setMessages(prev => [...prev, optimisticMessage]);

        // Send to backend
        const result = await respondToPrayer(
          conversationId,
          user.id,
          userName,
          'Audio message',
          'audio',
          contentUrl,
          false
        );

        if (result) {
          setMessages(prev => prev.map(msg =>
            msg.id === optimisticMessage.id
              ? { ...msg, id: result.response.id }
              : msg
          ));
        } else {
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }

        resetRecording();
      } catch (error) {
        console.error('Error sending audio message:', error);
      } finally {
        setIsSending(false);
      }
    }, 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      key="conversation-thread"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex flex-col overflow-hidden -m-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-white/20">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <h3 className="text-gray-800">{otherPersonName}</h3>
          <p className="text-xs text-gray-500">Prayer conversation</p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Original Prayer Request */}
        <div className="glass rounded-2xl p-4 border-l-4 border-blue-400">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-500">Original Prayer Request</span>
          </div>
          {originalPrayer.title && (
            <h4 className="text-gray-800 mb-2">{originalPrayer.title}</h4>
          )}
          <p className="text-sm text-gray-700">{originalPrayer.content}</p>
        </div>

        {/* Messages */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/20">
        {/* Mode Selector */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 py-2 px-4 rounded-xl transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
              inputMode === 'text'
                ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-gray-800'
                : 'glass text-gray-600 hover:glass-strong'
            }`}
          >
            Text
          </button>
          <button
            onClick={() => setInputMode('audio')}
            className={`flex-1 py-2 px-4 rounded-xl transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
              inputMode === 'audio'
                ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-gray-800'
                : 'glass text-gray-600 hover:glass-strong'
            }`}
          >
            <Mic className="w-4 h-4 inline mr-1" />
            Audio
          </button>
          <button
            onClick={() => setInputMode('video')}
            className={`flex-1 py-2 px-4 rounded-xl transition-all ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20 ${
              inputMode === 'video'
                ? 'bg-gradient-to-r from-yellow-300 to-purple-300 text-gray-800'
                : 'glass text-gray-600 hover:glass-strong'
            }`}
          >
            <Video className="w-4 h-4 inline mr-1" />
            Video
          </button>
        </div>

        {/* Input Controls */}
        {inputMode === 'text' ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="Type your prayer response..."
              className="flex-1 px-4 py-3 glass-strong rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            />
            <button
              onClick={handleSendText}
              disabled={!textInput.trim() || isSending}
              className="px-6 py-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 hover:from-blue-500/40 hover:to-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 text-gray-800 animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-gray-800" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {isRecording ? (
              <div className="glass-strong rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-3 h-3 bg-red-500 rounded-full"
                    />
                    <span className="text-gray-800">Recording {inputMode}...</span>
                  </div>
                  <span className="text-gray-600 tabular-nums">{formatTime(recordingTime)}</span>
                </div>
                <button
                  onClick={handleStopRecording}
                  className="w-full py-3 bg-gradient-to-r from-red-500/30 to-pink-500/30 hover:from-red-500/40 hover:to-pink-500/40 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <StopCircle className="w-5 h-5" />
                  <span>Stop & Send</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartRecording}
                className="w-full py-4 bg-gradient-to-r from-blue-500/30 to-purple-500/30 hover:from-blue-500/40 hover:to-purple-500/40 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {inputMode === 'audio' ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <Video className="w-5 h-5" />
                )}
                <span>Start Recording {inputMode === 'audio' ? 'Audio' : 'Video'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: Message }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isUser = message.sender === 'user';

  // Handle audio playback events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [message.audioUrl]);

  const toggleAudioPlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  };

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    if (message.contentType === 'text') {
      return <p className="text-sm">{message.content}</p>;
    }

    if (message.contentType === 'audio' && message.audioUrl) {
      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          <audio ref={audioRef} src={message.audioUrl} preload="metadata" />
          <button
            onClick={toggleAudioPlay}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors flex-shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          <div className="flex-1">
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-xs opacity-70 tabular-nums flex-shrink-0">
            {formatDuration(isPlaying ? currentTime : duration)}
          </span>
        </div>
      );
    }

    if (message.contentType === 'video' && message.videoUrl) {
      return (
        <div className="rounded-lg overflow-hidden max-w-xs">
          <video
            src={message.videoUrl}
            controls
            preload="metadata"
            className="w-full"
          />
        </div>
      );
    }

    // Fallback for audio/video without URLs
    if (message.contentType === 'audio') {
      return <p className="text-sm italic opacity-70">Audio message (loading...)</p>;
    }
    if (message.contentType === 'video') {
      return <p className="text-sm italic opacity-70">Video message (loading...)</p>;
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-br-md'
              : 'glass-strong rounded-bl-md'
          }`}
          style={{
            color: isUser ? 'hsl(280, 40%, 30%)' : 'hsl(220, 20%, 30%)'
          }}
        >
          {renderContent()}
        </div>
        <span className="text-xs text-gray-500 px-2">
          {message.timestamp && getTimeDisplay(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

function getTimeDisplay(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}