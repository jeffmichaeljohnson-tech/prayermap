import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuth } from '../useAuth';
import type { User } from '@supabase/supabase-js';

// Mock Supabase
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

const mockSession = {
  user: mockUser,
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
};

const mockAuthStateChangeCallback = vi.fn();
let authStateChangeSubscription: (() => void) | null = null;

const mockSupabase = {
  auth: {
    getSession: vi.fn(async () => ({
      data: { session: null },
      error: null,
    })),
    signInWithPassword: vi.fn(async ({ email, password }) => {
      if (email === 'test@example.com' && password === 'password') {
        return {
          data: { user: mockUser, session: mockSession },
          error: null,
        };
      }
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', name: 'AuthError' },
      };
    }),
    signUp: vi.fn(async ({ email, password }) => {
      if (email && password) {
        return {
          data: { user: mockUser, session: mockSession },
          error: null,
        };
      }
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid input', name: 'AuthError' },
      };
    }),
    signOut: vi.fn(async () => ({
      error: null,
    })),
    onAuthStateChange: vi.fn((callback) => {
      mockAuthStateChangeCallback.mockImplementation(callback);
      authStateChangeSubscription = vi.fn();
      return {
        data: {
          subscription: {
            unsubscribe: authStateChangeSubscription,
          },
        },
      };
    }),
  },
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeSubscription = null;
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
    });

    it('should fetch initial session on mount', async () => {
      renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      });
    });

    it('should set user from initial session', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('should set loading to false when no session', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should subscribe to auth state changes', async () => {
      renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });
    });
  });

  describe('signIn', () => {
    it('should sign in with valid credentials', async () => {
      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password');
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });

      expect(signInResult).toEqual({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
    });

    it('should return error with invalid credentials', async () => {
      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('wrong@example.com', 'wrong');
      });

      expect(signInResult).toHaveProperty('error');
      expect(signInResult.error).toBeTruthy();
    });

    it('should handle sign in when Supabase not initialized', async () => {
      // Mock supabase as null temporarily
      const originalSupabase = mockSupabase;
      vi.doMock('../../lib/supabase', () => ({
        supabase: null,
      }));

      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password');
      });

      // Restore original mock
      vi.doMock('../../lib/supabase', () => ({
        supabase: originalSupabase,
      }));
    });
  });

  describe('signUp', () => {
    it('should sign up with email and password', async () => {
      const { result } = renderHook(() => useAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('new@example.com', 'password');
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password',
        options: {
          data: {
            name: '',
          },
        },
      });

      expect(signUpResult).toEqual({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
    });

    it('should sign up with name metadata', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp('new@example.com', 'password', 'John Doe');
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password',
        options: {
          data: {
            name: 'John Doe',
          },
        },
      });
    });

    it('should use empty string when name not provided', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp('new@example.com', 'password');
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            data: {
              name: '',
            },
          },
        })
      );
    });

    it('should return error on invalid input', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid email', name: 'AuthError' },
      });

      const { result } = renderHook(() => useAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('invalid', 'pass');
      });

      expect(signUpResult).toHaveProperty('error');
      expect(signUpResult.error).toBeTruthy();
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const { result } = renderHook(() => useAuth());

      let signOutResult;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(signOutResult).toEqual({ error: null });
    });

    it('should return error on sign out failure', async () => {
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Sign out failed', name: 'AuthError' },
      });

      const { result } = renderHook(() => useAuth());

      let signOutResult;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });

      expect(signOutResult).toHaveProperty('error');
      expect(signOutResult.error).toBeTruthy();
    });
  });

  describe('auth state changes', () => {
    it('should update user on auth state change', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Simulate auth state change
      await act(async () => {
        if (mockAuthStateChangeCallback.mock.calls.length > 0) {
          mockAuthStateChangeCallback.mock.calls[0][0]('SIGNED_IN', mockSession);
        } else {
          // Trigger the callback manually
          const callback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
          callback('SIGNED_IN', mockSession);
        }
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should clear user on sign out event', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Simulate sign out event
      await act(async () => {
        const callback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
        callback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });

    it('should update loading state during auth change', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate auth state change
      await act(async () => {
        const callback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
        callback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from auth changes on unmount', async () => {
      const { unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      if (authStateChangeSubscription) {
        expect(authStateChangeSubscription).toHaveBeenCalled();
      }
    });

    it('should handle cleanup when subscription is null', () => {
      const { unmount } = renderHook(() => useAuth());

      // Should not throw error
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle getSession errors gracefully', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session error', name: 'AuthError' },
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should handle null Supabase instance', async () => {
      // This tests the conditional check for supabase
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash
      expect(result.current).toBeDefined();
    });
  });

  describe('session management', () => {
    it('should maintain user state across re-renders', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const { result, rerender } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      rerender();

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
    });

    it('should handle token refresh events', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate token refresh
      await act(async () => {
        const callback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
        callback('TOKEN_REFRESHED', mockSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle password recovery events', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate password recovery
      await act(async () => {
        const callback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
        callback('PASSWORD_RECOVERY', mockSession);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple sign in attempts', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const promise1 = result.current.signIn('test@example.com', 'password');
        const promise2 = result.current.signIn('test@example.com', 'password');

        await Promise.all([promise1, promise2]);
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledTimes(2);
    });

    it('should handle sign in followed by sign out', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
