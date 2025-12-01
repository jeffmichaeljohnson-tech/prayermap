# Datadog Services to Add Before Refactoring

> **Critical**: Set up these Datadog services BEFORE starting refactoring work to establish baselines and catch regressions.

---

## 🎯 Why This Matters

**Before Refactoring**: Establish baseline metrics  
**During Refactoring**: Monitor for regressions in real-time  
**After Refactoring**: Verify improvements and catch issues early

---

## ✅ Currently Configured

1. **✅ RUM (Real User Monitoring)** - Frontend React tracking
   - Component performance
   - User interactions
   - Frontend errors
   - Session replay (20%)

2. **✅ Basic Supabase Tracing** - Via RUM
   - Query performance tracking
   - Real-time subscription monitoring
   - Error correlation

---

## 🚨 Critical Services to Add (Priority Order)

### 1. **APM (Application Performance Monitoring)** ⚠️ HIGH PRIORITY

**Why Critical for Refactoring**:
- Track backend performance before/after changes
- Monitor Supabase Edge Functions
- Database query performance
- API endpoint latency
- Distributed tracing (frontend → backend → database)

**What It Tracks**:
- Supabase RPC function performance
- PostgreSQL query execution time
- Edge Function invocations
- API response times
- Error rates by endpoint

**Setup Complexity**: Medium (requires backend instrumentation)

**Cost**: Included in Datadog Pro plan

**Before Refactoring Value**: ⭐⭐⭐⭐⭐
- Establish baseline query performance
- Identify slow queries to optimize
- Track RLS policy impact

---

### 2. **Log Management** ⚠️ HIGH PRIORITY

**Why Critical for Refactoring**:
- Capture structured logs during refactoring
- Debug issues with full context
- Track refactoring progress
- Correlate logs with traces

**What It Tracks**:
- Structured application logs
- Error logs with stack traces
- Performance logs
- Custom refactoring markers

**Setup Complexity**: Low (just configure logging)

**Cost**: Included in Datadog Pro plan

**Before Refactoring Value**: ⭐⭐⭐⭐⭐
- Log all refactoring changes
- Track "before" state
- Debug issues during refactoring

---

### 3. **Database Monitoring (PostgreSQL)** ⚠️ MEDIUM PRIORITY

**Why Important for Refactoring**:
- Monitor query performance changes
- Track slow queries introduced by refactoring
- Monitor connection pool health
- Track RLS policy performance impact

**What It Tracks**:
- Query execution time
- Slow query detection
- Connection pool metrics
- Database health metrics
- Index usage

**Setup Complexity**: Medium (requires Datadog Agent)

**Cost**: Included in Datadog Pro plan

**Before Refactoring Value**: ⭐⭐⭐⭐
- Baseline query performance
- Identify queries to optimize
- Catch performance regressions

**Note**: Already documented in `docs/DATADOG_POSTGRESQL_SETUP.md` but may need activation

---

### 4. **Synthetic Monitoring** ⚠️ MEDIUM PRIORITY

**Why Important for Refactoring**:
- Automated tests to catch regressions
- Monitor critical user flows
- Alert on broken functionality
- Track performance over time

**What It Tracks**:
- Critical user flows (prayer creation, response, etc.)
- API endpoint availability
- Performance regression detection
- Error rate monitoring

**Setup Complexity**: Low (create test scenarios)

**Cost**: Included in Datadog Pro plan

**Before Refactoring Value**: ⭐⭐⭐⭐
- Create baseline tests
- Catch regressions automatically
- Verify refactoring didn't break flows

---

### 5. **Error Tracking (Enhanced)** ⚠️ LOW PRIORITY

**Why Useful for Refactoring**:
- Already partially configured via RUM
- Enhanced error grouping
- Error trends over time
- Error correlation with traces

**What It Tracks**:
- Error frequency and trends
- Error grouping and deduplication
- Error context (user, component, query)
- Error correlation with traces

**Setup Complexity**: Low (already configured)

**Cost**: Included in RUM

**Before Refactoring Value**: ⭐⭐⭐
- Track error rate changes
- Identify new errors from refactoring
- Correlate errors with code changes

---

## 📋 Recommended Setup Order

### Phase 1: Before Refactoring Starts (Do This First)

1. **✅ Log Management** (30 minutes)
   - Configure structured logging to Datadog
   - Set up log aggregation
   - Create log-based dashboards

2. **✅ APM** (1-2 hours)
   - Set up backend tracing
   - Instrument Supabase Edge Functions
   - Configure distributed tracing

3. **✅ Database Monitoring** (1 hour)
   - Activate PostgreSQL monitoring (if not already active)
   - Set up query performance tracking
   - Create database health dashboard

### Phase 2: During Refactoring (Optional but Recommended)

4. **✅ Synthetic Monitoring** (1 hour)
   - Create critical flow tests
   - Set up regression alerts
   - Monitor test results

---

## 🚀 Quick Setup Guides

### 1. Log Management Setup

