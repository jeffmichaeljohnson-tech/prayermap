-- ============================================
-- CONVERSATION MESSAGES ADMIN FUNCTIONS
-- Created: 2025-12-10
-- Purpose: Enable admin dashboard to view and manage conversation messages
-- ============================================

-- ============================================
-- 1. FUNCTION: Get all conversation messages with pagination and search
-- ============================================
CREATE OR REPLACE FUNCTION get_all_conversation_messages_admin(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  sender_email TEXT,
  sender_name TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  media_duration_seconds INTEGER,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  -- Conversation context
  prayer_id UUID,
  prayer_title TEXT,
  participant_1_id UUID,
  participant_2_id UUID,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_messages AS (
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      m.content,
      m.content_type,
      m.media_url,
      m.media_duration_seconds,
      m.read_at,
      m.created_at,
      c.prayer_id,
      p.title as prayer_title,
      c.participant_1_id,
      c.participant_2_id,
      u.email as user_email,
      us.first_name as user_name
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    JOIN prayers p ON p.id = c.prayer_id
    LEFT JOIN auth.users u ON u.id = m.sender_id
    LEFT JOIN users us ON us.user_id = m.sender_id
    WHERE
      p_search IS NULL
      OR m.content ILIKE '%' || p_search || '%'
      OR u.email ILIKE '%' || p_search || '%'
      OR us.first_name ILIKE '%' || p_search || '%'
    ORDER BY m.created_at DESC
  ),
  counted_messages AS (
    SELECT
      fm.*,
      COUNT(*) OVER() as total_count
    FROM filtered_messages fm
  )
  SELECT
    cm.id,
    cm.conversation_id,
    cm.sender_id,
    cm.user_email,
    cm.user_name,
    cm.content,
    cm.content_type,
    cm.media_url,
    cm.media_duration_seconds,
    cm.read_at,
    cm.created_at,
    cm.prayer_id,
    cm.prayer_title,
    cm.participant_1_id,
    cm.participant_2_id,
    cm.total_count
  FROM counted_messages cm
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_conversation_messages_admin(INTEGER, INTEGER, TEXT) IS
  'Admin function to fetch all conversation messages with pagination and search';

-- ============================================
-- 2. FUNCTION: Update conversation message
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_message_admin(
  p_message_id UUID,
  p_content TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Verify the message exists
  IF NOT EXISTS (SELECT 1 FROM messages WHERE id = p_message_id) THEN
    RAISE EXCEPTION 'Message not found: %', p_message_id;
  END IF;

  -- Update message content if provided
  IF p_content IS NOT NULL THEN
    UPDATE messages
    SET content = p_content
    WHERE id = p_message_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_conversation_message_admin(UUID, TEXT) IS
  'Admin function to update a conversation message content';

-- ============================================
-- 3. FUNCTION: Delete conversation message
-- ============================================
CREATE OR REPLACE FUNCTION delete_conversation_message_admin(
  p_message_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Verify the message exists
  IF NOT EXISTS (SELECT 1 FROM messages WHERE id = p_message_id) THEN
    RAISE EXCEPTION 'Message not found: %', p_message_id;
  END IF;

  -- Delete the message
  DELETE FROM messages
  WHERE id = p_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_conversation_message_admin(UUID) IS
  'Admin function to delete a conversation message';

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_all_conversation_messages_admin(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_conversation_message_admin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_conversation_message_admin(UUID) TO authenticated;
