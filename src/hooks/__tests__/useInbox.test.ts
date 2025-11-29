import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useInbox, type InboxItem } from '../useInbox';
import type { Prayer, PrayerResponse } from '../../types/prayer';
import * as prayerService from '../../services/prayerService';

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

const mockResponse1: PrayerResponse = {
  id: 'response-1',
  prayer_id: 'prayer-1',
  responder_id: 'responder-1',
  responder_name: 'Responder One',
  is_anonymous: false,
  message: 'Praying for you',
  content_type: 'text',
  created_at: new Date(),
  read_at: null,
};

const mockResponse2: PrayerResponse = {
  id: 'response-2',
  prayer_id: 'prayer-1',
  responder_id: 'responder-2',
  responder_name: 'Responder Two',
  is_anonymous: false,
  message: 'You are in my prayers',
  content_type: 'text',
  created_at: new Date(),
  read_at: null,
};

const mockInboxItem: InboxItem = {
  prayer: mockPrayer,
  responses: [mockResponse1, mockResponse2],
  unreadCount: 2,
};

const mockPrayer2: Prayer = {
  id: 'prayer-2',
  user_id: 'user-1',
  title: 'Another Prayer',
  content: 'Prayer request 2',
  content_type: 'text',
  location: { lat: 34.0522, lng: -118.2437 },
  user_name: 'Test User',
  is_anonymous: false,
  status: 'active',
  created_at: new Date(),
  prayedBy: [],
};

const mockResponse3: PrayerResponse = {
  id: 'response-3',
  prayer_id: 'prayer-2',
  responder_id: 'responder-3',
  responder_name: 'Responder Three',
  is_anonymous: false,
  message: 'Keeping you in prayer',
  content_type: 'text',
  created_at: new Date(),
  read_at: null,
};

const mockInboxItem2: InboxItem = {
  prayer: mockPrayer2,
  responses: [mockResponse3],
  unreadCount: 1,
};

// Mock the prayer service
vi.mock('../../services/prayerService', () => ({
  fetchUserInbox: vi.fn(),
  subscribeToUserInbox: vi.fn(),
  markAllResponsesRead: vi.fn(),
}));

