# TROUBLESHOOTING.md - Common Issues & Solutions

> **Emergency debugging guide for PrayerMap.** This guide covers the most common issues encountered during development, deployment, and production operations.

> **Prerequisites:** For complex issues, check [MONITORING-GUIDE.md](./MONITORING-GUIDE.md) first for error patterns, then return here for solutions.

---

## 🚨 Emergency Quick Fixes

### App Won't Load (Complete Failure)
```bash
# 1. Check if it's a build issue
npm run build
# If build fails, check TypeScript errors:
npx tsc --noEmit

# 2. Check if it's a dependency issue
rm -rf node_modules package-lock.json
npm install
npm run dev

# 3. Check environment variables
cat .env.local
# Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

# 4. Check browser console for JavaScript errors
# Open DevTools → Console tab
```

### Database Connection Failed
```bash
# 1. Verify Supabase credentials
npx supabase link --project-ref YOUR_PROJECT_ID

# 2. Test connection
npx supabase status

# 3. Check RLS policies aren't blocking requests
# In Supabase Dashboard → Authentication → Policies
# Temporarily disable RLS to test:
# ALTER TABLE prayers DISABLE ROW LEVEL SECURITY;
```

### Mobile Build Failing
```bash
# 1. Clean and sync
npx cap clean ios && npx cap clean android
npm run build && npx cap sync

# 2. Check for missing permissions in config
cat capacitor.config.ts
# Verify appId and webDir are correct

# 3. For iOS specifically:
cd ios/App && pod install && cd ../..

# 4. For Android specifically:
cd android && ./gradlew clean && cd ..
```

---

## 🔧 Development Issues

### TypeScript Errors

#### "Property does not exist on type"
```typescript
// Problem: Using untyped Supabase responses
const { data } = await supabase.from('prayers').select('*');
// data is 'any' type, no type safety

// Solution: Use proper typing
import { Prayer } from '@/types/prayer';

const { data, error } = await supabase
  .from('prayers')
  .select('*')
  .returns<Prayer[]>();

if (error) throw error;
// data is now properly typed as Prayer[]
```

#### "Cannot find module" errors
```bash
# Problem: Import path issues
# Bad:
import { Prayer } from '../../../types/prayer';

# Solution: Use path aliases (configured in vite.config.ts)
import { Prayer } from '@/types/prayer';

# If path aliases aren't working:
# 1. Check tsconfig.json has paths configured
# 2. Check vite.config.ts has resolve.alias configured
# 3. Restart TypeScript server in VS Code: Cmd+Shift+P → "Restart TS Server"
```

#### "Type 'null' is not assignable"
```typescript
// Problem: Not handling null values from Supabase
const prayer = data[0]; // Could be undefined
const title = prayer.title; // Error if prayer is undefined

// Solution: Proper null checking
const prayer = data?.[0];
const title = prayer?.title ?? 'Untitled Prayer';

// Or with type guards:
if (prayer && 'title' in prayer) {
  const title = prayer.title; // Now safe
}
```

### React/Vite Issues

#### Hot Reload Not Working
```bash
# 1. Check if you're using HTTPS in development
# Vite dev server should use HTTP for local development

# 2. Clear Vite cache
rm -rf node_modules/.vite
npm run dev

# 3. Check file watchers (macOS)
# Add to vite.config.ts:
export default defineConfig({
  server: {
    watch: {
      usePolling: true
    }
  }
});
```

#### Build Succeeds but Deploy Fails
```bash
# 1. Check environment variables in Vercel
# Make sure all VITE_ prefixed vars are set

# 2. Check build output
npm run build
ls -la dist/  # Should contain index.html and assets/

# 3. Check for absolute paths in code
# Bad: <img src="/src/assets/logo.png" />
# Good: <img src="/logo.png" /> (public folder)
```

#### "Failed to resolve import" in production
```typescript
// Problem: Dynamic imports with variables
const component = await import(`./components/${name}.tsx`);

// Solution: Explicit dynamic imports or lazy loading
const ComponentA = lazy(() => import('./components/ComponentA'));
const ComponentB = lazy(() => import('./components/ComponentB'));

const components = {
  'ComponentA': ComponentA,
  'ComponentB': ComponentB
};
```

---

## 🗄️ Database Issues

### Supabase RLS (Row Level Security) Problems

#### "New row violates row-level security policy"
```sql
-- Problem: INSERT policy is too restrictive
-- Check your policies in Supabase Dashboard

-- Common solution: Allow users to insert their own data
CREATE POLICY "Users can insert their own prayers" ON prayers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- For public data that anyone can insert:
CREATE POLICY "Anyone can insert public prayers" ON prayers
  FOR INSERT WITH CHECK (is_public = true);
```

