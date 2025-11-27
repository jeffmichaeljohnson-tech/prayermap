-- ============================================================================
-- Update Moderation Functions to Accept and Pass User Agent
-- ============================================================================
-- This migration updates the moderate_prayer, ban_user, and unban_user
-- functions to accept user_agent parameter and pass it to log_admin_action
-- ============================================================================

-- Function to moderate a prayer (approve, hide, remove)
CREATE OR REPLACE FUNCTION moderate_prayer(
  p_prayer_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  old_prayer RECORD;
  updated_prayer RECORD;
  note_entry JSONB;
BEGIN
  -- Check if user is admin or moderator
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('active', 'hidden', 'removed', 'pending_review') THEN
    RAISE EXCEPTION 'Invalid status. Must be: active, hidden, removed, or pending_review';
  END IF;

  -- Get old values for audit log
  SELECT * INTO old_prayer FROM public.prayers WHERE id = p_prayer_id;

  IF old_prayer IS NULL THEN
    RAISE EXCEPTION 'Prayer not found';
  END IF;

  -- Create note entry if provided
  IF p_note IS NOT NULL THEN
    note_entry := jsonb_build_object(
      'timestamp', NOW(),
      'admin_id', auth.uid(),
      'action', p_new_status,
      'note', p_note
    );
  END IF;

  -- Update the prayer
  UPDATE public.prayers
  SET
    status = p_new_status,
    last_moderated_at = NOW(),
    last_moderated_by = auth.uid(),
    moderation_notes = CASE
      WHEN note_entry IS NOT NULL
      THEN COALESCE(moderation_notes, '[]'::jsonb) || note_entry
      ELSE moderation_notes
    END,
    updated_at = NOW()
  WHERE id = p_prayer_id
  RETURNING * INTO updated_prayer;

  -- Mark all flags as reviewed
  UPDATE public.prayer_flags
  SET
    reviewed = true,
    reviewed_by = auth.uid(),
    reviewed_at = NOW()
  WHERE prayer_id = p_prayer_id AND NOT reviewed;

  -- Log the action
  BEGIN
    PERFORM log_admin_action(
      CASE p_new_status
        WHEN 'active' THEN 'approve_prayer'
        WHEN 'hidden' THEN 'hide_prayer'
        WHEN 'removed' THEN 'remove_prayer'
        ELSE 'moderate_prayer'
      END,
      'prayers',
      p_prayer_id,
      row_to_json(old_prayer)::jsonb,
      row_to_json(updated_prayer)::jsonb,
      p_user_agent,
      NULL -- IP address will be NULL for now (can be populated server-side later)
    );
  EXCEPTION WHEN undefined_function THEN
    -- log_admin_action doesn't exist, skip logging
    NULL;
  END;

  RETURN row_to_json(updated_prayer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban a user
CREATE OR REPLACE FUNCTION ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_ban_type TEXT DEFAULT 'soft',
  p_duration_days INTEGER DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_ban RECORD;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Check if user is admin or moderator
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  -- Validate ban type
  IF p_ban_type NOT IN ('soft', 'hard') THEN
    RAISE EXCEPTION 'Invalid ban type. Must be: soft or hard';
  END IF;

  -- Calculate expiry if duration provided
  IF p_duration_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
  END IF;

  -- Deactivate any existing active bans for this user
  UPDATE public.user_bans
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  -- Create new ban
  INSERT INTO public.user_bans (
    user_id,
    banned_by,
    reason,
    ban_type,
    expires_at,
    notes
  )
  VALUES (
    p_user_id,
    auth.uid(),
    p_reason,
    p_ban_type,
    v_expires_at,
    CASE
      WHEN p_note IS NOT NULL
      THEN jsonb_build_array(jsonb_build_object(
        'timestamp', NOW(),
        'admin_id', auth.uid(),
        'note', p_note
      ))
      ELSE '[]'::jsonb
    END
  )
  RETURNING * INTO v_ban;

  -- If soft ban, hide all user's prayers
  IF p_ban_type = 'soft' THEN
    UPDATE public.prayers
    SET
      status = 'hidden',
      last_moderated_at = NOW(),
      last_moderated_by = auth.uid()
    WHERE user_id = p_user_id AND status = 'active';
  END IF;

  -- Log the action
  BEGIN
    PERFORM log_admin_action(
      'ban_user',
      'user_bans',
      v_ban.id,
      NULL,
      row_to_json(v_ban)::jsonb,
      p_user_agent,
      NULL -- IP address will be NULL for now (can be populated server-side later)
    );
  EXCEPTION WHEN undefined_function THEN
    -- log_admin_action doesn't exist, skip logging
    NULL;
  END;

  RETURN row_to_json(v_ban);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban a user
CREATE OR REPLACE FUNCTION unban_user(
  p_user_id UUID,
  p_note TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_ban RECORD;
BEGIN
  -- Check if user is admin or moderator
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  -- Get active ban
  SELECT * INTO v_ban
  FROM public.user_bans
  WHERE user_id = p_user_id AND is_active = true;

  IF v_ban IS NULL THEN
    RAISE EXCEPTION 'No active ban found for this user';
  END IF;

  -- Deactivate the ban
  UPDATE public.user_bans
  SET
    is_active = false,
    notes = CASE
      WHEN p_note IS NOT NULL
      THEN notes || jsonb_build_object(
        'timestamp', NOW(),
        'admin_id', auth.uid(),
        'action', 'unbanned',
        'note', p_note
      )
      ELSE notes
    END
  WHERE id = v_ban.id;

  -- Log the action
  BEGIN
    PERFORM log_admin_action(
      'unban_user',
      'user_bans',
      v_ban.id,
      row_to_json(v_ban)::jsonb,
      jsonb_build_object('unbanned_by', auth.uid(), 'unbanned_at', NOW()),
      p_user_agent,
      NULL -- IP address will be NULL for now (can be populated server-side later)
    );
  EXCEPTION WHEN undefined_function THEN
    -- log_admin_action doesn't exist, skip logging
    NULL;
  END;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION moderate_prayer TO authenticated;
GRANT EXECUTE ON FUNCTION ban_user TO authenticated;
GRANT EXECUTE ON FUNCTION unban_user TO authenticated;
