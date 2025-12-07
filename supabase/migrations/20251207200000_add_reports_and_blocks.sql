-- ============================================================================
-- Migration: Add Reports and User Blocks
-- Purpose: Enable users to report inappropriate content and block abusive users
-- Required for: App store compliance and community safety
-- ============================================================================

-- ============================================================================
-- Reports Table
-- Stores user reports for inappropriate content/behavior
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('prayer', 'user', 'response')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'harassment', 'hate_speech', 'self_harm', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Table comment
COMMENT ON TABLE reports IS 'User-submitted reports for inappropriate content or behavior';
COMMENT ON COLUMN reports.target_type IS 'Type of content being reported: prayer, user, or response';
COMMENT ON COLUMN reports.target_id IS 'UUID of the reported prayer, user, or response';
COMMENT ON COLUMN reports.reason IS 'Category of the report';
COMMENT ON COLUMN reports.status IS 'Current review status of the report';

-- ============================================================================
-- User Blocks Table
-- Stores which users have blocked other users
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Table comment
COMMENT ON TABLE user_blocks IS 'User-to-user blocks - blocker will not see content from blocked user';
COMMENT ON COLUMN user_blocks.blocker_id IS 'User who initiated the block';
COMMENT ON COLUMN user_blocks.blocked_id IS 'User who is blocked';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Reports Policies

-- Users can create reports (but not about themselves)
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id 
    AND (target_type != 'user' OR target_id != auth.uid())
  );

-- Users can view their own reports
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admins can view and manage all reports (requires admin role)
DROP POLICY IF EXISTS "Admins can manage reports" ON reports;
CREATE POLICY "Admins can manage reports"
  ON reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'moderator')
    )
  );

-- User Blocks Policies

-- Users can manage their own blocks (INSERT, SELECT, DELETE)
DROP POLICY IF EXISTS "Users can manage own blocks" ON user_blocks;
CREATE POLICY "Users can manage own blocks"
  ON user_blocks FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id AND blocker_id != blocked_id);

-- Users can see if they are blocked (for potential future use)
DROP POLICY IF EXISTS "Users can see blocks against them" ON user_blocks;
CREATE POLICY "Users can see blocks against them"
  ON user_blocks FOR SELECT
  USING (auth.uid() = blocked_id);

-- ============================================================================
-- Helper Function: Check if user is blocked
-- Returns true if blocker_id has blocked blocked_id
-- ============================================================================

CREATE OR REPLACE FUNCTION is_user_blocked(blocker_id UUID, blocked_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE user_blocks.blocker_id = is_user_blocked.blocker_id
    AND user_blocks.blocked_id = is_user_blocked.blocked_id
  );
END;
$$;

COMMENT ON FUNCTION is_user_blocked IS 'Check if one user has blocked another';

-- ============================================================================
-- Helper Function: Get blocked user IDs for a user
-- Returns array of user IDs that the given user has blocked
-- ============================================================================

CREATE OR REPLACE FUNCTION get_blocked_user_ids(user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  blocked_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(blocked_id) INTO blocked_ids
  FROM user_blocks
  WHERE blocker_id = user_id;
  
  RETURN COALESCE(blocked_ids, ARRAY[]::UUID[]);
END;
$$;

COMMENT ON FUNCTION get_blocked_user_ids IS 'Get array of user IDs blocked by the given user';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports') THEN
    RAISE EXCEPTION 'reports table was not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_blocks') THEN
    RAISE EXCEPTION 'user_blocks table was not created';
  END IF;
  
  RAISE NOTICE 'Reports and user_blocks tables created successfully with RLS enabled';
END;
$$;

