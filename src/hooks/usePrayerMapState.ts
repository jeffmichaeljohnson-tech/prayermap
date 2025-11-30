/**
 * usePrayerMapState - Centralized state management for PrayerMap
 *
 * Manages all modal states, selection states, and notifications for the PrayerMap component.
 * Extracted from PrayerMap.tsx to reduce component complexity and improve maintainability.
 *
 * Includes viewport culling state (mapBounds) for performance optimization.
 */

import { useState, useEffect } from 'react';
import type { LngLatBounds } from 'mapbox-gl';
import type { Prayer, PrayerConnection } from '../types/prayer';

interface AnimatingPrayer {
  prayer: Prayer;
  userLocation: { lat: number; lng: number };
}

interface CreatingPrayerAnimation {
  targetLocation: { lat: number; lng: number };
}

interface PrayerMapState {
  // Modal states
  selectedPrayer: Prayer | null;
  showRequestModal: boolean;
  showInbox: boolean;
  showInfo: boolean;

  // Connection states
  connections: PrayerConnection[];
  hoveredConnection: string | null;

  // Animation states
  animatingPrayer: AnimatingPrayer | null;
  creatingPrayerAnimation: CreatingPrayerAnimation | null;

  // Notification states
  showNotification: boolean;
  notificationMessage: string;
  prevUnreadCount: number;

  // Map state
  mapLoaded: boolean;
  mapBounds: LngLatBounds | null;
}

interface PrayerMapActions {
  // Modal actions
  openPrayerDetail: (prayer: Prayer) => void;
  closePrayerDetail: () => void;
  openRequestModal: () => void;
  closeRequestModal: () => void;
  openInbox: () => void;
  closeInbox: () => void;
  openInfo: () => void;
  closeInfo: () => void;

  // Connection actions
  setConnections: React.Dispatch<React.SetStateAction<PrayerConnection[]>>;
  setHoveredConnection: (id: string | null) => void;

  // Animation actions
  startPrayerAnimation: (prayer: Prayer, userLocation: { lat: number; lng: number }) => void;
  stopPrayerAnimation: () => void;
  startCreationAnimation: (targetLocation: { lat: number; lng: number }) => void;
  stopCreationAnimation: () => void;

  // Notification actions
  showNotificationMessage: (message: string) => void;
  hideNotification: () => void;
  setPrevUnreadCount: (count: number) => void;

  // Map actions
  setMapLoaded: (loaded: boolean) => void;
  setMapBounds: (bounds: LngLatBounds | null) => void;
}

interface UsePrayerMapStateReturn {
  state: PrayerMapState;
  actions: PrayerMapActions;
}

/**
 * Custom hook to manage all state for the PrayerMap component
 */
export function usePrayerMapState(): UsePrayerMapStateReturn {
  // Modal states
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Connection states
  const [connections, setConnections] = useState<PrayerConnection[]>([]);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  // Animation states
  const [animatingPrayer, setAnimatingPrayer] = useState<AnimatingPrayer | null>(null);
  const [creatingPrayerAnimation, setCreatingPrayerAnimation] = useState<CreatingPrayerAnimation | null>(null);

  // Notification states
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapBounds, setMapBounds] = useState<LngLatBounds | null>(null);

  // Build actions object
  const actions: PrayerMapActions = {
    // Modal actions
    openPrayerDetail: setSelectedPrayer,
    closePrayerDetail: () => setSelectedPrayer(null),
    openRequestModal: () => setShowRequestModal(true),
    closeRequestModal: () => setShowRequestModal(false),
    openInbox: () => setShowInbox(true),
    closeInbox: () => setShowInbox(false),
    openInfo: () => setShowInfo(true),
    closeInfo: () => setShowInfo(false),

    // Connection actions
    setConnections,
    setHoveredConnection,

    // Animation actions
    startPrayerAnimation: (prayer, userLocation) => setAnimatingPrayer({ prayer, userLocation }),
    stopPrayerAnimation: () => setAnimatingPrayer(null),
    startCreationAnimation: (targetLocation) => setCreatingPrayerAnimation({ targetLocation }),
    stopCreationAnimation: () => setCreatingPrayerAnimation(null),

    // Notification actions
    showNotificationMessage: (message: string) => {
      setNotificationMessage(message);
      setShowNotification(true);
    },
    hideNotification: () => setShowNotification(false),
    setPrevUnreadCount,

    // Map actions
    setMapLoaded: (loaded: boolean) => {
      console.log('usePrayerMapState: setMapLoaded called with:', loaded);
      setMapLoaded(loaded);
    },
    setMapBounds,
  };

  // Build state object
  const state: PrayerMapState = {
    selectedPrayer,
    showRequestModal,
    showInbox,
    showInfo,
    connections,
    hoveredConnection,
    animatingPrayer,
    creatingPrayerAnimation,
    showNotification,
    notificationMessage,
    prevUnreadCount,
    mapLoaded,
    mapBounds,
  };

  return { state, actions };
}

/**
 * Hook to manage notification state when unread count changes
 */
export function useInboxNotifications(
  totalUnread: number,
  prevUnreadCount: number,
  inbox: any[],
  onShowNotification: (message: string) => void,
  onUpdatePrevCount: (count: number) => void
) {
  useEffect(() => {
    if (totalUnread > prevUnreadCount && prevUnreadCount > 0) {
      // New message(s) arrived!
      const newMessageCount = totalUnread - prevUnreadCount;
      const latestResponse = inbox[0]?.responses[0]; // Most recent response

      let message = `You have ${newMessageCount} new prayer response${newMessageCount > 1 ? 's' : ''}`;
      if (latestResponse && !latestResponse.is_anonymous && latestResponse.responder_name) {
        message = `${latestResponse.responder_name} responded to your prayer`;
      }

      onShowNotification(message);
    }
    onUpdatePrevCount(totalUnread);
  }, [totalUnread, prevUnreadCount, inbox, onShowNotification, onUpdatePrevCount]);
}
