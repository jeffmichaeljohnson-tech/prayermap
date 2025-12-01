# Cross-User Communication Test Suite

## 🎯 Mission
Validate complete user-to-user messaging reliability in PrayerMap through comprehensive multi-user test scenarios.

## 🔬 Agent 7 Deliverable
This test suite fulfills the critical mission of **CROSS-USER COMMUNICATION TESTER** ensuring:
- ✅ User A always sees when User B prays for their prayer
- ✅ Messages appear for all interaction types (text, audio, video)  
- ✅ Multiple responses to same prayer all create separate messages
- ✅ Anonymous and authenticated interactions both work
- ✅ No lost or duplicate messages in any test scenario
- ✅ Real-time delivery works across multiple devices/sessions

## 📁 Test Files Overview

### Core Test Suites
1. **`cross-user-communication.spec.ts`** - Main test scenarios
2. **`cross-user-integration.spec.ts`** - End-to-end integration tests
3. **`utils/cross-user-test-utils.ts`** - Specialized testing utilities
4. **`run-cross-user-tests.ts`** - Comprehensive test runner and reporting

### Test Coverage

#### Scenario Tests (`cross-user-communication.spec.ts`)
- **SCENARIO 1**: Single User Response Flow
- **SCENARIO 2**: Multiple Simultaneous Responses
- **SCENARIO 3**: Anonymous User Interactions  
- **SCENARIO 4**: Real-Time Message Delivery
- **SCENARIO 5**: Message Persistence Across Sessions
- **SCENARIO 6**: Rapid Response Stress Test

#### Edge Case Tests
- **EDGE CASE 1**: Network Interruption Recovery
- **EDGE CASE 2**: Concurrent User Sessions

#### Integration Tests (`cross-user-integration.spec.ts`)
- **INTEGRATION 1**: Complete Authenticated User Flow with Database Validation
- **INTEGRATION 2**: Multi-User Response Cascade with Real-Time Validation
- **INTEGRATION 3**: Anonymous User Interaction Flow
- **INTEGRATION 4**: Real-Time Performance and Reliability Test
- **INTEGRATION 5**: Error Recovery and Consistency Validation

#### System Health Check
- **SYSTEM HEALTH**: Complete End-to-End Validation

## 🚀 Running the Tests

### Prerequisites
```bash
# Ensure dependencies are installed
npm install

# Ensure Playwright browsers are installed
npx playwright install
```

### Quick Test Run (Essential Scenarios)
```bash
# Run essential cross-user communication tests
npx ts-node e2e/run-cross-user-tests.ts quick
```

### Full Test Suite
```bash
# Run complete cross-user communication test suite
npx ts-node e2e/run-cross-user-tests.ts full
```

### Individual Test Suites
```bash
# Run main scenario tests
npx playwright test e2e/cross-user-communication.spec.ts

# Run integration tests
npx playwright test e2e/cross-user-integration.spec.ts

# Run specific scenario
npx playwright test e2e/cross-user-communication.spec.ts --grep "SCENARIO 1"
```

### Debug Mode
```bash
# Run with UI for debugging
npx playwright test e2e/cross-user-communication.spec.ts --ui

# Run with debug mode
npx playwright test e2e/cross-user-communication.spec.ts --debug

# Run headed (show browser)
npx playwright test e2e/cross-user-communication.spec.ts --headed
```

## 🔧 Test Configuration

### Environment Variables
Create `.env.test` file with:
```env
VITE_SUPABASE_URL=your_test_supabase_url
VITE_SUPABASE_ANON_KEY=your_test_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Test Users
The test suite uses predefined test users:
- **Prayer Requester**: `prayer_requester@test.com`
- **Responder 1**: `prayer_responder1@test.com`
- **Responder 2**: `prayer_responder2@test.com`
- **Responder 3**: `prayer_responder3@test.com`
- **Moderator**: `prayer_moderator@test.com`

### Geographic Distribution
Tests simulate users from different locations:
- Detroit, MI (Requester)
- Chicago, IL (Responder 1)
- New York, NY (Responder 2)
- Los Angeles, CA (Anonymous User)

## 📊 Test Reports

### Generated Reports
After running tests, reports are generated in `test-results/cross-user-communication/`:

1. **HTML Report**: `cross-user-communication-report.html`
   - Visual dashboard with metrics and charts
   - Interactive test results with details
   - Performance metrics and charts

2. **JSON Report**: `cross-user-communication-results.json`  
   - Machine-readable test results
   - Detailed metrics and error information
   - Integration with CI/CD systems

3. **CSV Summary**: `cross-user-communication-summary.csv`
   - Spreadsheet-compatible format
   - Test metrics and performance data
   - Easy data analysis and trending

4. **Markdown Summary**: `cross-user-communication-summary.md`
   - Human-readable summary
   - GitHub/documentation integration
   - Quick overview of results

### Sample Report Output
```
🎯 CROSS-USER COMMUNICATION TEST RESULTS
============================================================
📊 Summary: 8/8 tests passed (100.0%)
⏱️  Duration: 245 seconds
📈 Avg Test Time: 30625ms

🧪 SCENARIO RESULTS:
   ✅ SCENARIO 1: Single User Response Flow (28456ms)
   ✅ SCENARIO 2: Multiple Simultaneous Responses (45123ms)
   ✅ SCENARIO 3: Anonymous User Interactions (22789ms)
   ✅ SCENARIO 4: Real-Time Message Delivery (18934ms)
   ✅ SCENARIO 5: Message Persistence Across Sessions (35678ms)
   ✅ SCENARIO 6: Rapid Response Stress Test (52145ms)
   ✅ EDGE CASE 1: Network Interruption Recovery (28367ms)
   ✅ EDGE CASE 2: Concurrent User Sessions (33891ms)

