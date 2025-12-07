import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_NOTIFICATION_ID = 1;
const STORAGE_KEY = 'prayermap-reminder-time';

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM format
}

/**
 * Get current reminder settings from localStorage
 */
export async function getReminderSettings(): Promise<ReminderSettings> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return { enabled: false, time: '09:00' };
}

/**
 * Set reminder settings and schedule/cancel notifications accordingly
 */
export async function setReminderSettings(settings: ReminderSettings): Promise<boolean> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

  if (!Capacitor.isNativePlatform()) {
    console.log('Reminders only work on native platforms');
    return true;
  }

  try {
    // Cancel existing reminder
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIFICATION_ID }] });

    if (!settings.enabled) {
      return true;
    }

    // Request permission
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Parse time
    const [hours, minutes] = settings.time.split(':').map(Number);

    // Schedule daily reminder
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REMINDER_NOTIFICATION_ID,
          title: '🙏 Time to Pray',
          body: 'Take a moment to pray for those in need',
          schedule: {
            on: {
              hour: hours,
              minute: minutes,
            },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: 'default',
          smallIcon: 'ic_stat_icon',
          actionTypeId: 'OPEN_APP',
        },
      ],
    });

    return true;
  } catch (error) {
    console.error('Failed to set reminder:', error);
    return false;
  }
}

/**
 * Check if local notifications are supported on this platform
 */
export function isReminderSupported(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Initialize notification listeners for handling taps
 */
export async function initializeReminderListeners(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Listen for notification taps
  await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    console.log('Reminder notification tapped:', notification);
    // Could navigate to saved prayers or specific screen here
  });
}

/**
 * Remove notification listeners (cleanup)
 */
export async function removeReminderListeners(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await LocalNotifications.removeAllListeners();
}

