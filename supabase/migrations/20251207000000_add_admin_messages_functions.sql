-- ============================================
-- ADMIN MESSAGES FUNCTIONS
-- Created: 2025-12-07
-- Purpose: Enable admin dashboard to view and manage prayer_responses
-- ============================================

-- ============================================
-- 1. FUNCTION: Get all messages with pagination and search
-- ============================================
CREATE OR REPLACE FUNCTION get_all_messages_admin(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  prayer_id UUID,
  responder_id UUID,
  responder_email TEXT,
  responder_name TEXT,
  message TEXT,
  content_type TEXT,
  media_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  is_anonymous BOOLEAN,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_messages AS (
    SELECT
      pr.id,
      pr.prayer_id,
      pr.responder_id,
      pr.message,
      pr.content_type,
      pr.media_url,
      pr.status::TEXT,
      pr.created_at,
      pr.read_at,
      pr.is_anonymous,
      u.email as user_email,
      us.first_name as user_name
    FROM prayer_responses pr
    LEFT JOIN auth.users u ON u.id = pr.responder_id
    LEFT JOIN users us ON us.user_id = pr.responder_id
    WHERE
      p_search IS NULL
      OR pr.message ILIKE '%' || p_search || '%'
      OR u.email ILIKE '%' || p_search || '%'
      OR us.first_name ILIKE '%' || p_search || '%'
    ORDER BY pr.created_at DESC
  ),
  counted_messages AS (
    SELECT
      fm.*,
      COUNT(*) OVER() as total_count
    FROM filtered_messages fm
  )
  SELECT
    cm.id,
    cm.prayer_id,
    cm.responder_id,
    cm.user_email,
    cm.user_name,
    cm.message,
    cm.content_type,
    cm.media_url,
    cm.status,
    cm.created_at,
    cm.read_at,
    cm.is_anonymous,
    cm.total_count
  FROM counted_messages cm
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_messages_admin(INTEGER, INTEGER, TEXT) IS
  'Admin function to fetch all prayer_responses with pagination and search';

-- ============================================
-- 2. FUNCTION: Update message (for moderation)
-- ============================================
CREATE OR REPLACE FUNCTION update_message_admin(
  p_message_id UUID,
  p_status TEXT DEFAULT NULL,
  p_moderation_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_notes JSONB;
  v_new_note JSONB;
BEGIN
  -- Verify the message exists
  IF NOT EXISTS (SELECT 1 FROM prayer_responses WHERE id = p_message_id) THEN
    RAISE EXCEPTION 'Message not found: %', p_message_id;
  END IF;

  -- Update status if provided
  IF p_status IS NOT NULL THEN
    UPDATE prayer_responses
    SET
      status = p_status::response_status,
      last_moderated_at = now(),
      last_moderated_by = auth.uid(),
      updated_at = now()
    WHERE id = p_message_id;
  END IF;

  -- Add moderation note if provided
  IF p_moderation_notes IS NOT NULL THEN
    -- Get current notes
    SELECT moderation_notes INTO v_current_notes
    FROM prayer_responses
    WHERE id = p_message_id;

    -- Create new note with timestamp and moderator
    v_new_note := jsonb_build_object(
      'note', p_moderation_notes,
      'moderator_id', auth.uid(),
      'timestamp', now()
    );

    -- Append to existing notes
    UPDATE prayer_responses
    SET
      moderation_notes = COALESCE(v_current_notes, '[]'::jsonb) || v_new_note,
      last_moderated_at = now(),
      last_moderated_by = auth.uid(),
      updated_at = now()
    WHERE id = p_message_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_message_admin(UUID, TEXT, TEXT) IS
  'Admin function to update message status and add moderation notes';

-- ============================================
-- 3. FUNCTION: Delete message
-- ============================================
CREATE OR REPLACE FUNCTION delete_message_admin(
  p_message_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Verify the message exists
  IF NOT EXISTS (SELECT 1 FROM prayer_responses WHERE id = p_message_id) THEN
    RAISE EXCEPTION 'Message not found: %', p_message_id;
  END IF;

  -- Delete the message (will cascade to related records)
  DELETE FROM prayer_responses
  WHERE id = p_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_message_admin(UUID) IS
  'Admin function to delete a prayer_response message';

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
-- Note: Only authenticated users with admin role can execute these
-- Additional RLS or application-level checks should be in place

GRANT EXECUTE ON FUNCTION get_all_messages_admin(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_message_admin(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_message_admin(UUID) TO authenticated;
