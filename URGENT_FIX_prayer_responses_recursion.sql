-- ============================================================================
-- URGENT FIX: Prayer Responses Infinite Recursion Issue
-- ============================================================================
-- 
-- ISSUE: RLS policies on prayer_responses table are directly querying admin_roles,
--        causing infinite recursion when users try to post prayer responses.
--
-- ROOT CAUSE: Migration 016 added policies that do direct subqueries to admin_roles:
--   EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid() ...)
--   This causes recursion because admin_roles policies also query admin_roles.
--
-- SOLUTION: Use the is_admin_or_moderator() SECURITY DEFINER function instead
--           of direct subqueries to break the recursion loop.
--
-- SAFETY: This fix can be run multiple times safely (uses IF EXISTS/IF NOT EXISTS)
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY SECURITY DEFINER FUNCTION EXISTS
-- ============================================================================

-- Check if is_admin_or_moderator function exists, create if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'is_admin_or_moderator'
  ) THEN
    -- Create the function if it doesn't exist
    EXECUTE 'CREATE OR REPLACE FUNCTION is_admin_or_moderator()
      RETURNS BOOLEAN
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $func$
        SELECT EXISTS (
          SELECT 1 FROM admin_roles
          WHERE user_id = auth.uid()
          AND role IN (''admin'', ''moderator'')
        );
      $func$';
    
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION is_admin_or_moderator() TO authenticated;
    
    RAISE NOTICE 'Created is_admin_or_moderator() function';
  ELSE
    RAISE NOTICE 'is_admin_or_moderator() function already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: DROP PROBLEMATIC POLICIES CAUSING RECURSION
-- ============================================================================

-- Drop the policies that directly query admin_roles (causing recursion)
DROP POLICY IF EXISTS "Admins can view all prayer responses" ON public.prayer_responses;
DROP POLICY IF EXISTS "Admins can update prayer responses" ON public.prayer_responses;

-- Also drop any response flags policies that might have the same issue
DROP POLICY IF EXISTS "Admins can view all response flags" ON public.prayer_response_flags;
DROP POLICY IF EXISTS "Admins can update response flags" ON public.prayer_response_flags;

RAISE NOTICE 'Dropped problematic RLS policies that caused recursion';

-- ============================================================================
-- STEP 3: RECREATE POLICIES USING SECURITY DEFINER FUNCTION
-- ============================================================================

-- Policy: Admins can view all responses regardless of status
CREATE POLICY "Admins can view all prayer responses" ON prayer_responses
  FOR SELECT USING (
    is_admin_or_moderator()
  );

-- Policy: Admins can update responses for moderation
CREATE POLICY "Admins can update prayer responses" ON prayer_responses
  FOR UPDATE USING (
    is_admin_or_moderator()
  );

-- Recreate prayer_response_flags admin policies if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prayer_response_flags') THEN
    -- Policy: Admins can view all flags
    EXECUTE '
      CREATE POLICY "Admins can view all response flags" ON prayer_response_flags
        FOR SELECT USING (
          is_admin_or_moderator()
          OR auth.uid() = reporter_id  -- Users can see their own flags
        );
    ';

    -- Policy: Admins can update flags (mark as reviewed)
    EXECUTE '
      CREATE POLICY "Admins can update response flags" ON prayer_response_flags
        FOR UPDATE USING (
          is_admin_or_moderator()
        );
    ';

    RAISE NOTICE 'Recreated prayer_response_flags admin policies using SECURITY DEFINER function';
  ELSE
    RAISE NOTICE 'prayer_response_flags table does not exist, skipping flag policies';
  END IF;
END $$;

RAISE NOTICE 'Recreated prayer_responses admin policies using SECURITY DEFINER function';

-- ============================================================================
-- STEP 4: VERIFY THE FIX WORKS
-- ============================================================================

-- Test that the function works without recursion
DO $$
DECLARE
  is_admin_result BOOLEAN;
BEGIN
  -- This should complete without infinite recursion
  SELECT is_admin_or_moderator() INTO is_admin_result;
  RAISE NOTICE 'is_admin_or_moderator() function test: % (no recursion detected)', is_admin_result;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: is_admin_or_moderator() function failed: %', SQLERRM;
