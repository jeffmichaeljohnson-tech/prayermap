/**
 * PrayerMap Conversation Threading & Message Management Types
 * 
 * Sophisticated TypeScript interfaces for prayer-centric conversation
 * threading with Living Map integration and spiritual context.
 */

import type { Prayer, PrayerConnection } from './prayer';

// ============================================================================
// CORE ENUMS
// ============================================================================

export type ConversationType = 
  | 'prayer_response'     // Direct response to prayer request
  | 'direct_message'      // Private conversation between users
  | 'group_prayer'        // Group prayer discussion
  | 'prayer_circle'       // Ongoing prayer circle conversation
  | 'scripture_sharing'   // Scripture and testimony sharing
  | 'prayer_update';      // Updates on prayer requests/answers

export type MessageType = 
  | 'prayer_request'      // New prayer request in conversation
  | 'prayer_response'     // Response to prayer request
  | 'scripture_share'     // Bible verse or devotional
  | 'testimony'          // Answered prayer or testimony
  | 'prayer_update'      // Update on existing prayer
  | 'encouragement'      // General encouragement
  | 'general_message'    // Regular conversation
  | 'system_message';    // System notifications

export type PrayerCategory = 
  | 'healing'
  | 'family'
  | 'financial'
  | 'guidance'
  | 'relationship'
  | 'work_career'
  | 'spiritual_growth'
  | 'travel_safety'
  | 'grief_loss'
  | 'thanksgiving'
  | 'world_events'
  | 'ministry'
  | 'other';

export type MessageUrgency = 'low' | 'medium' | 'high' | 'emergency';

export type ParticipantRole = 'creator' | 'moderator' | 'member';

// ============================================================================
// SPIRITUAL CONTEXT INTERFACES
// ============================================================================

export interface SpiritualContext {
  prayerCategory?: PrayerCategory;
  prayerTags?: string[];
  urgency?: MessageUrgency;
  isTestimony?: boolean;
  isAnsweredPrayer?: boolean;
  relatedPrayerIds?: string[];
  
  // Scripture sharing
  scriptureReference?: string;  // e.g., "John 3:16"
  scriptureText?: string;       // Full verse text
  
  // Prayer request specifics
  prayerNeed?: string;
  followUpRequested?: boolean;
  
  // Testimony specifics
  testimonyCategory?: string;
  miracleDetails?: string;
  
  // Additional spiritual metadata
  ministryContext?: string;
  denominationalContext?: string;
  languagePreference?: string;
}

export interface MemorialLineData {
  fromLocation: { lat: number; lng: number };
  toLocation: { lat: number; lng: number };
  prayerId: string;
  connectionType: 'prayer_response' | 'ongoing_prayer' | 'answered_prayer';
  expiresAt?: Date;
  isEternal?: boolean; // For answered prayers that never disappear
  visualStyle?: {
    color: string;
    thickness: number;
    animation: 'pulse' | 'flow' | 'static';
  };
}

// ============================================================================
// CORE CONVERSATION INTERFACES
// ============================================================================

export interface ConversationThread {
  id: string;
  type: ConversationType;
  title: string;
  customTitle?: string;
  
  // Prayer context
  prayerId?: string;
  originalPrayerTitle?: string;
  originalPrayerLocation?: { lat: number; lng: number };
  memorialLineId?: string;
  
  // Participants and permissions
  participantIds: string[];
  creatorId: string;
  
  // Settings
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  allowAnonymous: boolean;
  notificationsEnabled: boolean;
  readReceiptsEnabled: boolean;
  
  // Prayer-specific metadata
  prayerTags?: string[];
  prayerCategory?: PrayerCategory;
  
  // Activity tracking
  lastActivityAt: Date;
  lastMessageId?: string;
  unreadCount: number;
  totalMessages: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Computed/derived fields (not in DB)
  participants?: ConversationParticipant[];
  lastMessage?: ThreadMessage;
  relatedPrayer?: Prayer;
  memorialLine?: PrayerConnection;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  parentMessageId?: string; // For reply threading
  
  // Content
  content: string;
  contentType: 'text' | 'audio' | 'video';
  mediaUrl?: string;
  messageType: MessageType;
  
  // Sender information
  senderId: string;
  senderName?: string;
  isAnonymous: boolean;
  
  // Spiritual context
  spiritualContext?: SpiritualContext;
  prayerCategory?: PrayerCategory;
  urgency: MessageUrgency;
  prayerTags?: string[];
  
  // Scripture sharing
  scriptureReference?: string;
  scriptureText?: string;
  
