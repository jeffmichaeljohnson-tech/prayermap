/**
 * InAppNotificationEnhanced - Usage Examples
 *
 * This file demonstrates how to integrate the enhanced in-app notification
 * system into PrayerMap.
 *
 * @module InAppNotificationEnhanced.example
 */

import React, { useEffect } from 'react';
import { NotificationStack } from './InAppNotificationEnhanced';
import {
  notificationManager,
  useNotificationManager,
  initializeNotificationManager,
  createNotification
} from '../services/inAppNotificationManager';
import { pushNotificationService } from '../services/pushNotificationService';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

// ============================================================================
// Example 1: Basic Integration in App.tsx
// ============================================================================

/**
 * Add this to your main App component
 */
export function AppWithNotifications() {
  const { notifications, removeNotification } = useNotificationManager();

  // Initialize on mount
  useEffect(() => {
    // Initialize notification manager
    initializeNotificationManager({
      maxQueueSize: 20,
      maxVisible: 3,
      autoDismissDelay: 5000,
      persistToStorage: true,
      soundEnabled: true
    });

    // Only on native platforms
    if (Capacitor.isNativePlatform()) {
      // Listen for foreground push notifications
      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification) => {
          console.log('Foreground notification received:', notification);
          // Convert and add to in-app notification queue
          notificationManager.handlePushNotification(notification);
        }
      );
    }

    return () => {
      // Cleanup listeners if needed
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, []);

  // Handle notification tap
  const handleNotificationClick = (notification: any) => {
    console.log('Notification clicked:', notification);

    // Navigate based on notification type and data
    if (notification.data?.prayer_id) {
      // Navigate to prayer detail
      window.location.href = `/prayer/${notification.data.prayer_id}`;
    } else if (notification.data?.user_id) {
      // Navigate to user profile
      window.location.href = `/user/${notification.data.user_id}`;
    }

    // Mark as read
    notificationManager.markAsRead(notification.id);
  };

  return (
    <div className="app">
      {/* Your app content */}
      <YourAppContent />

      {/* Notification Stack */}
      <NotificationStack
        notifications={notifications}
        onClose={removeNotification}
        onClick={handleNotificationClick}
        maxVisible={3}
        playSound={true}
      />
    </div>
  );
}

// Placeholder component
function YourAppContent() {
  return <div>Your app content here</div>;
}

// ============================================================================
// Example 2: Manual Notification Triggers
// ============================================================================

/**
 * Trigger a notification manually (for testing or special events)
 */
export function ManualNotificationExample() {
  const triggerTestNotification = () => {
    const notification = createNotification(
      'PRAYER_SUPPORT',
      'Someone is praying for you',
      'John Doe sent you a prayer response: "Praying for your healing and peace."',
      {
        prayer_id: 'prayer-123',
        user_id: 'user-456',
        response_id: 'response-789'
      }
    );

    notificationManager.add(notification);
  };

  return (
    <button onClick={triggerTestNotification}>
      Test Notification
    </button>
  );
}

// ============================================================================
// Example 3: Different Notification Types
// ============================================================================

export function NotificationTypeExamples() {
  const showPrayerResponse = () => {
    notificationManager.add({
      id: `notif-${Date.now()}`,
      type: 'PRAYER_RESPONSE',
      title: 'New Prayer Response',
      body: 'Sarah M. responded to your prayer request',
      userName: 'Sarah M.',
      timestamp: new Date(),
      data: { prayer_id: 'prayer-123', response_id: 'response-456' }
    });
  };

  const showPrayerSupport = () => {
    notificationManager.add({
      id: `notif-${Date.now()}`,
      type: 'PRAYER_SUPPORT',
      title: 'Someone is Praying',
      body: 'Michael J. is praying for your request',
      userName: 'Michael J.',
      avatarUrl: 'https://example.com/avatar.jpg',
      timestamp: new Date(),
      data: { prayer_id: 'prayer-123', user_id: 'user-789' }
    });
  };

  const showNearbyPrayer = () => {
    notificationManager.add({
      id: `notif-${Date.now()}`,
      type: 'NEARBY_PRAYER',
      title: 'Prayer Request Nearby',
      body: 'Someone near you needs prayer for healing',
      timestamp: new Date(),
      data: { prayer_id: 'prayer-456' }
    });
  };

  const showConnectionCreated = () => {
    notificationManager.add({
      id: `notif-${Date.now()}`,
      type: 'CONNECTION_CREATED',
      title: 'Prayer Connection Created',
      body: 'Your prayer created a memorial connection on the map',
      timestamp: new Date(),
      data: { connection_id: 'conn-123', prayer_id: 'prayer-789' }
    });
  };

  return (
    <div className="space-y-2">
      <button onClick={showPrayerResponse}>Prayer Response</button>
      <button onClick={showPrayerSupport}>Prayer Support</button>
      <button onClick={showNearbyPrayer}>Nearby Prayer</button>
      <button onClick={showConnectionCreated}>Connection Created</button>
    </div>
  );
}

// ============================================================================
// Example 4: Notification Management
// ============================================================================

