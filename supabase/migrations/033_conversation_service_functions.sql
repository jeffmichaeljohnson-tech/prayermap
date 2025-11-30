-- ============================================================================
-- PrayerMap Conversation Service Helper Functions
-- PostgreSQL 15 + Supabase
-- ============================================================================
--
-- Additional database functions to support the conversation service layer
-- with optimized queries and business logic enforcement.
--
-- ============================================================================

-- ============================================================================
-- PARTICIPANT MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function: Add participants to conversation thread
CREATE OR REPLACE FUNCTION add_conversation_participants(
    thread_id_param UUID,
    user_ids_param UUID[]
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    current_participants UUID[];
BEGIN
    -- Get current participant list
    SELECT participant_ids INTO current_participants
    FROM conversation_threads
    WHERE id = thread_id_param;
    
    IF current_participants IS NULL THEN
        RAISE EXCEPTION 'Conversation thread not found';
    END IF;
    
    -- Add each new user to the participant_ids array
    FOREACH user_id IN ARRAY user_ids_param
    LOOP
        IF NOT (user_id = ANY(current_participants)) THEN
            current_participants := array_append(current_participants, user_id);
        END IF;
    END LOOP;
    
    -- Update the conversation thread
    UPDATE conversation_threads
    SET participant_ids = current_participants,
        updated_at = now()
    WHERE id = thread_id_param;
END;
$$;

-- Function: Remove participant from conversation thread
CREATE OR REPLACE FUNCTION remove_conversation_participant(
    thread_id_param UUID,
    user_id_param UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_participants UUID[];
    new_participants UUID[];
BEGIN
    -- Get current participant list
    SELECT participant_ids INTO current_participants
    FROM conversation_threads
    WHERE id = thread_id_param;
    
    IF current_participants IS NULL THEN
        RAISE EXCEPTION 'Conversation thread not found';
    END IF;
    
    -- Remove user from array
    SELECT array_agg(participant_id) INTO new_participants
    FROM unnest(current_participants) AS participant_id
    WHERE participant_id != user_id_param;
    
    -- Update the conversation thread
    UPDATE conversation_threads
    SET participant_ids = COALESCE(new_participants, '{}'),
        updated_at = now()
    WHERE id = thread_id_param;
    
    -- Mark participant as left
    UPDATE conversation_participants
    SET left_at = now()
    WHERE thread_id = thread_id_param AND user_id = user_id_param;
END;
$$;

-- ============================================================================
-- ENHANCED SEARCH FUNCTIONS
-- ============================================================================

-- Function: Search conversations with full-text search
CREATE OR REPLACE FUNCTION search_conversations_fulltext(
    user_id_param UUID,
    search_query TEXT,
    conversation_types conversation_type[] DEFAULT NULL,
    prayer_categories prayer_category[] DEFAULT NULL,
    include_archived BOOLEAN DEFAULT false,
    limit_param INTEGER DEFAULT 20
) RETURNS TABLE (
    id UUID,
    type conversation_type,
    title TEXT,
    custom_title TEXT,
    prayer_id UUID,
    last_activity_at TIMESTAMPTZ,
    unread_count INTEGER,
    relevance_score REAL,
    prayer_category prayer_category
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
        ct.last_activity_at,
        COALESCE(cp.unread_count, 0) as unread_count,
        ts_rank_cd(
            to_tsvector('english', ct.title || ' ' || COALESCE(ct.custom_title, '')),
            plainto_tsquery('english', search_query)
        ) as relevance_score,
        ct.prayer_category
    FROM conversation_threads ct
    LEFT JOIN conversation_participants cp ON cp.thread_id = ct.id AND cp.user_id = user_id_param
    WHERE user_id_param = ANY(ct.participant_ids)
        AND cp.left_at IS NULL
        AND (include_archived OR NOT ct.is_archived)
        AND (conversation_types IS NULL OR ct.type = ANY(conversation_types))
        AND (prayer_categories IS NULL OR ct.prayer_category = ANY(prayer_categories))
        AND (
            search_query = '' OR 
            to_tsvector('english', ct.title || ' ' || COALESCE(ct.custom_title, '')) @@ plainto_tsquery('english', search_query)
        )
    ORDER BY 
        relevance_score DESC,
        ct.is_pinned DESC,
        ct.last_activity_at DESC
    LIMIT limit_param;
END;
$$;

-- Function: Get conversation statistics for analytics
CREATE OR REPLACE FUNCTION get_conversation_statistics(thread_id_param UUID)
RETURNS TABLE (
    total_messages INTEGER,
    total_participants INTEGER,
    active_participants INTEGER,
    prayer_requests INTEGER,
    scripture_shares INTEGER,
    testimonies INTEGER,
    avg_response_time_minutes NUMERIC,
    most_active_user_id UUID,
    first_message_date TIMESTAMPTZ,
    last_message_date TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH message_stats AS (
        SELECT 
            COUNT(*) as msg_count,
            COUNT(CASE WHEN message_type = 'prayer_request' THEN 1 END) as prayer_reqs,
            COUNT(CASE WHEN message_type = 'scripture_share' THEN 1 END) as scripture_count,
            COUNT(CASE WHEN message_type = 'testimony' THEN 1 END) as testimony_count,
            MIN(created_at) as first_msg,
            MAX(created_at) as last_msg
        FROM thread_messages
        WHERE thread_id = thread_id_param AND NOT is_deleted
    ),
    participant_stats AS (
        SELECT 
            COUNT(*) as total_parts,
            COUNT(CASE WHEN left_at IS NULL THEN 1 END) as active_parts
        FROM conversation_participants
        WHERE thread_id = thread_id_param
    ),
    response_times AS (
        SELECT 
            AVG(EXTRACT(EPOCH FROM (
                LEAD(created_at) OVER (ORDER BY created_at) - created_at
            )) / 60.0) as avg_response_mins
        FROM thread_messages
        WHERE thread_id = thread_id_param AND NOT is_deleted
    ),
    most_active AS (
        SELECT sender_id, COUNT(*) as message_count
        FROM thread_messages
        WHERE thread_id = thread_id_param AND NOT is_deleted
        GROUP BY sender_id
        ORDER BY message_count DESC
        LIMIT 1
    )
    SELECT 
        ms.msg_count::INTEGER,
        ps.total_parts::INTEGER,
        ps.active_parts::INTEGER,
        ms.prayer_reqs::INTEGER,
        ms.scripture_count::INTEGER,
        ms.testimony_count::INTEGER,
        COALESCE(rt.avg_response_mins, 0)::NUMERIC,
        ma.sender_id,
        ms.first_msg,
        ms.last_msg
    FROM message_stats ms
    CROSS JOIN participant_stats ps
    LEFT JOIN response_times rt ON true
    LEFT JOIN most_active ma ON true;
END;
$$;

-- ============================================================================
-- REAL-TIME NOTIFICATION FUNCTIONS
-- ============================================================================

-- Function: Get unread message summary for user
CREATE OR REPLACE FUNCTION get_user_unread_summary(user_id_param UUID)
RETURNS TABLE (
    thread_id UUID,
    thread_title TEXT,
    unread_count INTEGER,
    latest_message_preview TEXT,
    latest_sender_name TEXT,
    latest_message_time TIMESTAMPTZ,
    message_type message_type,
    urgency message_urgency
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.thread_id,
        ct.title,
        cp.unread_count,
        LEFT(tm.content, 100) as message_preview,
        tm.sender_name,
        tm.created_at,
        tm.message_type,
        tm.urgency
    FROM conversation_participants cp
    JOIN conversation_threads ct ON ct.id = cp.thread_id
    LEFT JOIN thread_messages tm ON tm.id = ct.last_message_id
    WHERE cp.user_id = user_id_param
        AND cp.left_at IS NULL
        AND cp.unread_count > 0
        AND NOT ct.is_muted
        AND NOT ct.is_archived
    ORDER BY 
        tm.urgency DESC,
        tm.created_at DESC;
END;
$$;

-- Function: Mark conversation as read and update activity
CREATE OR REPLACE FUNCTION update_participant_activity(
    thread_id_param UUID,
    user_id_param UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update participant last activity
    UPDATE conversation_participants
    SET 
        last_active_at = now(),
        last_read_at = now()
    WHERE thread_id = thread_id_param AND user_id = user_id_param;
    
    -- Create activity if doesn't exist
    INSERT INTO conversation_participants (thread_id, user_id, last_active_at, last_read_at)
    VALUES (thread_id_param, user_id_param, now(), now())
    ON CONFLICT (thread_id, user_id) DO NOTHING;
END;
$$;

-- ============================================================================
-- PRAYER JOURNEY FUNCTIONS
-- ============================================================================

-- Function: Get related conversations for prayer journey
CREATE OR REPLACE FUNCTION get_prayer_related_conversations(prayer_id_param UUID)
RETURNS TABLE (
    conversation_id UUID,
    conversation_title TEXT,
    conversation_type conversation_type,
    participant_count INTEGER,
    message_count INTEGER,
    created_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.title,
        ct.type,
        array_length(ct.participant_ids, 1) as participant_count,
        ct.total_messages,
        ct.created_at,
        ct.last_activity_at
    FROM conversation_threads ct
    WHERE ct.prayer_id = prayer_id_param
        OR EXISTS (
            SELECT 1 FROM thread_messages tm
            WHERE tm.thread_id = ct.id
            AND tm.related_prayer_id = prayer_id_param
        )
    ORDER BY ct.created_at ASC;
END;
$$;

-- Function: Build prayer timeline with events
CREATE OR REPLACE FUNCTION build_prayer_timeline(prayer_id_param UUID)
RETURNS TABLE (
    event_date TIMESTAMPTZ,
    event_type TEXT,
    event_description TEXT,
    participant_name TEXT,
    message_id UUID,
    conversation_id UUID
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    -- Prayer creation event
    SELECT 
        p.created_at as event_date,
        'prayer_created' as event_type,
        'Prayer request posted: ' || COALESCE(p.title, LEFT(p.content, 50)) as event_description,
        pr.display_name as participant_name,
        NULL::UUID as message_id,
        NULL::UUID as conversation_id
    FROM prayers p
    LEFT JOIN profiles pr ON p.user_id = pr.id
    WHERE p.id = prayer_id_param
    
    UNION ALL
    
    -- Message events from related conversations
    SELECT 
        tm.created_at as event_date,
        tm.message_type::TEXT as event_type,
        CASE 
            WHEN tm.message_type = 'prayer_response' THEN 'Prayer response received'
            WHEN tm.message_type = 'testimony' THEN 'Testimony shared'
            WHEN tm.message_type = 'scripture_share' THEN 'Scripture shared'
            WHEN tm.message_type = 'prayer_update' THEN 'Prayer update posted'
            ELSE 'Message sent'
        END as event_description,
        tm.sender_name as participant_name,
        tm.id as message_id,
        tm.thread_id as conversation_id
    FROM thread_messages tm
    JOIN conversation_threads ct ON ct.id = tm.thread_id
    WHERE ct.prayer_id = prayer_id_param
        OR tm.related_prayer_id = prayer_id_param
        AND NOT tm.is_deleted
    
    ORDER BY event_date ASC;
END;
$$;

-- ============================================================================
-- OPTIMIZATION AND MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function: Clean up old deleted messages
CREATE OR REPLACE FUNCTION cleanup_deleted_messages(days_old INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Permanently remove soft-deleted messages older than specified days
    DELETE FROM thread_messages
    WHERE is_deleted = true
        AND deleted_at < (now() - (days_old || ' days')::INTERVAL);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Function: Update conversation thread statistics
CREATE OR REPLACE FUNCTION refresh_conversation_stats(thread_id_param UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER := 0;
    thread_record RECORD;
BEGIN
    -- Update specific thread or all threads
    FOR thread_record IN 
        SELECT id FROM conversation_threads 
        WHERE (thread_id_param IS NULL OR id = thread_id_param)
    LOOP
        -- Update message count and last activity
        UPDATE conversation_threads
        SET 
            total_messages = (
                SELECT COUNT(*) FROM thread_messages 
                WHERE thread_id = thread_record.id AND NOT is_deleted
            ),
            last_activity_at = COALESCE((
                SELECT MAX(created_at) FROM thread_messages 
                WHERE thread_id = thread_record.id AND NOT is_deleted
            ), last_activity_at),
            last_message_id = (
                SELECT id FROM thread_messages 
                WHERE thread_id = thread_record.id AND NOT is_deleted
                ORDER BY created_at DESC LIMIT 1
            ),
            updated_at = now()
        WHERE id = thread_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION add_conversation_participants IS 'Adds new participants to a conversation thread and updates participant_ids array';
COMMENT ON FUNCTION remove_conversation_participant IS 'Removes a participant from conversation and marks them as left';
COMMENT ON FUNCTION search_conversations_fulltext IS 'Full-text search across conversation titles with relevance ranking';
COMMENT ON FUNCTION get_conversation_statistics IS 'Returns detailed statistics for conversation analytics';
COMMENT ON FUNCTION get_user_unread_summary IS 'Gets summary of unread messages for notification display';
COMMENT ON FUNCTION get_prayer_related_conversations IS 'Finds all conversations related to a specific prayer';
COMMENT ON FUNCTION build_prayer_timeline IS 'Builds chronological timeline of prayer-related events';
COMMENT ON FUNCTION cleanup_deleted_messages IS 'Maintenance function to permanently remove old soft-deleted messages';
COMMENT ON FUNCTION refresh_conversation_stats IS 'Recalculates conversation statistics for data consistency';

-- ============================================================================
-- END OF CONVERSATION SERVICE FUNCTIONS
-- ============================================================================