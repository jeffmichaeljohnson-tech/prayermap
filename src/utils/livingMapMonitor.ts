/**
 * Living Map Monitor - Debug Utility for State Management
 * 
 * Provides comprehensive monitoring and debugging for the Living Map
 * state management to ensure prayers and connections persist properly
 */

import type { Prayer, PrayerConnection } from '../types/prayer';
import { getCacheStatus } from './statePersistence';

interface StateSnapshot {
  timestamp: string;
  prayers: {
    count: number;
    oldestDate?: string;
    newestDate?: string;
    sampleIds: string[];
  };
  connections: {
    count: number;
    oldestDate?: string;
    newestDate?: string;
    sampleIds: string[];
  };
  cache: {
    hasPrayers: boolean;
    hasConnections: boolean;
    prayersSize: number;
    connectionsSize: number;
  };
}

class LivingMapMonitor {
  private snapshots: StateSnapshot[] = [];
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  /**
   * Take a snapshot of current state for debugging
   */
  takeSnapshot(prayers: Prayer[], connections: PrayerConnection[], label?: string): void {
    if (!this.isEnabled) return;

    const snapshot: StateSnapshot = {
      timestamp: new Date().toISOString(),
      prayers: {
        count: prayers.length,
        oldestDate: prayers.length > 0 ? 
          Math.min(...prayers.map(p => p.created_at.getTime())).toString() : undefined,
        newestDate: prayers.length > 0 ? 
          Math.max(...prayers.map(p => p.created_at.getTime())).toString() : undefined,
        sampleIds: prayers.slice(0, 3).map(p => p.id),
      },
      connections: {
        count: connections.length,
        oldestDate: connections.length > 0 ? 
          Math.min(...connections.map(c => c.created_at.getTime())).toString() : undefined,
        newestDate: connections.length > 0 ? 
          Math.max(...connections.map(c => c.created_at.getTime())).toString() : undefined,
        sampleIds: connections.slice(0, 3).map(c => c.id),
      },
      cache: getCacheStatus(),
    };

    this.snapshots.push(snapshot);

    // Keep only last 10 snapshots
    if (this.snapshots.length > 10) {
      this.snapshots.shift();
    }

    if (label) {
      console.log(`📸 Living Map Snapshot [${label}]:`, snapshot);
    }
  }

  /**
   * Log the current state of the Living Map
   */
  logStatus(prayers: Prayer[], connections: PrayerConnection[]): void {
    if (!this.isEnabled) return;

    console.group('🗺️ Living Map Status');
    
    console.log('📊 Current State:');
    console.log(`  - Prayers: ${prayers.length}`);
    console.log(`  - Connections: ${connections.length}`);
    
    if (prayers.length > 0) {
      const oldestPrayer = prayers.reduce((oldest, current) => 
        current.created_at < oldest.created_at ? current : oldest
      );
      const newestPrayer = prayers.reduce((newest, current) => 
        current.created_at > newest.created_at ? current : newest
      );
      
      console.log('🙏 Prayer Range:');
      console.log(`  - Oldest: ${oldestPrayer.created_at.toISOString()} (${oldestPrayer.id})`);
      console.log(`  - Newest: ${newestPrayer.created_at.toISOString()} (${newestPrayer.id})`);
    }

    if (connections.length > 0) {
      const oldestConnection = connections.reduce((oldest, current) => 
        current.created_at < oldest.created_at ? current : oldest
      );
      const newestConnection = connections.reduce((newest, current) => 
        current.created_at > newest.created_at ? current : newest
      );
      
      console.log('🔗 Connection Range:');
      console.log(`  - Oldest: ${oldestConnection.created_at.toISOString()} (${oldestConnection.id})`);
      console.log(`  - Newest: ${newestConnection.created_at.toISOString()} (${newestConnection.id})`);
    }

    const cacheStatus = getCacheStatus();
    console.log('💾 Cache Status:', cacheStatus);

    if (this.snapshots.length > 1) {
      const current = this.snapshots[this.snapshots.length - 1];
      const previous = this.snapshots[this.snapshots.length - 2];
      
      console.log('📈 State Changes:');
      console.log(`  - Prayers: ${previous.prayers.count} → ${current.prayers.count}`);
      console.log(`  - Connections: ${previous.connections.count} → ${current.connections.count}`);
    }
    
    console.groupEnd();
  }

  /**
   * Validate that the Living Map requirements are met
   */
  validateLivingMap(prayers: Prayer[], connections: PrayerConnection[]): boolean {
    if (!this.isEnabled) return true;

    const issues: string[] = [];

    // Check for sufficient data
    if (prayers.length === 0) {
      issues.push('❌ No prayers loaded - users won\'t see active faith community');
    }

    if (connections.length === 0) {
      issues.push('❌ No connections loaded - memorial lines missing from map');
    }

    // Check for historical data (should span multiple days)
    if (prayers.length > 0) {
      const dateRange = Math.max(...prayers.map(p => p.created_at.getTime())) - 
                       Math.min(...prayers.map(p => p.created_at.getTime()));
      const dayRange = dateRange / (1000 * 60 * 60 * 24);
      
      if (dayRange < 1) {
        issues.push('⚠️ Prayer data spans less than 1 day - may not show rich history');
      }
    }

    // Check cache health
    const cacheStatus = getCacheStatus();
    if (!cacheStatus.hasPrayers && prayers.length > 0) {
      issues.push('⚠️ Prayers not cached - page reload will be slow');
    }
    
    if (!cacheStatus.hasConnections && connections.length > 0) {
      issues.push('⚠️ Connections not cached - memorial lines will disappear on reload');
    }

    if (issues.length > 0) {
      console.group('🚨 Living Map Validation Issues');
      issues.forEach(issue => console.warn(issue));
      console.groupEnd();
      return false;
    } else {
      console.log('✅ Living Map validation passed - Universal Shared Reality achieved');
      return true;
    }
  }

  /**
   * Get all snapshots for debugging
   */
  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// Create singleton instance
export const livingMapMonitor = new LivingMapMonitor();

// Expose to window for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).livingMapMonitor = livingMapMonitor;
}