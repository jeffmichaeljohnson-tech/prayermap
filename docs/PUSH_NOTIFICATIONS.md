# Push Notifications System Documentation

> **PrayerMap Push Notifications** - Complete guide to Firebase Cloud Messaging (FCM) and Apple Push Notification service (APNs) integration for iOS and Android.

**Last Updated:** 2025-11-30
**Status:** Implementation Ready
**Dependencies:** Firebase, Capacitor Push Notifications Plugin v7.0.3

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Setup Guide](#setup-guide)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Client Integration](#client-integration)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## System Overview

### What This System Does

PrayerMap's push notification system enables real-time notifications for:

- **New prayer responses** - When someone responds to your prayer request
- **Prayer support** - When someone prays for your request
- **Nearby prayers** - When a new prayer is posted nearby (optional)
- **Prayer milestones** - When your prayer receives X responses
- **Chat messages** - When someone sends you a direct message (future)

### Technology Stack

**Mobile Platforms:**
- **iOS:** Apple Push Notification service (APNs)
- **Android:** Firebase Cloud Messaging (FCM)
- **Web:** Not supported (browser push notifications are separate)

**Backend:**
- **Supabase Edge Functions** - Serverless notification sending
- **PostgreSQL** - Token storage and notification preferences
- **Firebase Admin SDK** - FCM message delivery

**Client:**
- **@capacitor/push-notifications v7.0.3** - Cross-platform notification handling
- **React hooks** - Notification state management
- **TypeScript** - Type-safe notification data

### Key Features

✅ **Cross-platform** - Works on both iOS and Android
✅ **Permission management** - Proper iOS/Android permission flows
✅ **Token management** - Automatic token registration and refresh
✅ **Deep linking** - Tapping notification navigates to relevant content
✅ **User preferences** - Opt-in/opt-out per notification type
✅ **Quiet hours** - Respect user's do-not-disturb settings
✅ **Rate limiting** - Prevent notification spam

---

## Architecture

### System Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                         PrayerMap Client                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  pushNotificationService.ts                               │   │
│  │  - Initialize on app start                                │   │
│  │  - Request permissions                                    │   │
│  │  - Register device token                                  │   │
│  │  - Listen for notifications                               │   │
│  └────────────────┬─────────────────────────────────────────┘   │
│                   │                                              │
│                   │ FCM/APNs Token                               │
│                   ▼                                              │
└───────────────────┼──────────────────────────────────────────────┘
                    │
                    │ POST /api/register-token
                    │
┌───────────────────▼──────────────────────────────────────────────┐
│                      Supabase Backend                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  user_push_tokens table                                   │   │
│  │  - Stores FCM/APNs tokens                                 │   │
│  │  - Links token to user_id                                 │   │
│  │  - Tracks platform (ios/android)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Edge Function: send-notification                         │   │
│  │  1. Fetch user's push tokens                              │   │
│  │  2. Check notification preferences                         │   │
│  │  3. Apply rate limiting                                   │   │
│  │  4. Send to FCM/APNs                                      │   │
│  │  5. Log notification sent                                 │   │
│  └────────────────┬─────────────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────────────┘
                    │
                    │ FCM API / APNs API
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              Firebase Cloud Messaging (Android)                  │
│          Apple Push Notification service (iOS)                   │
│                                                                   │
│  - Delivers notification to device                               │
│  - Handles retry logic                                           │
│  - Manages delivery receipts                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Push Notification
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      User's Device                               │
│  - Shows notification in system tray                             │
│  - Plays sound/vibration                                         │
│  - Updates badge count                                           │
│  - User taps → opens app → deep link to content                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

**1. Registration Flow:**
```
App Start
  → Request permissions (iOS/Android)
  → Register with FCM/APNs
  → Receive device token
  → Store token in Supabase (user_push_tokens table)
```

**2. Notification Send Flow:**
```
Trigger Event (e.g., new prayer response)
  → Edge Function invoked
  → Fetch user's push tokens from database
  → Check notification preferences
  → Apply rate limiting
  → Send to FCM (Android) or APNs (iOS)
  → Log notification sent
  → FCM/APNs delivers to device
  → User taps notification
  → App opens to relevant content
```

### Component Relationships

**Services:**
- `pushNotificationService.ts` - Client-side notification handler
- `send-notification` Edge Function - Server-side notification sender
- `notification-webhook` Edge Function - Handles notification delivery callbacks

**Database Tables:**
- `user_push_tokens` - Stores FCM/APNs device tokens
- `notifications` - Logs all sent notifications
- `notification_preferences` - User's notification settings (column in profiles)
- `notification_rate_limits` - Prevents spam

**React Hooks (To Be Created):**
- `usePushNotifications()` - Manages push notification state
- `useNotifications()` - Fetches notification history
- `useNotificationPreferences()` - Manages user preferences

**Components (To Be Created):**
- `NotificationCenter` - In-app notification list
- `NotificationBadge` - Unread notification count
- `NotificationSettings` - User preference UI

---

## Setup Guide

### Prerequisites

Before you begin:
- ✅ Supabase project created and configured
- ✅ iOS app configured in Xcode
- ✅ Android app configured in Android Studio
- ✅ Google account for Firebase
- ✅ Apple Developer account ($99/year)

---

### Part 1: Firebase Project Setup

#### Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Navigate to: https://console.firebase.google.com/
   - Click "Add project" or select existing project

2. **Create/Select Project**
   ```
   Project name: PrayerMap
   Enable Google Analytics: Yes (recommended)
   ```

3. **Wait for project creation** (30-60 seconds)

#### Step 2: Add Android App to Firebase

1. **Click "Add app" → Android**

2. **Register app:**
   ```
   Android package name: net.prayermap.app
   App nickname: PrayerMap Android
   Debug signing certificate SHA-1: (optional for testing)
   ```

   **Get SHA-1 (for Google Sign-In):**
   ```bash
   # Development SHA-1
   cd android
   ./gradlew signingReport

   # Look for SHA-1 under "Variant: debug"
   # Copy and paste into Firebase console
   ```

3. **Download `google-services.json`**
   - Firebase will generate this file
   - **CRITICAL:** Save this file securely

4. **Add to Android project:**
   ```bash
   # Place file in Android app directory
   cp ~/Downloads/google-services.json android/app/google-services.json
   ```

5. **Verify placement:**
   ```bash
   ls -la android/app/google-services.json
   # Should show: android/app/google-services.json
   ```

#### Step 3: Add iOS App to Firebase

1. **Click "Add app" → iOS**

2. **Register app:**
   ```
   iOS bundle ID: net.prayermap.app
   App nickname: PrayerMap iOS
   App Store ID: (leave blank for now)
   ```

   **Get Bundle ID from Xcode:**
   ```bash
   # Open iOS project
   npm run ios:open

   # In Xcode:
   # Select PrayerMap target → General → Bundle Identifier
   # Should be: net.prayermap.app
   ```

3. **Download `GoogleService-Info.plist`**
   - Firebase will generate this file
   - **CRITICAL:** Save this file securely

4. **Add to iOS project:**
   ```bash
   # Open Xcode
   npm run ios:open

   # In Xcode:
   # 1. Right-click "App" folder in navigator
   # 2. Select "Add Files to 'App'..."
   # 3. Navigate to Downloads/GoogleService-Info.plist
   # 4. ✅ Check "Copy items if needed"
   # 5. ✅ Check "Add to targets: App"
   # 6. Click "Add"
   ```

5. **Verify in Xcode:**
   ```
   Project Navigator → App → GoogleService-Info.plist
   (Should appear under App folder)
   ```

#### Step 4: Get Firebase Server Key (FCM)

1. **Go to Project Settings**
   - Firebase Console → Project Settings (gear icon)

2. **Navigate to Cloud Messaging**
   - Click "Cloud Messaging" tab

3. **Enable Cloud Messaging API (v1)**
   - If prompted, click "Enable"
   - Wait for API enablement (1-2 minutes)

4. **Get Server Key**
   - **Option A: Legacy Server Key (Simpler, but deprecated)**
     - Under "Cloud Messaging API (Legacy)"
     - Copy "Server key"
     - **Note:** Will be removed by Google eventually

   - **Option B: Service Account (Recommended)**
     - Click "Service Accounts" tab
     - Click "Generate new private key"
     - Download JSON file (keep secure!)
     - This file contains service account credentials

5. **Store Server Key Securely**
   ```bash
   # For legacy server key:
   # Add to .env.local (development)
   echo "FCM_SERVER_KEY=your-server-key-here" >> .env.local

   # For production:
   # Add to Vercel/Supabase environment variables
   ```

---

### Part 2: Apple Push Notification service (APNs) Configuration

#### Step 1: Create APNs Authentication Key

1. **Go to Apple Developer Portal**
   - Navigate to: https://developer.apple.com/account/
   - Sign in with Apple Developer account

2. **Navigate to Keys**
   - Certificates, Identifiers & Profiles → Keys

3. **Create New Key**
   - Click "+" button
   - Key Name: `PrayerMap APNs Key`
   - ✅ Enable "Apple Push Notifications service (APNs)"
   - Click "Continue"

4. **Download Key**
   - Click "Download"
   - File: `AuthKey_XXXXXXXXXX.p8`
   - **CRITICAL:** Save this file - you can only download once!
   - Note the Key ID (e.g., `AB12CD34EF`)

5. **Get Team ID**
   - Apple Developer Portal → Membership
   - Copy "Team ID" (e.g., `A1B2C3D4E5`)

#### Step 2: Upload APNs Key to Firebase

1. **Go to Firebase Project Settings**
   - Firebase Console → Project Settings → Cloud Messaging

2. **Scroll to "Apple app configuration"**
   - Click "Upload" under APNs Authentication Key

3. **Upload .p8 file**
   - Select `AuthKey_XXXXXXXXXX.p8`
   - Enter Key ID: `AB12CD34EF`
   - Enter Team ID: `A1B2C3D4E5`
   - Click "Upload"

4. **Verify**
   - Should see "APNs Authentication Key uploaded successfully"

#### Step 3: Enable Push Notifications in Xcode

1. **Open iOS project**
   ```bash
   npm run ios:open
   ```

2. **Enable Push Notifications capability**
   ```
   Xcode → Select "App" target → Signing & Capabilities
   → Click "+ Capability"
   → Search for "Push Notifications"
   → Double-click to add
   ```

3. **Enable Background Modes**
   ```
   Xcode → Select "App" target → Signing & Capabilities
   → Click "+ Capability"
   → Search for "Background Modes"
   → Double-click to add
   → ✅ Check "Remote notifications"
   ```

4. **Verify entitlements**
   ```
   Project Navigator → App → App.entitlements

   Should contain:
   <key>aps-environment</key>
   <string>development</string>
   ```

---

### Part 3: Environment Variables

Add these environment variables to your project:

#### Development (.env.local)

```bash
# Firebase Configuration (Android)
VITE_FIREBASE_API_KEY=AIzaSy...your-api-key
VITE_FIREBASE_PROJECT_ID=prayermap-12345
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:android:abcdef1234567890

# FCM Server Key (for Edge Functions)
FCM_SERVER_KEY=AAAA...your-server-key

# APNs Configuration (iOS)
APNS_KEY_ID=AB12CD34EF
APNS_TEAM_ID=A1B2C3D4E5
# APNs .p8 file path (server-side only)
APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
```

#### Supabase Edge Functions (.env)

Create `supabase/functions/.env`:

```bash
# FCM Configuration
FCM_SERVER_KEY=AAAA...your-server-key

# APNs Configuration (if using .p8 file)
APNS_KEY_ID=AB12CD34EF
APNS_TEAM_ID=A1B2C3D4E5
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----
...key content...
-----END PRIVATE KEY-----
```

#### Production (Vercel/Supabase Dashboard)

**Vercel Environment Variables:**
- Not needed (push notifications are mobile-only)

**Supabase Environment Variables:**
1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Add secrets:
   ```
   FCM_SERVER_KEY=AAAA...your-server-key
   APNS_KEY_ID=AB12CD34EF
   APNS_TEAM_ID=A1B2C3D4E5
   APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----...
   ```

---

### Part 4: Supabase Edge Function Deployment

#### Step 1: Create Edge Function

```bash
# Create send-notification edge function
npx supabase functions new send-notification
```

#### Step 2: Implement Function

Create `supabase/functions/send-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!;

interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  try {
    // Parse request
    const payload: NotificationPayload = await req.json();
    const { user_id, title, body, data } = payload;

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user's push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('token, platform')
      .eq('user_id', user_id);

    if (tokensError) {
      throw new Error(`Failed to fetch tokens: ${tokensError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found for user' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send notifications to each token
    const results = await Promise.allSettled(
      tokens.map(async (tokenRecord) => {
        if (tokenRecord.platform === 'android') {
          // Send via FCM
          return await sendFCMNotification(tokenRecord.token, title, body, data);
        } else if (tokenRecord.platform === 'ios') {
          // Send via APNs (through FCM)
          return await sendFCMNotification(tokenRecord.token, title, body, data);
        }
      })
    );

    // Log notification
    await supabase.from('notifications').insert({
      user_id,
      title,
      body,
      data,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.filter((r) => r.status === 'fulfilled').length,
        failed: results.filter((r) => r.status === 'rejected').length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title,
        body,
        sound: 'default',
      },
      data: data || {},
      priority: 'high',
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM error: ${response.statusText}`);
  }

  return await response.json();
}
```

#### Step 3: Deploy Edge Function

```bash
# Deploy to Supabase
npx supabase functions deploy send-notification

# Set environment variables
npx supabase secrets set FCM_SERVER_KEY=your-server-key
```

---

## Database Schema

### Required Tables and Columns

Run these SQL migrations in Supabase SQL Editor:

#### Migration 1: user_push_tokens Table

```sql
-- ============================================================================
-- Push Notification Tokens Table
-- Stores FCM/APNs device tokens for push notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Token information
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ensure one token per user per platform
    CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);

-- Indexes for fast lookups
CREATE INDEX user_push_tokens_user_id_idx ON user_push_tokens (user_id);
CREATE INDEX user_push_tokens_token_idx ON user_push_tokens (token);

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view/modify their own tokens
CREATE POLICY "Users can view own push tokens"
    ON user_push_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
    ON user_push_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
    ON user_push_tokens FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
    ON user_push_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_user_push_tokens_updated_at
    BEFORE UPDATE ON user_push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

#### Migration 2: notifications Table

```sql
-- ============================================================================
-- Notifications History Table
-- Logs all sent notifications for debugging and analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Notification content
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',

    -- Status
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX notifications_user_id_idx ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_read_at_idx ON notifications (read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);
```

#### Migration 3: notification_preferences Column

```sql
-- ============================================================================
-- Add notification preferences to profiles table
-- ============================================================================

-- Add notification_preferences column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "prayer_responses": true,
  "prayer_support": true,
  "nearby_prayers": false,
  "prayer_milestones": true,
  "quiet_hours": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  }
}'::jsonb;

-- Index for fast preference lookups
CREATE INDEX profiles_notification_preferences_idx
ON profiles USING GIN (notification_preferences);
```

#### Migration 4: notification_rate_limits Table

```sql
-- ============================================================================
-- Rate Limiting Table
-- Prevents notification spam
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,

    -- Rate limiting
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint per user per notification type per hour
    CONSTRAINT unique_user_type_window UNIQUE (user_id, notification_type, window_start)
);

