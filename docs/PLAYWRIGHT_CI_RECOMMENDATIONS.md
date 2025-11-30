# Playwright Configuration Recommendations for CI

## Current Configuration Analysis

Your current `playwright.config.ts` is well-configured for CI with:
- ✅ CI-specific retries and workers
- ✅ Multiple reporters (HTML, JSON, JUnit)
- ✅ Screenshot/video on failure
- ✅ Trace on first retry
- ✅ Multi-browser testing

## Recommended Enhancements

### 1. Add Global Timeout Configuration

**Why**: Prevents tests from hanging indefinitely in CI

```typescript
// playwright.config.ts
export default defineConfig({
  // ... existing config

  // Maximum time one test can run (30 seconds)
  timeout: 30_000,

  // Maximum time for expect() assertions (5 seconds)
  expect: {
    timeout: 5_000,
  },

  // Maximum time entire test suite can run (60 minutes)
  globalTimeout: 60 * 60 * 1000,
});
```

### 2. Configure Action Timeout

**Why**: Prevents slow actions from timing out prematurely

```typescript
use: {
  // ... existing config

  // Time to wait for navigation, click, etc.
  actionTimeout: 10_000,

  // Time to wait for page.goto()
  navigationTimeout: 30_000,
},
```

### 3. Add Test Annotations for CI

**Why**: Better control over test execution in different environments

```typescript
// In your test files
import { test, expect } from '@playwright/test';

// Mark as slow in CI
test('complex user flow', async ({ page }) => {
  test.slow(process.env.CI === 'true', 'Complex test runs slower in CI');
  // ... test code
});

// Skip in CI (for flaky tests being fixed)
test('flaky test', async ({ page }) => {
  test.skip(process.env.CI === 'true', 'Skipping in CI until fixed');
  // ... test code
});

// Only run in CI (for deployment checks)
test('production checks', async ({ page }) => {
  test.skip(!process.env.CI, 'Only run in CI');
  // ... test code
});
```

### 4. Configure Test Sharding for Large Suites

**When to use**: If you have >50 tests or test suite takes >10 minutes

**In workflow**:
```yaml
strategy:
  matrix:
    shard: [1, 2, 3, 4]
    project: [chromium, firefox, webkit, mobile-chrome, mobile-safari]

steps:
  - name: Run E2E tests
    run: npx playwright test --project=${{ matrix.project }} --shard=${{ matrix.shard }}/4
```

**Benefits**:
- Parallel execution across multiple runners
- Faster CI times (can reduce 10 min to 2-3 min)
- Better resource utilization

### 5. Add Custom Reporter for Better CI Output

**Why**: Better visibility in CI logs

```typescript
// Create custom-reporter.ts
import { Reporter } from '@playwright/test/reporter';

class CIReporter implements Reporter {
  onTestEnd(test, result) {
    const status = result.status === 'passed' ? '✅' : '❌';
    console.log(`${status} ${test.title} (${result.duration}ms)`);

    if (result.status === 'failed') {
      console.log(`  Error: ${result.error?.message}`);
      console.log(`  Location: ${test.location.file}:${test.location.line}`);
    }
  }
}

export default CIReporter;
```

```typescript
// In playwright.config.ts
reporter: [
  ['html'],
  ['json', { outputFile: 'test-results/e2e-results.json' }],
  ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ['./custom-reporter.ts'], // Add custom reporter
],
```

### 6. Configure Test Groups for Faster Feedback

**Why**: Run critical tests first, get faster feedback

```typescript
// playwright.config.critical.ts
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: /.*\.(critical|smoke)\.spec\.ts/,
});
```

**In workflow**:
```yaml
jobs:
  critical-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npx playwright test --config=playwright.config.critical.ts

  full-e2e-tests:
    needs: critical-tests  # Only run if critical tests pass
    runs-on: ubuntu-latest
    steps:
      - run: npx playwright test
```

### 7. Add Performance Budgets

**Why**: Catch performance regressions in CI

```typescript
// e2e/performance.spec.ts
test('homepage loads within budget', async ({ page }) => {
  const start = Date.now();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(3000); // 3 second budget
});

test('prayer creation is fast', async ({ page }) => {
  await page.goto('/');

  const start = Date.now();
  await page.click('[data-testid="create-prayer"]');
  await page.waitForSelector('[data-testid="prayer-form"]');
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(500); // 500ms budget
});
```

