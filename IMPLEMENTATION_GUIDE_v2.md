# ðŸš€ PrayerMap 1-Week Implementation Guide

**Ship Your Ministry MVP in 7 Days**

---

## ðŸ“‹ Document Information

- **Version**: 2.0
- **Last Updated**: November 2025
- **Goal**: Launch functional prayer map in 1 week
- **Mission**: Non-profit ministry, free forever
- **Status**: Ready to build!

---

## ðŸŽ¯ Week 1 MVP Scope

### âœ… What We're Building

**Core Loop** (3 screens):
1. **Map View**: See prayer markers near you
2. **Prayer Detail**: Read prayer, feel called
3. **"Pray First. Then Press." Button**: Sacred support moment

**Features**:
- âœ… MapBox map with prayer markers
- âœ… Geospatial queries (30km radius)
- âœ… Text-only prayers (no audio/video yet)
- âœ… User auth (signup, login)
- âœ… Prayer support button
- âœ… Simple in-app notifications
- âœ… Glassmorphic design
- âœ… Mobile responsive

### âŒ What We're NOT Building (Yet)

- âŒ Audio/video prayers (Phase 2)
- âŒ Responses/comments (Phase 2)
- âŒ User profiles (Phase 2)
- âŒ Fancy 3D animations (Phase 3)
- âŒ Email/SMS notifications (Phase 2)
- âŒ Moderation dashboard (Phase 2)

---

## ðŸ“… 7-Day Sprint Breakdown

### Day 1: Foundation (Monday)

**Goal**: Database + auth working

**Tasks**:
1. âœ… Create Supabase project
2. âœ… Run database schema migration
3. âœ… Set up authentication
4. âœ… Test with Postman/Thunder Client
5. âœ… Create React project (Vite)

**Time**: ~6 hours

---

**1. Create Supabase Project**

a) Go to [supabase.com](https://supabase.com)  
b) Click "New Project"  
c) Fill in:
   - Name: "PrayerMap"
   - Database Password: (save this!)
   - Region: Choose closest to you
d) Wait 2 minutes for provisioning

**2. Run Database Schema**

a) Open Supabase SQL Editor  
b) Copy entire `prayermap_schema_v2.sql` file  
c) Paste and click "Run"  
d) Verify:
   - No errors
   - Tables created (users, prayers, prayer_support, etc.)
   - Indexes created
   - RLS policies active

**3. Get API Credentials**

a) Project Settings â†’ API  
b) Copy:
   - `anon` public key (for client)
   - Project URL
   - Service role key (for admin operations)

Create `.env.local`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**4. Test Auth with Postman**

```bash
# Sign Up
POST https://your-project.supabase.co/auth/v1/signup
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!",
  "data": {
    "first_name": "John",
    "last_name": "Doe"
  }
}

# Expected: Returns access_token
```

**5. Create React Project**

