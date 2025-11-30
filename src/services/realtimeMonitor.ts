/**
 * Enhanced Real-Time Monitoring Service for PrayerMap
 * 
 * This service ensures new prayers appear immediately on all connected clients
 * by providing persistent monitoring, connection health checks, and automatic recovery.
 */

import { supabase } from '../lib/supabase';
import type { Prayer } from '../types/prayer';

interface RealtimeMonitorOptions {
  enableDebugLogs?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  healthCheckInterval?: number;
}

class RealtimeMonitor {
  private isActive = false;
  private channels = new Map<string, any>();
  private callbacks = new Map<string, Function[]>();
  private options: Required<RealtimeMonitorOptions>;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectCount = 0;
  private lastActivity = Date.now();

  constructor(options: RealtimeMonitorOptions = {}) {
    this.options = {
      enableDebugLogs: options.enableDebugLogs ?? false,
      reconnectAttempts: options.reconnectAttempts ?? 5,
      reconnectDelay: options.reconnectDelay ?? 2000,
      healthCheckInterval: options.healthCheckInterval ?? 30000, // 30 seconds
    };
  }

  private log(message: string, ...args: any[]) {
    if (this.options.enableDebugLogs) {
      console.log(`[RealtimeMonitor] ${message}`, ...args);
    }
  }

  private error(message: string, ...args: any[]) {
    console.error(`[RealtimeMonitor] ${message}`, ...args);
  }

  /**
   * Start the real-time monitoring system
   */
  start(): void {
    if (this.isActive) {
      this.log('Monitor already active');
      return;
    }

    if (!supabase) {
      this.error('Supabase client not available');
      return;
    }

    this.log('Starting real-time monitor');
    this.isActive = true;
    this.lastActivity = Date.now();
    
    // Start health check timer
    this.startHealthCheck();
    
    // Set up global prayer monitoring
    this.setupGlobalPrayerMonitoring();
    
    // Set up connection monitoring
    this.setupConnectionMonitoring();
  }

  /**
   * Stop the monitoring system
   */
  stop(): void {
    if (!this.isActive) return;

    this.log('Stopping real-time monitor');
    this.isActive = false;

    // Clean up all channels
    this.channels.forEach((channel, channelId) => {
      this.log(`Unsubscribing from channel: ${channelId}`);
      channel.unsubscribe();
    });
    this.channels.clear();
    this.callbacks.clear();

    // Stop health check
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.reconnectCount = 0;
  }

