/* eslint-disable react-refresh/only-export-components */
/**
 * Custom render utilities for testing React components
 * Provides components with all necessary providers and context
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import type { User, Session } from '@supabase/supabase-js';

// ============================================================================
// Type Definitions
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial authenticated user state
   */
  user?: User | null;

  /**
   * Initial session state
   */
  session?: Session | null;

  /**
   * Whether the auth state is still loading
   */
  authLoading?: boolean;

  /**
   * Custom QueryClient instance
   */
  queryClient?: QueryClient;

  /**
   * Additional wrapper components
   */
  wrapper?: React.ComponentType<{ children: ReactNode }>;
}

interface CustomRenderResult extends RenderResult {
  /**
   * User event instance for simulating user interactions
   */
  user: ReturnType<typeof userEvent.setup>;
}

// ============================================================================
// Provider Setup
// ============================================================================

/**
 * Create a default QueryClient for testing
 * Configured with no retries and reduced timeouts for faster tests
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * All providers wrapper component
 */
function AllProviders({
  children,
  options,
}: {
  children: ReactNode;
  options: CustomRenderOptions;
}) {
  const queryClient = options.queryClient || createTestQueryClient();

  // If a custom wrapper is provided, use it
  const Wrapper = options.wrapper;
  const content = Wrapper ? <Wrapper>{children}</Wrapper> : children;

  return (
    <QueryClientProvider client={queryClient}>
      {content}
    </QueryClientProvider>
  );
}

// ============================================================================
// Custom Render Function
// ============================================================================

/**
 * Custom render function that wraps components with all necessary providers
 * @param ui - React element to render
 * @param options - Custom render options
 * @returns Render result with additional user event utilities
 */
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult {
  const userEventInstance = userEvent.setup();

  const result = render(ui, {
    wrapper: ({ children }) => <AllProviders options={options}>{children}</AllProviders>,
    ...options,
  });

  return {
    ...result,
    user: userEventInstance,
  };
}

/**
 * Render a component with authenticated user context
 */
export function renderWithAuth(
  ui: ReactElement,
  user?: User,
  options: CustomRenderOptions = {}
): CustomRenderResult {
  const mockUser = user || {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: { name: 'Test User' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User;

  const mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: mockUser,
  } as Session;

  return customRender(ui, {
    ...options,
    user: mockUser,
    session: mockSession,
    authLoading: false,
  });
}

/**
 * Render a component with unauthenticated state
 */
export function renderWithoutAuth(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult {
  return customRender(ui, {
    ...options,
    user: null,
    session: null,
    authLoading: false,
  });
}

/**
 * Render a component with loading auth state
 */
export function renderWithAuthLoading(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult {
  return customRender(ui, {
    ...options,
    user: null,
    session: null,
    authLoading: true,
  });
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wait for loading states to complete
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForLoadingToFinish(timeout = 5000): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkLoading = () => {
      const loadingElements = document.querySelectorAll(
        '[data-testid="loading"], [aria-busy="true"], .loading'
      );

      if (loadingElements.length === 0) {
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error('Timeout waiting for loading to finish'));
      } else {
        setTimeout(checkLoading, 100);
      }
    };

    checkLoading();
  });
}

/**
 * Simulate authentication state change
 */
export function simulateAuthStateChange(
  user: User | null,
  session: Session | null = null
): void {
  // This would be used with a mock auth provider
  // Implementation depends on how AuthContext is mocked
  const event = new CustomEvent('auth-state-change', {
    detail: { user, session },
  });
  window.dispatchEvent(event);
}

/**
 * Create a mock file for upload testing
 */
export function createMockFile(
  name: string,
  type: string,
  size = 1024
): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

/**
 * Create a mock image file
 */
export function createMockImageFile(name = 'test.jpg', size = 1024): File {
  return createMockFile(name, 'image/jpeg', size);
}

/**
 * Create a mock audio file
 */
export function createMockAudioFile(name = 'test.webm', size = 4096): File {
  return createMockFile(name, 'audio/webm', size);
}

/**
 * Create a mock video file
 */
export function createMockVideoFile(name = 'test.webm', size = 8192): File {
  return createMockFile(name, 'video/webm', size);
}

// ============================================================================
// Query Utilities
// ============================================================================

/**
 * Wait for a specific query to be successful
 */
export async function waitForQuerySuccess(
  queryClient: QueryClient,
  queryKey: unknown[],
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkQuery = () => {
      const query = queryClient.getQueryState(queryKey);

      if (query?.status === 'success') {
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error(`Timeout waiting for query ${JSON.stringify(queryKey)} to succeed`));
      } else {
        setTimeout(checkQuery, 50);
      }
    };

    checkQuery();
  });
}

/**
 * Wait for a mutation to complete
 */
export async function waitForMutation(
  timeout = 5000
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.min(100, timeout));
  });
}

/**
 * Clear all queries in the query client
 */
export function clearAllQueries(queryClient: QueryClient): void {
  queryClient.clear();
}

// ============================================================================
// Re-export everything from @testing-library/react
// ============================================================================

export * from '@testing-library/react';

// Override the default render with our custom render
export { customRender as render };