-- Index for rate limit checks
CREATE INDEX notification_rate_limits_lookup_idx
ON notification_rate_limits (user_id, notification_type, window_start);

-- Enable RLS
ALTER TABLE notification_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role only)
CREATE POLICY "Service role can manage rate limits"
    ON notification_rate_limits FOR ALL
    USING (auth.role() = 'service_role');
```

### Schema Summary

**Tables created:**
1. `user_push_tokens` - Stores FCM/APNs device tokens
2. `notifications` - Logs all sent notifications
3. `notification_rate_limits` - Prevents spam

**Columns added:**
1. `profiles.notification_preferences` - User's notification settings

**Total migrations:** 4

---

## API Reference

### Edge Functions

#### send-notification

**Endpoint:** `POST https://[project].supabase.co/functions/v1/send-notification`

**Description:** Sends a push notification to a user's registered devices.

**Authentication:** Requires Supabase service role key or authenticated user

**Request Body:**
```typescript
{
  user_id: string;       // UUID of recipient
  title: string;         // Notification title
  body: string;          // Notification body
  data?: {               // Optional custom data
    prayer_id?: string;
    user_id?: string;
    type?: string;
  };
}
```

**Response (Success):**
```json
{
  "success": true,
  "sent": 2,
  "failed": 0
}
```

