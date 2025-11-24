# Supabase - Real-time Subscriptions

**Official Source:** [Supabase Realtime Guide](https://supabase.com/docs/guides/realtime)

**Version:** Supabase JS 2.83.0

**Last Updated:** December 2024

## Overview

This document covers setting up real-time subscriptions in Supabase for PrayerMap, including listening for new prayer requests, updates, and filtering subscriptions by location.

## Prerequisites

- Supabase client initialized
- Understanding of React hooks (for React examples)
- Realtime enabled in Supabase project settings

## Core Concepts

- **Channel:** A connection to a specific table or topic
- **Subscription:** Listening for specific events (INSERT, UPDATE, DELETE)
- **Filtering:** Narrowing subscriptions to specific rows
- **Connection State:** Managing subscription lifecycle

## Implementation

### Basic Real-time Subscription

```typescript
import { supabase } from './supabase';

// Subscribe to all prayer inserts
const subscription = supabase
  .channel('prayers')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'prayers',
    },
    (payload) => {
      console.log('New prayer:', payload.new);
      // Handle new prayer
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

### Subscribe to Multiple Events

```typescript
const subscription = supabase
  .channel('prayers')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'prayers',
    },
    (payload) => {
      console.log('New prayer:', payload.new);
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'prayers',
    },
    (payload) => {
      console.log('Prayer updated:', payload.new);
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'prayers',
    },
    (payload) => {
      console.log('Prayer deleted:', payload.old);
    }
  )
  .subscribe();
```

### Filtered Subscription

```typescript
// Subscribe only to active prayers
const subscription = supabase
  .channel('active-prayers')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'prayers',
      filter: 'status=eq.ACTIVE',
    },
    (payload) => {
      console.log('New active prayer:', payload.new);
    }
  )
  .subscribe();
```

### Location-Based Filtering (Complex)

```typescript
// Note: PostGIS filters in real-time subscriptions are limited
// Best approach: Filter in application after receiving events

async function subscribeToNearbyPrayers(
  latitude: number,
  longitude: number,
  radiusKm: number,
  callback: (prayer: any) => void
) {
  // Subscribe to all active prayers
  const subscription = supabase
    .channel('nearby-prayers')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'prayers',
        filter: 'status=eq.ACTIVE',
      },
      async (payload) => {
        const newPrayer = payload.new;
        
        // Check if prayer is within radius
        const { data } = await supabase.rpc('get_prayers_within_radius', {
          lat: latitude,
          lng: longitude,
          radius_km: radiusKm,
        });
        
        const isNearby = data?.some(
          (p: any) => p.prayer_id === newPrayer.prayer_id
        );
        
        if (isNearby) {
          callback(newPrayer);
        }
      }
    )
    .subscribe();
  
  return subscription;
}
```

## PrayerMap Use Cases

### Use Case 1: React Hook for Real-time Prayers

```typescript
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Prayer {
  prayer_id: number;
  user_id: string;
  text_body: string;
  location: string;
  created_at: string;
}

