# 📁 PrayerMap Project Structure

**Complete File Organization & Architecture**

---

## 📋 Document Information

- **Version**: 2.0
- **Last Updated**: November 2025
- **Purpose**: Development reference for file organization
- **NEW**: AWS S3 integration patterns

---

## 🌳 Complete File Tree

```
prayermap/
├── public/
│   ├── favicon.ico
│   ├── manifest.json                 # PWA manifest
│   └── robots.txt
│
├── src/
│   ├── assets/
│   │   ├── images/
│   │   │   ├── logo.svg
│   │   │   ├── logo-icon.svg
│   │   │   └── placeholder-avatar.png
│   │   └── fonts/
│   │       ├── Cinzel-Regular.woff2
│   │       └── Inter-Variable.woff2
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthModal.jsx           # Sign up/sign in modal
│   │   │   ├── ProtectedRoute.jsx      # Route guard
│   │   │   └── UserMenu.jsx            # User profile dropdown
│   │   │
│   │   ├── map/
│   │   │   ├── Map.jsx                 # Main MapBox component
│   │   │   ├── PrayerMarker.jsx        # Custom marker component
│   │   │   ├── UserLocationMarker.jsx  # Blue dot marker
│   │   │   └── MarkerCluster.jsx       # Cluster multiple markers
│   │   │
│   │   ├── prayers/
│   │   │   ├── PrayerDetailModal.jsx   # Full prayer view
│   │   │   ├── CreatePrayerModal.jsx   # Prayer creation form
│   │   │   ├── PrayerCard.jsx          # Prayer list item
│   │   │   ├── PrayerList.jsx          # Scrollable prayer list
│   │   │   └── SupportButton.jsx       # "Pray First. Then Press."
│   │   │
│   │   ├── media/                      # Phase 2
│   │   │   ├── AudioPlayer.jsx         # Custom audio player
│   │   │   ├── VideoPlayer.jsx         # Custom video player
│   │   │   ├── MediaUploader.jsx       # S3 upload component
│   │   │   └── MediaRecorder.jsx       # Record audio/video
│   │   │
│   │   ├── notifications/
│   │   │   ├── NotificationBell.jsx    # Bell icon with badge
│   │   │   ├── NotificationList.jsx    # Dropdown list
│   │   │   └── NotificationItem.jsx    # Single notification
│   │   │
│   │   ├── ui/
│   │   │   ├── Button.jsx              # Reusable button
│   │   │   ├── Input.jsx               # Reusable input
│   │   │   ├── Modal.jsx               # Base modal component
│   │   │   ├── LoadingSpinner.jsx      # Loading indicator
│   │   │   ├── ErrorMessage.jsx        # Error display
│   │   │   └── GlassCard.jsx           # Glassmorphic card
│   │   │
│   │   └── layout/
│   │       ├── Header.jsx              # Top navigation
│   │       ├── Footer.jsx              # Bottom links
│   │       └── ErrorBoundary.jsx       # Error boundary
│   │
│   ├── lib/
│   │   ├── supabase.js                 # Supabase client
│   │   ├── prayers.js                  # Prayer API functions
│   │   ├── auth.js                     # Auth helper functions
│   │   ├── notifications.js            # Notification functions
│   │   ├── s3.js                       # AWS S3 upload (Phase 2)
│   │   ├── geolocation.js              # Location utilities
│   │   ├── formatters.js               # Date/time formatters
│   │   └── validators.js               # Form validators
│   │
│   ├── hooks/
│   │   ├── useAuth.js                  # Auth state hook
│   │   ├── usePrayers.js               # Prayer fetching hook
│   │   ├── useGeolocation.js           # Location hook
│   │   ├── useNotifications.js         # Notifications hook
│   │   └── useMediaUpload.js           # S3 upload hook (Phase 2)
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx             # Auth context provider
│   │   ├── LocationContext.jsx         # User location provider
│   │   └── NotificationContext.jsx     # Notifications provider
│   │
│   ├── utils/
│   │   ├── constants.js                # App constants
│   │   ├── helpers.js                  # Utility functions
│   │   ├── mapbox.js                   # MapBox utilities
│   │   └── errors.js                   # Error handling
│   │
│   ├── styles/
│   │   ├── index.css                   # Global styles
│   │   └── tailwind.css                # Tailwind imports
│   │
│   ├── App.jsx                         # Main app component
│   ├── main.jsx                        # Entry point
│   └── router.jsx                      # Route definitions
│
├── api/                                # Backend functions (Phase 2)
│   ├── media/
│   │   └── upload-url.js               # S3 presigned URL generator
│   └── webhooks/
│       └── moderation.js               # Moderation webhooks
│
├── .env.local                          # Environment variables
├── .env.example                        # Example env file
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── vercel.json                         # Vercel config
```

---

