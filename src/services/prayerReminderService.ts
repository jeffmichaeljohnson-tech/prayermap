/**
 * Prayer Reminder Service for PrayerMap
 *
 * Schedules daily local notifications to remind users to pray.
 * Uses Capacitor Local Notifications plugin for native platforms.
 *
 * Features:
 * - Daily reminders at user-specified time
 * - Custom days of week selection
 * - Rotating default messages
 * - Timezone-aware scheduling
 * - Persistent settings (localStorage + database)
 * - Permission handling (Android 13+)
 * - Web fallback messaging
 *
 * @module prayerReminderService
 */

import {
  LocalNotifications,
  ScheduleOptions,
  LocalNotificationSchema,
  PendingResult,
  PermissionStatus
} from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ReminderConfig {
  enabled: boolean;
  time: string; // "HH:mm" format (24-hour)
  daysOfWeek: number[]; // 0-6, Sunday-Saturday
  message: string; // Customizable message
  useRotatingMessages: boolean; // Use default rotating messages
}

export interface ReminderPermissionState {
  status: 'granted' | 'denied' | 'prompt';
  canRequest: boolean;
  exactAlarmEnabled?: boolean; // Android 12+ only
}

// ============================================================================
// Constants
// ============================================================================

const REMINDER_CHANNEL_ID = 'prayer-reminders';
const REMINDER_NOTIFICATION_ID = 1000; // Base ID for reminders
const STORAGE_KEY = 'prayermap:reminder-config';

/**
 * Default rotating messages shown in notifications
 * Cycles through these messages each day
 */
const DEFAULT_MESSAGES = [
  'Take a moment to pray for those in need 🙏',
  'Someone nearby may need your prayers today',
  'Start your day with prayer',
  'Remember to check in on your prayer community',
  'Your prayers can make a difference today',
  'Lift up those in need with your prayers',
  'A moment of prayer can change someone\'s day',
  'See where prayer is needed today'
];

/**
 * Default reminder configuration
 */
const DEFAULT_CONFIG: ReminderConfig = {
  enabled: false,
  time: '09:00',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
  message: DEFAULT_MESSAGES[0],
  useRotatingMessages: true
};

// ============================================================================
// Service Implementation
// ============================================================================

class PrayerReminderServiceImpl {
  private isInitialized = false;

