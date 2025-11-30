# Nearby Prayer Notification System

## Overview

The Nearby Prayer Notification System sends push notifications to users when new prayer requests are posted within their notification radius (default: 30 miles / 48km).

## Architecture

### Database Components

1. **notification_type Enum** - Extended to include `NEARBY_PRAYER`
2. **user_push_tokens Table** - Stores FCM (Android) and APNs (iOS) tokens
3. **notification_preferences Table** - User preferences for notification types
4. **notification_rate_limits Table** - Rate limiting (max 1 notification per hour)
5. **Database Trigger** - Automatically fires on new prayer creation
6. **Helper Functions** - Check rate limits, find nearby users, create notifications

### Edge Function

- **nearby-prayer-notify** - Processes pending notifications and sends to FCM/APNs

## How It Works

```
1. User posts a new prayer
   ↓
2. Trigger fires: trigger_nearby_prayer_notifications()
   ↓
3. Function finds users within notification radius
   ↓
4. Checks user preferences (nearby_prayers_enabled)
   ↓
5. Checks rate limit (max 1 per hour)
   ↓
6. Creates notification records in notifications table
   ↓
7. Updates rate limit for each user
   ↓
8. Edge function (cron job) processes pending notifications
   ↓
9. Fetches push tokens for each user
   ↓
10. Sends to FCM (Android) and APNs (iOS)
   ↓
11. Marks notifications as read
```

## Database Schema

### user_push_tokens

```sql
CREATE TABLE user_push_tokens (
    id BIGINT PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    token TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    UNIQUE (user_id, platform, token)
);
```

### notification_preferences

```sql
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(user_id),
    nearby_prayers_enabled BOOLEAN DEFAULT true,
    prayer_support_enabled BOOLEAN DEFAULT true,
    prayer_response_enabled BOOLEAN DEFAULT true,
    prayer_answered_enabled BOOLEAN DEFAULT true,
    push_notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### notification_rate_limits

```sql
CREATE TABLE notification_rate_limits (
    id BIGINT PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    notification_type notification_type NOT NULL,
    last_sent_at TIMESTAMPTZ DEFAULT now(),
    sent_count INTEGER DEFAULT 1,
    UNIQUE (user_id, notification_type)
);
```

## Rate Limiting

**Default:** Max 1 nearby prayer notification per hour per user

**Why?**
- Prevents notification spam
- Respects user attention
- Reduces server load
- Improves user experience

**How it works:**
1. Before creating notification, check `notification_rate_limits` table
2. If last notification was sent < 60 minutes ago, skip
3. If can send, create notification and update rate limit timestamp

**Customization:**
```sql
-- Change rate limit to 30 minutes
SELECT check_notification_rate_limit(user_id, 'NEARBY_PRAYER', 30);

-- Change rate limit to 2 hours
SELECT check_notification_rate_limit(user_id, 'NEARBY_PRAYER', 120);
```

## User Preferences

Users can control their notification preferences:

```typescript
// Get user preferences
const { data: preferences } = await supabase
  .from('notification_preferences')
  .select('*')
  .eq('user_id', userId)
  .single();

// Update preferences
await supabase
  .from('notification_preferences')
  .upsert({
    user_id: userId,
    nearby_prayers_enabled: true,
    prayer_support_enabled: true,
    prayer_response_enabled: true,
    push_notifications_enabled: true
  });
```

## Frontend Integration

### 1. Register Push Tokens

```typescript
import { pushNotificationService } from '@/services/pushNotificationService';

