/**
 * Comprehensive Supabase client mock for testing
 * Provides full mock coverage for auth, database, storage, and realtime features
 */

import { vi } from 'vitest';
import type { AuthError, User, Session } from '@supabase/supabase-js';

// ============================================================================
// Type Definitions
// ============================================================================

interface MockAuthResponse<T = User> {
  data: { user: T | null; session: Session | null };
  error: AuthError | null;
}

interface MockDataResponse<T = unknown> {
  data: T | null;
  error: Error | null;
}

interface MockStorageResponse {
  data: { path: string } | null;
  error: Error | null;
}

// ============================================================================
// Request Tracking
// ============================================================================

/**
 * Request tracker for assertions in tests
 */
export const requestTracker = {
  requests: [] as Array<{ type: string; data: unknown }>,
  reset: () => {
    requestTracker.requests = [];
  },
  add: (type: string, data: unknown) => {
    requestTracker.requests.push({ type, data });
  },
};

// ============================================================================
// Mock User and Session Factories
// ============================================================================

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: overrides?.id || 'test-user-id',
    app_metadata: {},
    user_metadata: { name: 'Test User', ...overrides?.user_metadata },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides?: Partial<Session>): Session {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  } as Session;
}

// ============================================================================
// Mock Auth Client
// ============================================================================

/**
 * Mock authentication client
 */