  /**
   * Subscribe to prayer updates with automatic recovery
   */
  subscribeToPrayers(callback: (prayers: Prayer[]) => void): () => void {
    const callbackId = `prayers_${Date.now()}_${Math.random()}`;
    
    if (!this.callbacks.has('prayers')) {
      this.callbacks.set('prayers', []);
    }
    this.callbacks.get('prayers')!.push(callback);

    this.log(`Added prayer callback: ${callbackId}`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get('prayers') || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        this.log(`Removed prayer callback: ${callbackId}`);
      }
    };
  }

  /**
   * Subscribe to connection updates
   */
  subscribeToConnections(callback: (connections: any[]) => void): () => void {
    const callbackId = `connections_${Date.now()}_${Math.random()}`;
    
    if (!this.callbacks.has('connections')) {
      this.callbacks.set('connections', []);
    }
    this.callbacks.get('connections')!.push(callback);

    this.log(`Added connection callback: ${callbackId}`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get('connections') || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        this.log(`Removed connection callback: ${callbackId}`);
      }
    };
  }

  /**
   * Set up global prayer monitoring channel
   */
  private setupGlobalPrayerMonitoring(): void {
    if (!supabase || this.channels.has('global_prayers')) return;

    this.log('Setting up global prayer monitoring');

    const channel = supabase
      .channel('realtime_monitor_prayers')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'prayers'
      }, async (payload) => {
        this.lastActivity = Date.now();
        this.log('Prayer change detected:', payload.eventType, payload.new || payload.old);

        // Trigger all prayer callbacks
        const callbacks = this.callbacks.get('prayers') || [];
        if (callbacks.length > 0) {
          try {
            // Import and fetch latest prayers
            const { fetchAllPrayers } = await import('./prayerService');
            const updatedPrayers = await fetchAllPrayers();
            
            callbacks.forEach(callback => {
              try {
                callback(updatedPrayers);
              } catch (err) {
                this.error('Error in prayer callback:', err);
              }
            });
          } catch (err) {
            this.error('Error fetching updated prayers:', err);
          }
        }
      })
      .subscribe((status) => {
        this.log(`Global prayers subscription status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          this.log('✅ Global prayer monitoring active');
          this.reconnectCount = 0;
        } else if (status === 'CHANNEL_ERROR') {
          this.error('❌ Global prayer monitoring failed');
          this.scheduleReconnect('global_prayers');
        } else if (status === 'TIMED_OUT') {
          this.error('❌ Global prayer monitoring timed out');
          this.scheduleReconnect('global_prayers');
        }
      });

    this.channels.set('global_prayers', channel);
  }

  /**
   * Set up prayer connections monitoring
   */
  private setupConnectionMonitoring(): void {
    if (!supabase || this.channels.has('global_connections')) return;

    this.log('Setting up connection monitoring');

    const channel = supabase
      .channel('realtime_monitor_connections')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'prayer_connections'
      }, async (payload) => {
        this.lastActivity = Date.now();
        this.log('Connection change detected:', payload.eventType, payload.new || payload.old);

        // Trigger all connection callbacks
        const callbacks = this.callbacks.get('connections') || [];
        if (callbacks.length > 0) {
          try {
            // Import and fetch latest connections
            const { fetchAllConnections } = await import('./prayerService');
            const updatedConnections = await fetchAllConnections();
            
            callbacks.forEach(callback => {
              try {
                callback(updatedConnections);
              } catch (err) {
                this.error('Error in connection callback:', err);
              }
            });
          } catch (err) {
            this.error('Error fetching updated connections:', err);
          }
        }
      })
      .subscribe((status) => {
        this.log(`Global connections subscription status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          this.log('✅ Global connection monitoring active');
        } else if (status === 'CHANNEL_ERROR') {
          this.error('❌ Global connection monitoring failed');
          this.scheduleReconnect('global_connections');
        }
      });

    this.channels.set('global_connections', channel);
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckInterval);
  }

  /**
   * Perform health check on all channels
   */
  private performHealthCheck(): void {
    if (!this.isActive) return;

    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    
    this.log(`Health check - Last activity: ${timeSinceLastActivity}ms ago`);
    
    // Check if channels are still alive
    this.channels.forEach((channel, channelId) => {
      if (!channel || channel.state !== 'joined') {
        this.error(`Channel ${channelId} is not properly connected, attempting reconnect`);
        this.scheduleReconnect(channelId);
      }
    });

    // If no activity for too long, force a ping
    if (timeSinceLastActivity > 60000) { // 1 minute
      this.log('No activity detected, performing connectivity test');
      this.testConnectivity();
    }
  }

  /**
   * Test basic connectivity
   */
  private async testConnectivity(): Promise<void> {
    if (!supabase) return;

    try {
      // Simple query to test connectivity
      await supabase.from('prayers').select('count', { count: 'exact', head: true });
      this.lastActivity = Date.now();
      this.log('Connectivity test passed');
    } catch (err) {
      this.error('Connectivity test failed:', err);
      // Schedule full reconnect
      this.scheduleFullReconnect();
    }
  }

  /**
   * Schedule reconnection for a specific channel
   */
  private scheduleReconnect(channelId: string): void {
    if (this.reconnectCount >= this.options.reconnectAttempts) {
      this.error(`Max reconnect attempts reached for ${channelId}`);
      return;
    }

    this.reconnectCount++;
    this.log(`Scheduling reconnect for ${channelId} (attempt ${this.reconnectCount})`);

    setTimeout(() => {
      if (!this.isActive) return;
      
      // Remove old channel
      const oldChannel = this.channels.get(channelId);
      if (oldChannel) {
        oldChannel.unsubscribe();
        this.channels.delete(channelId);
      }

      // Recreate channel
      if (channelId === 'global_prayers') {
        this.setupGlobalPrayerMonitoring();
      } else if (channelId === 'global_connections') {
        this.setupConnectionMonitoring();
      }
    }, this.options.reconnectDelay);
  }

  /**
   * Schedule full system reconnect
   */
  private scheduleFullReconnect(): void {
    this.log('Scheduling full system reconnect');
    
    setTimeout(() => {
      if (!this.isActive) return;
      
      this.stop();
      this.start();
    }, this.options.reconnectDelay * 2);
  }

  /**
   * Get monitor status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      channelCount: this.channels.size,
      callbackCount: Array.from(this.callbacks.values()).reduce((sum, arr) => sum + arr.length, 0),
      lastActivity: new Date(this.lastActivity),
      reconnectCount: this.reconnectCount,
      channels: Array.from(this.channels.keys())
    };
  }
}

// Create singleton instance
export const realtimeMonitor = new RealtimeMonitor({
  enableDebugLogs: process.env.NODE_ENV === 'development',
  reconnectAttempts: 5,
  reconnectDelay: 2000,
  healthCheckInterval: 30000
});

// Auto-start in development
if (process.env.NODE_ENV === 'development') {
  // Small delay to ensure Supabase is initialized
  setTimeout(() => {
    realtimeMonitor.start();
  }, 1000);
}

export default realtimeMonitor;