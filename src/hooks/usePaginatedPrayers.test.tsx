/**
 * Tests for usePaginatedPrayers hook
 *
 * These tests verify cursor-based pagination functionality
 */

import React, { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePaginatedPrayers, getAllPrayers, getPrayerCount } from './usePaginatedPrayers';
import { supabase } from '../lib/supabase';

// ============================================================================
// Mock Supabase
// ============================================================================

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

const mockRpc = vi.mocked(supabase!.rpc);

// ============================================================================
// Test Setup
// ============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ============================================================================
// Mock Data
// ============================================================================

const createMockPrayer = (id: number, createdAt: string) => ({
  id: `prayer-${id}`,
  user_id: 'user-123',
  title: `Prayer ${id}`,
  content: `Content for prayer ${id}`,
  content_type: 'text',
  media_url: null,
  location: 'POINT(-122.4194 37.7749)',
  user_name: 'Test User',
  is_anonymous: false,
  status: 'active',
  created_at: createdAt,
  updated_at: createdAt,
  has_more: true,
});

// ============================================================================
// Tests
// ============================================================================

describe('usePaginatedPrayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch first page with default parameters', async () => {
    // Mock first page response
    mockRpc.mockResolvedValueOnce({
      data: [
        createMockPrayer(1, '2025-01-29T12:00:00Z'),
        createMockPrayer(2, '2025-01-29T11:00:00Z'),
      ],
      error: null,
    });

    const { result } = renderHook(() => usePaginatedPrayers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify RPC was called with correct params
    expect(mockRpc).toHaveBeenCalledWith('get_prayers_paginated', {
      page_size: 50,
      cursor_id: null,
      cursor_created_at: null,
    });

    // Verify data structure
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0].prayers).toHaveLength(2);
  });

  it('should fetch next page with cursor', async () => {
    // Mock first page
    mockRpc.mockResolvedValueOnce({
      data: [
        createMockPrayer(1, '2025-01-29T12:00:00Z'),
        createMockPrayer(2, '2025-01-29T11:00:00Z'),
      ],
      error: null,
    });

    const { result } = renderHook(() => usePaginatedPrayers({ pageSize: 2 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Mock second page
    mockRpc.mockResolvedValueOnce({
      data: [
        createMockPrayer(3, '2025-01-29T10:00:00Z'),
        createMockPrayer(4, '2025-01-29T09:00:00Z'),
      ],
      error: null,
    });

    // Fetch next page
    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

    // Verify second RPC call used cursor from last item
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'get_prayers_paginated', {
      page_size: 2,
      cursor_id: 'prayer-2',
      cursor_created_at: expect.any(String),
    });
  });

  it('should handle has_more flag correctly', async () => {
    // Mock response with has_more = true
    mockRpc.mockResolvedValueOnce({
      data: [
        { ...createMockPrayer(1, '2025-01-29T12:00:00Z'), has_more: true },
      ],
      error: null,
    });

    const { result } = renderHook(() => usePaginatedPrayers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(true);
  });

  it('should handle empty results', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => usePaginatedPrayers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0].prayers).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('should handle errors', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const { result } = renderHook(() => usePaginatedPrayers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should respect enabled parameter', async () => {
    const { result } = renderHook(
      () => usePaginatedPrayers({ enabled: false }),
      {
        wrapper: createWrapper(),
      }
    );

    // Wait a bit to ensure query doesn't run
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('should parse PostGIS POINT correctly', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          ...createMockPrayer(1, '2025-01-29T12:00:00Z'),
          location: 'POINT(-122.4194 37.7749)',
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => usePaginatedPrayers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const prayers = getAllPrayers(result.current.data);
    expect(prayers[0].location).toEqual({
      lng: -122.4194,
      lat: 37.7749,
    });
  });

  it('should respect custom page size', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [createMockPrayer(1, '2025-01-29T12:00:00Z')],
      error: null,
    });

    renderHook(() => usePaginatedPrayers({ pageSize: 100 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockRpc).toHaveBeenCalled());

    expect(mockRpc).toHaveBeenCalledWith('get_prayers_paginated', {
      page_size: 100,
      cursor_id: null,
      cursor_created_at: null,
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('Helper Functions', () => {
  it('getAllPrayers should flatten pages', () => {
    const mockData = {
      pages: [
        { prayers: [createMockPrayer(1, '2025-01-29T12:00:00Z')], hasMore: true, nextCursor: undefined },
        { prayers: [createMockPrayer(2, '2025-01-29T11:00:00Z')], hasMore: false, nextCursor: undefined },
      ],
      pageParams: [],
    };

    const allPrayers = getAllPrayers(mockData as any);

    expect(allPrayers).toHaveLength(2);
    expect(allPrayers[0].id).toBe('prayer-1');
    expect(allPrayers[1].id).toBe('prayer-2');
  });

  it('getPrayerCount should return total count', () => {
    const mockData = {
      pages: [
        { prayers: [createMockPrayer(1, '2025-01-29T12:00:00Z')], hasMore: true, nextCursor: undefined },
        { prayers: [createMockPrayer(2, '2025-01-29T11:00:00Z')], hasMore: false, nextCursor: undefined },
      ],
      pageParams: [],
    };

    const count = getPrayerCount(mockData as any);

    expect(count).toBe(2);
  });

  it('helper functions should handle undefined data', () => {
    expect(getAllPrayers(undefined)).toEqual([]);
    expect(getPrayerCount(undefined)).toBe(0);
  });
});
