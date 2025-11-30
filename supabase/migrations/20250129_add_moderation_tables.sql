-- ============================================
-- Moderation System Tables for PrayerMap
-- ============================================
-- Purpose: Store moderation decisions and track async tasks
--
-- Tables:
-- 1. moderation_logs - All moderation decisions (text, audio, video)
-- 2. moderation_tasks - Async video moderation task tracking
-- 3. moderation_config - System-wide moderation settings
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Moderation Logs Table
-- ============================================
-- Stores every moderation decision for auditing and analytics

CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content reference
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'audio', 'video', 'image')),

  -- Moderation result
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'review')),
  flags JSONB DEFAULT '[]'::jsonb,
  raw_scores JSONB DEFAULT '{}'::jsonb,

  -- Performance tracking
  processing_time_ms INTEGER,
  model_version TEXT,

  -- User reference
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Admin override
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_moderation_logs_content_id ON moderation_logs(content_id);
CREATE INDEX idx_moderation_logs_status ON moderation_logs(status);
CREATE INDEX idx_moderation_logs_user_id ON moderation_logs(user_id);
CREATE INDEX idx_moderation_logs_created_at ON moderation_logs(created_at DESC);
CREATE INDEX idx_moderation_logs_content_type ON moderation_logs(content_type);

-- Index for finding flagged content
CREATE INDEX idx_moderation_logs_flagged ON moderation_logs(status)
  WHERE status = 'rejected';

-- ============================================
-- 2. Moderation Tasks Table
-- ============================================
-- Tracks async moderation tasks (primarily for video)

CREATE TABLE IF NOT EXISTS moderation_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- External task reference (from Hive)
  task_id TEXT UNIQUE NOT NULL,

  -- Content reference
  content_id UUID NOT NULL,
  content_type TEXT DEFAULT 'video' CHECK (content_type IN ('audio', 'video')),

  -- Source info
  video_url TEXT,
  audio_url TEXT,

  -- Task status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'timeout')),

  -- Result (populated when completed)
  result JSONB,
  error_message TEXT,

  -- User reference
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Timeout handling (expire pending tasks after 10 minutes)
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Indexes
CREATE INDEX idx_moderation_tasks_task_id ON moderation_tasks(task_id);
CREATE INDEX idx_moderation_tasks_content_id ON moderation_tasks(content_id);
CREATE INDEX idx_moderation_tasks_status ON moderation_tasks(status);
CREATE INDEX idx_moderation_tasks_pending ON moderation_tasks(status, expires_at)
  WHERE status = 'pending';

-- ============================================
-- 3. Moderation Config Table
-- ============================================
-- System-wide moderation configuration

CREATE TABLE IF NOT EXISTS moderation_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Config key (e.g., 'default', 'strict', 'lenient')
  config_name TEXT UNIQUE NOT NULL DEFAULT 'default',

  -- Settings
  enabled BOOLEAN DEFAULT true,
  strict_mode BOOLEAN DEFAULT true,  -- Low tolerance
  auto_reject BOOLEAN DEFAULT true,  -- No human review needed

  -- Thresholds per category (0.0 - 1.0)
  thresholds JSONB DEFAULT '{
    "hate_speech": 0.5,
    "harassment": 0.5,
    "violence": 0.6,
    "self_harm": 0.4,
    "sexual_content": 0.5,
    "spam": 0.7,
    "profanity": 0.6,
    "illegal_activity": 0.5
  }'::jsonb,

  -- Webhook URL for async results
  webhook_url TEXT,

  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insert default config
INSERT INTO moderation_config (config_name, description)
VALUES ('default', 'Default moderation settings for PrayerMap')
ON CONFLICT (config_name) DO NOTHING;

-- ============================================
-- 4. Add moderation_status to prayers table
-- ============================================

-- Add moderation status to prayers if not exists
ALTER TABLE prayers
  ADD COLUMN IF NOT EXISTS moderation_status TEXT
    DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'review'));

ALTER TABLE prayers
  ADD COLUMN IF NOT EXISTS moderation_log_id UUID
    REFERENCES moderation_logs(id) ON DELETE SET NULL;

-- Index for filtering by moderation status
CREATE INDEX IF NOT EXISTS idx_prayers_moderation_status ON prayers(moderation_status);

-- ============================================
-- 5. Add moderation_status to prayer_responses table
-- ============================================

ALTER TABLE prayer_responses
  ADD COLUMN IF NOT EXISTS moderation_status TEXT
    DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'review'));

ALTER TABLE prayer_responses
  ADD COLUMN IF NOT EXISTS moderation_log_id UUID
    REFERENCES moderation_logs(id) ON DELETE SET NULL;

ALTER TABLE prayer_responses
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_prayer_responses_moderation_status
  ON prayer_responses(moderation_status);

CREATE INDEX IF NOT EXISTS idx_prayer_responses_visible
  ON prayer_responses(is_visible) WHERE is_visible = true;

-- ============================================
-- 6. Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_config ENABLE ROW LEVEL SECURITY;

-- Moderation logs: Admins only
CREATE POLICY "Admins can view moderation logs"
  ON moderation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert moderation logs"
  ON moderation_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Moderation tasks: Admins and task owners
CREATE POLICY "Users can view their own moderation tasks"
  ON moderation_tasks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can manage moderation tasks"
  ON moderation_tasks FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Moderation config: Admins only
CREATE POLICY "Admins can manage moderation config"
  ON moderation_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 7. Helper Functions
-- ============================================

-- Function to get moderation stats
CREATE OR REPLACE FUNCTION get_moderation_stats(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_moderated BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT,
  approval_rate NUMERIC,
  avg_processing_time_ms NUMERIC,
  by_content_type JSONB,
  by_flag_category JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_moderated,
    COUNT(*) FILTER (WHERE status = 'approved')::BIGINT as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected')::BIGINT as rejected_count,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'approved')::NUMERIC /
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 2
    ) as approval_rate,
    ROUND(AVG(processing_time_ms)::NUMERIC, 2) as avg_processing_time_ms,
    jsonb_object_agg(
      content_type,
      type_count
    ) as by_content_type,
    (
      SELECT jsonb_object_agg(flag_category, flag_count)
      FROM (
        SELECT
          f->>'category' as flag_category,
          COUNT(*) as flag_count
        FROM moderation_logs ml,
             jsonb_array_elements(ml.flags) as f
        WHERE ml.created_at BETWEEN start_date AND end_date
        GROUP BY f->>'category'
      ) flag_stats
    ) as by_flag_category
  FROM moderation_logs
  CROSS JOIN LATERAL (
    SELECT content_type, COUNT(*) as type_count
    FROM moderation_logs m2
    WHERE m2.created_at BETWEEN start_date AND end_date
    GROUP BY content_type
  ) type_stats
  WHERE created_at BETWEEN start_date AND end_date;
END;
$$;

-- Function to expire stale tasks
CREATE OR REPLACE FUNCTION expire_stale_moderation_tasks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE moderation_tasks
    SET
      status = 'timeout',
      error_message = 'Task timed out after 10 minutes'
    WHERE status = 'pending'
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  RETURN expired_count;
END;
$$;

-- ============================================
-- 8. Updated At Trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_moderation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_moderation_logs_updated_at
  BEFORE UPDATE ON moderation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_moderation_updated_at();

CREATE TRIGGER update_moderation_config_updated_at
  BEFORE UPDATE ON moderation_config
  FOR EACH ROW
  EXECUTE FUNCTION update_moderation_updated_at();

-- ============================================
-- Migration Complete
-- ============================================
