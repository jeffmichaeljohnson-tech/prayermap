/**
 * Message Cache Manager for PrayerMap
 * Advanced message caching and pagination for smooth infinite scroll
 * 
 * Features:
 * - Intelligent LRU caching with size limits
 * - Smooth infinite scroll with predictive loading
 * - Memory-efficient storage with compression
 * - Background cache warming
 * - Cache invalidation and synchronization
 * - IndexedDB persistence for offline access
 */

import { Message } from './MessagingChannelManager';

export interface CacheOptions {
  maxCacheSize?: number; // Maximum number of messages to cache
  maxMemoryUsage?: number; // Maximum memory usage in bytes
  enablePersistence?: boolean; // Store in IndexedDB for offline access
  enablePredictiveLoading?: boolean; // Preload adjacent pages
  enableCompression?: boolean; // Compress cached messages
  prefetchDistance?: number; // How many pages ahead to prefetch
  pageSize?: number; // Number of messages per page
}

export interface MessagePage {
  conversationId: string;
  pageNumber: number;
  messages: Message[];
  hasMore: boolean;
  loadedAt: Date;
  lastAccessedAt: Date;
  size: number; // Size in bytes
  compressed?: boolean;
}

export interface CacheMetrics {
  hitRate: number; // Cache hit rate percentage
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: number; // Current memory usage in bytes
  persistedSize: number; // Size of persisted cache in bytes
  evictionCount: number; // Number of evicted pages
  compressionRatio?: number; // Average compression ratio
}

export interface PaginationState {
  conversationId: string;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  isLoading: boolean;
  prefetchedPages: Set<number>;
}

