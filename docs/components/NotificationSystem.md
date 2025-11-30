# Notification System Documentation

> **Beautiful, real-time notification center for PrayerMap**
>
> Built with React Query, Supabase Realtime, and Framer Motion

---

## Overview

The PrayerMap notification system provides a beautiful, performant way to notify users of:
- Prayer support received (someone pressed "Prayer Sent")
- Prayer responses received (text, audio, or video)
- Prayer answered notifications (future feature)

### Key Features

✅ **Real-time updates** - Instant notification delivery via Supabase Realtime
✅ **Optimistic updates** - Instant UI feedback before server confirmation
✅ **Intelligent caching** - React Query with stale-while-revalidate pattern
✅ **Beautiful animations** - Framer Motion with reduced motion support
✅ **Mobile optimized** - Bottom sheet on mobile, side panel on desktop
✅ **Swipe to dismiss** - Natural mobile gestures
✅ **Haptic feedback** - Vibration on new notifications (mobile)
✅ **Accessibility** - WCAG 2.1 AA compliant

---

## Components

### 1. NotificationBell

**Location:** `/src/components/NotificationBell.tsx`

The trigger button that opens the notification center.

#### Features:
- Bell icon with unread badge count
- Pulse animation when new notification arrives
- Bell shake animation for delight
- Haptic feedback on mobile
- Reduced motion support

#### Props:
```typescript
interface NotificationBellProps {
  userId: string | null;
  onNavigateToPrayer?: (prayerId: string) => void;
  className?: string;
}
```

#### Usage:
```tsx
import { NotificationBell } from './components/NotificationBell';
import { useAuth } from './hooks/useAuth';

function Header() {
  const { user } = useAuth();

  return (
    <header>
      <NotificationBell
        userId={user?.id || null}
        onNavigateToPrayer={(prayerId) => navigate(`/prayer/${prayerId}`)}
      />
    </header>
  );
}
```

---

### 2. NotificationCenter

**Location:** `/src/components/NotificationCenter.tsx`

The slide-out panel that displays notifications.

#### Features:
- Slide from right on desktop, bottom sheet on mobile
- Grouped by date (Today, Yesterday, This Week, Earlier)
- Distinct styling per notification type
- Auto mark-as-read on view (1s delay)
- Click to navigate to related prayer
- Empty state with encouragement
- Mark all as read button

#### Props:
```typescript
interface NotificationCenterProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPrayer?: (prayerId: string) => void;
}
```

#### Notification Types:

| Type | Icon | Color | Description |
|------|------|-------|-------------|
| `SUPPORT_RECEIVED` | Heart | Pink | Someone sent prayer support |
| `RESPONSE_RECEIVED` | MessageCircle | Blue | Someone responded to your prayer |
| `PRAYER_ANSWERED` | CheckCircle | Green | Prayer marked as answered (future) |

---

### 3. useNotifications Hook

**Location:** `/src/hooks/useNotifications.ts`

React Query hook for notification data management.

#### Features:
- Fetch notifications with caching
- Real-time subscription for new notifications
- Mark as read mutations (single & batch)
- Unread count tracking
- Optimistic updates

#### API:

```typescript
// Fetch notifications with real-time updates
const {
  notifications,    // Notification[]
  isLoading,        // boolean
  error,            // Error | null
  unreadCount,      // number
  hasNewNotification, // boolean (triggers animations)
  refetch           // () => Promise<void>
} = useNotifications(userId, {
  enabled: true,
  limit: 50
});

// Mark single notification as read
const { mutate: markAsRead } = useMarkNotificationAsRead();
markAsRead(notificationId);

// Mark all notifications as read
const { mutate: markAllAsRead } = useMarkAllNotificationsAsRead();
markAllAsRead(userId);
```

#### Types:

```typescript
export type NotificationType =
  | 'SUPPORT_RECEIVED'
  | 'RESPONSE_RECEIVED'
  | 'PRAYER_ANSWERED';

export interface Notification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  payload: {
    prayer_id?: string;
    response_id?: string;
    supporter_name?: string;
    responder_name?: string;
    message?: string;
    content_type?: 'text' | 'audio' | 'video';
    [key: string]: unknown;
  };
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
```

---

## Database Setup

### Schema

The notifications table is defined in `/docs/technical/DATABASE-SCHEMA.sql`:

```sql
CREATE TYPE notification_type AS ENUM (
    'SUPPORT_RECEIVED',
    'RESPONSE_RECEIVED',
    'PRAYER_ANSWERED'
);

CREATE TABLE notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    payload JSONB NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT valid_payload_structure CHECK (
        jsonb_typeof(payload) = 'object'
    )
);

CREATE INDEX notifications_user_id_unread_idx
  ON notifications (user_id, created_at DESC)
  WHERE is_read = false;

CREATE INDEX notifications_created_at_idx
  ON notifications (created_at DESC);
```

### Row Level Security (RLS)

**CRITICAL:** Set up RLS policies to ensure users can only access their own notifications:

```sql
-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications (no user context required)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
```

### Real-time Setup

Enable real-time updates for the notifications table:

1. **In SQL:**
```sql
ALTER TABLE notifications REPLICA IDENTITY FULL;
```

2. **In Supabase Dashboard:**
   - Go to Settings → Realtime
   - Enable real-time for the `notifications` table
   - Click "Save"

---

## Creating Notifications

### When someone sends prayer support:

```typescript
import { supabase } from '../lib/supabase';

async function sendPrayerSupport(prayerId: string, supporterId: string, supporterName: string) {
  // Your logic to record support...

  // Create notification for prayer owner
  const prayer = await getPrayerById(prayerId);

  await supabase.from('notifications').insert({
    user_id: prayer.user_id,
    type: 'SUPPORT_RECEIVED',
    payload: {
      prayer_id: prayerId,
      supporter_name: supporterName,
    },
  });
}
```

### When someone responds to a prayer:

```typescript
async function respondToPrayer(
  prayerId: string,
  responderId: string,
  responderName: string,
  message: string,
  contentType: 'text' | 'audio' | 'video',
  contentUrl?: string
) {
  // Create prayer response...
  const response = await createPrayerResponse(...);

  // Create notification for prayer owner
  const prayer = await getPrayerById(prayerId);

  await supabase.from('notifications').insert({
    user_id: prayer.user_id,
    type: 'RESPONSE_RECEIVED',
    payload: {
      prayer_id: prayerId,
      response_id: response.id,
      responder_name: responderName,
      message: message,
      content_type: contentType,
    },
  });
}
```

---

## Performance Optimizations

### React Query Caching

- **Stale time:** 30 seconds - fresh enough for notifications
- **Cache time:** 5 minutes - supports offline viewing
- **Background refetching:** On window focus and network reconnect
- **Optimistic updates:** Instant UI feedback

### Real-time Efficiency

- **User-specific subscriptions:** Only subscribe to current user's notifications
- **Automatic cleanup:** Unsubscribes when component unmounts
- **Debounced invalidation:** Prevents excessive refetches

### Mobile Optimizations

