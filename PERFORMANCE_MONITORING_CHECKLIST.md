# Performance Monitoring Deployment Checklist

Use this checklist to ensure the performance monitoring system is properly deployed and functioning.

## Pre-Deployment

### Database Migration

- [ ] Migration file exists: `supabase/migrations/20250129_add_performance_monitoring.sql`
- [ ] Migration has been reviewed for SQL syntax errors
- [ ] Migration includes all required functions:
  - [ ] `log_query_performance()`
  - [ ] `get_performance_stats()`
  - [ ] `get_slow_query_details()`
  - [ ] `cleanup_old_performance_logs()`
- [ ] Migration includes `performance_logs` table
- [ ] Migration includes appropriate indexes
- [ ] Migration includes RLS policies

### Service Layer

- [ ] Service file exists: `src/services/performanceService.ts`
- [ ] Service exports all required functions
- [ ] TypeScript types are properly defined
- [ ] Service has JSDoc comments
- [ ] No TypeScript errors: `npx tsc --noEmit`

### Admin Dashboard

- [ ] Hook exists: `admin/src/hooks/usePerformance.ts`
- [ ] Component exists: `admin/src/components/PerformanceMonitor.tsx`
- [ ] Page exists: `admin/src/pages/PerformancePage.tsx`
- [ ] No TypeScript errors in admin: `cd admin && npx tsc --noEmit`

### Documentation

- [ ] Full documentation: `docs/PERFORMANCE_MONITORING.md`
- [ ] Quick start guide: `docs/PERFORMANCE_MONITORING_QUICKSTART.md`
- [ ] Usage examples: `docs/examples/performance-monitoring-usage.ts`
- [ ] Summary document: `PERFORMANCE_MONITORING_SUMMARY.md`

## Deployment Steps

### 1. Apply Database Migration

- [ ] **Local/Staging:**
  ```bash
  npx supabase db push
  ```

- [ ] **Production (Supabase Dashboard):**
  1. Copy SQL from migration file
  2. Paste into SQL Editor
  3. Execute SQL
  4. Verify no errors in output

- [ ] **Verify tables created:**
  ```sql
  SELECT table_name
  FROM information_schema.tables
  WHERE table_name = 'performance_logs';
  -- Should return 1 row
  ```

- [ ] **Verify functions created:**
  ```sql
  SELECT routine_name
  FROM information_schema.routines
  WHERE routine_name LIKE '%performance%'
  ORDER BY routine_name;
  -- Should return 4 functions
  ```

- [ ] **Verify test data inserted:**
  ```sql
  SELECT COUNT(*) FROM performance_logs;
  -- Should return 1 (test entry)
  ```

### 2. Verify RLS Policies

- [ ] **Check RLS enabled:**
  ```sql
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE tablename = 'performance_logs';
  -- rowsecurity should be 't' (true)
  ```

- [ ] **Test admin access:**
  ```sql
  -- As admin user
  SELECT * FROM performance_logs LIMIT 1;
  -- Should return data
  ```

- [ ] **Test non-admin blocked:**
  ```sql
  -- As non-admin user
  SELECT * FROM performance_logs LIMIT 1;
  -- Should return 0 rows or permission error
  ```

### 3. Deploy Application Code

- [ ] **Build application:**
  ```bash
  npm run build
  ```

- [ ] **Build admin:**
  ```bash
  cd admin && npm run build
  ```

- [ ] **Deploy to Vercel/hosting:**
  ```bash
  # Via Git push or manual deploy
  git add .
  git commit -m "feat: Add performance monitoring system"
  git push
  ```

- [ ] **Verify deployment successful**
- [ ] **No build errors**
- [ ] **No runtime errors in console**

## Post-Deployment Verification

### 4. Test Logging Functionality

- [ ] **Manual test:**
  ```typescript
  import { logQueryPerformance } from '@/services/performanceService';

  await logQueryPerformance({
    functionName: 'test_deployment',
    executionTimeMs: 150,
    rowsReturned: 1,
    parameters: { test: true }
  });
  ```

