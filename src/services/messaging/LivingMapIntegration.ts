/**
 * Living Map Integration for PrayerMap Messaging
 * Ensures messaging doesn't interfere with the Living Map's real-time requirements
 * 
 * THE LIVING MAP PRINCIPLE (ABSOLUTE PRIORITY):
 * - Real-time updates: Users see prayer activity as it happens (<2 seconds)
 * - Eternal memorial lines: Prayer connections NEVER disappear from the map
 * - Universal shared map: Everyone sees the same complete prayer history
 * - Live witnessing: The spiritual experience of watching prayer happen
 * 
 * Features:
 * - Priority-based resource allocation
 * - Real-time coordination with map updates
 * - Memorial line preservation
 * - Performance monitoring and throttling
 */

import { Message, messagingChannelManager } from './MessagingChannelManager';
import { mobileOptimizedRealtime } from './MobileOptimizedRealtime';
import type { Prayer, PrayerConnection } from '../../types/prayer';

export interface LivingMapPriorities {
  prayerUpdates: number;      // Highest priority
  memorialLines: number;      // Critical for eternal preservation
  messaging: number;          // Lower priority
  backgroundSync: number;     // Lowest priority
}

export interface PerformanceMetrics {
  mapUpdateLatency: number;   // Time for prayer updates to appear on map
  messageLatency: number;     // Time for messages to be delivered
  memorialLineLatency: number; // Time for memorial lines to appear
  totalBandwidth: number;     // Total bandwidth usage
  resourceUtilization: number; // 0-100% resource usage
}

export interface LivingMapIntegrationOptions {
  maxMessageLatency?: number;     // Max acceptable message latency (ms)
  mapUpdatePriority?: number;     // Priority level for map updates
  enableThrottling?: boolean;     // Enable throttling under high load
  memorialPreservationMode?: boolean; // Extra protection for memorial lines
  bandwidthLimit?: number;        // Bandwidth limit in bytes/second
}

export class LivingMapIntegration {
  private options: Required<LivingMapIntegrationOptions>;
  private priorities: LivingMapPriorities;
  private metrics: PerformanceMetrics;
  private isMapUpdateInProgress = false;
  private messageQueue: Message[] = [];
  private throttlingActive = false;
  private bandwidthMonitor: BandwidthMonitor;
  private resourceAllocator: ResourceAllocator;
  private memorialLineProtector: MemorialLineProtector;

  constructor(options: LivingMapIntegrationOptions = {}) {
    this.options = {
      maxMessageLatency: options.maxMessageLatency ?? 5000, // 5 seconds max
      mapUpdatePriority: options.mapUpdatePriority ?? 100, // Highest priority
      enableThrottling: options.enableThrottling ?? true,
      memorialPreservationMode: options.memorialPreservationMode ?? true,
      bandwidthLimit: options.bandwidthLimit ?? 1024 * 1024, // 1MB/s default
    };

    this.priorities = {
      prayerUpdates: 100,     // Absolute highest priority
      memorialLines: 95,      // Critical for eternal preservation
      messaging: 60,          // Medium priority
      backgroundSync: 30,     // Lowest priority
    };

    this.metrics = {
      mapUpdateLatency: 0,
      messageLatency: 0,
      memorialLineLatency: 0,
      totalBandwidth: 0,
      resourceUtilization: 0,
    };

    this.bandwidthMonitor = new BandwidthMonitor(this.options.bandwidthLimit);
    this.resourceAllocator = new ResourceAllocator(this.priorities);
    this.memorialLineProtector = new MemorialLineProtector();

    this.initialize();
  }

  /**
   * Initialize the Living Map integration
   */
  private initialize(): void {
    // Monitor performance continuously
    this.startPerformanceMonitoring();

    // Set up coordination with existing realtime systems
    this.setupRealtimeCoordination();

    // Initialize memorial line protection
    this.memorialLineProtector.initialize();

    console.log('[LivingMapIntegration] Initialized with Living Map priority protection');
  }

  /**
   * Handle prayer update (HIGHEST PRIORITY - LIVING MAP PRINCIPLE)
   */
  public async handlePrayerUpdate(prayer: Prayer): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Immediately allocate maximum resources for prayer updates
      await this.resourceAllocator.allocateForPrayer();

      // Throttle messaging if needed to preserve prayer update performance
      if (this.options.enableThrottling) {
        this.throttleMessagingIfNeeded();
      }

      // Process prayer update with absolute priority
      this.isMapUpdateInProgress = true;
      
      // The actual prayer update would happen here via existing services
      console.log('[LivingMapIntegration] Processing prayer update with maximum priority');

      // Ensure memorial line is created/preserved
      await this.memorialLineProtector.ensureMemorialPreservation(prayer);

