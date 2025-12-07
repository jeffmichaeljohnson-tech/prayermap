-- ============================================
-- ADD RESPONDER_NAME COLUMN TO PRAYER_RESPONSES
-- Created: 2025-12-07
-- Purpose: Store the responder's name for display in inbox
--
-- Bug fix: Users were seeing "Someone" instead of actual names
-- because responder_name was never stored in the database.
--
-- NOTE: This migration is idempotent - safe to re-run
-- ============================================

-- Add responder_name column if it doesn't exist
ALTER TABLE prayer_responses
ADD COLUMN IF NOT EXISTS responder_name TEXT;

-- Add is_anonymous column if it doesn't exist (should already exist but ensuring)
ALTER TABLE prayer_responses
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Add read_at column if it doesn't exist (for tracking read status)
ALTER TABLE prayer_responses
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN prayer_responses.responder_name IS 'Display name of the responder. NULL if anonymous.';
COMMENT ON COLUMN prayer_responses.is_anonymous IS 'If true, responder_name should not be shown to prayer owner.';
COMMENT ON COLUMN prayer_responses.read_at IS 'Timestamp when the prayer owner read this response.';

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'prayer_responses'
-- ORDER BY ordinal_position;
