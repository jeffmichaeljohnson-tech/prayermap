-- ============================================================================
-- PrayerMap: Prayer Expiration & Archiving System
-- ============================================================================
-- This migration adds:
-- 1. Expiration fields to prayers table
-- 2. app_settings table for configurable values
-- 3. Admin functions for managing archived prayers
-- ============================================================================

-- ============================================================================
-- 1. ADD EXPIRATION FIELDS TO PRAYERS
-- ============================================================================

-- Add expiration fields to prayers
ALTER TABLE public.prayers
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.prayers.expires_at IS 'When the prayer will expire (default 30 days from creation)';
COMMENT ON COLUMN public.prayers.archived_at IS 'When the prayer was archived (null = not archived)';
COMMENT ON COLUMN public.prayers.archive_reason IS 'Why the prayer was archived (e.g., expired, moderation, user_deleted)';

-- Set default expiration for new prayers (30 days)
-- Note: We don't use ALTER COLUMN SET DEFAULT as it won't work with dynamic expressions
-- Instead, we'll handle this with a trigger

-- Update existing prayers to have expiration (30 days from creation)
UPDATE public.prayers
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL AND archived_at IS NULL;

-- Create index for finding expired prayers efficiently
CREATE INDEX IF NOT EXISTS idx_prayers_expires_at 
ON public.prayers(expires_at) 
WHERE archived_at IS NULL;

-- Create index for finding archived prayers
CREATE INDEX IF NOT EXISTS idx_prayers_archived_at 
ON public.prayers(archived_at DESC) 
WHERE archived_at IS NOT NULL;

-- ============================================================================
-- 2. CREATE APP_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Add comments
COMMENT ON TABLE public.app_settings IS 'Configurable application settings managed by admins';
COMMENT ON COLUMN public.app_settings.key IS 'Unique setting identifier';
COMMENT ON COLUMN public.app_settings.value IS 'Setting value stored as JSONB';
COMMENT ON COLUMN public.app_settings.description IS 'Human-readable description of the setting';

-- Insert default settings
INSERT INTO public.app_settings (key, value, description) 
VALUES 
  ('prayer_expiration_days', '30', 'Number of days before a prayer expires and is archived'),
  ('memorial_line_duration_days', '365', 'Number of days memorial lines persist on the map')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_settings (admin only)
DROP POLICY IF EXISTS "Admins can view settings" ON public.app_settings;
CREATE POLICY "Admins can view settings"
ON public.app_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator', 'analyst')
  )
);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.app_settings;
CREATE POLICY "Admins can manage settings"
ON public.app_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- 3. TRIGGER FOR DEFAULT EXPIRATION ON NEW PRAYERS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_prayer_expiration()
RETURNS TRIGGER AS $$
DECLARE
  expiration_days INTEGER;
BEGIN
  -- Get the configured expiration days (default to 30 if not set)
  SELECT COALESCE((value)::integer, 30) INTO expiration_days
  FROM public.app_settings
  WHERE key = 'prayer_expiration_days';
  
  IF expiration_days IS NULL THEN
    expiration_days := 30;
  END IF;
  
  -- Set expires_at if not already set
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + (expiration_days || ' days')::interval;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new prayers
DROP TRIGGER IF EXISTS trigger_set_prayer_expiration ON public.prayers;
CREATE TRIGGER trigger_set_prayer_expiration
BEFORE INSERT ON public.prayers
FOR EACH ROW
EXECUTE FUNCTION set_prayer_expiration();

-- ============================================================================
-- 4. VIEW FOR EXPIRED PRAYERS (not yet archived)
-- ============================================================================

CREATE OR REPLACE VIEW public.expired_prayers AS
SELECT * FROM public.prayers
WHERE expires_at < NOW()
AND archived_at IS NULL;

COMMENT ON VIEW public.expired_prayers IS 'View of prayers that have expired but not yet archived';

-- ============================================================================
-- 5. UPDATE get_prayers_in_bounds TO EXCLUDE ARCHIVED
-- ============================================================================

