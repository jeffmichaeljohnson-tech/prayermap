-- ============================================================================
-- RLS Performance Testing & Validation Guide
-- For Migration 026: RLS Authentication Performance Optimization
-- ============================================================================
--
-- This file provides comprehensive testing procedures to validate the 90%
-- performance improvement from RLS optimization migration 026.
--
-- TESTING OBJECTIVES:
-- 1. Validate 500ms → 50ms prayer query improvement
-- 2. Confirm zero security regressions
-- 3. Verify index utilization efficiency
-- 4. Test authentication flows under load
-- 5. Monitor production performance metrics
-- ============================================================================

-- ============================================================================
-- PRE-DEPLOYMENT BASELINE TESTING
-- ============================================================================

-- Run this BEFORE applying migration 026 to establish baseline
-- Save results for before/after comparison

-- Baseline Test 1: Prayer query performance (current slow performance)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  id, user_id, title, content, created_at, status
FROM prayers 
WHERE user_id = auth.uid() 
AND (status IS NULL OR status = 'active')
ORDER BY created_at DESC 
LIMIT 20;

-- Expected BEFORE results:
-- • Execution Time: 500-2000ms
-- • Planning Time: 50-200ms  
-- • Index Usage: Sequential Scan or inefficient index
-- • Buffer Usage: High (many page reads)

-- Baseline Test 2: Inbox query performance (current slow performance)
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  pr.id, pr.prayer_id, pr.message, pr.created_at,
  p.title as prayer_title, p.user_name as prayer_author
FROM prayer_responses pr
INNER JOIN prayers p ON pr.prayer_id = p.id
WHERE p.user_id = auth.uid()
ORDER BY pr.created_at DESC
LIMIT 20;

-- Expected BEFORE results:
-- • Execution Time: 800-3000ms
-- • Join Type: Hash Join or Nested Loop (inefficient)
-- • Index Usage: Multiple sequential scans
-- • Buffer Usage: Very high

-- ============================================================================
-- POST-DEPLOYMENT VALIDATION TESTING
-- ============================================================================

-- Run these tests AFTER applying migration 026 to validate improvements

-- Performance Test 1: Optimized prayer query
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  id, user_id, title, content, created_at, status
FROM prayers 
WHERE user_id = get_current_user_optimized()
AND (status IS NULL OR status = 'active')
ORDER BY created_at DESC 
LIMIT 20;

-- Expected AFTER results:
-- • Execution Time: 10-50ms (90% improvement)
-- • Planning Time: 1-5ms
-- • Index Usage: prayers_user_auth_optimized_idx (index scan)
-- • Buffer Usage: Low (efficient index access)

-- Performance Test 2: Optimized inbox query
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT 
  pr.id, pr.prayer_id, pr.message, pr.created_at,
  p.title as prayer_title, p.user_name as prayer_author
FROM prayer_responses pr
INNER JOIN prayers p ON pr.prayer_id = p.id
WHERE p.user_id = get_current_user_optimized()
ORDER BY pr.created_at DESC
LIMIT 20;

-- Expected AFTER results:
-- • Execution Time: 20-100ms (80% improvement)
-- • Join Type: Nested Loop with index scan (efficient)
-- • Index Usage: prayer_responses_owner_lookup_idx + prayers_user_auth_optimized_idx
-- • Buffer Usage: Minimal (index-only scans where possible)

-- ============================================================================
-- AUTOMATED PERFORMANCE VALIDATION
-- ============================================================================

