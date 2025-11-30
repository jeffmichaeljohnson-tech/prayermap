/**
 * Real-time Components and Services Export
 * 
 * Centralized exports for all real-time communication features:
 * - Typing indicators
 * - Read receipts
 * - Presence tracking
 * - Enhanced conversation components
 */

// Core Services
export { 
  typingIndicatorService,
  TypingActivity,
  type TypingState,
  type TypingIndicatorOptions
} from '../../services/typingIndicatorService';

export {
  readReceiptService,
  type ReadReceipt,
  type ReadReceiptEvent,
  type ReadReceiptStatus,
  type ReadReceiptOptions
} from '../../services/readReceiptService';

export {
  presenceService,
  PresenceStatus,
  type UserPresence,
  type PresenceOptions,
  type PresenceEvent
} from '../../services/presenceService';

export {
  realtimeManager,
  type RealtimeManagerOptions,
  type ConversationSetupOptions
} from '../../services/realtimeManager';

// UI Components
export {
  TypingIndicator,
  CompactTypingIndicator,
  useTypingIndicator
} from './TypingIndicator';

export {
  ReadReceiptStatus,
  ConversationReadStatus,
  useReadReceipts
} from './ReadReceiptStatus';

export {
  PresenceIndicator,
  ConversationPresence,
  GlobalPresenceStats,
  usePresence
} from './PresenceIndicator';

// Enhanced Conversation Component
export { 
  EnhancedConversationThread,
  type EnhancedConversationThreadProps
} from '../EnhancedConversationThread';

// Utility Types
export interface RealtimeFeatures {
  typingIndicators: boolean;
  readReceipts: boolean;
  presenceTracking: boolean;
  batteryOptimization: boolean;
}

export interface ConversationRealtimeState {
  typingUsers: Array<{
    userId: string;
    userName: string;
    activity: string;
  }>;
  onlineParticipants: Array<{
    userId: string;
    status: string;
    lastSeen: Date;
  }>;
  unreadCount: number;
  lastReadBy: Record<string, Date>;
}

// React Hook for Full Real-time Integration
export interface UseRealtimeConversationOptions {
  conversationId: string;
  userId: string;
  userName: string;
  participantIds: string[];
  features?: Partial<RealtimeFeatures>;
}

export interface UseRealtimeConversationReturn {
  // Typing indicators
  typingUsers: Array<{ userId: string; userName: string; activity: string }>;
  startTyping: (activity?: string) => Promise<void>;
  stopTyping: () => Promise<void>;
  
  // Read receipts
  markMessageRead: (messageId: string) => Promise<void>;
  markConversationRead: (messageIds?: string[]) => Promise<void>;
  getUnreadCount: () => Promise<number>;
  
  // Presence
  participantPresences: Map<string, UserPresence>;
  setPrayingStatus: (isPraying: boolean) => Promise<void>;
  
  // Global state
  isOnline: boolean;
  connectionHealth: any;
  
  // Cleanup
  cleanup: () => void;
}

/**
 * Comprehensive hook for real-time conversation features
 * Integrates all services for easy component usage
 */
export function useRealtimeConversation(
  options: UseRealtimeConversationOptions
): UseRealtimeConversationReturn {
  const { conversationId, userId, userName, participantIds, features = {} } = options;
  
  // Use the centralized manager
  const conversationApi = realtimeManager.setupConversation({
    conversationId,
    userId,
    userName,
    participantIds
  });

  // Create simplified API for components
  return {
    // Typing indicators
    typingUsers: [], // Would be populated via subscriptions
    startTyping: conversationApi.startTyping,
    stopTyping: conversationApi.stopTyping,
    
    // Read receipts
    markMessageRead: conversationApi.markMessageRead,
    markConversationRead: conversationApi.markConversationRead,
    getUnreadCount: () => readReceiptService.getUnreadMessageCount(conversationId, userId),
    
    // Presence
    participantPresences: new Map(), // Would be populated via subscriptions
    setPrayingStatus: conversationApi.setPrayingStatus,
    
    // Global state
    isOnline: navigator.onLine ?? true,
    connectionHealth: realtimeManager.getConnectionHealth(),
    
    // Cleanup
    cleanup: conversationApi.cleanup
  };
}

// Constants for configuration
export const REALTIME_CONFIG = {
  // Timing constants
  TYPING_TIMEOUT: 8000,
  AUDIO_RECORDING_TIMEOUT: 60000,
  VIDEO_RECORDING_TIMEOUT: 300000,
  PRESENCE_HEARTBEAT: 30000,
  OFFLINE_THRESHOLD: 120000,
  
  // Performance constants
  BATCH_SIZE: 50,
  BROADCAST_DELAY: 500,
  CLEANUP_INTERVAL: 5000,
  
  // Battery optimization
  BATTERY_LOW_THRESHOLD: 0.2,
  REDUCED_FREQUENCY_MULTIPLIER: 2,
  
  // Visual constants
  ANIMATION_DURATION: 300,
  PULSE_DURATION: 1500,
  SCALE_ANIMATION: { from: 0.95, to: 1 }
} as const;

// Error types
export class RealtimeError extends Error {
  constructor(
    message: string,
    public readonly service: 'typing' | 'readReceipts' | 'presence',
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RealtimeError';
  }
}

// Event types for debugging and monitoring
export interface RealtimeEvent {
  type: 'typing_start' | 'typing_stop' | 'message_read' | 'presence_update' | 'connection_change';
  timestamp: Date;
  userId: string;
  conversationId?: string;
  data?: any;
}

// Performance monitoring
export interface RealtimeMetrics {
  typingIndicatorLatency: number; // ms
  readReceiptLatency: number; // ms
  presenceUpdateLatency: number; // ms
  connectionQuality: 'excellent' | 'good' | 'poor';
  batteryOptimized: boolean;
  activeConnections: number;
}

export default {
  // Services
  typingIndicatorService,
  readReceiptService,
  presenceService,
  realtimeManager,
  
  // Components
  TypingIndicator,
  ReadReceiptStatus,
  PresenceIndicator,
  EnhancedConversationThread,
  
  // Hooks
  useTypingIndicator,
  useReadReceipts,
  usePresence,
  useRealtimeConversation,
  
  // Constants
  REALTIME_CONFIG,
  
  // Types
  TypingActivity,
  PresenceStatus
};