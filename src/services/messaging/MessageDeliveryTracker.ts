/**
 * Message Delivery Tracker for PrayerMap
 * WhatsApp-style message delivery confirmation system
 * 
 * Features:
 * - Optimistic updates with rollback on failure
 * - Delivery confirmation tracking
 * - Retry logic with exponential backoff
 * - Network-aware delivery management
 * - Mobile battery optimization
 */

import { MessageStatus, type Message } from './MessagingChannelManager';
import { supabase } from '../../lib/supabase';

export interface MessageData {
  conversation_id: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  content_url?: string;
  reply_to_id?: string;
  is_anonymous?: boolean;
}

export interface DeliveryOptions {
  enableRetry?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
  enableOptimisticUpdate?: boolean;
  trackDelivery?: boolean;
}

export interface MessageRetryInfo {
  attempts: number;
  lastAttempt: Date;
  nextRetry: Date;
  error?: string;
}

export interface DeliveryMetrics {
  totalMessages: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  retryRate: number;
}

export class MessageDeliveryTracker {
  private pendingMessages: Map<string, Message> = new Map();
  private retryQueue: Map<string, MessageRetryInfo> = new Map();
  private deliveryCallbacks: Map<string, (status: MessageStatus, messageId: string) => void> = new Map();
  private isOnline = navigator.onLine;
  private retryTimer: NodeJS.Timeout | null = null;
  private metrics: DeliveryMetrics = {
    totalMessages: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    averageDeliveryTime: 0,
    retryRate: 0,
  };

  private defaultOptions: Required<DeliveryOptions> = {
    enableRetry: true,
    maxRetryAttempts: 5,
    retryDelay: 1000, // Start with 1 second
    enableOptimisticUpdate: true,
    trackDelivery: true,
  };

  constructor() {
    // Listen for network changes
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Start retry processor
    this.startRetryProcessor();
  }

  /**
   * Send a message with comprehensive delivery tracking
   */
  public async sendMessage(
    messageData: MessageData,
    options: DeliveryOptions = {}
  ): Promise<Message | null> {
    const opts = { ...this.defaultOptions, ...options };
    this.metrics.totalMessages++;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      // Create optimistic message
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: messageData.conversation_id,
        sender_id: user.id,
        sender_name: user.user_metadata?.name || user.email?.split('@')[0] || 'You',
        content: messageData.content,
        content_type: messageData.content_type,
        content_url: messageData.content_url,
        status: MessageStatus.SENDING,
        created_at: timestamp,
        reply_to_id: messageData.reply_to_id,
        is_anonymous: messageData.is_anonymous || false,
      };

      // Store for tracking
      this.pendingMessages.set(tempId, optimisticMessage);

      const startTime = Date.now();