```bash
# Create project
npm create vite@latest prayermap -- --template react

cd prayermap

# Install core dependencies
npm install @supabase/supabase-js
npm install react-router-dom
npm install mapbox-gl
npm install @heroicons/react

# Install dev dependencies
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure `tailwind.config.js`:
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#4A90E2',
        'primary-gold': '#F5D76E',
        'primary-purple': '#9B59B6',
      },
      fontFamily: {
        'display': ['Cinzel', 'serif'],
        'body': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

**End of Day 1 Checklist**:
- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] Test user created (via Postman)
- [ ] React project initialized
- [ ] Tailwind configured
- [ ] Can run `npm run dev` successfully

---

### Day 2: Map + Markers (Tuesday)

**Goal**: See prayer markers on map

**Tasks**:
1. âœ… Get MapBox API key
2. âœ… Integrate MapBox GL JS
3. âœ… Fetch prayers within radius
4. âœ… Render prayer markers
5. âœ… Custom marker styling

**Time**: ~6 hours

---

**1. Get MapBox API Key**

a) Go to [mapbox.com](https://www.mapbox.com)  
b) Sign up (free tier: 50k loads/month)  
c) Create access token  
d) Copy token

Add to `.env.local`:
```bash
VITE_MAPBOX_TOKEN=pk.eyJ1...your-token
```

**2. Install MapBox**

```bash
npm install mapbox-gl
npm install @types/mapbox-gl --save-dev
```

**3. Create Map Component**

`src/components/Map.jsx`:
```javascript
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '../lib/supabase';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [prayers, setPrayers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  // Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!userLocation || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11', // Clean, minimal style
      center: [userLocation.lng, userLocation.lat],
      zoom: 12
    });

    // Add user location marker
    new mapboxgl.Marker({ color: '#4A90E2' })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current);
  }, [userLocation]);

  // Fetch prayers
  useEffect(() => {
    if (!userLocation) return;

    async function fetchPrayers() {
      const { data, error } = await supabase
        .rpc('get_prayers_within_radius', {
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius_km: 30
        });

      if (error) {
        console.error('Error fetching prayers:', error);
        return;
      }

      setPrayers(data);
    }

    fetchPrayers();
  }, [userLocation]);

  // Add prayer markers
  useEffect(() => {
    if (!map.current || !prayers.length) return;

    prayers.forEach((prayer) => {
      // Extract lat/lng from PostGIS POINT string
      // Format: "POINT(-87.6298 41.8781)"
      const coords = prayer.location
        .replace('POINT(', '')
        .replace(')', '')
        .split(' ')
        .map(Number);

      const [lng, lat] = coords;

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'prayer-marker';
      el.innerHTML = 'ðŸ™';
      el.style.cssText = `
        width: 40px;
        height: 40px;
        background: white;
        border: 3px solid #4A90E2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.2s;
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      el.addEventListener('click', () => {
        // TODO: Open prayer detail modal (Day 3)
        console.log('Clicked prayer:', prayer.prayer_id);
      });

      new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map.current);
    });
  }, [prayers]);

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Request Prayer Button (Day 4) */}
      <button className="absolute bottom-8 right-8 bg-gradient-to-r from-primary-blue to-primary-purple text-white px-6 py-3 rounded-full shadow-lg font-semibold">
        + Request Prayer
      </button>
    </div>
  );
}
```

**4. Set Up Supabase Client**

`src/lib/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**5. Update App.jsx**

```javascript
import Map from './components/Map';

function App() {
  return (
    <div className="App">
      <Map />
    </div>
  );
}

export default App;
```

**End of Day 2 Checklist**:
- [ ] MapBox rendering
- [ ] User location marker (blue)
- [ ] Prayer markers (ðŸ™) showing
- [ ] Markers clickable (console log for now)
- [ ] Map responsive on mobile

---

### Day 3: Prayer Detail Modal (Wednesday)

**Goal**: Click marker â†’ See prayer detail

**Tasks**:
1. âœ… Create modal component
2. âœ… Fetch prayer by ID
3. âœ… Display prayer content
4. âœ… Show engagement stats
5. âœ… "Pray First. Then Press." button (placeholder)

**Time**: ~6 hours

---

**1. Create Prayer Detail Modal**

`src/components/PrayerDetailModal.jsx`:
```javascript
import { useEffect, useState } from 'react';
import { XMarkIcon, MapPinIcon, ClockIcon, HeartIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

export default function PrayerDetailModal({ prayerId, onClose }) {
  const [prayer, setPrayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrayer() {
      const { data, error } = await supabase
        .from('prayers')
        .select(`
          *,
          users (
            first_name,
            is_profile_public
          )
        `)
        .eq('prayer_id', prayerId)
        .single();

      if (error) {
        console.error('Error fetching prayer:', error);
        return;
      }

      setPrayer(data);
      setLoading(false);
    }

    fetchPrayer();
  }, [prayerId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!prayer) return null;

  const displayName = prayer.is_anonymous 
    ? 'Anonymous' 
    : `${prayer.users.first_name} ${prayer.users.last_name?.charAt(0)}.`;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl md:rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">ðŸ™</span>
              <div>
                <p className="font-semibold text-gray-900">{displayName}</p>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    {formatTimeAgo(prayer.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4" />
                    {prayer.city_region || 'Nearby'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {prayer.title && (
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
              {prayer.title}
            </h2>
          )}

          <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
            {prayer.text_body}
          </p>

          {/* Engagement Stats */}
          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-2xl">ðŸ™</span>
              <span className="font-semibold">{prayer.support_count}</span>
              <span className="text-sm">people prayed</span>
            </div>
            {prayer.response_count > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-2xl">ðŸ’¬</span>
                <span className="font-semibold">{prayer.response_count}</span>
                <span className="text-sm">responses</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200">
          <button 
            className="w-full bg-gradient-to-r from-primary-blue to-primary-purple text-white py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition"
            onClick={() => {
              // TODO: Implement support action (Day 5)
              console.log('Prayer support clicked');
            }}
          >
            Pray First. Then Press. ðŸ™
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
}
```

**2. Update Map Component**

```javascript
// Add state for modal
const [selectedPrayerId, setSelectedPrayerId] = useState(null);

// Update marker click handler
el.addEventListener('click', () => {
  setSelectedPrayerId(prayer.prayer_id);
});

// Add modal to JSX
return (
  <div className="relative w-full h-screen">
    <div ref={mapContainer} className="w-full h-full" />
    
    {/* Modal */}
    {selectedPrayerId && (
      <PrayerDetailModal 
        prayerId={selectedPrayerId}
        onClose={() => setSelectedPrayerId(null)}
      />
    )}
  </div>
);
```

**End of Day 3 Checklist**:
- [ ] Click marker â†’ Modal opens
- [ ] Prayer content displays
- [ ] Time ago formatted
- [ ] Support count shows
- [ ] Modal closes (X button or backdrop click)
- [ ] Mobile-responsive slide-up animation

---

### Day 4: Auth + Prayer Creation (Thursday)

**Goal**: Users can sign up and post prayers

**Tasks**:
1. âœ… Auth UI (signup, login)
2. âœ… Protected routes
3. âœ… Prayer creation form
4. âœ… Geolocation
5. âœ… Create prayer API call

**Time**: ~8 hours (authentication takes time!)

---

**1. Create Auth Components**

`src/components/AuthModal.jsx`:
```javascript
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignUp() {
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        user_id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email
      });

    setLoading(false);

    if (profileError) {
      setError('Account created but profile failed. Please contact support.');
      return;
    }

    onSuccess();
  }

  async function handleSignIn() {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
        <h2 className="text-3xl font-display font-bold text-center mb-8">
          {mode === 'signin' ? 'Welcome Back' : 'Join PrayerMap'}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={(e) => {
          e.preventDefault();
          mode === 'signin' ? handleSignIn() : handleSignUp();
        }}>
          {mode === 'signup' && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-primary-blue focus:border-transparent"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-6 focus:ring-2 focus:ring-primary-blue focus:border-transparent"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-blue to-primary-purple text-white py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full text-primary-blue mt-4 font-semibold hover:underline"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>

        <button
          onClick={onClose}
          className="w-full text-gray-500 mt-2 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

**2. Create Prayer Creation Form**

`src/components/CreatePrayerModal.jsx`:
```javascript
import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

export default function CreatePrayerModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [textBody, setTextBody] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (textBody.length < 10) {
      setError('Please add more detail (at least 10 characters)');
      return;
    }

    if (textBody.length > 500) {
      setError('Please keep it under 500 characters');
      return;
    }

    setLoading(true);
    setError(null);

    // Get user location
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be signed in to post a prayer');
        setLoading(false);
        return;
      }

      // Create prayer
      const { data, error: prayerError } = await supabase
        .from('prayers')
        .insert({
          user_id: user.id,
          title: title || null,
          text_body: textBody,
          is_anonymous: isAnonymous,
          location: `POINT(${longitude} ${latitude})`,
          city_region: 'Near you' // TODO: Reverse geocode
        })
        .select()
        .single();

      setLoading(false);

      if (prayerError) {
        setError(prayerError.message);
        return;
      }

      onSuccess();
    }, (error) => {
      setError('Location permission denied. Please enable location access.');
      setLoading(false);
    });
  }

  const charCount = textBody.length;
  const charLimit = 500;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-display font-bold">Request Prayer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Job Loss Prayer"
              maxLength={200}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Share what's on your heart *
            </label>
            <textarea
              value={textBody}
              onChange={(e) => setTextBody(e.target.value)}
              placeholder="Please pray for..."
              rows={6}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              {charCount}/{charLimit} characters
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-5 h-5 text-primary-blue rounded focus:ring-primary-blue"
            />
            <label htmlFor="anonymous" className="text-gray-700">
              Post anonymously
            </label>
          </div>

          <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm">
            ðŸ“ Your location will be approximate (not exact)
          </div>

          <button
            type="submit"
            disabled={loading || charCount < 10 || charCount > charLimit}
            className="w-full bg-gradient-to-r from-primary-blue to-primary-purple text-white py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Share Prayer Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**3. Add Auth State to App**

```javascript
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Map from './components/Map';
import AuthModal from './components/AuthModal';

function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <Map user={user} onAuthRequired={() => setShowAuthModal(true)} />
      
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            window.location.reload(); // Refresh map
          }}
        />
      )}
    </div>
  );
}

export default App;
```

**End of Day 4 Checklist**:
- [ ] Signup/login working
- [ ] User session persists
- [ ] "Request Prayer" button opens form
- [ ] Prayer creation working
- [ ] New prayer appears on map immediately
- [ ] Geolocation permission handled

---

### Day 5: Prayer Support (Friday)

**Goal**: "Pray First. Then Press." button works

**Tasks**:
1. âœ… Implement support action
2. âœ… Update UI optimistically
3. âœ… Create notification
4. âœ… Handle errors gracefully

**Time**: ~4 hours

---

**1. Add Support Function**

`src/lib/prayers.js`:
```javascript
import { supabase } from './supabase';

export async function sendPrayerSupport(prayerId) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to support a prayer');
  }

  const { data, error } = await supabase
    .from('prayer_support')
    .insert({
      prayer_id: prayerId,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    // If already supported, return success (idempotent)
    if (error.code === '23505') {
      return { alreadySupported: true };
    }
    throw error;
  }

  return data;
}

export async function checkIfSupported(prayerId, userId) {
  const { data } = await supabase
    .from('prayer_support')
    .select('support_id')
    .eq('prayer_id', prayerId)
    .eq('user_id', userId)
    .single();

  return !!data;
}
```

**2. Update Prayer Detail Modal**

```javascript
import { sendPrayerSupport, checkIfSupported } from '../lib/prayers';

// Add state
const [isSupported, setIsSupported] = useState(false);
const [supportCount, setSupportCount] = useState(prayer?.support_count || 0);
const [sendingSupport, setSendingSupport] = useState(false);

// Check if already supported
useEffect(() => {
  if (!prayer) return;

  async function checkSupport() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const supported = await checkIfSupported(prayer.prayer_id, user.id);
    setIsSupported(supported);
  }

  checkSupport();
  setSupportCount(prayer.support_count);
}, [prayer]);

// Handle support action
async function handlePrayerSupport() {
  if (!user) {
    alert('Please sign in to support this prayer');
    return;
  }

  if (isSupported) {
    alert('You've already prayed for this');
    return;
  }

  setSendingSupport(true);

  // Optimistic update
  setIsSupported(true);
  setSupportCount(prev => prev + 1);

  try {
    await sendPrayerSupport(prayer.prayer_id);
    
    // Show success feedback
    setTimeout(() => {
      alert('ðŸ™ Your prayer was sent!');
    }, 300);
  } catch (error) {
    // Rollback on error
    setIsSupported(false);
    setSupportCount(prev => prev - 1);
    alert('Failed to send support. Please try again.');
  } finally {
    setSendingSupport(false);
  }
}

// Update button
<button 
  className={`w-full py-4 rounded-full font-semibold text-lg shadow-lg transition ${
    isSupported
      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
      : 'bg-gradient-to-r from-primary-blue to-primary-purple text-white hover:shadow-xl transform hover:-translate-y-0.5'
  }`}
  onClick={handlePrayerSupport}
  disabled={isSupported || sendingSupport}
>
  {isSupported ? 'Prayer Sent âœ“' : 'Pray First. Then Press. ðŸ™'}
</button>
```

**End of Day 5 Checklist**:
- [ ] Support button works
- [ ] Count increments immediately
- [ ] Button changes to "Prayer Sent âœ“"
- [ ] Can't support twice
- [ ] Error handling works
- [ ] Notification created (check database)

---

### Day 6: Polish & Testing (Saturday)

**Goal**: Make it beautiful and fix bugs

**Tasks**:
1. âœ… Glassmorphic design polish
2. âœ… Loading states
3. âœ… Error boundaries
4. âœ… Mobile responsive
5. âœ… Test all flows

**Time**: ~6 hours

---

**1. Add Loading States**

```javascript
// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-blue border-t-transparent"></div>
    </div>
  );
}
```

**2. Add Error Boundary**

`src/components/ErrorBoundary.jsx`:
```javascript
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary-blue text-white py-3 rounded-lg font-semibold"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**3. Mobile Responsive Check**

