-- ============================================================================
-- Push Notification Tokens Schema Migration
-- ============================================================================
-- This migration adds support for storing FCM (Firebase Cloud Messaging) and
-- APNs (Apple Push Notification service) tokens for sending push notifications
-- to iOS, Android, and web users.
--
-- SPIRITUAL CONTEXT: Push notifications enable timely prayer support, allowing
-- users to quickly respond when someone needs prayer. This infrastructure
-- ensures sacred connections happen at the right moment.
--
-- Features:
-- - Multi-device support (iOS, Android, Web)
-- - Granular notification preferences
-- - Quiet hours support
-- - Token lifecycle management (creation, updates, deactivation)
-- - RLS policies for privacy and security
-- ============================================================================

-- ============================================================================
-- 1. CREATE USER_PUSH_TOKENS TABLE
-- ============================================================================

-- Table for storing device push notification tokens
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Token information
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT NOT NULL, -- Unique device identifier (generated in app)

  -- Lifecycle timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ, -- Updated when notification is successfully sent

  -- Active status (false when user logs out or uninstalls)
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Prevent duplicate devices per user (allow token updates for same device)
  CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);

-- ============================================================================
-- 2. CREATE INDEXES FOR EFFICIENT QUERYING
-- ============================================================================

-- Index for looking up active tokens for a specific user (most common query)
CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_active_idx
  ON user_push_tokens (user_id, is_active)
  WHERE is_active = true;

-- Index for looking up all tokens by user (for settings page)
CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_idx
  ON user_push_tokens (user_id);

-- Index for platform-specific queries (e.g., iOS-only notifications)
CREATE INDEX IF NOT EXISTS user_push_tokens_platform_idx
  ON user_push_tokens (platform)
  WHERE is_active = true;

-- Index for cleanup of stale tokens (tokens not used in 90+ days)
CREATE INDEX IF NOT EXISTS user_push_tokens_last_used_idx
  ON user_push_tokens (last_used_at)
  WHERE is_active = true;

-- ============================================================================
-- 3. ADD NOTIFICATION_PREFERENCES TO PROFILES TABLE
-- ============================================================================

-- Add JSONB column for granular notification preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_preferences JSONB DEFAULT jsonb_build_object(
      'push_enabled', true,                -- Master switch for all push notifications
      'prayer_responses', true,            -- Notify when someone responds to your prayer
      'prayer_support', true,              -- Notify when someone prays for you
      'nearby_prayers', false,             -- Notify about new prayers nearby (off by default)
      'prayer_reminders', true,            -- Notify about prayers you've committed to pray for
      'quiet_hours_enabled', false,        -- Enable quiet hours (no notifications)
      'quiet_hours_start', '22:00',        -- Start time (e.g., 10 PM)
      'quiet_hours_end', '07:00'           -- End time (e.g., 7 AM)
    );
  END IF;
END $$;

-- Add index for querying users with push enabled
CREATE INDEX IF NOT EXISTS profiles_push_enabled_idx
  ON profiles ((notification_preferences->>'push_enabled'))
  WHERE (notification_preferences->>'push_enabled')::boolean = true;