#### "No rows returned" but data exists
```sql
-- Problem: SELECT policy is too restrictive
-- Check your SELECT policies

-- Solution: Allow public data to be viewed by everyone
CREATE POLICY "Public prayers viewable by all" ON prayers
  FOR SELECT USING (is_public = true);

-- Allow users to see their own data
CREATE POLICY "Users can view own prayers" ON prayers
  FOR SELECT USING (auth.uid() = user_id);
```

#### Policy Testing
```sql
-- Test your policies by impersonating a user
-- In Supabase SQL Editor:

SELECT auth.uid(); -- Should return your current user ID

-- Test as specific user:
SELECT set_config('request.jwt.claims', '{"sub":"USER_ID_HERE"}', true);
SELECT * FROM prayers; -- Test your query

-- Reset to normal:
SELECT set_config('request.jwt.claims', '', true);
```

### Database Migration Issues

#### Migration Won't Apply
```bash
# 1. Check migration syntax
npx supabase db diff --local

# 2. Apply incrementally
npx supabase db push --dry-run
npx supabase db push

# 3. If migration conflicts, reset (WARNING: destroys data)
npx supabase db reset
```

#### Missing PostGIS Functions
```sql
-- Problem: Location queries fail
-- Solution: Ensure PostGIS extension is installed
CREATE EXTENSION IF NOT EXISTS postgis;

-- Test PostGIS is working:
SELECT PostGIS_Version();

-- Example location query:
SELECT *
FROM prayers
WHERE ST_DWithin(
  location,
  ST_MakePoint(-122.4194, 37.7749)::geography,
  1000  -- 1km radius
);
```

---

## 📱 Mobile Issues

### iOS Development Problems

#### "No Development Team Found"
```bash
# Solution: Set development team in Xcode
# 1. Open: npx cap open ios
# 2. Select your project in navigator
# 3. Under "Signing & Capabilities" → Team
# 4. Select your Apple Developer account
```

#### "Could not find iPhone simulator"
```bash
# Check available simulators:
xcrun simctl list devices

# Install iOS Simulator if missing:
xcode-select --install

# Create new simulator if needed:
xcrun simctl create "iPhone 15" com.apple.CoreSimulator.SimDeviceType.iPhone-15 com.apple.CoreSimulator.SimRuntime.iOS-17-0
```

#### "App crashes immediately on device"
```bash
# 1. Check device logs in Xcode
# Window → Devices and Simulators → Select device → Open Console

# 2. Common causes:
# - Missing permissions in Info.plist
# - HTTP requests on HTTPS-only device
# - Capacitor plugin compatibility

# 3. Test on simulator first:
npx cap run ios
```

### Android Development Problems

#### "JAVA_HOME is not set"
```bash
# Find Java installation:
/usr/libexec/java_home -V

# Set JAVA_HOME (add to ~/.zshrc or ~/.bash_profile):
export JAVA_HOME=`/usr/libexec/java_home -v 17`
export PATH=$JAVA_HOME/bin:$PATH

# Reload terminal:
source ~/.zshrc
```

#### "Gradle build failed"
```bash
# 1. Clean gradle cache:
cd android
./gradlew clean
cd ..

# 2. Clear gradle wrapper:
rm -rf android/.gradle

# 3. Update Gradle version in android/gradle/wrapper/gradle-wrapper.properties
# Should use compatible version with your Android Studio

# 4. Sync project:
npx cap sync android
```

#### "AVD not found" (Android Virtual Device)
```bash
# List available AVDs:
$ANDROID_HOME/emulator/emulator -list-avds

# Create new AVD:
$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd \
  -n "Pixel_7" \
  -k "system-images;android-33;google_apis;x86_64"

# Start emulator:
$ANDROID_HOME/emulator/emulator -avd Pixel_7
```

### Capacitor Plugin Issues

#### "Plugin not implemented on web"
```typescript
// Problem: Using native plugin without web fallback
import { Camera } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    // This will fail on web
  });
};

// Solution: Platform detection and fallbacks
import { Capacitor } from '@capacitor/core';

const takePicture = async () => {
  if (Capacitor.isNativePlatform()) {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri
    });
    return image;
  } else {
    // Web fallback
    return await useFileInput();
  }
};
```

---

## 🔄 State Management Issues

### React Query Problems

#### "Data not updating after mutation"
```typescript
// Problem: Cache not invalidating after update
const createPrayerMutation = useMutation({
  mutationFn: prayerService.createPrayer,
  onSuccess: () => {
    // Missing cache invalidation
  }
});

// Solution: Invalidate relevant queries
const queryClient = useQueryClient();

const createPrayerMutation = useMutation({
  mutationFn: prayerService.createPrayer,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['prayers'] });
    queryClient.invalidateQueries({ queryKey: ['nearby-prayers'] });
  }
});
```