**Add to your code**:
```typescript
// src/lib/datadog.ts
import { datadogLogs } from '@datadog/browser-logs';

// Initialize logs
datadogLogs.init({
  clientToken: import.meta.env.VITE_DATADOG_CLIENT_TOKEN,
  site: 'datadoghq.com',
  service: 'prayermap',
  env: import.meta.env.NODE_ENV || 'development',
  forwardErrorsToLogs: true,
  sampleRate: 100, // 100% for debugging
});

// Usage
datadogLogs.logger.info('Refactoring started', {
  component: 'PrayerMap',
  refactoring_type: 'component_extraction'
});
```

**Install package**:
```bash
npm install @datadog/browser-logs
```

---

### 2. APM Setup (Backend)

**For Supabase Edge Functions**:
```typescript
// supabase/functions/_shared/datadog.ts
import { tracer } from 'dd-trace';

tracer.init({
  service: 'prayermap-edge-functions',
  env: Deno.env.get('ENVIRONMENT') || 'development',
});

// Wrap functions
export function withDatadogTrace<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.trace(name, async (span) => {
    return await fn();
  });
}
```

**Install package**:
```bash
npm install dd-trace
```

**Note**: Requires Datadog Agent or serverless setup

---

### 3. Database Monitoring Activation

**Check if already active**:
1. Go to Datadog → Infrastructure → Databases
2. Look for PostgreSQL integration
3. If not active, follow `docs/DATADOG_POSTGRESQL_SETUP.md`

**Verify metrics**:
- Query performance
- Connection pool health
- Slow query detection

---

### 4. Synthetic Monitoring Setup

**Create test scenario**:
1. Go to Datadog → Synthetic Monitoring → New Test
2. Create Browser Test for critical flow:
   - Open PrayerMap
   - Create prayer
   - Respond to prayer
   - Verify memorial line appears
3. Set alert threshold: Fail if test takes > 5 seconds

**Create API Test**:
1. Test critical API endpoints
2. Monitor response times
3. Alert on failures

---

## 📊 Baseline Metrics to Capture

### Before Refactoring Starts

**Frontend Metrics** (via RUM):
- [ ] Page load time (current baseline)
- [ ] Time to Interactive (current baseline)
- [ ] Component render times (current baseline)
- [ ] Animation FPS (current baseline)
- [ ] Error rate (current baseline)

**Backend Metrics** (via APM):
- [ ] Supabase query p50, p95, p99 latencies
- [ ] Edge Function execution times
- [ ] API endpoint response times
- [ ] Error rates by endpoint

**Database Metrics** (via Database Monitoring):
- [ ] Query execution times
- [ ] Slow query count
- [ ] Connection pool usage
- [ ] Index usage statistics

**Logs** (via Log Management):
- [ ] Current log volume
- [ ] Error log frequency
- [ ] Performance log patterns

---

## 🎯 Refactoring Monitoring Checklist

### During Refactoring

- [ ] **Monitor error rate** - Should not increase
- [ ] **Track performance metrics** - Should maintain or improve
- [ ] **Watch slow queries** - Should not introduce new slow queries
- [ ] **Check synthetic tests** - Should continue passing
- [ ] **Review logs** - Should show refactoring progress markers

### After Refactoring

- [ ] **Compare metrics** - Before vs After
- [ ] **Verify improvements** - Performance should be same or better
- [ ] **Check error rate** - Should not increase
- [ ] **Review slow queries** - Should not have new slow queries
- [ ] **Validate synthetic tests** - All tests should pass

---

## 💰 Cost Considerations

**Free Tier**:
- ✅ RUM: 10k sessions/month
- ✅ Logs: 1GB/month
- ✅ APM: Limited
- ✅ Database Monitoring: Limited

**Pro Plan** ($31/month):
- ✅ RUM: 100k sessions/month
- ✅ Logs: 1GB/month (included)
- ✅ APM: Full access
- ✅ Database Monitoring: Full access
- ✅ Synthetic Monitoring: 10k test runs/month

**Recommendation**: Start with free tier, upgrade if needed during refactoring

---

## 🚨 Critical: Do This Before Refactoring

1. **✅ Set up Log Management** (30 min) - Capture refactoring progress
2. **✅ Activate APM** (1-2 hours) - Track backend performance
3. **✅ Verify Database Monitoring** (30 min) - Ensure it's active
4. **✅ Capture baseline metrics** (15 min) - Document "before" state

**Total Time**: ~2-3 hours  
**Value**: Catch regressions immediately, verify improvements

---

## 📚 Related Documentation

- `docs/DATADOG_SETUP_WALKTHROUGH.md` - RUM setup guide
- `docs/DATADOG_POSTGRESQL_SETUP.md` - Database monitoring
- `docs/OBSERVABILITY_DRIVEN_DEVELOPMENT.md` - ODD protocol
- `src/lib/datadog.ts` - Current Datadog integration

---

**Last Updated**: 2024-11-30  
**Priority**: ⚠️ **HIGH** - Set up before refactoring begins

