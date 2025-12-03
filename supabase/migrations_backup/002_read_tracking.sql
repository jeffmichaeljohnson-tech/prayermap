-- ============================================================================
-- PrayerMap Read Tracking Migration
-- PostgreSQL 15 + Supabase
-- ============================================================================
--
-- This migration adds read tracking functionality for prayer responses.
-- Users can mark responses as read, and the system tracks unread counts
-- for inbox management.
--
-- Changes:
-- 1. Add read_at column to prayer_responses table
-- 2. Add index for efficient unread queries
-- 3. Add functions for marking responses as read
-- 4. Add function for getting unread counts
--
-- ============================================================================

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add read_at timestamp column to prayer_responses (if not exists)
-- NULL = unread, non-NULL = read at that timestamp
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'prayer_responses' AND column_name = 'read_at') THEN
    ALTER TABLE prayer_responses ADD COLUMN read_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Create index for efficient unread queries (if not exists)
-- This index allows fast filtering of unread responses for a prayer
CREATE INDEX IF NOT EXISTS prayer_responses_read_tracking_idx
ON prayer_responses (prayer_id, read_at)
WHERE read_at IS NULL;

-- Create composite index for user inbox queries (if not exists)
CREATE INDEX IF NOT EXISTS prayer_responses_prayer_read_idx
ON prayer_responses (prayer_id, read_at);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Mark a single response as read
-- Sets read_at to current timestamp if not already read
-- Returns true if successfully marked as read
CREATE OR REPLACE FUNCTION mark_response_as_read(response_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prayer_id UUID;
    v_prayer_owner_id UUID;
BEGIN
    -- Get the prayer_id and verify the current user owns the prayer
    SELECT pr.prayer_id, p.user_id
    INTO v_prayer_id, v_prayer_owner_id
    FROM prayer_responses pr
    JOIN prayers p ON p.id = pr.prayer_id
    WHERE pr.id = response_id;

    -- Check if prayer exists and user is authorized
    IF v_prayer_id IS NULL THEN
        RAISE EXCEPTION 'Response not found';
    END IF;

    IF v_prayer_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Only the prayer owner can mark responses as read';
    END IF;

    -- Update the response to mark as read (only if not already read)
    UPDATE prayer_responses
    SET read_at = COALESCE(read_at, NOW())
    WHERE id = response_id;

    RETURN TRUE;
END;
$$;

-- Function: Mark all responses for a prayer as read
-- Useful when user opens a prayer detail view
-- Returns count of responses marked as read
CREATE OR REPLACE FUNCTION mark_all_responses_read(prayer_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prayer_owner_id UUID;
    v_updated_count INTEGER;
BEGIN
    -- Get prayer owner and verify authorization
    SELECT user_id INTO v_prayer_owner_id
    FROM prayers
    WHERE id = prayer_id_param;

    -- Check if prayer exists and user is authorized
    IF v_prayer_owner_id IS NULL THEN
        RAISE EXCEPTION 'Prayer not found';
    END IF;

    IF v_prayer_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Only the prayer owner can mark responses as read';
    END IF;

    -- Mark all unread responses as read
    UPDATE prayer_responses
    SET read_at = NOW()
    WHERE prayer_id = prayer_id_param
      AND read_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$;

-- Function: Get unread response count for a user
-- Returns total count of unread responses across all user's prayers
CREATE OR REPLACE FUNCTION get_unread_count(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_unread_count INTEGER;
BEGIN
    -- Verify the user is requesting their own unread count
    IF user_id_param != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Can only check your own unread count';
    END IF;

    -- Count unread responses for all prayers owned by the user
    SELECT COUNT(*)
    INTO v_unread_count
    FROM prayer_responses pr
    JOIN prayers p ON p.id = pr.prayer_id
    WHERE p.user_id = user_id_param
      AND pr.read_at IS NULL;

    RETURN COALESCE(v_unread_count, 0);
END;
$$;

-- Function: Get unread count per prayer for a user
-- Returns table of prayer_id and unread_count
-- Useful for showing badges on inbox items
CREATE OR REPLACE FUNCTION get_unread_counts_by_prayer(user_id_param UUID)
RETURNS TABLE (
    prayer_id UUID,
    unread_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    -- Verify the user is requesting their own unread counts
    IF user_id_param != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Can only check your own unread counts';
    END IF;

    RETURN QUERY
    SELECT
        pr.prayer_id,
        COUNT(*) as unread_count
    FROM prayer_responses pr
    JOIN prayers p ON p.id = pr.prayer_id
    WHERE p.user_id = user_id_param
      AND pr.read_at IS NULL
    GROUP BY pr.prayer_id;
END;
$$;

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- No changes needed to existing RLS policies for prayer_responses
-- The SELECT policy "Prayer responses are viewable by everyone" already allows
-- reading the read_at column
-- The UPDATE policy will be added for marking responses as read

-- Allow prayer owners to update read_at on responses to their prayers
DROP POLICY IF EXISTS "Prayer owners can mark responses as read" ON prayer_responses;
CREATE POLICY "Prayer owners can mark responses as read"
ON prayer_responses FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM prayers
        WHERE prayers.id = prayer_responses.prayer_id
        AND prayers.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM prayers
        WHERE prayers.id = prayer_responses.prayer_id
        AND prayers.user_id = auth.uid()
    )
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create index on prayers.user_id for efficient inbox queries
-- (may already exist, but adding for completeness)
CREATE INDEX IF NOT EXISTS prayers_user_id_created_at_idx
ON prayers (user_id, created_at DESC);

-- ============================================================================
-- COMMENTS (DOCUMENTATION)
-- ============================================================================

COMMENT ON COLUMN prayer_responses.read_at IS 'Timestamp when the response was marked as read by the prayer owner. NULL means unread.';
COMMENT ON FUNCTION mark_response_as_read(UUID) IS 'Marks a single prayer response as read. Only the prayer owner can mark responses as read.';
COMMENT ON FUNCTION mark_all_responses_read(UUID) IS 'Marks all responses for a prayer as read. Returns the count of responses marked. Only the prayer owner can mark responses as read.';
COMMENT ON FUNCTION get_unread_count(UUID) IS 'Returns the total count of unread responses for all prayers owned by the user.';
COMMENT ON FUNCTION get_unread_counts_by_prayer(UUID) IS 'Returns a table of prayer_id and unread_count for all prayers with unread responses owned by the user.';

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

-- Mark a single response as read:
-- SELECT mark_response_as_read('response-uuid-here');

-- Mark all responses for a prayer as read:
-- SELECT mark_all_responses_read('prayer-uuid-here');

-- Get total unread count for current user:
-- SELECT get_unread_count(auth.uid());

-- Get unread counts per prayer:
-- SELECT * FROM get_unread_counts_by_prayer(auth.uid());

-- Query unread responses for a specific prayer:
-- SELECT * FROM prayer_responses
-- WHERE prayer_id = 'prayer-uuid-here'
-- AND read_at IS NULL;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
