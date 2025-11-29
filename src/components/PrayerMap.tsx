/**
 * PrayerMap - GLOBAL LIVING MAP
 *
 * This is the heart of PrayerMap - a GLOBAL LIVING MAP where everyone sees
 * all prayers from around the world in real-time. This is not a local or
 * regional prayer map; it's a worldwide community where:
 *
 * - ALL prayers are visible globally, not just nearby ones
 * - ALL prayer connections (lines) are displayed worldwide
 * - Real-time updates show new prayers and connections as they happen anywhere
 * - Users start at their location but can zoom out to see the entire world
 * - Geographic boundaries fade away, creating a living tapestry of global faith
 *
 * The map displays:
 * 1. Prayer markers (dots) for every prayer request worldwide
 * 2. Connection lines showing when someone prays for someone else
 * 3. Real-time animations as new prayers are created and answered
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Prayer, PrayerConnection } from '../types/prayer';
import { PrayerMarker } from './PrayerMarker';
import { PrayerDetailModal } from './PrayerDetailModal';
import type { PrayerReplyData } from './PrayerDetailModal';
import { uploadAudio } from '../services/storageService';
import { RequestPrayerModal } from './RequestPrayerModal';
import { PrayerAnimationLayer } from './PrayerAnimationLayer';
import { PrayerCreationAnimation } from './PrayerCreationAnimation';
import { PrayerConnection as PrayerConnectionComponent } from './PrayerConnection';
import { InboxModal } from './InboxModal';
import { InfoModal } from './InfoModal';
import { SunMoonIndicator } from './SunMoonIndicator';
import { InAppNotification } from './InAppNotification';
import { Inbox, Settings, Info } from 'lucide-react';
import { usePrayers } from '../hooks/usePrayers';
import { useAuth } from '../contexts/AuthContext';
import { useInbox } from '../hooks/useInbox';
import { fetchAllConnections, subscribeToAllConnections } from '../services/prayerService';
import { realtimeMonitor } from '../services/realtimeMonitor';

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

  // GLOBAL LIVING MAP: Fetch ALL prayers worldwide, not just nearby ones
  // This creates a living tapestry of prayer connecting people across the globe
  const {
    prayers,
    createPrayer,
    respondToPrayer,
    refetch: refetchPrayers
  } = usePrayers({
    location: userLocation,
    radiusKm: 50, // Not used in global mode, but kept for compatibility
    enableRealtime: true,
    globalMode: true // Enable GLOBAL LIVING MAP - show all prayers worldwide
  });

  // Use the useInbox hook to get unread count and track changes
  const { totalUnread, inbox } = useInbox({
    userId: user?.id || '',
    autoFetch: !!user,
    enableRealtime: true
  });

  // Track previous unread count to detect new messages
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const [connections, setConnections] = useState<PrayerConnection[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
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


  // Group prayers by location to handle overlapping markers
  const prayerGroups = useMemo(() => groupPrayersByLocation(prayers), [prayers]);

  // Debug: log connections state
  console.log('PrayerMap render - connections:', connections.length, 'mapLoaded:', mapLoaded);

  // Track prayers state changes for debugging animation issues
  useEffect(() => {
    console.log('🔄 PRAYERS STATE CHANGED:', {
      count: prayers.length,
      animationActive: !!creatingPrayerAnimation,
      latestPrayerIds: prayers.slice(0, 3).map(p => p.id),
      timestamp: new Date().toISOString()
    });

    // If we have prayers and animation just finished, log success
    if (prayers.length > 0 && !creatingPrayerAnimation) {
      console.log('✅ Prayer creation flow appears successful - prayers loaded and no animation active');
    }
  }, [prayers, creatingPrayerAnimation]);

  // GLOBAL LIVING MAP: Fetch and subscribe to ALL prayer connections worldwide
  // This displays the beautiful web of prayer connections spanning the entire globe
  useEffect(() => {
    // Initial fetch of all global connections
    fetchAllConnections().then((globalConnections) => {
      console.log('Loaded global connections:', globalConnections.length);
      setConnections(globalConnections);
    });

    // Use enhanced real-time monitor for connections
    console.log('🔗 Setting up enhanced connection monitoring...');
    
    // Ensure monitor is running
    if (!realtimeMonitor.getStatus().isActive) {
      realtimeMonitor.start();
    }

    // Subscribe to enhanced monitoring for connections
    const unsubscribe = realtimeMonitor.subscribeToConnections((updatedConnections) => {
      console.log('📥 Enhanced connection update received:', updatedConnections.length);
      setConnections(updatedConnections);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  // Detect when new messages arrive and show notification
  useEffect(() => {
    if (totalUnread > prevUnreadCount && prevUnreadCount > 0) {
      // New message(s) arrived!
      const newMessageCount = totalUnread - prevUnreadCount;
      const latestResponse = inbox[0]?.responses[0]; // Most recent response
      
      let message = `You have ${newMessageCount} new prayer response${newMessageCount > 1 ? 's' : ''}`;
      if (latestResponse && !latestResponse.is_anonymous && latestResponse.responder_name) {
        message = `${latestResponse.responder_name} responded to your prayer`;
      }
      
      setNotificationMessage(message);
      setShowNotification(true);
    }
    setPrevUnreadCount(totalUnread);
  }, [totalUnread, prevUnreadCount, inbox]);

  // Initialize map with ethereal style
  // GLOBAL LIVING MAP: Starts centered on user's location but allows zooming out to see the entire world
  // Users can explore prayers and connections from anywhere on the planet
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    console.log('Initializing GLOBAL LIVING MAP at user location:', userLocation);

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [userLocation.lng, userLocation.lat],
      zoom: 12, // Start at local zoom but allow global zoom out
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      // Allow zooming out to see the entire world
      minZoom: 1, // World view
      maxZoom: 18 // Street-level detail
    });

    // Don't add navigation controls - users will use touch gestures

    // Add custom styling for ethereal look
    map.current.on('load', () => {
      console.log('Map loaded successfully');
      if (!map.current) return;

      // Mark map as loaded for connection rendering
      setMapLoaded(true);

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

  // Note: Animation completion is now handled by setTimeout in handlePrayerSubmit
  // This callback is still passed to PrayerAnimationLayer but is a no-op since
  // setTimeout handles both adding the connection and clearing animatingPrayer
  const handleAnimationComplete = useCallback(() => {
    // No-op - setTimeout in handlePrayerSubmit handles everything
    console.log('Animation layer complete callback (no-op)');
  }, []);

  const handlePrayerSubmit = async (prayer: Prayer, replyData?: PrayerReplyData): Promise<boolean> => {
    if (!user) return false;

    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous';

    // Start the animation
    setAnimatingPrayer({ prayer, userLocation });

    // Extract reply data with defaults
    const message = replyData?.message || 'Praying for you!';
    const contentType = replyData?.contentType || 'text';
    const isAnonymous = replyData?.isAnonymous || false;

    // Upload audio if present
    let contentUrl: string | undefined;
    if (replyData?.audioBlob && contentType === 'audio') {
      console.log('Uploading audio response...');
      const audioUrl = await uploadAudio(replyData.audioBlob, user.id);
      if (audioUrl) {
        contentUrl = audioUrl;
        console.log('Audio uploaded:', audioUrl);
      } else {
        console.error('Failed to upload audio');
        return false;
      }
    }

    // Submit the prayer response to Supabase and create memorial line in database
    console.log('Submitting prayer response for prayer:', prayer.id, 'user:', user.id, 'message:', message, 'contentType:', contentType);
    console.log('User details:', { id: user.id, email: user.email, metadata: user.user_metadata });
    
    try {
      const result = await respondToPrayer(
        prayer.id,
        user.id,
        userName,
        message,
        contentType,
        contentUrl,
        isAnonymous,
        userLocation // Pass user's location to create prayer connection line
      );
      
      console.log('Prayer response result:', result);
      
      if (result?.response) {
        console.log('Prayer response created successfully:', result.response);
        if (result?.connection) {
          console.log('Memorial line created successfully in database:', result.connection);
        } else {
          console.warn('Memorial line was not created - connection data missing');
        }
        
        // Clear animation after animation duration
        setTimeout(() => {
          console.log('Animation complete - clearing animation state');
          setAnimatingPrayer(null);
        }, 6000);
        
        return true;
      } else {
        console.error('Prayer response was not created');
        setAnimatingPrayer(null);
        return false;
      }
    } catch (error) {
      console.error('Prayer response failed:', error);
      setAnimatingPrayer(null);
      return false;
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
      const createdPrayer = await createPrayer({
        ...newPrayer,
        user_id: user.id,
      });
      
      if (createdPrayer) {
        console.log('Prayer created successfully during animation:', createdPrayer.id);
        // Prayer creation successful - animation will complete normally and trigger marker refresh via subscription
      } else {
        console.error('Failed to create prayer - no prayer returned');
        // If prayer creation fails, clear animation immediately
        setCreatingPrayerAnimation(null);
      }
    } catch (error) {
      console.error('Failed to create prayer:', error);
      // If prayer creation fails, clear animation immediately
      setCreatingPrayerAnimation(null);
    }
  };

  const handleCreationAnimationComplete = useCallback(async () => {
    console.log('Prayer creation animation completed - clearing animation state');
    
    // Force refresh prayers to ensure new prayer marker appears
    // This handles cases where optimistic updates or real-time subscriptions might have issues
    console.log('Force refreshing prayers after animation completion...');
    try {
      await refetchPrayers();
      console.log('Successfully refreshed prayers after animation - new marker should now be visible');
    } catch (error) {
      console.error('Failed to refresh prayers after animation:', error);
    }
    
    setCreatingPrayerAnimation(null);
  }, [refetchPrayers]);

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
        {/* eslint-disable-next-line react-hooks/refs */}
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

        {/* eslint-disable-next-line react-hooks/refs */}
        {mapLoaded && map.current && connections.map(conn => {
          console.log('Rendering connection in map:', conn.id, 'mapLoaded:', mapLoaded);
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
      {/* eslint-disable react-hooks/refs */}
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
      {/* eslint-enable react-hooks/refs */}

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
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, type: "spring" }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse border-2 border-white"
              >
                {totalUnread > 9 ? '9+' : totalUnread}
              </motion.span>
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

      {/* In-App Notification for new prayer responses */}
      <InAppNotification
        message={notificationMessage}
        show={showNotification}
        onClose={() => setShowNotification(false)}
        onClick={() => {
          setShowNotification(false);
          setShowInbox(true);
        }}
      />
    </div>
  );
}