export function useRealtimePrayers(
  userLatitude?: number,
  userLongitude?: number,
  radiusKm: number = 48
) {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('prayers-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prayers',
          filter: 'status=eq.ACTIVE',
        },
        async (payload) => {
          const newPrayer = payload.new as Prayer;
          
          // If location provided, check if prayer is nearby
          if (userLatitude && userLongitude) {
            const { data } = await supabase.rpc('get_prayers_within_radius', {
              lat: userLatitude,
              lng: userLongitude,
              radius_km: radiusKm,
            });
            
            const isNearby = data?.some(
              (p: any) => p.prayer_id === newPrayer.prayer_id
            );
            
            if (isNearby) {
              setPrayers((prev) => [newPrayer, ...prev]);
            }
          } else {
            // No location filter, add all new prayers
            setPrayers((prev) => [newPrayer, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prayers',
        },
        (payload) => {
          const updatedPrayer = payload.new as Prayer;
          setPrayers((prev) =>
            prev.map((p) =>
              p.prayer_id === updatedPrayer.prayer_id
                ? updatedPrayer
                : p
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'prayers',
        },
        (payload) => {
          const deletedPrayer = payload.old as Prayer;
          setPrayers((prev) =>
            prev.filter((p) => p.prayer_id !== deletedPrayer.prayer_id)
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userLatitude, userLongitude, radiusKm]);

  return { prayers, isConnected };
}
```

### Use Case 2: Subscribe to Support Count Updates

```typescript
export function usePrayerSupportUpdates(prayerId: number) {
  const [supportCount, setSupportCount] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel(`prayer-support-${prayerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prayer_support',
          filter: `prayer_id=eq.${prayerId}`,
        },
        () => {
          setSupportCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'prayer_support',
          filter: `prayer_id=eq.${prayerId}`,
        },
        () => {
          setSupportCount((prev) => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    // Fetch initial count
    supabase
      .from('prayer_support')
      .select('*', { count: 'exact', head: true })
      .eq('prayer_id', prayerId)
      .then(({ count }) => {
        setSupportCount(count || 0);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [prayerId]);

  return supportCount;
}
```

### Use Case 3: Real-time Notifications

```typescript
export function useRealtimeNotifications(userId: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new;
          if (updated.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          setNotifications((prev) =>
            prev.map((n) =>
              n.notification_id === updated.notification_id ? updated : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  return { notifications, unreadCount };
}
```

## Connection State Management

```typescript
function useRealtimeConnection() {
  const [status, setStatus] = useState<'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'>('CLOSED');

  useEffect(() => {
    const channel = supabase
      .channel('connection-test')
      .subscribe((status) => {
        setStatus(status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return status;
}
```

## Error Handling

```typescript
const subscription = supabase
  .channel('prayers')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'prayers',
    },
    (payload) => {
      try {
        // Handle payload
        handleNewPrayer(payload.new);
      } catch (error) {
        console.error('Error handling new prayer:', error);
      }
    }
  )
  .subscribe((status, err) => {
    if (status === 'CHANNEL_ERROR') {
      console.error('Channel error:', err);
    } else if (status === 'TIMED_OUT') {
      console.error('Subscription timed out');
    } else if (status === 'CLOSED') {
      console.log('Channel closed');
    }
  });
```

## Performance Considerations

### Limit Subscription Scope

```typescript
// ✅ Good: Filter at database level
.filter('status=eq.ACTIVE')

// ❌ Bad: Subscribe to everything and filter in app
// (wastes bandwidth and processing)
```

### Debounce Rapid Updates

```typescript
import { debounce } from 'lodash';

const debouncedUpdate = debounce((prayer: Prayer) => {
  updatePrayerOnMap(prayer);
}, 300);

subscription.on('postgres_changes', {
  event: 'UPDATE',
  // ...
}, (payload) => {
  debouncedUpdate(payload.new);
});
```

### Cleanup Subscriptions

```typescript
// Always unsubscribe to prevent memory leaks
useEffect(() => {
  const channel = supabase.channel('prayers').subscribe();
  
  return () => {
    channel.unsubscribe(); // Critical!
  };
}, []);
```

## Security Notes

- **RLS Policies:** Real-time respects Row Level Security policies
- **Channel Names:** Use unique channel names per component
- **User Context:** Ensure subscriptions only receive data user has access to

## Testing

```typescript
test('receives real-time updates', async () => {
  const receivedPrayers: any[] = [];
  
  const subscription = supabase
    .channel('test-prayers')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'prayers',
    }, (payload) => {
      receivedPrayers.push(payload.new);
    })
    .subscribe();
  
  // Create test prayer
  await createPrayer(userId, { textBody: 'Test' }, { lat: 0, lng: 0 });
  
  // Wait for event
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  expect(receivedPrayers.length).toBeGreaterThan(0);
  
  subscription.unsubscribe();
});
```

## Troubleshooting

### Subscription Not Receiving Events

**Solutions:**
1. Verify Realtime is enabled in Supabase dashboard
2. Check RLS policies allow reading
3. Verify channel is subscribed: `status === 'SUBSCRIBED'`
4. Check browser console for errors
5. Verify table name and schema are correct

### Too Many Events

**Solutions:**
1. Add filters to subscription
2. Debounce event handlers
3. Limit subscription scope
4. Use pagination for initial load

## References

- [Supabase Realtime Guide](https://supabase.com/docs/guides/realtime)
- [Postgres Changes API](https://supabase.com/docs/reference/javascript/subscribe)

