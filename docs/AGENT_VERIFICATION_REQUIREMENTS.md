# Agent Verification Requirements

> **CRITICAL**: Agents MUST use verification tools before claiming bugs are fixed. This prevents the 90% false positive rate.

---

## 🚨 The Problem

**Current State**:
- Agents claim bugs are fixed 90% of the time when they're not
- Playwright tests don't effectively verify animations
- Real-time features can't be properly debugged
- No visual regression detection
- No evidence captured for bug fixes

**Impact**:
- Wasted development time
- Bugs remain unfixed
- User frustration
- Loss of trust in agent capabilities

---

## ✅ The Solution

**Agent Verification System** - Agents MUST use these tools before claiming fixes:

### 1. AgentVerification Class

**Location**: `src/testing/agent-verification.ts`

**Usage**:
```typescript
import { AgentVerification } from '../src/testing/agent-verification';

// Before claiming fix
const result = await AgentVerification.verifyAnimationFix(
  page,
  '[data-testid="element"]',
  6000,
  async () => { /* trigger action */ }
);

// Agent CANNOT claim fix without this
expect(result.passed).toBe(true);
expect(result.error).toBeUndefined();
```

**What It Does**:
- ✅ Verifies bug is actually fixed
- ✅ Captures evidence (screenshots, videos, logs)
- ✅ Records metrics (timing, performance)
- ✅ Provides error details if verification fails

### 2. AnimationPerformance Class

**Location**: `src/testing/animation-performance.ts`

**Usage**:
```typescript
import { AnimationPerformance } from '../src/testing/animation-performance';

// Verify 60fps
const fps = await AnimationPerformance.measureFrameRate(page, 1000);
expect(fps).toBeGreaterThan(55);

// Verify timing
const timing = await AnimationPerformance.verifyAnimationTiming(
  page,
  '[data-testid="animation"]',
  6000
);
expect(timing).toBe(true);
```

### 3. RealtimeDebugger Class

**Location**: `src/testing/realtime-debugger.ts`

**Usage**:
```typescript
import { RealtimeDebugger } from '../src/testing/realtime-debugger';

// Monitor WebSocket connections
await RealtimeDebugger.monitorWebSockets(page);

// Verify real-time delivery
const delivered = await RealtimeDebugger.waitForRealtimeMessage(
  page,
  'Expected message',
  10000
);
expect(delivered).toBe(true);
```

---

## 📋 Agent Workflow Requirements

### Step 1: Identify Bug Type

- **Animation Bug** → Use `AgentVerification.verifyAnimationFix()`
- **Real-Time Bug** → Use `AgentVerification.verifyRealtimeFix()`
- **Visual Bug** → Use `AgentVerification.verifyVisualFix()`
- **Performance Bug** → Use `AnimationPerformance` utilities
- **Complex Bug** → Use `AgentVerification.verifyBugFix()` with multiple steps

### Step 2: Write Verification Test

```typescript
test('BUG FIX: [description]', async ({ page }) => {
  // Setup
  await page.goto('/');
  
  // Verify fix
  const result = await AgentVerification.verifyAnimationFix(
    page,
    '[data-testid="element"]',
    6000,
    async () => {
      // Trigger action
    }
  );
  
  // Assertion - Agent CANNOT claim fix without this
  expect(result.passed).toBe(true);
  expect(result.error).toBeUndefined();
});
```

### Step 3: Run Verification

```bash
npm run test:agent:verify
```

### Step 4: Review Evidence

If verification fails, review:
- `result.evidence.screenshots` - Visual evidence
- `result.evidence.logs` - Console logs
- `result.evidence.metrics` - Performance metrics
- `result.error` - Error details

---

## ❌ Forbidden Patterns

### ❌ DO NOT Claim Fix Without Verification

```typescript
// BAD - No verification
test('bug fixed', async ({ page }) => {
  // ... changes ...
  expect(true).toBe(true); // This doesn't verify anything!
});
```

