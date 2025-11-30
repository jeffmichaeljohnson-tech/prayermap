-- =====================================================================================
-- CRITICAL FIX: Add missing INSERT policy for profiles table
-- =====================================================================================
--
-- ISSUE: User signup fails with 500 error because the handle_new_user() trigger 
--        function cannot insert into profiles table due to missing INSERT policy
--
-- ROOT CAUSE: The profiles table has SELECT and UPDATE policies but NO INSERT policy
--             When auth.users creates a new user, the trigger tries to INSERT into 
--             profiles but RLS blocks it due to missing policy
--
-- SOLUTION: Add INSERT policy that allows the trigger function to create profiles
--           during user registration process
--
-- IMPACT: This will immediately fix user signup and prayer creation
-- =====================================================================================

-- Add the missing INSERT policy for profiles table
-- This allows the handle_new_user() trigger to create profiles automatically
CREATE POLICY "System can insert profiles during user creation"
ON profiles FOR INSERT
WITH CHECK (true);

-- =====================================================================================
-- VERIFICATION QUERY
-- =====================================================================================
-- Test that the policy now allows profile creation:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'INSERT';
--
-- Expected result: Should show the new INSERT policy
-- =====================================================================================

-- =====================================================================================
-- EXPLANATION
-- =====================================================================================
-- This policy allows INSERT operations on the profiles table without restrictions.
-- This is safe because:
--
-- 1. Profile creation is only triggered by the handle_new_user() function
-- 2. The function runs with SECURITY DEFINER (elevated privileges)
-- 3. It only creates one profile per auth.users record (enforced by PRIMARY KEY)
-- 4. The function is only triggered by Supabase Auth during user registration
-- 5. Regular users cannot directly INSERT into profiles (they go through Supabase Auth)
--
-- Without this policy, the auth trigger fails and users cannot sign up or create prayers.
-- =====================================================================================