export function NotificationManagerExample() {
  const { notifications, unreadCount, clearAll } = useNotificationManager();

  return (
    <div>
      <div className="notification-badge">
        Unread: {unreadCount}
      </div>

      <button onClick={clearAll}>
        Clear All Notifications
      </button>

      <div className="notification-list">
        {notifications.map(n => (
          <div key={n.id} className={n.read ? 'read' : 'unread'}>
            <h4>{n.title}</h4>
            <p>{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Example 5: Integration with Push Notification Service
// ============================================================================

/**
 * Complete integration example with push notifications
 */
export function CompletePushIntegration() {
  useEffect(() => {
    async function setupPushNotifications() {
      // Initialize notification manager
      initializeNotificationManager();

      // Initialize push notification service
      await pushNotificationService.initialize();

      // The push notification service will automatically trigger
      // foreground notifications, which we'll capture here
      if (Capacitor.isNativePlatform()) {
        PushNotifications.addListener(
          'pushNotificationReceived',
          (pushNotification) => {
            // Show as in-app notification
            notificationManager.handlePushNotification(pushNotification);
          }
        );

        // Handle taps on notifications (when app was in background)
        PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (actionPerformed) => {
            const data = actionPerformed.notification.data;

            // Navigate to relevant screen
            if (data?.prayer_id) {
              window.location.href = `/prayer/${data.prayer_id}`;
            }
          }
        );
      }
    }

    setupPushNotifications();
  }, []);

  return null; // This is a setup component
}

// ============================================================================
// Example 6: Event Listeners
// ============================================================================

export function NotificationEventListenersExample() {
  useEffect(() => {
    // Listen for new notifications
    const unsubscribeAdd = notificationManager.on('add', (notification) => {
      console.log('New notification added:', notification);

      // Custom analytics tracking
      trackNotification(notification);
    });

    // Listen for dismissed notifications
    const unsubscribeRemove = notificationManager.on('remove', (notification) => {
      console.log('Notification dismissed:', notification);
    });

    // Listen for read notifications
    const unsubscribeRead = notificationManager.on('read', (notification) => {
      console.log('Notification marked as read:', notification);
    });

    return () => {
      unsubscribeAdd();
      unsubscribeRemove();
      unsubscribeRead();
    };
  }, []);

  return null;
}

// Placeholder analytics function
function trackNotification(notification: any) {
  console.log('Tracking:', notification);
}

// ============================================================================
// Example 7: Accessibility Features
// ============================================================================

/**
 * The notification system includes built-in accessibility features:
 *
 * 1. ARIA live regions for screen readers
 * 2. Keyboard support (Escape to dismiss)
 * 3. Reduced motion support (respects prefers-reduced-motion)
 * 4. Sufficient color contrast
 * 5. Touch-friendly tap targets (44x44 minimum)
 * 6. Clear visual hierarchy
 *
 * No additional setup required - it's baked in!
 */

// ============================================================================
// Example 8: Testing
// ============================================================================

/**
 * Test the notification system
 */
export function NotificationTestSuite() {
  const runTests = () => {
    // Test 1: Add multiple notifications
    console.log('Test 1: Adding 5 notifications');
    for (let i = 0; i < 5; i++) {
      notificationManager.add({
        id: `test-${i}`,
        type: 'GENERAL',
        title: `Test Notification ${i + 1}`,
        body: 'This is a test notification',
        timestamp: new Date()
      });
    }

    // Test 2: Duplicate prevention
    console.log('Test 2: Testing duplicate prevention');
    const duplicate = {
      id: 'duplicate-test',
      type: 'GENERAL' as const,
      title: 'Duplicate Test',
      body: 'This should only appear once',
      timestamp: new Date()
    };
    notificationManager.add(duplicate);
    notificationManager.add(duplicate); // Should be ignored

    // Test 3: Clear all
    setTimeout(() => {
      console.log('Test 3: Clearing all notifications');
      notificationManager.clearAll();
    }, 3000);
  };

  return (
    <button onClick={runTests}>
      Run Notification Tests
    </button>
  );
}

// ============================================================================
// Production-Ready Setup (Copy this to your App.tsx)
// ============================================================================

/**
 * RECOMMENDED: Add this to your App.tsx root component
 */
export function ProductionNotificationSetup() {
  const { notifications, removeNotification } = useNotificationManager();

  useEffect(() => {
    // Initialize notification manager
    initializeNotificationManager({
      maxQueueSize: 20,
      maxVisible: 3,
      autoDismissDelay: 5000,
      persistToStorage: true,
      soundEnabled: true
    });

    // Setup push notification integration (mobile only)
    if (Capacitor.isNativePlatform()) {
      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification) => {
          notificationManager.handlePushNotification(notification);
        }
      );
    }
  }, []);

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    notificationManager.markAsRead(notification.id);

    // Navigate to relevant screen
    if (notification.data?.prayer_id) {
      window.location.href = `/prayer/${notification.data.prayer_id}`;
    }
  };

  return (
    <NotificationStack
      notifications={notifications}
      onClose={removeNotification}
      onClick={handleNotificationClick}
      maxVisible={3}
      playSound={true}
    />
  );
}
