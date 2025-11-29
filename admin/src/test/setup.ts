/**
 * Test Setup
 * Configures test environment and mocks for Vitest
 */

import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({
        data: { user: null },
        error: null,
      })
    ),
    getSession: vi.fn(() =>
      Promise.resolve({
        data: { session: null },
        error: null,
      })
    ),
    signInWithPassword: vi.fn(() =>
      Promise.resolve({
        data: { user: null, session: null },
        error: null,
      })
    ),
    signOut: vi.fn(() =>
      Promise.resolve({
        error: null,
      })
    ),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() =>
      Promise.resolve({
        data: null,
        error: null,
      })
    ),
    order: vi.fn().mockReturnThis(),
  })),
  rpc: vi.fn(() =>
    Promise.resolve({
      data: null,
      error: null,
    })
  ),
}

// Mock the Supabase module
vi.mock('../lib/supabase', () => ({
  supabase: mockSupabaseClient,
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

// Mock navigator.userAgent
Object.defineProperty(window.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Environment)',
  writable: true,
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Export mock client for tests
export { mockSupabaseClient }
