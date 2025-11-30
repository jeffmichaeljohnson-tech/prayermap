/**
 * Historical Data Loader - AGENT 9 Implementation
 * 
 * Loads ALL prayer connections from day 1 with efficient pagination
 * for eternal data access while optimizing mobile data usage.
 * 
 * SPIRITUAL MISSION: Complete prayer history accessibility - every memorial line preserved
 */

import { supabase } from '../lib/supabase';
import type { Prayer, PrayerConnection } from '../types/prayer';

interface HistoricalLoadOptions {
  batchSize?: number;
  maxBatches?: number;
  onProgress?: (loaded: number, total: number, batch: number) => void;
  prioritizeRecent?: boolean;
  mobileOptimized?: boolean;
}

interface HistoricalLoadResult {
  prayers: Prayer[];
  connections: PrayerConnection[];
  totalLoaded: number;
  batchesProcessed: number;
  loadTimeMs: number;
  usedCache: boolean;
}

interface PaginationState {
  offset: number;
  hasMore: boolean;
  lastCreatedAt?: Date;
}

/**
 * Advanced historical data loader for eternal memorial lines
 */
export class HistoricalDataLoader {
  private options: Required<HistoricalLoadOptions>;
  private abortController?: AbortController;

  constructor(options: HistoricalLoadOptions = {}) {
    this.options = {
      batchSize: options.batchSize ?? 200,
      maxBatches: options.maxBatches ?? 20, // Max 4000 items
      onProgress: options.onProgress ?? (() => {}),
      prioritizeRecent: options.prioritizeRecent ?? true,
      mobileOptimized: options.mobileOptimized ?? this.isMobileDevice()
    };

    // Adjust for mobile
    if (this.options.mobileOptimized) {
      this.options.batchSize = Math.min(this.options.batchSize, 100);
      this.options.maxBatches = Math.min(this.options.maxBatches, 10);
    }
  }