**Response (Error):**
```json
{
  "error": "No push tokens found for user"
}
```

**Example Usage:**
```typescript
import { supabase } from '@/lib/supabase';

async function sendNotification(userId: string) {
  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: {
      user_id: userId,
      title: 'New Prayer Response',
      body: 'Someone responded to your prayer request',
      data: {
        prayer_id: 'abc123',
        type: 'prayer_response'
      }
    }
  });

  if (error) {
    console.error('Failed to send notification:', error);
  }
}
```

---

#### notification-webhook (Future)

**Endpoint:** `POST https://[project].supabase.co/functions/v1/notification-webhook`

**Description:** Handles FCM delivery receipts and token refresh callbacks.

**Implementation:** TBD

---

#### nearby-prayer-notify (Future)

**Endpoint:** Invoked automatically when new prayer is created

**Description:** Notifies users within X km of a new prayer request.

**Implementation:** TBD

---

### Client Service API

#### pushNotificationService

**Location:** `/home/user/prayermap/src/services/pushNotificationService.ts`

**Methods:**

##### `initialize(): Promise<void>`

Initializes push notifications on app start.

```typescript
import { pushNotificationService } from '@/services/pushNotificationService';

// Call in App.tsx or main entry point
await pushNotificationService.initialize();
```

**What it does:**
1. Checks if running on native platform
2. Requests push notification permissions
3. Registers with FCM/APNs
4. Sets up notification listeners
5. Stores device token in Supabase

