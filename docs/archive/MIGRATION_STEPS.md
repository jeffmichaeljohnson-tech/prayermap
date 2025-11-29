# Step-by-Step Migration Guide

This guide provides a gradual migration path from mock data to real Supabase integration.

## Phase 1: Database Setup (15 minutes)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and set project name: "prayermap"
4. Set a strong database password (save it!)
5. Choose region closest to your users
6. Click "Create new project" and wait for setup

### Step 2: Get API Credentials
1. In Supabase Dashboard, go to Settings → API
2. Copy "Project URL" and "anon public" key
3. Create/update `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 3: Run Database Schema
1. In Supabase Dashboard, go to SQL Editor
2. Click "New query"
3. Copy entire contents of `supabase-schema.sql`
4. Paste and click "Run"
5. Verify success (should see "Success. No rows returned")

### Step 4: Enable Realtime
1. Go to Database → Replication
2. Enable replication for tables:
   - `prayers`
   - `prayer_responses`
   - `prayer_connections`

## Phase 2: Add Authentication (30 minutes)

### Step 1: Enable Auth Providers
1. In Supabase Dashboard, go to Authentication → Providers
2. Enable Email provider (already enabled by default)
3. Optional: Enable Google, Apple, or other providers

### Step 2: Create useAuth Hook
Create `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/hooks/useAuth.ts`:

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, name?: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
  };

  const signOut = async () => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    return await supabase.auth.signOut();
  };

  return { user, loading, signIn, signUp, signOut };
}
```

### Step 3: Update AuthModal Component
Update `/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/components/AuthModal.tsx` to use real auth:

```typescript
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function AuthModal({ onAuthenticated }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = isSignUp
      ? await signUp(email, password, name)
      : await signIn(email, password);

    if (result.error) {
      setError(result.error.message);
    } else if (result.data.user) {
      onAuthenticated({
        email: result.data.user.email!,
        name: result.data.user.user_metadata.name || name,
      });
    }
  };

  // Rest of component...
}
```

### Step 4: Update App.tsx
```typescript
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 42.5256,
    lng: -83.2244,
  });

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          console.log('Using default location');
        }
      );
    }
  }, []);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthModal onAuthenticated={() => {}} />; // Will be handled by useAuth
  }

  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className="w-full h-screen overflow-hidden">
      <PrayerMap
        userLocation={userLocation}
        userId={user.id}
        userName={user.user_metadata.name}
        onOpenSettings={() => setShowSettings(true)}
      />
    </div>
  );
}
```

## Phase 3: Integrate Prayers (45 minutes)

### Step 1: Update PrayerMap to Use usePrayers Hook

Replace mock data in `PrayerMap.tsx`:

```typescript
import { usePrayers } from '../hooks/usePrayers';

interface PrayerMapProps {
  userLocation: { lat: number; lng: number };
  userId: string; // Add
  userName?: string; // Add
  onOpenSettings: () => void;
}

export function PrayerMap({ userLocation, userId, userName, onOpenSettings }: PrayerMapProps) {
  // Replace mock prayers with real hook
  const {
    prayers,
    loading: prayersLoading,
    error: prayersError,
    createPrayer,
    respondToPrayer,
  } = usePrayers({
    location: userLocation,
    radiusKm: 50,
    autoFetch: true,
    enableRealtime: true,
  });

  // REMOVE this entire useEffect that sets mock prayers:
  // useEffect(() => {
  //   const mockPrayers = [...];
  //   setPrayers(mockPrayers);
  // }, []);

  // Update handleRequestPrayer
  const handleRequestPrayer = async (
    newPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const prayer = await createPrayer({
      ...newPrayer,
      user_id: userId,
      user_name: newPrayer.is_anonymous ? undefined : userName,
    });

    if (prayer) {
      setShowRequestModal(false);
    }
  };

  // Update handlePrayerSubmit
  const handlePrayerSubmit = async (prayer: Prayer) => {
    setSelectedPrayer(null);
    setAnimatingPrayer({ prayer, userLocation });

    // Create response in database
    const success = await respondToPrayer(
      prayer.id,
      userId,
      userName || 'Anonymous',
      replyContent || 'Praying for you',
      replyType,
      undefined,
      replyIsAnonymous
    );

    if (success) {
      setTimeout(() => {
        setAnimatingPrayer(null);
      }, 6000);
    }
  };

  // Show loading state
  if (prayersLoading && prayers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-gray-700">Loading prayers...</div>
      </div>
    );
  }

  // Rest of component stays the same...
}
```

### Step 2: Update RequestPrayerModal

Update the interface and usage:

```typescript
interface RequestPrayerModalProps {
  userLocation: { lat: number; lng: number };
  userId: string; // Add
  userName?: string; // Add
  onClose: () => void;
  onSubmit: (prayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>) => void;
}

export function RequestPrayerModal({
  userLocation,
  userId,
  userName,
  onClose,
  onSubmit,
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

  // Rest stays the same...
}
```

