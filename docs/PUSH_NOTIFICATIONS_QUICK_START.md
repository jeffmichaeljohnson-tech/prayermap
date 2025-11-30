# Push Notifications Quick Start

> **TL;DR:** Get push notifications working in 5 minutes.

## Prerequisites

- Firebase project with FCM enabled
- FCM Server Key from Firebase Console
- Supabase CLI installed

## Setup (5 Steps)

### 1. Run Migration

```bash
npx supabase db push
```

### 2. Configure Database

```sql
-- Run in Supabase SQL Editor
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

### 3. Deploy Edge Function

```bash
npx supabase functions deploy send-notification
npx supabase secrets set FCM_SERVER_KEY="YOUR_FCM_SERVER_KEY"
```

### 4. Test It

```bash
# Replace with your values
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "notification_id": 1,
    "user_id": "YOUR_USER_UUID",
    "type": "SUPPORT_RECEIVED",
    "payload": {
      "prayer_id": 123,
      "supporter_name": "Test",
      "message": "Test notification"
    }
  }'
```

### 5. Verify

Check edge function logs:
```bash
npx supabase functions logs send-notification
```

## Common Issues

**"Function not found"**
→ Deploy edge function: `npx supabase functions deploy send-notification`

**"FCM_SERVER_KEY not configured"**
→ Set secret: `npx supabase secrets set FCM_SERVER_KEY="..."`

**"No push tokens found"**
→ User needs to login on mobile app to register device

**"Unauthorized FCM error"**
→ Verify FCM server key is correct (starts with `AAAA...`)

## How It Works

```
1. User A supports User B's prayer
   ↓
2. Database trigger creates notification
   ↓
3. pg_net calls send-notification edge function
   ↓
4. Edge function queries user_push_tokens for User B
   ↓
5. Sends push via FCM to User B's devices
   ↓
6. User B receives notification
```

## Files Created

- `/supabase/migrations/20250130_push_notification_system.sql` - Database schema
- `/supabase/functions/send-notification/index.ts` - Edge function
- `/docs/PUSH_NOTIFICATIONS_SETUP.md` - Full documentation

## Next Steps

1. Configure Firebase for Android (`google-services.json`)
2. Configure Firebase for iOS (`GoogleService-Info.plist`)
3. Enable push permissions in mobile app
4. Set up Database Webhook (alternative to pg_net)

See [PUSH_NOTIFICATIONS_SETUP.md](./PUSH_NOTIFICATIONS_SETUP.md) for detailed instructions.