---

##### `requestPermissions(): Promise<boolean>`

Requests push notification permissions from the user.

```typescript
const hasPermission = await pushNotificationService.requestPermissions();

if (hasPermission) {
  console.log('User granted push notification permission');
} else {
  console.log('User denied push notification permission');
}
```

**Returns:** `true` if permission granted, `false` otherwise

---

##### `registerDevice(token: string): Promise<void>`

Registers the device token with your backend.

```typescript
// Usually called automatically by initialize()
await pushNotificationService.registerDevice(token);
```

**What it does:**
1. Gets current authenticated user
2. Determines platform (iOS/Android)
3. Upserts token to `user_push_tokens` table

---

##### `unregisterDevice(): Promise<void>`

Unregisters the device (call on logout).

```typescript
// Call when user logs out
await pushNotificationService.unregisterDevice();
```

**What it does:**
1. Removes push token from database
2. Removes all notification listeners
3. Resets initialization state

---

## Client Integration

### React Hooks (To Be Created)

#### usePushNotifications Hook

**Purpose:** Manages push notification state and permissions

**Location:** `/home/user/prayermap/src/hooks/usePushNotifications.ts`

**Implementation:**

```typescript
import { useState, useEffect } from 'react';
import { pushNotificationService } from '@/services/pushNotificationService';
import { Capacitor } from '@capacitor/core';

export function usePushNotifications() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializePush() {
      // Only on native platforms
      if (!Capacitor.isNativePlatform()) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        await pushNotificationService.initialize();
        setIsEnabled(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize push notifications');
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    }

    initializePush();
  }, []);

  const requestPermission = async () => {
    try {
      setIsLoading(true);
      const granted = await pushNotificationService.requestPermissions();
      setIsEnabled(granted);
      return granted;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isEnabled,
    isLoading,
    error,
    requestPermission,
  };
}
```

**Usage:**

```typescript
function NotificationPrompt() {
  const { isEnabled, isLoading, requestPermission } = usePushNotifications();

  if (isLoading) return <div>Loading...</div>;
  if (isEnabled) return <div>Notifications enabled!</div>;

  return (
    <button onClick={requestPermission}>
      Enable Push Notifications
    </button>
  );
}
```

---

#### useNotifications Hook

**Purpose:** Fetches notification history

**Location:** `/home/user/prayermap/src/hooks/useNotifications.ts`

