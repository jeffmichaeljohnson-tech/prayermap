import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, URLOpenListenerEvent } from '@capacitor/app';

/**
 * Deep Links Hook for PrayerMap
 *
 * Handles both Android App Links (https://prayermap.net/...) and
 * custom URL schemes (prayermap://...)
 *
 * Supported URL patterns:
 * - https://prayermap.net/prayer/:id
 * - https://prayermap.net/user/:id
 * - prayermap://prayer/:id
 * - prayermap://user/:id
 *
 * @example
 * // In App.tsx or main component
 * import { useDeepLinks } from '@/hooks/useDeepLinks';
 *
 * function App() {
 *   useDeepLinks();
 *   return <YourApp />;
 * }
 */
export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for app URL open events (when app is already running)
    const listener = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      console.log('[DeepLink] App opened with URL:', event.url);
      handleDeepLink(event.url);
    });

    // Check if app was launched with a URL (cold start)
    App.getLaunchUrl().then((result) => {
      if (result?.url) {
        console.log('[DeepLink] App launched with URL:', result.url);
        handleDeepLink(result.url);
      }
    });

    // Cleanup listener on unmount
    return () => {
      listener.remove();
    };
  }, [navigate]);

  /**
   * Parse and handle deep link URL
   * @param urlString - The deep link URL to handle
   */
  function handleDeepLink(urlString: string) {
    try {
      const url = new URL(urlString);

      // Handle custom scheme: prayermap://prayer/123
      if (url.protocol === 'prayermap:') {
        const path = url.hostname + url.pathname;
        console.log('[DeepLink] Custom scheme - navigating to:', `/${path}`);
        navigate(`/${path}`);
        return;
      }

      // Handle App Links: https://prayermap.net/prayer/123
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        const path = url.pathname;
        console.log('[DeepLink] App Link - navigating to:', path);
        navigate(path);
        return;
      }

      console.warn('[DeepLink] Unknown URL scheme:', url.protocol);
    } catch (error) {
      console.error('[DeepLink] Failed to parse URL:', urlString, error);
    }
  }
}
