-- ============================================================================
-- Fix missing INSERT policy for prayer_responses table
-- ============================================================================
-- The migration 017 fixed admin policy recursion but accidentally removed
-- the critical INSERT policy for regular authenticated users
-- This is why users can't create prayer responses
-- ============================================================================

-- Add back the missing INSERT policy for regular users
CREATE POLICY "Users can insert own responses"
ON prayer_responses FOR INSERT
WITH CHECK (auth.uid() = responder_id);

-- Also ensure the DELETE policy exists (users should be able to delete their own responses)
-- Check if it exists first
DROP POLICY IF EXISTS "Users can delete own responses" ON prayer_responses;

CREATE POLICY "Users can delete own responses"
ON prayer_responses FOR DELETE
USING (auth.uid() = responder_id);

-- ============================================================================
-- Verification
-- ============================================================================
-- After running this migration, the following should work:
-- 1. Authenticated users can INSERT prayer responses (responder_id = auth.uid())
-- 2. Authenticated users can DELETE their own prayer responses
-- 3. Admins can still view/update all prayer responses (existing policies preserved)
-- ============================================================================