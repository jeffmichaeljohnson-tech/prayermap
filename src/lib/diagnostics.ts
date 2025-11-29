/**
 * Self-Diagnostics System
 *
 * Features:
 * - Health checks
 * - Connectivity monitoring
 * - Browser capability detection
 * - Storage availability
 * - Permission status
 */

import { useState, useEffect } from 'react';
import { logger } from './logger';
import { supabase } from './supabase';

export interface DiagnosticReport {
  timestamp: string;
  browser: {
    name: string;
    version: string;
    userAgent: string;
  };
  capabilities: {
    webgl: boolean;
    webrtc: boolean;
    mediaRecorder: boolean;
    geolocation: boolean;
    notifications: boolean;
    serviceWorker: boolean;
    indexedDB: boolean;
    localStorage: boolean;
  };
  permissions: {
    camera: PermissionState | 'unsupported';
    microphone: PermissionState | 'unsupported';
    geolocation: PermissionState | 'unsupported';
    notifications: PermissionState | 'unsupported';
  };
  connectivity: {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  storage: {
    localStorageUsed: number;
    localStorageAvailable: boolean;
    indexedDBAvailable: boolean;
    estimatedQuota?: number;
    estimatedUsage?: number;
  };
  services: {
    supabase: 'connected' | 'disconnected' | 'error';
    mapbox: 'connected' | 'disconnected' | 'error';
  };
}

class Diagnostics {
  private connectivityListeners: Set<(online: boolean) => void> = new Set();
  private lastReport: DiagnosticReport | null = null;

  constructor() {
    // Set up online/offline listeners
    window.addEventListener('online', () => this.notifyConnectivityChange(true));
    window.addEventListener('offline', () => this.notifyConnectivityChange(false));
  }

  // Run full diagnostic check
  async runDiagnostics(): Promise<DiagnosticReport> {
    logger.info('Running diagnostics', { action: 'diagnostics_start' });

    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      browser: this.getBrowserInfo(),
      capabilities: await this.checkCapabilities(),
      permissions: await this.checkPermissions(),
      connectivity: this.getConnectivityInfo(),
      storage: await this.getStorageInfo(),
      services: await this.checkServices(),
    };

    this.lastReport = report;

    logger.info('Diagnostics complete', {
      action: 'diagnostics_complete',
      metadata: { report },
    });

    return report;
  }

  // Check specific capability
  async checkCapability(
    name: keyof DiagnosticReport['capabilities']
  ): Promise<boolean> {
    const capabilities = await this.checkCapabilities();
    return capabilities[name];
  }

  // Check service health
  async checkService(
    name: 'supabase' | 'mapbox'
  ): Promise<'connected' | 'disconnected' | 'error'> {
    logger.debug(`Checking service: ${name}`, {
      action: 'service_check',
      metadata: { service: name },
    });

    try {
      if (name === 'supabase') {
        return await this.checkSupabase();
      } else if (name === 'mapbox') {
        return await this.checkMapbox();
      }
    } catch (error) {
      logger.error(`Service check failed: ${name}`, error as Error, {
        action: 'service_check_failed',
        metadata: { service: name },
      });
      return 'error';
    }

    return 'disconnected';
  }

  // Monitor connectivity
  startConnectivityMonitor(callback: (online: boolean) => void): () => void {
    this.connectivityListeners.add(callback);

    // Call immediately with current status
    callback(navigator.onLine);

    // Return unsubscribe function
    return () => {
      this.connectivityListeners.delete(callback);
    };
  }