-- Drop and recreate the function to exclude archived prayers
CREATE OR REPLACE FUNCTION public.get_prayers_in_bounds(
  min_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_anonymous BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  support_count INTEGER,
  response_count INTEGER,
  poster_name TEXT,
  poster_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.content_type,
    p.media_url,
    ST_Y(p.location::geometry) as latitude,
    ST_X(p.location::geometry) as longitude,
    p.is_anonymous,
    p.created_at,
    p.updated_at,
    COALESCE(p.support_count, 0) as support_count,
    COALESCE(p.response_count, 0) as response_count,
    CASE 
      WHEN p.is_anonymous THEN NULL
      ELSE pr.display_name
    END as poster_name,
    CASE 
      WHEN p.is_anonymous THEN NULL
      ELSE pr.avatar_url
    END as poster_avatar
  FROM public.prayers p
  LEFT JOIN public.profiles pr ON p.user_id = pr.id
  WHERE 
    p.archived_at IS NULL  -- Exclude archived prayers
    AND ST_Y(p.location::geometry) BETWEEN min_lat AND max_lat
    AND ST_X(p.location::geometry) BETWEEN min_lng AND max_lng
  ORDER BY p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 6. ADMIN FUNCTIONS FOR ARCHIVED PRAYERS
-- ============================================================================

-- Function to get archived prayers for admin dashboard
CREATE OR REPLACE FUNCTION get_archived_prayers_admin(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_archive_reason TEXT DEFAULT NULL
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
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  archive_reason TEXT,
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
  WHERE p.archived_at IS NOT NULL
    AND (p_search IS NULL 
         OR p.title ILIKE '%' || p_search || '%' 
         OR p.content ILIKE '%' || p_search || '%')
    AND (p_archive_reason IS NULL OR p.archive_reason = p_archive_reason);

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
    p.expires_at,
    p.archived_at,
    p.archive_reason,
    total as total_count
  FROM public.prayers p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.profiles pr ON p.user_id = pr.id
  WHERE p.archived_at IS NOT NULL
    AND (p_search IS NULL 
         OR p.title ILIKE '%' || p_search || '%' 
         OR p.content ILIKE '%' || p_search || '%')
    AND (p_archive_reason IS NULL OR p.archive_reason = p_archive_reason)
  ORDER BY p.archived_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore an archived prayer
CREATE OR REPLACE FUNCTION restore_prayer_admin(
  p_prayer_id UUID,
  p_new_expiration_days INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  old_prayer RECORD;
  updated_prayer RECORD;
  expiration_days INTEGER;
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

  IF old_prayer.archived_at IS NULL THEN
    RAISE EXCEPTION 'Prayer is not archived';
  END IF;

  -- Get expiration days (use provided value or default from settings)
  IF p_new_expiration_days IS NOT NULL THEN
    expiration_days := p_new_expiration_days;
  ELSE
    SELECT COALESCE((value)::integer, 30) INTO expiration_days
    FROM public.app_settings
    WHERE key = 'prayer_expiration_days';
    
    IF expiration_days IS NULL THEN
      expiration_days := 30;
    END IF;
  END IF;

  -- Restore the prayer
  UPDATE public.prayers
  SET
    archived_at = NULL,
    archive_reason = NULL,
    expires_at = NOW() + (expiration_days || ' days')::interval,
    updated_at = NOW()
  WHERE id = p_prayer_id
  RETURNING * INTO updated_prayer;

  -- Log the action
  PERFORM log_admin_action(
    'restore_prayer',
    'prayers',
    p_prayer_id,
    row_to_json(old_prayer)::jsonb,
    row_to_json(updated_prayer)::jsonb
  );

  RETURN row_to_json(updated_prayer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually archive a prayer
CREATE OR REPLACE FUNCTION archive_prayer_admin(
  p_prayer_id UUID,
  p_reason TEXT DEFAULT 'manual'
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

  IF old_prayer.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Prayer is already archived';
  END IF;

  -- Archive the prayer
  UPDATE public.prayers
  SET
    archived_at = NOW(),
    archive_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_prayer_id
  RETURNING * INTO updated_prayer;

  -- Log the action
  PERFORM log_admin_action(
    'archive_prayer',
    'prayers',
    p_prayer_id,
    row_to_json(old_prayer)::jsonb,
    row_to_json(updated_prayer)::jsonb
  );

  RETURN row_to_json(updated_prayer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update app settings
CREATE OR REPLACE FUNCTION update_app_setting(
  p_key TEXT,
  p_value TEXT
)
RETURNS JSON AS $$
DECLARE
  old_setting RECORD;
  updated_setting RECORD;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get old value for audit log
  SELECT * INTO old_setting FROM public.app_settings WHERE key = p_key;

  -- Upsert the setting
  INSERT INTO public.app_settings (key, value, updated_at, updated_by)
  VALUES (p_key, p_value::jsonb, NOW(), auth.uid())
  ON CONFLICT (key) DO UPDATE
  SET 
    value = p_value::jsonb,
    updated_at = NOW(),
    updated_by = auth.uid()
  RETURNING * INTO updated_setting;

  -- Log the action
  PERFORM log_admin_action(
    'update_setting',
    'app_settings',
    NULL,
    COALESCE(row_to_json(old_setting)::jsonb, '{}'::jsonb),
    row_to_json(updated_setting)::jsonb
  );

  RETURN row_to_json(updated_setting);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get app settings
CREATE OR REPLACE FUNCTION get_app_settings()
RETURNS TABLE (
  key TEXT,
  value JSONB,
  description TEXT,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if user has admin access
  IF NOT has_admin_access() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT s.key, s.value, s.description, s.updated_at
  FROM public.app_settings s
  ORDER BY s.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get count of expired prayers pending archive
CREATE OR REPLACE FUNCTION get_expired_prayers_count()
RETURNS BIGINT AS $$
BEGIN
  -- Check if user has admin access
  IF NOT has_admin_access() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN (
    SELECT COUNT(*) 
    FROM public.prayers 
    WHERE expires_at < NOW() 
    AND archived_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. UPDATE ADMIN STATS TO INCLUDE ARCHIVE INFO
-- ============================================================================

DROP FUNCTION IF EXISTS get_admin_stats();
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_prayers BIGINT,
  active_prayers BIGINT,
  archived_prayers BIGINT,
  expired_pending BIGINT,
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
    (SELECT COUNT(*) FROM public.prayers WHERE archived_at IS NULL)::BIGINT as active_prayers,
    (SELECT COUNT(*) FROM public.prayers WHERE archived_at IS NOT NULL)::BIGINT as archived_prayers,
    (SELECT COUNT(*) FROM public.prayers WHERE expires_at < NOW() AND archived_at IS NULL)::BIGINT as expired_pending,
    (SELECT COUNT(*) FROM auth.users)::BIGINT as total_users,
    (SELECT COUNT(*) FROM public.prayers WHERE created_at >= CURRENT_DATE AND archived_at IS NULL)::BIGINT as prayers_today,
    (SELECT COUNT(*) FROM public.prayers WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND archived_at IS NULL)::BIGINT as prayers_this_week,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE)::BIGINT as new_users_today,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as new_users_this_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. UPDATE get_all_prayers_admin TO EXCLUDE ARCHIVED BY DEFAULT
-- ============================================================================

DROP FUNCTION IF EXISTS get_all_prayers_admin(INTEGER, INTEGER, TEXT);
CREATE OR REPLACE FUNCTION get_all_prayers_admin(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_include_archived BOOLEAN DEFAULT FALSE
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
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  archive_reason TEXT,
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
  WHERE (p_include_archived OR p.archived_at IS NULL)
    AND (p_search IS NULL
      OR p.title ILIKE '%' || p_search || '%'
      OR p.content ILIKE '%' || p_search || '%');

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
    p.expires_at,
    p.archived_at,
    p.archive_reason,
    total as total_count
  FROM public.prayers p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.profiles pr ON p.user_id = pr.id
  WHERE (p_include_archived OR p.archived_at IS NULL)
    AND (p_search IS NULL
      OR p.title ILIKE '%' || p_search || '%'
      OR p.content ILIKE '%' || p_search || '%')
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

