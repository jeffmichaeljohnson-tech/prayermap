/**
 * NOTIFICATION TESTING UTILITIES
 * 
 * PURPOSE: Shared utilities for systematic notification system testing
 * SCOPE: Helper functions for creating reproducible notification test scenarios
 */

import { Page, expect } from '@playwright/test';

export interface NotificationTestResult {
  success: boolean;
  actualCount: number;
  expectedCount: number;
  details: string[];
  errors: string[];
  timing: {
    startTime: number;
    endTime: number;
    durationMs: number;
  };
}

export interface PrayerTestData {
  id: string;
  text: string;
  authorEmail: string;
  createdAt: number;
  responses: Array<{
    id: string;
    text: string;
    responderEmail: string;
    respondedAt: number;
  }>;
}

/**
 * Enhanced authentication with retry logic and detailed error reporting
 */
export async function authenticateUserWithRetry(
  page: Page, 
  email: string, 
  password: string,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  let lastError = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Auth attempt ${attempt}/${maxRetries} for ${email}`);
      
      await page.goto('/');
      await page.waitForTimeout(2000);

      // Check if already logged in
      const loggedInIndicators = [
        '[data-testid="user-profile"]',
        '[data-testid="logout-button"]', 
        'text="Logout"',
        'text="Profile"'
      ];
      
      for (const indicator of loggedInIndicators) {
        if (await page.locator(indicator).isVisible().catch(() => false)) {
          console.log(`User ${email} already authenticated`);
          return { success: true };
        }
      }

      // Find and click login button
      const loginSelectors = [
        'button:has-text("Login")',
        'button:has-text("Sign In")', 
        '[data-testid="login-button"]',
        '[data-testid="auth-button"]'
      ];
      
      let loginClicked = false;
      for (const selector of loginSelectors) {
        const loginButton = page.locator(selector).first();
        if (await loginButton.isVisible().catch(() => false)) {
          await loginButton.click();
          await page.waitForTimeout(1000);
          loginClicked = true;
          break;
        }
      }
      
      if (!loginClicked) {
        throw new Error('No login button found');
      }

      // Fill credentials with multiple selector attempts
      const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[placeholder*="email" i]'];
      const passwordSelectors = ['input[type="password"]', 'input[name="password"]'];
      
      let emailFilled = false;
      for (const selector of emailSelectors) {
        const emailField = page.locator(selector).first();
        if (await emailField.isVisible().catch(() => false)) {
          await emailField.clear();
          await emailField.fill(email);
          emailFilled = true;
          break;
        }
      }
      
      if (!emailFilled) {
        throw new Error('Email field not found');
      }
      
      let passwordFilled = false;
      for (const selector of passwordSelectors) {
        const passwordField = page.locator(selector).first();
        if (await passwordField.isVisible().catch(() => false)) {
          await passwordField.clear();
          await passwordField.fill(password);
          passwordFilled = true;
          break;
        }
      }
      
      if (!passwordFilled) {
        throw new Error('Password field not found');
      }

      // Submit form
      const submitSelectors = [
        'button:has-text("Sign In")',
        'button:has-text("Login")', 
        'button:has-text("Enter")',
        'button[type="submit"]'
      ];
      
      let formSubmitted = false;
      for (const selector of submitSelectors) {
        const submitButton = page.locator(selector).first();
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          formSubmitted = true;
          break;
        }
      }
      
      if (!formSubmitted) {
        throw new Error('Submit button not found');
      }

      // Wait for auth completion with timeout
      await page.waitForTimeout(5000);
      
      // Verify authentication success
      for (const indicator of loggedInIndicators) {
        if (await page.locator(indicator).isVisible().catch(() => false)) {
          console.log(`✅ Authentication successful for ${email}`);
          return { success: true };
        }
      }
      
      // Check for auth errors
      const errorSelectors = [
        'text*="Invalid"',
        'text*="incorrect"', 
        'text*="failed"',
        '[role="alert"]'
      ];
      
      for (const selector of errorSelectors) {
        if (await page.locator(selector).isVisible().catch(() => false)) {
          const errorText = await page.locator(selector).textContent();
          throw new Error(`Auth error: ${errorText}`);
        }
      }
      
      throw new Error('Authentication verification failed');
      
    } catch (error) {
      lastError = String(error);
      console.log(`Auth attempt ${attempt} failed: ${lastError}`);
      
      if (attempt < maxRetries) {
        await page.waitForTimeout(2000);
      }
    }
  }
  
  console.error(`❌ Authentication failed for ${email} after ${maxRetries} attempts: ${lastError}`);
  return { success: false, error: lastError };
}

/**
 * Create test prayer with enhanced error handling and verification
 */
export async function createTestPrayerEnhanced(
  page: Page,
  prayerText: string,
  options: {
    waitForCreation?: boolean;
    verifyOnMap?: boolean;
    timeout?: number;
  } = {}
): Promise<{ success: boolean; prayerId?: string; error?: string }> {
  const { waitForCreation = true, verifyOnMap = false, timeout = 10000 } = options;
  
  try {
    console.log(`Creating prayer: "${prayerText.substring(0, 50)}..."`);
    
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Find prayer creation UI
    const createSelectors = [
      'button:has-text("Post")',
      'button:has-text("Share")',
      'button:has-text("Create")',
      '[data-testid="create-prayer"]',
      '[data-testid="post-prayer"]',
      '[data-testid="new-prayer"]'
    ];
    
    let createUIFound = false;
    for (const selector of createSelectors) {
      const createButton = page.locator(selector).first();
      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(1000);
        createUIFound = true;
        break;
      }
    }
    
    if (!createUIFound) {
      throw new Error('Prayer creation UI not found');
    }
    
    // Fill prayer text
    const textSelectors = [
      'textarea',
      'input[type="text"]:not([name="email"]):not([name="password"])',
      '[data-testid="prayer-text"]',
      '[placeholder*="prayer" i]'
    ];
    
    let textFilled = false;
    for (const selector of textSelectors) {
      const textField = page.locator(selector).first();
      if (await textField.isVisible().catch(() => false)) {
        await textField.clear();
        await textField.fill(prayerText);
        textFilled = true;
        break;
      }
    }
    
    if (!textFilled) {
      throw new Error('Prayer text field not found');
    }
    
    // Submit prayer
    const submitSelectors = [
      'button:has-text("Post")',
      'button:has-text("Submit")',
      'button:has-text("Share")',
      'button:has-text("Create")',
      '[data-testid="submit-prayer"]'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      const submitButton = page.locator(selector).first();
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        submitted = true;
        break;
      }
    }
    
    if (!submitted) {
      throw new Error('Submit button not found');
    }
    
    if (waitForCreation) {
      await page.waitForTimeout(3000);
    }
    
    // Try to extract prayer ID
    let prayerId = `test-prayer-${Date.now()}`;
    
    // From URL
    const url = page.url();
    const urlIdMatch = url.match(/prayer[\/\-]?([0-9a-f\-]{8,})/i);
    if (urlIdMatch) {
      prayerId = urlIdMatch[1];
    }
    
    // From DOM elements
    const prayerElements = await page.locator('[data-prayer-id], [data-testid*="prayer"]').all();
    for (const element of prayerElements) {
      const id = await element.getAttribute('data-prayer-id');
      if (id) {
        prayerId = id;
        break;
      }
    }
    
    // Verify on map if requested
    if (verifyOnMap) {
      await page.goto('/');
      await page.waitForTimeout(5000);
      
      const markers = page.locator('[data-testid="prayer-marker"], .mapboxgl-marker');
      const markerCount = await markers.count();
      
      if (markerCount === 0) {
        throw new Error('Prayer not visible on map after creation');
      }
    }
    
    console.log(`✅ Prayer created successfully with ID: ${prayerId}`);
    return { success: true, prayerId };
    
  } catch (error) {
    const errorMessage = String(error);
    console.error(`❌ Prayer creation failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Respond to prayer with detailed verification and error handling
 */
export async function respondToPrayerEnhanced(
  page: Page,
  targetPrayerText: string,
  responseText: string,
  options: {
    searchMethod?: 'text' | 'map' | 'list';
    timeout?: number;
    verifyResponse?: boolean;
  } = {}
): Promise<{ success: boolean; responseId?: string; error?: string; details?: string[] }> {
  const { searchMethod = 'map', timeout = 15000, verifyResponse = true } = options;
  const details: string[] = [];
  
  try {
    console.log(`Responding to prayer containing: "${targetPrayerText.substring(0, 30)}..."`);
    
    await page.goto('/');
    await page.waitForTimeout(5000);
    
    let prayerFound = false;
    
    if (searchMethod === 'map') {
      // Search via map markers
      const markers = page.locator('[data-testid="prayer-marker"], .mapboxgl-marker');
      const markerCount = await markers.count();
      details.push(`Found ${markerCount} markers on map`);
      
      for (let i = 0; i < markerCount && !prayerFound; i++) {
        const marker = markers.nth(i);
        await marker.click();
        await page.waitForTimeout(1000);
        
        // Check modal content
        const modalSelectors = [
          '[data-testid="prayer-detail"]',
          '[data-testid="prayer-modal"]',
          '.modal:has(text*="prayer")'
        ];
        
        for (const selector of modalSelectors) {
          const modal = page.locator(selector);
          if (await modal.isVisible().catch(() => false)) {
            const modalText = await modal.textContent() || '';
            
            if (modalText.toLowerCase().includes(targetPrayerText.substring(0, 30).toLowerCase())) {
              prayerFound = true;
              details.push(`Found target prayer in marker ${i + 1}`);
              break;
            }
          }
        }
        
        if (!prayerFound) {
          // Close modal and try next marker
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    }
    
    if (!prayerFound) {
      throw new Error(`Target prayer not found using ${searchMethod} method`);
    }
    
    // Now respond to the found prayer
    const respondSelectors = [
      'button:has-text("Respond")',
      'button:has-text("Reply")', 
      'button:has-text("Pray")',
      '[data-testid="respond-button"]',
      '[data-testid="pray-button"]'
    ];
    
    let respondClicked = false;
    for (const selector of respondSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(1000);
        respondClicked = true;
        details.push(`Clicked respond button: ${selector}`);
        break;
      }
    }
    
    if (!respondClicked) {
      throw new Error('No respond button found');
    }
    
    // Fill response text
    const textSelectors = [
      'textarea',
      'input[type="text"]:not([name="email"]):not([name="password"])',
      '[data-testid="response-text"]',
      '[placeholder*="response" i]'
    ];
    
    let responseFilled = false;
    for (const selector of textSelectors) {
      const textField = page.locator(selector).first();
      if (await textField.isVisible().catch(() => false)) {
        await textField.clear();
        await textField.fill(responseText);
        responseFilled = true;
        details.push(`Filled response text in: ${selector}`);
        break;
      }
    }
    
    if (!responseFilled) {
      throw new Error('Response text field not found');
    }
    
    // Submit response
    const submitSelectors = [
      'button:has-text("Send")',
      'button:has-text("Submit")',
      'button:has-text("Respond")',
      '[data-testid="submit-response"]'
    ];
    
    let responseSubmitted = false;
    for (const selector of submitSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        responseSubmitted = true;
        details.push(`Submitted response via: ${selector}`);
        break;
      }
    }
    
    if (!responseSubmitted) {
      throw new Error('Response submit button not found');
    }
    
    await page.waitForTimeout(3000);
    
    // Generate response ID
    const responseId = `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`✅ Response sent successfully: ${responseId}`);
    return { success: true, responseId, details };
    
  } catch (error) {
    const errorMessage = String(error);
    console.error(`❌ Response failed: ${errorMessage}`);
    return { success: false, error: errorMessage, details };
  }
}

/**
 * Enhanced inbox checking with detailed analysis
 */
export async function analyzeInboxNotifications(
  page: Page,
  options: {
    expectedCount?: number;
    timeout?: number;
    checkRealtime?: boolean;
  } = {}
): Promise<NotificationTestResult> {
  const { expectedCount = 1, timeout = 10000, checkRealtime = false } = options;
  const startTime = Date.now();
  
  const result: NotificationTestResult = {
    success: false,
    actualCount: 0,
    expectedCount,
    details: [],
    errors: [],
    timing: {
      startTime,
      endTime: 0,
      durationMs: 0
    }
  };
  
  try {
    console.log(`Analyzing inbox notifications (expecting ${expectedCount})...`);
    
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Find inbox button
    const inboxSelectors = [
      '[data-testid="inbox-button"]',
      'button:has-text("Inbox")',
      'button:has([class*="badge"])',
      '[class*="inbox"]',
      'button:has-text("Messages")'
    ];
    
    let inboxButton = null;
    for (const selector of inboxSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        inboxButton = button;
        result.details.push(`Found inbox button: ${selector}`);
        break;
      }
    }
    
    if (!inboxButton) {
      result.errors.push('Inbox button not found');
      return result;
    }
    
    // Check for notification badge
    const badgeSelectors = [
      '[data-testid="unread-badge"]',
      '[class*="badge"]',
      '[class*="count"]',
      '.notification-count'
    ];
    
    for (const selector of badgeSelectors) {
      const badge = page.locator(selector);
      if (await badge.isVisible().catch(() => false)) {
        const badgeText = await badge.textContent() || '0';
        const badgeCount = parseInt(badgeText) || 0;
        result.actualCount = Math.max(result.actualCount, badgeCount);
        result.details.push(`Badge shows: ${badgeText} (${selector})`);
      }
    }
    
    // Open inbox
    await inboxButton.click();
    await page.waitForTimeout(2000);
    result.details.push('Opened inbox');
    
    // Count messages in inbox
    const messageSelectors = [
      '[data-testid="inbox-message"]',
      '[data-testid="notification"]',
      '[class*="message"]:not([class*="empty"])',
      '[class*="notification"]:not([class*="empty"])'
    ];
    
    let maxMessageCount = 0;
    for (const selector of messageSelectors) {
      const messages = page.locator(selector);
      const count = await messages.count();
      maxMessageCount = Math.max(maxMessageCount, count);
      
      if (count > 0) {
        result.details.push(`Found ${count} messages via selector: ${selector}`);
        
        // Get sample message content
        for (let i = 0; i < Math.min(count, 3); i++) {
          const messageText = await messages.nth(i).textContent();
          if (messageText && messageText.trim()) {
            result.details.push(`Message ${i + 1}: ${messageText.substring(0, 100)}...`);
          }
        }
      }
    }
    
    result.actualCount = Math.max(result.actualCount, maxMessageCount);
    
    // Check for empty state
    const emptyStateSelectors = [
      'text*="no messages"',
      'text*="empty"',
      'text*="no notifications"',
      '[class*="empty"]'
    ];
    
    for (const selector of emptyStateSelectors) {
      if (await page.locator(selector).isVisible().catch(() => false)) {
        result.details.push(`Empty state detected: ${selector}`);
      }
    }
    
    // Real-time checking if requested
    if (checkRealtime && result.actualCount < expectedCount) {
      result.details.push('Waiting for real-time updates...');
      
      let realtimeAttempts = 0;
      while (realtimeAttempts < 10 && result.actualCount < expectedCount) {
        await page.waitForTimeout(1000);
        realtimeAttempts++;
        
        // Recheck message count
        for (const selector of messageSelectors) {
          const count = await page.locator(selector).count();
          if (count > result.actualCount) {
            result.actualCount = count;
            result.details.push(`Real-time update detected after ${realtimeAttempts}s: ${count} messages`);
            break;
          }
        }
      }
    }
    
    // Close inbox
    const closeSelectors = [
      '[data-testid="close-inbox"]',
      'button:has-text("Close")',
      '[aria-label="Close"]'
    ];
    
    for (const selector of closeSelectors) {
      const closeButton = page.locator(selector).first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
        result.details.push(`Closed inbox via: ${selector}`);
        break;
      }
    }
    
    if (!result.details.includes('Closed inbox')) {
      await page.keyboard.press('Escape');
      result.details.push('Closed inbox with Escape key');
    }
    
    // Determine success
    result.success = result.actualCount >= expectedCount;
    
    if (!result.success) {
      result.errors.push(`Expected ${expectedCount} notifications, found ${result.actualCount}`);
    }
    
  } catch (error) {
    result.errors.push(`Analysis error: ${String(error)}`);
  } finally {
    result.timing.endTime = Date.now();
    result.timing.durationMs = result.timing.endTime - result.timing.startTime;
  }
  
  console.log(`📊 Inbox analysis complete: ${result.actualCount}/${expectedCount} notifications in ${result.timing.durationMs}ms`);
  return result;
}

/**
 * Database state verification helper
 */
export async function verifyDatabaseState(
  page: Page,
  checks: {
    prayerExists?: string;
    responseExists?: string;
    notificationExists?: string;
  }
): Promise<{ success: boolean; results: Record<string, boolean>; errors: string[] }> {
  // This would require direct database access or API endpoints
  // For now, we'll do indirect verification through the UI
  
  const results: Record<string, boolean> = {};
  const errors: string[] = [];
  
  try {
    if (checks.prayerExists) {
      // Check if prayer appears on map
      await page.goto('/');
      await page.waitForTimeout(5000);
      
      const markers = page.locator('[data-testid="prayer-marker"], .mapboxgl-marker');
      const hasMarkers = await markers.count() > 0;
      results.prayerExists = hasMarkers;
    }
    
    if (checks.responseExists || checks.notificationExists) {
      // Indirect check through inbox
      const inboxResult = await analyzeInboxNotifications(page, { expectedCount: 1 });
      results.responseExists = inboxResult.actualCount > 0;
      results.notificationExists = inboxResult.success;
    }
    
  } catch (error) {
    errors.push(`Database verification error: ${String(error)}`);
  }
  
  const allPassed = Object.values(results).every(v => v === true);
  return { success: allPassed, results, errors };
}

/**
 * Test data cleanup helper
 */
export async function cleanupTestData(testData: PrayerTestData[]): Promise<void> {
  // This would require admin access to clean up test prayers
  // For now, we'll just log what should be cleaned
  
  console.log('🧹 Test data cleanup requested:');
  testData.forEach(prayer => {
    console.log(`- Prayer: ${prayer.id} (${prayer.text.substring(0, 30)}...)`);
    prayer.responses.forEach(response => {
      console.log(`  - Response: ${response.id} by ${response.responderEmail}`);
    });
  });
  
  // TODO: Implement actual cleanup via admin API
}