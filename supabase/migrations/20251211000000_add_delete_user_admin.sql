-- ============================================================================
-- Add delete_user_admin function for admin dashboard
-- ============================================================================
-- This function allows admins to completely delete a user and all their data.
-- It handles tables without ON DELETE CASCADE and then deletes from auth.users.
-- SECURITY DEFINER allows this function to bypass RLS and access auth schema.
-- ============================================================================

-- Function to delete a user completely (admin only)
CREATE OR REPLACE FUNCTION delete_user_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  target_user RECORD;
BEGIN
  -- Step 1: Verify caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Step 2: Verify the target user exists
  SELECT id, email INTO target_user
  FROM auth.users
  WHERE id = p_user_id;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Step 3: Prevent deletion of admin users (safety measure)
  IF EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Cannot delete admin users. Remove admin role first.';
  END IF;

  -- Step 4: Delete user's prayer responses (no FK cascade)
  DELETE FROM public.prayer_responses WHERE responder_id = p_user_id;

  -- Step 5: Delete user's prayers (no FK cascade)
  -- This will cascade to prayer_responses via prayer_id FK
  DELETE FROM public.prayers WHERE user_id = p_user_id;

  -- Step 6: Delete expired prayers (no FK cascade)
  DELETE FROM public.expired_prayers WHERE user_id = p_user_id;

  -- Step 7: Set NULL on metadata columns to avoid FK violations
  -- These are "who did this action" columns that shouldn't block user deletion
  UPDATE public.prayers SET last_moderated_by = NULL WHERE last_moderated_by = p_user_id;
  UPDATE public.prayer_responses SET last_moderated_by = NULL WHERE last_moderated_by = p_user_id;
  UPDATE public.prayer_flags SET reviewed_by = NULL WHERE reviewed_by = p_user_id;
  UPDATE public.prayer_response_flags SET reviewed_by = NULL WHERE reviewed_by = p_user_id;
  UPDATE public.reports SET reviewed_by = NULL WHERE reviewed_by = p_user_id;
  UPDATE public.admin_roles SET granted_by = NULL WHERE granted_by = p_user_id;
  UPDATE public.user_bans SET banned_by = NULL WHERE banned_by = p_user_id;
  UPDATE public.app_settings SET updated_by = NULL WHERE updated_by = p_user_id;

  -- Step 8: Delete from audit_logs (admin_id has no cascade)
  DELETE FROM public.audit_logs WHERE admin_id = p_user_id;

  -- Step 9: Delete from auth.users - this cascades to:
  -- - profiles (via trigger or FK)
  -- - users table (ON DELETE CASCADE)
  -- - admin_roles (ON DELETE CASCADE)
  -- - saved_prayers (ON DELETE CASCADE)
  -- - user_bans (ON DELETE CASCADE)
  -- - user_blocks (ON DELETE CASCADE)
  -- - user_push_tokens (ON DELETE CASCADE)
  -- - notifications (via users table cascade)
  -- - prayer_support (via users table cascade)
  -- - auth.identities, auth.sessions, etc.
  DELETE FROM auth.users WHERE id = p_user_id;

  -- Step 10: Log the action
  INSERT INTO public.audit_logs (admin_id, action, details)
  VALUES (
    auth.uid(),
    'delete_user',
    jsonb_build_object(
      'deleted_user_id', p_user_id,
      'deleted_user_email', target_user.email,
      'deleted_at', now()
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION delete_user_admin(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_user_admin IS 'Completely deletes a user and all their data. Admin only. Cannot delete other admins.';
