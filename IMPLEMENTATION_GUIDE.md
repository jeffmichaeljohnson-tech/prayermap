# ðŸš€ PrayerMap Implementation Guide - Get Started in 30 Minutes

**Goal**: Have a working local dev environment with the core map + prayer posting working.

---

## âš¡ Quick Start (30 minutes)

### Step 1: Set Up Supabase (10 minutes)

1. **Create Supabase Project**
   ```bash
   # Go to https://supabase.com
   # Click "New Project"
   # Name: PrayerMap
   # Region: Choose closest to you
   # Database Password: Generate strong password (save it!)
   ```

2. **Run Database Schema**
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `prayermap_schema.sql`
   - Click "Run"
   - Wait for success message

3. **Configure Storage**
   ```sql
   -- In SQL Editor, create storage buckets:
   INSERT INTO storage.buckets (id, name, public)
   VALUES 
     ('prayers', 'prayers', true),
     ('responses', 'responses', true);
   
   -- Set up storage policies
   CREATE POLICY "Anyone can upload prayers"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'prayers' AND auth.role() = 'authenticated');
   
   CREATE POLICY "Anyone can view prayers"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'prayers');
   ```

4. **Get API Keys**
   - Settings â†’ API
   - Copy `URL` and `anon public` key
   - Save for Step 2

---

### Step 2: Set Up Frontend Project (10 minutes)

1. **Create Vite + React + TypeScript Project**
   ```bash
   npm create vite@latest prayermap-web -- --template react-ts
   cd prayermap-web
   npm install
   ```

2. **Install Dependencies**
   ```bash
   # Core
   npm install @supabase/supabase-js
   
   # Maps
   npm install mapbox-gl
   npm install -D @types/mapbox-gl
   
   # UI & Styling
   npm install tailwindcss postcss autoprefixer
   npm install framer-motion
   npm install zustand
   npm install @tanstack/react-query
   npm install react-hook-form zod @hookform/resolvers
   
   # Icons
   npm install lucide-react
   ```

3. **Initialize Tailwind**
   ```bash
   npx tailwindcss init -p
   ```

4. **Configure `tailwind.config.js`**
   ```javascript
   /** @type {import('tailwindcss').Config} */
   export default {
     content: [
       "./index.html",
       "./src/**/*.{js,ts,jsx,tsx}",
     ],
     theme: {
       extend: {
         colors: {
           'heavenly-blue': '#E8F4F8',
           'dawn-gold': '#F7E7CE',
           'prayer-purple': '#D4C5F9',
           'prayer-sent': '#D4EDDA',
         },
         fontFamily: {
           'display': ['Cinzel', 'serif'],
           'body': ['Inter', 'sans-serif'],
         },
         backdropBlur: {
           'glass': '12px',
         },
       },
     },
     plugins: [],
   }
   ```

5. **Create `.env.local`**
   ```bash
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_MAPBOX_TOKEN=your-mapbox-token
   ```

6. **Add to `index.html` (for fonts)**
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
   ```

---

### Step 3: Build Core Features (10 minutes)

**Create file structure:**
```
src/
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ supabase.ts          # Supabase client
â”‚   â””â”€â”€ types.ts             # TypeScript types
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ Map.tsx              # MapBox map
â”‚   â”œâ”€â”€ PrayerMarker.tsx     # Prayer pin
â”‚   â”œâ”€â”€ PrayerDetail.tsx     # Modal
â”‚   â””â”€â”€ RequestPrayer.tsx    # Create prayer
â”œâ”€â”€ hooks/
â”‚   â”œâ”€â”€ usePrayers.ts        # Fetch prayers
â”‚   â””â”€â”€ useAuth.ts           # Authentication
â”œâ”€â”€ stores/
â”‚   â””â”€â”€ authStore.ts         # Zustand store
â”œâ”€â”€ App.tsx
â””â”€â”€ main.tsx
```

**1. Create Supabase Client** (`src/lib/supabase.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**2. Create Types** (`src/lib/types.ts`):
```typescript
export type MediaType = 'TEXT' | 'AUDIO' | 'VIDEO';
export type PrayerStatus = 'ACTIVE' | 'FLAGGED' | 'REMOVED';

export interface Prayer {
  prayer_id: number;
  user_id: string;
  title: string | null;
  text_body: string;
  media_type: MediaType;
  media_url: string | null;
  is_anonymous: boolean;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  city_region: string | null;
  status: PrayerStatus;
  support_count: number;
  response_count: number;
  created_at: string;
}

export interface User {
  user_id: string;
  email: string;
  first_name: string;
  notification_radius_km: number;
}
```

