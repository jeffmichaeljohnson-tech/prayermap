/**
 * Advanced Typing Indicator Service
 * 
 * Provides WhatsApp/Instagram-level typing indicators with:
 * - Auto-cleanup of stale indicators
 * - Debounced state management
 * - Battery-optimized mobile performance
 * - Real-time broadcasting via Supabase channels
 */

import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export enum TypingActivity {
  TYPING = 'typing',
  RECORDING_AUDIO = 'recording_audio', 
  RECORDING_VIDEO = 'recording_video'
}

export interface TypingState {
  conversationId: string;
  userId: string;
  userName: string;
  activity: TypingActivity;
  startedAt: Date;
  expiresAt: Date;
}

export interface TypingIndicatorOptions {
  debounceMs?: number;
  cleanupInterval?: number;
  batteryOptimized?: boolean;
}

class TypingIndicatorService {
  private typingStates = new Map<string, Set<TypingState>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private channels = new Map<string, RealtimeChannel>();
  private options: Required<TypingIndicatorOptions>;
  
  // Battery optimization state
  private isInBackground = false;
  private reducedFrequencyMode = false;
  private batteryLevel = 1.0;

  constructor(options: TypingIndicatorOptions = {}) {
    this.options = {
      debounceMs: 1500, // 1.5 seconds standard
      cleanupInterval: 5000, // Clean every 5 seconds
      batteryOptimized: true,
      ...options
    };

    this.initializeCleanup();
    
    if (this.options.batteryOptimized && typeof window !== 'undefined') {
      this.setupBatteryOptimization();
    }
  }

