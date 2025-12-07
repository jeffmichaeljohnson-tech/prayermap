-- Migration: Add prayer categories
-- Description: Adds a category column to prayers table for organizing prayer requests
-- Date: 2025-12-07

-- Add category column with default value
ALTER TABLE prayers
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';

-- Add comment for documentation
COMMENT ON COLUMN prayers.category IS 'Prayer category for organization (health, family, work, relationships, spiritual, financial, guidance, gratitude, other)';

-- Create index for efficient filtering by category
CREATE INDEX IF NOT EXISTS idx_prayers_category ON prayers(category);

-- Add constraint to ensure valid category values (optional but recommended for data integrity)
-- Note: Using a check constraint instead of an enum for flexibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prayers_category_check'
  ) THEN
    ALTER TABLE prayers
    ADD CONSTRAINT prayers_category_check
    CHECK (category IN ('health', 'family', 'work', 'relationships', 'spiritual', 'financial', 'guidance', 'gratitude', 'other'));
  END IF;
END $$;

