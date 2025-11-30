# Deep Links Integration Example

## Adding Deep Links Support to App.tsx

### Step 1: Import the Hook

```typescript
import { useDeepLinks } from './hooks/useDeepLinks';
```

### Step 2: Call the Hook in Your App Component

Add the `useDeepLinks()` hook inside your main App component, or create a wrapper component.

#### Option A: Direct Integration (Recommended)

```typescript
function AppContent() {
  const { user } = useAuth();
  const [view, setView] = useState<'map' | 'settings'>('map');

  // Initialize deep link handler
  useDeepLinks();

  return (
    <div className="app-container">
      {/* Your app content */}
      {view === 'map' && <PrayerMap />}
      {view === 'settings' && <SettingsScreen />}
    </div>
  );
}
```

#### Option B: Separate Deep Link Provider Component

Create a dedicated component for deep link handling:

```typescript
// src/components/DeepLinkProvider.tsx
import { ReactNode } from 'react';
import { useDeepLinks } from '@/hooks/useDeepLinks';

interface DeepLinkProviderProps {
  children: ReactNode;
}

export function DeepLinkProvider({ children }: DeepLinkProviderProps) {
  // Initialize deep link handler
  useDeepLinks();

  // This component doesn't render anything special
  return <>{children}</>;
}
```

Then use it in App.tsx:

```typescript
import { DeepLinkProvider } from './components/DeepLinkProvider';

function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <DeepLinkProvider>
          <AppContent />
        </DeepLinkProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
```

### Step 3: Test the Integration

1. Build and sync:
   ```bash
   npm run build
   npx cap sync android
   ```

2. Run on device:
   ```bash
   npx cap open android
   # Run the app from Android Studio
   ```

3. Test with ADB:
   ```bash
   # Test prayer detail link
   adb shell am start -W -a android.intent.action.VIEW \
     -d "https://prayermap.net/prayer/123" net.prayermap.app

   # Check logs
   adb logcat | grep DeepLink
   ```

## Handling Deep Links in Specific Routes

If you need to handle deep links differently based on authentication or app state:

```typescript
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { useAuth } from '@/contexts/AuthContext';

export function useDeepLinks() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const listener = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('[DeepLink] App opened with URL:', event.url);

      const url = new URL(event.url);
      let targetPath = '';

      // Parse URL
      if (url.protocol === 'prayermap:') {
        targetPath = `/${url.hostname}${url.pathname}`;
      } else {
        targetPath = url.pathname;
      }

      // Check if authentication is required
      const requiresAuth = targetPath.startsWith('/user/');

      if (requiresAuth && !user) {
        // Store the deep link target and show auth modal
        sessionStorage.setItem('deepLinkTarget', targetPath);
        navigate('/auth', { state: { returnTo: targetPath } });
      } else {
        // Navigate directly
        navigate(targetPath);
      }
    });

    // Check launch URL
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        console.log('[DeepLink] App launched with URL:', result.url);
        // Handle same as above
      }
    });

    return () => {
      listener.remove();
    };
  }, [navigate, user]);
}
```

## Example: Prayer Detail Page

```typescript
// src/pages/PrayerDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { prayerService } from '@/services/prayerService';
import { Prayer } from '@/types/prayer';

export function PrayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [prayer, setPrayer] = useState<Prayer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrayer() {
      if (!id) return;

      try {
        setLoading(true);
        const data = await prayerService.getPrayerById(id);
        setPrayer(data);
      } catch (error) {
        console.error('Failed to load prayer:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPrayer();
  }, [id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!prayer) {
    return <NotFoundMessage />;
  }

  return (
    <div className="prayer-detail">
      <h1>{prayer.title}</h1>
      <p>{prayer.message}</p>
      {/* Prayer content */}
    </div>
  );
}
```

## Example: User Profile Page

```typescript
// src/pages/UserProfilePage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { userService } from '@/services/userService';
import { UserProfile } from '@/types/user';

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!id) return;

      const data = await userService.getUserProfile(id);
      setProfile(data);
    }

    loadProfile();
  }, [id]);

  return (
    <div className="user-profile">
      <h1>{profile?.display_name}</h1>
      {/* Profile content */}
    </div>
  );
}
```

## Router Configuration

Make sure your router is configured to handle these routes:

```typescript
// src/router.tsx (or wherever you configure routes)
import { createBrowserRouter } from 'react-router-dom';
import { PrayerDetailPage } from './pages/PrayerDetailPage';
import { UserProfilePage } from './pages/UserProfilePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'prayer/:id',
        element: <PrayerDetailPage />,
      },
      {
        path: 'user/:id',
        element: <UserProfilePage />,
      },
      // Other routes...
    ],
  },
]);
```

## Testing Checklist

- [ ] Deep links work when app is closed (cold start)
- [ ] Deep links work when app is in background
- [ ] Deep links work when app is in foreground
- [ ] HTTPS links open app directly (verified)
- [ ] Custom scheme links work
- [ ] Invalid deep links show error page
- [ ] Authentication-required pages prompt login
- [ ] Deep link target is preserved after login
- [ ] Console logs show deep link events
- [ ] App navigates to correct page

## Debugging Tips

### Enable Console Logging

The `useDeepLinks` hook already includes logging. Check the console:

```bash
# View logs in real-time
adb logcat | grep DeepLink
```

### Test Without Device

You can simulate deep links in development:

```typescript
// In your browser console (web version)
window.location.href = 'https://prayermap.net/prayer/123';
```

### Add Analytics

Track deep link usage:

```typescript
function handleDeepLink(urlString: string) {
  try {
    const url = new URL(urlString);
    const path = url.pathname;

    // Track analytics
    analytics.track('deep_link_opened', {
      url: urlString,
      path: path,
      source: url.protocol,
    });

    // Navigate
    navigate(path);
  } catch (error) {
    console.error('[DeepLink] Failed to parse URL:', urlString, error);
  }
}
```

## Next Steps

1. ✅ Add `useDeepLinks()` to your app
2. ✅ Configure routes for deep link targets
3. ✅ Test with ADB commands
4. ✅ Deploy assetlinks.json to production
5. ✅ Verify with Google's tool
6. ✅ Test in real-world scenarios
7. ✅ Add analytics tracking
8. ✅ Document user-facing features

## Resources

- [useDeepLinks Hook Source](/home/user/prayermap/src/hooks/useDeepLinks.ts)
- [AndroidManifest.xml](/home/user/prayermap/android/app/src/main/AndroidManifest.xml)
- [Testing Script](/home/user/prayermap/scripts/test-deep-links.sh)
- [Quick Start Guide](/home/user/prayermap/docs/DEEP_LINKS_QUICK_START.md)
- [Full Documentation](/home/user/prayermap/docs/android-deep-links-config.md)