      try {
        // Attempt to send to server
        const { data, error } = await supabase
          .from('prayer_responses')
          .insert({
            prayer_id: messageData.conversation_id,
            responder_id: user.id,
            message: messageData.content,
            content_type: messageData.content_type,
            media_url: messageData.content_url,
            is_anonymous: messageData.is_anonymous || false,
          })
          .select()
          .single();

        if (error) throw error;

        const deliveryTime = Date.now() - startTime;
        this.updateMetrics(true, deliveryTime);

        // Create final message
        const sentMessage: Message = {
          id: data.id,
          conversation_id: messageData.conversation_id,
          sender_id: data.responder_id,
          sender_name: optimisticMessage.sender_name,
          content: data.message,
          content_type: data.content_type,
          content_url: data.media_url,
          status: MessageStatus.SENT,
          created_at: data.created_at,
          reply_to_id: messageData.reply_to_id,
          is_anonymous: data.is_anonymous,
        };

        // Clean up pending
        this.pendingMessages.delete(tempId);
        this.retryQueue.delete(tempId);

        // Trigger delivery callback
        const callback = this.deliveryCallbacks.get(tempId);
        if (callback) {
          callback(MessageStatus.SENT, data.id);
          this.deliveryCallbacks.delete(tempId);
        }

        return sentMessage;

      } catch (sendError) {
        console.error('Failed to send message:', sendError);

        if (opts.enableRetry && this.isOnline) {
          // Queue for retry
          this.queueForRetry(tempId, sendError as Error, opts);
          
          // Update status to sending (will retry)
          optimisticMessage.status = MessageStatus.SENDING;
          this.pendingMessages.set(tempId, optimisticMessage);
          
          return optimisticMessage;
        } else {
          // Mark as failed
          optimisticMessage.status = MessageStatus.FAILED;
          this.pendingMessages.delete(tempId);
          this.updateMetrics(false, 0);

          const callback = this.deliveryCallbacks.get(tempId);
          if (callback) {
            callback(MessageStatus.FAILED, tempId);
            this.deliveryCallbacks.delete(tempId);
          }

          return optimisticMessage;
        }
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      this.updateMetrics(false, 0);
      return null;
    }
  }

  /**
   * Track delivery status for a message
   */
  public async trackDeliveryStatus(messageId: string): Promise<MessageStatus> {
    try {
      // Check if it's a pending message
      const pendingMessage = this.pendingMessages.get(messageId);
      if (pendingMessage) {
        return pendingMessage.status;
      }

      // Check database for actual status
      const { data, error } = await supabase
        .from('prayer_responses')
        .select('created_at, read_at')
        .eq('id', messageId)
        .single();

      if (error) {
        console.error('Error tracking delivery status:', error);
        return MessageStatus.FAILED;
      }

      if (!data) {
        return MessageStatus.FAILED;
      }

      if (data.read_at) {
        return MessageStatus.READ;
      }

      return MessageStatus.DELIVERED;
    } catch (error) {
      console.error('Error in trackDeliveryStatus:', error);
      return MessageStatus.FAILED;
    }
  }

  /**
   * Register a callback for delivery status updates
   */
  public onDeliveryStatusUpdate(
    messageId: string,
    callback: (status: MessageStatus, messageId: string) => void
  ): () => void {
    this.deliveryCallbacks.set(messageId, callback);

    // Return unsubscribe function
    return () => {
      this.deliveryCallbacks.delete(messageId);
    };
  }

  /**
   * Retry failed messages manually
   */
  public async retryFailedMessages(): Promise<void> {
    const failedMessages = Array.from(this.pendingMessages.values())
      .filter(msg => msg.status === MessageStatus.FAILED);

    console.log(`[MessageDeliveryTracker] Retrying ${failedMessages.length} failed messages`);

    for (const message of failedMessages) {
      if (this.retryQueue.has(message.id)) {
        continue; // Already queued for retry
      }

      const messageData: MessageData = {
        conversation_id: message.conversation_id,
        content: message.content,
        content_type: message.content_type,
        content_url: message.content_url,
        reply_to_id: message.reply_to_id,
        is_anonymous: message.is_anonymous,
      };

      // Reset status and retry
      message.status = MessageStatus.SENDING;
      this.pendingMessages.set(message.id, message);
      
      await this.sendMessage(messageData);
    }
  }

  /**
   * Get current delivery metrics
   */
  public getMetrics(): DeliveryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pending messages count
   */
  public getPendingMessagesCount(): number {
    return this.pendingMessages.size;
  }

  /**
   * Get retry queue status
   */
  public getRetryQueueStatus(): Array<{ messageId: string; attempts: number; nextRetry: Date }> {
    return Array.from(this.retryQueue.entries()).map(([messageId, info]) => ({
      messageId,
      attempts: info.attempts,
      nextRetry: info.nextRetry,
    }));
  }

  /**
   * Clear failed messages from queue
   */
  public clearFailedMessages(): void {
    const failedIds: string[] = [];
    
    this.pendingMessages.forEach((message, id) => {
      if (message.status === MessageStatus.FAILED) {
        failedIds.push(id);
      }
    });

    failedIds.forEach(id => {
      this.pendingMessages.delete(id);
      this.retryQueue.delete(id);
      this.deliveryCallbacks.delete(id);
    });

    console.log(`[MessageDeliveryTracker] Cleared ${failedIds.length} failed messages`);
  }

  // Private methods

  private queueForRetry(messageId: string, error: Error, options: Required<DeliveryOptions>): void {
    const existingRetry = this.retryQueue.get(messageId);
    const attempts = existingRetry ? existingRetry.attempts + 1 : 1;

    if (attempts > options.maxRetryAttempts) {
      console.log(`[MessageDeliveryTracker] Max retry attempts reached for message ${messageId}`);
      
      // Mark as failed
      const message = this.pendingMessages.get(messageId);
      if (message) {
        message.status = MessageStatus.FAILED;
        this.pendingMessages.set(messageId, message);
      }
      
      this.retryQueue.delete(messageId);
      this.updateMetrics(false, 0);
      return;
    }

    // Calculate exponential backoff delay
    const delay = options.retryDelay * Math.pow(2, attempts - 1);
    const nextRetry = new Date(Date.now() + delay);

    this.retryQueue.set(messageId, {
      attempts,
      lastAttempt: new Date(),
      nextRetry,
      error: error.message,
    });

    console.log(`[MessageDeliveryTracker] Queued message ${messageId} for retry attempt ${attempts} in ${delay}ms`);
  }

  private startRetryProcessor(): void {
    this.retryTimer = setInterval(() => {
      this.processRetryQueue();
    }, 5000); // Check every 5 seconds
  }

  private async processRetryQueue(): Promise<void> {
    if (!this.isOnline) return;

    const now = Date.now();
    const readyToRetry: string[] = [];

    this.retryQueue.forEach((retryInfo, messageId) => {
      if (retryInfo.nextRetry.getTime() <= now) {
        readyToRetry.push(messageId);
      }
    });

    if (readyToRetry.length === 0) return;

    console.log(`[MessageDeliveryTracker] Processing ${readyToRetry.length} messages for retry`);

    for (const messageId of readyToRetry) {
      const message = this.pendingMessages.get(messageId);
      const retryInfo = this.retryQueue.get(messageId);
      
      if (!message || !retryInfo) continue;

      try {
        // Attempt to resend
        const messageData: MessageData = {
          conversation_id: message.conversation_id,
          content: message.content,
          content_type: message.content_type,
          content_url: message.content_url,
          reply_to_id: message.reply_to_id,
          is_anonymous: message.is_anonymous,
        };

        const result = await this.sendMessage(messageData, { enableRetry: false });
        
        if (result && result.status === MessageStatus.SENT) {
          // Success - clean up retry queue
          this.retryQueue.delete(messageId);
          console.log(`[MessageDeliveryTracker] Successfully retried message ${messageId}`);
        }
      } catch (error) {
        console.error(`[MessageDeliveryTracker] Retry failed for message ${messageId}:`, error);
        // Will be queued again if under max attempts
      }
    }
  }

  private updateMetrics(success: boolean, deliveryTime: number): void {
    if (success) {
      this.metrics.successfulDeliveries++;
      
      // Update average delivery time (rolling average)
      if (this.metrics.averageDeliveryTime === 0) {
        this.metrics.averageDeliveryTime = deliveryTime;
      } else {
        this.metrics.averageDeliveryTime = 
          (this.metrics.averageDeliveryTime + deliveryTime) / 2;
      }
    } else {
      this.metrics.failedDeliveries++;
    }

    // Calculate retry rate
    this.metrics.retryRate = this.retryQueue.size / this.metrics.totalMessages;
  }

  private handleOnline = (): void => {
    console.log('[MessageDeliveryTracker] Network back online, processing retry queue');
    this.isOnline = true;
    this.processRetryQueue();
  };

  private handleOffline = (): void => {
    console.log('[MessageDeliveryTracker] Network offline, pausing message delivery');
    this.isOnline = false;
  };

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    this.pendingMessages.clear();
    this.retryQueue.clear();
    this.deliveryCallbacks.clear();
  }
}

// Singleton instance
export const messageDeliveryTracker = new MessageDeliveryTracker();