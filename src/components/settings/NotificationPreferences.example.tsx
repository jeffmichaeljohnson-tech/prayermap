/**
 * Example usage of NotificationPreferences component
 *
 * This file demonstrates how to integrate the notification preferences
 * UI into your settings screen or modal.
 */

import { useState } from 'react';
import { NotificationPreferences } from './NotificationPreferences';
import type { NotificationPreferences as PreferencesType } from '@/hooks/useNotificationPreferences';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';

/**
 * Example 1: Full-screen settings page
 */
export function SettingsPageExample() {
  const handlePreferencesUpdate = (preferences: PreferencesType) => {
    console.log('Preferences updated:', preferences);
    // You could sync to analytics, send to webhook, etc.
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--ethereal-sky))] via-[hsl(var(--ethereal-dawn))] to-[hsl(var(--ethereal-purple))]">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-4 mb-6 flex items-center gap-3 m-4">
        <button
          onClick={() => window.history.back()}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-xl font-medium text-gray-800">
          Notification Settings
        </h1>
      </div>

      {/* Preferences Component */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <NotificationPreferences onUpdate={handlePreferencesUpdate} />
      </div>
    </div>
  );
}

/**
 * Example 2: Modal/Dialog integration
 */
export function SettingsModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Notification Settings
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-medium text-gray-800">
                Notification Settings
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Preferences */}
            <NotificationPreferences
              onUpdate={(prefs) => {
                console.log('Updated:', prefs);
              }}
            />

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Example 3: Integrated into existing settings screen
 */
export function IntegratedSettingsExample() {
  return (
    <div className="space-y-6">
      {/* Other settings sections */}
      <div className="glass-strong rounded-3xl p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          Account Settings
        </h3>
        {/* Account settings content */}
      </div>

      {/* Notification Preferences */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4 px-2">
          Notification Preferences
        </h3>
        <NotificationPreferences />
      </div>

      {/* Other settings sections */}
      <div className="glass-strong rounded-3xl p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          Privacy Settings
        </h3>
        {/* Privacy settings content */}
      </div>
    </div>
  );
}

/**
 * Example 4: Standalone notification center
 */
export function NotificationCenterExample() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with stats */}
        <div className="glass-strong rounded-3xl p-6 mb-6">
          <h1 className="text-2xl font-medium text-gray-800 mb-2">
            Notification Center
          </h1>
          <p className="text-gray-600">
            Manage how and when you receive notifications
          </p>
        </div>

        {/* Preferences */}
        <NotificationPreferences
          onUpdate={(prefs) => {
            console.log('Notification preferences saved:', prefs);

            // Example: Track analytics
            // analytics.track('notification_preferences_updated', {
            //   enabled: prefs.enabled,
            //   types_enabled: [
            //     prefs.prayerResponses && 'responses',
            //     prefs.prayerSupport && 'support',
            //     prefs.nearbyPrayers && 'nearby',
            //   ].filter(Boolean),
            //   quiet_hours: prefs.quietHours.enabled,
            // });
          }}
        />

        {/* Help section */}
        <div className="glass rounded-2xl p-4 mt-6">
          <h3 className="text-sm font-medium text-gray-800 mb-2">
            Need help?
          </h3>
          <p className="text-xs text-gray-600">
            If you are not receiving notifications, check your device
            settings to ensure PrayerMap has notification permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