**Implementation:**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
}
```

**Usage:**

```typescript
function NotificationList() {
  const { data: notifications, isLoading } = useNotifications();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {notifications?.map(notification => (
        <div key={notification.id}>
          <h3>{notification.title}</h3>
          <p>{notification.body}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### Components (To Be Created)

#### NotificationCenter Component

**Purpose:** Displays notification history in-app

**Location:** `/home/user/prayermap/src/components/NotificationCenter.tsx`

**Features:**
- List of recent notifications
- Mark as read/unread
- Delete notifications
- Navigate to related content
- Empty state when no notifications

**Implementation:** TBD

---

#### NotificationBadge Component

**Purpose:** Shows unread notification count

**Location:** `/home/user/prayermap/src/components/NotificationBadge.tsx`

**Features:**
- Red badge with count
- Updates in real-time
- Clears when notifications read
- Accessible (ARIA label)

**Implementation:** TBD

---

#### NotificationSettings Component

**Purpose:** User preference management UI

**Location:** `/home/user/prayermap/src/components/NotificationSettings.tsx`

**Features:**
- Toggle notification types
- Quiet hours configuration
- Test notification button
- Clear notification history

**Implementation Example:**

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Switch } from '@/components/ui/switch';

export function NotificationSettings() {
  const [preferences, setPreferences] = useState({
    prayer_responses: true,
    prayer_support: true,
    nearby_prayers: false,
    prayer_milestones: true,
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  });

  const savePreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ notification_preferences: preferences })
      .eq('id', user.id);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Notification Settings</h2>

      <div className="flex items-center justify-between">
        <span>Prayer Responses</span>
        <Switch
          checked={preferences.prayer_responses}
          onCheckedChange={(checked) =>
            setPreferences({ ...preferences, prayer_responses: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <span>Prayer Support</span>
        <Switch
          checked={preferences.prayer_support}
          onCheckedChange={(checked) =>
            setPreferences({ ...preferences, prayer_support: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <span>Nearby Prayers</span>
        <Switch
          checked={preferences.nearby_prayers}
          onCheckedChange={(checked) =>
            setPreferences({ ...preferences, nearby_prayers: checked })
          }
        />
      </div>

      <button
        onClick={savePreferences}
        className="w-full bg-blue-500 text-white py-2 rounded-lg"
      >
        Save Preferences
      </button>
    </div>
  );
}
```

---

### Integration Checklist

To integrate push notifications into your app:

**1. Initialize on app start:**
```typescript
// src/App.tsx
import { pushNotificationService } from '@/services/pushNotificationService';

useEffect(() => {
  // Initialize push notifications
  pushNotificationService.initialize();
}, []);
```

**2. Add to auth flow:**
```typescript
// src/contexts/AuthContext.tsx
const handleLogout = async () => {
  // Unregister device before logout
  await pushNotificationService.unregisterDevice();
  await supabase.auth.signOut();
};
```

**3. Send notifications from backend:**
```typescript
// Example: Send notification when prayer response is created
// supabase/functions/create-prayer-response/index.ts

// After creating response, send notification
await supabase.functions.invoke('send-notification', {
  body: {
    user_id: prayer.user_id,
    title: 'New Prayer Response',
    body: `Someone responded to your prayer`,
    data: {
      prayer_id: prayer.id,
      type: 'prayer_response'
    }
  }
});
```

---

## Testing Guide

### Testing on iOS Simulator

**Important:** iOS Simulator does NOT support push notifications. You must use a real device.

**Steps:**

1. **Build and run on real iOS device:**
   ```bash
   npm run ios:sync
   npm run ios:open

   # In Xcode:
   # 1. Select your iPhone from device dropdown
   # 2. Click Run (▶)
   ```

2. **Grant permissions when prompted:**
   - App will request notification permission
   - Tap "Allow"

3. **Verify token registration:**
   - Check Xcode console for: "Push registration success, token: ..."
   - Check Supabase `user_push_tokens` table for new row

4. **Send test notification:**
   ```bash
   # Use Firebase Console:
   # 1. Go to Firebase Console → Cloud Messaging
   # 2. Click "Send your first message"
   # 3. Enter title and body
   # 4. Click "Send test message"
   # 5. Enter FCM token from Xcode console
   # 6. Click "Test"
   ```

5. **Verify notification received:**
   - Lock device or background app
   - Notification should appear in system tray
   - Tap notification
   - App should open and navigate to content

---

### Testing on Android Emulator

Android Emulator **DOES** support push notifications with Google Play Services.

**Steps:**

1. **Start emulator with Google Play:**
   ```bash
   # List available emulators
   emulator -list-avds

   # Start emulator (must have Google Play icon)
   emulator -avd Pixel_5_API_34
   ```

2. **Build and run on emulator:**
   ```bash
   npm run android:sync
   npm run android:run
   ```

3. **Grant permissions:**
   - Android 13+ will prompt for notification permission
   - Tap "Allow"

4. **Verify token registration:**
   - Check Android Studio Logcat for: "Push registration success"
   - Check Supabase `user_push_tokens` table

5. **Send test notification:**
   ```bash
   # Use Firebase Console (same as iOS steps)
   # OR use curl:

   curl -X POST https://fcm.googleapis.com/fcm/send \
     -H "Content-Type: application/json" \
     -H "Authorization: key=YOUR_FCM_SERVER_KEY" \
     -d '{
       "to": "DEVICE_FCM_TOKEN",
       "notification": {
         "title": "Test Notification",
         "body": "This is a test from curl"
       }
     }'
   ```

6. **Verify notification:**
   - Notification appears in system tray
   - Tap notification
   - App opens and navigates

---

### Firebase Console Testing

**Built-in test feature:**

1. **Go to Firebase Console → Cloud Messaging**

2. **Click "Send your first message"**

3. **Compose notification:**
   ```
   Notification title: Test Notification
   Notification text: This is a test from Firebase Console
   ```

4. **Send test message:**
   - Click "Send test message"
   - Enter FCM registration token
   - Click "Test"

5. **Advanced options:**
   - Custom data: Add key-value pairs for deep linking
   - iOS sound: Default or custom sound
   - Android channel: Notification channel ID

---

### Local Development Setup

**Option 1: Use Firebase Cloud Messaging**
- Simplest for testing
- Use Firebase Console to send test messages
- No backend code required

**Option 2: Test with Edge Function**
- Deploy `send-notification` function to Supabase
- Call function from client or Postman:
  ```bash
  curl -X POST https://your-project.supabase.co/functions/v1/send-notification \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
    -d '{
      "user_id": "user-uuid-here",
      "title": "Test Notification",
      "body": "Testing from Edge Function"
    }'
  ```

**Option 3: Trigger from App Actions**
- Add temporary "Send Test Notification" button in settings
- Calls edge function when clicked
- Useful for testing notification flow end-to-end

---

### Automated Testing

**Unit Tests (Vitest):**

```typescript
// src/services/__tests__/pushNotificationService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { pushNotificationService } from '../pushNotificationService';

describe('pushNotificationService', () => {
  it('should initialize on native platform', async () => {
    // Mock Capacitor.isNativePlatform
    vi.mock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    await expect(pushNotificationService.initialize()).resolves.not.toThrow();
  });

  it('should skip initialization on web', async () => {
    vi.mock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => false,
      },
    }));

    await pushNotificationService.initialize();
    // Should log and return without error
  });
});
```

**Integration Tests (Playwright - Limited):**

Playwright cannot test native push notifications directly, but can test:
- Permission request UI
- Notification settings UI
- In-app notification center

---

## Troubleshooting

### Common Issues

#### 1. No Token Received (iOS)

**Symptoms:**
- "Push registration error" in console
- No token stored in database

**Possible Causes:**

**A. Push capability not enabled**
```
Solution:
1. Open Xcode → App target → Signing & Capabilities
2. Ensure "Push Notifications" capability is added
3. Rebuild app
```

**B. APNs key not uploaded to Firebase**
```
Solution:
1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Upload APNs Authentication Key (.p8 file)
3. Verify Key ID and Team ID are correct
```

**C. Provisioning profile issue**
```
Solution:
1. Xcode → Preferences → Accounts
2. Select your Apple ID → Download Manual Profiles
3. Rebuild app
```

**D. Running on iOS Simulator**
```
Solution:
iOS Simulator does NOT support push notifications.
Must use real device.
```

---

#### 2. No Token Received (Android)

**Symptoms:**
- "Push registration error" in Logcat
- No token stored in database

**Possible Causes:**

**A. google-services.json not added**
```
Solution:
1. Verify file exists: android/app/google-services.json
2. Check package name matches: net.prayermap.app
3. Run: npm run android:sync
4. Rebuild app
```

**B. Google Play Services not available**
```
Solution:
- Use emulator with Google Play (not AOSP)
- Or use real device
```

**C. Firebase Cloud Messaging not enabled**
```
Solution:
1. Firebase Console → Project Settings → Cloud Messaging
2. Enable "Cloud Messaging API (v1)"
```

---

#### 3. Token Registered But Notifications Not Received

**Symptoms:**
- Token stored in database
- No errors in console
- But notifications don't appear

**Debugging Steps:**

**A. Check notification permissions**
```typescript
import { PushNotifications } from '@capacitor/push-notifications';

