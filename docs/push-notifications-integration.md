# Push Notifications Integration Guide

## Overview

This guide explains how to use the push notification tokens system added in migration `017_add_push_tokens.sql`.

## Database Schema

### Tables Created

#### `user_push_tokens`
Stores FCM/APNs tokens for each user's devices.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Auto-incrementing primary key |
| `user_id` | UUID | References auth.users(id) |
| `token` | TEXT | FCM or APNs token |
| `platform` | TEXT | 'ios', 'android', or 'web' |
| `device_id` | TEXT | Unique device identifier (generated in app) |
| `created_at` | TIMESTAMPTZ | Token registration time |
| `updated_at` | TIMESTAMPTZ | Last modification time |
| `last_used_at` | TIMESTAMPTZ | Last successful notification send |
| `is_active` | BOOLEAN | Active status (false on logout) |

### Columns Added

#### `profiles.notification_preferences`
JSONB column storing user notification preferences.

**Default structure:**
```json
{
  "push_enabled": true,
  "prayer_responses": true,
  "prayer_support": true,
  "nearby_prayers": false,
  "prayer_reminders": true,
  "quiet_hours_enabled": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00"
}
```

## Helper Functions

### `get_active_push_tokens(user_id UUID)`

Retrieves all active push tokens for a user.

**Usage:**
```typescript
const { data: tokens } = await supabase.rpc('get_active_push_tokens', {
  p_user_id: userId
});

// Returns: Array<{ id, token, platform, device_id, last_used_at }>
```

### `should_send_notification(user_id UUID, notification_type TEXT)`

Checks if a user wants to receive a specific notification type (respects quiet hours).

**Notification types:**
- `'prayer_responses'` - Someone responded to user's prayer
- `'prayer_support'` - Someone is praying for user
- `'nearby_prayers'` - New prayer request nearby
- `'prayer_reminders'` - Reminder about committed prayers

**Usage:**
```typescript
const { data: shouldSend } = await supabase.rpc('should_send_notification', {
  p_user_id: userId,
  p_notification_type: 'prayer_responses'
});

if (shouldSend) {
  // Send notification
}
```

### `mark_token_used(token_id BIGINT)`

Updates `last_used_at` after successfully sending a notification.

**Usage:**
```typescript
await supabase.rpc('mark_token_used', {
  p_token_id: tokenId
});
```

### `deactivate_stale_tokens()`

Marks tokens inactive if unused for 90+ days. Run as scheduled job.

**Usage:**
```typescript
const { data: deactivatedCount } = await supabase.rpc('deactivate_stale_tokens');
console.log(`Deactivated ${deactivatedCount} stale tokens`);
```

## Frontend Integration

### Registering a Push Token

When a user enables notifications or logs in:

```typescript
import { pushNotificationService } from '@/services/pushNotificationService';

// Initialize push notifications
await pushNotificationService.initialize();

// This will:
// 1. Request permissions
// 2. Register with FCM/APNs
// 3. Automatically save token to database via registerDevice()
```

The `pushNotificationService.ts` already handles token registration using:

```typescript
await supabase
  .from('user_push_tokens')
  .upsert({
    user_id: user.id,
    token: token,
    platform: platform,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,platform'
  });
```

### Unregistering on Logout

```typescript
// In AuthContext logout function
await pushNotificationService.unregisterDevice();
```

### Managing Notification Preferences

```typescript
// Update user preferences
await supabase
  .from('profiles')
  .update({
    notification_preferences: {
      push_enabled: true,
      prayer_responses: true,
      prayer_support: true,
      nearby_prayers: false,
      prayer_reminders: true,
      quiet_hours_enabled: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00'
    }
  })
  .eq('id', userId);
```

### Partial Updates (Toggle Specific Preference)

```typescript
// Toggle just one preference
const { data: profile } = await supabase
  .from('profiles')
  .select('notification_preferences')
  .eq('id', userId)
  .single();

const updated = {
  ...profile.notification_preferences,
  prayer_responses: false // Disable prayer response notifications
};

await supabase
  .from('profiles')
  .update({ notification_preferences: updated })
  .eq('id', userId);
```

## Backend Integration (Edge Functions)

### Sending Notifications

Create an edge function (e.g., `supabase/functions/send-prayer-notification/index.ts`):

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

