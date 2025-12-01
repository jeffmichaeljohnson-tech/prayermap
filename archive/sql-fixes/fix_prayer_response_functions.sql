-- ============================================================================
-- FIXED PRAYER RESPONSE ADMIN FUNCTIONS
-- ============================================================================
-- This script recreates the prayer response admin functions with the correct
-- schema matching the actual database structure.
-- ============================================================================

-- Function: Get all prayer responses with pagination and filtering for admin
CREATE OR REPLACE FUNCTION get_prayer_responses_admin(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_status response_status DEFAULT NULL,
  p_flagged_only BOOLEAN DEFAULT false,
  p_search_term TEXT DEFAULT NULL,
  p_prayer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  response_id UUID,
  prayer_id UUID,
  user_id UUID,
  responder_name TEXT,
  text_body TEXT,
  media_type TEXT,
  media_url TEXT,
  is_anonymous BOOLEAN,
  status response_status,
  flagged_count INTEGER,
  last_moderated_at TIMESTAMPTZ,
  last_moderated_by UUID,
  moderator_email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  prayer_title TEXT,
  prayer_creator_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin permissions (explicitly reference admin_roles.user_id)
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid() AND admin_roles.role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    pr.id as response_id,
    pr.prayer_id,
    pr.responder_id as user_id,
    CASE 
      WHEN pr.is_anonymous THEN 'Anonymous'
      ELSE COALESCE(u.email, 'Unknown User')
    END as responder_name,
    pr.message as text_body,
    pr.content_type::TEXT as media_type,
    pr.media_url,
    pr.is_anonymous,
    pr.status,
    pr.flagged_count,
    pr.last_moderated_at,
    pr.last_moderated_by,
    mod_user.email as moderator_email,
    pr.created_at,
    pr.updated_at,
    p.title as prayer_title,
    CASE 
      WHEN p.is_anonymous THEN 'Anonymous'
      ELSE COALESCE(prayer_user.email, 'Unknown User')
    END as prayer_creator_name
  FROM prayer_responses pr
  LEFT JOIN auth.users u ON pr.responder_id = u.id
  LEFT JOIN auth.users mod_user ON pr.last_moderated_by = mod_user.id
  LEFT JOIN prayers p ON pr.prayer_id = p.id
  LEFT JOIN auth.users prayer_user ON p.user_id = prayer_user.id
  WHERE 
    (p_status IS NULL OR pr.status = p_status)
    AND (p_flagged_only = false OR pr.flagged_count > 0)
    AND (p_search_term IS NULL OR 
         pr.message ILIKE '%' || p_search_term || '%' OR
         u.email ILIKE '%' || p_search_term || '%')
    AND (p_prayer_id IS NULL OR pr.prayer_id = p_prayer_id)
  ORDER BY 
    CASE 
      WHEN p_flagged_only THEN pr.flagged_count 
      ELSE 0 
    END DESC,
    pr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function: Moderate a prayer response
CREATE OR REPLACE FUNCTION moderate_prayer_response(
  p_response_id UUID,
  p_new_status response_status,
  p_note TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  old_response RECORD;
  updated_response RECORD;
  note_entry JSONB;
BEGIN
  -- Check admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid() AND admin_roles.role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('active', 'hidden', 'removed', 'pending_review') THEN
    RAISE EXCEPTION 'Invalid status. Must be: active, hidden, removed, or pending_review';
  END IF;

  -- Get old values for audit log
  SELECT * INTO old_response FROM prayer_responses WHERE id = p_response_id;

  IF old_response IS NULL THEN
    RAISE EXCEPTION 'Prayer response not found';
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

  -- Update the response
  UPDATE prayer_responses
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
  WHERE id = p_response_id
  RETURNING * INTO updated_response;

  -- Mark all flags as reviewed
  UPDATE prayer_response_flags
  SET
    reviewed = true,
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    action_taken = CASE p_new_status
      WHEN 'active' THEN 'approved'
      WHEN 'hidden' THEN 'response_hidden'
      WHEN 'removed' THEN 'response_removed'
      ELSE 'under_review'
    END
  WHERE response_id = p_response_id AND NOT reviewed;

  -- Log the action (if function exists)
  BEGIN
    PERFORM log_admin_action(
      CASE p_new_status
        WHEN 'active' THEN 'approve_response'
        WHEN 'hidden' THEN 'hide_response'
        WHEN 'removed' THEN 'remove_response'
        ELSE 'moderate_response'
      END,
      'prayer_responses',
      old_response.id,
      row_to_json(old_response)::jsonb,
      row_to_json(updated_response)::jsonb,
      p_user_agent,
      NULL
    );
  EXCEPTION WHEN undefined_function OR others THEN
    -- log_admin_action doesn't exist or failed, continue without logging
    NULL;
  END;

  RETURN row_to_json(updated_response);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Delete prayer response (admin only)
CREATE OR REPLACE FUNCTION delete_prayer_response_admin(
  p_response_id UUID,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  old_response RECORD;
BEGIN
  -- Check admin permissions (admin only for deletion)
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid() AND admin_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get old values for audit log
  SELECT * INTO old_response FROM prayer_responses WHERE id = p_response_id;

  IF old_response IS NULL THEN
    RAISE EXCEPTION 'Prayer response not found';
  END IF;

  -- Delete the response (cascades to flags)
  DELETE FROM prayer_responses WHERE id = p_response_id;

  -- Log the action (if function exists)
  BEGIN
    PERFORM log_admin_action(
      'delete_response',
      'prayer_responses',
      old_response.id,
      row_to_json(old_response)::jsonb,
      NULL,
      p_user_agent,
      NULL
    );
  EXCEPTION WHEN undefined_function OR others THEN
    -- log_admin_action doesn't exist or failed, continue without logging
    NULL;
  END;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get prayer response flags with details
CREATE OR REPLACE FUNCTION get_prayer_response_flags_admin(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_unreviewed_only BOOLEAN DEFAULT true,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  flag_id UUID,
  response_id UUID,
  response_text TEXT,
  response_creator_email TEXT,
  reporter_email TEXT,
  reason TEXT,
  details TEXT,
  reviewed BOOLEAN,
  reviewed_by UUID,
  reviewer_email TEXT,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ,
  prayer_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid() AND admin_roles.role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    f.id as flag_id,
    f.response_id,
    pr.message as response_text,
    resp_user.email as response_creator_email,
    reporter_user.email as reporter_email,
    f.reason,
    f.details,
    f.reviewed,
    f.reviewed_by,
    reviewer_user.email as reviewer_email,
    f.reviewed_at,
    f.action_taken,
    f.created_at,
    p.title as prayer_title
  FROM prayer_response_flags f
  LEFT JOIN prayer_responses pr ON f.response_id = pr.id
  LEFT JOIN auth.users resp_user ON pr.responder_id = resp_user.id
  LEFT JOIN auth.users reporter_user ON f.reporter_id = reporter_user.id
  LEFT JOIN auth.users reviewer_user ON f.reviewed_by = reviewer_user.id
  LEFT JOIN prayers p ON pr.prayer_id = p.id
  WHERE 
    (p_unreviewed_only = false OR f.reviewed = false)
    AND (p_reason IS NULL OR f.reason = p_reason)
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions for admin functions
GRANT EXECUTE ON FUNCTION get_prayer_responses_admin TO authenticated;
GRANT EXECUTE ON FUNCTION moderate_prayer_response TO authenticated;
GRANT EXECUTE ON FUNCTION delete_prayer_response_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_prayer_response_flags_admin TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION get_prayer_responses_admin IS 'Admin function to retrieve prayer responses with filtering, search, and pagination';
COMMENT ON FUNCTION moderate_prayer_response IS 'Admin function to change response status and add moderation notes';
COMMENT ON FUNCTION delete_prayer_response_admin IS 'Admin-only function to permanently delete prayer responses';
COMMENT ON FUNCTION get_prayer_response_flags_admin IS 'Admin function to retrieve user-reported response flags for review';