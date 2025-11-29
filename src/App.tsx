import { useState, useEffect } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthModal } from './components/AuthModal';
import { PrayerMap } from './components/PrayerMap';
import { SettingsScreen } from './components/SettingsScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { logger } from './lib/logger';
import { errorTracker } from './lib/errorTracking.tsx';
import { performanceMonitor } from './lib/performanceMonitor';
import { debugMode, DebugPanel } from './lib/debugMode.tsx';
import { DiagnosticOverlay } from './components/DiagnosticOverlay';
import { AppErrorBoundary } from './components/ErrorBoundary';
import { ConnectionManager } from './lib/selfHealing';
import { OfflineIndicator } from './components/FallbackUI';
import { useConnectionStatus } from './lib/selfHealing';

// Initialize observability systems on app start
errorTracker.init();
performanceMonitor.init();

// Log app start
logger.info('PrayerMap application started', {
  action: 'app_init',
  metadata: {
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE,
    debugMode: debugMode.isEnabled(),
  },
});

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { isOnline } = useConnectionStatus();

  // Set user context in error tracker
  useEffect(() => {
    if (user) {
      errorTracker.setUser(user.id);
      logger.info('User authenticated', {
        action: 'user_authenticated',
        userId: user.id,
      });
    } else {
      errorTracker.setUser(null);
    }
  }, [user]);

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      logger.debug('Requesting user location', { action: 'geolocation_request' });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          logger.info('User location obtained', {
            action: 'geolocation_success',
            metadata: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          });

          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          logger.error('Geolocation error', error as unknown as Error, {
            action: 'geolocation_error',
            metadata: {
              code: error.code,
              message: error.message,
            },
          });

          setLocationError('Please enable location access to use PrayerMap');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      logger.warn('Geolocation not supported', {
        action: 'geolocation_unsupported',
      });
      setLocationError('Geolocation is not supported by your browser');
    }
  }, []);

  // Loading screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Show loading screen while initial loading or checking auth
  if (isLoading || authLoading) {
    return <LoadingScreen />;
  }

  // Show auth modal if not authenticated
  if (!user) {
    return <AuthModal />;
  }

  // Show location error
  if (locationError) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 p-4">
        <div className="glass-strong rounded-3xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">📍</div>
          <h2 className="text-xl text-gray-800 mb-2">Location Required</h2>
          <p className="text-gray-600 mb-4">{locationError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-yellow-300 to-purple-300 rounded-full text-gray-800 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading while waiting for location
  if (!userLocation) {
    return <LoadingScreen />;
  }

  // Show settings screen if requested
  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  // Show main app
  return (
    <div className="w-full h-screen overflow-hidden">
      {!isOnline && <OfflineIndicator />}
      <PrayerMap
        userLocation={userLocation}
        onOpenSettings={() => setShowSettings(true)}
      />
      <DebugPanel />
      <DiagnosticOverlay />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