  /**
   * Start typing indicator for a conversation
   * Automatically broadcasts to other participants
   */
  async startTyping(
    conversationId: string, 
    userId: string, 
    userName: string,
    activity: TypingActivity = TypingActivity.TYPING
  ): Promise<void> {
    const key = `${conversationId}_${userId}`;
    
    try {
      // Clear existing timer
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key)!);
      }
      
      // Call database function to start typing
      const { data, error } = await supabase.rpc('start_typing_indicator', {
        p_conversation_id: conversationId,
        p_user_id: userId,
        p_user_name: userName,
        p_activity: activity
      });

      if (error) {
        throw error;
      }

      // Update local state
      const typingState: TypingState = {
        conversationId,
        userId,
        userName,
        activity,
        startedAt: new Date(data.started_at),
        expiresAt: new Date(data.expires_at)
      };
      
      if (!this.typingStates.has(conversationId)) {
        this.typingStates.set(conversationId, new Set());
      }
      
      // Remove existing state for this user and add new one
      const conversationTyping = this.typingStates.get(conversationId)!;
      for (const state of conversationTyping) {
        if (state.userId === userId) {
          conversationTyping.delete(state);
        }
      }
      conversationTyping.add(typingState);
      
      // Broadcast to real-time channel
      await this.broadcastTypingState(conversationId);
      
      // Set auto-stop timer based on activity type
      const timeoutMs = this.getTypingTimeout(activity);
      this.debounceTimers.set(key, setTimeout(() => {
        this.stopTyping(conversationId, userId).catch(console.error);
      }, timeoutMs));

      console.log(`Started ${activity} indicator for user ${userName} in conversation ${conversationId}`);
      
    } catch (error) {
      console.error('Failed to start typing indicator:', error);
      throw error;
    }
  }

  /**
   * Stop typing indicator for a user
   */
  async stopTyping(conversationId: string, userId: string): Promise<void> {
    const key = `${conversationId}_${userId}`;
    
    try {
      // Clear debounce timer
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key)!);
        this.debounceTimers.delete(key);
      }
      
      // Call database function to stop typing
      await supabase.rpc('stop_typing_indicator', {
        p_conversation_id: conversationId,
        p_user_id: userId
      });
      
      // Update local state
      const conversationTyping = this.typingStates.get(conversationId);
      if (conversationTyping) {
        for (const state of conversationTyping) {
          if (state.userId === userId) {
            conversationTyping.delete(state);
            break;
          }
        }
      }
      
      // Broadcast updated state
      await this.broadcastTypingState(conversationId);
      
      console.log(`Stopped typing indicator for user ${userId} in conversation ${conversationId}`);
      
    } catch (error) {
      console.error('Failed to stop typing indicator:', error);
    }
  }

  /**
   * Subscribe to typing indicators for a conversation
   */
  subscribeToTypingIndicators(
    conversationId: string,
    callback: (typingUsers: TypingState[]) => void
  ): () => void {
    const channelName = `typing_${conversationId}`;
    
    // Create real-time channel
    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'typing_update' }, (payload) => {
        const typingUsers = payload.payload?.typingUsers || [];
        callback(typingUsers.map((user: any) => ({
          ...user,
          startedAt: new Date(user.startedAt),
          expiresAt: new Date(user.expiresAt)
        })));
      })
      .subscribe();
    
    this.channels.set(channelName, channel);
    
    // Initial fetch from database
    this.fetchActiveTypingIndicators(conversationId)
      .then(indicators => callback(indicators))
      .catch(console.error);
    
    // Return cleanup function
    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  /**
   * Get current typing indicator display text
   */
  getTypingIndicatorText(typingUsers: TypingState[]): string {
    if (typingUsers.length === 0) return '';
    
    const activities = typingUsers.reduce((acc, user) => {
      const activity = this.getActivityDisplayText(user.activity);
      if (!acc[activity]) acc[activity] = [];
      acc[activity].push(user.userName);
      return acc;
    }, {} as Record<string, string[]>);
    
    const messages: string[] = [];
    
    for (const [activity, users] of Object.entries(activities)) {
      if (users.length === 1) {
        messages.push(`${users[0]} is ${activity}...`);
      } else if (users.length === 2) {
        messages.push(`${users[0]} and ${users[1]} are ${activity}...`);
      } else {
        messages.push(`${users[0]} and ${users.length - 1} others are ${activity}...`);
      }
    }
    
    return messages.join(', ');
  }

  /**
   * Check if user is currently typing in conversation
   */
  isUserTyping(conversationId: string, userId: string): boolean {
    const conversationTyping = this.typingStates.get(conversationId);
    if (!conversationTyping) return false;
    
    for (const state of conversationTyping) {
      if (state.userId === userId && state.expiresAt > new Date()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all active typing users for a conversation
   */
  getActiveTypingUsers(conversationId: string): TypingState[] {
    const conversationTyping = this.typingStates.get(conversationId);
    if (!conversationTyping) return [];
    
    const now = new Date();
    return Array.from(conversationTyping).filter(state => state.expiresAt > now);
  }

  /**
   * Clean up expired typing indicators
   */
  private async cleanupExpiredIndicators(): Promise<void> {
    try {
      // Clean up database
      await supabase.rpc('cleanup_expired_typing_indicators');
      
      // Clean up local state
      const now = new Date();
      for (const [conversationId, typingSet] of this.typingStates.entries()) {
        for (const state of typingSet) {
          if (state.expiresAt <= now) {
            typingSet.delete(state);
          }
        }
        
        // Remove empty sets
        if (typingSet.size === 0) {
          this.typingStates.delete(conversationId);
        }
      }
    } catch (error) {
      console.error('Failed to clean up expired typing indicators:', error);
    }
  }

  /**
   * Fetch active typing indicators from database
   */
  private async fetchActiveTypingIndicators(conversationId: string): Promise<TypingState[]> {
    try {
      const { data, error } = await supabase.rpc('get_active_typing_indicators', {
        p_conversation_id: conversationId
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        conversationId,
        userId: row.user_id,
        userName: row.user_name,
        activity: row.activity as TypingActivity,
        startedAt: new Date(row.started_at),
        expiresAt: new Date(row.expires_at)
      }));
    } catch (error) {
      console.error('Failed to fetch typing indicators:', error);
      return [];
    }
  }

  /**
   * Broadcast typing state to real-time channel
   */
  private async broadcastTypingState(conversationId: string): Promise<void> {
    const channelName = `typing_${conversationId}`;
    const typingUsers = this.getActiveTypingUsers(conversationId);
    
    try {
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'typing_update',
        payload: { typingUsers }
      });
    } catch (error) {
      console.error('Failed to broadcast typing state:', error);
    }
  }

  /**
   * Initialize cleanup interval
   */
  private initializeCleanup(): void {
    const interval = this.reducedFrequencyMode ? 
      this.options.cleanupInterval * 2 : 
      this.options.cleanupInterval;
      
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredIndicators().catch(console.error);
    }, interval);
  }

  /**
   * Setup battery optimization for mobile devices
   */
  private setupBatteryOptimization(): void {
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      this.isInBackground = document.hidden;
      this.adjustPerformanceMode();
    });

    // Battery API integration (when available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.batteryLevel = battery.level;
        
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
          this.adjustPerformanceMode();
        });
      });
    }

    // Mobile app state handling (if Capacitor)
    if (window.Capacitor) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          this.isInBackground = !isActive;
          this.adjustPerformanceMode();
        });
      });
    }
  }

  /**
   * Adjust performance based on battery and app state
   */
  private adjustPerformanceMode(): void {
    const shouldReduceFrequency = this.isInBackground || this.batteryLevel < 0.2;
    
    if (shouldReduceFrequency && !this.reducedFrequencyMode) {
      this.reducedFrequencyMode = true;
      this.options.debounceMs = Math.max(this.options.debounceMs * 2, 3000);
      
      // Restart cleanup with longer interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.initializeCleanup();
      }
      
      console.log('Enabled reduced frequency mode for battery optimization');
    } else if (!shouldReduceFrequency && this.reducedFrequencyMode) {
      this.reducedFrequencyMode = false;
      this.options.debounceMs = Math.max(this.options.debounceMs / 2, 1500);
      
      // Restart cleanup with normal interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.initializeCleanup();
      }
      
      console.log('Disabled reduced frequency mode');
    }
  }

  /**
   * Get typing timeout based on activity type
   */
  private getTypingTimeout(activity: TypingActivity): number {
    const baseTimeout = this.reducedFrequencyMode ? 10000 : 8000; // 10s vs 8s
    
    switch (activity) {
      case TypingActivity.TYPING:
        return baseTimeout;
      case TypingActivity.RECORDING_AUDIO:
        return this.reducedFrequencyMode ? 90000 : 60000; // 90s vs 60s
      case TypingActivity.RECORDING_VIDEO:
        return this.reducedFrequencyMode ? 450000 : 300000; // 7.5m vs 5m
      default:
        return baseTimeout;
    }
  }

  /**
   * Get display text for activity type
   */
  private getActivityDisplayText(activity: TypingActivity): string {
    switch (activity) {
      case TypingActivity.TYPING:
        return 'typing';
      case TypingActivity.RECORDING_AUDIO:
        return 'recording audio';
      case TypingActivity.RECORDING_VIDEO:
        return 'recording video';
      default:
        return 'typing';
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Unsubscribe from all channels
    for (const channel of this.channels.values()) {
      channel.unsubscribe();
    }
    this.channels.clear();
    
    // Clear local state
    this.typingStates.clear();
    
    console.log('TypingIndicatorService cleaned up');
  }
}

// Singleton instance
export const typingIndicatorService = new TypingIndicatorService();

// Export for testing
export { TypingIndicatorService };

// Re-export types to ensure they're available
export type { TypingState, TypingIndicatorOptions };