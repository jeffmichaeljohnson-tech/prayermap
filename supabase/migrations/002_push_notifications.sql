-- ============================================================================
-- Push Notifications Migration
-- Adds support for FCM/APNs push notifications
-- ============================================================================

-- User Push Tokens table
-- Stores FCM registration tokens for each user's devices
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- FCM/APNs token
    token TEXT NOT NULL,

    -- Platform (android, ios, web)
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),

    -- Enable/disable notifications for this device
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Device metadata (optional)
    device_name TEXT,
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,

    -- Unique constraint: one token per user per platform
    -- Users can have multiple devices, but same device can't be registered twice
    CONSTRAINT unique_user_platform_token UNIQUE (user_id, platform, token)
);

-- Indexes for fast lookups
CREATE INDEX user_push_tokens_user_id_idx ON user_push_tokens (user_id);
CREATE INDEX user_push_tokens_enabled_idx ON user_push_tokens (enabled) WHERE enabled = true;
CREATE INDEX user_push_tokens_platform_idx ON user_push_tokens (platform);

-- ============================================================================

-- Add notification preferences to profiles table
-- (if not already present)
DO $$
BEGIN
    -- Add notifications_enabled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'notifications_enabled'
    ) THEN
        ALTER TABLE profiles ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- Add quiet_hours_start column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'quiet_hours_start'
    ) THEN
        ALTER TABLE profiles ADD COLUMN quiet_hours_start TEXT; -- HH:MM format
    END IF;

    -- Add quiet_hours_end column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'quiet_hours_end'
    ) THEN
        ALTER TABLE profiles ADD COLUMN quiet_hours_end TEXT; -- HH:MM format
    END IF;

    -- Add timezone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'timezone'
    ) THEN
        ALTER TABLE profiles ADD COLUMN timezone TEXT DEFAULT 'UTC'; -- IANA timezone
    END IF;
END $$;

-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_push_token_updated
    BEFORE UPDATE ON user_push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_push_token_timestamp();

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on user_push_tokens table
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own push tokens
CREATE POLICY "Users can view own push tokens"
ON user_push_tokens FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own push tokens
CREATE POLICY "Users can insert own push tokens"
ON user_push_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own push tokens
CREATE POLICY "Users can update own push tokens"
ON user_push_tokens FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own push tokens
CREATE POLICY "Users can delete own push tokens"
ON user_push_tokens FOR DELETE
USING (auth.uid() = user_id);

-- Service role can manage all tokens (for edge function cleanup)
CREATE POLICY "Service role can manage all push tokens"
ON user_push_tokens FOR ALL
USING (auth.role() = 'service_role');

-- ============================================================================
-- Cleanup Function
-- ============================================================================

-- Function to remove stale push tokens (not used in 90 days)
CREATE OR REPLACE FUNCTION cleanup_stale_push_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete tokens not used in 90 days
    DELETE FROM user_push_tokens
    WHERE last_used_at < (now() - INTERVAL '90 days')
    OR (last_used_at IS NULL AND created_at < (now() - INTERVAL '90 days'));

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RAISE NOTICE 'Cleaned up % stale push tokens', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Register a push token (called from client app)
-- INSERT INTO user_push_tokens (user_id, token, platform, device_name)
-- VALUES (auth.uid(), 'fcm-token-here', 'ios', 'Marcus iPhone');

-- Disable notifications for a device
-- UPDATE user_push_tokens SET enabled = false WHERE id = 123;

-- Remove a token (on logout)
-- DELETE FROM user_push_tokens WHERE user_id = auth.uid() AND platform = 'ios';

-- Get all active tokens for a user
-- SELECT * FROM user_push_tokens WHERE user_id = 'uuid' AND enabled = true;

-- ============================================================================
-- Performance Notes
-- ============================================================================

-- 1. Unique constraint on (user_id, platform, token) prevents duplicate registrations
-- 2. Partial index on enabled=true speeds up queries for active tokens
-- 3. last_used_at is updated when notification is successfully sent
-- 4. Run cleanup_stale_push_tokens() periodically (e.g., weekly cron job)
