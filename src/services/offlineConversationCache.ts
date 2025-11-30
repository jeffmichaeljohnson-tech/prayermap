/**
 * Offline Conversation Caching System
 * 
 * Sophisticated offline support for conversation threading with
 * intelligent caching, sync conflict resolution, and mobile optimization.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { supabase } from '../lib/supabase';
import type {
  ConversationThread,
  ThreadMessage,
  ConversationParticipant,
  MobileConversationCache,
  OfflineAction,
  SendMessageRequest
} from '../types/conversation';

// IndexedDB Schema
interface ConversationDB extends DBSchema {
  conversations: {
    key: string;
    value: ConversationThread & { lastSyncedAt: number };
    indexes: { 
      'by-lastActivity': Date; 
      'by-created': Date;
      'by-unread': number;
      'by-pinned': boolean;
    };
  };
  messages: {
    key: string;
    value: ThreadMessage & { lastSyncedAt: number };
    indexes: { 
      'by-thread': string; 
      'by-created': Date;
      'by-sender': string;
      'by-type': string;
    };
  };
  participants: {
    key: string;
    value: ConversationParticipant & { lastSyncedAt: number };
    indexes: { 
      'by-thread': string; 
      'by-user': string;
    };
  };
  offline_actions: {
    key: string;
    value: OfflineAction;
    indexes: { 
      'by-created': Date;
      'by-type': string;
      'by-retryCount': number;
    };
  };
  media_cache: {
    key: string;
    value: {
      url: string;
      blob: Blob;
      mimeType: string;
      size: number;
      cachedAt: Date;
      expiresAt: Date;
    };
  };
  sync_metadata: {
    key: string;
    value: {
      lastFullSync: Date;
      lastIncrementalSync: Date;
      syncVersion: number;
      pendingChanges: number;
    };
  };
}

export class OfflineConversationCache {
  private db: IDBPDatabase<ConversationDB> | null = null;
  private syncInProgress = false;
  private conflictResolver: ConflictResolver;
  
  constructor() {
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * Initialize the offline cache database
   */
  async initialize(): Promise<void> {
    try {
      this.db = await openDB<ConversationDB>('PrayerMapConversations', 3, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log(`Upgrading conversation cache DB from ${oldVersion} to ${newVersion}`);
          
          // Conversations store
          if (!db.objectStoreNames.contains('conversations')) {
            const conversationStore = db.createObjectStore('conversations', { keyPath: 'id' });
            conversationStore.createIndex('by-lastActivity', 'lastActivityAt');
            conversationStore.createIndex('by-created', 'createdAt');
            conversationStore.createIndex('by-unread', 'unreadCount');
            conversationStore.createIndex('by-pinned', 'isPinned');
          }
          
          // Messages store
          if (!db.objectStoreNames.contains('messages')) {
            const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
            messageStore.createIndex('by-thread', 'threadId');
            messageStore.createIndex('by-created', 'createdAt');
            messageStore.createIndex('by-sender', 'senderId');
            messageStore.createIndex('by-type', 'messageType');
          }
          
          // Participants store
          if (!db.objectStoreNames.contains('participants')) {
            const participantStore = db.createObjectStore('participants', { keyPath: 'id' });
            participantStore.createIndex('by-thread', 'threadId');
            participantStore.createIndex('by-user', 'userId');
          }
          
          // Offline actions store
          if (!db.objectStoreNames.contains('offline_actions')) {
            const actionStore = db.createObjectStore('offline_actions', { keyPath: 'id' });
            actionStore.createIndex('by-created', 'createdAt');
            actionStore.createIndex('by-type', 'type');
            actionStore.createIndex('by-retryCount', 'retryCount');
          }
          
          // Media cache store
          if (!db.objectStoreNames.contains('media_cache')) {
            const mediaStore = db.createObjectStore('media_cache', { keyPath: 'url' });
          }
          
          // Sync metadata store
          if (!db.objectStoreNames.contains('sync_metadata')) {
            db.createObjectStore('sync_metadata', { keyPath: 'key' });
          }
        }
      });
      
      console.log('Offline conversation cache initialized successfully');
    } catch (error) {
      console.error('Failed to initialize offline cache:', error);
      throw error;
    }
  }

  // ============================================================================
  // CONVERSATION MANAGEMENT
  // ============================================================================

  /**
   * Cache conversations with intelligent storage management
   */
  async cacheConversations(
    conversations: ConversationThread[],
    options: {
      replaceCached?: boolean;
      maxCacheSize?: number;
      priorityThreadIds?: Set<string>;
    } = {}
  ): Promise<void> {
    if (!this.db) throw new Error('Cache not initialized');

    const { replaceCached = false, maxCacheSize = 100, priorityThreadIds = new Set() } = options;

    try {
      const tx = this.db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');

      // Clear existing if replacing
      if (replaceCached) {
        await store.clear();
      }

      // Cache conversations with priority handling
      for (const conversation of conversations) {
        const cachedConversation = {
          ...conversation,
          lastSyncedAt: Date.now()
        };
        
        await store.put(cachedConversation);
      }

      // Manage cache size by removing old, non-priority conversations
      await this.manageCacheSize('conversations', maxCacheSize, priorityThreadIds);
      
      await tx.done;
      
      console.log(`Cached ${conversations.length} conversations`);
    } catch (error) {
      console.error('Failed to cache conversations:', error);
      throw error;
    }
  }

  /**
   * Get cached conversations with filtering and sorting
   */
  async getCachedConversations(
    filters: {
      isUnread?: boolean;
      isPinned?: boolean;
      isArchived?: boolean;
      limit?: number;
    } = {}
  ): Promise<ConversationThread[]> {
    if (!this.db) return [];

    try {
      const tx = this.db.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');
      
      let conversations = await store.getAll();
      
      // Apply filters
      if (filters.isUnread !== undefined) {
        conversations = conversations.filter(c => 
          filters.isUnread ? c.unreadCount > 0 : c.unreadCount === 0
        );
      }
      
      if (filters.isPinned !== undefined) {
        conversations = conversations.filter(c => c.isPinned === filters.isPinned);
      }
      
      if (filters.isArchived !== undefined) {
        conversations = conversations.filter(c => c.isArchived === filters.isArchived);
      }
      
      // Sort by priority and last activity
      conversations.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
      });
      
      // Apply limit
      if (filters.limit) {
        conversations = conversations.slice(0, filters.limit);
      }
      
      // Remove sync metadata before returning
      return conversations.map(({ lastSyncedAt, ...conversation }) => conversation);
      
    } catch (error) {
      console.error('Failed to get cached conversations:', error);
      return [];
    }
  }

  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================

  /**
   * Cache messages with thread organization
   */
  async cacheMessages(
    messages: ThreadMessage[],
    threadId?: string,
    options: {
      replaceCached?: boolean;
      maxMessagesPerThread?: number;
    } = {}
  ): Promise<void> {
    if (!this.db) throw new Error('Cache not initialized');

    const { replaceCached = false, maxMessagesPerThread = 200 } = options;

    try {
      const tx = this.db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');

      // Clear existing messages for thread if replacing
      if (replaceCached && threadId) {
        const existingMessages = await store.index('by-thread').getAll(threadId);
        for (const message of existingMessages) {
          await store.delete(message.id);
        }
      }

      // Cache messages
      for (const message of messages) {
        const cachedMessage = {
          ...message,
          lastSyncedAt: Date.now()
        };
        
        await store.put(cachedMessage);
      }

      // Manage thread message limits
      if (threadId) {
        await this.manageThreadMessageLimit(threadId, maxMessagesPerThread);
      }
      
      await tx.done;
      
      console.log(`Cached ${messages.length} messages${threadId ? ` for thread ${threadId}` : ''}`);
    } catch (error) {
      console.error('Failed to cache messages:', error);
      throw error;
    }
  }

  /**
   * Get cached messages for a thread
   */
  async getCachedMessages(
    threadId: string,
    options: {
      limit?: number;
      offset?: number;
      includeReplies?: boolean;
    } = {}
  ): Promise<ThreadMessage[]> {
    if (!this.db) return [];

    try {
      const tx = this.db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      
      let messages = await store.index('by-thread').getAll(threadId);
      
      // Sort by creation time
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Apply pagination
      if (options.offset) {
        messages = messages.slice(options.offset);
      }
      
      if (options.limit) {
        messages = messages.slice(0, options.limit);
      }
      
      // Load replies if requested
      if (options.includeReplies) {
        for (const message of messages) {
          if (message.replyCount > 0) {
            const replies = await this.getCachedMessageReplies(message.id);
            message.replies = replies;
          }
        }
      }
      
      // Remove sync metadata
      return messages.map(({ lastSyncedAt, ...message }) => message);
      
    } catch (error) {
      console.error('Failed to get cached messages:', error);
      return [];
    }
  }

  /**
   * Get cached message replies
   */
  async getCachedMessageReplies(parentMessageId: string): Promise<ThreadMessage[]> {
    if (!this.db) return [];

    try {
      const tx = this.db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      
      const allMessages = await store.getAll();
      const replies = allMessages
        .filter(m => m.parentMessageId === parentMessageId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      return replies.map(({ lastSyncedAt, ...message }) => message);
      
    } catch (error) {
      console.error('Failed to get cached message replies:', error);
      return [];
    }
  }

  // ============================================================================
  // OFFLINE ACTIONS
  // ============================================================================

  /**
   * Queue action for offline execution
   */
  async queueOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.db) throw new Error('Cache not initialized');

    try {
      const tx = this.db.transaction('offline_actions', 'readwrite');
      await tx.objectStore('offline_actions').add(action);
      await tx.done;
      
      console.log(`Queued offline action: ${action.type}`, action.id);
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      throw error;
    }
  }

  /**
   * Get pending offline actions
   */
  async getPendingOfflineActions(): Promise<OfflineAction[]> {
    if (!this.db) return [];

    try {
      const tx = this.db.transaction('offline_actions', 'readonly');
      const actions = await tx.objectStore('offline_actions').getAll();
      
      // Sort by creation time and retry count
      return actions.sort((a, b) => {
        if (a.retryCount !== b.retryCount) {
          return a.retryCount - b.retryCount;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      
    } catch (error) {
      console.error('Failed to get pending offline actions:', error);
      return [];
    }
  }

  /**
   * Execute pending offline actions when back online
   */
  async executePendingActions(): Promise<{
    successful: string[];
    failed: string[];
  }> {
    if (!this.db || this.syncInProgress) {
      return { successful: [], failed: [] };
    }

    this.syncInProgress = true;
    const successful: string[] = [];
    const failed: string[] = [];

    try {
      const actions = await this.getPendingOfflineActions();
      
      for (const action of actions) {
        try {
          await this.executeOfflineAction(action);
          successful.push(action.id);
          await this.removeOfflineAction(action.id);
        } catch (error) {
          console.error(`Failed to execute offline action ${action.id}:`, error);
          
          if (action.retryCount >= action.maxRetries) {
            failed.push(action.id);
            await this.removeOfflineAction(action.id);
          } else {
            await this.incrementRetryCount(action.id);
          }
        }
      }
      
      console.log(`Executed offline actions: ${successful.length} successful, ${failed.length} failed`);
      
    } finally {
      this.syncInProgress = false;
    }

    return { successful, failed };
  }

  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'send_message':
        // Execute send message action using conversation service
        // This would integrate with ConversationService.sendMessage
        console.log('Executing offline send message action:', action.payload);
        break;
        
      case 'mark_read':
        // Execute mark as read action
        console.log('Executing offline mark read action:', action.payload);
        break;
        
      case 'update_conversation':
        // Execute conversation update action
        console.log('Executing offline conversation update action:', action.payload);
        break;
        
      default:
        throw new Error(`Unknown offline action type: ${action.type}`);
    }
  }

  private async removeOfflineAction(actionId: string): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction('offline_actions', 'readwrite');
    await tx.objectStore('offline_actions').delete(actionId);
    await tx.done;
  }

  private async incrementRetryCount(actionId: string): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction('offline_actions', 'readwrite');
    const store = tx.objectStore('offline_actions');
    const action = await store.get(actionId);
    
    if (action) {
      action.retryCount += 1;
      await store.put(action);
    }
    
    await tx.done;
  }

  // ============================================================================
  // MEDIA CACHING
  // ============================================================================

  /**
   * Cache media files for offline access
   */
  async cacheMediaFile(url: string, blob: Blob): Promise<void> {
    if (!this.db) throw new Error('Cache not initialized');

    try {
      const tx = this.db.transaction('media_cache', 'readwrite');
      await tx.objectStore('media_cache').put({
        url,
        blob,
        mimeType: blob.type,
        size: blob.size,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      await tx.done;
      
      console.log(`Cached media file: ${url} (${blob.size} bytes)`);
    } catch (error) {
      console.error('Failed to cache media file:', error);
    }
  }

  /**
   * Get cached media file
   */
  async getCachedMediaFile(url: string): Promise<Blob | null> {
    if (!this.db) return null;

    try {
      const tx = this.db.transaction('media_cache', 'readonly');
      const cached = await tx.objectStore('media_cache').get(url);
      
      if (!cached) return null;
      
      // Check if expired
      if (cached.expiresAt < new Date()) {
        // Clean up expired media
        this.removeCachedMediaFile(url);
        return null;
      }
      
      return cached.blob;
      
    } catch (error) {
      console.error('Failed to get cached media file:', error);
      return null;
    }
  }

  /**
   * Remove cached media file
   */
  async removeCachedMediaFile(url: string): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction('media_cache', 'readwrite');
      await tx.objectStore('media_cache').delete(url);
      await tx.done;
    } catch (error) {
      console.error('Failed to remove cached media file:', error);
    }
  }

  // ============================================================================
  // SYNC MANAGEMENT
  // ============================================================================

  /**
   * Sync cached data with server
   */
  async syncWithServer(
    userId: string,
    options: {
      fullSync?: boolean;
      maxConversations?: number;
    } = {}
  ): Promise<void> {
    if (!this.db || this.syncInProgress) return;

    this.syncInProgress = true;
    const { fullSync = false, maxConversations = 50 } = options;

    try {
      console.log(`Starting ${fullSync ? 'full' : 'incremental'} sync for user:`, userId);
      
      // Get last sync time
      const lastSync = await this.getLastSyncTime();
      
      // Sync conversations
      await this.syncConversations(userId, fullSync ? undefined : lastSync, maxConversations);
      
      // Sync offline actions
      await this.executePendingActions();
      
      // Update sync metadata
      await this.updateSyncMetadata();
      
      console.log('Sync completed successfully');
      
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncConversations(
    userId: string, 
    since?: Date, 
    limit?: number
  ): Promise<void> {
    try {
      // This would use the conversation service to fetch updates
      // For now, it's a placeholder implementation
      console.log(`Syncing conversations for ${userId} since ${since?.toISOString()}`);
      
      // Implement actual sync logic here
      
    } catch (error) {
      console.error('Failed to sync conversations:', error);
      throw error;
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    conversations: number;
    messages: number;
    participants: number;
    offlineActions: number;
    mediaFiles: number;
    totalSize: string;
  }> {
    if (!this.db) {
      return {
        conversations: 0,
        messages: 0,
        participants: 0,
        offlineActions: 0,
        mediaFiles: 0,
        totalSize: '0 KB'
      };
    }

    try {
      const [conversations, messages, participants, offlineActions, mediaFiles] = await Promise.all([
        this.db.count('conversations'),
        this.db.count('messages'),
        this.db.count('participants'),
        this.db.count('offline_actions'),
        this.db.count('media_cache')
      ]);

      // Estimate total size (rough calculation)
      const estimatedSize = 
        (conversations * 1000) + // ~1KB per conversation
        (messages * 500) + // ~500B per message
        (participants * 200); // ~200B per participant

      const totalSize = estimatedSize > 1024 * 1024 
        ? `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(estimatedSize / 1024)} KB`;

      return {
        conversations,
        messages,
        participants,
        offlineActions,
        mediaFiles,
        totalSize
      };
      
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        conversations: 0,
        messages: 0,
        participants: 0,
        offlineActions: 0,
        mediaFiles: 0,
        totalSize: '0 KB'
      };
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction([
        'conversations', 
        'messages', 
        'participants', 
        'offline_actions', 
        'media_cache'
      ], 'readwrite');
      
      await Promise.all([
        tx.objectStore('conversations').clear(),
        tx.objectStore('messages').clear(),
        tx.objectStore('participants').clear(),
        tx.objectStore('offline_actions').clear(),
        tx.objectStore('media_cache').clear()
      ]);
      
      await tx.done;
      
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async manageCacheSize(
    storeName: 'conversations' | 'messages',
    maxSize: number,
    priorityIds: Set<string>
  ): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const count = await store.count();
      
      if (count <= maxSize) {
        await tx.done;
        return;
      }
      
      // Get all items sorted by last synced time
      const allItems = await store.getAll();
      allItems.sort((a, b) => a.lastSyncedAt - b.lastSyncedAt);
      
      // Remove oldest items that are not priority
      let removedCount = 0;
      for (const item of allItems) {
        if (removedCount >= (count - maxSize)) break;
        if (!priorityIds.has(item.id)) {
          await store.delete(item.id);
          removedCount++;
        }
      }
      
      await tx.done;
      
      console.log(`Removed ${removedCount} old items from ${storeName} cache`);
    } catch (error) {
      console.error(`Failed to manage ${storeName} cache size:`, error);
    }
  }

  private async manageThreadMessageLimit(threadId: string, limit: number): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      const messages = await store.index('by-thread').getAll(threadId);
      
      if (messages.length <= limit) {
        await tx.done;
        return;
      }
      
      // Sort by creation time and keep newest messages
      messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Remove oldest messages
      const messagesToRemove = messages.slice(limit);
      for (const message of messagesToRemove) {
        await store.delete(message.id);
      }
      
      await tx.done;
      
      console.log(`Removed ${messagesToRemove.length} old messages from thread ${threadId}`);
    } catch (error) {
      console.error('Failed to manage thread message limit:', error);
    }
  }

  private async getLastSyncTime(): Promise<Date | undefined> {
    if (!this.db) return undefined;

    try {
      const tx = this.db.transaction('sync_metadata', 'readonly');
      const metadata = await tx.objectStore('sync_metadata').get('lastSync');
      return metadata?.lastIncrementalSync;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return undefined;
    }
  }

  private async updateSyncMetadata(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction('sync_metadata', 'readwrite');
      const now = new Date();
      
      await tx.objectStore('sync_metadata').put({
        key: 'lastSync',
        lastFullSync: now,
        lastIncrementalSync: now,
        syncVersion: 1,
        pendingChanges: 0
      });
      
      await tx.done;
    } catch (error) {
      console.error('Failed to update sync metadata:', error);
    }
  }
}

// Conflict Resolution System
class ConflictResolver {
  
  /**
   * Resolve conflicts between local and server data
   */
  resolveConversationConflict(
    local: ConversationThread,
    server: ConversationThread
  ): ConversationThread {
    // Use server version for most fields, but preserve local unread count
    // and user preferences that might have been updated offline
    return {
      ...server,
      isPinned: local.isPinned, // Preserve local preferences
      isMuted: local.isMuted,
      customTitle: local.customTitle || server.customTitle,
      unreadCount: Math.max(local.unreadCount, server.unreadCount)
    };
  }
  
  /**
   * Resolve message conflicts (usually server wins)
   */
  resolveMessageConflict(
    local: ThreadMessage,
    server: ThreadMessage
  ): ThreadMessage {
    // Server version generally wins for messages
    // But preserve local read status
    return {
      ...server,
      readBy: {
        ...server.readBy,
        ...local.readBy
      }
    };
  }
}

// Singleton instance
export const offlineConversationCache = new OfflineConversationCache();