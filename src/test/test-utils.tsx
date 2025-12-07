/**
 * Test Utilities
 *
 * Custom render function with providers for testing React components.
 */

import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a fresh QueryClient for each test
function createTestQueryClient() {
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
  })
}

interface AllProvidersProps {
  children: React.ReactNode
}

function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

/**
 * Custom render function that wraps components with all necessary providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const mockPrayer = {
  id: 'prayer-123',
  user_id: 'user-456',
  title: 'Test Prayer',
  content: 'Please pray for this test',
  content_type: 'text' as const,
  media_url: null,
  location: { lat: 37.7749, lng: -122.4194 },
  is_anonymous: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  status: 'active' as const,
  user_name: 'Test User',
}

export const mockUser = {
  id: 'user-456',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
}

export const mockPrayerConnection = {
  id: 'connection-789',
  prayer_id: 'prayer-123',
  from_user_id: 'user-789',
  to_user_id: 'user-456',
  from_location: { lat: 37.7849, lng: -122.4094 },
  to_location: { lat: 37.7749, lng: -122.4194 },
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
}
