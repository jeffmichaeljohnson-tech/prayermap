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
import { getVisibleConnections, extendBounds } from '../utils/viewportCulling';
import { debounce } from '../utils/debounce';

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

  // GLOBAL LIVING MAP: Fetch ALL prayers worldwide
  const { prayers, createPrayer, respondToPrayer } = usePrayers({
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

  // GLOBAL LIVING MAP: Fetch and subscribe to ALL prayer connections worldwide
  useEffect(() => {
    fetchAllConnections().then((globalConnections) => {
      console.log('Loaded global connections:', globalConnections.length);
      actions.setConnections(globalConnections);
    });

    const unsubscribe = subscribeToAllConnections((updatedConnections) => {
      console.log('Real-time connection update:', updatedConnections.length);
      actions.setConnections(updatedConnections);
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

  // Prayer submission handler
  const handlePrayerSubmit = async (prayer: Prayer, replyData?: PrayerReplyData) => {
    if (!user) return;

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
  };

  // Prayer request handler
  const handleRequestPrayer = async (newPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    actions.closeRequestModal();
    actions.startCreationAnimation(newPrayer.location);

    try {
      await createPrayer({
        ...newPrayer,
        user_id: user.id,
      });
    } catch (error) {
      console.error('Failed to create prayer:', error);
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
