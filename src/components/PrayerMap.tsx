/**
 * PrayerMap - GLOBAL LIVING MAP (REFACTORED + MEMORIAL LINES ENHANCED)
 *
 * This is the heart of PrayerMap - a GLOBAL LIVING MAP where everyone sees
 * all prayers from around the world in real-time.
 *
 * REFACTORED: Extracted responsibilities into focused components:
 * - MapContainer: MapBox GL initialization
 * - PrayerMarkers: Marker rendering and clustering
 * - MemorialLinesLayer: Enhanced memorial line rendering (UPGRADED)
 * - MapUI: UI chrome (header, buttons)
 * - MapModals: All modal components
 * - usePrayerMapState: Centralized state management
 *
 * MEMORIAL LINES SYSTEM (NEW):
 * - FirstImpressionAnimation: One-time reveal for new users
 * - NewConnectionEffect: Dramatic entrance for new connections
 * - ConnectionDensityOverlay: Heat map visualization
 * - ConnectionDetailModal: Full connection details
 * - ConnectionTooltip: Hover preview (integrated in MemorialLinesLayer)
 *
 * This component now focuses on:
 * - Data fetching (prayers, inbox, connections)
 * - Business logic (prayer submission, creation)
 * - UI composition with enhanced memorial lines
 */

import { useEffect, useRef, useCallback, useState } from 'react';
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
import { extendBounds } from '../utils/viewportCulling';
import { debounce } from '../utils/debounce';
import { hapticService } from '../services/hapticService';

// Extracted components
import { MapContainer } from './map/MapContainer';
import { PrayerMarkers } from './map/PrayerMarkers';
import { MemorialLinesLayer } from './map/MemorialLinesLayer';
import { FirstImpressionAnimation, useFirstImpression } from './map/FirstImpressionAnimation';
import { NewConnectionEffect } from './map/NewConnectionEffect';
import { ConnectionDensityOverlay } from './map/ConnectionDensityOverlay';
import { ConnectionDetailModal } from './map/ConnectionDetailModal';
import { MapUI } from './map/MapUI';
import { MapModals } from './map/MapModals';
import { PrayerAnimationLayer } from './PrayerAnimationLayer';
import { PrayerAnimationLayerEnhanced } from './PrayerAnimationLayerEnhanced';
import { PrayerCreationAnimation } from './PrayerCreationAnimation';
import { InAppNotification } from './InAppNotification';
import { useAnimationFeatures } from '../hooks/useAnimationFeatures';

interface PrayerMapProps {
  userLocation: { lat: number; lng: number };
  onOpenSettings: () => void;
}

