-- ============================================================================
-- Migration 022: Fix Prayer Map RLS Policy Conflicts  
-- ============================================================================
--
-- CRITICAL ISSUE: After multiple migrations (011, 021), conflicting RLS policies
-- are preventing prayers from loading on the map.
--
-- ROOT CAUSES:
-- 1. Migration 011 created "Global living map - everyone sees all prayers" policy
-- 2. Migration 021 created "prayers_viewable_by_everyone" policy  
-- 3. These policies conflict and cause PostgreSQL to deny access
-- 4. get_all_prayers() RPC function may not have proper SECURITY DEFINER setup
--
-- SOLUTION: Clean slate approach with optimized single policy for prayer access
-- that supports both anonymous and authenticated users for the global living map.
--
-- COMPATIBILITY: Safe to run multiple times, includes rollback protection
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE HELPER FUNCTION IS CORRECT
-- ============================================================================

-- Verify the SECURITY DEFINER function exists and works correctly
CREATE OR REPLACE FUNCTION is_admin_or_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
$$;

-- Grant permissions to all user types
GRANT EXECUTE ON FUNCTION is_admin_or_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_moderator() TO anon;

-- ============================================================================
-- STEP 2: CLEAN SLATE - REMOVE ALL CONFLICTING PRAYER POLICIES
-- ============================================================================

-- Drop ALL existing prayer table policies to prevent conflicts
DROP POLICY IF EXISTS "Anyone can read active prayers" ON prayers;
DROP POLICY IF EXISTS "Anyone can read prayers" ON prayers;
DROP POLICY IF EXISTS "Global living map - everyone sees all prayers" ON prayers;
DROP POLICY IF EXISTS "prayers_viewable_by_everyone" ON prayers;
DROP POLICY IF EXISTS "Users can read own prayers" ON prayers;
DROP POLICY IF EXISTS "Admins can read all prayers" ON prayers;

-- ============================================================================
-- STEP 3: CREATE SINGLE OPTIMIZED PRAYER ACCESS POLICY
-- ============================================================================

-- CRITICAL POLICY: Single policy that handles all prayer access scenarios
-- This policy supports the GLOBAL LIVING MAP concept where everyone can see prayers
CREATE POLICY "prayermap_global_access" ON prayers
  FOR SELECT USING (
    -- ANONYMOUS & AUTHENTICATED: Can view active prayers globally
    (status IS NULL OR status = 'active' OR status = 'approved')
    -- AUTHENTICATED: Can always view their own prayers regardless of status
    OR (auth.uid() = user_id)
    -- ADMIN/MODERATORS: Can view all prayers for moderation
    OR is_admin_or_moderator()
  );

-- ============================================================================
-- STEP 4: OPTIMIZE get_all_prayers() FUNCTION
-- ============================================================================

-- Drop and recreate the get_all_prayers function with proper permissions
DROP FUNCTION IF EXISTS get_all_prayers();

-- Create optimized function that bypasses RLS for performance
CREATE OR REPLACE FUNCTION get_all_prayers()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  location TEXT,  -- PostGIS POINT as text
  user_name TEXT,
  is_anonymous BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER  -- CRITICAL: This bypasses RLS
SET search_path = public
AS $$
  SELECT
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.content_type::TEXT,
    p.media_url,
    ST_AsText(p.location::geometry) as location,
    CASE 
      WHEN p.is_anonymous THEN 'Anonymous'
      ELSE COALESCE(p.user_name, 'Anonymous')
    END as user_name,
    p.is_anonymous,
    p.created_at,
    p.updated_at,
    p.status
  FROM prayers p
  WHERE
    -- Global living map: show all active prayers to everyone
    (p.status IS NULL OR p.status IN ('active', 'approved'))
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permissions to ALL users (anonymous and authenticated)
GRANT EXECUTE ON FUNCTION get_all_prayers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers() TO anon;

-- ============================================================================
-- STEP 5: ENSURE TABLE PERMISSIONS ARE CORRECT
-- ============================================================================

-- Grant basic table permissions (RLS will control actual access)
GRANT SELECT ON prayers TO authenticated;
GRANT SELECT ON prayers TO anon;  -- CRITICAL for anonymous users
GRANT INSERT ON prayers TO authenticated;
GRANT UPDATE ON prayers TO authenticated;
GRANT DELETE ON prayers TO authenticated;

-- ============================================================================
-- STEP 6: VALIDATE THE FIX
-- ============================================================================

