# PrayerMap Supabase Integration Guide

This guide explains how to wire up the new Prayer CRUD operations to your existing components.

## Files Created/Modified

### 1. Type Definitions Updated
**File:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/types/prayer.ts`

Updated the `Prayer` interface to match the database schema with snake_case field names:
- Added `user_id`, `content_url`, `updated_at`
- Changed camelCase to snake_case (`contentType` → `content_type`, etc.)
- Added `PrayerResponse` interface for prayer responses

### 2. Prayer Service Created
**File:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/prayerService.ts`

Provides all CRUD operations and real-time subscriptions:
- `fetchNearbyPrayers(lat, lng, radiusKm)` - Fetch prayers within radius using PostGIS
- `createPrayer(prayer)` - Insert new prayer
- `respondToPrayer(...)` - Create prayer response and connection
- `fetchPrayerResponses(prayerId)` - Get all responses for a prayer
- `fetchUserInbox(userId)` - Get prayers where user received responses
- `subscribeToNearbyPrayers(...)` - Real-time subscription for nearby prayers
- `subscribeToPrayerResponses(...)` - Real-time subscription for prayer responses
- `subscribeToUserInbox(...)` - Real-time subscription for inbox updates

### 3. Prayers Hook Created
**File:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/hooks/usePrayers.ts`

React hook for managing prayer state:
- Fetches prayers on mount and when location changes
- Provides `createPrayer` and `respondToPrayer` functions
- Handles loading and error states
- Sets up real-time subscriptions automatically
- Optimistically updates local state

### 4. Inbox Hook Created
**File:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/hooks/useInbox.ts`

React hook for the inbox modal:
- Fetches received prayer responses
- Real-time updates for new messages
- Tracks unread count
- Provides `markAsRead` functionality

### 5. Database Schema
**File:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/supabase-schema.sql`

Complete SQL schema for Supabase including:
- Tables: `prayers`, `prayer_responses`, `prayer_connections`
- PostGIS integration for geospatial queries
- Row Level Security (RLS) policies
- Indexes for performance
- RPC functions for complex operations

## Database Setup

### Step 1: Set up Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and anon key from Settings → API
3. Add to `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/.env.local`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### Step 2: Run Database Migrations
1. In Supabase Dashboard, go to SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the script to create all tables, functions, and policies

### Step 3: Enable PostGIS Extension
The schema includes PostGIS for geospatial queries. Ensure it's enabled in your Supabase project (it should be enabled automatically by the schema).

## Component Integration

### Updating PrayerMap Component

**File:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/components/PrayerMap.tsx`

Replace the mock data with the real hook:

```typescript
import { usePrayers } from '../hooks/usePrayers';
import { useAuth } from '../hooks/useAuth'; // You'll need to create this or get user from context

export function PrayerMap({ userLocation, onOpenSettings }: PrayerMapProps) {
  // Get current user (you'll need to implement auth)
  const currentUser = { id: 'user-123', name: 'John Doe' }; // Replace with real auth

  // Use the prayers hook
  const {
    prayers,
    loading,
    error,
    createPrayer,
    respondToPrayer,
  } = usePrayers({
    location: userLocation,
    radiusKm: 50,
    autoFetch: true,
    enableRealtime: true,
  });

  // Remove the mock useEffect and setPrayers calls
  // The hook handles everything now

  const handleRequestPrayer = async (newPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>) => {
    const prayer = await createPrayer({
      ...newPrayer,
      user_id: currentUser.id,
      user_name: newPrayer.is_anonymous ? undefined : currentUser.name,
    });

    if (prayer) {
      setShowRequestModal(false);
    }
  };

  const handlePrayerSubmit = async (prayer: Prayer) => {
    // Show animation
    setSelectedPrayer(null);
    setAnimatingPrayer({ prayer, userLocation });

    // Create the response in the database
    const success = await respondToPrayer(
      prayer.id,
      currentUser.id,
      currentUser.name,
      'Praying for you', // Or get from reply form
      'text',
      undefined,
      false
    );

    if (success) {
      // Animation will handle the rest
      setTimeout(() => {
        setAnimatingPrayer(null);
      }, 6000);
    }
  };

  // Show loading state
  if (loading && prayers.length === 0) {
    return <div>Loading prayers...</div>;
  }

  // Show error state
  if (error) {
    console.error('Prayer error:', error);
  }

  // Rest of component stays the same
}
```

### Updating RequestPrayerModal Component

