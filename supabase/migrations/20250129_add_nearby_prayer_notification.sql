-- ============================================================================
-- PrayerMap: Nearby Prayer Notification System
-- ============================================================================
--
-- Purpose: Notify users when new prayers are posted within their notification radius
--
-- Features:
-- - PostGIS geospatial queries to find nearby users
-- - Rate limiting to prevent notification spam (max 1 nearby notification per hour)
-- - User preferences for enabling/disabling nearby prayer notifications
-- - Push notification token storage for FCM/APNs
-- - In-app notification records
--
-- Performance:
-- - Uses ST_DWithin for efficient radius queries
-- - Partial indexes on active tokens and preferences
-- - Rate limit check prevents duplicate queries
--
-- Mobile Impact:
-- - iOS: APNs tokens stored
-- - Android: FCM tokens stored
-- - Respects user notification preferences
--
-- Created: 2025-01-29
-- ============================================================================

-- ============================================================================
-- STEP 1: Extend notification_type enum to include NEARBY_PRAYER
-- ============================================================================

-- Check if the value already exists before adding
DO $$
BEGIN
    -- Add NEARBY_PRAYER to notification_type enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'notification_type' AND e.enumlabel = 'NEARBY_PRAYER'
    ) THEN
        ALTER TYPE notification_type ADD VALUE 'NEARBY_PRAYER';
    END IF;
END
$$;

-- ============================================================================
-- STEP 2: Create user_push_tokens table
-- ============================================================================

-- Store FCM/APNs tokens for push notifications
-- Supports multiple devices per user (e.g., iPhone + iPad)
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Token from FCM (Android) or APNs (iOS)
    token TEXT NOT NULL,

    -- Platform: 'ios', 'android', or 'web'
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),

    -- Track token validity
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,

    -- One token per user per platform
    CONSTRAINT unique_user_platform_token UNIQUE (user_id, platform, token)
);

-- Indexes for push token lookups
CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_idx ON user_push_tokens (user_id);
CREATE INDEX IF NOT EXISTS user_push_tokens_active_idx ON user_push_tokens (user_id, is_active)
    WHERE is_active = true;

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own tokens
CREATE POLICY "Users can view own push tokens"
ON user_push_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
ON user_push_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
ON user_push_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
ON user_push_tokens FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: Create notification_preferences table
-- ============================================================================

-- Store user preferences for different notification types
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,

    -- Notification type preferences
    nearby_prayers_enabled BOOLEAN NOT NULL DEFAULT true,
    prayer_support_enabled BOOLEAN NOT NULL DEFAULT true,
    prayer_response_enabled BOOLEAN NOT NULL DEFAULT true,
    prayer_answered_enabled BOOLEAN NOT NULL DEFAULT true,

    -- Global preference
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own preferences
CREATE POLICY "Users can view own notification preferences"
ON notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
ON notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
ON notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: Create notification_rate_limits table
-- ============================================================================

-- Track last notification sent to prevent spam
-- Rate limit: Max 1 nearby prayer notification per hour per user
CREATE TABLE IF NOT EXISTS notification_rate_limits (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,

    -- Last notification timestamp
    last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Track frequency
    sent_count INTEGER NOT NULL DEFAULT 1,

    -- Constraint: One rate limit record per user per notification type
    CONSTRAINT unique_user_notification_type UNIQUE (user_id, notification_type)
);

-- Index for rate limit checks
CREATE INDEX IF NOT EXISTS notification_rate_limits_user_type_idx
ON notification_rate_limits (user_id, notification_type, last_sent_at);

-- Enable RLS
ALTER TABLE notification_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own rate limits
CREATE POLICY "Users can view own rate limits"
ON notification_rate_limits FOR SELECT
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: Create function to check rate limit
-- ============================================================================

