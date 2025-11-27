-- ============================================================================
-- Fix prayers RLS policy that references admin_roles (causing recursion)
-- ============================================================================
-- The moderation migration added a policy on prayers that queries admin_roles
-- This causes infinite recursion because admin_roles policies also query admin_roles
-- Solution: Use the is_admin_or_moderator() function we created in migration 005
-- ============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Anyone can read active prayers" ON public.prayers;
DROP POLICY IF EXISTS "Anyone can read prayers" ON public.prayers;

-- Recreate with the SECURITY DEFINER function instead of direct subquery
CREATE POLICY "Anyone can read active prayers"
  ON public.prayers FOR SELECT
  USING (
    status = 'active'
    OR auth.uid() = user_id  -- Users can see their own prayers regardless of status
    OR is_admin_or_moderator()  -- Admins/moderators can see all prayers
  );

-- ============================================================================
-- Verify the fix works
-- ============================================================================
-- SELECT * FROM prayers LIMIT 1;
-- SELECT * FROM get_nearby_prayers(42.3314, -83.0458, 100);
