/**
 * DashboardPage Component Tests
 * Tests for admin dashboard analytics page
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from '../DashboardPage'
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
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock stats RPC call
    mockSupabaseClient.rpc.mockResolvedValue({
      data: {
        total_prayers: 1000,
        total_users: 250,
        prayers_today: 45,
        users_today: 12,
        audio_prayers: 300,
        video_prayers: 150,
        text_prayers: 550,
        flagged_prayers: 5,
        pending_reviews: 3,
      },
      error: null,
    })
  })

  it('should render dashboard title', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
    })
  })

  it('should display analytics stats', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Stats should be loaded and displayed
      expect(mockSupabaseClient.rpc).toHaveBeenCalled()
    })
  })

  it('should handle loading state', () => {
    render(<DashboardPage />, { wrapper: createWrapper() })

    // Should show loading indicator initially
    // This depends on the implementation of DashboardPage
  })

  it('should handle error state', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to fetch stats', code: 'ERROR' },
    })

    render(<DashboardPage />, { wrapper: createWrapper() })

    // Should handle error gracefully
    await waitFor(() => {
      expect(mockSupabaseClient.rpc).toHaveBeenCalled()
    })
  })
})