export function PrayerMap({ userLocation, onOpenSettings }: PrayerMapProps) {
  const map = useRef<mapboxgl.Map | null>(null);
  const { user } = useAuth();
  const { state, actions } = usePrayerMapState();
  const { features } = useAnimationFeatures();

  // MEMORIAL LINES ENHANCEMENT: Additional state
  const [selectedConnection, setSelectedConnection] = useState<PrayerConnection | null>(null);
  const [showDensityOverlay, setShowDensityOverlay] = useState(true); // Feature flag for density overlay
  const [newConnectionIds, setNewConnectionIds] = useState<Set<string>>(new Set());
  const previousConnectionIdsRef = useRef<Set<string>>(new Set());

  // First impression animation state
  const {
    shouldShowAnimation: showFirstImpression,
    onComplete: handleFirstImpressionComplete,
    onSkip: handleFirstImpressionSkip
  } = useFirstImpression(state.connections);

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
  // PERFORMANCE: Uses incremental updates instead of full refetches
  useEffect(() => {
    fetchAllConnections().then((globalConnections) => {
      console.log('Loaded global connections:', globalConnections.length);
      actions.setConnections(globalConnections);
      // Track initial connections
      previousConnectionIdsRef.current = new Set(globalConnections.map(c => c.id));
    });

    const unsubscribe = subscribeToAllConnections((updater) => {
      console.log('Real-time connection update (incremental)');
      actions.setConnections((prev) => updater(prev));
    });

    return unsubscribe;
  }, [actions]);

  // MEMORIAL LINES: Detect new connections for NewConnectionEffect
  useEffect(() => {
    const currentIds = new Set(state.connections.map(c => c.id));
    const newIds = new Set<string>();

    // Find connections that are in current but not in previous
    state.connections.forEach(conn => {
      if (!previousConnectionIdsRef.current.has(conn.id)) {
        newIds.add(conn.id);
      }
    });

    if (newIds.size > 0) {
      console.log('New connections detected:', newIds.size);
      setNewConnectionIds(newIds);

      // Clear new connection IDs after animation duration (5 seconds)
      const timeout = setTimeout(() => {
        setNewConnectionIds(new Set());
      }, 5000);

      // Update previous IDs
      previousConnectionIdsRef.current = currentIds;

      return () => clearTimeout(timeout);
    }

    previousConnectionIdsRef.current = currentIds;
  }, [state.connections]);

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

    // PERFORMANCE FIX: Don't create optimistic connection
    // The server creates the connection and the real-time subscription
    // will add it within ~100ms using incremental updates
    // This prevents duplicates and ID mismatches
    setTimeout(() => {
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

  // MEMORIAL LINES: Connection selection handler
  const handleConnectionSelect = useCallback((connection: PrayerConnection) => {
    setSelectedConnection(connection);
    // Haptic feedback on selection
    hapticService.impact('medium');
  }, []);

  // MEMORIAL LINES: Haptic feedback handler for NewConnectionEffect
  const handleHapticRequest = useCallback((pattern: 'light' | 'medium' | 'heavy') => {
    hapticService.impact(pattern);
  }, []);

  // MEMORIAL LINES: View prayer from connection modal
  const handleViewPrayerFromConnection = useCallback((prayerId: string) => {
    const prayer = prayers.find(p => p.id === prayerId);
    if (prayer) {
      setSelectedConnection(null);
      actions.openPrayerDetail(prayer);
    }
  }, [prayers, actions]);

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

        {/* MEMORIAL LINES SYSTEM: Connection Density Overlay (heat map) */}
        <ConnectionDensityOverlay
          connections={state.connections}
          map={map.current}
          mapBounds={state.mapBounds}
          enabled={showDensityOverlay}
          opacity={0.15}
        />

        {/* MEMORIAL LINES SYSTEM: Enhanced Memorial Lines Layer */}
        <MemorialLinesLayer
          connections={state.connections}
          map={map.current}
          mapLoaded={state.mapLoaded}
          mapBounds={state.mapBounds}
          selectedConnection={selectedConnection?.id}
          onConnectionSelect={handleConnectionSelect}
        />

        {/* MEMORIAL LINES SYSTEM: New Connection Effects (dramatic entrance animations) */}
        <AnimatePresence>
          {Array.from(newConnectionIds).map((connectionId) => {
            const connection = state.connections.find(c => c.id === connectionId);
            if (!connection || !map.current) return null;

            return (
              <NewConnectionEffect
                key={connectionId}
                connection={connection}
                map={map.current}
                onRequestHaptic={handleHapticRequest}
                onAnimationComplete={() => {
                  console.log('New connection animation complete:', connectionId);
                }}
              />
            );
          })}
        </AnimatePresence>

        {/* Animation Layers */}
        <AnimatePresence>
          {state.animatingPrayer && (
            features.useEnhancedAnimation ? (
              <PrayerAnimationLayerEnhanced
                prayer={state.animatingPrayer.prayer}
                userLocation={state.animatingPrayer.userLocation}
                map={map.current}
                onComplete={handleAnimationComplete}
                enableSound={features.enableSound}
              />
            ) : (
              <PrayerAnimationLayer
                prayer={state.animatingPrayer.prayer}
                userLocation={state.animatingPrayer.userLocation}
                map={map.current}
                onComplete={handleAnimationComplete}
              />
            )
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
        userId={user?.id || null}
        onNavigateToPrayer={(prayerId: string) => {
          // Find the prayer and open it in the detail modal
          const prayer = prayers.find(p => p.id === prayerId);
          if (prayer) {
            actions.openPrayerDetail(prayer);
          }
        }}
        onOpenSettings={onOpenSettings}
        onOpenRequestModal={actions.openRequestModal}
        onOpenInfo={actions.openInfo}
        onOpenInbox={actions.openInbox}
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

      {/* MEMORIAL LINES SYSTEM: First Impression Animation (one-time reveal) */}
      <AnimatePresence>
        {showFirstImpression && map.current && (
          <FirstImpressionAnimation
            connections={state.connections}
            map={map.current}
            onComplete={handleFirstImpressionComplete}
            onSkip={handleFirstImpressionSkip}
          />
        )}
      </AnimatePresence>

      {/* MEMORIAL LINES SYSTEM: Connection Detail Modal */}
      <ConnectionDetailModal
        connection={selectedConnection}
        isOpen={!!selectedConnection}
        onClose={() => setSelectedConnection(null)}
        onViewPrayer={handleViewPrayerFromConnection}
        onAddPrayer={(prayerId) => {
          const prayer = prayers.find(p => p.id === prayerId);
          if (prayer) {
            setSelectedConnection(null);
            actions.openPrayerDetail(prayer);
          }
        }}
      />
    </div>
  );
}
