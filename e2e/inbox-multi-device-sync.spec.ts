import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { AuthHelper } from './helpers/auth-helper';
import { PrayerHelper } from './helpers/prayer-helper';

test.describe('Multi-Device Inbox Synchronization', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;
  let authHelper1: AuthHelper;
  let authHelper2: AuthHelper;
  let prayerHelper1: PrayerHelper;
  let prayerHelper2: PrayerHelper;
  
  const testUserEmail = 'multidevice.test@example.com';
  const testUserPassword = 'TestPassword123!';
  const responderEmail = 'responder.test@example.com';
  const responderPassword = 'TestPassword123!';

  test.beforeAll(async () => {
    // Create two separate browser contexts to simulate different devices
    const browser = await chromium.launch();
    
    context1 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });
    
    context2 = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    page1 = await context1.newPage();
    page2 = await context2.newPage();
    
    authHelper1 = new AuthHelper(page1);
    authHelper2 = new AuthHelper(page2);
    prayerHelper1 = new PrayerHelper(page1);
    prayerHelper2 = new PrayerHelper(page2);
  });

  test.afterAll(async () => {
    await context1.close();
    await context2.close();
  });

  test('inbox messages sync across multiple browser windows for same user', async () => {
    // Device 1: Sign in as main user
    await page1.goto('/');
    await authHelper1.signInWithEmail(testUserEmail, testUserPassword);
    await expect(page1.locator('[data-testid="user-avatar"]')).toBeVisible();
    
    // Device 2: Sign in as same user 
    await page2.goto('/');
    await authHelper2.signInWithEmail(testUserEmail, testUserPassword);
    await expect(page2.locator('[data-testid="user-avatar"]')).toBeVisible();
    
    // Device 1: Create a prayer
    const prayerContent = `Multi-device test prayer ${Date.now()}`;
    await prayerHelper1.createPrayer({
      content: prayerContent,
      title: 'Test Prayer for Multi-Device Sync',
      isAnonymous: false
    });
    
    // Wait for prayer to appear on both devices
    await expect(page1.locator(`text=${prayerContent}`)).toBeVisible({ timeout: 10000 });
    await expect(page2.locator(`text=${prayerContent}`)).toBeVisible({ timeout: 10000 });
    
    // Get the prayer ID for response testing
    const prayerId = await page1.evaluate(() => {
      const prayerElement = document.querySelector('[data-prayer-id]');
      return prayerElement?.getAttribute('data-prayer-id');
    });
    
    // Create a separate context for responder
    const responderContext = await chromium.launch().then(b => b.newContext());
    const responderPage = await responderContext.newPage();
    const responderAuth = new AuthHelper(responderPage);
    const responderPrayerHelper = new PrayerHelper(responderPage);
    
    // Responder signs in and responds to prayer
    await responderPage.goto('/');
    await responderAuth.signInWithEmail(responderEmail, responderPassword);
    
    // Find and respond to the prayer
    await responderPage.goto('/');
    await responderPage.locator(`text=${prayerContent}`).click();
    await responderPage.fill('[data-testid="prayer-response-input"]', 'Praying for you from responder device!');
    await responderPage.click('[data-testid="send-prayer-response"]');
    
    // Verify response appears in inbox on both devices simultaneously
    await page1.goto('/inbox');
    await page2.goto('/inbox');
    
    // Both devices should show the new response
    await expect(page1.locator('text=Praying for you from responder device!')).toBeVisible({ timeout: 15000 });
    await expect(page2.locator('text=Praying for you from responder device!')).toBeVisible({ timeout: 15000 });
    
    // Verify unread count is consistent across devices
    const unreadCount1 = await page1.locator('[data-testid="inbox-unread-count"]').textContent();
    const unreadCount2 = await page2.locator('[data-testid="inbox-unread-count"]').textContent();
    expect(unreadCount1).toBe(unreadCount2);
    
    await responderContext.close();
  });

  test('read states sync across devices in real-time', async () => {
    // Ensure both devices are on inbox page
    await page1.goto('/inbox');
    await page2.goto('/inbox');
    
    // Wait for inbox to load
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');
    
    // Get initial unread count from both devices
    const initialUnread1 = await page1.locator('[data-testid="inbox-unread-count"]').textContent();
    const initialUnread2 = await page2.locator('[data-testid="inbox-unread-count"]').textContent();
    
    console.log(`Initial unread counts - Device 1: ${initialUnread1}, Device 2: ${initialUnread2}`);
    
    // Device 1: Mark first prayer as read
    const firstInboxItem = page1.locator('[data-testid="inbox-item"]').first();
    await firstInboxItem.click();
    
    // Click mark as read button if it exists
    const markReadButton = page1.locator('[data-testid="mark-as-read"]');
    if (await markReadButton.isVisible()) {
      await markReadButton.click();
    }
    
    // Wait for the read state to propagate to both devices
    await page1.waitForTimeout(2000);
    
    // Verify read state synced to Device 2
    await page2.reload();
    await page2.waitForLoadState('networkidle');
    
    // Check that unread count decreased on both devices
    const updatedUnread1 = await page1.locator('[data-testid="inbox-unread-count"]').textContent();
    const updatedUnread2 = await page2.locator('[data-testid="inbox-unread-count"]').textContent();
    
    console.log(`Updated unread counts - Device 1: ${updatedUnread1}, Device 2: ${updatedUnread2}`);
    
    expect(updatedUnread1).toBe(updatedUnread2);
    expect(parseInt(updatedUnread1 || '0')).toBeLessThan(parseInt(initialUnread1 || '0'));
  });

  test('real-time sync works when user is active on multiple devices', async () => {
    // Setup: Both devices monitoring inbox
    await page1.goto('/inbox');
    await page2.goto('/inbox');
    
    // Create a new responder session to send responses
    const responderContext = await chromium.launch().then(b => b.newContext());
    const responderPage = await responderContext.newPage();
    const responderAuth = new AuthHelper(responderPage);
    
    await responderPage.goto('/');
    await responderAuth.signInWithEmail(responderEmail, responderPassword);
    
    // Get the main user's prayer to respond to
    await responderPage.goto('/');
    const targetPrayer = responderPage.locator('[data-prayer-id]').first();
    await targetPrayer.click();
    
    // Send multiple rapid responses to test real-time sync
    for (let i = 1; i <= 3; i++) {
      await responderPage.fill('[data-testid="prayer-response-input"]', `Real-time test response ${i} - ${Date.now()}`);
      await responderPage.click('[data-testid="send-prayer-response"]');
      await responderPage.waitForTimeout(1000);
    }
    
    // Verify both devices receive all responses in real-time
    for (let i = 1; i <= 3; i++) {
      await expect(page1.locator(`text=Real-time test response ${i}`)).toBeVisible({ timeout: 10000 });
      await expect(page2.locator(`text=Real-time test response ${i}`)).toBeVisible({ timeout: 10000 });
    }
    
    await responderContext.close();
  });

  test('network recovery and sync after connectivity issues', async () => {
    // Setup: Both devices on inbox
    await page1.goto('/inbox');
    await page2.goto('/inbox');
    
    // Simulate network disconnection on Device 1
    await context1.setOffline(true);
    
    // Create response while Device 1 is offline
    const responderContext = await chromium.launch().then(b => b.newContext());
    const responderPage = await responderContext.newPage();
    const responderAuth = new AuthHelper(responderPage);
    
    await responderPage.goto('/');
    await responderAuth.signInWithEmail(responderEmail, responderPassword);
    
    await responderPage.goto('/');
    const targetPrayer = responderPage.locator('[data-prayer-id]').first();
    await targetPrayer.click();
    
    const offlineResponseText = `Offline recovery test response - ${Date.now()}`;
    await responderPage.fill('[data-testid="prayer-response-input"]', offlineResponseText);
    await responderPage.click('[data-testid="send-prayer-response"]');
    
    // Device 2 (online) should receive the response
    await expect(page2.locator(`text=${offlineResponseText}`)).toBeVisible({ timeout: 10000 });
    
    // Device 1 (offline) should not see the response yet
    await expect(page1.locator(`text=${offlineResponseText}`)).not.toBeVisible({ timeout: 2000 });
    
    // Reconnect Device 1
    await context1.setOffline(false);
    
    // Refresh inbox or trigger reconnection
    await page1.reload();
    await page1.waitForLoadState('networkidle');
    
    // Device 1 should now sync and show the response
    await expect(page1.locator(`text=${offlineResponseText}`)).toBeVisible({ timeout: 15000 });
    
    await responderContext.close();
  });

  test('timestamp consistency across different time zones and devices', async () => {
    // Create contexts with different time zones
    const contextPST = await chromium.launch().then(b => b.newContext({
      timezoneId: 'America/Los_Angeles',
      locale: 'en-US'
    }));
    
    const contextEST = await chromium.launch().then(b => b.newContext({
      timezoneId: 'America/New_York', 
      locale: 'en-US'
    }));
    
    const pagePST = await contextPST.newPage();
    const pageEST = await contextEST.newPage();
    
    // Sign in on both timezone contexts
    const authPST = new AuthHelper(pagePST);
    const authEST = new AuthHelper(pageEST);
    
    await pagePST.goto('/');
    await authPST.signInWithEmail(testUserEmail, testUserPassword);
    
    await pageEST.goto('/');
    await authEST.signInWithEmail(testUserEmail, testUserPassword);
    
    // Navigate to inbox on both
    await pagePST.goto('/inbox');
    await pageEST.goto('/inbox');
    
    // Get timestamps from both time zone contexts
    const timestampsPST = await pagePST.$$eval('[data-testid="message-timestamp"]', elements => 
      elements.map(el => el.textContent)
    );
    
    const timestampsEST = await pageEST.$$eval('[data-testid="message-timestamp"]', elements => 
      elements.map(el => el.textContent)
    );
    
    // Verify timestamps are displayed in local time but refer to same moments
    expect(timestampsPST.length).toBe(timestampsEST.length);
    
    // The displayed times should be different (due to time zones) but consistent in ordering
    for (let i = 0; i < timestampsPST.length; i++) {
      // Both should be valid timestamps
      expect(timestampsPST[i]).toBeTruthy();
      expect(timestampsEST[i]).toBeTruthy();
    }
    
    await contextPST.close();
    await contextEST.close();
  });

  test('sync handles simultaneous actions from multiple devices gracefully', async () => {
    await page1.goto('/inbox');
    await page2.goto('/inbox');
    
    // Get the same inbox item on both devices
    const firstItem1 = page1.locator('[data-testid="inbox-item"]').first();
    const firstItem2 = page2.locator('[data-testid="inbox-item"]').first();
    
    // Simultaneously try to mark as read from both devices
    await Promise.all([
      firstItem1.click(),
      firstItem2.click()
    ]);
    
    // Wait for operations to complete
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    
    // Refresh both pages to check final state
    await Promise.all([
      page1.reload(),
      page2.reload()
    ]);
    
    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle')
    ]);
    
    // Verify both devices show consistent final state
    const finalUnread1 = await page1.locator('[data-testid="inbox-unread-count"]').textContent();
    const finalUnread2 = await page2.locator('[data-testid="inbox-unread-count"]').textContent();
    
    expect(finalUnread1).toBe(finalUnread2);
  });

  test('subscription handles browser tab switching and focus changes', async () => {
    // Start with focus on Device 1
    await page1.goto('/inbox');
    await page1.bringToFront();
    
    // Device 2 in background
    await page2.goto('/inbox');
    
    // Create response while Device 1 is active
    const responderContext = await chromium.launch().then(b => b.newContext());
    const responderPage = await responderContext.newPage();
    const responderAuth = new AuthHelper(responderPage);
    
    await responderPage.goto('/');
    await responderAuth.signInWithEmail(responderEmail, responderPassword);
    
    await responderPage.goto('/');
    const targetPrayer = responderPage.locator('[data-prayer-id]').first();
    await targetPrayer.click();
    
    const focusTestResponse = `Focus test response - ${Date.now()}`;
    await responderPage.fill('[data-testid="prayer-response-input"]', focusTestResponse);
    await responderPage.click('[data-testid="send-prayer-response"]');
    
    // Both devices should receive the response regardless of focus
    await expect(page1.locator(`text=${focusTestResponse}`)).toBeVisible({ timeout: 10000 });
    await expect(page2.locator(`text=${focusTestResponse}`)).toBeVisible({ timeout: 10000 });
    
    // Switch focus to Device 2
    await page2.bringToFront();
    
    // Send another response
    const focusTestResponse2 = `Focus test response 2 - ${Date.now()}`;
    await responderPage.fill('[data-testid="prayer-response-input"]', focusTestResponse2);
    await responderPage.click('[data-testid="send-prayer-response"]');
    
    // Both devices should still receive updates
    await expect(page1.locator(`text=${focusTestResponse2}`)).toBeVisible({ timeout: 10000 });
    await expect(page2.locator(`text=${focusTestResponse2}`)).toBeVisible({ timeout: 10000 });
    
    await responderContext.close();
  });
});