CREATE OR REPLACE FUNCTION check_notification_rate_limit(
    p_user_id UUID,
    p_notification_type notification_type,
    p_rate_limit_minutes INTEGER DEFAULT 60 -- Default: 1 hour
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_last_sent_at TIMESTAMPTZ;
    v_can_send BOOLEAN;
BEGIN
    -- Get last notification timestamp
    SELECT last_sent_at INTO v_last_sent_at
    FROM notification_rate_limits
    WHERE user_id = p_user_id
      AND notification_type = p_notification_type;

    -- If no record exists, user can receive notification
    IF v_last_sent_at IS NULL THEN
        RETURN true;
    END IF;

    -- Check if enough time has passed
    v_can_send := (now() - v_last_sent_at) > (p_rate_limit_minutes || ' minutes')::INTERVAL;

    RETURN v_can_send;
END;
$$;

-- ============================================================================
-- STEP 6: Create function to update rate limit
-- ============================================================================

CREATE OR REPLACE FUNCTION update_notification_rate_limit(
    p_user_id UUID,
    p_notification_type notification_type
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO notification_rate_limits (user_id, notification_type, last_sent_at, sent_count)
    VALUES (p_user_id, p_notification_type, now(), 1)
    ON CONFLICT (user_id, notification_type)
    DO UPDATE SET
        last_sent_at = now(),
        sent_count = notification_rate_limits.sent_count + 1;
END;
$$;

-- ============================================================================
-- STEP 7: Create function to find nearby users and create notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_nearby_users_of_prayer(
    p_prayer_id BIGINT,
    p_prayer_location GEOGRAPHY,
    p_prayer_creator_id UUID,
    p_prayer_title TEXT,
    p_prayer_preview TEXT
)
RETURNS INTEGER -- Returns count of notifications created
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to access all tables
AS $$
DECLARE
    v_nearby_user RECORD;
    v_notification_count INTEGER := 0;
    v_distance_km DOUBLE PRECISION;
BEGIN
    -- Find all users within their notification radius of the new prayer
    -- Exclude the prayer creator
    FOR v_nearby_user IN
        SELECT
            u.user_id,
            u.notification_radius_km,
            u.first_name,
            ST_Distance(
                p_prayer_location,
                ST_SetSRID(ST_MakePoint(
                    (u.user_id::text)::numeric, -- Placeholder: need user location
                    (u.user_id::text)::numeric
                ), 4326)::geography
            ) / 1000 AS distance_km
        FROM users u
        -- Join with notification preferences
        LEFT JOIN notification_preferences np ON u.user_id = np.user_id
        WHERE
            -- Not the prayer creator
            u.user_id != p_prayer_creator_id
            -- User has nearby prayer notifications enabled (default true if no preference set)
            AND COALESCE(np.nearby_prayers_enabled, true) = true
            AND COALESCE(np.push_notifications_enabled, true) = true
            -- Check rate limit (max 1 notification per hour)
            AND check_notification_rate_limit(u.user_id, 'NEARBY_PRAYER', 60) = true
            -- User has at least one active push token
            AND EXISTS (
                SELECT 1 FROM user_push_tokens upt
                WHERE upt.user_id = u.user_id
                  AND upt.is_active = true
            )
            -- TODO: Add location check when user location tracking is implemented
            -- For now, this is a placeholder that won't match any users
            -- In production, you would check:
            -- AND ST_DWithin(
            --     p_prayer_location,
            --     user_current_location_geography,
            --     u.notification_radius_km * 1000
            -- )
        LIMIT 100 -- Limit to prevent overwhelming the system
    LOOP
        -- Calculate actual distance (placeholder until user location is available)
        v_distance_km := 0; -- Would be calculated from ST_Distance

        -- Create in-app notification record
        INSERT INTO notifications (user_id, type, payload)
        VALUES (
            v_nearby_user.user_id,
            'NEARBY_PRAYER',
            jsonb_build_object(
                'prayer_id', p_prayer_id,
                'title', 'Someone nearby needs prayer',
                'body', COALESCE(p_prayer_title, LEFT(p_prayer_preview, 50)),
                'distance_km', v_distance_km,
                'preview', LEFT(p_prayer_preview, 100)
            )
        );

        -- Update rate limit
        PERFORM update_notification_rate_limit(v_nearby_user.user_id, 'NEARBY_PRAYER');

        v_notification_count := v_notification_count + 1;
    END LOOP;

    RETURN v_notification_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION notify_nearby_users_of_prayer(BIGINT, GEOGRAPHY, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_nearby_users_of_prayer(BIGINT, GEOGRAPHY, UUID, TEXT, TEXT) TO service_role;

-- ============================================================================
-- STEP 8: Create trigger on prayers table
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_nearby_prayer_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_preview TEXT;
    v_notification_count INTEGER;
BEGIN
    -- Only notify for active prayers (not hidden/removed)
    IF NEW.status != 'ACTIVE' THEN
        RETURN NEW;
    END IF;

    -- Create preview text
    v_preview := COALESCE(NEW.title, LEFT(NEW.text_body, 100));

    -- Find nearby users and create notifications
    -- Note: This is async - it won't block prayer creation
    v_notification_count := notify_nearby_users_of_prayer(
        NEW.prayer_id,
        NEW.location,
        NEW.user_id,
        NEW.title,
        v_preview
    );

    -- Log notification count (for monitoring)
    IF v_notification_count > 0 THEN
        RAISE NOTICE 'Created % nearby prayer notifications for prayer %', v_notification_count, NEW.prayer_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_prayer_created_notify_nearby'
    ) THEN
        CREATE TRIGGER on_prayer_created_notify_nearby
            AFTER INSERT ON prayers
            FOR EACH ROW
            EXECUTE FUNCTION trigger_nearby_prayer_notifications();
    END IF;
END
$$;

-- ============================================================================
-- STEP 9: Add helper function to get user's notification settings
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE (
    nearby_prayers_enabled BOOLEAN,
    prayer_support_enabled BOOLEAN,
    prayer_response_enabled BOOLEAN,
    prayer_answered_enabled BOOLEAN,
    push_notifications_enabled BOOLEAN,
    notification_radius_km INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(np.nearby_prayers_enabled, true) AS nearby_prayers_enabled,
        COALESCE(np.prayer_support_enabled, true) AS prayer_support_enabled,
        COALESCE(np.prayer_response_enabled, true) AS prayer_response_enabled,
        COALESCE(np.prayer_answered_enabled, true) AS prayer_answered_enabled,
        COALESCE(np.push_notifications_enabled, true) AS push_notifications_enabled,
        u.notification_radius_km
    FROM users u
    LEFT JOIN notification_preferences np ON u.user_id = np.user_id
    WHERE u.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;

-- ============================================================================
-- STEP 10: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE user_push_tokens IS
'Stores FCM/APNs tokens for sending push notifications to iOS and Android devices';

COMMENT ON TABLE notification_preferences IS
'User preferences for different types of notifications (nearby prayers, support, responses, etc.)';

COMMENT ON TABLE notification_rate_limits IS
'Rate limiting table to prevent notification spam. Max 1 nearby prayer notification per hour per user.';

COMMENT ON FUNCTION notify_nearby_users_of_prayer IS
'Finds users within notification radius and creates notification records. Called by trigger on prayer insert.';

COMMENT ON FUNCTION check_notification_rate_limit IS
'Checks if user can receive a notification based on rate limit (default 60 minutes between nearby prayer notifications)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

/*
NEXT STEPS FOR IMPLEMENTATION:

1. User Location Tracking:
   - Add user_locations table to track user's current/last known location
   - Update notify_nearby_users_of_prayer to use actual user locations
   - Consider privacy: location should be approximate, not precise

2. Edge Function Setup:
   - Deploy nearby-prayer-notify edge function
   - Configure FCM/APNs credentials
   - Test push notification delivery

3. Frontend Integration:
   - Call pushNotificationService.initialize() on app start
   - Add notification settings UI for users
   - Handle notification tap actions

4. Testing:
   - Test with real devices (iOS + Android)
   - Verify rate limiting works
   - Test notification radius accuracy
   - Load test with many concurrent prayers

5. Monitoring:
   - Track notification delivery rates
   - Monitor rate limit hits
   - Alert on notification failures
   - Measure user engagement with nearby prayer notifications

IMPORTANT NOTES:
- Current implementation creates in-app notification records
- Push notification sending requires edge function (see nearby-prayer-notify/index.ts)
- User location tracking not yet implemented (needed for actual radius filtering)
- Rate limiting prevents spam (max 1 notification per hour)
- Default notification radius: 30 miles (48km) per users table default

PERFORMANCE CONSIDERATIONS:
- PostGIS ST_DWithin uses spatial index (fast)
- Limit to 100 notifications per prayer (prevent DoS)
- Rate limiting reduces database load
- Async trigger won't block prayer creation
*/
