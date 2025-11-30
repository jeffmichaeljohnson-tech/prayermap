# Nearby Prayer Notification API Reference

Quick reference for developers working with the nearby prayer notification system.

## Notification Payload Structure

### Database Notification Record

```typescript
interface NearbyPrayerNotification {
  notification_id: number;
  user_id: string; // UUID of user receiving notification
  type: 'NEARBY_PRAYER';
  payload: {
    prayer_id: number;
    title: string; // "Someone nearby needs prayer"
    body: string; // Prayer title or preview
    distance_km: number; // Distance from user to prayer
    preview: string; // First 100 chars of prayer text
  };
  is_read: boolean;
  read_at: string | null;
  created_at: string; // ISO timestamp
}
```

### Push Notification Payload

**Android (FCM):**
```json
{
  "notification": {
    "title": "Someone nearby needs prayer",
    "body": "Please pray for healing and strength",
    "sound": "default"
  },
  "data": {
    "type": "NEARBY_PRAYER",
    "prayer_id": "12345",
    "distance_km": "5.2"
  },
  "priority": "high"
}
```

**iOS (APNs):**
```json
{
  "aps": {
    "alert": {
      "title": "Someone nearby needs prayer",
      "body": "Please pray for healing and strength"
    },
    "sound": "default",
    "content-available": 1
  },
  "type": "NEARBY_PRAYER",
  "prayer_id": "12345",
  "distance_km": 5.2
}
```

## Database Functions

### Check Rate Limit

```sql
SELECT check_notification_rate_limit(
  p_user_id := 'user-uuid',
  p_notification_type := 'NEARBY_PRAYER',
  p_rate_limit_minutes := 60 -- Default: 1 hour
);
-- Returns: true (can send) or false (rate limited)
```

### Update Rate Limit

```sql
SELECT update_notification_rate_limit(
  p_user_id := 'user-uuid',
  p_notification_type := 'NEARBY_PRAYER'
);
-- Updates last_sent_at to now()
```

### Get User Preferences

```sql
SELECT * FROM get_user_notification_preferences('user-uuid');
-- Returns:
-- nearby_prayers_enabled (boolean)
-- prayer_support_enabled (boolean)
-- prayer_response_enabled (boolean)
-- prayer_answered_enabled (boolean)
-- push_notifications_enabled (boolean)
-- notification_radius_km (integer)
```

### Manually Trigger Notification

```sql
SELECT notify_nearby_users_of_prayer(
  p_prayer_id := 12345,
  p_prayer_location := ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography,
  p_prayer_creator_id := 'creator-user-uuid',
  p_prayer_title := 'Prayer for healing',
  p_prayer_preview := 'Please pray for my mother who is sick'
);
-- Returns: count of notifications created (integer)
```

## Frontend API

### Register Push Token

```typescript
import { supabase } from '@/lib/supabase';

async function registerPushToken(token: string, platform: 'ios' | 'android' | 'web') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_push_tokens')
    .upsert({
      user_id: user.id,
      token: token,
      platform: platform,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,platform,token'
    });

  if (error) throw error;
}
```

### Get Notification Preferences

```typescript
import { supabase } from '@/lib/supabase';

async function getNotificationPreferences() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  // Return defaults if no preferences set
  return data || {
    nearby_prayers_enabled: true,
    prayer_support_enabled: true,
    prayer_response_enabled: true,
    prayer_answered_enabled: true,
    push_notifications_enabled: true
  };
}
```

### Update Notification Preferences

```typescript
import { supabase } from '@/lib/supabase';

interface NotificationPreferences {
  nearby_prayers_enabled: boolean;
  prayer_support_enabled: boolean;
  prayer_response_enabled: boolean;
  prayer_answered_enabled: boolean;
  push_notifications_enabled: boolean;
}

async function updateNotificationPreferences(preferences: NotificationPreferences) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: user.id,
      ...preferences,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}
```

### Get Unread Nearby Prayer Notifications

```typescript
import { supabase } from '@/lib/supabase';

async function getUnreadNearbyPrayers() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'NEARBY_PRAYER')
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

### Mark Notification as Read

```typescript
import { supabase } from '@/lib/supabase';

async function markNotificationRead(notificationId: number) {
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('notification_id', notificationId);

  if (error) throw error;
}
```

### Update Notification Radius

```typescript
import { supabase } from '@/lib/supabase';

