# E2E Testing in CI - Setup & Usage Guide

## Overview

The PrayerMap E2E testing workflow runs comprehensive end-to-end tests across multiple browsers using Playwright. This ensures cross-browser compatibility and catches regressions before they reach production.

## Workflow Triggers

The E2E workflow runs automatically on:

1. **Push to main/develop branches**
2. **Pull requests** targeting main/develop
3. **Nightly schedule** at 2 AM UTC
4. **Manual trigger** via GitHub Actions UI (with optional browser selection)

## Browser Matrix

Tests run in parallel across 5 browser configurations:

| Project | Browser | Device Type |
|---------|---------|-------------|
| chromium | Chrome Desktop | Desktop |
| firefox | Firefox Desktop | Desktop |
| webkit | Safari Desktop | Desktop |
| mobile-chrome | Chrome Mobile | Pixel 5 |
| mobile-safari | Safari Mobile | iPhone 12 |

## Viewing Test Results

### 1. In GitHub Actions UI

**Navigate to**: Repository → Actions → E2E Tests workflow

**View**:
- ✅ Test status (pass/fail) for each browser
- 📊 Summary with test counts
- ⏱️ Execution time per browser
- 📝 Test logs and console output

### 2. Playwright HTML Report

**Access**:
1. Go to failed workflow run
2. Scroll to "Artifacts" section
3. Download `playwright-report-{browser}-{run-number}`
4. Extract and open `index.html` in browser

**Features**:
- Interactive test results
- Screenshots and videos inline
- Trace viewer integration
- Test filtering and search

### 3. Screenshots (on failure)

**Access**: Download `screenshots-{browser}-{run-number}` artifact

**Contains**:
- Screenshots taken at point of failure
- Named by test and timestamp
- Useful for quick visual debugging

### 4. Videos (on failure)

**Access**: Download `videos-{browser}-{run-number}` artifact

**Contains**:
- Screen recordings of failed tests
- Shows full user interaction flow
- Helps reproduce issues locally

### 5. Trace Files (on failure)

**Access**: Download `traces-{browser}-{run-number}` artifact

**Usage**:
```bash
# View trace in Playwright Trace Viewer
npx playwright show-trace path/to/trace.zip
```

**Features**:
- Time-travel debugging
- Network requests
- Console logs
- DOM snapshots
- Action timeline

## Artifact Retention Policies

| Artifact Type | Retention | Purpose |
|--------------|-----------|---------|
| Test Results | 30 days | Full test output and metadata |
| Playwright Reports | 30 days | Interactive HTML reports |
| Screenshots | 7 days | Quick visual debugging |
| Videos | 7 days | Reproducing failures |
| Trace Files | 7 days | Deep debugging |
| Visual Regression | 14 days | UI change detection |

## Playwright Configuration for CI

### Current CI Optimizations

```typescript
// playwright.config.ts
export default defineConfig({
  // Only fail if explicitly marked with test.only() in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests 2x in CI
  retries: process.env.CI ? 2 : 0,

  // Run tests sequentially in CI to avoid resource issues
  workers: process.env.CI ? 1 : undefined,

  // Multiple reporters for different use cases
  reporter: [
    ['html'],  // Interactive HTML report
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ],

  use: {
    // Capture trace on first retry for debugging
    trace: 'on-first-retry',

    // Screenshot only when tests fail
    screenshot: 'only-on-failure',

    // Record video only when tests fail
    video: 'retain-on-failure',
  },

  webServer: {
    // Don't reuse server in CI (ensures clean state)
    reuseExistingServer: !process.env.CI,
  },
});
```

### Recommended Additional Optimizations

#### 1. Add Test Timeout Configuration

```typescript
// Add to playwright.config.ts
export default defineConfig({
  // ... existing config

  // Global timeout for each test
  timeout: 30_000, // 30 seconds

  // Timeout for expect() assertions
  expect: {
    timeout: 5_000, // 5 seconds
  },
});
```

#### 2. Configure Test Sharding (for very large test suites)

```yaml
# In .github/workflows/e2e.yml
strategy:
  matrix:
    shard: [1, 2, 3, 4]

# Then in test step:
run: npx playwright test --shard=${{ matrix.shard }}/4
```

#### 3. Add Playwright Config for CI-Specific Settings

```typescript
// playwright.config.ci.ts
import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,

  // Run only critical tests in PR checks
  testMatch: process.env.PR_CHECK ?
    /.*\.(critical|smoke)\.spec\.ts/ :
    /.*\.spec\.ts/,

  // Adjust parallelism based on available resources
  workers: process.env.CI ? 2 : undefined,

  // Reduce retries for faster feedback
  retries: 1,
});
```

## Manual Workflow Dispatch

**Trigger manually** when you want to test a specific browser:

