/**
 * Real-time Manager Service
 * 
 * Central coordinator for all real-time features:
 * - Typing indicators
 * - Read receipts  
 * - Presence tracking
 * - Battery optimization
 * - Cross-service synchronization
 */

import { typingIndicatorService } from './typingIndicatorService';
import { readReceiptService } from './readReceiptService';
import { presenceService, PresenceStatus } from './presenceService';
import { inboxSyncService } from './inboxSyncService';

export interface RealtimeManagerOptions {
  enableTypingIndicators?: boolean;
  enableReadReceipts?: boolean;
  enablePresenceTracking?: boolean;
  batteryOptimization?: boolean;
  debugLogging?: boolean;
}

export interface ConversationSetupOptions {
  conversationId: string;
  userId: string;
  userName: string;
  participantIds: string[];
}

class RealtimeManager {
  private options: Required<RealtimeManagerOptions>;
  private activeConversations = new Map<string, ConversationSetupOptions>();
  private isInitialized = false;
  private currentUserId: string | null = null;

  constructor(options: RealtimeManagerOptions = {}) {
    this.options = {
      enableTypingIndicators: true,
      enableReadReceipts: true,
      enablePresenceTracking: true,
      batteryOptimization: true,
      debugLogging: false,
      ...options
    };
  }

  /**
   * Initialize real-time manager for a user
   */
  async initialize(userId: string, userName: string): Promise<void> {
    if (this.isInitialized && this.currentUserId === userId) {
      return; // Already initialized for this user
    }

    this.currentUserId = userId;
    this.log(`Initializing real-time manager for user ${userId}`);

    try {
      // Start presence tracking
      if (this.options.enablePresenceTracking) {
        await presenceService.startPresenceTracking(userId, PresenceStatus.ONLINE);
        this.log('Presence tracking started');
      }

      // Initialize services if needed
      // Services are already singletons, so this is mainly for configuration
      
      this.isInitialized = true;
      this.log('Real-time manager initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize real-time manager:', error);
      throw error;
    }
  }

  /**
   * Setup real-time features for a conversation
   */
  setupConversation(options: ConversationSetupOptions): {
    startTyping: (activity?: string) => Promise<void>;
    stopTyping: () => Promise<void>;
    markMessageRead: (messageId: string) => Promise<void>;
    markConversationRead: (messageIds?: string[]) => Promise<void>;
    setPrayingStatus: (isPraying: boolean) => Promise<void>;
    cleanup: () => void;
  } {
    const { conversationId, userId, userName, participantIds } = options;
    
    this.activeConversations.set(conversationId, options);
    this.log(`Setting up conversation ${conversationId} with ${participantIds.length} participants`);

    // Shared cleanup functions
    const subscriptionCleanups: Array<() => void> = [];

    const api = {
      startTyping: async (activity: string = 'typing') => {
        if (!this.options.enableTypingIndicators) return;
        
        try {
          await typingIndicatorService.startTyping(
            conversationId,
            userId,
            userName,
            activity as any
          );
        } catch (error) {
          console.error('Failed to start typing:', error);
        }
      },

      stopTyping: async () => {
        if (!this.options.enableTypingIndicators) return;
        
        try {
          await typingIndicatorService.stopTyping(conversationId, userId);
        } catch (error) {
          console.error('Failed to stop typing:', error);
        }
      },

      markMessageRead: async (messageId: string) => {
        if (!this.options.enableReadReceipts) return;
        
        try {
          await readReceiptService.markMessageRead(messageId, userId, userName);
          this.log(`Marked message ${messageId} as read`);
        } catch (error) {
          console.error('Failed to mark message as read:', error);
        }
      },

      markConversationRead: async (messageIds?: string[]) => {
        if (!this.options.enableReadReceipts) return;
        
        try {
          const readCount = await readReceiptService.markConversationRead(
            conversationId,
            userId,
            userName,
            messageIds
          );
          this.log(`Marked ${readCount} messages as read in conversation ${conversationId}`);
        } catch (error) {
          console.error('Failed to mark conversation as read:', error);
        }
      },

      setPrayingStatus: async (isPraying: boolean) => {
        if (!this.options.enablePresenceTracking) return;
        
        try {
          if (isPraying) {
            await presenceService.setPrayingStatus([conversationId], 'Praying 🙏');
          } else {
            await presenceService.updateUserPresence(userId, PresenceStatus.ONLINE);
          }
          this.log(`Set praying status to ${isPraying} for conversation ${conversationId}`);
        } catch (error) {
          console.error('Failed to update praying status:', error);
        }
      },

      cleanup: () => {
        this.log(`Cleaning up conversation ${conversationId}`);
        
        // Clean up subscriptions
        subscriptionCleanups.forEach(cleanup => cleanup());
        
        // Remove from active conversations
        this.activeConversations.delete(conversationId);
        
        // Stop typing if active
        if (this.options.enableTypingIndicators) {
          typingIndicatorService.stopTyping(conversationId, userId).catch(console.error);
        }
      }
    };

    return api;
  }

