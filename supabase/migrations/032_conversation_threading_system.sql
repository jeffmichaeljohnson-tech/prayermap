-- ============================================================================
-- PrayerMap Advanced Conversation Threading & Message Management System
-- PostgreSQL 15 + Supabase + PostGIS
-- ============================================================================
--
-- This migration creates sophisticated conversation threading and message
-- management capabilities that enhance prayer-centric communication while
-- maintaining WhatsApp-level usability.
--
-- Features:
-- - Advanced conversation threading with prayer context
-- - Message thread management for replies and discussions
-- - Prayer-centric message types with spiritual metadata
-- - Living Map integration for memorial line connections
-- - Smart conversation organization and categorization
-- - Offline caching support and state management
-- - Real-time sync with mobile optimization
--
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Conversation types for different prayer interactions
CREATE TYPE conversation_type AS ENUM (
  'prayer_response',      -- Direct response to prayer request
  'direct_message',       -- Private conversation between users
  'group_prayer',         -- Group prayer discussion
  'prayer_circle',        -- Ongoing prayer circle conversation
  'scripture_sharing',    -- Scripture and testimony sharing
  'prayer_update'         -- Updates on prayer requests/answers
);

-- Message types for spiritual context
CREATE TYPE message_type AS ENUM (
  'prayer_request',       -- New prayer request in conversation
  'prayer_response',      -- Response to prayer request
  'scripture_share',      -- Bible verse or devotional
  'testimony',           -- Answered prayer or testimony
  'prayer_update',       -- Update on existing prayer
  'encouragement',       -- General encouragement
  'general_message',     -- Regular conversation
  'system_message'       -- System notifications
);

-- Prayer categories for organization
CREATE TYPE prayer_category AS ENUM (
  'healing',
  'family',
  'financial',
  'guidance',
  'relationship',
  'work_career',
  'spiritual_growth',
  'travel_safety',
  'grief_loss',
  'thanksgiving',
  'world_events',
  'ministry',
  'other'
);

-- Message urgency levels
CREATE TYPE message_urgency AS ENUM ('low', 'medium', 'high', 'emergency');

-- ============================================================================
-- CONVERSATION THREADS TABLE
-- ============================================================================

-- Core conversation threads that organize messages
CREATE TABLE conversation_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Thread metadata
    type conversation_type NOT NULL DEFAULT 'prayer_response',
    title TEXT,
    custom_title TEXT, -- User-customized title
    
    -- Prayer context (if conversation originated from prayer)
    prayer_id UUID REFERENCES prayers(id) ON DELETE SET NULL,
    original_prayer_title TEXT,
    original_prayer_location GEOGRAPHY(POINT, 4326),
    memorial_line_id UUID, -- Links to Living Map memorial lines
    
    -- Participants (array of user IDs for flexible group conversations)
    participant_ids UUID[] NOT NULL DEFAULT '{}',
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Settings and preferences
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    allow_anonymous BOOLEAN NOT NULL DEFAULT false,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    read_receipts_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Prayer-specific metadata
    prayer_tags TEXT[] DEFAULT '{}',
    prayer_category prayer_category,
    
    -- Activity tracking
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_id UUID, -- Reference to most recent message
    unread_count INTEGER NOT NULL DEFAULT 0,
    total_messages INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_participant_count CHECK (array_length(participant_ids, 1) >= 1),
    CONSTRAINT valid_title_length CHECK (LENGTH(title) <= 200),
    CONSTRAINT valid_custom_title_length CHECK (custom_title IS NULL OR LENGTH(custom_title) <= 200)
);

-- Indexes for conversation threads
CREATE INDEX conversation_threads_participants_gin ON conversation_threads USING GIN (participant_ids);
CREATE INDEX conversation_threads_prayer_id_idx ON conversation_threads (prayer_id);
CREATE INDEX conversation_threads_creator_id_idx ON conversation_threads (creator_id);
CREATE INDEX conversation_threads_type_idx ON conversation_threads (type);
CREATE INDEX conversation_threads_last_activity_idx ON conversation_threads (last_activity_at DESC);
CREATE INDEX conversation_threads_prayer_category_idx ON conversation_threads (prayer_category);
CREATE INDEX conversation_threads_prayer_tags_gin ON conversation_threads USING GIN (prayer_tags);

