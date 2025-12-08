---
name: sql-optimization-patterns
description: Master SQL query optimization, indexing strategies, and EXPLAIN analysis for Supabase/PostgreSQL to dramatically improve database performance. Includes PostGIS spatial optimization, RLS performance, and Supabase-specific patterns. Use when debugging slow queries, designing database schemas, optimizing RPC functions, or improving application performance.
---

# SQL Optimization Patterns

Transform slow database queries into lightning-fast operations through systematic optimization, proper indexing, and query plan analysis.

## When to Use This Skill

- Debugging slow-running queries
- Designing performant database schemas
- Optimizing Supabase RPC functions
- Reducing database load and costs
- Improving scalability for growing datasets
- Analyzing EXPLAIN query plans
- Implementing efficient indexes
- Resolving N+1 query problems
- Optimizing PostGIS spatial queries
- Tuning RLS policy performance

## Core Concepts

### 1. Query Execution Plans (EXPLAIN)

Understanding EXPLAIN output is fundamental to optimization.

```sql
-- Basic explain
EXPLAIN SELECT * FROM prayers WHERE user_id = 'uuid-here';

-- With actual execution stats
EXPLAIN ANALYZE
SELECT * FROM prayers WHERE user_id = 'uuid-here';

-- Verbose output with more details
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT p.*, u.display_name
FROM prayers p
JOIN profiles u ON p.user_id = u.id
WHERE p.created_at > NOW() - INTERVAL '30 days';
```

**Key Metrics to Watch:**
- **Seq Scan**: Full table scan (usually slow for large tables)
- **Index Scan**: Using index (good)
- **Index Only Scan**: Using index without touching table (best)
- **Nested Loop**: Join method (okay for small datasets)
- **Hash Join**: Join method (good for larger datasets)
- **Cost**: Estimated query cost (lower is better)
- **Rows**: Estimated rows returned
- **Actual Time**: Real execution time

### 2. Index Strategies

Indexes are the most powerful optimization tool.

**Index Types:**
- **B-Tree**: Default, good for equality and range queries
- **Hash**: Only for equality (=) comparisons
- **GIN**: Full-text search, array queries, JSONB
- **GiST**: Geometric/PostGIS data, full-text search
- **BRIN**: Block Range INdex for very large tables with correlation

```sql
-- Standard B-Tree index
CREATE INDEX idx_prayers_user_id ON prayers(user_id);

-- Composite index (order matters!)
CREATE INDEX idx_prayers_user_status ON prayers(user_id, status);

-- Partial index (index subset of rows)
CREATE INDEX idx_active_prayers ON prayers(user_id)
WHERE status = 'active';

-- Expression index
CREATE INDEX idx_prayers_lower_title ON prayers(LOWER(title));

-- Covering index (include additional columns)
CREATE INDEX idx_prayers_user_covering ON prayers(user_id)
INCLUDE (title, created_at);

-- GIN index for JSONB metadata
CREATE INDEX idx_prayers_metadata ON prayers USING GIN(metadata);

-- PostGIS spatial index (critical for location queries!)
CREATE INDEX idx_prayers_location ON prayers USING GIST(location);
```

### 3. Query Optimization Patterns

**Avoid SELECT \*:**
```sql
-- Bad: Fetches unnecessary columns
SELECT * FROM prayers WHERE id = 'uuid';

-- Good: Fetch only what you need
SELECT id, title, content, created_at FROM prayers WHERE id = 'uuid';
```

**Use WHERE Clause Efficiently:**
```sql
-- Bad: Function prevents index usage
SELECT * FROM prayers WHERE LOWER(title) = 'healing';

-- Good: Create functional index or use exact match
CREATE INDEX idx_prayers_title_lower ON prayers(LOWER(title));
-- Then:
SELECT * FROM prayers WHERE LOWER(title) = 'healing';
```

## Supabase-Specific Patterns

### RLS Performance Optimization

RLS policies run on every query. Optimize them:

```sql
-- Bad: Subquery in RLS policy
CREATE POLICY "Users can view group prayers"
ON prayers FOR SELECT
USING (
  group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  )
);

-- Better: Use EXISTS for better performance
CREATE POLICY "Users can view group prayers"
ON prayers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = prayers.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Best: Denormalize if queried frequently
-- Add user_ids array to prayers table, then:
CREATE POLICY "Users can view prayers"
ON prayers FOR SELECT
USING (auth.uid() = ANY(allowed_user_ids));
```

### Supabase RPC Function Optimization

```sql
-- Optimized spatial query RPC
CREATE OR REPLACE FUNCTION prayers_within_radius(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,
  page_size INTEGER DEFAULT 20,
  cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.content,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000 AS distance_km,
    p.created_at
  FROM prayers p
  WHERE ST_DWithin(
    p.location::geography,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_km * 1000  -- Convert to meters
  )
  AND (cursor_id IS NULL OR p.id > cursor_id)
  ORDER BY p.created_at DESC, p.id
  LIMIT page_size;
$$;

-- Ensure spatial index exists!
CREATE INDEX IF NOT EXISTS idx_prayers_location
ON prayers USING GIST(location);
```

