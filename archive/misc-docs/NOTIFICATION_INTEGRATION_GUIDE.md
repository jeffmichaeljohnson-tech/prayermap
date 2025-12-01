# Notification System Integration Guide

## Overview

This guide explains how to integrate the new notifications system (Migration 020) with the existing PrayerMap frontend to enable proper inbox functionality.

## Problem Solved

**BEFORE**: When User A prays for User B's request, User B never sees a message in their inbox because no notification infrastructure existed.

**AFTER**: Migration 020 creates a complete notification system that automatically creates inbox messages when users interact with prayers.

## Database Changes Applied

### 1. New `notifications` Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID,           -- Who receives the notification (prayer requester)
  actor_id UUID,          -- Who triggered it (prayer responder)
  type notification_type, -- 'prayer_response', 'prayer_support', 'prayer_update'
  title TEXT,             -- "Kind Helper responded to your prayer"
  message TEXT,           -- Response preview or action description
  prayer_id UUID,         -- Related prayer
  response_id UUID,       -- Related response (for prayer_response type)
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  data JSONB,             -- Additional context
  created_at TIMESTAMPTZ
);
```

### 2. Automatic Trigger
- **Trigger**: `trigger_create_prayer_response_notification`
- **Fires**: After each `INSERT` on `prayer_responses`
- **Action**: Automatically creates notification record for prayer owner
- **Smart Logic**: Skips self-responses, handles anonymous users

### 3. Helper Functions
- `get_user_notifications(user_id, limit, offset, unread_only)`
- `mark_notification_read(notification_id)`
- `mark_all_notifications_read(user_id)`
- `get_unread_notification_count(user_id)`

## Frontend Integration Steps

### Step 1: Update PrayerService.ts

Replace the complex `fetchUserInbox()` logic with direct notification queries:

```typescript
/**
 * Fetch user's inbox using the new notifications system
 */
export async function fetchUserInbox(
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<InboxNotification[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase.rpc('get_user_notifications', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: 0,
      p_unread_only: unreadOnly
    });

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch user inbox:', error);
    return [];
  }
}

/**
 * Get unread notification count for badges
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!supabase) return 0;

  try {
    const { data, error } = await supabase.rpc('get_unread_notification_count', {
      p_user_id: userId
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}
```

### Step 2: Update Type Definitions

Add to `src/types/notification.ts`:

```typescript
export interface InboxNotification {
  id: string;
  type: 'prayer_response' | 'prayer_support' | 'prayer_update';
  title: string;
  message: string;
  prayer_id: string;
  response_id?: string;
  actor_id: string;
  actor_name: string;
  read: boolean;
  read_at?: string;
  data: {
    prayer_title: string;
    response_type: string;
    responder_anonymous: boolean;
  };
  created_at: string;
}

export type NotificationType = 'prayer_response' | 'prayer_support' | 'prayer_update';
```

### Step 3: Update Real-time Subscriptions

Replace complex prayer_responses subscription with notifications subscription:

```typescript
/**
 * Subscribe to user's notification updates
 */
export function subscribeToUserNotifications(
  userId: string, 
  callback: (notifications: InboxNotification[]) => void
) {
  if (!supabase) return () => {};

  const subscription = supabase
    .channel(`notifications_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      async () => {
        // Refresh user's notifications when new ones arrive
        const notifications = await fetchUserInbox(userId);
        callback(notifications);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
```

### Step 4: Update useInbox Hook

Simplify the inbox hook to use notifications:

```typescript
export function useInbox(options: {
  userId: string;
  autoFetch?: boolean;
  subscribe?: boolean;
}) {
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!options.userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [notificationData, unreadCountData] = await Promise.all([
        fetchUserInbox(options.userId),
        getUnreadNotificationCount(options.userId)
      ]);
      
      setNotifications(notificationData);
      setUnreadCount(unreadCountData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [options.userId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const success = await markNotificationRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (options.autoFetch) {
      fetchNotifications();
    }
  }, [options.autoFetch, fetchNotifications]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!options.subscribe || !options.userId) return;

    const unsubscribe = subscribeToUserNotifications(options.userId, setNotifications);
    return unsubscribe;
  }, [options.subscribe, options.userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    refetch: fetchNotifications
  };
}
```

### Step 5: Update InboxModal Component

Update the inbox modal to use the new notification structure:

```typescript
export function InboxModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markAsRead } = useInbox({
    userId: user?.id || '',
    autoFetch: true,
    subscribe: true
  });

  const handleNotificationClick = async (notification: InboxNotification) => {
    // Mark as read when clicked
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Navigate to the prayer or response
    // ... navigation logic
  };

  return (
    <Modal onClose={onClose}>
      <div className="inbox-modal">
        <h2>Inbox ({unreadCount} unread)</h2>
        
        {loading && <div>Loading notifications...</div>}
        
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`notification-item ${!notification.read ? 'unread' : ''}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="notification-header">
              <h3>{notification.title}</h3>
              <time>{formatDistanceToNow(new Date(notification.created_at))}</time>
            </div>
            <p className="notification-message">{notification.message}</p>
            <div className="notification-meta">
              {notification.data.prayer_title}
            </div>
          </div>
        ))}
        
        {notifications.length === 0 && !loading && (
          <div className="empty-state">
            No notifications yet. When someone responds to your prayers, you'll see them here.
          </div>
        )}
      </div>
    </Modal>
  );
}
```

## Testing the Integration

### 1. Apply the Migration
```bash
npx supabase db push
```

### 2. Test the Flow Manually
1. Create a prayer as User A
2. Respond to the prayer as User B  
3. Check User A's inbox - should see notification immediately
4. Verify real-time updates work

### 3. Run the Test Script
Execute the test script to validate all functionality:
```sql
-- Run test_notification_flow.sql in Supabase SQL editor
```

## Performance Benefits

### Before (Complex Joins)
- Multiple table joins between prayers, prayer_responses, profiles
- Complex grouping and sorting logic
- Slow queries as data grows
- Inconsistent real-time updates

### After (Direct Notification Queries) 
- Single table query with optimized indexes
- Pre-computed notification messages
- Fast inbox loading regardless of data size
- Reliable real-time notifications

## Key Features Enabled

1. **Instant Inbox Messages**: Users see responses immediately
2. **Real-time Updates**: Live notification badges and inbox updates  
3. **Read/Unread Tracking**: Proper message state management
4. **Anonymous Support**: Handles anonymous responders gracefully
5. **Performance**: Fast queries with proper indexing
6. **Scalability**: System handles growth efficiently

## Migration Safety

- ✅ Backward compatible - existing frontend continues to work
- ✅ Non-breaking changes - adds new table and functions only
- ✅ RLS policies protect user privacy
- ✅ Foreign keys ensure data consistency
- ✅ Indexes optimize query performance

## Next Steps

1. Apply migration 020 to staging environment
2. Test the notification flow end-to-end
3. Update frontend code to use new notification system
4. Deploy to production
5. Monitor notification creation and performance

The notification system is now ready to solve the core issue where inbox messages were missing between users!