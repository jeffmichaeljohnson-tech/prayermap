# Send Notification Edge Function

Sends push notifications to user devices via Firebase Cloud Messaging (FCM).

## Overview

This edge function is automatically triggered when:
- A user receives prayer support (someone taps "Prayer Sent")
- A user receives a prayer response (text, audio, or video)
- A user's prayer is marked as answered (future)

## Trigger Methods

### Method 1: Database Trigger (pg_net)

The migration creates a trigger that calls this function automatically:

```sql
CREATE TRIGGER on_notification_send_push
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_push_notification();
```

**Pros:**
- Fully automatic
- No additional configuration needed (after database settings)
- Fast and reliable

**Cons:**
- Requires database settings configuration
- Harder to debug

### Method 2: Database Webhook

Configure in Supabase Dashboard → Database → Webhooks

**Pros:**
- Easy to configure via UI
- Can see webhook delivery status

**Cons:**
- Requires manual setup in dashboard

## Environment Variables

```bash
# Required
FCM_SERVER_KEY="AAAA..."

# Auto-set by Supabase
SUPABASE_URL="https://..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

## Testing

```bash
# View logs
npx supabase functions logs send-notification --follow

# Test locally
npx supabase functions serve send-notification
```

See [README in /docs/PUSH_NOTIFICATIONS_SETUP.md](../../../docs/PUSH_NOTIFICATIONS_SETUP.md) for full documentation.
