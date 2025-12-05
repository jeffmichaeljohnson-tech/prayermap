-- Fix infinite recursion in admin_roles RLS policies
-- Root cause: is_admin() and is_admin_or_moderator() query admin_roles,
-- but admin_roles RLS policies use these same functions, causing infinite recursion.
-- Solution: Use SECURITY DEFINER to bypass RLS when checking admin status.
-- Applied: 2025-12-05

-- Step 1: Drop admin_roles RLS policies first (to clean up duplicates)
DROP POLICY IF EXISTS "Anyone can check admin status" ON admin_roles;
DROP POLICY IF EXISTS "Admins can read admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can insert admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can update admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can delete admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can create admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can view all admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Users can check own admin status" ON admin_roles;

-- Step 2: Recreate functions with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
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

CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    ),
    false
  );
$$;

-- Step 3: Recreate clean admin_roles RLS policies
CREATE POLICY "Users can check own admin status"
  ON admin_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all admin roles"
  ON admin_roles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert admin roles"
  ON admin_roles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update admin roles"
  ON admin_roles FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete admin roles"
  ON admin_roles FOR DELETE
  USING (is_admin());

-- Step 4: Clean up audit_logs policies
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin_or_moderator());

CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (is_admin_or_moderator());