## Optimization Patterns

### Pattern 1: Eliminate N+1 Queries

**Problem: N+1 Query Anti-Pattern**
```typescript
// Bad: Executes N+1 queries
const prayers = await supabase.from('prayers').select('*').limit(10);
for (const prayer of prayers.data) {
  const user = await supabase.from('profiles').select('*').eq('id', prayer.user_id);
}
```

**Solution: Use JOINs or Batch Loading**
```typescript
// Good: Single query with JOIN
const { data } = await supabase
  .from('prayers')
  .select(`
    *,
    profiles:user_id (id, display_name, avatar_url)
  `)
  .limit(10);
```

### Pattern 2: Cursor-Based Pagination

**Bad: OFFSET on Large Tables**
```sql
-- Slow for large offsets
SELECT * FROM prayers
ORDER BY created_at DESC
LIMIT 20 OFFSET 100000;  -- Very slow!
```

**Good: Cursor-Based Pagination**
```sql
-- Much faster: Use cursor (last seen timestamp + id)
SELECT * FROM prayers
WHERE (created_at, id) < ('2024-01-15 10:30:00', 'last-uuid')
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Requires composite index
CREATE INDEX idx_prayers_cursor ON prayers(created_at DESC, id DESC);
```

```typescript
// Supabase cursor pagination
const { data } = await supabase
  .from('prayers')
  .select('*')
  .lt('created_at', lastCreatedAt)
  .order('created_at', { ascending: false })
  .limit(20);
```

### Pattern 3: Aggregate Efficiently

**Optimize COUNT Queries:**
```sql
-- Bad: Counts all rows
SELECT COUNT(*) FROM prayers;  -- Slow on large tables

-- Good: Use estimates for approximate counts
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'prayers';

-- Good: Filter before counting
SELECT COUNT(*) FROM prayers
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Pattern 4: Materialized Views for Aggregations

```sql
-- Create materialized view for prayer stats
CREATE MATERIALIZED VIEW prayer_stats AS
SELECT
    user_id,
    COUNT(*) as total_prayers,
    COUNT(*) FILTER (WHERE status = 'answered') as answered_prayers,
    MAX(created_at) as last_prayer_date
FROM prayers
GROUP BY user_id;

-- Add index to materialized view
CREATE INDEX idx_prayer_stats_user ON prayer_stats(user_id);

-- Refresh periodically (or via Supabase cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY prayer_stats;
```

### Pattern 5: Batch Operations

```sql
-- Good: Batch insert
INSERT INTO prayer_responses (prayer_id, user_id, type) VALUES
    ('uuid1', 'user1', 'prayed'),
    ('uuid2', 'user2', 'prayed'),
    ('uuid3', 'user3', 'prayed');

-- Good: Batch update with IN clause
UPDATE prayers
SET notification_sent = true
WHERE id IN ('uuid1', 'uuid2', 'uuid3');
```

## PostGIS Spatial Optimization

### Spatial Index Best Practices

```sql
-- Always use GIST index for geometry/geography
CREATE INDEX idx_prayers_location ON prayers USING GIST(location);

-- For large tables, consider BRIN
CREATE INDEX idx_prayers_location_brin ON prayers
USING BRIN(location) WITH (pages_per_range = 128);

-- Use ST_DWithin for radius queries (uses index!)
SELECT * FROM prayers
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
  10000  -- 10km in meters
);

-- Avoid ST_Distance in WHERE (doesn't use index well)
-- Bad:
SELECT * FROM prayers
WHERE ST_Distance(location, point) < 10000;
```

## Monitoring Queries

### Find Slow Queries (Supabase)
```sql
-- Use Supabase Logs or pg_stat_statements
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Find Missing Indexes
```sql
SELECT
    schemaname,
    tablename,
    seq_scan,
    idx_scan,
    seq_tup_read / NULLIF(seq_scan, 0) AS avg_seq_tup_read
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC
LIMIT 10;
```

### Find Unused Indexes
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Best Practices

1. **Index Selectively**: Too many indexes slow down writes
2. **Monitor Query Performance**: Use Supabase logs and advisors
3. **Keep Statistics Updated**: Supabase handles ANALYZE automatically
4. **Use Appropriate Data Types**: UUID vs BIGINT, TIMESTAMPTZ vs TIMESTAMP
5. **Optimize RLS Policies**: They run on every query
6. **Cache Frequently Accessed Data**: Use React Query staleTime
7. **Use RPC for Complex Queries**: Better than chaining filters

## Common Pitfalls

- **Over-Indexing**: Each index slows down INSERT/UPDATE/DELETE
- **Ignoring RLS Cost**: Complex policies add latency
- **LIKE with Leading Wildcard**: `LIKE '%abc'` can't use index
- **Function in WHERE**: Prevents index usage unless functional index
- **Missing Spatial Index**: PostGIS queries become full table scans
- **OR Conditions**: Often can't use indexes efficiently
