/**
 * Notification Preferences Settings UI
 *
 * Allows users to configure push notification preferences including:
 * - Master toggle for all notifications
 * - Individual notification type toggles
 * - Nearby prayer radius slider
 * - Quiet hours with time pickers
 * - Sound and vibration toggles
 * - Permission status indicator
 *
 * Design: Glassmorphic cards with smooth animations
 * Performance: Optimistic updates for instant feedback
 * Mobile: Native permission integration with Capacitor
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  MessageSquare,
  Heart,
  MapPin,
  Clock,
  Volume2,
  Vibrate,
  Moon,
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  useNotificationPreferences,
  type NotificationPreferences,
} from '@/hooks/useNotificationPreferences';
import { pushNotificationService } from '@/services/pushNotificationService';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface NotificationPreferencesProps {
  /** Optional callback when preferences are updated */
  onUpdate?: (preferences: NotificationPreferences) => void;
}

export function NotificationPreferencesComponent({
  onUpdate,
}: NotificationPreferencesProps) {
  const { preferences, updatePreferences, isUpdating, isLoading } =
    useNotificationPreferences();

  // Permission state
  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'prompt' | 'unknown'
  >('unknown');
  const [isNative, setIsNative] = useState(false);

  // Local state for inputs
  const [quietStartTime, setQuietStartTime] = useState(
    preferences.quietHours.startTime
  );
  const [quietEndTime, setQuietEndTime] = useState(
    preferences.quietHours.endTime
  );

  // Check if running on native platform
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  // Check permission status on mount
  useEffect(() => {
    if (isNative) {
      checkPermissionStatus();
    }
  }, [isNative]);

  // Sync local time state with preferences
  useEffect(() => {
    setQuietStartTime(preferences.quietHours.startTime);
    setQuietEndTime(preferences.quietHours.endTime);
  }, [preferences.quietHours]);

  const checkPermissionStatus = async () => {
    try {
      const status = await pushNotificationService.checkPermissions();
      setPermissionStatus(status.status);
    } catch (error) {
      console.error('Error checking permission status:', error);
      setPermissionStatus('unknown');
    }
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await pushNotificationService.requestPermissions();
      if (granted) {
        setPermissionStatus('granted');
        toast.success('Notifications enabled!');
      } else {
        setPermissionStatus('denied');
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request permission');
    }
  };

  const handleOpenSettings = async () => {
    try {
      await pushNotificationService.openSettings();
    } catch (error) {
      console.error('Error opening settings:', error);
      toast.error('Failed to open settings');
    }
  };

  const handleToggle = (
    key: keyof NotificationPreferences,
    value: boolean | number | object
  ) => {
    const updates = { [key]: value };
    updatePreferences(updates);
    onUpdate?.({ ...preferences, ...updates });

    // Show feedback
    toast.success('Preference updated');
  };

  const handleQuietHoursUpdate = () => {
    const updates = {
      quietHours: {
        ...preferences.quietHours,
        startTime: quietStartTime,
        endTime: quietEndTime,
      },
    };
    updatePreferences(updates);
    onUpdate?.({ ...preferences, ...updates });
    toast.success('Quiet hours updated');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Status Banner */}
      {isNative && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            {permissionStatus === 'granted' ? (
              <>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    Notifications Enabled
                  </p>
                  <p className="text-xs text-gray-600">
                    You will receive push notifications
                  </p>
                </div>
              </>
            ) : permissionStatus === 'denied' ? (
              <>
                <div className="p-2 bg-red-100 rounded-lg">
                  <BellOff className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    Notifications Disabled
                  </p>
                  <p className="text-xs text-gray-600">
                    Enable in system settings
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenSettings}
                  className="glass"
                >
                  <SettingsIcon className="w-4 h-4 mr-1" />
                  Settings
                </Button>
              </>
            ) : permissionStatus === 'prompt' ? (
              <>
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    Enable Notifications
                  </p>
                  <p className="text-xs text-gray-600">
                    Stay updated with prayer responses
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleRequestPermission}
                  className="bg-gradient-to-r from-purple-400 to-amber-300"
                >
                  Enable
                </Button>
              </>
            ) : null}
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
              {preferences.enabled ? (
                <Bell className="w-6 h-6 text-gray-700" />
              ) : (
                <BellOff className="w-6 h-6 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="text-gray-800 font-medium">
                Push Notifications
              </h3>
              <p className="text-sm text-gray-600">
                {preferences.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={(checked) => handleToggle('enabled', checked)}
            disabled={isUpdating}
          />
        </div>
      </motion.div>

      {/* Notification Types */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-strong rounded-3xl p-6 space-y-6"
      >
        <h3 className="text-gray-800 font-medium">Notification Types</h3>

        {/* Prayer Responses */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-800">Prayer Responses</p>
              <p className="text-xs text-gray-600">
                When someone responds to your prayer
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.prayerResponses}
            onCheckedChange={(checked) =>
              handleToggle('prayerResponses', checked)
            }
            disabled={!preferences.enabled || isUpdating}
          />
        </div>

        {/* Prayer Support */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-800">Prayer Support</p>
              <p className="text-xs text-gray-600">
                When someone prays for you
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.prayerSupport}
            onCheckedChange={(checked) =>
              handleToggle('prayerSupport', checked)
            }
            disabled={!preferences.enabled || isUpdating}
          />
        </div>

        {/* Nearby Prayers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-800">Nearby Prayers</p>
                <p className="text-xs text-gray-600">
                  New prayers in your area
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.nearbyPrayers}
              onCheckedChange={(checked) =>
                handleToggle('nearbyPrayers', checked)
              }
              disabled={!preferences.enabled || isUpdating}
            />
          </div>

          {/* Radius Slider */}
          {preferences.nearbyPrayers && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-8 space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Radius</span>
                <span className="font-medium text-gray-800">
                  {preferences.nearbyRadius} miles
                </span>
              </div>
              <Slider
                value={[preferences.nearbyRadius]}
                onValueChange={([value]) =>
                  handleToggle('nearbyRadius', value)
                }
                min={5}
                max={50}
                step={5}
                disabled={!preferences.enabled || isUpdating}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>5 miles</span>
                <span>50 miles</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Prayer Reminders */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-800">Prayer Reminders</p>
              <p className="text-xs text-gray-600">Daily reminder to pray</p>
            </div>
          </div>
          <Switch
            checked={preferences.prayerReminders}
            onCheckedChange={(checked) =>
              handleToggle('prayerReminders', checked)
            }
            disabled={!preferences.enabled || isUpdating}
          />
        </div>
      </motion.div>

      {/* Quiet Hours */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-strong rounded-3xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-gray-600" />
            <div>
              <h3 className="text-gray-800 font-medium">Quiet Hours</h3>
              <p className="text-xs text-gray-600">
                Silence notifications during specific times
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.quietHours.enabled}
            onCheckedChange={(checked) =>
              handleToggle('quietHours', {
                ...preferences.quietHours,
                enabled: checked,
              })
            }
            disabled={!preferences.enabled || isUpdating}
          />
        </div>

        {preferences.quietHours.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 pt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Start Time
                </label>
                <Input
                  type="time"
                  value={quietStartTime}
                  onChange={(e) => setQuietStartTime(e.target.value)}
                  onBlur={handleQuietHoursUpdate}
                  className="glass border-white/30 text-gray-800"
                  disabled={!preferences.enabled || isUpdating}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  End Time
                </label>
                <Input
                  type="time"
                  value={quietEndTime}
                  onChange={(e) => setQuietEndTime(e.target.value)}
                  onBlur={handleQuietHoursUpdate}
                  className="glass border-white/30 text-gray-800"
                  disabled={!preferences.enabled || isUpdating}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">
              Notifications will be silenced from {quietStartTime} to{' '}
              {quietEndTime}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Sound & Vibration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-strong rounded-3xl p-6 space-y-6"
      >
        <h3 className="text-gray-800 font-medium">Sound & Vibration</h3>

        {/* Sound */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-800">Sound</p>
              <p className="text-xs text-gray-600">
                Play sound for notifications
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.sound}
            onCheckedChange={(checked) => handleToggle('sound', checked)}
            disabled={!preferences.enabled || isUpdating}
          />
        </div>

        {/* Vibration */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vibrate className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-800">Vibration</p>
              <p className="text-xs text-gray-600">
                Vibrate for notifications
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.vibration}
            onCheckedChange={(checked) => handleToggle('vibration', checked)}
            disabled={!preferences.enabled || isUpdating}
          />
        </div>
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
            Notification preferences are synced across all your devices.
            Changes may take a few moments to take effect.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Export with a simpler name for easier imports
export { NotificationPreferencesComponent as NotificationPreferences };