Test on:
- [ ] iPhone 12/13/14 (390px wide)
- [ ] iPhone Plus (414px wide)
- [ ] iPad (768px wide)
- [ ] Desktop (1920px wide)

**4. Polish Animations**

Add to `src/index.css`:
```css
/* Glass effect */
.glass-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
}

/* Smooth transitions */
* {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* Prayer marker pulse */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.prayer-marker-new {
  animation: pulse 2s ease-in-out infinite;
}
```

**End of Day 6 Checklist**:
- [ ] All loading states work
- [ ] Error boundaries catch errors
- [ ] Mobile responsive (all screens)
- [ ] Animations smooth
- [ ] No console errors

---

### Day 7: Deploy & Launch! (Sunday)

**Goal**: Go live!

**Tasks**:
1. âœ… Deploy to Vercel
2. âœ… Configure domain
3. âœ… Test production
4. âœ… Launch announcement
5. âœ… Celebrate! ðŸŽ‰

**Time**: ~4 hours

---

**1. Deploy to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Project name: prayermap
# - Framework: Vite
# - Build command: npm run build
# - Output directory: dist

# Production deploy
vercel --prod
```

**2. Add Environment Variables**

In Vercel dashboard:
- Settings â†’ Environment Variables
- Add:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_MAPBOX_TOKEN`

