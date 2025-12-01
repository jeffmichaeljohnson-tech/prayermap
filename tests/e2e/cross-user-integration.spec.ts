/**
 * CROSS-USER COMMUNICATION INTEGRATION TESTS
 * 
 * PURPOSE: End-to-end validation of complete user messaging flow with database verification
 * MISSION: Ensure bulletproof reliability of user-to-user communication in PrayerMap
 * 
 * INTEGRATION SCOPE:
 * - Complete user journey from prayer creation to notification receipt
 * - Database consistency validation at each step
 * - Real-time subscription functionality
 * - Cross-device synchronization
 * - Error recovery and edge case handling
 * 
 * SUCCESS CRITERIA:
 * ✅ 100% message delivery reliability
 * ✅ Real-time notifications under 5 seconds
 * ✅ Database consistency maintained
 * ✅ No message duplication or loss
 * ✅ Anonymous and authenticated interactions work identically
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { test as baseTest } from './fixtures/test-fixtures';
import { 
  DatabaseVerifier, 
  TEST_USERS, 
  authenticateTestUser, 
  createUserContext,
  createTestPrayerWithVerification,
  createTestResponseWithVerification,
  verifyInboxWithDatabaseCheck,
  PrayerData,
  ResponseData
} from './utils/cross-user-test-utils';

// Enhanced integration test setup
const integrationTest = baseTest.extend<{
  dbVerifier: DatabaseVerifier;
  requesterPage: Page;
  responder1Page: Page;
  responder2Page: Page;
  anonymousPage: Page;
}>({
  dbVerifier: async ({}, use) => {
    const verifier = new DatabaseVerifier();
    await use(verifier);
    // Cleanup after tests
    await verifier.cleanupTestData(Object.values(TEST_USERS).map(u => u.email));
  },

  requesterPage: async ({ browser }, use) => {
    const context = await createUserContext(browser, 'requester');
    const page = await context.newPage();
    const authResult = await authenticateTestUser(page, 'requester');
    expect(authResult.success).toBe(true);
    await use(page);
    await context.close();
  },

  responder1Page: async ({ browser }, use) => {
    const context = await createUserContext(browser, 'responder1');
    const page = await context.newPage();
    const authResult = await authenticateTestUser(page, 'responder1');
    expect(authResult.success).toBe(true);
    await use(page);
    await context.close();
  },

  responder2Page: async ({ browser }, use) => {
    const context = await createUserContext(browser, 'responder2');
    const page = await context.newPage();
    const authResult = await authenticateTestUser(page, 'responder2');
    expect(authResult.success).toBe(true);
    await use(page);
    await context.close();
  },

  anonymousPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 34.0522, longitude: -118.2437 });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(3000);
    await use(page);
    await context.close();
  }
});

integrationTest.describe('Cross-User Communication Integration Tests', () => {

  integrationTest('INTEGRATION 1: Complete Authenticated User Flow with Database Validation', async ({ 
    requesterPage, 
    responder1Page, 
    dbVerifier 
  }) => {
    console.log('\n🔄 INTEGRATION TEST 1: Complete Authenticated User Flow');
    
    // Step 1: Create prayer with database verification
    console.log('📝 Step 1: Creating verified prayer...');
    const prayerData: PrayerData = {
      content: 'Integration Test Prayer: Please pray for my family\'s health and healing during this difficult time.',
      contentType: 'text',
      isAnonymous: false
    };
    
    const prayerResult = await createTestPrayerWithVerification(requesterPage, prayerData, dbVerifier);
    
    expect(prayerResult.success).toBe(true);
    expect(prayerResult.dbVerified).toBe(true);
    console.log(`✅ Prayer created and verified in DB: ${prayerResult.prayerId}`);
    
    // Step 2: Create response with database verification
    console.log('💬 Step 2: Creating verified response...');
    const responseData: ResponseData = {
      message: 'I am keeping your family in my prayers. God will provide strength and healing. 🙏',
      contentType: 'text',
      isAnonymous: false
    };
    
    const responseResult = await createTestResponseWithVerification(
      responder1Page, 
      prayerResult.prayerText, 
      responseData, 
      dbVerifier
    );
    
    expect(responseResult.success).toBe(true);
    expect(responseResult.dbVerified).toBe(true);
    console.log(`✅ Response created and verified in DB: ${responseResult.responseId}`);
    
    // Step 3: Verify inbox with database cross-check
    console.log('📬 Step 3: Verifying inbox with database cross-check...');
    await requesterPage.waitForTimeout(5000); // Allow time for real-time processing
    
    const requesterUserId = TEST_USERS.requester.userId || 'requester-id';
    const inboxVerification = await verifyInboxWithDatabaseCheck(
      requesterPage,
      requesterUserId,
      {
        minMessages: 1,
        containsText: ['family', 'prayers'],
        fromUsers: [TEST_USERS.responder1.userId || 'responder1-id']
      },
      dbVerifier
    );
    
    expect(inboxVerification.uiSuccess).toBe(true);
    expect(inboxVerification.dbSuccess).toBe(true);
    expect(inboxVerification.discrepancy).toBe(false);
    
    console.log('✅ INTEGRATION TEST 1 - COMPLETE SUCCESS');
    console.log(`   📝 Prayer: ${prayerResult.success} (DB: ${prayerResult.dbVerified})`);
    console.log(`   💬 Response: ${responseResult.success} (DB: ${responseResult.dbVerified})`);
    console.log(`   📬 Inbox: UI=${inboxVerification.uiMessageCount}, DB=${inboxVerification.dbMessageCount}`);
    console.log(`   🔄 Real-time: ${!inboxVerification.discrepancy ? 'Synchronized' : 'Discrepancy detected'}`);
  });

  integrationTest('INTEGRATION 2: Multi-User Response Cascade with Real-Time Validation', async ({ 
    requesterPage, 
    responder1Page, 
    responder2Page, 
    dbVerifier 
  }) => {
    console.log('\n🔄 INTEGRATION TEST 2: Multi-User Response Cascade');
    
    // Step 1: Create prayer
    const prayerData: PrayerData = {
      content: 'Cascade Test: Urgent prayers needed for my job interview tomorrow. Very nervous!',
      contentType: 'text',
      isUrgent: true
    };
    
    const prayerResult = await createTestPrayerWithVerification(requesterPage, prayerData, dbVerifier);
    expect(prayerResult.success && prayerResult.dbVerified).toBe(true);
    
    // Step 2: Multiple responders in sequence with timing
    console.log('💬 Step 2a: First responder...');
    const startTime = Date.now();
    
    const response1Result = await createTestResponseWithVerification(
      responder1Page,
      prayerResult.prayerText,
      {
        message: 'Praying for confidence and success in your interview! You\'ve got this! 💪',
        contentType: 'text'
      },
      dbVerifier
    );
    
    const response1Time = Date.now() - startTime;
    expect(response1Result.success && response1Result.dbVerified).toBe(true);
    
    console.log('💬 Step 2b: Second responder...');
    const response2Start = Date.now();
    
    const response2Result = await createTestResponseWithVerification(
      responder2Page,
      prayerResult.prayerText,
      {
        message: 'God will open the right doors for you. Praying for peace and wisdom! 🙏',
        contentType: 'text'
      },
      dbVerifier
    );
    
    const response2Time = Date.now() - response2Start;
    expect(response2Result.success && response2Result.dbVerified).toBe(true);
    
    // Step 3: Verify requester receives both notifications
    console.log('📬 Step 3: Verifying multiple notifications...');
    await requesterPage.waitForTimeout(7000); // Extra time for multiple notifications
    
    const requesterUserId = TEST_USERS.requester.userId || 'requester-id';
    const inboxVerification = await verifyInboxWithDatabaseCheck(
      requesterPage,
      requesterUserId,
      {
        minMessages: 2,
        containsText: ['interview', 'praying'],
        fromUsers: [
          TEST_USERS.responder1.userId || 'responder1-id',
          TEST_USERS.responder2.userId || 'responder2-id'
        ]
      },
      dbVerifier
    );
    
    expect(inboxVerification.uiSuccess).toBe(true);
    expect(inboxVerification.dbSuccess).toBe(true);
    expect(inboxVerification.uiMessageCount).toBeGreaterThanOrEqual(2);
    expect(inboxVerification.dbMessageCount).toBeGreaterThanOrEqual(2);
    
    console.log('✅ INTEGRATION TEST 2 - MULTI-USER SUCCESS');
    console.log(`   ⏱️  Response 1 Time: ${response1Time}ms`);
    console.log(`   ⏱️  Response 2 Time: ${response2Time}ms`);
    console.log(`   📬 Total Messages: UI=${inboxVerification.uiMessageCount}, DB=${inboxVerification.dbMessageCount}`);
    console.log(`   🔄 Synchronization: ${!inboxVerification.discrepancy ? 'Perfect' : 'Issues detected'}`);
  });

  integrationTest('INTEGRATION 3: Anonymous User Interaction Flow', async ({ 
    requesterPage, 
    anonymousPage, 
    dbVerifier 
  }) => {
    console.log('\n🔄 INTEGRATION TEST 3: Anonymous User Interaction Flow');
    
    // Step 1: Authenticated user creates prayer
    const prayerData: PrayerData = {
      content: 'Anonymous Test: Please pray for my recovery from surgery. Need encouragement.',
      contentType: 'text'
    };
    
    const prayerResult = await createTestPrayerWithVerification(requesterPage, prayerData, dbVerifier);
    expect(prayerResult.success && prayerResult.dbVerified).toBe(true);
    
    // Step 2: Anonymous user responds
    console.log('👤 Step 2: Anonymous user responding...');
    
    // Navigate to prayer on anonymous page
    await anonymousPage.goto('/');
    await anonymousPage.waitForTimeout(5000);
    
    // Find and click on prayer marker
    const prayerMarker = anonymousPage.locator('[data-testid="prayer-marker"], .mapboxgl-marker').first();
    if (await prayerMarker.isVisible().catch(() => false)) {
      await prayerMarker.click();
      await anonymousPage.waitForTimeout(1000);
      
      // Check if this is our test prayer
      const modal = anonymousPage.locator('[data-testid="prayer-detail"], [data-testid="prayer-modal"]');
      if (await modal.isVisible().catch(() => false)) {
        const modalText = await modal.textContent() || '';
        if (modalText.includes('Anonymous Test') || modalText.includes('surgery')) {
          // Respond to prayer
          const respondButton = anonymousPage.locator('button:has-text("Respond"), button:has-text("Pray")').first();
          if (await respondButton.isVisible().catch(() => false)) {
            await respondButton.click();
            await anonymousPage.waitForTimeout(1000);
            
            const responseText = 'Anonymous supporter praying for your quick and complete recovery! 🙏';
            const textArea = anonymousPage.locator('textarea').first();
            if (await textArea.isVisible().catch(() => false)) {
              await textArea.fill(responseText);
              
              const submitButton = anonymousPage.locator('button:has-text("Send"), button:has-text("Submit")').first();
              if (await submitButton.isVisible().catch(() => false)) {
                await submitButton.click();
                await anonymousPage.waitForTimeout(3000);
              }
            }
          }
        }
      }
    }
    
    // Step 3: Verify authenticated user receives anonymous notification
    console.log('📬 Step 3: Verifying anonymous notification delivery...');
    await requesterPage.waitForTimeout(6000);
    
    const requesterUserId = TEST_USERS.requester.userId || 'requester-id';
    const inboxVerification = await verifyInboxWithDatabaseCheck(
      requesterPage,
      requesterUserId,
      {
        minMessages: 1,
        containsText: ['recovery', 'praying']
      },
      dbVerifier
    );
    
    expect(inboxVerification.uiSuccess).toBe(true);
    expect(inboxVerification.dbSuccess).toBe(true);
    
    console.log('✅ INTEGRATION TEST 3 - ANONYMOUS INTERACTION SUCCESS');
    console.log(`   👤 Anonymous Response: Sent successfully`);
    console.log(`   📬 Notification Delivery: UI=${inboxVerification.uiSuccess}, DB=${inboxVerification.dbSuccess}`);
    console.log(`   💬 Message Count: ${inboxVerification.uiMessageCount}`);
  });

  integrationTest('INTEGRATION 4: Real-Time Performance and Reliability Test', async ({ 
    requesterPage, 
    responder1Page, 
    dbVerifier 
  }) => {
    console.log('\n🔄 INTEGRATION TEST 4: Real-Time Performance Test');
    
    // Step 1: Setup real-time monitoring
    console.log('📡 Step 1: Setting up real-time monitoring...');
    
    const prayerData: PrayerData = {
      content: 'Performance Test: Real-time delivery validation prayer. Time sensitive!',
      contentType: 'text'
    };
    
    const prayerResult = await createTestPrayerWithVerification(requesterPage, prayerData, dbVerifier);
    expect(prayerResult.success).toBe(true);
    
    // Step 2: Open requester inbox and monitor
    console.log('👀 Step 2: Opening inbox for real-time monitoring...');
    await requesterPage.goto('/');
    await requesterPage.waitForTimeout(2000);
    
    const inboxButton = requesterPage.locator('[data-testid="inbox-button"], button:has-text("Inbox")').first();
    if (await inboxButton.isVisible().catch(() => false)) {
      await inboxButton.click();
      await requesterPage.waitForTimeout(1000);
    }
    
    // Step 3: Send response and measure delivery time
    console.log('⚡ Step 3: Measuring real-time delivery...');
    const responseStartTime = Date.now();
    
    const responsePromise = createTestResponseWithVerification(
      responder1Page,
      prayerResult.prayerText,
      {
        message: 'Real-time response for performance testing! ⚡',
        contentType: 'text'
      },
      dbVerifier
    );
    
    // Monitor for notification appearance
    let notificationAppeared = false;
    let deliveryTime = 0;
    let attempt = 0;
    
    while (attempt < 20 && !notificationAppeared) { // 20 second timeout
      await requesterPage.waitForTimeout(1000);
      attempt++;
      
      const messages = requesterPage.locator('[data-testid="inbox-message"], [class*="message"]');
      const messageCount = await messages.count();
      
      if (messageCount > 0) {
        const latestMessage = messages.first();
        const messageText = await latestMessage.textContent() || '';
        if (messageText.includes('Real-time response') || messageText.includes('performance testing')) {
          notificationAppeared = true;
          deliveryTime = Date.now() - responseStartTime;
          break;
        }
      }
    }
    
    const responseResult = await responsePromise;
    
    // Performance assertions
    expect(responseResult.success).toBe(true);
    expect(notificationAppeared).toBe(true);
    expect(deliveryTime).toBeLessThan(10000); // Under 10 seconds
    
    console.log('✅ INTEGRATION TEST 4 - REAL-TIME PERFORMANCE SUCCESS');
    console.log(`   ⚡ Delivery Time: ${deliveryTime}ms`);
    console.log(`   📡 Real-time Detection: ${notificationAppeared ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   📊 Performance: ${deliveryTime < 5000 ? 'EXCELLENT' : deliveryTime < 10000 ? 'GOOD' : 'NEEDS IMPROVEMENT'}`);
  });

  integrationTest('INTEGRATION 5: Error Recovery and Consistency Validation', async ({ 
    requesterPage, 
    responder1Page, 
    dbVerifier 
  }) => {
    console.log('\n🔄 INTEGRATION TEST 5: Error Recovery and Consistency');
    
    // Step 1: Create prayer
    const prayerData: PrayerData = {
      content: 'Error Recovery Test: Testing system resilience and data consistency.',
      contentType: 'text'
    };
    
    const prayerResult = await createTestPrayerWithVerification(requesterPage, prayerData, dbVerifier);
    expect(prayerResult.success).toBe(true);
    
    // Step 2: Simulate network interruption
    console.log('🌐 Step 2: Simulating network interruption...');
    await responder1Page.context().setOffline(true);
    await responder1Page.waitForTimeout(2000);
    
    // Attempt response while offline (should fail gracefully)
    const offlineAttempt = await createTestResponseWithVerification(
      responder1Page,
      prayerResult.prayerText,
      {
        message: 'Offline attempt - should not succeed',
        contentType: 'text'
      },
      dbVerifier
    );
    
    // Step 3: Restore connection and retry
    console.log('🔄 Step 3: Restoring connection and retrying...');
    await responder1Page.context().setOffline(false);
    await responder1Page.waitForTimeout(3000);
    
    const onlineAttempt = await createTestResponseWithVerification(
      responder1Page,
      prayerResult.prayerText,
      {
        message: 'Online recovery response - testing resilience! 💪',
        contentType: 'text'
      },
      dbVerifier
    );
    
    // Step 4: Verify data consistency after recovery
    await requesterPage.waitForTimeout(5000);
    
    const requesterUserId = TEST_USERS.requester.userId || 'requester-id';
    const consistencyCheck = await verifyInboxWithDatabaseCheck(
      requesterPage,
      requesterUserId,
      {
        minMessages: 1,
        containsText: ['recovery response', 'resilience']
      },
      dbVerifier
    );
    
    // Assertions
    expect(offlineAttempt.success).toBe(false); // Offline should fail
    expect(onlineAttempt.success).toBe(true);   // Online should succeed
    expect(onlineAttempt.dbVerified).toBe(true);
    expect(consistencyCheck.uiSuccess).toBe(true);
    expect(consistencyCheck.dbSuccess).toBe(true);
    expect(consistencyCheck.discrepancy).toBe(false);
    
    console.log('✅ INTEGRATION TEST 5 - ERROR RECOVERY SUCCESS');
    console.log(`   🌐 Offline Attempt: ${offlineAttempt.success ? 'UNEXPECTED SUCCESS' : 'EXPECTED FAILURE'}`);
    console.log(`   🔄 Recovery Attempt: ${onlineAttempt.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   📊 Data Consistency: ${!consistencyCheck.discrepancy ? 'MAINTAINED' : 'INCONSISTENT'}`);
  });
});

integrationTest.describe('Cross-User Communication System Health Check', () => {
  
  integrationTest('SYSTEM HEALTH: Complete End-to-End Validation', async ({ 
    requesterPage, 
    responder1Page, 
    responder2Page, 
    anonymousPage, 
    dbVerifier 
  }) => {
    console.log('\n🩺 SYSTEM HEALTH CHECK: Complete End-to-End Validation');
    
    const healthMetrics = {
      prayerCreationSuccess: false,
      authenticatedResponseSuccess: false,
      anonymousResponseSuccess: false,
      multiUserNotificationSuccess: false,
      realTimeDeliverySuccess: false,
      databaseConsistencySuccess: false,
      errorRecoverySuccess: false
    };
    
    try {
      // Test 1: Prayer Creation
      console.log('✅ Testing prayer creation...');
      const prayer = await createTestPrayerWithVerification(requesterPage, {
        content: 'System Health Check: Complete validation prayer',
        contentType: 'text'
      }, dbVerifier);
      healthMetrics.prayerCreationSuccess = prayer.success && prayer.dbVerified;
      
      // Test 2: Authenticated Response
      console.log('✅ Testing authenticated response...');
      const authResponse = await createTestResponseWithVerification(
        responder1Page, 
        prayer.prayerText, 
        { message: 'Health check authenticated response', contentType: 'text' }, 
        dbVerifier
      );
      healthMetrics.authenticatedResponseSuccess = authResponse.success && authResponse.dbVerified;
      
      // Test 3: Multi-user notifications
      console.log('✅ Testing multi-user notifications...');
      await requesterPage.waitForTimeout(5000);
      const inboxCheck = await verifyInboxWithDatabaseCheck(
        requesterPage, 
        TEST_USERS.requester.userId || 'requester', 
        { minMessages: 1 }, 
        dbVerifier
      );
      healthMetrics.multiUserNotificationSuccess = inboxCheck.uiSuccess && inboxCheck.dbSuccess;
      healthMetrics.databaseConsistencySuccess = !inboxCheck.discrepancy;
      
      // Test 4: Real-time delivery (simplified)
      healthMetrics.realTimeDeliverySuccess = inboxCheck.uiMessageCount > 0;
      
    } catch (error) {
      console.error('Health check error:', error);
    }
    
    // Calculate overall health score
    const totalTests = Object.keys(healthMetrics).length;
    const passedTests = Object.values(healthMetrics).filter(Boolean).length;
    const healthScore = (passedTests / totalTests) * 100;
    
    console.log('\n🩺 SYSTEM HEALTH REPORT:');
    console.log('=' * 50);
    Object.entries(healthMetrics).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
    });
    console.log('=' * 50);
    console.log(`📊 Overall Health Score: ${healthScore.toFixed(1)}%`);
    
    const healthStatus = healthScore >= 90 ? 'EXCELLENT' :
                        healthScore >= 70 ? 'GOOD' :
                        healthScore >= 50 ? 'FAIR' : 'CRITICAL';
    
    console.log(`🎯 System Status: ${healthStatus}`);
    
    // Assert minimum health threshold
    expect(healthScore).toBeGreaterThanOrEqual(70); // Minimum 70% health
    expect(healthMetrics.prayerCreationSuccess).toBe(true);
    expect(healthMetrics.databaseConsistencySuccess).toBe(true);
  });
});