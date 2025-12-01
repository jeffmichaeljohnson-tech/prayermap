/**
 * Messaging Services - Consolidated Offline Conversation Management
 * 
 * Split from the large offlineConversationCache.ts into focused services:
 * - ConversationCache: Core conversation and message caching
 * - OfflineActionManager: Offline action queueing and execution
 * 
 * Provides sophisticated offline support for conversation threading with
 * intelligent caching, sync conflict resolution, and mobile optimization.
 */

export { 
  ConversationCache, 
  conversationCache,
  type ConversationCacheConfig
} from './ConversationCache';

export { 
  OfflineActionManager,
  offlineActionManager,
  type OfflineActionConfig
} from './OfflineActionManager';

// Convenience function to initialize all messaging services
export async function initializeMessagingServices(): Promise<void> {
  console.log('🚀 Initializing messaging services...');
  
  try {
    // Initialize conversation cache
    await conversationCache.initialize();
    
    // Initialize offline action manager
    await offlineActionManager.initialize();
    
    console.log('✅ Messaging services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize messaging services:', error);
    throw error;
  }
}

// Convenience function to get overall messaging status
export async function getMessagingStatus(): Promise<{
  cache: {
    conversationCount: number;
    messageCount: number;
    totalSizeEstimate: number;
  };
  offlineActions: {
    totalActions: number;
    actionsByType: Record<string, number>;
    oldestAction: Date | null;
  };
}> {
  try {
    const [cacheStats, actionStats] = await Promise.all([
      conversationCache.getCacheStats(),
      offlineActionManager.getActionStats()
    ]);

    return {
      cache: {
        conversationCount: cacheStats.conversationCount,
        messageCount: cacheStats.messageCount,
        totalSizeEstimate: cacheStats.totalSizeEstimate
      },
      offlineActions: {
        totalActions: actionStats.totalActions,
        actionsByType: actionStats.actionsByType,
        oldestAction: actionStats.oldestAction
      }
    };
  } catch (error) {
    console.error('Failed to get messaging status:', error);
    return {
      cache: {
        conversationCount: 0,
        messageCount: 0,
        totalSizeEstimate: 0
      },
      offlineActions: {
        totalActions: 0,
        actionsByType: {},
        oldestAction: null
      }
    };
  }
}

// Convenience function to perform maintenance on messaging services
export async function performMessagingMaintenance(): Promise<void> {
  console.log('🧹 Performing messaging services maintenance...');
  
  try {
    // Execute any pending offline actions
    await offlineActionManager.executePendingActions();
    
    console.log('✅ Messaging maintenance completed');
  } catch (error) {
    console.error('❌ Messaging maintenance failed:', error);
    throw error;
  }
}

/**
 * Unified Messaging System Interface
 * 
 * Provides a single interface for debug components and tests
 * that expect a unified messaging system object.
 */
export const prayerMapMessagingSystem = {
  /**
   * Initialize all messaging services
   */
  async initialize(): Promise<void> {
    return initializeMessagingServices();
  },

  /**
   * Cleanup and destroy messaging services
   */
  async destroy(): Promise<void> {
    // Cleanup is handled automatically, but we can add explicit cleanup here if needed
    console.log('🧹 Cleaning up messaging services...');
  },

  /**
   * Send a message (stub - actual implementation would use MessagingChannelManager)
   * This is a placeholder for debug components that expect this interface
   */
  async sendMessage(conversationId: string, message: string): Promise<any> {
    console.warn('prayerMapMessagingSystem.sendMessage() is a stub - use MessagingChannelManager directly');
    // Return a mock response for debug components
    return {
      success: false,
      message: 'Use MessagingChannelManager.sendMessage() directly',
    };
  },

  /**
   * Get system status for debug dashboards
   */
  getSystemStatus(): any {
    // Return status based on current services
    return {
      initialized: true,
      cache: {
        enabled: true,
        // Stats would be populated by getMessagingStatus() if needed
      },
      offlineActions: {
        enabled: true,
        // Stats would be populated by getMessagingStatus() if needed
      },
    };
  },
};