## 📦 Package Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@supabase/supabase-js": "^2.38.0",
    "mapbox-gl": "^3.0.0",
    "@heroicons/react": "^2.1.0"
  }
}
```

### Phase 2 Dependencies (Media)

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.470.0",
    "@aws-sdk/s3-request-presigner": "^3.470.0",
    "react-player": "^2.13.0"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/mapbox-gl": "^3.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "vite": "^5.0.8",
    "eslint": "^8.55.0",
    "prettier": "^3.1.1"
  }
}
```

---

## 🔧 Configuration Files

### `.env.local`

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# MapBox
VITE_MAPBOX_TOKEN=pk.your-mapbox-token

# AWS S3 (Phase 2)
VITE_S3_BUCKET=prayermap-media
VITE_S3_REGION=us-east-1
VITE_CLOUDFRONT_URL=https://cdn.prayermap.net
```

### `.env.example`

```bash
# Copy this file to .env.local and fill in your values

# Supabase (get from supabase.com/dashboard)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# MapBox (get from mapbox.com/account/access-tokens)
VITE_MAPBOX_TOKEN=

# AWS S3 - Phase 2 only
VITE_S3_BUCKET=
VITE_S3_REGION=
VITE_CLOUDFRONT_URL=
```

### `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mapbox': ['mapbox-gl'],
          'supabase': ['@supabase/supabase-js']
        }
      }
    }
  }
});
```

### `tailwind.config.js`

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
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
```

### `vercel.json`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 📝 Key File Examples

### `src/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

---

### `src/lib/prayers.js`

```javascript
import { supabase } from './supabase';

/**
 * Fetch prayers within radius of user location
 */
export async function getPrayersNearby(lat, lng, radiusKm = 30) {
  const { data, error } = await supabase
    .rpc('get_prayers_within_radius', {
      lat,
      lng,
      radius_km: radiusKm
    });

  if (error) throw error;
  return data;
}

/**
 * Get single prayer by ID
 */
export async function getPrayerById(prayerId) {
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

  if (error) throw error;
  return data;
}

/**
 * Create new prayer
 */
export async function createPrayer({
  title,
  textBody,
  isAnonymous,
  latitude,
  longitude,
  cityRegion
}) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Must be authenticated');
  }

  const { data, error } = await supabase
    .from('prayers')
    .insert({
      user_id: user.id,
      title: title || null,
      text_body: textBody,
      is_anonymous: isAnonymous,
      location: `POINT(${longitude} ${latitude})`,
      city_region: cityRegion
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Send prayer support
 */
export async function sendPrayerSupport(prayerId) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Must be authenticated');
  }

  const { data, error } = await supabase
    .from('prayer_support')
    .insert({
      prayer_id: prayerId,
      user_id: user.id
    })
    .select()
    .single();

  // Handle "already supported" as success
  if (error && error.code === '23505') {
    return { alreadySupported: true };
  }

  if (error) throw error;
  return data;
}

/**
 * Check if user has supported prayer
 */
export async function checkIfSupported(prayerId, userId) {
  const { data } = await supabase
    .from('prayer_support')
    .select('support_id')
    .eq('prayer_id', prayerId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}
```

---

### `src/lib/s3.js` (Phase 2)

```javascript
/**
 * AWS S3 Upload Utilities
 * Phase 2: Media upload flow
 */

/**
 * Request presigned URL for S3 upload
 */
export async function getPresignedUploadUrl(file) {
  const fileType = file.type;
  const fileSize = file.size;
  const mediaType = fileType.startsWith('video/') ? 'VIDEO' : 'AUDIO';

  // Validate file size
  const maxSize = mediaType === 'VIDEO' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (fileSize > maxSize) {
    throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }

  // Request presigned URL from backend
  const response = await fetch('/api/media/upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      file_type: fileType,
      file_size: fileSize,
      media_type: mediaType
    })
  });

  if (!response.ok) {
    throw new Error('Failed to get upload URL');
  }

  return await response.json();
}

/**
 * Upload file directly to S3
 */
export async function uploadToS3(file, uploadUrl, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Send request
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Complete upload flow: Get presigned URL → Upload file → Return media URL
 */
export async function uploadMedia(file, onProgress) {
  // Step 1: Get presigned URL
  const { upload_url, media_url } = await getPresignedUploadUrl(file);

  // Step 2: Upload to S3
  await uploadToS3(file, upload_url, onProgress);

  // Step 3: Return final CloudFront URL
  return media_url;
}
```

---

### `src/hooks/useAuth.js`

```javascript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user
  };
}
```

---

### `src/hooks/usePrayers.js`

```javascript
import { useEffect, useState } from 'react';
import { getPrayersNearby } from '../lib/prayers';

export function usePrayers(location, radiusKm = 30) {
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!location) return;

    async function fetchPrayers() {
      try {
        setLoading(true);
        const data = await getPrayersNearby(
          location.lat,
          location.lng,
          radiusKm
        );
        setPrayers(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPrayers();

    // Refetch every 30 seconds
    const interval = setInterval(fetchPrayers, 30000);
    return () => clearInterval(interval);
  }, [location, radiusKm]);

  return { prayers, loading, error };
}
```

