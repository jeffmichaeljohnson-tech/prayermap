# Notification Preferences - Integration Guide

## Quick Integration into Existing SettingsScreen

This guide shows how to add the NotificationPreferences component to the existing `SettingsScreen.tsx`.

## Step 1: Import the Component

Add to the imports section of `/src/components/SettingsScreen.tsx`:

```tsx
import { NotificationPreferences } from './settings/NotificationPreferences';
import { Bell } from 'lucide-react';
```

## Step 2: Add Section to SettingsScreen

Insert this between the existing sections (suggested: after Suggestion Box, before Change Password):

```tsx
{/* Notification Preferences Section */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.15 }}
  className="glass-strong rounded-3xl p-6"
>
  <div className="flex items-center gap-3 mb-6">
    <div className="p-3 glass rounded-xl">
      <Bell className="w-6 h-6 text-gray-700" />
    </div>
    <div>
      <h3 className="text-gray-800">Notifications</h3>
      <p className="text-sm text-gray-600">Manage push notification preferences</p>
    </div>
  </div>

  <NotificationPreferences />
</motion.div>
```

## Step 3: Update Delay Values

Adjust the `transition={{ delay }}` values for sections that come after:
- Change Password: `delay: 0.25` → `delay: 0.3`
- User Info: `delay: 0.3` → `delay: 0.35`
- App Info: `delay: 0.35` → `delay: 0.4`

## Complete Example

Here's a complete example of the updated SettingsScreen with NotificationPreferences integrated:

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, MessageSquare, Mail, AlertCircle, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { changePassword, submitSuggestion } from '../services/userService';
import { NotificationPreferences } from './settings/NotificationPreferences';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { user } = useAuth();
  // ... existing state ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--ethereal-sky))] via-[hsl(var(--ethereal-dawn))] to-[hsl(var(--ethereal-purple))] p-4">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-4 mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h2 className="text-gray-800">Settings</h2>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Suggestion Box Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-3xl p-6"
        >
          {/* ... existing suggestion box code ... */}
        </motion.div>

        {/* 🆕 Notification Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <div className="glass-strong rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 glass rounded-xl">
                <Bell className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="text-gray-800">Notifications</h3>
                <p className="text-sm text-gray-600">
                  Manage push notification preferences
                </p>
              </div>
            </div>
          </div>

          {/* Notification preferences component - renders its own cards */}
          <NotificationPreferences
            onUpdate={(prefs) => {
              console.log('Notification preferences updated:', prefs);
            }}
          />
        </motion.div>

        {/* Change Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-strong rounded-3xl p-6"
        >
          {/* ... existing change password code ... */}
        </motion.div>

        {/* User Info */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass rounded-2xl p-4"
          >
            {/* ... existing user info ... */}
          </motion.div>
        )}

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center text-gray-600 text-sm"
        >
          {/* ... existing app info ... */}
        </motion.div>
      </div>
    </div>
  );
}
```

## Alternative: Dedicated Notification Settings Page

If you prefer a separate page for notification settings:

### Create `/src/components/NotificationSettingsPage.tsx`

```tsx
import { motion } from 'framer-motion';
import { ArrowLeft, Bell } from 'lucide-react';
import { NotificationPreferences } from './settings/NotificationPreferences';

interface NotificationSettingsPageProps {
  onBack: () => void;
}

export function NotificationSettingsPage({ onBack }: NotificationSettingsPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--ethereal-sky))] via-[hsl(var(--ethereal-dawn))] to-[hsl(var(--ethereal-purple))] p-4">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-4 mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <Bell className="w-6 h-6 text-gray-700" />
        <h2 className="text-gray-800">Notification Settings</h2>
      </div>

      <div className="max-w-2xl mx-auto">
        <NotificationPreferences />
      </div>
    </div>
  );
}
```

### Add Navigation Link in SettingsScreen

```tsx
{/* Notification Settings Link */}
<motion.button
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.15 }}
  onClick={() => navigate('/settings/notifications')}
  className="w-full glass-strong rounded-3xl p-6 flex items-center justify-between hover:bg-white/30 transition-colors"
>
  <div className="flex items-center gap-3">
    <div className="p-3 glass rounded-xl">
      <Bell className="w-6 h-6 text-gray-700" />
    </div>
    <div className="text-left">
      <h3 className="text-gray-800 font-medium">Notifications</h3>
      <p className="text-sm text-gray-600">Manage push notification preferences</p>
    </div>
  </div>
  <ArrowRight className="w-5 h-5 text-gray-500" />
</motion.button>
```

## Step 4: Run Database Migration

Before using the component, apply the database migration:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `/docs/migrations/notification_preferences_migration.sql`
4. Run the migration

## Step 5: Test

### On Web
```bash
npm run dev
```

1. Navigate to Settings
2. Scroll to Notification Preferences
3. Toggle switches and adjust settings
4. Check browser console for "Preference updated" messages
5. Reload page - preferences should persist

### On Mobile (iOS/Android)
```bash
# iOS
npm run ios:sync
npx cap open ios

# Android
npm run android:sync
npx cap open android
```

1. Build and run on device
2. Navigate to Settings
3. Check permission status indicator appears
4. Test permission request flow
5. Toggle preferences
6. Verify toast notifications appear

## Troubleshooting

### Issue: "notification_preferences column doesn't exist"
**Solution**: Run the database migration (see Step 4)

### Issue: Permission status shows "unknown"
**Solution**:
- Make sure you're running on a native device (not web)
- Run `npx cap sync` to update native projects
- Rebuild the app

### Issue: Preferences not saving
**Solution**:
- Check Supabase connection in browser console
- Verify user is authenticated
- Check RLS policies are applied

### Issue: Slider not responding
**Solution**:
- Check that parent container has width
- Verify Radix UI Slider is imported
- Check for CSS conflicts

## Next Steps

After integration:

1. **Test thoroughly** on all platforms (web, iOS, Android)
2. **Set up push notification backend** to actually send notifications based on preferences
3. **Add analytics** to track which preferences users enable/disable
4. **Consider A/B testing** different default values
5. **Monitor performance** - ensure no slowdowns with large user bases

## Support

For issues or questions:
- Review `/docs/features/NOTIFICATION_PREFERENCES.md`
- Check example files in `/src/components/settings/`
- Contact engineering team

---

**Last Updated**: 2025-11-30
**Tested On**: iOS 17, Android 13, Chrome 120
