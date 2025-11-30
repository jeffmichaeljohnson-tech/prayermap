-- ============================================================================
-- Notification Preferences Migration
-- ============================================================================
--
-- PURPOSE: Add notification_preferences JSONB column to users table
-- DATE: 2025-11-30
-- FEATURE: Push Notification Preferences UI
--
-- This migration adds a JSONB column to store user notification preferences
-- for push notifications, including quiet hours, notification types, and
-- sound/vibration settings.
-- ============================================================================

-- Add notification_preferences column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN users.notification_preferences IS
'User notification preferences stored as JSONB. Structure:
{
  "enabled": boolean,
  "prayerResponses": boolean,
  "prayerSupport": boolean,
  "nearbyPrayers": boolean,
  "prayerReminders": boolean,
  "nearbyRadius": number (5-50 miles),
  "quietHours": {
    "enabled": boolean,
    "startTime": string (HH:mm),
    "endTime": string (HH:mm)
  },
  "sound": boolean,
  "vibration": boolean
}';

-- Create index for querying users with specific notification preferences
CREATE INDEX IF NOT EXISTS idx_users_notification_preferences_enabled
ON users ((notification_preferences->>'enabled'))
WHERE notification_preferences IS NOT NULL;

-- Create index for nearby prayer notifications
CREATE INDEX IF NOT EXISTS idx_users_nearby_prayers_enabled
ON users ((notification_preferences->>'nearbyPrayers'))
WHERE notification_preferences IS NOT NULL
AND (notification_preferences->>'nearbyPrayers')::boolean = true;

-- ============================================================================
-- Example Queries
-- ============================================================================

-- Get all users with notifications enabled
-- SELECT user_id, notification_preferences
-- FROM users
-- WHERE (notification_preferences->>'enabled')::boolean = true;

-- Get all users who want nearby prayer notifications
-- SELECT user_id, notification_preferences->>'nearbyRadius' as radius_miles
-- FROM users
-- WHERE (notification_preferences->>'nearbyPrayers')::boolean = true;

-- Update a user's notification preferences
-- UPDATE users
-- SET notification_preferences = '{
--   "enabled": true,
--   "prayerResponses": true,
--   "prayerSupport": true,
--   "nearbyPrayers": true,
--   "prayerReminders": false,
--   "nearbyRadius": 30,
--   "quietHours": {
--     "enabled": false,
--     "startTime": "22:00",
--     "endTime": "08:00"
--   },
--   "sound": true,
--   "vibration": true
-- }'::jsonb
-- WHERE user_id = 'user-uuid-here';

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- DROP INDEX IF EXISTS idx_users_notification_preferences_enabled;
-- DROP INDEX IF EXISTS idx_users_nearby_prayers_enabled;
-- ALTER TABLE users DROP COLUMN IF EXISTS notification_preferences;

-- ============================================================================
-- Additional Table: user_push_tokens (if not already created)
-- ============================================================================
-- This table stores FCM/APNs tokens for sending push notifications

CREATE TABLE IF NOT EXISTS user_push_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One token per device
    CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);

-- Index for finding tokens by user
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id
ON user_push_tokens (user_id);

-- Index for cleaning up old tokens
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_updated_at
ON user_push_tokens (updated_at);

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tokens
CREATE POLICY "Users can view own push tokens"
ON user_push_tokens FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own push tokens"
ON user_push_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update own push tokens"
ON user_push_tokens FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own push tokens"
ON user_push_tokens FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_push_tokens_updated
    BEFORE UPDATE ON user_push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_push_tokens_updated_at();

-- ============================================================================
-- Notes
-- ============================================================================
--
-- To apply this migration in Supabase:
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run"
--
-- To verify:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name = 'notification_preferences';
--
-- Should return:
-- notification_preferences | jsonb
-- ============================================================================
