import { useState, useEffect, Component, ReactNode } from 'react';
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
import { OfflineIndicator } from './components/FallbackUI';
import { useConnectionStatus } from './lib/selfHealing';
// import { MonitoringDashboard } from './components/MonitoringDashboard';
// import { logger as structuredLogger } from './lib/logging/structuredLogger';
// import { performanceMonitor as newPerformanceMonitor } from './lib/logging/performanceMonitor';
// import { errorTracker as newErrorTracker } from './lib/logging/errorTracking';
// import { monitoringOrchestrator } from './lib/logging/monitoringOrchestrator';
// import { useObservability } from './hooks/useObservability';

// Error boundary specifically for lazy loading failures
class LazyLoadErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracker
    errorTracker.captureError(error, {
      context: 'lazy_load_failure',
      componentStack: errorInfo.componentStack,
    });
    logger.error('Lazy load component failed', error, {
      action: 'lazy_load_error',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-md text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl text-gray-800 mb-2">Component Load Error</h2>
            <p className="text-gray-600 mb-4">
              Failed to load a component. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-yellow-300 to-purple-300 rounded-full text-gray-800 font-medium hover:from-yellow-400 hover:to-purple-400 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize observability systems on app start
errorTracker.init();
performanceMonitor.init();
// newErrorTracker.init();
// newPerformanceMonitor.init();
// monitoringOrchestrator.init();

// Start automated monitoring cycle for 100% log coverage
// monitoringOrchestrator.startAutomation();

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
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { isOnline } = useConnectionStatus();
  
  // Initialize world-class observability for this component
  // const { 
  //   logPerformance, 
  //   trackError, 
  //   isHealthy, 
  //   metrics 
  // } = useObservability('AppContent');
  
  // Temporary mock functions
  const logPerformance = () => {};
  const trackError = () => {};
  const isHealthy = true;

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

  // Get user location with world-class observability
  useEffect(() => {
    const startTime = performance.now();
    
    if ('geolocation' in navigator) {
      logger.debug('Requesting user location', {
        component: 'AppContent',
        action: 'geolocation_request',
        timestamp: new Date().toISOString()
      });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const duration = performance.now() - startTime;
          
          // Log performance metrics
          logPerformance('geolocation_success', duration);
          
          logger.info('User location obtained', {
            component: 'AppContent',
            action: 'geolocation_success',
            duration_ms: duration,
            metadata: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
            timestamp: new Date().toISOString()
          });

          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          const duration = performance.now() - startTime;
          
          // Track error with observability
          trackError(error as unknown as Error, {
            component: 'AppContent',
            action: 'geolocation_error',
            duration_ms: duration,
            metadata: {
              code: error.code,
              message: error.message,
            }
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
      // One-time initialization check on mount to verify browser support
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Show monitoring dashboard if requested (world-class observability)
  // if (showMonitoring) {
  //   return <MonitoringDashboard onBack={() => setShowMonitoring(false)} />;
  // }

  // Show settings screen if requested
  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  // Show main app with world-class observability
  return (
    <div className="w-full h-screen overflow-hidden">
      {!isOnline && <OfflineIndicator />}
      
      {/* Health status indicator - red dot if system unhealthy */}
      {!isHealthy && (
        <div className="absolute top-4 right-20 z-50">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
      
      {/* Monitoring dashboard access button for developers */}
      {/* <button
        onClick={() => setShowMonitoring(true)}
        className="absolute top-4 right-4 z-50 p-2 bg-gray-800 text-white rounded-full opacity-20 hover:opacity-100 transition-opacity"
        title="Open Monitoring Dashboard"
      >
        📊
      </button> */}
      
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
      <LazyLoadErrorBoundary>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LazyLoadErrorBoundary>
    </AppErrorBoundary>
  );
}
