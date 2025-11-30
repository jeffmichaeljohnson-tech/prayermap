/**
 * CROSS-USER COMMUNICATION TEST UTILITIES
 * 
 * PURPOSE: Specialized utilities for testing multi-user messaging flows
 * SCOPE: Test user management, database verification, and communication validation
 */

import { Page, BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test user configuration
export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  userId?: string;
  location: { latitude: number; longitude: number };
}

export const TEST_USERS: Record<string, TestUser> = {
  requester: {
    email: 'prayer_requester@test.com',
    password: 'TestRequester123!',
    displayName: 'Prayer Requester',
    location: { latitude: 42.6885, longitude: -83.1751 } // Detroit
  },
  responder1: {
    email: 'prayer_responder1@test.com', 
    password: 'TestResponder123!',
    displayName: 'First Responder',
    location: { latitude: 42.7000, longitude: -83.2000 } // Near Detroit
  },
  responder2: {
    email: 'prayer_responder2@test.com',
    password: 'TestResponder123!', 
    displayName: 'Second Responder',
    location: { latitude: 41.8781, longitude: -87.6298 } // Chicago
  },
  responder3: {
    email: 'prayer_responder3@test.com',
    password: 'TestResponder123!',
    displayName: 'Third Responder', 
    location: { latitude: 40.7128, longitude: -74.0060 } // New York
  },
  moderator: {
    email: 'prayer_moderator@test.com',
    password: 'TestModerator123!',
    displayName: 'Prayer Moderator',
    location: { latitude: 37.7749, longitude: -122.4194 } // San Francisco
  }
};

/**
 * Database verification utilities
 */
export class DatabaseVerifier {
  private supabase: any;
  
