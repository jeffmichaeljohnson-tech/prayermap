-- ============================================================================
-- Foreign Key Index Performance Testing and Validation Guide
-- Migration 027 Companion: Testing and Benchmarking
-- ============================================================================
--
-- This comprehensive testing guide validates the performance improvements
-- claimed in Migration 027 and provides ongoing monitoring procedures.
--
-- VALIDATION TARGETS:
-- 1. Verify 300% → 95% JOIN performance improvement
-- 2. Confirm admin dashboard queries: 500ms → 25ms  
-- 3. Validate inbox queries: 200ms → 20ms
-- 4. Test moderation queries: 800ms → 40ms
-- 5. Ensure all foreign key indexes are being used
-- 6. Monitor index efficiency and maintenance needs
--
-- USAGE:
-- Run these queries immediately after deploying Migration 027 to validate
-- the performance improvements and establish baseline metrics.
-- ============================================================================

-- ============================================================================
-- SECTION 1: PRE-DEPLOYMENT BASELINE (Run BEFORE Migration 027)
-- ============================================================================

-- Test 1: Admin Role Verification (Without FK Index)
-- Expected: High cost due to hash join
EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON)
SELECT 
  ar.role,
  ar.created_at,
  u.email as creator_email,
  u.created_at as creator_registered
FROM admin_roles ar
LEFT JOIN auth.users u ON ar.created_by = u.id
WHERE ar.user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY ar.created_at DESC;

-- Test 2: Prayer Response Moderation Lookup (Without FK Index)  
-- Expected: Sequential scan + hash join
EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON)
SELECT 
  pr.id,
  pr.message,
  pr.status,
  pr.last_moderated_at,
  u.email as moderator_email
FROM prayer_responses pr
LEFT JOIN auth.users u ON pr.last_moderated_by = u.id
WHERE pr.status IN ('pending_review', 'hidden')
ORDER BY pr.last_moderated_at DESC
LIMIT 20;

-- Test 3: Notification Response Cleanup (Without FK Index)
-- Expected: High cost nested loop or hash join
EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON)
SELECT 
  n.id,
  n.message,
  n.created_at,
  pr.message as response_message
FROM notifications n
JOIN prayer_responses pr ON n.prayer_response_id = pr.id
WHERE pr.prayer_id = (SELECT id FROM prayers LIMIT 1)
ORDER BY n.created_at DESC;

-- Test 4: Moderation Flag Aggregation (Without FK Index)
-- Expected: Multiple sequential scans
EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON)
SELECT 
  prf.response_id,
  COUNT(*) as flag_count,
  array_agg(prf.reason) as reasons,
  pr.message,
  pr.status
FROM prayer_response_flags prf
JOIN prayer_responses pr ON prf.response_id = pr.id
WHERE prf.reviewed = false
GROUP BY prf.response_id, pr.message, pr.status
ORDER BY COUNT(*) DESC
LIMIT 10;

-- ============================================================================
-- SECTION 2: POST-DEPLOYMENT VALIDATION (Run AFTER Migration 027)
-- ============================================================================

-- Test 1: Admin Role Verification (With admin_roles_created_by_idx)
-- Expected: Index scan, significant cost reduction
EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON)
SELECT 
  ar.role,
  ar.created_at,
  u.email as creator_email,
  u.created_at as creator_registered
FROM admin_roles ar
LEFT JOIN auth.users u ON ar.created_by = u.id
WHERE ar.user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY ar.created_at DESC;

-- Validation: Look for "admin_roles_created_by_idx" in execution plan
-- Success criteria: <50ms execution time vs >200ms before

-- Test 2: Prayer Response Moderation Lookup (With prayer_responses_last_moderated_by_idx)
-- Expected: Index scan, covering index usage
EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON)  
SELECT 
  pr.id,
  pr.message,
  pr.status,
  pr.last_moderated_at,
  u.email as moderator_email
