/**
 * In-App Notification Manager for PrayerMap
 *
 * Manages the notification queue, display logic, and integration with push
 * notification events. Handles foreground notifications gracefully with
 * automatic queuing and deduplication.
 *
 * Features:
 * - Notification queue with FIFO ordering
 * - Automatic deduplication (prevent duplicate notifications)
 * - Max queue size (oldest notifications dropped)
 * - Integration with push notification service
 * - Event-based architecture for React integration
 * - Persistent notification history (session storage)
 * - Read/unread tracking
 *
 * @module inAppNotificationManager
 */

import { PushNotificationSchema } from '@capacitor/push-notifications';
import type { InAppNotification } from '../components/InAppNotificationEnhanced';
import type { NotificationType } from './pushNotificationService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface NotificationQueueItem extends InAppNotification {
  read: boolean;
  dismissed: boolean;
}

export interface NotificationManagerConfig {
  maxQueueSize?: number;
  maxVisible?: number;
  autoDismissDelay?: number;
  persistToStorage?: boolean;
  soundEnabled?: boolean;
}

type NotificationListener = (notifications: NotificationQueueItem[]) => void;
type NotificationEventListener = (notification: NotificationQueueItem) => void;

// ============================================================================
// Notification Manager Class
// ============================================================================

class InAppNotificationManager {
  private queue: NotificationQueueItem[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private eventListeners: Map<string, Set<NotificationEventListener>> = new Map();
  private config: Required<NotificationManagerConfig>;
  private isInitialized = false;

  constructor(config: NotificationManagerConfig = {}) {
    this.config = {
      maxQueueSize: config.maxQueueSize ?? 20,
      maxVisible: config.maxVisible ?? 3,
      autoDismissDelay: config.autoDismissDelay ?? 5000,
      persistToStorage: config.persistToStorage ?? true,
      soundEnabled: config.soundEnabled ?? true
    };
  }

  /**
   * Initialize the notification manager
   * Should be called once when the app starts
   */
  initialize(): void {
    if (this.isInitialized) {
      console.log('[NotificationManager] Already initialized');
      return;
    }

    // Load persisted notifications from session storage
    if (this.config.persistToStorage) {
      this.loadFromStorage();
    }

    this.isInitialized = true;
    console.log('[NotificationManager] Initialized');
  }

  /**
   * Add a notification to the queue
   */
  add(notification: InAppNotification): void {
    // Check for duplicate (same ID or same prayer_id + type)
    const isDuplicate = this.queue.some(n => {
      if (n.id === notification.id) return true;
      if (n.type === notification.type &&
          n.data?.prayer_id === notification.data?.prayer_id &&
          notification.data?.prayer_id !== undefined) {
        return true;
      }
      return false;
    });

    if (isDuplicate) {
      console.log('[NotificationManager] Duplicate notification ignored:', notification.id);
      return;
    }

    // Create queue item
    const queueItem: NotificationQueueItem = {
      ...notification,
      read: false,
      dismissed: false
    };

    // Add to queue
    this.queue.push(queueItem);

    // Enforce max queue size (remove oldest)
    if (this.queue.length > this.config.maxQueueSize) {
      const removed = this.queue.shift();
      console.log('[NotificationManager] Queue full, removed oldest:', removed?.id);
    }

    // Persist to storage
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }

    // Emit events
    this.emit('add', queueItem);
    this.notifyListeners();

    console.log('[NotificationManager] Added notification:', notification.id, 'Queue size:', this.queue.length);
  }

  /**
   * Remove a notification by ID
   */
  remove(id: string): void {
    const index = this.queue.findIndex(n => n.id === id);
    if (index === -1) return;

    const notification = this.queue[index];
    notification.dismissed = true;

    // Remove from queue
    this.queue.splice(index, 1);

    // Persist to storage
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }

    // Emit events
    this.emit('remove', notification);
    this.notifyListeners();