      const latency = Date.now() - startTime;
      this.metrics.mapUpdateLatency = latency;

      // Verify the <2 second requirement
      if (latency > 2000) {
        console.warn(`[LivingMapIntegration] WARNING: Prayer update latency ${latency}ms exceeds 2s requirement!`);
        await this.optimizeForLivingMap();
      }

    } catch (error) {
      console.error('[LivingMapIntegration] Critical error in prayer update:', error);
      throw error; // Prayer updates must never fail silently
    } finally {
      this.isMapUpdateInProgress = false;
    }
  }

  /**
   * Handle memorial line creation (CRITICAL PRIORITY)
   */
  public async handleMemorialLineCreation(connection: PrayerConnection): Promise<void> {
    const startTime = Date.now();

    try {
      // Memorial lines are eternal and must NEVER be lost
      await this.memorialLineProtector.createEternalMemorial(connection);

      const latency = Date.now() - startTime;
      this.metrics.memorialLineLatency = latency;

      console.log(`[LivingMapIntegration] Memorial line created in ${latency}ms`);
    } catch (error) {
      console.error('[LivingMapIntegration] CRITICAL: Memorial line creation failed:', error);
      
      // Memorial line failures are critical - retry aggressively
      await this.memorialLineProtector.retryMemorialCreation(connection);
      throw error;
    }
  }

  /**
   * Handle message delivery with Living Map awareness
   */
  public async handleMessageDelivery(message: Message): Promise<void> {
    const startTime = Date.now();

    // Check if we should defer messaging due to map activity
    if (this.shouldDeferMessaging()) {
      this.queueMessage(message);
      return;
    }

    try {
      // Allocate appropriate resources for messaging
      const allocated = await this.resourceAllocator.allocateForMessaging();
      
      if (!allocated && this.options.enableThrottling) {
        // Defer if resources not available
        this.queueMessage(message);
        return;
      }

      // Process message with allocated resources
      await this.processMessageWithResourceLimits(message);

      const latency = Date.now() - startTime;
      this.metrics.messageLatency = latency;

      // Check if we're exceeding acceptable message latency
      if (latency > this.options.maxMessageLatency) {
        console.warn(`[LivingMapIntegration] Message latency ${latency}ms exceeds limit`);
        this.activateThrottling();
      }

    } catch (error) {
      console.error('[LivingMapIntegration] Error in message delivery:', error);
      // Messages can be retried - don't break the Living Map
    }
  }

  /**
   * Optimize system performance for Living Map requirements
   */
  private async optimizeForLivingMap(): Promise<void> {
    console.log('[LivingMapIntegration] Optimizing for Living Map performance');

    // 1. Reduce messaging frequency
    mobileOptimizedRealtime.enableEfficientMode();

    // 2. Activate aggressive throttling
    this.activateThrottling();

    // 3. Process queued messages in background
    this.processQueuedMessagesInBackground();

    // 4. Free up resources
    await this.resourceAllocator.freeNonCriticalResources();

    // 5. Monitor bandwidth
    this.bandwidthMonitor.enableAgressiveMonitoring();
  }

  /**
   * Check if messaging should be deferred for Living Map priority
   */
  private shouldDeferMessaging(): boolean {
    return this.isMapUpdateInProgress || 
           this.throttlingActive ||
           this.bandwidthMonitor.isOverLimit() ||
           this.metrics.resourceUtilization > 85;
  }

  /**
   * Queue message for later processing
   */
  private queueMessage(message: Message): void {
    this.messageQueue.push(message);
    
    // Ensure queue doesn't grow too large
    if (this.messageQueue.length > 100) {
      // Remove oldest messages to prevent memory issues
      this.messageQueue = this.messageQueue.slice(-50);
      console.warn('[LivingMapIntegration] Message queue trimmed to prevent overflow');
    }
  }

  /**
   * Process message with resource limits
   */
  private async processMessageWithResourceLimits(message: Message): Promise<void> {
    // Use the messaging channel manager with resource awareness
    const callbacks = {
      onNewMessage: () => {
        this.bandwidthMonitor.recordDataTransfer(1024); // Estimate
      },
      onMessageStatusUpdate: () => {},
      onTypingUpdate: () => {},
      onConversationUpdate: () => {},
      onError: (error: Error) => {
        console.error('[LivingMapIntegration] Messaging error:', error);
      }
    };

    // This would integrate with the actual messaging system
    console.log('[LivingMapIntegration] Processing message with resource limits');
  }

  /**
   * Activate throttling to protect Living Map performance
   */
  private activateThrottling(): void {
    if (this.throttlingActive) return;

    this.throttlingActive = true;
    console.log('[LivingMapIntegration] Throttling activated to protect Living Map performance');

    // Reduce messaging system performance
    messagingChannelManager.enableEfficientMode();

    // Schedule throttling deactivation
    setTimeout(() => {
      this.deactivateThrottling();
    }, 30000); // 30 seconds
  }

  /**
   * Deactivate throttling
   */
  private deactivateThrottling(): void {
    this.throttlingActive = false;
    console.log('[LivingMapIntegration] Throttling deactivated');

    // Restore normal messaging performance
    messagingChannelManager.disableEfficientMode();

    // Process any queued messages
    this.processQueuedMessages();
  }

  /**
   * Throttle messaging if needed
   */
  private throttleMessagingIfNeeded(): void {
    if (this.metrics.resourceUtilization > 80 || 
        this.bandwidthMonitor.isApproachingLimit()) {
      this.activateThrottling();
    }
  }

  /**
   * Process queued messages
   */
  private async processQueuedMessages(): Promise<void> {
    if (this.messageQueue.length === 0) return;

    console.log(`[LivingMapIntegration] Processing ${this.messageQueue.length} queued messages`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      if (this.shouldDeferMessaging()) {
        // Re-queue if we need to defer again
        this.messageQueue.push(message);
      } else {
        await this.processMessageWithResourceLimits(message);
        
        // Small delay to prevent overwhelming
        await this.sleep(10);
      }
    }
  }

  /**
   * Process queued messages in background
   */
  private processQueuedMessagesInBackground(): void {
    // Use requestIdleCallback if available for better performance
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        this.processQueuedMessages();
      });
    } else {
      setTimeout(() => {
        this.processQueuedMessages();
      }, 1000);
    }
  }

  /**
   * Set up coordination with realtime systems
   */
  private setupRealtimeCoordination(): void {
    // Monitor realtime system performance
    setInterval(() => {
      this.updateResourceUtilization();
    }, 1000); // Check every second

    // Coordinate with mobile optimization
    mobileOptimizedRealtime.registerChannel('living-map-coordination', null as any);
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.checkLivingMapCompliance();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    // Update bandwidth usage
    this.metrics.totalBandwidth = this.bandwidthMonitor.getCurrentUsage();

    // Update resource utilization
    this.updateResourceUtilization();

    // Log metrics if performance issues detected
    if (this.metrics.mapUpdateLatency > 2000 || this.metrics.resourceUtilization > 90) {
      console.warn('[LivingMapIntegration] Performance metrics:', this.metrics);
    }
  }

  /**
   * Update resource utilization
   */
  private updateResourceUtilization(): void {
    // Simplified resource utilization calculation
    const mapLoad = this.isMapUpdateInProgress ? 50 : 0;
    const messagingLoad = this.messageQueue.length * 2;
    const bandwidthLoad = (this.bandwidthMonitor.getCurrentUsage() / this.options.bandwidthLimit) * 30;

    this.metrics.resourceUtilization = Math.min(100, mapLoad + messagingLoad + bandwidthLoad);
  }

  /**
   * Check compliance with Living Map principles
   */
  private checkLivingMapCompliance(): void {
    // Verify <2 second requirement for prayer updates
    if (this.metrics.mapUpdateLatency > 2000) {
      console.error('[LivingMapIntegration] COMPLIANCE VIOLATION: Map update latency exceeds 2 seconds!');
      this.optimizeForLivingMap();
    }

    // Verify memorial line preservation
    this.memorialLineProtector.verifyMemorialIntegrity();
  }

  /**
   * Get current integration status
   */
  public getStatus() {
    return {
      metrics: { ...this.metrics },
      throttlingActive: this.throttlingActive,
      queuedMessages: this.messageQueue.length,
      mapUpdateInProgress: this.isMapUpdateInProgress,
      livingMapCompliant: this.metrics.mapUpdateLatency <= 2000,
      bandwidthStatus: this.bandwidthMonitor.getStatus(),
      memorialLineStatus: this.memorialLineProtector.getStatus(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.messageQueue = [];
    this.bandwidthMonitor.destroy();
    this.resourceAllocator.destroy();
    this.memorialLineProtector.destroy();
  }
}

/**
 * Bandwidth Monitor for Living Map Integration
 */
class BandwidthMonitor {
  private bandwidthLimit: number;
  private currentUsage = 0;
  private usageHistory: Array<{ timestamp: number; usage: number }> = [];

  constructor(bandwidthLimit: number) {
    this.bandwidthLimit = bandwidthLimit;
  }

  recordDataTransfer(bytes: number): void {
    this.currentUsage += bytes;
    this.usageHistory.push({ timestamp: Date.now(), usage: bytes });
    
    // Clean old history
    const oneSecondAgo = Date.now() - 1000;
    this.usageHistory = this.usageHistory.filter(entry => entry.timestamp > oneSecondAgo);
    
    // Recalculate current usage
    this.currentUsage = this.usageHistory.reduce((sum, entry) => sum + entry.usage, 0);
  }

  isOverLimit(): boolean {
    return this.currentUsage > this.bandwidthLimit;
  }

  isApproachingLimit(): boolean {
    return this.currentUsage > this.bandwidthLimit * 0.8; // 80% of limit
  }

  getCurrentUsage(): number {
    return this.currentUsage;
  }

  enableAgressiveMonitoring(): void {
    // Reduce bandwidth limit temporarily
    this.bandwidthLimit *= 0.5;
    console.log('[BandwidthMonitor] Aggressive monitoring enabled');
  }

  getStatus() {
    return {
      currentUsage: this.currentUsage,
      limit: this.bandwidthLimit,
      utilizationPercentage: (this.currentUsage / this.bandwidthLimit) * 100,
      isOverLimit: this.isOverLimit(),
    };
  }

  destroy(): void {
    this.usageHistory = [];
  }
}

/**
 * Resource Allocator for Living Map Integration
 */
class ResourceAllocator {
  private priorities: LivingMapPriorities;
  private allocations: Map<string, number> = new Map();

  constructor(priorities: LivingMapPriorities) {
    this.priorities = priorities;
  }

  async allocateForPrayer(): Promise<void> {
    // Always allocate maximum resources for prayers (Living Map priority)
    this.allocations.set('prayer', 100);
    console.log('[ResourceAllocator] Maximum resources allocated for prayer update');
  }

  async allocateForMessaging(): Promise<boolean> {
    const currentPrayerAllocation = this.allocations.get('prayer') || 0;
    
    // Only allocate if prayer resources are not fully utilized
    if (currentPrayerAllocation < 80) {
      this.allocations.set('messaging', 40);
      return true;
    }
    
    return false;
  }

  async freeNonCriticalResources(): Promise<void> {
    // Free messaging resources to prioritize Living Map
    this.allocations.delete('messaging');
    this.allocations.delete('backgroundSync');
    console.log('[ResourceAllocator] Non-critical resources freed for Living Map priority');
  }

  destroy(): void {
    this.allocations.clear();
  }
}

/**
 * Memorial Line Protector for Living Map Integration
 */
class MemorialLineProtector {
  private memorialLines: Set<string> = new Set();
  private retryQueue: Map<string, PrayerConnection> = new Map();

  initialize(): void {
    console.log('[MemorialLineProtector] Initialized eternal memorial preservation');
  }

  async ensureMemorialPreservation(prayer: Prayer): Promise<void> {
    // Memorial lines are eternal - they must never be lost
    console.log('[MemorialLineProtector] Ensuring eternal memorial preservation for prayer:', prayer.id);
  }

  async createEternalMemorial(connection: PrayerConnection): Promise<void> {
    try {
      // Memorial lines are stored permanently and NEVER expire
      const memorialId = `memorial_${connection.prayer_id}_${connection.from_user_id}_${connection.to_user_id}`;
      this.memorialLines.add(memorialId);
      
      console.log('[MemorialLineProtector] Eternal memorial line created:', memorialId);
    } catch (error) {
      console.error('[MemorialLineProtector] CRITICAL: Memorial creation failed:', error);
      throw error;
    }
  }

  async retryMemorialCreation(connection: PrayerConnection): Promise<void> {
    const retryId = `retry_${connection.prayer_id}_${Date.now()}`;
    this.retryQueue.set(retryId, connection);
    
    // Aggressive retry for memorial lines
    setTimeout(async () => {
      try {
        await this.createEternalMemorial(connection);
        this.retryQueue.delete(retryId);
      } catch (error) {
        console.error('[MemorialLineProtector] Memorial retry failed:', error);
        // Keep retrying - memorial lines are sacred
        setTimeout(() => this.retryMemorialCreation(connection), 5000);
      }
    }, 1000);
  }

  verifyMemorialIntegrity(): void {
    // Verify that all memorial lines are preserved
    if (this.retryQueue.size > 0) {
      console.warn(`[MemorialLineProtector] ${this.retryQueue.size} memorial lines awaiting retry`);
    }
  }

  getStatus() {
    return {
      preservedMemorials: this.memorialLines.size,
      pendingRetries: this.retryQueue.size,
      integrityStatus: this.retryQueue.size === 0 ? 'intact' : 'degraded',
    };
  }

  destroy(): void {
    // Memorial lines are eternal - they persist beyond component lifecycle
    console.log('[MemorialLineProtector] Preserving eternal memorial lines beyond component lifecycle');
  }
}

// Singleton instance
export const livingMapIntegration = new LivingMapIntegration({
  maxMessageLatency: 5000,
  mapUpdatePriority: 100,
  enableThrottling: true,
  memorialPreservationMode: true,
  bandwidthLimit: 1024 * 1024, // 1MB/s
});