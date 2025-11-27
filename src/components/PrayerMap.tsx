import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Prayer, PrayerConnection } from '../types/prayer';
import { PrayerMarker } from './PrayerMarker';
import { PrayerDetailModal } from './PrayerDetailModal';
import { RequestPrayerModal } from './RequestPrayerModal';
import { PrayerAnimationLayer } from './PrayerAnimationLayer';
import { PrayerCreationAnimation } from './PrayerCreationAnimation';
import { PrayerConnection as PrayerConnectionComponent } from './PrayerConnection';
import { InboxModal } from './InboxModal';
import { InfoModal } from './InfoModal';
import { SunMoonIndicator } from './SunMoonIndicator';
import { Inbox, Settings, Info } from 'lucide-react';
import { usePrayers } from '../hooks/usePrayers';
import { useAuth } from '../contexts/AuthContext';
import { useInbox } from '../hooks/useInbox';

// Helper to group prayers by approximate location
interface PrayerGroup {
  prayers: Prayer[];
  primaryPrayer: Prayer;
  offset: { x: number; y: number };
  count: number;
  isSameUser: boolean;
}

function groupPrayersByLocation(prayers: Prayer[], threshold: number = 0.0001): PrayerGroup[] {
  const groups: PrayerGroup[] = [];
  const assigned = new Set<string>();

  for (const prayer of prayers) {
    if (assigned.has(prayer.id)) continue;

    // Find all prayers at similar coordinates
    const nearby = prayers.filter(p => {
      if (assigned.has(p.id)) return false;
      const latDiff = Math.abs(p.location.lat - prayer.location.lat);
      const lngDiff = Math.abs(p.location.lng - prayer.location.lng);
      return latDiff < threshold && lngDiff < threshold;
    });

    // Check if all nearby prayers are from the same user
    const userIds = new Set(nearby.map(p => p.user_id));
    const isSameUser = userIds.size === 1;

    // Calculate offset based on group index
    const groupIndex = groups.length;
    const offsetAngle = (groupIndex * 45) * (Math.PI / 180);
    const offsetDistance = 0; // No offset for primary marker

    nearby.forEach(p => assigned.add(p.id));

    groups.push({
      prayers: nearby,
      primaryPrayer: nearby[0], // Most recent (assuming sorted)
      offset: { x: Math.cos(offsetAngle) * offsetDistance, y: Math.sin(offsetAngle) * offsetDistance },
      count: nearby.length,
      isSameUser
    });
  }

  return groups;
}

// Mapbox access token from environment variable
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
mapboxgl.accessToken = mapboxToken;

interface PrayerMapProps {
  userLocation: { lat: number; lng: number };
  onOpenSettings: () => void;
}

