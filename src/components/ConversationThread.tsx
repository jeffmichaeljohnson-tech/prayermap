import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Mic, Video, StopCircle, Play, Pause } from 'lucide-react';

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
  conversationId: string;
  otherPersonName: string;
  originalPrayer: {
    title?: string;
    content: string;
    contentType: 'text' | 'audio' | 'video';
  };
  initialMessage?: string;
  onBack: () => void;
}

export function ConversationThread({
  otherPersonName,
  originalPrayer,
  initialMessage,
  onBack
}: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessage ? [{
      id: '1',
      content: initialMessage,
      contentType: 'text',
      sender: 'user',
      senderName: otherPersonName,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }] : []
  );
  const [inputMode, setInputMode] = useState<'text' | 'audio' | 'video'>('text');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  const handleSendText = () => {
    if (!textInput.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: textInput,
      contentType: 'text',
      sender: 'user',
      senderName: 'You',
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);
    setTextInput('');
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    // In a real app, start actual recording here
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    
    // Create mock audio/video message
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: inputMode === 'audio' ? 'Audio message' : 'Video message',
      contentType: inputMode,
      sender: 'user',
      senderName: 'You',
      timestamp: new Date(),
      audioUrl: inputMode === 'audio' ? 'mock-audio-url' : undefined,
      videoUrl: inputMode === 'video' ? 'mock-video-url' : undefined
    };

    setMessages([...messages, newMessage]);
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
              disabled={!textInput.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500/30 to-purple-500/30 hover:from-blue-500/40 hover:to-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
            >
              <Send className="w-5 h-5 text-gray-800" />
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
  const [isPlaying, setIsPlaying] = useState(false);
  const isUser = message.sender === 'user';

  const renderContent = () => {
    if (message.contentType === 'text') {
      return <p className="text-sm">{message.content}</p>;
    }

    if (message.contentType === 'audio') {
      return (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <div className="flex-1">
            <div className="h-8 flex items-center gap-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-white/40 rounded-full"
                  style={{ height: `${Math.random() * 100}%` }}
                />
              ))}
            </div>
          </div>
          <span className="text-xs opacity-70">0:42</span>
        </div>
      );
    }

    if (message.contentType === 'video') {
      return (
        <div className="relative">
          <div className="w-full h-40 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-4 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white" />
              )}
            </button>
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
            1:23
          </div>
        </div>
      );
    }
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