/**
 * NotificationBell Usage Example
 *
 * This file demonstrates how to integrate the NotificationBell component
 * into your PrayerMap application.
 */

import { NotificationBell } from './NotificationBell';
import { useAuth } from '../hooks/useAuth';

// ============================================================================
// BASIC USAGE
// ============================================================================

export function HeaderWithNotifications() {
  const { user } = useAuth();

  const handleNavigateToPrayer = (prayerId: string) => {
    // Navigate to the prayer detail page
    // For example, if using React Router:
    // navigate(`/prayer/${prayerId}`);
    console.log('Navigate to prayer:', prayerId);
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white shadow-lg">
      <h1 className="text-xl font-display font-bold">PrayerMap</h1>

      {/* Notification Bell */}
      <NotificationBell
        userId={user?.id || null}
        onNavigateToPrayer={handleNavigateToPrayer}
      />
    </header>
  );
}

// ============================================================================
// WITH CUSTOM STYLING
// ============================================================================

export function HeaderWithCustomNotifications() {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between p-4">
      <h1 className="text-xl font-display font-bold">PrayerMap</h1>

      {/* Custom positioned notification bell */}
      <NotificationBell
        userId={user?.id || null}
        onNavigateToPrayer={(prayerId) => console.log('Navigate to:', prayerId)}
        className="fixed top-4 right-4 z-30"
      />
    </header>
  );
}

// ============================================================================
// MOBILE BOTTOM NAV INTEGRATION
// ============================================================================

export function BottomNavWithNotifications() {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around p-4 z-40">
      <button className="p-2">Home</button>
      <button className="p-2">Map</button>

      {/* Notification bell in bottom nav */}
      <NotificationBell
        userId={user?.id || null}
        onNavigateToPrayer={(prayerId) => {
          // Navigate to prayer and close notification panel
          console.log('Navigate to:', prayerId);
        }}
      />

      <button className="p-2">Settings</button>
    </nav>
  );
}

// ============================================================================
// WITH ROUTER INTEGRATION (React Router example)
// ============================================================================

/*
import { useNavigate } from 'react-router-dom';

export function HeaderWithRouting() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNavigateToPrayer = (prayerId: string) => {
    navigate(`/prayer/${prayerId}`);
  };

  return (
    <header className="flex items-center justify-between p-4">
      <h1 className="text-xl font-display font-bold">PrayerMap</h1>

      <NotificationBell
        userId={user?.id || null}
        onNavigateToPrayer={handleNavigateToPrayer}
      />
    </header>
  );
}
*/

// ============================================================================
// FULL APP EXAMPLE
// ============================================================================

export function AppWithNotifications() {
  const { user } = useAuth();

  const handlePrayerNavigation = (prayerId: string) => {
    // This would typically:
    // 1. Navigate to the prayer detail page
    // 2. Or open a prayer modal
    // 3. Or focus the prayer on the map

    console.log('User clicked notification for prayer:', prayerId);

    // Example: Scroll to prayer on map
    const prayerElement = document.getElementById(`prayer-${prayerId}`);
    if (prayerElement) {
      prayerElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-heavenly-blue">
      {/* Header with notification bell */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-gray-900">PrayerMap</h1>

          {/* Notification Bell - shows when user is logged in */}
          {user && (
            <NotificationBell
              userId={user.id}
              onNavigateToPrayer={handlePrayerNavigation}
            />
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="pt-20">
        {/* Your map, prayer feed, etc. */}
      </main>
    </div>
  );
}

// ============================================================================
// NOTES
// ============================================================================

/*
INTEGRATION CHECKLIST:

1. ✅ Import NotificationBell component
2. ✅ Get user ID from auth context
3. ✅ Provide onNavigateToPrayer callback
4. ✅ Position appropriately (header, nav, fixed)
5. ✅ Ensure notifications table exists in database
6. ✅ Set up Supabase RLS policies for notifications
7. ✅ Test real-time updates work

DATABASE SETUP:

The notifications table should exist in your Supabase database.
If not, create it using the schema in docs/technical/DATABASE-SCHEMA.sql

RLS POLICIES:

Ensure users can only read their own notifications:

```sql
-- Allow users to read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

REAL-TIME SETUP:

Enable real-time for the notifications table:

```sql
-- Enable real-time for notifications
ALTER TABLE notifications REPLICA IDENTITY FULL;
```

Then in Supabase Dashboard > Settings > Realtime:
- Enable real-time for the "notifications" table

CREATING NOTIFICATIONS:

When a user receives prayer support or a response, create a notification:

```typescript
import { supabase } from '../lib/supabase';

// When someone sends prayer support
await supabase.from('notifications').insert({
  user_id: prayerOwnerId,
  type: 'SUPPORT_RECEIVED',
  payload: {
    prayer_id: prayerId,
    supporter_name: supporterName,
  },
});

// When someone responds to a prayer
await supabase.from('notifications').insert({
  user_id: prayerOwnerId,
  type: 'RESPONSE_RECEIVED',
  payload: {
    prayer_id: prayerId,
    response_id: responseId,
    responder_name: responderName,
    message: responseMessage,
    content_type: 'text', // or 'audio', 'video'
  },
});
```

MOBILE CONSIDERATIONS:

- Touch target is 48x48px (meets accessibility standards)
- Haptic feedback on new notifications (mobile only)
- Bottom sheet on mobile (easier to reach)
- Swipe to dismiss individual notifications
- Reduced motion support throughout

PERFORMANCE:

- React Query caching reduces database calls
- Real-time updates only for current user
- Optimistic updates for instant feedback
- Stale-while-revalidate pattern (30s stale time)
- Unread count polling every 30s (battery friendly)
*/
