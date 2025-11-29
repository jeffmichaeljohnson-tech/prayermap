# E2E Testing CI - Quick Reference

## 🚀 Quick Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests matching pattern
npx playwright test --grep "prayer creation"

# View last test report
npm run test:e2e:report

# Update visual snapshots
npx playwright test --update-snapshots
```

## 📊 Viewing CI Results

### Option 1: GitHub Actions UI
```
Repository → Actions → E2E Tests → Select run → View logs
```

### Option 2: Download Artifacts
```
Workflow run → Artifacts section → Download:
  - playwright-report-{browser}-{run} (HTML report)
  - screenshots-{browser}-{run} (failure screenshots)
  - videos-{browser}-{run} (failure videos)
  - traces-{browser}-{run} (debug traces)
```

### Option 3: View Trace File
```bash
# Download trace.zip from artifacts
npx playwright show-trace path/to/trace.zip

# Opens interactive trace viewer in browser
```

## 🔧 Common CI Issues & Fixes

### Tests Pass Locally, Fail in CI

**Issue**: Timing/environment differences

**Fix**:
```typescript
// ❌ Bad: Fixed timeouts
await page.waitForTimeout(1000);

// ✅ Good: Wait for specific condition
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="element"]');
```

### Flaky Tests

**Issue**: Tests randomly fail

**Fix**:
```typescript
// Add retry for specific test
test('flaky test', async ({ page }) => {
  test.retry(3);
  // ... test code
});

// Or use expect.toPass() for eventually consistent checks
await expect(async () => {
  const count = await page.locator('.item').count();
  expect(count).toBeGreaterThan(0);
}).toPass({ timeout: 10_000 });
```

### Browser Install Fails

**Issue**: Playwright browsers not installing

**Fix**:
```bash
# Clear GitHub Actions cache
# Settings → Actions → Caches → Delete all caches

# OR manually install in CI
npx playwright install --with-deps
```

### Slow CI Runs

**Issue**: Tests take too long

**Fix**:
```yaml
# Enable test sharding in workflow
strategy:
  matrix:
    shard: [1, 2, 3, 4]

# Run command
run: npx playwright test --shard=${{ matrix.shard }}/4
```

## 🎯 Test Organization

### Critical Tests (Run First)
```typescript
// e2e/smoke/critical.spec.ts
test.describe('Critical User Flows', () => {
  test('user can view prayers', async ({ page }) => {
    // ...
  });

  test('user can create prayer', async ({ page }) => {
    // ...
  });
});
```

### Optional Tests (Run Later)
```typescript
// e2e/optional/visual.spec.ts
test.describe('Visual Regression', () => {
  test('prayer card looks correct @visual', async ({ page }) => {
    // ...
  });
});
```

## 📝 Environment Variables

### Required in CI
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### Optional
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # For test data seeding
SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx  # For notifications
```

## 🔄 Workflow Triggers

| Trigger | Command | When to Use |
|---------|---------|-------------|
| Push to main | (automatic) | After merge |
| Pull request | (automatic) | Before merge |
| Schedule | (automatic) | Nightly regression |
| Manual | Actions → Run workflow | Test specific browser |

### Manual Trigger
```
1. Go to: Actions → E2E Tests
2. Click: "Run workflow"
3. Select: Branch
4. Choose: Browser (or "all")
5. Click: "Run workflow" button
```

## 📦 Artifact Types

| Type | When Created | Retention | Size |
|------|--------------|-----------|------|
| HTML Report | Always | 30 days | ~5 MB |
| Screenshots | On failure | 7 days | ~500 KB |
| Videos | On failure | 7 days | ~5 MB |
| Traces | On failure | 7 days | ~10 MB |
| Test Results | Always | 30 days | ~1 MB |

## 🎨 Test Annotations

```typescript
// Skip test
test.skip('not ready yet', async ({ page }) => { });

// Skip conditionally
test.skip(process.env.CI === 'true', 'Flaky in CI');

// Only run this test
test.only('debug this', async ({ page }) => { });

// Mark as slow (3x timeout)
test.slow();

// Mark conditionally slow
test.slow(process.env.CI === 'true', 'Slower in CI');

// Add test info
test('my test', async ({ page }) => {
  test.info().annotations.push({
    type: 'issue',
    description: 'https://github.com/user/repo/issues/123',
  });
});
```

## 🐛 Debugging

### Local Debugging
```bash
# Run in debug mode
npm run test:e2e:debug

# Run specific test in debug
npx playwright test e2e/auth.spec.ts:10 --debug

# Generate trace
npx playwright test --trace on
```

### CI Debugging
```bash
# Download trace from CI artifacts
# Then view locally:
npx playwright show-trace trace.zip

# Or add debug step in workflow:
- name: Debug on failure
  if: failure()
  run: |
    echo "Tests failed, uploading debug info"
    npx playwright show-report
```

## 📈 Performance Targets

| Metric | Target | How to Check |
|--------|--------|--------------|
| Total CI time | <5 min | Workflow summary |
| Test suite time | <3 min | Test report |
| First paint | <1.5s | Performance tests |
| Time to interactive | <2s | Performance tests |

## 🔐 Security

### Never Commit
```
❌ .env files
❌ Supabase keys
❌ Test user passwords
❌ API tokens
```

### Use Secrets
```
✅ GitHub Secrets for env vars
✅ Supabase RLS for data isolation
✅ Test accounts with limited permissions
```

## 📞 Getting Help

### Check These First
1. ✅ Workflow logs in GitHub Actions
2. ✅ Playwright HTML report (download artifact)
3. ✅ This quick reference
4. ✅ /docs/E2E_CI_SETUP.md (detailed guide)

### Still Stuck?
1. 🔍 Search GitHub issues
2. 📖 Check Playwright docs
3. 💬 Ask in team chat
4. 🐛 Create issue with:
   - Test file
   - Error message
   - Trace file
   - Workflow run link

## 🎯 Best Practices

### DO
- ✅ Use data-testid attributes
- ✅ Wait for specific conditions
- ✅ Clean up test data
- ✅ Write descriptive test names
- ✅ Group related tests
- ✅ Add retry for flaky tests

### DON'T
- ❌ Use fixed timeouts
- ❌ Rely on element order
- ❌ Share state between tests
- ❌ Use production data
- ❌ Commit test.only()
- ❌ Ignore flaky tests

## 📚 Resources

- [Playwright Docs](https://playwright.dev)
- [CI Guide](https://playwright.dev/docs/ci)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

**Last Updated**: 2025-11-29
**Questions?** See `/docs/E2E_CI_SETUP.md`
