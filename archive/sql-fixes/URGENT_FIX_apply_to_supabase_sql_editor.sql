-- =====================================================================================
-- PRAYERMAP: FIX get_all_prayers FUNCTION SIGNATURE MISMATCH
-- =====================================================================================
--
-- PROBLEM: The recent fix_anonymous_display_manual migration (20251129150636) 
-- recreated the get_all_prayers function WITHOUT the limit_count parameter,
-- overriding migration 017 that added it. The TypeScript service expects 
-- the limit_count parameter but it doesn't exist in the current function.
--
-- SOLUTION: Recreate the function with BOTH fixes:
-- 1. Proper anonymous display handling 
-- 2. limit_count parameter support
--
-- This migration combines the fixes from both:
-- - 017_add_limit_to_get_all_prayers.sql (limit_count parameter)
-- - 20251129150636_fix_anonymous_display_manual.sql (anonymous handling)
--
-- =====================================================================================

-- Drop the existing function (without limit parameter)
DROP FUNCTION IF EXISTS get_all_prayers();

-- Create the function with BOTH fixes applied
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
    -- FIXED: Return NULL for user_name when anonymous (from 20251129150636)
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
  LIMIT limit_count;  -- FIXED: Server-side limiting (from 017)
$$;

-- Grant execute permissions for both function signatures
GRANT EXECUTE ON FUNCTION get_all_prayers(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers(INTEGER) TO anon;

-- Also grant for the no-parameter version (backwards compatibility)
GRANT EXECUTE ON FUNCTION get_all_prayers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers() TO anon;

-- =====================================================================================
-- VERIFICATION QUERIES (run in Supabase SQL editor to test)
-- =====================================================================================
-- 
-- Test without parameter (should default to 1000):
-- SELECT COUNT(*) as count_no_param FROM get_all_prayers();
--
-- Test with parameter:
-- SELECT COUNT(*) as count_with_param FROM get_all_prayers(10);
--
-- Test anonymous display:
-- SELECT user_name, is_anonymous FROM get_all_prayers(5);
--
-- =====================================================================================