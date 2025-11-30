# Migration Compatibility Note

## Important: Existing Push Notification Infrastructure

The codebase contains an **earlier, more comprehensive** push notification migration:

**File:** `/supabase/migrations/017_add_push_tokens.sql`

This migration includes:
- ✅ `user_push_tokens` table (more fields than the new migration)
- ✅ Notification preferences (quiet hours, type-specific settings)
- ✅ Helper functions (`get_active_push_tokens`, `should_send_notification`, etc.)
- ✅ Integration with `profiles` table
- ✅ More sophisticated token management

## Comparison

### Migration 017 (Existing - COMPREHENSIVE)
- Device metadata (device_name, model, OS version, app version)
- Notification preferences in profiles table
- Quiet hours support
- Type-specific notification toggles
- Helper functions: `get_active_push_tokens()`, `should_send_notification()`, `mark_token_used()`, `deactivate_stale_tokens()`
- More sophisticated RLS policies

### Migration 20250130 (New - SIMPLIFIED)
- Basic `user_push_tokens` table
- Automatic trigger to call edge function
- Simpler schema focused on core functionality
- pg_net integration for automatic notifications

## Recommended Action

**BEFORE deploying the new migration:**

1. **Check if 017_add_push_tokens.sql has been applied:**
   ```bash
   npx supabase db remote changes
   ```

2. **If 017 is already applied:**
   - Skip the table creation in the new migration
   - Only apply the trigger function
   - Use existing helper functions in edge function

3. **If 017 is NOT applied:**
   - Consider using 017 instead (more feature-rich)
   - Or merge both migrations

## Solution: Use Existing Schema + New Trigger

The best approach is to:

1. **Keep the existing 017 migration** (if applied)
2. **Add only the trigger** from the new migration
3. **Update the edge function** to use the existing helper functions

### Modified Migration (If 017 exists)

```sql
-- Only add the trigger, table already exists from 017

-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to trigger push notification sending
CREATE OR REPLACE FUNCTION trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    function_url TEXT;
    service_role_key TEXT;
    request_id BIGINT;
BEGIN
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification';
    service_role_key := current_setting('app.settings.service_role_key', true);

    IF function_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING 'Supabase URL or service role key not configured';
        RETURN NEW;
    END IF;

    SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'notification_id', NEW.notification_id,
            'user_id', NEW.user_id,
            'type', NEW.type,
            'payload', NEW.payload
        )
    ) INTO request_id;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to trigger push notification: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_notification_send_push ON notifications;
CREATE TRIGGER on_notification_send_push
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_push_notification();
```

### Modified Edge Function

Update `/supabase/functions/send-notification/index.ts` to use existing helper functions:

```typescript
// Instead of direct query:
const { data: tokens } = await supabase
  .from('user_push_tokens')
  .select('*')
  .eq('user_id', notification.user_id)
  .eq('enabled', true);

// Use existing helper function:
const { data: tokens } = await supabase.rpc('get_active_push_tokens', {
  p_user_id: notification.user_id
});

// Check notification preferences:
const { data: shouldSend } = await supabase.rpc('should_send_notification', {
  p_user_id: notification.user_id,
  p_notification_type: getNotificationType(notification.type)
});

if (!shouldSend) {
  return { success: true, sent: 0, message: 'User preferences prevent notification' };
}

// After sending, mark token as used:
await supabase.rpc('mark_token_used', { p_token_id: token.id });
```

## Next Steps

1. Check which migrations have been applied
2. If 017 exists, use the trigger-only approach
3. Update edge function to use existing helper functions
4. Test with existing notification preferences
5. Document the integration with the more comprehensive system

