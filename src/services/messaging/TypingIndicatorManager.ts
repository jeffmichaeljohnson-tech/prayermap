/**
 * Typing Indicator Manager for PrayerMap
 * Efficient typing indicators with auto-cleanup and battery optimization
 * 
 * Features:
 * - Debounced typing broadcasts to reduce network traffic
 * - Automatic timeout and cleanup
 * - Battery-conscious implementation
 * - Multiple user typing state management
 * - Mobile optimization
 */

import { TypingIndicator } from './MessagingChannelManager';

export interface TypingState {
  userId: string;
  userName: string;
  conversationId: string;
  isTyping: boolean;
  startTime: Date;
  lastActivity: Date;
  timeoutId?: NodeJS.Timeout;
}

export interface TypingOptions {
  debounceDelay?: number; // Delay before sending typing indicator
  autoStopDelay?: number; // Auto-stop typing after inactivity
  maxTypingDuration?: number; // Maximum typing duration
  enableBatching?: boolean; // Batch typing indicators
  mobileOptimized?: boolean; // Mobile battery optimization
}

export interface TypingCallbacks {
  onTypingUpdate: (typing: TypingIndicator) => void;
  onTypingStart: (userId: string, userName: string, conversationId: string) => void;
  onTypingStop: (userId: string, conversationId: string) => void;
  onError: (error: Error, context: string) => void;
}

export class TypingIndicatorManager {
  private activeTyping: Map<string, TypingState> = new Map(); // key: `${userId}_${conversationId}`
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Map<string, TypingCallbacks> = new Map(); // key: conversationId
  private broadcastFunction: ((conversationId: string, isTyping: boolean) => void) | null = null;
  private options: Required<TypingOptions>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private batchQueue: Map<string, TypingIndicator[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private isBackgroundMode = false;

  constructor(options: TypingOptions = {}) {
    this.options = {
      debounceDelay: options.debounceDelay ?? 500,
      autoStopDelay: options.autoStopDelay ?? 10000, // 10 seconds
      maxTypingDuration: options.maxTypingDuration ?? 30000, // 30 seconds
      enableBatching: options.enableBatching ?? true,
      mobileOptimized: options.mobileOptimized ?? true,
    };

    // Start cleanup process
    this.startCleanupProcess();

    // Listen for visibility changes for mobile optimization
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Set the broadcast function for sending typing indicators
   */
  public setBroadcastFunction(fn: (conversationId: string, isTyping: boolean) => void): void {
    this.broadcastFunction = fn;
  }

  /**
   * Subscribe to typing updates for a conversation
   */
  public subscribeToConversation(conversationId: string, callbacks: TypingCallbacks): () => void {
    this.callbacks.set(conversationId, callbacks);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(conversationId);
    };
  }

  /**
   * Start typing for a user in a conversation
   */
  public startTyping(conversationId: string, userId: string, userName: string = 'Anonymous'): void {
    const key = `${userId}_${conversationId}`;
    const now = new Date();

    // Get existing typing state or create new one
    let typingState = this.activeTyping.get(key);
    
    if (!typingState) {
      typingState = {
        userId,
        userName,
        conversationId,
        isTyping: false,
        startTime: now,
        lastActivity: now,
      };
    } else {
      typingState.lastActivity = now;
    }

    // Clear existing timeout
    if (typingState.timeoutId) {
      clearTimeout(typingState.timeoutId);
    }

    // Set auto-stop timer
    typingState.timeoutId = setTimeout(() => {
      this.stopTyping(conversationId, userId);
    }, this.options.autoStopDelay);

    this.activeTyping.set(key, typingState);

    // Use debounced broadcast
    this.debouncedBroadcast(conversationId, userId, true);
  }

  /**
   * Stop typing for a user in a conversation
   */
  public stopTyping(conversationId: string, userId: string): void {
    const key = `${userId}_${conversationId}`;
    const typingState = this.activeTyping.get(key);

    if (!typingState) return;

    // Clear timeout
    if (typingState.timeoutId) {
      clearTimeout(typingState.timeoutId);
    }

    // Remove from active typing
    this.activeTyping.delete(key);

    // Clear debounce timer
    const debounceKey = `${conversationId}_${userId}`;
    const debounceTimer = this.debounceTimers.get(debounceKey);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      this.debounceTimers.delete(debounceKey);
    }

    // Immediate broadcast for stop
    this.broadcastTyping(conversationId, userId, false, typingState.userName);
  }

