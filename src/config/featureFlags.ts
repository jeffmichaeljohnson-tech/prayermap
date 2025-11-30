/**
 * Feature Flags Configuration
 *
 * Centralized feature flag system for gradual rollout of new features.
 *
 * USAGE:
 * ```typescript
 * import { useFeatureFlags, useFeature } from '@/contexts/FeatureFlagsContext';
 *
 * // In component:
 * const { flags, isEnabled } = useFeatureFlags();
 * const hasEnhancedAnimations = useFeature('enhancedAnimations');
 * ```
 *
 * TESTING:
 * Open browser console and use:
 * ```javascript
 * // Override specific flag
 * localStorage.setItem('featureFlags', JSON.stringify({ enhancedAnimations: true }));
 *
 * // Reset to defaults
 * localStorage.removeItem('featureFlags');
 *
 * // View current flags
 * console.log(JSON.parse(localStorage.getItem('featureFlags') || '{}'));
 * ```
 *
 * MEMORY LOG:
 * Topic: Feature Flags System
 * Context: Need centralized control for gradual rollout of new features
 * Decision: Created environment-based config with localStorage override
 * Reasoning:
 *   - Type-safe flag definitions
 *   - Environment-specific defaults (dev, staging, production)
 *   - LocalStorage override for QA testing
 *   - React Context for global access
 *   - Individual hooks for granular control
 * Alternatives Considered: LaunchDarkly, Split.io (too complex for our needs)
 * Mobile Impact: Works across web, iOS, Android via localStorage
 * Date: 2025-11-30
 */

// ============================================================================
// Feature Flag Interface
// ============================================================================

/**
 * Complete feature flags interface.
 * All flags are boolean for simplicity.
 */
export interface FeatureFlags {
  // -------------------------------------------------------------------------
  // Animation Features
  // -------------------------------------------------------------------------

  /** Enable all enhanced animations (master switch) */
  enhancedAnimations: boolean;

  /** Enable spotlight beam effects on map markers */
  spotlightBeams: boolean;

  /** Enable particle effects for celebrations */
  particleEffects: boolean;

  /** Enable celebration burst animations */
  celebrationBurst: boolean;

  /** Enable sound effects for interactions */
  soundEffects: boolean;

  /** Enable haptic feedback on mobile devices */
  hapticFeedback: boolean;

  // -------------------------------------------------------------------------
  // Memorial Lines Features
  // -------------------------------------------------------------------------

  /** Enable memorial lines density overlay */
  memorialLinesDensity: boolean;

  /** Enable timeline slider for historical view */
  timelineSlider: boolean;

  /** Enable connection filters (by prayer type, status, etc.) */
  connectionFilters: boolean;

  /** Enable connection statistics dashboard */
  connectionStats: boolean;

  /** Enable first impression animation for new users */
  firstImpressionAnimation: boolean;

  // -------------------------------------------------------------------------
  // Notification Features
  // -------------------------------------------------------------------------

  /** Enable in-app notification system */
  inAppNotifications: boolean;

  /** Enable prayer reminder notifications */
  prayerReminders: boolean;

  /** Enable alerts for nearby prayer requests */
  nearbyPrayerAlerts: boolean;

  // -------------------------------------------------------------------------
  // New Components
  // -------------------------------------------------------------------------

  /** Enable enhanced pray button with animations */
  enhancedPrayButton: boolean;

  /** Enable notification center UI */
  notificationCenter: boolean;
}

// ============================================================================
// Environment-Specific Configurations
// ============================================================================

/**
 * Development environment - ALL features enabled.
 * Used for local development and testing.
 */
const DEVELOPMENT_FLAGS: FeatureFlags = {
  // Animation features - ALL ON
  enhancedAnimations: true,
  spotlightBeams: true,
  particleEffects: true,
  celebrationBurst: true,
  soundEffects: true,
  hapticFeedback: true,

  // Memorial lines features - ALL ON
  memorialLinesDensity: true,
  timelineSlider: true,
  connectionFilters: true,
  connectionStats: true,
  firstImpressionAnimation: true,

  // Notification features - ALL ON
  inAppNotifications: true,
  prayerReminders: true,
  nearbyPrayerAlerts: true,

  // New components - ALL ON
  enhancedPrayButton: true,
  notificationCenter: true,
};

/**
 * Staging environment - MOST features enabled.
 * Used for pre-production testing and QA.
 */
const STAGING_FLAGS: FeatureFlags = {
  // Animation features - MOST ON (testing sound effects separately)
  enhancedAnimations: true,
  spotlightBeams: true,
  particleEffects: true,
  celebrationBurst: true,
  soundEffects: false,  // Testing muted experience
  hapticFeedback: true,

  // Memorial lines features - ALL ON
  memorialLinesDensity: true,
  timelineSlider: true,
  connectionFilters: true,
  connectionStats: true,
  firstImpressionAnimation: true,

  // Notification features - MOST ON
  inAppNotifications: true,
  prayerReminders: true,
  nearbyPrayerAlerts: false,  // Testing controlled rollout

  // New components - ALL ON
  enhancedPrayButton: true,
  notificationCenter: true,
};

