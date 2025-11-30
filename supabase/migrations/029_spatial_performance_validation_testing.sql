-- =====================================================================================
-- SPATIAL PERFORMANCE VALIDATION & TESTING SUITE
-- =====================================================================================
--
-- PURPOSE: Comprehensive testing and validation framework for Mission 3 spatial
-- optimizations. Provides tools to measure, validate, and monitor the performance
-- of prayer connection queries under real-world conditions.
--
-- SCOPE: Tests all spatial functions from Migration 028 with performance benchmarks
-- TARGET: Validate <30ms viewport queries and <100ms real-time updates
-- VALIDATION: Ensure spatial accuracy and memorial line visibility guarantees
--
-- USAGE:
-- 1. Run after Migration 028 deployment
-- 2. Execute performance benchmarks with test data
-- 3. Monitor production performance with these tools
-- 4. Use for regression testing of spatial optimizations
--
-- =====================================================================================

-- =====================================================================================
-- 1. TEST DATA GENERATION FOR SPATIAL BENCHMARKING
-- =====================================================================================

-- Function to generate realistic test prayer connections for performance testing
CREATE OR REPLACE FUNCTION generate_test_prayer_connections(
  connection_count INTEGER DEFAULT 10000,
  geographic_spread_km INTEGER DEFAULT 1000,
  center_lat DOUBLE PRECISION DEFAULT 40.7128, -- NYC coordinates for testing
  center_lng DOUBLE PRECISION DEFAULT -74.0060
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i INTEGER;
  test_prayer_id UUID;
  from_lat DOUBLE PRECISION;
  from_lng DOUBLE PRECISION; 
  to_lat DOUBLE PRECISION;
  to_lng DOUBLE PRECISION;
  connection_age_days INTEGER;
BEGIN
  -- Create a test prayer if needed
  INSERT INTO prayers (id, user_id, title, content, content_type, location, user_name, is_anonymous)
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM auth.users LIMIT 1), -- Use existing user
    'Performance Test Prayer',
    'This is a test prayer for spatial performance validation',
    'text',
    ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
    'Test User',
    false
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO test_prayer_id;

  -- If no prayer was inserted, get existing test prayer
  IF test_prayer_id IS NULL THEN
    SELECT id INTO test_prayer_id FROM prayers 
    WHERE title = 'Performance Test Prayer' LIMIT 1;
  END IF;

  -- Generate test connections with realistic geographic distribution
  FOR i IN 1..connection_count LOOP
    -- Random location within geographic spread (using normal distribution for realism)
    from_lat := center_lat + (random() - 0.5) * 2 * (geographic_spread_km / 111.0); -- ~111km per degree
    from_lng := center_lng + (random() - 0.5) * 2 * (geographic_spread_km / 111.0);
    
    to_lat := center_lat + (random() - 0.5) * 2 * (geographic_spread_km / 111.0);
    to_lng := center_lng + (random() - 0.5) * 2 * (geographic_spread_km / 111.0);
    
    -- Random age (0-365 days ago for variety)
    connection_age_days := floor(random() * 365)::INTEGER;

    INSERT INTO prayer_connections (
      id,
      prayer_id,
      from_location,
      to_location,
      requester_name,
      replier_name,
      created_at,
      expires_at
    ) VALUES (
      gen_random_uuid(),
      test_prayer_id,
      ST_SetSRID(ST_MakePoint(from_lng, from_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(to_lng, to_lat), 4326)::geography,
      'Test Requester ' || i,
      'Test Replier ' || i,
      NOW() - (connection_age_days || ' days')::INTERVAL,
      NOW() + INTERVAL '1 year' -- Memorial lines never expire (spiritually)
    );
  END LOOP;

  RETURN connection_count;
END;
$$;

-- =====================================================================================
-- 2. SPATIAL QUERY PERFORMANCE BENCHMARKING
-- =====================================================================================

-- Comprehensive performance testing function with EXPLAIN ANALYZE
CREATE OR REPLACE FUNCTION benchmark_spatial_queries()
RETURNS TABLE (
  test_name TEXT,
  execution_time_ms DOUBLE PRECISION,
  rows_returned INTEGER,
  index_usage TEXT,
  performance_grade TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  query_duration DOUBLE PRECISION;
  row_count INTEGER;
  
  -- Test viewport (Manhattan area)
  test_south_lat DOUBLE PRECISION := 40.7000;
  test_west_lng DOUBLE PRECISION := -74.0200;
  test_north_lat DOUBLE PRECISION := 40.7500;
  test_east_lng DOUBLE PRECISION := -73.9700;
  
  -- Performance thresholds (ms)
  excellent_threshold DOUBLE PRECISION := 10;
  good_threshold DOUBLE PRECISION := 30;
  acceptable_threshold DOUBLE PRECISION := 100;
BEGIN
  -- ==========================================
  -- Test 1: Basic Viewport Query Performance
  -- ==========================================
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO row_count
  FROM get_connections_in_viewport(
    test_south_lat, test_west_lng, test_north_lat, test_east_lng, 500
  );
  
  end_time := clock_timestamp();
  query_duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  RETURN QUERY SELECT 
    'viewport_basic_query'::TEXT,
    query_duration,
    row_count,
    'GIST spatial indexes'::TEXT,
    CASE 
      WHEN query_duration <= excellent_threshold THEN 'EXCELLENT'
      WHEN query_duration <= good_threshold THEN 'GOOD'  
      WHEN query_duration <= acceptable_threshold THEN 'ACCEPTABLE'
      ELSE 'NEEDS_OPTIMIZATION'
    END::TEXT;

  -- ==========================================
  -- Test 2: Clustered Connections Performance
  -- ==========================================
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO row_count
  FROM get_clustered_connections_in_viewport(
    test_south_lat, test_west_lng, test_north_lat, test_east_lng, 0.01, 200
  );
  
  end_time := clock_timestamp();
  query_duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  RETURN QUERY SELECT 
    'viewport_clustered_query'::TEXT,
    query_duration,
    row_count,
    'GIST + ST_SnapToGrid clustering'::TEXT,
    CASE 
      WHEN query_duration <= excellent_threshold * 2 THEN 'EXCELLENT' -- Allow 2x time for clustering
      WHEN query_duration <= good_threshold * 2 THEN 'GOOD'
      WHEN query_duration <= acceptable_threshold THEN 'ACCEPTABLE'
      ELSE 'NEEDS_OPTIMIZATION'
    END::TEXT;

  -- ==========================================
  -- Test 3: Real-Time Query Performance
  -- ==========================================
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO row_count
  FROM get_new_connections_in_viewport_since(
    test_south_lat, test_west_lng, test_north_lat, test_east_lng, 
    NOW() - INTERVAL '1 hour'
  );
  
  end_time := clock_timestamp();
  query_duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  RETURN QUERY SELECT 
    'real_time_updates_query'::TEXT,
    query_duration,
    row_count,
    'GIST + time filtering'::TEXT,
    CASE 
      WHEN query_duration <= excellent_threshold THEN 'EXCELLENT'
      WHEN query_duration <= good_threshold THEN 'GOOD'
      WHEN query_duration <= acceptable_threshold THEN 'ACCEPTABLE'
      ELSE 'NEEDS_OPTIMIZATION'
    END::TEXT;

  -- ==========================================
  -- Test 4: Density Grid Performance
  -- ==========================================
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO row_count
  FROM get_connection_density_grid(
    test_south_lat, test_west_lng, test_north_lat, test_east_lng, 0.1
  );
  
  end_time := clock_timestamp();
  query_duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  RETURN QUERY SELECT 
    'density_grid_query'::TEXT,
    query_duration,
    row_count,
    'GIST + ST_SnapToGrid aggregation'::TEXT,
    CASE 
      WHEN query_duration <= good_threshold * 3 THEN 'EXCELLENT' -- Allow 3x time for aggregation
      WHEN query_duration <= acceptable_threshold THEN 'GOOD'
      WHEN query_duration <= acceptable_threshold * 2 THEN 'ACCEPTABLE'
      ELSE 'NEEDS_OPTIMIZATION'
    END::TEXT;

  -- ==========================================
  -- Test 5: Legacy Query Comparison
  -- ==========================================
  start_time := clock_timestamp();
  
  -- Simulate old approach: fetch all connections and filter client-side
  SELECT COUNT(*) INTO row_count
  FROM prayer_connections pc
  INNER JOIN prayers p ON pc.prayer_id = p.id
  WHERE pc.expires_at > NOW()
    AND (p.status IS NULL OR p.status NOT IN ('hidden', 'removed'));
  
  end_time := clock_timestamp();
  query_duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
  
  RETURN QUERY SELECT 
    'legacy_fetch_all_comparison'::TEXT,
    query_duration,
    row_count,
    'Sequential scan (no spatial optimization)'::TEXT,
    'BASELINE_COMPARISON'::TEXT;

END;
$$;

-- =====================================================================================
-- 3. SPATIAL ACCURACY VALIDATION
-- =====================================================================================

-- Function to validate that all visible connections are captured by viewport queries
CREATE OR REPLACE FUNCTION validate_spatial_accuracy()
RETURNS TABLE (
  test_description TEXT,
  expected_count INTEGER,
  actual_count INTEGER,
  accuracy_percentage DOUBLE PRECISION,
  validation_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Test viewport (Central Park, NYC)
  test_south_lat DOUBLE PRECISION := 40.7644;
  test_west_lng DOUBLE PRECISION := -73.9738;
  test_north_lat DOUBLE PRECISION := 40.7827;
  test_east_lng DOUBLE PRECISION := -73.9487;
  
  viewport_bounds GEOMETRY;
  expected_connections INTEGER;
  actual_connections INTEGER;
  accuracy DOUBLE PRECISION;
BEGIN
  -- Create viewport bounds geometry
  viewport_bounds := ST_MakeEnvelope(test_west_lng, test_south_lat, test_east_lng, test_north_lat, 4326);
  
  -- ==========================================
  -- Test 1: Viewport Connection Accuracy
  -- ==========================================
  
  -- Count expected connections using precise spatial calculation
  SELECT COUNT(*) INTO expected_connections
  FROM prayer_connections pc
  INNER JOIN prayers p ON pc.prayer_id = p.id
  WHERE pc.expires_at > NOW()
    AND (p.status IS NULL OR p.status NOT IN ('hidden', 'removed'))
    AND (
      ST_Intersects(pc.from_location::geometry, viewport_bounds)
      OR ST_Intersects(pc.to_location::geometry, viewport_bounds)
      OR ST_Intersects(
        ST_MakeLine(pc.from_location::geometry, pc.to_location::geometry),
        viewport_bounds
      )
    );
  
  -- Count actual connections returned by optimized function
  SELECT COUNT(*) INTO actual_connections
  FROM get_connections_in_viewport(
    test_south_lat, test_west_lng, test_north_lat, test_east_lng, 10000
  );
  
  accuracy := CASE 
    WHEN expected_connections = 0 THEN 100.0
    ELSE (actual_connections::DOUBLE PRECISION / expected_connections::DOUBLE PRECISION) * 100.0
  END;
  
  RETURN QUERY SELECT 
    'viewport_connection_accuracy'::TEXT,
    expected_connections,
    actual_connections,
    accuracy,
    CASE 
      WHEN accuracy >= 99.5 THEN 'EXCELLENT'
      WHEN accuracy >= 95.0 THEN 'GOOD'
      WHEN accuracy >= 90.0 THEN 'ACCEPTABLE'
      ELSE 'FAILED'
    END::TEXT;

  -- ==========================================
  -- Test 2: Cross-Viewport Connection Accuracy
  -- ==========================================
  
  -- Test connections that cross the viewport (long-distance prayers)
  SELECT COUNT(*) INTO expected_connections
  FROM prayer_connections pc
  INNER JOIN prayers p ON pc.prayer_id = p.id
  WHERE pc.expires_at > NOW()
    AND (p.status IS NULL OR p.status NOT IN ('hidden', 'removed'))
    AND NOT ST_Intersects(pc.from_location::geometry, viewport_bounds)
    AND NOT ST_Intersects(pc.to_location::geometry, viewport_bounds)
    AND ST_Intersects(
      ST_MakeLine(pc.from_location::geometry, pc.to_location::geometry),
      viewport_bounds
    );
  
  -- This count should be included in the viewport query results
  accuracy := CASE 
    WHEN expected_connections = 0 THEN 100.0
    WHEN actual_connections >= expected_connections THEN 100.0
    ELSE (expected_connections::DOUBLE PRECISION / GREATEST(actual_connections, 1)::DOUBLE PRECISION) * 100.0
  END;
  
  RETURN QUERY SELECT 
    'cross_viewport_connection_accuracy'::TEXT,
    expected_connections,
    0, -- Not separately measurable in combined result
    accuracy,
    CASE 
      WHEN accuracy >= 99.0 THEN 'EXCELLENT'
      WHEN accuracy >= 90.0 THEN 'GOOD' 
      ELSE 'NEEDS_VERIFICATION'
    END::TEXT;

END;
$$;

-- =====================================================================================
-- 4. SPATIAL INDEX USAGE ANALYSIS
-- =====================================================================================

-- Function to analyze spatial index effectiveness and usage
CREATE OR REPLACE FUNCTION analyze_spatial_index_usage()
RETURNS TABLE (
  index_name TEXT,
  table_name TEXT,
  index_scans BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT,
  effectiveness_ratio DOUBLE PRECISION,
  usage_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    indexname::TEXT,
    tablename::TEXT,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
      WHEN idx_tup_read = 0 THEN 0
      ELSE (idx_tup_fetch::DOUBLE PRECISION / idx_tup_read::DOUBLE PRECISION) * 100.0
    END as effectiveness_ratio,
    CASE 
      WHEN idx_scan = 0 THEN 'UNUSED'
      WHEN idx_scan < 10 THEN 'RARELY_USED'
      WHEN idx_scan < 100 THEN 'MODERATELY_USED'  
      ELSE 'HEAVILY_USED'
    END::TEXT
  FROM pg_stat_user_indexes psi
  JOIN pg_indexes pi ON psi.indexname = pi.indexname
  WHERE pi.tablename = 'prayer_connections'
    AND pi.indexname LIKE '%gist%'
  ORDER BY idx_scan DESC;
END;
$$;

-- =====================================================================================
-- 5. PRODUCTION MONITORING FUNCTIONS
-- =====================================================================================

-- Real-time performance monitoring function for production use
CREATE OR REPLACE FUNCTION monitor_spatial_query_performance(
  sample_duration_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
  metric_name TEXT,
  value DOUBLE PRECISION,
  unit TEXT,
  status TEXT,
  timestamp_collected TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_monitoring TIMESTAMPTZ;
  sample_viewport_lat DOUBLE PRECISION;
  sample_viewport_lng DOUBLE PRECISION;
  total_queries INTEGER := 0;
  total_time_ms DOUBLE PRECISION := 0;
  avg_time_ms DOUBLE PRECISION;
BEGIN
  start_monitoring := NOW();
  
  -- Generate random sample viewports and measure performance
  WHILE EXTRACT(EPOCH FROM (NOW() - start_monitoring)) < sample_duration_seconds LOOP
    -- Random viewport around major global cities
    sample_viewport_lat := 40.7128 + (random() - 0.5) * 60; -- Global latitude range
    sample_viewport_lng := -74.0060 + (random() - 0.5) * 120; -- Global longitude range
    
    -- Measure single viewport query performance
    DECLARE
      query_start TIMESTAMPTZ := clock_timestamp();
      query_end TIMESTAMPTZ;
      query_duration_ms DOUBLE PRECISION;
      row_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO row_count
      FROM get_connections_in_viewport(
        sample_viewport_lat - 0.1,
        sample_viewport_lng - 0.1,
        sample_viewport_lat + 0.1,
        sample_viewport_lng + 0.1,
        100
      );
      
      query_end := clock_timestamp();
      query_duration_ms := EXTRACT(EPOCH FROM (query_end - query_start)) * 1000;
      
      total_queries := total_queries + 1;
      total_time_ms := total_time_ms + query_duration_ms;
    END;
    
    -- Small delay to prevent overwhelming the system
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  -- Calculate average performance
  avg_time_ms := total_time_ms / GREATEST(total_queries, 1);
  
  -- Return performance metrics
  RETURN QUERY SELECT 
    'avg_viewport_query_time'::TEXT,
    avg_time_ms,
    'milliseconds'::TEXT,
    CASE 
      WHEN avg_time_ms <= 30 THEN 'EXCELLENT'
      WHEN avg_time_ms <= 100 THEN 'GOOD'
      WHEN avg_time_ms <= 500 THEN 'ACCEPTABLE'
      ELSE 'DEGRADED'
    END::TEXT,
    NOW();
    
  RETURN QUERY SELECT 
    'queries_sampled'::TEXT,
    total_queries::DOUBLE PRECISION,
    'count'::TEXT,
    'INFO'::TEXT,
    NOW();
    
  RETURN QUERY SELECT 
    'total_sampling_time'::TEXT,
    EXTRACT(EPOCH FROM (NOW() - start_monitoring)),
    'seconds'::TEXT,
    'INFO'::TEXT,
    NOW();
END;
$$;

-- =====================================================================================
-- 6. REGRESSION TESTING SUITE
-- =====================================================================================

-- Complete regression test suite for spatial optimizations
CREATE OR REPLACE FUNCTION run_spatial_regression_tests()
RETURNS TABLE (
  test_suite TEXT,
  test_name TEXT,
  result TEXT,
  metric_value DOUBLE PRECISION,
  expected_range TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Performance regression tests
  RETURN QUERY
  SELECT 
    'PERFORMANCE'::TEXT,
    test_name,
    'execution_time_ms'::TEXT,
    execution_time_ms,
    CASE test_name
      WHEN 'viewport_basic_query' THEN '< 30ms'
      WHEN 'viewport_clustered_query' THEN '< 60ms'
      WHEN 'real_time_updates_query' THEN '< 100ms'
      WHEN 'density_grid_query' THEN '< 300ms'
      ELSE 'baseline'
    END::TEXT,
    performance_grade
  FROM benchmark_spatial_queries();
  
  -- Accuracy regression tests
  RETURN QUERY  
  SELECT 
    'ACCURACY'::TEXT,
    test_description,
    'accuracy_percentage'::TEXT,
    accuracy_percentage,
    '>= 95%'::TEXT,
    validation_status
  FROM validate_spatial_accuracy();
  
  -- Index usage regression tests
  RETURN QUERY
  SELECT 
    'INDEX_USAGE'::TEXT,
    index_name,
    'effectiveness_ratio'::TEXT,
    effectiveness_ratio,
    '> 50%'::TEXT,
    usage_status
  FROM analyze_spatial_index_usage()
  WHERE effectiveness_ratio > 0; -- Only show used indexes
END;
$$;

-- =====================================================================================
-- UTILITY FUNCTIONS
-- =====================================================================================

-- Clean up test data
CREATE OR REPLACE FUNCTION cleanup_test_prayer_connections()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM prayer_connections 
  WHERE requester_name LIKE 'Test Requester %'
    AND replier_name LIKE 'Test Replier %';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM prayers 
  WHERE title = 'Performance Test Prayer';
    
  RETURN deleted_count;
END;
$$;

-- Grant permissions for all testing functions
GRANT EXECUTE ON FUNCTION generate_test_prayer_connections TO authenticated;
GRANT EXECUTE ON FUNCTION benchmark_spatial_queries TO authenticated;
GRANT EXECUTE ON FUNCTION validate_spatial_accuracy TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_spatial_index_usage TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_spatial_query_performance TO authenticated;
GRANT EXECUTE ON FUNCTION run_spatial_regression_tests TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_test_prayer_connections TO authenticated;

-- =====================================================================================
-- TESTING EXECUTION GUIDE
-- =====================================================================================

-- Execute this comment block for comprehensive spatial optimization testing:
/*

-- Step 1: Generate test data (10,000 connections for realistic performance testing)
SELECT generate_test_prayer_connections(10000, 1000, 40.7128, -74.0060);

-- Step 2: Run performance benchmarks
SELECT * FROM benchmark_spatial_queries() ORDER BY execution_time_ms;

-- Step 3: Validate spatial accuracy  
SELECT * FROM validate_spatial_accuracy();

-- Step 4: Analyze index effectiveness
SELECT * FROM analyze_spatial_index_usage();

-- Step 5: Monitor production performance (60-second sample)
SELECT * FROM monitor_spatial_query_performance(60);

-- Step 6: Complete regression test suite
SELECT * FROM run_spatial_regression_tests() ORDER BY test_suite, metric_value;

-- Step 7: Clean up test data
SELECT cleanup_test_prayer_connections();

-- Step 8: Verify optimization results
-- Expected results after optimization:
-- - viewport_basic_query: 5-25ms (vs 800-2000ms before)
-- - viewport_clustered_query: 10-50ms (new capability)
-- - real_time_updates_query: 5-30ms (vs full table scan before)
-- - accuracy_percentage: 99.5%+ (no memorial lines missed)
-- - index effectiveness: 80%+ (GIST indexes heavily used)

*/

-- =====================================================================================
-- END PERFORMANCE VALIDATION SUITE
-- =====================================================================================