-- ============================================================================
-- ENHANCED MESSAGES TABLE
-- ============================================================================

-- Enhanced messages with threading and spiritual context
CREATE TABLE thread_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Thread relationship
    thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
    parent_message_id UUID REFERENCES thread_messages(id) ON DELETE CASCADE, -- For reply threading
    
    -- Message content
    content TEXT NOT NULL,
    content_type content_type NOT NULL DEFAULT 'text',
    media_url TEXT,
    message_type message_type NOT NULL DEFAULT 'general_message',
    
    -- Sender information
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_name TEXT, -- Cached for performance
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    
    -- Spiritual context
    spiritual_context JSONB DEFAULT '{}', -- Flexible metadata
    prayer_category prayer_category,
    urgency message_urgency NOT NULL DEFAULT 'medium',
    prayer_tags TEXT[] DEFAULT '{}',
    
    -- Scripture sharing
    scripture_reference TEXT, -- e.g., "John 3:16"
    scripture_text TEXT,      -- Full verse text
    
    -- Living Map integration
    creates_memorial_line BOOLEAN NOT NULL DEFAULT false,
    memorial_line_data JSONB, -- Coordinates and metadata for memorial line
    related_prayer_id UUID REFERENCES prayers(id) ON DELETE SET NULL,
    
    -- Message state
    is_edited BOOLEAN NOT NULL DEFAULT false,
    edit_history JSONB DEFAULT '[]', -- Array of previous versions
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    
    -- Threading metadata
    reply_count INTEGER NOT NULL DEFAULT 0,
    thread_participants UUID[] DEFAULT '{}', -- Users who participated in this thread
    
    -- Read tracking (per message, per user)
    read_by JSONB DEFAULT '{}', -- {"user_id": "timestamp", ...}
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_message_content CHECK (
        (content_type = 'text' AND LENGTH(content) >= 1 AND LENGTH(content) <= 10000) OR
        (content_type IN ('audio', 'video') AND media_url IS NOT NULL)
    ),
    CONSTRAINT valid_scripture_reference CHECK (
        scripture_reference IS NULL OR 
        (scripture_reference ~ '^[A-Za-z0-9\s]+\s\d+:\d+(-\d+)?$')
    )
);

-- Indexes for thread messages
CREATE INDEX thread_messages_thread_id_created_idx ON thread_messages (thread_id, created_at ASC);
CREATE INDEX thread_messages_sender_id_idx ON thread_messages (sender_id);
CREATE INDEX thread_messages_parent_message_idx ON thread_messages (parent_message_id);
CREATE INDEX thread_messages_message_type_idx ON thread_messages (message_type);
CREATE INDEX thread_messages_prayer_category_idx ON thread_messages (prayer_category);
CREATE INDEX thread_messages_prayer_tags_gin ON thread_messages USING GIN (prayer_tags);
CREATE INDEX thread_messages_read_by_gin ON thread_messages USING GIN (read_by);
CREATE INDEX thread_messages_spiritual_context_gin ON thread_messages USING GIN (spiritual_context);

-- Index for unread messages (performance critical)
CREATE INDEX thread_messages_unread_idx ON thread_messages (thread_id, created_at) 
WHERE NOT is_deleted;

-- ============================================================================
-- CONVERSATION PARTICIPANTS TABLE
-- ============================================================================

