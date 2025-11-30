/**
 * Advanced Read Receipt Service
 * 
 * Provides sophisticated read receipt tracking with:
 * - Bulk conversation marking for efficiency  
 * - Real-time read status broadcasting
 * - Mobile-optimized batch operations
 * - Cross-device synchronization
 */

import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ReadReceipt {
  messageId: string;
  conversationId: string;
  userId: string;
  userName: string;
  readAt: Date;
  deviceId?: string;
}

export interface ReadReceiptOptions {
  batchSize?: number;
  broadcastDelay?: number;
  enableDeviceTracking?: boolean;
}

class ReadReceiptService {
  private readReceiptCache = new Map<string, ReadReceipt[]>();
  private pendingBroadcasts = new Map<string, NodeJS.Timeout>();
  private channels = new Map<string, RealtimeChannel>();
  private options: Required<ReadReceiptOptions>;

  constructor(options: ReadReceiptOptions = {}) {
    this.options = {
      batchSize: 50,
      broadcastDelay: 500,
      enableDeviceTracking: true,
      ...options
    };
  }

  /**
   * Mark a single message as read
   * Optimized for individual message interactions
   */
  async markMessageRead(
    messageId: string,
    userId: string,
    userName: string,
    deviceId?: string
  ): Promise<ReadReceipt | null> {
    try {
      const { data, error } = await supabase.rpc('mark_message_read', {
        p_message_id: messageId,
        p_user_id: userId,
        p_user_name: userName,
        p_device_id: deviceId || this.getDeviceId()
      });

      if (error) throw error;

      const readReceipt: ReadReceipt = {
        messageId,
        conversationId: data.conversation_id,
        userId,
        userName,
        readAt: new Date(data.read_at),
        deviceId: deviceId || this.getDeviceId()
      };

      // Update local cache
      this.updateCache(messageId, readReceipt);

      // Schedule broadcast (debounced)
      this.scheduleBroadcast(readReceipt.conversationId, readReceipt);

      console.log(`Marked message ${messageId} as read by ${userName}`);
      return readReceipt;

    } catch (error) {
      console.error('Failed to mark message as read:', error);
      return null;
    }
  }

  /**
   * Mark entire conversation as read (bulk operation)
   * Highly optimized for mobile "mark all as read" scenarios
   */
  async markConversationRead(
    conversationId: string,
    userId: string,
    userName: string,
    specificMessageIds?: string[]
  ): Promise<number> {
    try {
      const { data: readCount, error } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
        p_user_id: userId,
        p_user_name: userName,
        p_message_ids: specificMessageIds || null
      });

      if (error) throw error;

      // Broadcast conversation read update
      await this.broadcastConversationRead(conversationId, userId, readCount);

