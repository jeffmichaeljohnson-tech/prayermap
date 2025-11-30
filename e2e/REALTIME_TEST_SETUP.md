# Real-time E2E Test Setup Guide

## Overview

The real-time E2E tests in `/home/user/prayermap/e2e/realtime.spec.ts` verify that PrayerMap's real-time functionality works correctly across multiple browser tabs and users.

## Test Coverage

### Prayer Creation (Real-time)
- ✅ New prayers appear across browser tabs without refresh
- ✅ Multiple contexts can create and see prayers simultaneously
- ✅ Optimistic updates work correctly

### Memorial Lines & Connections
- ✅ Memorial lines appear when support is given to prayers
- ✅ Connection lines persist after animation completes (6-8 seconds)
- ✅ Multiple connections create visual network on map
- ✅ Animation effects run smoothly at 60fps

### Real-time Responses
- ✅ Prayer responses appear in real-time to prayer owner
- ✅ Response counts update without page refresh
- ✅ Notifications work correctly for new responses

### Performance & Reliability
- ✅ Real-time updates maintain 60fps performance
- ✅ Handles rapid prayer creation without issues
- ✅ Recovers from connection interruptions

## Prerequisites

### 1. Environment Variables

The tests require a properly configured `.env.local` file with valid credentials. Copy from `.env.example`:

```bash
cp .env.example .env.local
```

Then populate with your actual values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Mapbox Configuration
VITE_MAPBOX_TOKEN=your-mapbox-token-here

# Optional: Memory system (not required for basic tests)
OPENAI_API_KEY=your-openai-api-key-here
PINECONE_API_KEY=your-pinecone-api-key-here
```

### 2. Supabase Database Setup

Your Supabase project must have:
- ✅ PrayerMap schema applied (from `supabase/migrations/`)
- ✅ Row Level Security (RLS) policies enabled
- ✅ Real-time enabled for `prayers` table
- ✅ Real-time enabled for `prayer_connections` table
- ✅ Real-time enabled for `prayer_responses` table

To enable real-time in Supabase:
1. Go to Database > Replication in your Supabase dashboard
2. Enable real-time for tables: `prayers`, `prayer_connections`, `prayer_responses`

### 3. Test User Account

Create a test user account in your Supabase project:

```sql
-- Run in Supabase SQL Editor
-- Note: User will still need to verify email or use auth.users directly
INSERT INTO auth.users (email, encrypted_password)
VALUES ('test@prayermap.com', crypt('TestPassword123!', gen_salt('bf')));
```

Or sign up manually through the app and use those credentials.

### 4. Data Test IDs

Ensure the following components have `data-testid` attributes (see `/home/user/prayermap/e2e/DATA_TESTID_REQUIREMENTS.md`):

**Critical for real-time tests:**
- `prayer-map` - Main map container
- `prayer-marker` - Individual prayer markers
- `prayer-connection` - Memorial line connections
- `request-prayer-button` - Button to open prayer modal
- `prayer-content` - Prayer content textarea
- `submit-prayer` - Submit button
- `prayer-detail-modal` - Prayer detail view
- `prayer-animation` - Animation effects
- `unread-badge` - Notification badge

## Running the Tests

### Full Test Suite

```bash
# Run all real-time tests
npx playwright test e2e/realtime.spec.ts

# Run with specific browser
npx playwright test e2e/realtime.spec.ts --project=chromium

# Run with UI (for debugging)
npx playwright test e2e/realtime.spec.ts --ui
```

### Individual Test Groups

```bash
# Prayer creation tests only
npx playwright test e2e/realtime.spec.ts -g "Prayer Creation"

# Memorial lines tests only
npx playwright test e2e/realtime.spec.ts -g "Memorial Lines"

# Performance tests only
npx playwright test e2e/realtime.spec.ts -g "Performance"
```

### Debug Mode

```bash
# Run in debug mode with inspector
npx playwright test e2e/realtime.spec.ts --debug

# Run single test in debug mode
npx playwright test e2e/realtime.spec.ts:12 --debug
```

## Test Architecture

### Multi-Context Testing

The real-time tests use multiple browser contexts to simulate different users:

```typescript
// Example: Testing real-time updates across tabs
const context1 = await browser.newContext();
const context2 = await browser.newContext();

const page1 = await context1.newPage();  // User 1
const page2 = await context2.newPage();  // User 2