  // Get storage usage
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      }
    } catch (error) {
      logger.warn('Failed to get storage estimate', {
        action: 'storage_estimate_failed',
        metadata: { error },
      });
    }

    return { used: 0, quota: 0 };
  }

  // Clear diagnostic cache
  clearCache(): void {
    this.lastReport = null;
    logger.info('Diagnostic cache cleared', { action: 'diagnostic_cache_cleared' });
  }

  // Export diagnostic report
  exportReport(): string {
    if (!this.lastReport) {
      return JSON.stringify({ error: 'No diagnostic report available' }, null, 2);
    }

    return JSON.stringify(this.lastReport, null, 2);
  }

  // Get last report
  getLastReport(): DiagnosticReport | null {
    return this.lastReport;
  }

  // Private methods

  private getBrowserInfo(): DiagnosticReport['browser'] {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    // Detect browser
    if (userAgent.includes('Firefox/')) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edg/')) {
      browserName = 'Edge';
      browserVersion = userAgent.match(/Edg\/(\d+\.\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Chrome/')) {
      browserName = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari/')) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown';
    }

    return {
      name: browserName,
      version: browserVersion,
      userAgent,
    };
  }

  private async checkCapabilities(): Promise<DiagnosticReport['capabilities']> {
    return {
      webgl: this.hasWebGL(),
      webrtc: this.hasWebRTC(),
      mediaRecorder: 'MediaRecorder' in window,
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator,
      indexedDB: 'indexedDB' in window,
      localStorage: this.hasLocalStorage(),
    };
  }

  private async checkPermissions(): Promise<DiagnosticReport['permissions']> {
    const permissions: DiagnosticReport['permissions'] = {
      camera: 'unsupported',
      microphone: 'unsupported',
      geolocation: 'unsupported',
      notifications: 'unsupported',
    };

    if ('permissions' in navigator) {
      try {
        // Camera
        try {
          const cameraPermission = await navigator.permissions.query({
            name: 'camera' as PermissionName,
          });
          permissions.camera = cameraPermission.state;
        } catch {
          // Permission not supported
        }

        // Microphone
        try {
          const micPermission = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });
          permissions.microphone = micPermission.state;
        } catch {
          // Permission not supported
        }

        // Geolocation
        try {
          const geoPermission = await navigator.permissions.query({
            name: 'geolocation' as PermissionName,
          });
          permissions.geolocation = geoPermission.state;
        } catch {
          // Permission not supported
        }

        // Notifications
        if ('Notification' in window) {
          const notifState = Notification.permission;
          permissions.notifications = notifState === 'default' ? 'prompt' : notifState;
        }
      } catch (error) {
        logger.warn('Permission check failed', {
          action: 'permission_check_failed',
          metadata: { error },
        });
      }
    }

    return permissions;
  }

  private getConnectivityInfo(): DiagnosticReport['connectivity'] {
    const connection = (navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
      };
    }).connection;

    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };
  }

  private async getStorageInfo(): Promise<DiagnosticReport['storage']> {
    const localStorageUsed = this.getLocalStorageSize();
    const storageEstimate = await this.getStorageUsage();

    return {
      localStorageUsed,
      localStorageAvailable: this.hasLocalStorage(),
      indexedDBAvailable: 'indexedDB' in window,
      estimatedQuota: storageEstimate.quota,
      estimatedUsage: storageEstimate.used,
    };
  }

  private async checkServices(): Promise<DiagnosticReport['services']> {
    const [supabaseStatus, mapboxStatus] = await Promise.all([
      this.checkSupabase(),
      this.checkMapbox(),
    ]);

    return {
      supabase: supabaseStatus,
      mapbox: mapboxStatus,
    };
  }

  private async checkSupabase(): Promise<'connected' | 'disconnected' | 'error'> {
    try {
      // Try to get session
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        logger.warn('Supabase connection error', {
          action: 'supabase_check_error',
          metadata: { error: error.message },
        });
        return 'error';
      }

      // Connection successful (even if no session)
      return 'connected';
    } catch (error) {
      logger.error('Supabase check failed', error as Error, {
        action: 'supabase_check_failed',
      });
      return 'error';
    }
  }

  private async checkMapbox(): Promise<'connected' | 'disconnected' | 'error'> {
    try {
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

      if (!mapboxToken) {
        logger.warn('Mapbox token not configured', {
          action: 'mapbox_no_token',
        });
        return 'disconnected';
      }

      // Try to fetch a basic Mapbox resource
      const response = await fetch(
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8.json?access_token=${mapboxToken}`,
        { method: 'HEAD' }
      );

      if (response.ok) {
        return 'connected';
      } else {
        logger.warn('Mapbox connection failed', {
          action: 'mapbox_check_failed',
          metadata: { status: response.status },
        });
        return 'error';
      }
    } catch (error) {
      logger.error('Mapbox check error', error as Error, {
        action: 'mapbox_check_error',
      });
      return 'error';
    }
  }

  private hasWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  }

  private hasWebRTC(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );
  }

  private hasLocalStorage(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private getLocalStorageSize(): number {
    let total = 0;

    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += key.length + (localStorage[key]?.length || 0);
        }
      }
    } catch {
      return 0;
    }

    return total;
  }

  private notifyConnectivityChange(online: boolean): void {
    logger.info(`Connectivity changed: ${online ? 'online' : 'offline'}`, {
      action: 'connectivity_changed',
      metadata: { online },
    });

    this.connectivityListeners.forEach(listener => {
      try {
        listener(online);
      } catch (error) {
        logger.error('Connectivity listener error', error as Error, {
          action: 'connectivity_listener_error',
        });
      }
    });
  }
}

// Singleton instance
export const diagnostics = new Diagnostics();

// React hook
export function useDiagnostics(): {
  report: DiagnosticReport | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newReport = await diagnostics.runDiagnostics();
      setReport(newReport);
    } catch (err) {
      setError(err as Error);
      logger.error('Failed to run diagnostics', err as Error, {
        action: 'diagnostics_failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    report,
    isLoading,
    error,
    refresh,
  };
}

// React hook for connectivity monitoring
export function useConnectivity(): {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
} {
  const [online, setOnline] = useState(navigator.onLine);
  const [networkInfo, setNetworkInfo] = useState<{
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  }>({});

  useEffect(() => {
    const unsubscribe = diagnostics.startConnectivityMonitor(setOnline);

    // Get network info
    const connection = (navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        downlink?: number;
        rtt?: number;
      };
    }).connection;

    if (connection) {
      setNetworkInfo({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      });
    }

    return unsubscribe;
  }, []);

  return {
    online,
    ...networkInfo,
  };
}