    console.log('[NotificationManager] Removed notification:', id);
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id: string): void {
    const notification = this.queue.find(n => n.id === id);
    if (!notification) return;

    notification.read = true;

    // Persist to storage
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }

    // Emit events
    this.emit('read', notification);
    this.notifyListeners();

    console.log('[NotificationManager] Marked as read:', id);
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    const count = this.queue.length;
    this.queue = [];

    // Persist to storage
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }

    this.emit('clearAll', null as any);
    this.notifyListeners();

    console.log('[NotificationManager] Cleared all notifications:', count);
  }

  /**
   * Get all notifications (visible ones)
   */
  getAll(): NotificationQueueItem[] {
    return this.queue.filter(n => !n.dismissed);
  }

  /**
   * Get visible notifications (most recent N)
   */
  getVisible(): NotificationQueueItem[] {
    const visible = this.queue
      .filter(n => !n.dismissed)
      .slice(-this.config.maxVisible);
    return visible;
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.queue.filter(n => !n.read && !n.dismissed).length;
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to specific events
   */
  on(event: 'add' | 'remove' | 'read' | 'clearAll', listener: NotificationEventListener): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(listener);
    };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<NotificationManagerConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    console.log('[NotificationManager] Configuration updated:', this.config);
  }

  // ============================================================================
  // Push Notification Integration
  // ============================================================================

  /**
   * Handle a push notification received while app is in foreground
   */
  handlePushNotification(pushNotification: PushNotificationSchema): void {
    const notification = this.convertPushToInApp(pushNotification);
    this.add(notification);
  }

  /**
   * Convert a push notification to in-app notification format
   */
  private convertPushToInApp(pushNotification: PushNotificationSchema): InAppNotification {
    const data = pushNotification.data as Record<string, string> | undefined;
    const notificationType = (data?.type as NotificationType) || 'GENERAL';

    return {
      id: pushNotification.id || `notification-${Date.now()}-${Math.random()}`,
      type: notificationType,
      title: pushNotification.title || 'New Notification',
      body: pushNotification.body || '',
      avatarUrl: data?.avatar_url,
      userName: data?.user_name,
      timestamp: new Date(),
      data: {
        prayer_id: data?.prayer_id,
        user_id: data?.user_id,
        response_id: data?.response_id,
        connection_id: data?.connection_id
      }
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners(): void {
    const notifications = this.getVisible();
    this.listeners.forEach(listener => {
      try {
        listener(notifications);
      } catch (error) {
        console.error('[NotificationManager] Error in listener:', error);
      }
    });
  }

  /**
   * Emit event to specific event listeners
   */
  private emit(event: string, notification: NotificationQueueItem): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;

    listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error(`[NotificationManager] Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Save queue to session storage
   */
  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(this.queue.map(n => ({
        ...n,
        timestamp: n.timestamp.toISOString()
      })));
      sessionStorage.setItem('prayermap_notification_queue', serialized);
    } catch (error) {
      console.error('[NotificationManager] Error saving to storage:', error);
    }
  }

  /**
   * Load queue from session storage
   */
  private loadFromStorage(): void {
    try {
      const serialized = sessionStorage.getItem('prayermap_notification_queue');
      if (!serialized) return;

      const parsed = JSON.parse(serialized);
      this.queue = parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));

      console.log('[NotificationManager] Loaded from storage:', this.queue.length, 'notifications');
    } catch (error) {
      console.error('[NotificationManager] Error loading from storage:', error);
      // Clear corrupted data
      sessionStorage.removeItem('prayermap_notification_queue');
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const notificationManager = new InAppNotificationManager();

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook to use the notification manager
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { notifications, removeNotification } = useNotificationManager();
 *
 *   return (
 *     <NotificationStack
 *       notifications={notifications}
 *       onClose={removeNotification}
 *     />
 *   );
 * }
 * ```
 */
export function useNotificationManager() {
  const [notifications, setNotifications] = React.useState<NotificationQueueItem[]>(() =>
    notificationManager.getVisible()
  );

  React.useEffect(() => {
    // Subscribe to changes
    const unsubscribe = notificationManager.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
    });

    // Initial load
    setNotifications(notificationManager.getVisible());

    return unsubscribe;
  }, []);

  return {
    notifications,
    addNotification: (notification: InAppNotification) => notificationManager.add(notification),
    removeNotification: (id: string) => notificationManager.remove(id),
    markAsRead: (id: string) => notificationManager.markAsRead(id),
    clearAll: () => notificationManager.clearAll(),
    unreadCount: notificationManager.getUnreadCount()
  };
}

// Import React for the hook
import * as React from 'react';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Initialize notification manager and integrate with push notifications
 * Call this once in your app's entry point (e.g., App.tsx)
 */
export function initializeNotificationManager(config?: NotificationManagerConfig): void {
  // Initialize manager
  if (config) {
    notificationManager.configure(config);
  }
  notificationManager.initialize();

  // Integrate with push notification service
  // (This would be called in the push notification listener setup)
  console.log('[NotificationManager] Ready for push notification integration');
}

/**
 * Create a manual in-app notification (for testing or manual triggers)
 */
export function createNotification(
  type: NotificationType,
  title: string,
  body: string,
  data?: InAppNotification['data']
): InAppNotification {
  return {
    id: `manual-${Date.now()}-${Math.random()}`,
    type,
    title,
    body,
    timestamp: new Date(),
    data
  };
}
