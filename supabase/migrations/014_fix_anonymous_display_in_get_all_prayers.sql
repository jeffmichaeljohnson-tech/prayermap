-- =====================================================================================
-- PRAYERMAP: FIX ANONYMOUS DISPLAY LOGIC IN get_all_prayers FUNCTION
-- =====================================================================================
--
-- Issue: The get_all_prayers function was returning user_name directly instead of 
-- checking the is_anonymous flag to hide user identity when needed.
--
-- This migration fixes the function to properly respect the is_anonymous field
-- by returning NULL for user_name when is_anonymous is true, matching the behavior
-- of the original get_prayers_within_radius function.
--
-- =====================================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_all_prayers();

-- Create updated function with proper anonymous handling
CREATE OR REPLACE FUNCTION get_all_prayers()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  location TEXT,  -- Return as text POINT format, not geography
  user_name TEXT,
  is_anonymous BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.content_type::TEXT,
    p.media_url,
    ST_AsText(p.location::geometry) as location,  -- Convert to POINT(lng lat) text
    -- FIXED: Respect is_anonymous flag - return NULL for user_name when anonymous
    CASE
      WHEN p.is_anonymous THEN NULL
      ELSE p.user_name
    END as user_name,
    p.is_anonymous,
    p.created_at,
    p.updated_at,
    p.status
  FROM prayers p
  WHERE
    -- Filter out only hidden/removed prayers (moderated content)
    (p.status IS NULL OR p.status NOT IN ('hidden', 'removed'))
    -- Users can see their own prayers regardless of status
    OR p.user_id = auth.uid()
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permissions to all users (authenticated and anonymous)
GRANT EXECUTE ON FUNCTION get_all_prayers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers() TO anon;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- The get_all_prayers function now properly respects the is_anonymous field:
-- - When is_anonymous = true: user_name is NULL (displays as "Anonymous" in frontend)
-- - When is_anonymous = false: user_name is returned (displays actual name)
-- This matches the behavior users expect when they toggle the anonymous option.
-- =====================================================================================