- [ ] **Verify log created:**
  ```sql
  SELECT * FROM performance_logs
  WHERE function_name = 'test_deployment'
  ORDER BY created_at DESC
  LIMIT 1;
  -- Should show the test log
  ```

- [ ] **Test automatic logging:**
  ```typescript
  import { withPerformanceLogging } from '@/services/performanceService';

  const testFn = withPerformanceLogging('test_auto', async () => {
    return 'test';
  });

  await testFn();
  ```

- [ ] **Verify automatic log created:**
  ```sql
  SELECT * FROM performance_logs
  WHERE function_name = 'test_auto'
  ORDER BY created_at DESC
  LIMIT 1;
  ```

### 5. Test Admin Dashboard

- [ ] **Access admin dashboard:** Navigate to `/admin/performance`
- [ ] **Dashboard loads without errors**
- [ ] **Summary cards display:**
  - [ ] Total Queries
  - [ ] Slow Queries
  - [ ] Avg p95 Latency
  - [ ] Functions Tracked
- [ ] **Performance stats table shows data**
- [ ] **Time range selector works (1h/24h/7d)**
- [ ] **No console errors**
- [ ] **Data refreshes automatically (check after 60s)**

### 6. Test Performance Stats Function

- [ ] **Via SQL:**
  ```sql
  SELECT * FROM get_performance_stats(
    NOW() - INTERVAL '24 hours',
    NOW()
  );
  -- Should return stats for last 24 hours
  ```

- [ ] **Via TypeScript:**
  ```typescript
  import { getPerformanceStats } from '@/services/performanceService';

  const stats = await getPerformanceStats({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

  console.log(stats);
  // Should show array of performance stats
  ```

- [ ] **Verify correct columns:**
  - [ ] function_name
  - [ ] call_count
  - [ ] avg_time_ms
  - [ ] p50_time_ms
  - [ ] p95_time_ms
  - [ ] p99_time_ms
  - [ ] max_time_ms
  - [ ] total_rows
  - [ ] slow_queries

### 7. Test Slow Query Detection

- [ ] **Create a slow query log:**
  ```sql
  SELECT log_query_performance(
    'test_slow_query',
    500,  -- 500ms (over threshold)
    100,
    '{"test": "slow"}'::jsonb
  );
  ```

- [ ] **Verify appears in slow queries:**
  ```sql
  SELECT * FROM get_slow_query_details(200, 10);
  -- Should include test_slow_query
  ```

- [ ] **Check dashboard shows slow query alert**

### 8. Integration Testing

- [ ] **Wrap an existing function:**
  ```typescript
  // Example: In prayerService.ts
  import { withPerformanceLogging } from './performanceService';

  export const getPrayers = withPerformanceLogging(
    'get_prayers_test',
    async () => {
      const { data } = await supabase.from('prayers').select('*').limit(10);
      return data;
    }
  );
  ```

- [ ] **Call the wrapped function:**
  ```typescript
  const prayers = await getPrayers();
  ```

- [ ] **Verify log created:**
  ```sql
  SELECT * FROM performance_logs
  WHERE function_name = 'get_prayers_test'
  ORDER BY created_at DESC
  LIMIT 1;
  -- Should show execution time and row count
  ```

- [ ] **Stats appear in dashboard**

## Monitoring Setup

### 9. Configure Alerts (Optional)

- [ ] **Set up weekly performance check:**
  ```typescript
  // Run via cron every Monday
  import { getPerformanceSummary } from '@/services/performanceService';

  async function weeklyCheck() {
    const summary = await getPerformanceSummary();
    if (summary.slowQueryPercentage > 10) {
      // Send alert
    }
  }
  ```

- [ ] **Configure email/Slack notifications**
- [ ] **Test alert triggers**

### 10. Set Up Cleanup Job

- [ ] **Schedule cleanup (weekly recommended):**
  ```typescript
  import { cleanupOldPerformanceLogs } from '@/services/performanceService';

  // Run every Sunday at 2 AM
  const deletedCount = await cleanupOldPerformanceLogs();
  console.log(`Cleaned up ${deletedCount} old logs`);
  ```

