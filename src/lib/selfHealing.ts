/**
 * Self-Healing Mechanisms:
 * - Automatic state recovery
 * - Connection reconnection
 * - Cache invalidation
 * - Stale data refresh
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Connection manager with auto-reconnect
 */
export class ConnectionManager {
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private healthCheckInterval?: NodeJS.Timeout;
  private statusCallbacks: Array<(connected: boolean) => void> = [];

  constructor(
    private healthCheckFn: () => Promise<boolean>,
    private onReconnect?: () => Promise<void>
  ) {}

  /**
   * Monitor connection and auto-reconnect
   */
  startMonitoring(intervalMs: number = 30000): void {
    // Initial health check
    this.checkHealth();

    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, intervalMs);

    // Monitor online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  /**
   * Check health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const isHealthy = await this.healthCheckFn();

      if (isHealthy && !this.isConnected) {
        await this.handleReconnected();
      } else if (!isHealthy && this.isConnected) {
        this.handleDisconnected();
      }

      return isHealthy;
    } catch (error) {
      console.error('Health check failed:', error);
      this.handleDisconnected();
      return false;
    }
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<boolean> {
    console.log('Attempting manual reconnection...');

    try {
      const isHealthy = await this.healthCheckFn();

      if (isHealthy) {
        await this.handleReconnected();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Reconnection failed:', error);
      return false;
    }
  }

  /**
   * Subscribe to connection status
   */
  onStatusChange(callback: (connected: boolean) => void): () => void {
    this.statusCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get connection status
   */
  getStatus(): boolean {
    return this.isConnected;
  }

  private handleOnline = async (): Promise<void> => {
    console.log('Network online');
    await this.attemptReconnect();
  };

  private handleOffline = (): void => {
    console.log('Network offline');
    this.handleDisconnected();
  };

  private handleDisconnected(): void {
    if (this.isConnected) {
      console.log('Connection lost');
      this.isConnected = false;
      this.notifyStatusChange(false);
    }
  }

  private async handleReconnected(): Promise<void> {
    console.log('Connection restored');
    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Call reconnect callback
    if (this.onReconnect) {
      try {
        await this.onReconnect();
      } catch (error) {
        console.error('Reconnect callback failed:', error);
      }
    }

    this.notifyStatusChange(true);
  }

  private async attemptReconnect(): Promise<void> {
    if (this.isConnected || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
    await this.checkHealth();
  }

  private notifyStatusChange(connected: boolean): void {
    this.statusCallbacks.forEach((callback) => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Status callback error:', error);
      }
    });
  }
}

/**
 * State recovery configuration
 */
export interface StateRecoveryConfig<T> {
  key: string;
  serialize: (state: T) => string;
  deserialize: (data: string) => T;
  version: number;
}

/**
 * State recovery
 */