#### "Stale data after real-time update"
```typescript
// Problem: React Query cache conflicts with Supabase real-time
useEffect(() => {
  const channel = supabase
    .channel('prayers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prayers' }, (payload) => {
      // Just logging, not updating React Query cache
      console.log('Prayer updated:', payload);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);

// Solution: Update React Query cache from real-time events
useEffect(() => {
  const channel = supabase
    .channel('prayers')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prayers' }, (payload) => {
      queryClient.setQueryData(['prayers'], (oldData: Prayer[] | undefined) => {
        return oldData ? [...oldData, payload.new] : [payload.new];
      });
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'prayers' }, (payload) => {
      queryClient.setQueryData(['prayers'], (oldData: Prayer[] | undefined) => {
        return oldData?.map(prayer => 
          prayer.id === payload.new.id ? payload.new : prayer
        ) || [];
      });
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [queryClient]);
```

### Zustand Store Issues

#### "State not persisting across page refresh"
```typescript
// Problem: No persistence configured
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user })
}));

// Solution: Use persist middleware
import { persist } from 'zustand/middleware';

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user })
    }),
    {
      name: 'auth-storage', // Storage key
      partialize: (state) => ({ user: state.user }) // Only persist user
    }
  )
);
```

---

## 🎨 Styling & Animation Issues

### TailwindCSS Problems

#### "Classes not applying"
```bash
# 1. Check Tailwind is installed and configured
cat tailwind.config.js
# Verify 'content' paths include all your files

# 2. Restart dev server after config changes
npm run dev

# 3. Check for typos in class names
# Use VS Code Tailwind extension for autocomplete

# 4. Check for conflicting CSS
# Tailwind classes should come after custom CSS
```

#### "Dark mode not working"
```javascript
// Ensure dark mode is configured in tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media'
  // ... rest of config
};

// Use dark mode classes:
<div className="bg-white dark:bg-gray-800">
  <p className="text-gray-900 dark:text-gray-100">Content</p>
</div>
```

### Framer Motion Issues

#### "Animations not running"
```typescript
// Problem: Missing AnimatePresence for exit animations
{showModal && <Modal />}

// Solution: Wrap with AnimatePresence
<AnimatePresence>
  {showModal && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }} // Now this will work
    >
      <Modal />
    </motion.div>
  )}
</AnimatePresence>
```

#### "Layout animations jumping"
```typescript
// Problem: Elements changing size during animation
<motion.div animate={{ width: isOpen ? 300 : 100 }}>
  {isOpen && <span>Lots of content here...</span>}
</motion.div>

// Solution: Use layoutId for smooth layout transitions
<motion.div 
  layoutId="sidebar"
  animate={{ width: isOpen ? 300 : 100 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
  <AnimatePresence>
    {isOpen && (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        Lots of content here...
      </motion.span>
    )}
  </AnimatePresence>
</motion.div>
```

---

## 🌐 Network & API Issues

### Supabase API Errors

#### "Invalid API key" / "Unauthorized"
```bash
# 1. Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# 2. Verify keys in Supabase Dashboard
# Settings → API → Project URL and anon key

# 3. Check for expired tokens in localStorage
# Open browser DevTools → Application → Local Storage
# Clear auth tokens if corrupted
```

#### "CORS errors in development"
```javascript
// Problem: Making requests from wrong origin
// Supabase expects requests from your configured URL

// Solution: Check Supabase project settings
// Authentication → URL Configuration
// Add your local development URL: http://localhost:5173

// For mobile development, add:
// http://localhost:5173
// https://localhost:5173
// capacitor://localhost
// ionic://localhost
```

### MapBox Issues

#### "Map not loading"
```bash
# 1. Check MapBox token
echo $VITE_MAPBOX_TOKEN

# 2. Verify token permissions in MapBox dashboard
# Should have: Downloads:Read, Vision:Read

# 3. Check browser console for 401 errors
# Invalid token will show clear error message

# 4. Test with basic map:
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-122.4, 37.8],
  zoom: 12
});
```

#### "Markers not appearing"
```typescript
// Problem: Adding markers before map loads
const map = new mapboxgl.Map({...});
// Map not ready yet
new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map); // Won't work

// Solution: Wait for map to load
map.on('load', () => {
  new mapboxgl.Marker()
    .setLngLat([lng, lat])
    .addTo(map);
});

// Or use state to track map readiness
const [mapLoaded, setMapLoaded] = useState(false);

useEffect(() => {
  const map = new mapboxgl.Map({...});
  map.on('load', () => setMapLoaded(true));
}, []);

useEffect(() => {
  if (mapLoaded && prayers.length > 0) {
    // Add markers
  }
}, [mapLoaded, prayers]);
```

---

## 🚀 Performance Issues

### Slow Loading Times

#### Bundle Size Too Large
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Common causes:
# 1. Importing entire libraries instead of specific functions
# Bad:
import _ from 'lodash';
# Good:
import { debounce } from 'lodash/debounce';

