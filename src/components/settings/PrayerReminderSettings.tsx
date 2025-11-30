/**
 * Prayer Reminder Settings UI
 *
 * Allows users to configure daily prayer reminder notifications including:
 * - Master toggle for reminders
 * - Time picker for reminder time
 * - Days of week selection (pill buttons)
 * - Custom message input
 * - Preview of next reminder
 * - Permission status indicator
 *
 * Design: Glassmorphic cards with smooth animations
 * Performance: Optimistic updates for instant feedback
 * Mobile: Native local notification integration with Capacitor
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Clock,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
  Info,
} from 'lucide-react';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { usePrayerReminders } from '@/hooks/usePrayerReminders';
import { toast } from 'sonner';

interface PrayerReminderSettingsProps {
  /** Optional callback when settings are updated */
  onUpdate?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
];

export function PrayerReminderSettings({ onUpdate }: PrayerReminderSettingsProps) {
  const {
    config,
    isSupported,
    isLoading,
    permissionState,
    nextReminderTime,
    enable,
    disable,
    updateConfig,
    requestPermissions,
    openExactAlarmSettings,
    refresh,
  } = usePrayerReminders();

  // Local state for inputs (for instant feedback before save)
  const [localTime, setLocalTime] = useState(config?.time || '09:00');
  const [localDaysOfWeek, setLocalDaysOfWeek] = useState<number[]>(
    config?.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]
  );
  const [localMessage, setLocalMessage] = useState(config?.message || '');
  const [useRotating, setUseRotating] = useState(config?.useRotatingMessages ?? true);

  // Sync local state when config changes
  useEffect(() => {
    if (config) {
      setLocalTime(config.time);
      setLocalDaysOfWeek(config.daysOfWeek);
      setLocalMessage(config.message);
      setUseRotating(config.useRotatingMessages);
    }
  }, [config]);

  // Show not supported message on web
  if (!isSupported) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              Not Available on Web
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Prayer reminders are only available on the mobile app. Download
              PrayerMap for iOS or Android to receive daily prayer reminders.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const handleEnableReminders = async () => {
    try {
      const success = await enable({
        time: localTime,
        daysOfWeek: localDaysOfWeek,
        message: localMessage,
        useRotatingMessages: useRotating,
      });

      if (success) {
        toast.success('Prayer reminders enabled!');
        onUpdate?.();
      } else {
        toast.error('Permission denied. Please enable notifications in settings.');
      }
    } catch (error) {
      console.error('Error enabling reminders:', error);
      toast.error('Failed to enable reminders');
    }
  };

  const handleDisableReminders = async () => {
    try {
      await disable();
      toast.success('Prayer reminders disabled');
      onUpdate?.();
    } catch (error) {
      console.error('Error disabling reminders:', error);
      toast.error('Failed to disable reminders');
    }
  };

  const handleUpdateTime = async (newTime: string) => {
    setLocalTime(newTime);
    if (config?.enabled) {
      try {
        await updateConfig({ time: newTime });
        toast.success('Reminder time updated');
        onUpdate?.();
      } catch (error) {
        console.error('Error updating time:', error);
        toast.error('Failed to update time');
      }
    }
  };

  const handleToggleDay = (day: number) => {
    const newDays = localDaysOfWeek.includes(day)
      ? localDaysOfWeek.filter((d) => d !== day)
      : [...localDaysOfWeek, day].sort();

    // Prevent removing all days
    if (newDays.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    setLocalDaysOfWeek(newDays);

    if (config?.enabled) {
      updateConfig({ daysOfWeek: newDays })
        .then(() => {
          toast.success('Reminder days updated');
          onUpdate?.();
        })
        .catch((error) => {
          console.error('Error updating days:', error);
          toast.error('Failed to update days');
        });
    }
  };

  const handleUpdateMessage = async () => {
    if (config?.enabled) {
      try {
        await updateConfig({
          message: localMessage,
          useRotatingMessages: useRotating,
        });
        toast.success('Reminder message updated');
        onUpdate?.();
      } catch (error) {
        console.error('Error updating message:', error);
        toast.error('Failed to update message');
      }
    }
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermissions();
      if (granted) {
        toast.success('Notifications enabled!');
      } else {
        toast.error('Permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request permission');
    }
  };

  const formatNextReminderTime = (date: Date | null): string => {
    if (!date) return 'Not scheduled';

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const dayString = date.toLocaleDateString('en-US', { weekday: 'long' });

    if (isToday) {
      return `Today at ${timeString}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${timeString}`;
    } else {
      return `${dayString} at ${timeString}`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading reminder settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Status Banner */}
      {permissionState && permissionState.status !== 'granted' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                Enable Notifications
              </p>
              <p className="text-xs text-gray-600">
                Grant permission to receive daily prayer reminders
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleRequestPermission}
              className="bg-gradient-to-r from-purple-400 to-amber-300"
            >
              Enable
            </Button>
          </div>
        </motion.div>
      )}

      {/* Android 12+ Exact Alarm Notice */}
      {permissionState?.exactAlarmEnabled === false && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                Enable Exact Alarms
              </p>
              <p className="text-xs text-gray-600">
                For precise reminder timing on Android 12+
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={openExactAlarmSettings}
              className="glass"
            >
              <SettingsIcon className="w-4 h-4 mr-1" />
              Settings
            </Button>
          </div>
        </motion.div>
      )}

      {/* Master Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-strong rounded-3xl p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 glass rounded-xl">
              {config?.enabled ? (
                <Bell className="w-6 h-6 text-gray-700" />
              ) : (
                <BellOff className="w-6 h-6 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="text-gray-800 font-medium">Prayer Reminders</h3>
              <p className="text-sm text-gray-600">
                {config?.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <Switch
            checked={config?.enabled || false}
            onCheckedChange={(checked) =>
              checked ? handleEnableReminders() : handleDisableReminders()
            }
            disabled={isLoading}
          />
        </div>
      </motion.div>

      {/* Next Reminder Preview */}
      {config?.enabled && nextReminderTime && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Next Reminder</p>
              <p className="text-xs text-gray-600">
                {formatNextReminderTime(nextReminderTime)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Time Picker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-strong rounded-3xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="text-gray-800 font-medium">Reminder Time</h3>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-2">
            Choose a time for your daily reminder
          </label>
          <Input
            type="time"
            value={localTime}
            onChange={(e) => handleUpdateTime(e.target.value)}
            className="glass border-white/30 text-gray-800 text-lg"
            disabled={!config?.enabled || isLoading}
          />
        </div>
      </motion.div>

      {/* Days of Week Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-strong rounded-3xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-gray-800 font-medium">Reminder Days</h3>
        </div>

        <p className="text-xs text-gray-600">
          Select the days you want to receive reminders
        </p>

        <div className="flex gap-2 flex-wrap">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = localDaysOfWeek.includes(day.value);
            return (
              <motion.button
                key={day.value}
                onClick={() => handleToggleDay(day.value)}
                disabled={!config?.enabled || isLoading}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-400 to-amber-300 text-white shadow-md'
                      : 'glass border border-white/30 text-gray-700 hover:bg-white/40'
                  }
                  ${!config?.enabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                whileTap={{ scale: 0.95 }}
                title={day.fullLabel}
              >
                {day.label}
              </motion.button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 italic">
          {localDaysOfWeek.length === 7
            ? 'Reminders enabled every day'
            : `Reminders enabled ${localDaysOfWeek.length} day${
                localDaysOfWeek.length !== 1 ? 's' : ''
              } per week`}
        </p>
      </motion.div>

      {/* Custom Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-strong rounded-3xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h3 className="text-gray-800 font-medium">Reminder Message</h3>
        </div>

        {/* Toggle between rotating and custom */}
        <div className="flex items-center justify-between glass rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">
              Use rotating messages
            </span>
          </div>
          <Switch
            checked={useRotating}
            onCheckedChange={(checked) => {
              setUseRotating(checked);
              if (config?.enabled) {
                updateConfig({ useRotatingMessages: checked })
                  .then(() => {
                    toast.success('Message preference updated');
                    onUpdate?.();
                  })
                  .catch((error) => {
                    console.error('Error updating message preference:', error);
                    toast.error('Failed to update preference');
                  });
              }
            }}
            disabled={!config?.enabled || isLoading}
          />
        </div>

        <AnimatePresence mode="wait">
          {useRotating ? (
            <motion.div
              key="rotating"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass rounded-2xl p-4"
            >
              <p className="text-xs text-gray-600">
                Your reminder will cycle through inspiring default messages each
                day, keeping your prayer practice fresh and engaging.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="custom"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <label className="block text-xs text-gray-600">
                Write your own reminder message
              </label>
              <Textarea
                value={localMessage}
                onChange={(e) => setLocalMessage(e.target.value)}
                onBlur={handleUpdateMessage}
                placeholder="e.g., Time to pray for those in need..."
                className="glass border-white/30 text-gray-800 min-h-[80px] resize-none"
                disabled={!config?.enabled || isLoading}
                maxLength={100}
              />
              <p className="text-xs text-gray-500 text-right">
                {localMessage.length}/100
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Info Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-2xl p-4"
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600">
            Prayer reminders are scheduled locally on your device and will
            appear even when you're offline. Changes take effect immediately.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
