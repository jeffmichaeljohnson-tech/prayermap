/**
 * Debug Mode Controller
 *
 * Features:
 * - Enable/disable via URL param or localStorage
 * - Verbose logging when enabled
 * - State inspection
 * - Network request logging
 * - Performance overlays
 * - Component render highlighting
 */

import { useState, useEffect } from 'react';
import { logger, LogLevel } from './logger';
import { errorTracker } from './errorTracking';
import { performanceMonitor } from './performanceMonitor';

export interface DebugState {
  enabled: boolean;
  verboseLogging: boolean;
  networkLogging: boolean;
  performanceOverlay: boolean;
  renderHighlighting: boolean;
  stateInspection: boolean;
}

class DebugMode {
  private state: DebugState;
  private stateListeners: Set<(state: DebugState) => void> = new Set();
  private readonly storageKey = 'prayermap_debug_state';
  private stateHistory: Array<{ timestamp: string; label: string; state: unknown }> = [];

  constructor() {
    this.state = this.loadState();
    this.checkUrlParams();
    this.attachToWindow();

    // Log initial state
    if (this.state.enabled) {
      logger.info('Debug mode enabled', {
        action: 'debug_mode_enabled',
        metadata: { state: this.state },
      });
    }
  }

  // Check if debug mode is enabled
  isEnabled(): boolean {
    return this.state.enabled;
  }

  // Enable debug mode
  enable(options?: Partial<DebugState>): void {
    this.state = {
      ...this.state,
      enabled: true,
      ...options,
    };

    this.saveState();
    this.notifyListeners();

    logger.info('Debug mode enabled', {
      action: 'debug_mode_enabled',
      metadata: { state: this.state },
    });

    // Update logger level to DEBUG
    if (this.state.verboseLogging) {
      this.setLogLevel(LogLevel.DEBUG);
    }
  }

  // Disable debug mode
  disable(): void {
    this.state = {
      enabled: false,
      verboseLogging: false,
      networkLogging: false,
      performanceOverlay: false,
      renderHighlighting: false,
      stateInspection: false,
    };

    this.saveState();
    this.notifyListeners();

    logger.info('Debug mode disabled', {
      action: 'debug_mode_disabled',
    });

    // Reset logger level
    this.setLogLevel(import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO);
  }

  // Toggle specific feature
  toggle(feature: keyof DebugState): void {
    if (feature === 'enabled') {
      if (this.state.enabled) {
        this.disable();
      } else {
        this.enable();
      }
      return;
    }

    this.state[feature] = !this.state[feature];

    this.saveState();
    this.notifyListeners();

    logger.info(`Debug feature toggled: ${feature}`, {
      action: 'debug_feature_toggled',
      metadata: {
        feature,
        value: this.state[feature],
      },
    });

    // Update logger level if verbose logging changed
    if (feature === 'verboseLogging') {
      this.setLogLevel(this.state.verboseLogging ? LogLevel.DEBUG : LogLevel.INFO);
    }
  }

  // Get current state
  getState(): DebugState {
    return { ...this.state };
  }

  // Subscribe to state changes
  subscribe(listener: (state: DebugState) => void): () => void {
    this.stateListeners.add(listener);

    // Call listener with current state
    listener(this.getState());

    // Return unsubscribe function
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  // Log only in debug mode
  debugLog(message: string, data?: unknown): void {
    if (this.state.enabled && this.state.verboseLogging) {
      logger.debug(`[DEBUG] ${message}`, {
        action: 'debug_log',
        metadata: { data },
      });
    }
  }

  // Inspect state
  inspectState(label: string, state: unknown): void {
    if (!this.state.enabled || !this.state.stateInspection) {
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      label,
      state: this.deepClone(state),
    };

    this.stateHistory.push(entry);

    // Keep last 100 entries
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift();
    }

    logger.debug(`State inspection: ${label}`, {
      action: 'state_inspection',
      metadata: { label, state },
    });

    // Log to console in a nice format
    console.group(`🔍 State: ${label}`);
    console.log('Timestamp:', entry.timestamp);
    console.log('State:', state);
    console.groupEnd();
  }

  // Get state history
  getStateHistory(): Array<{ timestamp: string; label: string; state: unknown }> {
    return [...this.stateHistory];
  }

  // Clear state history
  clearStateHistory(): void {
    this.stateHistory = [];
    logger.info('State history cleared', {
      action: 'state_history_cleared',
    });
  }

  // Export debug data
  exportDebugData(): string {
    const data = {
      timestamp: new Date().toISOString(),
      debugState: this.state,
      stateHistory: this.stateHistory,
      performanceMetrics: performanceMonitor.getMetrics(),
      componentMetrics: performanceMonitor.getComponentMetrics(),
      apiMetrics: performanceMonitor.getApiMetrics(),
      errors: errorTracker.getRecentErrors(50),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      url: window.location.href,
    };

    return JSON.stringify(data, null, 2);
  }

