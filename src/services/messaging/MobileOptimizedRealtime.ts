/**
 * Mobile-Optimized Real-time Connection Manager for PrayerMap
 * Battery and data-conscious real-time connections
 * 
 * Features:
 * - App state-aware connection management
 * - Battery optimization in background mode
 * - Data usage monitoring and optimization
 * - Adaptive connection frequency
 * - Network quality detection
 * - Background sync coordination
 */

import { RealtimeChannel } from '@supabase/supabase-js';

export type AppState = 'active' | 'background' | 'inactive';
export type NetworkQuality = 'high' | 'medium' | 'low' | 'offline';
export type ConnectionMode = 'full' | 'efficient' | 'minimal' | 'offline';

export interface MobileOptimizationOptions {
  enableBackgroundOptimization?: boolean;
  enableDataSaver?: boolean;
  adaptiveFrequency?: boolean;
  maxBackgroundDuration?: number; // Max time to maintain connection in background (ms)
  minimalModeThreshold?: number; // Battery level threshold for minimal mode
  heartbeatIntervals?: {
    active: number;
    background: number;
    minimal: number;
  };
  batchingIntervals?: {
    active: number;
    background: number;
    minimal: number;
  };
}

export interface ConnectionMetrics {
  dataUsage: number; // Bytes transferred
  batteryImpact: number; // Estimated battery impact (0-100)
  connectionUptime: number; // Total time connected (ms)
  reconnectionCount: number;
  messagesReceived: number;
  messagesSent: number;
  averageLatency: number; // Average message latency (ms)
  networkQuality: NetworkQuality;
}

export interface NetworkCondition {
  quality: NetworkQuality;
  effectiveType: string; // '4g', '3g', '2g', etc.
  downlink: number; // Mbps
  rtt: number; // Round trip time in ms
  saveData: boolean; // User's data saver preference
}

export class MobileOptimizedRealtime {
  private currentAppState: AppState = 'active';
  private currentConnectionMode: ConnectionMode = 'full';
  private currentNetworkQuality: NetworkQuality = 'high';
  private options: Required<MobileOptimizationOptions>;
  private metrics: ConnectionMetrics;
  private networkMonitor: NetworkInformation | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private backgroundTimer: NodeJS.Timeout | null = null;
  private channels: Map<string, RealtimeChannel> = new Map();
  private messageQueue: Array<{ channel: string; data: any; timestamp: number }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Battery API (if available)
  private battery: any = null;

  constructor(options: MobileOptimizationOptions = {}) {
    this.options = {
      enableBackgroundOptimization: options.enableBackgroundOptimization ?? true,
      enableDataSaver: options.enableDataSaver ?? false,
      adaptiveFrequency: options.adaptiveFrequency ?? true,
      maxBackgroundDuration: options.maxBackgroundDuration ?? 300000, // 5 minutes
      minimalModeThreshold: options.minimalModeThreshold ?? 20, // 20% battery
      heartbeatIntervals: {
        active: 30000,    // 30 seconds
        background: 120000, // 2 minutes
        minimal: 300000,   // 5 minutes
        ...options.heartbeatIntervals
      },
      batchingIntervals: {
        active: 100,      // 100ms
        background: 2000, // 2 seconds
        minimal: 5000,    // 5 seconds
        ...options.batchingIntervals
      }
    };

    this.metrics = {
      dataUsage: 0,
      batteryImpact: 0,
      connectionUptime: 0,
      reconnectionCount: 0,
      messagesReceived: 0,
      messagesSent: 0,
      averageLatency: 0,
      networkQuality: 'high'
    };

    this.initialize();
  }

  /**
   * Initialize mobile optimization features
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Set up app state monitoring
    this.setupAppStateMonitoring();

    // Set up network monitoring
    this.setupNetworkMonitoring();

    // Set up battery monitoring
    await this.setupBatteryMonitoring();

    // Start adaptive management
    this.startAdaptiveManagement();

    this.isInitialized = true;
    console.log('[MobileOptimizedRealtime] Initialized with mobile optimizations');
  }

  /**
   * Handle app state changes
   */
  public handleAppStateChange(state: AppState): void {
    const previousState = this.currentAppState;
    this.currentAppState = state;

    console.log(`[MobileOptimizedRealtime] App state changed: ${previousState} -> ${state}`);

    switch (state) {
      case 'active':
        this.setConnectionMode('full');
        this.clearBackgroundTimer();
        break;
      
      case 'background':
        if (this.options.enableBackgroundOptimization) {
          this.setConnectionMode('efficient');
          this.startBackgroundTimer();
        }
        break;
      
      case 'inactive':
        this.setConnectionMode('minimal');
        break;
    }

    this.adjustConnectionParameters();
  }

