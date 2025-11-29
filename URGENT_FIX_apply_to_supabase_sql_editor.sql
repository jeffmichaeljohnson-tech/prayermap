-- ============================================================================
-- URGENT FIX: Missing INSERT Policy for Prayer Responses
-- ============================================================================
-- 
-- ISSUE: Regular users cannot create prayer responses due to missing RLS INSERT policy
-- ERROR: "new row violates row-level security policy for table 'prayer_responses'"
-- 
-- ROOT CAUSE: Migration 017 fixed admin recursion but accidentally removed user policies
-- 
-- SOLUTION: Restore the missing INSERT and DELETE policies for regular users
-- ============================================================================

-- Add back the missing INSERT policy for regular users
CREATE POLICY "Users can insert own responses"
ON prayer_responses FOR INSERT
WITH CHECK (auth.uid() = responder_id);

-- Also restore the DELETE policy for completeness
CREATE POLICY "Users can delete own responses" 
ON prayer_responses FOR DELETE
USING (auth.uid() = responder_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all necessary policies now exist
SELECT 
  policyname, 
  cmd, 
  CASE 
    WHEN cmd = 'INSERT' AND policyname LIKE '%Users can insert%' THEN '✅ FIXED - Users can now create responses'
    WHEN cmd = 'DELETE' AND policyname LIKE '%Users can delete%' THEN '✅ FIXED - Users can delete their responses'
    ELSE 'ℹ️ Policy exists'
  END as status
FROM pg_policies 
WHERE tablename = 'prayer_responses' 
ORDER BY cmd, policyname;

-- Success message
SELECT 
  '🎉 PRAYER RESPONSE INSERT POLICY RESTORED' AS result,
  'Users can now create prayer responses without RLS errors' AS message,
  NOW() AS fixed_at;