FROM prayer_responses pr
LEFT JOIN auth.users u ON pr.last_moderated_by = u.id
WHERE pr.status IN ('pending_review', 'hidden')
ORDER BY pr.last_moderated_at DESC
LIMIT 20;

-- Validation: Look for "prayer_responses_last_moderated_by_idx" usage
-- Success criteria: <30ms execution time vs >500ms before

-- Test 3: Notification Response Cleanup (With notifications_prayer_response_id_idx)
-- Expected: Nested loop with index scan, not hash join
EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON)
SELECT 
  n.id,
  n.message,
  n.created_at,
  pr.message as response_message
FROM notifications n
JOIN prayer_responses pr ON n.prayer_response_id = pr.id
WHERE pr.prayer_id = (SELECT id FROM prayers LIMIT 1)
ORDER BY n.created_at DESC;

-- Validation: Look for "notifications_prayer_response_id_idx" usage  
-- Success criteria: <25ms execution time vs >150ms before

-- Test 4: Moderation Flag Aggregation (With prayer_response_flags_response_id_idx)
-- Expected: Index scan + efficient grouping
EXPLAIN (ANALYZE true, BUFFERS true, FORMAT JSON)
SELECT 
  prf.response_id,
  COUNT(*) as flag_count,
  array_agg(prf.reason) as reasons,
  pr.message,
  pr.status
FROM prayer_response_flags prf
JOIN prayer_responses pr ON prf.response_id = pr.id
WHERE prf.reviewed = false
GROUP BY prf.response_id, pr.message, pr.status
ORDER BY COUNT(*) DESC
LIMIT 10;

-- Validation: Look for "prayer_response_flags_response_id_idx" usage
-- Success criteria: <40ms execution time vs >800ms before

-- ============================================================================
-- SECTION 3: COMPREHENSIVE PERFORMANCE COMPARISON
-- ============================================================================

-- Automated Before/After Comparison
-- This function compares performance automatically
SELECT * FROM compare_join_performance_before_after();

-- Expected Results:
-- Query Type                    | Cost Before | Cost After | Improvement % | Index Usage
-- Admin Role Verification       | 500.0       | ~25.0      | ~95%         | Using FK index ✓
-- Notification Response Lookup  | 800.0       | ~40.0      | ~95%         | Using FK index ✓ 
-- Moderation Flag Lookup        | 600.0       | ~30.0      | ~95%         | Using FK index ✓

-- ============================================================================
-- SECTION 4: INDEX USAGE VALIDATION
-- ============================================================================

-- Verify all foreign key indexes exist and are healthy
SELECT * FROM foreign_key_index_health;

-- Expected Results:
-- - All indexes should show "Medium Usage" or "High Usage"
-- - Selectivity should be >60% for efficient indexes
-- - Size should be proportional to table data volume

-- Detailed foreign key index analysis
SELECT * FROM analyze_foreign_key_index_performance();

-- Expected Results:
-- - All indexes should show "Good" or "Excellent" performance impact
-- - No indexes should be marked as "Unused" after deployment
-- - Efficiency should be >70% for active indexes

-- ============================================================================
-- SECTION 5: REAL-WORLD QUERY PERFORMANCE TESTS
-- ============================================================================

-- Test 5: Admin Dashboard - Recent Moderation Activity
-- This query represents typical admin dashboard usage
EXPLAIN (ANALYZE true, BUFFERS true)
SELECT 
  pr.id,
  pr.message,
  pr.status,
  pr.flagged_count,
  pr.last_moderated_at,
  moderator.email as moderator_email,
  COUNT(prf.id) as total_flags
FROM prayer_responses pr
LEFT JOIN auth.users moderator ON pr.last_moderated_by = moderator.id
LEFT JOIN prayer_response_flags prf ON pr.id = prf.response_id
WHERE pr.last_moderated_at > (NOW() - INTERVAL '7 days')
   OR pr.flagged_count > 0
   OR pr.status != 'active'