  /**
   * Enable data saver mode
   */
  public enableDataSaver(): void {
    this.options.enableDataSaver = true;
    this.setConnectionMode('efficient');
    this.adjustConnectionParameters();
    console.log('[MobileOptimizedRealtime] Data saver mode enabled');
  }

  /**
   * Disable data saver mode
   */
  public disableDataSaver(): void {
    this.options.enableDataSaver = false;
    
    if (this.currentAppState === 'active') {
      this.setConnectionMode('full');
    }
    
    this.adjustConnectionParameters();
    console.log('[MobileOptimizedRealtime] Data saver mode disabled');
  }

  /**
   * Get current network conditions
   */
  public getNetworkConditions(): NetworkCondition {
    const connection = this.networkMonitor;
    
    return {
      quality: this.currentNetworkQuality,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || this.options.enableDataSaver,
    };
  }

  /**
   * Register a real-time channel for optimization
   */
  public registerChannel(channelId: string, channel: RealtimeChannel): void {
    this.channels.set(channelId, channel);
    
    // Apply current optimization settings
    this.applyChannelOptimizations(channelId, channel);
    
    console.log(`[MobileOptimizedRealtime] Registered channel: ${channelId}`);
  }

  /**
   * Unregister a channel
   */
  public unregisterChannel(channelId: string): void {
    this.channels.delete(channelId);
    console.log(`[MobileOptimizedRealtime] Unregistered channel: ${channelId}`);
  }

  /**
   * Send a message with optimization
   */
  public sendMessage(channelId: string, data: any): void {
    const timestamp = Date.now();
    
    if (this.shouldBatchMessage()) {
      // Queue for batching
      this.messageQueue.push({ channel: channelId, data, timestamp });
      this.scheduleBatchSend();
    } else {
      // Send immediately
      this.sendImmediately(channelId, data, timestamp);
    }
  }

  /**
   * Get current optimization metrics
   */
  public getMetrics(): ConnectionMetrics {
    const uptime = this.metrics.connectionUptime;
    
    return {
      ...this.metrics,
      connectionUptime: uptime,
      batteryImpact: this.estimateBatteryImpact(),
    };
  }

  /**
   * Get current optimization status
   */
  public getStatus() {
    return {
      appState: this.currentAppState,
      connectionMode: this.currentConnectionMode,
      networkQuality: this.currentNetworkQuality,
      dataUsage: this.metrics.dataUsage,
      batteryLevel: this.battery?.level,
      charging: this.battery?.charging,
      activeChannels: this.channels.size,
      queuedMessages: this.messageQueue.length,
      options: this.options,
    };
  }

  // Private methods

  private setConnectionMode(mode: ConnectionMode): void {
    if (this.currentConnectionMode === mode) return;

    const previousMode = this.currentConnectionMode;
    this.currentConnectionMode = mode;

    console.log(`[MobileOptimizedRealtime] Connection mode changed: ${previousMode} -> ${mode}`);

    // Apply mode-specific optimizations to all channels
    this.channels.forEach((channel, channelId) => {
      this.applyChannelOptimizations(channelId, channel);
    });
  }

  private applyChannelOptimizations(channelId: string, channel: RealtimeChannel): void {
    // Channel-specific optimizations would be applied here
    // This is a placeholder as Supabase channels don't expose all optimization options
    
    switch (this.currentConnectionMode) {
      case 'minimal':
        // Reduce activity to absolute minimum
        console.log(`[MobileOptimizedRealtime] Applied minimal optimizations to channel ${channelId}`);
        break;
      
      case 'efficient':
        // Moderate optimizations
        console.log(`[MobileOptimizedRealtime] Applied efficient optimizations to channel ${channelId}`);
        break;
      
      case 'full':
        // No optimizations, full performance
        console.log(`[MobileOptimizedRealtime] Applied full performance settings to channel ${channelId}`);
        break;
    }
  }

  private adjustConnectionParameters(): void {
    // Adjust heartbeat interval
    this.restartHeartbeat();
    
    // Adjust batching interval
    this.adjustBatchingInterval();
  }

  private restartHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    let interval: number;
    