- [ ] **Verify cleanup works:**
  ```sql
  -- Insert old test log
  INSERT INTO performance_logs (function_name, execution_time_ms, created_at)
  VALUES ('test_old', 100, NOW() - INTERVAL '31 days');

  -- Run cleanup
  SELECT cleanup_old_performance_logs();

  -- Verify deleted
  SELECT COUNT(*) FROM performance_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  -- Should return 0
  ```

## Production Verification

### 11. Monitor Real Traffic

- [ ] **Wait 1 hour for data collection**
- [ ] **Check dashboard for real metrics**
- [ ] **Verify queries are being logged:**
  ```sql
  SELECT
    function_name,
    COUNT(*) as count,
    AVG(execution_time_ms) as avg_ms
  FROM performance_logs
  WHERE created_at > NOW() - INTERVAL '1 hour'
  GROUP BY function_name
  ORDER BY count DESC;
  ```

- [ ] **Identify any slow queries (>200ms)**
- [ ] **Document baseline performance**

### 12. Performance Impact Check

- [ ] **Database CPU usage:** Check Supabase dashboard
- [ ] **Database memory usage:** Should be minimal (<1% increase)
- [ ] **Query overhead:** Logging adds <5ms per query
- [ ] **Storage growth:** ~1KB per 10 queries
- [ ] **No user-facing performance degradation**

### 13. Security Verification

- [ ] **Confirm only admins can access:**
  - [ ] Performance dashboard
  - [ ] Performance stats API
  - [ ] Slow query details
- [ ] **Verify no sensitive data in logs:**
  - [ ] No passwords
  - [ ] No auth tokens
  - [ ] No PII (unless intentional)
- [ ] **Check RLS policies active:**
  ```sql
  SELECT * FROM pg_policies
  WHERE tablename = 'performance_logs';
  -- Should show RLS policies
  ```

## Documentation Verification

### 14. Update Project Documentation

- [ ] **Add performance monitoring to README.md**
- [ ] **Update admin dashboard documentation**
- [ ] **Add to architecture diagrams**
- [ ] **Update API documentation**
- [ ] **Add to onboarding guide**

### 15. Team Communication

- [ ] **Notify team of new system**
- [ ] **Share quick start guide**
- [ ] **Demo admin dashboard in team meeting**
- [ ] **Document optimization workflow**
- [ ] **Add to sprint retrospective**

## Rollback Plan

### If Issues Occur

- [ ] **Disable logging in code:**
  ```typescript
  // Comment out logging calls temporarily
  // await logQueryPerformance(...);
  ```

- [ ] **Drop table (if necessary):**
  ```sql
  DROP TABLE IF EXISTS performance_logs CASCADE;
  ```

- [ ] **Remove functions:**
  ```sql
  DROP FUNCTION IF EXISTS log_query_performance;
  DROP FUNCTION IF EXISTS get_performance_stats;
  DROP FUNCTION IF EXISTS get_slow_query_details;
  DROP FUNCTION IF EXISTS cleanup_old_performance_logs;
  ```

- [ ] **Revert code changes:**
  ```bash
  git revert <commit-hash>
  ```

## Success Criteria

- ✅ Migration applied without errors
- ✅ All functions created and accessible
- ✅ RLS policies working correctly
- ✅ Admin dashboard functional
- ✅ Logging working for test queries
- ✅ Stats aggregation accurate
- ✅ Slow query detection operational
- ✅ No performance degradation
- ✅ No security issues
- ✅ Documentation complete

## Next Steps After Deployment

1. **Week 1:** Monitor baseline performance
2. **Week 2:** Identify and optimize slow queries
3. **Week 3:** Expand coverage to more functions
4. **Week 4:** Review impact and adjust thresholds

---

**Deployment Date:** __________________
**Deployed By:** __________________
**Environment:** [ ] Staging  [ ] Production
**Status:** [ ] Success  [ ] Issues (describe below)

**Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
