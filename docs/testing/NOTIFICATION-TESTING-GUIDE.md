# PrayerMap Notification System Testing Guide

## 🎯 Purpose

This guide provides comprehensive instructions for testing the PrayerMap prayer interaction and notification system. The testing framework is designed to systematically identify where notification failures occur and provide actionable debugging information.

## 🚨 Problem Statement

**ISSUE**: Users are not receiving inbox messages when others interact with their prayers.

**SYMPTOMS**: 
- Prayer responses are being sent but notifications don't appear in sender's inbox
- Real-time notification delivery is inconsistent
- Cross-device notification synchronization may be broken

## 🧪 Test Suite Overview

### Primary Test Categories

1. **Basic Prayer Interaction Flow** - Single user posts prayer, another responds, first user should get notification
2. **Multi-User Notification Testing** - Multiple users responding to same prayer
3. **Real-Time Delivery Validation** - Notifications appear immediately without page refresh
4. **Cross-Device Synchronization** - Same user on multiple devices receives notifications
5. **Notification Persistence** - Notifications survive page refreshes
6. **System Diagnostics** - Infrastructure and database connectivity validation

### Test Files

- **`e2e/notification-system.spec.ts`** - Main comprehensive test suite
- **`e2e/utils/notification-test-utils.ts`** - Reusable testing utilities  
- **`e2e/run-notification-tests.ts`** - Test runner with detailed reporting

## 🚀 Running Tests

### Quick Start Commands

```bash
# Run the comprehensive notification test suite
npm run test:notifications

# Run a single basic test (fastest)
npm run test:notifications:quick

# Run multi-user notification tests
npm run test:notifications:multi  

# Run real-time delivery tests
npm run test:notifications:realtime

# Debug mode (step through tests visually)
npm run test:notifications:debug
```

### Individual Test Execution

```bash
# Run specific test case
npx playwright test e2e/notification-system.spec.ts --grep "Basic Single User"

# Run with browser UI visible
npx playwright test e2e/notification-system.spec.ts --headed

# Run with debugging
npx playwright test e2e/notification-system.spec.ts --debug

# Run on specific browser
npx playwright test e2e/notification-system.spec.ts --project=chromium
```

### Prerequisites

1. **Development Server Running**
   ```bash
   npm run dev
   # Server should be running on http://localhost:5173
   ```

2. **Test User Accounts**
   Ensure these test accounts exist in your Supabase auth:
   - `testuser_a@prayermap.com` (password: `TestPassword123!`)
   - `testuser_b@prayermap.com` (password: `TestPassword123!`)  
   - `testuser_c@prayermap.com` (password: `TestPassword123!`)

3. **Database Access**
   Tests require a working Supabase connection with:
   - Prayer table accessible
   - Prayer responses table accessible
   - Notifications table accessible
   - Row Level Security (RLS) policies configured

## 📊 Test Report Analysis

### Automatic Report Generation

The test runner generates three types of reports:

1. **JSON Report** - Machine-readable results for CI/CD
2. **HTML Report** - Visual dashboard with charts and detailed analysis
3. **Markdown Summary** - Human-readable summary for documentation

Reports are saved to: `test-results/notification-system/`

### Understanding Test Results

#### Success Indicators
- ✅ All test cases pass with green status
- ✅ Notifications appear in expected timeframes
- ✅ Cross-device synchronization works
- ✅ Database connectivity confirmed

#### Failure Analysis Categories

**Authentication Failures**
- Symptoms: Login screens appear, credentials rejected
- Likely Causes: Test user accounts missing, wrong passwords, Supabase auth config
- Action: Verify test accounts in Supabase dashboard

**Database Connectivity Issues**
- Symptoms: Prayers don't save, empty map, API errors
- Likely Causes: Supabase project down, network issues, RLS policy problems
- Action: Check Supabase project status, verify connection string

**UI Element Detection Failures**
- Symptoms: "Element not found", selector timeouts
- Likely Causes: Frontend component changes, outdated test selectors
- Action: Update test selectors to match current UI implementation

**Notification System Failures**
- Symptoms: Responses sent but no inbox notifications
- Likely Causes: Database triggers broken, real-time subscriptions failed, notification rendering issues
- Action: Check database functions and Supabase real-time configuration

**Timing/Performance Issues**
- Symptoms: Timeout errors, slow responses
- Likely Causes: Network latency, slow database queries, overloaded system
- Action: Increase timeouts, optimize queries, check server resources

## 🔍 Detailed Test Scenarios

### TEST CASE 1: Basic Single User Prayer Support Flow

**Purpose**: Validate the fundamental notification flow works end-to-end

**Steps**:
1. User A authenticates and posts a prayer request
2. User B authenticates and discovers the prayer on the map
3. User B clicks the prayer marker to open detail modal
4. User B clicks "Pray First. Then Press." or equivalent respond button
5. User B fills in response text and submits
6. System should create notification for User A
7. User A's inbox should show the new notification

