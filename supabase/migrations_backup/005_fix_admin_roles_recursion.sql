-- ============================================================================
-- Fix admin_roles infinite recursion in RLS policies
-- ============================================================================
-- The problem: admin_roles policies query admin_roles, causing infinite recursion
-- The solution: Use a SECURITY DEFINER function to check admin status without RLS
-- ============================================================================

-- Step 1: Create a helper function that bypasses RLS to check admin status
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

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Step 2: Drop all existing policies on admin_roles
DROP POLICY IF EXISTS "Admins can read admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can insert admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can update admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can delete admin roles" ON admin_roles;

-- Step 3: Recreate policies using the SECURITY DEFINER functions
CREATE POLICY "Admins can read admin roles"
  ON admin_roles FOR SELECT
  USING (is_admin_or_moderator());

CREATE POLICY "Admins can insert admin roles"
  ON admin_roles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update admin roles"
  ON admin_roles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete admin roles"
  ON admin_roles FOR DELETE
  USING (is_admin());

-- Step 4: Fix audit_logs policies too (they have the same issue)
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON audit_logs;

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin_or_moderator());

CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (is_admin_or_moderator());

-- Step 5: Fix user_bans policies (they reference admin_roles directly)
DROP POLICY IF EXISTS "Admins can view all bans" ON user_bans;
DROP POLICY IF EXISTS "Admins can create bans" ON user_bans;
DROP POLICY IF EXISTS "Admins can update bans" ON user_bans;

CREATE POLICY "Admins can view all bans"
  ON user_bans FOR SELECT
  USING (is_admin_or_moderator());

CREATE POLICY "Admins can create bans"
  ON user_bans FOR INSERT
  WITH CHECK (is_admin_or_moderator());

CREATE POLICY "Admins can update bans"
  ON user_bans FOR UPDATE
  USING (is_admin_or_moderator());

-- Step 6: Fix prayer_flags policies if they exist
DROP POLICY IF EXISTS "Admins can view all flags" ON prayer_flags;
DROP POLICY IF EXISTS "Admins can delete flags" ON prayer_flags;

-- Recreate prayer_flags admin policies
CREATE POLICY "Admins can view all flags"
  ON prayer_flags FOR SELECT
  USING (
    is_admin_or_moderator()
    OR flagged_by = auth.uid()  -- Users can see their own flags
  );

CREATE POLICY "Admins can delete flags"
  ON prayer_flags FOR DELETE
  USING (is_admin_or_moderator());

-- Step 7: Grant execute on the helper functions
GRANT EXECUTE ON FUNCTION is_admin_or_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================================================
-- Verification: This should now work without recursion
-- ============================================================================
-- SELECT is_admin_or_moderator();
-- SELECT * FROM admin_roles LIMIT 1;