const permStatus = await PushNotifications.checkPermissions();
console.log('Permission status:', permStatus.receive);
// Should be: 'granted'
```

**B. Check notification settings (iOS)**
```
Settings → PrayerMap → Notifications
- Allow Notifications: ON
- Sounds: ON
- Badges: ON
- Show in Notification Center: ON
```

**C. Check notification settings (Android)**
```
Settings → Apps → PrayerMap → Notifications
- All PrayerMap notifications: ON
- Default: ON (or specific channels)
```

**D. Test with Firebase Console**
```
Firebase Console → Cloud Messaging → Send test message
Enter FCM token → Send

If this works: Issue is with your edge function
If this fails: Issue is with FCM/APNs setup
```

**E. Check FCM server key**
```bash
# Verify server key is set
npx supabase secrets list

# Should show: FCM_SERVER_KEY
```

---

#### 4. Notifications Work on Android, Not iOS

**Likely Cause:** APNs configuration issue

**Solutions:**

**A. Verify APNs key uploaded**
```
Firebase Console → Project Settings → Cloud Messaging
→ Apple app configuration
→ Should show "APNs Authentication Key" uploaded
```

**B. Check bundle ID matches**
```
iOS Bundle ID in Firebase: net.prayermap.app
iOS Bundle ID in Xcode: net.prayermap.app
(Must match exactly)
```

**C. Check APNs environment**
```
Development builds: aps-environment = development
Production builds: aps-environment = production

Verify in App.entitlements file
```

**D. Test with APNs directly (advanced)**
```bash
# Use tool like APNS-Tool or curl
# Requires APNs certificate or .p8 key
```

---

#### 5. Token Refresh Issues

**Symptoms:**
- Old token in database
- Notifications stop working after X days

**Solution:**

**A. Implement token refresh listener**
```typescript
// In pushNotificationService.ts
PushNotifications.addListener('registration', async (token) => {
  console.log('Token refreshed:', token.value);
  await this.registerDevice(token.value);
});
```

**B. Handle token expiration**
```sql
-- Add expires_at column to user_push_tokens
ALTER TABLE user_push_tokens
ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days');

