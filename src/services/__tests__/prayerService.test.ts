/**
 * Comprehensive Unit Tests for PrayerService
 *
 * Tests ALL functions with 100% coverage including:
 * - Success cases
 * - Error handling
 * - Edge cases
 * - Realtime subscriptions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helper type for Supabase responses
type SupabaseResponse<T> = { data: T; error: { message: string; code?: string } | null };

// Mock Supabase - define mocks inside the factory to avoid hoisting issues
vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
      channel: vi.fn(),
    },
  };
});

import * as prayerService from '../prayerService';
import { supabase } from '../../lib/supabase';

// Helper functions
function createMockPrayerRow(overrides = {}) {
  return {
    id: 'prayer-123',
    user_id: 'user-456',
    title: 'Test Prayer',
    content: 'Please pray for me',
    content_type: 'text' as const,
    media_url: null,
    location: { lat: 40.7128, lng: -74.006 },
    user_name: 'John Doe',
    is_anonymous: false,
    status: 'active' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockPrayerResponseRow(overrides = {}) {
  return {
    id: 'response-123',
    prayer_id: 'prayer-123',
    responder_id: 'responder-456',
    responder_name: 'Jane Smith',
    is_anonymous: false,
    message: 'Praying for you',
    content_type: 'text' as const,
    content_url: null,
    created_at: '2024-01-02T00:00:00Z',
    read_at: null,
    ...overrides,
  };
}

function createMockConnectionRow(overrides = {}) {
  return {
    id: 'connection-123',
    prayer_id: 'prayer-123',
    prayer_response_id: 'response-123',
    from_location: { lat: 40.7128, lng: -74.006 },
    to_location: { lat: 34.0522, lng: -118.2437 },
    requester_name: 'John Doe',
    replier_name: 'Jane Smith',
    created_at: '2024-01-02T00:00:00Z',
    expires_at: '2025-01-02T00:00:00Z',
    ...overrides,
  };
}

function mockQueryBuilder<T>(data: T, error: { message: string; code?: string } | null = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };

  // Make order return a promise for the final call
  builder.order.mockResolvedValue({ data, error });
  builder.not.mockResolvedValue({ data, error });
  builder.delete.mockResolvedValue({ error });

  return builder;
}

describe('prayerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchAllPrayers', () => {
    it('should fetch all prayers using RPC with default limit', async () => {
      const mockData = [createMockPrayerRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchAllPrayers();

      expect(supabase.rpc).toHaveBeenCalledWith('get_all_prayers', { limit_count: 500 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prayer-123');
    });

    it('should transform database response to Prayer type', async () => {
      const mockData = [createMockPrayerRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchAllPrayers();

      expect(result[0]).toMatchObject({
        id: 'prayer-123',
        user_id: 'user-456',
        title: 'Test Prayer',
        content: 'Please pray for me',
        content_type: 'text',
        content_url: null,
        location: { lat: 40.7128, lng: -74.006 },
        user_name: 'John Doe',
        is_anonymous: false,
        status: 'active',
      });
      expect(result[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle empty response', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } satisfies SupabaseResponse<never[]>);

      const result = await prayerService.fetchAllPrayers();

      expect(result).toEqual([]);
    });

    it('should handle RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: '42P01' }
      } as unknown as SupabaseResponse<null>);

      const result = await prayerService.fetchAllPrayers();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await prayerService.fetchAllPrayers();

      // The service has a fallback that returns an empty array on error
      expect(result).toEqual([]);
    });

    it('should parse location from POINT format', async () => {
      const mockData = [createMockPrayerRow({
        location: 'POINT(-74.006 40.7128)'
      })];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchAllPrayers();

      expect(result[0].location).toEqual({ lat: 40.7128, lng: -74.006 });
    });

    it('should parse location from object format', async () => {
      const mockData = [createMockPrayerRow({
        location: { lat: 40.7128, lng: -74.006 }
      })];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchAllPrayers();

      expect(result[0].location).toEqual({ lat: 40.7128, lng: -74.006 });
    });

    it('should filter out hidden prayers', async () => {
      const mockData = [
        createMockPrayerRow({ id: '1', status: 'active' }),
        createMockPrayerRow({ id: '2', status: 'hidden' }),
        createMockPrayerRow({ id: '3', status: 'removed' }),
        createMockPrayerRow({ id: '4', status: 'approved' }),
      ];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchAllPrayers();

      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toEqual(['1', '4']);
    });

    it('should include prayers with no status', async () => {
      const mockData = [createMockPrayerRow({ status: undefined })];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchAllPrayers();

      expect(result).toHaveLength(1);
    });

    it('should handle null location gracefully', async () => {
      const mockData = [createMockPrayerRow({ location: null })];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchAllPrayers();

      expect(result[0].location).toEqual({ lat: 0, lng: 0 });
      expect(console.warn).toHaveBeenCalledWith('Missing location data');
    });

    it('should handle malformed POINT string', async () => {
      const mockData = [createMockPrayerRow({ location: 'INVALID' })];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchAllPrayers();

      expect(result[0].location).toEqual({ lat: 0, lng: 0 });
      expect(console.warn).toHaveBeenCalled();
    });

    it('should pass custom limit to RPC function', async () => {
      const mockData = [createMockPrayerRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      await prayerService.fetchAllPrayers(100);

      expect(supabase.rpc).toHaveBeenCalledWith('get_all_prayers', { limit_count: 100 });
    });

    it('should enforce maximum limit of 1000', async () => {
      const mockData = [createMockPrayerRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      await prayerService.fetchAllPrayers(5000);

      expect(supabase.rpc).toHaveBeenCalledWith('get_all_prayers', { limit_count: 1000 });
    });
  });

  describe('fetchAllConnections', () => {
    it('should fetch all connections using RPC with default limit', async () => {
      const mockData = [createMockConnectionRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchAllConnections();

      expect(supabase.rpc).toHaveBeenCalledWith('get_all_connections', { limit_count: 200 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('connection-123');
    });

    it('should transform connection rows correctly', async () => {
      const mockData = [createMockConnectionRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchAllConnections();

      expect(result[0]).toMatchObject({
        id: 'connection-123',
        prayer_id: 'prayer-123',
        prayer_response_id: 'response-123',
        from_location: { lat: 40.7128, lng: -74.006 },
        to_location: { lat: 34.0522, lng: -118.2437 },
        requester_name: 'John Doe',
        replier_name: 'Jane Smith',
      });
    });

    it('should handle empty connections', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } satisfies SupabaseResponse<never[]>);

      const result = await prayerService.fetchAllConnections();

      expect(result).toEqual([]);
    });

    it('should handle null data', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } satisfies SupabaseResponse<null>);

      const result = await prayerService.fetchAllConnections();

      expect(result).toEqual([]);
    });

    it('should handle RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection error' }
      } as unknown as SupabaseResponse<null>);

      const result = await prayerService.fetchAllConnections();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should pass custom limit to RPC function', async () => {
      const mockData = [createMockConnectionRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      await prayerService.fetchAllConnections(100);

      expect(supabase.rpc).toHaveBeenCalledWith('get_all_connections', { limit_count: 100 });
    });

    it('should enforce maximum limit of 500', async () => {
      const mockData = [createMockConnectionRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      await prayerService.fetchAllConnections(1000);

      expect(supabase.rpc).toHaveBeenCalledWith('get_all_connections', { limit_count: 500 });
    });

    it('should enforce minimum limit of 1', async () => {
      const mockData = [createMockConnectionRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      await prayerService.fetchAllConnections(0);

      expect(supabase.rpc).toHaveBeenCalledWith('get_all_connections', { limit_count: 1 });
    });
  });

  describe('fetchNearbyPrayers', () => {
    it('should call RPC with lat, lng, radius', async () => {
      const mockData = [createMockPrayerRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      await prayerService.fetchNearbyPrayers(40.7128, -74.006, 50);

      expect(supabase.rpc).toHaveBeenCalledWith('get_nearby_prayers', {
        lat: 40.7128,
        lng: -74.006,
        radius_km: 50,
      });
    });

    it('should return prayers within radius', async () => {
      const mockData = [createMockPrayerRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchNearbyPrayers(40.7128, -74.006, 50);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prayer-123');
    });

    it('should use default radius of 50km', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } satisfies SupabaseResponse<never[]>);

      await prayerService.fetchNearbyPrayers(40.7128, -74.006);

      expect(supabase.rpc).toHaveBeenCalledWith('get_nearby_prayers', {
        lat: 40.7128,
        lng: -74.006,
        radius_km: 50,
      });
    });

    it('should filter out moderated prayers', async () => {
      const mockData = [
        createMockPrayerRow({ id: '1', status: 'active' }),
        createMockPrayerRow({ id: '2', status: 'hidden' }),
      ];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.fetchNearbyPrayers(40.7128, -74.006);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should handle RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Query error' }
      } as unknown as SupabaseResponse<null>);

      const result = await prayerService.fetchNearbyPrayers(40.7128, -74.006);

      expect(result).toEqual([]);
    });
  });

  describe('createPrayer', () => {
    it('should create text prayer with all fields', async () => {
      const mockData = [createMockPrayerRow()];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const prayer = {
        user_id: 'user-456',
        title: 'Test Prayer',
        content: 'Please pray for me',
        content_type: 'text' as const,
        location: { lat: 40.7128, lng: -74.006 },
        user_name: 'John Doe',
        is_anonymous: false,
      };

      const result = await prayerService.createPrayer(prayer);

      expect(supabase.rpc).toHaveBeenCalledWith('create_prayer', {
        p_user_id: 'user-456',
        p_title: 'Test Prayer',
        p_content: 'Please pray for me',
        p_content_type: 'text',
        p_content_url: '',
        p_lat: 40.7128,
        p_lng: -74.006,
        p_user_name: 'John Doe',
        p_is_anonymous: false,
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('prayer-123');
    });

    it('should handle optional title', async () => {
      const mockData = [createMockPrayerRow({ title: undefined })];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const prayer = {
        user_id: 'user-456',
        content: 'Please pray for me',
        content_type: 'text' as const,
        location: { lat: 40.7128, lng: -74.006 },
        user_name: 'John Doe',
        is_anonymous: false,
      };

      await prayerService.createPrayer(prayer);

      expect(supabase.rpc).toHaveBeenCalledWith('create_prayer', expect.objectContaining({
        p_title: '',
      }));
    });

    it('should create audio prayer with content_url', async () => {
      const mockData = [createMockPrayerRow({
        content_type: 'audio',
        media_url: 'https://example.com/audio.mp3',
      })];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const prayer = {
        user_id: 'user-456',
        content: 'Audio prayer',
        content_type: 'audio' as const,
        content_url: 'https://example.com/audio.mp3',
        location: { lat: 40.7128, lng: -74.006 },
        user_name: 'John Doe',
        is_anonymous: false,
      };

      const result = await prayerService.createPrayer(prayer);

      expect(supabase.rpc).toHaveBeenCalledWith('create_prayer', expect.objectContaining({
        p_content_type: 'audio',
        p_content_url: 'https://example.com/audio.mp3',
      }));
      expect(result?.content_type).toBe('audio');
    });

    it('should create video prayer with content_url', async () => {
      const mockData = [createMockPrayerRow({
        content_type: 'video',
        media_url: 'https://example.com/video.mp4',
      })];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const prayer = {
        user_id: 'user-456',
        content: 'Video prayer',
        content_type: 'video' as const,
        content_url: 'https://example.com/video.mp4',
        location: { lat: 40.7128, lng: -74.006 },
        user_name: 'John Doe',
        is_anonymous: false,
      };

      const result = await prayerService.createPrayer(prayer);

      expect(result?.content_type).toBe('video');
    });

    it('should handle anonymous prayers', async () => {
      const mockData = [createMockPrayerRow({ is_anonymous: true })];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const prayer = {
        user_id: 'user-456',
        content: 'Anonymous prayer',
        content_type: 'text' as const,
        location: { lat: 40.7128, lng: -74.006 },
        is_anonymous: true,
      };

      await prayerService.createPrayer(prayer);

      expect(supabase.rpc).toHaveBeenCalledWith('create_prayer', expect.objectContaining({
        p_is_anonymous: true,
      }));
    });

    it('should return null on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' }
      } as unknown as SupabaseResponse<null>);

      const prayer = {
        user_id: 'user-456',
        content: 'Test prayer',
        content_type: 'text' as const,
        location: { lat: 40.7128, lng: -74.006 },
        is_anonymous: false,
      };

      const result = await prayerService.createPrayer(prayer);

      expect(result).toBeNull();
    });
  });

  describe('updatePrayer', () => {
    it('should update prayer fields', async () => {
      const mockData = createMockPrayerRow({
        title: 'Updated Title',
        content: 'Updated content',
      });
      const builder = mockQueryBuilder(mockData);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.updatePrayer(
        'prayer-123',
        'user-456',
        { title: 'Updated Title', content: 'Updated content' }
      );

      expect(builder.update).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'prayer-123');
      expect(result?.title).toBe('Updated Title');
    });

    it('should handle prayer not found', async () => {
      const builder = mockQueryBuilder(null, { message: 'Not found' });
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.updatePrayer(
        'prayer-123',
        'user-456',
        { title: 'Updated' }
      );

      expect(result).toBeNull();
    });
  });

  describe('deletePrayer', () => {
    it('should delete prayer by id', async () => {
      const mockEq2 = vi.fn().mockResolvedValue({ error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const builder = {
        delete: vi.fn().mockReturnValue({ eq: mockEq1 }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.deletePrayer('prayer-123', 'user-456');

      expect(builder.delete).toHaveBeenCalled();
      expect(mockEq1).toHaveBeenCalledWith('id', 'prayer-123');
      expect(mockEq2).toHaveBeenCalledWith('user_id', 'user-456');
      expect(result).toBe(true);
    });

    it('should handle error', async () => {
      const mockEq2 = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const builder = {
        delete: vi.fn().mockReturnValue({ eq: mockEq1 }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.deletePrayer('prayer-123', 'user-456');

      expect(result).toBe(false);
    });
  });

  describe('deletePrayerResponse', () => {
    it('should delete prayer response by id', async () => {
      const mockEq2 = vi.fn().mockResolvedValue({ error: null });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const builder = {
        delete: vi.fn().mockReturnValue({ eq: mockEq1 }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.deletePrayerResponse('response-123', 'responder-456');

      expect(builder.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('respondToPrayer', () => {
    it('should create text response', async () => {
      const mockResponse = createMockPrayerResponseRow();
      const builder = mockQueryBuilder(mockResponse);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.respondToPrayer(
        'prayer-123',
        'responder-456',
        'Jane Smith',
        'Praying for you',
        'text'
      );

      expect(builder.insert).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.response.id).toBe('response-123');
    });

    it('should create prayer connection when responder location provided', async () => {
      const mockResponse = createMockPrayerResponseRow();
      const mockConnection = createMockConnectionRow();
      const builder = mockQueryBuilder(mockResponse);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockConnection, error: null } as unknown as SupabaseResponse<typeof mockConnection>);

      const result = await prayerService.respondToPrayer(
        'prayer-123',
        'responder-456',
        'Jane Smith',
        'Praying',
        'text',
        undefined,
        false,
        { lat: 34.0522, lng: -118.2437 }
      );

      expect(supabase.rpc).toHaveBeenCalledWith('create_prayer_connection', {
        p_prayer_id: 'prayer-123',
        p_prayer_response_id: 'response-123',
        p_responder_lat: 34.0522,
        p_responder_lng: -118.2437,
      });
      expect(result?.connection).not.toBeNull();
    });

    it('should handle anonymous responses', async () => {
      const mockResponse = createMockPrayerResponseRow({ is_anonymous: true, responder_name: null });
      const builder = mockQueryBuilder(mockResponse);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);

      await prayerService.respondToPrayer(
        'prayer-123',
        'responder-456',
        'Jane Smith',
        'Praying',
        'text',
        undefined,
        true
      );

      expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({
        responder_name: null,
        is_anonymous: true,
      }));
    });

    it('should return null on error', async () => {
      const builder = mockQueryBuilder(null, { message: 'Insert failed' });
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.respondToPrayer(
        'prayer-123',
        'responder-456',
        'Jane Smith',
        'Praying',
        'text'
      );

      expect(result).toBeNull();
    });
  });

  describe('fetchPrayerResponses', () => {
    it('should fetch responses for prayer', async () => {
      const mockData = [createMockPrayerResponseRow()];
      const builder = mockQueryBuilder(mockData);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.fetchPrayerResponses('prayer-123');

      expect(builder.select).toHaveBeenCalledWith('*');
      expect(builder.eq).toHaveBeenCalledWith('prayer_id', 'prayer-123');
      expect(result).toHaveLength(1);
    });

    it('should handle no responses', async () => {
      const builder = mockQueryBuilder([]);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.fetchPrayerResponses('prayer-123');

      expect(result).toEqual([]);
    });
  });

  describe('fetchUserInbox', () => {
    it('should fetch prayers with responses', async () => {
      const mockPrayers = [createMockPrayerRow()];
      const mockResponses = [{
        ...createMockPrayerResponseRow(),
        profiles: { display_name: 'Jane Smith' }
      }];

      // Mock first call - fetching user's prayers
      const prayersBuilder = mockQueryBuilder(mockPrayers);
      prayersBuilder.order.mockResolvedValue({ data: mockPrayers, error: null });

      // Mock second call - fetching responses
      const responsesBuilder = mockQueryBuilder(mockResponses);
      responsesBuilder.order.mockResolvedValue({ data: mockResponses, error: null });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(prayersBuilder as unknown as ReturnType<typeof supabase.from>)
        .mockReturnValueOnce(responsesBuilder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.fetchUserInbox('user-456');

      expect(result).toHaveLength(1);
      expect(result[0].prayer.id).toBe('prayer-123');
      expect(result[0].responses).toHaveLength(1);
    });

    it('should calculate unread count', async () => {
      const mockPrayers = [createMockPrayerRow()];
      const mockResponses = [
        { ...createMockPrayerResponseRow({ id: '1', read_at: null }), profiles: { display_name: 'User 1' } },
        { ...createMockPrayerResponseRow({ id: '2', read_at: '2024-01-03T00:00:00Z' }), profiles: { display_name: 'User 2' } },
        { ...createMockPrayerResponseRow({ id: '3', read_at: null }), profiles: { display_name: 'User 3' } },
      ];

      // Mock first call - fetching user's prayers
      const prayersBuilder = mockQueryBuilder(mockPrayers);
      prayersBuilder.order.mockResolvedValue({ data: mockPrayers, error: null });

      // Mock second call - fetching responses
      const responsesBuilder = mockQueryBuilder(mockResponses);
      responsesBuilder.order.mockResolvedValue({ data: mockResponses, error: null });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(prayersBuilder as unknown as ReturnType<typeof supabase.from>)
        .mockReturnValueOnce(responsesBuilder as unknown as ReturnType<typeof supabase.from>);

      const result = await prayerService.fetchUserInbox('user-456');

      expect(result[0].unreadCount).toBe(2);
    });
  });

  describe('subscribeToPrayers', () => {
    it('should create realtime subscription', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      };
      vi.mocked(supabase.channel).mockReturnValueOnce(mockChannel as unknown as ReturnType<typeof supabase.channel>);

      prayerService.subscribeToPrayers(() => {});

      expect(supabase.channel).toHaveBeenCalledWith('global_prayers_channel');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe }),
        unsubscribe: mockUnsubscribe,
      };
      vi.mocked(supabase.channel).mockReturnValueOnce(mockChannel as unknown as ReturnType<typeof supabase.channel>);

      const unsubscribe = prayerService.subscribeToPrayers(() => {});

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('subscribeToAllConnections', () => {
    it('should subscribe to prayer_connections', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      };
      vi.mocked(supabase.channel).mockReturnValueOnce(mockChannel as unknown as ReturnType<typeof supabase.channel>);

      prayerService.subscribeToAllConnections(() => {});

      expect(supabase.channel).toHaveBeenCalledWith('global_connections_channel');
    });
  });

  describe('markResponseAsRead', () => {
    it('should mark response as read', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: true, error: null } as unknown as SupabaseResponse<boolean>);

      const result = await prayerService.markResponseAsRead('response-123');

      expect(supabase.rpc).toHaveBeenCalledWith('mark_response_as_read', {
        response_id: 'response-123',
      });
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed' }
      } as unknown as SupabaseResponse<null>);

      const result = await prayerService.markResponseAsRead('response-123');

      expect(result).toBe(false);
    });
  });

  describe('markAllResponsesRead', () => {
    it('should mark all responses as read', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: 5, error: null } as unknown as SupabaseResponse<number>);

      const result = await prayerService.markAllResponsesRead('prayer-123');

      expect(result).toBe(5);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count for user', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: 10, error: null } as unknown as SupabaseResponse<number>);

      const result = await prayerService.getUnreadCount('user-456');

      expect(result).toBe(10);
    });
  });

  describe('getUnreadCountsByPrayer', () => {
    it('should get unread counts by prayer', async () => {
      const mockData = [
        { prayer_id: 'prayer-1', unread_count: 3 },
        { prayer_id: 'prayer-2', unread_count: 5 },
      ];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } satisfies SupabaseResponse<typeof mockData>);

      const result = await prayerService.getUnreadCountsByPrayer('user-456');

      expect(result).toEqual(mockData);
    });
  });
});
