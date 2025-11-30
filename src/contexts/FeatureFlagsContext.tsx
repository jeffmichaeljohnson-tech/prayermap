/**
 * Feature Flags Context
 *
 * Provides feature flags throughout the React component tree.
 *
 * USAGE:
 * ```typescript
 * // In App.tsx or main layout:
 * import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';
 *
 * <FeatureFlagsProvider>
 *   <App />
 * </FeatureFlagsProvider>
 *
 * // In any component:
 * import { useFeatureFlags, useFeature } from '@/contexts/FeatureFlagsContext';
 *
 * function MyComponent() {
 *   // Get all flags and utilities
 *   const { flags, isEnabled, toggle, reset } = useFeatureFlags();
 *
 *   // Or get a single flag (most common)
 *   const hasEnhancedAnimations = useFeature('enhancedAnimations');
 *
 *   return (
 *     <div>
 *       {hasEnhancedAnimations && <FancyAnimation />}
 *     </div>
 *   );
 * }
 * ```
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  type FeatureFlags,
  type FeatureFlagKey,
  loadFeatureFlags,
  saveFeatureFlagOverrides,
  resetFeatureFlags as resetFlags,
} from '../config/featureFlags';

// ============================================================================
// Context Type Definition
// ============================================================================

interface FeatureFlagsContextType {
  /** All feature flags (current state) */
  flags: FeatureFlags;

  /** Check if a specific feature is enabled */
  isEnabled: (flag: FeatureFlagKey) => boolean;

  /** Toggle a feature flag (for testing/QA) */
  toggle: (flag: FeatureFlagKey) => void;

  /** Set a feature flag to a specific value (for testing/QA) */
  set: (flag: FeatureFlagKey, value: boolean) => void;

  /** Reset all flags to environment defaults */
  reset: () => void;

  /** Loading state (true while initializing) */
  loading: boolean;
}