-- Cron job to clean expired tokens
DELETE FROM user_push_tokens
WHERE expires_at < now();
```

---

#### 6. Notification Not Opening App

**Symptoms:**
- Notification appears
- Tapping does nothing or doesn't navigate

**Solution:**

**A. Check notification data**
```typescript
// Ensure data includes navigation info
{
  title: 'New Prayer Response',
  body: 'Someone responded',
  data: {
    prayer_id: 'abc123',  // ← Required for navigation
    type: 'prayer_response'
  }
}
```

**B. Verify action handler**
```typescript
// In pushNotificationService.ts
PushNotifications.addListener(
  'pushNotificationActionPerformed',
  (notification) => {
    const prayerId = notification.notification.data?.prayer_id;
    if (prayerId) {
      window.location.href = `/prayer/${prayerId}`;
    }
  }
);
```

---

### Debugging Tools

#### Check FCM Token

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

// Get current token
PushNotifications.addListener('registration', (token) => {
  console.log('FCM Token:', token.value);

  // Copy and test in Firebase Console
});
```

#### Check Database

```sql
-- View all registered tokens
SELECT * FROM user_push_tokens;

-- View tokens for specific user
SELECT * FROM user_push_tokens WHERE user_id = 'your-user-id';

-- View recent notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
```

#### Check Supabase Logs

```bash
# View edge function logs
npx supabase functions logs send-notification

# Should show:
# - Function invocations
# - FCM API responses
# - Errors
```

#### Monitor FCM Dashboard

```
Firebase Console → Project → Cloud Messaging
→ View statistics:
  - Messages sent
  - Messages delivered
  - Open rate
```

---

## Best Practices

### 1. Notification Frequency Guidelines

**Rate Limits:**
- **Prayer responses:** 1 notification per response (no limit)
- **Prayer support:** Max 5 per prayer per hour
- **Nearby prayers:** Max 3 per hour
- **Prayer milestones:** Once per milestone (5, 10, 25, 50, 100 responses)
- **Chat messages:** 1 per message (with 5-minute batching)

**Implementation:**

```sql
-- Check rate limit before sending
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_notification_type TEXT,
  p_max_per_hour INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count notifications in last hour
  SELECT COUNT(*)
  INTO v_count
  FROM notification_rate_limits
  WHERE user_id = p_user_id
    AND notification_type = p_notification_type
    AND window_start > now() - INTERVAL '1 hour';

  -- Return true if under limit
  RETURN v_count < p_max_per_hour;
END;
$$ LANGUAGE plpgsql;
```

---

### 2. Content Guidelines

**Notification Title:**
- **Max 50 characters**
- Be specific: "New prayer response" ✅ not "New notification" ❌
- Include sender name when not anonymous

**Notification Body:**
- **Max 150 characters**
- Provide context: "John responded to your prayer about healing"
- Avoid generic messages

**Examples:**

```typescript
// ✅ GOOD
{
  title: 'New Prayer Response',
  body: 'Sarah sent you encouragement for your healing prayer',
  data: { prayer_id: '123', type: 'prayer_response' }
}

// ❌ BAD
{
  title: 'Notification',
  body: 'You have a new message',
  data: {}
}
```

---

### 3. Quiet Hours Implementation

**Respect user's sleep schedule:**

```typescript
function shouldSendNotification(
  preferences: NotificationPreferences,
  userTimezone: string
): boolean {
  // Check if quiet hours enabled
  if (!preferences.quiet_hours.enabled) return true;

  // Get current time in user's timezone
  const now = new Date();
  const userTime = now.toLocaleTimeString('en-US', {
    timeZone: userTimezone,
    hour12: false,
  });

  const [currentHour] = userTime.split(':').map(Number);
  const [startHour] = preferences.quiet_hours.start.split(':').map(Number);
  const [endHour] = preferences.quiet_hours.end.split(':').map(Number);

  // Check if current time is in quiet hours
  if (startHour < endHour) {
    // e.g., 22:00 - 08:00 (overnight)
    return currentHour < startHour || currentHour >= endHour;
  } else {
    // e.g., 08:00 - 22:00 (daytime)
    return currentHour >= endHour && currentHour < startHour;
  }
}
```

**Store user timezone:**

```sql
-- Add timezone to profiles
ALTER TABLE profiles
ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
```

---

### 4. Badge Count Management

**Update badge count:**

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

// Set badge count
async function updateBadgeCount(count: number) {
  await PushNotifications.setBadgeCount({ count });
}

// Clear badge count
async function clearBadgeCount() {
  await PushNotifications.setBadgeCount({ count: 0 });
}

// Get unread count from database
async function getUnreadCount(): Promise<number> {
  const { data } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);

  return data?.length || 0;
}
```

**Update on app open:**

```typescript
// In App.tsx
useEffect(() => {
  // Clear badge when app opens
  PushNotifications.setBadgeCount({ count: 0 });
}, []);
```

---

### 5. Notification Categories (iOS)

**Define categories for actionable notifications:**

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

// Register notification categories
await PushNotifications.createChannel({
  id: 'prayer_responses',
  name: 'Prayer Responses',
  importance: 5,
  visibility: 1,
  lights: true,
  vibration: true,
});

// Send notification with category
{
  notification: {
    title: 'New Prayer Response',
    body: 'Sarah responded to your prayer',
    category: 'prayer_responses',  // ← Category
  },
  data: {
    prayer_id: '123',
  }
}
```

**Handle category actions:**

```typescript
PushNotifications.addListener(
  'pushNotificationActionPerformed',
  (notification) => {
    const action = notification.actionId;

    switch (action) {
      case 'REPLY':
        // Open reply modal
        break;
      case 'VIEW':
        // Navigate to prayer
        break;
      case 'DISMISS':
        // Mark as read
        break;
    }
  }
);
```