GROUP BY pr.id, pr.message, pr.status, pr.flagged_count, pr.last_moderated_at, moderator.email
ORDER BY pr.last_moderated_at DESC, pr.flagged_count DESC
LIMIT 50;

-- Success Criteria: <50ms execution time, using FK indexes

-- Test 6: User Inbox - Recent Prayer Response Notifications
-- This query represents user inbox functionality
EXPLAIN (ANALYZE true, BUFFERS true)
SELECT DISTINCT
  n.id,
  n.type,
  n.message,
  n.created_at,
  n.is_read,
  p.title as prayer_title,
  pr.message as response_message,
  sender.display_name as sender_name
FROM notifications n
JOIN prayers p ON n.prayer_id = p.id
LEFT JOIN prayer_responses pr ON n.prayer_response_id = pr.id
LEFT JOIN profiles sender ON n.from_user_id = sender.id
WHERE n.user_id = (SELECT id FROM auth.users LIMIT 1)
  AND n.type = 'prayer_response'
  AND n.created_at > (NOW() - INTERVAL '30 days')
ORDER BY n.created_at DESC
LIMIT 20;

-- Success Criteria: <25ms execution time, using notification FK indexes

-- Test 7: Moderator Workload - Flags Reviewed by Specific Moderator
-- This query helps track moderator productivity
EXPLAIN (ANALYZE true, BUFFERS true)
SELECT 
  prf.id,
  prf.reason,
  prf.action_taken,
  prf.reviewed_at,
  pr.message as flagged_response,
  reporter.display_name as reporter_name
FROM prayer_response_flags prf
JOIN prayer_responses pr ON prf.response_id = pr.id
LEFT JOIN profiles reporter ON prf.reporter_id = reporter.id
WHERE prf.reviewed_by = (
  SELECT user_id FROM admin_roles 
  WHERE role = 'moderator' 
  LIMIT 1
)
AND prf.reviewed_at > (NOW() - INTERVAL '7 days')
ORDER BY prf.reviewed_at DESC;

-- Success Criteria: <30ms execution time, using reviewed_by FK index

-- ============================================================================
-- SECTION 6: STRESS TESTING WITH REALISTIC DATA VOLUMES
-- ============================================================================

-- Stress Test 1: Large Table JOIN Performance
-- Test with realistic data volumes (simulates production load)
EXPLAIN (ANALYZE true, BUFFERS true)
WITH recent_prayers AS (
  SELECT id, user_id, title, created_at
  FROM prayers 
  WHERE created_at > (NOW() - INTERVAL '30 days')
),
response_stats AS (
  SELECT 
    pr.prayer_id,
    COUNT(*) as response_count,
    COUNT(CASE WHEN pr.last_moderated_by IS NOT NULL THEN 1 END) as moderated_count
  FROM prayer_responses pr
  WHERE pr.created_at > (NOW() - INTERVAL '30 days')
  GROUP BY pr.prayer_id
)
SELECT 
  rp.id,
  rp.title,
  rp.created_at,
  COALESCE(rs.response_count, 0) as responses,
  COALESCE(rs.moderated_count, 0) as moderated_responses,
  prof.display_name as prayer_author
FROM recent_prayers rp
LEFT JOIN response_stats rs ON rp.id = rs.prayer_id
LEFT JOIN profiles prof ON rp.user_id = prof.id
ORDER BY rp.created_at DESC
LIMIT 100;

-- Success Criteria: <100ms execution time even with large datasets

-- ============================================================================
-- SECTION 7: MONITORING AND ALERTING SETUP
-- ============================================================================

