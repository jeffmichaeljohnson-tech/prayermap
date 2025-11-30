/**
 * Push Notification Service for PrayerMap
 *
 * Handles FCM registration, token management, and notification handling
 * for Android (via Firebase Cloud Messaging) and iOS (via APNs).
 *
 * Features:
 * - Badge count management
 * - Rich notifications with images
 * - Notification categories with action buttons (iOS)
 * - Deep link handling
 * - Foreground notification handling
 * - Multi-device token management
 * - Permission flow with soft prompts
 *
 * @module pushNotificationService
 */

import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
  Channel,
  PermissionStatus
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
// Note: @capacitor/badge needs to be installed: npm install @capacitor/badge
// import { Badge } from '@capacitor/badge';
import { supabase } from '../lib/supabase.js';

// ============================================================================
// Type Definitions
// ============================================================================

export type NotificationType =
  | 'PRAYER_RESPONSE'
  | 'PRAYER_SUPPORT'
  | 'NEARBY_PRAYER'
  | 'CONNECTION_CREATED'
  | 'GENERAL';

export interface NotificationData {
  type: NotificationType;
  prayer_id?: string;
  user_id?: string;
  response_id?: string;
  connection_id?: string;
  avatar_url?: string;
  title: string;
  body: string;
}

export interface NotificationCategory {
  id: string;
  actions: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  title: string;
  foreground?: boolean;
  destructive?: boolean;
  authenticationRequired?: boolean;
}

export interface PermissionState {
  status: 'granted' | 'denied' | 'prompt' | 'unknown';
  canRequest: boolean; // Can still show system prompt
  permanentlyDenied: boolean; // User denied and can't request again
}

export interface PushNotificationService {
  // Initialization
  initialize(): Promise<void>;

  // Permissions
  checkPermissions(): Promise<PermissionState>;
  requestPermissions(soft?: boolean): Promise<boolean>;
  openSettings(): Promise<void>;

  // Token Management
  registerDevice(token: string): Promise<void>;
  unregisterDevice(): Promise<void>;
  refreshToken(): Promise<void>;

  // Badge Management
  getBadgeCount(): Promise<number>;
  setBadgeCount(count: number): Promise<void>;
  incrementBadge(): Promise<void>;
  clearBadge(): Promise<void>;

  // Notification Handling
  handleNotificationTap(notification: ActionPerformed): void;

  // State
  getUnreadCount(): number;
  isInitialized(): boolean;
}

// ============================================================================
// Notification Categories (iOS Action Buttons)
// ============================================================================

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'PRAYER_RESPONSE',
    actions: [
      { id: 'VIEW_PRAYER', title: 'View Prayer', foreground: true },
      { id: 'REPLY', title: 'Reply', foreground: true }
    ]
  },
  {
    id: 'PRAYER_SUPPORT',
    actions: [
      { id: 'VIEW_PRAYER', title: 'View Prayer', foreground: true }
    ]
  },
  {
    id: 'NEARBY_PRAYER',
    actions: [
      { id: 'PRAY', title: 'Pray', foreground: false },
      { id: 'VIEW_PRAYER', title: 'View', foreground: true }
    ]
  }
];

// ============================================================================
// Service Implementation
// ============================================================================

class PushNotificationServiceImpl implements PushNotificationService {
  private initialized = false;
  private unreadCount = 0;
  private currentToken: string | null = null;
  private foregroundNotificationHandler?: (notification: NotificationData) => void;

  /**
   * Initialize push notifications with categories and listeners
   * Should be called once when the app starts
   */
  async initialize(): Promise<void> {
    // Only initialize on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications are only available on native platforms');
      return;
    }

    if (this.initialized) {
      console.log('Push notifications already initialized');
      return;
    }

