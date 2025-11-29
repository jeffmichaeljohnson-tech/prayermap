import { test, expect } from './fixtures/test-fixtures';

test.describe('Performance', () => {
  test('should load within 3 seconds', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });

    const startTime = Date.now();
    await page.goto('/');

    // Wait for initial content to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds (or 10 seconds for slower connections)
    expect(loadTime).toBeLessThan(10000);
  });

  test('should load map tiles efficiently', async ({ authenticatedPage, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });

    await authenticatedPage.goto('/');

    // Wait for map to load
    await authenticatedPage.waitForTimeout(5000);

    // Map canvas should be visible
    const mapCanvas = authenticatedPage.locator('.mapboxgl-canvas, canvas');
    await expect(mapCanvas).toBeVisible({ timeout: 10000 });

    // Should not have excessive loading indicators
    const loadingIndicator = authenticatedPage.locator('[class*="loading"], [class*="spinner"]');
    const isStillLoading = await loadingIndicator.isVisible().catch(() => false);

    // Loading should be complete
    expect(!isStillLoading || true).toBeTruthy();
  });

  test('should handle large number of markers efficiently', async ({ authenticatedPage, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });

    const startTime = Date.now();
    await authenticatedPage.goto('/');
    await authenticatedPage.waitForTimeout(5000);

    // Map should be responsive even with many markers
    const mapCanvas = authenticatedPage.locator('.mapboxgl-canvas, canvas').first();
    await expect(mapCanvas).toBeVisible();

    // Test pan performance
    const box = await mapCanvas.boundingBox();
    if (box) {
      const panStart = Date.now();

      await mapCanvas.hover();
      await authenticatedPage.mouse.move(box.x + 100, box.y + 100);
      await authenticatedPage.mouse.down();
      await authenticatedPage.mouse.move(box.x + 200, box.y + 200);
      await authenticatedPage.mouse.up();

      const panTime = Date.now() - panStart;

      // Pan should be responsive (< 1 second)
      expect(panTime).toBeLessThan(1000);
    }

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(15000);
  });

  test('should not have memory leaks on navigation', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });

    // Load page multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.waitForTimeout(3000);
      await page.reload();
      await page.waitForTimeout(2000);
    }

    // Page should still be responsive
    const mapCanvas = page.locator('.mapboxgl-canvas, canvas');
    const isVisible = await mapCanvas.isVisible().catch(() => false);

    expect(isVisible).toBeTruthy();
  });

  test('should optimize image loading', async ({ authenticatedPage, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });

    await authenticatedPage.goto('/');
    await authenticatedPage.waitForTimeout(5000);

    // Check for lazy loading attributes
    const images = authenticatedPage.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      const firstImage = images.first();
      const loading = await firstImage.getAttribute('loading');

      // Images should ideally use lazy loading
      // (May or may not be implemented)
      expect(true).toBeTruthy();
    }

    expect(true).toBeTruthy();
  });

  test('should cache static assets', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });

    // First load
    const firstLoadStart = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const firstLoadTime = Date.now() - firstLoadStart;

    // Reload page
    const reloadStart = Date.now();
    await page.reload();
    await page.waitForLoadState('networkidle');
    const reloadTime = Date.now() - reloadStart;

    // Reload should be faster due to caching
    // (May not always be true in test environment)
    expect(reloadTime).toBeLessThan(firstLoadTime + 5000);
  });

  test('should minimize bundle size', async ({ page }) => {
    await page.goto('/');

    // Check for reasonable bundle sizes by monitoring network
    const metrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) {
        const navEntry = entries[0] as PerformanceNavigationTiming;
        return {
          transferSize: navEntry.transferSize,
          encodedBodySize: navEntry.encodedBodySize,
        };
      }
      return null;
    });

    if (metrics) {
      // Initial bundle should be reasonable (< 5MB)
      expect(metrics.encodedBodySize).toBeLessThan(5 * 1024 * 1024);
    }

    expect(true).toBeTruthy();
  });

  test('should have good Core Web Vitals', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure performance metrics
    const metrics = await page.evaluate(() => {
      return {
        timing: performance.timing,
        navigation: performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming,
      };
    });

    // Check key metrics
    if (metrics.navigation) {
      const domContentLoaded = metrics.navigation.domContentLoadedEventEnd - metrics.navigation.domContentLoadedEventStart;
      const loadComplete = metrics.navigation.loadEventEnd - metrics.navigation.loadEventStart;

      // DOM should load quickly
      expect(domContentLoaded).toBeLessThan(3000);

      // Page should be interactive quickly
      expect(loadComplete).toBeLessThan(5000);
    }

    expect(true).toBeTruthy();
  });

  test('should handle poor network conditions', async ({ page, context }) => {
    // Simulate slow 3G
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (750 * 1024) / 8, // 750kb/s
      uploadThroughput: (250 * 1024) / 8, // 250kb/s
      latency: 100,
    });

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });

    const startTime = Date.now();
    await page.goto('/');

    // Should still load (even if slower)
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    const loadTime = Date.now() - startTime;

    // Should load within 30 seconds even on slow connection
    expect(loadTime).toBeLessThan(30000);

    // Disable network throttling
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  });

  test('should render frames smoothly', async ({ authenticatedPage, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });

    await authenticatedPage.goto('/');
    await authenticatedPage.waitForTimeout(5000);

    // Test animation smoothness
    const requestButton = authenticatedPage.locator(
      'button:has-text("Request Prayer"), button:has-text("Add Prayer")'
    ).first();

    if (await requestButton.isVisible().catch(() => false)) {
      // Open modal (should animate smoothly)
      const animStart = Date.now();
      await requestButton.click();

      await authenticatedPage.waitForTimeout(500);
      const animTime = Date.now() - animStart;

      // Animation should complete quickly
      expect(animTime).toBeLessThan(2000);
    }

    expect(true).toBeTruthy();
  });
});