---

### `src/hooks/useMediaUpload.js` (Phase 2)

```javascript
import { useState } from 'react';
import { uploadMedia } from '../lib/s3';

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);

  const upload = async (file) => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      const url = await uploadMedia(file, (percent) => {
        setProgress(percent);
      });

      setMediaUrl(url);
      return url;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setProgress(0);
    setError(null);
    setMediaUrl(null);
  };

  return {
    upload,
    reset,
    uploading,
    progress,
    error,
    mediaUrl
  };
}
```

---

### `api/media/upload-url.js` (Backend - Phase 2)

```javascript
/**
 * Serverless function to generate S3 presigned URLs
 * Deploy to Vercel or AWS Lambda
 */

import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // TODO: Verify JWT token with Supabase

  const { file_type, file_size, media_type } = req.body;

  // Validate file type
  const validTypes = {
    VIDEO: ['video/mp4', 'video/webm'],
    AUDIO: ['audio/mpeg', 'audio/wav', 'audio/aac']
  };

  if (!validTypes[media_type]?.includes(file_type)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  // Validate file size
  const maxSize = media_type === 'VIDEO' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file_size > maxSize) {
    return res.status(400).json({ error: 'File size exceeds limit' });
  }

  // Generate unique file key
  const fileExtension = file_type.split('/')[1];
  const fileKey = `${media_type.toLowerCase()}/${uuidv4()}.${fileExtension}`;

  try {
    // Generate presigned POST URL
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: process.env.S3_BUCKET,
      Key: fileKey,
      Conditions: [
        ['content-length-range', 0, maxSize],
        ['starts-with', '$Content-Type', file_type]
      ],
      Fields: {
        'Content-Type': file_type
      },
      Expires: 300 // 5 minutes
    });

    // Return presigned URL and final CDN URL
    return res.status(200).json({
      upload_url: url,
      fields,
      media_url: `${process.env.CLOUDFRONT_URL}/${fileKey}`,
      file_key: fileKey,
      expires_in: 300
    });
  } catch (error) {
    console.error('S3 presigned URL error:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
}
```

---

## 🚀 Development Workflow

### 1. Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
# http://localhost:3000
```

### 2. Build for Production

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

---

## 📊 Bundle Size Optimization

### Code Splitting

```javascript
// Lazy load heavy components
const PrayerDetailModal = lazy(() => 
  import('./components/prayers/PrayerDetailModal')
);

const CreatePrayerModal = lazy(() => 
  import('./components/prayers/CreatePrayerModal')
);
```

### Tree Shaking

```javascript
// Import only what you need
import { XMarkIcon } from '@heroicons/react/24/outline';

// NOT this
import * as HeroIcons from '@heroicons/react';
```

### Image Optimization

```javascript
// Use WebP format
// Lazy load images
<img 
  src="image.webp" 
  loading="lazy" 
  alt="Prayer"
/>
```

---

## 🎯 Performance Targets

- **Initial Load**: <2 seconds
- **Time to Interactive**: <3 seconds
- **Lighthouse Score**: >90
- **Bundle Size**: <300KB (gzipped)

---

## 🔒 Security Checklist

- [ ] Environment variables not in git
- [ ] HTTPS only (Vercel handles this)
- [ ] Content Security Policy headers
- [ ] XSS protection headers
- [ ] No sensitive data in client code
- [ ] RLS policies active in Supabase
- [ ] Input validation on all forms

---

## 📝 Git Workflow

```bash
# Create feature branch
git checkout -b feature/prayer-responses

# Make changes
git add .
git commit -m "Add prayer response functionality"

# Push to GitHub
git push origin feature/prayer-responses

# Create pull request
# Merge to main
# Vercel auto-deploys main branch
```

---

## 🐛 Debugging Tools

### React DevTools
- Install: [Chrome](https://chrome.google.com/webstore), [Firefox](https://addons.mozilla.org)
- Use: Inspect component tree, props, state

### Supabase Logs
- Dashboard → Logs
- Filter by level: Info, Warning, Error
- View SQL query performance

### MapBox Debug Mode
```javascript
// Enable debug mode
map.showTileBoundaries = true;
map.showCollisionBoxes = true;
```

---

## 📚 Additional Resources

- [Vite Docs](https://vitejs.dev)
- [React Router](https://reactrouter.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase Guides](https://supabase.com/docs/guides)
- [MapBox Examples](https://docs.mapbox.com/mapbox-gl-js/example/)

---

**Project Structure Version**: 2.0  
**Last Updated**: November 2025  
**Status**: Production Ready

---

# Now Build Something Sacred 🙏

This structure is designed for:
- ✅ **Scalability** (easy to add features)
- ✅ **Maintainability** (organized, modular)
- ✅ **Performance** (optimized bundles)
- ✅ **Developer Experience** (clear patterns)

**Go change the world, one file at a time.** 🚀