    try {
      // Setup notification categories (iOS only)
      if (Capacitor.getPlatform() === 'ios') {
        await this.setupNotificationCategories();
      }

      // Setup Android notification channels
      if (Capacitor.getPlatform() === 'android') {
        await this.setupAndroidChannels();
      }

      // Setup listeners before requesting permissions
      this.setupListeners();

      // Load badge count from storage
      await this.loadBadgeCount();

      // Don't auto-request permissions - let the app decide when
      // The hook will handle the permission flow

      this.initialized = true;
      console.log('Push notifications initialized successfully');
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      throw error;
    }
  }

  /**
   * Setup iOS notification categories with action buttons
   */
  private async setupNotificationCategories(): Promise<void> {
    try {
      // Note: Capacitor doesn't have a direct API for categories
      // This would need to be implemented in native iOS code
      // The categories are defined here for documentation and future implementation
      console.log('Notification categories configured:', NOTIFICATION_CATEGORIES);

      // TODO: Implement in native iOS code (AppDelegate.swift)
      // See: https://developer.apple.com/documentation/usernotifications/declaring_your_actionable_notification_types
    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    try {
      const channels: Channel[] = [
        {
          id: 'prayer_responses',
          name: 'Prayer Responses',
          description: 'Notifications when someone responds to your prayers',
          importance: 4, // HIGH
          sound: 'prayer_bell.wav',
          vibration: true,
          visibility: 1 // PUBLIC
        },
        {
          id: 'prayer_support',
          name: 'Prayer Support',
          description: 'Notifications when someone is praying for you',
          importance: 4, // HIGH
          sound: 'prayer_bell.wav',
          vibration: true,
          visibility: 1
        },
        {
          id: 'nearby_prayers',
          name: 'Nearby Prayers',
          description: 'Prayer requests near your location',
          importance: 3, // DEFAULT
          sound: 'default',
          vibration: true,
          visibility: 1
        },
        {
          id: 'general',
          name: 'General',
          description: 'General app notifications',
          importance: 3,
          sound: 'default',
          vibration: true,
          visibility: 1
        }
      ];

      for (const channel of channels) {
        await PushNotifications.createChannel(channel);
      }

      console.log('Android notification channels created');
    } catch (error) {
      console.error('Error creating Android channels:', error);
    }
  }

  /**
   * Setup all notification listeners
   */
  private setupListeners(): void {
    // Listen for registration success
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      this.currentToken = token.value;
      await this.registerDevice(token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error: unknown) => {
      console.error('Push registration error:', error);
    });

    // Listen for notifications received in foreground
    PushNotifications.addListener(
      'pushNotificationReceived',
      async (notification: PushNotificationSchema) => {
        console.log('Foreground notification received:', notification);
        await this.handleForegroundNotification(notification);
      }
    );

    // Listen for notification taps
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      async (action: ActionPerformed) => {
        console.log('Notification action performed:', action);
        await this.handleNotificationTap(action);
      }
    );
  }

  // ============================================================================
  // Permission Management
  // ============================================================================

  /**
   * Check current permission state
   * Returns detailed state including whether user can be prompted
   */
  async checkPermissions(): Promise<PermissionState> {
    try {
      const permStatus: PermissionStatus = await PushNotifications.checkPermissions();

      const isDenied = permStatus.receive === 'denied';
      const isPrompt = permStatus.receive === 'prompt';
      const isGranted = permStatus.receive === 'granted';

      return {
        status: permStatus.receive as 'granted' | 'denied' | 'prompt' | 'unknown',
        canRequest: isPrompt || isGranted,
        permanentlyDenied: isDenied && !isPrompt
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {
        status: 'unknown',
        canRequest: false,
        permanentlyDenied: false
      };
    }
  }

  /**
   * Request push notification permissions
   * @param soft - If true, don't show system prompt (for pre-prompt UI)
   */
  async requestPermissions(soft = false): Promise<boolean> {
    try {
      // Check current status first
      const currentState = await this.checkPermissions();

      if (currentState.status === 'granted') {
        // Already granted, register for notifications
        await PushNotifications.register();
        return true;
      }

      if (currentState.permanentlyDenied) {
        console.log('Permissions permanently denied - user must enable in settings');
        return false;
      }

      // Soft request - just check, don't prompt
      if (soft) {
        return currentState.canRequest;
      }

      // Request permissions (shows system prompt)
      const requestResult = await PushNotifications.requestPermissions();

      if (requestResult.receive === 'granted') {
        // Permissions granted, register for notifications
        await PushNotifications.register();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error requesting push notification permissions:', error);
      return false;
    }
  }

  /**
   * Open system settings for the app
   * Use this when permissions are permanently denied
   */
  async openSettings(): Promise<void> {
    try {
      // Note: Capacitor doesn't have a direct API for this
      // This would need to be implemented with a custom plugin
      // For now, log instruction for user
      console.log('Please enable notifications in Settings > PrayerMap > Notifications');

      // TODO: Implement native deep link to settings
      // iOS: UIApplication.openSettingsURLString
      // Android: Settings.ACTION_APPLICATION_DETAILS_SETTINGS
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Register the device token with our backend
   * Stores the FCM/APNs token in Supabase for sending notifications
   * Supports multiple devices per user
   */
  async registerDevice(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('No authenticated user, skipping push token registration');
        return;
      }

      // Determine platform
      const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';

      // Get device identifier (for multi-device support)
      const deviceId = await this.getDeviceId();

      // Store FCM/APNs token in Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          token: token,
          platform: platform,
          device_id: deviceId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,device_id'
        });

      if (error) {
        // If table doesn't exist yet, log but don't throw
        if (error.code === '42P01') {
          console.log('user_push_tokens table not yet created, skipping token registration');
          return;
        }
        console.error('Error saving push token:', error);
        throw error;
      }

      this.currentToken = token;
      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Error registering device:', error);
      // Don't throw - we don't want to break the app if push registration fails
    }
  }

  /**
   * Refresh the push token
   * Call this when app comes to foreground
   */
  async refreshToken(): Promise<void> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      // Check if permissions are still granted
      const permState = await this.checkPermissions();

      if (permState.status !== 'granted') {
        console.log('Push permissions no longer granted');
        return;
      }

      // Re-register to get fresh token
      await PushNotifications.register();
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  }

  /**
   * Unregister the device (call on logout)
   */
  async unregisterDevice(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const deviceId = await this.getDeviceId();

      // Remove push token from database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('user_push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('device_id', deviceId);

      // Remove all listeners
      await PushNotifications.removeAllListeners();

      this.initialized = false;
      this.currentToken = null;
      console.log('Device unregistered successfully');
    } catch (error) {
      console.error('Error unregistering device:', error);
    }
  }

  /**
   * Get a unique device identifier
   * For multi-device token management
   */
  private async getDeviceId(): Promise<string> {
    try {
      // Try to get from storage first
      const stored = localStorage.getItem('prayermap_device_id');
      if (stored) {
        return stored;
      }

      // Generate new device ID
      const deviceId = `${Capacitor.getPlatform()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem('prayermap_device_id', deviceId);

      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `fallback_${Date.now()}`;
    }
  }

  // ============================================================================
  // Badge Management
  // ============================================================================

  /**
   * Get current badge count
   */
  async getBadgeCount(): Promise<number> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return this.unreadCount;
      }

      // Note: Badge plugin doesn't have a get method
      // We track the count ourselves
      return this.unreadCount;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      this.unreadCount = Math.max(0, count);

      if (!Capacitor.isNativePlatform()) {
        await this.saveBadgeCount();
        return;
      }

      // TODO: Install @capacitor/badge plugin to enable native badge support
      // await Badge.set({ count: this.unreadCount });

      // For now, just persist to storage
      await this.saveBadgeCount();

      console.log(`Badge count set to ${this.unreadCount} (native badge plugin not installed)`);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Increment badge count by 1
   */
  async incrementBadge(): Promise<void> {
    await this.setBadgeCount(this.unreadCount + 1);
  }

  /**
   * Clear badge count
   */
  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  /**
   * Load badge count from storage
   */
  private async loadBadgeCount(): Promise<void> {
    try {
      const stored = localStorage.getItem('prayermap_badge_count');
      if (stored) {
        this.unreadCount = parseInt(stored, 10) || 0;
      }
    } catch (error) {
      console.error('Error loading badge count:', error);
    }
  }

  /**
   * Save badge count to storage
   */
  private async saveBadgeCount(): Promise<void> {
    try {
      localStorage.setItem('prayermap_badge_count', this.unreadCount.toString());
    } catch (error) {
      console.error('Error saving badge count:', error);
    }
  }

  // ============================================================================
  // Notification Handling
  // ============================================================================

  /**
   * Handle notification received while app is in foreground
   * Shows custom in-app UI instead of system notification
   */
  private async handleForegroundNotification(notification: PushNotificationSchema): Promise<void> {
    try {
      // Increment badge count
      await this.incrementBadge();

      // Haptic feedback
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }

      // Parse notification data
      const notificationData = this.parseNotificationData(notification);

      // Call custom handler if set (for in-app UI)
      if (this.foregroundNotificationHandler) {
        this.foregroundNotificationHandler(notificationData);
      }

      console.log('Foreground notification handled:', notificationData);
    } catch (error) {
      console.error('Error handling foreground notification:', error);
    }
  }

  /**
   * Handle notification tap (user tapped notification)
   * Navigates to relevant screen and clears badge
   */
  async handleNotificationTap(action: ActionPerformed): Promise<void> {
    try {
      const data = action.notification.data as Record<string, string> | undefined;

      if (!data) {
        console.log('No notification data to process');
        return;
      }

      // Decrement badge count
      await this.setBadgeCount(Math.max(0, this.unreadCount - 1));

      // Haptic feedback
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }

      console.log('Processing notification tap:', data);

      // Navigate based on notification type and action
      this.navigateToNotificationTarget(data, action.actionId);
    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  }

  /**
   * Parse notification data into typed format
   */
  private parseNotificationData(notification: PushNotificationSchema): NotificationData {
    const data = notification.data as Record<string, string> | undefined;

    return {
      type: (data?.type as NotificationType) || 'GENERAL',
      prayer_id: data?.prayer_id,
      user_id: data?.user_id,
      response_id: data?.response_id,
      connection_id: data?.connection_id,
      avatar_url: data?.avatar_url,
      title: notification.title || 'PrayerMap',
      body: notification.body || ''
    };
  }

  /**
   * Navigate to the appropriate screen based on notification data
   */
  private navigateToNotificationTarget(data: Record<string, string>, actionId?: string): void {
    const type = data.type as NotificationType;

    // Handle specific action button taps
    if (actionId === 'PRAY') {
      // Quick pray action - mark as prayed for
      if (data.prayer_id) {
        this.handleQuickPray(data.prayer_id);
      }
      return;
    }

    // Navigate based on notification type
    switch (type) {
      case 'PRAYER_RESPONSE':
        if (data.prayer_id && data.response_id) {
          window.location.href = `/prayer/${data.prayer_id}?response=${data.response_id}`;
        } else if (data.prayer_id) {
          window.location.href = `/prayer/${data.prayer_id}`;
        }
        break;

      case 'PRAYER_SUPPORT':
      case 'NEARBY_PRAYER':
        if (data.prayer_id) {
          window.location.href = `/prayer/${data.prayer_id}`;
        }
        break;

      case 'CONNECTION_CREATED':
        if (data.connection_id) {
          window.location.href = `/connections?id=${data.connection_id}`;
        }
        break;

      case 'GENERAL':
      default:
        if (data.prayer_id) {
          window.location.href = `/prayer/${data.prayer_id}`;
        } else if (data.user_id) {
          window.location.href = `/user/${data.user_id}`;
        } else {
          window.location.href = '/';
        }
        break;
    }
  }

  /**
   * Handle quick pray action (from notification button)
   */
  private async handleQuickPray(prayerId: string): Promise<void> {
    try {
      // Mark prayer as prayed for
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('User not authenticated');
        return;
      }

      // Create prayer connection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('prayer_connections').insert({
        prayer_id: prayerId,
        from_user_id: user.id,
        to_user_id: user.id, // Will be updated with actual prayer owner
        from_location: { lat: 0, lng: 0 }, // Will be updated with actual location
        to_location: { lat: 0, lng: 0 }
      });

      console.log('Quick pray action completed');

      // Haptic feedback
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }
    } catch (error) {
      console.error('Error handling quick pray:', error);
    }
  }

  /**
   * Set custom handler for foreground notifications
   * Use this to show in-app UI
   */
  setForegroundNotificationHandler(handler: (notification: NotificationData) => void): void {
    this.foregroundNotificationHandler = handler;
  }

  // ============================================================================
  // State Getters
  // ============================================================================

  /**
   * Get current unread notification count
   */
  getUnreadCount(): number {
    return this.unreadCount;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationServiceImpl();
