/**
 * Advanced Online Presence Service
 * 
 * Provides sophisticated presence tracking with:
 * - Prayer-specific status (actively praying for requests)
 * - Battery-optimized heartbeat system
 * - Multi-device presence management
 * - App state integration for accurate presence
 */

import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export enum PresenceStatus {
  ONLINE = 'online',
  AWAY = 'away', 
  OFFLINE = 'offline',
  PRAYING = 'praying' // PrayerMap-specific status
}

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeen: Date;
  customStatus?: string;
  isPrayingFor?: string[]; // Array of prayer IDs user is actively praying for
  deviceId?: string;
  connectionCount?: number;
}

export interface PresenceOptions {
  heartbeatInterval?: number;
  offlineTimeout?: number;
  enableBatteryOptimization?: boolean;
  enableMultiDevice?: boolean;
}

export interface PresenceEvent {
  type: 'presence_update' | 'prayer_activity';
  presence: UserPresence;
  previousStatus?: PresenceStatus;
}

class PresenceService {
  private presenceHeartbeat: NodeJS.Timeout | null = null;
  private userPresence = new Map<string, UserPresence>();
  private channels = new Map<string, RealtimeChannel>();
  private options: Required<PresenceOptions>;
  
  // App state tracking
  private isInBackground = false;
  private isOnline = navigator.onLine ?? true;
  private batteryLevel = 1.0;
  private reducedFrequencyMode = false;
  
  // Current user state
  private currentUserId: string | null = null;
  private currentPresence: UserPresence | null = null;

  constructor(options: PresenceOptions = {}) {
    this.options = {
      heartbeatInterval: 30000, // 30 seconds
      offlineTimeout: 120000, // 2 minutes
      enableBatteryOptimization: true,
      enableMultiDevice: true,
      ...options
    };

    if (typeof window !== 'undefined') {
      this.setupAppStateHandlers();
    }
  }

  /**
   * Start presence tracking for a user
   * Begins heartbeat and sets initial online status
   */
  async startPresenceTracking(
    userId: string,
    initialStatus: PresenceStatus = PresenceStatus.ONLINE,
    customStatus?: string
  ): Promise<void> {
    this.currentUserId = userId;
    
    try {
      // Set initial presence
      await this.updateUserPresence(userId, initialStatus, customStatus);
      
      // Start heartbeat
      this.startHeartbeat();
      
      console.log(`Started presence tracking for user ${userId} with status ${initialStatus}`);
      
    } catch (error) {
      console.error('Failed to start presence tracking:', error);
      throw error;
    }
  }

  /**
   * Update user presence status
   */
  async updateUserPresence(
    userId: string,
    status: PresenceStatus,
    customStatus?: string,
    isPrayingFor?: string[]
  ): Promise<UserPresence> {
    try {
      const { data, error } = await supabase.rpc('update_user_presence', {
        p_user_id: userId,
        p_status: status,
        p_last_seen: new Date().toISOString(),
        p_custom_status: customStatus || null,
        p_device_id: this.getDeviceId(),
        p_is_praying_for: isPrayingFor || null
      });

      if (error) throw error;

      const presence: UserPresence = {
        userId,
        status,
        lastSeen: new Date(data.last_seen),
        customStatus,
        isPrayingFor,
        deviceId: data.device_id
      };

      // Update local cache
      const previousPresence = this.userPresence.get(userId);
      this.userPresence.set(userId, presence);
      this.currentPresence = presence;

      // Broadcast presence update if status changed
      if (!previousPresence || previousPresence.status !== status) {
        await this.broadcastPresenceUpdate(userId, presence, previousPresence?.status);
      }

      console.log(`Updated presence for ${userId}: ${status}${customStatus ? ` (${customStatus})` : ''}`);
      return presence;

    } catch (error) {
      console.error('Failed to update user presence:', error);
      throw error;
    }
  }

  /**
   * Set prayer-specific status when user is actively praying
   */
  async setPrayingStatus(
    userId: string,
    prayerIds: string[],
    customStatus?: string
  ): Promise<void> {
    const status = prayerIds.length > 0 ? PresenceStatus.PRAYING : PresenceStatus.ONLINE;
    const defaultCustomStatus = prayerIds.length > 0 ? 'Praying 🙏' : undefined;
    
    await this.updateUserPresence(
      userId,
      status,
      customStatus || defaultCustomStatus,
      prayerIds
    );
  }

