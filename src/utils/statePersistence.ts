/**
 * State Persistence for Living Map
 * 
 * Ensures prayers and connections persist across page reloads
 * to maintain the "Universal Shared Reality" requirement
 */

import type { Prayer, PrayerConnection } from '../types/prayer';

const STORAGE_KEYS = {
  PRAYERS: 'prayermap_prayers_cache',
  CONNECTIONS: 'prayermap_connections_cache',
  LAST_FETCH: 'prayermap_last_fetch',
} as const;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T[];
  timestamp: number;
  version: string;
}

/**
 * Save prayers to local storage with timestamp
 */
export function savePrayersToCache(prayers: Prayer[]): void {
  try {
    const cached: CachedData<Prayer> = {
      data: prayers,
      timestamp: Date.now(),
      version: '1.0',
    };
    localStorage.setItem(STORAGE_KEYS.PRAYERS, JSON.stringify(cached));
    console.log('💾 Saved', prayers.length, 'prayers to cache');
  } catch (error) {
    console.warn('Failed to save prayers to cache:', error);
  }
}

/**
 * Load prayers from local storage if still valid
 */
export function loadPrayersFromCache(): Prayer[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.PRAYERS);
    if (!cached) return [];

    const parsedCache: CachedData<Prayer> = JSON.parse(cached);
    const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION;
    
    if (isExpired) {
      localStorage.removeItem(STORAGE_KEYS.PRAYERS);
      return [];
    }

    // Convert date strings back to Date objects
    const prayers = parsedCache.data.map(prayer => ({
      ...prayer,
      created_at: new Date(prayer.created_at),
      updated_at: prayer.updated_at ? new Date(prayer.updated_at) : undefined,
    }));

    console.log('📂 Loaded', prayers.length, 'prayers from cache');
    return prayers;
  } catch (error) {
    console.warn('Failed to load prayers from cache:', error);
    localStorage.removeItem(STORAGE_KEYS.PRAYERS);
    return [];
  }
}

/**
 * Save connections to local storage with timestamp
 */
export function saveConnectionsToCache(connections: PrayerConnection[]): void {
  try {
    const cached: CachedData<PrayerConnection> = {
      data: connections,
      timestamp: Date.now(),
      version: '1.0',
    };
    localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(cached));
    console.log('💾 Saved', connections.length, 'connections to cache');
  } catch (error) {
    console.warn('Failed to save connections to cache:', error);
  }
}

/**
 * Load connections from local storage if still valid
 */
export function loadConnectionsFromCache(): PrayerConnection[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.CONNECTIONS);
    if (!cached) return [];

    const parsedCache: CachedData<PrayerConnection> = JSON.parse(cached);
    const isExpired = Date.now() - parsedCache.timestamp > CACHE_DURATION;
    
    if (isExpired) {
      localStorage.removeItem(STORAGE_KEYS.CONNECTIONS);
      return [];
    }

    // Convert date strings back to Date objects
    const connections = parsedCache.data.map(connection => ({
      ...connection,
      created_at: new Date(connection.created_at),
      expires_at: new Date(connection.expires_at),
    }));

    console.log('📂 Loaded', connections.length, 'connections from cache');
    return connections;
  } catch (error) {
    console.warn('Failed to load connections from cache:', error);
    localStorage.removeItem(STORAGE_KEYS.CONNECTIONS);
    return [];
  }
}

/**
 * Clear all cached data (useful for debugging or data cleanup)
 */
export function clearAllCache(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('🗑️ Cleared all cached data');
}

/**
 * Get cache status for debugging
 */
export function getCacheStatus() {
  const prayersCache = localStorage.getItem(STORAGE_KEYS.PRAYERS);
  const connectionsCache = localStorage.getItem(STORAGE_KEYS.CONNECTIONS);
  
  return {
    hasPrayers: !!prayersCache,
    hasConnections: !!connectionsCache,
    prayersSize: prayersCache?.length || 0,
    connectionsSize: connectionsCache?.length || 0,
  };
}