/**
 * Production environment - CORE features only initially.
 * Features are enabled gradually based on rollout phases.
 */
const PRODUCTION_FLAGS: FeatureFlags = {
  // Animation features - CONSERVATIVE (core only)
  enhancedAnimations: true,   // Master switch enabled
  spotlightBeams: false,      // Phase 2
  particleEffects: false,     // Phase 2
  celebrationBurst: true,     // Core feature
  soundEffects: false,        // Phase 3 (optional)
  hapticFeedback: true,       // Core mobile feature

  // Memorial lines features - GRADUAL (core only)
  memorialLinesDensity: false,        // Phase 2
  timelineSlider: false,              // Phase 2
  connectionFilters: false,           // Phase 3
  connectionStats: false,             // Phase 3
  firstImpressionAnimation: true,     // Core onboarding

  // Notification features - CORE ONLY
  inAppNotifications: true,   // Core feature
  prayerReminders: false,     // Phase 2
  nearbyPrayerAlerts: false,  // Phase 2

  // New components - CORE ONLY
  enhancedPrayButton: true,   // Core interaction
  notificationCenter: false,  // Phase 2
};

// ============================================================================
// Rollout Strategy Documentation
// ============================================================================

/**
 * ROLLOUT PHASES
 *
 * This section documents the planned rollout strategy for feature flags.
 * Update dates and percentages as features are rolled out.
 *
 * -------------------------------------------------------------------------
 * PHASE 1: Internal Testing (Week 1-2)
 * -------------------------------------------------------------------------
 * Target: Development team + internal testers
 * Configuration: DEVELOPMENT_FLAGS (all features enabled)
 * Success Criteria:
 *   - All animations run at 60fps
 *   - No console errors
 *   - Mobile (iOS/Android) tested
 *   - Performance benchmarks met
 *
 * Features in Phase 1:
 *   ✅ enhancedAnimations (master switch)
 *   ✅ celebrationBurst (core interaction)
 *   ✅ hapticFeedback (mobile)
 *   ✅ firstImpressionAnimation (onboarding)
 *   ✅ inAppNotifications (core messaging)
 *   ✅ enhancedPrayButton (core interaction)
 *
 * -------------------------------------------------------------------------
 * PHASE 2: Beta Users (Week 3-4)
 * -------------------------------------------------------------------------
 * Target: 20-30% of users (beta testers + early adopters)
 * Configuration: STAGING_FLAGS (most features enabled)
 * Success Criteria:
 *   - No increase in bounce rate
 *   - Positive user feedback (>80%)
 *   - No performance degradation
 *   - Mobile app store compliance verified
 *
 * Additional Features in Phase 2:
 *   🟡 spotlightBeams (visual enhancement)
 *   🟡 particleEffects (celebration enhancement)
 *   🟡 memorialLinesDensity (data visualization)
 *   🟡 timelineSlider (historical view)
 *   🟡 prayerReminders (engagement)
 *   🟡 nearbyPrayerAlerts (discovery)
 *   🟡 notificationCenter (UI enhancement)
 *
 * -------------------------------------------------------------------------
 * PHASE 3: Gradual Production Rollout (Week 5-8)
 * -------------------------------------------------------------------------
 * Target: 100% of users (gradual rollout)
 * Configuration: PRODUCTION_FLAGS → gradually enable features
 * Success Criteria:
 *   - User engagement increases (>15%)
 *   - No increase in error rates
 *   - Performance remains optimal
 *   - App store ratings maintained (>4.5)
 *
 * Rollout Schedule:
 *   Week 5: Enable spotlightBeams + particleEffects (50% users)
 *   Week 6: Enable memorialLinesDensity + timelineSlider (75% users)
 *   Week 7: Enable notificationCenter + prayerReminders (100% users)
 *   Week 8: Enable connectionFilters + connectionStats (100% users)
 *
 * Optional Features (User Preference):
 *   ⚙️ soundEffects (default OFF, user can enable)
 *   ⚙️ nearbyPrayerAlerts (default OFF, user can enable)
 *
 * -------------------------------------------------------------------------
 * MONITORING & METRICS
 * -------------------------------------------------------------------------
 * Track these metrics during rollout:
 *   - Animation performance (fps, frame drops)
 *   - Page load time (First Contentful Paint, Time to Interactive)
 *   - User engagement (prayers posted, interactions, time on app)
 *   - Error rates (console errors, crash reports)
 *   - User feedback (ratings, support tickets)
 *   - Mobile-specific metrics (battery usage, network usage)
 *
 * Rollback Criteria (disable feature immediately if):
 *   - Crash rate increases >2%
 *   - Performance degrades >20%
 *   - Negative feedback spike (>30%)
 *   - App store violations
 *
 * -------------------------------------------------------------------------
 * FEATURE FLAG LIFECYCLE
 * -------------------------------------------------------------------------
 * 1. New Feature → Add to interface + set to false in PRODUCTION_FLAGS
 * 2. Internal Testing → Enable in DEVELOPMENT_FLAGS
 * 3. Beta Testing → Enable in STAGING_FLAGS
 * 4. Production → Gradually enable in PRODUCTION_FLAGS
 * 5. Proven Stable → Consider removing flag (bake into codebase)
 * 6. Deprecated → Remove flag + cleanup code
 *
 * -------------------------------------------------------------------------
 * BEST PRACTICES
 * -------------------------------------------------------------------------
 * ✅ DO:
 *   - Test features thoroughly in dev before staging
 *   - Monitor metrics closely during rollout
 *   - Document decisions in this file
 *   - Use feature flags for risky changes
 *   - Remove flags once features are stable
 *
 * ❌ DON'T:
 *   - Ship untested features to production
 *   - Enable all flags at once
 *   - Forget to clean up old flags
 *   - Use flags for permanent configuration (use env vars)
 *   - Leave flags in codebase indefinitely
 */