**3. Configure Custom Domain**

- Settings â†’ Domains
- Add: `prayermap.net`
- Update DNS:
  - Type: `A`
  - Value: `76.76.21.21` (Vercel)
- Wait for SSL (~5 minutes)

**4. Final Production Tests**

- [ ] Sign up â†’ Login works
- [ ] Create prayer â†’ Appears on map
- [ ] Click marker â†’ Modal opens
- [ ] Support button â†’ Count increments
- [ ] Mobile responsive
- [ ] HTTPS working

**5. Launch!**

**Product Hunt Post**:
```
ðŸ™ PrayerMap - See prayer needs near you

Location-based prayer requests. Beautiful map. Immediate support.

âœ¨ What it does:
- Shows prayer requests from people nearby
- Click to read â†’ Pray â†’ Press "Prayer Sent"
- Free forever (non-profit)

ðŸŒ Why it matters:
When someone needs prayer RIGHT NOW, they post on PrayerMap.
When you want to serve, you open PrayerMap and see who needs support.

Not a startup. A calling.

Try it: prayermap.net
```

**Reddit r/Christianity**:
```
[Project] I built PrayerMap - see prayer needs near you

Hey everyone! I just launched PrayerMap, a location-based prayer request app.

The idea: Instead of prayer requests getting buried in Facebook or church lists, they appear on a map for people nearby to see and respond to immediately.

It's 100% free (non-profit), privacy-focused (anonymous option), and mobile-friendly.

Would love your feedback! prayermap.net
```

