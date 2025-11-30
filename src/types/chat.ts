/**
 * Ethereal Glass Chat UI Type Definitions
 * Agent 5 - Chat UI Designer
 * 
 * Advanced type definitions for PrayerMap's chat system with ethereal glass design
 */

export interface ChatMessage {
  id: string;
  content: string;
  contentType: 'text' | 'audio' | 'video' | 'image';
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  
  // Media content
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  duration?: number; // For audio/video in seconds
  
  // Prayer-specific
  isPrayerMessage?: boolean;
  prayerType?: 'request' | 'response' | 'testimony';
  
  // Reactions
  reactions?: Record<string, string>; // userId -> emoji
  
  // Threading
  replyToId?: string;
  threadMessages?: ChatMessage[];
  
  // Metadata
  metadata?: {
    isEdited?: boolean;
    editedAt?: Date;
    isForwarded?: boolean;
    originalSenderId?: string;
  };
}

export interface Conversation {
  id: string;
  title?: string;
  type: 'direct' | 'group' | 'prayer_circle';
  participants: ConversationParticipant[];
  lastMessage?: ChatMessage;
  lastActivity: Date;
  unreadCount: number;
  
  // Prayer-specific
  originalPrayerId?: string;
  originalPrayer?: {
    title?: string;
    content: string;
    contentType: 'text' | 'audio' | 'video';
    userId: string;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
  };
  
  // Settings
  isMuted?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  
  // Prayer-specific
  isPraying?: boolean;
  prayerStreak?: number; // Days of consecutive prayer
  role?: 'member' | 'prayer_leader' | 'moderator';
  
  // Status
  status?: 'typing' | 'recording_audio' | 'recording_video' | 'idle';
  statusTimestamp?: Date;
}

export interface ChatInputState {
  mode: 'text' | 'audio' | 'video' | 'image';
  content: string;
  isRecording: boolean;
  recordingDuration: number;
  attachments: FileAttachment[];
  replyingTo?: ChatMessage;
  isTyping: boolean;
}

export interface FileAttachment {
  id: string;
  file: File;
  type: 'image' | 'audio' | 'video' | 'document';
  preview?: string; // Base64 or URL
  uploadProgress?: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
}

export interface EmojiReaction {
  emoji: string;
  users: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  timestamp: Date;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  timestamp: Date;
  mode: 'text' | 'audio' | 'video';
}

// Component Props Interfaces

export interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  unreadCount: number;
  lastMessage?: ChatMessage;
  onSelect: (conversation: Conversation) => void;
  onMute?: (conversationId: string) => void;
  onArchive?: (conversationId: string) => void;
  onDelete?: (conversationId: string) => void;
}

export interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  isPrevious?: boolean; // Same sender as previous message
  isNext?: boolean; // Same sender as next message
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onResend?: (messageId: string) => void;
}

export interface ChatInputProps {
  conversation: Conversation;
  onSendMessage: (content: string, type: 'text' | 'audio' | 'video' | 'image', attachment?: FileAttachment) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onRecordingStart: (mode: 'audio' | 'video') => void;
  onRecordingStop: () => void;
  placeholder?: string;
  disabled?: boolean;
  replyingTo?: ChatMessage;
  onCancelReply?: () => void;
  maxLength?: number;
}

export interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
  onCreateConversation?: () => void;
  loading?: boolean;
  error?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filters?: ConversationFilter[];
}

export interface ConversationFilter {
  key: string;
  label: string;
  active: boolean;
  count?: number;
}

export interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
  categories?: EmojiCategory[];
}

export interface EmojiCategory {
  id: string;
  name: string;
  emojis: string[];
  icon: string;
}

// Event Types
export type ChatEvent = 
  | { type: 'message_sent'; payload: ChatMessage }
  | { type: 'message_received'; payload: ChatMessage }
  | { type: 'message_read'; payload: { messageId: string; userId: string } }
  | { type: 'typing_start'; payload: TypingIndicator }
  | { type: 'typing_stop'; payload: { userId: string } }
  | { type: 'user_online'; payload: { userId: string } }
  | { type: 'user_offline'; payload: { userId: string } }
  | { type: 'reaction_added'; payload: { messageId: string; userId: string; emoji: string } }
  | { type: 'reaction_removed'; payload: { messageId: string; userId: string; emoji: string } };

// Utility Types
export type MessageStatus = ChatMessage['status'];
export type ConversationType = Conversation['type'];
export type ContentType = ChatMessage['contentType'];
export type InputMode = ChatInputState['mode'];

// Prayer-specific Types
export interface PrayerChatContext {
  originalPrayerId: string;
  prayerTitle?: string;
  prayerContent: string;
  prayerLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  requesterId: string;
  requesterName: string;
  createdAt: Date;
  isAnswered?: boolean;
  answeredAt?: Date;
  tags?: string[];
  urgency?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface PrayerResponse {
  id: string;
  prayerId: string;
  responderId: string;
  responderName: string;
  message: string;
  contentType: ContentType;
  contentUrl?: string;
  isAnonymous: boolean;
  createdAt: Date;
  reactions?: Record<string, string>;
}

// Animation and UI State
export interface AnimationState {
  isVisible: boolean;
  isAnimating: boolean;
  direction?: 'in' | 'out';
  duration?: number;
}

export interface TouchGestureState {
  isPressed: boolean;
  position: { x: number; y: number };
  startTime: number;
  gesture?: 'tap' | 'long_press' | 'swipe' | 'pinch';
}

// Accessibility
export interface AccessibilityLabels {
  sendMessage: string;
  recordAudio: string;
  recordVideo: string;
  selectEmoji: string;
  replyToMessage: string;
  reactToMessage: string;
  deleteMessage: string;
  editMessage: string;
  muteConversation: string;
  archiveConversation: string;
}