# Performance Monitoring Quick Start

Get up and running with PrayerMap's performance monitoring system in 5 minutes.

## Step 1: Apply the Migration

First, apply the database migration:

```bash
# If using Supabase CLI
npx supabase db push

# Or manually via Supabase Dashboard
# 1. Go to SQL Editor in your Supabase project
# 2. Copy contents of: supabase/migrations/20250129_add_performance_monitoring.sql
# 3. Run the SQL
```

Verify it worked:

```sql
-- Should return 1 test entry
SELECT COUNT(*) FROM performance_logs;
```

## Step 2: Add to Your Service

Pick ONE method to start logging performance:

### Option A: Automatic (Recommended)

Wrap your existing functions:

```typescript
import { withPerformanceLogging } from '@/services/performanceService';

// Before:
async function getPrayers() {
  const { data } = await supabase.from('prayers').select();
  return data;
}

// After:
const getPrayers = withPerformanceLogging(
  'get_prayers',
  async () => {
    const { data } = await supabase.from('prayers').select();
    return data;
  }
);
```

### Option B: Manual

Add logging to individual queries:

```typescript
import { logQueryPerformance } from '@/services/performanceService';

async function getPrayers() {
  const start = performance.now();
  const { data } = await supabase.from('prayers').select();
  const end = performance.now();

  await logQueryPerformance({
    functionName: 'get_prayers',
    executionTimeMs: Math.round(end - start),
    rowsReturned: data?.length
  });

  return data;
}
```

## Step 3: View in Admin Dashboard

1. Navigate to `/admin/performance` (or add it to your admin nav)
2. You should see:
   - Total queries count
   - Slow queries (>200ms)
   - Average p95 latency
   - Per-function breakdown

## Step 4: Set Performance Targets

Check if your functions meet targets:

```typescript
import { checkPerformanceTarget } from '@/services/performanceService';

// Check if get_prayers meets 200ms p95 target
const result = await checkPerformanceTarget('get_prayers', 200);

if (!result.meetsTarget) {
  console.warn(`Performance issue: p95=${result.actualP95Ms}ms`);
}
```

## What to Monitor

### Critical Functions (Mobile Users)

Target: **p95 < 200ms**

- `get_prayers` - Main feed
- `get_nearby_prayers` - Map view
- `create_prayer` - Post submission
- `get_prayer_responses` - Response loading

### Nice-to-Have Functions

Target: **p95 < 500ms**

- `get_admin_stats` - Dashboard
- `get_audit_logs` - Admin logs
- Batch operations

## Common Issues

### "No data available"

**Solution:** Make sure you're calling the wrapped/logged functions:

```typescript
// ❌ Wrong - using unwrapped function
const prayers = await supabase.from('prayers').select();

// ✅ Right - using wrapped function with logging
const prayers = await getPrayers();
```

### "Permission denied"

**Solution:** Check your user has admin role:

```sql
SELECT role FROM profiles WHERE id = auth.uid();
-- Should return: 'admin'
```

### All queries showing as slow

**Solution:** This is likely a real issue! Check:
1. Database indexes (especially spatial indexes)
2. Network latency (test on mobile)
3. Query complexity (use EXPLAIN ANALYZE)

## Next Steps

### 1. Add More Functions

Gradually wrap all critical database queries:

```typescript
// src/services/prayerService.ts
export const getPrayers = withPerformanceLogging('get_prayers', ...);
export const createPrayer = withPerformanceLogging('create_prayer', ...);
export const updatePrayer = withPerformanceLogging('update_prayer', ...);
```

### 2. Set Up Monitoring

Create a weekly health check:

```typescript
// Run via cron every Monday
import { getPerformanceStats } from '@/services/performanceService';

async function weeklyHealthCheck() {
  const stats = await getPerformanceStats({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  });

  const slowFunctions = stats.filter(s => s.p95_time_ms > 200);

  if (slowFunctions.length > 0) {
    sendSlackAlert(`⚠️ ${slowFunctions.length} functions are slow`);
  }
}
```

### 3. Optimize Slow Queries

For any function with p95 > 200ms:

1. **Identify**: View in admin dashboard
2. **Analyze**: Check query plan with EXPLAIN ANALYZE
3. **Optimize**: Add indexes, denormalize, or cache
4. **Verify**: Compare before/after p95 latency

### 4. Document Your Findings

Keep a performance log:

```markdown
## 2025-01-29: Optimized get_nearby_prayers

- **Before:** p95 = 450ms
- **Change:** Added spatial index on prayers.location
- **After:** p95 = 120ms
- **Impact:** 73% improvement, affects 60% of mobile users
```

## Resources

- [Full Documentation](./PERFORMANCE_MONITORING.md)
- [Usage Examples](./examples/performance-monitoring-usage.ts)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [PostGIS Optimization](https://postgis.net/workshops/postgis-intro/performance.html)

## Help

If you run into issues:

1. Check the full docs: [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md)
2. Review examples: [performance-monitoring-usage.ts](./examples/performance-monitoring-usage.ts)
3. Verify migration applied: `SELECT COUNT(*) FROM performance_logs;`
4. Check admin access: `SELECT role FROM profiles WHERE id = auth.uid();`

---

**You're now monitoring performance!** 🎉

Start small, monitor critical functions, and gradually expand coverage.
