-- =====================================================================================
-- PRAYERMAP: GLOBAL LIVING MAP MIGRATION
-- =====================================================================================
--
-- PrayerMap is a GLOBAL LIVING MAP where everyone sees ALL prayers from around the world.
-- This is not a local/nearby prayer map - it's a worldwide community prayer visualization.
--
-- Key principles:
-- 1. All users see all prayers globally (no radius/distance filtering)
-- 2. Only hidden/removed prayers are filtered out (moderation)
-- 3. Users can always see their own prayers regardless of status
-- 4. Admins/moderators see everything
--
-- This migration updates RLS policies and creates global query functions to support
-- the global living map vision.
-- =====================================================================================

-- =====================================================================================
-- 1. FIX RLS POLICY: Allow viewing ALL prayers (not just status='active')
-- =====================================================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Anyone can read active prayers" ON prayers;

-- Create new global policy that shows all prayers except moderated content
CREATE POLICY "Global living map - everyone sees all prayers"
ON prayers
FOR SELECT
USING (
  -- Legacy prayers without status (backward compatibility)
  status IS NULL
  -- Active prayers (the main case)
  OR status = 'active'
  -- Show everything except hidden/removed (moderated content)
  OR status NOT IN ('hidden', 'removed')
  -- Users always see their own prayers regardless of status
  OR auth.uid() = user_id
  -- Admins/moderators see everything for moderation purposes
  OR is_admin_or_moderator()
);

-- =====================================================================================
-- 2. SET DEFAULT STATUS: Ensure all new prayers default to 'active'
-- =====================================================================================

ALTER TABLE prayers
ALTER COLUMN status SET DEFAULT 'active';

-- =====================================================================================
-- 3. UPDATE EXISTING PRAYERS: Set NULL status to 'active' (data migration)
-- =====================================================================================

UPDATE prayers
SET status = 'active'
WHERE status IS NULL;

-- =====================================================================================
-- 4. CREATE GLOBAL PRAYER QUERY FUNCTION
-- =====================================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_all_prayers();

-- Create function to get ALL prayers globally (no radius filter)
-- Returns the same columns as get_nearby_prayers for consistency
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
    p.user_name,
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
-- 5. CREATE GLOBAL CONNECTIONS QUERY FUNCTION
-- =====================================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_all_connections();

-- Create function to get ALL prayer connections globally (not expired)
-- Returns columns matching what the frontend PrayerConnectionRow interface expects
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
    -- Only show connections that haven't expired
    pc.expires_at > NOW()
    -- Only show connections for visible prayers (not moderated)
    AND (p.status IS NULL OR p.status NOT IN ('hidden', 'removed'))
  ORDER BY pc.created_at DESC;
$$;

-- Grant execute permissions to all users (authenticated and anonymous)
GRANT EXECUTE ON FUNCTION get_all_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_connections() TO anon;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- PrayerMap is now configured as a GLOBAL LIVING MAP where:
-- - Everyone sees all prayers worldwide (no geographic restrictions)
-- - Only moderated content (hidden/removed) is filtered out
-- - New functions provide efficient global queries
-- - RLS policies ensure proper security while maintaining global visibility
-- =====================================================================================