  /**
   * Handle incoming typing indicator from other users
   */
  public handleTypingIndicator(typing: TypingIndicator): void {
    const callbacks = this.callbacks.get(typing.conversation_id);
    if (!callbacks) return;

    const key = `${typing.user_id}_${typing.conversation_id}`;

    if (typing.is_typing) {
      // Update active typing state
      this.activeTyping.set(key, {
        userId: typing.user_id,
        userName: typing.user_name,
        conversationId: typing.conversation_id,
        isTyping: true,
        startTime: new Date(typing.last_updated),
        lastActivity: new Date(typing.last_updated),
      });

      callbacks.onTypingStart(typing.user_id, typing.user_name, typing.conversation_id);
    } else {
      // Remove from active typing
      this.activeTyping.delete(key);
      callbacks.onTypingStop(typing.user_id, typing.conversation_id);
    }

    // Trigger callback
    if (this.options.enableBatching && !this.isBackgroundMode) {
      this.addToBatch(typing.conversation_id, typing);
    } else {
      callbacks.onTypingUpdate(typing);
    }
  }

  /**
   * Get current typing users for a conversation
   */
  public getTypingUsers(conversationId: string): TypingState[] {
    return Array.from(this.activeTyping.values())
      .filter(state => state.conversationId === conversationId && state.isTyping);
  }

  /**
   * Get typing indicator text for display
   */
  public getTypingText(conversationId: string): string | null {
    const typingUsers = this.getTypingUsers(conversationId);
    
    if (typingUsers.length === 0) return null;

    const names = typingUsers.map(user => user.userName || 'Someone');
    
    if (names.length === 1) {
      return `${names[0]} is typing...`;
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    } else {
      return `${names[0]} and ${names.length - 1} others are typing...`;
    }
  }

  /**
   * Clear all typing indicators for a conversation
   */
  public clearConversationTyping(conversationId: string): void {
    const toRemove: string[] = [];
    
    this.activeTyping.forEach((state, key) => {
      if (state.conversationId === conversationId) {
        if (state.timeoutId) {
          clearTimeout(state.timeoutId);
        }
        toRemove.push(key);
      }
    });

    toRemove.forEach(key => this.activeTyping.delete(key));
  }

  /**
   * Enable efficient mode for battery conservation
   */
  public enableEfficientMode(): void {
    this.isBackgroundMode = true;
    this.options.debounceDelay = Math.min(this.options.debounceDelay * 2, 2000); // Increase debounce
    this.options.autoStopDelay = Math.max(this.options.autoStopDelay / 2, 5000); // Reduce auto-stop delay
  }

  /**
   * Disable efficient mode for normal operation
   */
  public disableEfficientMode(): void {
    this.isBackgroundMode = false;
    this.options.debounceDelay = 500; // Reset to normal
    this.options.autoStopDelay = 10000; // Reset to normal
  }

  /**
   * Get current metrics and status
   */
  public getStatus() {
    const typingByConversation: Record<string, number> = {};
    
    this.activeTyping.forEach(state => {
      typingByConversation[state.conversationId] = 
        (typingByConversation[state.conversationId] || 0) + 1;
    });

    return {
      activeTypingCount: this.activeTyping.size,
      activeConversations: this.callbacks.size,
      typingByConversation,
      isBackgroundMode: this.isBackgroundMode,
      options: this.options,
      batchQueueSize: this.batchQueue.size,
    };
  }

  // Private methods

