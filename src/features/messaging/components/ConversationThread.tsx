import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Mic, Video, Loader2 } from 'lucide-react';
import { AudioRecorder } from '../../media/components/AudioRecorder';
import { VideoRecorder } from '../../media/components/VideoRecorder';
import { AudioMessagePlayer } from '../../media/components/AudioMessagePlayer';
import { VideoMessagePlayer } from '../../media/components/VideoMessagePlayer';
import { uploadMessageMedia, uploadThumbnail } from '../../media/services/storageService';
import { useConversation } from '../hooks/useConversation';
import { useAuth } from '../../authentication/hooks/useAuth';
import type { Message as DBMessage } from '../types/messaging';

// Display message interface (transformed from DB message)
interface DisplayMessage {
  id: string;
  content: string;
  contentType: 'text' | 'audio' | 'video';
  sender: 'user' | 'other';
  senderName: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaDurationSeconds?: number;
  thumbnailUrl?: string;
}

interface ConversationThreadProps {
  /** The prayer_response ID - used to get or create conversation */
  prayerResponseId: string;
  /** Name of the other person in the conversation */
  otherPersonName: string;
  /** The original prayer this conversation is about */
  originalPrayer: {
    title?: string;
    content: string;
    contentType: 'text' | 'audio' | 'video';
  };
  /** Callback when user wants to go back */
  onBack: () => void;
}

// Transform DB message to display format
function toDisplayMessage(msg: DBMessage, currentUserId: string, otherPersonName: string): DisplayMessage {
  const isUser = msg.sender_id === currentUserId;
  return {
    id: msg.id,
    content: msg.content,
    contentType: msg.content_type,
    sender: isUser ? 'user' : 'other',
    senderName: isUser ? 'You' : otherPersonName,
    timestamp: new Date(msg.created_at),
    mediaUrl: msg.media_url || undefined,
    mediaDurationSeconds: msg.media_duration_seconds || undefined,
  };
}