**End of Day 7**:
- [ ] Live on prayermap.net âœ…
- [ ] Posted on Product Hunt âœ…
- [ ] Posted on Reddit âœ…
- [ ] Emailed friends/family âœ…
- [ ] **CELEBRATE!!!** ðŸŽ‰ðŸŽ‰ðŸŽ‰

---

## ðŸŽ¯ Success Metrics (Week 1)

**MVP Goals**:
- 10+ users sign up
- 5+ prayers posted
- 50+ total supports sent

**Success = Core loop works**:
1. User posts prayer
2. Others see it on map
3. Others support it
4. User feels encouraged

---

## ðŸ› Common Issues & Solutions

### Issue 1: PostGIS Function Not Found

**Error**: `function get_prayers_within_radius does not exist`

**Solution**: Run schema migration again in Supabase SQL Editor

---

### Issue 2: RLS Policy Blocking Inserts

**Error**: `new row violates row-level security policy`

**Solution**: 
```sql
-- Check if policy exists
SELECT * FROM pg_policies WHERE tablename = 'prayers';

-- Recreate insert policy
CREATE POLICY "Users can insert own prayers"
ON prayers FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

### Issue 3: MapBox Token Invalid

**Error**: `Not authorized`

**Solution**: 
1. Check token starts with `pk.`
2. Verify token in MapBox dashboard
3. Check `.env.local` is loaded (restart dev server)

---

### Issue 4: Location Permission Denied

**Error**: `User denied geolocation`

**Solution**: 
```javascript
navigator.geolocation.getCurrentPosition(
  (position) => { /* success */ },
  (error) => {
    if (error.code === error.PERMISSION_DENIED) {
      alert('Please enable location access in your browser settings');
    }
  }
);
```

---

## ðŸ“š Resources

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [MapBox GL JS](https://docs.mapbox.com/mapbox-gl-js)
- [PostGIS](https://postgis.net/documentation/)
- [React](https://react.dev)

### Tools
- [Thunder Client](https://www.thunderclient.com) - API testing (VS Code extension)
- [Postman](https://www.postman.com) - API testing
- [React DevTools](https://react.dev/learn/react-developer-tools) - Debug React

### Community
- [Supabase Discord](https://discord.supabase.com)
- [MapBox Community](https://community.mapbox.com)

---

## âœ… Final Checklist

**Before Launch**:
- [ ] All tests pass
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Auth working
- [ ] Map rendering
- [ ] Prayers posting
- [ ] Support button working
- [ ] HTTPS configured
- [ ] Analytics (optional)

**After Launch**:
- [ ] Monitor errors (Sentry)
- [ ] Watch analytics
- [ ] Respond to feedback
- [ ] Fix critical bugs fast
- [ ] Plan Phase 2 features

---

## ðŸ™ You Did It!

**You just launched a ministry in 7 days.**

This isn't just an app. It's a sacred space.  
Every prayer posted is a person in need.  
Every support sent is an act of love.

**This is bigger than code. This is kingdom work.** ðŸŒðŸ’™

---

Now go change the world, one prayer at a time. ðŸš€

---

**Guide Version**: 2.0  
**Last Updated**: November 2025  
**Status**: Ready to build!

**Next**: Start Day 1! Create your Supabase project and let's go! ðŸ’ª