### 8. Configure Network Conditions for Mobile

**Why**: Test under realistic mobile network conditions

```typescript
projects: [
  {
    name: 'mobile-chrome-slow-3g',
    use: {
      ...devices['Pixel 5'],
      // Simulate slow 3G
      offline: false,
      downloadThroughput: 400 * 1024 / 8, // 400 Kbps
      uploadThroughput: 400 * 1024 / 8,   // 400 Kbps
      latency: 400, // 400ms
    },
  },
],
```

### 9. Add Test Fixtures for Better Isolation

**Why**: Ensure clean state between tests

```typescript
// e2e/fixtures/test-fixtures.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  // Auto-authenticate user
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/');
    await use(page);
  },

  // Clean database state
  cleanDatabase: async ({}, use) => {
    // Clean before test
    await cleanupDatabase();
    await use();
    // Clean after test
    await cleanupDatabase();
  },
});
```

### 10. Add Screenshot Comparison Tests

**Why**: Catch visual regressions automatically

```typescript
test('prayer card visual regression', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="prayer-card"]');

  // Take screenshot and compare to baseline
  await expect(page.locator('[data-testid="prayer-card"]').first())
    .toHaveScreenshot('prayer-card.png', {
      maxDiffPixels: 100, // Allow small differences
    });
});
```

**Update workflow**:
```yaml
- name: Update snapshots on main
  if: github.ref == 'refs/heads/main' && failure()
  run: npx playwright test --update-snapshots

- name: Commit updated snapshots
  if: github.ref == 'refs/heads/main' && failure()
  run: |
    git config user.name "GitHub Actions"
    git config user.email "actions@github.com"
    git add e2e/**/*.png
    git commit -m "chore: update visual regression snapshots" || true
    git push
```

## Optimized Configuration Template

Here's a complete optimized `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',

  // Parallelization
  fullyParallel: true,
  workers: CI ? 2 : undefined,

  // Retries and timeouts
  retries: CI ? 2 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  globalTimeout: 60 * 60 * 1000,

  // CI-specific settings
  forbidOnly: CI,
  forbidDefaultProject: true,

  // Reporters
  reporter: [
    ['html', { open: CI ? 'never' : 'on-failure' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ['github'], // GitHub Actions annotations
  ],

  // Shared settings
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Timezone
    timezoneId: 'America/New_York',

    // Locale
    locale: 'en-US',
  },

  // Test match patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
  ],

  // Test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.skip.spec.ts',
  ],

  // Browser projects
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    // Mobile with slow network (optional)
    {
      name: 'mobile-chrome-slow-3g',
      use: {
        ...devices['Pixel 5'],
        offline: false,
        downloadThroughput: 400 * 1024 / 8,
        uploadThroughput: 400 * 1024 / 8,
        latency: 400,
      },
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120_000,
    reuseExistingServer: !CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
```

## Implementation Priority

Implement in this order for maximum impact:

1. **High Priority** (Do first):
   - ✅ Global timeouts configuration
   - ✅ Action/navigation timeouts
   - ✅ GitHub reporter for better CI visibility

2. **Medium Priority** (Do next):
   - ⚡ Test sharding (if suite >50 tests)
   - ⚡ Performance budgets
   - ⚡ Test fixtures for isolation

3. **Low Priority** (Nice to have):
   - 📸 Visual regression tests
   - 🌐 Network condition testing
   - 📊 Custom reporters

## Testing the Changes

After implementing changes:

```bash
# Test locally with CI config
CI=true npm run test:e2e

# Test specific browser
CI=true npx playwright test --project=chromium

# Test with sharding
CI=true npx playwright test --shard=1/4

# Generate and view report
CI=true npm run test:e2e
npm run test:e2e:report
```

## Monitoring CI Performance

Track these metrics:

| Metric | Target | Current |
|--------|--------|---------|
| Total CI time | <5 min | ? |
| Test suite time | <3 min | ? |
| Cache hit rate | >90% | ? |
| Flaky test rate | <5% | ? |
| Failed test rate | <2% | ? |

## Next Steps

1. ✅ Implement high-priority recommendations
2. 📊 Measure CI performance before/after
3. 🔍 Identify and fix flaky tests
4. 📈 Add performance budgets
5. 🎨 Consider visual regression tests
6. 🔄 Iterate based on metrics

---

**Questions?** Check `/docs/E2E_CI_SETUP.md` for detailed CI setup guide.
