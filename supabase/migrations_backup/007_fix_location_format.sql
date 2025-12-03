-- ============================================================================
-- Fix get_nearby_prayers to return location as text, not binary
-- ============================================================================
-- The function returns raw geography column which comes as WKB binary
-- We need to convert it to POINT(lng lat) text format that the frontend expects
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

-- Recreate with explicit column selection and ST_AsText for location
CREATE OR REPLACE FUNCTION get_nearby_prayers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  location TEXT,  -- Return as text, not geography
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
    p.user_name,
    p.is_anonymous,
    p.created_at,
    p.updated_at,
    p.status
  FROM prayers p
  WHERE ST_DWithin(
    p.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_km * 1000  -- Convert km to meters
  )
  AND (
    p.status = 'active'
    OR p.status IS NULL
  )
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;

-- ============================================================================
-- Verify by running:
-- SELECT * FROM get_nearby_prayers(42.3314, -83.0458, 100);
-- Should show location as "POINT(-83.0458 42.3314)" format
-- ============================================================================