export function PrayerMap({ userLocation, onOpenSettings }: PrayerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { user } = useAuth();

  // Use the usePrayers hook for real-time data from Supabase
  const {
    prayers,
    loading: prayersLoading,
    createPrayer,
    respondToPrayer
  } = usePrayers({
    location: userLocation,
    radiusKm: 50,
    enableRealtime: true
  });

  // Use the useInbox hook to get unread count
  const { totalUnread } = useInbox({
    userId: user?.id || '',
    autoFetch: !!user,
    enableRealtime: true
  });

  const [connections, setConnections] = useState<PrayerConnection[]>([]);
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [animatingPrayer, setAnimatingPrayer] = useState<{
    prayer: Prayer;
    userLocation: { lat: number; lng: number };
  } | null>(null);
  const [creatingPrayerAnimation, setCreatingPrayerAnimation] = useState<{
    targetLocation: { lat: number; lng: number };
  } | null>(null);

  // Ref to store pending connection data (set by handlePrayerSubmit when API succeeds)
  const pendingConnectionRef = useRef<PrayerConnection | null>(null);

  // Group prayers by location to handle overlapping markers
  const prayerGroups = useMemo(() => groupPrayersByLocation(prayers), [prayers]);

  // Initialize map with ethereal style
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    console.log('Initializing Mapbox map at:', userLocation);

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [userLocation.lng, userLocation.lat],
      zoom: 12,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    // Don't add navigation controls - users will use touch gestures

    // Add custom styling for ethereal look
    map.current.on('load', () => {
      console.log('Map loaded successfully');
      if (!map.current) return;
      
      // Customize map colors for ethereal theme
      try {
        if (map.current.getLayer('water')) {
          map.current.setPaintProperty('water', 'fill-color', 'hsl(210, 80%, 85%)');
        }
        if (map.current.getLayer('landuse')) {
          map.current.setPaintProperty('landuse', 'fill-opacity', 0.3);
        }
      } catch (e) {
        console.log('Layer customization:', e);
      }
    });

    map.current.on('error', (e) => {
      console.error('Map error:', e);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [userLocation]);

  const handlePrayerClick = (prayer: Prayer) => {
    // Show modal immediately without animation
    setSelectedPrayer(prayer);
  };

  const handleAnimationComplete = useCallback(() => {
    // Add the pending connection if API call succeeded
    if (pendingConnectionRef.current) {
      setConnections(prev => [...prev, pendingConnectionRef.current!]);
      pendingConnectionRef.current = null;
    }
    // Clear animation state - do NOT reopen the modal
    setAnimatingPrayer(null);
  }, []);

  const handlePrayerSubmit = async (prayer: Prayer) => {
    if (!user) return;

    // Close modal and trigger the beautiful animation
    setSelectedPrayer(null);
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous';

    // Clear any pending connection from previous animations
    pendingConnectionRef.current = null;

    // Start the animation
    setAnimatingPrayer({ prayer, userLocation });

    // Submit the prayer response to Supabase
    const success = await respondToPrayer(
      prayer.id,
      user.id,
      userName,
      'Praying for you!',
      'text',
      undefined,
      false,
      userLocation // Pass user's location to create prayer connection line
    );

    // If successful, prepare the connection data for when animation completes
    if (success) {
      const createdDate = new Date();
      const expiresDate = new Date(createdDate);
      expiresDate.setFullYear(expiresDate.getFullYear() + 1);

      pendingConnectionRef.current = {
        id: `conn-${Date.now()}`,
        prayerId: prayer.id,
        fromLocation: prayer.location,
        toLocation: userLocation,
        requesterName: prayer.is_anonymous ? 'Anonymous' : (prayer.user_name || 'Anonymous'),
        replierName: userName,
        createdAt: createdDate,
        expiresAt: expiresDate
      };
    }
  };

  const handleRequestPrayer = async (newPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    // Close modal first
    setShowRequestModal(false);

    // Start the creation animation
    setCreatingPrayerAnimation({
      targetLocation: newPrayer.location
    });

    // Create the prayer in the database
    try {
      await createPrayer({
        ...newPrayer,
        user_id: user.id,
      });
    } catch (error) {
      console.error('Failed to create prayer:', error);
    }
  };

  const handleCreationAnimationComplete = useCallback(() => {
    setCreatingPrayerAnimation(null);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Map Container - ensure it has explicit height */}
      <div 
        ref={mapContainer} 
        className="absolute inset-0" 
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#e8f4f8' // Light blue background while map loads
        }} 
      />

      {/* Custom Markers Overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {prayerGroups.map(group => (
          <PrayerMarker
            key={group.primaryPrayer.id}
            prayer={group.primaryPrayer}
            map={map.current}
            onClick={() => handlePrayerClick(group.primaryPrayer)}
            isPrayed={group.primaryPrayer.prayedBy && group.primaryPrayer.prayedBy.length > 0}
            stackCount={group.isSameUser ? group.count : 1}
            allPrayers={group.isSameUser ? group.prayers : [group.primaryPrayer]}
            onSelectPrayer={handlePrayerClick}
          />
        ))}
      </div>

      {/* Prayer Connections */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none', zIndex: 5 }}>
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(45, 100%, 70%)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(200, 80%, 70%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(270, 60%, 70%)" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="connectionGradientHover" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(45, 100%, 65%)" stopOpacity="1" />
            <stop offset="50%" stopColor="hsl(200, 80%, 75%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(270, 60%, 75%)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(45, 100%, 80%)" />
            <stop offset="50%" stopColor="hsl(200, 80%, 85%)" />
            <stop offset="100%" stopColor="hsl(270, 60%, 85%)" />
          </linearGradient>
        </defs>
        
        {map.current && connections.map(conn => {
          console.log('Rendering connection in map:', conn.id);
          return (
            <PrayerConnectionComponent
              key={conn.id}
              connection={conn}
              map={map.current!}
              isHovered={hoveredConnection === conn.id}
              onHover={() => setHoveredConnection(conn.id)}
              onLeave={() => setHoveredConnection(null)}
            />
          );
        })}
      </svg>

      {/* Animation Layer - for responding to prayers */}
      <AnimatePresence>
        {animatingPrayer && (
          <PrayerAnimationLayer
            prayer={animatingPrayer.prayer}
            userLocation={animatingPrayer.userLocation}
            map={map.current}
            onComplete={handleAnimationComplete}
          />
        )}
      </AnimatePresence>

      {/* Prayer Creation Animation */}
      <AnimatePresence>
        {creatingPrayerAnimation && (
          <PrayerCreationAnimation
            targetLocation={creatingPrayerAnimation.targetLocation}
            map={map.current}
            onComplete={handleCreationAnimationComplete}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none" style={{ zIndex: 30 }}>
        <div className="glass-strong rounded-2xl p-4 flex items-center justify-between pointer-events-auto">
          <button
            onClick={() => setShowInbox(true)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors relative"
          >
            <Inbox className="w-6 h-6 text-gray-700" />
            {/* Notification badge - only show if there are unread messages */}
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </button>
          
          <h1 className="text-2xl text-gray-800">PrayerMap</h1>
          
          <button 
            onClick={onOpenSettings}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Settings className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Sunset/Sunrise Time Indicator */}
      <div className="absolute top-24 right-4 pointer-events-none" style={{ zIndex: 30 }}>
        <SunMoonIndicator location={userLocation} />
      </div>

      {/* Request Prayer Button - moved higher */}
      <motion.button
        onClick={() => setShowRequestModal(true)}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-strong rounded-full px-8 py-4 flex items-center gap-3 shadow-xl hover:shadow-2xl transition-shadow"
        style={{ zIndex: 40 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-2xl">🙏</span>
        <span className="text-gray-800 text-[16px]">Request Prayer</span>
      </motion.button>

      {/* Info Button - lower right corner */}
      <motion.button
        onClick={() => setShowInfo(true)}
        className="absolute bottom-20 right-6 glass-strong rounded-full p-4 shadow-xl hover:shadow-2xl transition-shadow"
        style={{ zIndex: 40 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Info className="w-6 h-6 text-gray-700" />
      </motion.button>

      {/* Prayer Detail Modal */}
      <AnimatePresence>
        {selectedPrayer && (
          <PrayerDetailModal
            prayer={selectedPrayer}
            userLocation={userLocation}
            onClose={() => setSelectedPrayer(null)}
            onPray={handlePrayerSubmit}
          />
        )}
      </AnimatePresence>

      {/* Inbox Modal */}
      <AnimatePresence>
        {showInbox && (
          <InboxModal onClose={() => setShowInbox(false)} />
        )}
      </AnimatePresence>

      {/* Request Prayer Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <RequestPrayerModal
            userLocation={userLocation}
            onClose={() => setShowRequestModal(false)}
            onSubmit={handleRequestPrayer}
          />
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <InfoModal onClose={() => setShowInfo(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}