-- Create performance monitoring view for ongoing tracking
CREATE OR REPLACE VIEW foreign_key_performance_monitoring AS
WITH query_performance AS (
  -- Monitor slow queries that should benefit from FK indexes
  SELECT 
    'admin_role_verification' as query_type,
    CASE WHEN EXISTS(
      SELECT 1 FROM pg_stat_user_indexes 
      WHERE indexname = 'admin_roles_created_by_idx' AND idx_scan > 0
    ) THEN 'Using FK Index' ELSE 'Not Using FK Index' END as index_status,
    'admin_roles' as primary_table
  
  UNION ALL
  
  SELECT 
    'moderation_lookup' as query_type,
    CASE WHEN EXISTS(
      SELECT 1 FROM pg_stat_user_indexes 
      WHERE indexname = 'prayer_responses_last_moderated_by_idx' AND idx_scan > 0  
    ) THEN 'Using FK Index' ELSE 'Not Using FK Index' END as index_status,
    'prayer_responses' as primary_table
    
  UNION ALL
  
  SELECT 
    'notification_cleanup' as query_type,
    CASE WHEN EXISTS(
      SELECT 1 FROM pg_stat_user_indexes 
      WHERE indexname = 'notifications_prayer_response_id_idx' AND idx_scan > 0
    ) THEN 'Using FK Index' ELSE 'Not Using FK Index' END as index_status,
    'notifications' as primary_table
)
SELECT 
  qp.*,
  CURRENT_TIMESTAMP as last_checked,
  CASE 
    WHEN qp.index_status = 'Not Using FK Index' THEN '⚠️  INDEX NOT USED'
    ELSE '✅ INDEX ACTIVE'
  END as health_status
FROM query_performance qp;

