-- ============================================================================
-- Fix prayer_responses RLS policies that reference admin_roles (causing recursion)
-- ============================================================================
-- The prayer_responses moderation migration added policies that query admin_roles
-- This causes infinite recursion because admin_roles policies also query admin_roles
-- Solution: Use the is_admin_or_moderator() function we created in migration 005
-- ============================================================================

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

-- ============================================================================
-- Verify the fix works
-- ============================================================================
-- Test that we can now insert prayer responses without infinite recursion
-- This should work now: INSERT INTO prayer_responses (prayer_id, responder_id, message, content_type) VALUES (...);