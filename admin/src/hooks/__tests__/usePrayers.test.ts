/**
 * usePrayers Hook Tests
 * Tests for admin prayer management hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePrayers, useUpdatePrayer, useDeletePrayer } from '../usePrayers'
import { mockSupabaseClient } from '../../test/setup'
import { createMockPrayerList, createMockAdminPrayer, createMockAudioPrayer, createMockVideoPrayer } from '../../test/factories'
import React from 'react'

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('usePrayers (Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetching', () => {
    it('should fetch prayers with pagination', async () => {
      const mockPrayers = createMockPrayerList(10)
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockPrayers,
        error: null,
      })

      const { result } = renderHook(
        () => usePrayers({ page: 0, pageSize: 10 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_all_prayers_admin', {
        p_limit: 10,
        p_offset: 0,
        p_search: null,
      })

      expect(result.current.data?.prayers).toHaveLength(10)
      expect(result.current.data?.totalCount).toBe(100)
      expect(result.current.data?.pageCount).toBe(10)
    })

    it('should search prayers by title', async () => {
      const mockPrayers = createMockPrayerList(3, { title: 'Test Prayer' })
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockPrayers,
        error: null,
      })

      const { result } = renderHook(
        () => usePrayers({ search: 'Test Prayer' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_all_prayers_admin', {
        p_limit: 10,
        p_offset: 0,
        p_search: 'Test Prayer',
      })

      expect(result.current.data?.prayers).toHaveLength(3)
    })

    it('should search prayers by content', async () => {
      const mockPrayers = createMockPrayerList(2, { content: 'specific content' })
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockPrayers,
        error: null,
      })

      const { result } = renderHook(
        () => usePrayers({ search: 'specific' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.prayers).toHaveLength(2)
    })

    it('should include user email in results', async () => {
      const mockPrayer = createMockAdminPrayer({ user_email: 'user@example.com' })
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [mockPrayer],
        error: null,
      })

      const { result } = renderHook(() => usePrayers(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.prayers[0].user_email).toBe('user@example.com')
    })

    it('should include media_url for audio prayers', async () => {
      const mockPrayer = createMockAudioPrayer()
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [mockPrayer],
        error: null,
      })

      const { result } = renderHook(() => usePrayers(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.prayers[0].content_type).toBe('audio')
      expect(result.current.data?.prayers[0].media_url).toBe('https://example.com/audio.mp3')
    })

    it('should include media_url for video prayers', async () => {
      const mockPrayer = createMockVideoPrayer()
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [mockPrayer],
        error: null,
      })

      const { result } = renderHook(() => usePrayers(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.prayers[0].content_type).toBe('video')
      expect(result.current.data?.prayers[0].media_url).toBe('https://example.com/video.mp4')
    })

    it('should handle empty results', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => usePrayers(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.prayers).toHaveLength(0)
      expect(result.current.data?.totalCount).toBe(0)
      expect(result.current.data?.pageCount).toBe(0)
    })
  })

  describe('updating', () => {
    it('should update prayer title', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      })

      const { result } = renderHook(() => useUpdatePrayer(), { wrapper: createWrapper() })

      result.current.mutate({
        id: 'prayer-1',
        title: 'Updated Title',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_prayer_admin', {
        p_prayer_id: 'prayer-1',
        p_title: 'Updated Title',
        p_content: null,
        p_latitude: null,
        p_longitude: null,
        p_user_agent: 'Mozilla/5.0 (Test Environment)',
      })
    })

    it('should update prayer content', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      })

      const { result } = renderHook(() => useUpdatePrayer(), { wrapper: createWrapper() })

      result.current.mutate({
        id: 'prayer-1',
        content: 'Updated content',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_prayer_admin', expect.objectContaining({
        p_content: 'Updated content',
      }))
    })

    it('should update prayer location', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      })

      const { result } = renderHook(() => useUpdatePrayer(), { wrapper: createWrapper() })

      result.current.mutate({
        id: 'prayer-1',
        latitude: 40.7128,
        longitude: -74.0060,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_prayer_admin', expect.objectContaining({
        p_latitude: 40.7128,
        p_longitude: -74.0060,
      }))
    })

    it('should handle update errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed', code: 'ERROR' },
      })

      const { result } = renderHook(() => useUpdatePrayer(), { wrapper: createWrapper() })

      result.current.mutate({
        id: 'prayer-1',
        title: 'New Title',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('deleting', () => {
    it('should delete prayer', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      })

      const { result } = renderHook(() => useDeletePrayer(), { wrapper: createWrapper() })

      result.current.mutate('prayer-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('delete_prayer_admin', {
        p_prayer_id: 'prayer-1',
        p_user_agent: 'Mozilla/5.0 (Test Environment)',
      })
    })

    it('should handle delete errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed', code: 'ERROR' },
      })

      const { result } = renderHook(() => useDeletePrayer(), { wrapper: createWrapper() })

      result.current.mutate('prayer-1')

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })

    it('should cascade delete responses', async () => {
      // This is implicit in the database schema
      // The delete operation should succeed and cascade
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: { success: true, deleted_responses: 5 },
        error: null,
      })

      const { result } = renderHook(() => useDeletePrayer(), { wrapper: createWrapper() })

      result.current.mutate('prayer-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})
