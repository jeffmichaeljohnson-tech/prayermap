/**
 * usePrayerReminders Hook
 *
 * React hook for managing prayer reminder notifications
 *
 * Provides methods to:
 * - Check if reminders are supported
 * - Get/update reminder configuration
 * - Enable/disable reminders
 * - Check permissions
 * - View next scheduled reminder
 *
 * Usage:
 * ```tsx
 * const reminders = usePrayerReminders();
 *
 * // Check support
 * if (!reminders.isSupported) {
 *   return <div>Reminders only available on mobile</div>;
 * }
 *
 * // Enable reminders
 * await reminders.enable({ time: '09:00', daysOfWeek: [1, 2, 3, 4, 5] });
 *
 * // Update configuration
 * await reminders.updateConfig({ message: 'Custom reminder message' });
 *
 * // Disable reminders
 * await reminders.disable();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import {
  prayerReminderService,
  ReminderConfig,
  ReminderPermissionState
} from '@/services/prayerReminderService';

export interface UsePrayerRemindersReturn {
  // State
  config: ReminderConfig | null;
  isSupported: boolean;
  isLoading: boolean;
  permissionState: ReminderPermissionState | null;
  nextReminderTime: Date | null;

  // Actions
  enable: (config?: Partial<ReminderConfig>) => Promise<boolean>;
  disable: () => Promise<void>;
  updateConfig: (updates: Partial<ReminderConfig>) => Promise<void>;
  checkPermissions: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  openExactAlarmSettings: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePrayerReminders(): UsePrayerRemindersReturn {
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<ReminderPermissionState | null>(null);
  const [nextReminderTime, setNextReminderTime] = useState<Date | null>(null);

  const isSupported = prayerReminderService.isSupported();

  /**
   * Load current configuration and permission state
   */
  const loadData = useCallback(async () => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load configuration
      const currentConfig = await prayerReminderService.getConfig();
      setConfig(currentConfig);

      // Check permissions
      const permissions = await prayerReminderService.checkPermissions();
      setPermissionState(permissions);

      // Get next reminder time if enabled
      if (currentConfig.enabled) {
        const nextTime = await prayerReminderService.getNextReminderTime();
        setNextReminderTime(nextTime);
      } else {
        setNextReminderTime(null);
      }
    } catch (error) {
      console.error('Error loading prayer reminder data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const init = async () => {
      if (!isSupported) {
        setIsLoading(false);
        return;
      }

      try {
        await prayerReminderService.initialize();
        await loadData();
      } catch (error) {
        console.error('Error initializing prayer reminders:', error);
        setIsLoading(false);
      }
    };

    init();
  }, [isSupported, loadData]);

  /**
   * Enable reminders with optional configuration
   */
  const enable = useCallback(async (updates?: Partial<ReminderConfig>): Promise<boolean> => {
    if (!isSupported) {
      throw new Error('Reminders are not supported on this platform');
    }

    try {
      setIsLoading(true);
      const success = await prayerReminderService.enableReminders(updates);

      if (success) {
        await loadData();
      }

      return success;
    } catch (error) {
      console.error('Error enabling reminders:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, loadData]);

  /**
   * Disable all reminders
   */
  const disable = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    try {
      setIsLoading(true);
      await prayerReminderService.disableReminders();
      await loadData();
    } catch (error) {
      console.error('Error disabling reminders:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, loadData]);

  /**
   * Update reminder configuration
   */
  const updateConfig = useCallback(async (updates: Partial<ReminderConfig>) => {
    if (!isSupported) {
      return;
    }

    try {
      setIsLoading(true);
      await prayerReminderService.updateConfig(updates);
      await loadData();
    } catch (error) {
      console.error('Error updating reminder config:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, loadData]);

  /**
   * Check permission state
   */
  const checkPermissions = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    try {
      const permissions = await prayerReminderService.checkPermissions();
      setPermissionState(permissions);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  }, [isSupported]);

  /**
   * Request notification permissions
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const granted = await prayerReminderService.requestPermissions();
      await checkPermissions();
      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }, [isSupported, checkPermissions]);

  /**
   * Open exact alarm settings (Android 12+ only)
   */
  const openExactAlarmSettings = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    try {
      await prayerReminderService.openExactAlarmSettings();
    } catch (error) {
      console.error('Error opening exact alarm settings:', error);
    }
  }, [isSupported]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    // State
    config,
    isSupported,
    isLoading,
    permissionState,
    nextReminderTime,

    // Actions
    enable,
    disable,
    updateConfig,
    checkPermissions,
    requestPermissions,
    openExactAlarmSettings,
    refresh
  };
}
