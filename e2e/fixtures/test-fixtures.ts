import { test as base, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';

// Custom fixtures for PrayerMap testing
export const test = base.extend<{
  authenticatedPage: Page;
  geolocatedPage: Page;
  mediaEnabledPage: Page;
}>({
  // Authenticated user fixture
  authenticatedPage: async ({ page }, use) => {
    // Setup authentication
    await page.goto('/');

    // Wait for auth modal to appear
    await page.waitForSelector('text=PrayerMap', { timeout: 10000 });

    // Check if we need to sign in
    const isAuthVisible = await page.locator('text=Login').isVisible().catch(() => false);

    if (isAuthVisible) {
      // Fill in test credentials
      await page.click('text=Login');
      await page.fill('input[type="email"]', 'test@prayermap.com');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button:has-text("Enter PrayerMap")');

      // Wait for auth to complete
      await page.waitForTimeout(2000);
    }

    await use(page);
  },

  // Mock geolocation
  geolocatedPage: async ({ page, context }, use) => {
    // Grant geolocation permission
    await context.grantPermissions(['geolocation']);

    // Set mock location (Detroit area)
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });

    await use(page);
  },

  // Mock camera/microphone
  mediaEnabledPage: async ({ page, context }, use) => {
    // Grant media permissions
    await context.grantPermissions(['camera', 'microphone']);

    await use(page);
  },
});

export { expect };
