/**
 * Mobile Real-time Connection Optimizer
 * 
 * Battery and memory efficient real-time messaging for mobile:
 * - Adaptive connection management
 * - Battery-aware update intervals
 * - Memory pressure handling
 * - Background/foreground optimization
 * 
 * SPIRITUAL MISSION: Keep prayer conversations flowing without draining life
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { nativeMobile } from './nativeMobileIntegration';
import { mobileOptimizer } from './mobileOptimizer';

interface ConnectionState {
  isActive: boolean;
  quality: 'high' | 'medium' | 'low' | 'minimal';
  lastActivity: Date;
  reconnectAttempts: number;
  batteryOptimized: boolean;
}

interface OptimizationSettings {
  updateInterval: number; // milliseconds
  heartbeatInterval: number;
  maxReconnectAttempts: number;
  bufferSize: number;
  enableCompression: boolean;
  priorityChannels: string[];
}

interface BatteryState {
  level: number;
  charging: boolean;
  criticalLevel: boolean;
}

interface NetworkState {
  type: 'wifi' | 'cellular' | 'unknown';
  effectiveType: '2g' | '3g' | '4g' | '5g' | 'unknown';
  downlink: number;
  rtt: number;
}

export class MobileRealtimeOptimizer {
  private connections = new Map<string, RealtimeChannel>();
  private connectionStates = new Map<string, ConnectionState>();
  private settings: OptimizationSettings;
  private batteryState: BatteryState;
  private networkState: NetworkState;
  private isInBackground = false;
  private optimizationTimer?: NodeJS.Timeout;
  private messageBuffer = new Map<string, any[]>();

  constructor() {
    this.settings = this.getDefaultSettings();
    this.batteryState = { level: 1, charging: false, criticalLevel: false };
    this.networkState = { 
      type: 'unknown', 
      effectiveType: 'unknown', 
      downlink: 0, 
      rtt: 0 
    };

    this.initializeOptimization();
  }

  private getDefaultSettings(): OptimizationSettings {
    return {
      updateInterval: 1000, // 1 second default
      heartbeatInterval: 30000, // 30 seconds
      maxReconnectAttempts: 5,
      bufferSize: 50,
      enableCompression: true,
      priorityChannels: ['urgent_prayers', 'direct_messages']
    };
  }

  /**
   * Initialize optimization monitoring
   */
  private async initializeOptimization(): Promise<void> {
    console.log('🔋 Initializing mobile real-time optimization...');

    // Monitor battery state
    await this.setupBatteryMonitoring();

    // Monitor network conditions
    await this.setupNetworkMonitoring();

    // Setup app state listeners
    this.setupAppStateMonitoring();

    // Start optimization loop
    this.startOptimizationLoop();

    console.log('✅ Mobile real-time optimization active');
  }

  /**
   * Battery monitoring
   */
  private async setupBatteryMonitoring(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        
        const updateBatteryState = () => {
          this.batteryState = {
            level: battery.level,
            charging: battery.charging,
            criticalLevel: battery.level <= 0.15 && !battery.charging
          };

          this.adjustForBatteryState();
        };

        updateBatteryState();
        
        battery.addEventListener('levelchange', updateBatteryState);
        battery.addEventListener('chargingchange', updateBatteryState);
        
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }

  /**
   * Network monitoring
   */
  private async setupNetworkMonitoring(): Promise<void> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkState = () => {
        this.networkState = {
          type: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0
        };

        this.adjustForNetworkConditions();
      };

      updateNetworkState();
      connection.addEventListener('change', updateNetworkState);
    }
  }

  /**
   * App state monitoring
   */
  private setupAppStateMonitoring(): void {
    nativeMobile.onNotificationEvent('resume_connections', () => {
      this.isInBackground = false;
      this.optimizeForForeground();
    });

    nativeMobile.onNotificationEvent('reduce_connections', () => {
      this.isInBackground = true;
      this.optimizeForBackground();
    });
  }

  /**
   * Optimization loop
   */
  private startOptimizationLoop(): void {
    this.optimizationTimer = setInterval(() => {
      this.runOptimizationCycle();
    }, 10000); // Every 10 seconds
  }

  private runOptimizationCycle(): void {
    // Check connection health
    this.checkConnectionHealth();

    // Optimize based on current conditions
    this.optimizeConnections();

    // Clean up stale connections
    this.cleanupStaleConnections();

    // Manage message buffers
    this.flushMessageBuffers();

    // Memory pressure check
    this.checkMemoryPressure();
  }

  /**
   * Connection management
   */
  public optimizeConnection(
    channelName: string, 
    channel: RealtimeChannel,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    this.connections.set(channelName, channel);
    this.connectionStates.set(channelName, {
      isActive: true,
      quality: this.determineConnectionQuality(),
      lastActivity: new Date(),
      reconnectAttempts: 0,
      batteryOptimized: false
    });

    // Apply optimizations based on current conditions
    this.applyConnectionOptimizations(channelName, channel);
    
    console.log(`📡 Optimized connection for ${channelName} (priority: ${priority})`);
  }

  private applyConnectionOptimizations(channelName: string, channel: RealtimeChannel): void {
    const state = this.connectionStates.get(channelName);
    if (!state) return;

    const isPriority = this.settings.priorityChannels.includes(channelName);
    
    // Configure update frequency based on conditions
    const updateInterval = this.calculateOptimalUpdateInterval(isPriority);
    
    // Buffer non-critical updates
    if (!isPriority && this.batteryState.criticalLevel) {
      this.enableMessageBuffering(channelName);
    }

    // Adjust connection quality
    this.adjustConnectionQuality(channelName, state.quality);
  }

  private calculateOptimalUpdateInterval(isPriority: boolean): number {
    let baseInterval = this.settings.updateInterval;

    // Background optimization
    if (this.isInBackground) {
      baseInterval *= isPriority ? 2 : 5; // Slower updates in background
    }

    // Battery optimization
    if (this.batteryState.criticalLevel) {
      baseInterval *= isPriority ? 3 : 10; // Much slower when battery critical
    }

    // Network optimization
    if (this.networkState.effectiveType === '2g') {
      baseInterval *= 2;
    } else if (this.networkState.effectiveType === '3g') {
      baseInterval *= 1.5;
    }

    return Math.min(baseInterval, 30000); // Max 30 seconds
  }

  /**
   * Battery optimization strategies
   */
  private adjustForBatteryState(): void {
    console.log(`🔋 Battery state: ${(this.batteryState.level * 100).toFixed(0)}% ${this.batteryState.charging ? '(charging)' : ''}`);

    if (this.batteryState.criticalLevel) {
      this.enableAggressiveBatteryOptimization();
    } else if (this.batteryState.level <= 0.3 && !this.batteryState.charging) {
      this.enableModerateBatteryOptimization();
    } else {
      this.disableBatteryOptimization();
    }
  }

  private enableAggressiveBatteryOptimization(): void {
    console.log('🔋 Enabling aggressive battery optimization');
    
    // Reduce update frequencies dramatically
    this.settings.updateInterval = 10000; // 10 seconds
    this.settings.heartbeatInterval = 120000; // 2 minutes

    // Enable compression for all connections
    this.settings.enableCompression = true;

    // Increase buffer sizes
    this.settings.bufferSize = 100;

    // Suspend non-priority connections
    this.connections.forEach((channel, channelName) => {
      if (!this.settings.priorityChannels.includes(channelName)) {
        this.suspendConnection(channelName);
      }
    });
  }

  private enableModerateBatteryOptimization(): void {
    console.log('🔋 Enabling moderate battery optimization');
    
    this.settings.updateInterval = 3000; // 3 seconds
    this.settings.heartbeatInterval = 60000; // 1 minute
    this.settings.bufferSize = 75;
  }

  private disableBatteryOptimization(): void {
    this.settings = this.getDefaultSettings();
    
    // Resume all suspended connections
    this.connections.forEach((channel, channelName) => {
      this.resumeConnection(channelName);
    });
  }

  /**
   * Network optimization strategies
   */
  private adjustForNetworkConditions(): void {
    console.log(`📡 Network: ${this.networkState.effectiveType} (${this.networkState.type})`);

    switch (this.networkState.effectiveType) {
      case '2g':
        this.enableSlowNetworkOptimization();
        break;
      case '3g':
        this.enableMediumNetworkOptimization();
        break;
      case '4g':
      case '5g':
        this.enableFastNetworkOptimization();
        break;
      default:
        this.enableMediumNetworkOptimization();
    }
  }

  private enableSlowNetworkOptimization(): void {
    console.log('📡 Optimizing for slow network');
    
    // Aggressive compression and buffering
    this.settings.enableCompression = true;
    this.settings.bufferSize = 200;
    this.settings.updateInterval = Math.max(this.settings.updateInterval, 5000);

    // Reduce connection quality
    this.connections.forEach((channel, channelName) => {
      this.adjustConnectionQuality(channelName, 'low');
    });
  }

  private enableMediumNetworkOptimization(): void {
    this.settings.bufferSize = 100;
    this.settings.enableCompression = true;
  }

  private enableFastNetworkOptimization(): void {
    this.settings.bufferSize = 50;
    this.settings.enableCompression = false; // No need for compression overhead
  }

  /**
   * Background/Foreground optimization
   */
  private optimizeForBackground(): void {
    console.log('📱 Optimizing for background mode');
    
    // Dramatically reduce activity
    this.settings.updateInterval *= 5;
    this.settings.heartbeatInterval = 300000; // 5 minutes

    // Buffer all non-urgent messages
    this.connections.forEach((channel, channelName) => {
      if (!this.settings.priorityChannels.includes(channelName)) {
        this.enableMessageBuffering(channelName);
      }
    });

    // Reduce connection quality
    this.connections.forEach((channel, channelName) => {
      this.adjustConnectionQuality(channelName, 'minimal');
    });
  }

  private optimizeForForeground(): void {
    console.log('📱 Optimizing for foreground mode');
    
    // Restore normal intervals
    this.settings = this.getDefaultSettings();
    this.adjustForBatteryState();
    this.adjustForNetworkConditions();

    // Flush all buffered messages
    this.flushAllMessageBuffers();

    // Restore connection quality
    this.connections.forEach((channel, channelName) => {
      this.adjustConnectionQuality(channelName, 'high');
    });
  }

  /**
   * Message buffering
   */
  private enableMessageBuffering(channelName: string): void {
    if (!this.messageBuffer.has(channelName)) {
      this.messageBuffer.set(channelName, []);
    }
  }

  private bufferMessage(channelName: string, message: any): void {
    const buffer = this.messageBuffer.get(channelName) || [];
    buffer.push({ ...message, timestamp: Date.now() });
    
    // Limit buffer size
    if (buffer.length > this.settings.bufferSize) {
      buffer.shift(); // Remove oldest
    }
    
    this.messageBuffer.set(channelName, buffer);
  }

  private flushMessageBuffers(): void {
    this.messageBuffer.forEach((messages, channelName) => {
      if (messages.length > 0) {
        // Send buffered messages in batch
        this.sendBufferedMessages(channelName, messages);
        this.messageBuffer.set(channelName, []);
      }
    });
  }

  private flushAllMessageBuffers(): void {
    this.messageBuffer.forEach((messages, channelName) => {
      this.sendBufferedMessages(channelName, messages);
    });
    this.messageBuffer.clear();
  }

  private sendBufferedMessages(channelName: string, messages: any[]): void {
    const channel = this.connections.get(channelName);
    if (!channel || messages.length === 0) return;

    // Send as batch if possible, otherwise send individually
    if (messages.length === 1) {
      channel.send(messages[0]);
    } else {
      channel.send({
        type: 'batch_messages',
        messages,
        count: messages.length
      });
    }

    console.log(`📦 Flushed ${messages.length} buffered messages for ${channelName}`);
  }

  /**
   * Connection health monitoring
   */
  private checkConnectionHealth(): void {
    this.connections.forEach((channel, channelName) => {
      const state = this.connectionStates.get(channelName);
      if (!state) return;

      const timeSinceActivity = Date.now() - state.lastActivity.getTime();
      
      // Consider connection stale after 2 minutes of inactivity
      if (timeSinceActivity > 120000 && state.isActive) {
        this.handleStaleConnection(channelName);
      }
    });
  }

  private handleStaleConnection(channelName: string): void {
    const state = this.connectionStates.get(channelName);
    if (!state) return;

    console.log(`⚠️ Stale connection detected: ${channelName}`);
    
    // Try to reconnect if under limit
    if (state.reconnectAttempts < this.settings.maxReconnectAttempts) {
      this.attemptReconnect(channelName);
    } else {
      this.suspendConnection(channelName);
    }
  }

  private attemptReconnect(channelName: string): void {
    const state = this.connectionStates.get(channelName);
    if (!state) return;

    state.reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${state.reconnectAttempts} for ${channelName}`);
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);
    setTimeout(() => {
      this.reconnectChannel(channelName);
    }, delay);
  }

  private reconnectChannel(channelName: string): void {
    const channel = this.connections.get(channelName);
    const state = this.connectionStates.get(channelName);
    
    if (channel && state) {
      // Unsubscribe and resubscribe
      channel.unsubscribe();
      channel.subscribe();
      
      state.lastActivity = new Date();
      state.isActive = true;
    }
  }

  private suspendConnection(channelName: string): void {
    const channel = this.connections.get(channelName);
    const state = this.connectionStates.get(channelName);
    
    if (channel && state) {
      console.log(`⏸️ Suspending connection: ${channelName}`);
      channel.unsubscribe();
      state.isActive = false;
    }
  }

  private resumeConnection(channelName: string): void {
    const channel = this.connections.get(channelName);
    const state = this.connectionStates.get(channelName);
    
    if (channel && state && !state.isActive) {
      console.log(`▶️ Resuming connection: ${channelName}`);
      channel.subscribe();
      state.isActive = true;
      state.lastActivity = new Date();
      state.reconnectAttempts = 0;
    }
  }

  /**
   * Memory management
   */
  private checkMemoryPressure(): void {
    const metrics = mobileOptimizer.getPerformanceMetrics();
    
    if (metrics.memoryUsage > 100) { // >100MB
      console.log('🧹 Memory pressure detected, optimizing...');
      this.handleMemoryPressure();
    }
  }

  private handleMemoryPressure(): void {
    // Reduce buffer sizes
    this.settings.bufferSize = Math.max(10, this.settings.bufferSize / 2);
    
    // Flush buffers immediately
    this.flushAllMessageBuffers();
    
    // Suspend non-priority connections temporarily
    this.connections.forEach((channel, channelName) => {
      if (!this.settings.priorityChannels.includes(channelName)) {
        this.suspendConnection(channelName);
        
        // Resume after 30 seconds
        setTimeout(() => {
          this.resumeConnection(channelName);
        }, 30000);
      }
    });
  }

  /**
   * Utility methods
   */
  private determineConnectionQuality(): 'high' | 'medium' | 'low' | 'minimal' {
    if (this.batteryState.criticalLevel || this.isInBackground) {
      return 'minimal';
    }
    
    if (this.networkState.effectiveType === '2g') {
      return 'low';
    }
    
    if (this.networkState.effectiveType === '3g' || this.batteryState.level <= 0.3) {
      return 'medium';
    }
    
    return 'high';
  }

  private adjustConnectionQuality(channelName: string, quality: string): void {
    const state = this.connectionStates.get(channelName);
    if (state) {
      state.quality = quality as any;
    }
  }

  private cleanupStaleConnections(): void {
    const staleThreshold = 300000; // 5 minutes
    const now = Date.now();
    
    this.connectionStates.forEach((state, channelName) => {
      if (!state.isActive && now - state.lastActivity.getTime() > staleThreshold) {
        console.log(`🗑️ Cleaning up stale connection: ${channelName}`);
        this.connections.delete(channelName);
        this.connectionStates.delete(channelName);
        this.messageBuffer.delete(channelName);
      }
    });
  }

  /**
   * Public API
   */
  public getOptimizationStats() {
    return {
      connections: this.connections.size,
      activeConnections: Array.from(this.connectionStates.values()).filter(s => s.isActive).length,
      batteryLevel: this.batteryState.level,
      networkType: this.networkState.effectiveType,
      isBackground: this.isInBackground,
      updateInterval: this.settings.updateInterval,
      bufferedMessages: Array.from(this.messageBuffer.values()).reduce((sum, buffer) => sum + buffer.length, 0)
    };
  }

  public forceOptimization(): void {
    this.runOptimizationCycle();
  }

  public destroy(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
    }
    
    this.connections.clear();
    this.connectionStates.clear();
    this.messageBuffer.clear();
  }
}

// Global instance
export const realtimeOptimizer = new MobileRealtimeOptimizer();
export default realtimeOptimizer;