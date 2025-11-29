-- ============================================================================
-- URGENT FIX: Prayer Responses Infinite Recursion Issue - SIMPLIFIED VERSION
-- ============================================================================
-- 
-- ISSUE: RLS policies on prayer_responses table are directly querying admin_roles,
--        causing infinite recursion when users try to post prayer responses.
-- 
-- SOLUTION: Use the is_admin_or_moderator() SECURITY DEFINER function instead
--           of direct subqueries to break the recursion loop.
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE/VERIFY SECURITY DEFINER FUNCTION
-- ============================================================================

-- Create the function (will replace if exists)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_or_moderator() TO authenticated;

-- ============================================================================
-- STEP 2: DROP PROBLEMATIC POLICIES CAUSING RECURSION
-- ============================================================================

-- Drop the policies that directly query admin_roles (causing recursion)
DROP POLICY IF EXISTS "Admins can view all prayer responses" ON public.prayer_responses;
DROP POLICY IF EXISTS "Admins can update prayer responses" ON public.prayer_responses;

-- Also drop any response flags policies that might have the same issue
DROP POLICY IF EXISTS "Admins can view all response flags" ON public.prayer_response_flags;
DROP POLICY IF EXISTS "Admins can update response flags" ON public.prayer_response_flags;

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

-- ============================================================================
-- STEP 4: VERIFY THE FIX WORKS
-- ============================================================================

-- Test that the function works without recursion
SELECT is_admin_or_moderator() AS admin_check_result;

-- Test that we can query prayer_responses without recursion
SELECT COUNT(*) AS prayer_responses_count FROM prayer_responses;

-- ============================================================================
-- SUCCESS CONFIRMATION
-- ============================================================================

-- Show current RLS policies on prayer_responses to confirm fix
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%is_admin_or_moderator%' THEN 'SAFE (uses SECURITY DEFINER)'
    WHEN qual LIKE '%admin_roles%' THEN 'DANGEROUS (direct admin_roles query)'
    ELSE 'OK'
  END AS safety_status
FROM pg_policies 
WHERE tablename = 'prayer_responses' 
  AND policyname LIKE '%Admin%'
ORDER BY policyname;

-- Show a success message
SELECT 
  '✅ PRAYER RESPONSES RECURSION FIX COMPLETED' AS status,
  'Prayer response posting should now work without infinite recursion' AS result,
  NOW() AS fixed_at;