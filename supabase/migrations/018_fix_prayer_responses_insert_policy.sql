-- ============================================================================
-- Fix missing INSERT policy for prayer_responses table
-- Migration 018: Add back user INSERT policy for prayer responses
-- ============================================================================
-- ISSUE: Migration 017 fixed admin policy recursion but accidentally removed
-- the critical INSERT policy for regular authenticated users.
-- RESULT: Users cannot create prayer responses (RLS violation error 42501)
-- ============================================================================

-- Add back the missing INSERT policy for regular users
-- Users can create responses where they are the responder
CREATE POLICY "Users can insert own responses"
ON prayer_responses FOR INSERT
WITH CHECK (auth.uid() = responder_id);

-- Also ensure the DELETE policy exists (users should be able to delete their own responses)
-- This was also missing from the recreated policies
DROP POLICY IF EXISTS "Users can delete own responses" ON prayer_responses;

CREATE POLICY "Users can delete own responses"
ON prayer_responses FOR DELETE
USING (auth.uid() = responder_id);

-- ============================================================================
-- Verification: These policies should now exist on prayer_responses table:
-- ============================================================================
-- SELECT policies:
-- 1. "Anyone can view active responses to active prayers" - public read access
-- 2. "Admins can view all prayer responses" - admin read access
--
-- INSERT policies:
-- 3. "Users can insert own responses" - users can create their own responses
--
-- UPDATE policies:  
-- 4. "Admins can update prayer responses" - admin moderation access
--
-- DELETE policies:
-- 5. "Users can delete own responses" - users can delete their own responses
-- ============================================================================