### ❌ DO NOT Skip Evidence Capture

```typescript
// BAD - No evidence
test('bug fixed', async ({ page }) => {
  await page.click('[data-testid="button"]');
  // No verification, no evidence
});
```

### ❌ DO NOT Use Generic Assertions

```typescript
// BAD - Generic assertion doesn't verify fix
test('bug fixed', async ({ page }) => {
  await page.goto('/');
  expect(page).toBeTruthy(); // This doesn't verify the bug is fixed!
});
```

---

## ✅ Required Patterns

### ✅ DO Use Verification System

```typescript
// GOOD - Comprehensive verification
test('BUG FIX: Prayer animation completes', async ({ page }) => {
  const result = await AgentVerification.verifyAnimationFix(
    page,
    '[data-testid="prayer-animation-layer"]',
    6000,
    async () => {
      await page.click('[data-testid="request-prayer-button"]');
      await page.fill('[data-testid="prayer-content"]', 'Test');
      await page.click('[data-testid="submit-prayer"]');
    }
  );
  
  expect(result.passed).toBe(true);
  expect(result.error).toBeUndefined();
});
```

### ✅ DO Capture Evidence

```typescript
// GOOD - Evidence captured automatically
const result = await AgentVerification.verifyBugFix(page, 'Bug description', [
  // ... steps ...
]);

// Evidence available for debugging
console.log('Screenshots:', result.evidence.screenshots?.length);
console.log('Metrics:', result.evidence.metrics);
```

### ✅ DO Verify Multiple Aspects

```typescript
// GOOD - Comprehensive verification
const result = await AgentVerification.verifyBugFix(page, 'Complex bug', [
  {
    type: 'functional',
    name: 'Element appears',
    action: async () => { /* ... */ },
    expected: async () => { /* ... */ },
  },
  {
    type: 'performance',
    name: 'Runs smoothly',
    action: async () => { /* ... */ },
    expected: async () => { /* ... */ },
  },
]);
```

---

## 📊 Verification Checklist

Before claiming a bug is fixed, verify:

- [ ] **Verification test written** using `AgentVerification` utilities
- [ ] **Test passes** (`result.passed === true`)
- [ ] **No errors** (`result.error === undefined`)
- [ ] **Evidence captured** (screenshots, logs, metrics)
- [ ] **Performance verified** (for animation/performance bugs)
- [ ] **Real-time verified** (for messaging/chat bugs)
- [ ] **Visual verified** (for UI/visual bugs)

---

## 🎯 Success Criteria

**Agent verification is successful when**:

1. ✅ Verification test passes
2. ✅ Evidence is captured
3. ✅ Metrics meet performance targets
4. ✅ No errors in verification result
5. ✅ Bug is actually fixed (manual verification confirms)

**Agent CANNOT claim fix if**:

- ❌ Verification test fails
- ❌ Evidence is missing
- ❌ Metrics don't meet targets
- ❌ Errors in verification result
- ❌ Manual verification shows bug still exists

---

## 📚 Resources

- **Full Documentation**: [ADVANCED_DEBUGGING_TOOLS.md](./ADVANCED_DEBUGGING_TOOLS.md)
- **Quick Start**: [QUICK_START_DEBUGGING_TOOLS.md](./QUICK_START_DEBUGGING_TOOLS.md)
- **Example Tests**: `e2e/agent-verification-example.spec.ts`
- **API Reference**: See source files in `src/testing/`

---

## 🚀 Getting Started

1. **Read**: [QUICK_START_DEBUGGING_TOOLS.md](./QUICK_START_DEBUGGING_TOOLS.md)
2. **Review**: Example tests in `e2e/agent-verification-example.spec.ts`
3. **Use**: Verification utilities in your tests
4. **Verify**: Always verify before claiming fixes

---

**Remember**: Verification is not optional. Agents MUST verify before claiming bugs are fixed.

