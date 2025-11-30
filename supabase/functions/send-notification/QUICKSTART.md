# Push Notifications Quick Start

This is a quick reference for deploying and using the push notification system.

## Files Created

```
supabase/
├── functions/
│   └── send-notification/
│       ├── index.ts           # Edge function (FCM sender)
│       ├── deno.json          # Deno configuration
│       ├── .env.example       # Environment variables template
│       ├── README.md          # Detailed documentation
│       ├── QUICKSTART.md      # This file
│       └── test.sh            # Test script
│
└── migrations/
    ├── 002_push_notifications.sql  # Creates user_push_tokens table
    └── 003_notification_triggers.sql # Auto-triggers on notifications

docs/
└── PUSH_NOTIFICATIONS_SETUP.md    # Complete setup guide
```

## Setup (5 Minutes)

### 1. Firebase Setup

```bash
# 1. Go to https://console.firebase.google.com
# 2. Create/select project
# 3. Go to Project Settings → Cloud Messaging
# 4. Copy "Server Key" (under Cloud Messaging API - Legacy)
```

### 2. Set Supabase Secret

```bash
supabase secrets set FCM_SERVER_KEY=your-server-key-here
```

### 3. Deploy Database

```bash
# Apply migrations
supabase db push

# Or manually:
psql $DATABASE_URL -f supabase/migrations/002_push_notifications.sql
psql $DATABASE_URL -f supabase/migrations/003_notification_triggers.sql
```

### 4. Deploy Edge Function

```bash
supabase functions deploy send-notification
```

### 5. Configure Database (Important!)

```sql
-- In Supabase SQL Editor:
ALTER DATABASE postgres
SET app.edge_function_url = 'https://YOUR-PROJECT.supabase.co';

-- Don't set service_role_key in SQL, it's automatically available
```

## Testing

### Test Edge Function Directly

```bash
cd supabase/functions/send-notification

# Set environment
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Run test script
./test.sh your-user-uuid
```

### Test via curl

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-notification' \
  -H 'Authorization: Bearer SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "notification_id": 1,
    "user_id": "user-uuid",
    "type": "SUPPORT_RECEIVED",
    "payload": {
      "prayer_id": 123,
      "supporter_name": "Marcus"
    }
  }'
```

### Test End-to-End

1. Install app on device (iOS or Android)
2. Log in as User A
3. Post a prayer
4. Log in as User B (different device/account)
5. Respond to User A's prayer
6. User A should receive push notification

## Monitoring

### View Edge Function Logs

```bash
# Real-time
supabase functions logs send-notification --tail

# Last hour
supabase functions logs send-notification --since 1h
```

### Check Database

```sql
-- Recent notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- User's push tokens
SELECT * FROM user_push_tokens WHERE user_id = 'uuid';

-- Notification preferences
SELECT notifications_enabled, quiet_hours_start, quiet_hours_end
FROM profiles WHERE id = 'uuid';
```

### Check pg_net Queue (Trigger Method)

```sql
-- Pending requests
SELECT * FROM net.http_request_queue
ORDER BY created_at DESC LIMIT 10;

-- Failed requests
SELECT * FROM net.http_request_queue
WHERE status = 'ERROR';
```

## Common Issues

### No notifications sent

**Check:**
1. `FCM_SERVER_KEY` secret is set
2. User has push tokens in `user_push_tokens` table
3. `notifications_enabled = true` in user's profile
4. Not during user's quiet hours
5. Edge function logs for errors

### Invalid token errors

**Solution:** Edge function automatically removes invalid tokens. User needs to restart app to re-register.

### Trigger not firing

**Check:**
1. Database setting: `SHOW app.edge_function_url;`
2. Trigger exists: `\d+ prayer_responses` (should show trigger)
3. pg_net queue: `SELECT * FROM net.http_request_queue;`

## Architecture Flow

```
User B responds to prayer
         ↓
INSERT INTO prayer_responses
         ↓
Trigger: on_prayer_response_created
         ↓
Function: notify_on_prayer_response()
         ↓
INSERT INTO notifications
         ↓
HTTP POST via pg_net
         ↓
Edge Function: send-notification
         ↓
Fetch user's push tokens
         ↓
POST to FCM API
         ↓
FCM delivers to device
         ↓
User A receives notification
```

## Key Features

✅ **Multi-device support** - Send to all user's registered devices
✅ **Platform-specific** - iOS (APNs) and Android (FCM) handled automatically
✅ **Badge counts** - iOS badge shows unread notification count
✅ **Notification preferences** - Respects user's enabled/disabled setting
✅ **Quiet hours** - Blocks notifications during user's sleep hours
✅ **Invalid token cleanup** - Automatically removes expired tokens
✅ **Rate limiting** - 100 notifications/minute per user
✅ **Error handling** - Graceful failures, detailed logging

## API Reference

### Notification Types

- `SUPPORT_RECEIVED` - Someone prayed for your prayer
- `RESPONSE_RECEIVED` - Someone responded to your prayer
- `PRAYER_ANSWERED` - Prayer marked as answered (future)

### Payload Structure

```typescript
{
  notification_id: number;          // From notifications table
  user_id: string;                  // Recipient UUID
  type: NotificationType;           // See above
  payload: {
    prayer_id?: number;             // Related prayer
    response_id?: number;           // Related response
    supporter_name?: string;        // Name for SUPPORT_RECEIVED
    responder_name?: string;        // Name for RESPONSE_RECEIVED
    message?: string;               // Custom message
    response_preview?: string;      // Preview text
  };
}
```

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Deploy edge function
3. ✅ Apply database migrations
4. ✅ Configure database settings
5. ✅ Test with real devices
6. ⬜ Configure iOS APNs certificate in Firebase
7. ⬜ Add Android google-services.json
8. ⬜ Implement client-side notification handling
9. ⬜ Set up monitoring/alerts
10. ⬜ Consider migrating to FCM HTTP v1 API (not deprecated)

## Resources

- **Full Setup Guide:** `/docs/PUSH_NOTIFICATIONS_SETUP.md`
- **Detailed README:** `./README.md`
- **Test Script:** `./test.sh`
- **Edge Function Code:** `./index.ts`
- **Migrations:** `../migrations/002_*.sql` and `003_*.sql`

## Support

- View logs: `supabase functions logs send-notification`
- Check migrations: `supabase db diff`
- Test locally: `supabase functions serve send-notification`

For detailed troubleshooting, see the main setup guide.
