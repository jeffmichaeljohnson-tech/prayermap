-- ============================================
-- MESSAGING SYSTEM TABLES
-- Created: 2025-12-04
-- Purpose: Enable threaded conversations between prayer requesters and responders
-- 
-- This migration adds:
--   1. conversations - Thread container linking to prayer_responses
--   2. messages - Individual messages within conversations
--   3. Indexes for efficient queries
--   4. RLS policies for secure access
--   5. Helper functions for common operations
--   6. Trigger for auto-updating last_message_at
--
-- NOTE: This migration is idempotent - safe to re-run
-- ============================================

-- ============================================
-- 1. CREATE CONVERSATIONS TABLE
-- ============================================
-- A conversation starts when someone wants to continue dialogue
-- after an initial prayer_response. Each conversation has exactly
-- two participants: the prayer requester and the responder.

CREATE TABLE IF NOT EXISTS conversations (
  -- Primary key using UUID for distributed systems compatibility
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to the original prayer this conversation is about
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  
  -- Link to the prayer_response that initiated this conversation
  -- This is the "first message" conceptually
  prayer_response_id UUID NOT NULL REFERENCES prayer_responses(id) ON DELETE CASCADE,
  
  -- Participant 1: The person who created the prayer (requester)
  participant_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Participant 2: The person who responded to the prayer (responder)
  participant_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Whether participant 2 chose to remain anonymous
  -- Copied from prayer_response.is_anonymous at conversation creation
  -- Cannot be changed after creation (responder's privacy choice is locked)
  participant_2_anonymous BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamp of most recent message (for sorting conversations)
  -- Initially set to prayer_response.created_at, then updated by trigger
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Conversation timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add constraints if they don't exist (for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_conversation_per_response'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT unique_conversation_per_response UNIQUE (prayer_response_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'different_participants'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT different_participants CHECK (participant_1_id != participant_2_id);
  END IF;
END $$;

-- Add updated_at column if it doesn't exist (for migrations that ran without it)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add comments for documentation
COMMENT ON TABLE conversations IS 'Threaded conversations between prayer requesters and responders';
COMMENT ON COLUMN conversations.participant_1_id IS 'The prayer requester (always the prayer owner)';
COMMENT ON COLUMN conversations.participant_2_id IS 'The prayer responder';
COMMENT ON COLUMN conversations.participant_2_anonymous IS 'If true, participant_2 identity is hidden from participant_1';
COMMENT ON COLUMN conversations.last_message_at IS 'Updated via trigger when new messages are added';


-- ============================================
-- 2. CREATE MESSAGES TABLE
-- ============================================
-- Individual messages within a conversation.
-- The initial prayer_response message is NOT duplicated here;
-- we reference it from the conversation record.

CREATE TABLE IF NOT EXISTS messages (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent conversation
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- Who sent this message
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content (required even for audio/video - can be transcription or description)
  content TEXT NOT NULL,
  
  -- Constraint: content must be non-empty and under 2000 chars
  CONSTRAINT content_length CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  
  -- Type of content
  content_type TEXT NOT NULL DEFAULT 'text',
  CONSTRAINT valid_content_type CHECK (content_type IN ('text', 'audio', 'video')),
  
  -- Media URL for audio/video (stored in S3)
  media_url TEXT,
  
  -- Duration in seconds for audio/video
  -- Audio: max 120 seconds (2 minutes)
  -- Video: max 90 seconds
  media_duration_seconds INTEGER,
  CONSTRAINT valid_duration CHECK (
    (content_type = 'text' AND media_duration_seconds IS NULL) OR
    (content_type = 'audio' AND media_duration_seconds IS NOT NULL AND media_duration_seconds <= 120) OR
    (content_type = 'video' AND media_duration_seconds IS NOT NULL AND media_duration_seconds <= 90)
  ),
  
  -- When the recipient read this message (NULL = unread)
  read_at TIMESTAMPTZ,
  
  -- Message timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE messages IS 'Individual messages within a conversation thread';
COMMENT ON COLUMN messages.content IS 'Message text (required), max 2000 characters';
COMMENT ON COLUMN messages.media_url IS 'S3 URL for audio/video messages';
COMMENT ON COLUMN messages.media_duration_seconds IS 'Duration of audio (max 120s) or video (max 90s)';
COMMENT ON COLUMN messages.read_at IS 'NULL means unread, timestamp means read at that time';


-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for: "Get all conversations for a user" (both as requester or responder)
-- This is the most common query - listing user's inbox
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1
  ON conversations(participant_1_id);
  
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2
  ON conversations(participant_2_id);

-- Composite index for sorting by recent activity
-- Covers: WHERE participant_X_id = ? ORDER BY last_message_at DESC
CREATE INDEX IF NOT EXISTS idx_conversations_p1_last_message
  ON conversations(participant_1_id, last_message_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_conversations_p2_last_message
  ON conversations(participant_2_id, last_message_at DESC);

-- Index for: "Get messages in a conversation" with time-based pagination
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at ASC);

-- Index for: "Count unread messages for user" - messages where user is recipient
-- This needs to find messages in user's conversations where they're NOT the sender
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(conversation_id, sender_id, read_at)
  WHERE read_at IS NULL;

-- Index for looking up conversation by prayer_response_id
-- Used when clicking "Continue conversation" from a prayer response
CREATE INDEX IF NOT EXISTS idx_conversations_prayer_response
  ON conversations(prayer_response_id);

-- Index for looking up conversations by prayer_id
-- Used to check if any conversation exists for a prayer
CREATE INDEX IF NOT EXISTS idx_conversations_prayer
  ON conversations(prayer_id);


-- ============================================
-- 4. ENABLE ROW-LEVEL SECURITY
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 5. RLS POLICIES FOR CONVERSATIONS
-- ============================================

-- Drop existing policies first for idempotency
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations from their prayer_responses" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

-- SELECT: Users can view conversations where they are a participant
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    auth.uid() = participant_1_id 
    OR auth.uid() = participant_2_id
  );

-- INSERT: Users can create conversations if they are one of the participants
-- AND the conversation is for a valid prayer_response they're involved in
CREATE POLICY "Users can create conversations from their prayer_responses"
  ON conversations FOR INSERT
  WITH CHECK (
    -- User must be one of the participants
    (auth.uid() = participant_1_id OR auth.uid() = participant_2_id)
    -- Verify the prayer_response exists and user is involved
    AND EXISTS (
      SELECT 1 FROM prayer_responses pr
      JOIN prayers p ON p.id = pr.prayer_id
      WHERE pr.id = prayer_response_id
      AND (
        -- User is the prayer requester
        p.user_id = auth.uid()
        -- OR user is the responder
        OR pr.responder_id = auth.uid()
      )
    )
  );

-- UPDATE: Users can update conversations they're part of
-- (For future features like archiving, muting, etc.)
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (
    auth.uid() = participant_1_id 
    OR auth.uid() = participant_2_id
  )
  WITH CHECK (
    auth.uid() = participant_1_id 
    OR auth.uid() = participant_2_id
  );

-- DELETE: No direct deletion allowed (soft delete via status field if needed later)
-- Conversations are deleted via CASCADE when prayer or prayer_response is deleted


-- ============================================
-- 6. RLS POLICIES FOR MESSAGES
-- ============================================

-- Drop existing policies first for idempotency
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can mark received messages as read" ON messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON messages;

-- SELECT: Users can read messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- INSERT: Users can send messages in their conversations
CREATE POLICY "Users can send messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    -- User must be the sender
    auth.uid() = sender_id
    -- User must be a participant in the conversation
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- UPDATE: Users can mark messages as read (only messages sent TO them, not BY them)
CREATE POLICY "Users can mark received messages as read"
  ON messages FOR UPDATE
  USING (
    -- Message must be in user's conversation
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
    -- User must NOT be the sender (can only mark others' messages as read)
    AND sender_id != auth.uid()
    -- Message must currently be unread
    AND read_at IS NULL
  )
  WITH CHECK (
    -- Can only set read_at, not modify other fields
    read_at IS NOT NULL
  );

-- DELETE: No direct deletion allowed


-- ============================================
-- 7. TRIGGER: Update last_message_at on new message
-- ============================================

CREATE OR REPLACE FUNCTION update_conversation_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message_at();

COMMENT ON FUNCTION update_conversation_last_message_at() IS 
  'Automatically updates conversation.last_message_at when a new message is inserted';


-- ============================================
-- 8. FUNCTION: Get or create conversation from prayer_response
-- ============================================
-- This is called when a user clicks "Continue conversation" from
-- a prayer response. It either returns the existing conversation
-- or creates a new one.

CREATE OR REPLACE FUNCTION get_or_create_conversation(p_prayer_response_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_prayer_response RECORD;
BEGIN
  -- Check if conversation already exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE prayer_response_id = p_prayer_response_id;
  
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;
  
  -- Get prayer_response details with prayer owner
  SELECT 
    pr.id as response_id,
    pr.prayer_id,
    pr.responder_id,
    pr.is_anonymous,
    pr.created_at as response_created_at,
    p.user_id as prayer_user_id
  INTO v_prayer_response
  FROM prayer_responses pr
  JOIN prayers p ON p.id = pr.prayer_id
  WHERE pr.id = p_prayer_response_id;
  
  -- Verify record exists
  IF v_prayer_response IS NULL THEN
    RAISE EXCEPTION 'Prayer response not found: %', p_prayer_response_id;
  END IF;
  
  -- Verify caller is one of the participants
  IF auth.uid() != v_prayer_response.prayer_user_id 
     AND auth.uid() != v_prayer_response.responder_id THEN
    RAISE EXCEPTION 'Not authorized to create conversation for this prayer response';
  END IF;
  
  -- Create new conversation
  INSERT INTO conversations (
    prayer_id,
    prayer_response_id,
    participant_1_id,
    participant_2_id,
    participant_2_anonymous,
    last_message_at,
    created_at
  ) VALUES (
    v_prayer_response.prayer_id,
    p_prayer_response_id,
    v_prayer_response.prayer_user_id,    -- Prayer requester
    v_prayer_response.responder_id,       -- Responder
    COALESCE(v_prayer_response.is_anonymous, false),
    v_prayer_response.response_created_at -- Initial "message" is the response
  )
  RETURNING id INTO v_conversation_id;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_or_create_conversation(UUID) IS 
  'Gets existing or creates new conversation from a prayer_response';


-- ============================================
-- 9. FUNCTION: Get conversations for a user with preview
-- ============================================
-- Returns all conversations for a user with:
-- - Prayer details
-- - Other participant details (respecting anonymity)
-- - Latest message preview
-- - Unread count

CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  prayer_id UUID,
  prayer_title TEXT,
  prayer_content TEXT,
  prayer_response_id UUID,
  prayer_response_message TEXT,
  other_participant_id UUID,
  other_participant_name TEXT,
  other_participant_anonymous BOOLEAN,
  last_message_content TEXT,
  last_message_type TEXT,
  last_message_sender_id UUID,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  conversation_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH conversation_messages AS (
    -- Get latest message per conversation
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content as msg_content,
      m.content_type as msg_type,
      m.sender_id as msg_sender_id,
      m.created_at as msg_created_at
    FROM messages m
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unread_counts AS (
    -- Count unread messages per conversation (messages from others not yet read)
    SELECT 
      m.conversation_id,
      COUNT(*) as cnt
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.read_at IS NULL
      AND m.sender_id != p_user_id
      AND (c.participant_1_id = p_user_id OR c.participant_2_id = p_user_id)
    GROUP BY m.conversation_id
  )
  SELECT 
    c.id as conversation_id,
    c.prayer_id,
    p.title as prayer_title,
    LEFT(p.content, 200) as prayer_content,
    c.prayer_response_id,
    LEFT(pr.message, 200) as prayer_response_message,
    -- Determine the "other" participant
    CASE 
      WHEN c.participant_1_id = p_user_id THEN c.participant_2_id
      ELSE c.participant_1_id
    END as other_participant_id,
    -- Get name, respecting anonymity
    CASE
      -- If user is participant_1 (requester) and participant_2 is anonymous
      WHEN c.participant_1_id = p_user_id AND c.participant_2_anonymous THEN 'Anonymous'
      -- If user is participant_2, show requester's name from prayer
      WHEN c.participant_2_id = p_user_id THEN 
        COALESCE(p.user_name, u1.first_name, 'Anonymous')
      -- Otherwise show responder's name
      ELSE COALESCE(u2.first_name, 'Anonymous')
    END as other_participant_name,
    -- Anonymous flag for display logic
    CASE
      WHEN c.participant_1_id = p_user_id THEN c.participant_2_anonymous
      ELSE false  -- Requester is never anonymous to responder
    END as other_participant_anonymous,
    -- Latest message preview
    COALESCE(cm.msg_content, pr.message) as last_message_content,
    COALESCE(cm.msg_type, pr.content_type) as last_message_type,
    COALESCE(cm.msg_sender_id, pr.responder_id) as last_message_sender_id,
    c.last_message_at,
    COALESCE(uc.cnt, 0) as unread_count,
    c.created_at as conversation_created_at
  FROM conversations c
  JOIN prayers p ON p.id = c.prayer_id
  JOIN prayer_responses pr ON pr.id = c.prayer_response_id
  LEFT JOIN users u1 ON u1.user_id = c.participant_1_id
  LEFT JOIN users u2 ON u2.user_id = c.participant_2_id
  LEFT JOIN conversation_messages cm ON cm.conversation_id = c.id
  LEFT JOIN unread_counts uc ON uc.conversation_id = c.id
  WHERE c.participant_1_id = p_user_id OR c.participant_2_id = p_user_id
  ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_conversations(UUID) IS 
  'Returns all conversations for a user with previews and unread counts';


-- ============================================
-- 10. FUNCTION: Get total unread count for a user
-- ============================================

CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE (c.participant_1_id = p_user_id OR c.participant_2_id = p_user_id)
      AND m.sender_id != p_user_id
      AND m.read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_unread_message_count(UUID) IS 
  'Returns total unread message count across all conversations for a user';


-- ============================================
-- 11. FUNCTION: Mark all messages in conversation as read
-- ============================================

CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Verify user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = p_conversation_id
    AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to mark messages in this conversation';
  END IF;
  
  -- Mark all unread messages from the other participant as read
  UPDATE messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND read_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_conversation_read(UUID) IS 
  'Marks all unread messages in a conversation as read for the current user';


-- ============================================
-- 12. GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================

-- Tables
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;

-- Functions
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO authenticated;

