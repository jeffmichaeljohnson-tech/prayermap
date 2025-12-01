-- URGENT FIX: Prayer Responses Infinite Recursion
-- Run this SQL in the Supabase dashboard to fix prayer response creation

-- Drop the problematic policies that directly query admin_roles
DROP POLICY IF EXISTS "Admins can view all prayer responses" ON public.prayer_responses;
DROP POLICY IF EXISTS "Admins can update prayer responses" ON public.prayer_responses;

-- Recreate with the SECURITY DEFINER function instead of direct subquery
-- Policy: Admins can view all responses regardless of status
CREATE POLICY "Admins can view all prayer responses" ON prayer_responses
  FOR SELECT USING (
    is_admin_or_moderator()
  );

-- Policy: Admins can update responses for moderation
CREATE POLICY "Admins can update prayer responses" ON prayer_responses
  FOR UPDATE USING (
    is_admin_or_moderator()
  );

-- Verify the is_admin_or_moderator function exists (should return a function definition)
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'is_admin_or_moderator';