// ============================================================================
// Default Configuration (Environment-Based)
// ============================================================================

/**
 * Get default feature flags based on current environment.
 *
 * Environment detection priority:
 * 1. VITE_APP_ENV (if set explicitly)
 * 2. import.meta.env.MODE (Vite mode)
 * 3. import.meta.env.PROD (Vite production flag)
 */
export function getDefaultFlags(): FeatureFlags {
  // Check for explicit environment variable
  const appEnv = import.meta.env.VITE_APP_ENV as string | undefined;

  if (appEnv === 'development' || appEnv === 'dev') {
    return DEVELOPMENT_FLAGS;
  }

  if (appEnv === 'staging' || appEnv === 'stage') {
    return STAGING_FLAGS;
  }

  if (appEnv === 'production' || appEnv === 'prod') {
    return PRODUCTION_FLAGS;
  }

  // Fallback to Vite's built-in mode detection
  const mode = import.meta.env.MODE;

  if (mode === 'development') {
    return DEVELOPMENT_FLAGS;
  }

  if (mode === 'staging') {
    return STAGING_FLAGS;
  }

  // Default to production for safety (conservative)
  return PRODUCTION_FLAGS;
}

// ============================================================================
// LocalStorage Override System
// ============================================================================

const STORAGE_KEY = 'featureFlags';

/**
 * Load feature flags with localStorage overrides.
 *
 * Merging strategy:
 * 1. Start with environment defaults
 * 2. Apply localStorage overrides
 * 3. Return merged configuration
 *
 * This allows QA and developers to test specific flags without
 * changing environment or rebuilding.
 */
export function loadFeatureFlags(): FeatureFlags {
  const defaults = getDefaultFlags();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaults;
    }

    const overrides = JSON.parse(stored) as Partial<FeatureFlags>;

    // Merge overrides with defaults
    return {
      ...defaults,
      ...overrides,
    };
  } catch (error) {
    console.warn('Failed to load feature flags from localStorage:', error);
    return defaults;
  }
}

/**
 * Save feature flag overrides to localStorage.
 *
 * @param overrides - Partial flags to override (only changed flags)
 *
 * Example:
 * ```typescript
 * saveFeatureFlagOverrides({ enhancedAnimations: true });
 * ```
 */
export function saveFeatureFlagOverrides(overrides: Partial<FeatureFlags>): void {
  try {
    const current = loadFeatureFlags();
    const merged = {
      ...current,
      ...overrides,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.warn('Failed to save feature flags to localStorage:', error);
  }
}

/**
 * Reset all feature flag overrides.
 * Returns to environment defaults.
 */
export function resetFeatureFlags(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to reset feature flags:', error);
  }
}

/**
 * Get a single feature flag value.
 *
 * @param flag - Feature flag name
 * @returns boolean value of the flag
 */
export function getFeatureFlag(flag: keyof FeatureFlags): boolean {
  const flags = loadFeatureFlags();
  return flags[flag];
}

// ============================================================================
// Type Exports
// ============================================================================

export type FeatureFlagKey = keyof FeatureFlags;

// ============================================================================
// Development Helpers
// ============================================================================

/**
 * Log current feature flags to console.
 * Useful for debugging.
 */
export function debugFeatureFlags(): void {
  const flags = loadFeatureFlags();
  const defaults = getDefaultFlags();

  console.group('🚩 Feature Flags');
  console.log('Environment:', import.meta.env.MODE);
  console.log('Defaults:', defaults);
  console.log('Current:', flags);
  console.log('Overrides:', JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  console.groupEnd();
}

// Expose to window for easy console access in development
if (import.meta.env.DEV) {
  (window as any).debugFeatureFlags = debugFeatureFlags;
  (window as any).resetFeatureFlags = resetFeatureFlags;
  console.log('💡 Feature flag helpers available:');
  console.log('   - window.debugFeatureFlags()');
  console.log('   - window.resetFeatureFlags()');
}
