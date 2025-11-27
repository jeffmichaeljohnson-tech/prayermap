-- =====================================================================================
-- CREATE PRAYER FUNCTION
-- =====================================================================================
-- This function properly creates prayers with PostGIS geography from lat/lng coordinates
-- It handles the ST_MakePoint conversion server-side for reliable prayer creation
-- =====================================================================================

DROP FUNCTION IF EXISTS create_prayer(UUID, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION create_prayer(
  p_user_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_content_type TEXT DEFAULT 'text',
  p_content_url TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT 0,
  p_lng DOUBLE PRECISION DEFAULT 0,
  p_user_name TEXT DEFAULT NULL,
  p_is_anonymous BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  location TEXT,
  user_name TEXT,
  is_anonymous BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_prayer_id UUID;
BEGIN
  -- Insert the prayer with proper PostGIS geography
  INSERT INTO prayers (
    user_id,
    title,
    content,
    content_type,
    media_url,
    location,
    user_name,
    is_anonymous,
    status
  )
  VALUES (
    p_user_id,
    NULLIF(p_title, ''),
    p_content,
    p_content_type::content_type,
    NULLIF(p_content_url, ''),
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    NULLIF(p_user_name, ''),
    p_is_anonymous,
    'active'
  )
  RETURNING prayers.id INTO new_prayer_id;

  -- Return the created prayer in the same format as get_all_prayers
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.content_type::TEXT,
    p.media_url,
    ST_AsText(p.location::geometry) as location,
    p.user_name,
    p.is_anonymous,
    p.created_at,
    p.updated_at,
    p.status
  FROM prayers p
  WHERE p.id = new_prayer_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_prayer(UUID, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, BOOLEAN) TO authenticated;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
