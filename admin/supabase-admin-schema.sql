-- ============================================================================
-- PrayerMap Admin Dashboard - Database Schema
-- ============================================================================
-- This file contains all the database objects needed for the admin dashboard.
-- Run this in the Supabase SQL Editor after the main schema is set up.
-- ============================================================================

-- ============================================================================
-- 1. ADMIN ROLES TABLE
-- ============================================================================
-- Stores admin user roles (admin, moderator, analyst)

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'analyst')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Policies for admin_roles table
CREATE POLICY "Admins can view all admin roles"
  ON public.admin_roles FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role = 'admin')
  );

CREATE POLICY "Admins can create admin roles"
  ON public.admin_roles FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role = 'admin')
  );

CREATE POLICY "Admins can delete admin roles"
  ON public.admin_roles FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role = 'admin')
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);

-- ============================================================================
-- 2. AUDIT LOGS TABLE
-- ============================================================================
-- Tracks all admin actions for accountability

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for audit_logs table
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role IN ('admin', 'moderator', 'analyst'))
  );

CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role IN ('admin', 'moderator'))
  );

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ============================================================================
-- 3. UPDATE EXISTING RLS POLICIES FOR ADMIN ACCESS
-- ============================================================================

-- Drop existing select policy on prayers if it exists (to recreate with admin support)
DROP POLICY IF EXISTS "Anyone can view prayers" ON public.prayers;
DROP POLICY IF EXISTS "Users can view all prayers" ON public.prayers;
DROP POLICY IF EXISTS "Admins can view all prayers" ON public.prayers;
DROP POLICY IF EXISTS "Admins can update any prayer" ON public.prayers;
DROP POLICY IF EXISTS "Admins can delete any prayer" ON public.prayers;

-- Prayers: Anyone can view (for the public app) + Admins get full access
CREATE POLICY "Anyone can view prayers"
  ON public.prayers FOR SELECT
  USING (true);

CREATE POLICY "Admins can update any prayer"
  ON public.prayers FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can delete any prayer"
  ON public.prayers FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role = 'admin')
  );

-- Drop and recreate profiles policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Profiles: Public view + Admin full access
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role = 'admin')
  );

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to check a user's admin role (bypasses RLS for auth checks)
-- This is needed because RLS on admin_roles would create a circular dependency
CREATE OR REPLACE FUNCTION check_user_admin_role(check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.admin_roles
  WHERE user_id = check_user_id;

  RETURN user_role;  -- Returns NULL if not found, or the role if found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_admin_role(UUID) TO authenticated;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user has any admin role
CREATE OR REPLACE FUNCTION has_admin_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator', 'analyst')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. ADMIN DATA ACCESS FUNCTIONS
-- ============================================================================

-- Function to get all prayers with user info (for admin dashboard)
CREATE OR REPLACE FUNCTION get_all_prayers_admin(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  title TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_anonymous BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  total BIGINT;
BEGIN
  -- Check if user has admin access
  IF NOT has_admin_access() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total
  FROM public.prayers p
  WHERE p_search IS NULL
    OR p.title ILIKE '%' || p_search || '%'
    OR p.content ILIKE '%' || p_search || '%';

  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    u.email::TEXT as user_email,
    pr.display_name as user_name,
    p.title,
    p.content,
    p.content_type,
    p.media_url,
    ST_Y(p.location::geometry) as latitude,
    ST_X(p.location::geometry) as longitude,
    p.is_anonymous,
    p.created_at,
    p.updated_at,
    total as total_count
  FROM public.prayers p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.profiles pr ON p.user_id = pr.id
  WHERE p_search IS NULL
    OR p.title ILIKE '%' || p_search || '%'
    OR p.content ILIKE '%' || p_search || '%'
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users (for admin dashboard)
CREATE OR REPLACE FUNCTION get_all_users_admin(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in TIMESTAMPTZ,
  prayer_count BIGINT,
  is_admin BOOLEAN,
  admin_role TEXT,
  total_count BIGINT
) AS $$
DECLARE
  total BIGINT;
BEGIN
  -- Check if user has admin access
  IF NOT has_admin_access() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total
  FROM auth.users u
  LEFT JOIN public.profiles pr ON u.id = pr.id
  WHERE p_search IS NULL
    OR u.email ILIKE '%' || p_search || '%'
    OR pr.display_name ILIKE '%' || p_search || '%';

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    pr.display_name,
    pr.avatar_url,
    u.created_at,
    u.last_sign_in_at as last_sign_in,
    COALESCE(pc.count, 0) as prayer_count,
    ar.user_id IS NOT NULL as is_admin,
    ar.role as admin_role,
    total as total_count
  FROM auth.users u
  LEFT JOIN public.profiles pr ON u.id = pr.id
  LEFT JOIN public.admin_roles ar ON u.id = ar.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count FROM public.prayers WHERE user_id = u.id
  ) pc ON true
  WHERE p_search IS NULL
    OR u.email ILIKE '%' || p_search || '%'
    OR pr.display_name ILIKE '%' || p_search || '%'
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard stats
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_prayers BIGINT,
  total_users BIGINT,
  prayers_today BIGINT,
  prayers_this_week BIGINT,
  new_users_today BIGINT,
  new_users_this_week BIGINT
) AS $$
BEGIN
  -- Check if user has admin access
  IF NOT has_admin_access() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.prayers)::BIGINT as total_prayers,
    (SELECT COUNT(*) FROM auth.users)::BIGINT as total_users,
    (SELECT COUNT(*) FROM public.prayers WHERE created_at >= CURRENT_DATE)::BIGINT as prayers_today,
    (SELECT COUNT(*) FROM public.prayers WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as prayers_this_week,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE)::BIGINT as new_users_today,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as new_users_this_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. ADMIN MUTATION FUNCTIONS
