# Advanced Debugging & Agent Verification Tools

> **Problem Statement**: Playwright is ineffective for debugging animations and real-time features. Agents claim bugs are fixed 90% of the time when they're not. We need world-class tools for fast diagnosis and truthful verification.

---

## 🎯 Core Problems We're Solving

1. **Animation Testing**: Playwright can't verify animations complete correctly or run at 60fps
2. **Real-Time Features**: WebSocket/Realtime subscriptions are hard to debug with traditional E2E tests
3. **Backend Logic**: Agents can't debug Supabase queries, RLS policies, or database operations
4. **Full-Stack Correlation**: Can't link frontend errors to backend queries automatically
5. **False Positives**: Agents claim fixes work without proper verification
6. **Visual Regression**: No way to detect visual bugs or animation glitches
7. **Session Replay**: Can't see what actually happened when bugs occur

---

## 🚨 CRITICAL: Full-Stack Debugging Required

**Problem**: Agents can't debug basic chat/messaging windows because they need to see BOTH:
- **Frontend**: React components, user interactions, UI state
- **Backend**: Supabase queries, RLS policies, database operations, WebSocket connections

**Solution**: **Datadog RUM + APM** - See [FULL_STACK_DEBUGGING_RESEARCH.md](./FULL_STACK_DEBUGGING_RESEARCH.md) for complete research and implementation guide.

**Key Features**:
- ✅ **Automatic correlation** - Frontend errors linked to backend queries
- ✅ **Distributed tracing** - Complete request flow: User click → React → Supabase → PostgreSQL
- ✅ **Intelligent root cause analysis** - AI identifies patterns in failures
- ✅ **Supabase native support** - Built-in PostgreSQL and WebSocket tracing

---

## 🛠️ Recommended Tool Stack

### Tier 0: Full-Stack Distributed Tracing (CRITICAL - NEW)

#### Datadog RUM + APM (RECOMMENDED)
**Why**: Automatically correlates frontend errors with backend queries. Perfect for debugging chat/messaging issues.

**See**: [FULL_STACK_DEBUGGING_RESEARCH.md](./FULL_STACK_DEBUGGING_RESEARCH.md) for complete implementation guide.

**Quick Setup**:
```bash
npm install @datadog/browser-rum @datadog/browser-rum-react
```

**Configuration**: See `src/lib/datadog.ts` and `src/lib/supabase-traced.ts`

**Key Benefits**:
- ✅ **Automatic correlation** - Frontend error → Backend query automatically linked
- ✅ **Complete visibility** - See entire request flow in one view
- ✅ **Intelligent insights** - AI identifies root causes
- ✅ **Supabase native** - Built-in PostgreSQL and WebSocket support

---

### Tier 1: Visual Regression Testing (CRITICAL)

#### Option A: Percy (Recommended)
**Why**: Best-in-class visual regression testing with animation support

**Installation**:
```bash
npm install --save-dev @percy/cli @percy/playwright
```

**Configuration** (`percy.config.js`):
```javascript
module.exports = {
  version: 2,
  discovery: {
    allowedHostnames: ['localhost'],
    networkIdleTimeout: 750,
  },
  snapshot: {
    widths: [375, 1280], // Mobile and desktop
    minHeight: 1024,
    percyCSS: `
      /* Hide dynamic content */
      [data-testid="timestamp"] { visibility: hidden; }
    `,
  },
};
```

**Playwright Integration** (`playwright.config.ts`):
```typescript
import { defineConfig, devices } from '@playwright/test';
import '@percy/playwright';

export default defineConfig({
  // ... existing config
  use: {
    // ... existing use config
  },
  projects: [
    {
      name: 'percy-visual',
      testMatch: /.*\.visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

**Visual Test Example** (`e2e/animation.visual.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Animation Visual Tests', () => {
  test('prayer creation animation completes correctly', async ({ page }) => {
    await page.goto('/');
    
    // Trigger prayer creation
    await page.click('[data-testid="request-prayer-button"]');
    await page.fill('[data-testid="prayer-content"]', 'Test prayer');
    await page.click('[data-testid="submit-prayer"]');
    
    // Wait for animation to START
    await page.waitForSelector('[data-testid="prayer-animation-layer"]', { state: 'visible' });
    
    // Capture at animation midpoint (3 seconds)
    await page.waitForTimeout(3000);
    await percySnapshot(page, 'Prayer animation - midpoint');
    
    // Wait for animation to COMPLETE (6 seconds total)
    await page.waitForTimeout(3000);
    await percySnapshot(page, 'Prayer animation - complete');
    
    // Verify memorial line appears
    await expect(page.locator('[data-testid="memorial-line"]')).toBeVisible();
    await percySnapshot(page, 'Memorial line visible');
  });
  
  test('modal animations are smooth', async ({ page }) => {
    await page.goto('/');
    
    // Capture before
    await percySnapshot(page, 'Modal closed');
    
    // Open modal
    await page.click('[data-testid="request-prayer-button"]');
    
    // Capture during animation (150ms)
    await page.waitForTimeout(75);
    await percySnapshot(page, 'Modal opening');
    
    // Capture after animation completes
    await page.waitForTimeout(225);
    await percySnapshot(page, 'Modal open');
  });
});
```

**Agent Verification Helper** (`src/testing/percy-verification.ts`):
```typescript
/**
 * Agent verification utility for visual regression tests
 * Ensures agents can verify fixes actually work visually
 */
