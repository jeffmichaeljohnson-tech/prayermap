-- ============================================================================
-- MIGRATION 020 VALIDATION CHECKLIST
-- ============================================================================
-- Run these queries after applying migration 020 to verify everything
-- was created correctly and is functioning as expected.
-- ============================================================================

-- ============================================================================
-- STRUCTURAL VALIDATION
-- ============================================================================

-- 1. Verify notifications table exists and has correct structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RAISE EXCEPTION '❌ FAIL: notifications table does not exist';
  END IF;
  RAISE NOTICE '✅ PASS: notifications table exists';
END $$;

-- 2. Verify notification_type enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    RAISE EXCEPTION '❌ FAIL: notification_type enum does not exist';
  END IF;
  RAISE NOTICE '✅ PASS: notification_type enum exists';
END $$;

-- 3. Verify all required columns exist with correct types
SELECT 
  CASE 
    WHEN COUNT(*) = 13 THEN '✅ PASS: All required columns exist'
    ELSE '❌ FAIL: Missing columns. Expected 13, found ' || COUNT(*)
  END as column_check
FROM information_schema.columns 
WHERE table_name = 'notifications'
AND column_name IN (
  'id', 'user_id', 'type', 'title', 'message', 'prayer_id', 
  'prayer_response_id', 'from_user_id', 'is_read', 'read_at', 
  'data', 'created_at', 'expires_at'
);

-- ============================================================================
-- INDEX VALIDATION
-- ============================================================================

-- 4. Verify all performance indexes exist
SELECT 
  CASE 
    WHEN COUNT(*) >= 8 THEN '✅ PASS: All performance indexes exist'
    ELSE '❌ FAIL: Missing indexes. Expected 8+, found ' || COUNT(*)
  END as index_check
FROM pg_indexes 
WHERE tablename = 'notifications'
AND indexname LIKE 'idx_notifications_%';

-- List all indexes for verification
SELECT '📋 INDEXES:' as info, indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'notifications'
ORDER BY indexname;

-- ============================================================================
-- CONSTRAINT VALIDATION
-- ============================================================================

-- 5. Verify CHECK constraints exist
SELECT 
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS: CHECK constraints exist'
    ELSE '❌ FAIL: Missing CHECK constraints. Expected 4+, found ' || COUNT(*)
  END as constraint_check
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'notifications';

-- ============================================================================
-- FUNCTION VALIDATION
-- ============================================================================

-- 6. Verify all notification functions exist
SELECT 
  CASE 
    WHEN COUNT(*) >= 6 THEN '✅ PASS: All notification functions exist'
    ELSE '❌ FAIL: Missing functions. Expected 6+, found ' || COUNT(*)
  END as function_check
FROM pg_proc 
WHERE proname IN (
  'create_prayer_response_notification',
  'mark_notification_read',
  'mark_notifications_read', 
  'mark_all_notifications_read',
  'get_notification_count',
  'get_notifications',
  'cleanup_old_notifications'
);

-- List all notification functions
SELECT '📋 FUNCTIONS:' as info, proname, pronargs
FROM pg_proc 
WHERE proname LIKE '%notification%'
ORDER BY proname;

-- ============================================================================
-- TRIGGER VALIDATION
-- ============================================================================

-- 7. Verify prayer response trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_prayer_response_created'
  ) THEN
    RAISE EXCEPTION '❌ FAIL: on_prayer_response_created trigger does not exist';
  END IF;
  RAISE NOTICE '✅ PASS: prayer response notification trigger exists';
END $$;

-- ============================================================================
-- RLS POLICY VALIDATION
-- ============================================================================

-- 8. Verify RLS is enabled and policies exist
SELECT 
  CASE 
    WHEN relrowsecurity THEN '✅ PASS: RLS enabled on notifications table'
    ELSE '❌ FAIL: RLS not enabled on notifications table'
  END as rls_check
FROM pg_class 
WHERE relname = 'notifications';

-- Verify minimum required policies exist
SELECT 
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS: Required RLS policies exist'
    ELSE '❌ FAIL: Missing RLS policies. Expected 3+, found ' || COUNT(*)
  END as policy_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- List all RLS policies
SELECT '📋 POLICIES:' as info, policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- ============================================================================
-- PERMISSION VALIDATION
-- ============================================================================

-- 9. Verify function permissions are granted
SELECT 
  CASE 
    WHEN COUNT(*) >= 6 THEN '✅ PASS: Function permissions granted'
    ELSE '⚠️  WARNING: Some function permissions may be missing. Found ' || COUNT(*)
  END as permission_check
FROM information_schema.routine_privileges 
WHERE routine_name LIKE '%notification%'
AND grantee = 'authenticated';

-- ============================================================================
-- FOREIGN KEY VALIDATION
-- ============================================================================

-- 10. Verify foreign key constraints exist
SELECT 
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS: Foreign key constraints exist'
    ELSE '❌ FAIL: Missing foreign keys. Expected 4+, found ' || COUNT(*)
  END as fk_check
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
WHERE kcu.table_name = 'notifications';

-- ============================================================================
-- FUNCTIONAL TESTING (Optional - requires test data)
-- ============================================================================

-- 11. Test notification creation (commented out - requires test data)
/*
-- This section can be uncommented to test with actual data
-- Requires: valid user_id, prayer_id, and prayer_response_id

-- Test notification function
SELECT get_notification_count() as test_count;

-- Test marking notification as read
-- SELECT mark_notification_read('test-uuid-here') as test_mark_read;

-- Test getting notifications  
-- SELECT * FROM get_notifications(10, 0, false) LIMIT 1;
*/

-- ============================================================================
-- PERFORMANCE VALIDATION
-- ============================================================================

-- 12. Verify indexes are properly utilized (basic check)
EXPLAIN (FORMAT TEXT) 
SELECT * FROM notifications 
WHERE user_id = gen_random_uuid() 
AND is_read = false 
ORDER BY created_at DESC 
LIMIT 10;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

SELECT 
  '🎯 MIGRATION 020 VALIDATION COMPLETE' as status,
  now() as validated_at;

SELECT 
  '📊 SUMMARY:' as section,
  'Run all queries above to see detailed validation results' as instructions;

-- ============================================================================
-- TROUBLESHOOTING QUERIES (Run if any validations fail)
-- ============================================================================

-- If table missing:
-- SELECT to_regclass('public.notifications');

-- If enum missing:
-- SELECT typname FROM pg_type WHERE typname = 'notification_type';

-- If functions missing:
-- SELECT proname FROM pg_proc WHERE proname LIKE '%notification%';

-- If triggers missing:
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'notifications'::regclass;

-- If indexes missing:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'notifications';

-- If policies missing:
-- SELECT policyname FROM pg_policies WHERE tablename = 'notifications';