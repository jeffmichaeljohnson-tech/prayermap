/**
 * Feature Flags Integration Examples
 *
 * This file demonstrates various ways to integrate feature flags
 * into your components.
 *
 * Copy these examples and adapt them to your needs.
 */

import { useFeature, useFeatures, useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// ============================================================================
// Example 1: Simple Conditional Rendering
// ============================================================================

/**
 * Most common pattern: Show/hide features based on a single flag.
 */
export function Example1_SimpleConditional() {
  const hasEnhancedAnimations = useFeature('enhancedAnimations');

  return (
    <div>
      <h1>Prayer Map</h1>

      {/* Show enhanced version if flag is enabled */}
      {hasEnhancedAnimations ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p>Enhanced animated content</p>
        </motion.div>
      ) : (
        <div>
          <p>Standard content</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 2: Multiple Related Flags
// ============================================================================

/**
 * Use multiple flags together for complex features.
 */
export function Example2_MultipleFlags() {
  const {
    enhancedAnimations,
    spotlightBeams,
    particleEffects,
  } = useFeatures(['enhancedAnimations', 'spotlightBeams', 'particleEffects']);

  return (
    <div className="prayer-map">
      {/* Base map (always shown) */}
      <MapView />

      {/* Progressive enhancement layers */}
      {enhancedAnimations && <AnimatedMarkers />}
      {enhancedAnimations && spotlightBeams && <SpotlightEffect />}
      {enhancedAnimations && particleEffects && <ParticleLayer />}
    </div>
  );
}

// ============================================================================
// Example 3: Component Variant Selection
// ============================================================================

/**
 * Choose which component variant to render based on flags.
 */
export function Example3_ComponentVariants() {
  const useEnhancedButton = useFeature('enhancedPrayButton');

  // Return different components based on flag
  if (useEnhancedButton) {
    return <EnhancedPrayButton />;
  }

  return <StandardPrayButton />;
}

function EnhancedPrayButton() {
  const hasCelebration = useFeature('celebrationBurst');

  const handleClick = () => {
    submitPrayer();

    if (hasCelebration) {
      triggerCelebration();
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className="enhanced-button"
    >
      🙏 Pray (Enhanced)
    </motion.button>
  );
}

function StandardPrayButton() {
  return (
    <button onClick={submitPrayer} className="standard-button">
      Pray
    </button>
  );
}

// Placeholder functions
function submitPrayer() { console.log('Prayer submitted'); }
function triggerCelebration() { console.log('🎉 Celebration!'); }
function MapView() { return <div>Map</div>; }
function AnimatedMarkers() { return null; }
function SpotlightEffect() { return null; }
function ParticleLayer() { return null; }

// ============================================================================
// Example 4: Sound Effects Integration
// ============================================================================

/**
 * Add sound effects only when flag is enabled.
 */
export function Example4_SoundEffects() {
  const hasSoundEffects = useFeature('soundEffects');

  const playSound = (soundName: string) => {
    if (!hasSoundEffects) return;

    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = 0.5;
    audio.play().catch(console.error);
  };

  const handlePrayerSubmit = () => {
    submitPrayer();
    playSound('prayer-sent');
  };

  const handlePrayerReceived = () => {
    playSound('notification');
  };

  return (
    <div>
      <button onClick={handlePrayerSubmit}>
        Submit Prayer {hasSoundEffects && '🔊'}
      </button>
    </div>
  );
}

// ============================================================================
// Example 5: Haptic Feedback (Mobile)
// ============================================================================

/**
 * Add haptic feedback on mobile when flag is enabled.
 */
export function Example5_HapticFeedback() {
  const hasHaptics = useFeature('hapticFeedback');

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (!hasHaptics) return;
    if (!Capacitor.isNativePlatform()) return;

    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  };

  const handleImportantAction = async () => {
    await triggerHaptic(ImpactStyle.Heavy);
    performAction();
  };

  const handleLightAction = async () => {
    await triggerHaptic(ImpactStyle.Light);
    performLightAction();
  };

  return (
    <div>
      <button onClick={handleImportantAction}>
        Important Action {hasHaptics && '📳'}
      </button>
      <button onClick={handleLightAction}>
        Light Action
      </button>
    </div>
  );
}

function performAction() { console.log('Action performed'); }
function performLightAction() { console.log('Light action performed'); }

// ============================================================================
// Example 6: Notification System
// ============================================================================

/**
 * Conditionally render notification features.
 */
export function Example6_NotificationSystem() {
  const hasNotifications = useFeature('inAppNotifications');
  const hasNotificationCenter = useFeature('notificationCenter');
  const hasReminders = useFeature('prayerReminders');

  return (
    <div className="app-layout">
      <header>
        <h1>PrayerMap</h1>
        {hasNotificationCenter && <NotificationBell />}
      </header>

      <main>
        {/* Main content */}
      </main>

      {/* Toast notifications (if enabled) */}
      {hasNotifications && <NotificationToast />}

      {/* Prayer reminders (if enabled) */}
      {hasReminders && <ReminderManager />}
    </div>
  );
}

function NotificationBell() {
  return <button className="notification-bell">🔔</button>;
}

function NotificationToast() {
  return <div className="toast">Notification Toast</div>;
}

function ReminderManager() {
  return <div className="reminders">Reminders</div>;
}

// ============================================================================
// Example 7: Map Overlays
// ============================================================================

/**
 * Progressive enhancement for map features.
 */
export function Example7_MapOverlays() {
  const {
    memorialLinesDensity,
    timelineSlider,
    connectionFilters,
    connectionStats,
  } = useFeatures([
    'memorialLinesDensity',
    'timelineSlider',
    'connectionFilters',
    'connectionStats',
  ]);

  return (
    <div className="map-container">
      {/* Base map (always present) */}
      <div className="map">
        <BaseMap />

        {/* Conditional overlays */}
        {memorialLinesDensity && <DensityOverlay />}
        {connectionFilters && <FilterPanel />}
      </div>

      {/* Conditional UI controls */}
      {timelineSlider && (
        <div className="timeline-controls">
          <TimelineSlider />
        </div>
      )}

      {connectionStats && (
        <div className="stats-panel">
          <ConnectionStats />
        </div>
      )}
    </div>
  );
}

function BaseMap() { return <div>Base Map</div>; }
function DensityOverlay() { return <div>Density Overlay</div>; }
function FilterPanel() { return <div>Filter Panel</div>; }
function TimelineSlider() { return <div>Timeline Slider</div>; }
function ConnectionStats() { return <div>Connection Stats</div>; }

// ============================================================================
// Example 8: First Impression Animation
// ============================================================================

/**
 * Show special animation for first-time users.
 */
export function Example8_FirstImpression() {
  const hasFirstImpression = useFeature('firstImpressionAnimation');
  const [hasSeenAnimation, setHasSeenAnimation] = React.useState(
    () => localStorage.getItem('hasSeenFirstImpression') === 'true'
  );

  React.useEffect(() => {
    if (hasSeenAnimation) return;
    if (!hasFirstImpression) return;

    // Show animation
    const timer = setTimeout(() => {
      setHasSeenAnimation(true);
      localStorage.setItem('hasSeenFirstImpression', 'true');
    }, 3000);

    return () => clearTimeout(timer);
  }, [hasSeenAnimation, hasFirstImpression]);

  if (!hasSeenAnimation && hasFirstImpression) {
    return <WelcomeAnimation />;
  }

  return <MainApp />;
}

function WelcomeAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="welcome-animation"
    >
      <h1>Welcome to PrayerMap</h1>
    </motion.div>
  );
}

function MainApp() {
  return <div>Main App Content</div>;
}

// ============================================================================
// Example 9: QA Testing Panel
// ============================================================================

/**
 * Debug panel for QA testing (development only).
 */
export function Example9_QAPanel() {
  const { flags, toggle, reset } = useFeatureFlags();

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="qa-panel">
      <h3>QA Feature Flags</h3>

      <button onClick={reset} className="reset-button">
        Reset All
      </button>

      <div className="flag-list">
        {Object.entries(flags).map(([key, value]) => (
          <div key={key} className="flag-item">
            <label>
              <input
                type="checkbox"
                checked={value}
                onChange={() => toggle(key as keyof typeof flags)}
              />
              {key}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Example 10: Celebration Effects
// ============================================================================

/**
 * Combine multiple animation flags for celebration effects.
 */
export function Example10_CelebrationEffects() {
  const {
    celebrationBurst,
    particleEffects,
    soundEffects,
    hapticFeedback,
  } = useFeatures([
    'celebrationBurst',
    'particleEffects',
    'soundEffects',
    'hapticFeedback',
  ]);

  const celebrate = async () => {
    // Trigger celebration based on enabled flags
    if (celebrationBurst) {
      triggerBurstAnimation();
    }

    if (particleEffects) {
      triggerParticles();
    }

    if (soundEffects) {
      playSound('celebration');
    }

    if (hapticFeedback && Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  };

  return (
    <button onClick={celebrate} className="celebrate-button">
      🎉 Celebrate Prayer Answered
    </button>
  );
}

function triggerBurstAnimation() { console.log('💥 Burst animation'); }
function triggerParticles() { console.log('✨ Particles'); }
function playSound(sound: string) { console.log('🔊 Playing:', sound); }

// ============================================================================
// Example 11: Gradual Enhancement
// ============================================================================

/**
 * Layer enhancements progressively based on flags.
 */
export function Example11_GradualEnhancement() {
  const hasAnimations = useFeature('enhancedAnimations');
  const hasSpotlight = useFeature('spotlightBeams');
  const hasParticles = useFeature('particleEffects');

  // Base component (always shown)
  let component = <BasicPrayerCard />;

  // Layer 1: Add animations
  if (hasAnimations) {
    component = (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {component}
      </motion.div>
    );
  }

  // Layer 2: Add spotlight (requires animations)
  if (hasAnimations && hasSpotlight) {
    component = (
      <div className="with-spotlight">
        <SpotlightBeam />
        {component}
      </div>
    );
  }

  // Layer 3: Add particles (requires animations)
  if (hasAnimations && hasParticles) {
    component = (
      <div className="with-particles">
        <ParticleBackground />
        {component}
      </div>
    );
  }

  return component;
}

function BasicPrayerCard() {
  return <div className="prayer-card">Prayer Content</div>;
}

function SpotlightBeam() {
  return <div className="spotlight" />;
}

function ParticleBackground() {
  return <div className="particles" />;
}

// ============================================================================
// Example 12: Performance Monitoring
// ============================================================================

/**
 * Monitor performance impact of features.
 */
export function Example12_PerformanceMonitoring() {
  const hasAnimations = useFeature('enhancedAnimations');
  const [fps, setFps] = React.useState(60);

  React.useEffect(() => {
    if (!hasAnimations) return;

    // Monitor frame rate
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFps = () => {
      frameCount++;

      const currentTime = performance.now();
      if (currentTime >= lastTime + 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFps);
    };

    const rafId = requestAnimationFrame(measureFps);

    return () => cancelAnimationFrame(rafId);
  }, [hasAnimations]);

  return (
    <div>
      {hasAnimations && (
        <div className="performance-monitor">
          FPS: {fps}
          {fps < 30 && ' ⚠️ Poor performance'}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Integration Template
// ============================================================================

/**
 * Template for integrating feature flags into main app.
 *
 * Copy this to src/main.tsx
 */
export const MainIntegrationTemplate = `
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';
import { FeatureFlagDebugPanel } from './contexts/FeatureFlagsContext';
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <FeatureFlagsProvider>
      <App />

      {/* Dev tools */}
      <ReactQueryDevtools initialIsOpen={false} />
      {import.meta.env.DEV && <FeatureFlagDebugPanel />}
    </FeatureFlagsProvider>
  </QueryClientProvider>
);
`;

// Add React import for examples that use React hooks
import * as React from 'react';