-- ============================================================================

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (admin_id, action, table_name, record_id, old_values, new_values)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_values, p_new_values)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update prayer (admin)
CREATE OR REPLACE FUNCTION update_prayer_admin(
  p_prayer_id UUID,
  p_title TEXT DEFAULT NULL,
  p_content TEXT DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  old_prayer RECORD;
  updated_prayer RECORD;
BEGIN
  -- Check if user is admin or moderator
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  -- Get old values for audit log
  SELECT * INTO old_prayer FROM public.prayers WHERE id = p_prayer_id;

  IF old_prayer IS NULL THEN
    RAISE EXCEPTION 'Prayer not found';
  END IF;

  -- Update the prayer
  UPDATE public.prayers
  SET
    title = COALESCE(p_title, title),
    content = COALESCE(p_content, content),
    location = CASE
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
      ELSE location
    END,
    updated_at = NOW()
  WHERE id = p_prayer_id
  RETURNING * INTO updated_prayer;

  -- Log the action
  PERFORM log_admin_action(
    'update_prayer',
    'prayers',
    p_prayer_id,
    row_to_json(old_prayer)::jsonb,
    row_to_json(updated_prayer)::jsonb
  );

  RETURN row_to_json(updated_prayer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete prayer (admin only)
CREATE OR REPLACE FUNCTION delete_prayer_admin(p_prayer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  old_prayer RECORD;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get old values for audit log
  SELECT * INTO old_prayer FROM public.prayers WHERE id = p_prayer_id;

  IF old_prayer IS NULL THEN
    RAISE EXCEPTION 'Prayer not found';
  END IF;

  -- Delete the prayer
  DELETE FROM public.prayers WHERE id = p_prayer_id;

  -- Log the action
  PERFORM log_admin_action(
    'delete_prayer',
    'prayers',
    p_prayer_id,
    row_to_json(old_prayer)::jsonb,
    NULL
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile (admin only)
CREATE OR REPLACE FUNCTION update_user_admin(
  p_user_id UUID,
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  old_profile RECORD;
  updated_profile RECORD;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get old values for audit log
  SELECT * INTO old_profile FROM public.profiles WHERE id = p_user_id;

  IF old_profile IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Update the profile
  UPDATE public.profiles
  SET
    display_name = COALESCE(p_display_name, display_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO updated_profile;

  -- Log the action
  PERFORM log_admin_action(
    'update_user',
    'profiles',
    p_user_id,
    row_to_json(old_profile)::jsonb,
    row_to_json(updated_profile)::jsonb
  );

  RETURN row_to_json(updated_profile);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. GRANT YOUR USER ADMIN ACCESS
-- ============================================================================
-- After running this schema, run the following to make yourself an admin:
--
-- First, find your user_id by running:
-- SELECT id, email FROM auth.users WHERE email = 'jeff.michael.johnson@gmail.com';
--
-- Then insert your admin role:
-- INSERT INTO public.admin_roles (user_id, role)
-- VALUES ('YOUR_USER_ID_HERE', 'admin');
--
-- Example (replace with actual UUID):
-- INSERT INTO public.admin_roles (user_id, role)
-- VALUES ('12345678-1234-1234-1234-123456789012', 'admin');
-- ============================================================================