  /**
   * Get current presence for a user
   */
  async getUserPresence(userId: string): Promise<UserPresence | null> {
    // Check cache first
    const cached = this.userPresence.get(userId);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const presence: UserPresence = {
        userId: data.user_id,
        status: data.status as PresenceStatus,
        lastSeen: new Date(data.last_seen),
        customStatus: data.custom_status,
        isPrayingFor: data.is_praying_for,
        deviceId: data.device_id,
        connectionCount: data.connection_count
      };

      this.userPresence.set(userId, presence);
      return presence;

    } catch (error) {
      console.error('Failed to get user presence:', error);
      return null;
    }
  }

  /**
   * Get online users count and prayer activity
   */
  async getOnlineStats(): Promise<{
    onlineCount: number;
    prayingCount: number;
    awayCount: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_realtime_stats');

      if (error) throw error;

      return {
        onlineCount: data.online_users || 0,
        prayingCount: data.praying_users || 0,
        awayCount: data.away_users || 0
      };

    } catch (error) {
      console.error('Failed to get online stats:', error);
      return { onlineCount: 0, prayingCount: 0, awayCount: 0 };
    }
  }

  /**
   * Subscribe to presence updates for specific users or global
   */
  subscribeToPresenceUpdates(
    callback: (event: PresenceEvent) => void,
    userIds?: string[]
  ): () => void {
    const channelName = userIds ? `presence_${userIds.join('_')}` : 'presence_global';
    
    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'presence_update' }, (payload) => {
        const { presence, previousStatus } = payload.payload;
        callback({
          type: 'presence_update',
          presence: {
            ...presence,
            lastSeen: new Date(presence.lastSeen)
          },
          previousStatus
        });
      })
      .on('broadcast', { event: 'prayer_activity' }, (payload) => {
        const { presence } = payload.payload;
        callback({
          type: 'prayer_activity',
          presence: {
            ...presence,
            lastSeen: new Date(presence.lastSeen)
          }
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
   * Get presence display text for UI
   */
  getPresenceDisplayText(presence: UserPresence): string {
    if (!presence) return 'Offline';

    switch (presence.status) {
      case PresenceStatus.ONLINE:
        return presence.customStatus || 'Online';
      case PresenceStatus.AWAY:
        return 'Away';
      case PresenceStatus.PRAYING:
        return presence.customStatus || 'Praying 🙏';
      case PresenceStatus.OFFLINE:
        const timeSinceLastSeen = Date.now() - presence.lastSeen.getTime();
        if (timeSinceLastSeen < 300000) { // 5 minutes
          return 'Last seen recently';
        }
        return `Last seen ${this.formatLastSeen(presence.lastSeen)}`;
      default:
        return 'Unknown';
    }
  }

  /**
   * Get presence indicator color for UI
   */
  getPresenceColor(status: PresenceStatus): string {
    switch (status) {
      case PresenceStatus.ONLINE:
        return '#10B981'; // Green
      case PresenceStatus.PRAYING:
        return '#8B5CF6'; // Purple
      case PresenceStatus.AWAY:
        return '#F59E0B'; // Orange
      case PresenceStatus.OFFLINE:
      default:
        return '#6B7280'; // Gray
    }
  }

  /**
   * Check if user is currently online
   */
  isUserOnline(userId: string): boolean {
    const presence = this.userPresence.get(userId);
    return presence?.status === PresenceStatus.ONLINE || 
           presence?.status === PresenceStatus.PRAYING;
  }

  /**
   * Stop presence tracking
   */
  async stopPresenceTracking(): Promise<void> {
    if (this.currentUserId) {
      try {
        await this.updateUserPresence(this.currentUserId, PresenceStatus.OFFLINE);
      } catch (error) {
        console.error('Failed to set offline status:', error);
      }
    }

    this.stopHeartbeat();
    this.currentUserId = null;
    this.currentPresence = null;

    console.log('Stopped presence tracking');
  }

  /**
   * Start heartbeat for presence updates
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat

    const interval = this.getHeartbeatInterval();
    
    this.presenceHeartbeat = setInterval(async () => {
      if (this.currentUserId && this.isOnline) {
        try {
          const status = this.isInBackground ? PresenceStatus.AWAY : PresenceStatus.ONLINE;
          await this.updateUserPresence(this.currentUserId, status, this.currentPresence?.customStatus);
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }
    }, interval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.presenceHeartbeat) {
      clearInterval(this.presenceHeartbeat);
      this.presenceHeartbeat = null;
    }
  }

  /**
   * Setup app state handlers for accurate presence
   */
  private setupAppStateHandlers(): void {
    // Handle network status changes
    window.addEventListener('online', () => {
      this.isOnline = true;
      if (this.currentUserId) {
        this.updateUserPresence(this.currentUserId, PresenceStatus.ONLINE);
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      if (this.currentUserId) {
        this.updateUserPresence(this.currentUserId, PresenceStatus.OFFLINE);
      }
    });

    // Handle browser/app visibility changes
    document.addEventListener('visibilitychange', () => {
      this.isInBackground = document.hidden;
      
      if (this.currentUserId) {
        const status = document.hidden ? PresenceStatus.AWAY : PresenceStatus.ONLINE;
        this.updateUserPresence(this.currentUserId, status);
      }
      
      // Adjust heartbeat frequency
      this.adjustHeartbeatFrequency();
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      if (this.currentUserId) {
        // Use sendBeacon for reliable offline status update
        navigator.sendBeacon?.(
          `${supabase.supabaseUrl}/rest/v1/rpc/update_user_presence`,
          JSON.stringify({
            p_user_id: this.currentUserId,
            p_status: 'offline',
            p_last_seen: new Date().toISOString()
          })
        );
      }
    });

    // Mobile app state handling (if Capacitor)
    if (window.Capacitor) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          this.isInBackground = !isActive;
          
          if (this.currentUserId) {
            const status = isActive ? PresenceStatus.ONLINE : PresenceStatus.AWAY;
            this.updateUserPresence(this.currentUserId, status);
          }
          
          this.adjustHeartbeatFrequency();
        });
      });
    }

    // Battery optimization
    if (this.options.enableBatteryOptimization && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.batteryLevel = battery.level;
        
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
          this.adjustHeartbeatFrequency();
        });
      });
    }
  }

  /**
   * Adjust heartbeat frequency based on app state and battery
   */
  private adjustHeartbeatFrequency(): void {
    const shouldReduceFrequency = this.isInBackground || this.batteryLevel < 0.2;
    
    if (shouldReduceFrequency !== this.reducedFrequencyMode) {
      this.reducedFrequencyMode = shouldReduceFrequency;
      
      // Restart heartbeat with new frequency
      if (this.presenceHeartbeat) {
        this.startHeartbeat();
      }
      
      console.log(`${shouldReduceFrequency ? 'Enabled' : 'Disabled'} reduced frequency mode for presence`);
    }
  }

  /**
   * Get heartbeat interval based on current state
   */
  private getHeartbeatInterval(): number {
    if (this.reducedFrequencyMode) {
      return this.options.heartbeatInterval * 2; // Double interval when backgrounded/low battery
    }
    return this.options.heartbeatInterval;
  }

  /**
   * Broadcast presence update to interested parties
   */
  private async broadcastPresenceUpdate(
    userId: string,
    presence: UserPresence,
    previousStatus?: PresenceStatus
  ): Promise<void> {
    const eventType = presence.status === PresenceStatus.PRAYING ? 'prayer_activity' : 'presence_update';
    
    try {
      await supabase.channel('presence_global').send({
        type: 'broadcast',
        event: eventType,
        payload: { presence, previousStatus }
      });
    } catch (error) {
      console.error('Failed to broadcast presence update:', error);
    }
  }

  /**
   * Get device ID for multi-device tracking
   */
  private getDeviceId(): string {
    if (!this.options.enableMultiDevice) {
      return 'default';
    }

    let deviceId = sessionStorage.getItem('prayermap_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('prayermap_device_id', deviceId);
    }
    
    return deviceId;
  }

  /**
   * Format last seen timestamp for UI display
   */
  private formatLastSeen(lastSeen: Date): string {
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return lastSeen.toLocaleDateString();
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.stopHeartbeat();
    
    // Unsubscribe from all channels
    for (const channel of this.channels.values()) {
      channel.unsubscribe();
    }
    this.channels.clear();
    
    // Clear cache
    this.userPresence.clear();
    
    // Set offline status if tracking
    if (this.currentUserId) {
      this.updateUserPresence(this.currentUserId, PresenceStatus.OFFLINE)
        .catch(console.error);
    }

    console.log('PresenceService cleaned up');
  }
}

// Singleton instance
export const presenceService = new PresenceService();

// Export for testing
export { PresenceService };

// Re-export types to ensure they're available
export type { UserPresence, PresenceEvent, PresenceOptions };