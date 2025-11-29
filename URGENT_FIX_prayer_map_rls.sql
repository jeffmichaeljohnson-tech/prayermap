-- ============================================================================
-- URGENT FIX: Prayer Map RLS Policy Conflicts
-- Apply this SQL directly to Supabase SQL Editor to fix prayer loading
-- ============================================================================

-- STEP 1: Clean slate - remove conflicting policies
DROP POLICY IF EXISTS "Anyone can read active prayers" ON prayers;
DROP POLICY IF EXISTS "Anyone can read prayers" ON prayers;
DROP POLICY IF EXISTS "Global living map - everyone sees all prayers" ON prayers;
DROP POLICY IF EXISTS "prayers_viewable_by_everyone" ON prayers;

-- STEP 2: Create single optimized policy
CREATE POLICY "prayermap_global_access" ON prayers
  FOR SELECT USING (
    -- Everyone can view active prayers globally
    (status IS NULL OR status = 'active' OR status = 'approved')
    -- Users can view their own prayers regardless of status
    OR (auth.uid() = user_id)
    -- Admins can view all prayers
    OR is_admin_or_moderator()
  );

-- STEP 3: Grant anonymous access to prayers table
GRANT SELECT ON prayers TO anon;

-- STEP 4: Optimize get_all_prayers function
DROP FUNCTION IF EXISTS get_all_prayers();

CREATE OR REPLACE FUNCTION get_all_prayers()
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
SET search_path = public
AS $$
  SELECT
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.content_type::TEXT,
    p.media_url,
    ST_AsText(p.location::geometry) as location,
    CASE 
      WHEN p.is_anonymous THEN 'Anonymous'
      ELSE COALESCE(p.user_name, 'Anonymous')
    END as user_name,
    p.is_anonymous,
    p.created_at,
    p.updated_at,
    p.status
  FROM prayers p
  WHERE (p.status IS NULL OR p.status IN ('active', 'approved'))
  ORDER BY p.created_at DESC;
$$;

-- STEP 5: Grant function permissions
GRANT EXECUTE ON FUNCTION get_all_prayers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers() TO anon;

-- STEP 6: Verify the fix
SELECT 'SUCCESS: Prayer map RLS fix applied!' as status;