import { Page } from '@playwright/test';
import percySnapshot from '@percy/playwright';

export class VisualVerification {
  /**
   * Verify animation completes and matches expected visual state
   */
  static async verifyAnimationComplete(
    page: Page,
    animationSelector: string,
    expectedFinalState: string,
    timeout = 6000
  ): Promise<boolean> {
    // Wait for animation to start
    await page.waitForSelector(animationSelector, { state: 'visible', timeout });
    
    // Wait for animation to complete
    await page.waitForTimeout(timeout);
    
    // Capture final state
    await percySnapshot(page, expectedFinalState);
    
    // Verify element is in expected state
    const element = page.locator(animationSelector);
    const isVisible = await element.isVisible();
    
    return isVisible;
  }
  
  /**
   * Verify no visual regressions in critical flows
   */
  static async verifyNoVisualRegression(
    page: Page,
    testName: string,
    action: () => Promise<void>
  ): Promise<void> {
    // Capture before
    await percySnapshot(page, `${testName} - before`);
    
    // Perform action
    await action();
    
    // Capture after
    await percySnapshot(page, `${testName} - after`);
  }
}
```

**Usage in Agent Workflow**:
```typescript
// Agents MUST use this before claiming a bug is fixed
test('verify bug fix: prayer animation', async ({ page }) => {
  // ... setup
  
  const isFixed = await VisualVerification.verifyAnimationComplete(
    page,
    '[data-testid="prayer-animation-layer"]',
    'Prayer animation complete'
  );
  
  expect(isFixed).toBe(true); // Agent can't claim fix without this passing
});
```

**CI Integration** (`package.json`):
```json
{
  "scripts": {
    "test:visual": "percy exec -- playwright test --project=percy-visual",
    "test:visual:update": "percy exec -- playwright test --project=percy-visual --update-snapshots"
  }
}
```

---

### Tier 2: Session Replay & Real-Time Debugging

#### Option A: Sentry Replay (Recommended - Free Tier Available)
**Why**: Best for debugging real-time issues, WebSocket problems, and seeing exactly what users see

**Installation**:
```bash
npm install @sentry/react @sentry/replay
```

**Configuration** (`src/lib/sentry.ts`):
```typescript
import * as Sentry from '@sentry/react';
import { Replay } from '@sentry/replay';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [
    new Replay({
      // Record 10% of sessions for performance
      sessionSampleRate: 0.1,
      // Record 100% of sessions with errors
      errorSampleRate: 1.0,
      // Record console logs
      maskAllText: false,
      blockAllMedia: false,
      // Network request recording
      networkDetailAllowUrls: [
        window.location.origin,
        process.env.VITE_SUPABASE_URL || '',
      ],
      networkRequestHeaders: ['X-Client-Info'],
      networkResponseHeaders: ['content-type'],
    }),
  ],
  // Performance monitoring
  tracesSampleRate: 1.0,
  // Environment
  environment: process.env.NODE_ENV || 'development',
  // Release tracking
  release: process.env.VITE_APP_VERSION,
});

export { Sentry };
```

**Real-Time Debugging Helper** (`src/testing/realtime-debugger.ts`):
```typescript
/**
 * Real-time debugging utilities for WebSocket/Realtime features
 */
import { Page } from '@playwright/test';

export class RealtimeDebugger {
  /**
   * Monitor WebSocket connections and messages
   */
  static async monitorWebSockets(page: Page): Promise<void> {
    // Enable WebSocket logging
    page.on('websocket', ws => {
      console.log(`🔌 WebSocket opened: ${ws.url()}`);
      
      ws.on('framesent', event => {
        console.log('📤 WebSocket sent:', event.payload);
      });
      
      ws.on('framereceived', event => {
        console.log('📥 WebSocket received:', event.payload);
      });
      
      ws.on('close', () => {
        console.log('🔌 WebSocket closed');
      });
    });
  }
  
