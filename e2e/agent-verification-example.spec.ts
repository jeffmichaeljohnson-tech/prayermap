/**
 * EXAMPLE: Agent Verification Test
 * 
 * This file demonstrates how agents MUST verify bug fixes before claiming they're fixed.
 * 
 * CRITICAL: Agents cannot claim a bug is fixed without using AgentVerification utilities.
 */

import { test, expect } from '@playwright/test';
import { AgentVerification } from '../src/testing/agent-verification';
import { AnimationPerformance } from '../src/testing/animation-performance';
import { RealtimeDebugger } from '../src/testing/realtime-debugger';

test.describe('Agent Verification Examples', () => {
  
  test('EXAMPLE: Verify animation bug fix', async ({ page }) => {
    // ❌ BAD: Agent claims fix without verification
    // test('animation works', async ({ page }) => {
    //   await page.click('[data-testid="button"]');
    //   expect(true).toBe(true); // This doesn't verify anything!
    // });
    
    // ✅ GOOD: Agent verifies fix comprehensively
    await page.goto('/');
    
    const result = await AgentVerification.verifyAnimationFix(
      page,
      '[data-testid="prayer-animation-layer"]',
      6000, // Expected duration: 6 seconds
      async () => {
        // Trigger animation
        await page.click('[data-testid="request-prayer-button"]');
        await page.fill('[data-testid="prayer-content"]', 'Test prayer for verification');
        await page.click('[data-testid="submit-prayer"]');
      }
    );
    
    // Agent CANNOT claim fix without this passing
    expect(result.passed).toBe(true);
    expect(result.error).toBeUndefined();
    
    // Evidence is captured automatically
    expect(result.evidence.screenshots?.length).toBeGreaterThan(0);
    expect(result.evidence.metrics).toBeDefined();
    
    console.log('Verification metrics:', result.evidence.metrics);
  });
  
  test('EXAMPLE: Verify real-time messaging bug fix', async ({ page }) => {
    // Setup: Authenticate and navigate
    await page.goto('/');
    // ... authentication setup ...
    
    // Monitor WebSocket connections
    await RealtimeDebugger.monitorWebSockets(page);
    
    const result = await AgentVerification.verifyRealtimeFix(
      page,
      'Praying for you', // Expected message content
      async () => {
        // Send message
        await page.fill('[data-testid="message-input"]', 'Praying for you');
        await page.click('[data-testid="send-button"]');
      },
      10000 // 10 second timeout
    );
    
    // Agent verification
    expect(result.passed).toBe(true);
    expect(result.error).toBeUndefined();
    
    // Check real-time metrics
    const metrics = await RealtimeDebugger.getRealtimeMetrics(page);
    expect(metrics.messagesSent).toBeGreaterThan(0);
    expect(metrics.averageLatency).toBeLessThan(1000); // Should be < 1 second
  });
  
  test('EXAMPLE: Verify animation performance', async ({ page }) => {
    await page.goto('/');
    
    // Trigger animation
    await page.click('[data-testid="request-prayer-button"]');
    await page.fill('[data-testid="prayer-content"]', 'Performance test');
    await page.click('[data-testid="submit-prayer"]');
    
    // Measure frame rate
    const fps = await AnimationPerformance.measureFrameRate(page, 1000);
    expect(fps).toBeGreaterThan(55); // Target: 60fps with tolerance
    
    // Verify timing
    const timingCorrect = await AnimationPerformance.verifyAnimationTiming(
      page,
      '[data-testid="prayer-animation-layer"]',
      6000, // Expected: 6 seconds
      500 // Tolerance: 500ms
    );
    expect(timingCorrect).toBe(true);
    
    // Verify no layout shift
    const noShift = await AnimationPerformance.verifyNoLayoutShift(
      page,
      '[data-testid="prayer-animation-layer"]',
      1000
    );
    expect(noShift).toBe(true);
  });
  
  test('EXAMPLE: Comprehensive bug verification', async ({ page }) => {
    await page.goto('/');
    
    // Use comprehensive verification for complex bugs
    const result = await AgentVerification.verifyBugFix(
      page,
      'Prayer creation and animation flow',
      [
        {
          type: 'functional',
          name: 'Prayer modal opens',
          action: async () => {
            await page.click('[data-testid="request-prayer-button"]');
          },
          expected: async () => {
            const modal = page.locator('[data-testid="request-prayer-modal"]');
            return await modal.isVisible();
          },
        },
        {
          type: 'functional',
          name: 'Prayer is created',
          action: async () => {
            await page.fill('[data-testid="prayer-content"]', 'Test prayer');
            await page.click('[data-testid="submit-prayer"]');
          },
          expected: async () => {
            // Wait for prayer to appear on map
            await page.waitForTimeout(2000);
            const markers = page.locator('[data-testid="prayer-marker"]');
            const count = await markers.count();
            return count > 0;
          },
        },
        {
          type: 'performance',
          name: 'Animation runs smoothly',
          action: async () => {
            // Animation should start automatically after prayer creation
            await page.waitForTimeout(1000);
          },
          expected: async () => {
            const fps = await AnimationPerformance.measureFrameRate(page, 1000);
            return fps >= 55;
          },
        },
        {
          type: 'functional',
          name: 'Memorial line appears',
          action: async () => {
            // Wait for animation to complete
            await page.waitForTimeout(6000);
          },
          expected: async () => {
            const line = page.locator('[data-testid="memorial-line"]');
            return await line.isVisible().catch(() => false);
          },
        },
      ]
    );
    
    // Agent MUST verify all steps pass
    expect(result.passed).toBe(true);
    expect(result.error).toBeUndefined();
    
    // Evidence captured for debugging
    console.log('Verification evidence:', {
      screenshots: result.evidence.screenshots?.length || 0,
      logs: result.evidence.logs?.length || 0,
      metrics: result.evidence.metrics,
    });
  });
});

