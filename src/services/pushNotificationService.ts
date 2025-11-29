/**
 * Push Notification Service for PrayerMap
 *
 * Handles FCM registration, token management, and notification handling
 * for Android (via Firebase Cloud Messaging) and iOS (via APNs).
 *
 * @module pushNotificationService
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

export interface PushNotificationService {
  initialize(): Promise<void>;
  requestPermissions(): Promise<boolean>;
  registerDevice(token: string): Promise<void>;
  unregisterDevice(): Promise<void>;
}

class PushNotificationServiceImpl implements PushNotificationService {
  private isInitialized = false;

  /**
   * Initialize push notifications
   * Should be called once when the app starts
   */
  async initialize(): Promise<void> {
    // Only initialize on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications are only available on native platforms');
      return;
    }

    if (this.isInitialized) {
      console.log('Push notifications already initialized');
      return;
    }

    try {
      // Request permissions first
      const hasPermission = await this.requestPermissions();

      if (!hasPermission) {
        console.log('Push notification permissions denied');
        return;
      }

      // Register with FCM/APNs
      await PushNotifications.register();

      // Listen for registration success
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        await this.registerDevice(token.value);
      });

      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error: unknown) => {
        console.error('Push registration error:', error);
      });

      // Listen for push notifications received while app is in foreground
      await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('Push notification received:', notification);
          // Handle foreground notification
          // Could show a custom UI toast or in-app notification
        }
      );

      // Listen for push notification actions (when user taps notification)
      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: ActionPerformed) => {
          console.log('Push notification action performed:', notification);
          // Navigate to relevant screen based on notification data
          this.handleNotificationAction(notification);
        }
      );

      this.isInitialized = true;
      console.log('Push notifications initialized successfully');
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      throw error;
    }
  }

  /**
   * Request push notification permissions
   * Required for Android 13+ and iOS
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'granted') {
        return true;
      }

      // Request permissions (required for Android 13+)
      const requestResult = await PushNotifications.requestPermissions();

      return requestResult.receive === 'granted';
    } catch (error) {
      console.error('Error requesting push notification permissions:', error);
      return false;
    }
  }

  /**
   * Register the device token with our backend
   * Stores the FCM/APNs token in Supabase for sending notifications
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

      // Store FCM/APNs token in Supabase
      // Note: You'll need to create the user_push_tokens table (see migration)
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          token: token,
          platform: platform,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
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

      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Error registering device:', error);
      // Don't throw - we don't want to break the app if push registration fails
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

      const platform = Capacitor.getPlatform();

      // Remove push token from database
      await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', platform);

      // Remove all listeners
      await PushNotifications.removeAllListeners();

      this.isInitialized = false;
      console.log('Device unregistered successfully');
    } catch (error) {
      console.error('Error unregistering device:', error);
    }
  }

  /**
   * Handle notification tap actions
   * Navigate to the relevant screen based on notification data
   */
  private handleNotificationAction(notification: ActionPerformed): void {
    const data = notification.notification.data as Record<string, string> | undefined;

    if (!data) {
      console.log('No notification data to process');
      return;
    }

    console.log('Processing notification data:', data);

    // Navigate based on notification type
    if (data.prayer_id) {
      // Navigate to prayer detail
      // This integrates with the deep link handler
      window.location.href = `/prayer/${data.prayer_id}`;
    } else if (data.user_id) {
      // Navigate to user profile
      window.location.href = `/user/${data.user_id}`;
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationServiceImpl();