- **Polling interval:** 30 seconds for unread count (battery friendly)
- **Exponential backoff:** Retries with increasing delays on network errors
- **Cache persistence:** 5-minute retention for offline viewing
- **Haptic feedback:** 50ms vibration (doesn't drain battery)

---

## Animations

All animations use Framer Motion with reduced motion support.

### Bell Animations

| Animation | Duration | Trigger |
|-----------|----------|---------|
| Bell shake | 600ms | New notification arrives |
| Badge entrance | Spring | Badge appears |
| Pulse ring | 1.5s × 3 | New notification arrives |
| Hover scale | 200ms | Mouse hover |
| Tap scale | 200ms | Button press |

### Panel Animations

| Animation | Duration | Trigger |
|-----------|----------|---------|
| Slide in | Spring | Panel opens |
| Backdrop fade | 200ms | Panel opens/closes |
| List item stagger | 50ms per item | List renders |
| Swipe dismiss | 300ms | Swipe gesture |
| Unread glow | 2s loop | Unread notification |

### Reduced Motion Support

When user has `prefers-reduced-motion` enabled:
- ✅ All animations disabled
- ✅ Instant transitions
- ✅ No scale/rotate effects
- ✅ Fade-only for enter/exit

---

## Mobile Considerations

### Touch Targets

- **Bell button:** 48×48px minimum (WCAG AA)
- **Notification items:** Full-width tap targets
- **Close button:** 44×44px minimum (iOS guideline)

### Gestures

- **Swipe to dismiss:** Horizontal drag on notification items (50px threshold)
- **Pull to close:** Drag down on bottom sheet (mobile)
- **Tap anywhere:** Close backdrop to dismiss panel

### Platform Differences

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Panel position | Right side | Bottom sheet |
| Panel width | 384px (24rem) | Full width |
| Panel height | Full height | Max 80vh |
| Backdrop blur | 12px | 12px |
| Haptic feedback | ❌ No | ✅ Yes |
| Swipe gestures | ❌ No | ✅ Yes |

---

## Accessibility

### Keyboard Navigation

- `Tab` - Navigate to bell button
- `Enter` / `Space` - Open notification center
- `Escape` - Close notification center
- `Tab` - Navigate through notifications
- `Enter` - Open notification

### Screen Readers

- Bell button has `aria-label` with unread count
- Notification types are announced
- Time stamps are human-readable
- Empty state has descriptive text

### Color Contrast

All colors meet WCAG 2.1 AA standards:
- Pink accent: 4.5:1 contrast ratio
- Blue accent: 4.5:1 contrast ratio
- Text on white: 7:1 contrast ratio
- Gray text: 4.5:1 contrast ratio

---

## Testing

### Manual Testing Checklist

- [ ] New notification appears in real-time
- [ ] Bell shakes when notification arrives
- [ ] Badge count updates correctly
- [ ] Haptic feedback works on mobile
- [ ] Panel opens smoothly
- [ ] Notifications grouped correctly by date
- [ ] Mark as read works (single & batch)
- [ ] Clicking notification navigates to prayer
- [ ] Swipe to dismiss works on mobile
- [ ] Empty state shows when no notifications
- [ ] Real-time subscription cleans up on unmount
- [ ] Works with slow network connection
- [ ] Reduced motion disables animations
- [ ] Screen reader announces notifications

### Testing in Different States

```typescript
// Test with no notifications
<NotificationBell userId={userId} />

// Test with unread notifications
// (Create some test notifications in database)

// Test with many notifications
// (Create 50+ test notifications)

// Test real-time updates
// (Create notification while panel is open)

// Test offline
// (Disable network, check cached data loads)
```

---

## Troubleshooting

### Notifications not appearing in real-time

1. **Check Supabase Realtime is enabled:**
   - Settings → Realtime → Enable for `notifications` table

2. **Verify table replica identity:**
   ```sql
   ALTER TABLE notifications REPLICA IDENTITY FULL;
   ```

3. **Check browser console for errors:**
   - Look for WebSocket connection errors
   - Verify Supabase URL and anon key are correct

### Badge count not updating

1. **Check RLS policies:**
   - Ensure user can read their own notifications
   - Test query in Supabase SQL editor

2. **Verify user ID is correct:**
   ```typescript
   console.log('User ID:', userId);
   ```

3. **Check React Query DevTools:**
   - Is the query stale?
   - Is the query refetching?

### Panel not opening on mobile

1. **Check z-index:**
   - Notification center should be z-50
   - Ensure no other elements are blocking it

2. **Verify touch events:**
   - Test in mobile browser dev tools
   - Check for event stopPropagation issues

3. **Test with reduced motion disabled:**
   - Some animations may conflict

---

## Future Enhancements

### Planned Features

- [ ] Push notifications (web & mobile)
- [ ] Email notifications (optional)
- [ ] Notification preferences (mute types)
- [ ] Notification sound effects
- [ ] Prayer answered notification type
- [ ] Batch actions (delete, archive)
- [ ] Notification history search
- [ ] Desktop notifications (Web Notifications API)

### Performance Improvements

- [ ] Virtual scrolling for 1000+ notifications
- [ ] Progressive loading (load more on scroll)
- [ ] Service worker for offline notifications
- [ ] IndexedDB cache for persistence

---

## Files Reference

| File | Purpose |
|------|---------|
| `/src/hooks/useNotifications.ts` | React Query hooks & data management |
| `/src/components/NotificationBell.tsx` | Trigger button component |
| `/src/components/NotificationCenter.tsx` | Notification panel component |
| `/src/components/NotificationBell.example.tsx` | Usage examples |
| `/src/types/database.ts` | TypeScript database types |
| `/docs/technical/DATABASE-SCHEMA.sql` | Database schema definition |
| `/docs/components/NotificationSystem.md` | This documentation file |

---

## Support

For questions or issues with the notification system:

1. Check this documentation
2. Review the example file (`NotificationBell.example.tsx`)
3. Inspect React Query DevTools in development
4. Check browser console for errors
5. Verify database setup and RLS policies

---

**Last Updated:** 2025-11-30
**Version:** 1.0.0
**Author:** PrayerMap Development Team
