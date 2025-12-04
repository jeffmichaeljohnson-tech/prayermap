/**
 * Type definitions for the PrayerMap messaging system.
 * These types support threaded conversations between prayer requesters and responders.
 */

// ============================================
// DATABASE ROW TYPES
// These match the database schema exactly
// ============================================

/**
 * Conversation row as stored in the database.
 * A conversation is a 1:1 thread between a prayer requester and someone who responded.
 */
export interface ConversationRow {
  id: string;
  prayer_id: string;
  prayer_response_id: string;
  participant_1_id: string;  // Prayer requester
  participant_2_id: string;  // Responder
  participant_2_anonymous: boolean;
  last_message_at: string;
  created_at: string;
}

/**
 * Message row as stored in the database.
 */
export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  media_url: string | null;
  media_duration_seconds: number | null;
  read_at: string | null;
  created_at: string;
}

// ============================================
// ENRICHED APPLICATION TYPES
// These include joined data for frontend use
// ============================================

/**
 * Participant information, handling anonymous users.
 */
export interface Participant {
  id: string;
  name: string;
  isAnonymous: boolean;
}

/**
 * Message with sender information.
 */
export interface Message extends MessageRow {
  sender: Participant;
}

/**
 * Prayer context for a conversation.
 */
export interface ConversationPrayerContext {
  id: string;
  title: string | null;
  content: string;
  contentType: 'text' | 'audio' | 'video';
}

/**
 * Conversation with full details for display.
 */
export interface ConversationWithDetails extends ConversationRow {
  prayer: ConversationPrayerContext;
  otherParticipant: Participant;
}

/**
 * Conversation with preview for inbox/list view.
 */
export interface ConversationWithPreview extends ConversationWithDetails {
  lastMessage: Message | null;
  unreadCount: number;
}

// ============================================
// INPUT TYPES
// These are used for creating/updating data
// ============================================

/**
 * Input for sending a message.
 */
export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'audio' | 'video';
  mediaUrl?: string;
  mediaDurationSeconds?: number;
}

/**
 * Options for paginated message fetching.
 */
export interface GetMessagesOptions {
  /** Maximum number of messages to return (default: 50) */
  limit?: number;
  /** Cursor: get messages before this ID (for loading older) */
  before?: string;
  /** Cursor: get messages after this ID (for loading newer) */
  after?: string;
}

// ============================================
// CALLBACK TYPES
// These are used for real-time subscriptions
// ============================================

/**
 * Callback when a new message arrives in a conversation.
 */
export type OnNewMessageCallback = (message: Message) => void;

/**
 * Callback when a message is marked as read.
 */
export type OnMessageReadCallback = (messageId: string, readAt: string) => void;

/**
 * Callback when any of the user's conversations updates.
 */
export type OnConversationUpdateCallback = (
  conversationId: string,
  latestMessage: Message
) => void;