-- Detailed participant management with permissions and settings
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core relationships
    thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Participant role and permissions
    role TEXT NOT NULL DEFAULT 'member', -- 'creator', 'moderator', 'member'
    can_add_participants BOOLEAN NOT NULL DEFAULT false,
    can_edit_thread_settings BOOLEAN NOT NULL DEFAULT false,
    
    -- Personal settings for this conversation
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    custom_nickname TEXT, -- Custom display name for this conversation
    
    -- Activity tracking
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unread_count INTEGER NOT NULL DEFAULT 0,
    
    -- Spiritual preferences
    prayer_notification_preferences JSONB DEFAULT '{}',
    
    -- Timestamps
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at TIMESTAMPTZ, -- NULL if still active participant
    
    -- Unique constraint
    CONSTRAINT unique_thread_participant UNIQUE (thread_id, user_id)
);

-- Indexes for conversation participants
CREATE INDEX conversation_participants_thread_id_idx ON conversation_participants (thread_id);
CREATE INDEX conversation_participants_user_id_idx ON conversation_participants (user_id);
CREATE INDEX conversation_participants_last_read_idx ON conversation_participants (last_read_at);

-- ============================================================================
-- CONVERSATION SEARCH INDEX
-- ============================================================================

-- Full-text search index for messages
CREATE INDEX thread_messages_search_idx ON thread_messages 
USING GIN (to_tsvector('english', content || ' ' || COALESCE(scripture_text, '')));

-- ============================================================================
-- FUNCTIONS FOR CONVERSATION MANAGEMENT
-- ============================================================================

