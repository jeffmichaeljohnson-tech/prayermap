-- ============================================
-- Migration: Update admin messages function to allow message content editing
-- Created: 2025-12-10
-- Purpose: Allow admins to edit prayer_response message content
-- ============================================

-- Drop and recreate the update function with message content editing support
DROP FUNCTION IF EXISTS update_message_admin(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION update_message_admin(
  p_message_id UUID,
  p_status TEXT DEFAULT NULL,
  p_moderation_notes TEXT DEFAULT NULL,
  p_message_content TEXT DEFAULT NULL
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

  -- Update message content if provided
  IF p_message_content IS NOT NULL THEN
    UPDATE prayer_responses
    SET
      message = p_message_content,
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

COMMENT ON FUNCTION update_message_admin(UUID, TEXT, TEXT, TEXT) IS
  'Admin function to update message status, content, and add moderation notes';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_message_admin(UUID, TEXT, TEXT, TEXT) TO authenticated;
