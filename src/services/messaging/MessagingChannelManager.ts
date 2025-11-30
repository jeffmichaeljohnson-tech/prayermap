/**
 * Advanced Messaging Channel Manager for PrayerMap
 * Provides WhatsApp-level real-time messaging performance
 * 
 * Features:
 * - Channel multiplexing for efficient resource usage
 * - Mobile battery optimization
 * - Automatic reconnection and error recovery
 * - Message delivery tracking
 * - Typing indicators
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  content_url?: string;
  status: MessageStatus;
  created_at: string;
  delivered_at?: string;
  read_at?: string;
  reply_to_id?: string;
  is_anonymous: boolean;
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface TypingIndicator {
  user_id: string;
  user_name: string;
  conversation_id: string;
  is_typing: boolean;
  last_updated: string;
}

export interface MessageDeliveryUpdate {
  message_id: string;
  status: MessageStatus;
  delivered_to?: string;
  read_by?: string;
  timestamp: string;
}

export interface MessagingCallbacks {
  onNewMessage: (message: Message) => void;
  onMessageStatusUpdate: (update: MessageDeliveryUpdate) => void;
  onTypingUpdate: (typing: TypingIndicator) => void;
  onConversationUpdate: (conversationId: string, lastActivity: string) => void;
  onError: (error: Error, context: string) => void;
}

export interface ChannelOptions {
  enableBatching?: boolean;
  batchInterval?: number;
  enableCompression?: boolean;
  mobileOptimized?: boolean;
  backgroundMode?: boolean;
}

export class MessagingChannelManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, MessagingCallbacks> = new Map();
  private isActive = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private batchQueue: Map<string, any[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private options: Required<ChannelOptions>;
  private connectionState: 'active' | 'background' | 'disconnected' = 'active';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(options: ChannelOptions = {}) {
    this.options = {
      enableBatching: options.enableBatching ?? true,
      batchInterval: options.batchInterval ?? 100, // 100ms batching
      enableCompression: options.enableCompression ?? false, // Can be enabled for data savings
      mobileOptimized: options.mobileOptimized ?? true,
      backgroundMode: options.backgroundMode ?? false,
    };

    // Listen for app state changes (mobile optimization)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Subscribe to conversation updates with comprehensive real-time features
   */
  public subscribeToConversation(
    conversationId: string, 
    callbacks: MessagingCallbacks
  ): () => void {
    this.subscriptions.set(conversationId, callbacks);
    
    if (!this.isActive) {
      this.start();
    }

    this.setupConversationChannel(conversationId);

    // Return unsubscribe function
    return () => {
      this.unsubscribeFromConversation(conversationId);
    };
  }

  /**
   * Unsubscribe from a conversation
   */
  public unsubscribeFromConversation(conversationId: string): void {
    const channel = this.channels.get(conversationId);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(conversationId);
    }
    this.subscriptions.delete(conversationId);

    // Stop service if no active subscriptions
    if (this.subscriptions.size === 0) {
      this.stop();
    }
  }

  /**
   * Send a message with optimistic updates and delivery tracking
   */
  public async sendMessage(
    conversationId: string,
    content: string,
    contentType: 'text' | 'audio' | 'video',
    contentUrl?: string,
    replyToId?: string
  ): Promise<Message | null> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create optimistic message
      const optimisticMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        sender_name: user.user_metadata?.name || user.email?.split('@')[0] || 'You',
        content,
        content_type: contentType,
        content_url: contentUrl,
        status: MessageStatus.SENDING,
        created_at: new Date().toISOString(),
        reply_to_id: replyToId,
        is_anonymous: false,
      };

      // Trigger optimistic update
      const callbacks = this.subscriptions.get(conversationId);
      if (callbacks) {
        callbacks.onNewMessage(optimisticMessage);
      }

      // Send to backend via prayer_responses table (maintaining compatibility)
      const { data, error } = await supabase
        .from('prayer_responses')
        .insert({
          prayer_id: conversationId,
          responder_id: user.id,
          message: content,
          content_type: contentType,
          media_url: contentUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Convert to Message format and update status
      const sentMessage: Message = {
        id: data.id,
        conversation_id: conversationId,
        sender_id: data.responder_id,
        sender_name: optimisticMessage.sender_name,
        content: data.message,
        content_type: data.content_type,
        content_url: data.media_url,
        status: MessageStatus.SENT,
        created_at: data.created_at,
        reply_to_id: replyToId,
        is_anonymous: false,
      };

      // Update with real message
      if (callbacks) {
        callbacks.onMessageStatusUpdate({
          message_id: tempId,
          status: MessageStatus.SENT,
          timestamp: new Date().toISOString(),
        });
      }

      return sentMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Update status to failed
      const callbacks = this.subscriptions.get(conversationId);
      if (callbacks) {
        callbacks.onMessageStatusUpdate({
          message_id: `temp-${Date.now()}`,
          status: MessageStatus.FAILED,
          timestamp: new Date().toISOString(),
        });
        callbacks.onError(error as Error, 'send_message');
      }

      return null;
    }
  }

  /**
   * Send typing indicator
   */
  public sendTyping(conversationId: string, isTyping: boolean): void {
    const channel = this.channels.get(conversationId);
    if (!channel) return;

    // Broadcast typing status to other participants
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversation_id: conversationId,
        is_typing: isTyping,
        timestamp: new Date().toISOString(),
      }
    });

    // Auto-stop typing after 10 seconds
    if (isTyping) {
      setTimeout(() => {
        this.sendTyping(conversationId, false);
      }, 10000);
    }
  }

  /**
   * Mark message as read
   */
  public async markAsRead(messageId: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      // Update read status in database
      await supabase
        .from('prayer_responses')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);

      // Broadcast read receipt
      const conversations = Array.from(this.channels.keys());
      conversations.forEach(conversationId => {
        const channel = this.channels.get(conversationId);
        if (channel) {
          channel.send({
            type: 'broadcast',
            event: 'message_read',
            payload: {
              message_id: messageId,
              read_by: user.id,
              timestamp: new Date().toISOString(),
            }
          });
        }
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  /**
   * Enable efficient mode for battery conservation
   */
  public enableEfficientMode(): void {
    this.options.backgroundMode = true;
    this.options.batchInterval = 500; // Increase batching interval
    
    // Reduce heartbeat frequency
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.startHeartbeat(60000); // 1 minute instead of 30 seconds
    }

    // Re-setup channels with new settings
    this.channels.forEach((_, conversationId) => {
      this.setupConversationChannel(conversationId);
    });
  }

  /**
   * Disable efficient mode for normal operation
   */
  public disableEfficientMode(): void {
    this.options.backgroundMode = false;
    this.options.batchInterval = 100; // Back to normal
    
    // Restore normal heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.startHeartbeat(30000); // 30 seconds
    }

    // Re-setup channels
    this.channels.forEach((_, conversationId) => {
      this.setupConversationChannel(conversationId);
    });
  }

  /**
   * Get current status and metrics
   */
  public getStatus() {
    return {
      isActive: this.isActive,
      connectionState: this.connectionState,
      activeChannels: this.channels.size,
      activeSubscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
      options: this.options,
      queuedBatches: this.batchQueue.size,
    };
  }

  // Private methods

  private start(): void {
    if (this.isActive) return;

    console.log('[MessagingChannelManager] Starting messaging service');
    this.isActive = true;
    this.startHeartbeat();
    this.startBatchProcessor();
  }

  private stop(): void {
    if (!this.isActive) return;

    console.log('[MessagingChannelManager] Stopping messaging service');
    this.isActive = false;

    // Clean up all channels
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();

    // Clean up timers
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.batchQueue.clear();
    this.reconnectAttempts = 0;
  }

  private setupConversationChannel(conversationId: string): void {
    if (this.channels.has(conversationId)) {
      return; // Already setup
    }

    const channelName = `conversation_${conversationId}`;
    const channel = supabase.channel(channelName);

    // Listen for new messages (prayer_responses inserts)
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'prayer_responses',
      filter: `prayer_id=eq.${conversationId}`
    }, (payload) => {
      this.handleNewMessage(conversationId, payload.new);
    });

    // Listen for message updates (status changes)
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'prayer_responses',
      filter: `prayer_id=eq.${conversationId}`
    }, (payload) => {
      this.handleMessageUpdate(conversationId, payload.new);
    });

    // Listen for typing indicators
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      this.handleTypingBroadcast(conversationId, payload.payload);
    });

    // Listen for read receipts
    channel.on('broadcast', { event: 'message_read' }, (payload) => {
      this.handleReadReceipt(conversationId, payload.payload);
    });

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log(`[MessagingChannelManager] Channel ${channelName} status:`, status);
      
      if (status === 'SUBSCRIBED') {
        this.reconnectAttempts = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.handleChannelError(conversationId);
      }
    });

    this.channels.set(conversationId, channel);
  }

  private handleNewMessage(conversationId: string, messageData: any): void {
    const callbacks = this.subscriptions.get(conversationId);
    if (!callbacks) return;

    const message: Message = {
      id: messageData.id,
      conversation_id: conversationId,
      sender_id: messageData.responder_id,
      sender_name: messageData.responder_name || 'Anonymous',
      content: messageData.message,
      content_type: messageData.content_type,
      content_url: messageData.media_url,
      status: MessageStatus.DELIVERED,
      created_at: messageData.created_at,
      is_anonymous: messageData.is_anonymous || false,
    };

    if (this.options.enableBatching) {
      this.addToBatch(conversationId, 'new_message', message);
    } else {
      callbacks.onNewMessage(message);
    }
  }

  private handleMessageUpdate(conversationId: string, messageData: any): void {
    const callbacks = this.subscriptions.get(conversationId);
    if (!callbacks) return;

    const update: MessageDeliveryUpdate = {
      message_id: messageData.id,
      status: messageData.read_at ? MessageStatus.READ : MessageStatus.DELIVERED,
      timestamp: messageData.read_at || messageData.created_at,
    };

    if (this.options.enableBatching) {
      this.addToBatch(conversationId, 'status_update', update);
    } else {
      callbacks.onMessageStatusUpdate(update);
    }
  }

  private handleTypingBroadcast(conversationId: string, payload: any): void {
    const callbacks = this.subscriptions.get(conversationId);
    if (!callbacks) return;

    const typing: TypingIndicator = {
      user_id: payload.user_id,
      user_name: payload.user_name || 'Anonymous',
      conversation_id: conversationId,
      is_typing: payload.is_typing,
      last_updated: payload.timestamp,
    };

    callbacks.onTypingUpdate(typing);
  }

  private handleReadReceipt(conversationId: string, payload: any): void {
    const callbacks = this.subscriptions.get(conversationId);
    if (!callbacks) return;

    const update: MessageDeliveryUpdate = {
      message_id: payload.message_id,
      status: MessageStatus.READ,
      read_by: payload.read_by,
      timestamp: payload.timestamp,
    };

    callbacks.onMessageStatusUpdate(update);
  }

  private handleChannelError(conversationId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const callbacks = this.subscriptions.get(conversationId);
      if (callbacks) {
        callbacks.onError(
          new Error(`Max reconnection attempts reached for conversation ${conversationId}`),
          'channel_error'
        );
      }
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      if (!this.isActive) return;
      
      // Remove and recreate channel
      const channel = this.channels.get(conversationId);
      if (channel) {
        channel.unsubscribe();
        this.channels.delete(conversationId);
      }
      
      this.setupConversationChannel(conversationId);
    }, delay);
  }

  private addToBatch(conversationId: string, type: string, data: any): void {
    const key = `${conversationId}_${type}`;
    
    if (!this.batchQueue.has(key)) {
      this.batchQueue.set(key, []);
    }
    
    this.batchQueue.get(key)!.push(data);
    
    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatches();
      }, this.options.batchInterval);
    }
  }

  private processBatches(): void {
    this.batchTimer = null;
    
    this.batchQueue.forEach((items, key) => {
      const [conversationId, type] = key.split('_');
      const callbacks = this.subscriptions.get(conversationId);
      
      if (!callbacks) return;
      
      items.forEach(item => {
        if (type === 'new_message') {
          callbacks.onNewMessage(item);
        } else if (type === 'status_update') {
          callbacks.onMessageStatusUpdate(item);
        }
      });
    });
    
    this.batchQueue.clear();
  }

  private startHeartbeat(interval = 30000): void {
    this.heartbeatInterval = setInterval(async () => {
      if (!this.isActive) return;

      try {
        // Simple ping to maintain connection
        await supabase.from('prayers').select('count', { count: 'exact', head: true });
      } catch (error) {
        console.error('[MessagingChannelManager] Heartbeat failed:', error);
        this.connectionState = 'disconnected';
      }
    }, interval);
  }

  private startBatchProcessor(): void {
    // Batch processor is handled by addToBatch and processBatches
    // This method exists for future enhancements
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.connectionState = 'background';
      if (this.options.mobileOptimized) {
        this.enableEfficientMode();
      }
    } else {
      this.connectionState = 'active';
      if (this.options.mobileOptimized) {
        this.disableEfficientMode();
      }
    }
  };

  private handleOnline = (): void => {
    this.connectionState = 'active';
    // Reconnect all channels
    this.channels.forEach((_, conversationId) => {
      this.setupConversationChannel(conversationId);
    });
  };

  private handleOffline = (): void => {
    this.connectionState = 'disconnected';
  };
}

// Singleton instance for global use
export const messagingChannelManager = new MessagingChannelManager({
  enableBatching: true,
  batchInterval: 100,
  mobileOptimized: true,
  enableCompression: false, // Can be enabled for data savings
});