export const mockAuth = {
  signInWithPassword: vi.fn(
    async ({ email, password }: { email: string; password: string }): Promise<MockAuthResponse> => {
      requestTracker.add('auth.signInWithPassword', { email, password });

      if (email === 'error@test.com') {
        return {
          data: { user: null, session: null },
          error: new Error('Invalid credentials') as AuthError,
        };
      }

      const user = createMockUser({ email });
      const session = createMockSession({ user });

      return {
        data: { user, session },
        error: null,
      };
    }
  ),

  signUp: vi.fn(
    async ({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }): Promise<MockAuthResponse> => {
      requestTracker.add('auth.signUp', { email, password, options });

      if (email === 'exists@test.com') {
        return {
          data: { user: null, session: null },
          error: new Error('User already exists') as AuthError,
        };
      }

      const user = createMockUser({ email, user_metadata: options?.data });
      const session = createMockSession({ user });

      return {
        data: { user, session },
        error: null,
      };
    }
  ),

  signOut: vi.fn(async (): Promise<{ error: AuthError | null }> => {
    requestTracker.add('auth.signOut', {});
    return { error: null };
  }),

  getSession: vi.fn(async (): Promise<MockAuthResponse<Session>> => {
    requestTracker.add('auth.getSession', {});
    const session = createMockSession();
    return {
      data: { user: session.user, session },
      error: null,
    };
  }),

  getUser: vi.fn(async (): Promise<MockAuthResponse> => {
    requestTracker.add('auth.getUser', {});
    const user = createMockUser();
    return {
      data: { user, session: null },
      error: null,
    };
  }),

  onAuthStateChange: vi.fn((callback: (event: string, session: Session | null) => void) => {
    requestTracker.add('auth.onAuthStateChange', {});
    // Immediately call with current session
    setTimeout(() => {
      callback('SIGNED_IN', createMockSession());
    }, 0);

    return {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
  }),

  signInWithOAuth: vi.fn(
    async ({
      provider,
      options,
    }: {
      provider: string;
      options?: { redirectTo?: string };
    }): Promise<{ data: { url: string | null }; error: AuthError | null }> => {
      requestTracker.add('auth.signInWithOAuth', { provider, options });
      return {
        data: { url: `https://oauth-provider.com/${provider}` },
        error: null,
      };
    }
  ),

  resetPasswordForEmail: vi.fn(
    async (email: string): Promise<{ error: AuthError | null }> => {
      requestTracker.add('auth.resetPasswordForEmail', { email });
      return { error: null };
    }
  ),

  updateUser: vi.fn(
    async (attributes: Partial<User>): Promise<MockAuthResponse> => {
      requestTracker.add('auth.updateUser', attributes);
      const user = createMockUser(attributes);
      return {
        data: { user, session: createMockSession({ user }) },
        error: null,
      };
    }
  ),
};

// ============================================================================
// Mock Database Query Builder
// ============================================================================

/**
 * Mock query builder with chainable methods
 */
class MockQueryBuilder<T = unknown> {
  private filters: Array<{ column: string; value: unknown; operator: string }> = [];
  private mockData: T[] = [];
  private shouldError = false;
  private errorMessage = 'Database error';

  constructor(mockData: T[] = []) {
    this.mockData = mockData;
  }

  select(columns = '*'): this {
    requestTracker.add('db.select', { columns });
    return this;
  }

  insert(data: Partial<T> | Partial<T>[]): this {
    requestTracker.add('db.insert', { data });
    return this;
  }

  update(data: Partial<T>): this {
    requestTracker.add('db.update', { data });
    return this;
  }

  delete(): this {
    requestTracker.add('db.delete', {});
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value, operator: 'eq' });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ column, value, operator: 'neq' });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ column, value: values, operator: 'in' });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push({ column, value, operator: 'gt' });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ column, value, operator: 'gte' });
    return this;
  }

  lt(column: string, value: unknown): this {
    this.filters.push({ column, value, operator: 'lt' });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ column, value, operator: 'lte' });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    requestTracker.add('db.order', { column, options });
    return this;
  }

  limit(count: number): this {
    requestTracker.add('db.limit', { count });
    return this;
  }

  single(): Promise<MockDataResponse<T>> {
    if (this.shouldError) {
      return Promise.resolve({ data: null, error: new Error(this.errorMessage) });
    }
    const data = this.mockData[0] || null;
    return Promise.resolve({ data, error: null });
  }

  maybeSingle(): Promise<MockDataResponse<T>> {
    if (this.shouldError) {
      return Promise.resolve({ data: null, error: new Error(this.errorMessage) });
    }
    const data = this.mockData[0] || null;
    return Promise.resolve({ data, error: null });
  }

  async then<TResult1 = MockDataResponse<T[]>, TResult2 = never>(
    onfulfilled?: ((value: MockDataResponse<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    if (this.shouldError) {
      const response = { data: null, error: new Error(this.errorMessage) };
      return Promise.resolve(response).then(onfulfilled, onrejected);
    }

    const response = { data: this.mockData, error: null };
    return Promise.resolve(response).then(onfulfilled, onrejected);
  }

  setError(message: string): this {
    this.shouldError = true;
    this.errorMessage = message;
    return this;
  }
}

// ============================================================================
// Mock Database Client
// ============================================================================

/**
 * Mock database client
 */
export const mockDatabase = {
  from: vi.fn(<T = unknown>(table: string, mockData: T[] = []): MockQueryBuilder<T> => {
    requestTracker.add('db.from', { table });
    return new MockQueryBuilder<T>(mockData);
  }),

  rpc: vi.fn(
    async <T = unknown>(
      functionName: string,
      params?: Record<string, unknown>
    ): Promise<MockDataResponse<T>> => {
      requestTracker.add('db.rpc', { functionName, params });

      // Simulate different RPC responses
      if (functionName === 'get_nearby_prayers') {
        return { data: [] as T, error: null };
      }

      if (functionName === 'create_prayer_connection') {
        return {
          data: {
            id: 'mock-connection-id',
            prayer_id: params?.p_prayer_id,
            created_at: new Date().toISOString(),
          } as T,
          error: null,
        };
      }

      return { data: null as T, error: null };
    }
  ),
};

// ============================================================================
// Mock Storage Client
// ============================================================================

/**
 * Mock storage client
 */
export const mockStorage = {
  from: vi.fn((bucket: string) => {
    requestTracker.add('storage.from', { bucket });

    return {
      upload: vi.fn(
        async (path: string, file: File | Blob): Promise<MockStorageResponse> => {
          requestTracker.add('storage.upload', { path, file });

          if (path.includes('error')) {
            return { data: null, error: new Error('Upload failed') };
          }

          return {
            data: { path: `${bucket}/${path}` },
            error: null,
          };
        }
      ),

      download: vi.fn(async (path: string): Promise<MockDataResponse<Blob>> => {
        requestTracker.add('storage.download', { path });

        if (path.includes('error')) {
          return { data: null, error: new Error('Download failed') };
        }

        const blob = new Blob(['mock file content'], { type: 'application/octet-stream' });
        return { data: blob, error: null };
      }),

      getPublicUrl: vi.fn((path: string): { data: { publicUrl: string } } => {
        requestTracker.add('storage.getPublicUrl', { path });
        return {
          data: { publicUrl: `https://mock-storage.com/${bucket}/${path}` },
        };
      }),

      remove: vi.fn(async (paths: string[]): Promise<MockDataResponse<unknown>> => {
        requestTracker.add('storage.remove', { paths });
        return { data: {}, error: null };
      }),

      list: vi.fn(
        async (
          path?: string
        ): Promise<MockDataResponse<Array<{ name: string; id: string }>>> => {
          requestTracker.add('storage.list', { path });
          return {
            data: [
              { name: 'file1.mp3', id: 'file1' },
              { name: 'file2.mp4', id: 'file2' },
            ],
            error: null,
          };
        }
      ),
    };
  }),
};

// ============================================================================
// Mock Realtime Client
// ============================================================================

/**
 * Mock realtime channel
 */
export const mockRealtime = {
  channel: vi.fn((name: string) => {
    requestTracker.add('realtime.channel', { name });

    return {
      on: vi.fn(function (
        this: unknown,
        event: string,
        filter: unknown,
        callback: (payload: unknown) => void
      ) {
        requestTracker.add('realtime.on', { event, filter });
        // Simulate realtime event after subscription
        setTimeout(() => {
          callback({
            eventType: event,
            new: { id: 'mock-record', data: 'mock-data' },
            old: {},
          });
        }, 100);
        return this;
      }),

      subscribe: vi.fn((callback?: () => void) => {
        requestTracker.add('realtime.subscribe', {});
        setTimeout(() => callback?.(), 0);
        return { unsubscribe: vi.fn() };
      }),

      unsubscribe: vi.fn(async () => {
        requestTracker.add('realtime.unsubscribe', {});
        return { error: null };
      }),
    };
  }),
};

// ============================================================================
// Mock Supabase Client
// ============================================================================

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient() {
  return {
    auth: mockAuth,
    from: mockDatabase.from,
    rpc: mockDatabase.rpc,
    storage: mockStorage,
    channel: mockRealtime.channel,
  };
}

/**
 * Default mock Supabase client export
 */
export const mockSupabase = createMockSupabaseClient();

/**
 * Mock createClient function
 */
export const createClient = vi.fn(() => createMockSupabaseClient());
