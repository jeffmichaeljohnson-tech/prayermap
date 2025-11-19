import { useState, useEffect } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthModal } from './components/AuthModal';
import { PrayerMap } from './components/PrayerMap';
import { SettingsScreen } from './components/SettingsScreen';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<{ name?: string; email: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 42.5256, // Beverly Hills, Michigan
    lng: -83.2244
  });

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Use Beverly Hills, Michigan as default location
          console.log('Using Beverly Hills, Michigan as default location');
        }
      );
    }
  }, []);

  // Loading screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleAuthenticated = (data: { name?: string; email: string }) => {
    setUserData(data);
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthModal onAuthenticated={handleAuthenticated} />;
  }

  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className="w-full h-screen overflow-hidden">
      <PrayerMap 
        userLocation={userLocation}
        onOpenSettings={() => setShowSettings(true)}
      />
    </div>
  );
}