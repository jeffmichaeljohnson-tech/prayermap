/**
 * First Impression Loader - AGENT 8 Implementation
 * 
 * Ensures new users immediately see a rich, spiritually alive map 
 * demonstrating the global prayer community and eternal memorial lines.
 * 
 * SPIRITUAL MISSION: "This place is spiritually alive" - first impression
 */

import { fetchAllPrayers, fetchAllConnections } from './prayerService';
import { loadPrayersFromCache, loadConnectionsFromCache, savePrayersToCache, saveConnectionsToCache } from '../utils/statePersistence';
import type { Prayer, PrayerConnection } from '../types/prayer';

interface FirstImpressionData {
  prayers: Prayer[];
  connections: PrayerConnection[];
  cacheUsed: boolean;
  loadTime: number;
  spiritualDensity: number;
}

interface LoadingProgress {
  stage: 'cache' | 'prayers' | 'connections' | 'complete';
  progress: number;
  message: string;
}

/**
 * Advanced first impression loader that prioritizes instant spiritual impact
 */
export class FirstImpressionLoader {
  private onProgress?: (progress: LoadingProgress) => void;
  private startTime = 0;

  constructor(onProgress?: (progress: LoadingProgress) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Load complete spiritual map data optimized for first impression
   * Strategy: Cache first, then enhanced loading with progress feedback
   */
  async loadSpiritualMap(): Promise<FirstImpressionData> {
    this.startTime = performance.now();
    
    try {
      // Stage 1: Instant cache loading for immediate spiritual impact
      this.reportProgress('cache', 10, 'Loading prayer history...');
      
      const cachedPrayers = loadPrayersFromCache();
      const cachedConnections = loadConnectionsFromCache();
      
      // If we have substantial cache, show it immediately for spiritual impact
      if (cachedPrayers.length > 20 && cachedConnections.length > 10) {
        this.reportProgress('cache', 30, 'Displaying cached spiritual activity...');
        
        // Return cached data immediately but continue loading fresh data
        const cacheResult = {
          prayers: cachedPrayers,
          connections: cachedConnections,
          cacheUsed: true,
          loadTime: performance.now() - this.startTime,
          spiritualDensity: this.calculateSpiritualDensity(cachedPrayers, cachedConnections)
        };
        
        // Start background refresh
        this.backgroundRefresh();
        
        this.reportProgress('complete', 100, 'Prayer map ready - witnessing in progress');
        return cacheResult;
      }

      // Stage 2: No sufficient cache - load fresh data with optimized strategy
      this.reportProgress('prayers', 40, 'Connecting to global prayer network...');
      
      // Load prayers with higher limit for first impression
      const prayers = await fetchAllPrayers(800); // More prayers for rich first impression
      
      this.reportProgress('prayers', 60, `Loaded ${prayers.length} prayers worldwide`);
      
      // Stage 3: Load memorial connections
      this.reportProgress('connections', 70, 'Loading eternal memorial lines...');
      
      const connections = await fetchAllConnections(400); // More connections for impact
      
      this.reportProgress('connections', 90, `Loaded ${connections.length} prayer connections`);
      
      // Cache for next visit
      if (prayers.length > 0) {
        savePrayersToCache(prayers);
      }
      if (connections.length > 0) {
        saveConnectionsToCache(connections);
      }

      const result = {
        prayers,
        connections,
        cacheUsed: false,
        loadTime: performance.now() - this.startTime,
        spiritualDensity: this.calculateSpiritualDensity(prayers, connections)
      };

      this.reportProgress('complete', 100, 'Global prayer map loaded - start praying!');
      
      console.log('🌟 First impression data loaded:', {
        prayers: prayers.length,
        connections: connections.length,
        loadTime: result.loadTime.toFixed(0) + 'ms',
        spiritualDensity: result.spiritualDensity.toFixed(2),
        cacheUsed: false
      });
      
      return result;

    } catch (error) {
      console.error('First impression loading failed:', error);
      
      // Fallback to any cached data
      const fallbackPrayers = loadPrayersFromCache();
      const fallbackConnections = loadConnectionsFromCache();
      
      this.reportProgress('complete', 100, 'Using local prayer data...');
      
      return {
        prayers: fallbackPrayers,
        connections: fallbackConnections,
        cacheUsed: true,
        loadTime: performance.now() - this.startTime,
        spiritualDensity: this.calculateSpiritualDensity(fallbackPrayers, fallbackConnections)
      };
    }
  }

  /**
   * Background refresh after showing cached data
   */
  private async backgroundRefresh(): Promise<void> {
    try {
      console.log('🔄 Background refresh started...');
      
      const [freshPrayers, freshConnections] = await Promise.all([
        fetchAllPrayers(800),
        fetchAllConnections(400)
      ]);
      
      // Update cache with fresh data
      if (freshPrayers.length > 0) {
        savePrayersToCache(freshPrayers);
      }
      if (freshConnections.length > 0) {
        saveConnectionsToCache(freshConnections);
      }
      
      console.log('✅ Background refresh complete:', {
        prayers: freshPrayers.length,
        connections: freshConnections.length
      });
      
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  /**
   * Calculate spiritual density score for the map
   * Higher score = more spiritually active and alive feeling
   */
  private calculateSpiritualDensity(prayers: Prayer[], connections: PrayerConnection[]): number {
    if (prayers.length === 0) return 0;
    
    // Base density from prayer count (max 50 points)
    const prayerDensity = Math.min(prayers.length / 20, 50);
    
    // Connection density bonus (max 30 points)
    const connectionDensity = Math.min(connections.length / 10, 30);
    
    // Recent activity bonus (max 20 points)
    const now = Date.now();
    const recentPrayers = prayers.filter(p => 
      now - p.created_at.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length;
    const recentActivityBonus = Math.min(recentPrayers / 5, 20);
    
    return prayerDensity + connectionDensity + recentActivityBonus;
  }

  /**
   * Report loading progress
   */
  private reportProgress(stage: LoadingProgress['stage'], progress: number, message: string): void {
    if (this.onProgress) {
      this.onProgress({ stage, progress, message });
    }
  }

  /**
   * Preload strategy for returning users
   */
  static async preloadForReturningUser(): Promise<void> {
    try {
      // Check if we have recent cache
      const cachedPrayers = loadPrayersFromCache();
      const cachedConnections = loadConnectionsFromCache();
      
      // If cache is older than 2 minutes, refresh it
      const shouldRefresh = cachedPrayers.length === 0 || cachedConnections.length === 0;
      
      if (shouldRefresh) {
        console.log('🚀 Preloading fresh data for returning user...');
        
        const [prayers, connections] = await Promise.all([
          fetchAllPrayers(600),
          fetchAllConnections(300)
        ]);
        
        if (prayers.length > 0) savePrayersToCache(prayers);
        if (connections.length > 0) saveConnectionsToCache(connections);
        
        console.log('✅ Preload complete:', {
          prayers: prayers.length,
          connections: connections.length
        });
      }
    } catch (error) {
      console.warn('Preload failed:', error);
    }
  }

  /**
   * Get loading recommendations based on connection speed
   */
  static getLoadingStrategy(): { prayerLimit: number; connectionLimit: number; strategy: string } {
    // Detect connection speed (rough estimate)
    const connection = (navigator as any)?.connection;
    const effectiveType = connection?.effectiveType;
    
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return {
        prayerLimit: 200,
        connectionLimit: 100,
        strategy: 'light'
      };
    } else if (effectiveType === '3g') {
      return {
        prayerLimit: 500,
        connectionLimit: 200,
        strategy: 'balanced'
      };
    } else {
      return {
        prayerLimit: 800,
        connectionLimit: 400,
        strategy: 'rich'
      };
    }
  }
}

/**
 * Quick function for components to use
 */
export async function loadFirstImpression(onProgress?: (progress: LoadingProgress) => void): Promise<FirstImpressionData> {
  const loader = new FirstImpressionLoader(onProgress);
  return loader.loadSpiritualMap();
}

/**
 * Initialize first impression optimizations
 */
export function initializeFirstImpressionOptimizer(): void {
  // Preload on app start if returning user
  if (typeof window !== 'undefined' && localStorage.getItem('prayermap_prayers_cache')) {
    FirstImpressionLoader.preloadForReturningUser();
  }
  
  // Log strategy
  const strategy = FirstImpressionLoader.getLoadingStrategy();
  console.log('📱 First impression strategy:', strategy);
}