  private debouncedBroadcast(conversationId: string, userId: string, isTyping: boolean): void {
    const debounceKey = `${conversationId}_${userId}`;
    const existingTimer = this.debounceTimers.get(debounceKey);

    // Clear existing timer
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Only debounce typing start, not stop
    if (isTyping) {
      const timer = setTimeout(() => {
        const typingState = this.activeTyping.get(`${userId}_${conversationId}`);
        if (typingState) {
          this.broadcastTyping(conversationId, userId, true, typingState.userName);
          typingState.isTyping = true;
        }
        this.debounceTimers.delete(debounceKey);
      }, this.options.debounceDelay);

      this.debounceTimers.set(debounceKey, timer);
    } else {
      // Immediate broadcast for stop
      const typingState = this.activeTyping.get(`${userId}_${conversationId}`);
      if (typingState) {
        this.broadcastTyping(conversationId, userId, false, typingState.userName);
      }
    }
  }

  private broadcastTyping(conversationId: string, userId: string, isTyping: boolean, userName: string): void {
    // Use broadcast function if available
    if (this.broadcastFunction) {
      this.broadcastFunction(conversationId, isTyping);
    }

    // Trigger local callbacks
    const callbacks = this.callbacks.get(conversationId);
    if (callbacks) {
      const typing: TypingIndicator = {
        user_id: userId,
        user_name: userName,
        conversation_id: conversationId,
        is_typing: isTyping,
        last_updated: new Date().toISOString(),
      };

      if (isTyping) {
        callbacks.onTypingStart(userId, userName, conversationId);
      } else {
        callbacks.onTypingStop(userId, conversationId);
      }

      callbacks.onTypingUpdate(typing);
    }
  }

  private addToBatch(conversationId: string, typing: TypingIndicator): void {
    if (!this.batchQueue.has(conversationId)) {
      this.batchQueue.set(conversationId, []);
    }

    this.batchQueue.get(conversationId)!.push(typing);

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatches();
      }, 50); // Very short batch window for typing indicators
    }
  }

  private processBatches(): void {
    this.batchTimer = null;

    this.batchQueue.forEach((typings, conversationId) => {
      const callbacks = this.callbacks.get(conversationId);
      if (!callbacks) return;

      // Process only the latest typing indicator per user
      const latest = new Map<string, TypingIndicator>();
      typings.forEach(typing => {
        latest.set(typing.user_id, typing);
      });

      latest.forEach(typing => {
        callbacks.onTypingUpdate(typing);
      });
    });

    this.batchQueue.clear();
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5000); // Clean up every 5 seconds
  }

  private cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.activeTyping.forEach((state, key) => {
      const timeSinceLastActivity = now - state.lastActivity.getTime();
      const timeSinceStart = now - state.startTime.getTime();

      // Remove if inactive for too long or exceeded max duration
      if (timeSinceLastActivity > this.options.autoStopDelay || 
          timeSinceStart > this.options.maxTypingDuration) {
        
        if (state.timeoutId) {
          clearTimeout(state.timeoutId);
        }
        
        // Broadcast stop if still marked as typing
        if (state.isTyping) {
          this.broadcastTyping(state.conversationId, state.userId, false, state.userName);
        }
        
        toRemove.push(key);
      }
    });

    toRemove.forEach(key => this.activeTyping.delete(key));

    if (toRemove.length > 0) {
      console.log(`[TypingIndicatorManager] Cleaned up ${toRemove.length} stale typing indicators`);
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.options.mobileOptimized) {
        this.enableEfficientMode();
      }
    } else {
      if (this.options.mobileOptimized) {
        this.disableEfficientMode();
      }
    }
  };

  /**
   * Cleanup resources when destroying the manager
   */
  public destroy(): void {
    // Clear all timers
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Clear all typing timeouts
    this.activeTyping.forEach(state => {
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
      }
    });

    // Clean up event listeners
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // Clear all state
    this.activeTyping.clear();
    this.callbacks.clear();
    this.batchQueue.clear();
  }
}

// Singleton instance
export const typingIndicatorManager = new TypingIndicatorManager({
  debounceDelay: 500,
  autoStopDelay: 10000,
  maxTypingDuration: 30000,
  enableBatching: true,
  mobileOptimized: true,
});