  // Living Map integration
  createsMemorialLine: boolean;
  memorialLineData?: MemorialLineData;
  relatedPrayerId?: string;
  
  // Message state
  isEdited: boolean;
  editHistory?: MessageEdit[];
  isDeleted: boolean;
  deletedAt?: Date;
  
  // Threading metadata
  replyCount: number;
  threadParticipants?: string[];
  
  // Read tracking
  readBy: Record<string, Date>; // userId -> timestamp
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Computed/derived fields
  replies?: ThreadMessage[];
  parentMessage?: ThreadMessage;
  isRead?: boolean; // For current user
  readByCurrentUser?: Date;
  relatedPrayer?: Prayer;
}

export interface ConversationParticipant {
  id: string;
  threadId: string;
  userId: string;
  
  // Role and permissions
  role: ParticipantRole;
  canAddParticipants: boolean;
  canEditThreadSettings: boolean;
  
  // Personal settings
  notificationsEnabled: boolean;
  isMuted: boolean;
  customNickname?: string;
  
  // Activity tracking
  lastReadAt: Date;
  lastActiveAt: Date;
  unreadCount: number;
  
  // Spiritual preferences
  prayerNotificationPreferences?: PrayerNotificationPreferences;
  
  // Timestamps
  joinedAt: Date;
  leftAt?: Date;
  
  // Computed/derived fields
  user?: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
    isOnline?: boolean;
  };
}

export interface MessageEdit {
  id: string;
  messageId: string;
  previousContent: string;
  editReason?: string;
  editedBy: string;
  editedAt: Date;
}

// ============================================================================
// SETTINGS AND PREFERENCES
// ============================================================================

export interface PrayerNotificationPreferences {
  urgentPrayersOnly: boolean;
  categoriesOfInterest: PrayerCategory[];
  maxNotificationsPerDay: number;
  quietHours?: {
    start: string; // "22:00"
    end: string;   // "08:00"
    timezone: string;
  };
  scriptureNotifications: boolean;
  testimonyNotifications: boolean;
  answeredPrayerNotifications: boolean;
}

export interface ConversationSettings {
  defaultNotifications: boolean;
  autoCreateMemorialLines: boolean;
  defaultPrayerCategory: PrayerCategory;
  allowAnonymousMessages: boolean;
  requireReadReceipts: boolean;
  maxParticipants: number;
  messageRetentionDays?: number;
}

// ============================================================================
// SEARCH AND FILTERING
// ============================================================================

export interface ConversationFilters {
  type?: ConversationType[];
  prayerCategories?: PrayerCategory[];
  isUnread?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  participants?: string[];
  prayerTags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasMedia?: boolean;
  urgency?: MessageUrgency[];
}

export interface MessageSearchFilters {
  query?: string;
  messageTypes?: MessageType[];
  senderIds?: string[];
  prayerCategories?: PrayerCategory[];
  prayerTags?: string[];
  hasScripture?: boolean;
  hasTestimony?: boolean;
  urgency?: MessageUrgency[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  threadIds?: string[];
  isUnread?: boolean;
  hasMedia?: boolean;
  contentTypes?: ('text' | 'audio' | 'video')[];
}

export interface SearchResult {
  messageId: string;
  threadId: string;
  content: string;
  messageType: MessageType;
  senderName?: string;
  createdAt: Date;
  threadTitle: string;
  prayerContext?: string;
  relevanceScore: number;
  highlightedContent?: string;
}

// ============================================================================
// REAL-TIME AND STATE MANAGEMENT
// ============================================================================

export interface ConversationState {
  // Core data
  conversations: Map<string, ConversationThread>;
  messages: Map<string, ThreadMessage[]>;
  participants: Map<string, ConversationParticipant[]>;
  
  // UI state
  activeConversationId?: string;
  selectedMessageId?: string;
  replyingToMessageId?: string;
  
  // Drafts and temporary state
  draftMessages: Map<string, string>; // threadId -> draft content
  typingIndicators: Map<string, Set<string>>; // threadId -> Set of userIds
  
  // Filters and search
  conversationFilters: ConversationFilters;
  messageSearchResults: SearchResult[];
  
  // Counts and metadata
  totalUnreadCount: number;
  unreadByConversation: Map<string, number>;
  lastSyncTimestamp: Date;
  
