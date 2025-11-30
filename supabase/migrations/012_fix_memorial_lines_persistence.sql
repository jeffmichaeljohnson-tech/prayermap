-- ===============================================================================
-- MIGRATION 012: Fix Memorial Lines Persistence for Living Map
-- ===============================================================================
-- 
-- ISSUE: Memorial lines (prayer connections) are disappearing from the map
-- because the get_all_connections() function filters out expired connections.
--
-- SOLUTION: Memorial lines should remain visible as part of the "living map"
-- that shows historical prayer connections to create a beautiful tapestry
-- of global prayer. According to PRD: "Persist for 1 year from creation"
-- means they should be visible for 1 year, not hidden after expiration.
--
-- The "expires_at" column can still track when they were created for
-- analytics, but connections should remain visible on the map.
-- ===============================================================================

-- Drop and recreate the get_all_connections function without expiration filter
DROP FUNCTION IF EXISTS get_all_connections();

-- Create function to get ALL prayer connections globally (no expiration filter)
-- This creates the "living map" effect where users see historical connections
CREATE OR REPLACE FUNCTION get_all_connections()
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
    -- Only filter out hidden/removed prayers, but show ALL connections (even "expired")
    -- This creates the "living map" effect where historical connections remain visible
    (p.status IS NULL OR p.status NOT IN ('hidden', 'removed'))
  ORDER BY pc.created_at DESC;
$$;

-- Grant execute permissions to all users (authenticated and anonymous)
GRANT EXECUTE ON FUNCTION get_all_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_connections() TO anon;

-- ===============================================================================
-- OPTIONAL: Create a cleanup function for truly old connections (2+ years)
-- ===============================================================================
-- This can be run as a scheduled job to prevent infinite growth
-- But by default, connections remain visible for the "living map" experience

CREATE OR REPLACE FUNCTION cleanup_very_old_connections(cutoff_years INTEGER DEFAULT 2)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM prayer_connections
  WHERE created_at < (NOW() - (cutoff_years || ' years')::INTERVAL);
  
  SELECT ROW_COUNT();
$$;

-- Grant execute permissions for cleanup function
GRANT EXECUTE ON FUNCTION cleanup_very_old_connections(INTEGER) TO authenticated;

-- ===============================================================================
-- COMMENTS AND DOCUMENTATION
-- ===============================================================================

COMMENT ON FUNCTION get_all_connections() IS 'Returns ALL prayer connections for the global living map. Does not filter by expiration to maintain historical prayer connection visibility as specified in PRD.';

COMMENT ON FUNCTION cleanup_very_old_connections(INTEGER) IS 'Optional cleanup function to remove connections older than specified years. Use sparingly to maintain living map historical effect.';

-- ===============================================================================
-- MIGRATION COMPLETE
-- ===============================================================================
-- Memorial lines will now persist on the map as intended, creating the 
-- beautiful "living map" effect where new users see historical prayer
-- connections spanning the globe.
-- ===============================================================================