---

### 6. Error Handling

**Graceful degradation:**

```typescript
async function sendNotificationSafely(userId: string, notification: Notification) {
  try {
    // Attempt to send notification
    const result = await sendNotification(userId, notification);

    if (result.failed > 0) {
      // Log failed sends but don't throw
      logger.warn('Some notifications failed to send', {
        userId,
        failed: result.failed,
      });
    }

    return result;
  } catch (error) {
    // Log error but don't break app
    logger.error('Notification send failed', error, {
      userId,
      notification,
    });

    // Optionally: Queue for retry
    await queueForRetry(userId, notification);

    return { success: false, error };
  }
}
```

**Invalid token handling:**

```typescript
// In edge function
async function sendFCMNotification(token: string, notification: Notification) {
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification,
    }),
  });

  const result = await response.json();

  // Handle invalid token
  if (result.results[0].error === 'InvalidRegistration') {
    // Delete invalid token from database
    await supabase
      .from('user_push_tokens')
      .delete()
      .eq('token', token);

    logger.info('Deleted invalid token', { token });
  }

  return result;
}
```

---

### 7. Testing Checklist

Before releasing push notifications:

**iOS:**
- [ ] Test on real iOS device (not simulator)
- [ ] Test notification while app is in foreground
- [ ] Test notification while app is in background
- [ ] Test notification while app is killed
- [ ] Test notification tap navigation
- [ ] Test notification permissions flow
- [ ] Test notification settings UI
- [ ] Test quiet hours
- [ ] Test badge count
- [ ] Test on iOS 14, 15, 16, 17+

**Android:**
- [ ] Test on emulator with Google Play
- [ ] Test on real Android device
- [ ] Test notification while app is in foreground
- [ ] Test notification while app is in background
- [ ] Test notification while app is killed
- [ ] Test notification tap navigation
- [ ] Test notification permissions (Android 13+)
- [ ] Test notification channels
- [ ] Test notification settings UI
- [ ] Test on Android 10, 11, 12, 13, 14+

**Backend:**
- [ ] Test edge function deployment
- [ ] Test FCM API integration
- [ ] Test APNs integration (via FCM)
- [ ] Test rate limiting
- [ ] Test quiet hours
- [ ] Test invalid token handling
- [ ] Test database token storage
- [ ] Test notification logging

---

## Summary

### What You Need to Do

**1. Firebase Setup (One-time):**
- Create Firebase project
- Add Android app, download `google-services.json`
- Add iOS app, download `GoogleService-Info.plist`
- Get FCM server key
- Upload APNs .p8 key to Firebase

**2. Xcode Configuration (One-time):**
- Enable Push Notifications capability
- Enable Background Modes → Remote notifications
- Add `GoogleService-Info.plist` to project

**3. Android Studio Configuration (One-time):**
- Add `google-services.json` to `android/app/`
- Verify Google Play Services dependency

**4. Database Setup (One-time):**
- Run migration 1: `user_push_tokens` table
- Run migration 2: `notifications` table
- Run migration 3: `notification_preferences` column
- Run migration 4: `notification_rate_limits` table

**5. Edge Function Setup (One-time):**
- Create `send-notification` edge function
- Deploy to Supabase
- Set FCM_SERVER_KEY secret

**6. Client Integration:**
- Initialize `pushNotificationService` in App.tsx
- Create `usePushNotifications` hook
- Create `NotificationSettings` component
- Add notification center UI

**7. Testing:**
- Test on iOS real device
- Test on Android emulator/device
- Test notification delivery
- Test deep linking
- Test rate limiting

---

### Key Files

**Configuration:**
- `android/app/google-services.json` - Android FCM config
- `ios/App/GoogleService-Info.plist` - iOS FCM config
- `capacitor.config.ts` - Push notification plugin config

**Code:**
- `src/services/pushNotificationService.ts` - Client notification handler
- `supabase/functions/send-notification/index.ts` - Server notification sender

**Database:**
- `user_push_tokens` - Device token storage
- `notifications` - Notification history
- `notification_preferences` - User settings
- `notification_rate_limits` - Spam prevention

---

### Quick Reference

**Initialize push notifications:**
```typescript
import { pushNotificationService } from '@/services/pushNotificationService';
await pushNotificationService.initialize();
```

**Send notification:**
```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    user_id: 'user-uuid',
    title: 'New Prayer Response',
    body: 'Someone responded to your prayer',
    data: { prayer_id: 'prayer-uuid' }
  }
});
```

**Check permissions:**
```typescript
const hasPermission = await pushNotificationService.requestPermissions();
```

**Unregister on logout:**
```typescript
await pushNotificationService.unregisterDevice();
```

---

**Last Updated:** 2025-11-30
**Maintained by:** Push Notification Documentation Agent
**Status:** Ready for Implementation

**Related Documentation:**
- `/home/user/prayermap/docs/ENVIRONMENT_VARIABLES.md` - Environment setup
- `/home/user/prayermap/docs/ANDROID_INTEGRATION_SUMMARY.md` - Android setup
- `/home/user/prayermap/docs/archive/IOS_SETUP_COMPLETE.md` - iOS setup
- `/home/user/prayermap/CLAUDE.md` - Project principles

---

*PrayerMap - "See where prayer is needed. Send prayer where you are."*
