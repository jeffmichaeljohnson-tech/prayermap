-- EXTRACT: Critical RLS fix commands only
-- From migration 022_fix_prayer_map_rls_conflicts.sql

-- STEP 1: Ensure helper function
CREATE OR REPLACE FUNCTION is_admin_or_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin_or_moderator() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_moderator() TO anon;

-- STEP 2: Clean slate - remove conflicting policies
DROP POLICY IF EXISTS "Anyone can read active prayers" ON prayers;
DROP POLICY IF EXISTS "Anyone can read prayers" ON prayers;
DROP POLICY IF EXISTS "Global living map - everyone sees all prayers" ON prayers;
DROP POLICY IF EXISTS "prayers_viewable_by_everyone" ON prayers;
DROP POLICY IF EXISTS "Users can read own prayers" ON prayers;
DROP POLICY IF EXISTS "Admins can read all prayers" ON prayers;

-- STEP 3: Create single optimized policy
CREATE POLICY "prayermap_global_access" ON prayers
  FOR SELECT USING (
    (status IS NULL OR status = 'active' OR status = 'approved')
    OR (auth.uid() = user_id)
    OR is_admin_or_moderator()
  );

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

GRANT EXECUTE ON FUNCTION get_all_prayers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers() TO anon;

-- STEP 5: Grant table permissions
GRANT SELECT ON prayers TO authenticated;
GRANT SELECT ON prayers TO anon;
GRANT INSERT ON prayers TO authenticated;
GRANT UPDATE ON prayers TO authenticated;
GRANT DELETE ON prayers TO authenticated;

SELECT 'SUCCESS: Prayer map RLS fix applied!' as status;