    switch (this.currentConnectionMode) {
      case 'minimal':
        interval = this.options.heartbeatIntervals.minimal;
        break;
      case 'efficient':
        interval = this.options.heartbeatIntervals.background;
        break;
      default:
        interval = this.options.heartbeatIntervals.active;
    }

    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat();
    }, interval);

    console.log(`[MobileOptimizedRealtime] Heartbeat interval set to ${interval}ms`);
  }

  private adjustBatchingInterval(): void {
    // Batching is handled by scheduleBatchSend method
    console.log(`[MobileOptimizedRealtime] Adjusted batching for ${this.currentConnectionMode} mode`);
  }

  private shouldBatchMessage(): boolean {
    if (this.currentConnectionMode === 'full' && !this.options.enableDataSaver) {
      return false; // No batching in full mode unless data saver is on
    }

    return this.currentConnectionMode !== 'full';
  }

  private scheduleBatchSend(): void {
    if (this.batchTimer) return;

    let interval: number;
    
    switch (this.currentConnectionMode) {
      case 'minimal':
        interval = this.options.batchingIntervals.minimal;
        break;
      case 'efficient':
        interval = this.options.batchingIntervals.background;
        break;
      default:
        interval = this.options.batchingIntervals.active;
    }

    this.batchTimer = setTimeout(() => {
      this.processBatchedMessages();
      this.batchTimer = null;
    }, interval);
  }

  private processBatchedMessages(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`[MobileOptimizedRealtime] Processing ${this.messageQueue.length} batched messages`);

    // Group messages by channel for efficiency
    const messagesByChannel = new Map<string, any[]>();
    
    this.messageQueue.forEach(({ channel, data }) => {
      if (!messagesByChannel.has(channel)) {
        messagesByChannel.set(channel, []);
      }
      messagesByChannel.get(channel)!.push(data);
    });

    // Send batched messages
    messagesByChannel.forEach((messages, channelId) => {
      const channel = this.channels.get(channelId);
      if (channel) {
        // Send as a batch or send individually
        messages.forEach(data => {
          this.sendImmediately(channelId, data, Date.now());
        });
      }
    });

    // Clear queue
    this.messageQueue = [];
    this.metrics.messagesSent += messagesByChannel.size;
  }

  private sendImmediately(channelId: string, data: any, timestamp: number): void {
    const channel = this.channels.get(channelId);
    if (!channel) {
      console.warn(`[MobileOptimizedRealtime] Channel ${channelId} not found`);
      return;
    }

    // Estimate data usage
    const dataSize = JSON.stringify(data).length;
    this.metrics.dataUsage += dataSize;

    // Send the message
    try {
      channel.send({
        type: 'broadcast',
        event: 'message',
        payload: data
      });
      
      this.metrics.messagesSent++;
      
      // Calculate latency if we can
      const latency = Date.now() - timestamp;
      this.updateAverageLatency(latency);
      
    } catch (error) {
      console.error(`[MobileOptimizedRealtime] Failed to send message on channel ${channelId}:`, error);
    }
  }

  private updateAverageLatency(latency: number): void {
    if (this.metrics.averageLatency === 0) {
      this.metrics.averageLatency = latency;
    } else {
      // Rolling average
      this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
    }
  }

  private performHeartbeat(): void {
    // Simple heartbeat to maintain connection
    console.log(`[MobileOptimizedRealtime] Heartbeat (${this.currentConnectionMode} mode)`);
    
    // Update connection uptime
    this.metrics.connectionUptime = Date.now();
  }

  private estimateBatteryImpact(): number {
    // Simple battery impact estimation based on activity
    const baseImpact = this.channels.size * 5; // 5% per channel
    const messageImpact = (this.metrics.messagesSent + this.metrics.messagesReceived) * 0.1;
    
    let modeMultiplier = 1;
    switch (this.currentConnectionMode) {
      case 'minimal': modeMultiplier = 0.3; break;
      case 'efficient': modeMultiplier = 0.6; break;
      default: modeMultiplier = 1; break;
    }
    
    return Math.min((baseImpact + messageImpact) * modeMultiplier, 100);
  }

  private setupAppStateMonitoring(): void {
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleAppStateChange('background');
      } else {
        this.handleAppStateChange('active');
      }
    });

    // Listen for page lifecycle events if available
    if ('addEventListener' in window) {
      window.addEventListener('beforeunload', () => {
        this.handleAppStateChange('inactive');
      });
    }
  }

  private setupNetworkMonitoring(): void {
    // Modern browsers support Network Information API
    this.networkMonitor = (navigator as any).connection || 
                         (navigator as any).mozConnection || 
                         (navigator as any).webkitConnection;

    if (this.networkMonitor) {
      this.networkMonitor.addEventListener('change', () => {
        this.updateNetworkQuality();
      });
      
      this.updateNetworkQuality();
    }

    // Fallback: monitor online/offline events
    window.addEventListener('online', () => {
      this.currentNetworkQuality = 'high';
      this.setConnectionMode('full');
    });

    window.addEventListener('offline', () => {
      this.currentNetworkQuality = 'offline';
      this.setConnectionMode('offline');
    });
  }

  private updateNetworkQuality(): void {
    if (!this.networkMonitor) return;

    const connection = this.networkMonitor;
    const effectiveType = connection.effectiveType;
    
    switch (effectiveType) {
      case '4g':
        this.currentNetworkQuality = 'high';
        break;
      case '3g':
        this.currentNetworkQuality = 'medium';
        break;
      case '2g':
      case 'slow-2g':
        this.currentNetworkQuality = 'low';
        break;
      default:
        this.currentNetworkQuality = 'medium';
    }

    this.metrics.networkQuality = this.currentNetworkQuality;
    
    // Adapt connection mode based on network quality
    if (this.options.adaptiveFrequency) {
      this.adaptToNetworkQuality();
    }
  }

  private adaptToNetworkQuality(): void {
    if (this.currentAppState !== 'active') return; // Don't override app state optimizations

    switch (this.currentNetworkQuality) {
      case 'low':
        this.setConnectionMode('minimal');
        break;
      case 'medium':
        this.setConnectionMode('efficient');
        break;
      case 'high':
        this.setConnectionMode('full');
        break;
      case 'offline':
        this.setConnectionMode('offline');
        break;
    }
  }

  private async setupBatteryMonitoring(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        this.battery = await (navigator as any).getBattery();
        
        this.battery.addEventListener('levelchange', () => {
          this.handleBatteryLevelChange();
        });
        
        this.battery.addEventListener('chargingchange', () => {
          this.handleChargingStateChange();
        });

        this.handleBatteryLevelChange(); // Initial check
      } catch (error) {
        console.log('[MobileOptimizedRealtime] Battery API not available');
      }
    }
  }

  private handleBatteryLevelChange(): void {
    if (!this.battery) return;

    const batteryLevel = this.battery.level * 100;
    
    if (batteryLevel <= this.options.minimalModeThreshold && !this.battery.charging) {
      console.log(`[MobileOptimizedRealtime] Low battery (${batteryLevel}%), switching to minimal mode`);
      this.setConnectionMode('minimal');
    }
  }

  private handleChargingStateChange(): void {
    if (!this.battery) return;

    if (this.battery.charging && this.currentAppState === 'active') {
      // Device is charging and app is active, can be more aggressive
      this.setConnectionMode('full');
    }
  }

  private startBackgroundTimer(): void {
    this.backgroundTimer = setTimeout(() => {
      if (this.currentAppState === 'background') {
        console.log('[MobileOptimizedRealtime] Max background duration reached, switching to minimal mode');
        this.setConnectionMode('minimal');
      }
    }, this.options.maxBackgroundDuration);
  }

  private clearBackgroundTimer(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }

  private startAdaptiveManagement(): void {
    // Periodically review and adjust optimizations
    setInterval(() => {
      this.performAdaptiveAdjustment();
    }, 60000); // Every minute
  }

  private performAdaptiveAdjustment(): void {
    // Analyze metrics and adjust optimizations
    const metrics = this.getMetrics();
    
    if (metrics.batteryImpact > 80) {
      console.log('[MobileOptimizedRealtime] High battery impact detected, applying optimizations');
      this.enableDataSaver();
    }

    if (metrics.dataUsage > 10 * 1024 * 1024) { // 10MB
      console.log('[MobileOptimizedRealtime] High data usage detected, enabling data saver');
      this.enableDataSaver();
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    this.channels.clear();
    this.messageQueue = [];
  }
}

// Singleton instance
export const mobileOptimizedRealtime = new MobileOptimizedRealtime({
  enableBackgroundOptimization: true,
  enableDataSaver: false, // User-controlled
  adaptiveFrequency: true,
  maxBackgroundDuration: 300000, // 5 minutes
  minimalModeThreshold: 20, // 20% battery
});