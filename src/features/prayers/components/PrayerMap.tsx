import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Supercluster from 'supercluster';
import type { Prayer, PrayerConnection, PrayerCategory } from '../types/prayer';
import { PRAYER_CATEGORIES } from '../types/prayer';
import { PrayerMarker } from './PrayerMarker';
import { ClusterMarker } from './ClusterMarker';
import { PrayerDetailModal } from './PrayerDetailModal';
import { RequestPrayerModal } from './RequestPrayerModal';
import { PrayerAnimationLayer } from './PrayerAnimationLayer';
import { PrayerCreationAnimation } from './PrayerCreationAnimation';
import { PrayerConnection as PrayerConnectionComponent } from './PrayerConnection';
import { InboxModal } from '../../messaging/components/InboxModal';
import { InfoModal } from '../../../components/InfoModal';
import { SavedPrayersModal } from './SavedPrayersModal';
import { SunMoonIndicator } from '../../map/components/SunMoonIndicator';
import { Inbox, Settings, Info, Bookmark } from 'lucide-react';
import { usePrayers } from '../hooks/usePrayers';
import { usePrayerConnections } from '../hooks/usePrayerConnections';
import { useAuth } from '../../authentication/contexts/AuthContext';
import { useInbox } from '../../messaging/hooks/useInbox';
import { useTheme } from '../../../contexts/ThemeContext';

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
  const { resolvedTheme } = useTheme();

  // Category filter state
  const [selectedCategories, setSelectedCategories] = useState<PrayerCategory[]>([]);

  // Toggle category selection
  const toggleCategory = useCallback((category: PrayerCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => setSelectedCategories([]), []);

  // Use the usePrayers hook for real-time data from Supabase
  const {
    prayers,
    loading: prayersLoading,
    createPrayer,
    respondToPrayer,
    deletePrayer,
    fetchByBounds,
    addBlockedUser
  } = usePrayers({
    location: userLocation,
    radiusKm: 50,
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    enableRealtime: true,
    userId: user?.id
  });

  // Use the useInbox hook to get unread count
  const { totalUnread } = useInbox({
    userId: user?.id || '',
    autoFetch: !!user,
    enableRealtime: true
  });

  // Use the usePrayerConnections hook for memorial lines
  // These are loaded from the database and persist across page refreshes
  const {
    connections,
    addConnection,
    loading: connectionsLoading
  } = usePrayerConnections({
    autoFetch: true,
    enableRealtime: true
  });
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSavedPrayers, setShowSavedPrayers] = useState(false);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [animatingPrayer, setAnimatingPrayer] = useState<{
    prayer: Prayer;
    userLocation: { lat: number; lng: number };
  } | null>(null);
  const [creatingPrayerAnimation, setCreatingPrayerAnimation] = useState<{
    targetLocation: { lat: number; lng: number };
  } | null>(null);
  
  // Toast state for user feedback on clustering
  const [toast, setToast] = useState<string | null>(null);

  // Ref to store pending connection data (set by handlePrayerSubmit when API succeeds)
  const pendingConnectionRef = useRef<PrayerConnection | null>(null);

  // Group prayers by location to handle overlapping markers (kept for fallback)
  const prayerGroups = useMemo(() => groupPrayersByLocation(prayers), [prayers]);
  
  // Create supercluster instance for marker clustering
  const clusterIndex = useMemo(() => {
    const index = new Supercluster<{ prayer: Prayer }>({
      radius: 60,      // Cluster radius in pixels
      maxZoom: 16,     // Max zoom to cluster at
      minPoints: 2,    // Min points to form cluster
    });

    // Convert prayers to GeoJSON points
    const points = prayers.map(prayer => ({
      type: 'Feature' as const,
      properties: { prayer },
      geometry: {
        type: 'Point' as const,
        coordinates: [prayer.location.lng, prayer.location.lat] as [number, number],
      },
    }));

    index.load(points);
    return index;
  }, [prayers]);
  
  // State for current clusters
  const [clusters, setClusters] = useState<Supercluster.ClusterFeature<{ prayer: Prayer }>[] | Supercluster.PointFeature<{ prayer: Prayer }>[]>([]);

  // Determine map style based on theme
  const mapStyle = resolvedTheme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11';

  // Initialize map with ethereal style
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    console.log('Initializing Mapbox map at:', userLocation);

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
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

      // Customize map colors for ethereal theme (light mode only)
      if (resolvedTheme === 'light') {
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
      }

      // Initial fetch for current viewport
      const bounds = map.current.getBounds();
      fetchByBounds({
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth()
      });
    });

    // Fetch prayers when map stops moving (pan/zoom)
    map.current.on('moveend', () => {
      if (!map.current) return;
      const bounds = map.current.getBounds();
      fetchByBounds({
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth()
      });
    });

    map.current.on('error', (e) => {
      console.error('Map error:', e);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [userLocation, fetchByBounds, mapStyle, resolvedTheme]);

  // Update map style when theme changes
  useEffect(() => {
    if (!map.current) return;
    
    map.current.setStyle(mapStyle);
    
    // Re-apply custom styling after style change (for light mode)
    map.current.once('styledata', () => {
      if (!map.current || resolvedTheme !== 'light') return;
      
      try {
        if (map.current.getLayer('water')) {
          map.current.setPaintProperty('water', 'fill-color', 'hsl(210, 80%, 85%)');
        }
        if (map.current.getLayer('landuse')) {
          map.current.setPaintProperty('landuse', 'fill-opacity', 0.3);
        }
      } catch (e) {
        console.log('Layer customization on style change:', e);
      }
    });
  }, [mapStyle, resolvedTheme]);

  // Update clusters when map moves or zoom changes
  useEffect(() => {
    if (!map.current || !clusterIndex) return;

    const updateClusters = () => {
      if (!map.current) return;
      const bounds = map.current.getBounds();
      const zoom = Math.floor(map.current.getZoom());

      const newClusters = clusterIndex.getClusters(
        [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ],
        zoom
      );

      setClusters(newClusters);
    };

    updateClusters();

    map.current.on('move', updateClusters);
    map.current.on('zoom', updateClusters);

    return () => {
      map.current?.off('move', updateClusters);
      map.current?.off('zoom', updateClusters);
    };
  }, [clusterIndex]);

  // Handle cluster click - zoom in with helpful feedback
  const handleClusterClick = useCallback((clusterId: number, coordinates: [number, number], count: number) => {
    if (!map.current) return;
    
    const expansionZoom = clusterIndex.getClusterExpansionZoom(clusterId);
    const currentZoom = map.current.getZoom();

    // Show helpful toast explaining what's happening
    if (expansionZoom > currentZoom) {
      setToast(`Zooming to show ${count} prayers`);
    } else {
      setToast(`Showing ${count} prayers in this area`);
    }
    setTimeout(() => setToast(null), 2500);

    // Zoom in to expand cluster
    map.current.flyTo({
      center: coordinates,
      zoom: Math.min(expansionZoom + 0.5, 18),
      duration: 600,
      essential: true,
    });
  }, [clusterIndex]);

  const handlePrayerClick = (prayer: Prayer) => {
    // Show modal immediately without animation
    setSelectedPrayer(prayer);
  };

  const handleAnimationComplete = useCallback(() => {
    // Add the pending connection optimistically if API call succeeded
    // The real connection is already in the database and will sync via real-time
    if (pendingConnectionRef.current) {
      addConnection(pendingConnectionRef.current);
      pendingConnectionRef.current = null;
    }
    // Clear animation state - do NOT reopen the modal
    setAnimatingPrayer(null);
  }, [addConnection]);

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

    // Get user name from metadata or email
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous';

    // Create the prayer in the database
    try {
      await createPrayer({
        ...newPrayer,
        user_id: user.id,
        user_name: newPrayer.is_anonymous ? undefined : userName,
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
          backgroundColor: resolvedTheme === 'dark' ? '#1a1a2e' : '#e8f4f8', // Theme-aware background while map loads
          touchAction: 'none' // Prevent browser handling of touch gestures - let Mapbox handle them
        }}
      />

      {/* Clustered Markers */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {map.current && clusters.map(cluster => {
          const [lng, lat] = cluster.geometry.coordinates;
          const isCluster = cluster.properties && 'cluster' in cluster.properties && cluster.properties.cluster;
          const pointCount = isCluster && 'point_count' in cluster.properties ? cluster.properties.point_count : 0;

          // Render cluster marker
          if (isCluster) {
            return (
              <ClusterMarker
                key={`cluster-${cluster.id}`}
                count={pointCount}
                coordinates={[lng, lat]}
                map={map.current!}
                onClick={() => handleClusterClick(cluster.id as number, [lng, lat], pointCount)}
              />
            );
          }

          // Render individual prayer marker
          const prayer = cluster.properties.prayer;
          return (
            <PrayerMarker
              key={prayer.id}
              prayer={prayer}
              map={map.current}
              onClick={() => handlePrayerClick(prayer)}
              isPrayed={prayer.prayedBy?.includes(user?.id || '')}
              stackCount={1}
              allPrayers={[prayer]}
              onSelectPrayer={handlePrayerClick}
            />
          );
        })}
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
            className="p-2 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-colors relative"
            aria-label={totalUnread > 0 ? `Inbox with ${totalUnread} unread messages` : 'Inbox'}
          >
            <Inbox className="w-6 h-6 text-gray-700 dark:text-gray-300" aria-hidden="true" />
            {/* Notification badge - only show if there are unread messages */}
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center" aria-hidden="true">
                {totalUnread}
              </span>
            )}
          </button>

          <h1 className="text-2xl text-gray-800 dark:text-gray-100">PrayerMap</h1>

          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-6 h-6 text-gray-700 dark:text-gray-300" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="absolute top-28 left-0 right-0 px-4 pointer-events-none" style={{ zIndex: 25 }}>
        <div className="pointer-events-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* All button */}
            <motion.button
              onClick={clearFilters}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategories.length === 0
                  ? 'bg-gradient-to-r from-yellow-300 to-purple-300 dark:from-yellow-500 dark:to-purple-500 text-on-gradient shadow-md'
                  : 'glass text-gray-600 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/10'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              All
            </motion.button>

            {/* Category buttons */}
            {PRAYER_CATEGORIES.map(cat => (
              <motion.button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${
                  selectedCategories.includes(cat.id)
                    ? 'bg-gradient-to-r from-yellow-300 to-purple-300 dark:from-yellow-500 dark:to-purple-500 text-on-gradient shadow-md'
                    : 'glass text-gray-600 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/10'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Sunset/Sunrise Time Indicator */}
      <div className="absolute top-32 right-4 pointer-events-none" style={{ zIndex: 30 }}>
        <SunMoonIndicator location={userLocation} />
      </div>

      {/* Request Prayer Button - positioned higher for mobile browser compatibility */}
      <motion.button
        onClick={() => setShowRequestModal(true)}
        className="absolute bottom-28 left-1/2 -translate-x-1/2 glass-strong rounded-full px-8 py-4 flex items-center gap-3 shadow-xl hover:shadow-2xl transition-shadow"
        style={{ zIndex: 40 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Request prayer"
      >
        <span className="text-2xl" aria-hidden="true">🙏</span>
        <span className="text-gray-800 dark:text-gray-100 text-[16px]">Request Prayer</span>
      </motion.button>

      {/* Saved Prayers Button - lower left corner */}
      {user && (
        <motion.button
          onClick={() => setShowSavedPrayers(true)}
          className="absolute bottom-28 left-6 glass-strong rounded-full p-4 shadow-xl hover:shadow-2xl transition-shadow group"
          style={{ zIndex: 40 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="View saved prayers"
        >
          <Bookmark className="w-6 h-6 text-purple-500 dark:text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors drop-shadow-sm" aria-hidden="true" />
        </motion.button>
      )}

      {/* Info Button - lower right corner */}
      <motion.button
        onClick={() => setShowInfo(true)}
        className="absolute bottom-28 right-6 glass-strong rounded-full p-4 shadow-xl hover:shadow-2xl transition-shadow group"
        style={{ zIndex: 40 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="App information"
      >
        <Info className="w-6 h-6 text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors drop-shadow-sm" aria-hidden="true" />
      </motion.button>

      {/* Prayer Detail Modal */}
      <AnimatePresence>
        {selectedPrayer && (
          <PrayerDetailModal
            prayer={selectedPrayer}
            userLocation={userLocation}
            onClose={() => setSelectedPrayer(null)}
            onPray={handlePrayerSubmit}
            onDelete={deletePrayer}
            onBlockUser={(blockedUserId) => {
              addBlockedUser(blockedUserId);
              setSelectedPrayer(null);
            }}
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

      {/* Saved Prayers Modal */}
      <AnimatePresence>
        {showSavedPrayers && (
          <SavedPrayersModal
            onClose={() => setShowSavedPrayers(false)}
            onSelectPrayer={(prayer) => setSelectedPrayer(prayer)}
          />
        )}
      </AnimatePresence>

      {/* Helpful Toast for Clustering Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-36 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-gray-900/85 text-white text-sm rounded-full backdrop-blur-sm shadow-lg"
            style={{ zIndex: 35 }}
          >
            <span className="flex items-center gap-2">
              <span>🙏</span>
              {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}