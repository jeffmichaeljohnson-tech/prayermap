/**
 * Push Notification Service - Usage Examples
 *
 * This file demonstrates how to use the enhanced push notification service
 * in various scenarios within the PrayerMap application.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePushNotifications, useForegroundNotification, usePermissionPrompt } from '../hooks/usePushNotifications';
import type { NotificationData } from './pushNotificationService';

// ============================================================================
// Example 1: Basic Integration in App.tsx
// ============================================================================

export function AppWithPushNotifications() {
  const {
    isInitialized,
    permissionStatus,
    badgeCount,
    requestPermissions,
    clearBadge,
    setForegroundHandler
  } = usePushNotifications();

  // Setup foreground notification handler
  useEffect(() => {
    setForegroundHandler((notification) => {
      console.log('Foreground notification received:', notification);
      // Show custom in-app notification UI
      // This will be handled by useForegroundNotification hook
    });
  }, [setForegroundHandler]);

  if (!isInitialized) {
    return <div>Initializing push notifications...</div>;
  }

  return (
    <div>
      <header>
        <h1>PrayerMap</h1>
        <NotificationBadge count={badgeCount} onClear={clearBadge} />
      </header>

      {permissionStatus.status !== 'granted' && (
        <PermissionPromptBanner onRequest={requestPermissions} />
      )}

      <main>
        {/* Your app content */}
      </main>

      {/* Show in-app notification for foreground messages */}
      <ForegroundNotificationToast />
    </div>
  );
}

// ============================================================================
// Example 2: Permission Prompt Banner
// ============================================================================

interface PermissionPromptBannerProps {
  onRequest: () => Promise<boolean>;
}

export function PermissionPromptBanner({ onRequest }: PermissionPromptBannerProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleRequest = async () => {
    setIsRequesting(true);
    const granted = await onRequest();
    setIsRequesting(false);

    if (granted) {
      console.log('Push notifications enabled!');
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass p-4 m-4 rounded-lg"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Stay Connected in Prayer</h3>
          <p className="text-sm text-secondary">
            Enable notifications to know when others are praying for you
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsDismissed(true)}
            className="px-4 py-2 text-sm"
          >
            Not Now
          </button>
          <button
            onClick={handleRequest}
            disabled={isRequesting}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            {isRequesting ? 'Enabling...' : 'Enable'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Example 3: Notification Badge Component
// ============================================================================

interface NotificationBadgeProps {
  count: number;
  onClear: () => void;
}

export function NotificationBadge({ count, onClear }: NotificationBadgeProps) {
  if (count === 0) {
    return (
      <button className="relative p-2">
        <BellIcon className="w-6 h-6" />
      </button>
    );
  }

  return (
    <button onClick={onClear} className="relative p-2">
      <BellIcon className="w-6 h-6" />
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
      >
        {count > 9 ? '9+' : count}
      </motion.span>
    </button>
  );
}

// ============================================================================
// Example 4: Foreground Notification Toast
// ============================================================================

export function ForegroundNotificationToast() {
  const { notification, isVisible, dismiss } = useForegroundNotification();

  if (!notification || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-4 left-0 right-0 mx-auto max-w-md z-50"
      >
        <div className="glass mx-4 p-4 rounded-lg shadow-lg">
          <div className="flex items-start gap-3">
            {notification.avatar_url && (
              <img
                src={notification.avatar_url}
                alt="Avatar"
                className="w-10 h-10 rounded-full"
              />
            )}
            <div className="flex-1">
              <h4 className="font-semibold">{notification.title}</h4>
              <p className="text-sm text-secondary">{notification.body}</p>
            </div>
            <button onClick={dismiss} className="text-gray-400">
              ✕
            </button>
          </div>

          {notification.prayer_id && (
            <a
              href={`/prayer/${notification.prayer_id}`}
              className="mt-2 block text-sm text-primary"
            >
              View Prayer →
            </a>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Example 5: Smart Permission Prompt (One-Time)
// ============================================================================

export function SmartPermissionPrompt() {
  const { shouldShow, markAsShown } = usePermissionPrompt();
  const { requestPermissions } = usePushNotifications();

  if (!shouldShow) {
    return null;
  }

  const handleEnable = async () => {
    const granted = await requestPermissions();
    markAsShown();

    if (granted) {
      console.log('Push notifications enabled!');
    }
  };

  const handleDismiss = () => {
    markAsShown();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
    >
      <div className="glass max-w-md p-6 m-4 rounded-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
            <BellIcon className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Stay Connected</h2>
          <p className="text-secondary mb-6">
            Get notified when others pray for you, respond to your prayers,
            or when there are prayer requests nearby.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 border rounded-lg"
            >
              Not Now
            </button>
            <button
              onClick={handleEnable}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg"
            >
              Enable Notifications
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Example 6: Settings Page Integration
// ============================================================================

export function NotificationSettings() {
  const {
    permissionStatus,
    badgeCount,
    requestPermissions,
    openSettings,
    clearBadge
  } = usePushNotifications();

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Notification Settings</h2>

      <div className="space-y-4">
        {/* Permission Status */}
        <div className="glass p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Push Notifications</h3>
              <p className="text-sm text-secondary">
                Status: {permissionStatus.status}
              </p>
            </div>

            {permissionStatus.status === 'granted' && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                Enabled
              </span>
            )}

            {permissionStatus.status === 'denied' && (
              <button
                onClick={openSettings}
                className="px-4 py-2 bg-primary text-white rounded-lg"
              >
                Open Settings
              </button>
            )}

            {permissionStatus.status === 'prompt' && (
              <button
                onClick={() => requestPermissions()}
                className="px-4 py-2 bg-primary text-white rounded-lg"
              >
                Enable
              </button>
            )}
          </div>
        </div>

        {/* Badge Count */}
        {permissionStatus.status === 'granted' && (
          <div className="glass p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Unread Notifications</h3>
                <p className="text-sm text-secondary">
                  You have {badgeCount} unread notification{badgeCount !== 1 ? 's' : ''}
                </p>
              </div>

              {badgeCount > 0 && (
                <button
                  onClick={clearBadge}
                  className="px-4 py-2 border rounded-lg"
                >
                  Clear Badge
                </button>
              )}
            </div>
          </div>
        )}

        {/* Permanently Denied Warning */}
        {permissionStatus.permanentlyDenied && (
          <div className="glass p-4 rounded-lg bg-yellow-50">
            <h3 className="font-semibold text-yellow-900 mb-2">
              Notifications Disabled
            </h3>
            <p className="text-sm text-yellow-800 mb-3">
              You've disabled notifications for PrayerMap. To enable them,
              you'll need to open your device settings.
            </p>
            <button
              onClick={openSettings}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg"
            >
              Open Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}
