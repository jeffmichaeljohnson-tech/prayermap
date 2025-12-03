-- ============================================================================
-- Add user_name column to prayers table
-- ============================================================================
-- The app expects a user_name column for displaying prayer author names
-- This column is optional and used when is_anonymous is false

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'prayers' AND column_name = 'user_name') THEN
    ALTER TABLE prayers ADD COLUMN user_name TEXT DEFAULT NULL;
    RAISE NOTICE 'Added user_name column to prayers table';
  ELSE
    RAISE NOTICE 'user_name column already exists in prayers table';
  END IF;
END $$;

-- ============================================================================
-- Verify the column was added
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'prayers' AND column_name = 'user_name';
