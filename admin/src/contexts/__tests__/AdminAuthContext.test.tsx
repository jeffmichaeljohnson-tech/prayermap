/**
 * AdminAuthContext Tests
 * Tests for admin authentication context
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AdminAuthProvider, useAdminAuth } from '../AdminAuthContext'
import { mockSupabaseClient } from '../../test/setup'
import { createMockAuthUser, createMockSession } from '../../test/factories'
import React from 'react'

// Test component to access auth context
function TestComponent() {
  const { user, isAdmin, loading, session } = useAdminAuth()

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="isAdmin">{isAdmin ? 'admin' : 'not-admin'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="session">{session ? 'has-session' : 'no-session'}</div>
    </div>
  )
}

describe('AdminAuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('authentication', () => {
    it('should check admin role on login', async () => {
      const mockUser = createMockAuthUser({ email: 'admin@example.com' })
      const mockSession = createMockSession(mockUser)

      // Mock successful login
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      // Mock admin role check
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: 'admin',
        error: null,
      })

      const { result } = useAuthSetup()

      await result.signIn('admin@example.com', 'password')

      await waitFor(() => {
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('check_user_admin_role', {
          check_user_id: mockUser.id,
        })
      })
    })

    it('should reject non-admin users', async () => {
      const mockUser = createMockAuthUser({ email: 'user@example.com' })
      const mockSession = createMockSession(mockUser)

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      // Mock non-admin check (returns null)
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({
        error: null,
      })

      const { result } = useAuthSetup()

      const signInResult = await result.signIn('user@example.com', 'password')

      expect(signInResult.success).toBe(false)
      expect(signInResult.error).toBe('You do not have admin privileges')
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('should accept admin users', async () => {
      const mockUser = createMockAuthUser({ email: 'admin@example.com' })
      const mockSession = createMockSession(mockUser)

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: 'admin',
        error: null,
      })

      const { result } = useAuthSetup()

      const signInResult = await result.signIn('admin@example.com', 'password')

      expect(signInResult.success).toBe(true)
      expect(signInResult.error).toBeUndefined()
    })

    it('should accept moderator users', async () => {
      const mockUser = createMockAuthUser({ email: 'moderator@example.com' })
      const mockSession = createMockSession(mockUser)

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: 'moderator',
        error: null,
      })

      const { result } = useAuthSetup()

      const signInResult = await result.signIn('moderator@example.com', 'password')

      expect(signInResult.success).toBe(true)
    })

    it('should store session', async () => {
      const mockUser = createMockAuthUser()
      const mockSession = createMockSession(mockUser)

      let authStateCallback: ((event: string, session: unknown) => void) | undefined

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        }
      })

      render(
        <AdminAuthProvider>
          <TestComponent />
        </AdminAuthProvider>
      )

      // Mock admin role check
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: 'admin',
        error: null,
      })

      // Trigger auth state change
      await authStateCallback?.('SIGNED_IN', mockSession)

      await waitFor(() => {
        expect(screen.getByTestId('session').textContent).toBe('has-session')
      })
    })
  })

  describe('authorization', () => {
    it('should provide isAdmin flag', async () => {
      const mockUser = createMockAuthUser()
      const mockSession = createMockSession(mockUser)

      let authStateCallback: ((event: string, session: unknown) => void) | undefined

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        }
      })

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: 'admin',
        error: null,
      })

      render(
        <AdminAuthProvider>
          <TestComponent />
        </AdminAuthProvider>
      )

      await authStateCallback?.('SIGNED_IN', mockSession)

      await waitFor(() => {
        expect(screen.getByTestId('isAdmin').textContent).toBe('admin')
      })
    })

    it('should provide user role', async () => {
      const mockUser = createMockAuthUser()

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: 'moderator',
        error: null,
      })

      const { result } = useAuthSetup()
      const role = await result.checkAdminStatus(mockUser.id)

      expect(role).toBe('moderator')
    })

    it('should handle session expiry', async () => {
      let authStateCallback: ((event: string, session: unknown) => void) | undefined

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        }
      })

      render(
        <AdminAuthProvider>
          <TestComponent />
        </AdminAuthProvider>
      )

      // Trigger sign out (session expiry)
      await authStateCallback?.('SIGNED_OUT', null)

      await waitFor(() => {
        expect(screen.getByTestId('session').textContent).toBe('no-session')
        expect(screen.getByTestId('isAdmin').textContent).toBe('not-admin')
      })
    })
  })

  describe('logout', () => {
    it('should clear session', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({
        error: null,
      })

      const { result } = useAuthSetup()

      await result.signOut()

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('should redirect to login', async () => {
      let authStateCallback: ((event: string, session: unknown) => void) | undefined

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        }
      })

      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({
        error: null,
      })

      render(
        <AdminAuthProvider>
          <TestComponent />
        </AdminAuthProvider>
      )

      const { result } = useAuthSetup()

      await result.signOut()

      // Trigger auth state change
      await authStateCallback?.('SIGNED_OUT', null)

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('no-user')
        expect(screen.getByTestId('isAdmin').textContent).toBe('not-admin')
      })
    })
  })
})

// Helper to get auth context methods
function useAuthSetup() {
  let contextValue: ReturnType<typeof useAdminAuth>

  function TestWrapper() {
    contextValue = useAdminAuth()
    return null
  }

  render(
    <AdminAuthProvider>
      <TestWrapper />
    </AdminAuthProvider>
  )

  return contextValue
}
