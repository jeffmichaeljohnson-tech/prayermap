/**
 * Admin Authentication E2E Tests
 * End-to-end tests for admin login and authentication flows
 */

import { test, expect } from '@playwright/test'

test.describe('Admin Authentication', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('should show login form', async ({ page }) => {
    await page.goto('/login')

    // Check for login form elements
    await expect(page.getByText('PrayerMap Admin')).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should show validation errors', async ({ page }) => {
    await page.goto('/login')

    const emailInput = page.getByLabel(/email address/i)
    const submitButton = page.getByRole('button', { name: /sign in/i })

    // Enter invalid email
    await emailInput.fill('invalid-email')
    await submitButton.click()

    // Should show validation error
    await expect(page.getByText(/must be a valid email/i)).toBeVisible()
  })

  test('should validate password length', async ({ page }) => {
    await page.goto('/login')

    const emailInput = page.getByLabel(/email address/i)
    const passwordInput = page.getByLabel(/password/i)
    const submitButton = page.getByRole('button', { name: /sign in/i })

    await emailInput.fill('admin@example.com')
    await passwordInput.fill('123')
    await submitButton.click()

    // Should show password length error
    await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible()
  })

  // Note: These tests would require actual admin credentials or mocked backend
  // In a real scenario, you'd use test credentials or a staging environment

  test.skip('should login with valid admin credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email address/i).fill(process.env.ADMIN_EMAIL || 'admin@example.com')
    await page.getByLabel(/password/i).fill(process.env.ADMIN_PASSWORD || 'password')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test.skip('should reject non-admin users', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email address/i).fill('user@example.com')
    await page.getByLabel(/password/i).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show error message
    await expect(page.getByText(/you do not have admin privileges/i)).toBeVisible()
  })

  test.skip('should logout and redirect to login', async ({ page, context }) => {
    // This would require authenticated state
    // You'd typically set up a logged-in session first

    await page.goto('/dashboard')

    // Click logout button (implementation depends on UI)
    await page.getByRole('button', { name: /logout/i }).click()

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)

    // Session should be cleared
    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name.includes('session'))
    expect(sessionCookie).toBeUndefined()
  })
})