async function updateNotificationRadius(radiusMiles: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Convert miles to kilometers (database stores km)
  const radiusKm = Math.round(radiusMiles * 1.60934);

  const { error } = await supabase
    .from('users')
    .update({
      notification_radius_km: radiusKm,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  if (error) throw error;
}
```

## Edge Function API

### Invoke Manually

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/nearby-prayer-notify \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Response Format

```json
{
  "success": true,
  "processed": 15,
  "sent": 12,
  "failed": 3
}
```

## Realtime Subscriptions

### Subscribe to Nearby Prayer Notifications

```typescript
import { supabase } from '@/lib/supabase';

function subscribeToNearbyPrayers(userId: string, callback: (notification: any) => void) {
  const subscription = supabase
    .channel('nearby-prayer-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.new.type === 'NEARBY_PRAYER') {
          callback(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

// Usage
const unsubscribe = subscribeToNearbyPrayers(
  userId,
  (notification) => {
    console.log('New nearby prayer:', notification);
    // Show in-app notification toast
    // Update badge count
    // Play sound
  }
);

// Cleanup
unsubscribe();
```

## React Hook Example

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface NotificationPreferences {
  nearby_prayers_enabled: boolean;
  prayer_support_enabled: boolean;
  prayer_response_enabled: boolean;
  prayer_answered_enabled: boolean;
  push_notifications_enabled: boolean;
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    nearby_prayers_enabled: true,
    prayer_support_enabled: true,
    prayer_response_enabled: true,
    prayer_answered_enabled: true,
    push_notifications_enabled: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
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
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updatePreference(key: keyof NotificationPreferences, value: boolean) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);

      await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...newPreferences,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert on error
      loadPreferences();
    }
  }

  return {
    preferences,
    loading,
    updatePreference,
    refresh: loadPreferences
  };
}

// Usage in component
function NotificationSettings() {
  const { preferences, loading, updatePreference } = useNotificationPreferences();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={preferences.nearby_prayers_enabled}
          onChange={(e) => updatePreference('nearby_prayers_enabled', e.target.checked)}
        />
        Notify me of nearby prayer requests
      </label>
    </div>
  );
}
```

## Monitoring Queries

### Active Push Tokens by Platform

```sql
SELECT
  platform,
  COUNT(*) as active_tokens,
  COUNT(DISTINCT user_id) as unique_users
FROM user_push_tokens
WHERE is_active = true
GROUP BY platform;
```

### Recent Nearby Prayer Notifications

```sql
SELECT
  n.notification_id,
  n.user_id,
  n.payload->>'prayer_id' as prayer_id,
  n.payload->>'distance_km' as distance_km,
  n.is_read,
  n.created_at
FROM notifications n
WHERE n.type = 'NEARBY_PRAYER'
  AND n.created_at > now() - interval '24 hours'
ORDER BY n.created_at DESC
LIMIT 100;
```

### Rate Limit Statistics

```sql
SELECT
  COUNT(*) as users_rate_limited,
  AVG(sent_count) as avg_notifications_sent,
  MAX(sent_count) as max_notifications_sent
FROM notification_rate_limits
WHERE notification_type = 'NEARBY_PRAYER'
  AND last_sent_at > now() - interval '1 hour';
```

### Notification Preferences Distribution

```sql
SELECT
  COUNT(*) FILTER (WHERE nearby_prayers_enabled = true) as enabled,
  COUNT(*) FILTER (WHERE nearby_prayers_enabled = false) as disabled,
  COUNT(*) FILTER (WHERE nearby_prayers_enabled IS NULL) as not_set
FROM notification_preferences;
```

## Common Patterns

### Complete Registration Flow

```typescript
import { pushNotificationService } from '@/services/pushNotificationService';
import { supabase } from '@/lib/supabase';

async function setupPushNotifications() {
  // 1. Initialize Capacitor push notifications
  await pushNotificationService.initialize();

  // 2. Token is automatically registered via pushNotificationService
  // (See pushNotificationService.ts - registerDevice method)

  // 3. Set default preferences if not already set
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existingPrefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!existingPrefs) {
    await supabase
      .from('notification_preferences')
      .insert({
        user_id: user.id,
        nearby_prayers_enabled: true,
        prayer_support_enabled: true,
        prayer_response_enabled: true,
        prayer_answered_enabled: true,
        push_notifications_enabled: true
      });
  }
}
```

### Handle Notification Tap

```typescript
// Already implemented in pushNotificationService.ts
// When user taps notification, app navigates to:
// window.location.href = `/prayer/${prayer_id}`;
```

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `PGRST116` | No rows returned | Normal for first-time preference query |
| `23505` | Unique constraint violation | Token already registered |
| `23503` | Foreign key violation | User doesn't exist |
| `42P01` | Table doesn't exist | Run migration first |

## Testing Commands

### Create Test Notification

```sql
-- Insert test notification
INSERT INTO notifications (user_id, type, payload)
VALUES (
  'your-user-uuid',
  'NEARBY_PRAYER',
  jsonb_build_object(
    'prayer_id', 123,
    'title', 'Someone nearby needs prayer',
    'body', 'Test prayer request',
    'distance_km', 5.0,
    'preview', 'This is a test notification'
  )
);
```

### Check If User Would Receive Notification

```sql
SELECT
  u.user_id,
  u.first_name,
  u.notification_radius_km,
  COALESCE(np.nearby_prayers_enabled, true) as will_receive,
  check_notification_rate_limit(u.user_id, 'NEARBY_PRAYER', 60) as not_rate_limited
FROM users u
LEFT JOIN notification_preferences np ON u.user_id = np.user_id
WHERE u.user_id = 'your-user-uuid';
```

## Performance Tips

1. **Batch queries** - Use `in` clause for multiple user lookups
2. **Use indexes** - All spatial queries use GIST indexes automatically
3. **Limit results** - Functions already limit to 100 notifications per prayer
4. **Cache preferences** - Store in React state, only fetch on mount
5. **Debounce updates** - Don't update preferences on every keystroke

## Security Checklist

- ✅ RLS enabled on all tables
- ✅ Users can only access their own tokens
- ✅ Users can only modify their own preferences
- ✅ Edge function uses service role (elevated privileges)
- ✅ Rate limiting prevents spam
- ✅ Notification content is sanitized (first 100 chars only)

---

**For full documentation, see `/home/user/prayermap/docs/NEARBY_PRAYER_NOTIFICATIONS.md`**
