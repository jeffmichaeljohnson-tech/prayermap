# PrayerMap Supabase Integration - Summary

This document provides a high-level overview of the Prayer CRUD implementation with Supabase.

## What Was Created

### Core Files

1. **Prayer Service** - `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/prayerService.ts`
   - Complete CRUD operations for prayers
   - PostGIS spatial queries for nearby prayers
   - Real-time subscriptions
   - Prayer response and connection management

2. **usePrayers Hook** - `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/hooks/usePrayers.ts`
   - React hook for managing prayer state
   - Auto-fetches prayers based on location
   - Real-time updates
   - Optimistic UI updates
   - Error and loading states

3. **useInbox Hook** - `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/hooks/useInbox.ts`
   - Manages inbox for received prayer responses
   - Tracks unread count
   - Real-time notifications
   - Mark as read functionality

4. **Database Schema** - `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/supabase-schema.sql`
   - Complete PostgreSQL schema with PostGIS
   - Row Level Security (RLS) policies
   - Indexes for performance
   - RPC functions for complex operations

### Supporting Files

5. **Type Definitions** - `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/types/prayer.ts`
   - Updated Prayer interface with database fields
   - New PrayerResponse interface

6. **Database Types** - `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/types/database.ts`
   - TypeScript types for Supabase database
   - Auto-complete support for database operations

7. **Legacy Adapters** - `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/lib/prayerAdapters.ts`
   - Helper functions for gradual migration
   - Convert between camelCase and snake_case

### Documentation

8. **Integration Guide** - `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/INTEGRATION_GUIDE.md`
   - Detailed component integration instructions
   - Field name migration guide
   - Troubleshooting tips

9. **Migration Steps** - `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/MIGRATION_STEPS.md`
   - Step-by-step migration process
   - Phase-by-phase implementation
   - Testing procedures

## Key Features Implemented

### 1. Geospatial Queries
- Uses PostGIS for efficient radius-based prayer searches
- Optimized with GIST indexes
- Supports customizable search radius (default 50km)

### 2. Real-time Updates
- Live prayer updates when new prayers are created
- Real-time inbox notifications
- Automatic UI updates via WebSocket subscriptions

### 3. Prayer Responses
- Users can respond to prayers with text, audio, or video
- Creates prayer connections for visualization
- Tracks who has prayed for each request

### 4. Inbox System
- Shows prayers you've created that received responses
- Unread count tracking
- Real-time notifications for new responses

### 5. Security
- Row Level Security (RLS) policies
- Users can only edit/delete their own prayers
- Anonymous prayer support
- Secure database functions

### 6. Performance
- Efficient PostGIS spatial indexes
- Optimized queries for nearby prayers
- Connection pooling via Supabase

## Database Schema Overview

### Tables

1. **prayers**
   - Stores all prayer requests
   - PostGIS GEOGRAPHY type for location
   - Supports text, audio, and video content
   - Anonymous option available

2. **prayer_responses**
   - Responses to prayers (when someone prays for a request)
   - Links to prayer and responder
   - Supports multimedia responses
   - Can be anonymous

3. **prayer_connections**
   - Visualizes connections between requester and responder
   - Automatically expires after 1 year
   - Stores both locations for line rendering

### RPC Functions

1. **get_nearby_prayers(lat, lng, radius)**
   - Returns prayers within specified radius
   - Uses PostGIS ST_DWithin for performance
   - Sorted by creation date

2. **create_prayer_connection()**
   - Creates connection when someone responds to prayer
   - Links prayer, response, and locations
   - Sets 1-year expiration

3. **cleanup_expired_connections()**
   - Removes expired connections
   - Can be run as scheduled job

## How to Wire It Up

### Quick Start (3 Steps)

1. **Set up Supabase**
   ```bash
   # Add to .env.local
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key

   # Run schema in Supabase SQL Editor
   # Copy/paste supabase-schema.sql
   ```

2. **Update PrayerMap.tsx**
   ```typescript
   import { usePrayers } from '../hooks/usePrayers';

   const { prayers, createPrayer, respondToPrayer } = usePrayers({
     location: userLocation,
     radiusKm: 50,
     enableRealtime: true,
   });

   // Remove mock data
   // Use prayers from hook instead
   ```

3. **Update Component Props**
   ```typescript
   // Pass userId and userName to components
   <RequestPrayerModal
     userId={user.id}
     userName={user.name}
     // ... other props
   />
   ```

### Detailed Migration Path

