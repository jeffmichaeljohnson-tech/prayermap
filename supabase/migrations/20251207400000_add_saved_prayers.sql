-- Migration: Add saved_prayers table for bookmarking prayers
-- This allows users to save prayers they want to pray for later

-- Create the saved_prayers table
CREATE TABLE IF NOT EXISTS saved_prayers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure a user can only save a prayer once
    UNIQUE(user_id, prayer_id)
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_saved_prayers_user ON saved_prayers(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_prayers_prayer ON saved_prayers(prayer_id);
CREATE INDEX IF NOT EXISTS idx_saved_prayers_created ON saved_prayers(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_prayers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own saved prayers
DROP POLICY IF EXISTS "Users can view own saved prayers" ON saved_prayers;
CREATE POLICY "Users can view own saved prayers"
    ON saved_prayers FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own saved prayers
DROP POLICY IF EXISTS "Users can save prayers" ON saved_prayers;
CREATE POLICY "Users can save prayers"
    ON saved_prayers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own saved prayers
DROP POLICY IF EXISTS "Users can unsave prayers" ON saved_prayers;
CREATE POLICY "Users can unsave prayers"
    ON saved_prayers FOR DELETE
    USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE saved_prayers IS 'Bookmarked prayers that users want to pray for later';
COMMENT ON COLUMN saved_prayers.user_id IS 'The user who saved the prayer';
COMMENT ON COLUMN saved_prayers.prayer_id IS 'The prayer that was saved';
COMMENT ON COLUMN saved_prayers.created_at IS 'When the prayer was saved';