// On app start (after user authentication)
await pushNotificationService.initialize();
```

The service will:
- Request push notification permissions
- Register with FCM (Android) or APNs (iOS)
- Store token in `user_push_tokens` table
- Listen for notification taps

### 2. Handle Notification Taps

```typescript
// Automatic deep linking (already handled in pushNotificationService.ts)
// When user taps notification, app navigates to:
// - /prayer/{prayer_id} for NEARBY_PRAYER notifications
```

### 3. Settings UI

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function NotificationSettings() {
  const [preferences, setPreferences] = useState({
    nearby_prayers_enabled: true,
    prayer_support_enabled: true,
    prayer_response_enabled: true,
    push_notifications_enabled: true
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setPreferences(data);
    }
  }

  async function updatePreference(key: string, value: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...newPreferences
      });
  }

  return (
    <div className="space-y-4">
      <h2>Notification Preferences</h2>

      <label>
        <input
          type="checkbox"
          checked={preferences.push_notifications_enabled}
          onChange={(e) => updatePreference('push_notifications_enabled', e.target.checked)}
        />
        Enable push notifications
      </label>

      <label>
        <input
          type="checkbox"
          checked={preferences.nearby_prayers_enabled}
          onChange={(e) => updatePreference('nearby_prayers_enabled', e.target.checked)}
        />
        Notify me of nearby prayer requests
      </label>

      <label>
        <input
          type="checkbox"
          checked={preferences.prayer_support_enabled}
          onChange={(e) => updatePreference('prayer_support_enabled', e.target.checked)}
        />
        Notify when someone prays for me
      </label>

      <label>
        <input
          type="checkbox"
          checked={preferences.prayer_response_enabled}
          onChange={(e) => updatePreference('prayer_response_enabled', e.target.checked)}
        />
        Notify when I receive prayer responses
      </label>
    </div>
  );
}
```

## Edge Function Deployment

### Prerequisites

1. **Firebase Cloud Messaging (Android)**
   - Create Firebase project
   - Get FCM Server Key from Firebase Console > Project Settings > Cloud Messaging

2. **Apple Push Notification Service (iOS)**
   - Create APNs authentication key in Apple Developer Portal
   - Note Key ID, Team ID, and download .p8 file

### Deployment Steps

```bash
# 1. Set environment variables
supabase secrets set FCM_SERVER_KEY="your-fcm-server-key"
supabase secrets set APNS_KEY_ID="your-apns-key-id"
supabase secrets set APNS_TEAM_ID="your-apple-team-id"
supabase secrets set APNS_KEY="$(cat apns-key.p8)"

# 2. Deploy edge function
supabase functions deploy nearby-prayer-notify

# 3. Test the function
supabase functions invoke nearby-prayer-notify \
  --method POST \
  --body '{}'
```

### Set Up Cron Job

Option 1: **pg_cron (Recommended for Supabase)**

```sql
-- Run every 5 minutes
SELECT cron.schedule(
  'process-nearby-prayer-notifications',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/nearby-prayer-notify',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('process-nearby-prayer-notifications');
```

Option 2: **GitHub Actions**

```yaml
# .github/workflows/process-notifications.yml
name: Process Nearby Prayer Notifications

on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            https://your-project.supabase.co/functions/v1/nearby-prayer-notify \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

## Testing

### 1. Database Testing

```sql
-- Create a test user
INSERT INTO users (user_id, first_name, email, notification_radius_km)
VALUES ('test-user-id', 'Test User', 'test@example.com', 48);

-- Create notification preferences
INSERT INTO notification_preferences (user_id, nearby_prayers_enabled)
VALUES ('test-user-id', true);

-- Add a push token
INSERT INTO user_push_tokens (user_id, token, platform, is_active)
VALUES ('test-user-id', 'test-fcm-token', 'android', true);

-- Create a test prayer (trigger will fire)
INSERT INTO prayers (user_id, text_body, location, status)
VALUES (
  'another-user-id',
  'Please pray for my family',
  ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography,
  'ACTIVE'
);

-- Check if notification was created
SELECT * FROM notifications
WHERE type = 'NEARBY_PRAYER'
ORDER BY created_at DESC
LIMIT 10;

-- Check rate limit
SELECT * FROM notification_rate_limits
WHERE notification_type = 'NEARBY_PRAYER';
```

### 2. Mobile Testing

**iOS:**
```bash
# Build and run on simulator (push won't work)
npm run ios:sync
npm run ios:open

# Build and run on real device (push will work)
# Open Xcode, select your device, and run
```

**Android:**
```bash
# Build and run on emulator or device
npm run android:sync
npm run android:open