-- Alert if any FK indexes are not being used
CREATE OR REPLACE FUNCTION check_fk_index_usage_alerts()
RETURNS TABLE (
  alert_level TEXT,
  index_name TEXT,
  table_name TEXT,
  issue TEXT,
  recommended_action TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check for unused FK indexes
  RETURN QUERY
  SELECT 
    'WARNING'::TEXT as alert_level,
    indexname::TEXT,
    tablename::TEXT,
    'Foreign key index has zero scans since deployment'::TEXT as issue,
    'Investigate if index is needed or queries are not using it'::TEXT as recommended_action
  FROM pg_stat_user_indexes
  WHERE indexname IN (
    'admin_roles_created_by_idx',
    'prayer_responses_last_moderated_by_idx', 
    'notifications_prayer_response_id_idx',
    'notifications_from_user_id_idx',
    'prayer_response_flags_response_id_idx',
    'prayer_response_flags_reviewed_by_idx'
  )
  AND idx_scan = 0
  AND pg_stat_get_db_stat_reset_time(oid) < (NOW() - INTERVAL '1 hour'); -- Only alert after 1 hour
  
  -- Check for very low efficiency indexes
  RETURN QUERY 
  SELECT 
    'INFO'::TEXT as alert_level,
    indexname::TEXT,
    tablename::TEXT,
    format('Index efficiency is only %s%% (fetch/read ratio)', 
           round((idx_tup_fetch::NUMERIC / NULLIF(idx_tup_read, 0)::NUMERIC) * 100, 1)
    )::TEXT as issue,
    'Consider analyzing query patterns or rebuilding index'::TEXT as recommended_action
  FROM pg_stat_user_indexes
  WHERE indexname IN (
    'admin_roles_created_by_idx',
    'prayer_responses_last_moderated_by_idx',
    'notifications_prayer_response_id_idx', 
    'notifications_from_user_id_idx',
    'prayer_response_flags_response_id_idx',
    'prayer_response_flags_reviewed_by_idx'
  )
  AND idx_tup_read > 1000  -- Only for active indexes
  AND (idx_tup_fetch::NUMERIC / NULLIF(idx_tup_read, 0)::NUMERIC) < 0.5; -- <50% efficiency
END;
$$;

-- ============================================================================
-- SECTION 8: MAINTENANCE PROCEDURES 
-- ============================================================================

-- Monthly maintenance report
-- Run this monthly to ensure indexes remain healthy
SELECT 
  'MONTHLY MAINTENANCE REPORT - ' || TO_CHAR(NOW(), 'YYYY-MM') as report_title,
  (SELECT COUNT(*) FROM foreign_key_index_health WHERE usage_category != 'Unused') as active_indexes,
  (SELECT COUNT(*) FROM foreign_key_index_health WHERE usage_category = 'Unused') as unused_indexes,
  (SELECT round(SUM(size_mb), 1) FROM foreign_key_index_health) as total_index_size_mb,
  (SELECT COUNT(*) FROM check_fk_index_usage_alerts()) as active_alerts;

-- Get maintenance recommendations  
SELECT * FROM foreign_key_index_maintenance_report();

-- ============================================================================
-- SECTION 9: SUCCESS VALIDATION CHECKLIST
-- ============================================================================

-- Run this complete validation after deploying Migration 027
DO $$
DECLARE
  test_results JSONB := '{}';
  total_indexes INTEGER;
  active_indexes INTEGER; 
  avg_improvement NUMERIC;
BEGIN
  -- Count indexes
  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes 
  WHERE indexname IN (
    'admin_roles_created_by_idx', 'prayer_responses_last_moderated_by_idx',
    'notifications_prayer_response_id_idx', 'notifications_from_user_id_idx',
    'prayer_response_flags_response_id_idx', 'prayer_response_flags_reviewed_by_idx'
  );
  
  -- Count active indexes
  SELECT COUNT(*) INTO active_indexes
  FROM pg_stat_user_indexes 
  WHERE indexname IN (
    'admin_roles_created_by_idx', 'prayer_responses_last_moderated_by_idx',
    'notifications_prayer_response_id_idx', 'notifications_from_user_id_idx', 
    'prayer_response_flags_response_id_idx', 'prayer_response_flags_reviewed_by_idx'
  )
  AND idx_scan > 0;
  
  RAISE NOTICE '
╔═══════════════════════════════════════════════════════════════════════════╗
║                    MIGRATION 027 VALIDATION RESULTS                      ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║ 📊 INDEX DEPLOYMENT STATUS:                                              ║
║   • Total FK indexes created: % / 6 expected                            ║
║   • Active indexes (receiving queries): % / %                           ║
║   • Index health status: % complete                                     ║
║                                                                           ║ 
║ 🧪 VALIDATION CHECKLIST:                                                 ║
║   [ ] Run Section 2 performance tests                                    ║
║   [ ] Compare results with Section 1 baseline                           ║
║   [ ] Verify 95%% improvement in JOIN query performance                  ║
║   [ ] Confirm all indexes show "Using FK index ✓" status               ║
║   [ ] Check foreign_key_index_health view shows healthy metrics         ║
║                                                                           ║
║ 📈 MONITORING COMMANDS:                                                   ║
║   SELECT * FROM foreign_key_index_health;                               ║
║   SELECT * FROM analyze_foreign_key_index_performance();                ║
║   SELECT * FROM check_fk_index_usage_alerts();                          ║
║                                                                           ║
║ ✅ SUCCESS CRITERIA:                                                      ║
║   • All 6 FK indexes created and active                                  ║
║   • JOIN queries >90%% faster than baseline                              ║
║   • Admin dashboard queries <50ms                                        ║
║   • No unused index alerts after 24 hours                               ║
║   • Index selectivity >60%% for active indexes                           ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  ', total_indexes, active_indexes, total_indexes;
END;
$$;

-- Final validation query - run 24 hours after deployment
SELECT 
  'Migration 027 Validation Complete' as status,
  CASE 
    WHEN (SELECT COUNT(*) FROM foreign_key_index_health WHERE usage_category = 'High Usage') >= 4 THEN
      '✅ SUCCESS: FK indexes are actively improving performance'
    WHEN (SELECT COUNT(*) FROM foreign_key_index_health WHERE usage_category != 'Unused') >= 5 THEN  
      '⚠️ PARTIAL: Most indexes active, monitor unused ones'
    ELSE
      '❌ ISSUE: Many indexes unused, investigate query patterns'
  END as deployment_result,
  (SELECT COUNT(*) FROM check_fk_index_usage_alerts()) as active_alerts,
  'Monitor with foreign_key_index_health view and monthly maintenance report' as next_steps;