export function ConversationThread({
  prayerResponseId,
  otherPersonName,
  originalPrayer,
  onBack,
}: ConversationThreadProps) {
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // Use the conversation hook for backend integration
  const {
    conversation,
    messages: dbMessages,
    loading,
    sending,
    error: conversationError,
    sendMessage: sendToBackend,
  } = useConversation({
    prayerResponseId,
    autoFetch: !!currentUserId,
    enableRealtime: true,
  });

  // Transform DB messages to display format
  const messages: DisplayMessage[] = dbMessages.map(msg =>
    toDisplayMessage(msg, currentUserId, otherPersonName)
  );

  const [inputMode, setInputMode] = useState<'text' | 'audio' | 'video'>('text');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (uploadError) {
      const timer = setTimeout(() => setUploadError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadError]);

  const handleSendText = async () => {
    if (!textInput.trim() || !conversation?.id) return;

    const messageContent = textInput;
    setTextInput('');

    try {
      await sendToBackend(messageContent, 'text');
    } catch (error) {
      console.error('Failed to send message:', error);
      setUploadError('Failed to send message. Please try again.');
      // Restore input on failure
      setTextInput(messageContent);
    }
  };

  const handleAudioComplete = async (audioBlob: Blob, duration: number) => {
    if (!conversation?.id) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await uploadMessageMedia(
        audioBlob,
        'audio',
        conversation.id,
        currentUserId
      );

      if (result) {
        // Send to backend with audio placeholder content
        await sendToBackend('[Audio message]', 'audio', result.url, duration);
      } else {
        setUploadError('Failed to upload audio. Please try again.');
      }
    } catch (error) {
      console.error('Failed to send audio message:', error);
      setUploadError('Failed to send audio message. Please try again.');
    } finally {
      setIsUploading(false);
      setIsRecording(false);
    }
  };

  const handleVideoComplete = async (
    videoBlob: Blob,
    duration: number,
    thumbnailDataUrl: string | null
  ) => {
    if (!conversation?.id) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await uploadMessageMedia(
        videoBlob,
        'video',
        conversation.id,
        currentUserId
      );

      if (result) {
        // Upload thumbnail separately if we have one
        let finalThumbnailUrl = thumbnailDataUrl;
        if (thumbnailDataUrl && thumbnailDataUrl.startsWith('data:')) {
          const uploadedThumbnail = await uploadThumbnail(
            thumbnailDataUrl,
            conversation.id,
            `temp-${Date.now()}`
          );
          if (uploadedThumbnail) {
            finalThumbnailUrl = uploadedThumbnail;
          }
        }

        // Send to backend with video placeholder content
        await sendToBackend('[Video message]', 'video', result.url, duration);
      } else {
        setUploadError('Failed to upload video. Please try again.');
      }
    } catch (error) {
      console.error('Failed to send video message:', error);
      setUploadError('Failed to send video message. Please try again.');
    } finally {
      setIsUploading(false);
      setIsRecording(false);
    }
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  // Show loading state while initializing conversation
  if (loading) {
    return (
      <motion.div
        key="conversation-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center"
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-3" />
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </motion.div>
    );
  }

  // Show error state
  if (conversationError) {
    return (
      <motion.div
        key="conversation-error"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center p-6"
      >
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="text-gray-600 mb-2">Something went wrong</p>
          <p className="text-sm text-gray-500">{conversationError}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 px-4 py-2 glass rounded-xl text-gray-700 hover:glass-strong"
          >
            Go Back
          </button>
        </div>
      </motion.div>
    );
  }

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
          type="button"
          onClick={onBack}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Go back"
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

      {/* Upload Error */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
          >
            {uploadError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploading Indicator */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mx-4 mb-2 p-3 glass-strong rounded-xl flex items-center gap-3"
          >
            <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            <span className="text-sm text-gray-700">Uploading {inputMode}...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 border-t border-white/20">
        {/* Mode Selector (only show when not recording) */}
        {!isRecording && (
          <div className="flex gap-2 mb-3">
            <button
              type="button"
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
              type="button"
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
              type="button"
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
        )}

        {/* Input Controls */}
        {inputMode === 'text' ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendText()}
              placeholder="Type your prayer response..."
              className="flex-1 px-4 py-3 glass-strong rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            />
            <button
              type="button"
              onClick={handleSendText}
              disabled={!textInput.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 hover:from-blue-500/40 hover:to-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
              aria-label="Send message"
            >
              <Send className="w-5 h-5 text-gray-800" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {isRecording ? (
              // Show the appropriate recorder component
              inputMode === 'audio' ? (
                <AudioRecorder
                  onRecordingComplete={handleAudioComplete}
                  onCancel={handleCancelRecording}
                  maxDuration={120} // 2 minutes for audio
                />
              ) : (
                <VideoRecorder
                  onRecordingComplete={handleVideoComplete}
                  onCancel={handleCancelRecording}
                  maxDuration={90} // 90 seconds for video
                />
              )
            ) : (
              // Show "Start Recording" button
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={isUploading}
                className="w-full py-4 bg-gradient-to-r from-blue-500/30 to-purple-500/30 hover:from-blue-500/40 hover:to-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-2"
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
function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.sender === 'user';

  const renderContent = () => {
    if (message.contentType === 'text') {
      return <p className="text-sm">{message.content}</p>;
    }

    if (message.contentType === 'audio' && message.mediaUrl) {
      return (
        <AudioMessagePlayer
          src={message.mediaUrl}
          duration={message.mediaDurationSeconds}
        />
      );
    }

    if (message.contentType === 'video' && message.mediaUrl) {
      return (
        <VideoMessagePlayer
          src={message.mediaUrl}
          thumbnailUrl={message.thumbnailUrl}
          duration={message.mediaDurationSeconds}
        />
      );
    }

    // Fallback for messages without media URL
    return <p className="text-sm text-gray-500 italic">Media unavailable</p>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl overflow-hidden ${
            isUser
              ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-br-md'
              : 'glass-strong rounded-bl-md'
          } ${message.contentType === 'text' ? 'px-4 py-3' : 'p-2'}`}
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