  /**
   * Get real-time conversation hooks for React components
   */
  useConversationHooks(conversationId: string) {
    return {
      // Typing indicator hook
      useTyping: () => {
        if (!this.options.enableTypingIndicators) {
          return {
            typingUsers: [],
            isAnyoneTyping: false,
            displayText: '',
            subscribe: () => () => {}
          };
        }

        return {
          subscribe: (callback: (typingUsers: any[]) => void) => {
            return typingIndicatorService.subscribeToTypingIndicators(
              conversationId,
              callback
            );
          }
        };
      },

      // Read receipts hook
      useReadReceipts: (messageId: string) => {
        if (!this.options.enableReadReceipts) {
          return {
            readReceipts: [],
            subscribe: () => () => {}
          };
        }

        return {
          subscribe: (callback: (event: any) => void) => {
            return readReceiptService.subscribeToReadReceipts(
              conversationId,
              callback
            );
          }
        };
      },

      // Presence hook
      usePresence: (participantIds: string[]) => {
        if (!this.options.enablePresenceTracking) {
          return {
            presences: new Map(),
            subscribe: () => () => {}
          };
        }

        return {
          subscribe: (callback: (event: any) => void) => {
            return presenceService.subscribeToPresenceUpdates(
              callback,
              participantIds
            );
          }
        };
      }
    };
  }

  /**
   * Get global stats across all conversations
   */
  async getGlobalStats(): Promise<{
    activeConversations: number;
    totalTypingUsers: number;
    onlineUsers: number;
    prayingUsers: number;
  }> {
    try {
      const onlineStats = await presenceService.getOnlineStats();
      
      return {
        activeConversations: this.activeConversations.size,
        totalTypingUsers: 0, // Would need aggregation across conversations
        onlineUsers: onlineStats.onlineCount,
        prayingUsers: onlineStats.prayingCount
      };
    } catch (error) {
      console.error('Failed to get global stats:', error);
      return {
        activeConversations: 0,
        totalTypingUsers: 0,
        onlineUsers: 0,
        prayingUsers: 0
      };
    }
  }

  /**
   * Enable/disable battery optimization mode
   */
  setBatteryOptimization(enabled: boolean): void {
    this.options.batteryOptimization = enabled;
    this.log(`Battery optimization ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Handle app state changes for battery optimization
   */
  handleAppStateChange(isActive: boolean): void {
    if (!this.options.batteryOptimization) return;

    if (this.currentUserId) {
      const status = isActive ? PresenceStatus.ONLINE : PresenceStatus.AWAY;
      presenceService.updateUserPresence(this.currentUserId, status)
        .catch(console.error);
    }

    this.log(`App state changed: ${isActive ? 'active' : 'background'}`);
  }

  /**
   * Handle network state changes
   */
  handleNetworkStateChange(isOnline: boolean): void {
    this.log(`Network state changed: ${isOnline ? 'online' : 'offline'}`);
    
    if (this.currentUserId) {
      const status = isOnline ? PresenceStatus.ONLINE : PresenceStatus.OFFLINE;
      presenceService.updateUserPresence(this.currentUserId, status)
        .catch(console.error);
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    this.log('Cleaning up real-time manager');
    
    try {
      // Cleanup all active conversations
      for (const [conversationId] of this.activeConversations) {
        this.log(`Cleaning up conversation ${conversationId}`);
      }
      this.activeConversations.clear();
      
      // Cleanup services
      typingIndicatorService.cleanup();
      readReceiptService.cleanup();
      await presenceService.cleanup();
      
      this.isInitialized = false;
      this.currentUserId = null;
      
      this.log('Real-time manager cleaned up successfully');
      
    } catch (error) {
      console.error('Failed to cleanup real-time manager:', error);
    }
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.options.debugLogging) {
      console.log(`[RealtimeManager] ${message}`);
    }
  }

  /**
   * Get connection health status
   */
  getConnectionHealth(): {
    isInitialized: boolean;
    currentUserId: string | null;
    activeConversations: number;
    servicesStatus: {
      typing: boolean;
      readReceipts: boolean;
      presence: boolean;
    };
  } {
    return {
      isInitialized: this.isInitialized,
      currentUserId: this.currentUserId,
      activeConversations: this.activeConversations.size,
      servicesStatus: {
        typing: this.options.enableTypingIndicators,
        readReceipts: this.options.enableReadReceipts,
        presence: this.options.enablePresenceTracking
      }
    };
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager({
  debugLogging: process.env.NODE_ENV === 'development'
});

// Export for testing
export { RealtimeManager };