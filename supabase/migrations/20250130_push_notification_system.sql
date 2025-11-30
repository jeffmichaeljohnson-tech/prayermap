-- ============================================================================
-- Push Notification System
-- ============================================================================
-- This migration creates the infrastructure for push notifications:
-- 1. user_push_tokens table - stores FCM/APNs tokens
-- 2. Trigger to send push notifications when notifications are created
--
-- Dependencies:
-- - Requires send-notification edge function to be deployed
-- - Requires FCM server key in edge function environment variables
-- ============================================================================

-- Create user_push_tokens table
-- Stores FCM (Android) and APNs (iOS) device tokens for push notifications
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Device token from FCM or APNs
    token TEXT NOT NULL,

    -- Platform: 'android', 'ios', or 'web' (future)
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),

    -- Enable/disable push notifications per device
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Track last successful send to detect stale tokens
    last_used_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    UNIQUE(user_id, platform), -- One token per user per platform
    CONSTRAINT valid_token CHECK (LENGTH(token) > 0)
);

-- Index for fast lookups by user
CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_enabled ON user_push_tokens(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see and manage their own tokens
CREATE POLICY user_push_tokens_select_own
    ON user_push_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY user_push_tokens_insert_own
    ON user_push_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_push_tokens_update_own
    ON user_push_tokens FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_push_tokens_delete_own
    ON user_push_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- Push Notification Trigger Function
-- ============================================================================
-- Calls the send-notification edge function when a notification is created
-- Uses pg_net extension to make async HTTP calls without blocking the insert

-- Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on net schema to authenticated and service_role
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;

-- Function to trigger push notification sending
CREATE OR REPLACE FUNCTION trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to access pg_net
AS $$
DECLARE
    function_url TEXT;
    service_role_key TEXT;
    request_id BIGINT;
BEGIN
    -- Get Supabase URL and service role key from environment
    -- Note: These are set by Supabase and available to SECURITY DEFINER functions
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification';
    service_role_key := current_setting('app.settings.service_role_key', true);

    -- Fallback if settings not configured
    IF function_url IS NULL OR service_role_key IS NULL THEN
        RAISE WARNING 'Supabase URL or service role key not configured for push notifications';
        RETURN NEW;
    END IF;

    -- Make async HTTP POST request to edge function
    -- This doesn't block the notification insert
    SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
            'notification_id', NEW.notification_id,
            'user_id', NEW.user_id,
            'type', NEW.type,
            'payload', NEW.payload
        )
    ) INTO request_id;

    -- Log the request (optional, for debugging)
    RAISE LOG 'Triggered push notification for notification_id=%', NEW.notification_id;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the insert if push notification fails
        RAISE WARNING 'Failed to trigger push notification: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger on notifications table
-- Fires after each notification insert
DROP TRIGGER IF EXISTS on_notification_send_push ON notifications;
CREATE TRIGGER on_notification_send_push
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_push_notification();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to clean up stale tokens (tokens that haven't been used in 90 days)
-- Should be called periodically via a cron job or edge function
CREATE OR REPLACE FUNCTION cleanup_stale_push_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete tokens not used in 90 days
    DELETE FROM user_push_tokens
    WHERE last_used_at < now() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RAISE LOG 'Cleaned up % stale push tokens', deleted_count;

    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- Configuration Settings (Alternative to pg_net trigger)
-- ============================================================================
-- If pg_net doesn't work reliably, use Supabase Database Webhooks instead:
--
-- 1. Go to Supabase Dashboard > Database > Webhooks
-- 2. Create new webhook:
--    - Name: "Push Notification Sender"
--    - Table: notifications
--    - Events: INSERT
--    - Type: HTTP Request
--    - Method: POST
--    - URL: https://[project-ref].supabase.co/functions/v1/send-notification
--    - Headers:
--      * Authorization: Bearer [service-role-key]
--      * Content-Type: application/json
--    - Payload: record
--
-- The webhook will automatically call the edge function with the notification data.
-- ============================================================================

COMMENT ON TABLE user_push_tokens IS 'Stores FCM and APNs device tokens for push notifications';
COMMENT ON COLUMN user_push_tokens.token IS 'FCM or APNs device token';
COMMENT ON COLUMN user_push_tokens.platform IS 'Device platform: android, ios, or web';
COMMENT ON COLUMN user_push_tokens.enabled IS 'Whether push notifications are enabled for this device';
COMMENT ON COLUMN user_push_tokens.last_used_at IS 'Last time a notification was successfully sent to this token';