-- Function: Create prayer conversation from prayer response
CREATE OR REPLACE FUNCTION create_prayer_conversation(
    prayer_id_param UUID,
    responder_id_param UUID,
    initial_message TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_thread_id UUID;
    v_prayer_owner_id UUID;
    v_prayer_title TEXT;
    v_prayer_location GEOGRAPHY;
BEGIN
    -- Get prayer details
    SELECT user_id, title, location INTO v_prayer_owner_id, v_prayer_title, v_prayer_location
    FROM prayers WHERE id = prayer_id_param;
    
    IF v_prayer_owner_id IS NULL THEN
        RAISE EXCEPTION 'Prayer not found';
    END IF;
    
    -- Create conversation thread
    INSERT INTO conversation_threads (
        type,
        title,
        prayer_id,
        original_prayer_title,
        original_prayer_location,
        participant_ids,
        creator_id,
        prayer_category,
        last_activity_at
    ) VALUES (
        'prayer_response',
        'Prayer Response: ' || COALESCE(v_prayer_title, 'Untitled'),
        prayer_id_param,
        v_prayer_title,
        v_prayer_location,
        ARRAY[v_prayer_owner_id, responder_id_param],
        responder_id_param,
        'other', -- Default category
        now()
    ) RETURNING id INTO v_thread_id;
    
    -- Add participants
    INSERT INTO conversation_participants (thread_id, user_id, role)
    VALUES 
        (v_thread_id, v_prayer_owner_id, 'creator'),
        (v_thread_id, responder_id_param, 'member');
    
    -- Create initial message
    INSERT INTO thread_messages (
        thread_id,
        content,
        message_type,
        sender_id,
        related_prayer_id
    ) VALUES (
        v_thread_id,
        initial_message,
        'prayer_response',
        responder_id_param,
        prayer_id_param
    );
    
    RETURN v_thread_id;
END;
$$;

-- Function: Get conversation threads for user with smart categorization
CREATE OR REPLACE FUNCTION get_user_conversations(
    user_id_param UUID,
    conversation_type_filter conversation_type DEFAULT NULL,
    include_archived BOOLEAN DEFAULT false,
    limit_param INTEGER DEFAULT 50
) RETURNS TABLE (
    id UUID,
    type conversation_type,
    title TEXT,
    custom_title TEXT,
    prayer_id UUID,
    participant_count INTEGER,
    last_activity_at TIMESTAMPTZ,
    unread_count INTEGER,
    last_message_preview TEXT,
    last_message_type message_type,
    prayer_category prayer_category,
    is_pinned BOOLEAN,
    is_muted BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.type,
        ct.title,
        ct.custom_title,
        ct.prayer_id,
        array_length(ct.participant_ids, 1) as participant_count,
        ct.last_activity_at,
        COALESCE(cp.unread_count, 0) as unread_count,
        LEFT(tm.content, 100) as last_message_preview,
        tm.message_type as last_message_type,
        ct.prayer_category,
        ct.is_pinned,
        ct.is_muted
    FROM conversation_threads ct
    LEFT JOIN conversation_participants cp ON cp.thread_id = ct.id AND cp.user_id = user_id_param
    LEFT JOIN thread_messages tm ON tm.id = ct.last_message_id
    WHERE user_id_param = ANY(ct.participant_ids)
        AND cp.left_at IS NULL
        AND (include_archived OR NOT ct.is_archived)
        AND (conversation_type_filter IS NULL OR ct.type = conversation_type_filter)
    ORDER BY 
        ct.is_pinned DESC,
        ct.last_activity_at DESC
    LIMIT limit_param;
END;
$$;

-- Function: Smart message search with spiritual context
CREATE OR REPLACE FUNCTION search_messages(
    user_id_param UUID,
    search_query TEXT,
    message_types message_type[] DEFAULT NULL,
    prayer_categories prayer_category[] DEFAULT NULL,
    date_range_start TIMESTAMPTZ DEFAULT NULL,
    date_range_end TIMESTAMPTZ DEFAULT NULL,
    limit_param INTEGER DEFAULT 20
) RETURNS TABLE (
    message_id UUID,
    thread_id UUID,
    content TEXT,
    message_type message_type,
    sender_name TEXT,
    created_at TIMESTAMPTZ,
    thread_title TEXT,
    prayer_context TEXT,
    relevance_score REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id as message_id,
        tm.thread_id,
        tm.content,
        tm.message_type,
        tm.sender_name,
        tm.created_at,
        ct.title as thread_title,
        ct.original_prayer_title as prayer_context,
        ts_rank_cd(to_tsvector('english', tm.content), plainto_tsquery('english', search_query)) as relevance_score
    FROM thread_messages tm
    JOIN conversation_threads ct ON ct.id = tm.thread_id
    WHERE user_id_param = ANY(ct.participant_ids)
        AND NOT tm.is_deleted
        AND (search_query = '' OR to_tsvector('english', tm.content) @@ plainto_tsquery('english', search_query))
        AND (message_types IS NULL OR tm.message_type = ANY(message_types))
        AND (prayer_categories IS NULL OR tm.prayer_category = ANY(prayer_categories))
        AND (date_range_start IS NULL OR tm.created_at >= date_range_start)
        AND (date_range_end IS NULL OR tm.created_at <= date_range_end)
    ORDER BY relevance_score DESC, tm.created_at DESC
    LIMIT limit_param;
END;
$$;

-- Function: Mark messages as read with optimistic updates
CREATE OR REPLACE FUNCTION mark_thread_messages_read(
    thread_id_param UUID,
    user_id_param UUID,
    up_to_message_id UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_message_record RECORD;
BEGIN
    -- Verify user is participant
    IF NOT EXISTS (
        SELECT 1 FROM conversation_threads 
        WHERE id = thread_id_param AND user_id_param = ANY(participant_ids)
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not a participant in this conversation';
    END IF;
    
    -- Update read_by for unread messages
    FOR v_message_record IN 
        SELECT id, read_by FROM thread_messages 
        WHERE thread_id = thread_id_param 
        AND NOT is_deleted
        AND (up_to_message_id IS NULL OR created_at <= (SELECT created_at FROM thread_messages WHERE id = up_to_message_id))
        AND (read_by->>user_id_param::text IS NULL)
    LOOP
        UPDATE thread_messages 
        SET read_by = read_by || jsonb_build_object(user_id_param::text, now()::text)
        WHERE id = v_message_record.id;
        
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    -- Update participant unread count
    UPDATE conversation_participants 
    SET unread_count = 0, last_read_at = now()
    WHERE thread_id = thread_id_param AND user_id = user_id_param;
    
    RETURN v_updated_count;
END;
$$;

-- ============================================================================
-- TRIGGERS FOR REAL-TIME UPDATES
-- ============================================================================

-- Trigger: Update conversation activity when new message is added
CREATE OR REPLACE FUNCTION update_conversation_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_participant_id UUID;
BEGIN
    -- Update thread last activity and message count
    UPDATE conversation_threads 
    SET 
        last_activity_at = NEW.created_at,
        last_message_id = NEW.id,
        total_messages = total_messages + 1,
        updated_at = now()
    WHERE id = NEW.thread_id;
    
    -- Update unread counts for all participants except sender
    FOR v_participant_id IN 
        SELECT user_id FROM conversation_participants 
        WHERE thread_id = NEW.thread_id AND user_id != NEW.sender_id AND left_at IS NULL
    LOOP
        UPDATE conversation_participants 
        SET unread_count = unread_count + 1
        WHERE thread_id = NEW.thread_id AND user_id = v_participant_id;
    END LOOP;
    
    -- Update reply count for parent message if this is a reply
    IF NEW.parent_message_id IS NOT NULL THEN
        UPDATE thread_messages 
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_message_id;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_created
    AFTER INSERT ON thread_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_activity();

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Conversation threads policies
CREATE POLICY "Users can view their conversation threads"
ON conversation_threads FOR SELECT
USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can create conversation threads"
ON conversation_threads FOR INSERT
WITH CHECK (auth.uid() = creator_id AND auth.uid() = ANY(participant_ids));

CREATE POLICY "Participants can update conversation threads"
ON conversation_threads FOR UPDATE
USING (auth.uid() = ANY(participant_ids));

-- Thread messages policies
CREATE POLICY "Participants can view thread messages"
ON thread_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_threads 
        WHERE id = thread_messages.thread_id 
        AND auth.uid() = ANY(participant_ids)
    )
);

CREATE POLICY "Users can create messages in their threads"
ON thread_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM conversation_threads 
        WHERE id = thread_messages.thread_id 
        AND auth.uid() = ANY(participant_ids)
    )
);

CREATE POLICY "Users can update their own messages"
ON thread_messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Conversation participants policies
CREATE POLICY "Participants can view conversation participants"
ON conversation_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_threads 
        WHERE id = conversation_participants.thread_id 
        AND auth.uid() = ANY(participant_ids)
    )
);