  /**
   * Wait for real-time message delivery with verification
   */
  static async waitForRealtimeMessage(
    page: Page,
    expectedContent: string,
    timeout = 10000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const messages = await page.locator('[data-testid="message"]').all();
      
      for (const message of messages) {
        const text = await message.textContent();
        if (text?.includes(expectedContent)) {
          const deliveryTime = Date.now() - startTime;
          console.log(`✅ Real-time message delivered in ${deliveryTime}ms`);
          return true;
        }
      }
      
      await page.waitForTimeout(100);
    }
    
    console.log(`❌ Real-time message not delivered within ${timeout}ms`);
    return false;
  }
  
  /**
   * Verify Supabase Realtime subscription is active
   */
  static async verifyRealtimeSubscription(
    page: Page,
    channel: string
  ): Promise<boolean> {
    // Inject monitoring script
    const isSubscribed = await page.evaluate((ch) => {
      // Access Supabase client from window
      const supabase = (window as any).__SUPABASE_CLIENT__;
      if (!supabase) return false;
      
      // Check if channel is subscribed
      const channelInstance = supabase.channel(ch);
      return channelInstance.state === 'SUBSCRIBED';
    }, channel);
    
    return isSubscribed;
  }
}
```

**Usage in Tests**:
```typescript
test('real-time messaging works', async ({ page }) => {
  await RealtimeDebugger.monitorWebSockets(page);
  
  // ... setup
  
  const delivered = await RealtimeDebugger.waitForRealtimeMessage(
    page,
    'Praying for you',
    10000
  );
  
  expect(delivered).toBe(true); // Agent verification
});
```

---

### Tier 3: Animation Performance Testing

#### Playwright Performance API + Custom Helpers

**Animation Performance Monitor** (`src/testing/animation-performance.ts`):
```typescript
/**
 * Animation performance testing utilities
 * Verifies animations run at 60fps and complete correctly
 */
import { Page } from '@playwright/test';

export class AnimationPerformance {
  /**
   * Measure animation frame rate
   */
  static async measureFrameRate(
    page: Page,
    duration = 1000
  ): Promise<number> {
    const frameCount = await page.evaluate(async (dur) => {
      let frames = 0;
      let lastTime = performance.now();
      
      const countFrames = (currentTime: number) => {
        frames++;
        lastTime = currentTime;
        
        if (currentTime - startTime < dur) {
          requestAnimationFrame(countFrames);
        }
      };
      
      const startTime = performance.now();
      requestAnimationFrame(countFrames);
      
      // Wait for duration
      await new Promise(resolve => setTimeout(resolve, dur));
      
      return frames;
    }, duration);
    
    return frameCount;
  }
  
  /**
   * Verify animation completes within expected time
   */
  static async verifyAnimationTiming(
    page: Page,
    selector: string,
    expectedDuration: number,
    tolerance = 100
  ): Promise<boolean> {
    const startTime = Date.now();
    
    // Wait for animation to start
    await page.waitForSelector(selector, { state: 'visible' });
    
    // Wait for animation to complete
    await page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel);
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        const animation = style.animation || style.transition;
        
