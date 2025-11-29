-- ============================================================================
-- Add is_anonymous field to prayer_responses table
-- Migration 021: Add missing is_anonymous field to prayer_responses
-- ============================================================================
-- ISSUE: The notification trigger expects is_anonymous field on prayer_responses
-- but it doesn't exist in the table schema
-- RESULT: Notifications cannot be created properly when prayer responses are added
-- ============================================================================

-- Add the is_anonymous field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prayer_responses' AND column_name = 'is_anonymous') THEN
        ALTER TABLE prayer_responses ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS prayer_responses_is_anonymous_idx 
ON prayer_responses (is_anonymous, created_at DESC);

-- Add comment
COMMENT ON COLUMN prayer_responses.is_anonymous IS 'Whether the prayer response was made anonymously';

-- ============================================================================
-- Update the respondToPrayer API call to include is_anonymous
-- The frontend service will need to be updated to pass this field
-- ============================================================================