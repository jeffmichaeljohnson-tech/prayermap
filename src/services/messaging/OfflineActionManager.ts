/**
 * Offline Action Manager - Offline action queueing and execution
 * 
 * Extracted from offlineConversationCache.ts for focused offline management.
 * Handles queueing, retrying, and executing offline actions when connectivity returns.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { supabase } from '../../lib/supabase';
import type { OfflineAction, SendMessageRequest } from '../../types/conversation';

// IndexedDB Schema for offline actions
interface OfflineActionDB extends DBSchema {
  offline_actions: {
    key: string;
    value: OfflineAction & { 
      queuedAt: number;
      lastAttempt?: number;
      retryCount: number;
    };
    indexes: { 
      'by-type': string;
      'by-queued': number;
      'by-priority': number;
    };
  };
}

export interface OfflineActionConfig {
  maxRetries: number;
  retryBackoffMs: number;
  maxQueueSize: number;
  autoExecuteEnabled: boolean;
  executionIntervalMs: number;
}

export class OfflineActionManager {
  private static instance: OfflineActionManager;
  private db: IDBPDatabase<OfflineActionDB> | null = null;
  private isInitialized = false;
  private config: OfflineActionConfig;
  private executionInterval: NodeJS.Timeout | null = null;
  private isExecuting = false;

  private constructor() {
    this.config = {
      maxRetries: 3,
      retryBackoffMs: 5000, // 5 seconds
      maxQueueSize: 1000,
      autoExecuteEnabled: true,
      executionIntervalMs: 30000 // 30 seconds
    };
  }

  static getInstance(): OfflineActionManager {
    if (!OfflineActionManager.instance) {
      OfflineActionManager.instance = new OfflineActionManager();
    }
    return OfflineActionManager.instance;
  }

  /**
   * Initialize the offline action manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await openDB<OfflineActionDB>('PrayerMapOfflineActions', 1, {
        upgrade(db) {
          const actionStore = db.createObjectStore('offline_actions', {
            keyPath: 'id'
          });
          actionStore.createIndex('by-type', 'type');
          actionStore.createIndex('by-queued', 'queuedAt');
          actionStore.createIndex('by-priority', 'priority');
        }
      });

      this.isInitialized = true;
      console.log('📤 Offline action manager initialized');

      // Start auto-execution if enabled
      if (this.config.autoExecuteEnabled) {
        this.startAutoExecution();
      }

      // Listen for network changes
      this.setupNetworkListeners();

    } catch (error) {
      console.error('Failed to initialize offline action manager:', error);
      throw error;
    }
  }

  /**
   * Queue an action for offline execution
   */
  async queueOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.db) throw new Error('Offline action manager not initialized');

    try {
      // Check queue size limit
      const queueSize = await this.db.count('offline_actions');
      if (queueSize >= this.config.maxQueueSize) {
        // Remove oldest low-priority action
        await this.removeOldestLowPriorityAction();
      }

      const queuedAction = {
        ...action,
        queuedAt: Date.now(),
        retryCount: 0
      };

      await this.db.add('offline_actions', queuedAction);
      
      console.log(`📤 Queued offline action: ${action.type} (${action.id})`);

      // Try immediate execution if online
      if (navigator.onLine && this.config.autoExecuteEnabled) {
        setTimeout(() => this.executePendingActions(), 1000);
      }

    } catch (error) {
      console.error('Failed to queue offline action:', error);
      throw error;
    }
  }

  /**
   * Get all pending offline actions
   */
  async getPendingOfflineActions(): Promise<OfflineAction[]> {
    if (!this.db) throw new Error('Offline action manager not initialized');

    try {
      const actions = await this.db.getAll('offline_actions');
      
      // Sort by priority and queue time
      actions.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.queuedAt - b.queuedAt; // Older first for same priority
      });

      // Remove internal fields
      return actions.map(({ queuedAt, lastAttempt, retryCount, ...action }) => action);

    } catch (error) {
      console.error('Failed to get pending offline actions:', error);
      return [];
    }
  }

  /**
   * Execute all pending offline actions
   */
  async executePendingActions(): Promise<{
    executed: number;
    failed: number;
    remaining: number;
  }> {
    if (!this.db || this.isExecuting) {
      return { executed: 0, failed: 0, remaining: 0 };
    }

    this.isExecuting = true;
    console.log('🚀 Executing pending offline actions...');

    let executed = 0;
    let failed = 0;

    try {
      const actions = await this.db.getAll('offline_actions');
      
      // Sort by priority and queue time
      actions.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.queuedAt - b.queuedAt;
      });

      for (const action of actions) {
        try {
          // Check if we should retry this action
          if (action.retryCount >= this.config.maxRetries) {
            console.warn(`🚫 Action ${action.id} exceeded max retries, removing`);
            await this.removeOfflineAction(action.id);
            failed++;
            continue;
          }

          // Check retry backoff
          if (action.lastAttempt && 
              Date.now() - action.lastAttempt < this.config.retryBackoffMs * action.retryCount) {
            continue; // Skip this action for now
          }

          // Execute the action
          await this.executeOfflineAction(action);
          await this.removeOfflineAction(action.id);
          executed++;
          
          console.log(`✅ Executed offline action: ${action.type} (${action.id})`);

        } catch (error) {
          console.error(`❌ Failed to execute action ${action.id}:`, error);
          await this.incrementRetryCount(action.id);
          failed++;
        }
      }

      const remaining = await this.db.count('offline_actions');
      
      console.log(`📊 Offline action execution complete: ${executed} executed, ${failed} failed, ${remaining} remaining`);
      
      return { executed, failed, remaining };

    } catch (error) {
      console.error('Failed to execute pending actions:', error);
      return { executed, failed, remaining: 0 };
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Get offline action statistics
   */
  async getActionStats(): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    oldestAction: Date | null;
    averageRetryCount: number;
  }> {
    if (!this.db) throw new Error('Offline action manager not initialized');

    try {
      const actions = await this.db.getAll('offline_actions');
      
      const actionsByType = actions.reduce((acc, action) => {
        acc[action.type] = (acc[action.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const oldestAction = actions.length > 0 ? 
        new Date(Math.min(...actions.map(a => a.queuedAt))) : null;

      const averageRetryCount = actions.length > 0 ? 
        actions.reduce((sum, a) => sum + a.retryCount, 0) / actions.length : 0;

      return {
        totalActions: actions.length,
        actionsByType,
        oldestAction,
        averageRetryCount
      };

    } catch (error) {
      console.error('Failed to get action stats:', error);
      return {
        totalActions: 0,
        actionsByType: {},
        oldestAction: null,
        averageRetryCount: 0
      };
    }
  }

  /**
   * Clear all pending actions
   */
  async clearAllActions(): Promise<void> {
    if (!this.db) throw new Error('Offline action manager not initialized');

    try {
      await this.db.clear('offline_actions');
      console.log('🗑️ Cleared all pending offline actions');
    } catch (error) {
      console.error('Failed to clear all actions:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OfflineActionConfig>): void {
    const oldAutoExecute = this.config.autoExecuteEnabled;
    this.config = { ...this.config, ...config };

    // Handle auto-execution changes
    if (oldAutoExecute !== this.config.autoExecuteEnabled) {
      if (this.config.autoExecuteEnabled) {
        this.startAutoExecution();
      } else {
        this.stopAutoExecution();
      }
    }

    console.log('⚙️ Offline action manager config updated', config);
  }

  /**
   * Get current configuration
   */
  getConfig(): OfflineActionConfig {
    return { ...this.config };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    console.log(`⚡ Executing offline action: ${action.type}`);

    switch (action.type) {
      case 'send_message':
        await this.executeSendMessage(action);
        break;
      case 'update_message':
        await this.executeUpdateMessage(action);
        break;
      case 'delete_message':
        await this.executeDeleteMessage(action);
        break;
      case 'join_conversation':
        await this.executeJoinConversation(action);
        break;
      case 'leave_conversation':
        await this.executeLeaveConversation(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeSendMessage(action: OfflineAction): Promise<void> {
    const request = action.data as SendMessageRequest;
    
    const { error } = await supabase.rpc('send_thread_message', {
      thread_id: request.threadId,
      content: request.content,
      message_type: request.messageType,
      parent_message_id: request.parentMessageId,
      spiritual_context: request.spiritualContext,
      media_attachments: request.mediaAttachments
    });

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  private async executeUpdateMessage(action: OfflineAction): Promise<void> {
    const { messageId, updates } = action.data as { messageId: string; updates: any };
    
    const { error } = await supabase
      .from('thread_messages')
      .update(updates)
      .eq('id', messageId);

    if (error) {
      throw new Error(`Failed to update message: ${error.message}`);
    }
  }

  private async executeDeleteMessage(action: OfflineAction): Promise<void> {
    const { messageId } = action.data as { messageId: string };
    
    const { error } = await supabase
      .from('thread_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }

  private async executeJoinConversation(action: OfflineAction): Promise<void> {
    const { threadId } = action.data as { threadId: string };
    
    const { error } = await supabase.rpc('join_conversation_thread', {
      thread_id: threadId
    });

    if (error) {
      throw new Error(`Failed to join conversation: ${error.message}`);
    }
  }

  private async executeLeaveConversation(action: OfflineAction): Promise<void> {
    const { threadId } = action.data as { threadId: string };
    
    const { error } = await supabase.rpc('leave_conversation_thread', {
      thread_id: threadId
    });

    if (error) {
      throw new Error(`Failed to leave conversation: ${error.message}`);
    }
  }

  private async removeOfflineAction(actionId: string): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.delete('offline_actions', actionId);
    } catch (error) {
      console.error(`Failed to remove offline action ${actionId}:`, error);
    }
  }

  private async incrementRetryCount(actionId: string): Promise<void> {
    if (!this.db) return;

    try {
      const action = await this.db.get('offline_actions', actionId);
      if (action) {
        action.retryCount++;
        action.lastAttempt = Date.now();
        await this.db.put('offline_actions', action);
      }
    } catch (error) {
      console.error(`Failed to increment retry count for action ${actionId}:`, error);
    }
  }

  private async removeOldestLowPriorityAction(): Promise<void> {
    if (!this.db) return;

    try {
      const actions = await this.db.getAll('offline_actions');
      
      // Find the oldest low-priority action
      const lowPriorityActions = actions.filter(a => a.priority <= 1);
      if (lowPriorityActions.length > 0) {
        lowPriorityActions.sort((a, b) => a.queuedAt - b.queuedAt);
        await this.db.delete('offline_actions', lowPriorityActions[0].id);
        console.log(`🗑️ Removed oldest low-priority action: ${lowPriorityActions[0].id}`);
      }
    } catch (error) {
      console.error('Failed to remove oldest low-priority action:', error);
    }
  }

  private startAutoExecution(): void {
    if (this.executionInterval) {
      clearInterval(this.executionInterval);
    }

    this.executionInterval = setInterval(() => {
      if (navigator.onLine) {
        this.executePendingActions().catch(console.error);
      }
    }, this.config.executionIntervalMs);

    console.log('🔄 Auto-execution started for offline actions');
  }

  private stopAutoExecution(): void {
    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = null;
    }
    console.log('⏸️ Auto-execution stopped for offline actions');
  }

  private setupNetworkListeners(): void {
    // Execute pending actions when network comes back online
    window.addEventListener('online', () => {
      console.log('🌐 Network restored, executing pending offline actions...');
      setTimeout(() => this.executePendingActions(), 2000); // Wait 2 seconds for stable connection
    });

    window.addEventListener('offline', () => {
      console.log('📱 Network lost, offline mode activated');
    });
  }
}

// Global offline action manager instance
export const offlineActionManager = OfflineActionManager.getInstance();