### Step 3: Update Component Props in PrayerMap

```typescript
// Update RequestPrayerModal usage
{showRequestModal && (
  <RequestPrayerModal
    userLocation={userLocation}
    userId={userId}
    userName={userName}
    onClose={() => setShowRequestModal(false)}
    onSubmit={handleRequestPrayer}
  />
)}
```

## Phase 4: Integrate Inbox (30 minutes)

### Step 1: Update InboxModal

```typescript
import { useInbox } from '../hooks/useInbox';

interface InboxModalProps {
  userId: string; // Add
  onClose: () => void;
}

export function InboxModal({ userId, onClose }: InboxModalProps) {
  const { inbox, loading, error, totalUnread, markAsRead } = useInbox({
    userId,
    autoFetch: true,
    enableRealtime: true,
  });

  if (loading) {
    return <div>Loading inbox...</div>;
  }

  if (error) {
    return <div>Error loading inbox: {error}</div>;
  }

  return (
    <motion.div>
      {/* Header */}
      <h2>Prayer Inbox ({totalUnread} unread)</h2>

      {/* Inbox Items */}
      {inbox.length === 0 ? (
        <p>No messages yet</p>
      ) : (
        inbox.map((item) => (
          <div
            key={item.prayer.id}
            onClick={() => markAsRead(item.prayer.id)}
          >
            <h3>{item.prayer.title || 'Prayer Request'}</h3>
            <p>{item.prayer.content}</p>
            <p>{item.responses.length} people prayed</p>
            {item.unreadCount > 0 && (
              <span className="badge">{item.unreadCount} new</span>
            )}

            {/* Show responses */}
            {item.responses.map((response) => (
              <div key={response.id}>
                <p>{response.is_anonymous ? 'Anonymous' : response.responder_name}</p>
                <p>{response.message}</p>
              </div>
            ))}
          </div>
        ))
      )}
    </motion.div>
  );
}
```

### Step 2: Update PrayerMap to Pass userId to InboxModal

```typescript
{showInbox && (
  <InboxModal userId={userId} onClose={() => setShowInbox(false)} />
)}
```

### Step 3: Update Inbox Badge with Real Count

```typescript
// In PrayerMap component
const { totalUnread } = useInbox({ userId, autoFetch: true, enableRealtime: true });

// Update the badge
<span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center">
  {totalUnread}
</span>
```

## Phase 5: Update Field Names (30 minutes)

Update all component references from camelCase to snake_case:

### PrayerDetailModal.tsx
```typescript
// Update all references:
prayer.is_anonymous // instead of prayer.isAnonymous
prayer.user_name // instead of prayer.userName
prayer.content_type // instead of prayer.contentType
```

### PrayerMarker.tsx
```typescript
// Update references if any
```

### Any other components using Prayer type

## Phase 6: Testing (30 minutes)

### Test 1: Create Prayer
1. Open app and sign in
2. Click "Request Prayer"
3. Fill out form and submit
4. Verify it appears on the map
5. Check Supabase Dashboard → Table Editor → prayers

### Test 2: Respond to Prayer
1. Click on a prayer marker
2. Fill out response form
3. Submit
4. Verify animation plays
5. Check Supabase Dashboard → prayer_responses and prayer_connections

### Test 3: Inbox
1. Have another user (or use another account)
2. Respond to one of your prayers
3. Open inbox
4. Verify you see the response
5. Click to mark as read

### Test 4: Real-time Updates
1. Open app in two browser windows
2. Create a prayer in one window
3. Verify it appears in the other window
4. Test with responses too

## Phase 7: Production Checklist

- [ ] Environment variables set in production
- [ ] RLS policies tested and verified
- [ ] PostGIS extension enabled
- [ ] Indexes created for performance
- [ ] Realtime enabled for necessary tables
- [ ] Auth flows tested (sign up, sign in, sign out)
- [ ] Error handling added for all API calls
- [ ] Loading states implemented
- [ ] Storage bucket created for audio/video (if implementing)
- [ ] Connection cleanup scheduled job (optional)

## Troubleshooting

### "No nearby prayers found"
- Check that prayers are being created with correct location format
- Verify PostGIS function is working: run `SELECT * FROM get_nearby_prayers(42.5256, -83.2244, 50000);`
- Check console for errors

### "Cannot create prayer"
- Verify you're authenticated (check `user` in console)
- Check RLS policies are correct
- Verify user_id is being passed correctly

### Real-time not updating
- Check Realtime is enabled for tables in Supabase Dashboard
- Check browser console for WebSocket errors
- Verify subscription is being created (check logs)

### Authentication issues
- Clear browser storage and try again
- Check Supabase auth settings
- Verify email confirmation settings (disable for development)
