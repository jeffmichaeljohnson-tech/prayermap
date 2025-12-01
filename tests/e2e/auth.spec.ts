import { test, expect } from './fixtures/test-fixtures';

test.describe('Authentication', () => {
  test.describe('Sign Up', () => {
    test('should show sign up form', async ({ page }) => {
      await page.goto('/');

      // Wait for auth modal to load
      await expect(page.locator('text=PrayerMap')).toBeVisible();

      // Click Sign Up tab
      await page.click('button:has-text("Sign Up")');

      // Verify Sign Up form is visible
      await expect(page.locator('input[placeholder="First Name"]')).toBeVisible();
      await expect(page.locator('input[placeholder="Email Address"]')).toBeVisible();
      await expect(page.locator('input[placeholder="Password"]')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("Sign Up")');

      // Fill in invalid email
      await page.fill('input[placeholder="First Name"]', 'Test User');
      await page.fill('input[placeholder="Email Address"]', 'invalid-email');
      await page.fill('input[placeholder="Password"]', 'TestPassword123!');

      // Try to submit
      await page.click('button:has-text("Join PrayerMap")');

      // Browser validation should prevent submission
      const emailInput = page.locator('input[placeholder="Email Address"]');
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("Sign Up")');

      // Fill in weak password
      await page.fill('input[placeholder="First Name"]', 'Test User');
      await page.fill('input[placeholder="Email Address"]', 'test@example.com');
      await page.fill('input[placeholder="Password"]', '123');

      // Try to submit
      await page.click('button:has-text("Join PrayerMap")');

      // Should show error or validation message
      await page.waitForTimeout(1000);

      // Either validation message or error alert should appear
      const hasError = await page.locator('text=/password|error/i').isVisible().catch(() => false);
      expect(hasError).toBeTruthy();
    });

    test('should successfully create account', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("Sign Up")');

      const timestamp = Date.now();
      const email = `test${timestamp}@prayermap.com`;

      // Fill in valid credentials
      await page.fill('input[placeholder="First Name"]', 'Test User');
      await page.fill('input[placeholder="Email Address"]', email);
      await page.fill('input[placeholder="Password"]', 'TestPassword123!');

      // Submit form
      await page.click('button:has-text("Join PrayerMap")');

      // Should show success message or redirect
      await expect(page.locator('text=/check your email|success/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show error for existing email', async ({ page }) => {
      await page.goto('/');
      await page.click('button:has-text("Sign Up")');

      // Use known existing email
      await page.fill('input[placeholder="First Name"]', 'Test User');
      await page.fill('input[placeholder="Email Address"]', 'existing@prayermap.com');
      await page.fill('input[placeholder="Password"]', 'TestPassword123!');

      // Submit form
      await page.click('button:has-text("Join PrayerMap")');

      // Should show error message
      await expect(page.locator('text=/already|exists/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Sign In', () => {
    test('should show sign in form', async ({ page }) => {
      await page.goto('/');

      // Verify Login tab is active by default
      await expect(page.locator('input[placeholder="Email Address"]')).toBeVisible();
      await expect(page.locator('input[placeholder="Password"]')).toBeVisible();
      await expect(page.locator('button:has-text("Enter PrayerMap")')).toBeVisible();
    });

    test('should sign in with valid credentials', async ({ page }) => {
      await page.goto('/');

      // Fill in credentials
      await page.fill('input[placeholder="Email Address"]', 'test@prayermap.com');
      await page.fill('input[placeholder="Password"]', 'TestPassword123!');

      // Submit form
      await page.click('button:has-text("Enter PrayerMap")');

      // Should redirect to map (check for map-specific elements)
      await expect(page.locator('.mapboxgl-canvas, canvas')).toBeVisible({ timeout: 15000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/');

      // Fill in invalid credentials
      await page.fill('input[placeholder="Email Address"]', 'wrong@prayermap.com');
      await page.fill('input[placeholder="Password"]', 'WrongPassword123!');

      // Submit form
      await page.click('button:has-text("Enter PrayerMap")');

      // Should show error message
      await expect(page.locator('text=/invalid|incorrect|error/i')).toBeVisible({ timeout: 5000 });
    });

    test('should remember session', async ({ page, context }) => {
      // Sign in
      await page.goto('/');
      await page.fill('input[placeholder="Email Address"]', 'test@prayermap.com');
      await page.fill('input[placeholder="Password"]', 'TestPassword123!');
      await page.click('button:has-text("Enter PrayerMap")');

      // Wait for map to load
      await page.waitForTimeout(3000);

      // Create new page in same context
      const newPage = await context.newPage();
      await newPage.goto('/');

      // Should not show auth modal, should go directly to map
      await expect(newPage.locator('.mapboxgl-canvas, canvas')).toBeVisible({ timeout: 15000 });

      await newPage.close();
    });
  });

  test.describe('Sign Out', () => {
    test('should sign out user', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');

      // Wait for map to load
      await authenticatedPage.waitForTimeout(3000);

      // Open settings (look for settings button)
      const settingsButton = authenticatedPage.locator('button:has-text("Settings"), [data-testid="settings-button"]').first();
      if (await settingsButton.isVisible().catch(() => false)) {
        await settingsButton.click();

        // Look for sign out button
        const signOutButton = authenticatedPage.locator('button:has-text("Sign Out"), button:has-text("Log Out")').first();
        if (await signOutButton.isVisible().catch(() => false)) {
          await signOutButton.click();

          // Should return to auth modal
          await expect(authenticatedPage.locator('text=PrayerMap')).toBeVisible({ timeout: 5000 });
          await expect(authenticatedPage.locator('button:has-text("Enter PrayerMap")')).toBeVisible();
        }
      }
    });

    test('should clear session data', async ({ authenticatedPage, context }) => {
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForTimeout(3000);

      // Sign out through settings or clear cookies
      await context.clearCookies();

      // Reload page
      await authenticatedPage.reload();

      // Should show auth modal
      await expect(authenticatedPage.locator('text=PrayerMap')).toBeVisible();
      await expect(authenticatedPage.locator('button:has-text("Enter PrayerMap")')).toBeVisible();
    });
  });

  test.describe('OAuth', () => {
    test('should show Apple sign in option', async ({ page }) => {
      await page.goto('/');

      // Verify Apple sign in button is visible
      await expect(page.locator('button:has-text("Sign in with Apple")')).toBeVisible();

      // Verify Apple icon is present
      await expect(page.locator('svg').filter({ hasText: /apple/i }).or(page.locator('button:has-text("Sign in with Apple") svg'))).toBeVisible();
    });

    test('should initiate Apple sign in flow', async ({ page }) => {
      await page.goto('/');

      // Click Apple sign in button
      const appleButton = page.locator('button:has-text("Sign in with Apple")');
      await appleButton.click();

      // Should show loading state or redirect
      await page.waitForTimeout(1000);

      // Verify loading state or navigation
      const isLoading = await page.locator('text=/signing in/i').isVisible().catch(() => false);
      expect(isLoading || page.url() !== 'http://localhost:5173/').toBeTruthy();
    });
  });
});
