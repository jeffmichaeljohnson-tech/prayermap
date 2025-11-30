/**
 * PrayerMap - GLOBAL LIVING MAP (REFACTORED)
 *
 * This is the heart of PrayerMap - a GLOBAL LIVING MAP where everyone sees
 * all prayers from around the world in real-time.
 *
 * REFACTORED: Extracted responsibilities into focused components:
 * - MapContainer: MapBox GL initialization
 * - PrayerMarkers: Marker rendering and clustering
 * - ConnectionLines: Connection line rendering
 * - MapUI: UI chrome (header, buttons)
 * - MapModals: All modal components
 * - usePrayerMapState: Centralized state management
 *
 * This component now focuses on:
 * - Data fetching (prayers, inbox, connections)
 * - Business logic (prayer submission, creation)
 * - UI composition
 */

import { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import type mapboxgl from 'mapbox-gl';
import type { LngLatBounds } from 'mapbox-gl';
import type { Prayer, PrayerConnection } from '../types/prayer';
import type { PrayerReplyData } from './PrayerDetailModal';
import { uploadAudio } from '../services/storageService';
import { usePrayers } from '../hooks/usePrayers';
import { useAuth } from '../contexts/AuthContext';
import { useInbox } from '../hooks/useInbox';
import { usePrayerMapState, useInboxNotifications } from '../hooks/usePrayerMapState';
import { fetchAllConnections, subscribeToAllConnections } from '../services/prayerService';
import { realtimeMonitor } from '../services/realtimeMonitor';
import { getVisibleConnections, extendBounds } from '../utils/viewportCulling';
import { debounce } from '../utils/debounce';
import { 
  loadConnectionsFromCache, 
  saveConnectionsToCache 
} from '../utils/statePersistence';
import { livingMapMonitor } from '../utils/livingMapMonitor';

// Extracted components
import { MapContainer } from './map/MapContainer';
import { PrayerMarkers } from './map/PrayerMarkers';
import { ConnectionLines } from './map/ConnectionLines';
import { MapUI } from './map/MapUI';
import { MapModals } from './map/MapModals';
import { PrayerAnimationLayer } from './PrayerAnimationLayer';
import { PrayerCreationAnimation } from './PrayerCreationAnimation';
import { InAppNotification } from './InAppNotification';

interface PrayerMapProps {
  userLocation: { lat: number; lng: number };
  onOpenSettings: () => void;
}

export function PrayerMap({ userLocation, onOpenSettings }: PrayerMapProps) {
  const map = useRef<mapboxgl.Map | null>(null);
  const { user } = useAuth();
  const { state, actions } = usePrayerMapState();

  // GLOBAL LIVING MAP: Fetch ALL prayers worldwide, not just nearby ones
  // This creates a living tapestry of prayer connecting people across the globe
  const {
    prayers,
    createPrayer,
    respondToPrayer,
    refetch: refetchPrayers
  } = usePrayers({
    location: userLocation,
    radiusKm: 50,
    enableRealtime: true,
    globalMode: true
  });

  // Inbox for notifications
  const { totalUnread, inbox } = useInbox({
    userId: user?.id || '',
    autoFetch: !!user,
    enableRealtime: true
  });

  // Handle inbox notifications
  useInboxNotifications(
    totalUnread,
    state.prevUnreadCount,
    inbox,
    actions.showNotificationMessage,
    actions.setPrevUnreadCount
  );

  // Track prayers state changes and validate Living Map requirements
  useEffect(() => {
    console.log('🔄 PRAYERS STATE CHANGED:', {
      count: prayers.length,
      animationActive: !!state.creatingPrayerAnimation,
      latestPrayerIds: prayers.slice(0, 3).map(p => p.id),
      timestamp: new Date().toISOString()
    });

    // Monitor Living Map state for debugging
    livingMapMonitor.takeSnapshot(prayers, state.connections, 'Prayer State Change');
    livingMapMonitor.validateLivingMap(prayers, state.connections);

    // If we have prayers and animation just finished, log success
    if (prayers.length > 0 && !state.creatingPrayerAnimation) {
      console.log('✅ Prayer creation flow appears successful - prayers loaded and no animation active');
      livingMapMonitor.logStatus(prayers, state.connections);
    }
  }, [prayers, state.creatingPrayerAnimation, state.connections]);

  // GLOBAL LIVING MAP: Fetch and subscribe to ALL prayer connections worldwide
  useEffect(() => {
    // Initialize with cached connections for instant loading
    const cachedConnections = loadConnectionsFromCache();
    if (cachedConnections.length > 0) {
      console.log('🚀 Fast loading with', cachedConnections.length, 'cached connections');
      actions.setConnections(cachedConnections);
    }

    // Load fresh connections from server
    fetchAllConnections().then((globalConnections) => {
      console.log('✅ Loaded global connections:', globalConnections.length);
      actions.setConnections(globalConnections);
      
      // Cache fresh connections
      if (globalConnections.length > 0) {
        saveConnectionsToCache(globalConnections);
      }
    });

    // Subscribe to real-time updates with intelligent merging
    const unsubscribe = subscribeToAllConnections((updatedConnections) => {
      console.log('📥 Real-time connection update:', updatedConnections.length);
      
      // CRITICAL FIX: Use function form to prevent state replacement
      actions.setConnections(currentConnections => {
        // Intelligent merging - preserve existing connections, add new ones
        const connectionMap = new Map(currentConnections.map(conn => [conn.id, conn]));
        
        // Add/update connections from server
        updatedConnections.forEach(conn => {
          connectionMap.set(conn.id, conn);
        });
        
        const merged = Array.from(connectionMap.values())
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        
        console.log('🔄 Connection state merged:', currentConnections.length, '→', merged.length, 'connections');
        
        // Cache updated state for persistence
        if (merged.length > 0) {
          saveConnectionsToCache(merged);
        }
        
        return merged;
      });
    });

    return unsubscribe;
  }, [actions]);

  // Handle map load
  const handleMapLoad = useCallback((mapInstance: mapboxgl.Map) => {
    map.current = mapInstance;
  }, []);

  // Viewport culling: Update bounds on map move (debounced for performance)
  // Debouncing prevents excessive re-renders during smooth pan/zoom
  useEffect(() => {
    if (!map.current) return;

    const updateBounds = debounce(() => {
      if (map.current) {
        // Extend bounds by 20% buffer to prevent pop-in during panning
        const currentBounds = map.current.getBounds();
        const bufferedBounds = extendBounds(currentBounds, 0.2);
        actions.setMapBounds(bufferedBounds);
      }
    }, 100);

    // Set initial bounds when map loads
    if (state.mapLoaded && !state.mapBounds) {
      const currentBounds = map.current.getBounds();
      const bufferedBounds = extendBounds(currentBounds, 0.2);
      actions.setMapBounds(bufferedBounds);
    }

    // Update bounds when map moves (pan, zoom, rotate)
    map.current.on('moveend', updateBounds);

    return () => {
      map.current?.off('moveend', updateBounds);
    };
  }, [state.mapLoaded, state.mapBounds, actions]);

  // Animation completion callback
  const handleAnimationComplete = useCallback(() => {
    console.log('Animation layer complete callback (no-op)');
  }, []);

  const handlePrayerSubmit = async (prayer: Prayer, replyData?: PrayerReplyData): Promise<boolean> => {
    if (!user) return false;

    actions.closePrayerDetail();
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous';

    // Start animation
    actions.startPrayerAnimation(prayer, userLocation);

    // Extract reply data
    const message = replyData?.message || 'Praying for you!';
    const contentType = replyData?.contentType || 'text';
    const isAnonymous = replyData?.isAnonymous || false;

    // Upload audio if present
    let contentUrl: string | undefined;
    if (replyData?.audioBlob && contentType === 'audio') {
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
          actions.stopPrayerAnimation();
        }, 6000);
        
        return true;
      } else {
        console.error('Prayer response was not created');
        actions.stopPrayerAnimation();
        return false;
      }
    } catch (error) {
      console.error('Prayer response failed:', error);
      actions.stopPrayerAnimation();
      return false;
    }
  };

  // Prayer request handler
  const handleRequestPrayer = async (newPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    actions.closeRequestModal();
    actions.startCreationAnimation(newPrayer.location);

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
        actions.stopCreationAnimation();
      }
    } catch (error) {
      console.error('Failed to create prayer:', error);
      // If prayer creation fails, clear animation immediately
      actions.stopCreationAnimation();
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Map with all overlays */}
      <MapContainer
        userLocation={userLocation}
        onMapLoad={handleMapLoad}
        onMapLoaded={actions.setMapLoaded}
      >
        {/* Prayer Markers */}
        <PrayerMarkers
          prayers={prayers}
          map={map.current}
          onMarkerClick={actions.openPrayerDetail}
        />

        {/* Connection Lines */}
        <ConnectionLines
          connections={state.connections}
          map={map.current}
          mapLoaded={state.mapLoaded}
          mapBounds={state.mapBounds}
          hoveredConnection={state.hoveredConnection}
          onHover={actions.setHoveredConnection}
          onLeave={() => actions.setHoveredConnection(null)}
        />

        {/* Animation Layers */}
        <AnimatePresence>
          {state.animatingPrayer && (
            <PrayerAnimationLayer
              prayer={state.animatingPrayer.prayer}
              userLocation={state.animatingPrayer.userLocation}
              map={map.current}
              onComplete={handleAnimationComplete}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {state.creatingPrayerAnimation && (
            <PrayerCreationAnimation
              targetLocation={state.creatingPrayerAnimation.targetLocation}
              map={map.current}
              onComplete={actions.stopCreationAnimation}
            />
          )}
        </AnimatePresence>
      </MapContainer>

      {/* UI Chrome */}
      <MapUI
        totalUnread={totalUnread}
        onOpenInbox={actions.openInbox}
        onOpenSettings={onOpenSettings}
        onOpenRequestModal={actions.openRequestModal}
        onOpenInfo={actions.openInfo}
      />

      {/* All Modals */}
      <MapModals
        selectedPrayer={state.selectedPrayer}
        onClosePrayerDetail={actions.closePrayerDetail}
        onPray={handlePrayerSubmit}
        userLocation={userLocation}
        showInbox={state.showInbox}
        onCloseInbox={actions.closeInbox}
        showRequestModal={state.showRequestModal}
        onCloseRequestModal={actions.closeRequestModal}
        onSubmitPrayer={handleRequestPrayer}
        showInfo={state.showInfo}
        onCloseInfo={actions.closeInfo}
      />

      {/* In-App Notification */}
      <InAppNotification
        message={state.notificationMessage}
        show={state.showNotification}
        onClose={actions.hideNotification}
        onClick={() => {
          actions.hideNotification();
          actions.openInbox();
        }}
      />
    </div>
  );
}