# Monitor logs
npm run android:logcat
```

**Testing Checklist:**
- [ ] Push notification permissions requested
- [ ] Token registered in database
- [ ] Create nearby prayer triggers notification
- [ ] Notification appears on device
- [ ] Tapping notification opens prayer detail
- [ ] Rate limiting works (only 1 notification per hour)
- [ ] Preferences respected (can disable nearby prayers)

## Monitoring

### Database Queries

```sql
-- Count notifications sent by type
SELECT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- Check rate limit hit rate
SELECT
  COUNT(*) FILTER (WHERE check_notification_rate_limit(user_id, 'NEARBY_PRAYER', 60) = false) as rate_limited,
  COUNT(*) FILTER (WHERE check_notification_rate_limit(user_id, 'NEARBY_PRAYER', 60) = true) as can_send
FROM users;

-- Active push tokens by platform
SELECT platform, COUNT(*) as count
FROM user_push_tokens
WHERE is_active = true
GROUP BY platform;

-- Recent nearby prayer notifications
SELECT
  n.notification_id,
  n.user_id,
  n.payload->>'title' as title,
  n.payload->>'distance_km' as distance_km,
  n.created_at,
  n.is_read
FROM notifications n
WHERE n.type = 'NEARBY_PRAYER'
ORDER BY n.created_at DESC
LIMIT 50;
```

### Alerts

Set up monitoring for:
- High notification failure rates (> 10%)
- Inactive push tokens (not used in 30 days)
- Rate limit saturation (> 50% of users rate limited)
- Edge function errors

## Performance Optimization

### Current Implementation

- Max 100 notifications created per prayer
- Rate limiting reduces load
- Partial indexes on active tokens
- Trigger runs async (doesn't block prayer creation)

### Future Improvements

1. **User Location Tracking**
   - Add `user_locations` table
   - Store last known location (privacy-safe, approximate)
   - Use in PostGIS radius query

2. **Notification Queue**
   - Use Supabase Realtime or Redis queue
   - Process notifications asynchronously
   - Better handling of bursts

3. **Smart Batching**
   - Group nearby prayers within 5 minutes
   - Send 1 notification: "3 new prayers nearby"
   - Reduces notification fatigue

4. **Geohashing for Performance**
   - Pre-compute geohashes for users and prayers
   - Faster radius lookups at scale

## Troubleshooting

### No notifications received

1. Check push token registered:
```sql
SELECT * FROM user_push_tokens WHERE user_id = 'your-user-id';
```

2. Check notification created:
```sql
SELECT * FROM notifications
WHERE user_id = 'your-user-id'
AND type = 'NEARBY_PRAYER'
ORDER BY created_at DESC;
```

3. Check preferences enabled:
```sql
SELECT * FROM notification_preferences WHERE user_id = 'your-user-id';
```

4. Check rate limit:
```sql
SELECT check_notification_rate_limit('your-user-id', 'NEARBY_PRAYER', 60);
```

5. Check edge function logs:
```bash
supabase functions logs nearby-prayer-notify
```

### Notifications delayed

- Cron job runs every 5 minutes (configurable)
- Check cron job is running:
```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### FCM/APNs errors

- Verify credentials are correct
- Check token format is valid
- Ensure iOS app has push notification capability enabled
- Verify Android app has Firebase configured

## Security Considerations

- **RLS Policies**: All tables have Row Level Security enabled
- **Service Role**: Edge function uses service role for batch processing
- **Rate Limiting**: Prevents abuse and spam
- **Token Validation**: Expired/invalid tokens should be deactivated
- **Privacy**: User location should be approximate, not precise

## Next Steps

1. **User Location Tracking**
   - Implement location tracking (with user consent)
   - Update `notify_nearby_users_of_prayer` to use actual locations
   - Consider privacy implications

2. **Production Push Setup**
   - Configure FCM for Android
   - Configure APNs for iOS
   - Test on real devices

3. **UI/UX Enhancements**
   - Add notification settings screen
   - Show notification radius on map
   - Explain notification frequency

4. **Analytics**
   - Track notification open rates
   - Measure user engagement
   - A/B test notification copy

5. **Advanced Features**
   - Smart notification timing (not at night)
   - Notification bundling (multiple prayers)
   - Rich notifications with images

## References

- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [PostGIS Documentation](https://postgis.net/docs/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