  // Import debug data
  importDebugData(data: string): void {
    try {
      const parsed = JSON.parse(data);

      if (parsed.debugState) {
        this.state = parsed.debugState;
        this.saveState();
        this.notifyListeners();
      }

      logger.info('Debug data imported', {
        action: 'debug_data_imported',
      });
    } catch (error) {
      logger.error('Failed to import debug data', error as Error, {
        action: 'debug_data_import_failed',
      });
    }
  }

  // Download debug data as file
  downloadDebugData(): void {
    const data = this.exportDebugData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prayermap-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    logger.info('Debug data downloaded', {
      action: 'debug_data_downloaded',
    });
  }

  // Private methods

  private loadState(): DebugState {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logger.warn('Failed to load debug state', {
        action: 'debug_state_load_failed',
        metadata: { error },
      });
    }

    // Default state
    return {
      enabled: false,
      verboseLogging: false,
      networkLogging: false,
      performanceOverlay: false,
      renderHighlighting: false,
      stateInspection: false,
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      logger.warn('Failed to save debug state', {
        action: 'debug_state_save_failed',
        metadata: { error },
      });
    }
  }

  private checkUrlParams(): void {
    const params = new URLSearchParams(window.location.search);

    // Check for debug param
    if (params.has('debug')) {
      const debugValue = params.get('debug');

      if (debugValue === 'true' || debugValue === '1' || debugValue === '') {
        this.enable({
          verboseLogging: true,
          networkLogging: true,
          stateInspection: true,
        });
      } else if (debugValue === 'false' || debugValue === '0') {
        this.disable();
      }
    }

    // Check for specific debug features
    if (params.has('debug-performance')) {
      this.state.performanceOverlay = true;
      this.saveState();
    }

    if (params.has('debug-render')) {
      this.state.renderHighlighting = true;
      this.saveState();
    }
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    this.stateListeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        logger.error('Debug state listener error', error as Error, {
          action: 'debug_listener_error',
        });
      }
    });
  }

  private setLogLevel(level: LogLevel): void {
    // This would need to be implemented in the logger
    // For now, we just log the change
    logger.info('Log level changed', {
      action: 'log_level_changed',
      metadata: { level: LogLevel[level] },
    });
  }

  private deepClone(obj: unknown): unknown {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  }

  private attachToWindow(): void {
    // Expose debug mode to window for console access
    if (typeof window !== 'undefined') {
      (window as Window & { prayerMapDebug?: DebugMode }).prayerMapDebug = this;
    }
  }
}

// Singleton instance
export const debugMode = new DebugMode();

// React hook
export function useDebugMode(): DebugState & {
  toggle: (feature: keyof DebugState) => void;
  enable: () => void;
  disable: () => void;
  exportData: () => void;
} {
  const [state, setState] = useState<DebugState>(debugMode.getState());

  useEffect(() => {
    const unsubscribe = debugMode.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    toggle: (feature: keyof DebugState) => debugMode.toggle(feature),
    enable: () => debugMode.enable(),
    disable: () => debugMode.disable(),
    exportData: () => debugMode.downloadDebugData(),
  };
}

// Debug panel component (basic implementation)
export function DebugPanel(): JSX.Element | null {
  const debug = useDebugMode();

  if (!debug.enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg shadow-2xl z-[9999] max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">Debug Mode</h3>
        <button
          onClick={() => debug.disable()}
          className="text-xs px-2 py-1 bg-red-600 rounded hover:bg-red-700"
        >
          Close
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={debug.verboseLogging}
            onChange={() => debug.toggle('verboseLogging')}
            className="rounded"
          />
          <span>Verbose Logging</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={debug.networkLogging}
            onChange={() => debug.toggle('networkLogging')}
            className="rounded"
          />
          <span>Network Logging</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={debug.performanceOverlay}
            onChange={() => debug.toggle('performanceOverlay')}
            className="rounded"
          />
          <span>Performance Overlay</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={debug.stateInspection}
            onChange={() => debug.toggle('stateInspection')}
            className="rounded"
          />
          <span>State Inspection</span>
        </label>

        <button
          onClick={() => debug.exportData()}
          className="w-full mt-3 px-3 py-2 bg-blue-600 rounded hover:bg-blue-700 text-xs font-medium"
        >
          Export Debug Data
        </button>
      </div>
    </div>
  );
}

// Utility to measure function execution time
export function measureExecutionTime<T>(
  fn: () => T,
  label: string
): T {
  if (!debugMode.isEnabled()) {
    return fn();
  }

  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  debugMode.debugLog(`${label} took ${duration.toFixed(2)}ms`);

  return result;
}

// Utility to measure async function execution time
export async function measureAsyncExecutionTime<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  if (!debugMode.isEnabled()) {
    return fn();
  }

  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  debugMode.debugLog(`${label} took ${duration.toFixed(2)}ms`);

  return result;
}