# 2. Loading all components eagerly
# Bad:
import { AdminDashboard } from './AdminDashboard';
# Good:
const AdminDashboard = lazy(() => import('./AdminDashboard'));
```

#### Too Many Re-renders
```typescript
// Problem: Creating objects in render
function PrayerCard({ prayer }) {
  const style = { color: 'blue' }; // New object every render
  const onClick = () => {}; // New function every render
  
  return <div style={style} onClick={onClick}>{prayer.title}</div>;
}

// Solution: Memoize expensive operations
function PrayerCard({ prayer, onPrayClick }) {
  const style = useMemo(() => ({ color: 'blue' }), []);
  const onClick = useCallback(() => onPrayClick(prayer.id), [prayer.id, onPrayClick]);
  
  return <div style={style} onClick={onClick}>{prayer.title}</div>;
}

// Or move static values outside component
const CARD_STYLE = { color: 'blue' };

function PrayerCard({ prayer, onPrayClick }) {
  const onClick = useCallback(() => onPrayClick(prayer.id), [prayer.id, onPrayClick]);
  
  return <div style={CARD_STYLE} onClick={onClick}>{prayer.title}</div>;
}
```

---

## 🔍 Debugging Techniques

### Browser DevTools

#### React DevTools
```bash
# Install React DevTools browser extension
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/

# Features:
# - Component tree inspection
# - State and props debugging
# - Performance profiling
# - Hook debugging
```

#### Network Tab Analysis
```bash
# Common issues to look for:
# 1. Failed requests (red status codes)
# 2. Slow requests (long loading times)
# 3. Large payloads (size column)
# 4. CORS errors (console messages)
# 5. Missing resources (404 errors)
```

#### Performance Tab
```bash
# Record performance:
# 1. Open DevTools → Performance tab
# 2. Click record button
# 3. Interact with your app
# 4. Stop recording

# Look for:
# - Long tasks (yellow bars > 50ms)
# - Layout thrashing (purple bars)
# - Excessive scripting (yellow areas)
# - Memory leaks (increasing heap size)
```

### Console Debugging

#### Effective Logging
```typescript
// Bad: Generic logging
console.log('User data:', user);

// Good: Structured logging with context
console.log('[Auth] User login successful:', {
  userId: user.id,
  timestamp: new Date().toISOString(),
  source: 'google'
});

// Use different log levels
console.info('Prayer loaded successfully');
console.warn('Slow network detected');
console.error('Failed to save prayer:', error);

// Group related logs
console.group('Prayer submission process');
console.log('Validating prayer data...');
console.log('Uploading to Supabase...');
console.log('Updating local cache...');
console.groupEnd();
```

---

## 🛠️ Environment-Specific Issues

### Development vs Production

#### Environment Variable Issues
```bash
# Development (.env.local)
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev-key-here

# Production (Vercel environment variables)
VITE_SUPABASE_URL=https://prod-project.supabase.co  
VITE_SUPABASE_ANON_KEY=prod-key-here

# Check current environment:
console.log('Environment:', import.meta.env.MODE);
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
```

#### Build vs Development Behavior
```typescript
// Code that works in dev but fails in production:

// 1. Dynamic imports with variables (Vite can't analyze)
const component = await import(`./components/${name}.tsx`);

// 2. Accessing files that aren't in public/
import logoPath from '../assets/logo.png'; // Fails in production

// 3. Node.js APIs in browser code
import fs from 'fs'; // Will fail in browser

// 4. Missing error boundaries in production
if (import.meta.env.DEV) {
  // Development error overlay hides errors
} else {
  // Production: errors crash the app
}
```

---

## 📞 Getting Help

### Internal Resources
1. **[MONITORING-GUIDE.md](./MONITORING-GUIDE.md)** - Check error patterns and logs
2. **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Project overview and navigation
3. **[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** - Implementation patterns
4. **[MOBILE-GUIDE.md](./MOBILE-GUIDE.md)** - Mobile-specific issues

### External Resources
1. **Supabase Docs** - https://supabase.com/docs
2. **React DevTools** - Browser extension for React debugging
3. **Vite Docs** - https://vitejs.dev/guide/
4. **Capacitor Docs** - https://capacitorjs.com/docs

### Emergency Escalation
```bash
# When all else fails:
# 1. Create detailed error report with:
#    - Exact error message
#    - Steps to reproduce
#    - Browser/device information
#    - Screenshots/screen recordings

# 2. Check recent changes:
git log --oneline -10
git diff HEAD~1

# 3. Revert to last working state:
git checkout HEAD~1  # Or specific commit hash

# 4. Test if issue persists
```

---

**Last Updated:** 2024-11-30  
**Version:** 1.0 (Comprehensive troubleshooting guide)  
**Next Review:** After major feature additions or when new common issues emerge