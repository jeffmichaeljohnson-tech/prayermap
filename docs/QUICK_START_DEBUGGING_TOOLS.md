# Quick Start: Advanced Debugging Tools

> **Goal**: Set up world-class debugging tools to replace ineffective Playwright tests for animations and real-time features, and prevent agents from claiming bugs are fixed when they're not.

---

## 🚀 Installation (5 minutes)

### Step 1: Install Visual Regression Testing (Percy)

```bash
npm install --save-dev @percy/cli @percy/playwright
```

**Get Percy API Key**:
1. Sign up at https://percy.io (free tier available)
2. Create a new project: "PrayerMap"
3. Copy your `PERCY_TOKEN` from project settings
4. Add to `.env`:
   ```bash
   PERCY_TOKEN=your_token_here
   ```

### Step 2: Install Session Replay (Sentry - Optional but Recommended)

```bash
npm install @sentry/react @sentry/replay
```

**Get Sentry DSN**:
1. Sign up at https://sentry.io (free tier available)
2. Create a new project: "PrayerMap"
3. Copy your DSN
4. Add to `.env`:
   ```bash
   VITE_SENTRY_DSN=your_dsn_here
   ```

### Step 3: Verify Installation

```bash
# Test visual regression setup
npm run test:visual

# Test agent verification
npm run test:agent:verify

# Test animation performance
npm run test:animation:performance
```

---

## 📝 Agent Workflow: How to Verify Bug Fixes

### ❌ BEFORE (Bad - Agents Claim Fixes Without Verification)

```typescript
test('bug fixed', async ({ page }) => {
  // ... make some changes ...
  expect(true).toBe(true); // This doesn't verify anything!
});
```

### ✅ AFTER (Good - Agents Must Verify)

```typescript
import { AgentVerification } from '../src/testing/agent-verification';

test('bug fixed: prayer animation', async ({ page }) => {
  await page.goto('/');
  
  // Agent MUST use verification system
  const result = await AgentVerification.verifyAnimationFix(
    page,
    '[data-testid="prayer-animation-layer"]',
    6000, // Expected duration
    async () => {
      // Trigger animation
      await page.click('[data-testid="request-prayer-button"]');
      await page.fill('[data-testid="prayer-content"]', 'Test');
      await page.click('[data-testid="submit-prayer"]');
    }
  );
  
  // Agent CANNOT claim fix without this passing
  expect(result.passed).toBe(true);
  expect(result.error).toBeUndefined();
  
  // Evidence is automatically captured
  console.log('Evidence:', result.evidence);
});
```

---

## 🎯 Common Use Cases

### 1. Verify Animation Bug Fix

```typescript
const result = await AgentVerification.verifyAnimationFix(
  page,
  '[data-testid="animation-element"]',
  3000, // 3 seconds expected
  async () => {
    await page.click('[data-testid="trigger"]');
  }
);
```

### 2. Verify Real-Time Messaging Bug Fix

```typescript
await RealtimeDebugger.monitorWebSockets(page);

const result = await AgentVerification.verifyRealtimeFix(
  page,
  'Expected message text',
  async () => {
    await page.fill('[data-testid="message-input"]', 'Expected message text');
    await page.click('[data-testid="send"]');
  }
);
```

### 3. Verify Performance Bug Fix

```typescript
const fps = await AnimationPerformance.measureFrameRate(page, 1000);
expect(fps).toBeGreaterThan(55); // Target: 60fps

const noShift = await AnimationPerformance.verifyNoLayoutShift(page, '[data-testid="element"]');
expect(noShift).toBe(true);
```

---

## 📊 Success Metrics

**Before**:
- ❌ 90% false positive rate
- ❌ No visual regression detection
- ❌ No animation performance verification

**After**:
- ✅ <5% false positive rate
- ✅ Visual regression coverage
- ✅ Animation performance verified
- ✅ Evidence captured for every fix

---

## 🔗 Next Steps

1. **Read Full Guide**: See [ADVANCED_DEBUGGING_TOOLS.md](./ADVANCED_DEBUGGING_TOOLS.md) for complete documentation
2. **Update Existing Tests**: Migrate existing tests to use verification system
3. **Set Up CI**: Add visual regression tests to CI pipeline
4. **Train Agents**: Ensure all agents use verification before claiming fixes

---

**Questions?** Check the full documentation or review example tests in `e2e/agent-verification-example.spec.ts`

