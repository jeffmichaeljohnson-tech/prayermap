import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Prayer, PrayerConnection } from '../types/prayer';
import { PrayerMarker } from './PrayerMarker';
import { PrayerDetailModal } from './PrayerDetailModal';
import { RequestPrayerModal } from './RequestPrayerModal';
import { PrayerAnimationLayer } from './PrayerAnimationLayer';
import { PrayerConnection as PrayerConnectionComponent } from './PrayerConnection';
import { InboxModal } from './InboxModal';
import { Inbox, Settings } from 'lucide-react';

// Mapbox public access token
mapboxgl.accessToken = 'pk.eyJ1IjoiamVmZm1pY2hhZWxqb2huc29uLXRlY2giLCJhIjoiY21pM28wNWw2MXNlZDJrcHdhaHJuY3M4ZyJ9.LD85_bwC_M-3JKjhjtDhqQ';

interface PrayerMapProps {
  userLocation: { lat: number; lng: number };
  onOpenSettings: () => void;
}

export function PrayerMap({ userLocation, onOpenSettings }: PrayerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [connections, setConnections] = useState<PrayerConnection[]>([]);
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [animatingPrayer, setAnimatingPrayer] = useState<{
    prayer: Prayer;
    userLocation: { lat: number; lng: number };
  } | null>(null);
  const [mapState, setMapState] = useState({
    center: [userLocation.lng, userLocation.lat] as [number, number],
    zoom: 11,
    pitch: 0,
    bearing: 0
  });

  // Initialize mock prayers
  useEffect(() => {
    const mockPrayers: Prayer[] = [
      {
        id: '1',
        title: 'Health and healing',
        content: 'Please pray for my mother who is recovering from surgery. She needs strength and comfort during this difficult time.',
        contentType: 'text',
        location: { lat: userLocation.lat + 0.05, lng: userLocation.lng - 0.03 },
        userName: 'Sarah',
        isAnonymous: false,
        createdAt: new Date(),
        prayedBy: []
      },
      {
        id: '2',
        content: 'Going through a difficult time at work and need guidance and peace...',
        contentType: 'text',
        location: { lat: userLocation.lat - 0.08, lng: userLocation.lng + 0.05 },
        isAnonymous: true,
        createdAt: new Date(),
        prayedBy: []
      },
      {
        id: '3',
        title: 'Family reconciliation',
        content: 'Praying for restoration in my relationship with my brother. We haven\'t spoken in months.',
        contentType: 'text',
        location: { lat: userLocation.lat + 0.1, lng: userLocation.lng + 0.08 },
        userName: 'Michael',
        isAnonymous: false,
        createdAt: new Date(),
        prayedBy: []
      },
      {
        id: '4',
        content: 'Need prayers for financial breakthrough and provision for my family...',
        contentType: 'text',
        location: { lat: userLocation.lat - 0.04, lng: userLocation.lng - 0.06 },
        isAnonymous: true,
        createdAt: new Date(),
        prayedBy: []
      },
      {
        id: '5',
        title: 'Job search',
        content: 'Been looking for work for 3 months. Praying for an opportunity and God\'s direction.',
        contentType: 'text',
        location: { lat: userLocation.lat + 0.07, lng: userLocation.lng + 0.02 },
        userName: 'James',
        isAnonymous: false,
        createdAt: new Date(),
        prayedBy: []
      }
    ];
    
    setPrayers(mockPrayers);

    // Add a mock connection to test rendering
    const mockDate = new Date();
    const mockExpiry = new Date(mockDate);
    mockExpiry.setFullYear(mockExpiry.getFullYear() + 1);
    
    const mockConnection: PrayerConnection = {
      id: 'mock-conn-1',
      prayerId: '1',
      fromLocation: { lat: userLocation.lat + 0.05, lng: userLocation.lng - 0.03 },
      toLocation: userLocation,
      requesterName: 'Sarah',
      replierName: 'John',
      createdAt: mockDate,
      expiresAt: mockExpiry
    };
    
    setConnections([mockConnection]);
    console.log('Initialized with mock connection:', mockConnection);
  }, [userLocation]);

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

    map.current.on('move', () => {
      if (!map.current) return;
      setMapState({
        center: [map.current.getCenter().lng, map.current.getCenter().lat],
        zoom: map.current.getZoom(),
        pitch: map.current.getPitch(),
        bearing: map.current.getBearing()
      });
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

  const handleAnimationComplete = () => {
    if (animatingPrayer) {
      setSelectedPrayer(animatingPrayer.prayer);
      setAnimatingPrayer(null);
    }
  };

  const handlePrayerSubmit = (prayer: Prayer) => {
    // Close modal and trigger the beautiful animation
    setSelectedPrayer(null);
    setAnimatingPrayer({ prayer, userLocation });
    
    // After animation completes, update connections and prayers
    setTimeout(() => {
      const createdDate = new Date();
      const expiresDate = new Date(createdDate);
      expiresDate.setFullYear(expiresDate.getFullYear() + 1); // Expires one year from now
      
      const newConnection: PrayerConnection = {
        id: `conn-${Date.now()}`,
        prayerId: prayer.id,
        fromLocation: prayer.location,
        toLocation: userLocation,
        requesterName: prayer.isAnonymous ? 'Anonymous' : (prayer.userName || 'Anonymous'),
        replierName: 'You', // Current user - in real app, this would be the logged-in user's name
        createdAt: createdDate,
        expiresAt: expiresDate
      };
      
      setConnections([...connections, newConnection]);
      setPrayers(prayers.map(p => 
        p.id === prayer.id 
          ? { ...p, prayedBy: [...(p.prayedBy || []), 'current-user'] }
          : p
      ));
      setAnimatingPrayer(null);
    }, 6000); // Updated duration to match new animation (6 seconds)
  };

  const handleRequestPrayer = (newPrayer: Omit<Prayer, 'id' | 'createdAt' | 'prayedBy'>) => {
    const prayer: Prayer = {
      ...newPrayer,
      id: `prayer-${Date.now()}`,
      createdAt: new Date(),
      prayedBy: []
    };
    
    setPrayers([...prayers, prayer]);
    setShowRequestModal(false);
  };

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
        {prayers.map(prayer => (
          <PrayerMarker
            key={prayer.id}
            prayer={prayer}
            map={map.current}
            onClick={() => handlePrayerClick(prayer)}
            isPrayed={prayer.prayedBy && prayer.prayedBy.length > 0}
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

      {/* Animation Layer */}
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

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
        <div className="glass-strong rounded-2xl p-4 flex items-center justify-between pointer-events-auto">
          <button 
            onClick={() => setShowInbox(true)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors relative"
          >
            <Inbox className="w-6 h-6 text-gray-700" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>
          
          <h2 className="text-gray-800">PrayerMap</h2>
          
          <button 
            onClick={onOpenSettings}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Settings className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Request Prayer Button - moved higher */}
      <motion.button
        onClick={() => setShowRequestModal(true)}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-strong rounded-full px-8 py-4 flex items-center gap-3 shadow-xl hover:shadow-2xl transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-2xl">🙏</span>
        <span className="text-gray-800 text-[16px]">Request Prayer</span>
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
    </div>
  );
}