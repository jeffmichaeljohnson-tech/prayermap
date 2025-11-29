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
<<<<<<< HEAD
import { realtimeMonitor } from '../services/realtimeMonitor';
=======
import { getVisibleConnections, extendBounds } from '../utils/viewportCulling';
import { debounce } from '../utils/debounce';
>>>>>>> 57f01ebf299af966bd359e4df742667ea97f0ca9

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

<<<<<<< HEAD
  // GLOBAL LIVING MAP: Fetch ALL prayers worldwide, not just nearby ones
  // This creates a living tapestry of prayer connecting people across the globe
  const {
    prayers,
    createPrayer,
    respondToPrayer,
    refetch: refetchPrayers
  } = usePrayers({
=======
  // GLOBAL LIVING MAP: Fetch ALL prayers worldwide
  const { prayers, createPrayer, respondToPrayer } = usePrayers({
>>>>>>> 57f01ebf299af966bd359e4df742667ea97f0ca9
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
  useEffect(() => {
    fetchAllConnections().then((globalConnections) => {
      console.log('Loaded global connections:', globalConnections.length);
      actions.setConnections(globalConnections);
    });

<<<<<<< HEAD
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
=======
    const unsubscribe = subscribeToAllConnections((updatedConnections) => {
      console.log('Real-time connection update:', updatedConnections.length);
      actions.setConnections(updatedConnections);
>>>>>>> 57f01ebf299af966bd359e4df742667ea97f0ca9
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

<<<<<<< HEAD
  const handlePrayerSubmit = async (prayer: Prayer, replyData?: PrayerReplyData): Promise<boolean> => {
    if (!user) return false;

=======
  // Prayer submission handler
  const handlePrayerSubmit = async (prayer: Prayer, replyData?: PrayerReplyData) => {
    if (!user) return;

    actions.closePrayerDetail();
>>>>>>> 57f01ebf299af966bd359e4df742667ea97f0ca9
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
<<<<<<< HEAD
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
=======
      }
    }

    // Submit prayer response
    respondToPrayer(
      prayer.id,
      user.id,
      userName,
      message,
      contentType,
      contentUrl,
      isAnonymous,
      userLocation
    );

    // Create connection after animation (6 seconds)
    const createdDate = new Date();
    const expiresDate = new Date(createdDate);
    expiresDate.setFullYear(expiresDate.getFullYear() + 1);

    const newConnection: PrayerConnection = {
      id: `conn-${Date.now()}`,
      prayerId: prayer.id,
      fromLocation: prayer.location,
      toLocation: userLocation,
      requesterName: prayer.is_anonymous ? 'Anonymous' : (prayer.user_name || 'Anonymous'),
      replierName: isAnonymous ? 'Anonymous' : userName,
      createdAt: createdDate,
      expiresAt: expiresDate
    };

    setTimeout(() => {
      actions.setConnections(prev => [...prev, newConnection]);
      actions.stopPrayerAnimation();
    }, 6000);
>>>>>>> 57f01ebf299af966bd359e4df742667ea97f0ca9
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
        setCreatingPrayerAnimation(null);
      }
    } catch (error) {
      console.error('Failed to create prayer:', error);
      // If prayer creation fails, clear animation immediately
      setCreatingPrayerAnimation(null);
    }
  };

<<<<<<< HEAD
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

=======
>>>>>>> 57f01ebf299af966bd359e4df742667ea97f0ca9
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
        userLocation={userLocation}
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