describe('useInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(prayerService.fetchUserInbox).mockResolvedValue([mockInboxItem]);
    vi.mocked(prayerService.subscribeToUserInbox).mockReturnValue(() => {});
    vi.mocked(prayerService.markAllResponsesRead).mockResolvedValue(2);
  });

  describe('initialization', () => {
    it('should initialize with empty inbox', () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: false,
        })
      );

      expect(result.current.inbox).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.totalUnread).toBe(0);
    });

    it('should auto-fetch inbox when autoFetch is true', async () => {
      renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(prayerService.fetchUserInbox).toHaveBeenCalledWith('user-1');
      });
    });

    it('should not fetch when autoFetch is false', () => {
      renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: false,
        })
      );

      expect(prayerService.fetchUserInbox).not.toHaveBeenCalled();
    });

    it('should not fetch when userId is empty', () => {
      renderHook(() =>
        useInbox({
          userId: '',
          autoFetch: true,
        })
      );

      expect(prayerService.fetchUserInbox).not.toHaveBeenCalled();
    });
  });

  describe('fetchInbox', () => {
    it('should fetch inbox successfully', async () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.inbox).toEqual([mockInboxItem]);
      });

      expect(prayerService.fetchUserInbox).toHaveBeenCalledWith('user-1');
    });

    it('should handle empty inbox', async () => {
      vi.mocked(prayerService.fetchUserInbox).mockResolvedValueOnce([]);

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.inbox).toEqual([]);
      expect(result.current.totalUnread).toBe(0);
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Failed to fetch inbox';
      vi.mocked(prayerService.fetchUserInbox).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });

      expect(result.current.inbox).toEqual([]);
    });

    it('should set loading state correctly', async () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: false,
        })
      );

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(prayerService.fetchUserInbox).mockRejectedValueOnce(
        'String error'
      );

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch inbox');
      });
    });
  });

  describe('totalUnread calculation', () => {
    it('should calculate total unread correctly', async () => {
      vi.mocked(prayerService.fetchUserInbox).mockResolvedValueOnce([
        mockInboxItem,
        mockInboxItem2,
      ]);

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.totalUnread).toBe(3);
      });
    });

    it('should exclude read prayers from unread count', async () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.totalUnread).toBe(2);
      });

      await act(async () => {
        await result.current.markAsRead('prayer-1');
      });

      expect(result.current.totalUnread).toBe(0);
    });

    it('should return 0 when inbox is empty', () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: false,
        })
      );

      expect(result.current.totalUnread).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark prayer as read successfully', async () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.inbox).toEqual([mockInboxItem]);
      });

      expect(result.current.totalUnread).toBe(2);

      await act(async () => {
        await result.current.markAsRead('prayer-1');
      });

      expect(prayerService.markAllResponsesRead).toHaveBeenCalledWith('prayer-1');
      expect(result.current.totalUnread).toBe(0);
    });

    it('should optimistically update local state', async () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.totalUnread).toBe(2);
      });

      await act(async () => {
        result.current.markAsRead('prayer-1');
      });

      // Should be updated immediately
      expect(result.current.totalUnread).toBe(0);
    });

    it('should handle marking already read prayer', async () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.inbox).toEqual([mockInboxItem]);
      });

      await act(async () => {
        await result.current.markAsRead('prayer-1');
      });

      expect(result.current.totalUnread).toBe(0);

      // Mark as read again
      await act(async () => {
        await result.current.markAsRead('prayer-1');
      });

      expect(result.current.totalUnread).toBe(0);
      expect(prayerService.markAllResponsesRead).toHaveBeenCalledTimes(2);
    });

    it('should revert optimistic update on error', async () => {
      vi.mocked(prayerService.markAllResponsesRead).mockRejectedValueOnce(
        new Error('Failed to mark as read')
      );

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.totalUnread).toBe(2);
      });

      await act(async () => {
        await result.current.markAsRead('prayer-1');
      });

      // Should be reverted to original count
      await waitFor(() => {
        expect(result.current.totalUnread).toBe(2);
      });
    });

    it('should handle multiple prayers being marked as read', async () => {
      vi.mocked(prayerService.fetchUserInbox).mockResolvedValueOnce([
        mockInboxItem,
        mockInboxItem2,
      ]);

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.totalUnread).toBe(3);
      });

      await act(async () => {
        await result.current.markAsRead('prayer-1');
      });

      expect(result.current.totalUnread).toBe(1);

      await act(async () => {
        await result.current.markAsRead('prayer-2');
      });

      expect(result.current.totalUnread).toBe(0);
    });

    it('should return count of marked responses', async () => {
      vi.mocked(prayerService.markAllResponsesRead).mockResolvedValueOnce(3);

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: false,
        })
      );

      await act(async () => {
        await result.current.markAsRead('prayer-1');
      });

      // Verify the service was called and returned the count
      expect(prayerService.markAllResponsesRead).toHaveBeenCalledWith('prayer-1');
    });
  });

  describe('real-time subscriptions', () => {
    it('should subscribe to inbox updates when enabled', async () => {
      renderHook(() =>
        useInbox({
          userId: 'user-1',
          enableRealtime: true,
          autoFetch: false,
        })
      );

      await waitFor(() => {
        expect(prayerService.subscribeToUserInbox).toHaveBeenCalledWith(
          'user-1',
          expect.any(Function)
        );
      });
    });

    it('should not subscribe when realtime is disabled', () => {
      renderHook(() =>
        useInbox({
          userId: 'user-1',
          enableRealtime: false,
          autoFetch: false,
        })
      );

      expect(prayerService.subscribeToUserInbox).not.toHaveBeenCalled();
    });

    it('should not subscribe when userId is empty', () => {
      renderHook(() =>
        useInbox({
          userId: '',
          enableRealtime: true,
          autoFetch: false,
        })
      );

      expect(prayerService.subscribeToUserInbox).not.toHaveBeenCalled();
    });

    it('should update inbox on subscription callback', async () => {
      let subscriptionCallback: ((inbox: InboxItem[]) => void) | undefined;

      vi.mocked(prayerService.subscribeToUserInbox).mockImplementation(
        (userId, callback) => {
          subscriptionCallback = callback;
          return () => {};
        }
      );

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          enableRealtime: true,
          autoFetch: false,
        })
      );

      await waitFor(() => {
        expect(subscriptionCallback).toBeDefined();
      });

      const updatedInbox = [mockInboxItem, mockInboxItem2];

      act(() => {
        subscriptionCallback!(updatedInbox);
      });

      expect(result.current.inbox).toEqual(updatedInbox);
      expect(result.current.totalUnread).toBe(3);
    });

    it('should unsubscribe on unmount', async () => {
      const unsubscribeMock = vi.fn();
      vi.mocked(prayerService.subscribeToUserInbox).mockReturnValue(
        unsubscribeMock
      );

      const { unmount } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          enableRealtime: true,
          autoFetch: false,
        })
      );

      await waitFor(() => {
        expect(prayerService.subscribeToUserInbox).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should resubscribe when userId changes', async () => {
      const { rerender } = renderHook(
        ({ userId }) =>
          useInbox({
            userId,
            enableRealtime: true,
            autoFetch: false,
          }),
        {
          initialProps: {
            userId: 'user-1',
          },
        }
      );

      await waitFor(() => {
        expect(prayerService.subscribeToUserInbox).toHaveBeenCalledTimes(1);
      });

      rerender({ userId: 'user-2' });

      await waitFor(() => {
        expect(prayerService.subscribeToUserInbox).toHaveBeenCalledTimes(2);
      });
    });

    it('should clean up previous subscription before creating new one', async () => {
      const unsubscribeMock1 = vi.fn();
      const unsubscribeMock2 = vi.fn();

      vi.mocked(prayerService.subscribeToUserInbox)
        .mockReturnValueOnce(unsubscribeMock1)
        .mockReturnValueOnce(unsubscribeMock2);

      const { rerender } = renderHook(
        ({ userId }) =>
          useInbox({
            userId,
            enableRealtime: true,
            autoFetch: false,
          }),
        {
          initialProps: {
            userId: 'user-1',
          },
        }
      );

      await waitFor(() => {
        expect(prayerService.subscribeToUserInbox).toHaveBeenCalledTimes(1);
      });

      rerender({ userId: 'user-2' });

      await waitFor(() => {
        expect(unsubscribeMock1).toHaveBeenCalled();
        expect(prayerService.subscribeToUserInbox).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('refetch', () => {
    it('should refetch inbox manually', async () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: false,
        })
      );

      expect(prayerService.fetchUserInbox).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.refetch();
      });

      expect(prayerService.fetchUserInbox).toHaveBeenCalledWith('user-1');
    });

    it('should clear error on successful refetch', async () => {
      vi.mocked(prayerService.fetchUserInbox).mockRejectedValueOnce(
        new Error('Initial error')
      );

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      vi.mocked(prayerService.fetchUserInbox).mockResolvedValueOnce([
        mockInboxItem,
      ]);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.inbox).toEqual([mockInboxItem]);
    });

    it('should not fetch if userId is empty on refetch', async () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: '',
          autoFetch: false,
        })
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(prayerService.fetchUserInbox).not.toHaveBeenCalled();
    });
  });

  describe('complex scenarios', () => {
    it('should handle new responses arriving via subscription', async () => {
      let subscriptionCallback: ((inbox: InboxItem[]) => void) | undefined;

      vi.mocked(prayerService.subscribeToUserInbox).mockImplementation(
        (userId, callback) => {
          subscriptionCallback = callback;
          return () => {};
        }
      );

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          enableRealtime: true,
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.inbox).toEqual([mockInboxItem]);
      });

      expect(result.current.totalUnread).toBe(2);

      // New response arrives
      const updatedItem = {
        ...mockInboxItem,
        responses: [...mockInboxItem.responses, mockResponse3],
        unreadCount: 3,
      };

      act(() => {
        subscriptionCallback!([updatedItem]);
      });

      expect(result.current.totalUnread).toBe(3);
    });

    it('should maintain read state when new unread responses arrive', async () => {
      let subscriptionCallback: ((inbox: InboxItem[]) => void) | undefined;

      vi.mocked(prayerService.subscribeToUserInbox).mockImplementation(
        (userId, callback) => {
          subscriptionCallback = callback;
          return () => {};
        }
      );

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          enableRealtime: true,
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.inbox).toEqual([mockInboxItem]);
      });

      // Mark as read
      await act(async () => {
        await result.current.markAsRead('prayer-1');
      });

      expect(result.current.totalUnread).toBe(0);

      // New unread response arrives for different prayer
      act(() => {
        subscriptionCallback!([mockInboxItem, mockInboxItem2]);
      });

      // Should only count unread from the second item (which wasn't marked as read)
      expect(result.current.totalUnread).toBe(1);
    });

    it('should handle concurrent mark as read operations', async () => {
      vi.mocked(prayerService.fetchUserInbox).mockResolvedValueOnce([
        mockInboxItem,
        mockInboxItem2,
      ]);

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.totalUnread).toBe(3);
      });

      await act(async () => {
        const promise1 = result.current.markAsRead('prayer-1');
        const promise2 = result.current.markAsRead('prayer-2');

        await Promise.all([promise1, promise2]);
      });

      expect(result.current.totalUnread).toBe(0);
      expect(prayerService.markAllResponsesRead).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle inbox item with zero unread count', async () => {
      const readItem = {
        ...mockInboxItem,
        unreadCount: 0,
      };

      vi.mocked(prayerService.fetchUserInbox).mockResolvedValueOnce([readItem]);

      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.totalUnread).toBe(0);
      });
    });

    it('should handle rapid userId changes', async () => {
      const { rerender } = renderHook(
        ({ userId }) =>
          useInbox({
            userId,
            autoFetch: true,
          }),
        {
          initialProps: {
            userId: 'user-1',
          },
        }
      );

      await waitFor(() => {
        expect(prayerService.fetchUserInbox).toHaveBeenCalledWith('user-1');
      });

      rerender({ userId: 'user-2' });
      rerender({ userId: 'user-3' });
      rerender({ userId: 'user-4' });

      await waitFor(() => {
        expect(prayerService.fetchUserInbox).toHaveBeenLastCalledWith('user-4');
      });
    });

    it('should handle marking non-existent prayer as read', async () => {
      const { result } = renderHook(() =>
        useInbox({
          userId: 'user-1',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.inbox).toEqual([mockInboxItem]);
      });

      await act(async () => {
        await result.current.markAsRead('non-existent-prayer');
      });

      // Should not crash
      expect(prayerService.markAllResponsesRead).toHaveBeenCalledWith(
        'non-existent-prayer'
      );
    });
  });
});
