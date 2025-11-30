# Enhanced Push Notifications System

Complete guide to the enhanced PrayerMap push notification system with badge management, rich notifications, deep linking, and foreground notification handling.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Architecture](#architecture)
- [Features](#features)
- [Usage](#usage)
- [Database Setup](#database-setup)
- [iOS Configuration](#ios-configuration)
- [Android Configuration](#android-configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

The enhanced PrayerMap push notification system provides:

- **Badge Count Management**: Track and display unread notification counts
- **Rich Notifications**: Images, expandable text, and action buttons
- **Notification Categories**: iOS action buttons (View, Reply, Pray, etc.)
- **Deep Link Handling**: Navigate to specific prayers, users, or connections
- **Foreground Notifications**: Custom in-app UI when notifications arrive
- **Multi-Device Support**: Manage tokens across multiple devices
- **Smart Permission Flow**: Soft prompts and settings deep links

## Installation

### Required Dependencies

```bash
# Install Capacitor Badge plugin
npm install @capacitor/badge

# Verify other required plugins are installed
npm list @capacitor/push-notifications
npm list @capacitor/haptics
npm list @capacitor/app
```

### Current Status

⚠️ **Action Required**: The `@capacitor/badge` plugin needs to be installed for native badge support.

```bash
npm install @capacitor/badge
npx cap sync
```

Then uncomment the Badge import in `/home/user/prayermap/src/services/pushNotificationService.ts`:

```typescript
// Line 30: Change this:
// import { Badge } from '@capacitor/badge';

// To this:
import { Badge } from '@capacitor/badge';
```

And uncomment the badge set call in the `setBadgeCount` method (line 549):

```typescript
// Change this:
// await Badge.set({ count: this.unreadCount });

// To this:
await Badge.set({ count: this.unreadCount });
```

## Architecture

### Service Layer

**File**: `/home/user/prayermap/src/services/pushNotificationService.ts`

The core service provides:
- Initialization and setup
- Permission management
- Token registration and refresh
- Badge count management
- Notification handling (foreground and tap)
- Deep link navigation

### React Hook Layer

**File**: `/home/user/prayermap/src/hooks/usePushNotifications.ts`

Three hooks for different use cases:

1. **`usePushNotifications`** - Main hook for general integration
2. **`usePermissionPrompt`** - One-time permission prompt management
3. **`useForegroundNotification`** - In-app notification display

### Component Examples

**File**: `/home/user/prayermap/src/services/pushNotificationService.example.tsx`

Complete UI components showing best practices.

## Features

### 1. Badge Count Management

Automatically tracks unread notifications and updates app badge:

```typescript
const { badgeCount, clearBadge } = usePushNotifications();

// Display badge
<NotificationIcon badge={badgeCount} />

// Clear when user views notifications
<button onClick={clearBadge}>Clear</button>
```

Features:
- Persists across app restarts
- Syncs every 10 seconds
- Updates on foreground/background transitions
- Decrements when user taps notification

### 2. Notification Categories (iOS)

Pre-defined action buttons for different notification types:

| Category | Actions |
|----------|---------|
| `PRAYER_RESPONSE` | View Prayer, Reply |
| `PRAYER_SUPPORT` | View Prayer |
| `NEARBY_PRAYER` | Pray, View |

To implement in iOS native code, add to `AppDelegate.swift`:

```swift
import UserNotifications

// In application(_:didFinishLaunchingWithOptions:)
UNUserNotificationCenter.current().setNotificationCategories([
    // Prayer Response category
    UNNotificationCategory(
        identifier: "PRAYER_RESPONSE",
        actions: [
            UNNotificationAction(identifier: "VIEW_PRAYER", title: "View Prayer", options: .foreground),
            UNNotificationAction(identifier: "REPLY", title: "Reply", options: .foreground)
        ],
        intentIdentifiers: []
    ),
    // Prayer Support category
    UNNotificationCategory(
        identifier: "PRAYER_SUPPORT",
        actions: [
            UNNotificationAction(identifier: "VIEW_PRAYER", title: "View Prayer", options: .foreground)
        ],
        intentIdentifiers: []
    ),
    // Nearby Prayer category
    UNNotificationCategory(
        identifier: "NEARBY_PRAYER",
        actions: [
            UNNotificationAction(identifier: "PRAY", title: "Pray", options: []),
            UNNotificationAction(identifier: "VIEW_PRAYER", title: "View", options: .foreground)
        ],
        intentIdentifiers: []
    )
])
```

### 3. Rich Notifications

Support for images and expandable content:

**Sending from backend**:

```typescript
// FCM payload
{
  notification: {
    title: "Someone is praying for you",
    body: "John just prayed for your request about healing",
    image: "https://prayermap.net/avatars/john.jpg" // User's avatar
  },
  data: {
    type: "PRAYER_SUPPORT",
    prayer_id: "abc123",
    user_id: "john_id",
    avatar_url: "https://prayermap.net/avatars/john.jpg"
  },
  android: {
    notification: {
      channelId: "prayer_support",
      imageUrl: "https://prayermap.net/avatars/john.jpg"
    }
  },
  apns: {
    payload: {
      aps: {
        category: "PRAYER_SUPPORT",
        mutableContent: 1
      }
    },
    fcmOptions: {
      imageUrl: "https://prayermap.net/avatars/john.jpg"
    }
  }
}
```

### 4. Deep Link Handling

Automatically navigates to the correct screen based on notification type:

| Type | Navigation |
|------|------------|
| `PRAYER_RESPONSE` | `/prayer/:id?response=:responseId` |
| `PRAYER_SUPPORT` | `/prayer/:id` |
| `NEARBY_PRAYER` | `/prayer/:id` |
| `CONNECTION_CREATED` | `/connections?id=:connectionId` |
| `GENERAL` | Custom based on data |

**Action Handling**:

- `PRAY` action: Marks prayer as prayed for (background action)
- `VIEW_PRAYER`: Opens prayer detail screen
- `REPLY`: Opens prayer detail with reply input focused

### 5. Foreground Notification Handling

Custom in-app UI when notifications arrive while app is open:

```typescript
function App() {
  const { setForegroundHandler } = usePushNotifications();

  useEffect(() => {
    setForegroundHandler((notification) => {
      // Custom UI shown via useForegroundNotification hook
      console.log('New notification:', notification);
    });
  }, [setForegroundHandler]);

  return (
    <>
      <YourApp />
      <ForegroundNotificationToast />
    </>
  );
}
```

Features:
- Haptic feedback on receipt
- Auto-dismisses after 5 seconds
- Tap to view
- Increments badge count

### 6. Smart Permission Flow

Multi-step permission request with soft prompts:

```typescript
function App() {
  const { shouldShowPermissionPrompt, requestPermissions } = usePushNotifications();

  if (shouldShowPermissionPrompt) {
    return <SmartPermissionPrompt onEnable={requestPermissions} />;
  }
}
```

Features:
- Checks if user can be prompted (hasn't permanently denied)
- Shows custom UI before system prompt
- Only shows once per install
- Deep links to settings if denied

## Usage

### Basic Integration

**1. Initialize in App Root**

```tsx
// App.tsx
import { usePushNotifications } from './hooks/usePushNotifications';

function App() {
  const {
    isInitialized,
    permissionStatus,
    badgeCount,
    clearBadge
  } = usePushNotifications();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Header badgeCount={badgeCount} onClearBadge={clearBadge} />
      <Router />
      <ForegroundNotificationToast />
    </>
  );
}
```

**2. Request Permissions**

```tsx
// Onboarding.tsx
import { usePushNotifications } from './hooks/usePushNotifications';

function OnboardingComplete() {
  const { requestPermissions } = usePushNotifications();

  const handleComplete = async () => {
    // Request push permissions at the right moment
    await requestPermissions();
    navigate('/home');
  };

  return (
    <button onClick={handleComplete}>
      Get Started
    </button>
  );
}
```

**3. Handle Foreground Notifications**

```tsx
// Use the built-in hook
import { useForegroundNotification } from './hooks/usePushNotifications';

function ForegroundNotificationToast() {
  const { notification, isVisible, dismiss } = useForegroundNotification();

  if (!isVisible || !notification) return null;

  return (
    <Toast>
      <h4>{notification.title}</h4>
      <p>{notification.body}</p>
      <button onClick={dismiss}>Dismiss</button>
    </Toast>
  );
}
```

**4. Logout Cleanup**

```tsx
// auth/logout.ts
import { pushNotificationService } from './services/pushNotificationService';

async function logout() {
  // Remove push token from database
  await pushNotificationService.unregisterDevice();

  // Clear other user data
  await supabase.auth.signOut();
}
```

## Database Setup

### Create Migration

Create a new Supabase migration for the `user_push_tokens` table:

```sql
-- Create user_push_tokens table
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_platform ON user_push_tokens(platform);

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own tokens"
  ON user_push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin policy (for service role to send notifications)
CREATE POLICY "Service role can read all tokens"
  ON user_push_tokens
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Auto-update updated_at timestamp
CREATE TRIGGER update_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Add to Database Types

Update `/home/user/prayermap/src/lib/supabase.ts`:

```typescript
export interface Database {
  public: {
    Tables: {
      // ... existing tables ...
      user_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<UserPushToken, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserPushToken, 'id' | 'user_id' | 'device_id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
```

## Best Practices

### 1. Request Permissions at the Right Time

❌ **Don't** request on app launch
✅ **Do** request after user creates their first prayer

```typescript
// After successful prayer creation
const handlePrayerCreated = async () => {
  await createPrayer(data);

  // Now is a good time to ask for notifications
  const { requestPermissions } = usePushNotifications();
  await requestPermissions();
};
```

### 2. Provide Context for Permissions

❌ **Don't** show system prompt without explanation
✅ **Do** show custom UI explaining benefits first

```typescript
// Use the soft request first
const canRequest = await requestPermissions(true); // soft = true

if (canRequest) {
  // Show custom UI
  showPermissionExplanation();
}
```

### 3. Handle Permission Denial Gracefully

❌ **Don't** block features if notifications denied
✅ **Do** offer alternative ways to stay updated

```typescript
if (permissionStatus.status === 'denied') {
  return (
    <div>
      <p>Enable email notifications instead?</p>
      <EmailNotificationToggle />
    </div>
  );
}
```

### 4. Clear Badge on App Open

```typescript
useEffect(() => {
  // Clear badge when user opens notification screen
  const clearBadgeOnView = async () => {
    await pushNotificationService.clearBadge();
  };

  clearBadgeOnView();
}, []);
```

### 5. Refresh Token on App Resume

The hook handles this automatically, but if using service directly:

```typescript
App.addListener('appStateChange', async (state) => {
  if (state.isActive) {
    await pushNotificationService.refreshToken();
  }
});
```

## Troubleshooting

### Badge Not Updating (iOS)

**Issue**: Badge count doesn't update on iOS app icon

**Solution**: Install `@capacitor/badge` plugin:
```bash
npm install @capacitor/badge
npx cap sync ios
```

### Notifications Not Received (Android)

**Issue**: Push notifications not arriving on Android

**Checklist**:
- [ ] `google-services.json` is in `android/app/`
- [ ] FCM server key is configured
- [ ] Device has Google Play Services
- [ ] App is not in battery optimization
- [ ] Notification channel is created

**Test**:
```bash
# Check logcat for errors
npm run android:logcat
```

### Permission Permanently Denied

**Issue**: User denied permissions and can't request again

**Solution**: Guide user to settings:
```typescript
const { permissionStatus, openSettings } = usePushNotifications();

if (permissionStatus.permanentlyDenied) {
  return (
    <div>
      <p>Notifications are disabled. Please enable in settings.</p>
      <button onClick={openSettings}>Open Settings</button>
    </div>
  );
}
```

## Next Steps

1. **Install Badge Plugin**: `npm install @capacitor/badge`
2. **Create Database Migration**: Add `user_push_tokens` table
3. **Configure iOS**: Add push capability and APNs key
4. **Configure Android**: Verify Firebase setup
5. **Test on Devices**: Push notifications require physical devices
6. **Implement Backend**: Send notifications from Supabase Edge Functions

## Files Modified

- `/home/user/prayermap/src/services/pushNotificationService.ts` - Enhanced service
- `/home/user/prayermap/src/hooks/usePushNotifications.ts` - React hooks
- `/home/user/prayermap/src/services/pushNotificationService.example.tsx` - UI examples

---

**Last Updated**: 2025-11-30
**Version**: 2.0.0 (Enhanced)
**Maintainer**: PrayerMap Team