      console.log(`Marked ${readCount} messages as read in conversation ${conversationId}`);
      return readCount || 0;

    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
      return 0;
    }
  }

  /**
   * Get read receipts for a specific message
   */
  async getMessageReadReceipts(messageId: string): Promise<ReadReceipt[]> {
    // Check cache first
    const cached = this.readReceiptCache.get(messageId);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('read_receipts')
        .select('*')
        .eq('message_id', messageId)
        .order('read_at', { ascending: true });

      if (error) throw error;

      const receipts = (data || []).map(row => ({
        messageId: row.message_id,
        conversationId: row.conversation_id,
        userId: row.user_id,
        userName: row.user_name,
        readAt: new Date(row.read_at),
        deviceId: row.device_id
      }));

      // Update cache
      this.readReceiptCache.set(messageId, receipts);

      return receipts;

    } catch (error) {
      console.error('Failed to get read receipts:', error);
      return [];
    }
  }

  /**
   * Get conversation read status for a user
   * Returns last read timestamp and unread count
   */
  async getConversationReadStatus(
    conversationId: string,
    userId: string
  ): Promise<{ lastRead: Date | null; unreadCount: number }> {
    try {
      const { data, error } = await supabase
        .from('conversation_metadata')
        .select('last_read_by, unread_count_by_user')
        .eq('prayer_id', conversationId)
        .single();

      if (error) throw error;

      const lastReadData = data?.last_read_by?.[userId];
      const unreadCount = data?.unread_count_by_user?.[userId] || 0;

      return {
        lastRead: lastReadData ? new Date(lastReadData) : null,
        unreadCount
      };

    } catch (error) {
      console.error('Failed to get conversation read status:', error);
      return { lastRead: null, unreadCount: 0 };
    }
  }

  /**
   * Subscribe to read receipt updates for a conversation
   */
  subscribeToReadReceipts(
    conversationId: string,
    callback: (event: ReadReceiptEvent) => void
  ): () => void {
    const channelName = `read_receipts_${conversationId}`;

    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'message_read' }, (payload) => {
        const receipt = payload.payload as ReadReceipt & { type: 'message_read' };
        callback({
          type: 'message_read',
          receipt: {
            ...receipt,
            readAt: new Date(receipt.readAt)
          }
        });
      })
      .on('broadcast', { event: 'conversation_read' }, (payload) => {
        callback({
          type: 'conversation_read',
          userId: payload.payload.userId,
          messageIds: payload.payload.messageIds,
          readCount: payload.payload.readCount
        });
      })
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Get read receipt status display (for message UI)
   */
  getReadStatusDisplay(messageId: string, totalParticipants: number): ReadReceiptStatus {
    const receipts = this.readReceiptCache.get(messageId) || [];
    
    if (receipts.length === 0) {
      return { status: 'sent', icon: 'check', count: 0 };
    }
    
    if (receipts.length === totalParticipants - 1) { // Exclude sender
      return { status: 'read_by_all', icon: 'double-check-blue', count: receipts.length };
    }
    
    return { status: 'read_by_some', icon: 'double-check', count: receipts.length };
  }

  /**
   * Batch mark multiple messages as read (for scroll-based reading)
   * Optimized for mobile performance
   */
  async batchMarkMessagesRead(
    messageIds: string[],
    userId: string,
    userName: string
  ): Promise<Map<string, ReadReceipt | null>> {
    const results = new Map<string, ReadReceipt | null>();
    
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < messageIds.length; i += this.options.batchSize) {
      const batch = messageIds.slice(i, i + this.options.batchSize);
      
      const batchPromises = batch.map(messageId => 
        this.markMessageRead(messageId, userId, userName)
          .then(receipt => [messageId, receipt] as const)
          .catch(error => {
            console.error(`Failed to mark message ${messageId} as read:`, error);
            return [messageId, null] as const;
          })
      );
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(([messageId, receipt]) => {
        results.set(messageId, receipt);
      });
      
      // Small delay between batches to avoid rate limiting
      if (i + this.options.batchSize < messageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Check if user has read a specific message
   */
  isMessageReadByUser(messageId: string, userId: string): boolean {
    const receipts = this.readReceiptCache.get(messageId) || [];
    return receipts.some(receipt => receipt.userId === userId);
  }

  /**
   * Get unread message count for a conversation
   */
  async getUnreadMessageCount(conversationId: string, userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('prayer_responses')
        .select('id')
        .eq('prayer_id', conversationId)
        .neq('responder_id', userId) // Don't count own messages
        .not('id', 'in', `(
          SELECT message_id 
          FROM read_receipts 
          WHERE user_id = '${userId}'
        )`);

      if (error) throw error;

      return data?.length || 0;

    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Schedule debounced broadcast for read receipt
   */
  private scheduleBroadcast(conversationId: string, readReceipt: ReadReceipt): void {
    // Clear existing broadcast timer
    const existingTimer = this.pendingBroadcasts.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new broadcast
    const timer = setTimeout(() => {
      this.broadcastReadReceipt(conversationId, readReceipt);
      this.pendingBroadcasts.delete(conversationId);
    }, this.options.broadcastDelay);

    this.pendingBroadcasts.set(conversationId, timer);
  }

  /**
   * Broadcast single read receipt
   */
  private async broadcastReadReceipt(conversationId: string, readReceipt: ReadReceipt): Promise<void> {
    const channelName = `read_receipts_${conversationId}`;
    
    try {
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'message_read',
        payload: readReceipt
      });
    } catch (error) {
      console.error('Failed to broadcast read receipt:', error);
    }
  }

  /**
   * Broadcast conversation read event
   */
  private async broadcastConversationRead(
    conversationId: string,
    userId: string,
    readCount: number
  ): Promise<void> {
    const channelName = `read_receipts_${conversationId}`;
    
    try {
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'conversation_read',
        payload: {
          userId,
          readCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to broadcast conversation read:', error);
    }
  }

  /**
   * Update local cache with new read receipt
   */
  private updateCache(messageId: string, readReceipt: ReadReceipt): void {
    if (!this.readReceiptCache.has(messageId)) {
      this.readReceiptCache.set(messageId, []);
    }
    
    const receipts = this.readReceiptCache.get(messageId)!;
    const existingIndex = receipts.findIndex(r => r.userId === readReceipt.userId);
    
    if (existingIndex >= 0) {
      receipts[existingIndex] = readReceipt;
    } else {
      receipts.push(readReceipt);
    }
  }

  /**
   * Get device ID for tracking cross-device reads
   */
  private getDeviceId(): string {
    if (!this.options.enableDeviceTracking) {
      return 'default';
    }

    // Try to get a persistent device ID
    let deviceId = localStorage.getItem('prayermap_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('prayermap_device_id', deviceId);
    }
    
    return deviceId;
  }

  /**
   * Clear cache for memory management
   */
  clearCache(messageIds?: string[]): void {
    if (messageIds) {
      messageIds.forEach(id => this.readReceiptCache.delete(id));
    } else {
      this.readReceiptCache.clear();
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Clear pending broadcasts
    for (const timer of this.pendingBroadcasts.values()) {
      clearTimeout(timer);
    }
    this.pendingBroadcasts.clear();

    // Unsubscribe from channels
    for (const channel of this.channels.values()) {
      channel.unsubscribe();
    }
    this.channels.clear();

    // Clear cache
    this.readReceiptCache.clear();

    console.log('ReadReceiptService cleaned up');
  }
}

// Types for read receipt events and status
export interface ReadReceiptEvent {
  type: 'message_read' | 'conversation_read';
  receipt?: ReadReceipt;
  userId?: string;
  messageIds?: string[];
  readCount?: number;
}

export interface ReadReceiptStatus {
  status: 'sent' | 'delivered' | 'read_by_some' | 'read_by_all';
  icon: 'check' | 'double-check' | 'double-check-blue';
  count: number;
}

// Singleton instance
export const readReceiptService = new ReadReceiptService();

// Export for testing
export { ReadReceiptService };

// Re-export types to ensure they're available
export type { ReadReceipt, ReadReceiptEvent, ReadReceiptOptions, ReadReceiptStatus };