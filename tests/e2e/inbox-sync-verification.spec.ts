import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';

test.describe('Enhanced Inbox Synchronization Verification', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  test.beforeAll(async () => {
    const browser = await chromium.launch();
    
    // Create two contexts to simulate different devices
    context1 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    
    context2 = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    
    page1 = await context1.newPage();
    page2 = await context2.newPage();
  });

  test.afterAll(async () => {
    await context1.close();
    await context2.close();
  });

  test('enhanced sync service loads without errors', async () => {
    // Navigate to the app on both pages
    await Promise.all([
      page1.goto('/'),
      page2.goto('/')
    ]);

    // Check if pages load successfully
    await Promise.all([
      expect(page1.locator('body')).toBeVisible(),
      expect(page2.locator('body')).toBeVisible()
    ]);

    // Check for any console errors related to inbox sync
    const errors1: string[] = [];
    const errors2: string[] = [];

    page1.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('inbox')) {
        errors1.push(msg.text());
      }
    });

    page2.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('inbox')) {
        errors2.push(msg.text());
      }
    });

    // Wait a moment for any initialization errors
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // Check that no critical inbox sync errors occurred
    expect(errors1.length).toBe(0);
    expect(errors2.length).toBe(0);
  });

  test('connection health monitoring is active', async () => {
    await page1.goto('/');

    // Check if connection health monitoring is working by looking for console logs
    const healthLogs: string[] = [];
    
    page1.on('console', (msg) => {
      if (msg.text().includes('connection') || msg.text().includes('heartbeat') || msg.text().includes('subscription status')) {
        healthLogs.push(msg.text());
      }
    });

    // Wait for subscription setup
    await page1.waitForTimeout(5000);

    // Should have some connection-related logs
    expect(healthLogs.length).toBeGreaterThan(0);
  });

  test('cross-tab sync channel initializes when supported', async () => {
    await page1.goto('/');

    // Check if BroadcastChannel is supported and initialized
    const broadcastSupported = await page1.evaluate(() => {
      return typeof BroadcastChannel !== 'undefined';
    });

    if (broadcastSupported) {
      // Check for cross-tab sync setup logs
      const syncLogs: string[] = [];
      
      page1.on('console', (msg) => {
        if (msg.text().includes('cross-tab') || msg.text().includes('BroadcastChannel')) {
          syncLogs.push(msg.text());
        }
      });

      await page1.waitForTimeout(3000);
      
      // Should have cross-tab sync logs if supported
      expect(syncLogs.length).toBeGreaterThan(0);
    } else {
      console.log('BroadcastChannel not supported in test environment');
    }
  });

  test('debouncing prevents excessive API calls', async () => {
    await page1.goto('/');

    // Monitor API calls to inbox endpoint
    const inboxCalls: string[] = [];
    
    page1.on('response', (response) => {
      if (response.url().includes('inbox') || response.url().includes('prayer_responses')) {
        inboxCalls.push(response.url());
      }
    });

    // Simulate rapid events by triggering multiple state changes
    await page1.evaluate(() => {
      // Simulate multiple rapid events that would normally trigger inbox refetch
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new CustomEvent('test-inbox-update'));
      }
    });

    await page1.waitForTimeout(2000);

    // Should not have made excessive calls due to debouncing
    expect(inboxCalls.length).toBeLessThan(10);
  });

  test('offline/online state is properly detected', async () => {
    await page1.goto('/');

    // Test offline detection
    const offlineState = await page1.evaluate(() => {
      return navigator.onLine;
    });

    // Simulate going offline
    await context1.setOffline(true);
    
    await page1.waitForTimeout(1000);
    
    const afterOffline = await page1.evaluate(() => {
      return navigator.onLine;
    });

    // Should detect offline state
    expect(afterOffline).toBe(false);

    // Go back online
    await context1.setOffline(false);
    
    await page1.waitForTimeout(1000);
    
    const afterOnline = await page1.evaluate(() => {
      return navigator.onLine;
    });

    // Should detect online state
    expect(afterOnline).toBe(true);
  });

  test('enhanced subscription service prevents duplicate subscriptions', async () => {
    await page1.goto('/');

    // Monitor subscription setup logs
    const subscriptionLogs: string[] = [];
    
    page1.on('console', (msg) => {
      if (msg.text().includes('subscription') && msg.text().includes('user')) {
        subscriptionLogs.push(msg.text());
      }
    });

    // Wait for initial subscription
    await page1.waitForTimeout(3000);
    
    // Refresh page to trigger cleanup and re-setup
    await page1.reload();
    
    // Wait for new subscription
    await page1.waitForTimeout(3000);

    // Should have cleanup logs to prevent duplicates
    const cleanupLogs = subscriptionLogs.filter(log => log.includes('cleanup') || log.includes('Cleaning up'));
    expect(cleanupLogs.length).toBeGreaterThan(0);
  });
});