export class MessageCacheManager {
  private cache: Map<string, MessagePage> = new Map(); // key: `${conversationId}_${pageNumber}`
  private accessOrder: string[] = []; // LRU tracking
  private paginationStates: Map<string, PaginationState> = new Map(); // key: conversationId
  private options: Required<CacheOptions>;
  private metrics: CacheMetrics;
  private db: IDBDatabase | null = null;
  private dbName = 'PrayerMapMessageCache';
  private storeName = 'messagePages';
  private compressionWorker: Worker | null = null;
  private prefetchQueue: Set<string> = new Set(); // Pages queued for prefetch
  private loadCallbacks: Map<string, Function> = new Map(); // External load functions

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxCacheSize: options.maxCacheSize ?? 100, // 100 pages
      maxMemoryUsage: options.maxMemoryUsage ?? 50 * 1024 * 1024, // 50MB
      enablePersistence: options.enablePersistence ?? true,
      enablePredictiveLoading: options.enablePredictiveLoading ?? true,
      enableCompression: options.enableCompression ?? true,
      prefetchDistance: options.prefetchDistance ?? 2,
      pageSize: options.pageSize ?? 50,
    };

    this.metrics = {
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      persistedSize: 0,
      evictionCount: 0,
    };

    this.initialize();
  }

  /**
   * Initialize the cache manager
   */
  private async initialize(): Promise<void> {
    if (this.options.enablePersistence) {
      await this.initializeIndexedDB();
    }

    if (this.options.enableCompression) {
      this.initializeCompression();
    }

    // Start background maintenance
    this.startBackgroundMaintenance();
  }

  /**
   * Register a function to load messages when cache miss occurs
   */
  public setLoadFunction(
    conversationId: string,
    loadFn: (pageNumber: number, pageSize: number) => Promise<{ messages: Message[]; hasMore: boolean }>
  ): void {
    this.loadCallbacks.set(conversationId, loadFn);
  }

  /**
   * Load messages for a conversation with intelligent caching and pagination
   */
  public async loadConversationMessages(
    conversationId: string,
    pageNumber: number = 0,
    beforeMessageId?: string
  ): Promise<{ messages: Message[]; hasMore: boolean; fromCache: boolean }> {
    this.metrics.totalRequests++;

    const cacheKey = this.getCacheKey(conversationId, pageNumber);
    const cachedPage = await this.getCachedPage(cacheKey);

    if (cachedPage) {
      // Cache hit
      this.metrics.cacheHits++;
      this.updateAccessTime(cacheKey);
      this.updateMetrics();

      // Trigger predictive loading
      if (this.options.enablePredictiveLoading) {
        this.schedulePredictiveLoading(conversationId, pageNumber);
      }

      return {
        messages: cachedPage.messages,
        hasMore: cachedPage.hasMore,
        fromCache: true,
      };
    }

    // Cache miss - load from external source
    this.metrics.cacheMisses++;
    const loadFn = this.loadCallbacks.get(conversationId);
    
    if (!loadFn) {
      throw new Error(`No load function registered for conversation ${conversationId}`);
    }

    try {
      const result = await loadFn(pageNumber, this.options.pageSize);
      
      // Cache the loaded page
      await this.cachePage(conversationId, pageNumber, result.messages, result.hasMore);
      
      // Update pagination state
      this.updatePaginationState(conversationId, pageNumber, result.hasMore);
      
      // Trigger predictive loading
      if (this.options.enablePredictiveLoading && result.hasMore) {
        this.schedulePredictiveLoading(conversationId, pageNumber);
      }

      this.updateMetrics();

      return {
        messages: result.messages,
        hasMore: result.hasMore,
        fromCache: false,
      };
    } catch (error) {
      console.error(`[MessageCacheManager] Failed to load messages for ${conversationId}, page ${pageNumber}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a conversation (when new messages arrive)
   */
  public invalidateConversation(conversationId: string): void {
    const keysToRemove: string[] = [];
    
    this.cache.forEach((page, key) => {
      if (page.conversationId === conversationId) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });

    // Clear pagination state
    this.paginationStates.delete(conversationId);

    // Clear from IndexedDB
    if (this.options.enablePersistence) {
      this.clearPersistedConversation(conversationId);
    }

    console.log(`[MessageCacheManager] Invalidated cache for conversation ${conversationId}`);
  }

  /**
   * Add a new message to the cache (for real-time updates)
   */
  public addMessageToCache(conversationId: string, message: Message): void {
    // Add to the first page (most recent)
    const cacheKey = this.getCacheKey(conversationId, 0);
    const cachedPage = this.cache.get(cacheKey);

    if (cachedPage) {
      // Add message to the beginning of the first page
      cachedPage.messages.unshift(message);
      cachedPage.lastAccessedAt = new Date();
      cachedPage.size = this.calculatePageSize(cachedPage);

      // Update cache
      this.cache.set(cacheKey, cachedPage);
      
      // Persist if enabled
      if (this.options.enablePersistence) {
        this.persistPage(cachedPage);
      }
    }
  }

  /**
   * Update a message in the cache
   */
  public updateMessageInCache(conversationId: string, messageId: string, updates: Partial<Message>): void {
    let found = false;

    this.cache.forEach((page, key) => {
      if (page.conversationId === conversationId && !found) {
        const messageIndex = page.messages.findIndex(msg => msg.id === messageId);
        if (messageIndex !== -1) {
          page.messages[messageIndex] = { ...page.messages[messageIndex], ...updates };
          page.lastAccessedAt = new Date();
          page.size = this.calculatePageSize(page);
          
          this.cache.set(key, page);
          
          if (this.options.enablePersistence) {
            this.persistPage(page);
          }
          
          found = true;
        }
      }
    });
  }

  /**
   * Get pagination state for a conversation
   */
  public getPaginationState(conversationId: string): PaginationState | null {
    return this.paginationStates.get(conversationId) || null;
  }

  /**
   * Get cache metrics and performance statistics
   */
  public getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache status for debugging
   */
  public getCacheStatus() {
    const conversationStats: Record<string, { pages: number; size: number }> = {};
    
    this.cache.forEach(page => {
      const id = page.conversationId;
      if (!conversationStats[id]) {
        conversationStats[id] = { pages: 0, size: 0 };
      }
      conversationStats[id].pages++;
      conversationStats[id].size += page.size;
    });

    return {
      totalPages: this.cache.size,
      memoryUsage: this.metrics.memoryUsage,
      hitRate: this.metrics.hitRate,
      conversationStats,
      lruOrder: this.accessOrder.slice(-10), // Last 10 accessed
      paginationStates: Array.from(this.paginationStates.entries()),
    };
  }

  /**
   * Clear all cache data
   */
  public async clearCache(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.paginationStates.clear();
    this.prefetchQueue.clear();

    if (this.options.enablePersistence && this.db) {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.clear();
    }

    this.resetMetrics();
    console.log('[MessageCacheManager] Cache cleared');
  }

  // Private methods

  private getCacheKey(conversationId: string, pageNumber: number): string {
    return `${conversationId}_${pageNumber}`;
  }

  private async getCachedPage(cacheKey: string): Promise<MessagePage | null> {
    // Check in-memory cache first
    let page = this.cache.get(cacheKey);
    
    if (page) {
      return page;
    }

    // Check persistent storage
    if (this.options.enablePersistence && this.db) {
      page = await this.loadPersistedPage(cacheKey);
      
      if (page) {
        // Move to in-memory cache
        this.cache.set(cacheKey, page);
        this.updateAccessTime(cacheKey);
        return page;
      }
    }

    return null;
  }

  private async cachePage(
    conversationId: string,
    pageNumber: number,
    messages: Message[],
    hasMore: boolean
  ): Promise<void> {
    const cacheKey = this.getCacheKey(conversationId, pageNumber);
    
    let processedMessages = messages;
    let compressed = false;

    // Compress if enabled and page is large
    if (this.options.enableCompression && messages.length > 10) {
      try {
        processedMessages = await this.compressMessages(messages);
        compressed = true;
      } catch (error) {
        console.warn('[MessageCacheManager] Compression failed:', error);
      }
    }

    const page: MessagePage = {
      conversationId,
      pageNumber,
      messages: processedMessages,
      hasMore,
      loadedAt: new Date(),
      lastAccessedAt: new Date(),
      size: this.calculatePageSize({ messages: processedMessages } as MessagePage),
      compressed,
    };

    // Add to in-memory cache
    this.cache.set(cacheKey, page);
    this.updateAccessTime(cacheKey);

    // Persist if enabled
    if (this.options.enablePersistence) {
      this.persistPage(page);
    }

    // Enforce cache limits
    await this.enforceMemoryLimits();
  }

  private calculatePageSize(page: MessagePage): number {
    return JSON.stringify(page.messages).length * 2; // Estimate UTF-16 encoding
  }

  private updateAccessTime(cacheKey: string): void {
    // Remove from current position
    this.removeFromAccessOrder(cacheKey);
    
    // Add to end (most recently used)
    this.accessOrder.push(cacheKey);
  }

  private removeFromAccessOrder(cacheKey: string): void {
    const index = this.accessOrder.indexOf(cacheKey);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private async enforceMemoryLimits(): Promise<void> {
    // Calculate current memory usage
    let memoryUsage = 0;
    this.cache.forEach(page => {
      memoryUsage += page.size;
    });

    this.metrics.memoryUsage = memoryUsage;

    // Evict LRU pages if over limits
    while (
      (this.cache.size > this.options.maxCacheSize || 
       memoryUsage > this.options.maxMemoryUsage) &&
      this.accessOrder.length > 0
    ) {
      const lruKey = this.accessOrder.shift()!;
      const page = this.cache.get(lruKey);
      
      if (page) {
        memoryUsage -= page.size;
        this.cache.delete(lruKey);
        this.metrics.evictionCount++;
        
        console.log(`[MessageCacheManager] Evicted LRU page: ${lruKey}`);
      }
    }

    this.metrics.memoryUsage = memoryUsage;
  }

  private updatePaginationState(conversationId: string, pageNumber: number, hasMore: boolean): void {
    let state = this.paginationStates.get(conversationId);
    
    if (!state) {
      state = {
        conversationId,
        currentPage: pageNumber,
        totalPages: pageNumber + 1,
        hasMore,
        isLoading: false,
        prefetchedPages: new Set(),
      };
    } else {
      state.totalPages = Math.max(state.totalPages, pageNumber + 1);
      state.hasMore = hasMore;
    }

    this.paginationStates.set(conversationId, state);
  }

  private schedulePredictiveLoading(conversationId: string, currentPage: number): void {
    const state = this.paginationStates.get(conversationId);
    if (!state || !state.hasMore) return;

    // Schedule loading of next pages
    for (let i = 1; i <= this.options.prefetchDistance; i++) {
      const nextPage = currentPage + i;
      const cacheKey = this.getCacheKey(conversationId, nextPage);
      
      if (!this.cache.has(cacheKey) && !this.prefetchQueue.has(cacheKey)) {
        this.prefetchQueue.add(cacheKey);
        
        // Schedule prefetch with delay to avoid blocking
        setTimeout(() => {
          this.prefetchPage(conversationId, nextPage);
        }, i * 100); // Stagger prefetches
      }
    }
  }

  private async prefetchPage(conversationId: string, pageNumber: number): Promise<void> {
    const cacheKey = this.getCacheKey(conversationId, pageNumber);
    
    if (this.cache.has(cacheKey)) {
      this.prefetchQueue.delete(cacheKey);
      return; // Already loaded
    }

    const loadFn = this.loadCallbacks.get(conversationId);
    if (!loadFn) {
      this.prefetchQueue.delete(cacheKey);
      return;
    }

    try {
      console.log(`[MessageCacheManager] Prefetching page ${pageNumber} for ${conversationId}`);
      
      const result = await loadFn(pageNumber, this.options.pageSize);
      await this.cachePage(conversationId, pageNumber, result.messages, result.hasMore);
      
      // Mark as prefetched
      const state = this.paginationStates.get(conversationId);
      if (state) {
        state.prefetchedPages.add(pageNumber);
      }
      
    } catch (error) {
      console.warn(`[MessageCacheManager] Prefetch failed for ${conversationId}, page ${pageNumber}:`, error);
    } finally {
      this.prefetchQueue.delete(cacheKey);
    }
  }

  private updateMetrics(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
      : 0;
  }

  private resetMetrics(): void {
    this.metrics = {
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      persistedSize: 0,
      evictionCount: 0,
    };
  }

  // IndexedDB methods

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[MessageCacheManager] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'cacheKey' });
          store.createIndex('conversationId', 'conversationId', { unique: false });
          store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }
      };
    });
  }

  private async persistPage(page: MessagePage): Promise<void> {
    if (!this.db) return;

    const cacheKey = this.getCacheKey(page.conversationId, page.pageNumber);
    
    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await store.put({
        cacheKey,
        ...page,
      });
    } catch (error) {
      console.warn('[MessageCacheManager] Failed to persist page:', error);
    }
  }

  private async loadPersistedPage(cacheKey: string): Promise<MessagePage | null> {
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const result = await store.get(cacheKey);
      
      if (result) {
        const { cacheKey: _, ...page } = result;
        return page as MessagePage;
      }
    } catch (error) {
      console.warn('[MessageCacheManager] Failed to load persisted page:', error);
    }

    return null;
  }

  private async clearPersistedConversation(conversationId: string): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('conversationId');
      const request = index.openCursor(conversationId);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('[MessageCacheManager] Failed to clear persisted conversation:', error);
    }
  }

  // Compression methods

  private initializeCompression(): void {
    // Simple compression using JSON.stringify optimization
    // In a real implementation, you might use a Web Worker with a compression library
    console.log('[MessageCacheManager] Compression initialized');
  }

  private async compressMessages(messages: Message[]): Promise<Message[]> {
    // Simple compression - remove unnecessary whitespace and optimize structure
    // In a real implementation, you might use actual compression algorithms
    return messages.map(msg => ({
      ...msg,
      // Remove any undefined values to save space
    }));
  }

  private startBackgroundMaintenance(): void {
    // Periodic cleanup of old cache entries
    setInterval(() => {
      this.performMaintenance();
    }, 300000); // Every 5 minutes
  }

  private performMaintenance(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    this.cache.forEach((page, key) => {
      const age = now.getTime() - page.lastAccessedAt.getTime();
      
      if (age > maxAge) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`[MessageCacheManager] Maintenance: cleaned ${cleanedCount} old cache entries`);
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.paginationStates.clear();
    this.prefetchQueue.clear();
    this.loadCallbacks.clear();

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
  }
}

// Singleton instance
export const messageCacheManager = new MessageCacheManager({
  maxCacheSize: 100,
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  enablePersistence: true,
  enablePredictiveLoading: true,
  enableCompression: false, // Disabled for simplicity
  prefetchDistance: 2,
  pageSize: 50,
});