-- User push notification tokens
-- Stores device tokens for sending push notifications when someone prays for a user's request

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios', 'android', 'web'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Comment for documentation
COMMENT ON TABLE user_push_tokens IS 'Device tokens for push notifications when prayers receive responses';
COMMENT ON COLUMN user_push_tokens.platform IS 'Device platform: ios, android, or web';

-- Index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies: Users can only manage their own tokens
DROP POLICY IF EXISTS "Users can insert own tokens" ON user_push_tokens;
CREATE POLICY "Users can insert own tokens"
ON user_push_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own tokens" ON user_push_tokens;
CREATE POLICY "Users can view own tokens"
ON user_push_tokens FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tokens" ON user_push_tokens;
CREATE POLICY "Users can delete own tokens"
ON user_push_tokens FOR DELETE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tokens" ON user_push_tokens;
CREATE POLICY "Users can update own tokens"
ON user_push_tokens FOR UPDATE
USING (auth.uid() = user_id);