  constructor() {
    // Initialize Supabase client for direct database verification
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    );
  }

  /**
   * Verify prayer was created in database
   */
  async verifyPrayerExists(prayerId: string): Promise<{
    exists: boolean;
    prayer?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('prayers')
        .select('*')
        .eq('id', prayerId)
        .single();
      
      if (error) throw error;
      
      return { exists: !!data, prayer: data };
    } catch (error) {
      return { exists: false, error: String(error) };
    }
  }

  /**
   * Verify prayer response was saved to database
   */
  async verifyPrayerResponseExists(prayerId: string, responderId?: string): Promise<{
    exists: boolean;
    responses: any[];
    count: number;
    error?: string;
  }> {
    try {
      let query = this.supabase
        .from('prayer_responses')
        .select('*')
        .eq('prayer_id', prayerId);
      
      if (responderId) {
        query = query.eq('responder_id', responderId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return {
        exists: data && data.length > 0,
        responses: data || [],
        count: data?.length || 0
      };
    } catch (error) {
      return { exists: false, responses: [], count: 0, error: String(error) };
    }
  }

  /**
   * Verify user received notification in their inbox
   */
  async verifyUserInboxMessages(userId: string): Promise<{
    hasMessages: boolean;
    messageCount: number;
    messages: any[];
    error?: string;
  }> {
    try {
      // Get user's prayers that have responses
      const { data: userPrayers, error: prayersError } = await this.supabase
        .from('prayers')
        .select(`
          id,
          title,
          content,
          prayer_responses (
            id,
            message,
            responder_id,
            created_at,
            read_at
          )
        `)
        .eq('user_id', userId)
        .not('prayer_responses', 'is', null);

      if (prayersError) throw prayersError;

      const messages = userPrayers?.flatMap(prayer => 
        prayer.prayer_responses?.map((response: any) => ({
          prayer_id: prayer.id,
          prayer_title: prayer.title,
          prayer_content: prayer.content,
          response_id: response.id,
          response_message: response.message,
          responder_id: response.responder_id,
          created_at: response.created_at,
          read_at: response.read_at,
          is_unread: !response.read_at
        }))
      ) || [];

      return {
        hasMessages: messages.length > 0,
        messageCount: messages.length,
        messages
      };
    } catch (error) {
      return { hasMessages: false, messageCount: 0, messages: [], error: String(error) };
    }
  }

  /**
   * Verify prayer connection was created
   */
  async verifyPrayerConnectionExists(prayerId: string, responseId: string): Promise<{
    exists: boolean;
    connection?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('prayer_connections')
        .select('*')
        .eq('prayer_id', prayerId)
        .eq('prayer_response_id', responseId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      
      return { exists: !!data, connection: data };
    } catch (error) {
      return { exists: false, error: String(error) };
    }
  }

  /**
   * Get user ID by email
   */
  async getUserIdByEmail(email: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.warn('Could not get user ID by email:', error);
      return null;
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(userEmails: string[]): Promise<void> {
    try {
      // Get user IDs
      const userIds = await Promise.all(
        userEmails.map(email => this.getUserIdByEmail(email))
      );
      const validUserIds = userIds.filter(id => id !== null);

      if (validUserIds.length === 0) return;

      // Delete in order: connections -> responses -> prayers -> users
      await this.supabase
        .from('prayer_connections')
        .delete()
        .in('prayer_id', 
          (await this.supabase.from('prayers').select('id').in('user_id', validUserIds)).data?.map(p => p.id) || []
        );

      await this.supabase
        .from('prayer_responses') 
        .delete()
        .in('responder_id', validUserIds);

      await this.supabase
        .from('prayers')
        .delete()
        .in('user_id', validUserIds);

      // Note: User cleanup would require admin permissions
      console.log('Test data cleanup completed for', userEmails.length, 'users');
    } catch (error) {
      console.warn('Test cleanup failed:', error);
    }
  }
}

/**
 * Enhanced test user authentication
 */
export async function authenticateTestUser(
  page: Page, 
  userKey: keyof typeof TEST_USERS
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const user = TEST_USERS[userKey];
  if (!user) {
    return { success: false, error: `Unknown user key: ${userKey}` };
  }

  console.log(`🔐 Authenticating ${user.displayName} (${user.email})...`);
  
  try {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Check if already authenticated
    const isLoggedIn = await page.locator('[data-testid="user-profile"], [data-testid="logout-button"]')
      .isVisible().catch(() => false);
    
    if (isLoggedIn) {
      console.log(`✅ ${user.displayName} already authenticated`);
      return { success: true };
    }

    // Find login interface
    const loginSelectors = [
      'button:has-text("Login")',
      'button:has-text("Sign In")', 
      '[data-testid="login-button"]',
      'button:has-text("Get Started")',
      '.auth-button'
    ];
    
    let loginOpened = false;
    for (const selector of loginSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(1000);
        loginOpened = true;
        break;
      }
    }

    if (!loginOpened) {
      return { success: false, error: 'Could not find login interface' };
    }

    // Fill credentials
    const emailField = page.locator('input[type="email"], input[name="email"]');
    const passwordField = page.locator('input[type="password"], input[name="password"]');
    
    if (!await emailField.isVisible() || !await passwordField.isVisible()) {
      return { success: false, error: 'Could not find email/password fields' };
    }

    await emailField.fill(user.email);
    await passwordField.fill(user.password);
    
    // Submit authentication
    const submitSelectors = [
      'button:has-text("Sign In")',
      'button:has-text("Login")', 
      'button:has-text("Enter")',
      'button[type="submit"]'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      return { success: false, error: 'Could not submit login form' };
    }
    
    // Wait for authentication to complete
    await page.waitForTimeout(5000);
    
    // Verify successful login
    const authSuccess = await page.locator('[data-testid="user-profile"], [data-testid="logout-button"]')
      .isVisible().catch(() => false);
    
    if (authSuccess) {
      console.log(`✅ ${user.displayName} authenticated successfully`);
      return { success: true };
    } else {
      return { success: false, error: 'Authentication failed - no user profile visible' };
    }
    
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Create browser context for test user
 */
export async function createUserContext(
  browser: any,
  userKey: keyof typeof TEST_USERS
): Promise<BrowserContext> {
  const user = TEST_USERS[userKey];
  const context = await browser.newContext();
  
  await context.grantPermissions(['geolocation', 'microphone', 'camera']);
  await context.setGeolocation(user.location);
  
  return context;
}

/**
 * Enhanced prayer creation with detailed tracking
 */
export interface PrayerData {
  title?: string;
  content: string;
  contentType: 'text' | 'audio' | 'video';
  isAnonymous?: boolean;
  isUrgent?: boolean;
  category?: string;
}

export async function createTestPrayerWithVerification(
  page: Page,
  prayerData: PrayerData,
  dbVerifier: DatabaseVerifier
): Promise<{
  success: boolean;
  prayerId: string;
  prayerText: string;
  dbVerified: boolean;
  error?: string;
}> {
  
  const timestamp = Date.now();
  const prayerText = prayerData.content || `Test Prayer ${timestamp}`;
  
  console.log(`📝 Creating verified ${prayerData.contentType} prayer...`);
  
  try {
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Find and open prayer creation interface
    const createSelectors = [
      'button:has-text("Post Prayer")',
      'button:has-text("Create Prayer")', 
      '[data-testid="create-prayer"]',
      'button:has-text("+")',
      '.create-prayer-button'
    ];
    
    let interfaceOpened = false;
    for (const selector of createSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(1000);
        interfaceOpened = true;
        break;
      }
    }
    
    if (!interfaceOpened) {
      return { 
        success: false, 
        prayerId: '', 
        prayerText, 
        dbVerified: false, 
        error: 'Could not open prayer creation interface' 
      };
    }

    // Fill prayer content based on type
    if (prayerData.contentType === 'text') {
      const textArea = page.locator('textarea, input[type="text"]:not([name="email"]):not([name="password"])').first();
      if (await textArea.isVisible().catch(() => false)) {
        await textArea.fill(prayerText);
      } else {
        return { 
          success: false, 
          prayerId: '', 
          prayerText, 
          dbVerified: false, 
          error: 'Could not find text input field' 
        };
      }
    }
    
    // Handle optional settings
    if (prayerData.isAnonymous) {
      const anonymousToggle = page.locator('input[type="checkbox"]:has-text("anonymous"), [data-testid="anonymous-toggle"]').first();
      if (await anonymousToggle.isVisible().catch(() => false)) {
        await anonymousToggle.check();
      }
    }
    
    if (prayerData.isUrgent) {
      const urgentToggle = page.locator('input[type="checkbox"]:has-text("urgent"), [data-testid="urgent-toggle"]').first();
      if (await urgentToggle.isVisible().catch(() => false)) {
        await urgentToggle.check();
      }
    }
    
    // Submit prayer
    const submitSelectors = [
      'button:has-text("Post")',
      'button:has-text("Submit")', 
      'button:has-text("Share")',
      'button:has-text("Create Prayer")'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(3000);
        submitted = true;
        break;
      }
    }
    
    if (!submitted) {
      return { 
        success: false, 
        prayerId: '', 
        prayerText, 
        dbVerified: false, 
        error: 'Could not submit prayer' 
      };
    }
    
    // Extract prayer ID from URL or DOM
    const currentUrl = page.url();
    const prayerIdMatch = currentUrl.match(/prayer[\/\-]?([a-f0-9-]{36}|\d+)/i);
    const prayerId = prayerIdMatch ? prayerIdMatch[1] : `test-prayer-${timestamp}`;
    
    // Verify in database
    await page.waitForTimeout(2000); // Allow time for DB write
    const dbCheck = await dbVerifier.verifyPrayerExists(prayerId);
    
    console.log(`✅ Prayer created - ID: ${prayerId}, DB Verified: ${dbCheck.exists}`);
    
    return {
      success: true,
      prayerId,
      prayerText,
      dbVerified: dbCheck.exists,
      error: dbCheck.error
    };
    
  } catch (error) {
    return { 
      success: false, 
      prayerId: '', 
      prayerText, 
      dbVerified: false, 
      error: String(error) 
    };
  }
}

/**
 * Enhanced response creation with database verification
 */
export interface ResponseData {
  message: string;
  contentType: 'text' | 'audio' | 'video';
  isAnonymous?: boolean;
  isEncouraging?: boolean;
}

export async function createTestResponseWithVerification(
  page: Page,
  targetPrayerText: string,
  responseData: ResponseData,
  dbVerifier: DatabaseVerifier
): Promise<{
  success: boolean;
  responseId: string;
  dbVerified: boolean;
  connectionVerified: boolean;
  error?: string;
}> {
  
  console.log(`💬 Creating verified ${responseData.contentType} response...`);
  
  try {
    await page.goto('/');
    await page.waitForTimeout(5000);
    
    // Find target prayer
    const prayerElements = [
      '[data-testid="prayer-marker"]',
      '.mapboxgl-marker',
      '[data-testid="prayer-card"]'
    ];
    
    let targetPrayerFound = false;
    let targetPrayerId = '';
    
    for (const selector of prayerElements) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        if (await element.isVisible().catch(() => false)) {
          await element.click();
          await page.waitForTimeout(1000);
          
          const modal = page.locator('[data-testid="prayer-detail"], [data-testid="prayer-modal"]');
          if (await modal.isVisible().catch(() => false)) {
            const modalText = await modal.textContent() || '';
            if (modalText.includes(targetPrayerText.substring(0, 30))) {
              // Extract prayer ID if possible
              const idAttr = await element.getAttribute('data-prayer-id');
              targetPrayerId = idAttr || `inferred-${Date.now()}`;
              targetPrayerFound = true;
              break;
            } else {
              await page.keyboard.press('Escape');
            }
          }
        }
      }
      if (targetPrayerFound) break;
    }
    
    if (!targetPrayerFound) {
      return { 
        success: false, 
        responseId: '', 
        dbVerified: false, 
        connectionVerified: false,
        error: 'Could not find target prayer' 
      };
    }
    
    // Open response interface
    const respondSelectors = [
      'button:has-text("Respond")',
      'button:has-text("Pray")', 
      'button:has-text("Support")',
      '[data-testid="respond-button"]'
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
      return { 
        success: false, 
        responseId: '', 
        dbVerified: false,
        connectionVerified: false, 
        error: 'Could not open response interface' 
      };
    }
    
    // Fill response based on content type
    if (responseData.contentType === 'text') {
      const textArea = page.locator('textarea, input[type="text"]:not([name="email"]):not([name="password"])').first();
      if (await textArea.isVisible().catch(() => false)) {
        await textArea.fill(responseData.message);
      } else {
        return { 
          success: false, 
          responseId: '', 
          dbVerified: false,
          connectionVerified: false, 
          error: 'Could not find response text field' 
        };
      }
    }
    
    // Handle response options
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
      'button:has-text("Respond")'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(3000);
        submitted = true;
        break;
      }
    }
    
    if (!submitted) {
      return { 
        success: false, 
        responseId: '', 
        dbVerified: false,
        connectionVerified: false, 
        error: 'Could not submit response' 
      };
    }
    
    const responseId = `response-${Date.now()}`;
    
    // Verify in database
    await page.waitForTimeout(2000);
    const dbCheck = await dbVerifier.verifyPrayerResponseExists(targetPrayerId);
    const connectionCheck = await dbVerifier.verifyPrayerConnectionExists(targetPrayerId, responseId);
    
    console.log(`✅ Response created - ID: ${responseId}, DB Verified: ${dbCheck.exists}, Connection: ${connectionCheck.exists}`);
    
    return {
      success: true,
      responseId,
      dbVerified: dbCheck.exists,
      connectionVerified: connectionCheck.exists
    };
    
  } catch (error) {
    return { 
      success: false, 
      responseId: '', 
      dbVerified: false,
      connectionVerified: false, 
      error: String(error) 
    };
  }
}

