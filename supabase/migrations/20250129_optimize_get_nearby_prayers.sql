-- =====================================================================================
-- PRAYERMAP: ADD LIMIT PARAMETER TO get_nearby_prayers FUNCTION
-- =====================================================================================
--
-- Enhancement: Add optional limit_count parameter for server-side result limiting
-- This improves mobile performance by reducing data transfer for nearby prayer queries.
--
-- Changes:
-- - Add limit_count parameter with default value of 500
-- - Add LIMIT clause to SELECT query
-- - Maintains backwards compatibility (default parameter)
--
-- Performance Impact:
-- BEFORE: Database returns ALL prayers in radius → Potentially thousands on mobile
-- AFTER:  Database returns only requested number → Optimized data transfer
--
-- Context:
-- While get_nearby_prayers is deprecated in favor of the global living map approach,
-- it's still used in the codebase and needs optimization for mobile performance.
--
-- Backwards Compatibility:
-- ✅ Fully backwards compatible via default parameter value
-- ✅ Existing calls without parameters still work (returns 500 prayers)
-- ✅ No breaking changes to existing code
--
-- Rollback Instructions:
-- To rollback, restore the previous version without the limit_count parameter
-- (see migration 007_fix_location_format.sql)
--
-- =====================================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

-- Recreate with limit_count parameter for mobile performance
CREATE OR REPLACE FUNCTION get_nearby_prayers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 50,
  limit_count INTEGER DEFAULT 500  -- NEW: Server-side limiting for mobile performance
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
  ORDER BY p.created_at DESC
  LIMIT limit_count;  -- NEW: Server-side limiting
$$;

-- Grant execute permissions for all parameter combinations
GRANT EXECUTE ON FUNCTION get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon;

-- Also grant for backward compatibility (without limit parameter)
GRANT EXECUTE ON FUNCTION get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearby_prayers(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- The get_nearby_prayers function now supports an optional limit_count parameter:
-- - Default: 500 prayers (if no parameter provided)
-- - Backwards compatible: Can still call get_nearby_prayers(lat, lng, radius_km)
-- - Performance: Reduces data transfer for mobile clients
--
-- Example usage:
--   SELECT * FROM get_nearby_prayers(42.3314, -83.0458, 100);        -- Default 500 limit
--   SELECT * FROM get_nearby_prayers(42.3314, -83.0458, 100, 200);   -- Custom 200 limit
--   SELECT * FROM get_nearby_prayers(42.3314, -83.0458, 100, 1000);  -- Max 1000 limit
--
-- Testing checklist:
-- [ ] Test without limit parameter: SELECT COUNT(*) FROM get_nearby_prayers(42.3314, -83.0458, 50);
-- [ ] Test with limit parameter: SELECT COUNT(*) FROM get_nearby_prayers(42.3314, -83.0458, 50, 100);
-- [ ] Verify existing TypeScript service calls work without changes
-- [ ] Check mobile app performance improvement
--
-- Performance Notes:
-- - Default limit of 500 is conservative for mobile performance
-- - Can be adjusted based on real-world usage patterns
-- - Consider adding limit parameter to TypeScript service for finer control
-- =====================================================================================