CREATE POLICY "Users can manage their own participation"
ON conversation_participants FOR ALL
USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional performance indexes
CREATE INDEX conversation_threads_active_participants 
ON conversation_threads USING GIN (participant_ids) 
WHERE NOT is_archived;

CREATE INDEX thread_messages_recent_activity 
ON thread_messages (thread_id, created_at DESC) 
WHERE NOT is_deleted;

CREATE INDEX conversation_participants_unread 
ON conversation_participants (user_id, unread_count) 
WHERE unread_count > 0 AND left_at IS NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE conversation_threads IS 'Enhanced conversation threads with prayer context and spiritual metadata for sophisticated message organization';
COMMENT ON TABLE thread_messages IS 'Messages with threading support, spiritual context, and Living Map integration';
COMMENT ON TABLE conversation_participants IS 'Detailed participant management with permissions and personal settings';

COMMENT ON FUNCTION create_prayer_conversation IS 'Creates a new conversation thread from a prayer response interaction';
COMMENT ON FUNCTION get_user_conversations IS 'Retrieves user conversations with smart categorization and filtering';
COMMENT ON FUNCTION search_messages IS 'Advanced message search with spiritual context and full-text search capabilities';
COMMENT ON FUNCTION mark_thread_messages_read IS 'Marks messages as read with optimistic updates for real-time performance';

-- ============================================================================
-- END OF CONVERSATION THREADING MIGRATION
-- ============================================================================