**Expected Results**:
- Prayer successfully created and visible on map
- Response successfully sent and saved to database
- Notification appears in User A's inbox within 5 seconds
- Notification count badge updates correctly

**Failure Debugging**:
- Check browser console for JavaScript errors
- Verify prayer_responses table has new entry
- Check notifications table for corresponding entry
- Verify real-time subscription is active

### TEST CASE 2: Multiple Prayer Supporters

**Purpose**: Ensure multiple responses to same prayer generate separate notifications

**Steps**:
1. User A posts prayer
2. User B responds with first message
3. User C responds with second message  
4. User A should receive 2 separate notifications

**Expected Results**:
- Both responses saved to database
- Two notification entries created
- Inbox shows count of 2
- Both messages visible in inbox list

### TEST CASE 3: Real-Time Notification Delivery

**Purpose**: Verify notifications appear without page refresh

**Steps**:
1. User A posts prayer and opens inbox immediately
2. User B responds while User A is watching inbox
3. Notification should appear in User A's inbox within 10 seconds without refresh

**Expected Results**:
- Real-time subscription working
- UI updates automatically
- No manual refresh required

### TEST CASE 4: Cross-Device Notification Sync

**Purpose**: Ensure same user gets notifications on multiple devices

**Steps**:
1. User A logs in on two different browser sessions (simulating devices)
2. User B responds to User A's prayer
3. Both User A devices should show the notification

**Expected Results**:
- Notification appears on both devices
- Badge counts match across devices
- Message content identical

### TEST CASE 5: Notification Persistence After Page Refresh

**Purpose**: Verify notifications don't disappear after browser refresh

**Steps**:
1. Complete basic notification flow
2. Refresh User A's browser page  
3. Notifications should still be visible

**Expected Results**:
- Notifications persist after refresh
- Count remains accurate
- Message content unchanged

## 🛠️ Troubleshooting Common Issues

### Test Environment Setup

**Issue**: Tests fail with authentication errors
**Solution**:
1. Create test user accounts in Supabase dashboard
2. Verify email addresses and passwords match test fixtures
3. Check Supabase project is running and accessible

**Issue**: Elements not found errors
**Solution**:
1. Run development server (`npm run dev`)
2. Verify app loads correctly at http://localhost:5173
3. Update test selectors if UI has changed

**Issue**: Database connectivity errors
**Solution**:
1. Check Supabase project status
2. Verify environment variables are set correctly
3. Test database connection manually

### Test Execution Issues

**Issue**: Tests timeout
**Solution**:
1. Increase timeout values in test configuration
2. Check network connectivity
3. Verify development server is responsive

**Issue**: Flaky test results (sometimes pass, sometimes fail)
**Solution**:
1. Add more wait time between test steps
2. Use more specific element selectors
3. Check for race conditions in the application

## 📈 Performance Benchmarks

### Expected Response Times

- **Prayer Creation**: < 2 seconds
- **Response Submission**: < 3 seconds  
- **Notification Delivery**: < 5 seconds
- **Real-time Updates**: < 10 seconds
- **Cross-device Sync**: < 15 seconds

### Test Execution Times

- **Basic Single User Flow**: ~30 seconds
- **Multi-User Flow**: ~45 seconds
- **Real-Time Delivery**: ~60 seconds
- **Cross-Device Sync**: ~90 seconds
- **Full Suite**: ~5-8 minutes

## 🚨 Critical Failure Points to Monitor

Based on the notification system architecture, watch for failures in these areas:

1. **Database Triggers** - Prayer response insertion should trigger notification creation
2. **Real-time Subscriptions** - Supabase real-time should push notifications to connected clients  
3. **RLS Policies** - Row Level Security must allow users to read their own notifications
4. **Frontend State Management** - React Query cache should update with new notifications
5. **UI Rendering** - Inbox component should display notifications correctly

## 🎯 Next Steps After Test Execution

### If Tests Pass ✅
- Notification system is working correctly
- Issue may be environment-specific (production vs development)
- Check production database configuration
- Verify production Supabase settings match development

### If Tests Fail ❌
1. **Review Test Report** - Check failure analysis section for specific issues
2. **Check Screenshots** - Failed tests automatically capture screenshots  
3. **Examine Logs** - Review browser console and network logs
4. **Database Inspection** - Manually verify database entries
5. **Fix and Re-test** - Address issues and run tests again

### Common Next Actions
- Update database triggers if notification creation failing
- Fix real-time subscription configuration if notifications not appearing immediately  
- Update frontend notification display logic if inbox not showing messages
- Optimize query performance if tests are timing out

---

## 📞 Support

If tests continue to fail after following this guide:

1. Review the generated HTML test report for detailed failure analysis
2. Check the `test-results/notification-system/` directory for screenshots and logs
3. Examine the browser developer console for JavaScript errors
4. Verify Supabase project configuration and database schema
5. Consider running tests in debug mode to step through failures manually

**Remember**: The goal is not just to pass tests, but to ensure real users can successfully receive prayer notifications in production. Use these tests as a diagnostic tool to identify and fix the underlying notification system issues.