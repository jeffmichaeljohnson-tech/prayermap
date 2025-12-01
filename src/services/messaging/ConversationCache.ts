/**
 * Conversation Cache - Core conversation and message caching
 * 
 * Extracted from offlineConversationCache.ts for focused conversation management.
 * Handles caching conversations, messages, and participants with IndexedDB.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  ConversationThread,
  ThreadMessage,
  ConversationParticipant,
  MobileConversationCache
} from '../../types/conversation';

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
}

export interface ConversationCacheConfig {
  maxConversations: number;
  maxMessagesPerConversation: number;
  cacheRetentionDays: number;
  autoCleanupEnabled: boolean;
}

export class ConversationCache {
  private static instance: ConversationCache;
  private db: IDBPDatabase<ConversationDB> | null = null;
  private isInitialized = false;
  private config: ConversationCacheConfig;

  private constructor() {
    this.config = {
      maxConversations: 100,
      maxMessagesPerConversation: 1000,
      cacheRetentionDays: 30,
      autoCleanupEnabled: true
    };
  }

  static getInstance(): ConversationCache {
    if (!ConversationCache.instance) {
      ConversationCache.instance = new ConversationCache();
    }
    return ConversationCache.instance;
  }

  /**
   * Initialize the conversation cache
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await openDB<ConversationDB>('PrayerMapConversations', 2, {
        upgrade(db, oldVersion, newVersion, transaction) {
          if (oldVersion < 1) {
            // Conversations store
            const conversationStore = db.createObjectStore('conversations', {
              keyPath: 'id'
            });
            conversationStore.createIndex('by-lastActivity', 'lastActivity');
            conversationStore.createIndex('by-created', 'createdAt');
            conversationStore.createIndex('by-unread', 'unreadCount');
            conversationStore.createIndex('by-pinned', 'isPinned');

            // Messages store
            const messageStore = db.createObjectStore('messages', {
              keyPath: 'id'
            });
            messageStore.createIndex('by-thread', 'threadId');
            messageStore.createIndex('by-created', 'createdAt');
            messageStore.createIndex('by-sender', 'senderId');
            messageStore.createIndex('by-type', 'messageType');

            // Participants store
            const participantStore = db.createObjectStore('participants', {
              keyPath: 'id'
            });
            participantStore.createIndex('by-thread', 'threadId');
            participantStore.createIndex('by-user', 'userId');
          }
        }
      });

      this.isInitialized = true;
      console.log('💬 Conversation cache initialized');

      // Auto-cleanup if enabled
      if (this.config.autoCleanupEnabled) {
        this.scheduleCleanup();
      }

    } catch (error) {
      console.error('Failed to initialize conversation cache:', error);
      throw error;
    }
  }

  /**
   * Cache conversations with intelligent storage
   */
  async cacheConversations(
    conversations: ConversationThread[],
    options: { replace?: boolean; updateLastActivity?: boolean } = {}
  ): Promise<void> {
    if (!this.db) throw new Error('Cache not initialized');

    const tx = this.db.transaction('conversations', 'readwrite');
    const store = tx.objectStore('conversations');
    
    const timestamp = Date.now();
    
    try {
      for (const conversation of conversations) {
        const cached = {
          ...conversation,
          lastSyncedAt: timestamp,
          ...(options.updateLastActivity && { lastActivity: new Date() })
        };
        
        if (options.replace) {
          await store.put(cached);
        } else {
          // Only update if newer or doesn't exist
          const existing = await store.get(conversation.id);
          if (!existing || existing.lastSyncedAt < timestamp) {
            await store.put(cached);
          }
        }
      }
      
      await tx.done;
      console.log(`📦 Cached ${conversations.length} conversations`);
      
    } catch (error) {
      console.error('Failed to cache conversations:', error);
      throw error;
    }
  }

  /**
   * Get cached conversations with filtering
   */
  async getCachedConversations(
    filters: {
      unreadOnly?: boolean;
      pinnedOnly?: boolean;
      limit?: number;
      offset?: number;
      searchText?: string;
    } = {}
  ): Promise<ConversationThread[]> {
    if (!this.db) throw new Error('Cache not initialized');

    try {
      const tx = this.db.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');
      
      let conversations: (ConversationThread & { lastSyncedAt: number })[] = [];
      
      if (filters.unreadOnly) {
        const index = store.index('by-unread');
        const results = await index.getAll(IDBKeyRange.lowerBound(1));
        conversations = results;
      } else if (filters.pinnedOnly) {
        const index = store.index('by-pinned');
        const results = await index.getAll(true);
        conversations = results;
      } else {
        const index = store.index('by-lastActivity');
        const results = await index.getAll();
        conversations = results.reverse(); // Most recent first
      }
      
      // Apply search filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        conversations = conversations.filter(conv => 
          conv.title.toLowerCase().includes(searchLower) ||
          conv.lastMessage?.content?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply pagination
      if (filters.offset || filters.limit) {
        const start = filters.offset || 0;
        const end = filters.limit ? start + filters.limit : undefined;
        conversations = conversations.slice(start, end);
      }
      
      // Remove internal fields
      return conversations.map(({ lastSyncedAt, ...conv }) => conv);
      
    } catch (error) {
      console.error('Failed to get cached conversations:', error);
      return [];
    }
  }

  /**
   * Cache messages for conversations
   */
  async cacheMessages(
    messages: ThreadMessage[],
    options: { replace?: boolean } = {}
  ): Promise<void> {
    if (!this.db) throw new Error('Cache not initialized');

    const tx = this.db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    
    const timestamp = Date.now();
    
    try {
      for (const message of messages) {
        const cached = {
          ...message,
          lastSyncedAt: timestamp
        };
        
        if (options.replace) {
          await store.put(cached);
        } else {
          // Only update if newer or doesn't exist
          const existing = await store.get(message.id);
          if (!existing || existing.lastSyncedAt < timestamp) {
            await store.put(cached);
          }
        }
      }
      
      await tx.done;
      console.log(`💬 Cached ${messages.length} messages`);
      
      // Manage cache size per conversation
      if (this.config.autoCleanupEnabled) {
        await this.manageCacheSizeForMessages(messages);
      }
      
    } catch (error) {
      console.error('Failed to cache messages:', error);
      throw error;
    }
  }

  /**
   * Get cached messages for a conversation
   */
  async getCachedMessages(
    threadId: string,
    options: {
      limit?: number;
      offset?: number;
      messageType?: string;
      senderId?: string;
      before?: Date;
      after?: Date;
    } = {}
  ): Promise<ThreadMessage[]> {
    if (!this.db) throw new Error('Cache not initialized');

    try {
      const tx = this.db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('by-thread');
      
      let messages = await index.getAll(threadId);
      
      // Apply filters
      if (options.messageType) {
        messages = messages.filter(msg => msg.messageType === options.messageType);
      }
      
      if (options.senderId) {
        messages = messages.filter(msg => msg.senderId === options.senderId);
      }
      
      if (options.before) {
        messages = messages.filter(msg => new Date(msg.createdAt) < options.before!);
      }
      
      if (options.after) {
        messages = messages.filter(msg => new Date(msg.createdAt) > options.after!);
      }
      
      // Sort by creation date
      messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Apply pagination
      if (options.offset || options.limit) {
        const start = options.offset || 0;
        const end = options.limit ? start + options.limit : undefined;
        messages = messages.slice(start, end);
      }
      
      // Remove internal fields
      return messages.map(({ lastSyncedAt, ...msg }) => msg);
      
    } catch (error) {
      console.error('Failed to get cached messages:', error);
      return [];
    }
  }

  /**
   * Get cached message replies (threading)
   */
  async getCachedMessageReplies(parentMessageId: string): Promise<ThreadMessage[]> {
    if (!this.db) throw new Error('Cache not initialized');

    try {
      const allMessages = await this.db.getAll('messages');
      const replies = allMessages.filter(msg => 
        msg.parentMessageId === parentMessageId
      );
      
      // Sort by creation date
      replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Remove internal fields
      return replies.map(({ lastSyncedAt, ...msg }) => msg);
      
    } catch (error) {
      console.error('Failed to get cached message replies:', error);
      return [];
    }
  }

  /**
   * Cache conversation participants
   */
  async cacheParticipants(participants: ConversationParticipant[]): Promise<void> {
    if (!this.db) throw new Error('Cache not initialized');

    const tx = this.db.transaction('participants', 'readwrite');
    const store = tx.objectStore('participants');
    
    const timestamp = Date.now();
    
    try {
      for (const participant of participants) {
        const cached = {
          ...participant,
          lastSyncedAt: timestamp
        };
        
        await store.put(cached);
      }
      
      await tx.done;
      console.log(`👥 Cached ${participants.length} participants`);
      
    } catch (error) {
      console.error('Failed to cache participants:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    conversationCount: number;
    messageCount: number;
    participantCount: number;
    totalSizeEstimate: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    if (!this.db) throw new Error('Cache not initialized');

    try {
      const [conversations, messages, participants] = await Promise.all([
        this.db.getAll('conversations'),
        this.db.getAll('messages'),
        this.db.getAll('participants')
      ]);

      // Estimate size (rough calculation)
      const totalSizeEstimate = 
        conversations.length * 1000 + // ~1KB per conversation
        messages.length * 500 + // ~500B per message
        participants.length * 200; // ~200B per participant

      // Find date range
      const allDates = [
        ...conversations.map(c => new Date(c.createdAt)),
        ...messages.map(m => new Date(m.createdAt))
      ];
      
      const oldestEntry = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null;
      const newestEntry = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null;

      return {
        conversationCount: conversations.length,
        messageCount: messages.length,
        participantCount: participants.length,
        totalSizeEstimate,
        oldestEntry,
        newestEntry
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        conversationCount: 0,
        messageCount: 0,
        participantCount: 0,
        totalSizeEstimate: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    if (!this.db) throw new Error('Cache not initialized');

    try {
      const tx = this.db.transaction(['conversations', 'messages', 'participants'], 'readwrite');
      
      await Promise.all([
        tx.objectStore('conversations').clear(),
        tx.objectStore('messages').clear(),
        tx.objectStore('participants').clear()
      ]);
      
      await tx.done;
      console.log('🗑️ Conversation cache cleared');
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<ConversationCacheConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ Conversation cache config updated', config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ConversationCacheConfig {
    return { ...this.config };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async manageCacheSizeForMessages(newMessages: ThreadMessage[]): Promise<void> {
    if (!this.db) return;

    // Group messages by thread
    const messagesByThread = newMessages.reduce((acc, msg) => {
      if (!acc[msg.threadId]) acc[msg.threadId] = [];
      acc[msg.threadId].push(msg);
      return acc;
    }, {} as Record<string, ThreadMessage[]>);

    // Check each thread for size limits
    for (const threadId of Object.keys(messagesByThread)) {
      await this.manageCacheSizeForThread(threadId);
    }
  }

  private async manageCacheSizeForThread(threadId: string): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      const index = store.index('by-thread');
      
      const messages = await index.getAll(threadId);
      
      if (messages.length > this.config.maxMessagesPerConversation) {
        // Sort by creation date and remove oldest
        messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        const toRemove = messages.slice(0, messages.length - this.config.maxMessagesPerConversation);
        
        for (const message of toRemove) {
          await store.delete(message.id);
        }
        
        console.log(`🗑️ Removed ${toRemove.length} old messages from thread ${threadId}`);
      }
      
      await tx.done;
    } catch (error) {
      console.error(`Failed to manage cache size for thread ${threadId}:`, error);
    }
  }

  private scheduleCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.performCleanup().catch(console.error);
    }, 60 * 60 * 1000);

    // Initial cleanup after 5 minutes
    setTimeout(() => {
      this.performCleanup().catch(console.error);
    }, 5 * 60 * 1000);
  }

  private async performCleanup(): Promise<void> {
    if (!this.db) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.cacheRetentionDays);

      const tx = this.db.transaction(['conversations', 'messages', 'participants'], 'readwrite');
      
      // Clean old conversations
      const conversationStore = tx.objectStore('conversations');
      const conversationIndex = conversationStore.index('by-lastActivity');
      const oldConversations = await conversationIndex.getAll(IDBKeyRange.upperBound(cutoffDate));
      
      for (const conversation of oldConversations) {
        await conversationStore.delete(conversation.id);
        
        // Also clean related messages and participants
        const messageStore = tx.objectStore('messages');
        const messageIndex = messageStore.index('by-thread');
        const relatedMessages = await messageIndex.getAll(conversation.id);
        
        for (const message of relatedMessages) {
          await messageStore.delete(message.id);
        }
        
        const participantStore = tx.objectStore('participants');
        const participantIndex = participantStore.index('by-thread');
        const relatedParticipants = await participantIndex.getAll(conversation.id);
        
        for (const participant of relatedParticipants) {
          await participantStore.delete(participant.id);
        }
      }
      
      await tx.done;
      
      if (oldConversations.length > 0) {
        console.log(`🗑️ Cleaned up ${oldConversations.length} old conversations`);
      }
      
    } catch (error) {
      console.error('Failed to perform cleanup:', error);
    }
  }
}

// Global conversation cache instance
export const conversationCache = ConversationCache.getInstance();