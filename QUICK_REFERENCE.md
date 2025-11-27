# PrayerMap Quick Reference Card

## File Locations

```
/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/
├── supabase-schema.sql              # Database schema - run in Supabase
├── SUPABASE_INTEGRATION_SUMMARY.md  # High-level overview
├── INTEGRATION_GUIDE.md             # Detailed integration instructions
├── MIGRATION_STEPS.md               # Step-by-step migration guide
└── src/
    ├── services/
    │   └── prayerService.ts         # Prayer CRUD operations
    ├── hooks/
    │   ├── usePrayers.ts            # Prayer state management hook
    │   ├── useInbox.ts              # Inbox management hook
    │   └── useAuth.ts               # Authentication hook
    ├── types/
    │   ├── prayer.ts                # Prayer & PrayerResponse types
    │   └── database.ts              # Supabase database types
    └── lib/
        ├── supabase.ts              # Supabase client (existing)
        └── prayerAdapters.ts        # camelCase <-> snake_case adapters
```

## Setup Checklist

- [ ] Create Supabase project at supabase.com
- [ ] Copy project URL and anon key
- [ ] Add to `.env.local`:
  ```env
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=xxx
  ```
- [ ] Run `supabase-schema.sql` in Supabase SQL Editor
- [ ] Enable Realtime for tables: prayers, prayer_responses, prayer_connections
- [ ] Test database connection

## Quick Code Examples

### 1. Use Prayers in Component

```typescript
import { usePrayers } from '../hooks/usePrayers';

function MyComponent({ location, userId, userName }) {
  const {
    prayers,
    loading,
    error,
    createPrayer,
    respondToPrayer
  } = usePrayers({
    location,
    radiusKm: 50,
    enableRealtime: true,
  });

  const handleCreate = async () => {
    await createPrayer({
      user_id: userId,
      content: "Prayer request...",
      content_type: "text",
      location: location,
      is_anonymous: false,
      user_name: userName,
    });
  };

  const handleRespond = async (prayerId) => {
    await respondToPrayer(
      prayerId,
      userId,
      userName,
      "Praying for you",
      "text"
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {prayers.map(prayer => (
        <div key={prayer.id}>{prayer.content}</div>
      ))}
    </div>
  );
}
```

### 2. Use Inbox in Component

```typescript
import { useInbox } from '../hooks/useInbox';

function InboxComponent({ userId }) {
  const { inbox, loading, totalUnread, markAsRead } = useInbox({
    userId,
    enableRealtime: true,
  });

  return (
    <div>
      <h2>Inbox ({totalUnread} unread)</h2>
      {inbox.map(item => (
        <div key={item.prayer.id} onClick={() => markAsRead(item.prayer.id)}>
          <h3>{item.prayer.title}</h3>
          <p>{item.responses.length} responses</p>
        </div>
      ))}
    </div>
  );
}
```

### 3. Use Authentication

```typescript
import { useAuth } from '../hooks/useAuth';

function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <AuthModal onSignIn={signIn} onSignUp={signUp} />;

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### 4. Direct Service Calls

```typescript
import {
  fetchNearbyPrayers,
  createPrayer,
  respondToPrayer,
} from '../services/prayerService';

// Fetch nearby prayers
const prayers = await fetchNearbyPrayers(42.5, -83.2, 50);

// Create prayer
const newPrayer = await createPrayer({
  user_id: "user-id",
  content: "Please pray...",
  content_type: "text",
  location: { lat: 42.5, lng: -83.2 },
  is_anonymous: false,
});

// Respond to prayer
const result = await respondToPrayer(
  "prayer-id",
  "user-id",
  "John Doe",
  "Praying for you",
  "text"
);
```

## Prayer Type (snake_case)

```typescript
interface Prayer {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  content_url?: string;
  location: { lat: number; lng: number };
  user_name?: string;
  is_anonymous: boolean;
  created_at: Date;
  updated_at?: Date;
}
```

## Field Name Mapping

| Database/New | Component/Old |
|--------------|---------------|
| user_id | userId |
| content_type | contentType |
| content_url | contentUrl |
| user_name | userName |
| is_anonymous | isAnonymous |
| created_at | createdAt |
| updated_at | updatedAt |
| prayer_id | prayerId |
| responder_id | responderId |
| responder_name | responderName |

## Common Operations

### Create Prayer
```typescript
const prayer = await createPrayer({
  user_id: userId,
  content: "Prayer request text",
  content_type: "text",
  location: { lat: 42.5, lng: -83.2 },
  is_anonymous: false,
  user_name: userName,
});
```

### Respond to Prayer
```typescript
const success = await respondToPrayer(
  prayerId,
  userId,
  userName,
  "Prayer message",
  "text",
  undefined,  // content_url (optional)
  false       // is_anonymous
);
```

### Subscribe to Real-time Updates
```typescript
const unsubscribe = subscribeToNearbyPrayers(
  lat,
  lng,
  radiusKm,
  (updatedPrayers) => {
    console.log('New prayers:', updatedPrayers);
  }
);

