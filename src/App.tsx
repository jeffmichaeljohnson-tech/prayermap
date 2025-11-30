import { useState, useEffect, Component, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
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
import { pushNotificationService, type NotificationData } from './services/pushNotificationService';
import { prayerReminderService } from './services/prayerReminderService';
import { audioService } from './services/audioService';
import { NotificationStack, type InAppNotification } from './components/InAppNotificationEnhanced';
import { useNotificationManager, initializeNotificationManager, notificationManager } from './services/inAppNotificationManager';
import { supabase } from './lib/supabase';

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

  // Use notification manager hook for in-app notifications
  const { notifications, removeNotification, markAsRead } = useNotificationManager();

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

  // Subscribe to real-time notifications from Supabase
  useEffect(() => {
    if (!user) return;

    logger.info('Setting up real-time notification subscription', {
      action: 'realtime_subscription_init',
      userId: user.id,
    });

    // Subscribe to notifications table for current user
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.info('Real-time notification received', {
            action: 'realtime_notification',
            notificationId: payload.new.notification_id,
            type: payload.new.type,
          });

          // Convert Supabase notification to InAppNotification format
          const dbNotification = payload.new as {
            notification_id: number;
            type: string;
            payload: {
              title?: string;
              body?: string;
              prayer_id?: string;
              user_id?: string;
              response_id?: string;
              connection_id?: string;
              avatar_url?: string;
              user_name?: string;
            };
          };

          // Map database notification type to app notification type
          const typeMap: Record<string, InAppNotification['type']> = {
            'SUPPORT_RECEIVED': 'PRAYER_SUPPORT',
            'RESPONSE_RECEIVED': 'PRAYER_RESPONSE',
            'PRAYER_ANSWERED': 'CONNECTION_CREATED',
          };

          const inAppNotification: InAppNotification = {
            id: `db-${dbNotification.notification_id}`,
            type: typeMap[dbNotification.type] || 'GENERAL',
            title: dbNotification.payload?.title || 'New Notification',
            body: dbNotification.payload?.body || '',
            avatarUrl: dbNotification.payload?.avatar_url,
            userName: dbNotification.payload?.user_name,
            timestamp: new Date(),
            data: {
              prayer_id: dbNotification.payload?.prayer_id,
              user_id: dbNotification.payload?.user_id,
              response_id: dbNotification.payload?.response_id,
              connection_id: dbNotification.payload?.connection_id,
            },
          };

          // Add to notification manager
          notificationManager.add(inAppNotification);
        }
      )
      .subscribe((status) => {
        logger.info('Real-time subscription status', {
          action: 'realtime_subscription_status',
          status,
        });
      });

    // Cleanup subscription on unmount or user change
    return () => {
      logger.info('Cleaning up real-time notification subscription', {
        action: 'realtime_subscription_cleanup',
      });
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Initialize services on app mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize audio service (works on web and native)
        await audioService.init();
        audioService.loadPreferences();
        logger.info('Audio service initialized', { action: 'audio_init' });

        // Initialize in-app notification manager
        initializeNotificationManager({
          maxQueueSize: 20,
          maxVisible: 3,
          autoDismissDelay: 5000,
          persistToStorage: true,
          soundEnabled: true
        });
        logger.info('Notification manager initialized', { action: 'notification_manager_init' });

        // Initialize push notifications (native platforms only)
        if (Capacitor.isNativePlatform()) {
          try {
            await pushNotificationService.initialize();
            logger.info('Push notification service initialized', { action: 'push_init' });

            // Set foreground notification handler to use notification manager
            pushNotificationService.setForegroundNotificationHandler((notification: NotificationData) => {
              // Convert to InAppNotification format
              const inAppNotification: InAppNotification = {
                id: `push-${Date.now()}-${Math.random()}`,
                type: notification.type,
                title: notification.title,
                body: notification.body,
                avatarUrl: notification.avatar_url,
                timestamp: new Date(),
                data: {
                  prayer_id: notification.prayer_id,
                  user_id: notification.user_id,
                  response_id: notification.response_id,
                  connection_id: notification.connection_id,
                },
              };

              // Add to notification manager (handles queuing, deduplication, etc.)
              notificationManager.add(inAppNotification);

              logger.info('Foreground notification received', {
                action: 'foreground_notification',
                type: notification.type,
              });
            });
          } catch (error) {
            logger.error('Failed to initialize push notifications', error as Error, {
              action: 'push_init_error',
            });
            // Don't throw - app should work without push notifications
          }

          // Initialize prayer reminders (native platforms only)
          try {
            await prayerReminderService.initialize();
            logger.info('Prayer reminder service initialized', { action: 'reminder_init' });
          } catch (error) {
            logger.error('Failed to initialize prayer reminders', error as Error, {
              action: 'reminder_init_error',
            });
            // Don't throw - app should work without reminders
          }
        } else {
          logger.info('Skipping native services on web platform', { action: 'native_services_skip' });
        }
      } catch (error) {
        logger.error('Failed to initialize services', error as Error, {
          action: 'services_init_error',
        });
        // Don't throw - app should continue to load even if services fail
      }
    };

    initializeServices();
  }, []);

  // Handle app lifecycle (native platforms only)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Listen for app state changes
    const stateChangeListener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        logger.info('App came to foreground', { action: 'app_foreground' });

        // Refresh push token when app comes to foreground
        try {
          await pushNotificationService.refreshToken();
          logger.info('Push token refreshed', { action: 'token_refresh' });
        } catch (error) {
          logger.error('Failed to refresh push token', error as Error, {
            action: 'token_refresh_error',
          });
        }
      } else {
        logger.info('App went to background', { action: 'app_background' });
      }
    });

    // Cleanup listener on unmount
    return () => {
      stateChangeListener.remove();
    };
  }, []);

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

  // Notification handlers
  const handleNotificationClose = (id: string) => {
    // Remove notification from manager
    removeNotification(id);
    logger.info('Notification dismissed', { action: 'notification_dismiss', id });
  };

  const handleNotificationClick = async (notification: InAppNotification) => {
    // Mark notification as read
    markAsRead(notification.id);

    logger.info('Notification tapped', {
      action: 'notification_tap',
      prayer_id: notification.data?.prayer_id,
      type: notification.type,
    });

    // Mark as read in database if this is a database notification (starts with 'db-')
    if (notification.id.startsWith('db-') && user) {
      try {
        const notificationId = parseInt(notification.id.replace('db-', ''), 10);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString()
          })
          .eq('notification_id', notificationId)
          .eq('user_id', user.id);

        if (error) {
          logger.error('Failed to mark notification as read in database', error, {
            action: 'notification_mark_read_error',
            notificationId,
          });
        } else {
          logger.info('Notification marked as read in database', {
            action: 'notification_mark_read_success',
            notificationId,
          });
        }
      } catch (error) {
        logger.error('Error marking notification as read', error as Error, {
          action: 'notification_mark_read_exception',
        });
      }
    }

    // Handle navigation based on notification type and data
    // Since the app uses PrayerMap component with modal-based navigation,
    // we'll use a custom event to trigger the modal opening
    if (notification.data?.prayer_id) {
      // Dispatch custom event that PrayerMap can listen to
      const event = new CustomEvent('open-prayer-detail', {
        detail: {
          prayerId: notification.data.prayer_id,
          responseId: notification.data.response_id,
        },
      });
      window.dispatchEvent(event);

      logger.info('Prayer detail requested from notification', {
        action: 'notification_navigate_prayer',
        prayerId: notification.data.prayer_id,
      });
    } else if (notification.data?.connection_id) {
      // Future: Handle connection navigation
      logger.info('Connection navigation not yet implemented', {
        action: 'notification_navigate_connection',
        connectionId: notification.data.connection_id,
      });
    }

    // Auto-dismiss notification after action
    setTimeout(() => {
      removeNotification(notification.id);
    }, 300);
  };

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

      {/* In-App Notification Stack */}
      <NotificationStack
        notifications={notifications}
        onClose={handleNotificationClose}
        onClick={handleNotificationClick}
        maxVisible={3}
        playSound={true}
      />
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