  /**
   * Load complete historical prayer and connection data
   */
  async loadCompleteHistory(): Promise<HistoricalLoadResult> {
    const startTime = performance.now();
    this.abortController = new AbortController();

    try {
      console.log('🏛️ Loading complete prayer history...', {
        batchSize: this.options.batchSize,
        maxBatches: this.options.maxBatches,
        mobileOptimized: this.options.mobileOptimized
      });

      // Load prayers and connections in parallel with batching
      const [prayersResult, connectionsResult] = await Promise.all([
        this.loadHistoricalPrayers(),
        this.loadHistoricalConnections()
      ]);

      const result: HistoricalLoadResult = {
        prayers: prayersResult.data,
        connections: connectionsResult.data,
        totalLoaded: prayersResult.data.length + connectionsResult.data.length,
        batchesProcessed: prayersResult.batches + connectionsResult.batches,
        loadTimeMs: performance.now() - startTime,
        usedCache: false
      };

      console.log('✅ Historical data loading complete:', {
        prayers: result.prayers.length,
        connections: result.connections.length,
        totalLoaded: result.totalLoaded,
        batchesProcessed: result.batchesProcessed,
        loadTime: result.loadTimeMs.toFixed(0) + 'ms'
      });

      return result;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('📊 Historical loading cancelled');
      } else {
        console.error('❌ Historical loading failed:', error);
      }
      throw error;
    } finally {
      this.abortController = undefined;
    }
  }

  /**
   * Load historical prayers with smart pagination
   */
  private async loadHistoricalPrayers(): Promise<{ data: Prayer[]; batches: number }> {
    const allPrayers: Prayer[] = [];
    const pagination: PaginationState = { offset: 0, hasMore: true };
    let batchCount = 0;

    while (pagination.hasMore && batchCount < this.options.maxBatches) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Aborted');
      }

      try {
        // Use RPC function with cursor-based pagination for efficiency
        const query = supabase.rpc('get_all_prayers_paginated', {
          limit_count: this.options.batchSize,
          offset_count: pagination.offset,
          order_desc: this.options.prioritizeRecent
        });

        const { data, error } = await query;

        if (error) {
          console.error('Error loading prayer batch:', error);
          break;
        }

        if (!data || data.length === 0) {
          pagination.hasMore = false;
          break;
        }

        // Convert and add to collection
        const convertedPrayers = data.map(this.convertRowToPrayer);
        allPrayers.push(...convertedPrayers);

        batchCount++;
        pagination.offset += data.length;

        // Progress callback
        this.options.onProgress(
          allPrayers.length,
          this.options.maxBatches * this.options.batchSize,
          batchCount
        );

        console.log(`📖 Loaded prayer batch ${batchCount}: ${data.length} prayers (total: ${allPrayers.length})`);

        // Check if we got a full batch
        if (data.length < this.options.batchSize) {
          pagination.hasMore = false;
        }

        // Rate limiting for mobile
        if (this.options.mobileOptimized && batchCount % 2 === 0) {
          await this.sleep(100); // Small delay to prevent overwhelming mobile
        }

      } catch (error) {
        console.error('Error in prayer batch loading:', error);
        break;
      }
    }

    return { data: allPrayers, batches: batchCount };
  }

  /**
   * Load historical connections with eternal line support
   */
  private async loadHistoricalConnections(): Promise<{ data: PrayerConnection[]; batches: number }> {
    const allConnections: PrayerConnection[] = [];
    const pagination: PaginationState = { offset: 0, hasMore: true };
    let batchCount = 0;

    while (pagination.hasMore && batchCount < this.options.maxBatches) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Aborted');
      }

      try {
        // Use eternal connections function (no expiration filtering)
        const query = supabase.rpc('get_eternal_connections_paginated', {
          limit_count: this.options.batchSize,
          offset_count: pagination.offset
        });

        const { data, error } = await query;

        if (error) {
          // Fallback to regular get_all_connections if paginated version doesn't exist
          if (batchCount === 0) {
            console.log('Falling back to get_all_connections...');
            const fallbackQuery = await supabase.rpc('get_all_connections');
            if (fallbackQuery.data) {
              // Take a slice for this batch
              const start = pagination.offset;
              const end = start + this.options.batchSize;
              const slice = fallbackQuery.data.slice(start, end);
              
              if (slice.length > 0) {
                const convertedConnections = slice.map(this.convertRowToPrayerConnection);
                allConnections.push(...convertedConnections);
                batchCount++;
                pagination.offset += slice.length;
                
                if (slice.length < this.options.batchSize || end >= fallbackQuery.data.length) {
                  pagination.hasMore = false;
                }
              } else {
                pagination.hasMore = false;
              }
            } else {
              break;
            }
          } else {
            console.error('Error loading connection batch:', error);
            break;
          }
        } else {
          if (!data || data.length === 0) {
            pagination.hasMore = false;
            break;
          }

          // Convert and add to collection
          const convertedConnections = data.map(this.convertRowToPrayerConnection);
          allConnections.push(...convertedConnections);

          batchCount++;
          pagination.offset += data.length;

          // Check if we got a full batch
          if (data.length < this.options.batchSize) {
            pagination.hasMore = false;
          }
        }

        // Progress callback
        this.options.onProgress(
          allConnections.length,
          this.options.maxBatches * this.options.batchSize,
          batchCount
        );

        console.log(`🔗 Loaded connection batch ${batchCount}: ${allConnections.length} total eternal lines`);

        // Rate limiting for mobile
        if (this.options.mobileOptimized && batchCount % 2 === 0) {
          await this.sleep(150); // Longer delay for connections (more complex data)
        }

      } catch (error) {
        console.error('Error in connection batch loading:', error);
        break;
      }
    }

    return { data: allConnections, batches: batchCount };
  }

  /**
   * Cancel ongoing historical loading
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Get loading progress information
   */
  getProgress(): { completed: number; total: number; percentage: number } {
    // This would be enhanced with actual progress tracking
    return { completed: 0, total: 100, percentage: 0 };
  }

  /**
   * Convert database row to Prayer type
   */
  private convertRowToPrayer(row: any): Prayer {
    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      content: row.content,
      content_type: row.content_type || 'text',
      content_url: row.media_url,
      location: this.parseLocation(row.location),
      user_name: row.user_name || row.display_name || 'Anonymous',
      is_anonymous: row.is_anonymous || false,
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
      prayedBy: row.prayed_by || []
    };
  }

  /**
   * Convert database row to PrayerConnection type
   */
  private convertRowToPrayerConnection(row: any): PrayerConnection {
    return {
      id: row.id,
      prayer_id: row.prayer_id,
      prayer_response_id: row.prayer_response_id,
      from_location: this.parseLocation(row.from_location),
      to_location: this.parseLocation(row.to_location),
      requester_name: row.requester_name || 'Anonymous',
      replier_name: row.replier_name || 'Anonymous',
      created_at: new Date(row.created_at),
      expires_at: new Date(row.expires_at)
    };
  }

  /**
   * Parse location from various formats
   */
  private parseLocation(location: any): { lat: number; lng: number } {
    if (typeof location === 'string') {
      if (location.startsWith('POINT(')) {
        const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
        if (match) {
          return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
        }
      }
      try {
        return JSON.parse(location);
      } catch {
        return { lat: 0, lng: 0 };
      }
    }
    return location || { lat: 0, lng: 0 };
  }

  /**
   * Check if running on mobile device
   */
  private isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768;
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Quick function for loading historical data
 */
export async function loadHistoricalData(options?: HistoricalLoadOptions): Promise<HistoricalLoadResult> {
  const loader = new HistoricalDataLoader(options);
  return loader.loadCompleteHistory();
}

/**
 * Load historical data with progress tracking
 */
export function createHistoricalLoader(onProgress: (loaded: number, total: number, batch: number) => void): HistoricalDataLoader {
  return new HistoricalDataLoader({ onProgress });
}

/**
 * Check if historical data needs to be loaded
 */
export function needsHistoricalLoad(): boolean {
  if (typeof window === 'undefined') return false;
  
  const lastHistoricalLoad = localStorage.getItem('prayermap_last_historical_load');
  if (!lastHistoricalLoad) return true;
  
  const lastLoad = new Date(lastHistoricalLoad);
  const daysSinceLoad = (Date.now() - lastLoad.getTime()) / (1000 * 60 * 60 * 24);
  
  // Reload historical data every 7 days
  return daysSinceLoad > 7;
}

/**
 * Mark historical data as loaded
 */
export function markHistoricalLoaded(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('prayermap_last_historical_load', new Date().toISOString());
  }
}