export function createStateRecovery<T>(config: StateRecoveryConfig<T>): {
  save: (state: T) => void;
  load: () => T | null;
  clear: () => void;
} {
  const storageKey = `state_recovery_${config.key}_v${config.version}`;

  return {
    save: (state: T): void => {
      try {
        const serialized = config.serialize(state);
        localStorage.setItem(storageKey, serialized);
        localStorage.setItem(`${storageKey}_timestamp`, Date.now().toString());
      } catch (error) {
        console.error('Failed to save state:', error);
      }
    },

    load: (): T | null => {
      try {
        const serialized = localStorage.getItem(storageKey);
        if (!serialized) return null;

        const timestamp = localStorage.getItem(`${storageKey}_timestamp`);
        const age = timestamp ? Date.now() - parseInt(timestamp, 10) : Infinity;

        // Don't restore state older than 24 hours
        if (age > 24 * 60 * 60 * 1000) {
          console.log('Stored state is too old, ignoring');
          return null;
        }

        return config.deserialize(serialized);
      } catch (error) {
        console.error('Failed to load state:', error);
        return null;
      }
    },

    clear: (): void => {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_timestamp`);
    },
  };
}

/**
 * Stale-while-revalidate pattern
 */
export interface SWRConfig<T> {
  fetcher: () => Promise<T>;
  cacheKey: string;
  staleTime: number;
  cacheTime: number;
}

export function useSWR<T>(config: SWRConfig<T>): {
  data: T | undefined;
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchData = async (updateStale = true): Promise<void> => {
    try {
      const result = await config.fetcher();
      setData(result);
      setError(null);
      lastFetchRef.current = Date.now();

      // Cache the data
      try {
        localStorage.setItem(
          `swr_${config.cacheKey}`,
          JSON.stringify({ data: result, timestamp: Date.now() })
        );
      } catch {
        // Ignore cache errors
      }

      if (updateStale) {
        setIsStale(false);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async (): Promise<void> => {
    setIsLoading(true);
    await fetchData(true);
  };

  useEffect(() => {
    // Try to load from cache first
    try {
      const cached = localStorage.getItem(`swr_${config.cacheKey}`);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        // Use cached data if not expired
        if (age < config.cacheTime) {
          setData(cachedData);
          setIsLoading(false);

          // Mark as stale if past stale time
          if (age > config.staleTime) {
            setIsStale(true);
            // Revalidate in background
            void fetchData(true);
          }
          return;
        }
      }
    } catch {
      // Ignore cache errors
    }

    // Fetch fresh data
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.cacheKey]);

  // Check staleness
  useEffect(() => {
    if (!data) return;

    const checkStale = setInterval(() => {
      const age = Date.now() - lastFetchRef.current;
      if (age > config.staleTime) {
        setIsStale(true);
        // Auto-revalidate
        void fetchData(true);
      }
    }, config.staleTime);

    return () => clearInterval(checkStale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, config.staleTime]);

  return { data, isLoading, isStale, error, refetch };
}

/**
 * Auto-refresh on visibility change
 */
export function useVisibilityRefresh(
  refetch: () => void,
  staleTime: number
): void {
  // eslint-disable-next-line react-hooks/purity
  const lastVisibleRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        const timeSinceVisible = Date.now() - lastVisibleRef.current;

        // Refetch if data is stale
        if (timeSinceVisible > staleTime) {
          console.log('Page visible, refreshing stale data');
          refetch();
        }

        lastVisibleRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch, staleTime]);
}

/**
 * Queued request interface
 */
export interface QueuedRequest {
  id: string;
  operation: () => Promise<unknown>;
  timestamp: number;
  retries: number;
  maxRetries?: number;
}

/**
 * Offline queue for failed requests
 */
export class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private storageKey = 'offline_queue';

  constructor() {
    // Load queue from storage
    this.loadQueue();

    // Process queue when online
    window.addEventListener('online', () => {
      console.log('Network online, processing offline queue');
      void this.processQueue();
    });
  }

  /**
   * Add request to queue
   */
  add(request: Omit<QueuedRequest, 'timestamp' | 'retries'>): void {
    const queuedRequest: QueuedRequest = {
      ...request,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: request.maxRetries ?? 3,
    };

    this.queue.push(queuedRequest);
    this.saveQueue();

    console.log(`Added request to offline queue: ${request.id}`);

    // Try to process if online
    if (navigator.onLine) {
      void this.processQueue();
    }
  }

  /**
   * Process queue when online
   */
  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.processing = true;
    console.log(`Processing offline queue (${this.queue.length} requests)`);

    const failedRequests: QueuedRequest[] = [];

    for (const request of this.queue) {
      try {
        await request.operation();
        console.log(`Processed queued request: ${request.id}`);
      } catch (error) {
        console.error(`Failed to process queued request: ${request.id}`, error);

        request.retries++;
        if (request.retries < (request.maxRetries ?? 3)) {
          failedRequests.push(request);
        } else {
          console.error(`Max retries reached for request: ${request.id}`);
        }
      }
    }

    this.queue = failedRequests;
    this.saveQueue();
    this.processing = false;
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Get queue items
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  private saveQueue(): void {
    try {
      // We can't serialize functions, so we only save metadata
      const metadata = this.queue.map((req) => ({
        id: req.id,
        timestamp: req.timestamp,
        retries: req.retries,
      }));
      localStorage.setItem(this.storageKey, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        // Note: We can't restore the operations, so this is just for metadata
        // In a real implementation, you'd need a way to recreate the operations
        console.log('Offline queue metadata loaded');
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }
}

/**
 * Hook for connection status
 */
export function useConnectionStatus(): {
  isOnline: boolean;
  isConnected: boolean;
} {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const handleOnline = (): void => setIsOnline(true);
    const handleOffline = (): void => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // You can also check application-level connectivity here
  useEffect(() => {
    const checkConnection = async (): Promise<void> => {
      try {
        // Ping your backend or check Supabase status
        const response = await fetch('/api/health', { method: 'HEAD' });
        setIsConnected(response.ok);
      } catch {
        setIsConnected(false);
      }
    };

    const interval = setInterval(checkConnection, 30000); // Check every 30s
    void checkConnection();

    return () => clearInterval(interval);
  }, []);

  return { isOnline, isConnected };
}

/**
 * Auto-save hook with debouncing
 */
export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  delayMs: number = 2000
): {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  save: () => Promise<void>;
} {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule save
    timeoutRef.current = setTimeout(() => {
      void save();
    }, delayMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, delayMs]);

  const save = async (): Promise<void> => {
    setIsSaving(true);
    setError(null);

    try {
      await saveFn(data);
      setLastSaved(new Date());
    } catch (err) {
      setError(err as Error);
      console.error('Auto-save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, lastSaved, error, save };
}