// ============================================================================
// Context Creation
// ============================================================================

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());
  const [loading, setLoading] = useState(true);

  // Initialize flags on mount
  useEffect(() => {
    const initialFlags = loadFeatureFlags();
    setFlags(initialFlags);
    setLoading(false);

    // Log flags in development
    if (import.meta.env.DEV) {
      console.log('🚩 Feature Flags initialized:', initialFlags);
    }
  }, []);

  // Listen for localStorage changes (for multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'featureFlags') {
        const updatedFlags = loadFeatureFlags();
        setFlags(updatedFlags);

        if (import.meta.env.DEV) {
          console.log('🚩 Feature Flags updated from storage:', updatedFlags);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check if a feature is enabled
  const isEnabled = useCallback(
    (flag: FeatureFlagKey): boolean => {
      return flags[flag];
    },
    [flags]
  );

  // Toggle a feature flag
  const toggle = useCallback(
    (flag: FeatureFlagKey) => {
      const newValue = !flags[flag];
      const newFlags = {
        ...flags,
        [flag]: newValue,
      };

      setFlags(newFlags);
      saveFeatureFlagOverrides({ [flag]: newValue });

      if (import.meta.env.DEV) {
        console.log(`🚩 Feature Flag toggled: ${flag} = ${newValue}`);
      }
    },
    [flags]
  );

  // Set a feature flag to a specific value
  const set = useCallback(
    (flag: FeatureFlagKey, value: boolean) => {
      const newFlags = {
        ...flags,
        [flag]: value,
      };

      setFlags(newFlags);
      saveFeatureFlagOverrides({ [flag]: value });

      if (import.meta.env.DEV) {
        console.log(`🚩 Feature Flag set: ${flag} = ${value}`);
      }
    },
    [flags]
  );

  // Reset all flags to environment defaults
  const reset = useCallback(() => {
    resetFlags();
    const defaultFlags = loadFeatureFlags();
    setFlags(defaultFlags);

    if (import.meta.env.DEV) {
      console.log('🚩 Feature Flags reset to defaults:', defaultFlags);
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      flags,
      isEnabled,
      toggle,
      set,
      reset,
      loading,
    }),
    [flags, isEnabled, toggle, set, reset, loading]
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access all feature flags and utilities.
 *
 * @throws Error if used outside FeatureFlagsProvider
 *
 * @example
 * ```typescript
 * const { flags, isEnabled, toggle } = useFeatureFlags();
 *
 * if (isEnabled('enhancedAnimations')) {
 *   // Show animations
 * }
 *
 * // For testing/QA:
 * <button onClick={() => toggle('enhancedAnimations')}>
 *   Toggle Animations
 * </button>
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFeatureFlags(): FeatureFlagsContextType {
  const context = useContext(FeatureFlagsContext);

  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }

  return context;
}

/**
 * Hook to check if a specific feature is enabled.
 *
 * This is the most common hook to use in components.
 * It's optimized for performance and simplicity.
 *
 * @param flag - Feature flag name
 * @returns boolean indicating if the feature is enabled
 *
 * @example
 * ```typescript
 * // Simple usage
 * const hasEnhancedAnimations = useFeature('enhancedAnimations');
 *
 * return (
 *   <div>
 *     {hasEnhancedAnimations ? (
 *       <FancyAnimation />
 *     ) : (
 *       <SimpleView />
 *     )}
 *   </div>
 * );
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFeature(flag: FeatureFlagKey): boolean {
  const { flags } = useFeatureFlags();
  return flags[flag];
}

/**
 * Hook to get multiple feature flags at once.
 *
 * Useful when a component needs to check several flags.
 *
 * @param flagKeys - Array of feature flag names
 * @returns Object with flag values
 *
 * @example
 * ```typescript
 * const {
 *   enhancedAnimations,
 *   spotlightBeams,
 *   particleEffects
 * } = useFeatures(['enhancedAnimations', 'spotlightBeams', 'particleEffects']);
 *
 * if (enhancedAnimations && spotlightBeams) {
 *   // Show spotlight beams
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFeatures<T extends FeatureFlagKey>(
  flagKeys: readonly T[]
): Record<T, boolean> {
  const { flags } = useFeatureFlags();

  return useMemo(() => {
    const result = {} as Record<T, boolean>;
    for (const key of flagKeys) {
      result[key] = flags[key];
    }
    return result;
  }, [flags, flagKeys]);
}

/**
 * Hook for feature flag controls (testing/QA).
 *
 * Provides utilities to manipulate flags at runtime.
 * Only use in development or QA tools.
 *
 * @returns Controls for manipulating feature flags
 *
 * @example
 * ```typescript
 * function FeatureFlagPanel() {
 *   const { toggle, set, reset } = useFeatureFlagControls();
 *
 *   return (
 *     <div>
 *       <button onClick={() => toggle('enhancedAnimations')}>
 *         Toggle Animations
 *       </button>
 *       <button onClick={() => set('spotlightBeams', true)}>
 *         Enable Spotlights
 *       </button>
 *       <button onClick={reset}>
 *         Reset All
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFeatureFlagControls() {
  const { toggle, set, reset } = useFeatureFlags();

  return useMemo(
    () => ({
      toggle,
      set,
      reset,
    }),
    [toggle, set, reset]
  );
}

// ============================================================================
// Development Tools
// ============================================================================

/**
 * Debug component to visualize feature flags.
 * Only renders in development mode.
 *
 * @example
 * ```typescript
 * import { FeatureFlagDebugPanel } from '@/contexts/FeatureFlagsContext';
 *
 * // Add to your dev layout:
 * {import.meta.env.DEV && <FeatureFlagDebugPanel />}
 * ```
 */
export function FeatureFlagDebugPanel() {
  const { flags, toggle, reset } = useFeatureFlags();

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: 16,
        borderRadius: 8,
        fontSize: 12,
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 9999,
        fontFamily: 'monospace',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>
        🚩 Feature Flags
      </div>

      <div style={{ marginBottom: 12 }}>
        <button
          onClick={reset}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Reset All
        </button>
      </div>

      {Object.entries(flags).map(([key, value]) => (
        <div
          key={key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <button
            onClick={() => toggle(key as FeatureFlagKey)}
            style={{
              background: value ? '#10b981' : '#6b7280',
              color: 'white',
              border: 'none',
              padding: '2px 6px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 10,
              minWidth: 45,
            }}
          >
            {value ? 'ON' : 'OFF'}
          </button>
          <span style={{ fontSize: 11 }}>{key}</span>
        </div>
      ))}
    </div>
  );
}
