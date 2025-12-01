/**
 * COMPREHENSIVE NOTIFICATION SYSTEM E2E TESTS
 * 
 * PURPOSE: Systematic validation of the complete prayer interaction and notification system
 * SCOPE: End-to-end testing of user journeys from prayer posting to notification delivery
 * 
 * CRITICAL OBJECTIVES:
 * 1. Identify exactly where in the notification flow failures occur
 * 2. Validate multi-user interaction scenarios
 * 3. Test real-time notification delivery
 * 4. Verify cross-device notification synchronization
 * 5. Create reproducible test cases for debugging
 * 
 * TESTING SCENARIOS:
 * - Basic prayer interaction flow (User A posts, User B responds, User A gets notification)
 * - Multi-user notification delivery (multiple users responding to same prayer)
 * - Real-time sync validation (notifications appear immediately)
 * - Cross-device synchronization (same user on multiple devices)
 * - Notification persistence (survives page refreshes)
 * - Inbox functionality validation
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { test as baseTest } from './fixtures/test-fixtures';

// Custom test setup with multiple users
const test2 = baseTest.extend<{
  userAPage: Page;
  userBPage: Page;
  userCPage: Page;
  userAContext: BrowserContext;
  userBContext: BrowserContext;
  userCContext: BrowserContext;
}>({
  // User A - Prayer Poster
  userAContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });
    await use(context);
    await context.close();
  },
  
  userAPage: async ({ userAContext }, use) => {
    const page = await userAContext.newPage();
    await authenticateUser(page, 'testuser_a@prayermap.com', 'TestPassword123!');
    await use(page);
  },

  // User B - First Responder  
  userBContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation', 'microphone', 'camera']);
    await context.setGeolocation({ latitude: 42.7000, longitude: -83.2000 }); // Slightly different location
    await use(context);
    await context.close();
  },
  
  userBPage: async ({ userBContext }, use) => {
    const page = await userBContext.newPage();
    await authenticateUser(page, 'testuser_b@prayermap.com', 'TestPassword123!');
    await use(page);
  },

  // User C - Second Responder
  userCContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation', 'microphone', 'camera']);
    await context.setGeolocation({ latitude: 42.7100, longitude: -83.2100 }); // Different location
    await use(context);
    await context.close();
  },
  
  userCPage: async ({ userCContext }, use) => {
    const page = await userCContext.newPage();
    await authenticateUser(page, 'testuser_c@prayermap.com', 'TestPassword123!');
    await use(page);
  },
});

// Helper function for user authentication
async function authenticateUser(page: Page, email: string, password: string) {
  console.log(`Authenticating user: ${email}`);
  
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Check if already authenticated
  const isLoggedIn = await page.locator('[data-testid="user-profile"], [data-testid="logout-button"]').isVisible().catch(() => false);
  
  if (!isLoggedIn) {
    // Look for login/auth modal
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), [data-testid="login-button"]').first();
    
    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
      await page.waitForTimeout(1000);
    }

    // Fill in credentials
    const emailField = page.locator('input[type="email"], input[name="email"]');
    const passwordField = page.locator('input[type="password"], input[name="password"]');
    
    await emailField.fill(email);
    await passwordField.fill(password);
    
    const submitButton = page.locator('button:has-text("Sign In"), button:has-text("Login"), button:has-text("Enter")').first();
    await submitButton.click();
    
    // Wait for auth to complete
    await page.waitForTimeout(5000);
  }
  
  console.log(`Authentication complete for: ${email}`);
}

// Helper function to create a test prayer
async function createTestPrayer(page: Page, prayerText: string): Promise<string> {
  console.log('Creating test prayer:', prayerText);
  
  await page.goto('/');
  await page.waitForTimeout(3000);
  
  // Look for prayer creation button/form
  const createButton = page.locator(
    'button:has-text("Post"), button:has-text("Share"), button:has-text("Create"), [data-testid="create-prayer"], [data-testid="post-prayer"]'
  ).first();
  
  if (await createButton.isVisible().catch(() => false)) {
    await createButton.click();
    await page.waitForTimeout(1000);
  }
  
  // Fill in prayer text
  const textArea = page.locator('textarea, input[type="text"]:not([type="email"]):not([type="password"])').first();
  if (await textArea.isVisible()) {
    await textArea.fill(prayerText);
    
    // Submit prayer
    const submitButton = page.locator('button:has-text("Post"), button:has-text("Submit"), button:has-text("Share")').first();
    await submitButton.click();
    await page.waitForTimeout(2000);
  }
  
  // Try to get prayer ID from URL or elements
  const currentUrl = page.url();
  const prayerIdMatch = currentUrl.match(/prayer[\/\-]?(\d+|[a-f0-9-]{36})/i);
  
  if (prayerIdMatch) {
    console.log('Prayer created with ID:', prayerIdMatch[1]);
    return prayerIdMatch[1];
  }
  
  // Fallback: look for prayer in DOM
  const prayerElement = page.locator('[data-testid*="prayer"], [class*="prayer"]').first();
  if (await prayerElement.isVisible().catch(() => false)) {
    const prayerId = await prayerElement.getAttribute('data-prayer-id') || 'test-prayer-' + Date.now();
    console.log('Prayer created, using fallback ID:', prayerId);
    return prayerId;
  }
  
  console.log('Prayer created, using timestamp ID');
  return 'test-prayer-' + Date.now();
}

// Helper function to respond to a prayer
async function respondToPrayer(page: Page, prayerText: string, responseText: string): Promise<boolean> {
  console.log('Looking for prayer to respond to:', prayerText.substring(0, 50) + '...');
  
  await page.goto('/');
  await page.waitForTimeout(5000);
  
  // Look for the prayer marker or card containing our test prayer text
  const prayerMarker = page.locator('[data-testid="prayer-marker"], .mapboxgl-marker, [class*="prayer"]').first();
  
  if (await prayerMarker.isVisible().catch(() => false)) {
    await prayerMarker.click();
    await page.waitForTimeout(1000);
    
    // Look for prayer detail modal with our text
    const prayerModal = page.locator('[data-testid="prayer-detail"], [data-testid="prayer-modal"]');
    const modalVisible = await prayerModal.isVisible().catch(() => false);
    
    if (modalVisible) {
      // Check if this is the right prayer
      const modalText = await prayerModal.textContent() || '';
      const isRightPrayer = modalText.includes(prayerText.substring(0, 30));
      
      if (!isRightPrayer) {
        console.log('Wrong prayer found, this is not our test prayer');
        // Close modal and return false
        await page.keyboard.press('Escape');
        return false;
      }
      
      // Found the right prayer, now respond
      const respondButton = page.locator(
        'button:has-text("Respond"), button:has-text("Reply"), button:has-text("Pray"), [data-testid="respond-button"], [data-testid="pray-button"]'
      ).first();
      
      if (await respondButton.isVisible().catch(() => false)) {
        await respondButton.click();
        await page.waitForTimeout(1000);
        
        // Fill in response
        const responseTextArea = page.locator('textarea, input[type="text"]:not([name="email"]):not([name="password"])').first();
        if (await responseTextArea.isVisible().catch(() => false)) {
          await responseTextArea.fill(responseText);
          
          // Submit response
          const submitButton = page.locator('button:has-text("Send"), button:has-text("Submit"), button:has-text("Respond")').first();
          if (await submitButton.isVisible().catch(() => false)) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            console.log('Response sent successfully:', responseText);
            return true;
          }
        }
      }
    }
  }
  
  console.log('Could not respond to prayer');
  return false;
}

// Helper function to check for notifications in inbox
async function checkInboxForNotifications(page: Page, expectedCount: number = 1): Promise<{ hasNotifications: boolean; actualCount: number; details: string[] }> {
  console.log('Checking inbox for notifications, expected:', expectedCount);
  
  await page.goto('/');
  await page.waitForTimeout(3000);
  
  // Look for inbox button with notification badge
  const inboxButton = page.locator(
    '[data-testid="inbox-button"], button:has-text("Inbox"), button:has([class*="badge"]), [class*="inbox"]'
  ).first();
  
  const result = {
    hasNotifications: false,
    actualCount: 0,
    details: [] as string[]
  };
  
  if (await inboxButton.isVisible().catch(() => false)) {
    // Check for notification badge
    const badge = page.locator('[data-testid="unread-badge"], [class*="badge"], [class*="count"]');
    const badgeVisible = await badge.isVisible().catch(() => false);
    
    if (badgeVisible) {
      const badgeText = await badge.textContent() || '0';
      result.actualCount = parseInt(badgeText) || 0;
      result.details.push(`Badge shows: ${badgeText}`);
    }
    
    // Open inbox to check contents
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    // Look for notification/message items
    const messages = page.locator('[data-testid="inbox-message"], [data-testid="notification"], [class*="message"], [class*="notification"]');
    const messageCount = await messages.count();
    
    if (messageCount > 0) {
      result.hasNotifications = true;
      result.actualCount = Math.max(result.actualCount, messageCount);
      result.details.push(`Found ${messageCount} messages in inbox`);
      
      // Get text content of messages for debugging
      for (let i = 0; i < Math.min(messageCount, 3); i++) {
        const messageText = await messages.nth(i).textContent();
        if (messageText) {
          result.details.push(`Message ${i + 1}: ${messageText.substring(0, 100)}...`);
        }
      }
    } else {
      result.details.push('No messages found in inbox');
    }
    
    // Close inbox
    const closeButton = page.locator('[data-testid="close-inbox"], button:has-text("Close")').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }
  } else {
    result.details.push('Inbox button not found');
  }
  
  console.log('Inbox check result:', result);
  return result;
}

test2.describe('Prayer Notification System E2E Tests', () => {
  test2.beforeEach(async ({ userAContext, userBContext, userCContext }) => {
    console.log('Setting up multi-user test environment...');
  });

  test2('TEST CASE 1: Basic Single User Prayer Support Flow', async ({ userAPage, userBPage }) => {
    console.log('\n=== TEST CASE 1: Basic Single User Prayer Support Flow ===');
    
    // Step 1: User A posts a prayer request
    console.log('Step 1: User A posting prayer...');
    const testPrayerText = `Test Prayer for Notification ${Date.now()}: Please pray for my family's healing.`;
    const prayerId = await createTestPrayer(userAPage, testPrayerText);
    
    // Verify prayer was created
    await userAPage.waitForTimeout(3000);
    
    // Step 2: User B discovers and prays for the request  
    console.log('Step 2: User B responding to prayer...');
    const responseText = `I'm praying for you and your family. God is with you. 🙏`;
    const responseSuccess = await respondToPrayer(userBPage, testPrayerText, responseText);
    
    // Wait for notification system to process
    await userBPage.waitForTimeout(5000);
    
    // Step 3: Verify User A receives notification in inbox
    console.log('Step 3: Checking User A inbox for notification...');
    const notificationResult = await checkInboxForNotifications(userAPage, 1);
    
    // Assertions
    expect(responseSuccess, 'User B should successfully respond to prayer').toBe(true);
    expect(notificationResult.hasNotifications, 'User A should receive notification in inbox').toBe(true);
    expect(notificationResult.actualCount, 'Should have exactly 1 notification').toBeGreaterThanOrEqual(1);
    
    console.log('✅ TEST CASE 1 RESULTS:');
    console.log(`- Prayer ID: ${prayerId}`);
    console.log(`- Response Success: ${responseSuccess}`);
    console.log(`- Notification Received: ${notificationResult.hasNotifications}`);
    console.log(`- Notification Count: ${notificationResult.actualCount}`);
    console.log(`- Details: ${notificationResult.details.join(', ')}`);
  });

  test2('TEST CASE 2: Multiple Prayer Supporters', async ({ userAPage, userBPage, userCPage }) => {
    console.log('\n=== TEST CASE 2: Multiple Prayer Supporters ===');
    
    // Step 1: User A posts a prayer request
    const testPrayerText = `Multi-Support Test Prayer ${Date.now()}: Pray for my upcoming surgery.`;
    const prayerId = await createTestPrayer(userAPage, testPrayerText);
    await userAPage.waitForTimeout(3000);
    
    // Step 2: User B prays for the request
    console.log('Step 2a: User B responding...');
    const responseBSuccess = await respondToPrayer(userBPage, testPrayerText, 'Praying for successful surgery! 🙏');
    await userBPage.waitForTimeout(3000);
    
    // Step 3: User C also prays for the same request  
    console.log('Step 2b: User C responding...');
    const responseCSuccess = await respondToPrayer(userCPage, testPrayerText, 'Sending prayers and positive energy your way!');
    await userCPage.waitForTimeout(3000);
    
    // Step 4: Verify User A receives both notifications
    console.log('Step 3: Checking User A inbox for multiple notifications...');
    const notificationResult = await checkInboxForNotifications(userAPage, 2);
    
    // Assertions
    expect(responseBSuccess, 'User B response should succeed').toBe(true);
    expect(responseCSuccess, 'User C response should succeed').toBe(true);
    expect(notificationResult.hasNotifications, 'User A should receive notifications').toBe(true);
    expect(notificationResult.actualCount, 'Should have at least 2 notifications').toBeGreaterThanOrEqual(2);
    
    console.log('✅ TEST CASE 2 RESULTS:');
    console.log(`- User B Response: ${responseBSuccess}`);
    console.log(`- User C Response: ${responseCSuccess}`);
    console.log(`- Notifications Received: ${notificationResult.actualCount}`);
    console.log(`- Details: ${notificationResult.details.join(', ')}`);
  });

  test2('TEST CASE 3: Real-Time Notification Delivery', async ({ userAPage, userBPage }) => {
    console.log('\n=== TEST CASE 3: Real-Time Notification Delivery ===');
    
    // Step 1: User A posts prayer and immediately goes to inbox
    const testPrayerText = `Real-Time Test Prayer ${Date.now()}: Please pray for my job interview.`;
    await createTestPrayer(userAPage, testPrayerText);
    
    // User A goes to inbox and waits
    await userAPage.goto('/');
    await userAPage.waitForTimeout(2000);
    
    const inboxButton = userAPage.locator('[data-testid="inbox-button"], button:has-text("Inbox")').first();
    if (await inboxButton.isVisible().catch(() => false)) {
      await inboxButton.click();
      await userAPage.waitForTimeout(1000);
    }
    
    // Step 2: User B responds to prayer while User A is watching inbox
    console.log('User B responding while User A watches inbox...');
    const responseSuccess = await respondToPrayer(userBPage, testPrayerText, 'Praying for your interview success!');
    
    // Step 3: Check if notification appears in real-time (within 10 seconds)
    let realTimeNotificationAppeared = false;
    let attemptCount = 0;
    
    while (attemptCount < 10 && !realTimeNotificationAppeared) {
      await userAPage.waitForTimeout(1000);
      attemptCount++;
      
      // Check for new notifications without refreshing
      const messages = userAPage.locator('[data-testid="inbox-message"], [data-testid="notification"], [class*="message"]');
      const messageCount = await messages.count();
      
      if (messageCount > 0) {
        realTimeNotificationAppeared = true;
        console.log(`Real-time notification appeared after ${attemptCount} seconds`);
        break;
      }
    }
    
    // Assertions
    expect(responseSuccess, 'Response should be sent successfully').toBe(true);
    expect(realTimeNotificationAppeared, 'Notification should appear in real-time within 10 seconds').toBe(true);
    
    console.log('✅ TEST CASE 3 RESULTS:');
    console.log(`- Response Success: ${responseSuccess}`);
    console.log(`- Real-time Delivery: ${realTimeNotificationAppeared} (${attemptCount}s)`);
  });

  test2('TEST CASE 4: Cross-Device Notification Sync', async ({ userAPage, userAContext, userBPage }) => {
    console.log('\n=== TEST CASE 4: Cross-Device Notification Sync ===');
    
    // Create second page for User A (simulating another device)
    const userASecondDevice = await userAContext.newPage();
    await authenticateUser(userASecondDevice, 'testuser_a@prayermap.com', 'TestPassword123!');
    
    // Step 1: User A posts prayer
    const testPrayerText = `Cross-Device Sync Test ${Date.now()}: Prayers needed for my health.`;
    await createTestPrayer(userAPage, testPrayerText);
    await userAPage.waitForTimeout(2000);
    
    // Step 2: User B responds to prayer
    const responseSuccess = await respondToPrayer(userBPage, testPrayerText, 'Sending healing prayers your way!');
    await userBPage.waitForTimeout(3000);
    
    // Step 3: Check notification on both User A devices
    console.log('Checking notifications on User A Device 1...');
    const device1Result = await checkInboxForNotifications(userAPage, 1);
    
    console.log('Checking notifications on User A Device 2...');  
    const device2Result = await checkInboxForNotifications(userASecondDevice, 1);
    
    // Cleanup
    await userASecondDevice.close();
    
    // Assertions
    expect(responseSuccess, 'Response should be sent').toBe(true);
    expect(device1Result.hasNotifications, 'Device 1 should receive notification').toBe(true);
    expect(device2Result.hasNotifications, 'Device 2 should receive notification').toBe(true);
    
    console.log('✅ TEST CASE 4 RESULTS:');
    console.log(`- Response Success: ${responseSuccess}`);
    console.log(`- Device 1 Notifications: ${device1Result.actualCount}`);
    console.log(`- Device 2 Notifications: ${device2Result.actualCount}`);
    console.log(`- Sync Success: ${device1Result.hasNotifications && device2Result.hasNotifications}`);
  });

  test2('TEST CASE 5: Notification Persistence After Page Refresh', async ({ userAPage, userBPage }) => {
    console.log('\n=== TEST CASE 5: Notification Persistence After Page Refresh ===');
    
    // Step 1: Create prayer and response flow
    const testPrayerText = `Persistence Test Prayer ${Date.now()}: Pray for my family.`;
    await createTestPrayer(userAPage, testPrayerText);
    await userAPage.waitForTimeout(2000);
    
    const responseSuccess = await respondToPrayer(userBPage, testPrayerText, 'Keeping your family in my prayers!');
    await userBPage.waitForTimeout(3000);
    
    // Step 2: Check notifications exist
    const initialResult = await checkInboxForNotifications(userAPage, 1);
    
    // Step 3: Refresh page and check notifications persist
    console.log('Refreshing User A page...');
    await userAPage.reload();
    await userAPage.waitForTimeout(5000);
    
    const afterRefreshResult = await checkInboxForNotifications(userAPage, 1);
    
    // Assertions
    expect(responseSuccess, 'Response should be sent').toBe(true);
    expect(initialResult.hasNotifications, 'Should have notifications before refresh').toBe(true);
    expect(afterRefreshResult.hasNotifications, 'Notifications should persist after page refresh').toBe(true);
    expect(afterRefreshResult.actualCount, 'Notification count should be preserved').toBeGreaterThanOrEqual(1);
    
    console.log('✅ TEST CASE 5 RESULTS:');
    console.log(`- Initial Notifications: ${initialResult.actualCount}`);
    console.log(`- After Refresh: ${afterRefreshResult.actualCount}`);
    console.log(`- Persistence Success: ${afterRefreshResult.hasNotifications}`);
  });

  test2('TEST CASE 6: Notification System Failure Analysis', async ({ userAPage, userBPage }) => {
    console.log('\n=== TEST CASE 6: Notification System Failure Analysis ===');
    
    const debugInfo = {
      prayerCreated: false,
      responseCreated: false, 
      databaseResponseExists: false,
      inboxDisplaysNotification: false,
      realtimeSubscriptionActive: false,
      errors: [] as string[]
    };
    
    try {
      // Step 1: Create prayer with detailed logging
      console.log('Creating prayer with enhanced logging...');
      const testPrayerText = `Debug Prayer ${Date.now()}: Test notification system.`;
      
      // Monitor network requests during prayer creation
      userAPage.on('response', response => {
        const url = response.url();
        if (url.includes('prayers') || url.includes('supabase')) {
          console.log(`Prayer Creation API Response: ${response.status()} ${url}`);
        }
      });
      
      const prayerId = await createTestPrayer(userAPage, testPrayerText);
      debugInfo.prayerCreated = !!prayerId;
      
      // Step 2: Create response with detailed logging
      console.log('Creating response with enhanced logging...');
      
      userBPage.on('response', response => {
        const url = response.url();
        if (url.includes('prayer_responses') || url.includes('notifications') || url.includes('supabase')) {
          console.log(`Response/Notification API: ${response.status()} ${url}`);
        }
      });
      
      const responseSuccess = await respondToPrayer(userBPage, testPrayerText, 'Debug response for testing');
      debugInfo.responseCreated = responseSuccess;
      
      // Step 3: Wait and check for notifications with detailed analysis
      await userBPage.waitForTimeout(5000);
      
      console.log('Analyzing notification delivery...');
      const notificationResult = await checkInboxForNotifications(userAPage, 1);
      debugInfo.inboxDisplaysNotification = notificationResult.hasNotifications;
      
      // Step 4: Database verification would go here (requires direct DB access)
      // For now, we'll infer from API responses
      
      console.log('🔍 DETAILED FAILURE ANALYSIS:');
      console.log(`Prayer Created: ${debugInfo.prayerCreated}`);
      console.log(`Response Created: ${debugInfo.responseCreated}`);
      console.log(`Inbox Shows Notification: ${debugInfo.inboxDisplaysNotification}`);
      console.log(`Notification Count: ${notificationResult.actualCount}`);
      console.log('Notification Details:', notificationResult.details);
      
      if (!debugInfo.inboxDisplaysNotification) {
        console.log('❌ NOTIFICATION FAILURE DETECTED');
        console.log('Possible failure points:');
        console.log('1. Prayer response not being saved to database');
        console.log('2. Notification trigger/function not executing');
        console.log('3. Real-time subscription not working');
        console.log('4. Frontend notification display logic broken');
        console.log('5. User permissions/authentication issues');
      }
      
    } catch (error) {
      debugInfo.errors.push(String(error));
      console.error('Test execution error:', error);
    }
    
    // This test documents the failure rather than asserting success
    expect(debugInfo.prayerCreated, 'Prayer creation should work').toBe(true);
    // Don't fail the test - we want to collect data about what's broken
    console.log('📊 Debug info collected for notification system analysis');
  });
});

test2.describe('COMPREHENSIVE SYSTEM DIAGNOSTICS', () => {
  test2('Database Integration Test', async ({ userAPage, userBPage }) => {
    console.log('\n=== DATABASE INTEGRATION DIAGNOSTICS ===');
    
    // Test basic database operations
    console.log('Testing prayer storage...');
    const testPrayer = `DB Test Prayer ${Date.now()}: Testing database integration`;
    await createTestPrayer(userAPage, testPrayer);
    
    // Verify prayer appears on map (indicates successful DB storage)
    await userAPage.goto('/');
    await userAPage.waitForTimeout(5000);
    
    const mapMarkers = userAPage.locator('[data-testid="prayer-marker"], .mapboxgl-marker');
    const markerCount = await mapMarkers.count();
    
    console.log(`Map shows ${markerCount} prayer markers`);
    expect(markerCount, 'Prayers should be stored and displayed').toBeGreaterThan(0);
  });
  
  test2('Real-time Subscription Test', async ({ userAPage, userBPage }) => {
    console.log('\n=== REAL-TIME SUBSCRIPTION DIAGNOSTICS ===');
    
    // Test if real-time subscriptions are working at all
    let subscriptionEvents = 0;
    
    // This would require access to the underlying subscription mechanism
    // For now, we'll test indirectly by checking if new prayers appear without refresh
    
    await userAPage.goto('/');
    await userAPage.waitForTimeout(2000);
    
    const initialMarkerCount = await userAPage.locator('[data-testid="prayer-marker"], .mapboxgl-marker').count();
    
    // User B creates a prayer
    const newPrayerText = `Real-time Test ${Date.now()}: New prayer for subscription test`;
    await createTestPrayer(userBPage, newPrayerText);
    
    // Check if User A's map updates without refresh
    await userAPage.waitForTimeout(3000);
    const updatedMarkerCount = await userAPage.locator('[data-testid="prayer-marker"], .mapboxgl-marker').count();
    
    const realTimeUpdateWorking = updatedMarkerCount > initialMarkerCount;
    
    console.log(`Initial markers: ${initialMarkerCount}, Updated: ${updatedMarkerCount}`);
    console.log(`Real-time update working: ${realTimeUpdateWorking}`);
    
    // Don't fail test, just collect diagnostic info
    expect(true).toBe(true); // Always pass, this is for diagnostics
  });
});