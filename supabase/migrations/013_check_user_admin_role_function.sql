-- =====================================================================================
-- ADD check_user_admin_role FUNCTION
-- =====================================================================================
-- This function is used by the admin dashboard to check if a user has admin privileges
-- It accepts a user ID parameter (unlike is_admin_or_moderator which uses auth.uid())
-- =====================================================================================

DROP FUNCTION IF EXISTS check_user_admin_role(UUID);

CREATE OR REPLACE FUNCTION check_user_admin_role(check_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM admin_roles
  WHERE user_id = check_user_id
  LIMIT 1;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_user_admin_role(UUID) TO authenticated;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
