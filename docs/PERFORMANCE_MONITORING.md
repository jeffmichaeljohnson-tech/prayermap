# Performance Monitoring System

## Overview

The PrayerMap performance monitoring system tracks database query performance to measure optimization impact and identify bottlenecks. It provides real-time metrics, historical analysis, and automated alerting for slow queries.

## Architecture

### Components

1. **Database Layer** (`supabase/migrations/20250129_add_performance_monitoring.sql`)
   - `performance_logs` table: Stores query execution metrics
   - `get_performance_stats()`: Aggregates statistics with percentiles
   - `get_slow_query_details()`: Returns queries exceeding threshold
   - `log_query_performance()`: Helper for logging from other functions
   - `cleanup_old_performance_logs()`: Removes old data (30+ days)

2. **Service Layer** (`src/services/performanceService.ts`)
   - TypeScript interface to performance functions
   - Automatic logging with `withPerformanceLogging()` HOF
   - Performance summary and target checking utilities

3. **Admin Dashboard** (`admin/src/pages/PerformancePage.tsx`)
   - Real-time performance monitoring UI
   - p95 latency tracking (mobile optimization target)
   - Slow query identification and debugging

### Data Flow

```
Database Query → Performance Log → Aggregation Function → Admin Dashboard
                      ↓
                 RLS Protection
                      ↓
                 Admin Only Access
```

## Usage

### 1. Automatic Performance Logging

Wrap database functions to automatically log performance:

```typescript
import { withPerformanceLogging } from '@/services/performanceService';

// Wrap an existing function
const getPrayersWithLogging = withPerformanceLogging(
  'get_prayers_optimized',
  async (params) => {
    const { data } = await supabase.rpc('get_prayers', params);
    return data;
  }
);

// Use as normal - performance is logged automatically
const prayers = await getPrayersWithLogging({ limit: 100 });
```

### 2. Manual Performance Logging

For custom tracking:

```typescript
import { logQueryPerformance } from '@/services/performanceService';

const startTime = performance.now();
const prayers = await getPrayers();
const endTime = performance.now();

await logQueryPerformance({
  functionName: 'get_prayers',
  executionTimeMs: Math.round(endTime - startTime),
  rowsReturned: prayers.length,
  parameters: { limit: 100, offset: 0 }
});
```

### 3. Database-Side Logging

From within database functions:

```sql
CREATE OR REPLACE FUNCTION get_optimized_prayers()
RETURNS SETOF prayers
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_execution_time INTEGER;
  v_row_count INTEGER;
BEGIN
  v_start_time := clock_timestamp();

  -- Your query logic here
  RETURN QUERY
  SELECT * FROM prayers
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 100;

  -- Calculate execution time
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;

  -- Log performance
  PERFORM log_query_performance(
    'get_optimized_prayers',
    v_execution_time,
    v_row_count,
    NULL
  );
END;
$$;
```

### 4. Accessing Performance Stats

#### In Admin Dashboard

Navigate to the Performance page to view:
- Total query count
- Slow query count and percentage
- Average p95 latency
- Per-function statistics
- Recent slow queries with parameters

#### Programmatically

```typescript
import {
  getPerformanceStats,
  getSlowQueryDetails,
  getPerformanceSummary,
  checkPerformanceTarget
} from '@/services/performanceService';

// Get aggregated stats for last 24 hours
const stats = await getPerformanceStats({
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endDate: new Date()
});

// Get slow queries (>500ms)
const slowQueries = await getSlowQueryDetails({
  thresholdMs: 500,
  limit: 50
});

// Get high-level summary
const summary = await getPerformanceSummary();
console.log(`${summary.slowQueryPercentage}% of queries are slow`);

// Check if function meets target
const result = await checkPerformanceTarget('get_nearby_prayers', 200);
if (!result.meetsTarget) {
  console.warn(`Performance issue: p95=${result.actualP95Ms}ms`);
}
```

## Performance Targets

### Mobile Optimization

PrayerMap targets mobile users on 3G/4G connections, particularly in rural areas:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **p50 (median)** | <100ms | >150ms |
| **p95** | **<200ms** | **>200ms** |
| **p99** | <500ms | >1000ms |
| **Max** | <2000ms | >5000ms |

**Why p95?**
- p95 represents the experience of 95% of users
- More reliable than averages (not skewed by outliers)
- Industry standard for mobile performance

### Query Categories

- **Fast** (<100ms): Ideal for mobile
- **Good** (100-200ms): Acceptable, monitor closely
- **Slow** (200-500ms): Needs optimization
- **Critical** (>500ms): Immediate attention required

## Monitoring & Alerts

### Real-Time Monitoring

The admin dashboard auto-refreshes every 60 seconds to show:
- Current p95 latency per function
- Slow query count (>200ms)
- Recent problematic queries with parameters

### Automated Cleanup

Performance logs older than 30 days are automatically cleaned:

```typescript
import { cleanupOldPerformanceLogs } from '@/services/performanceService';

// Run weekly via cron or scheduled job
const deletedCount = await cleanupOldPerformanceLogs();
console.log(`Cleaned up ${deletedCount} old logs`);
```

### Setting Up Alerts

For production monitoring, integrate with your alerting system:

```typescript
// Example: Check performance every 5 minutes
setInterval(async () => {
  const summary = await getPerformanceSummary();

  if (summary.slowQueryPercentage > 10) {
    // Alert: More than 10% of queries are slow
    sendAlert({
      level: 'warning',
      message: `${summary.slowQueryPercentage}% of queries exceed 200ms`
    });
  }

  if (summary.avgP95Ms > 300) {
    // Alert: Average p95 too high
    sendAlert({
      level: 'critical',
      message: `Average p95 latency: ${summary.avgP95Ms}ms (target: <200ms)`
    });
  }
}, 5 * 60 * 1000);
```