  // Connection state
  isOnline: boolean;
  isSyncing: boolean;
  syncErrors: string[];
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  threadId: string;
  startedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// API INTERFACES
// ============================================================================

export interface CreateConversationRequest {
  type: ConversationType;
  title?: string;
  participantIds: string[];
  prayerId?: string;
  initialMessage?: string;
  prayerCategory?: PrayerCategory;
  prayerTags?: string[];
  settings?: Partial<ConversationSettings>;
}

export interface SendMessageRequest {
  threadId: string;
  content: string;
  contentType?: 'text' | 'audio' | 'video';
  mediaUrl?: string;
  messageType?: MessageType;
  parentMessageId?: string; // For replies
  spiritualContext?: SpiritualContext;
  isAnonymous?: boolean;
  urgency?: MessageUrgency;
  createsMemorialLine?: boolean;
  memorialLineData?: MemorialLineData;
}

export interface UpdateConversationRequest {
  title?: string;
  customTitle?: string;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  prayerTags?: string[];
  prayerCategory?: PrayerCategory;
  settings?: Partial<ConversationSettings>;
}

// ============================================================================
// ANALYTICS AND INSIGHTS
// ============================================================================

export interface ConversationAnalytics {
  threadId: string;
  participantCount: number;
  messageCount: number;
  avgResponseTime: number; // in minutes
  mostActiveParticipants: string[];
  commonPrayerCategories: PrayerCategory[];
  scriptureShareCount: number;
  testimonyCount: number;
  prayerRequestCount: number;
  answeredPrayerCount: number;
  
  // Spiritual engagement metrics
  spiritualEngagementScore: number;
  prayerFulfillmentRate: number;
  communitySupport: number;
  
  // Timeline data
  activityTimeline: {
    date: Date;
    messageCount: number;
    prayerCount: number;
    testimonyCount: number;
  }[];
}

export interface PrayerJourney {
  prayerId: string;
  originalPrayer: Prayer;
  conversations: ConversationThread[];
  memorialLines: PrayerConnection[];
  prayerTimeline: {
    date: Date;
    event: 'prayer_created' | 'response_received' | 'prayer_answered' | 'testimony_shared';
    description: string;
    participantName?: string;
    messageId?: string;
  }[];
  totalResponseCount: number;
  uniqueRespondersCount: number;
  isAnswered: boolean;
  answeredAt?: Date;
}

// ============================================================================
// MOBILE OPTIMIZATION
// ============================================================================

export interface MobileConversationCache {
  // Conversation metadata cache
  conversationList: ConversationThread[];
  lastCacheUpdate: Date;
  
  // Message cache by thread
  messageCacheByThread: Map<string, {
    messages: ThreadMessage[];
    lastMessageId: string;
    totalCached: number;
    hasMore: boolean;
  }>;
  
  // Priority conversations (pinned, recent, unread)
  priorityConversations: Set<string>;
  
  // Offline capabilities
  pendingMessages: Map<string, SendMessageRequest[]>;
  offlineActions: OfflineAction[];
  
  // Media cache references
  cachedMediaUrls: Set<string>;
  
  // Cache settings
  maxConversationsCached: number;
  maxMessagesPerThread: number;
  cacheExpiryHours: number;
}

export interface OfflineAction {
  id: string;
  type: 'send_message' | 'mark_read' | 'update_conversation' | 'join_conversation';
  payload: any;
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
}

// ============================================================================
// HOOKS AND UTILITIES
// ============================================================================

export interface UseConversationOptions {
  threadId: string;
  autoMarkAsRead?: boolean;
  enableRealtime?: boolean;
  preloadMessages?: number;
}

export interface UseConversationListOptions {
  userId: string;
  filters?: ConversationFilters;
  enableRealtime?: boolean;
  limit?: number;
  sortBy?: 'lastActivity' | 'created' | 'title' | 'unreadCount';
  sortOrder?: 'asc' | 'desc';
}

export interface UseMessageSearchOptions {
  filters: MessageSearchFilters;
  debounceMs?: number;
  limit?: number;
  enableHighlighting?: boolean;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface ConversationError {
  code: string;
  message: string;
  threadId?: string;
  messageId?: string;
  retryable: boolean;
  timestamp: Date;
}

export type ConversationErrorCode = 
  | 'THREAD_NOT_FOUND'
  | 'UNAUTHORIZED_ACCESS'
  | 'MESSAGE_TOO_LONG'
  | 'INVALID_PARTICIPANT'
  | 'OFFLINE_MODE'
  | 'SYNC_FAILED'
  | 'MEDIA_UPLOAD_FAILED'
  | 'PROFANITY_DETECTED'
  | 'SPAM_DETECTED'
  | 'RATE_LIMITED';

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  // Re-export for convenience
  Prayer,
  PrayerConnection
};