-- URGENT RLS FIX: Apply only the critical fixes to restore prayer loading
-- This is a safe subset of the full migration to get prayers working again

-- STEP 1: Create helper function if not exists
CREATE OR REPLACE FUNCTION is_admin_or_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    ),
    false
  );
$$;

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

-- STEP 4: Grant table permissions
GRANT SELECT ON prayers TO authenticated;
GRANT SELECT ON prayers TO anon;
GRANT INSERT ON prayers TO authenticated;
GRANT UPDATE ON prayers TO authenticated;
GRANT DELETE ON prayers TO authenticated;

-- Success message
SELECT 'RLS fix applied successfully - prayers should now load!' as status;