import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { usePrayerMapState, useInboxNotifications } from '../usePrayerMapState';
import type { Prayer, PrayerConnection } from '../../types/prayer';

// Mock prayer data
const mockPrayer: Prayer = {
  id: 'prayer-1',
  user_id: 'user-1',
  title: 'Test Prayer',
  content: 'Please pray for me',
  content_type: 'text',
  location: { lat: 40.7128, lng: -74.006 },
  user_name: 'Test User',
  is_anonymous: false,
  status: 'active',
  created_at: new Date(),
  prayedBy: [],
};

const mockPrayer2: Prayer = {
  id: 'prayer-2',
  user_id: 'user-2',
  title: 'Another Prayer',
  content: 'Prayer request',
  content_type: 'text',
  location: { lat: 34.0522, lng: -118.2437 },
  user_name: 'User Two',
  is_anonymous: false,
  status: 'active',
  created_at: new Date(),
  prayedBy: [],
};

const mockConnection: PrayerConnection = {
  id: 'connection-1',
  prayer_id: 'prayer-1',
  responder_id: 'user-2',
  start_location: { lat: 40.7128, lng: -74.006 },
  end_location: { lat: 34.0522, lng: -118.2437 },
  created_at: new Date(),
};

describe('usePrayerMapState', () => {
  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePrayerMapState());

      expect(result.current.state.selectedPrayer).toBeNull();
      expect(result.current.state.showRequestModal).toBe(false);
      expect(result.current.state.showInbox).toBe(false);
      expect(result.current.state.showInfo).toBe(false);
      expect(result.current.state.connections).toEqual([]);
      expect(result.current.state.hoveredConnection).toBeNull();
      expect(result.current.state.animatingPrayer).toBeNull();
      expect(result.current.state.creatingPrayerAnimation).toBeNull();
      expect(result.current.state.showNotification).toBe(false);
      expect(result.current.state.notificationMessage).toBe('');
      expect(result.current.state.prevUnreadCount).toBe(0);
      expect(result.current.state.mapLoaded).toBe(false);
      expect(result.current.state.mapBounds).toBeNull();
    });

    it('should provide actions object', () => {
      const { result } = renderHook(() => usePrayerMapState());

      expect(result.current.actions).toBeDefined();
      expect(typeof result.current.actions.openPrayerDetail).toBe('function');
      expect(typeof result.current.actions.closePrayerDetail).toBe('function');
      expect(typeof result.current.actions.openRequestModal).toBe('function');
      expect(typeof result.current.actions.closeRequestModal).toBe('function');
      expect(typeof result.current.actions.openInbox).toBe('function');
      expect(typeof result.current.actions.closeInbox).toBe('function');
      expect(typeof result.current.actions.openInfo).toBe('function');
      expect(typeof result.current.actions.closeInfo).toBe('function');
      expect(typeof result.current.actions.setConnections).toBe('function');
      expect(typeof result.current.actions.setHoveredConnection).toBe('function');
      expect(typeof result.current.actions.startPrayerAnimation).toBe('function');
      expect(typeof result.current.actions.stopPrayerAnimation).toBe('function');
      expect(typeof result.current.actions.startCreationAnimation).toBe('function');
      expect(typeof result.current.actions.stopCreationAnimation).toBe('function');
      expect(typeof result.current.actions.showNotificationMessage).toBe('function');
      expect(typeof result.current.actions.hideNotification).toBe('function');
      expect(typeof result.current.actions.setPrevUnreadCount).toBe('function');
      expect(typeof result.current.actions.setMapLoaded).toBe('function');
      expect(typeof result.current.actions.setMapBounds).toBe('function');
    });
  });

  describe('modal actions', () => {
    it('should open prayer detail modal', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.openPrayerDetail(mockPrayer);
      });

      expect(result.current.state.selectedPrayer).toEqual(mockPrayer);
    });

    it('should close prayer detail modal', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.openPrayerDetail(mockPrayer);
      });

      expect(result.current.state.selectedPrayer).toEqual(mockPrayer);

      act(() => {
        result.current.actions.closePrayerDetail();
      });

      expect(result.current.state.selectedPrayer).toBeNull();
    });

    it('should open request modal', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.openRequestModal();
      });

      expect(result.current.state.showRequestModal).toBe(true);
    });

    it('should close request modal', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.openRequestModal();
      });

      expect(result.current.state.showRequestModal).toBe(true);

      act(() => {
        result.current.actions.closeRequestModal();
      });

      expect(result.current.state.showRequestModal).toBe(false);
    });

    it('should open inbox', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.openInbox();
      });

      expect(result.current.state.showInbox).toBe(true);
    });

    it('should close inbox', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.openInbox();
      });

      expect(result.current.state.showInbox).toBe(true);

      act(() => {
        result.current.actions.closeInbox();
      });

      expect(result.current.state.showInbox).toBe(false);
    });

    it('should open info modal', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.openInfo();
      });

      expect(result.current.state.showInfo).toBe(true);
    });

    it('should close info modal', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.openInfo();
      });

      expect(result.current.state.showInfo).toBe(true);

      act(() => {
        result.current.actions.closeInfo();
      });

      expect(result.current.state.showInfo).toBe(false);
    });
  });

  describe('connection actions', () => {
    it('should set connections', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.setConnections([mockConnection]);
      });

      expect(result.current.state.connections).toEqual([mockConnection]);
    });

    it('should update connections using function updater', () => {
      const { result } = renderHook(() => usePrayerMapState());

      const mockConnection2: PrayerConnection = {
        ...mockConnection,
        id: 'connection-2',
      };

      act(() => {
        result.current.actions.setConnections([mockConnection]);
      });

      act(() => {
        result.current.actions.setConnections((prev) => [...prev, mockConnection2]);
      });

      expect(result.current.state.connections).toEqual([mockConnection, mockConnection2]);
    });

    it('should set hovered connection', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.setHoveredConnection('connection-1');
      });

      expect(result.current.state.hoveredConnection).toBe('connection-1');
    });

    it('should clear hovered connection', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.setHoveredConnection('connection-1');
      });

      expect(result.current.state.hoveredConnection).toBe('connection-1');

      act(() => {
        result.current.actions.setHoveredConnection(null);
      });

      expect(result.current.state.hoveredConnection).toBeNull();
    });
  });

  describe('animation actions', () => {
    it('should start prayer animation', () => {
      const { result } = renderHook(() => usePrayerMapState());

      const userLocation = { lat: 34.0522, lng: -118.2437 };

      act(() => {
        result.current.actions.startPrayerAnimation(mockPrayer, userLocation);
      });

      expect(result.current.state.animatingPrayer).toEqual({
        prayer: mockPrayer,
        userLocation,
      });
    });

    it('should stop prayer animation', () => {
      const { result } = renderHook(() => usePrayerMapState());

      const userLocation = { lat: 34.0522, lng: -118.2437 };

      act(() => {
        result.current.actions.startPrayerAnimation(mockPrayer, userLocation);
      });

      expect(result.current.state.animatingPrayer).toBeTruthy();

      act(() => {
        result.current.actions.stopPrayerAnimation();
      });

      expect(result.current.state.animatingPrayer).toBeNull();
    });

    it('should start creation animation', () => {
      const { result } = renderHook(() => usePrayerMapState());

      const targetLocation = { lat: 40.7128, lng: -74.006 };

      act(() => {
        result.current.actions.startCreationAnimation(targetLocation);
      });

      expect(result.current.state.creatingPrayerAnimation).toEqual({
        targetLocation,
      });
    });

    it('should stop creation animation', () => {
      const { result } = renderHook(() => usePrayerMapState());

      const targetLocation = { lat: 40.7128, lng: -74.006 };

      act(() => {
        result.current.actions.startCreationAnimation(targetLocation);
      });

      expect(result.current.state.creatingPrayerAnimation).toBeTruthy();

      act(() => {
        result.current.actions.stopCreationAnimation();
      });

      expect(result.current.state.creatingPrayerAnimation).toBeNull();
    });
  });

  describe('notification actions', () => {
    it('should show notification message', () => {
      const { result } = renderHook(() => usePrayerMapState());

      const message = 'Test notification message';

      act(() => {
        result.current.actions.showNotificationMessage(message);
      });

      expect(result.current.state.showNotification).toBe(true);
      expect(result.current.state.notificationMessage).toBe(message);
    });

    it('should hide notification', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.showNotificationMessage('Test message');
      });

      expect(result.current.state.showNotification).toBe(true);

      act(() => {
        result.current.actions.hideNotification();
      });

      expect(result.current.state.showNotification).toBe(false);
    });

    it('should preserve message when hiding notification', () => {
      const { result } = renderHook(() => usePrayerMapState());

      const message = 'Test message';

      act(() => {
        result.current.actions.showNotificationMessage(message);
      });

      act(() => {
        result.current.actions.hideNotification();
      });

      expect(result.current.state.notificationMessage).toBe(message);
      expect(result.current.state.showNotification).toBe(false);
    });

    it('should set previous unread count', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.setPrevUnreadCount(5);
      });

      expect(result.current.state.prevUnreadCount).toBe(5);
    });

    it('should update previous unread count multiple times', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.setPrevUnreadCount(5);
      });

      expect(result.current.state.prevUnreadCount).toBe(5);

      act(() => {
        result.current.actions.setPrevUnreadCount(10);
      });

      expect(result.current.state.prevUnreadCount).toBe(10);
    });
  });

  describe('map actions', () => {
    it('should set map loaded state', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.setMapLoaded(true);
      });

      expect(result.current.state.mapLoaded).toBe(true);
    });

    it('should toggle map loaded state', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.setMapLoaded(true);
      });

      expect(result.current.state.mapLoaded).toBe(true);

      act(() => {
        result.current.actions.setMapLoaded(false);
      });

      expect(result.current.state.mapLoaded).toBe(false);
    });

    it('should set map bounds', () => {
      const { result } = renderHook(() => usePrayerMapState());

      // Mock LngLatBounds object
      const mockBounds = {
        _sw: { lng: -74.006, lat: 40.7128 },
        _ne: { lng: -73.935, lat: 40.7829 },
        getNorthEast: () => ({ lng: -73.935, lat: 40.7829 }),
        getSouthWest: () => ({ lng: -74.006, lat: 40.7128 }),
        getNorthWest: () => ({ lng: -74.006, lat: 40.7829 }),
        getSouthEast: () => ({ lng: -73.935, lat: 40.7128 }),
        getCenter: () => ({ lng: -73.9705, lat: 40.74785 }),
        toArray: () => [
          [-74.006, 40.7128],
          [-73.935, 40.7829],
        ],
      } as any;

      act(() => {
        result.current.actions.setMapBounds(mockBounds);
      });

      expect(result.current.state.mapBounds).toEqual(mockBounds);
    });

    it('should clear map bounds', () => {
      const { result } = renderHook(() => usePrayerMapState());

      const mockBounds = {
        _sw: { lng: -74.006, lat: 40.7128 },
        _ne: { lng: -73.935, lat: 40.7829 },
      } as any;

      act(() => {
        result.current.actions.setMapBounds(mockBounds);
      });

      expect(result.current.state.mapBounds).toBeTruthy();

      act(() => {
        result.current.actions.setMapBounds(null);
      });

      expect(result.current.state.mapBounds).toBeNull();
    });
  });

  describe('state persistence', () => {
    it('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.openPrayerDetail(mockPrayer);
        result.current.actions.setConnections([mockConnection]);
        result.current.actions.showNotificationMessage('Test');
      });

      rerender();

      expect(result.current.state.selectedPrayer).toEqual(mockPrayer);
      expect(result.current.state.connections).toEqual([mockConnection]);
      expect(result.current.state.notificationMessage).toBe('Test');
    });

    it('should allow multiple modals to be open simultaneously', () => {
      const { result } = renderHook(() => usePrayerMapState());

      act(() => {
        result.current.actions.openRequestModal();
        result.current.actions.openInbox();
        result.current.actions.openInfo();
      });

      expect(result.current.state.showRequestModal).toBe(true);
      expect(result.current.state.showInbox).toBe(true);
      expect(result.current.state.showInfo).toBe(true);
    });

    it('should handle concurrent animations', () => {
      const { result } = renderHook(() => usePrayerMapState());

      const userLocation = { lat: 34.0522, lng: -118.2437 };
      const targetLocation = { lat: 40.7128, lng: -74.006 };

      act(() => {
        result.current.actions.startPrayerAnimation(mockPrayer, userLocation);
        result.current.actions.startCreationAnimation(targetLocation);
      });

      expect(result.current.state.animatingPrayer).toBeTruthy();
      expect(result.current.state.creatingPrayerAnimation).toBeTruthy();
    });
  });
});

