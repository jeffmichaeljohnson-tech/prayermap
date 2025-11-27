-- ============================================================================
-- Moderation Feature Verification Script
-- ============================================================================
-- Run this script to verify the moderation feature is properly installed
-- ============================================================================

-- Step 1: Check if new columns exist on prayers table
SELECT 'Checking prayers table columns...' as step;
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'prayers'
  AND column_name IN ('status', 'flagged_count', 'moderation_notes', 'last_moderated_at', 'last_moderated_by')
ORDER BY column_name;

-- Step 2: Check if new tables exist
SELECT 'Checking new tables exist...' as step;
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('user_bans', 'prayer_flags')
ORDER BY table_name;

-- Step 3: Check if moderation functions exist
SELECT 'Checking moderation functions...' as step;
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_moderation_queue',
    'moderate_prayer',
    'ban_user',
    'unban_user',
    'is_user_banned',
    'get_user_ban_status',
    'update_prayer_flag_count'
  )
ORDER BY routine_name;

-- Step 4: Check RLS policies
SELECT 'Checking RLS policies...' as step;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('prayers', 'user_bans', 'prayer_flags')
ORDER BY tablename, policyname;

-- Step 5: Check indexes
SELECT 'Checking moderation indexes...' as step;
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('prayers', 'user_bans', 'prayer_flags')
  AND (
    indexname LIKE '%status%'
    OR indexname LIKE '%flag%'
    OR indexname LIKE '%ban%'
    OR indexname LIKE '%moderat%'
  )
ORDER BY tablename, indexname;

-- Step 6: Test moderation queue function (should work even if empty)
SELECT 'Testing get_moderation_queue function...' as step;
SELECT
  CASE
    WHEN COUNT(*) >= 0 THEN 'PASS: Function works (returned ' || COUNT(*) || ' rows)'
    ELSE 'FAIL: Function error'
  END as test_result
FROM get_moderation_queue(5, 0, 'all');

-- Step 7: Check user_bans table structure
SELECT 'Checking user_bans table structure...' as step;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_bans'
ORDER BY ordinal_position;

-- Step 8: Check prayer_flags table structure
SELECT 'Checking prayer_flags table structure...' as step;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'prayer_flags'
ORDER BY ordinal_position;

-- Step 9: Check constraints on new tables
SELECT 'Checking table constraints...' as step;
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('prayers', 'user_bans', 'prayer_flags')
  AND tc.constraint_type IN ('CHECK', 'UNIQUE', 'FOREIGN KEY')
ORDER BY tc.table_name, tc.constraint_type;

-- Step 10: Summary Report
SELECT 'SUMMARY REPORT' as step;
SELECT
  'Tables Created' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 2 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_bans', 'prayer_flags')
UNION ALL
SELECT
  'Prayer Columns Added' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 5 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'prayers'
  AND column_name IN ('status', 'flagged_count', 'moderation_notes', 'last_moderated_at', 'last_moderated_by')
UNION ALL
SELECT
  'Functions Created' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 6 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%user%ban%'
  OR routine_name LIKE '%moderat%'
  OR routine_name LIKE '%flag%'
UNION ALL
SELECT
  'RLS Policies Created' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 6 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_bans', 'prayer_flags')
UNION ALL
SELECT
  'Indexes Created' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 6 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%status%'
    OR indexname LIKE '%flag%'
    OR indexname LIKE '%ban%'
  );

-- ============================================================================
-- Next Steps After Running This Script
-- ============================================================================
-- If all checks pass (✓ PASS):
--   1. Navigate to /admin/moderation in your browser
--   2. Verify the page loads without errors
--   3. Test creating a flag (optional)
--   4. Test moderating a prayer (optional)
--
-- If any checks fail (✗ FAIL):
--   1. Review the migration SQL file
--   2. Check Supabase logs for errors
--   3. Ensure admin schema is installed first
--   4. Re-run the migration
--
-- To create test data for testing:
--   - See test-moderation-data.sql (if exists)
--   - Or manually create prayers and flags through the app
-- ============================================================================