1. Go to: Actions → E2E Tests → Run workflow
2. Select branch
3. Choose browser (or "all")
4. Click "Run workflow"

**Use cases**:
- Testing specific browser fix
- Quick smoke test before merge
- Debugging browser-specific issue

## Environment Variables

**Required Secrets** (set in GitHub Settings → Secrets):

```bash
VITE_SUPABASE_URL          # Supabase project URL
VITE_SUPABASE_ANON_KEY     # Supabase anonymous key
```

**Optional** (for advanced features):

```bash
SUPABASE_SERVICE_ROLE_KEY  # For test data seeding
SLACK_WEBHOOK_URL          # For failure notifications
```

## Troubleshooting

### Tests Pass Locally but Fail in CI

**Common causes**:
1. **Timing issues**: Add explicit waits instead of fixed timeouts
2. **Missing dependencies**: Ensure all Playwright deps installed
3. **Environment differences**: Check env variables
4. **Race conditions**: Use `waitForLoadState()` appropriately

**Solution**:
```typescript
// ❌ Bad: Fixed timeout
await page.waitForTimeout(1000);

// ✅ Good: Wait for specific condition
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="prayer-card"]');
```

### Flaky Tests

**Indicators**:
- Tests pass on retry
- Intermittent failures
- Different results across runs

**Solutions**:
1. Use `test.retry(3)` for known flaky tests
2. Add better waiting strategies
3. Check for timing-dependent assertions
4. Use `expect.toPass()` for eventually consistent checks

```typescript
// Retry eventually consistent operations
await expect(async () => {
  const count = await page.locator('.prayer-card').count();
  expect(count).toBeGreaterThan(0);
}).toPass({
  timeout: 10_000,
  intervals: [1_000, 2_000],
});
```

### Browser Installation Fails

**Issue**: Playwright browsers not cached properly

**Solution**:
1. Clear GitHub Actions cache
2. Check `package-lock.json` is committed
3. Verify cache key in workflow

### Out of Memory Errors

**Issue**: CI runner runs out of memory

**Solutions**:
1. Reduce parallel workers: `workers: 1`
2. Close browser contexts: `await context.close()`
3. Limit video retention: `video: 'retain-on-failure'`
4. Use test sharding for large suites

## Performance Optimization

### Current Caching Strategy

```yaml
# Cache Playwright browsers (saves ~2 minutes)
- uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
```

### Estimated CI Times

| Stage | Time | Cached |
|-------|------|--------|
| Checkout | 10s | - |
| Setup Node | 15s | ✅ |
| Install deps | 30s | ✅ |
| Install browsers | 120s | ✅ |
| Build app | 60s | - |
| Run tests | 180s | - |
| **Total** | **~7 min** | **~4 min** |

### Speed Improvement Tips

1. **Enable caching** (already done)
2. **Use test sharding** for suites >100 tests
3. **Run critical tests first** in PRs
4. **Skip non-critical browsers** in draft PRs
5. **Use `test.describe.configure({ mode: 'parallel' })`**

## Integration with Other Workflows

### Combine with Unit Tests

```yaml
# .github/workflows/ci.yml
jobs:
  unit-tests:
    # ... unit test job

  e2e-tests:
    needs: unit-tests  # Only run E2E if unit tests pass
    # ... e2e test job
```

### Add Status Checks

**In GitHub Settings → Branches → Branch protection**:

Required status checks:
- ✅ E2E Tests - chromium
- ✅ E2E Tests - firefox
- ✅ E2E Tests - webkit
- ⚠️ E2E Tests - mobile-chrome (optional)
- ⚠️ E2E Tests - mobile-safari (optional)

## Next Steps

### Recommended Additions

1. **Lighthouse Performance Tests**
   ```typescript
   test('homepage performance', async ({ page }) => {
     await page.goto('/');
     const metrics = await page.evaluate(() =>
       JSON.stringify(performance.getEntriesByType('navigation'))
     );
     // Assert performance metrics
   });
   ```

2. **Accessibility Tests**
   ```bash
   npm install -D @axe-core/playwright
   ```

3. **Visual Regression Tests**
   ```typescript
   test('prayer card visual', async ({ page }) => {
     await page.goto('/');
     await expect(page.locator('.prayer-card').first())
       .toHaveScreenshot('prayer-card.png');
   });
   ```

4. **Slack Notifications** on failure
   ```yaml
   - name: Notify on failure
     if: failure()
     uses: 8398a7/action-slack@v3
     with:
       status: ${{ job.status }}
       webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
   ```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

## Support

**Issues with E2E tests?**

1. Check workflow logs in GitHub Actions
2. Download and review Playwright HTML report
3. View trace files for detailed debugging
4. Check this guide's troubleshooting section
5. Review test code in `/e2e` directory

---

**Last Updated**: 2025-11-29
**Maintained By**: PrayerMap DevOps Team
