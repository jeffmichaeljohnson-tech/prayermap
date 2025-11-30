# Push Notifications Setup Guide

This document explains how to configure and deploy the push notification system for PrayerMap.

## Overview

The push notification system consists of three main components:

1. **Database Infrastructure** (`user_push_tokens` table + trigger)
2. **Edge Function** (`send-notification` - handles FCM/APNs delivery)
3. **Frontend Service** (`pushNotificationService.ts` - handles device registration)

### How It Works

```
User posts prayer support
    ↓
Trigger creates notification in DB
    ↓
pg_net or webhook calls send-notification edge function
    ↓
Edge function queries user_push_tokens
    ↓
Sends push via FCM to Android/iOS devices
    ↓
User receives notification
```

## Prerequisites

### 1. Firebase Project Setup

Push notifications use Firebase Cloud Messaging (FCM), which handles both Android and iOS delivery.

1. **Go to [Firebase Console](https://console.firebase.google.com/)**

2. **Select your PrayerMap project** (or create one if it doesn't exist)

3. **Get FCM Server Key:**
   - Navigate to Project Settings → Cloud Messaging
   - Find "Server key" under Cloud Messaging API (Legacy)
   - Copy this key (starts with `AAAA...`)
   - **Important:** Keep this secret! It allows sending notifications to all your users.

4. **Enable Cloud Messaging API:**
   - Go to Google Cloud Console
   - Enable "Firebase Cloud Messaging API"
   - This is required for the legacy FCM HTTP API

### 2. Configure Android App

1. **Download `google-services.json`:**
   - In Firebase Console → Project Settings → General
   - Under "Your apps" → Android app
   - Download `google-services.json`
   - Place in `/android/app/google-services.json`

2. **Verify gradle configuration:**
   - Check `/android/app/build.gradle` includes:
     ```gradle
     apply plugin: 'com.google.gms.google-services'
     ```

### 3. Configure iOS App

1. **Upload APNs Certificate/Key:**
   - In Firebase Console → Project Settings → Cloud Messaging
   - Under "Apple app configuration"
   - Upload your APNs Authentication Key (recommended) or Certificate

2. **Configure Xcode:**
   - Open `/ios/App/App.xcworkspace`
   - Enable Push Notifications capability
   - Enable Background Modes → Remote notifications

3. **Download `GoogleService-Info.plist`:**
   - In Firebase Console → Project Settings → General
   - Under "Your apps" → iOS app
   - Download `GoogleService-Info.plist`
   - Add to Xcode project (drag into runner folder)

## Deployment Steps

### Step 1: Run Database Migration

```bash
# Connect to Supabase CLI
npx supabase db push

# Or apply migration manually in Supabase Dashboard
# Dashboard → SQL Editor → paste migration content
```

This creates:
- `user_push_tokens` table
- `trigger_push_notification()` function
- `on_notification_send_push` trigger
- RLS policies

### Step 2: Configure Database Settings (For pg_net Trigger)

The migration uses `pg_net` to call the edge function. Configure these settings:

```sql
-- Run in Supabase SQL Editor
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://[your-project-ref].supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = '[your-service-role-key]';
```

**Important:** Replace `[your-project-ref]` and `[your-service-role-key]` with your actual values.

### Step 3: Deploy Edge Function

```bash
# Deploy send-notification function
npx supabase functions deploy send-notification

# Set environment variables
npx supabase secrets set FCM_SERVER_KEY="your-fcm-server-key-here"

# Verify deployment
npx supabase functions list
```

### Step 4: Configure Edge Function Environment

Set these secrets in Supabase Dashboard or via CLI:

```bash
# Firebase Cloud Messaging server key (REQUIRED)
npx supabase secrets set FCM_SERVER_KEY="AAAA..."

# These are auto-set by Supabase, but verify:
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

### Step 5: Alternative Setup (Database Webhooks)

If `pg_net` doesn't work reliably, use Database Webhooks instead:

1. **Go to Supabase Dashboard → Database → Webhooks**

2. **Create New Webhook:**
   - **Name:** `Push Notification Sender`
   - **Table:** `notifications`
   - **Events:** `INSERT`
   - **Type:** `HTTP Request`
   - **Method:** `POST`
   - **URL:** `https://[project-ref].supabase.co/functions/v1/send-notification`
   - **Headers:**
     ```
     Authorization: Bearer [service-role-key]
     Content-Type: application/json
     ```
   - **Payload:** Select `record`

3. **Disable pg_net trigger if using webhooks:**
   ```sql
   DROP TRIGGER IF EXISTS on_notification_send_push ON notifications;
   ```

## Testing

### Test 1: Verify Database Setup

```sql
-- Check table exists
SELECT * FROM user_push_tokens LIMIT 1;

-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_notification_send_push';

-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'trigger_push_notification';
```

### Test 2: Test Edge Function Directly

```bash
# Test with curl (replace values)
curl -X POST \
  https://[project-ref].supabase.co/functions/v1/send-notification \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "notification_id": 1,
    "user_id": "[user-uuid]",
    "type": "SUPPORT_RECEIVED",
    "payload": {
      "prayer_id": 123,
      "supporter_name": "Test User",
      "message": "Someone prayed for you"
    }
  }'
```

### Test 3: End-to-End Test

1. **Register a device token:**
   - Run the mobile app
   - Login as a test user
   - Check console logs for "Push registration success"
   - Verify token saved: `SELECT * FROM user_push_tokens WHERE user_id = '[your-user-id]';`

2. **Create a notification:**
   - Have another user support one of your prayers
   - Check notifications table: `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1;`
   - Check edge function logs: `npx supabase functions logs send-notification`

3. **Verify delivery:**
   - You should receive a push notification on your device
   - Check badge count updates
   - Tap notification should navigate to prayer

## Monitoring

### View Edge Function Logs

```bash
# Real-time logs
npx supabase functions logs send-notification --follow

# Recent logs
npx supabase functions logs send-notification --limit 50
```

### Check for Failed Sends

```sql
-- Find tokens that haven't been used recently (possible failures)
SELECT user_id, platform, token, last_used_at
FROM user_push_tokens
WHERE enabled = true
  AND (last_used_at IS NULL OR last_used_at < now() - INTERVAL '7 days')
ORDER BY last_used_at NULLS FIRST;
```

### Monitor Notification Delivery

```sql
-- Count notifications sent today
SELECT type, COUNT(*)
FROM notifications
WHERE created_at > CURRENT_DATE
GROUP BY type;

-- Find users with many unread notifications
SELECT user_id, COUNT(*) as unread_count
FROM notifications
WHERE is_read = false
GROUP BY user_id
ORDER BY unread_count DESC
LIMIT 10;
```

## Troubleshooting

### Issue: Edge function not called when notification created

**Diagnosis:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_notification_send_push';

-- Check pg_net extension
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Check database settings
SHOW app.settings.supabase_url;
SHOW app.settings.service_role_key;
```

**Solutions:**
1. Verify migration ran successfully
2. Check database settings are configured
3. Use Database Webhooks as alternative (see Step 5)

### Issue: FCM returns "Unauthorized" error

**Cause:** Invalid or missing FCM_SERVER_KEY

**Solution:**
```bash
# Verify secret is set
npx supabase secrets list

# Update secret
npx supabase secrets set FCM_SERVER_KEY="your-correct-key"

# Redeploy function
npx supabase functions deploy send-notification
```

### Issue: iOS not receiving notifications

**Checklist:**
- [ ] APNs certificate/key uploaded to Firebase
- [ ] Push Notifications capability enabled in Xcode
- [ ] GoogleService-Info.plist added to iOS project
- [ ] App built with correct provisioning profile
- [ ] Device not in Do Not Disturb mode
- [ ] App has notification permissions granted

### Issue: Android not receiving notifications

**Checklist:**
- [ ] google-services.json in `/android/app/`
- [ ] FCM API enabled in Google Cloud Console
- [ ] App has notification permissions (Android 13+)
- [ ] Battery optimization disabled for app
- [ ] Correct SHA-256 fingerprint registered in Firebase

### Issue: Stale tokens causing failures

**Solution:** Run cleanup function periodically

```sql
-- Manually clean up old tokens
SELECT cleanup_stale_push_tokens();

-- Or set up a cron job (requires pg_cron extension)
SELECT cron.schedule(
  'cleanup-push-tokens',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$SELECT cleanup_stale_push_tokens()$$
);
```

## Security Considerations

1. **FCM Server Key:**
   - Never commit to git
   - Store only in Supabase secrets
   - Rotate periodically

2. **Service Role Key:**
   - Used only by edge function
   - Never expose to client
   - Required for webhook authentication

3. **Token Management:**
   - Tokens are scoped per user (RLS enforced)
   - Users can only manage their own tokens
   - Tokens auto-expire after 90 days of inactivity

4. **Rate Limiting:**
   - Edge function has built-in rate limiting
   - FCM enforces sending quotas
   - Monitor for abuse patterns

## Performance Optimization

### Batch Sending (Future Enhancement)

For high-volume notifications, consider batching:

```typescript
// Instead of individual sends, batch to FCM
// FCM supports up to 1000 recipients per request
const payload = {
  registration_ids: tokens.map(t => t.token),
  notification: { ... },
  data: { ... }
};
```

### Notification Grouping

Group related notifications to reduce noise:

```sql
-- Example: Batch prayer support notifications
-- Instead of "John prayed", "Mary prayed", "Lisa prayed"
-- Send: "John and 2 others prayed for you"
```

### Database Indexes

Already created by migration:
- `idx_user_push_tokens_user_id` - Fast token lookup
- `idx_user_push_tokens_enabled` - Filter enabled tokens

## Cost Considerations

- **FCM:** Free for unlimited messages
- **Supabase Edge Functions:** Free tier includes 500K requests/month
- **Database Triggers:** Minimal overhead per notification

Typical usage:
- 1000 active users
- 10 notifications/user/day
- = 10,000 edge function calls/day
- = 300,000 calls/month (well within free tier)

## Support

For issues:
1. Check edge function logs: `npx supabase functions logs send-notification`
2. Review Firebase Console → Cloud Messaging logs
3. Test with direct curl request (see Testing section)
4. Enable debug logging in mobile app

## References

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)
- [pg_net Extension](https://supabase.com/docs/guides/database/extensions/pg_net)

---

**Last Updated:** 2025-01-30
**Maintained by:** PrayerMap Development Team