serve(async (req) => {
  const { userId, notificationType, title, body, data } = await req.json();

  // Create Supabase client with service role
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service role bypasses RLS
  );

  // Check if user wants this notification
  const { data: shouldSend } = await supabase.rpc('should_send_notification', {
    p_user_id: userId,
    p_notification_type: notificationType
  });

  if (!shouldSend) {
    return new Response(JSON.stringify({ sent: false, reason: 'User preferences' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get active push tokens
  const { data: tokens } = await supabase.rpc('get_active_push_tokens', {
    p_user_id: userId
  });

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: false, reason: 'No tokens' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Send to FCM/APNs for each token
  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      try {
        // Send via FCM (for Android/iOS/Web)
        await sendFCMNotification(token.token, {
          title,
          body,
          data
        });

        // Mark token as used
        await supabase.rpc('mark_token_used', { p_token_id: token.id });

        return { success: true, tokenId: token.id };
      } catch (error: any) {
        // If token is invalid, mark as inactive
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          await supabase
            .from('user_push_tokens')
            .update({ is_active: false })
            .eq('id', token.id);
        }
        return { success: false, error: error.message };
      }
    })
  );

  return new Response(JSON.stringify({ sent: true, results }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

async function sendFCMNotification(token: string, notification: any) {
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${FCM_SERVER_KEY}`
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'FCM send failed');
  }

  return response.json();
}
```

### Triggering Notifications from Database Events

Use Supabase webhooks or database triggers to call edge functions:

```sql
-- Example: Trigger notification when prayer response is created
CREATE OR REPLACE FUNCTION notify_prayer_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prayer_owner_id UUID;
BEGIN
  -- Get prayer owner
  SELECT user_id INTO v_prayer_owner_id
  FROM prayers
  WHERE id = NEW.prayer_id;

  -- Call edge function (via HTTP or pg_net extension)
  -- This is simplified - actual implementation would use pg_net or webhooks
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-prayer-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := jsonb_build_object(
      'userId', v_prayer_owner_id,
      'notificationType', 'prayer_responses',
      'title', 'New Prayer Response',
      'body', 'Someone responded to your prayer',
      'data', jsonb_build_object('prayer_id', NEW.prayer_id, 'response_id', NEW.id)
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_prayer_response_created
  AFTER INSERT ON prayer_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_prayer_response();
```

## Scheduled Jobs

### Cleanup Stale Tokens

Set up a Supabase cron job to run weekly:

```sql
-- Run via pg_cron (if available) or external cron job
SELECT cron.schedule(
  'cleanup-stale-push-tokens',
  '0 3 * * 0', -- Every Sunday at 3 AM
  $$SELECT deactivate_stale_tokens()$$
);
```

Or call from an edge function via cron service (cron-job.org, GitHub Actions, etc.):

```typescript
// supabase/functions/cleanup-stale-tokens/index.ts
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: count } = await supabase.rpc('deactivate_stale_tokens');

  return new Response(JSON.stringify({ deactivated: count }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## Security Considerations

1. **RLS Policies**: Users can only view/manage their own tokens
2. **Service Role**: Only edge functions with service role key can read all tokens
3. **Token Privacy**: FCM/APNs tokens are not sensitive (can't be used without server key)
4. **Rate Limiting**: Implement at edge function level to prevent abuse
5. **Quiet Hours**: Respect user preferences to maintain trust

## Monitoring

### Active Tokens by Platform

```sql
SELECT platform, COUNT(*) as active_tokens
FROM user_push_tokens
WHERE is_active = true
GROUP BY platform;
```

### Users with Multiple Devices

```sql
SELECT user_id, COUNT(*) as device_count
FROM user_push_tokens
WHERE is_active = true
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY device_count DESC;
```

### Stale Tokens (30+ days unused)

```sql
SELECT COUNT(*) as stale_tokens
FROM user_push_tokens
WHERE is_active = true
  AND (last_used_at < now() - INTERVAL '30 days' OR last_used_at IS NULL);
```

## Testing

### Manual Test Queries

```sql
-- 1. Register a test token
INSERT INTO user_push_tokens (user_id, token, platform, device_id)
VALUES (auth.uid(), 'test_token_12345', 'android', 'android_12345_abc');

-- 2. Get active tokens
SELECT * FROM get_active_push_tokens(auth.uid());

-- 3. Check notification preferences
SELECT should_send_notification(auth.uid(), 'prayer_responses');

-- 4. Update preferences
UPDATE profiles
SET notification_preferences = notification_preferences || '{"prayer_responses": false}'::jsonb
WHERE id = auth.uid();

-- 5. Mark token as used
SELECT mark_token_used(1);

-- 6. Deactivate token
UPDATE user_push_tokens
SET is_active = false
WHERE user_id = auth.uid() AND platform = 'android';
```

## Troubleshooting

### Notifications not sending?

1. Check if user has active tokens: `SELECT * FROM get_active_push_tokens(user_id)`
2. Check preferences: `SELECT should_send_notification(user_id, 'prayer_responses')`
3. Verify FCM server key is configured in edge function
4. Check edge function logs for errors

### Duplicate tokens?

- The unique constraint `(user_id, platform, token)` prevents duplicates
- Use `upsert` with `onConflict: 'user_id,platform'` to update existing tokens

### Stale tokens accumulating?

- Run `deactivate_stale_tokens()` regularly
- Consider lowering the 90-day threshold if needed

## Next Steps

1. **Create Edge Function**: Implement `send-prayer-notification` function
2. **Set up FCM**: Configure Firebase Cloud Messaging project
3. **Add Webhooks**: Trigger notifications on prayer events
4. **Implement Analytics**: Track notification delivery rates
5. **Add Rate Limiting**: Prevent notification spam
6. **Test Thoroughly**: iOS, Android, and Web platforms

## Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [Capacitor Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