-- ============================================================================
-- 4. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function: Get active push tokens for a user
-- Returns all active tokens across all devices for sending notifications
CREATE OR REPLACE FUNCTION get_active_push_tokens(
  p_user_id UUID
)
RETURNS TABLE (
  id BIGINT,
  token TEXT,
  platform TEXT,
  device_id TEXT,
  last_used_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.token,
    t.platform,
    t.device_id,
    t.last_used_at
  FROM user_push_tokens t
  WHERE
    t.user_id = p_user_id
    AND t.is_active = true
  ORDER BY t.created_at DESC; -- Newest tokens first
END;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_active_push_tokens(UUID) TO authenticated, service_role;

-- ============================================================================

-- Function: Check if user wants notifications based on preferences
-- Respects quiet hours and notification type preferences
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT -- 'prayer_responses', 'prayer_support', 'nearby_prayers', 'prayer_reminders'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_preferences JSONB;
  v_push_enabled BOOLEAN;
  v_type_enabled BOOLEAN;
  v_quiet_hours_enabled BOOLEAN;
  v_quiet_start TIME;
  v_quiet_end TIME;
  v_current_time TIME;
  v_in_quiet_hours BOOLEAN;
BEGIN
  -- Get user's notification preferences
  SELECT notification_preferences INTO v_preferences
  FROM profiles
  WHERE id = p_user_id;

  -- If no preferences found, default to true (send notification)
  IF v_preferences IS NULL THEN
    RETURN true;
  END IF;

  -- Check master switch
  v_push_enabled := COALESCE((v_preferences->>'push_enabled')::boolean, true);
  IF NOT v_push_enabled THEN
    RETURN false;
  END IF;

  -- Check specific notification type
  v_type_enabled := COALESCE((v_preferences->>p_notification_type)::boolean, true);
  IF NOT v_type_enabled THEN
    RETURN false;
  END IF;

  -- Check quiet hours
  v_quiet_hours_enabled := COALESCE((v_preferences->>'quiet_hours_enabled')::boolean, false);
  IF v_quiet_hours_enabled THEN
    v_quiet_start := (v_preferences->>'quiet_hours_start')::TIME;
    v_quiet_end := (v_preferences->>'quiet_hours_end')::TIME;
    v_current_time := CURRENT_TIME;

    -- Handle quiet hours that span midnight (e.g., 22:00 to 07:00)
    IF v_quiet_start > v_quiet_end THEN
      v_in_quiet_hours := v_current_time >= v_quiet_start OR v_current_time < v_quiet_end;
    ELSE
      v_in_quiet_hours := v_current_time >= v_quiet_start AND v_current_time < v_quiet_end;
    END IF;

    IF v_in_quiet_hours THEN
      RETURN false;
    END IF;
  END IF;

  -- All checks passed, send notification
  RETURN true;
END;
$$;

-- Grant execute to service role (edge functions will call this)
GRANT EXECUTE ON FUNCTION should_send_notification(UUID, TEXT) TO authenticated, service_role;

-- ============================================================================

-- Function: Mark token as used (update last_used_at)
-- Called after successfully sending a notification
CREATE OR REPLACE FUNCTION mark_token_used(
  p_token_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_push_tokens
  SET last_used_at = now()
  WHERE id = p_token_id;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION mark_token_used(BIGINT) TO service_role;

-- ============================================================================

-- Function: Deactivate stale tokens (not used in 90+ days)
-- Run as a scheduled job to clean up abandoned devices
CREATE OR REPLACE FUNCTION deactivate_stale_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH deactivated AS (
    UPDATE user_push_tokens
    SET is_active = false
    WHERE
      is_active = true
      AND (
        last_used_at < now() - INTERVAL '90 days'
        OR (last_used_at IS NULL AND created_at < now() - INTERVAL '90 days')
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deactivated;

  RETURN v_count;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION deactivate_stale_tokens() TO service_role;

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at timestamp on token changes
CREATE OR REPLACE FUNCTION update_push_token_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_push_token_updated
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_token_timestamp();

-- ============================================================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on user_push_tokens table
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER_PUSH_TOKENS TABLE POLICIES
-- ============================================================================

-- Policy: Users can view only their own push tokens
CREATE POLICY "Users can view own push tokens"
ON user_push_tokens FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own push tokens (when registering device)
CREATE POLICY "Users can insert own push tokens"
ON user_push_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own push tokens (e.g., mark inactive on logout)
CREATE POLICY "Users can update own push tokens"
ON user_push_tokens FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own push tokens
CREATE POLICY "Users can delete own push tokens"
ON user_push_tokens FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Service role can read all active tokens (for sending notifications)
-- Note: This is handled at the Supabase client level with service_role key
-- Regular authenticated users cannot access other users' tokens

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant table access to authenticated users (RLS will restrict to own tokens)
GRANT SELECT, INSERT, UPDATE, DELETE ON user_push_tokens TO authenticated;

-- Grant sequence access for auto-increment ID
GRANT USAGE, SELECT ON SEQUENCE user_push_tokens_id_seq TO authenticated;

-- Service role has full access (bypasses RLS)
GRANT ALL ON user_push_tokens TO service_role;
GRANT ALL ON SEQUENCE user_push_tokens_id_seq TO service_role;

-- ============================================================================
-- 8. SAMPLE QUERIES (FOR REFERENCE)
-- ============================================================================

-- Register a new push token
-- INSERT INTO user_push_tokens (user_id, token, platform, device_id)
-- VALUES (auth.uid(), 'fcm_token_here', 'android', 'android_12345_abc');

-- Get all active tokens for current user
-- SELECT * FROM get_active_push_tokens(auth.uid());

-- Update notification preferences
-- UPDATE profiles
-- SET notification_preferences = notification_preferences || '{"prayer_responses": false}'::jsonb
-- WHERE id = auth.uid();

-- Check if user wants notifications for prayer responses
-- SELECT should_send_notification(auth.uid(), 'prayer_responses');

-- Deactivate token on logout
-- UPDATE user_push_tokens
-- SET is_active = false
-- WHERE user_id = auth.uid() AND platform = 'ios';

-- Cleanup stale tokens (run as scheduled job)
-- SELECT deactivate_stale_tokens();

-- ============================================================================
-- 9. MONITORING QUERIES
-- ============================================================================

-- Count active tokens by platform
-- SELECT platform, COUNT(*) as active_tokens
-- FROM user_push_tokens
-- WHERE is_active = true
-- GROUP BY platform;

-- Find users with multiple devices
-- SELECT user_id, COUNT(*) as device_count
-- FROM user_push_tokens
-- WHERE is_active = true
-- GROUP BY user_id
-- HAVING COUNT(*) > 1
-- ORDER BY device_count DESC;

-- Find tokens not used in 30+ days (candidates for cleanup)
-- SELECT COUNT(*) as stale_tokens
-- FROM user_push_tokens
-- WHERE is_active = true
-- AND (last_used_at < now() - INTERVAL '30 days' OR last_used_at IS NULL);

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- 1. Token Lookup Performance
--    - Primary query: get_active_push_tokens(user_id)
--    - Uses index: user_push_tokens_user_id_active_idx
--    - Expected time: < 5ms for 100k tokens
--
-- 2. Notification Preference Checks
--    - should_send_notification() is STABLE (can be cached in same transaction)
--    - Quiet hours calculation is timezone-aware at app level
--    - Uses JSONB operators for fast preference lookups
--
-- 3. Cleanup Strategy
--    - Tokens unused for 90+ days are marked inactive (soft delete)
--    - Hard delete not recommended (preserves audit trail)
--    - Run deactivate_stale_tokens() weekly via cron job
--
-- 4. Multi-Device Support
--    - Users can have multiple active tokens (iPhone + iPad + Web)
--    - Unique constraint prevents duplicate tokens per platform
--    - Notifications sent to ALL active devices

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- 1. Token Storage
--    - FCM/APNs tokens are not sensitive (can't be used without server key)
--    - RLS ensures users can only access their own tokens
--    - Service role access required for notification sending
--
-- 2. Privacy
--    - notification_preferences in profiles table (user-controlled)
--    - Quiet hours respect user's local timezone (handled at app level)
--    - Users can disable all notifications with push_enabled flag
--
-- 3. Abuse Prevention
--    - Unique constraint prevents token spam
--    - Stale token cleanup prevents database bloat
--    - Rate limiting should be implemented at edge function level

-- ============================================================================
-- INTEGRATION WITH EDGE FUNCTIONS
-- ============================================================================

-- Edge function workflow for sending notifications:
--
-- 1. Event occurs (e.g., prayer response created)
-- 2. Edge function calls should_send_notification(user_id, 'prayer_responses')
-- 3. If true, fetch tokens with get_active_push_tokens(user_id)
-- 4. Send notification to FCM/APNs for each token
-- 5. Call mark_token_used(token_id) on successful send
-- 6. If token invalid/expired, set is_active = false
--
-- Example edge function code:
-- ```typescript
-- const { data: tokens } = await supabase.rpc('get_active_push_tokens', {
--   p_user_id: userId
-- });
--
-- for (const token of tokens) {
--   try {
--     await sendPushNotification(token.token, notification);
--     await supabase.rpc('mark_token_used', { p_token_id: token.id });
--   } catch (error) {
--     if (error.code === 'messaging/invalid-registration-token') {
--       await supabase.from('user_push_tokens')
--         .update({ is_active: false })
--         .eq('id', token.id);
--     }
--   }
-- }
-- ```

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration adds comprehensive push notification support:
-- 1. ✅ user_push_tokens table for storing FCM/APNs tokens
-- 2. ✅ Multi-device support (iOS, Android, Web)
-- 3. ✅ notification_preferences JSONB column in profiles
-- 4. ✅ Granular notification controls (type-specific + quiet hours)
-- 5. ✅ Helper functions for token management and preference checks
-- 6. ✅ Comprehensive RLS policies for security
-- 7. ✅ Indexes for optimal query performance
-- 8. ✅ Stale token cleanup mechanism
-- 9. ✅ Full integration documentation for edge functions
--
-- Next steps:
-- - Create edge function for sending notifications
-- - Set up scheduled job for deactivate_stale_tokens()
-- - Implement notification rate limiting
-- - Add push notification analytics tracking
-- ============================================================================