        // Check if animation is still running
        return !animation || animation === 'none';
      },
      selector,
      { timeout: expectedDuration + tolerance }
    );
    
    const actualDuration = Date.now() - startTime;
    const withinTolerance = Math.abs(actualDuration - expectedDuration) <= tolerance;
    
    console.log(`Animation duration: ${actualDuration}ms (expected: ${expectedDuration}ms ±${tolerance}ms)`);
    
    return withinTolerance;
  }
  
  /**
   * Verify animation doesn't cause layout shifts
   */
  static async verifyNoLayoutShift(
    page: Page,
    selector: string
  ): Promise<boolean> {
    const layoutShift = await page.evaluate((sel) => {
      return new Promise<number>((resolve) => {
        let cumulativeShift = 0;
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            cumulativeShift += (entry as any).value;
          }
        });
        
        observer.observe({ entryTypes: ['layout-shift'] });
        
        // Wait for animation
        setTimeout(() => {
          observer.disconnect();
          resolve(cumulativeShift);
        }, 1000);
      });
    }, selector);
    
    // CLS should be < 0.1 for good UX
    return layoutShift < 0.1;
  }
}
```

**Usage**:
```typescript
test('prayer animation performance', async ({ page }) => {
  await page.goto('/');
  
  // Trigger animation
  await page.click('[data-testid="request-prayer-button"]');
  await page.fill('[data-testid="prayer-content"]', 'Test');
  await page.click('[data-testid="submit-prayer"]');
  
  // Verify 60fps
  const fps = await AnimationPerformance.measureFrameRate(page, 1000);
  expect(fps).toBeGreaterThan(55); // Allow some tolerance
  
  // Verify timing
  const timingCorrect = await AnimationPerformance.verifyAnimationTiming(
    page,
    '[data-testid="prayer-animation-layer"]',
    6000, // 6 seconds
    500 // 500ms tolerance
  );
  expect(timingCorrect).toBe(true);
  
  // Verify no layout shift
  const noShift = await AnimationPerformance.verifyNoLayoutShift(
    page,
    '[data-testid="prayer-animation-layer"]'
  );
  expect(noShift).toBe(true);
});
```

---

### Tier 4: Agent Verification Framework

**Critical**: Agents MUST use these utilities before claiming bugs are fixed.

**Agent Verification System** (`src/testing/agent-verification.ts`):
```typescript
/**
 * AGENT VERIFICATION SYSTEM
 * 
 * Agents MUST use these utilities before claiming bugs are fixed.
 * This prevents false positives and ensures truthful bug resolution.
 */

import { Page } from '@playwright/test';
import { VisualVerification } from './percy-verification';
import { RealtimeDebugger } from './realtime-debugger';
import { AnimationPerformance } from './animation-performance';

export interface VerificationResult {
  passed: boolean;
  evidence: {
    screenshots?: string[];
    videos?: string[];
    logs?: string[];
    metrics?: Record<string, number>;
  };
  error?: string;
}

