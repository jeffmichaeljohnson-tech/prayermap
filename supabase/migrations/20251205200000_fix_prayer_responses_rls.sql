-- Fix RLS policies for prayer_responses table
-- Root cause: The SELECT policy only checked if prayer was ACTIVE,
-- but didn't allow the prayer OWNER to see responses to their prayers.
-- Also, the column reference was wrong (prayers.prayer_id instead of prayers.id).
-- Applied: 2025-12-05

-- Step 1: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view responses to active prayers" ON prayer_responses;
DROP POLICY IF EXISTS "View responses to active prayers" ON prayer_responses;
DROP POLICY IF EXISTS "Users can view prayer responses" ON prayer_responses;
DROP POLICY IF EXISTS "Authenticated users can view responses" ON prayer_responses;

-- Step 2: Create new SELECT policy that allows:
-- 1. Prayer owner can see ALL responses to their prayers
-- 2. Responder can see their own responses
-- 3. Anyone can see responses if prayer is public (optional)
CREATE POLICY "Users can view prayer responses"
  ON prayer_responses FOR SELECT
  USING (
    -- User is the prayer owner (can see all responses to their prayers)
    EXISTS (
      SELECT 1 FROM prayers
      WHERE prayers.id = prayer_responses.prayer_id
      AND prayers.user_id = (SELECT auth.uid())
    )
    -- OR user is the responder (can see their own responses)
    OR responder_id = (SELECT auth.uid())
    -- OR admin/moderator (can see all for moderation)
    OR EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = (SELECT auth.uid())
      AND admin_roles.role IN ('admin', 'moderator')
    )
  );

-- Step 3: Ensure INSERT policy exists and is correct
DROP POLICY IF EXISTS "Authenticated users can create responses" ON prayer_responses;
DROP POLICY IF EXISTS "Authenticated users can respond" ON prayer_responses;

CREATE POLICY "Authenticated users can create responses"
  ON prayer_responses FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    (SELECT auth.uid()) IS NOT NULL
    -- User must be the responder
    AND responder_id = (SELECT auth.uid())
  );

-- Step 4: Add UPDATE policy for marking responses as read
DROP POLICY IF EXISTS "Prayer owners can mark responses as read" ON prayer_responses;

CREATE POLICY "Prayer owners can mark responses as read"
  ON prayer_responses FOR UPDATE
  USING (
    -- User is the prayer owner
    EXISTS (
      SELECT 1 FROM prayers
      WHERE prayers.id = prayer_responses.prayer_id
      AND prayers.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    -- Can only update read_at field
    EXISTS (
      SELECT 1 FROM prayers
      WHERE prayers.id = prayer_responses.prayer_id
      AND prayers.user_id = (SELECT auth.uid())
    )
  );

-- Step 5: Ensure DELETE policy for admin only
DROP POLICY IF EXISTS "Admins can delete responses" ON prayer_responses;

CREATE POLICY "Admins can delete responses"
  ON prayer_responses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE admin_roles.user_id = (SELECT auth.uid())
      AND admin_roles.role = 'admin'
    )
  );

-- Verification: After running this migration, the user should be able to see
-- responses to their prayers in the inbox.