/**
 * Comprehensive inbox verification with database cross-check
 */
export async function verifyInboxWithDatabaseCheck(
  page: Page,
  userId: string,
  expected: {
    minMessages: number;
    maxMessages?: number;
    containsText?: string[];
    fromUsers?: string[];
  },
  dbVerifier: DatabaseVerifier
): Promise<{
  uiSuccess: boolean;
  dbSuccess: boolean;
  uiMessageCount: number;
  dbMessageCount: number;
  discrepancy: boolean;
  details: string[];
  messages: any[];
}> {
  
  console.log(`📬 Comprehensive inbox verification for user ${userId}...`);
  
  // Check UI inbox
  await page.goto('/');
  await page.waitForTimeout(3000);
  
  const result = {
    uiSuccess: false,
    dbSuccess: false,
    uiMessageCount: 0,
    dbMessageCount: 0,
    discrepancy: false,
    details: [] as string[],
    messages: [] as any[]
  };
  
  // UI verification
  const inboxButton = page.locator('[data-testid="inbox-button"], button:has-text("Inbox")').first();
  if (await inboxButton.isVisible().catch(() => false)) {
    await inboxButton.click();
    await page.waitForTimeout(2000);
    
    const messageElements = page.locator('[data-testid="inbox-message"], [class*="message"]');
    result.uiMessageCount = await messageElements.count();
    
    // Extract message details
    for (let i = 0; i < Math.min(result.uiMessageCount, 10); i++) {
      const messageText = await messageElements.nth(i).textContent() || '';
      result.messages.push({
        source: 'ui',
        text: messageText.substring(0, 100),
        index: i
      });
    }
    
    result.uiSuccess = result.uiMessageCount >= expected.minMessages;
    if (expected.maxMessages) {
      result.uiSuccess = result.uiSuccess && result.uiMessageCount <= expected.maxMessages;
    }
    
    // Close inbox
    await page.keyboard.press('Escape');
  } else {
    result.details.push('Could not open inbox UI');
  }
  
  // Database verification
  const dbCheck = await dbVerifier.verifyUserInboxMessages(userId);
  result.dbSuccess = dbCheck.hasMessages && dbCheck.messageCount >= expected.minMessages;
  result.dbMessageCount = dbCheck.messageCount;
  
  if (dbCheck.error) {
    result.details.push(`DB Error: ${dbCheck.error}`);
  }
  
  // Add database messages to results
  dbCheck.messages.forEach((msg, index) => {
    result.messages.push({
      source: 'db',
      text: msg.response_message?.substring(0, 100) || '',
      prayer_id: msg.prayer_id,
      response_id: msg.response_id,
      is_unread: msg.is_unread,
      index
    });
  });
  
  // Check for discrepancies
  result.discrepancy = Math.abs(result.uiMessageCount - result.dbMessageCount) > 0;
  
  if (result.discrepancy) {
    result.details.push(`UI/DB Count Mismatch: UI=${result.uiMessageCount}, DB=${result.dbMessageCount}`);
  }
  
  // Validate expected text content
  if (expected.containsText) {
    for (const expectedText of expected.containsText) {
      const uiFound = result.messages.some(msg => msg.source === 'ui' && msg.text.includes(expectedText));
      const dbFound = result.messages.some(msg => msg.source === 'db' && msg.text.includes(expectedText));
      
      if (!uiFound || !dbFound) {
        result.details.push(`Missing expected text "${expectedText}" in ${!uiFound ? 'UI' : ''} ${!dbFound ? 'DB' : ''}`);
        result.uiSuccess = result.uiSuccess && uiFound;
        result.dbSuccess = result.dbSuccess && dbFound;
      }
    }
  }
  
  console.log(`📬 Inbox verification: UI=${result.uiSuccess} (${result.uiMessageCount}), DB=${result.dbSuccess} (${result.dbMessageCount})`);
  
  return result;
}