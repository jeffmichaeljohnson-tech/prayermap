/**
 * usePushNotifications Hook
 *
 * React hook for managing push notifications in PrayerMap
 *
 * Features:
 * - Auto-initializes push notifications on mount
 * - Tracks permission state
 * - Manages badge count
 * - Provides easy permission request flow
 * - Refreshes token on app foreground
 * - Handles foreground notifications with custom UI
 *
 * Usage:
 * ```tsx
 * function App() {
 *   const {
 *     isInitialized,
 *     permissionStatus,
 *     badgeCount,
 *     requestPermissions,
 *     clearBadge,
 *     canRequestPermission
 *   } = usePushNotifications();
 *
 *   // Show permission prompt if needed
 *   if (!permissionStatus.granted && canRequestPermission) {
 *     return <PermissionPrompt onRequest={requestPermissions} />;
 *   }
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  pushNotificationService,
  type PermissionState,
  type NotificationData
} from '../services/pushNotificationService.js';

export interface UsePushNotificationsReturn {
  // State
  isInitialized: boolean;
  permissionStatus: PermissionState;
  badgeCount: number;
  isLoading: boolean;

  // Actions
  requestPermissions: (soft?: boolean) => Promise<boolean>;
  openSettings: () => Promise<void>;
  clearBadge: () => Promise<void>;
  refreshToken: () => Promise<void>;

  // Computed
  canRequestPermission: boolean;
  shouldShowPermissionPrompt: boolean;

  // Notification handling
  setForegroundHandler: (handler: (notification: NotificationData) => void) => void;
}

/**
 * Hook for managing push notifications
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>({
    status: 'unknown',
    canRequest: false,
    permanentlyDenied: false
  });
  const [badgeCount, setBadgeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Track if we've already initialized
  const initAttemptedRef = useRef(false);

  /**
   * Initialize push notifications service
   */
  const initializeService = useCallback(async () => {
    // Only initialize on native platforms
    if (!Capacitor.isNativePlatform()) {
      setIsLoading(false);
      return;
    }

    // Prevent double initialization
    if (initAttemptedRef.current) {
      return;
    }

    initAttemptedRef.current = true;

    try {
      setIsLoading(true);

      // Initialize the service
      await pushNotificationService.initialize();
      setIsInitialized(true);

      // Check initial permission status
      const permState = await pushNotificationService.checkPermissions();
      setPermissionStatus(permState);

      // Get initial badge count
      const count = await pushNotificationService.getBadgeCount();
      setBadgeCount(count);

      console.log('Push notifications hook initialized');
    } catch (error) {
      console.error('Error initializing push notifications hook:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Request push notification permissions
   * @param soft - If true, just check if we can request (don't show prompt)
   */
  const requestPermissions = useCallback(async (soft = false): Promise<boolean> => {
    try {
      setIsLoading(true);
      const granted = await pushNotificationService.requestPermissions(soft);

      // Update permission status
      const permState = await pushNotificationService.checkPermissions();
      setPermissionStatus(permState);

      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Open app settings (for permanently denied permissions)
   */
  const openSettings = useCallback(async (): Promise<void> => {
    await pushNotificationService.openSettings();
  }, []);

  /**
   * Clear badge count
   */
  const clearBadge = useCallback(async (): Promise<void> => {
    await pushNotificationService.clearBadge();
    setBadgeCount(0);
  }, []);

  /**
   * Refresh push token (call when app comes to foreground)
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    await pushNotificationService.refreshToken();
  }, []);

  /**
   * Set custom foreground notification handler
   */
  const setForegroundHandler = useCallback(
    (handler: (notification: NotificationData) => void): void => {
      pushNotificationService.setForegroundNotificationHandler(handler);
    },
    []
  );

  /**
   * Update badge count from service
   */
  const updateBadgeCount = useCallback(async () => {
    const count = pushNotificationService.getUnreadCount();
    setBadgeCount(count);
  }, []);

  /**
   * Setup app state listeners (foreground/background)
   */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle: { remove: () => void } | null = null;

    // Setup listener
    const setupListener = async () => {
      // Listen for app state changes
      listenerHandle = await CapacitorApp.addListener('appStateChange', async (state) => {
        if (state.isActive) {
          // App came to foreground
          console.log('App resumed - refreshing push token');

          // Refresh token
          await refreshToken();

          // Update permission status
          const permState = await pushNotificationService.checkPermissions();
          setPermissionStatus(permState);

          // Update badge count
          await updateBadgeCount();
        }
      });
    };

    setupListener();

    // Cleanup
    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [refreshToken, updateBadgeCount]);

  /**
   * Setup badge count sync interval
   * Syncs badge count from service every 10 seconds
   */
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    // Update badge count periodically
    const interval = setInterval(updateBadgeCount, 10000);

    // Initial update
    updateBadgeCount();

    return () => {
      clearInterval(interval);
    };
  }, [isInitialized, updateBadgeCount]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeService();
  }, [initializeService]);

  // Computed values
  const canRequestPermission =
    permissionStatus.canRequest && !permissionStatus.permanentlyDenied;

  const shouldShowPermissionPrompt =
    isInitialized &&
    !isLoading &&
    permissionStatus.status === 'prompt' &&
    canRequestPermission;

  return {
    // State
    isInitialized,
    permissionStatus,
    badgeCount,
    isLoading,

    // Actions
    requestPermissions,
    openSettings,
    clearBadge,
    refreshToken,

    // Computed
    canRequestPermission,
    shouldShowPermissionPrompt,

    // Notification handling
    setForegroundHandler
  };
}

/**
 * Hook for tracking when to show permission UI
 * Separate hook to avoid re-rendering the whole app
 */
export function usePermissionPrompt() {
  const [shouldShow, setShouldShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const checkPermissionPrompt = async () => {
      // Check if we've already shown the prompt
      const shown = localStorage.getItem('prayermap_permission_prompt_shown');
      if (shown === 'true') {
        setHasShown(true);
        return;
      }

      // Check permission status
      const permState = await pushNotificationService.checkPermissions();

      // Show prompt if we can request and haven't shown yet
      if (permState.status === 'prompt' && permState.canRequest) {
        setShouldShow(true);
      }
    };

    checkPermissionPrompt();
  }, []);

  const markAsShown = useCallback(() => {
    localStorage.setItem('prayermap_permission_prompt_shown', 'true');
    setHasShown(true);
    setShouldShow(false);
  }, []);

  return {
    shouldShow,
    hasShown,
    markAsShown
  };
}

/**
 * Hook for displaying foreground notifications
 * Provides a simple way to show in-app notification UI
 */
export function useForegroundNotification() {
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Setup handler for foreground notifications
    pushNotificationService.setForegroundNotificationHandler((notification) => {
      setCurrentNotification(notification);
      setIsVisible(true);

      // Auto-hide after 5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    });
  }, []);

  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    notification: currentNotification,
    isVisible,
    dismiss
  };
}
