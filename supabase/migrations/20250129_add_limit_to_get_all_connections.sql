-- =====================================================================================
-- PRAYERMAP: ADD LIMIT PARAMETER TO get_all_connections FUNCTION
-- =====================================================================================
--
-- Enhancement: Add optional limit_count parameter for server-side result limiting
-- This improves mobile performance by reducing data transfer for prayer connections.
--
-- Changes:
-- - Add limit_count parameter with default value of 500
-- - Add LIMIT clause to SELECT query
-- - Maintains backwards compatibility (default parameter)
--
-- Background:
-- This follows the same pattern as the get_all_prayers limit enhancement.
-- Prayer connections can grow large over time, and mobile clients benefit from
-- server-side limiting to reduce network data transfer and battery usage.
--
-- =====================================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_all_connections();

-- Create updated function with limit_count parameter
CREATE OR REPLACE FUNCTION get_all_connections(limit_count INTEGER DEFAULT 500)
RETURNS TABLE (
  id UUID,
  prayer_id UUID,
  prayer_response_id UUID,
  from_location TEXT,
  to_location TEXT,
  requester_name TEXT,
  replier_name TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    pc.id,
    pc.prayer_id,
    NULL::UUID as prayer_response_id,  -- Column not in table, return NULL for compatibility
    ST_AsText(pc.from_location::geometry) as from_location,
    ST_AsText(pc.to_location::geometry) as to_location,
    COALESCE(from_profile.display_name, 'Anonymous') AS requester_name,
    COALESCE(to_profile.display_name, 'Anonymous') AS replier_name,
    pc.created_at,
    pc.expires_at
  FROM prayer_connections pc
  INNER JOIN prayers p ON pc.prayer_id = p.id
  LEFT JOIN profiles from_profile ON pc.from_user_id = from_profile.id
  LEFT JOIN profiles to_profile ON pc.to_user_id = to_profile.id
  WHERE
    -- Only show connections that haven't expired
    pc.expires_at > NOW()
    -- Only show connections for visible prayers (not moderated)
    AND (p.status IS NULL OR p.status NOT IN ('hidden', 'removed'))
  ORDER BY pc.created_at DESC
  LIMIT limit_count;  -- NEW: Server-side limiting
$$;

-- Grant execute permissions to all users (authenticated and anonymous)
GRANT EXECUTE ON FUNCTION get_all_connections(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_connections(INTEGER) TO anon;

-- Also grant for the no-parameter version (backwards compatibility)
GRANT EXECUTE ON FUNCTION get_all_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_connections() TO anon;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- The get_all_connections function now supports an optional limit_count parameter:
-- - Default: 500 connections (if no parameter provided)
-- - Backwards compatible: Can still call get_all_connections() without parameters
-- - Performance: Reduces data transfer for mobile clients viewing the living map
--
-- Example usage:
--   SELECT * FROM get_all_connections();         -- Returns up to 500 connections (default)
--   SELECT * FROM get_all_connections(1000);     -- Returns up to 1000 connections
--   SELECT * FROM get_all_connections(100);      -- Returns up to 100 connections
--
-- Performance Impact:
-- - Before: Database returns ALL non-expired connections (potentially thousands)
-- - After: Database returns only requested number of connections
-- - Benefit: Reduced network transfer, faster mobile app load, better battery life
--
-- Backwards Compatibility:
-- - ✅ Fully backwards compatible via default parameter
-- - ✅ Existing TypeScript code continues to work without changes
-- - ✅ Can immediately leverage the parameter for performance optimization
-- =====================================================================================