// Later, cleanup
unsubscribe();
```

## Database Tables

### prayers
- id (UUID)
- user_id (UUID, foreign key to auth.users)
- title (TEXT, optional)
- content (TEXT)
- content_type (TEXT: 'text' | 'audio' | 'video')
- content_url (TEXT, optional)
- location (GEOGRAPHY POINT)
- user_name (TEXT, optional)
- is_anonymous (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

### prayer_responses
- id (UUID)
- prayer_id (UUID, foreign key to prayers)
- responder_id (UUID, foreign key to auth.users)
- responder_name (TEXT, optional)
- is_anonymous (BOOLEAN)
- message (TEXT)
- content_type (TEXT: 'text' | 'audio' | 'video')
- content_url (TEXT, optional)
- created_at (TIMESTAMPTZ)

### prayer_connections
- id (UUID)
- prayer_id (UUID)
- prayer_response_id (UUID)
- from_location (GEOGRAPHY POINT)
- to_location (GEOGRAPHY POINT)
- requester_name (TEXT)
- replier_name (TEXT)
- created_at (TIMESTAMPTZ)
- expires_at (TIMESTAMPTZ, default 1 year)

## RPC Functions

### get_nearby_prayers(lat, lng, radius)
```sql
SELECT * FROM get_nearby_prayers(42.5256, -83.2244, 50000);
-- radius in meters (50000 = 50km)
```

### create_prayer_connection(prayer_id, response_id, responder_id)
```sql
SELECT create_prayer_connection(
  'prayer-uuid',
  'response-uuid',
  'user-uuid'
);
```

## Environment Variables

```env
# .env.local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Troubleshooting Quick Fixes

### "Supabase not initialized"
```bash
# Check .env.local exists and has correct values
cat .env.local

# Restart dev server
npm run dev
```

### "No nearby prayers found"
```typescript
// Increase search radius
const prayers = await fetchNearbyPrayers(lat, lng, 100); // 100km

// Or check PostGIS in Supabase SQL Editor:
SELECT * FROM get_nearby_prayers(42.5, -83.2, 100000);
```

### "Permission denied" on insert
```typescript
// Ensure user is authenticated
const { user } = useAuth();
console.log('User:', user); // Should not be null

// Ensure user_id matches authenticated user
user_id: user.id // Not a string literal
```

### Real-time not updating
```bash
# In Supabase Dashboard:
# 1. Go to Database → Replication
# 2. Enable for: prayers, prayer_responses, prayer_connections
```

## Testing Commands

### Test Database Connection
```typescript
import { supabase } from './lib/supabase';
console.log('Supabase:', supabase ? 'Connected' : 'Not initialized');
```

### Test PostGIS
```sql
-- In Supabase SQL Editor
SELECT PostGIS_version();
SELECT * FROM get_nearby_prayers(42.5256, -83.2244, 50000);
```

### Test Prayer Creation
```typescript
const result = await createPrayer({
  user_id: user.id,
  content: "Test prayer",
  content_type: "text",
  location: { lat: 42.5, lng: -83.2 },
  is_anonymous: false,
});
console.log('Created:', result);
```

## Performance Tips

1. **Use Indexes** - Schema includes spatial indexes (GIST) for location queries
2. **Limit Radius** - Smaller radius = faster queries (default 50km is good)
3. **Enable Caching** - Supabase includes connection pooling
4. **Optimize Real-time** - Only subscribe to channels you need
5. **Use RLS** - Row Level Security is already optimized

## Next Actions

1. Read: SUPABASE_INTEGRATION_SUMMARY.md
2. Follow: MIGRATION_STEPS.md (Phase 1-6)
3. Reference: INTEGRATION_GUIDE.md when integrating components
4. Test: Create prayer → Respond → Check inbox → Verify real-time

---

**Need Help?**
- See INTEGRATION_GUIDE.md for detailed instructions
- See MIGRATION_STEPS.md for step-by-step process
- Check Supabase logs in Dashboard → Logs
- Check browser console for errors
