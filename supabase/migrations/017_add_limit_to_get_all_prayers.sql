-- =====================================================================================
-- PRAYERMAP: ADD LIMIT PARAMETER TO get_all_prayers FUNCTION
-- =====================================================================================
--
-- Enhancement: Add optional limit_count parameter for server-side result limiting
-- This improves mobile performance by reducing data transfer.
--
-- Changes:
-- - Add limit_count parameter with default value of 1000
-- - Add LIMIT clause to SELECT query
-- - Maintains backwards compatibility (default parameter)
--
-- Performance Impact:
-- BEFORE: Database returns ALL prayers → Client-side slicing discards excess data
-- AFTER:  Database returns only requested number → Minimal data transfer
--
-- Backwards Compatibility:
-- ✅ Fully backwards compatible via default parameter value
-- ✅ Existing calls without parameters still work (returns 1000 prayers)
-- ✅ No breaking changes to existing code
--
-- Rollback Instructions:
-- To rollback, restore the previous version without the limit_count parameter
-- (see migration 014_fix_anonymous_display_in_get_all_prayers.sql)
--
-- =====================================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_all_prayers();

-- Create updated function with limit_count parameter
CREATE OR REPLACE FUNCTION get_all_prayers(limit_count INTEGER DEFAULT 1000)
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
    ST_AsText(p.location::geometry) as location,
    -- Respect is_anonymous flag - return NULL for user_name when anonymous
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
  ORDER BY p.created_at DESC
  LIMIT limit_count;  -- NEW: Server-side limiting
$$;

-- Grant execute permissions to all users (authenticated and anonymous)
GRANT EXECUTE ON FUNCTION get_all_prayers(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers(INTEGER) TO anon;

-- Also grant for the no-parameter version (backwards compatibility)
GRANT EXECUTE ON FUNCTION get_all_prayers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers() TO anon;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- The get_all_prayers function now supports an optional limit_count parameter:
-- - Default: 1000 prayers (if no parameter provided)
-- - Backwards compatible: Can still call get_all_prayers() without parameters
-- - Performance: Reduces data transfer for mobile clients
--
-- Example usage:
--   SELECT * FROM get_all_prayers();         -- Returns up to 1000 prayers (default)
--   SELECT * FROM get_all_prayers(500);      -- Returns up to 500 prayers
--   SELECT * FROM get_all_prayers(100);      -- Returns up to 100 prayers
--
-- Testing checklist:
-- [ ] Test without parameter: SELECT COUNT(*) FROM get_all_prayers();
-- [ ] Test with parameter: SELECT COUNT(*) FROM get_all_prayers(100);
-- [ ] Verify TypeScript service integration works
-- [ ] Check mobile app performance improvement
-- =====================================================================================
