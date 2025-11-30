# Push Notifications Cheat Sheet

Quick reference for PrayerMap push notifications.

## 🚀 Quick Deploy

```bash
# 1. Run migration
npx supabase db push

# 2. Configure database (replace values)
psql -c "ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT.supabase.co';"
psql -c "ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_KEY';"

# 3. Deploy function
npx supabase functions deploy send-notification
npx supabase secrets set FCM_SERVER_KEY="YOUR_FCM_KEY"

# 4. Test
./scripts/test-push-notification.sh
```

## 🔍 Debug Commands

```bash
# View logs
npx supabase functions logs send-notification --follow

# Test locally
npx supabase functions serve send-notification

# Check trigger exists
psql -c "SELECT * FROM pg_trigger WHERE tgname = 'on_notification_send_push';"

# Check secrets
npx supabase secrets list

# Test with curl
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-notification \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"notification_id":1,"user_id":"UUID","type":"SUPPORT_RECEIVED","payload":{"prayer_id":123,"supporter_name":"Test","message":"Test"}}'
```

## 📊 Database Queries

```sql
-- Check registered tokens
SELECT user_id, platform, enabled, last_used_at
FROM user_push_tokens
ORDER BY created_at DESC;

-- Find stale tokens
SELECT *
FROM user_push_tokens
WHERE enabled = true
  AND (last_used_at IS NULL OR last_used_at < now() - INTERVAL '7 days');

-- Cleanup stale tokens
SELECT cleanup_stale_push_tokens();

-- Count notifications today
SELECT type, COUNT(*)
FROM notifications
WHERE created_at > CURRENT_DATE
GROUP BY type;
```

## 🔧 Common Fixes

| Issue | Solution |
|-------|----------|
| Function not found | `npx supabase functions deploy send-notification` |
| FCM not configured | `npx supabase secrets set FCM_SERVER_KEY="..."` |
| No tokens found | User needs to login on mobile |
| Unauthorized FCM | Verify FCM server key (starts with `AAAA...`) |
| iOS not receiving | Check APNs cert in Firebase + Xcode capabilities |
| Android not receiving | Check `google-services.json` + FCM API enabled |

## 📱 Mobile Setup

**Android:**
1. Add `google-services.json` to `/android/app/`
2. Enable FCM API in Google Cloud Console

**iOS:**
1. Add `GoogleService-Info.plist` to Xcode
2. Enable Push Notifications capability
3. Upload APNs certificate to Firebase

## 🔐 Required Secrets

```bash
# From Firebase Console → Project Settings → Cloud Messaging
FCM_SERVER_KEY="AAAA..."

# Auto-set by Supabase
SUPABASE_URL="https://..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

## 📚 Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20250130_push_notification_system.sql` | Database schema |
| `supabase/functions/send-notification/index.ts` | Edge function |
| `docs/PUSH_NOTIFICATIONS_SETUP.md` | Full guide |
| `docs/PUSH_NOTIFICATIONS_QUICK_START.md` | 5-min setup |
| `scripts/test-push-notification.sh` | Test script |

## 🎯 Notification Types

| Type | Trigger | Title | Body |
|------|---------|-------|------|
| `SUPPORT_RECEIVED` | Someone prays | "Prayer Support Received" | "[Name] prayed for you" |
| `RESPONSE_RECEIVED` | Someone responds | "New Prayer Response" | "[Name] responded to your prayer" |
| `PRAYER_ANSWERED` | Prayer marked answered | "Prayer Answered!" | "Your prayer has been marked as answered" |

## ⚡ Performance

- Notification insert: < 10ms
- Edge function: 200-500ms/device
- FCM delivery: 1-3 seconds
- Limit: 600K messages/min (FCM)

## 🔗 Quick Links

- [Quick Start](./PUSH_NOTIFICATIONS_QUICK_START.md)
- [Full Setup](./PUSH_NOTIFICATIONS_SETUP.md)
- [Delivery Summary](../PUSH_NOTIFICATIONS_DELIVERY.md)
- [Edge Function Docs](../supabase/functions/send-notification/README.md)

---
Print this page for quick reference!
