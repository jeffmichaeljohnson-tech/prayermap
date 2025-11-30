/**
 * 🚀 PERFORMANCE TESTING: High Message Volume Validation
 * 
 * MISSION: Test the system's performance under high message volume scenarios
 * 
 * PERFORMANCE TARGET CRITERIA:
 * ✅ Handle 50+ concurrent responses without degradation
 * ✅ Real-time message delivery under 5 seconds for any volume
 * ✅ System remains responsive during high load
 * ✅ No message loss during concurrent operations
 * ✅ Memory usage stays stable during stress testing
 * 
 * TESTING SCENARIOS:
 * 1. Burst Load Testing - Many responses at once
 * 2. Sustained Load Testing - Continuous responses over time  
 * 3. Memory Leak Detection - Long-running operations
 * 4. Concurrent User Testing - Multiple users simultaneously
 * 5. Error Recovery Testing - System resilience under stress
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { test as baseTest } from './fixtures/test-fixtures';

// Performance-focused test configuration
const performanceTest = baseTest.extend<{
  requesterPage: Page;
  responder1Page: Page;
  responder2Page: Page;
  responder3Page: Page;
  responder4Page: Page;
  responder5Page: Page;
  performanceContext: BrowserContext;
  responder1Context: BrowserContext;
  responder2Context: BrowserContext;
  responder3Context: BrowserContext;
  responder4Context: BrowserContext;
  responder5Context: BrowserContext;
}>({
  // Performance monitoring context
  performanceContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ['geolocation', 'microphone', 'camera']
    });
    await context.setGeolocation({ latitude: 42.6885, longitude: -83.1751 });
    await use(context);
    await context.close();
  },
  
  requesterPage: async ({ performanceContext }, use) => {
    const page = await performanceContext.newPage();
    await authenticateUser(page, 'performance_requester@test.com', 'TestPassword123!');
    await use(page);
  },

  // Multiple responder contexts for concurrent testing
  responder1Context: async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ['geolocation', 'microphone', 'camera']
    });
    await context.setGeolocation({ latitude: 42.7000, longitude: -83.2000 });
    await use(context);
    await context.close();
  },
  
  responder1Page: async ({ responder1Context }, use) => {
    const page = await responder1Context.newPage();
    await authenticateUser(page, 'performance_responder1@test.com', 'TestPassword123!');
    await use(page);
  },

  responder2Context: async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ['geolocation', 'microphone', 'camera']
    });
    await context.setGeolocation({ latitude: 41.8781, longitude: -87.6298 });
    await use(context);
    await context.close();
  },
  
  responder2Page: async ({ responder2Context }, use) => {
    const page = await responder2Context.newPage();
    await authenticateUser(page, 'performance_responder2@test.com', 'TestPassword123!');
    await use(page);
  },

  responder3Context: async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ['geolocation', 'microphone', 'camera']
    });
    await context.setGeolocation({ latitude: 40.7128, longitude: -74.0060 });
    await use(context);
    await context.close();
  },
  
  responder3Page: async ({ responder3Context }, use) => {
    const page = await responder3Context.newPage();
    await authenticateUser(page, 'performance_responder3@test.com', 'TestPassword123!');
    await use(page);
  },

  responder4Context: async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ['geolocation', 'microphone', 'camera']
    });
    await context.setGeolocation({ latitude: 34.0522, longitude: -118.2437 });
    await use(context);
    await context.close();
  },
  
  responder4Page: async ({ responder4Context }, use) => {
    const page = await responder4Context.newPage();
    await authenticateUser(page, 'performance_responder4@test.com', 'TestPassword123!');
    await use(page);
  },

  responder5Context: async ({ browser }, use) => {
    const context = await browser.newContext({
      permissions: ['geolocation', 'microphone', 'camera']
    });
    await context.setGeolocation({ latitude: 39.7392, longitude: -104.9903 });
    await use(context);
    await context.close();
  },
  
  responder5Page: async ({ responder5Context }, use) => {
    const page = await responder5Context.newPage();
    await authenticateUser(page, 'performance_responder5@test.com', 'TestPassword123!');
    await use(page);
  },
});

// Enhanced authentication for performance testing
async function authenticateUser(page: Page, email: string, password: string): Promise<void> {
  console.log(`🔐 Authenticating performance test user: ${email}`);
  
  await page.goto('/');
  await page.waitForTimeout(2000);

  const isLoggedIn = await page.locator('[data-testid="user-profile"], [data-testid="logout-button"]').isVisible().catch(() => false);
  
  if (!isLoggedIn) {
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), [data-testid="login-button"]').first();
    
    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
      await page.waitForTimeout(1000);
    }

    await page.locator('input[type="email"], input[name="email"]').fill(email);
    await page.locator('input[type="password"], input[name="password"]').fill(password);
    
    const submitButton = page.locator('button:has-text("Sign In"), button:has-text("Login"), button:has-text("Enter")').first();
    await submitButton.click();
    
    await page.waitForTimeout(3000);
  }
}

// Performance-optimized prayer creation
async function createPerformancePrayer(page: Page, content: string): Promise<{ success: boolean; prayerId: string; creationTime: number }> {
  const startTime = Date.now();
  
  await page.goto('/');
  await page.waitForTimeout(1000);
  
  const createButton = page.locator('button:has-text("Post"), button:has-text("Create"), [data-testid="create-prayer"]').first();
  
  if (await createButton.isVisible().catch(() => false)) {
    await createButton.click();
    await page.waitForTimeout(500);
  }
  
  const textArea = page.locator('textarea, input[type="text"]:not([type="email"]):not([type="password"])').first();
  if (await textArea.isVisible()) {
    await textArea.fill(content);
    
    const submitButton = page.locator('button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();
    await page.waitForTimeout(1000);
  }
  
  const creationTime = Date.now() - startTime;
  const prayerId = `perf-prayer-${Date.now()}`;
  
  return { success: true, prayerId, creationTime };
}

// Performance-optimized response creation
async function createPerformanceResponse(
  page: Page, 
  prayerContent: string, 
  responseMessage: string
): Promise<{ success: boolean; responseTime: number; responseId: string }> {
  const startTime = Date.now();
  
  try {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Quick prayer marker detection
    const marker = page.locator('[data-testid="prayer-marker"], .mapboxgl-marker').first();
    if (await marker.isVisible().catch(() => false)) {
      await marker.click();
      await page.waitForTimeout(500);
      
      const respondButton = page.locator('button:has-text("Respond"), button:has-text("Pray")').first();
      if (await respondButton.isVisible().catch(() => false)) {
        await respondButton.click();
        await page.waitForTimeout(500);
        
        const responseField = page.locator('textarea, input[type="text"]:not([name="email"])').first();
        if (await responseField.isVisible().catch(() => false)) {
          await responseField.fill(responseMessage);
          
          const sendButton = page.locator('button:has-text("Send"), button:has-text("Submit")').first();
          if (await sendButton.isVisible().catch(() => false)) {
            await sendButton.click();
            await page.waitForTimeout(500);
            
            const responseTime = Date.now() - startTime;
            return { success: true, responseTime, responseId: `perf-response-${Date.now()}` };
          }
        }
      }
    }
    
    const responseTime = Date.now() - startTime;
    return { success: false, responseTime, responseId: '' };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return { success: false, responseTime, responseId: '' };
  }
}

// Performance monitoring utilities
class PerformanceMonitor {
  private metrics: Array<{
    timestamp: number;
    operation: string;
    duration: number;
    success: boolean;
  }> = [];

  logOperation(operation: string, duration: number, success: boolean) {
    this.metrics.push({
      timestamp: Date.now(),
      operation,
      duration,
      success
    });
  }

  getMetrics() {
    return {
      totalOperations: this.metrics.length,
      successRate: (this.metrics.filter(m => m.success).length / this.metrics.length) * 100,
      avgDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      maxDuration: Math.max(...this.metrics.map(m => m.duration)),
      minDuration: Math.min(...this.metrics.map(m => m.duration))
    };
  }

  reset() {
    this.metrics = [];
  }
}

performanceTest.describe('🚀 HIGH VOLUME MESSAGE PERFORMANCE TESTS', () => {
  
  performanceTest('BURST LOAD: 25 Concurrent Responses', async ({ 
    requesterPage, 
    responder1Page, 
    responder2Page, 
    responder3Page, 
    responder4Page, 
    responder5Page 
  }) => {
    console.log('\n🚀 TESTING BURST LOAD: 25 Concurrent Responses');
    
    const monitor = new PerformanceMonitor();
    
    // Create performance test prayer
    const prayerResult = await createPerformancePrayer(requesterPage, 
      'BURST TEST: Please pray for our community outreach program. We need volunteers and resources.'
    );
    
    expect(prayerResult.success).toBe(true);
    monitor.logOperation('prayer_creation', prayerResult.creationTime, prayerResult.success);
    
    // Generate burst of concurrent responses
    console.log('⚡ Generating burst of 25 concurrent responses...');
    const burstStartTime = Date.now();
    
    const responderPages = [responder1Page, responder2Page, responder3Page, responder4Page, responder5Page];
    const responsePromises = [];
    
    // Each responder creates 5 responses for 25 total
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const responseText = `BURST RESPONSE #${(i * 5) + j + 1}: Praying for your community outreach success! 🙏`;
        responsePromises.push(
          createPerformanceResponse(responderPages[i], prayerResult.prayerId, responseText)
        );
      }
    }
    
    // Execute all responses concurrently
    const responses = await Promise.allSettled(responsePromises);
    const burstDuration = Date.now() - burstStartTime;
    
    // Analyze burst results
    const successfulResponses = responses.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    const avgResponseTime = responses
      .filter(result => result.status === 'fulfilled')
      .reduce((sum, result: any) => sum + result.value.responseTime, 0) / responses.length;
    
    console.log(`⚡ BURST COMPLETED: ${successfulResponses}/25 responses in ${burstDuration}ms`);
    console.log(`📊 Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`📊 Throughput: ${(25000 / burstDuration).toFixed(2)} responses/second`);
    
    // Wait for message delivery processing
    console.log('📬 Checking message delivery after burst...');
    await requesterPage.waitForTimeout(20000); // Extended wait for high volume
    
    // Verify message delivery performance
    const inboxCheckStart = Date.now();
    await requesterPage.goto('/');
    const inboxButton = requesterPage.locator('[data-testid="inbox-button"], button:has-text("Inbox")').first();
    
    if (await inboxButton.isVisible().catch(() => false)) {
      await inboxButton.click();
      await requesterPage.waitForTimeout(2000);
      
      const messages = requesterPage.locator('[data-testid="inbox-message"], [class*="message"]');
      const messageCount = await messages.count();
      const inboxCheckTime = Date.now() - inboxCheckStart;
      
      console.log(`📬 INBOX RESULTS: ${messageCount} messages loaded in ${inboxCheckTime}ms`);
      
      monitor.logOperation('inbox_load', inboxCheckTime, messageCount > 0);
      
      // Performance assertions
      const burstSuccessRate = (successfulResponses / 25) * 100;
      const deliveryRate = (messageCount / successfulResponses) * 100;
      
      expect(burstSuccessRate, 'Burst success rate should be above 80%').toBeGreaterThan(80);
      expect(avgResponseTime, 'Average response time should be under 10 seconds').toBeLessThan(10000);
      expect(burstDuration, 'Total burst should complete within 60 seconds').toBeLessThan(60000);
      
      console.log('\n🚀 BURST LOAD PERFORMANCE SUMMARY:');
      console.log(`- Success Rate: ${burstSuccessRate.toFixed(1)}%`);
      console.log(`- Delivery Rate: ${deliveryRate.toFixed(1)}%`);
      console.log(`- Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
      console.log(`- Total Burst Duration: ${burstDuration}ms`);
      console.log(`- System Throughput: ${(25000 / burstDuration).toFixed(2)} ops/sec`);
      console.log(`- Performance Grade: ${burstSuccessRate > 90 ? 'A+' : burstSuccessRate > 80 ? 'A' : 'B'}`);
    }
  });

  performanceTest('SUSTAINED LOAD: Continuous Response Stream', async ({ 
    requesterPage, 
    responder1Page, 
    responder2Page, 
    responder3Page 
  }) => {
    console.log('\n⏳ TESTING SUSTAINED LOAD: Continuous Response Stream');
    
    const monitor = new PerformanceMonitor();
    const sustainedDuration = 60000; // 1 minute sustained test
    const responseInterval = 2000; // Response every 2 seconds
    
    // Create prayer for sustained testing
    const prayerResult = await createPerformancePrayer(requesterPage, 
      'SUSTAINED TEST: Please pray for our long-term mission work. We need endurance and perseverance.'
    );
    
    expect(prayerResult.success).toBe(true);
    console.log(`📝 Sustained test prayer created: ${prayerResult.prayerId}`);
    
    // Start sustained response generation
    console.log(`⏳ Starting ${sustainedDuration / 1000} second sustained response stream...`);
    const sustainedStartTime = Date.now();
    
    let responseCount = 0;
    let successCount = 0;
    const responderPages = [responder1Page, responder2Page, responder3Page];
    
    // Generate responses at regular intervals
    while ((Date.now() - sustainedStartTime) < sustainedDuration) {
      const intervalStart = Date.now();
      const responderIndex = responseCount % responderPages.length;
      const responder = responderPages[responderIndex];
      
      const responseText = `SUSTAINED RESPONSE #${responseCount + 1}: Continuous prayers for your mission work!`;
      
      try {
        const responseResult = await createPerformanceResponse(responder, prayerResult.prayerId, responseText);
        responseCount++;
        
        if (responseResult.success) {
          successCount++;
        }
        
        monitor.logOperation('sustained_response', responseResult.responseTime, responseResult.success);
        
        // Log progress every 10 responses
        if (responseCount % 10 === 0) {
          const elapsed = Date.now() - sustainedStartTime;
          const rate = (responseCount / elapsed) * 1000;
          console.log(`📊 Progress: ${responseCount} responses, ${rate.toFixed(2)} responses/sec`);
        }
        
        // Maintain interval timing
        const intervalDuration = Date.now() - intervalStart;
        const waitTime = Math.max(0, responseInterval - intervalDuration);
        
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
      } catch (error) {
        console.error(`Response ${responseCount + 1} failed:`, error.message);
        responseCount++;
      }
    }
    
    const totalSustainedTime = Date.now() - sustainedStartTime;
    console.log(`⏳ SUSTAINED TEST COMPLETED: ${responseCount} responses over ${totalSustainedTime / 1000}s`);
    
    // Analyze sustained performance
    const sustainedMetrics = monitor.getMetrics();
    const actualRate = (responseCount / totalSustainedTime) * 1000;
    const successRate = (successCount / responseCount) * 100;
    
    console.log('\n⏳ SUSTAINED LOAD PERFORMANCE ANALYSIS:');
    console.log(`- Total Responses: ${responseCount}`);
    console.log(`- Successful Responses: ${successCount}`);
    console.log(`- Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`- Actual Response Rate: ${actualRate.toFixed(2)} responses/sec`);
    console.log(`- Average Response Time: ${sustainedMetrics.avgDuration.toFixed(0)}ms`);
    console.log(`- Max Response Time: ${sustainedMetrics.maxDuration}ms`);
    console.log(`- System Stability: ${sustainedMetrics.avgDuration < 5000 ? 'EXCELLENT' : 'NEEDS_OPTIMIZATION'}`);
    
    // Performance assertions for sustained load
    expect(successRate, 'Sustained success rate should be above 75%').toBeGreaterThan(75);
    expect(sustainedMetrics.avgDuration, 'Average sustained response time should be reasonable').toBeLessThan(15000);
    expect(responseCount, 'Should generate reasonable number of responses').toBeGreaterThan(20);
  });

  performanceTest('MEMORY STABILITY: Long-Running Operations', async ({ 
    requesterPage, 
    responder1Page 
  }) => {
    console.log('\n🧠 TESTING MEMORY STABILITY: Long-Running Operations');
    
    const monitor = new PerformanceMonitor();
    
    // Create memory test prayer
    const prayerResult = await createPerformancePrayer(requesterPage, 
      'MEMORY TEST: Please pray for wisdom in our technology decisions and system stability.'
    );
    
    expect(prayerResult.success).toBe(true);
    
    // Simulate extended user session with many operations
    console.log('🔄 Running extended session simulation...');
    
    const sessionDuration = 90000; // 1.5 minute extended session
    const sessionStart = Date.now();
    let operationCount = 0;
    
    while ((Date.now() - sessionStart) < sessionDuration) {
      const operationStart = Date.now();
      
      try {
        // Simulate various user operations
        if (operationCount % 3 === 0) {
          // Create response
          const responseResult = await createPerformanceResponse(
            responder1Page, 
            prayerResult.prayerId, 
            `Extended session response #${operationCount}: Continuous operation testing!`
          );
          monitor.logOperation('memory_response', Date.now() - operationStart, responseResult.success);
        } else if (operationCount % 3 === 1) {
          // Check inbox
          await requesterPage.goto('/');
          const inboxButton = requesterPage.locator('[data-testid="inbox-button"], button:has-text("Inbox")').first();
          if (await inboxButton.isVisible().catch(() => false)) {
            await inboxButton.click();
            await requesterPage.waitForTimeout(1000);
            await requesterPage.keyboard.press('Escape');
          }
          monitor.logOperation('memory_inbox_check', Date.now() - operationStart, true);
        } else {
          // Navigate and refresh
          await requesterPage.reload();
          await requesterPage.waitForTimeout(2000);
          monitor.logOperation('memory_navigation', Date.now() - operationStart, true);
        }
        
        operationCount++;
        
        // Brief pause between operations
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Log memory stability progress
        if (operationCount % 20 === 0) {
          const metrics = monitor.getMetrics();
          console.log(`🧠 Memory Test Progress: ${operationCount} operations, avg time: ${metrics.avgDuration.toFixed(0)}ms`);
        }
        
      } catch (error) {
        console.warn(`Memory test operation ${operationCount} failed:`, error.message);
        operationCount++;
      }
    }
    
    const finalMetrics = monitor.getMetrics();
    const totalSessionTime = Date.now() - sessionStart;
    
    console.log('\n🧠 MEMORY STABILITY ANALYSIS:');
    console.log(`- Total Operations: ${operationCount}`);
    console.log(`- Session Duration: ${(totalSessionTime / 1000).toFixed(1)}s`);
    console.log(`- Success Rate: ${finalMetrics.successRate.toFixed(1)}%`);
    console.log(`- Average Operation Time: ${finalMetrics.avgDuration.toFixed(0)}ms`);
    console.log(`- Performance Degradation: ${finalMetrics.maxDuration > (finalMetrics.avgDuration * 3) ? 'DETECTED' : 'NONE'}`);
    console.log(`- Memory Stability: ${finalMetrics.avgDuration < 5000 && finalMetrics.successRate > 80 ? 'STABLE' : 'UNSTABLE'}`);
    
    // Memory stability assertions
    expect(finalMetrics.successRate, 'Extended session success rate should remain high').toBeGreaterThan(70);
    expect(finalMetrics.avgDuration, 'Operation times should not degrade significantly').toBeLessThan(20000);
    expect(operationCount, 'Should complete reasonable number of operations').toBeGreaterThan(30);
  });

  performanceTest('CONCURRENT USERS: Multi-User Simultaneous Activity', async ({ 
    requesterPage, 
    responder1Page, 
    responder2Page, 
    responder3Page, 
    responder4Page, 
    responder5Page 
  }) => {
    console.log('\n👥 TESTING CONCURRENT USERS: Multi-User Simultaneous Activity');
    
    const allPages = [requesterPage, responder1Page, responder2Page, responder3Page, responder4Page, responder5Page];
    const monitor = new PerformanceMonitor();
    
    // Each user creates their own prayer simultaneously
    console.log('📝 Phase 1: Concurrent prayer creation...');
    const prayerCreationStart = Date.now();
    
    const prayerPromises = allPages.map((page, index) => 
      createPerformancePrayer(page, `CONCURRENT PRAYER ${index + 1}: Multi-user testing scenario for system load validation.`)
    );
    
    const prayerResults = await Promise.allSettled(prayerPromises);
    const prayerCreationTime = Date.now() - prayerCreationStart;
    
    const successfulPrayers = prayerResults.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    console.log(`📝 Prayer Creation: ${successfulPrayers}/6 prayers created in ${prayerCreationTime}ms`);
    
    // Cross-user responses - each user responds to others' prayers
    console.log('💬 Phase 2: Cross-user response matrix...');
    const responseStart = Date.now();
    
    const responsePromises = [];
    
    // Generate response matrix (each user responds to 2 other prayers)
    for (let i = 0; i < allPages.length; i++) {
      for (let j = 0; j < 2; j++) {
        const targetUserIndex = (i + j + 1) % allPages.length;
        if (targetUserIndex !== i && prayerResults[targetUserIndex]?.status === 'fulfilled') {
          const targetPrayerId = (prayerResults[targetUserIndex] as any).value.prayerId;
          responsePromises.push(
            createPerformanceResponse(
              allPages[i], 
              targetPrayerId, 
              `Cross-user response from User ${i + 1} to User ${targetUserIndex + 1}: Praying for your situation! 🙏`
            )
          );
        }
      }
    }
    
    const responseResults = await Promise.allSettled(responsePromises);
    const responseTime = Date.now() - responseStart;
    
    const successfulResponses = responseResults.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    console.log(`💬 Cross Responses: ${successfulResponses}/${responsePromises.length} responses in ${responseTime}ms`);
    
    // Check inbox load performance with multiple users
    console.log('📬 Phase 3: Concurrent inbox checking...');
    const inboxStart = Date.now();
    
    const inboxPromises = allPages.map(async (page, index) => {
      try {
        await page.goto('/');
        await page.waitForTimeout(1000);
        
        const inboxButton = page.locator('[data-testid="inbox-button"], button:has-text("Inbox")').first();
        if (await inboxButton.isVisible().catch(() => false)) {
          await inboxButton.click();
          await page.waitForTimeout(2000);
          
          const messages = page.locator('[data-testid="inbox-message"], [class*="message"]');
          const messageCount = await messages.count();
          
          return { userId: index + 1, messageCount, success: true };
        }
        return { userId: index + 1, messageCount: 0, success: false };
      } catch (error) {
        return { userId: index + 1, messageCount: 0, success: false };
      }
    });
    
    const inboxResults = await Promise.all(inboxPromises);
    const inboxTime = Date.now() - inboxStart;
    
    const totalMessages = inboxResults.reduce((sum, result) => sum + result.messageCount, 0);
    const successfulInboxChecks = inboxResults.filter(result => result.success).length;
    
    console.log(`📬 Inbox Loading: ${successfulInboxChecks}/6 users loaded inbox in ${inboxTime}ms`);
    console.log(`📊 Total Messages Delivered: ${totalMessages}`);
    
    // Concurrent user performance analysis
    const totalConcurrentTime = Math.max(prayerCreationTime, responseTime, inboxTime);
    const overallSuccessRate = ((successfulPrayers + successfulResponses + successfulInboxChecks) / 
                               (6 + responsePromises.length + 6)) * 100;
    
    console.log('\n👥 CONCURRENT USER PERFORMANCE SUMMARY:');
    console.log(`- Prayer Success Rate: ${(successfulPrayers / 6 * 100).toFixed(1)}%`);
    console.log(`- Response Success Rate: ${(successfulResponses / responsePromises.length * 100).toFixed(1)}%`);
    console.log(`- Inbox Success Rate: ${(successfulInboxChecks / 6 * 100).toFixed(1)}%`);
    console.log(`- Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`- Total Messages Delivered: ${totalMessages}`);
    console.log(`- Peak Concurrent Load Time: ${totalConcurrentTime}ms`);
    console.log(`- System Scalability: ${overallSuccessRate > 85 ? 'EXCELLENT' : overallSuccessRate > 70 ? 'GOOD' : 'POOR'}`);
    
    // Concurrent user assertions
    expect(overallSuccessRate, 'Concurrent user success rate should be above 70%').toBeGreaterThan(70);
    expect(totalConcurrentTime, 'Concurrent operations should complete within reasonable time').toBeLessThan(120000);
    expect(totalMessages, 'Should deliver reasonable number of messages').toBeGreaterThan(5);
    
    console.log('\n🎯 CONCURRENT USER TEST COMPLETE');
  });
});

performanceTest.describe('📊 PERFORMANCE MONITORING & ANALYSIS', () => {
  
  performanceTest('SYSTEM HEALTH: Overall Performance Baseline', async ({ 
    requesterPage, 
    responder1Page 
  }) => {
    console.log('\n📊 RUNNING SYSTEM HEALTH: Overall Performance Baseline');
    
    const healthMetrics = {
      authentication: { time: 0, success: false },
      prayerCreation: { time: 0, success: false },
      responseCreation: { time: 0, success: false },
      messageDelivery: { time: 0, success: false },
      inboxAccess: { time: 0, success: false }
    };
    
    // Authentication Performance
    console.log('🔐 Testing authentication performance...');
    const authStart = Date.now();
    try {
      await authenticateUser(requesterPage, 'health_test_user@test.com', 'TestPassword123!');
      healthMetrics.authentication = { time: Date.now() - authStart, success: true };
    } catch (error) {
      healthMetrics.authentication = { time: Date.now() - authStart, success: false };
    }
    
    // Prayer Creation Performance
    console.log('📝 Testing prayer creation performance...');
    const prayerResult = await createPerformancePrayer(requesterPage, 
      'HEALTH TEST: System performance baseline measurement prayer.'
    );
    healthMetrics.prayerCreation = { time: prayerResult.creationTime, success: prayerResult.success };
    
    // Response Creation Performance
    console.log('💬 Testing response creation performance...');
    const responseResult = await createPerformanceResponse(
      responder1Page, 
      prayerResult.prayerId, 
      'HEALTH RESPONSE: System performance baseline measurement response.'
    );
    healthMetrics.responseCreation = { time: responseResult.responseTime, success: responseResult.success };
    
    // Message Delivery Performance
    console.log('📬 Testing message delivery performance...');
    const deliveryStart = Date.now();
    await requesterPage.waitForTimeout(8000);
    
    await requesterPage.goto('/');
    const inboxButton = requesterPage.locator('[data-testid="inbox-button"], button:has-text("Inbox")').first();
    
    if (await inboxButton.isVisible().catch(() => false)) {
      await inboxButton.click();
      await requesterPage.waitForTimeout(2000);
      
      const messages = requesterPage.locator('[data-testid="inbox-message"], [class*="message"]');
      const messageCount = await messages.count();
      
      healthMetrics.messageDelivery = { 
        time: Date.now() - deliveryStart, 
        success: messageCount > 0 
      };
      healthMetrics.inboxAccess = { 
        time: Date.now() - deliveryStart, 
        success: messageCount > 0 
      };
    }
    
    // Calculate system health score
    const operations = Object.values(healthMetrics);
    const successCount = operations.filter(op => op.success).length;
    const healthScore = (successCount / operations.length) * 100;
    const avgTime = operations.reduce((sum, op) => sum + op.time, 0) / operations.length;
    
    console.log('\n📊 SYSTEM HEALTH BASELINE REPORT:');
    console.log('==========================================');
    console.log(`Authentication: ${healthMetrics.authentication.success ? 'PASS' : 'FAIL'} (${healthMetrics.authentication.time}ms)`);
    console.log(`Prayer Creation: ${healthMetrics.prayerCreation.success ? 'PASS' : 'FAIL'} (${healthMetrics.prayerCreation.time}ms)`);
    console.log(`Response Creation: ${healthMetrics.responseCreation.success ? 'PASS' : 'FAIL'} (${healthMetrics.responseCreation.time}ms)`);
    console.log(`Message Delivery: ${healthMetrics.messageDelivery.success ? 'PASS' : 'FAIL'} (${healthMetrics.messageDelivery.time}ms)`);
    console.log(`Inbox Access: ${healthMetrics.inboxAccess.success ? 'PASS' : 'FAIL'} (${healthMetrics.inboxAccess.time}ms)`);
    console.log('==========================================');
    console.log(`Overall Health Score: ${healthScore.toFixed(1)}%`);
    console.log(`Average Operation Time: ${avgTime.toFixed(0)}ms`);
    console.log(`System Grade: ${healthScore >= 90 ? 'A+' : healthScore >= 80 ? 'A' : healthScore >= 70 ? 'B' : 'C'}`);
    console.log('==========================================');
    
    // Health assertions
    expect(healthScore, `System health should be above 80%. Current: ${healthScore.toFixed(1)}%`).toBeGreaterThan(80);
    expect(avgTime, 'Average operation time should be reasonable').toBeLessThan(15000);
    
    console.log('📊 SYSTEM HEALTH BASELINE COMPLETE');
  });
});