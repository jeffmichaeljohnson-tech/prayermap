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
CREATE OR REPLACE FUNCTION get_all_prayers()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  location geography,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  status text,
  is_anonymous boolean,
  user_display_name text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.content,
    p.location,
    ST_Y(p.location::geometry) as latitude,
    ST_X(p.location::geometry) as longitude,
    p.created_at,
    p.updated_at,
    p.status,
    p.is_anonymous,
    CASE
      WHEN p.is_anonymous THEN 'Anonymous'
      ELSE COALESCE(u.display_name, u.email, 'Unknown')
    END as user_display_name
  FROM prayers p
  LEFT JOIN auth.users u ON p.user_id = u.id
  WHERE
    -- Filter out only hidden/removed prayers (moderated content)
    (p.status IS NULL OR p.status NOT IN ('hidden', 'removed'))
    -- Users can see their own prayers regardless of status
    OR p.user_id = auth.uid()
  ORDER BY p.created_at DESC;
END;
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
CREATE OR REPLACE FUNCTION get_all_connections()
RETURNS TABLE (
  id uuid,
  from_prayer_id uuid,
  to_prayer_id uuid,
  user_id uuid,
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  from_location text,
  to_location text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.from_prayer_id,
    pc.to_prayer_id,
    pc.user_id,
    pc.created_at,
    pc.expires_at,
    ST_AsText(p1.location::geometry) as from_location,
    ST_AsText(p2.location::geometry) as to_location
  FROM prayer_connections pc
  INNER JOIN prayers p1 ON pc.from_prayer_id = p1.id
  INNER JOIN prayers p2 ON pc.to_prayer_id = p2.id
  WHERE
    -- Only show connections that haven't expired
    (pc.expires_at IS NULL OR pc.expires_at > NOW())
    -- Only show connections between visible prayers
    AND (p1.status IS NULL OR p1.status NOT IN ('hidden', 'removed'))
    AND (p2.status IS NULL OR p2.status NOT IN ('hidden', 'removed'))
  ORDER BY pc.created_at DESC;
END;
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