  /**
   * Initialize the reminder service
   * Sets up notification channel on Android
   */
  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Prayer reminders are only available on native platforms');
      return;
    }

    if (this.isInitialized) {
      return;
    }

    try {
      // Create notification channel for Android
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: REMINDER_CHANNEL_ID,
          name: 'Prayer Reminders',
          description: 'Daily reminders to pray for those in need',
          importance: 4, // High importance
          visibility: 1, // Public
          sound: 'notification.wav', // Optional: custom sound
          vibration: true
        });
      }

      // Load saved config and reschedule if enabled
      const config = await this.getConfig();
      if (config.enabled) {
        await this.scheduleReminders(config);
      }

      this.isInitialized = true;
      console.log('Prayer reminder service initialized');
    } catch (error) {
      console.error('Error initializing prayer reminder service:', error);
    }
  }

  /**
   * Check if reminders are supported on this platform
   */
  isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check permission status for local notifications
   */
  async checkPermissions(): Promise<ReminderPermissionState> {
    if (!this.isSupported()) {
      return {
        status: 'denied',
        canRequest: false
      };
    }

    try {
      const result: PermissionStatus = await LocalNotifications.checkPermissions();

      const state: ReminderPermissionState = {
        status: result.display as 'granted' | 'denied' | 'prompt',
        canRequest: result.display !== 'granted'
      };

      // Check exact alarm setting on Android 12+
      if (Capacitor.getPlatform() === 'android') {
        try {
          const exactAlarmResult = await LocalNotifications.checkExactNotificationSetting();
          state.exactAlarmEnabled = exactAlarmResult.exact_alarm;
        } catch (error) {
          console.debug('Exact alarm check not available:', error);
        }
      }

      return state;
    } catch (error) {
      console.error('Error checking reminder permissions:', error);
      return {
        status: 'denied',
        canRequest: false
      };
    }
  }

  /**
   * Request permission to display local notifications
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const result: PermissionStatus = await LocalNotifications.requestPermissions();

      // On Android 12+, also check exact alarm permission
      if (Capacitor.getPlatform() === 'android') {
        try {
          const exactAlarmResult = await LocalNotifications.checkExactNotificationSetting();
          if (!exactAlarmResult.exact_alarm) {
            // Direct user to settings to enable exact alarms
            console.log('Exact alarms not enabled. User should enable in settings.');
            // Note: You may want to show a dialog here explaining why exact alarms are needed
          }
        } catch (error) {
          console.debug('Exact alarm request not available:', error);
        }
      }

      return result.display === 'granted';
    } catch (error) {
      console.error('Error requesting reminder permissions:', error);
      return false;
    }
  }

  /**
   * Open system settings for exact alarm configuration (Android 12+)
   */
  async openExactAlarmSettings(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      await LocalNotifications.changeExactNotificationSetting();
    } catch (error) {
      console.error('Error opening exact alarm settings:', error);
    }
  }

  /**
   * Get current reminder configuration
   */
  async getConfig(): Promise<ReminderConfig> {
    try {
      // Try to load from localStorage first (faster)
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }

      // Fallback to database if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('reminder_config')
          .eq('user_id', user.id)
          .single();

        if (!error && data?.reminder_config) {
          return data.reminder_config;
        }
      }

      // Return default config if nothing saved
      return DEFAULT_CONFIG;
    } catch (error) {
      console.error('Error loading reminder config:', error);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Save reminder configuration
   */
  async saveConfig(config: ReminderConfig): Promise<void> {
    try {
      // Save to localStorage (instant, works offline)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Also save to database if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            reminder_config: config,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      }

      console.log('Reminder config saved:', config);
    } catch (error) {
      console.error('Error saving reminder config:', error);
      throw error;
    }
  }

  /**
   * Enable reminders with the specified configuration
   */
  async enableReminders(config: Partial<ReminderConfig> = {}): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Reminders are not supported on this platform');
    }

    try {
      // Check and request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Reminder permissions denied');
        return false;
      }

      // Merge with current config
      const currentConfig = await this.getConfig();
      const newConfig: ReminderConfig = {
        ...currentConfig,
        ...config,
        enabled: true
      };

      // Schedule the reminders
      await this.scheduleReminders(newConfig);

      // Save configuration
      await this.saveConfig(newConfig);

      console.log('Reminders enabled:', newConfig);
      return true;
    } catch (error) {
      console.error('Error enabling reminders:', error);
      throw error;
    }
  }

  /**
   * Disable all reminders
   */
  async disableReminders(): Promise<void> {
    try {
      // Cancel all scheduled reminders
      await this.cancelAllReminders();

      // Update config
      const config = await this.getConfig();
      config.enabled = false;
      await this.saveConfig(config);

      console.log('Reminders disabled');
    } catch (error) {
      console.error('Error disabling reminders:', error);
      throw error;
    }
  }

  /**
   * Update reminder configuration
   */
  async updateConfig(updates: Partial<ReminderConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const newConfig: ReminderConfig = {
        ...currentConfig,
        ...updates
      };

      // If enabled, reschedule with new config
      if (newConfig.enabled) {
        await this.scheduleReminders(newConfig);
      }

      await this.saveConfig(newConfig);
      console.log('Reminder config updated:', newConfig);
    } catch (error) {
      console.error('Error updating reminder config:', error);
      throw error;
    }
  }

  /**
   * Schedule daily reminders based on configuration
   */
  private async scheduleReminders(config: ReminderConfig): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      // Cancel existing reminders first
      await this.cancelAllReminders();

      const [hours, minutes] = config.time.split(':').map(Number);

      // Create a notification for each selected day of week
      const notifications: LocalNotificationSchema[] = config.daysOfWeek.map((dayOfWeek, index) => {
        // Calculate next occurrence of this day
        const schedule = this.getNextScheduleDate(dayOfWeek, hours, minutes);

        // Get message (rotating or custom)
        const message = config.useRotatingMessages
          ? DEFAULT_MESSAGES[index % DEFAULT_MESSAGES.length]
          : config.message;

        return {
          id: REMINDER_NOTIFICATION_ID + dayOfWeek, // Unique ID per day
          title: 'Time to Pray',
          body: message,
          schedule: {
            at: schedule,
            repeats: true,
            every: 'week',
            allowWhileIdle: true // Fire even in Doze mode (Android)
          },
          channelId: REMINDER_CHANNEL_ID,
          sound: 'notification.wav',
          smallIcon: 'ic_stat_prayer', // Ensure this exists in Android resources
          actionTypeId: 'OPEN_PRAYER_MAP'
        };
      });

      // Schedule all notifications
      const scheduleOptions: ScheduleOptions = {
        notifications
      };

      await LocalNotifications.schedule(scheduleOptions);

      console.log(`Scheduled ${notifications.length} prayer reminders`);
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      throw error;
    }
  }

  /**
   * Calculate the next occurrence of a specific day/time
   */
  private getNextScheduleDate(dayOfWeek: number, hours: number, minutes: number): Date {
    const now = new Date();
    const schedule = new Date();

    schedule.setHours(hours);
    schedule.setMinutes(minutes);
    schedule.setSeconds(0);
    schedule.setMilliseconds(0);

    // Calculate days until target day of week
    const currentDay = now.getDay();
    let daysUntilTarget = dayOfWeek - currentDay;

    // If target day is today but time has passed, schedule for next week
    if (daysUntilTarget === 0 && now > schedule) {
      daysUntilTarget = 7;
    }

    // If target day is in the past this week, schedule for next week
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }

    schedule.setDate(now.getDate() + daysUntilTarget);

    return schedule;
  }

  /**
   * Cancel all scheduled reminders
   */
  private async cancelAllReminders(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      // Get all pending notifications
      const pending: PendingResult = await LocalNotifications.getPending();

      // Filter to only our reminder notifications (IDs 1000-1006)
      const reminderIds = pending.notifications
        .filter(n => n.id >= REMINDER_NOTIFICATION_ID && n.id < REMINDER_NOTIFICATION_ID + 7)
        .map(n => ({ id: n.id }));

      if (reminderIds.length > 0) {
        await LocalNotifications.cancel({ notifications: reminderIds });
        console.log(`Cancelled ${reminderIds.length} prayer reminders`);
      }
    } catch (error) {
      console.error('Error cancelling reminders:', error);
    }
  }

  /**
   * Get list of currently scheduled reminders
   */
  async getScheduledReminders(): Promise<LocalNotificationSchema[]> {
    if (!this.isSupported()) {
      return [];
    }

    try {
      const pending: PendingResult = await LocalNotifications.getPending();

      return pending.notifications.filter(
        n => n.id >= REMINDER_NOTIFICATION_ID && n.id < REMINDER_NOTIFICATION_ID + 7
      );
    } catch (error) {
      console.error('Error getting scheduled reminders:', error);
      return [];
    }
  }

  /**
   * Get the next scheduled reminder time
   */
  async getNextReminderTime(): Promise<Date | null> {
    const reminders = await this.getScheduledReminders();

    if (reminders.length === 0) {
      return null;
    }

    // Find the earliest scheduled time
    const times = reminders
      .map(r => r.schedule?.at)
      .filter((date): date is Date => date instanceof Date);

    if (times.length === 0) {
      return null;
    }

    return new Date(Math.min(...times.map(d => d.getTime())));
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const prayerReminderService = new PrayerReminderServiceImpl();

/**
 * MEMORY LOG:
 * Topic: Prayer Reminder Service Implementation
 * Context: Users need daily reminders to pray
 * Decision: Use Capacitor Local Notifications for native scheduling
 * Key Features:
 *   - Daily reminders at custom time
 *   - Day of week selection
 *   - Rotating default messages
 *   - Timezone-aware scheduling
 *   - Persists to localStorage + database
 *   - Handles Android 12+ exact alarm permissions
 *   - Web fallback (not supported message)
 * Mobile Notes:
 *   - Android 13+ requires permission check
 *   - Android 12+ needs SCHEDULE_EXACT_ALARM permission for exact timing
 *   - iOS requires notification permissions
 *   - Uses allowWhileIdle for Doze mode compatibility
 * Performance: Lightweight, only active on native platforms
 * Date: 2025-11-30
 */