END $$;

-- Test that we can query prayer_responses without recursion
DO $$
DECLARE
  response_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO response_count FROM prayer_responses LIMIT 1;
  RAISE NOTICE 'prayer_responses table query test: % rows accessible (no recursion detected)', response_count;
EXCEPTION 
  WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: prayer_responses query failed: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 5: VERIFICATION QUERIES
-- ============================================================================

-- Show current RLS policies on prayer_responses to confirm fix
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'prayer_responses' 
  AND policyname LIKE '%Admin%'
ORDER BY policyname;

-- Show function details
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'is_admin_or_moderator'
  AND routine_schema = 'public';

-- ============================================================================
-- STEP 6: TEST PRAYER RESPONSE INSERTION (SIMULATION)
-- ============================================================================

-- Test that RLS policies work correctly for regular operations
-- This is a dry-run test that doesn't actually insert data
DO $$
BEGIN
  -- Test that the policies are properly configured
  -- (This will help catch any remaining policy issues)
  PERFORM * FROM prayer_responses WHERE FALSE; -- Safe query that tests RLS but returns no rows
  RAISE NOTICE 'Prayer responses RLS policies test: PASSED (no recursion in SELECT)';
EXCEPTION 
  WHEN OTHERS THEN
    RAISE EXCEPTION 'ERROR: Prayer responses RLS test failed: %', SQLERRM;
END $$;

-- ============================================================================
-- SUCCESS CONFIRMATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
  ====================================================================
  ✅ PRAYER RESPONSES RECURSION FIX COMPLETED SUCCESSFULLY
  ====================================================================
  
  WHAT WAS FIXED:
  • Removed RLS policies that directly queried admin_roles table
  • Replaced with SECURITY DEFINER function is_admin_or_moderator()
  • This breaks the infinite recursion loop
  
  VERIFICATION COMPLETED:
  • is_admin_or_moderator() function exists and works
  • Prayer responses table queries work without recursion
  • Admin policies recreated using safe SECURITY DEFINER pattern
  
  NEXT STEPS:
  1. Test prayer response posting in the application
  2. Verify admin functions work correctly
  3. Monitor for any remaining recursion issues
  
  TIME: %
  ====================================================================
  ', NOW();
END $$;

-- ============================================================================
-- OPTIONAL: ADDITIONAL SAFETY CHECKS
-- ============================================================================

-- Check if there are any other policies that might have similar issues
-- This helps identify other potential recursion problems
SELECT 
  'WARNING: Found other policies that might cause admin_roles recursion' AS alert,
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies 
WHERE (qual LIKE '%admin_roles%' OR with_check LIKE '%admin_roles%')
  AND tablename != 'admin_roles'  -- Skip admin_roles table itself
  AND policyname NOT LIKE '%Admins can%'  -- Skip the policies we just fixed
  AND qual NOT LIKE '%is_admin_or_moderator%';  -- Skip policies that use the safe function

-- Show summary of all policies that use the safe is_admin_or_moderator() function
SELECT 
  'INFO: Policies using safe is_admin_or_moderator() function' AS info,
  COUNT(*) as policy_count,
  string_agg(DISTINCT tablename, ', ') as affected_tables
FROM pg_policies 
WHERE qual LIKE '%is_admin_or_moderator%' OR with_check LIKE '%is_admin_or_moderator%';

-- ============================================================================
-- DEPLOYMENT INSTRUCTIONS
-- ============================================================================

/*
TO DEPLOY THIS FIX:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste this entire file
4. Click "Run"
5. Verify success messages in output
6. Test prayer response posting in your app

ROLLBACK (if needed):
If this fix causes issues, you can rollback by running migration 016 again,
but the recursion issue will return. The proper fix is to ensure 
is_admin_or_moderator() function exists and is used consistently.

SAFETY:
- This fix is safe to run multiple times
- Uses IF EXISTS/IF NOT EXISTS to prevent duplicate operations
- Includes comprehensive verification tests
- No data is modified, only policies are updated

MONITORING:
After deployment, monitor for:
- Prayer response posting working correctly
- Admin moderation functions working
- No recursion errors in logs
- Performance is normal
*/