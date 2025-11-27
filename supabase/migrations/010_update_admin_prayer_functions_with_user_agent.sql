-- ============================================================================
-- Update Admin Prayer Management Functions to Accept and Pass User Agent
-- ============================================================================
-- This migration updates the update_prayer_admin, delete_prayer_admin, and
-- update_user_admin functions to accept user_agent parameter
-- ============================================================================

-- Function to update prayer (admin)
CREATE OR REPLACE FUNCTION update_prayer_admin(
  p_prayer_id UUID,
  p_title TEXT DEFAULT NULL,
  p_content TEXT DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
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
  BEGIN
    PERFORM log_admin_action(
      'update_prayer',
      'prayers',
      p_prayer_id,
      row_to_json(old_prayer)::jsonb,
      row_to_json(updated_prayer)::jsonb,
      p_user_agent,
      NULL
    );
  EXCEPTION WHEN undefined_function THEN
    -- log_admin_action doesn't exist or has wrong signature, skip logging
    NULL;
  END;

  RETURN row_to_json(updated_prayer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete prayer (admin only)
CREATE OR REPLACE FUNCTION delete_prayer_admin(
  p_prayer_id UUID,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  old_prayer RECORD;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
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
  BEGIN
    PERFORM log_admin_action(
      'delete_prayer',
      'prayers',
      p_prayer_id,
      row_to_json(old_prayer)::jsonb,
      NULL,
      p_user_agent,
      NULL
    );
  EXCEPTION WHEN undefined_function THEN
    -- log_admin_action doesn't exist or has wrong signature, skip logging
    NULL;
  END;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile (admin only)
CREATE OR REPLACE FUNCTION update_user_admin(
  p_user_id UUID,
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  old_profile RECORD;
  updated_profile RECORD;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
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
  BEGIN
    PERFORM log_admin_action(
      'update_user',
      'profiles',
      p_user_id,
      row_to_json(old_profile)::jsonb,
      row_to_json(updated_profile)::jsonb,
      p_user_agent,
      NULL
    );
  EXCEPTION WHEN undefined_function THEN
    -- log_admin_action doesn't exist or has wrong signature, skip logging
    NULL;
  END;

  RETURN row_to_json(updated_profile);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_prayer_admin TO authenticated;
GRANT EXECUTE ON FUNCTION delete_prayer_admin TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_admin TO authenticated;