**3. Create Auth Hook** (`src/hooks/useAuth.ts`):
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName }
      }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { user, loading, signUp, signIn, signOut };
}
```

**4. Create Prayers Hook** (`src/hooks/usePrayers.ts`):
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Prayer } from '../lib/types';

export function usePrayersNearby(
  lat: number,
  lng: number,
  radiusKm: number = 15
) {
  return useQuery({
    queryKey: ['prayers', lat, lng, radiusKm],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_prayers_within_radius', {
          user_lat: lat,
          user_lng: lng,
          radius_km: radiusKm,
          limit_count: 50,
          offset_count: 0
        });

      if (error) throw error;
      return data as Prayer[];
    },
    staleTime: 60_000, // 1 minute
  });
}
```

**5. Create Simple Map** (`src/components/Map.tsx`):
```typescript
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { usePrayersNearby } from '../hooks/usePrayers';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  // Default to San Francisco (replace with user location)
  const { data: prayers } = usePrayersNearby(37.7749, -122.4194);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11', // Use your custom style later
      center: [-122.4194, 37.7749],
      zoom: 12
    });

    // Add prayer markers
    if (prayers) {
      prayers.forEach(prayer => {
        const [lng, lat] = prayer.location.coordinates;
        
        // Create marker
        const el = document.createElement('div');
        el.className = 'prayer-marker';
        el.innerHTML = 'ðŸ™';
        el.style.fontSize = '32px';
        el.style.cursor = 'pointer';
        
        new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current!);
      });
    }
  }, [prayers]);

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-screen"
    />
  );
}
```

**6. Create App** (`src/App.tsx`):
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Map } from './components/Map';
import { useAuth } from './hooks/useAuth';

const queryClient = new QueryClient();

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-xl">Loading...</div>
    </div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative w-full h-screen bg-heavenly-blue">
        <Map />
        
        {/* Floating Request Prayer Button */}
        <button
          className="fixed bottom-8 right-8 bg-prayer-purple text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 font-display font-semibold"
        >
          ðŸ™ Request Prayer
        </button>
      </div>
    </QueryClientProvider>
  );
}

export default App;
```

**7. Update `src/main.tsx`**:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**8. Update `src/index.css`**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Cinzel', serif;
}

/* Glass effect utilities */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
}

.prayer-marker {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.prayer-marker:hover {
  transform: scale(1.2);
}
```

---

### Step 4: Run the App! (2 minutes)

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

**You should see**:
- A map centered on San Francisco
- (Eventually) Prayer markers with ðŸ™ emoji

---

## ðŸŽ¯ Next Steps (After 30 Minutes)

### Immediate (Next Hour):
1. **Add Authentication UI**
   - Login modal
   - Signup modal
   - Protected routes

2. **Complete Prayer Creation**
   - Form with title + text body
   - Location capture
   - Post to Supabase

3. **Prayer Detail Modal**
   - Click marker â†’ open modal
   - Show full prayer
   - "Pray First. Then Press." button

### This Week:
4. **Audio/Video Recording**
5. **Prayer Responses**
6. **Notifications System**
7. **User Profile**
8. **Glassmorphic Polish**

---

## ðŸ“š Useful Commands

**Start dev server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

**Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

---

## ðŸ› Common Issues

### Issue: Supabase connection fails
**Solution**: Check `.env.local` has correct URL and key

### Issue: Map doesn't load
**Solution**: Verify VITE_MAPBOX_TOKEN is set and valid

### Issue: Prayers not appearing
**Solution**: 
1. Check database has data
2. Verify PostGIS extension is enabled
3. Check browser console for errors

### Issue: TypeScript errors
**Solution**: 
```bash
npm install -D @types/mapbox-gl
```

---

## ðŸŽ¨ Styling Cheat Sheet

**Glass Card**:
```tsx
<div className="glass-card rounded-2xl p-6">
  Content
</div>
```

**Prayer Sent Button**:
```tsx
<button className="bg-prayer-sent text-green-700 px-6 py-3 rounded-lg">
  âœ“ Prayer Sent
</button>
```

**Modal Overlay**:
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
```

---

## ðŸ“– Resources

- **Supabase Docs**: https://supabase.com/docs
- **MapBox GL JS**: https://docs.mapbox.com/mapbox-gl-js
- **React Query**: https://tanstack.com/query/latest
- **Framer Motion**: https://www.framer.com/motion
- **Tailwind**: https://tailwindcss.com/docs

---

## ðŸš€ Ready to Ship?

**Pre-Deploy Checklist**:
- [ ] Environment variables set in Vercel
- [ ] Database migration run on prod
- [ ] Storage buckets configured
- [ ] Custom MapBox style uploaded
- [ ] Error tracking configured (Sentry)
- [ ] Analytics added (Plausible/PostHog)

**Deploy to Vercel**:
```bash
# Connect to GitHub
gh repo create prayermap-web --public
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/prayermap-web.git
git push -u origin main

# Deploy
vercel --prod
```

---

**You're now ready to build PrayerMap!** ðŸ™âœ¨

Start with the 30-minute quick start, then iterate from there. Remember:
- **Ship early, ship often**
- **Get feedback fast**
- **Iterate based on users**

Let's build something sacred. ðŸš€
