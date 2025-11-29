import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePrayers } from '../usePrayers';
import type { Prayer } from '../../types/prayer';
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

// Mock the prayer service
vi.mock('../../services/prayerService', () => ({
  fetchNearbyPrayers: vi.fn(),
  fetchAllPrayers: vi.fn(),
  createPrayer: vi.fn(),
  respondToPrayer: vi.fn(),
  subscribeToNearbyPrayers: vi.fn(),
  subscribeToAllPrayers: vi.fn(),
}));

describe('usePrayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(prayerService.fetchNearbyPrayers).mockResolvedValue([mockPrayer]);
    vi.mocked(prayerService.fetchAllPrayers).mockResolvedValue([mockPrayer, mockPrayer2]);
    vi.mocked(prayerService.createPrayer).mockResolvedValue(mockPrayer);
    vi.mocked(prayerService.respondToPrayer).mockResolvedValue(true);
    vi.mocked(prayerService.subscribeToNearbyPrayers).mockReturnValue(() => {});
    vi.mocked(prayerService.subscribeToAllPrayers).mockReturnValue(() => {});
  });

  describe('initialization', () => {
    it('should initialize with empty prayers array', () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      expect(result.current.prayers).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should auto-fetch prayers when autoFetch is true', async () => {
      renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(prayerService.fetchNearbyPrayers).toHaveBeenCalled();
      });
    });

    it('should not fetch prayers when autoFetch is false', () => {
      renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      expect(prayerService.fetchNearbyPrayers).not.toHaveBeenCalled();
    });
  });

  describe('fetchPrayers', () => {
    it('should fetch nearby prayers successfully', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          radiusKm: 50,
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.prayers).toEqual([mockPrayer]);
      });

      expect(prayerService.fetchNearbyPrayers).toHaveBeenCalledWith(
        40.7128,
        -74.006,
        50
      );
    });

    it('should fetch all prayers when in global mode', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          globalMode: true,
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.prayers).toEqual([mockPrayer, mockPrayer2]);
      });

      expect(prayerService.fetchAllPrayers).toHaveBeenCalled();
      expect(prayerService.fetchNearbyPrayers).not.toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Failed to fetch prayers';
      vi.mocked(prayerService.fetchNearbyPrayers).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });

      expect(result.current.prayers).toEqual([]);
    });

    it('should return empty array on successful empty fetch', async () => {
      vi.mocked(prayerService.fetchNearbyPrayers).mockResolvedValueOnce([]);

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.prayers).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state correctly', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.refetch();
      });

      // Loading should be true immediately after calling refetch
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('createPrayer', () => {
    it('should create text prayer successfully', async () => {
      const newPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'> = {
        user_id: 'user-1',
        content: 'New prayer request',
        content_type: 'text',
        location: { lat: 40.7128, lng: -74.006 },
        is_anonymous: false,
      };

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      let createdPrayer;
      await act(async () => {
        createdPrayer = await result.current.createPrayer(newPrayer);
      });

      expect(prayerService.createPrayer).toHaveBeenCalledWith(newPrayer);
      expect(createdPrayer).toEqual(mockPrayer);
    });

    it('should create audio prayer successfully', async () => {
      const audioPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'> = {
        user_id: 'user-1',
        content: 'Audio prayer',
        content_type: 'audio',
        content_url: 'https://example.com/audio.mp3',
        location: { lat: 40.7128, lng: -74.006 },
        is_anonymous: false,
      };

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      await act(async () => {
        await result.current.createPrayer(audioPrayer);
      });

      expect(prayerService.createPrayer).toHaveBeenCalledWith(audioPrayer);
    });

    it('should create video prayer successfully', async () => {
      const videoPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'> = {
        user_id: 'user-1',
        content: 'Video prayer',
        content_type: 'video',
        content_url: 'https://example.com/video.mp4',
        location: { lat: 40.7128, lng: -74.006 },
        is_anonymous: false,
      };

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      await act(async () => {
        await result.current.createPrayer(videoPrayer);
      });

      expect(prayerService.createPrayer).toHaveBeenCalledWith(videoPrayer);
    });

    it('should optimistically add prayer to local state', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      const newPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'> = {
        user_id: 'user-1',
        content: 'New prayer',
        content_type: 'text',
        location: { lat: 40.7128, lng: -74.006 },
        is_anonymous: false,
      };

      await act(async () => {
        await result.current.createPrayer(newPrayer);
      });

      expect(result.current.prayers).toContainEqual(mockPrayer);
    });

    it('should handle create prayer errors', async () => {
      const errorMessage = 'Failed to create prayer';
      vi.mocked(prayerService.createPrayer).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      const newPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'> = {
        user_id: 'user-1',
        content: 'Failed prayer',
        content_type: 'text',
        location: { lat: 40.7128, lng: -74.006 },
        is_anonymous: false,
      };

      let result_;
      await act(async () => {
        result_ = await result.current.createPrayer(newPrayer);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result_).toBeNull();
    });

    it('should return null when create fails', async () => {
      vi.mocked(prayerService.createPrayer).mockResolvedValueOnce(null);

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      const newPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'> = {
        user_id: 'user-1',
        content: 'Failed prayer',
        content_type: 'text',
        location: { lat: 40.7128, lng: -74.006 },
        is_anonymous: false,
      };

      let createdPrayer;
      await act(async () => {
        createdPrayer = await result.current.createPrayer(newPrayer);
      });

      expect(createdPrayer).toBeNull();
    });
  });

  describe('respondToPrayer', () => {
    it('should respond to prayer successfully', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.prayers).toEqual([mockPrayer]);
      });

      let response;
      await act(async () => {
        response = await result.current.respondToPrayer(
          'prayer-1',
          'responder-1',
          'Responder Name',
          'Praying for you',
          'text'
        );
      });

      expect(prayerService.respondToPrayer).toHaveBeenCalledWith(
        'prayer-1',
        'responder-1',
        'Responder Name',
        'Praying for you',
        'text',
        undefined,
        false,
        undefined
      );
      expect(response).toBe(true);
    });

    it('should update local state with responder', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.prayers).toEqual([mockPrayer]);
      });

      await act(async () => {
        await result.current.respondToPrayer(
          'prayer-1',
          'responder-1',
          'Responder Name',
          'Praying for you',
          'text'
        );
      });

      expect(result.current.prayers[0].prayedBy).toContain('responder-1');
    });

    it('should handle respond with audio content', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      await act(async () => {
        await result.current.respondToPrayer(
          'prayer-1',
          'responder-1',
          'Responder Name',
          'Audio response',
          'audio',
          'https://example.com/response.mp3'
        );
      });

      expect(prayerService.respondToPrayer).toHaveBeenCalledWith(
        'prayer-1',
        'responder-1',
        'Responder Name',
        'Audio response',
        'audio',
        'https://example.com/response.mp3',
        false,
        undefined
      );
    });

    it('should handle respond with video content', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      await act(async () => {
        await result.current.respondToPrayer(
          'prayer-1',
          'responder-1',
          'Responder Name',
          'Video response',
          'video',
          'https://example.com/response.mp4'
        );
      });

      expect(prayerService.respondToPrayer).toHaveBeenCalledWith(
        'prayer-1',
        'responder-1',
        'Responder Name',
        'Video response',
        'video',
        'https://example.com/response.mp4',
        false,
        undefined
      );
    });

    it('should handle anonymous responses', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      await act(async () => {
        await result.current.respondToPrayer(
          'prayer-1',
          'responder-1',
          'Responder Name',
          'Anonymous response',
          'text',
          undefined,
          true
        );
      });

      expect(prayerService.respondToPrayer).toHaveBeenCalledWith(
        'prayer-1',
        'responder-1',
        'Responder Name',
        'Anonymous response',
        'text',
        undefined,
        true,
        undefined
      );
    });

    it('should include responder location when provided', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      const responderLocation = { lat: 34.0522, lng: -118.2437 };

      await act(async () => {
        await result.current.respondToPrayer(
          'prayer-1',
          'responder-1',
          'Responder Name',
          'Response with location',
          'text',
          undefined,
          false,
          responderLocation
        );
      });

      expect(prayerService.respondToPrayer).toHaveBeenCalledWith(
        'prayer-1',
        'responder-1',
        'Responder Name',
        'Response with location',
        'text',
        undefined,
        false,
        responderLocation
      );
    });

    it('should handle respond errors', async () => {
      const errorMessage = 'Failed to respond';
      vi.mocked(prayerService.respondToPrayer).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      let response;
      await act(async () => {
        response = await result.current.respondToPrayer(
          'prayer-1',
          'responder-1',
          'Responder Name',
          'Failed response',
          'text'
        );
      });

      expect(result.current.error).toBe(errorMessage);
      expect(response).toBe(false);
    });

    it('should return false when respond fails', async () => {
      vi.mocked(prayerService.respondToPrayer).mockResolvedValueOnce(false);

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      let response;
      await act(async () => {
        response = await result.current.respondToPrayer(
          'prayer-1',
          'responder-1',
          'Responder Name',
          'Failed response',
          'text'
        );
      });

      expect(response).toBe(false);
    });
  });

  describe('real-time subscriptions', () => {
    it('should subscribe to nearby prayers when enabled', async () => {
      renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          radiusKm: 50,
          enableRealtime: true,
          autoFetch: false,
        })
      );

      await waitFor(() => {
        expect(prayerService.subscribeToNearbyPrayers).toHaveBeenCalledWith(
          40.7128,
          -74.006,
          50,
          expect.any(Function)
        );
      });
    });

    it('should subscribe to all prayers in global mode', async () => {
      renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          globalMode: true,
          enableRealtime: true,
          autoFetch: false,
        })
      );

      await waitFor(() => {
        expect(prayerService.subscribeToAllPrayers).toHaveBeenCalledWith(
          expect.any(Function)
        );
      });
    });

    it('should not subscribe when realtime is disabled', () => {
      renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          enableRealtime: false,
          autoFetch: false,
        })
      );

      expect(prayerService.subscribeToNearbyPrayers).not.toHaveBeenCalled();
      expect(prayerService.subscribeToAllPrayers).not.toHaveBeenCalled();
    });

    it('should update prayers on subscription callback', async () => {
      let subscriptionCallback: ((prayers: Prayer[]) => void) | undefined;

      vi.mocked(prayerService.subscribeToNearbyPrayers).mockImplementation(
        (lat, lng, radius, callback) => {
          subscriptionCallback = callback;
          return () => {};
        }
      );

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          enableRealtime: true,
          autoFetch: false,
        })
      );

      await waitFor(() => {
        expect(subscriptionCallback).toBeDefined();
      });

      const updatedPrayers = [mockPrayer, mockPrayer2];

      act(() => {
        subscriptionCallback!(updatedPrayers);
      });

      expect(result.current.prayers).toEqual(updatedPrayers);
    });

    it('should unsubscribe on unmount', async () => {
      const unsubscribeMock = vi.fn();
      vi.mocked(prayerService.subscribeToNearbyPrayers).mockReturnValue(
        unsubscribeMock
      );

      const { unmount } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          enableRealtime: true,
          autoFetch: false,
        })
      );

      await waitFor(() => {
        expect(prayerService.subscribeToNearbyPrayers).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should resubscribe when location changes', async () => {
      const { rerender } = renderHook(
        ({ location }) =>
          usePrayers({
            location,
            enableRealtime: true,
            autoFetch: false,
          }),
        {
          initialProps: {
            location: { lat: 40.7128, lng: -74.006 },
          },
        }
      );

      await waitFor(() => {
        expect(prayerService.subscribeToNearbyPrayers).toHaveBeenCalledTimes(1);
      });

      rerender({ location: { lat: 34.0522, lng: -118.2437 } });

      await waitFor(() => {
        expect(prayerService.subscribeToNearbyPrayers).toHaveBeenCalledTimes(2);
      });
    });

    it('should resubscribe when switching between global and local mode', async () => {
      const { rerender } = renderHook(
        ({ globalMode }) =>
          usePrayers({
            location: { lat: 40.7128, lng: -74.006 },
            enableRealtime: true,
            autoFetch: false,
            globalMode,
          }),
        {
          initialProps: {
            globalMode: false,
          },
        }
      );

      await waitFor(() => {
        expect(prayerService.subscribeToNearbyPrayers).toHaveBeenCalled();
      });

      rerender({ globalMode: true });

      await waitFor(() => {
        expect(prayerService.subscribeToAllPrayers).toHaveBeenCalled();
      });
    });
  });

  describe('refetch', () => {
    it('should refetch prayers manually', async () => {
      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: false,
        })
      );

      expect(prayerService.fetchNearbyPrayers).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.refetch();
      });

      expect(prayerService.fetchNearbyPrayers).toHaveBeenCalled();
    });

    it('should clear error on refetch', async () => {
      vi.mocked(prayerService.fetchNearbyPrayers).mockRejectedValueOnce(
        new Error('Initial error')
      );

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      vi.mocked(prayerService.fetchNearbyPrayers).mockResolvedValueOnce([
        mockPrayer,
      ]);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.prayers).toEqual([mockPrayer]);
    });
  });

  describe('error recovery', () => {
    it('should recover from transient errors on refetch', async () => {
      vi.mocked(prayerService.fetchNearbyPrayers)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([mockPrayer]);

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.prayers).toEqual([mockPrayer]);
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(prayerService.fetchNearbyPrayers).mockRejectedValueOnce(
        'String error'
      );

      const { result } = renderHook(() =>
        usePrayers({
          location: { lat: 40.7128, lng: -74.006 },
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch prayers');
      });
    });
  });
});
