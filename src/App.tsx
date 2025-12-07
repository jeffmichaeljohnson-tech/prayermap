import { useState, useEffect } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthModal } from './features/authentication';
import { PrayerMap } from './features/prayers';
import { SettingsScreen } from './features/settings';
import { OnboardingFlow } from './features/onboarding';
import { AuthProvider, useAuth } from './features/authentication';
import { ThemeProvider } from './contexts/ThemeContext';
import { pushNotificationService } from './services/pushNotificationService';
import { initializeReminderListeners, removeReminderListeners } from './services/reminderService';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('prayermap-onboarding-complete');
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Got user location:', position.coords.latitude, position.coords.longitude);
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError('Please enable location access to use PrayerMap');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser');
    }
  }, []);

  // Loading screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (user?.id) {
      pushNotificationService.initialize(user.id);
    }
  }, [user?.id]);

  // Initialize local notification listeners for reminders
  useEffect(() => {
    initializeReminderListeners();

    return () => {
      removeReminderListeners();
    };
  }, []);

  // Show loading screen while initial loading or checking auth
  if (isLoading || authLoading) {
    return <LoadingScreen />;
  }

  // Show auth modal if not authenticated
  if (!user) {
    return <AuthModal />;
  }

  // Show onboarding for new users (after auth, before main app)
  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  // Show location error
  if (locationError) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 p-4">
        <div className="glass-strong rounded-3xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">📍</div>
          <h2 className="text-xl text-gray-800 mb-2">Location Required</h2>
          <p className="text-gray-600 mb-4">{locationError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-yellow-300 to-purple-300 rounded-full text-on-gradient font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading while waiting for location
  if (!userLocation) {
    return <LoadingScreen />;
  }

  // Show settings screen if requested
  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  // Show main app
  return (
    <div className="w-full h-screen overflow-hidden">
      <PrayerMap
        userLocation={userLocation}
        onOpenSettings={() => setShowSettings(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