describe('useInboxNotifications', () => {
  beforeEach(() => {
    // Clear any mocks
  });

  it('should not show notification on initial mount', () => {
    const mockOnShowNotification = vi.fn();
    const mockOnUpdatePrevCount = vi.fn();

    renderHook(() =>
      useInboxNotifications(5, 0, [], mockOnShowNotification, mockOnUpdatePrevCount)
    );

    expect(mockOnShowNotification).not.toHaveBeenCalled();
    expect(mockOnUpdatePrevCount).toHaveBeenCalledWith(5);
  });

  it('should show notification when unread count increases', () => {
    const mockOnShowNotification = vi.fn();
    const mockOnUpdatePrevCount = vi.fn();

    const { rerender } = renderHook(
      ({ totalUnread, prevUnreadCount, inbox }) =>
        useInboxNotifications(
          totalUnread,
          prevUnreadCount,
          inbox,
          mockOnShowNotification,
          mockOnUpdatePrevCount
        ),
      {
        initialProps: {
          totalUnread: 5,
          prevUnreadCount: 5,
          inbox: [],
        },
      }
    );

    expect(mockOnShowNotification).not.toHaveBeenCalled();

    // Simulate new message
    rerender({
      totalUnread: 6,
      prevUnreadCount: 5,
      inbox: [],
    });

    expect(mockOnShowNotification).toHaveBeenCalledWith(
      'You have 1 new prayer response'
    );
  });

  it('should show plural notification for multiple new messages', () => {
    const mockOnShowNotification = vi.fn();
    const mockOnUpdatePrevCount = vi.fn();

    const { rerender } = renderHook(
      ({ totalUnread, prevUnreadCount, inbox }) =>
        useInboxNotifications(
          totalUnread,
          prevUnreadCount,
          inbox,
          mockOnShowNotification,
          mockOnUpdatePrevCount
        ),
      {
        initialProps: {
          totalUnread: 5,
          prevUnreadCount: 5,
          inbox: [],
        },
      }
    );

    rerender({
      totalUnread: 8,
      prevUnreadCount: 5,
      inbox: [],
    });

    expect(mockOnShowNotification).toHaveBeenCalledWith(
      'You have 3 new prayer responses'
    );
  });

  it('should show personalized notification with responder name', () => {
    const mockOnShowNotification = vi.fn();
    const mockOnUpdatePrevCount = vi.fn();

    const inboxWithResponse = [
      {
        prayer_id: 'prayer-1',
        responses: [
          {
            id: 'response-1',
            responder_id: 'user-2',
            responder_name: 'John Doe',
            is_anonymous: false,
            content: 'Praying for you',
            created_at: new Date(),
          },
        ],
      },
    ];

    const { rerender } = renderHook(
      ({ totalUnread, prevUnreadCount, inbox }) =>
        useInboxNotifications(
          totalUnread,
          prevUnreadCount,
          inbox,
          mockOnShowNotification,
          mockOnUpdatePrevCount
        ),
      {
        initialProps: {
          totalUnread: 5,
          prevUnreadCount: 5,
          inbox: [],
        },
      }
    );

    rerender({
      totalUnread: 6,
      prevUnreadCount: 5,
      inbox: inboxWithResponse,
    });

    expect(mockOnShowNotification).toHaveBeenCalledWith(
      'John Doe responded to your prayer'
    );
  });

  it('should not show personalized notification for anonymous responses', () => {
    const mockOnShowNotification = vi.fn();
    const mockOnUpdatePrevCount = vi.fn();

    const inboxWithAnonymousResponse = [
      {
        prayer_id: 'prayer-1',
        responses: [
          {
            id: 'response-1',
            responder_id: 'user-2',
            responder_name: null,
            is_anonymous: true,
            content: 'Praying for you',
            created_at: new Date(),
          },
        ],
      },
    ];

    const { rerender } = renderHook(
      ({ totalUnread, prevUnreadCount, inbox }) =>
        useInboxNotifications(
          totalUnread,
          prevUnreadCount,
          inbox,
          mockOnShowNotification,
          mockOnUpdatePrevCount
        ),
      {
        initialProps: {
          totalUnread: 5,
          prevUnreadCount: 5,
          inbox: [],
        },
      }
    );

    rerender({
      totalUnread: 6,
      prevUnreadCount: 5,
      inbox: inboxWithAnonymousResponse,
    });

    expect(mockOnShowNotification).toHaveBeenCalledWith(
      'You have 1 new prayer response'
    );
  });

  it('should not show notification if prevUnreadCount is 0', () => {
    const mockOnShowNotification = vi.fn();
    const mockOnUpdatePrevCount = vi.fn();

    const { rerender } = renderHook(
      ({ totalUnread, prevUnreadCount, inbox }) =>
        useInboxNotifications(
          totalUnread,
          prevUnreadCount,
          inbox,
          mockOnShowNotification,
          mockOnUpdatePrevCount
        ),
      {
        initialProps: {
          totalUnread: 0,
          prevUnreadCount: 0,
          inbox: [],
        },
      }
    );

    rerender({
      totalUnread: 3,
      prevUnreadCount: 0,
      inbox: [],
    });

    // Should not show notification on first load
    expect(mockOnShowNotification).not.toHaveBeenCalled();
  });

  it('should update previous count on every render', () => {
    const mockOnShowNotification = vi.fn();
    const mockOnUpdatePrevCount = vi.fn();

    const { rerender } = renderHook(
      ({ totalUnread, prevUnreadCount, inbox }) =>
        useInboxNotifications(
          totalUnread,
          prevUnreadCount,
          inbox,
          mockOnShowNotification,
          mockOnUpdatePrevCount
        ),
      {
        initialProps: {
          totalUnread: 5,
          prevUnreadCount: 5,
          inbox: [],
        },
      }
    );

    expect(mockOnUpdatePrevCount).toHaveBeenCalledWith(5);

    rerender({
      totalUnread: 6,
      prevUnreadCount: 5,
      inbox: [],
    });

    expect(mockOnUpdatePrevCount).toHaveBeenCalledWith(6);
  });
});