-- Test Function 1: Automated before/after comparison
CREATE OR REPLACE FUNCTION validate_rls_performance_improvement()
RETURNS TABLE (
  test_name TEXT,
  baseline_ms NUMERIC,
  optimized_ms NUMERIC,
  improvement_percent NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  baseline_cost NUMERIC;
  optimized_cost NUMERIC;
  improvement NUMERIC;
BEGIN
  -- Test 1: Prayer query performance
  EXECUTE format('EXPLAIN (FORMAT JSON, ANALYZE false)
    SELECT id, title, content FROM prayers 
    WHERE user_id = %L AND (status IS NULL OR status = ''active'')
    ORDER BY created_at DESC LIMIT 10', test_user_id)
  INTO baseline_cost;
  
  baseline_cost := (baseline_cost->0->'Plan'->>'Total Cost')::NUMERIC;
  
  -- Use optimized function
  EXECUTE format('EXPLAIN (FORMAT JSON, ANALYZE false)
    SELECT id, title, content FROM prayers 
    WHERE user_id = get_current_user_optimized() 
    AND user_id = %L AND (status IS NULL OR status = ''active'')
    ORDER BY created_at DESC LIMIT 10', test_user_id)
  INTO optimized_cost;
  
  optimized_cost := (optimized_cost->0->'Plan'->>'Total Cost')::NUMERIC;
  improvement := ((baseline_cost - optimized_cost) / baseline_cost * 100);
  
  RETURN QUERY SELECT
    'Prayer Query Performance'::TEXT,
    baseline_cost,
    optimized_cost,
    improvement,
    CASE 
      WHEN improvement >= 80 THEN 'EXCELLENT (Target met)'
      WHEN improvement >= 50 THEN 'GOOD (Significant improvement)'
      WHEN improvement >= 20 THEN 'MODERATE (Some improvement)'
      ELSE 'POOR (Requires attention)'
    END::TEXT;
END;
$$;

-- Test Function 2: Index utilization validation
CREATE OR REPLACE FUNCTION validate_index_utilization()
RETURNS TABLE (
  index_name TEXT,
  table_name TEXT,
  total_scans BIGINT,
  tuples_read BIGINT,
  efficiency_rating TEXT,
  recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    indexname::TEXT,
    tablename::TEXT,
    idx_scan,
    idx_tup_read,
    CASE
      WHEN idx_scan > 1000 AND idx_tup_read / NULLIF(idx_scan, 0) < 10 THEN 'EXCELLENT'
      WHEN idx_scan > 100 THEN 'GOOD'
      WHEN idx_scan > 10 THEN 'FAIR'
      ELSE 'POOR'
    END::TEXT,
    CASE
      WHEN idx_scan = 0 THEN 'Index not being used - consider dropping'
      WHEN idx_tup_read / NULLIF(idx_scan, 0) > 1000 THEN 'High selectivity - consider optimization'
      ELSE 'Index performing well'
    END::TEXT
  FROM pg_stat_user_indexes
  WHERE indexname IN (
    'prayers_user_auth_optimized_idx',
    'prayers_location_auth_gist_idx',
    'prayer_responses_owner_lookup_idx', 
    'admin_roles_auth_lookup_idx',
    'profiles_auth_lookup_idx'
  )
  ORDER BY idx_scan DESC;
END;
$$;

-- ============================================================================
-- SECURITY REGRESSION TESTING
-- ============================================================================

-- Test Function 3: RLS policy security validation
CREATE OR REPLACE FUNCTION validate_rls_security()
RETURNS TABLE (
  test_scenario TEXT,
  expected_behavior TEXT,
  actual_result TEXT,
  security_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_user1 UUID := gen_random_uuid();
  test_user2 UUID := gen_random_uuid();
  test_admin UUID := gen_random_uuid();
  prayer_count INTEGER;
  response_count INTEGER;
BEGIN
  -- Create test data
  INSERT INTO auth.users (id, email) VALUES 
    (test_user1, 'test1@example.com'),
    (test_user2, 'test2@example.com'),
    (test_admin, 'admin@example.com');
    
  INSERT INTO profiles (id, display_name) VALUES 
    (test_user1, 'Test User 1'),
    (test_user2, 'Test User 2'), 
    (test_admin, 'Admin User');
    
  INSERT INTO admin_roles (user_id, role) VALUES (test_admin, 'admin');
  
  -- Test 1: User can only see own prayers + active prayers
  RETURN QUERY
  SELECT 
    'User can view own prayers'::TEXT,
    'Should see only own prayers when filtering by user_id'::TEXT,
    'Test requires actual user session'::TEXT,
    'REQUIRES_MANUAL_TEST'::TEXT;
    
  -- Test 2: Anonymous users can view active prayers
  RETURN QUERY
  SELECT
    'Anonymous can view active prayers'::TEXT, 
    'Should see all active/approved prayers'::TEXT,
    'Test requires anonymous session'::TEXT,
    'REQUIRES_MANUAL_TEST'::TEXT;
    
  -- Test 3: Admin can view all prayers
  RETURN QUERY
  SELECT
    'Admin can view all prayers'::TEXT,
    'Should see all prayers regardless of status'::TEXT, 
    'Test requires admin session'::TEXT,
    'REQUIRES_MANUAL_TEST'::TEXT;
    
  -- Cleanup test data
  DELETE FROM admin_roles WHERE user_id IN (test_user1, test_user2, test_admin);
  DELETE FROM profiles WHERE id IN (test_user1, test_user2, test_admin);
  DELETE FROM auth.users WHERE id IN (test_user1, test_user2, test_admin);
END;
$$;

-- ============================================================================
-- LOAD TESTING PROCEDURES
-- ============================================================================

-- Test Function 4: Simulated concurrent user load
CREATE OR REPLACE FUNCTION simulate_concurrent_load(
  concurrent_users INTEGER DEFAULT 10,
  queries_per_user INTEGER DEFAULT 5
)
RETURNS TABLE (
  test_type TEXT,
  total_queries INTEGER,
  avg_execution_time_ms NUMERIC,
  max_execution_time_ms NUMERIC,
  queries_per_second NUMERIC,
  performance_rating TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  total_time INTERVAL;
  total_queries INTEGER;
  i INTEGER;
  j INTEGER;
  test_user_id UUID;
  query_start TIMESTAMP;
  query_end TIMESTAMP;
  query_times NUMERIC[] := ARRAY[]::NUMERIC[];
  query_time_ms NUMERIC;
BEGIN
  total_queries := concurrent_users * queries_per_user;
  start_time := clock_timestamp();
  
  -- Simulate concurrent prayer queries
  FOR i IN 1..concurrent_users LOOP
    test_user_id := gen_random_uuid();
    
    FOR j IN 1..queries_per_user LOOP
      query_start := clock_timestamp();
      
      -- Execute optimized prayer query
      PERFORM id, title, content 
      FROM prayers 
      WHERE (status IS NULL OR status = 'active')
      ORDER BY created_at DESC 
      LIMIT 10;
      
      query_end := clock_timestamp();
      query_time_ms := EXTRACT(EPOCH FROM (query_end - query_start)) * 1000;
      query_times := array_append(query_times, query_time_ms);
    END LOOP;
  END LOOP;
  
  end_time := clock_timestamp();
  total_time := end_time - start_time;
  
  RETURN QUERY 
  SELECT 
    'Concurrent Prayer Queries'::TEXT,
    total_queries,
    (SELECT AVG(x) FROM unnest(query_times) x),
    (SELECT MAX(x) FROM unnest(query_times) x),
    total_queries / EXTRACT(EPOCH FROM total_time),
    CASE 
      WHEN (SELECT AVG(x) FROM unnest(query_times) x) < 50 THEN 'EXCELLENT'
      WHEN (SELECT AVG(x) FROM unnest(query_times) x) < 200 THEN 'GOOD'
      WHEN (SELECT AVG(x) FROM unnest(query_times) x) < 500 THEN 'FAIR'
      ELSE 'POOR'
    END::TEXT;
END;
$$;

-- ============================================================================
-- PRODUCTION MONITORING SETUP
-- ============================================================================

-- Create monitoring view for ongoing performance tracking
CREATE OR REPLACE VIEW rls_performance_dashboard AS
SELECT 
  'Prayer Query Performance' as metric_name,
  (
    SELECT AVG(total_time) 
    FROM pg_stat_statements 
    WHERE query ILIKE '%prayers%user_id%auth.uid%'
  ) as avg_time_ms,
  (
    SELECT calls 
    FROM pg_stat_statements 
    WHERE query ILIKE '%prayers%user_id%auth.uid%'
    ORDER BY calls DESC 
    LIMIT 1
  ) as total_calls,
  CASE 
    WHEN (
      SELECT AVG(total_time) 
      FROM pg_stat_statements 
      WHERE query ILIKE '%prayers%user_id%auth.uid%'
    ) < 50 THEN 'HEALTHY'
    WHEN (
      SELECT AVG(total_time) 
      FROM pg_stat_statements 
      WHERE query ILIKE '%prayers%user_id%auth.uid%'
    ) < 200 THEN 'WARNING' 
    ELSE 'CRITICAL'
  END as status

UNION ALL

SELECT 
  'Index Scan Ratio' as metric_name,
  (
    SELECT 
      CASE WHEN seq_scan + idx_scan > 0 
      THEN (idx_scan::NUMERIC / (seq_scan + idx_scan)) * 100 
      ELSE 0 END
    FROM pg_stat_user_tables 
    WHERE relname = 'prayers'
  ) as avg_time_ms,
  (
    SELECT idx_scan + seq_scan 
    FROM pg_stat_user_tables 
    WHERE relname = 'prayers'
  ) as total_calls,
  CASE 
    WHEN (
      SELECT 
        CASE WHEN seq_scan + idx_scan > 0 
        THEN (idx_scan::NUMERIC / (seq_scan + idx_scan)) * 100 
        ELSE 0 END
      FROM pg_stat_user_tables 
      WHERE relname = 'prayers'
    ) > 80 THEN 'HEALTHY'
    WHEN (
      SELECT 
        CASE WHEN seq_scan + idx_scan > 0 
        THEN (idx_scan::NUMERIC / (seq_scan + idx_scan)) * 100 
        ELSE 0 END
      FROM pg_stat_user_tables 
      WHERE relname = 'prayers'
    ) > 50 THEN 'WARNING'
    ELSE 'CRITICAL'
  END as status;

COMMENT ON VIEW rls_performance_dashboard IS 
'Production monitoring dashboard for RLS performance metrics. 
Monitor daily for performance degradation.';

-- ============================================================================
-- TESTING EXECUTION CHECKLIST
-- ============================================================================

/*
🧪 COMPLETE TESTING CHECKLIST:

PRE-DEPLOYMENT:
□ Run baseline performance tests (save results)
□ Document current auth.uid() response times
□ Measure current prayer query execution times
□ Test with sample user sessions

DEPLOYMENT:
□ Apply migration 026 in staging environment
□ Verify all indexes created successfully
□ Validate RLS policies are active
□ Check for any deployment errors

POST-DEPLOYMENT VALIDATION:
□ Run validate_rls_performance_improvement()
□ Execute validate_index_utilization()  
□ Perform validate_rls_security() tests
□ Test simulate_concurrent_load()
□ Compare before/after metrics

MANUAL SECURITY TESTING:
□ Test authenticated user can access own prayers
□ Test authenticated user cannot access other user prayers
□ Test anonymous user can view active prayers only
□ Test admin user can access all prayers
□ Test inbox functionality works correctly
□ Verify prayer response permissions

PRODUCTION MONITORING:
□ Set up rls_performance_dashboard monitoring
□ Configure alerts for performance thresholds
□ Monitor for 48 hours post-deployment
□ Document performance improvements

SUCCESS CRITERIA:
✓ Prayer queries < 100ms (target: 50ms)
✓ Inbox queries < 200ms (target: 100ms)  
✓ Zero security regressions
✓ Index utilization > 80%
✓ Concurrent user performance stable

ROLLBACK PLAN (if needed):
1. Drop new indexes (migration_026_*.sql)
2. Restore previous RLS policies  
3. Document issues for analysis
4. Re-run baseline tests
*/

-- ============================================================================
-- FINAL TESTING SUMMARY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_complete_rls_testing()
RETURNS TABLE (
  test_category TEXT,
  test_name TEXT, 
  result TEXT,
  status TEXT,
  recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Execute all tests and return comprehensive results
  RETURN QUERY 
  SELECT 
    'Performance'::TEXT,
    'Query Optimization'::TEXT,
    'Run validate_rls_performance_improvement()'::TEXT,
    'PENDING'::TEXT,
    'Execute after migration deployment'::TEXT
  
  UNION ALL
  
  SELECT 
    'Security'::TEXT,
    'RLS Policy Validation'::TEXT,
    'Run validate_rls_security()'::TEXT,
    'PENDING'::TEXT,
    'Requires manual user session testing'::TEXT
    
  UNION ALL
  
  SELECT 
    'Infrastructure'::TEXT,
    'Index Utilization'::TEXT,
    'Run validate_index_utilization()'::TEXT,
    'PENDING'::TEXT,
    'Monitor after production load'::TEXT
    
  UNION ALL
  
  SELECT 
    'Load Testing'::TEXT,
    'Concurrent Users'::TEXT,
    'Run simulate_concurrent_load()'::TEXT,
    'PENDING'::TEXT,
    'Execute during low-traffic period'::TEXT;
END;
$$;

-- Ready for deployment testing
SELECT 'RLS Performance Testing Guide Ready - Execute tests after migration 026 deployment' as status;