**File:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/components/RequestPrayerModal.tsx`

The component interface needs to change slightly to accept user info:

```typescript
interface RequestPrayerModalProps {
  userLocation: { lat: number; lng: number };
  userId: string; // Add this
  userName?: string; // Add this
  onClose: () => void;
  onSubmit: (prayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>) => void;
}

export function RequestPrayerModal({
  userLocation,
  userId,
  userName,
  onClose,
  onSubmit
}: RequestPrayerModalProps) {
  // ... existing state ...

  const handleSubmit = () => {
    if (!content.trim() && contentType === 'text') return;

    onSubmit({
      user_id: userId,
      title: title.trim() || undefined,
      content: content.trim(),
      content_type: contentType,
      location: userLocation,
      user_name: isAnonymous ? undefined : userName,
      is_anonymous: isAnonymous,
    });
  };

  // Rest stays the same
}
```

### Updating PrayerDetailModal Component

**File:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/components/PrayerDetailModal.tsx`

Update to use the new field names:

```typescript
// Update references from camelCase to snake_case
// For example:
prayer.is_anonymous // instead of prayer.isAnonymous
prayer.user_name // instead of prayer.userName
prayer.content_type // instead of prayer.contentType
```

### Updating InboxModal Component

**File:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/components/InboxModal.tsx`

Use the new inbox hook:

```typescript
import { useInbox } from '../hooks/useInbox';

export function InboxModal({ onClose }: { onClose: () => void }) {
  const currentUser = { id: 'user-123' }; // Replace with real auth

  const { inbox, loading, error, totalUnread, markAsRead } = useInbox({
    userId: currentUser.id,
    autoFetch: true,
    enableRealtime: true,
  });

  // Update the notification badge in PrayerMap.tsx:
  // <span className="...">
  //   {totalUnread}
  // </span>

  // Render inbox items
  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}

      {inbox.map((item) => (
        <div key={item.prayer.id} onClick={() => markAsRead(item.prayer.id)}>
          <h3>{item.prayer.title || 'Prayer Request'}</h3>
          <p>{item.responses.length} responses</p>
          {item.unreadCount > 0 && <span>{item.unreadCount} unread</span>}
        </div>
      ))}
    </div>
  );
}
```

## Authentication Integration

You'll need to integrate Supabase Auth to get the current user. Create a hook:

**File:** `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/hooks/useAuth.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase?.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    ) ?? { data: { subscription: null } };

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading };
}
```

Then use it in your App or components:

```typescript
const { user } = useAuth();

// Pass user.id and user metadata to components
```

## Field Name Migration

The Prayer type now uses snake_case to match the database. Update all component references:

| Old (camelCase) | New (snake_case) |
|----------------|------------------|
| `contentType` | `content_type` |
| `isAnonymous` | `is_anonymous` |
| `userName` | `user_name` |
| `createdAt` | `created_at` |
| `prayerId` | `prayer_id` |

## Testing

1. Start your development server: `npm run dev`
2. Open the app and sign in (or create auth flow)
3. Test creating a prayer request
4. Test responding to a prayer
5. Check the inbox for responses
6. Verify real-time updates by opening multiple browser tabs

## Real-time Features

The hooks automatically set up real-time subscriptions:

- **usePrayers**: Listens for new prayers in your area
- **useInbox**: Listens for new responses to your prayers
- Real-time updates happen automatically when data changes in Supabase

## PostGIS Spatial Queries

The `get_nearby_prayers` function uses PostGIS for efficient radius searches:
- Location stored as `GEOGRAPHY(POINT, 4326)` (latitude/longitude)
- Uses `ST_DWithin` for performant radius queries
- Automatically indexed with GIST index for fast lookups

## Next Steps

1. Implement user authentication with Supabase Auth
2. Add user profile storage for locations
3. Implement audio/video upload to Supabase Storage
4. Add read/unread tracking for inbox
5. Implement notification system for new responses
6. Add prayer connection visualization with real data
7. Implement connection expiration cleanup (yearly)

## Troubleshooting

### "Supabase client not initialized"
- Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local
- Restart the dev server after adding environment variables

### PostGIS errors
- Ensure PostGIS extension is enabled in Supabase
- Check that the schema was run successfully

### RLS errors
- Verify you're authenticated when creating prayers
- Check that RLS policies are created correctly

### Real-time not working
- Ensure Realtime is enabled for your tables in Supabase Dashboard
- Check browser console for WebSocket connection errors
