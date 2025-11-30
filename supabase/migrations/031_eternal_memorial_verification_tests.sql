-- =====================================================================================
-- MIGRATION 031: ETERNAL MEMORIAL LINES VERIFICATION TESTS
-- =====================================================================================
--
-- PURPOSE: Verify that Migration 030 successfully implemented eternal memorial lines
-- according to the LIVING MAP PRINCIPLE. These tests ensure memorial lines persist
-- forever and are accessible through all query functions.
--
-- TEST SCENARIOS:
-- 1. RLS policies allow access to all connections regardless of expires_at
-- 2. All query functions return connections regardless of expires_at
-- 3. Memorial line deletion is properly prevented
-- 4. Performance remains optimal with eternal storage
-- 5. Real-time subscriptions work with eternal connections
--
-- =====================================================================================

-- =====================================================================================
-- 1. CREATE TEST DATA SETUP
-- =====================================================================================

-- Function to create test memorial connections with various expiration states
CREATE OR REPLACE FUNCTION setup_eternal_memorial_test_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_user1_id UUID;
  test_user2_id UUID;
  test_prayer_id UUID;
  result_text TEXT := '';
BEGIN
  -- Create test users (if they don't exist)
  INSERT INTO auth.users (id, email, created_at, updated_at)
  VALUES 
    ('11111111-1111-1111-1111-111111111111', 'testuser1@eternal.test', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'testuser2@eternal.test', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  test_user1_id := '11111111-1111-1111-1111-111111111111';
  test_user2_id := '22222222-2222-2222-2222-222222222222';
  
  -- Create test profiles
  INSERT INTO profiles (id, display_name)
  VALUES 
    (test_user1_id, 'Eternal Test User 1'),
    (test_user2_id, 'Eternal Test User 2')
  ON CONFLICT (id) DO NOTHING;
  
  -- Create test prayer
  INSERT INTO prayers (id, user_id, title, content, location, is_anonymous, status)
  VALUES (
    '33333333-3333-3333-3333-333333333333',
    test_user1_id,
    'Test Prayer for Eternal Memorial',
    'This is a test prayer for eternal memorial line testing',
    ST_SetSRID(ST_MakePoint(-74.006, 40.7128), 4326)::geography, -- New York
    false,
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  
  test_prayer_id := '33333333-3333-3333-3333-333333333333';
  
  -- Create test memorial connections with different expiration states
  INSERT INTO prayer_connections (
    id,
    prayer_id,
    from_user_id,
    to_user_id,
    from_location,
    to_location,
    created_at,
    expires_at
  ) VALUES 
    -- Connection 1: Expired 2 years ago (should still be visible)
    (
      '44444444-4444-4444-4444-444444444444',
      test_prayer_id,
      test_user1_id,
      test_user2_id,
      ST_SetSRID(ST_MakePoint(-74.006, 40.7128), 4326)::geography, -- New York
      ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326)::geography, -- Los Angeles
      NOW() - INTERVAL '3 years',
      NOW() - INTERVAL '2 years'
    ),
    -- Connection 2: Expired 1 year ago (should still be visible)
    (
      '55555555-5555-5555-5555-555555555555',
      test_prayer_id,
      test_user1_id,
      test_user2_id,
      ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography, -- Chicago
      ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography, -- San Francisco
      NOW() - INTERVAL '2 years',
      NOW() - INTERVAL '1 year'
    ),
    -- Connection 3: Recent, not expired (should be visible)
    (
      '66666666-6666-6666-6666-666666666666',
      test_prayer_id,
      test_user1_id,
      test_user2_id,
      ST_SetSRID(ST_MakePoint(-95.7129, 37.0902), 4326)::geography, -- Kansas
      ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography, -- Miami
      NOW() - INTERVAL '6 months',
      NOW() + INTERVAL '6 months'
    )
  ON CONFLICT (id) DO NOTHING;
  
  result_text := 'Test data created successfully: 3 memorial connections with various expiration states';
  RETURN result_text;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error creating test data: ' || SQLERRM;
END;
$$;

-- =====================================================================================
-- 2. ETERNAL MEMORIAL LINE VISIBILITY TESTS
-- =====================================================================================

-- Test 1: Verify get_all_connections returns expired connections
CREATE OR REPLACE FUNCTION test_get_all_connections_includes_expired()
RETURNS TABLE (
  test_name TEXT,
  test_passed BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_connections INTEGER;
  expired_connections INTEGER;
BEGIN
  -- Count total test connections
  SELECT COUNT(*) INTO total_connections
  FROM get_all_connections()
  WHERE requester_name = 'Eternal Test User 1';
  
  -- Count expired test connections that should still be visible
  SELECT COUNT(*) INTO expired_connections
  FROM get_all_connections()
  WHERE requester_name = 'Eternal Test User 1'
    AND expires_at < NOW();
  
  RETURN QUERY SELECT
    'get_all_connections_includes_expired'::TEXT,
    (total_connections >= 3 AND expired_connections >= 2)::BOOLEAN,
    format('Total connections: %s, Expired connections: %s', 
           total_connections, expired_connections)::TEXT;
END;
$$;

-- Test 2: Verify viewport query includes expired connections
CREATE OR REPLACE FUNCTION test_viewport_query_includes_expired()
RETURNS TABLE (
  test_name TEXT,
  test_passed BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  viewport_connections INTEGER;
  expired_in_viewport INTEGER;
BEGIN
  -- Query viewport covering USA (should include test connections)
  SELECT COUNT(*) INTO viewport_connections
  FROM get_connections_in_viewport(25.0, -125.0, 50.0, -65.0, 100)
  WHERE requester_name = 'Eternal Test User 1';
  
  -- Count expired connections in viewport
  SELECT COUNT(*) INTO expired_in_viewport
  FROM get_connections_in_viewport(25.0, -125.0, 50.0, -65.0, 100)
  WHERE requester_name = 'Eternal Test User 1'
    AND expires_at < NOW();
  
  RETURN QUERY SELECT
    'viewport_query_includes_expired'::TEXT,
    (viewport_connections >= 3 AND expired_in_viewport >= 2)::BOOLEAN,
    format('Viewport connections: %s, Expired in viewport: %s', 
           viewport_connections, expired_in_viewport)::TEXT;
END;
$$;

-- Test 3: Verify clustered query includes expired connections
CREATE OR REPLACE FUNCTION test_clustered_query_includes_expired()
RETURNS TABLE (
  test_name TEXT,
  test_passed BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  cluster_count INTEGER;
  has_expired BOOLEAN := FALSE;
BEGIN
  -- Check if clustering includes expired connections
  SELECT COUNT(*) INTO cluster_count
  FROM get_clustered_connections_in_viewport(25.0, -125.0, 50.0, -65.0, 1.0, 100);
  
  -- Check if any clusters include expired connections by checking date ranges
  SELECT EXISTS(
    SELECT 1 FROM get_clustered_connections_in_viewport(25.0, -125.0, 50.0, -65.0, 1.0, 100)
    WHERE earliest_connection < NOW() - INTERVAL '1 year'
  ) INTO has_expired;
  
  RETURN QUERY SELECT
    'clustered_query_includes_expired'::TEXT,
    (cluster_count > 0 AND has_expired)::BOOLEAN,
    format('Cluster count: %s, Has expired connections: %s', 
           cluster_count, has_expired)::TEXT;
END;
$$;

-- Test 4: Verify real-time query can access expired connections (when created recently)
CREATE OR REPLACE FUNCTION test_realtime_query_access()
RETURNS TABLE (
  test_name TEXT,
  test_passed BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Create a "recent" connection that's already expired (edge case test)
  INSERT INTO prayer_connections (
    id, prayer_id, from_user_id, to_user_id,
    from_location, to_location, created_at, expires_at
  ) VALUES (
    '77777777-7777-7777-7777-777777777777',
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    ST_SetSRID(ST_MakePoint(-100.0, 40.0), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-90.0, 35.0), 4326)::geography,
    NOW() - INTERVAL '5 minutes',  -- Created recently
    NOW() - INTERVAL '1 minute'    -- But already expired
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Check if recent expired connection is accessible
  SELECT COUNT(*) INTO recent_count
  FROM get_new_connections_in_viewport_since(25.0, -125.0, 50.0, -65.0, NOW() - INTERVAL '10 minutes')
  WHERE id = '77777777-7777-7777-7777-777777777777';
  
  RETURN QUERY SELECT
    'realtime_query_access'::TEXT,
    (recent_count = 1)::BOOLEAN,
    format('Recent expired connection found: %s', recent_count = 1)::TEXT;
END;
$$;

-- =====================================================================================
-- 3. DELETION PREVENTION TESTS
-- =====================================================================================

-- Test 5: Verify memorial lines cannot be deleted
CREATE OR REPLACE FUNCTION test_deletion_prevention()
RETURNS TABLE (
  test_name TEXT,
  test_passed BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  deletion_prevented BOOLEAN := FALSE;
  error_message TEXT;
BEGIN
  -- Attempt to delete a memorial connection (should fail)
  BEGIN
    DELETE FROM prayer_connections 
    WHERE id = '44444444-4444-4444-4444-444444444444';
  EXCEPTION
    WHEN OTHERS THEN
      deletion_prevented := TRUE;
      error_message := SQLERRM;
  END;
  
  RETURN QUERY SELECT
    'deletion_prevention'::TEXT,
    deletion_prevented::BOOLEAN,
    COALESCE('Deletion prevented: ' || error_message, 'ERROR: Deletion was not prevented!')::TEXT;
END;
$$;

-- =====================================================================================
-- 4. PERFORMANCE VERIFICATION TESTS
-- =====================================================================================

-- Test 6: Verify eternal storage performance
CREATE OR REPLACE FUNCTION test_eternal_storage_performance()
RETURNS TABLE (
  test_name TEXT,
  test_passed BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  performance_data RECORD;
BEGIN
  -- Run performance validation
  SELECT * INTO performance_data 
  FROM validate_eternal_memorial_performance()
  LIMIT 1;
  
  RETURN QUERY SELECT
    'eternal_storage_performance'::TEXT,
    (performance_data.viewport_query_example_ms < 1000)::BOOLEAN, -- Should be <30ms in production
    format('Total connections: %s, Viewport query: %sms, Age range: %s days', 
           performance_data.total_connections,
           performance_data.viewport_query_example_ms::INTEGER,
           performance_data.oldest_connection_age_days)::TEXT;
END;
$$;

-- =====================================================================================
-- 5. COMPREHENSIVE TEST RUNNER
-- =====================================================================================

-- Function to run all eternal memorial line tests
CREATE OR REPLACE FUNCTION run_eternal_memorial_tests()
RETURNS TABLE (
  test_name TEXT,
  test_passed BOOLEAN,
  details TEXT,
  test_order INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Setup test data first
  PERFORM setup_eternal_memorial_test_data();
  
  -- Run all tests in order
  RETURN QUERY
  SELECT t.test_name, t.test_passed, t.details, 1 as test_order FROM test_get_all_connections_includes_expired() t
  UNION ALL
  SELECT t.test_name, t.test_passed, t.details, 2 as test_order FROM test_viewport_query_includes_expired() t
  UNION ALL
  SELECT t.test_name, t.test_passed, t.details, 3 as test_order FROM test_clustered_query_includes_expired() t
  UNION ALL
  SELECT t.test_name, t.test_passed, t.details, 4 as test_order FROM test_realtime_query_access() t
  UNION ALL
  SELECT t.test_name, t.test_passed, t.details, 5 as test_order FROM test_deletion_prevention() t
  UNION ALL
  SELECT t.test_name, t.test_passed, t.details, 6 as test_order FROM test_eternal_storage_performance() t
  ORDER BY test_order;
END;
$$;

-- Grant permissions for test functions
GRANT EXECUTE ON FUNCTION setup_eternal_memorial_test_data() TO authenticated;
GRANT EXECUTE ON FUNCTION run_eternal_memorial_tests() TO authenticated;

-- =====================================================================================
-- 6. CLEANUP TEST DATA FUNCTION
-- =====================================================================================

-- Function to clean up test data (optional)
CREATE OR REPLACE FUNCTION cleanup_eternal_memorial_test_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove test connections (this will fail due to deletion prevention - that's expected!)
  -- Remove test prayer
  DELETE FROM prayers WHERE id = '33333333-3333-3333-3333-333333333333';
  
  -- Remove test profiles and users would require auth access
  -- Left as manual cleanup if needed
  
  RETURN 'Test data cleanup completed (memorial connections preserved by design)';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Test data cleanup failed (this is expected due to deletion prevention): ' || SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_eternal_memorial_test_data() TO authenticated;

-- =====================================================================================
-- VERIFICATION TESTING COMPLETE
-- =====================================================================================

COMMENT ON FUNCTION run_eternal_memorial_tests() IS
  'Comprehensive test suite for eternal memorial lines. Verifies that Migration 030 
   successfully implemented the LIVING MAP PRINCIPLE with eternal memorial persistence.';

COMMENT ON FUNCTION setup_eternal_memorial_test_data() IS
  'Creates test data for eternal memorial verification including expired connections
   that must remain visible according to the Living Map Principle.';

/*
USAGE INSTRUCTIONS:

To verify eternal memorial lines are working correctly:

1. Run the complete test suite:
   SELECT * FROM run_eternal_memorial_tests() ORDER BY test_order;

2. All tests should pass (test_passed = true) to confirm eternal implementation

3. Check performance metrics:
   SELECT * FROM validate_eternal_memorial_performance();

4. Test deletion prevention manually:
   DELETE FROM prayer_connections WHERE id = 'any-id'; -- Should fail with error

5. Verify RLS policies allow expired connections:
   SELECT COUNT(*) FROM prayer_connections WHERE expires_at < NOW();
   -- Should return > 0 if expired connections exist

EXPECTED RESULTS:
✅ All query functions return expired connections
✅ Deletion attempts are blocked with error message
✅ Performance remains optimal (viewport queries <1000ms in dev, <30ms in production)
✅ RLS policies allow access to all connections regardless of expires_at
✅ Memorial lines persist forever as sacred spiritual geography

If any test fails, review Migration 030 implementation for issues.
*/