See **MIGRATION_STEPS.md** for phase-by-phase implementation:
- Phase 1: Database Setup (15 min)
- Phase 2: Authentication (30 min)
- Phase 3: Integrate Prayers (45 min)
- Phase 4: Integrate Inbox (30 min)
- Phase 5: Update Field Names (30 min)
- Phase 6: Testing (30 min)

Total estimated time: **3 hours**

## API Reference

### usePrayers Hook

```typescript
const {
  prayers,        // Prayer[] - Array of nearby prayers
  loading,        // boolean - Loading state
  error,          // string | null - Error message
  refetch,        // () => Promise<void> - Manual refetch
  createPrayer,   // Create new prayer
  respondToPrayer // Respond to a prayer
} = usePrayers({
  location: { lat: 42.5, lng: -83.2 },
  radiusKm: 50,
  autoFetch: true,
  enableRealtime: true,
});
```

### useInbox Hook

```typescript
const {
  inbox,         // InboxItem[] - Prayer requests with responses
  loading,       // boolean - Loading state
  error,         // string | null - Error message
  totalUnread,   // number - Total unread messages
  refetch,       // () => Promise<void> - Manual refetch
  markAsRead,    // (prayerId: string) => void - Mark as read
} = useInbox({
  userId: user.id,
  autoFetch: true,
  enableRealtime: true,
});
```

### Prayer Service Functions

```typescript
// Fetch nearby prayers
const prayers = await fetchNearbyPrayers(lat, lng, radiusKm);

// Create prayer
const prayer = await createPrayer({
  user_id: userId,
  content: "Please pray for...",
  content_type: "text",
  location: { lat, lng },
  is_anonymous: false,
});

// Respond to prayer
const result = await respondToPrayer(
  prayerId,
  responderId,
  responderName,
  "Praying for you",
  "text"
);

// Get prayer responses
const responses = await fetchPrayerResponses(prayerId);

// Get user inbox
const inbox = await fetchUserInbox(userId);

// Subscribe to updates
const unsubscribe = subscribeToNearbyPrayers(lat, lng, radiusKm, (prayers) => {
  console.log('New prayers:', prayers);
});
```

## Field Name Changes

The Prayer type now uses snake_case to match database conventions:

| Old Name | New Name |
|----------|----------|
| contentType | content_type |
| isAnonymous | is_anonymous |
| userName | user_name |
| createdAt | created_at |
| updatedAt | updated_at |

All components need to be updated to use the new field names.

## Next Steps

1. **Immediate**
   - Run database schema in Supabase
   - Add environment variables
   - Test with mock data first

2. **Short-term**
   - Implement authentication with useAuth hook
   - Update PrayerMap to use usePrayers
   - Update InboxModal to use useInbox
   - Update field names throughout components

3. **Medium-term**
   - Implement audio/video upload to Supabase Storage
   - Add user profiles with saved locations
   - Implement read/unread tracking in database
   - Add push notifications

4. **Long-term**
   - Implement prayer analytics
   - Add prayer categories/tags
   - Implement prayer groups/communities
   - Add moderation tools

## Benefits of This Implementation

1. **Real-time Experience**
   - See new prayers as they're created
   - Get instant notifications for responses
   - Live map updates

2. **Scalability**
   - PostGIS handles millions of prayers efficiently
   - Supabase auto-scales infrastructure
   - Optimized queries with indexes

3. **Security**
   - Row Level Security prevents unauthorized access
   - Anonymous prayers protect privacy
   - Secure authentication

4. **Developer Experience**
   - Type-safe with TypeScript
   - React hooks for easy integration
   - Comprehensive error handling

5. **Performance**
   - Spatial indexes for fast queries
   - Real-time subscriptions instead of polling
   - Optimistic UI updates

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostGIS Docs**: https://postgis.net/documentation/
- **Integration Guide**: See INTEGRATION_GUIDE.md
- **Migration Steps**: See MIGRATION_STEPS.md

## Troubleshooting

Common issues and solutions:

1. **"Supabase not initialized"**
   - Check .env.local has correct values
   - Restart dev server

2. **"No nearby prayers"**
   - Verify PostGIS extension is enabled
   - Check prayer locations are valid
   - Increase search radius

3. **"Permission denied"**
   - Check RLS policies
   - Verify user is authenticated
   - Check user_id matches auth.uid()

4. **Real-time not working**
   - Enable Realtime in Supabase Dashboard
   - Check WebSocket connection
   - Verify table replication is enabled

See INTEGRATION_GUIDE.md for more troubleshooting tips.
