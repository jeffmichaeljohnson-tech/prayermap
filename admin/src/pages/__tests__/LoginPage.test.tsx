/**
 * LoginPage Component Tests
 * Tests for admin login page functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '../LoginPage'
import { AdminAuthProvider } from '../../contexts/AdminAuthContext'
import { mockSupabaseClient } from '../../test/setup'
import { createMockAuthUser, createMockSession } from '../../test/factories'
import React from 'react'

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  }
})

function renderLoginPage() {
  return render(
    <BrowserRouter>
      <AdminAuthProvider>
        <LoginPage />
      </AdminAuthProvider>
    </BrowserRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  it('should render login form', () => {
    renderLoginPage()

    expect(screen.getByText('PrayerMap Admin')).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    renderLoginPage()

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/must be a valid email address/i)).toBeInTheDocument()
    })
  })

  it('should validate password required', async () => {
    renderLoginPage()

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } })
    fireEvent.change(passwordInput, { target: { value: '123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  it('should submit credentials', async () => {
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

    renderLoginPage()

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'password123',
      })
    })
  })

  it('should show error for invalid credentials', async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials', name: 'AuthError', status: 401 },
    })

    renderLoginPage()

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument()
    })
  })

  it('should show error for non-admin users', async () => {
    const mockUser = createMockAuthUser({ email: 'user@example.com' })
    const mockSession = createMockSession(mockUser)

    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    })

    // Mock non-admin check
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    mockSupabaseClient.auth.signOut.mockResolvedValueOnce({
      error: null,
    })

    renderLoginPage()

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/you do not have admin privileges/i)).toBeInTheDocument()
    })
  })

  it('should redirect to dashboard on success', async () => {
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

    renderLoginPage()

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })
})