// User 1 creates prayer
// User 2 should see it in real-time
```

### Timing Considerations

Real-time updates typically propagate within:
- **Local development**: 100-500ms
- **Hosted Supabase**: 500ms-2s
- **Network delays**: Up to 5s

Tests wait up to 10 seconds for real-time updates to allow for network latency.

### Authentication

Tests use the `authenticateTestUser()` helper function which:
1. Navigates to the app
2. Checks if already authenticated
3. Logs in with test credentials if needed
4. Waits for auth to complete

## Troubleshooting

### Pages Crash on Load

**Symptom**: `Error: page.goto: Page crashed`

**Causes**:
- Missing environment variables
- Invalid Supabase credentials
- Missing MapBox token
- Network connection issues

**Solution**:
1. Verify `.env.local` exists and has valid values
2. Check Supabase project is active
3. Verify MapBox token is valid
4. Test Supabase connection: `curl https://your-project.supabase.co/rest/v1/`

### Real-time Updates Don't Appear

**Symptom**: Markers don't update, tests timeout

**Causes**:
- Real-time not enabled in Supabase
- Database RLS policies blocking updates
- Supabase subscription limits reached

**Solution**:
1. Enable real-time in Supabase dashboard (Database > Replication)
2. Check RLS policies allow reads for authenticated users
3. Verify Supabase project is not rate-limited

### Authentication Failures

**Symptom**: Can't log in during tests

**Causes**:
- Test user doesn't exist
- Wrong credentials
- Email not verified

**Solution**:
1. Create test user in Supabase auth.users
2. Update credentials in `authenticateTestUser()` helper
3. Disable email verification for test environment

### Memorial Lines Don't Appear

**Symptom**: Connection lines not visible

**Causes**:
- Missing `data-testid="prayer-connection"`
- Animation duration too short
- SVG/Canvas rendering issues

**Solution**:
1. Add `data-testid` to connection components
2. Increase wait time (animation takes 6-8 seconds)
3. Check browser console for rendering errors

### Performance Issues

**Symptom**: Tests timeout, browser freezes

**Causes**:
- Too many open contexts
- Memory leaks
- Large number of map markers

**Solution**:
1. Close contexts in `finally` blocks
2. Reduce test parallelization (`--workers=1`)
3. Clear test data between runs

## Test Data Cleanup

After tests, you may want to clean up test data:

```sql
-- Delete test prayers (run in Supabase SQL Editor)
DELETE FROM prayers
WHERE content LIKE '%E2E test prayer%'
  OR content LIKE '%Real-time test%';

-- Delete test connections
DELETE FROM prayer_connections
WHERE created_at < NOW() - INTERVAL '1 hour';
```

## CI/CD Integration

For GitHub Actions or similar:

```yaml
- name: Run Real-time E2E Tests
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    VITE_MAPBOX_TOKEN: ${{ secrets.VITE_MAPBOX_TOKEN }}
  run: |
    npm run build
    npx playwright test e2e/realtime.spec.ts --project=chromium
```

## Expected Results

When all tests pass, you should see:

```
Running 10 tests using 8 workers

  ✓  [chromium] › realtime.spec.ts:12 › new prayer appears in real-time across browser tabs
  ✓  [chromium] › realtime.spec.ts:93 › new prayer appears without page refresh
  ✓  [chromium] › realtime.spec.ts:155 › memorial line appears when prayer is supported
  ✓  [chromium] › realtime.spec.ts:227 › connection line persists after animation
  ✓  [chromium] › realtime.spec.ts:242 › multiple connections create visual network
  ✓  [chromium] › realtime.spec.ts:268 › prayer response appears in real-time
  ✓  [chromium] › realtime.spec.ts:334 › response count updates in real-time
  ✓  [chromium] › realtime.spec.ts:362 › real-time updates maintain 60fps
  ✓  [chromium] › realtime.spec.ts:395 › handles rapid prayer creation
  ✓  [chromium] › realtime.spec.ts:440 › recovers from connection interruption

  10 passed (45s)
```

## Contributing

When adding new real-time features:

1. **Add data-testid attributes** to new components
2. **Update DATA_TESTID_REQUIREMENTS.md** with new test IDs
3. **Write E2E tests** in `realtime.spec.ts` for new functionality
4. **Test multi-context scenarios** to ensure real-time works
5. **Document timing expectations** if animations are involved

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Supabase Real-time Docs](https://supabase.com/docs/guides/realtime)
- [PrayerMap E2E Test Requirements](/home/user/prayermap/e2e/DATA_TESTID_REQUIREMENTS.md)
- [MapBox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)

## Support

If you encounter issues not covered in this guide:

1. Check browser console for JavaScript errors
2. Verify Supabase dashboard shows active connections
3. Test real-time manually in two browser windows
4. Review Playwright trace files in `test-results/`
5. Run with `--debug` flag to step through tests

---

**Last Updated**: 2025-11-29
**Test File**: `/home/user/prayermap/e2e/realtime.spec.ts`
**Maintained By**: E2E Test Agent
