/**
 * PrayerMap Component Tests
 *
 * Tests for the refactored PrayerMap component (553 → 262 lines)
 * Covers:
 * - Component rendering
 * - Data fetching (prayers, connections, inbox)
 * - State management (modals, animations, notifications)
 * - User interactions (prayer submission, creation)
 * - MapBox GL integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PrayerMap } from '../PrayerMap';
import type { Prayer, PrayerConnection } from '../../types/prayer';

// Mock MapBox GL
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn((event: string, callback: Function) => {
        if (event === 'load') {
          // Simulate map load event
          setTimeout(() => callback(), 0);
        }
        return undefined;
      }),
      off: vi.fn(),
      remove: vi.fn(),
      getCenter: vi.fn(() => ({ lng: 0, lat: 0 })),
      getBounds: vi.fn(() => ({
        contains: vi.fn(() => true),
        getSouthWest: vi.fn(() => ({ lng: -1, lat: -1 })),
        getNorthEast: vi.fn(() => ({ lng: 1, lat: 1 })),
        toArray: vi.fn(() => [[-1, -1], [1, 1]]),
      })),
      project: vi.fn(() => ({ x: 0, y: 0 })),
      flyTo: vi.fn(),
      easeTo: vi.fn(),
      setCenter: vi.fn(),
      getZoom: vi.fn(() => 10),
      setPaintProperty: vi.fn(),
      getLayer: vi.fn((layerId: string) => {
        // Return mock layer for customization
        return { id: layerId };
      }),
    })),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      getElement: vi.fn(() => document.createElement('div')),
    })),
    accessToken: '',
  },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock extracted map components
vi.mock('../map/MapContainer', () => ({
  MapContainer: ({ children, onMapLoad, onMapLoaded }: any) => {
    // Simulate map load
    if (onMapLoaded) {
      setTimeout(() => onMapLoaded(), 0);
    }
    return <div data-testid="map-container">{children}</div>;
  },
}));

vi.mock('../map/PrayerMarkers', () => ({
  PrayerMarkers: ({ prayers, onMarkerClick }: any) => (
    <div data-testid="prayer-markers">
      {prayers.map((prayer: Prayer) => (
        <button
          key={prayer.id}
          data-testid={`marker-${prayer.id}`}
          onClick={() => onMarkerClick(prayer)}
        >
          {prayer.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../map/ConnectionLines', () => ({
  ConnectionLines: ({ connections }: any) => (
    <div data-testid="connection-lines">
      {connections.length} connections
    </div>
  ),
}));

vi.mock('../map/MapUI', () => ({
  MapUI: ({ onOpenInbox, onOpenSettings, onOpenRequestModal, onOpenInfo, totalUnread }: any) => (
    <div data-testid="map-ui">
      <button onClick={onOpenInbox}>Inbox ({totalUnread})</button>
      <button onClick={onOpenSettings}>Settings</button>
      <button onClick={onOpenRequestModal}>Request Prayer</button>
      <button onClick={onOpenInfo}>Info</button>
    </div>
  ),
}));

vi.mock('../map/MapModals', () => ({
  MapModals: ({
    selectedPrayer,
    onClosePrayerDetail,
    onPray,
    showInbox,
    onCloseInbox,
    showRequestModal,
    onCloseRequestModal,
    onSubmitPrayer,
    showInfo,
    onCloseInfo,
  }: any) => (
    <div data-testid="map-modals">
      {selectedPrayer && (
        <div data-testid="prayer-detail-modal">
          <h3>{selectedPrayer.title}</h3>
          <button onClick={onClosePrayerDetail}>Close</button>
          <button onClick={() => onPray(selectedPrayer)}>Pray</button>
        </div>
      )}
      {showInbox && (
        <div data-testid="inbox-modal">
          <button onClick={onCloseInbox}>Close Inbox</button>
        </div>
      )}
      {showRequestModal && (
        <div data-testid="request-modal">
          <button onClick={onCloseRequestModal}>Close Request</button>
          <button
            onClick={() =>
              onSubmitPrayer({
                title: 'New Prayer',
                description: 'Test prayer',
                location: { lat: 0, lng: 0 },
                user_name: 'Test User',
                content_type: 'text',
                is_anonymous: false,
              })
            }
          >
            Submit Prayer
          </button>
        </div>
      )}
      {showInfo && (
        <div data-testid="info-modal">
          <button onClick={onCloseInfo}>Close Info</button>
        </div>
      )}
    </div>
  ),
}));

vi.mock('../PrayerAnimationLayer', () => ({
  PrayerAnimationLayer: ({ prayer, onComplete }: any) => {
    // Simulate animation completion after a short delay
    setTimeout(() => onComplete(), 100);
    return <div data-testid="prayer-animation">{prayer.title}</div>;
  },
}));

vi.mock('../PrayerCreationAnimation', () => ({
  PrayerCreationAnimation: ({ onComplete }: any) => {
    setTimeout(() => onComplete(), 100);
    return <div data-testid="creation-animation">Creating...</div>;
  },
}));

vi.mock('../InAppNotification', () => ({
  InAppNotification: ({ message, show, onClose, onClick }: any) =>
    show ? (
      <div data-testid="notification" onClick={onClick}>
        {message}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock hooks
const mockUsePrayers = vi.fn();
const mockUseAuth = vi.fn();
const mockUseInbox = vi.fn();
const mockUsePrayerMapState = vi.fn();
const mockFetchAllConnections = vi.fn();
const mockSubscribeToAllConnections = vi.fn();

vi.mock('../../hooks/usePrayers', () => ({
  usePrayers: () => mockUsePrayers(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../hooks/useInbox', () => ({
  useInbox: () => mockUseInbox(),
}));

vi.mock('../../hooks/usePrayerMapState', () => ({
  usePrayerMapState: () => mockUsePrayerMapState(),
  useInboxNotifications: vi.fn(),
}));

vi.mock('../../services/prayerService', () => ({
  fetchAllConnections: () => mockFetchAllConnections(),
  subscribeToAllConnections: (callback: Function) => mockSubscribeToAllConnections(callback),
  respondToPrayer: vi.fn(),
}));

vi.mock('../../services/storageService', () => ({
  uploadAudio: vi.fn().mockResolvedValue('https://example.com/audio.mp3'),
}));

vi.mock('../../utils/viewportCulling', () => ({
  getVisibleConnections: vi.fn((connections: any[]) => connections),
  extendBounds: vi.fn((bounds: any) => bounds),
}));

vi.mock('../../utils/debounce', () => ({
  debounce: (fn: Function) => fn,
}));

describe('PrayerMap', () => {
  const mockUserLocation = { lat: 40.7128, lng: -74.006 };
  const mockOnOpenSettings = vi.fn();

  const mockPrayer: Prayer = {
    id: 'prayer-1',
    title: 'Test Prayer',
    description: 'Please pray for me',
    location: { lat: 40.7128, lng: -74.006 },
    user_id: 'user-1',
    user_name: 'Test User',
    content_type: 'text',
    is_anonymous: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    prayedBy: [],
  };

  const mockConnection: PrayerConnection = {
    id: 'conn-1',
    prayerId: 'prayer-1',
    fromLocation: { lat: 40.7128, lng: -74.006 },
    toLocation: { lat: 34.0522, lng: -118.2437 },
    requesterName: 'Requester',
    replierName: 'Replier',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    user_metadata: { name: 'Test User' },
  };

  // Default mock implementations
  const defaultPrayersHook = {
    prayers: [mockPrayer],
    createPrayer: vi.fn().mockResolvedValue(mockPrayer),
    respondToPrayer: vi.fn(),
    isLoading: false,
    error: null,
  };

  const defaultAuthHook = {
    user: mockUser,
    loading: false,
  };

  const defaultInboxHook = {
    inbox: [],
    totalUnread: 0,
    isLoading: false,
  };

  const defaultStateHook = {
    state: {
      selectedPrayer: null,
      showRequestModal: false,
      showInbox: false,
      showInfo: false,
      connections: [],
      hoveredConnection: null,
      animatingPrayer: null,
      creatingPrayerAnimation: null,
      showNotification: false,
      notificationMessage: '',
      prevUnreadCount: 0,
      mapLoaded: false,
      mapBounds: null,
    },
    actions: {
      openPrayerDetail: vi.fn(),
      closePrayerDetail: vi.fn(),
      openRequestModal: vi.fn(),
      closeRequestModal: vi.fn(),
      openInbox: vi.fn(),
      closeInbox: vi.fn(),
      openInfo: vi.fn(),
      closeInfo: vi.fn(),
      setConnections: vi.fn(),
      setHoveredConnection: vi.fn(),
      startPrayerAnimation: vi.fn(),
      stopPrayerAnimation: vi.fn(),
      startCreationAnimation: vi.fn(),
      stopCreationAnimation: vi.fn(),
      showNotificationMessage: vi.fn(),
      hideNotification: vi.fn(),
      setPrevUnreadCount: vi.fn(),
      setMapLoaded: vi.fn(),
      setMapBounds: vi.fn(),
    },
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set default mock implementations
    mockUsePrayers.mockReturnValue(defaultPrayersHook);
    mockUseAuth.mockReturnValue(defaultAuthHook);
    mockUseInbox.mockReturnValue(defaultInboxHook);
    mockUsePrayerMapState.mockReturnValue(defaultStateHook);
    mockFetchAllConnections.mockResolvedValue([mockConnection]);
    mockSubscribeToAllConnections.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the map container', () => {
      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('should render prayer markers', () => {
      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('prayer-markers')).toBeInTheDocument();
      expect(screen.getByTestId('marker-prayer-1')).toBeInTheDocument();
    });

    it('should render connection lines', () => {
      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('connection-lines')).toBeInTheDocument();
    });

    it('should render map UI', () => {
      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('map-ui')).toBeInTheDocument();
    });

    it('should render map modals', () => {
      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('map-modals')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should call usePrayers hook', () => {
      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(mockUsePrayers).toHaveBeenCalled();
    });

    it('should call useInbox when user is logged in', () => {
      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(mockUseInbox).toHaveBeenCalled();
    });

    it('should call useInbox when user is not logged in', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(mockUseInbox).toHaveBeenCalled();
    });

    it('should fetch all connections on mount', async () => {
      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      await waitFor(() => {
        expect(mockFetchAllConnections).toHaveBeenCalled();
      });
    });

    it('should subscribe to connection updates', async () => {
      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      await waitFor(() => {
        expect(mockSubscribeToAllConnections).toHaveBeenCalled();
      });
    });
  });

  describe('Prayer Markers Interaction', () => {
    it('should open prayer detail when marker is clicked', async () => {
      const stateHook = {
        ...defaultStateHook,
        actions: {
          ...defaultStateHook.actions,
          openPrayerDetail: vi.fn(),
        },
      };
      mockUsePrayerMapState.mockReturnValue(stateHook);

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);

      const marker = screen.getByTestId('marker-prayer-1');
      marker.click();

      await waitFor(() => {
        expect(stateHook.actions.openPrayerDetail).toHaveBeenCalledWith(mockPrayer);
      });
    });
  });

  describe('Modals', () => {
    it('should show prayer detail modal when prayer is selected', () => {
      const stateHook = {
        ...defaultStateHook,
        state: {
          ...defaultStateHook.state,
          selectedPrayer: mockPrayer,
        },
      };
      mockUsePrayerMapState.mockReturnValue(stateHook);

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      const modal = screen.getByTestId('prayer-detail-modal');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveTextContent('Test Prayer');
    });

    it('should show inbox modal when inbox is opened', () => {
      const stateHook = {
        ...defaultStateHook,
        state: {
          ...defaultStateHook.state,
          showInbox: true,
        },
      };
      mockUsePrayerMapState.mockReturnValue(stateHook);

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('inbox-modal')).toBeInTheDocument();
    });

    it('should show request modal when request prayer is opened', () => {
      const stateHook = {
        ...defaultStateHook,
        state: {
          ...defaultStateHook.state,
          showRequestModal: true,
        },
      };
      mockUsePrayerMapState.mockReturnValue(stateHook);

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('request-modal')).toBeInTheDocument();
    });

    it('should show info modal when info is opened', () => {
      const stateHook = {
        ...defaultStateHook,
        state: {
          ...defaultStateHook.state,
          showInfo: true,
        },
      };
      mockUsePrayerMapState.mockReturnValue(stateHook);

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('info-modal')).toBeInTheDocument();
    });
  });

  describe('Notifications', () => {
    it('should show notification when notification state is active', () => {
      const stateHook = {
        ...defaultStateHook,
        state: {
          ...defaultStateHook.state,
          showNotification: true,
          notificationMessage: 'New prayer response!',
        },
      };
      mockUsePrayerMapState.mockReturnValue(stateHook);

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('notification')).toBeInTheDocument();
      expect(screen.getByText('New prayer response!')).toBeInTheDocument();
    });

    it('should display unread count in inbox button', () => {
      mockUseInbox.mockReturnValue({
        ...defaultInboxHook,
        totalUnread: 3,
      });

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByText(/Inbox \(3\)/)).toBeInTheDocument();
    });
  });

  describe('Animations', () => {
    it('should render prayer animation when animating', () => {
      const stateHook = {
        ...defaultStateHook,
        state: {
          ...defaultStateHook.state,
          animatingPrayer: {
            prayer: mockPrayer,
            userLocation: mockUserLocation,
          },
        },
      };
      mockUsePrayerMapState.mockReturnValue(stateHook);

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('prayer-animation')).toBeInTheDocument();
    });

    it('should render creation animation when creating prayer', () => {
      const stateHook = {
        ...defaultStateHook,
        state: {
          ...defaultStateHook.state,
          creatingPrayerAnimation: {
            targetLocation: mockUserLocation,
          },
        },
      };
      mockUsePrayerMapState.mockReturnValue(stateHook);

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('creation-animation')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user gracefully', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });

      expect(() => {
        render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      }).not.toThrow();
    });

    it('should handle empty prayers array', () => {
      mockUsePrayers.mockReturnValue({
        ...defaultPrayersHook,
        prayers: [],
      });

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);
      expect(screen.getByTestId('prayer-markers')).toBeInTheDocument();
    });

    it('should load connections successfully', async () => {
      mockFetchAllConnections.mockResolvedValue([mockConnection]);

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);

      // Wait for connections to be fetched
      await waitFor(() => {
        expect(mockFetchAllConnections).toHaveBeenCalled();
      });

      // Component should render without errors
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.getByTestId('connection-lines')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete prayer response flow', async () => {
      const stateHook = {
        ...defaultStateHook,
        state: {
          ...defaultStateHook.state,
          selectedPrayer: mockPrayer,
        },
        actions: {
          ...defaultStateHook.actions,
          closePrayerDetail: vi.fn(),
          startPrayerAnimation: vi.fn(),
        },
      };
      mockUsePrayerMapState.mockReturnValue(stateHook);

      const respondToPrayer = vi.fn();
      mockUsePrayers.mockReturnValue({
        ...defaultPrayersHook,
        respondToPrayer,
      });

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);

      const prayButton = screen.getByText('Pray');
      prayButton.click();

      await waitFor(() => {
        expect(stateHook.actions.closePrayerDetail).toHaveBeenCalled();
        expect(stateHook.actions.startPrayerAnimation).toHaveBeenCalledWith(
          mockPrayer,
          mockUserLocation
        );
      });
    });

    it('should handle prayer creation flow', async () => {
      const stateHook = {
        ...defaultStateHook,
        state: {
          ...defaultStateHook.state,
          showRequestModal: true,
        },
        actions: {
          ...defaultStateHook.actions,
          closeRequestModal: vi.fn(),
          startCreationAnimation: vi.fn(),
        },
      };
      mockUsePrayerMapState.mockReturnValue(stateHook);

      const createPrayer = vi.fn().mockResolvedValue(mockPrayer);
      mockUsePrayers.mockReturnValue({
        ...defaultPrayersHook,
        createPrayer,
      });

      render(<PrayerMap userLocation={mockUserLocation} onOpenSettings={mockOnOpenSettings} />);

      const submitButton = screen.getByText('Submit Prayer');
      submitButton.click();

      await waitFor(() => {
        expect(stateHook.actions.closeRequestModal).toHaveBeenCalled();
        expect(stateHook.actions.startCreationAnimation).toHaveBeenCalled();
        expect(createPrayer).toHaveBeenCalled();
      });
    });
  });
});