export class AgentVerification {
  /**
   * COMPREHENSIVE BUG VERIFICATION
   * 
   * Agents MUST call this before claiming a bug is fixed.
   * Returns false if ANY verification fails.
   */
  static async verifyBugFix(
    page: Page,
    bugDescription: string,
    verificationSteps: Array<{
      type: 'visual' | 'functional' | 'performance' | 'realtime';
      action: () => Promise<void>;
      expected: () => Promise<boolean>;
    }>
  ): Promise<VerificationResult> {
    const evidence: VerificationResult['evidence'] = {
      screenshots: [],
      videos: [],
      logs: [],
      metrics: {},
    };
    
    const errors: string[] = [];
    
    try {
      // Enable video recording
      await page.video()?.path();
      
      // Enable console logging
      page.on('console', msg => {
        evidence.logs?.push(`[${msg.type()}] ${msg.text()}`);
      });
      
      // Run each verification step
      for (const step of verificationSteps) {
        try {
          // Perform action
          await step.action();
          
          // Wait for stabilization
          await page.waitForTimeout(500);
          
          // Verify expected outcome
          const passed = await step.expected();
          
          if (!passed) {
            errors.push(`Verification failed: ${step.type}`);
            
            // Capture failure evidence
            const screenshot = await page.screenshot({ fullPage: true });
            evidence.screenshots?.push(screenshot.toString('base64'));
          } else {
            // Capture success evidence
            const screenshot = await page.screenshot({ fullPage: true });
            evidence.screenshots?.push(screenshot.toString('base64'));
          }
          
          // Record metrics based on type
          if (step.type === 'performance') {
            const fps = await AnimationPerformance.measureFrameRate(page, 1000);
            evidence.metrics!['fps'] = fps;
          }
          
          if (step.type === 'realtime') {
            await RealtimeDebugger.monitorWebSockets(page);
          }
        } catch (error) {
          errors.push(`Step ${step.type} threw error: ${error}`);
        }
      }
      
      const passed = errors.length === 0;
      
      return {
        passed,
        evidence,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    } catch (error) {
      return {
        passed: false,
        evidence,
        error: `Verification system error: ${error}`,
      };
    }
  }
  
  /**
   * ANIMATION BUG VERIFICATION
   * 
   * Specifically for animation-related bugs
   */
  static async verifyAnimationFix(
    page: Page,
    animationSelector: string,
    expectedDuration: number
  ): Promise<VerificationResult> {
    return this.verifyBugFix(page, 'Animation bug fix', [
      {
        type: 'visual',
        action: async () => {
          // Trigger animation
          await page.click('[data-testid="trigger-animation"]');
        },
        expected: async () => {
          await page.waitForSelector(animationSelector, { state: 'visible' });
          return true;
        },
      },
      {
        type: 'performance',
        action: async () => {
          // Wait for animation
          await page.waitForTimeout(expectedDuration);
        },
        expected: async () => {
          const fps = await AnimationPerformance.measureFrameRate(page, 1000);
          return fps >= 55; // 60fps target with tolerance
        },
      },
      {
        type: 'functional',
        action: async () => {
          // Wait for completion
          await page.waitForTimeout(expectedDuration);
        },
        expected: async () => {
          const timing = await AnimationPerformance.verifyAnimationTiming(
            page,
            animationSelector,
            expectedDuration
          );
          return timing;
        },
      },
    ]);
  }
  
  /**
   * REALTIME BUG VERIFICATION
   * 
   * Specifically for real-time messaging/chat bugs
   */
  static async verifyRealtimeFix(
    page: Page,
    expectedMessage: string,
    timeout = 10000
  ): Promise<VerificationResult> {
    return this.verifyBugFix(page, 'Realtime messaging bug fix', [
      {
        type: 'realtime',
        action: async () => {
          // Send message
          await page.fill('[data-testid="message-input"]', expectedMessage);
          await page.click('[data-testid="send-button"]');
        },
        expected: async () => {
          const delivered = await RealtimeDebugger.waitForRealtimeMessage(
            page,
            expectedMessage,
            timeout
          );
          return delivered;
        },
      },
      {
        type: 'functional',
        action: async () => {
          // Wait for message to appear
          await page.waitForTimeout(1000);
        },
        expected: async () => {
          const message = page.locator(`text="${expectedMessage}"`);
          return await message.isVisible();
        },
      },
    ]);
  }
}
```

**Agent Usage Pattern**:
```typescript
// ❌ BAD: Agent claims fix without verification
test('bug fixed', async ({ page }) => {
  // ... code changes
  expect(true).toBe(true); // This doesn't verify anything!
});

// ✅ GOOD: Agent verifies fix comprehensively
test('bug fixed: prayer animation', async ({ page }) => {
  await page.goto('/');
  
  const result = await AgentVerification.verifyAnimationFix(
    page,
    '[data-testid="prayer-animation-layer"]',
    6000
  );
  
  // Agent CANNOT claim fix without this passing
  expect(result.passed).toBe(true);
  expect(result.error).toBeUndefined();
  
  // Evidence is captured automatically
  expect(result.evidence.screenshots?.length).toBeGreaterThan(0);
});
```

---

## 📋 Implementation Checklist

### Phase 1: Visual Regression (Week 1)
- [ ] Install Percy and configure
- [ ] Create visual test suite for critical animations
- [ ] Set up CI integration
- [ ] Create agent verification helpers

### Phase 2: Session Replay (Week 1)
- [ ] Install Sentry Replay
- [ ] Configure error and session recording
- [ ] Create real-time debugging utilities
- [ ] Test WebSocket monitoring

### Phase 3: Animation Performance (Week 2)
- [ ] Create animation performance utilities
- [ ] Add performance tests to critical flows
- [ ] Set up performance budgets
- [ ] Create agent verification for animations

### Phase 4: Agent Verification Framework (Week 2)
- [ ] Create comprehensive verification system
- [ ] Update all agent workflows to use verification
- [ ] Add evidence capture (screenshots, videos, logs)
- [ ] Create verification report generation

---

## 🚀 Quick Start Commands

```bash
# Visual regression tests
npm run test:visual

# Animation performance tests
npm run test:animation:performance

# Real-time debugging
npm run test:realtime:debug

# Comprehensive agent verification
npm run test:agent:verify
```

---

## 📊 Success Metrics

**Before (Current State)**:
- ❌ 90% false positive rate (agents claim fixes that don't work)
- ❌ No visual regression detection
- ❌ No animation performance verification
- ❌ No real-time debugging capabilities

**After (Target State)**:
- ✅ <5% false positive rate (comprehensive verification)
- ✅ 100% visual regression coverage for critical flows
- ✅ All animations verified at 60fps
- ✅ Real-time features debuggable with session replay
- ✅ Agents provide evidence (screenshots, videos, logs) for every fix

---

## 🔗 Additional Resources

- [Percy Documentation](https://docs.percy.io/)
- [Sentry Replay](https://docs.sentry.io/platforms/javascript/session-replay/)
- [Playwright Performance API](https://playwright.dev/docs/api/class-page#page-evaluate)
- [Web Vitals](https://web.dev/vitals/)

---

**Last Updated**: 2025-01-XX
**Status**: Implementation Ready
**Priority**: CRITICAL - Addresses 90% false positive rate