🏆 OVERALL ASSESSMENT: EXCELLENT
============================================================
```

## 🧪 Test Utilities

### Database Verifier (`DatabaseVerifier`)
Validates database consistency:
```typescript
const dbVerifier = new DatabaseVerifier();

// Verify prayer exists in database
const prayerCheck = await dbVerifier.verifyPrayerExists(prayerId);

// Verify response was saved
const responseCheck = await dbVerifier.verifyPrayerResponseExists(prayerId);

// Verify user inbox messages
const inboxCheck = await dbVerifier.verifyUserInboxMessages(userId);
```

### Enhanced Authentication
```typescript
// Authenticate test user
const authResult = await authenticateTestUser(page, 'requester');

// Create user context with location
const context = await createUserContext(browser, 'responder1');
```

### Prayer/Response Creation with Verification
```typescript
// Create prayer with database verification
const prayer = await createTestPrayerWithVerification(page, {
  content: 'Test prayer content',
  contentType: 'text',
  isAnonymous: false
}, dbVerifier);

// Create response with database verification
const response = await createTestResponseWithVerification(
  page, 
  prayerText, 
  {
    message: 'Test response message',
    contentType: 'text'
  }, 
  dbVerifier
);
```

### Inbox Verification with Database Cross-Check
```typescript
// Comprehensive inbox verification
const verification = await verifyInboxWithDatabaseCheck(
  page,
  userId,
  {
    minMessages: 2,
    containsText: ['prayer', 'response'],
    fromUsers: ['responder1-id']
  },
  dbVerifier
);
```

## 🔍 Debugging Failed Tests

### Common Issues and Solutions

#### 1. Authentication Failures
```bash
# Check test user credentials
# Verify Supabase connection
# Ensure auth endpoints are working
```

#### 2. Prayer Creation Issues
```bash
# Verify prayer creation UI elements
# Check database permissions
# Validate form submission flow
```

#### 3. Response Delivery Failures
```bash
# Check real-time subscription status
# Verify database triggers
# Validate notification system
```

#### 4. Database Inconsistencies
```bash
# Check RLS policies
# Verify database permissions
# Validate data sync processes
```

### Debug Helpers
```typescript
// Enable verbose logging
process.env.DEBUG = 'prayermap:*';

// Capture screenshots on failure
await page.screenshot({ path: 'debug-failure.png', fullPage: true });

// Log network requests
page.on('response', response => {
  console.log('API Response:', response.url(), response.status());
});
```

## 📈 Performance Benchmarks

### Target Metrics
- **Prayer Creation**: < 3 seconds
- **Response Submission**: < 2 seconds  
- **Notification Delivery**: < 5 seconds
- **Real-Time Updates**: < 3 seconds
- **Database Consistency**: 100%

### Performance Monitoring
```typescript
// Measure response time
const startTime = Date.now();
await createTestResponse();
const responseTime = Date.now() - startTime;

// Monitor real-time delivery
const deliveryTime = await measureNotificationLatency();
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Cross-User Communication Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npx ts-node e2e/run-cross-user-tests.ts full
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      - uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: test-results/cross-user-communication/
```

## 🎯 Success Criteria Validation

Each test validates specific success criteria:

### ✅ User A Always Sees When User B Prays
- **Validated in**: All scenarios, integration tests
- **Method**: Database + UI cross-verification
- **Assertion**: `expect(inboxVerification.uiSuccess && inboxVerification.dbSuccess).toBe(true)`

### ✅ Messages Appear for All Interaction Types
- **Validated in**: Scenarios 1, 2, 3, 6
- **Method**: Text, audio, video content validation
- **Assertion**: Response creation with content type verification

### ✅ Multiple Responses Create Separate Messages
- **Validated in**: Scenarios 2, 6, Integration 2
- **Method**: Message count validation
- **Assertion**: `expect(messageCount).toBeGreaterThanOrEqual(expectedCount)`

### ✅ Anonymous and Authenticated Interactions Work
- **Validated in**: Scenario 3, Integration 3
- **Method**: Anonymous user flow testing
- **Assertion**: Both user types receive notifications

### ✅ No Lost or Duplicate Messages
- **Validated in**: All tests with database verification
- **Method**: UI/Database consistency checking
- **Assertion**: `expect(inboxVerification.discrepancy).toBe(false)`

### ✅ Real-Time Delivery Across Devices
- **Validated in**: Scenarios 4, 5, Integration 4, Edge Case 2
- **Method**: Multi-session testing and timing
- **Assertion**: `expect(deliveryTime).toBeLessThan(5000)` and cross-session verification

## 🚨 Critical Failure Handling

### Test Failure Categories
1. **CRITICAL**: Prayer creation or core messaging fails
2. **HIGH**: Database inconsistency detected
3. **MEDIUM**: Performance targets not met
4. **LOW**: Edge case failures

### Automated Alerts
The test runner automatically identifies critical failures:
```typescript
const criticalFailures = [
  'Prayer creation failed',
  'Complete notification failure', 
  'Database inconsistency detected'
];
```

## 📝 Contributing to Tests

### Adding New Test Scenarios
1. Create test case in `cross-user-communication.spec.ts`
2. Use test utilities from `cross-user-test-utils.ts`
3. Include database verification
4. Add to test runner configuration
5. Update documentation

### Test Development Guidelines
- Always include database verification
- Use meaningful test data
- Validate both UI and backend
- Include performance assertions
- Add debug logging for failures

---

**Created by**: Agent 7 - Cross-User Communication Tester
**Mission Status**: ✅ COMPLETE - Comprehensive cross-user messaging validation delivered
**Last Updated**: 2024-11-29