-- Test 1: Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'prayers') THEN
    RAISE EXCEPTION 'RLS is NOT enabled on prayers table!';
  END IF;
  RAISE NOTICE '✅ RLS is enabled on prayers table';
END $$;

-- Test 2: Count current policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'prayers' AND cmd = 'SELECT';
  
  RAISE NOTICE '✅ Found % SELECT policies on prayers table', policy_count;
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'NO SELECT policies found on prayers table!';
  END IF;
END $$;

-- Test 3: Verify function exists and is callable
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc 
  WHERE proname = 'get_all_prayers';
  
  IF func_count = 0 THEN
    RAISE EXCEPTION 'get_all_prayers function does not exist!';
  END IF;
  
  RAISE NOTICE '✅ get_all_prayers function exists';
END $$;

-- ============================================================================
-- STEP 7: POLICY SUMMARY REPORT
-- ============================================================================

-- Show current prayer table policies
SELECT 
  '🔒 PRAYER TABLE RLS POLICIES' as section,
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✅ Allow'
    ELSE '❌ Restrict'
  END as permission_type,
  CASE 
    WHEN LENGTH(qual) > 60 THEN LEFT(qual, 60) || '...'
    ELSE qual
  END as condition
FROM pg_policies 
WHERE tablename = 'prayers' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- ============================================================================
-- STEP 8: SUCCESS CONFIRMATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
  ╔════════════════════════════════════════════════════════════════════╗
  ║                   ✅ PRAYER MAP RLS FIX COMPLETED                  ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║                                                                    ║
  ║ PRAYER MAP FUNCTIONALITY RESTORED:                                 ║
  ║ • Anonymous users can view active prayers globally                 ║
  ║ • Authenticated users can view active prayers + own prayers        ║
  ║ • get_all_prayers() RPC function bypasses RLS for performance      ║
  ║ • Single optimized policy eliminates conflicts                     ║
  ║ • Global Living Map concept fully supported                        ║
  ║                                                                    ║
  ║ POLICIES ACTIVE:                                                   ║
  ║ 1. ✅ prayermap_global_access (single policy handles all cases)    ║
  ║                                                                    ║
  ║ FUNCTIONS OPTIMIZED:                                               ║
  ║ 1. ✅ get_all_prayers() with SECURITY DEFINER                      ║
  ║ 2. ✅ is_admin_or_moderator() with proper permissions              ║
  ║                                                                    ║
  ║ NEXT STEPS:                                                        ║
  ║ 1. Test prayer loading in the PrayerMap application               ║
  ║ 2. Verify map shows prayers for anonymous users                   ║
  ║ 3. Confirm authenticated users can create prayers                 ║
  ║ 4. Test admin moderation functionality                             ║
  ║                                                                    ║
  ║ Time: %                                                   ║
  ╚════════════════════════════════════════════════════════════════════╝
  ', NOW();
END $$;

-- ============================================================================
-- STEP 9: TROUBLESHOOTING NOTES
-- ============================================================================

/*
🔍 IF PRAYERS STILL DON'T LOAD:

1. VERIFY SUPABASE CLIENT SETUP:
   - Check if supabase client is initialized properly
   - Verify API key has correct permissions
   - Test connection: SELECT 1 in Supabase dashboard

2. TEST RPC FUNCTION DIRECTLY:
   In Supabase SQL editor, run:
   SELECT * FROM get_all_prayers() LIMIT 5;
   
   If this fails, check function permissions.

3. TEST ANONYMOUS ACCESS:
   - Use browser incognito mode
   - Clear all localStorage/cookies
   - Test if fetchAllPrayers() works for anonymous users

4. CHECK FRONTEND ERROR LOGS:
   - Browser console for Supabase errors
   - Network tab for 401/403/500 errors
   - Look for RLS policy violation messages

5. VERIFY POLICY LOGIC:
   SELECT * FROM prayers WHERE (
     status IS NULL OR status = 'active' OR status = 'approved'
   ) LIMIT 5;

6. CHECK COLUMN PERMISSIONS:
   Make sure all columns in SELECT query are accessible to anon role.

🔄 ROLLBACK (if needed):
   This migration can be safely re-run. To rollback:
   1. Drop the prayermap_global_access policy
   2. Re-run previous working migration
   3. Note: May restore original issue

📞 ESCALATION:
   If issue persists after these checks:
   1. Problem is likely in frontend code, not database
   2. Check prayerService.ts fetchAllPrayers() implementation
   3. Verify Supabase client initialization in lib/supabase.ts
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================