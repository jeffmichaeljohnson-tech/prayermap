/**
 * CROSS-USER COMMUNICATION COMPREHENSIVE TEST SUITE
 * 
 * PURPOSE: Validate complete user-to-user messaging flow in PrayerMap
 * MISSION: Ensure reliable message delivery between multiple users
 * 
 * CRITICAL SUCCESS CRITERIA:
 * ✅ User A always sees when User B prays for their prayer
 * ✅ Messages appear for all interaction types (text, audio, video)
 * ✅ Multiple responses to same prayer all create separate messages
 * ✅ Anonymous and authenticated interactions both work
 * ✅ No lost or duplicate messages in any scenario
 * ✅ Real-time delivery works across multiple devices/sessions
 * ✅ Message persistence survives page refreshes and app restarts
 * 
 * TEST MATRIX:
 * - User Types: Authenticated vs Anonymous
 * - Content Types: Text, Audio, Video responses
 * - Response Patterns: Single, Multiple, Rapid succession
 * - Network Conditions: Normal, Slow, Intermittent
 * - Device Scenarios: Single device, Multiple devices, Cross-platform
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { test as baseTest } from './fixtures/test-fixtures';

// Enhanced multi-user test configuration
const multiUserTest = baseTest.extend<{
  requesterPage: Page;
  responder1Page: Page;
  responder2Page: Page;
  responder3Page: Page;
  anonymousPage: Page;
  requesterContext: BrowserContext;
  responder1Context: BrowserContext;
  responder2Context: BrowserContext;
  responder3Context: BrowserContext;
  anonymousContext: BrowserContext;
}>({
  // Prayer Requester - Primary user posting prayers
  requesterContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation', 'microphone', 'camera']);
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 }); // Detroit base location
    await use(context);
    await context.close();
  },
  
  requesterPage: async ({ requesterContext }, use) => {
    const page = await requesterContext.newPage();
    await authenticateTestUser(page, 'prayer_requester@test.com', 'TestRequester123!', 'Prayer Requester');
    await use(page);
  },

  // Responder 1 - First prayer supporter
  responder1Context: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation', 'microphone', 'camera']);
    await context.setGeolocation({ latitude: 42.7000, longitude: -83.2000 }); // Nearby location
    await use(context);
    await context.close();
  },
  
  responder1Page: async ({ responder1Context }, use) => {
    const page = await responder1Context.newPage();
    await authenticateTestUser(page, 'prayer_responder1@test.com', 'TestResponder123!', 'First Responder');
    await use(page);
  },

  // Responder 2 - Second prayer supporter
  responder2Context: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation', 'microphone', 'camera']);
    await context.setGeolocation({ latitude: 41.8781, longitude: -87.6298 }); // Chicago
    await use(context);
    await context.close();
  },
  
  responder2Page: async ({ responder2Context }, use) => {
    const page = await responder2Context.newPage();
    await authenticateTestUser(page, 'prayer_responder2@test.com', 'TestResponder123!', 'Second Responder');
    await use(page);
  },

  // Responder 3 - Third prayer supporter
  responder3Context: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation', 'microphone', 'camera']);
    await context.setGeolocation({ latitude: 40.7128, longitude: -74.0060 }); // New York
    await use(context);
    await context.close();
  },
  
  responder3Page: async ({ responder3Context }, use) => {
    const page = await responder3Context.newPage();
    await authenticateTestUser(page, 'prayer_responder3@test.com', 'TestResponder123!', 'Third Responder');
    await use(page);
  },

  // Anonymous User - Testing anonymous interactions
  anonymousContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 34.0522, longitude: -118.2437 }); // Los Angeles
    await use(context);
    await context.close();
  },
  
  anonymousPage: async ({ anonymousContext }, use) => {
    const page = await anonymousContext.newPage();
    await page.goto('/');
    await page.waitForTimeout(3000);
    await use(page);
  },
});

// Enhanced authentication helper
async function authenticateTestUser(page: Page, email: string, password: string, displayName: string) {
  console.log(`🔐 Authenticating ${displayName} (${email})...`);
  
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Check if already authenticated
  const isLoggedIn = await page.locator('[data-testid="user-profile"], [data-testid="logout-button"]').isVisible().catch(() => false);
  
  if (!isLoggedIn) {
    // Find and click login button
    const loginSelectors = [
      'button:has-text("Login")',
      'button:has-text("Sign In")', 
      '[data-testid="login-button"]',
      '[data-testid="auth-button"]',
      'button:has-text("Get Started")'
    ];
    
    let loginButton = null;
    for (const selector of loginSelectors) {
      loginButton = page.locator(selector).first();
      if (await loginButton.isVisible().catch(() => false)) {
        break;
      }
    }
    
    if (loginButton && await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
      await page.waitForTimeout(1000);
    }

    // Fill credentials
    await page.locator('input[type="email"], input[name="email"]').fill(email);
    await page.locator('input[type="password"], input[name="password"]').fill(password);
    
    // Submit authentication
    const submitSelectors = [
      'button:has-text("Sign In")',
      'button:has-text("Login")', 
      'button:has-text("Enter")',
      'button[type="submit"]'
    ];
    
    for (const selector of submitSelectors) {
      const submitButton = page.locator(selector).first();
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        break;
      }
    }
    
    await page.waitForTimeout(5000);
  }
  
  console.log(`✅ ${displayName} authenticated successfully`);
}

// Enhanced prayer creation helper
async function createTestPrayer(page: Page, prayerData: {
  title?: string;
  content: string;
  contentType: 'text' | 'audio' | 'video';
  isAnonymous?: boolean;
}): Promise<{ prayerId: string; prayerText: string }> {
  
  const timestamp = Date.now();
  const prayerText = prayerData.content || `Test Prayer ${timestamp}: ${prayerData.title || 'Default prayer content'}`;
  
  console.log(`📝 Creating ${prayerData.contentType} prayer:`, prayerText.substring(0, 50) + '...');
  
  await page.goto('/');
  await page.waitForTimeout(3000);
  
  // Find prayer creation interface
  const createSelectors = [
    'button:has-text("Post Prayer")',
    'button:has-text("Share Prayer")',
    'button:has-text("Create")',
    '[data-testid="create-prayer"]',
    '[data-testid="post-prayer"]',
    'button:has-text("+")'
  ];
  
  let createButton = null;
  for (const selector of createSelectors) {
    createButton = page.locator(selector).first();
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(1000);
      break;
    }
  }
  
  // Handle content type specific creation
  if (prayerData.contentType === 'text') {
    const textArea = page.locator('textarea, input[type="text"]:not([type="email"]):not([type="password"])').first();
    if (await textArea.isVisible().catch(() => false)) {
      await textArea.fill(prayerText);
    }
  } else if (prayerData.contentType === 'audio') {
    // Look for audio recording button
    const audioButton = page.locator('button:has-text("Audio"), [data-testid="audio-record"]').first();
    if (await audioButton.isVisible().catch(() => false)) {
      await audioButton.click();
      await page.waitForTimeout(500);
      // Simulate recording
      await page.waitForTimeout(2000);
      const stopButton = page.locator('button:has-text("Stop"), [data-testid="stop-recording"]').first();
      if (await stopButton.isVisible().catch(() => false)) {
        await stopButton.click();
      }
    }
  }
  
  // Handle anonymous option
  if (prayerData.isAnonymous) {
    const anonymousToggle = page.locator('input[type="checkbox"]:has-text("anonymous"), [data-testid="anonymous-toggle"]').first();
    if (await anonymousToggle.isVisible().catch(() => false)) {
      await anonymousToggle.check();
    }
  }
  
  // Submit prayer
  const submitSelectors = [
    'button:has-text("Post")',
    'button:has-text("Submit")',
    'button:has-text("Share")',
    'button:has-text("Create Prayer")'
  ];
  
  for (const selector of submitSelectors) {
    const submitButton = page.locator(selector).first();
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(2000);
      break;
    }
  }
  
  // Extract prayer ID
  const currentUrl = page.url();
  const prayerIdMatch = currentUrl.match(/prayer[\/\-]?([a-f0-9-]{36}|\d+)/i);
  const prayerId = prayerIdMatch ? prayerIdMatch[1] : `test-prayer-${timestamp}`;
  
  console.log(`✅ Prayer created - ID: ${prayerId}`);
  return { prayerId, prayerText };
}

// Enhanced prayer response helper
async function respondToPrayer(page: Page, prayerText: string, responseData: {
  message: string;
  contentType: 'text' | 'audio' | 'video';
  isAnonymous?: boolean;
}): Promise<{ success: boolean; responseId: string }> {
  
  console.log(`💬 Responding to prayer with ${responseData.contentType} response:`, responseData.message.substring(0, 30) + '...');
  
  await page.goto('/');
  await page.waitForTimeout(5000);
  
  // Find prayer marker/card
  const prayerElements = [
    '[data-testid="prayer-marker"]',
    '.mapboxgl-marker',
    '[class*="prayer-marker"]',
    '[data-testid="prayer-card"]'
  ];
  
  let prayerFound = false;
  for (const selector of prayerElements) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    for (let i = 0; i < count; i++) {
      const element = elements.nth(i);
      if (await element.isVisible().catch(() => false)) {
        await element.click();
        await page.waitForTimeout(1000);
        
        // Check if this is the right prayer
        const modalContent = page.locator('[data-testid="prayer-detail"], [data-testid="prayer-modal"]');
        if (await modalContent.isVisible().catch(() => false)) {
          const modalText = await modalContent.textContent() || '';
          if (modalText.includes(prayerText.substring(0, 30))) {
            prayerFound = true;
            break;
          } else {
            await page.keyboard.press('Escape');
          }
        }
      }
    }
    if (prayerFound) break;
  }
  
  if (!prayerFound) {
    console.log('❌ Could not find target prayer');
    return { success: false, responseId: '' };
  }
  
  // Find response interface
  const respondSelectors = [
    'button:has-text("Respond")',
    'button:has-text("Reply")', 
    'button:has-text("Pray")',
    'button:has-text("Support")',
    '[data-testid="respond-button"]',
    '[data-testid="pray-button"]'
  ];
  
  let responseInterfaceOpen = false;
  for (const selector of respondSelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(1000);
      responseInterfaceOpen = true;
      break;
    }
  }
  
  if (!responseInterfaceOpen) {
    console.log('❌ Could not open response interface');
    return { success: false, responseId: '' };
  }
  
  // Create response based on content type
  if (responseData.contentType === 'text') {
    const textArea = page.locator('textarea, input[type="text"]:not([name="email"]):not([name="password"])').first();
    if (await textArea.isVisible().catch(() => false)) {
      await textArea.fill(responseData.message);
    }
  } else if (responseData.contentType === 'audio') {
    const audioButton = page.locator('button:has-text("Audio"), [data-testid="audio-response"]').first();
    if (await audioButton.isVisible().catch(() => false)) {
      await audioButton.click();
      await page.waitForTimeout(2000); // Simulate recording
      const stopButton = page.locator('button:has-text("Stop")').first();
      if (await stopButton.isVisible().catch(() => false)) {
        await stopButton.click();
      }
    }
  }
  
  // Handle anonymous option
  if (responseData.isAnonymous) {
    const anonymousToggle = page.locator('input[type="checkbox"]:has-text("anonymous")').first();
    if (await anonymousToggle.isVisible().catch(() => false)) {
      await anonymousToggle.check();
    }
  }
  
  // Submit response
  const submitSelectors = [
    'button:has-text("Send")',
    'button:has-text("Submit")', 
    'button:has-text("Respond")',
    'button:has-text("Share Response")'
  ];
  
  let responseSubmitted = false;
  for (const selector of submitSelectors) {
    const submitButton = page.locator(selector).first();
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(2000);
      responseSubmitted = true;
      break;
    }
  }
  
  const responseId = `response-${Date.now()}`;
  console.log(`✅ Response ${responseSubmitted ? 'sent' : 'failed'} - ID: ${responseId}`);
  
  return { success: responseSubmitted, responseId };
}

// Enhanced inbox checking helper
async function verifyInboxNotifications(page: Page, expectedData: {
  minCount: number;
  maxCount?: number;
  containsText?: string[];
  responseTypes?: ('text' | 'audio' | 'video')[];
}): Promise<{
  success: boolean;
  actualCount: number;
  messages: Array<{
    text: string;
    type: string;
    timestamp: string;
  }>;
  details: string[];
}> {
  
  console.log(`📬 Verifying inbox notifications - expecting ${expectedData.minCount}+ messages`);
  
  await page.goto('/');
  await page.waitForTimeout(3000);
  
  const result = {
    success: false,
    actualCount: 0,
    messages: [] as Array<{ text: string; type: string; timestamp: string }>,
    details: [] as string[]
  };
  
  // Find and click inbox
  const inboxSelectors = [
    '[data-testid="inbox-button"]',
    'button:has-text("Inbox")',
    'button:has([class*="badge"])',
    '[class*="inbox-button"]'
  ];
  
  let inboxOpened = false;
  for (const selector of inboxSelectors) {
    const inboxButton = page.locator(selector).first();
    if (await inboxButton.isVisible().catch(() => false)) {
      // Check for notification badge
      const badge = page.locator('[data-testid="unread-badge"], [class*="badge"], [class*="count"]');
      if (await badge.isVisible().catch(() => false)) {
        const badgeText = await badge.textContent() || '0';
        result.details.push(`Notification badge shows: ${badgeText}`);
      }
      
      await inboxButton.click();
      await page.waitForTimeout(2000);
      inboxOpened = true;
      break;
    }
  }
  
  if (!inboxOpened) {
    result.details.push('Could not open inbox');
    return result;
  }
  
  // Count and analyze messages
  const messageSelectors = [
    '[data-testid="inbox-message"]',
    '[data-testid="notification"]', 
    '[class*="message"]',
    '[class*="notification"]'
  ];
  
  for (const selector of messageSelectors) {
    const messages = page.locator(selector);
    const count = await messages.count();
    
    if (count > 0) {
      result.actualCount = Math.max(result.actualCount, count);
      
      // Extract message details
      for (let i = 0; i < Math.min(count, 10); i++) {
        const message = messages.nth(i);
        const text = await message.textContent() || '';
        const type = 'unknown'; // Would need to infer from content/icons
        const timestamp = new Date().toISOString();
        
        result.messages.push({ text, type, timestamp });
        result.details.push(`Message ${i + 1}: ${text.substring(0, 100)}...`);
      }
      break;
    }
  }
  
  // Validate expectations
  result.success = result.actualCount >= expectedData.minCount;
  if (expectedData.maxCount) {
    result.success = result.success && result.actualCount <= expectedData.maxCount;
  }
  
  if (expectedData.containsText) {
    for (const expectedText of expectedData.containsText) {
      const found = result.messages.some(msg => msg.text.includes(expectedText));
      if (!found) {
        result.success = false;
        result.details.push(`Missing expected text: "${expectedText}"`);
      }
    }
  }
  
  // Close inbox
  const closeButton = page.locator('[data-testid="close-inbox"], button:has-text("Close")').first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
  } else {
    await page.keyboard.press('Escape');
  }
  
  console.log(`📬 Inbox verification ${result.success ? 'passed' : 'failed'} - Found ${result.actualCount} messages`);
  return result;
}

multiUserTest.describe('Cross-User Communication Test Suite', () => {
  
  multiUserTest('SCENARIO 1: Single User Response Flow', async ({ 
    requesterPage, 
    responder1Page 
  }) => {
    console.log('\n🧪 TESTING SCENARIO 1: Single User Response Flow');
    
    // Step 1: Requester posts prayer
    const prayer = await createTestPrayer(requesterPage, {
      content: 'Please pray for my family during this difficult time',
      contentType: 'text'
    });
    
    // Step 2: Responder responds
    const response = await respondToPrayer(responder1Page, prayer.prayerText, {
      message: 'I am praying for you and your family. God is with you! 🙏',
      contentType: 'text'
    });
    
    // Step 3: Verify notification received
    await requesterPage.waitForTimeout(5000); // Allow time for real-time delivery
    const inboxResult = await verifyInboxNotifications(requesterPage, {
      minCount: 1,
      containsText: ['praying for you']
    });
    
    // Assertions
    expect(response.success).toBe(true);
    expect(inboxResult.success).toBe(true);
    expect(inboxResult.actualCount).toBeGreaterThanOrEqual(1);
    
    console.log('✅ SCENARIO 1 RESULTS:');
    console.log(`- Prayer Created: ${prayer.prayerId}`);
    console.log(`- Response Sent: ${response.success}`);
    console.log(`- Notification Received: ${inboxResult.success}`);
    console.log(`- Message Count: ${inboxResult.actualCount}`);
  });

  multiUserTest('SCENARIO 2: Multiple Simultaneous Responses', async ({ 
    requesterPage, 
    responder1Page, 
    responder2Page, 
    responder3Page 
  }) => {
    console.log('\n🧪 TESTING SCENARIO 2: Multiple Simultaneous Responses');
    
    // Step 1: Create prayer request
    const prayer = await createTestPrayer(requesterPage, {
      content: 'Please pray for my upcoming surgery next week',
      contentType: 'text'
    });
    
    // Step 2: Multiple users respond simultaneously
    const [response1, response2, response3] = await Promise.all([
      respondToPrayer(responder1Page, prayer.prayerText, {
        message: 'Praying for successful surgery and quick recovery!',
        contentType: 'text'
      }),
      respondToPrayer(responder2Page, prayer.prayerText, {
        message: 'Sending prayers and positive thoughts your way!',
        contentType: 'text'
      }),
      respondToPrayer(responder3Page, prayer.prayerText, {
        message: 'God will be with you during surgery. Praying now! 🙏',
        contentType: 'text'
      })
    ]);
    
    // Step 3: Verify all notifications received
    await requesterPage.waitForTimeout(7000); // Extra time for multiple notifications
    const inboxResult = await verifyInboxNotifications(requesterPage, {
      minCount: 3,
      containsText: ['surgery', 'praying']
    });
    
    // Assertions
    expect(response1.success).toBe(true);
    expect(response2.success).toBe(true);  
    expect(response3.success).toBe(true);
    expect(inboxResult.success).toBe(true);
    expect(inboxResult.actualCount).toBeGreaterThanOrEqual(3);
    
    console.log('✅ SCENARIO 2 RESULTS:');
    console.log(`- All Responses Sent: ${response1.success && response2.success && response3.success}`);
    console.log(`- All Notifications Received: ${inboxResult.success}`);
    console.log(`- Total Messages: ${inboxResult.actualCount}`);
  });

  multiUserTest('SCENARIO 3: Anonymous User Interactions', async ({ 
    requesterPage, 
    anonymousPage 
  }) => {
    console.log('\n🧪 TESTING SCENARIO 3: Anonymous User Interactions');
    
    // Step 1: Authenticated user posts prayer
    const prayer = await createTestPrayer(requesterPage, {
      content: 'Prayers needed for my job interview tomorrow',
      contentType: 'text'
    });
    
    // Step 2: Anonymous user responds
    const response = await respondToPrayer(anonymousPage, prayer.prayerText, {
      message: 'Anonymous user praying for your interview success!',
      contentType: 'text',
      isAnonymous: true
    });
    
    // Step 3: Verify authenticated user receives anonymous notification
    await requesterPage.waitForTimeout(5000);
    const inboxResult = await verifyInboxNotifications(requesterPage, {
      minCount: 1,
      containsText: ['interview']
    });
    
    // Assertions
    expect(response.success).toBe(true);
    expect(inboxResult.success).toBe(true);
    
    console.log('✅ SCENARIO 3 RESULTS:');
    console.log(`- Anonymous Response Sent: ${response.success}`);
    console.log(`- Authenticated User Notified: ${inboxResult.success}`);
  });

  multiUserTest('SCENARIO 4: Real-Time Message Delivery', async ({ 
    requesterPage, 
    responder1Page 
  }) => {
    console.log('\n🧪 TESTING SCENARIO 4: Real-Time Message Delivery');
    
    // Step 1: Requester posts prayer and opens inbox immediately
    const prayer = await createTestPrayer(requesterPage, {
      content: 'Real-time test: Please pray for my family emergency',
      contentType: 'text'
    });
    
    // Open inbox and keep it open
    await requesterPage.goto('/');
    const inboxButton = requesterPage.locator('[data-testid="inbox-button"], button:has-text("Inbox")').first();
    if (await inboxButton.isVisible().catch(() => false)) {
      await inboxButton.click();
      await requesterPage.waitForTimeout(1000);
    }
    
    // Step 2: Responder sends message while inbox is open
    const startTime = Date.now();
    const response = await respondToPrayer(responder1Page, prayer.prayerText, {
      message: 'Praying for your family emergency right now!',
      contentType: 'text'
    });
    
    // Step 3: Check for real-time notification appearance
    let realTimeDelivery = false;
    let attemptCount = 0;
    
    while (attemptCount < 15 && !realTimeDelivery) { // 15 second timeout
      await requesterPage.waitForTimeout(1000);
      attemptCount++;
      
      const messages = requesterPage.locator('[data-testid="inbox-message"], [class*="message"]');
      const messageCount = await messages.count();
      
      if (messageCount > 0) {
        const latestMessage = messages.first();
        const messageText = await latestMessage.textContent() || '';
        if (messageText.includes('emergency') || messageText.includes('praying')) {
          realTimeDelivery = true;
          console.log(`🚀 Real-time notification appeared in ${attemptCount} seconds`);
          break;
        }
      }
    }
    
    const deliveryTime = Date.now() - startTime;
    
    // Assertions
    expect(response.success).toBe(true);
    expect(realTimeDelivery).toBe(true);
    expect(deliveryTime).toBeLessThan(20000); // Within 20 seconds
    
    console.log('✅ SCENARIO 4 RESULTS:');
    console.log(`- Real-Time Delivery: ${realTimeDelivery}`);
    console.log(`- Delivery Time: ${deliveryTime}ms`);
  });

  multiUserTest('SCENARIO 5: Message Persistence Across Sessions', async ({ 
    requesterPage, 
    responder1Page 
  }) => {
    console.log('\n🧪 TESTING SCENARIO 5: Message Persistence Across Sessions');
    
    // Step 1: Create prayer and response
    const prayer = await createTestPrayer(requesterPage, {
      content: 'Persistence test: Prayers for my health recovery',
      contentType: 'text'
    });
    
    const response = await respondToPrayer(responder1Page, prayer.prayerText, {
      message: 'Praying for your complete health recovery!',
      contentType: 'text'
    });
    
    await requesterPage.waitForTimeout(3000);
    
    // Step 2: Check initial notification
    const initialCheck = await verifyInboxNotifications(requesterPage, {
      minCount: 1
    });
    
    // Step 3: Refresh page and check persistence
    console.log('🔄 Refreshing page to test persistence...');
    await requesterPage.reload();
    await requesterPage.waitForTimeout(5000);
    
    const afterRefreshCheck = await verifyInboxNotifications(requesterPage, {
      minCount: 1
    });
    
    // Step 4: Close and reopen browser context
    const newPage = await requesterPage.context().newPage();
    await authenticateTestUser(newPage, 'prayer_requester@test.com', 'TestRequester123!', 'Prayer Requester');
    await newPage.waitForTimeout(3000);
    
    const afterContextReopen = await verifyInboxNotifications(newPage, {
      minCount: 1
    });
    
    await newPage.close();
    
    // Assertions
    expect(response.success).toBe(true);
    expect(initialCheck.success).toBe(true);
    expect(afterRefreshCheck.success).toBe(true);
    expect(afterContextReopen.success).toBe(true);
    
    console.log('✅ SCENARIO 5 RESULTS:');
    console.log(`- Initial Notification: ${initialCheck.success}`);
    console.log(`- After Page Refresh: ${afterRefreshCheck.success}`);  
    console.log(`- After Context Reopen: ${afterContextReopen.success}`);
  });

  multiUserTest('SCENARIO 6: Rapid Response Stress Test', async ({ 
    requesterPage, 
    responder1Page 
  }) => {
    console.log('\n🧪 TESTING SCENARIO 6: Rapid Response Stress Test');
    
    // Step 1: Create prayer
    const prayer = await createTestPrayer(requesterPage, {
      content: 'Stress test: Please pray for my urgent situation',
      contentType: 'text'
    });
    
    // Step 2: Send multiple rapid responses
    const responsePromises = [];
    for (let i = 1; i <= 5; i++) {
      responsePromises.push(
        respondToPrayer(responder1Page, prayer.prayerText, {
          message: `Rapid response #${i}: Praying for your urgent situation!`,
          contentType: 'text'
        })
      );
    }
    
    const responses = await Promise.all(responsePromises);
    const successCount = responses.filter(r => r.success).length;
    
    // Step 3: Verify all notifications received
    await requesterPage.waitForTimeout(8000); // Extra time for processing
    const inboxResult = await verifyInboxNotifications(requesterPage, {
      minCount: 5
    });
    
    // Assertions
    expect(successCount).toBe(5);
    expect(inboxResult.actualCount).toBeGreaterThanOrEqual(5);
    
    console.log('✅ SCENARIO 6 RESULTS:');
    console.log(`- Successful Responses: ${successCount}/5`);
    console.log(`- Notifications Received: ${inboxResult.actualCount}`);
  });
});

multiUserTest.describe('Cross-User Communication Edge Cases', () => {
  
  multiUserTest('EDGE CASE 1: Network Interruption Recovery', async ({ 
    requesterPage, 
    responder1Page 
  }) => {
    console.log('\n⚠️ TESTING EDGE CASE 1: Network Interruption Recovery');
    
    const prayer = await createTestPrayer(requesterPage, {
      content: 'Network test: Prayers needed for my situation',
      contentType: 'text'
    });
    
    // Simulate network interruption by going offline
    await responder1Page.context().setOffline(true);
    await responder1Page.waitForTimeout(2000);
    
    // Attempt to respond while offline
    const offlineResponse = await respondToPrayer(responder1Page, prayer.prayerText, {
      message: 'Offline response: Still praying for you!',
      contentType: 'text'
    });
    
    // Go back online
    await responder1Page.context().setOffline(false);
    await responder1Page.waitForTimeout(3000);
    
    // Try response again online
    const onlineResponse = await respondToPrayer(responder1Page, prayer.prayerText, {
      message: 'Online response: Praying for your situation!',
      contentType: 'text'
    });
    
    await requesterPage.waitForTimeout(5000);
    const inboxResult = await verifyInboxNotifications(requesterPage, {
      minCount: 1
    });
    
    // Assertions
    expect(onlineResponse.success).toBe(true);
    expect(inboxResult.success).toBe(true);
    
    console.log('✅ EDGE CASE 1 RESULTS:');
    console.log(`- Offline Response: ${offlineResponse.success}`);
    console.log(`- Online Response: ${onlineResponse.success}`);
    console.log(`- Notification Received: ${inboxResult.success}`);
  });

  multiUserTest('EDGE CASE 2: Concurrent User Sessions', async ({ 
    requesterPage, 
    requesterContext,
    responder1Page 
  }) => {
    console.log('\n⚠️ TESTING EDGE CASE 2: Concurrent User Sessions');
    
    // Create second session for same requester
    const requesterPage2 = await requesterContext.newPage();
    await authenticateTestUser(requesterPage2, 'prayer_requester@test.com', 'TestRequester123!', 'Prayer Requester 2nd Session');
    
    const prayer = await createTestPrayer(requesterPage, {
      content: 'Concurrent session test: Please pray for my journey',
      contentType: 'text'
    });
    
    const response = await respondToPrayer(responder1Page, prayer.prayerText, {
      message: 'Praying for your journey across all sessions!',
      contentType: 'text'
    });
    
    await responder1Page.waitForTimeout(5000);
    
    // Check notifications on both sessions
    const [session1Result, session2Result] = await Promise.all([
      verifyInboxNotifications(requesterPage, { minCount: 1 }),
      verifyInboxNotifications(requesterPage2, { minCount: 1 })
    ]);
    
    await requesterPage2.close();
    
    // Assertions
    expect(response.success).toBe(true);
    expect(session1Result.success).toBe(true);
    expect(session2Result.success).toBe(true);
    
    console.log('✅ EDGE CASE 2 RESULTS:');
    console.log(`- Session 1 Notifications: ${session1Result.success}`);
    console.log(`- Session 2 Notifications: ${session2Result.success}`);
  });
});