## Optimization Workflow

### 1. Identify Slow Queries

```typescript
const slowQueries = await getSlowQueryDetails({
  thresholdMs: 200,
  limit: 20
});

// Review top offenders
slowQueries.forEach(query => {
  console.log(`${query.function_name}: ${query.execution_time_ms}ms`);
  console.log('Parameters:', query.parameters);
});
```

### 2. Analyze Query Plans

```sql
-- In Supabase SQL Editor
EXPLAIN ANALYZE
SELECT * FROM prayers
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
  10000
);
```

Look for:
- Sequential scans (should use indexes)
- High execution times on specific operations
- Missing indexes on frequently filtered columns

### 3. Optimize

Common optimizations:
- Add indexes (especially spatial indexes for location queries)
- Use query limits and pagination
- Denormalize frequently joined data
- Cache results with React Query
- Use materialized views for complex aggregations

### 4. Measure Impact

```typescript
// Before optimization
const before = await checkPerformanceTarget('get_nearby_prayers', 200);
console.log(`Before: p95=${before.actualP95Ms}ms`);

// Deploy optimization

// After optimization (wait for data)
const after = await checkPerformanceTarget('get_nearby_prayers', 200);
console.log(`After: p95=${after.actualP95Ms}ms`);
console.log(`Improvement: ${before.actualP95Ms - after.actualP95Ms}ms`);
```

## Security

### Row Level Security

Performance logs are protected by RLS:
- Only admins can view logs
- System can insert logs (for tracking)
- User IDs are logged (when available) but not exposed to non-admins

### Data Privacy

- Parameters are stored as JSONB for debugging
- Sensitive data should be redacted before logging
- Logs auto-delete after 30 days

## Indexes

The system uses these indexes for optimal query performance:

```sql
-- Query logs by function and time (most common)
idx_performance_logs_function (function_name, created_at DESC)

-- Query slow logs efficiently (partial index)
idx_performance_logs_slow (execution_time_ms DESC)
  WHERE execution_time_ms > 200

-- Query user-specific performance
idx_performance_logs_user (user_id, created_at DESC)
  WHERE user_id IS NOT NULL
```

## Best Practices

### DO:
✅ Log performance for all critical queries
✅ Monitor p95 latency (not just averages)
✅ Set up alerts for performance degradation
✅ Review slow queries weekly
✅ Test optimizations with real data
✅ Consider mobile users on slow connections

### DON'T:
❌ Log sensitive user data in parameters
❌ Rely on p50 or average alone
❌ Ignore queries just under the threshold
❌ Optimize without measuring first
❌ Forget to test on actual mobile devices
❌ Leave old logs forever (disk space)

## Troubleshooting

### No Data Showing

1. Check if migration was applied:
   ```sql
   SELECT * FROM performance_logs LIMIT 1;
   ```

2. Verify RLS policies allow admin access:
   ```sql
   SELECT * FROM profiles WHERE id = auth.uid();
   -- Should show role = 'admin'
   ```

3. Check if logging is working:
   ```typescript
   await logQueryPerformance({
     functionName: 'test',
     executionTimeMs: 150
   });
   ```

### High Latency Despite Optimization

1. Check network conditions (test on real mobile)
2. Verify indexes are being used (EXPLAIN ANALYZE)
3. Consider caching with React Query
4. Review Supabase dashboard for database CPU/memory
5. Check if PostGIS extensions need updating

### Logs Growing Too Large

1. Reduce log retention period:
   ```sql
   -- In cleanup function, change from 30 to 7 days
   WHERE created_at < NOW() - INTERVAL '7 days'
   ```

2. Run cleanup more frequently
3. Add sampling (only log 10% of queries)

## Integration with Existing Systems

### React Query Integration

```typescript
import { useQuery } from '@tanstack/react-query';
import { withPerformanceLogging } from '@/services/performanceService';

// Wrap service calls
const getPrayersOptimized = withPerformanceLogging(
  'get_prayers',
  async (params) => {
    const { data } = await supabase.rpc('get_prayers', params);
    return data;
  }
);

// Use in React Query
const { data: prayers } = useQuery({
  queryKey: ['prayers', filters],
  queryFn: () => getPrayersOptimized(filters),
  staleTime: 60000
});
```

### Supabase Edge Functions

```typescript
// In Supabase Edge Function
import { createClient } from '@supabase/supabase-js';

export default async (req: Request) => {
  const startTime = performance.now();

  // Your function logic
  const supabase = createClient(url, key);
  const { data } = await supabase.from('prayers').select();

  // Log performance
  const endTime = performance.now();
  await supabase.rpc('log_query_performance', {
    p_function_name: 'edge_function_get_prayers',
    p_execution_time_ms: Math.round(endTime - startTime),
    p_rows_returned: data?.length
  });

  return new Response(JSON.stringify(data));
};
```

## Roadmap

Future enhancements:
- [ ] Automated performance regression detection
- [ ] Weekly performance reports via email
- [ ] Query plan visualization in admin dashboard
- [ ] A/B testing framework for optimizations
- [ ] Integration with Supabase's built-in monitoring
- [ ] Mobile app performance correlation

## Resources

- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [PostGIS Performance Tips](https://postgis.net/workshops/postgis-intro/performance.html)
- [Supabase Performance Best Practices](https://supabase.com/docs/guides/database/performance)
- [React Query Performance](https://tanstack.com/query/latest/docs/react/guides/performance)

---

**Last Updated:** 2025-01-29
**Maintained for:** PrayerMap Database Optimization Sprint
