/**
 * useUsers Hook Tests
 * Tests for admin user management hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUsers, useUpdateUser } from '../useUsers'
import { mockSupabaseClient } from '../../test/setup'
import React from 'react'

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

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetching users', () => {
    it('should fetch all users with pagination', async () => {
      const mockUsers = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        display_name: `User ${i}`,
        avatar_url: null,
        created_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString(),
        prayer_count: i * 5,
        is_admin: false,
        admin_role: null,
        is_banned: false,
        ban_type: null,
        ban_reason: null,
        banned_at: null,
        total_count: 100,
      }))

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockUsers,
        error: null,
      })

      const { result } = renderHook(
        () => useUsers({ page: 0, pageSize: 10 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_all_users_admin', {
        p_limit: 10,
        p_offset: 0,
        p_search: null,
      })

      expect(result.current.data?.users).toHaveLength(10)
      expect(result.current.data?.totalCount).toBe(100)
    })

    it('should search users by email', async () => {
      const mockUsers = [{
        id: 'user-1',
        email: 'specific@example.com',
        display_name: 'Specific User',
        avatar_url: null,
        created_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString(),
        prayer_count: 10,
        is_admin: false,
        admin_role: null,
        is_banned: false,
        ban_type: null,
        ban_reason: null,
        banned_at: null,
        total_count: 1,
      }]

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockUsers,
        error: null,
      })

      const { result } = renderHook(
        () => useUsers({ search: 'specific@example.com' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_all_users_admin', expect.objectContaining({
        p_search: 'specific@example.com',
      }))

      expect(result.current.data?.users).toHaveLength(1)
      expect(result.current.data?.users[0].email).toBe('specific@example.com')
    })

    it('should include admin status', async () => {
      const mockUsers = [{
        id: 'admin-1',
        email: 'admin@example.com',
        display_name: 'Admin User',
        avatar_url: null,
        created_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString(),
        prayer_count: 0,
        is_admin: true,
        admin_role: 'admin',
        is_banned: false,
        ban_type: null,
        ban_reason: null,
        banned_at: null,
        total_count: 1,
      }]

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockUsers,
        error: null,
      })

      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.users[0].is_admin).toBe(true)
      expect(result.current.data?.users[0].admin_role).toBe('admin')
    })

    it('should include ban status', async () => {
      const mockUsers = [{
        id: 'user-1',
        email: 'banned@example.com',
        display_name: 'Banned User',
        avatar_url: null,
        created_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString(),
        prayer_count: 5,
        is_admin: false,
        admin_role: null,
        is_banned: true,
        ban_type: 'soft',
        ban_reason: 'Policy violation',
        banned_at: new Date().toISOString(),
        total_count: 1,
      }]

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockUsers,
        error: null,
      })

      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.users[0].is_banned).toBe(true)
      expect(result.current.data?.users[0].ban_type).toBe('soft')
      expect(result.current.data?.users[0].ban_reason).toBe('Policy violation')
    })
  })

  describe('updating users', () => {
    it('should update user display name', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      })

      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() })

      result.current.mutate({
        id: 'user-1',
        display_name: 'Updated Name',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_user_admin', {
        p_user_id: 'user-1',
        p_display_name: 'Updated Name',
        p_avatar_url: null,
        p_user_agent: 'Mozilla/5.0 (Test Environment)',
      })
    })

    it('should update user avatar', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      })

      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() })

      result.current.mutate({
        id: 'user-1',
        avatar_url: 'https://example.com/avatar.jpg',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_user_admin', expect.objectContaining({
        p_avatar_url: 'https://example.com/avatar.jpg',
      }))
    })

    it('should handle update errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed', code: 'ERROR' },
      })

      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() })

      result.current.mutate({
        id: 'user-1',
        display_name: 'New Name',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })
})
