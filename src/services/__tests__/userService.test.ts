/**
 * Comprehensive Unit Tests for UserService
 *
 * Tests ALL user-related functions with 100% coverage including:
 * - User profile operations
 * - Password management
 * - Suggestions/feedback
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UserProfile } from '../userService';

// Mock Supabase - define mocks inside the factory to avoid hoisting issues
vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      auth: {
        updateUser: vi.fn(),
        resetPasswordForEmail: vi.fn(),
      },
    },
  };
});

import * as userService from '../userService';
import { supabase } from '../../lib/supabase';

// Helper functions
function createMockUserProfile(overrides = {}): UserProfile {
  return {
    id: 'user-123',
    display_name: 'John Doe',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockQueryBuilder(data: any, error: any = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  return builder;
}

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock window.location for password reset
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserProfile', () => {
    it('should fetch user profile by id', async () => {
      const mockProfile = createMockUserProfile();
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.getUserProfile('user-123');

      expect(builder.select).toHaveBeenCalledWith('*');
      expect(builder.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(result).toEqual(mockProfile);
    });

    it('should return profile with all fields', async () => {
      const mockProfile = createMockUserProfile({
        display_name: 'Jane Smith',
        avatar_url: 'https://example.com/jane.jpg',
      });
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.getUserProfile('user-123');

      expect(result).toMatchObject({
        id: 'user-123',
        display_name: 'Jane Smith',
        avatar_url: 'https://example.com/jane.jpg',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should handle null display_name', async () => {
      const mockProfile = createMockUserProfile({ display_name: null });
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.getUserProfile('user-123');

      expect(result?.display_name).toBeNull();
    });

    it('should handle null avatar_url', async () => {
      const mockProfile = createMockUserProfile({ avatar_url: null });
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.getUserProfile('user-123');

      expect(result?.avatar_url).toBeNull();
    });

    it('should return null when profile not found', async () => {
      const builder = mockQueryBuilder(null, { message: 'Profile not found', code: 'PGRST116' });
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.getUserProfile('user-999');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching user profile:',
        expect.objectContaining({ message: 'Profile not found' })
      );
    });

    it('should handle database error', async () => {
      const builder = mockQueryBuilder(null, { message: 'Database connection failed', code: '08006' });
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.getUserProfile('user-123');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Network timeout')),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.getUserProfile('user-123');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch user profile:',
        expect.any(Error)
      );
    });

    it('should handle invalid user ID', async () => {
      const builder = mockQueryBuilder(null, { message: 'Invalid UUID' });
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.getUserProfile('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      const mockProfile = createMockUserProfile({
        display_name: 'Updated Name',
      });
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.updateUserProfile('user-123', {
        display_name: 'Updated Name',
      });

      expect(builder.update).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(result?.display_name).toBe('Updated Name');
    });

    it('should only update provided fields', async () => {
      const mockProfile = createMockUserProfile({
        display_name: 'New Name',
      });
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      await userService.updateUserProfile('user-123', {
        display_name: 'New Name',
      });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'New Name',
          updated_at: expect.any(String),
        })
      );
    });

    it('should update avatar_url', async () => {
      const mockProfile = createMockUserProfile({
        avatar_url: 'https://example.com/new-avatar.jpg',
      });
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.updateUserProfile('user-123', {
        avatar_url: 'https://example.com/new-avatar.jpg',
      });

      expect(result?.avatar_url).toBe('https://example.com/new-avatar.jpg');
    });

    it('should update both display_name and avatar_url', async () => {
      const mockProfile = createMockUserProfile({
        display_name: 'New Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
      });
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.updateUserProfile('user-123', {
        display_name: 'New Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
      });

      expect(result?.display_name).toBe('New Name');
      expect(result?.avatar_url).toBe('https://example.com/new-avatar.jpg');
    });

    it('should set updated_at timestamp', async () => {
      const mockProfile = createMockUserProfile();
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      await userService.updateUserProfile('user-123', {
        display_name: 'Test',
      });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      );
    });

    it('should handle profile not found', async () => {
      const builder = mockQueryBuilder(null, { message: 'Profile not found', code: 'PGRST116' });
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.updateUserProfile('user-999', {
        display_name: 'Test',
      });

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Error updating user profile:',
        expect.any(Object)
      );
    });

    it('should handle database constraint violation', async () => {
      const builder = mockQueryBuilder(null, { message: 'Constraint violation', code: '23505' });
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.updateUserProfile('user-123', {
        display_name: 'Test',
      });

      expect(result).toBeNull();
    });

    it('should handle network error', async () => {
      const builder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Connection lost')),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.updateUserProfile('user-123', {
        display_name: 'Test',
      });

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to update user profile:',
        expect.any(Error)
      );
    });

    it('should handle empty updates object', async () => {
      const mockProfile = createMockUserProfile();
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.updateUserProfile('user-123', {});

      expect(result).not.toBeNull();
      expect(builder.update).toHaveBeenCalled();
    });

    it('should handle null values in updates', async () => {
      const mockProfile = createMockUserProfile({
        display_name: null,
        avatar_url: null,
      });
      const builder = mockQueryBuilder(mockProfile);
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.updateUserProfile('user-123', {
        display_name: null,
        avatar_url: null,
      } as any);

      expect(result?.display_name).toBeNull();
      expect(result?.avatar_url).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({ error: null } as any);

      const result = await userService.changePassword('newSecurePassword123');

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newSecurePassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should return success true on successful change', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({ error: null, data: {} } as any);

      const result = await userService.changePassword('newPassword456');

      expect(result).toEqual({ success: true });
      expect(result.error).toBeUndefined();
    });

    it('should handle auth error', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        error: { message: 'Password too weak' }
      } as any);

      const result = await userService.changePassword('weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password too weak');
      expect(console.error).toHaveBeenCalledWith(
        'Error changing password:',
        expect.objectContaining({ message: 'Password too weak' })
      );
    });

    it('should handle invalid password format', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        error: { message: 'Password must be at least 6 characters' }
      } as any);

      const result = await userService.changePassword('123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 6 characters');
    });

    it('should handle network error', async () => {
      vi.mocked(supabase.auth.updateUser).mockRejectedValueOnce(new Error('Network error'));

      const result = await userService.changePassword('newPassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to change password');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to change password:',
        expect.any(Error)
      );
    });

    it('should handle session expired error', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        error: { message: 'Session expired' }
      } as any);

      const result = await userService.changePassword('newPassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired');
    });

    it('should handle empty password', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        error: { message: 'Password is required' }
      } as any);

      const result = await userService.changePassword('');

      expect(result.success).toBe(false);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({ error: null } as any);

      const result = await userService.sendPasswordResetEmail('user@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        { redirectTo: 'https://example.com/reset-password' }
      );
      expect(result.success).toBe(true);
    });

    it('should use correct redirect URL', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({ error: null } as any);

      await userService.sendPasswordResetEmail('user@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          redirectTo: 'https://example.com/reset-password'
        })
      );
    });

    it('should handle invalid email format', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        error: { message: 'Invalid email format' }
      } as any);

      const result = await userService.sendPasswordResetEmail('invalid-email');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should handle user not found', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        error: { message: 'User not found' }
      } as any);

      const result = await userService.sendPasswordResetEmail('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle rate limiting', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        error: { message: 'Email rate limit exceeded' }
      } as any);

      const result = await userService.sendPasswordResetEmail('user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email rate limit exceeded');
    });

    it('should handle network error', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await userService.sendPasswordResetEmail('user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send password reset email');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to send password reset email:',
        expect.any(Error)
      );
    });

    it('should handle SMTP error', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        error: { message: 'SMTP server unavailable' }
      } as any);

      const result = await userService.sendPasswordResetEmail('user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP server unavailable');
    });

    it('should return success without error field', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({ error: null } as any);

      const result = await userService.sendPasswordResetEmail('user@example.com');

      expect(result).toEqual({ success: true });
      expect(result.error).toBeUndefined();
    });
  });

  describe('submitSuggestion', () => {
    it('should submit suggestion to database', async () => {
      const builder = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.submitSuggestion(
        'user-123',
        'Great app! Please add dark mode.',
        'user@example.com'
      );

      expect(builder.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        user_email: 'user@example.com',
        content: 'Great app! Please add dark mode.',
      });
      expect(result.success).toBe(true);
    });

    it('should include user email when provided', async () => {
      const builder = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      await userService.submitSuggestion(
        'user-123',
        'Suggestion text',
        'test@example.com'
      );

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_email: 'test@example.com',
        })
      );
    });

    it('should handle missing user email', async () => {
      const builder = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      await userService.submitSuggestion('user-123', 'Suggestion text');

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          content: 'Suggestion text',
          user_email: undefined,
        })
      );
    });

    it('should handle table not exists error gracefully', async () => {
      const builder = {
        insert: vi.fn().mockResolvedValue({
          error: { message: 'relation "suggestions" does not exist', code: '42P01' }
        }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.submitSuggestion(
        'user-123',
        'Suggestion text'
      );

      expect(result.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        'Suggestion received (table not created):',
        'Suggestion text'
      );
    });

    it('should handle database error', async () => {
      const builder = {
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Insert failed', code: '23000' }
        }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.submitSuggestion(
        'user-123',
        'Suggestion text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });

    it('should handle network error', async () => {
      const builder = {
        insert: vi.fn().mockRejectedValue(new Error('Connection lost')),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.submitSuggestion(
        'user-123',
        'Suggestion text'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to submit suggestion');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to submit suggestion:',
        expect.any(Error)
      );
    });

    it('should handle empty suggestion content', async () => {
      const builder = {
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Content cannot be empty' }
        }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.submitSuggestion('user-123', '');

      expect(result.success).toBe(false);
    });

    it('should handle long suggestion text', async () => {
      const longText = 'a'.repeat(10000);
      const builder = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.submitSuggestion('user-123', longText);

      expect(result.success).toBe(true);
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: longText,
        })
      );
    });

    it('should handle special characters in suggestion', async () => {
      const builder = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const specialText = 'Test with special chars: <script>alert("xss")</script>';
      await userService.submitSuggestion('user-123', specialText);

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: specialText,
        })
      );
    });

    it('should handle constraint violation', async () => {
      const builder = {
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Constraint violation', code: '23505' }
        }),
      };
      vi.mocked(supabase.from).mockReturnValueOnce(builder as any);

      const result = await userService.submitSuggestion(
        'user-123',
        'Duplicate suggestion'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Constraint violation');
    });
  });
});
