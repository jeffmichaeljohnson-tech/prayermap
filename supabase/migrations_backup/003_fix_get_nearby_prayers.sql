-- ============================================================================
-- Fix get_nearby_prayers to work with new status column
-- ============================================================================

-- Update the get_nearby_prayers function to filter by status
-- This function needs to only return active prayers for the public

-- First, drop the old function signatures
DROP FUNCTION IF EXISTS get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
DROP FUNCTION IF EXISTS get_nearby_prayers(lat DOUBLE PRECISION, lng DOUBLE PRECISION, radius_km DOUBLE PRECISION);

-- Recreate with radius in kilometers and status filter
CREATE OR REPLACE FUNCTION get_nearby_prayers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 50
)
RETURNS SETOF prayers
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM prayers
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_km * 1000  -- Convert km to meters
  )
  AND (
    status = 'active'
    OR status IS NULL  -- Handle any prayers without status (shouldn't happen but defensive)
  )
  ORDER BY created_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;

-- ============================================================================
-- Verify by running:
-- SELECT * FROM get_nearby_prayers(37.7749, -122.4194, 50);
-- ============================================================================
