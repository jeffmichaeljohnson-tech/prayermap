import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type Token,
} from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

class PushNotificationService {
  private initialized = false;

  async initialize(userId: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only available on native platforms');
      return false;
    }

    if (this.initialized) return true;

    try {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();

      if (permResult.receive !== 'granted') {
        console.log('Push notification permission denied');
        return false;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Handle registration success
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        await this.saveTokenToDatabase(userId, token.value);
      });

      // Handle registration error
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      // Handle incoming notifications when app is in foreground
      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification) => {
          console.log('Push notification received:', notification);
          // Could show in-app toast here
        }
      );

      // Handle notification tap (app opened from notification)
      PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification) => {
          console.log('Push notification action performed:', notification);
          // Could navigate to inbox here
        }
      );

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  private async saveTokenToDatabase(
    userId: string,
    token: string
  ): Promise<void> {
    if (!supabase) return;

    try {
      // Upsert the device token
      const { error } = await supabase.from('user_push_tokens').upsert(
        {
          user_id: userId,
          token: token,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      );

      if (error) {
        console.error('Failed to save push token:', error);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  async removeToken(userId: string): Promise<void> {
    if (!supabase || !Capacitor.isNativePlatform()) return;

    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to remove push token:', error);
      }

      // Reset initialization state so user can re-enable later
      this.initialized = false;
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }

  isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const pushNotificationService = new PushNotificationService();

