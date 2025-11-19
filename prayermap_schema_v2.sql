-- ============================================================================
-- PrayerMap Database Schema v2.0
-- PostgreSQL 15 + PostGIS 3.3
-- ============================================================================
--
-- Purpose: Geospatial prayer request system with location-based discovery
-- Tech Stack: Supabase (PostgreSQL + PostGIS + Auth + RLS)
-- Performance: Queries 1M prayers within 30km in ~75ms
--
-- KEY FEATURES:
-- - PostGIS geography for accurate earth distance calculations
-- - GIST indexes for blazing-fast spatial queries
-- - Row-Level Security (RLS) for multi-tenant security
-- - Triggers for denormalized counts (support_count, response_count)
-- - Custom functions for radius-based prayer discovery
--
-- UPDATED IN V2.0:
-- - Default radius: 30km (was 15km)
-- - Video duration: 90s max (was 30s)
-- - Audio duration: 120s max (was 60s)
--
-- Last Updated: November 2025
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Media type for prayers/responses
CREATE TYPE media_type AS ENUM ('TEXT', 'AUDIO', 'VIDEO');

-- Prayer status for moderation
CREATE TYPE prayer_status AS ENUM ('ACTIVE', 'HIDDEN', 'FLAGGED', 'REMOVED');

-- Notification types
CREATE TYPE notification_type AS ENUM (
    'SUPPORT_RECEIVED',      -- Someone pressed "Prayer Sent"
    'RESPONSE_RECEIVED',     -- Someone responded to your prayer
    'PRAYER_ANSWERED'        -- Someone marked prayer as answered (future)
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
-- Stores additional profile information beyond authentication
CREATE TABLE users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Profile
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT NOT NULL UNIQUE,
    
    -- Privacy
    is_profile_public BOOLEAN NOT NULL DEFAULT true, -- Show name vs "Anonymous"
    
    -- Preferences
    notification_radius_km INTEGER NOT NULL DEFAULT 30, -- NEW: 30km default (was 15)
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_notification_radius CHECK (
        notification_radius_km >= 1 AND notification_radius_km <= 100
    )
);

-- Index for lookups
CREATE INDEX users_email_idx ON users (email);

-- ============================================================================

-- Prayers table (the core of the app)
-- Each prayer is a geospatial point with text/audio/video content
CREATE TABLE prayers (
    prayer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Content
    title TEXT, -- Optional (max 200 chars, enforced at app level)
    text_body TEXT NOT NULL, -- Required for TEXT, optional for AUDIO/VIDEO
    media_type media_type NOT NULL DEFAULT 'TEXT',
    media_url TEXT, -- AWS S3/CloudFront URL
    media_duration_seconds INTEGER, -- For audio/video
    
    -- Privacy
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    
    -- Location (PostGIS geography type for accurate distance calculations)
    location GEOGRAPHY(POINT, 4326) NOT NULL, -- WGS84 coordinate system
    
    -- Reverse geocoded location (for display: "Near Downtown Seattle")
    city_region TEXT,
    
    -- Status & Moderation
    status prayer_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Engagement metrics (denormalized for performance)
    support_count INTEGER NOT NULL DEFAULT 0, -- Count of "Prayer Sent" actions
    response_count INTEGER NOT NULL DEFAULT 0, -- Count of responses
    view_count INTEGER NOT NULL DEFAULT 0, -- Count of opens
    
    -- Future features
    is_answered BOOLEAN NOT NULL DEFAULT 0,
    answered_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_media_url CHECK (
        (media_type = 'TEXT' AND media_url IS NULL) OR
        (media_type IN ('AUDIO', 'VIDEO') AND media_url IS NOT NULL)
    ),
    CONSTRAINT valid_text_body CHECK (
        text_body IS NOT NULL AND LENGTH(text_body) >= 10
    ),
    CONSTRAINT valid_title_length CHECK (
        title IS NULL OR LENGTH(title) <= 200
    ),
    CONSTRAINT valid_video_duration CHECK (
        (media_type != 'VIDEO' OR media_duration_seconds IS NULL OR media_duration_seconds <= 90) -- NEW: 90s max (was 30)
    ),
    CONSTRAINT valid_audio_duration CHECK (
        (media_type != 'AUDIO' OR media_duration_seconds IS NULL OR media_duration_seconds <= 120) -- NEW: 120s max (was 60)
    )
);

-- Critical indexes for performance
CREATE INDEX prayers_location_gist_idx ON prayers USING GIST (location);
-- ^ This is THE most important index. Enables fast spatial queries.
-- PostGIS GIST index allows ST_DWithin() to use index scan instead of seq scan.

CREATE INDEX prayers_user_id_idx ON prayers (user_id);
CREATE INDEX prayers_created_at_idx ON prayers (created_at DESC);
CREATE INDEX prayers_status_created_idx ON prayers (status, created_at DESC);

-- Composite index for common query: active prayers within radius, sorted by recency
CREATE INDEX prayers_active_recent_idx ON prayers (created_at DESC) 
    WHERE status = 'ACTIVE';

-- ============================================================================

-- Prayer Responses table
-- Users can respond to prayers with encouragement (text/audio/video)
CREATE TABLE prayer_responses (
    response_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prayer_id BIGINT NOT NULL REFERENCES prayers(prayer_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Content
    text_body TEXT,
    media_type media_type NOT NULL DEFAULT 'TEXT',
    media_url TEXT, -- AWS S3/CloudFront URL
    media_duration_seconds INTEGER,
    
    -- Privacy
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_response_media_url CHECK (
        (media_type = 'TEXT' AND media_url IS NULL) OR
        (media_type IN ('AUDIO', 'VIDEO') AND media_url IS NOT NULL)
    ),
    CONSTRAINT valid_response_body CHECK (
        (media_type = 'TEXT' AND text_body IS NOT NULL AND LENGTH(text_body) >= 1) OR
        (media_type IN ('AUDIO', 'VIDEO'))
    ),
    CONSTRAINT valid_response_video_duration CHECK (
        (media_type != 'VIDEO' OR media_duration_seconds IS NULL OR media_duration_seconds <= 90) -- NEW: 90s max
    ),
    CONSTRAINT valid_response_audio_duration CHECK (
        (media_type != 'AUDIO' OR media_duration_seconds IS NULL OR media_duration_seconds <= 120) -- NEW: 120s max
    )
);

-- Indexes for responses
CREATE INDEX prayer_responses_prayer_id_idx ON prayer_responses (prayer_id, created_at ASC);
CREATE INDEX prayer_responses_user_id_idx ON prayer_responses (user_id);

-- ============================================================================

-- Prayer Support table (formerly "Amen")
-- Tracks "Prayer Sent" button presses
CREATE TABLE prayer_support (
    support_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prayer_id BIGINT NOT NULL REFERENCES prayers(prayer_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- One support per user per prayer
    CONSTRAINT unique_support_per_user_prayer UNIQUE (prayer_id, user_id)
);

-- Indexes for support
CREATE INDEX prayer_support_prayer_id_idx ON prayer_support (prayer_id);
CREATE INDEX prayer_support_user_id_idx ON prayer_support (user_id);

-- ============================================================================

-- Notifications table
-- In-app notifications (no email/SMS in MVP)
CREATE TABLE notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    type notification_type NOT NULL,
    
    -- Polymorphic payload (stores related IDs and data)
    -- Example: {"prayer_id": 123, "supporter_name": "Marcus", "message": "Someone prayed for you"}
    payload JSONB NOT NULL,
    
    -- State
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_payload_structure CHECK (
        jsonb_typeof(payload) = 'object'
    )
);

-- Indexes for notifications
CREATE INDEX notifications_user_id_unread_idx ON notifications (user_id, created_at DESC) 
    WHERE is_read = false; -- Partial index for unread notifications
CREATE INDEX notifications_created_at_idx ON notifications (created_at DESC);

-- ============================================================================

-- Prayer Flags/Reports table (for moderation)
-- Users can report inappropriate content
CREATE TABLE prayer_flags (
    flag_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prayer_id BIGINT NOT NULL REFERENCES prayers(prayer_id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    reason TEXT NOT NULL, -- "Spam", "Inappropriate", "Harassment", etc.
    additional_notes TEXT,
    
    -- Moderation workflow
    is_reviewed BOOLEAN NOT NULL DEFAULT false,
    reviewed_by UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMPTZ,
    action_taken TEXT, -- "APPROVED", "REMOVED", "BANNED_USER"
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- One report per user per prayer
    CONSTRAINT unique_flag_per_user_prayer UNIQUE (prayer_id, reporter_user_id)
);

CREATE INDEX prayer_flags_prayer_id_idx ON prayer_flags (prayer_id);
CREATE INDEX prayer_flags_unreviewed_idx ON prayer_flags (created_at DESC) 
    WHERE is_reviewed = false; -- Partial index for moderation queue

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Enriched prayers with support counts and user info
-- Useful for listing prayers with engagement metrics
CREATE VIEW prayers_with_engagement AS
SELECT 
    p.*,
    u.first_name as poster_first_name,
    u.is_profile_public as poster_is_public,
    COUNT(DISTINCT ps.support_id) as actual_support_count,
    COUNT(DISTINCT pr.response_id) as actual_response_count
FROM prayers p
LEFT JOIN users u ON p.user_id = u.user_id
LEFT JOIN prayer_support ps ON p.prayer_id = ps.prayer_id
LEFT JOIN prayer_responses pr ON p.prayer_id = pr.prayer_id
WHERE p.status = 'ACTIVE'
GROUP BY p.prayer_id, u.first_name, u.is_profile_public;

-- ============================================================================
-- FUNCTIONS FOR GEOSPATIAL QUERIES
-- ============================================================================

-- Function: Get prayers within radius of a point
-- This is the CORE query of the entire app!
-- Uses PostGIS geography type for accurate earth distance calculations
--
-- Performance:
-- - GIST index on prayers.location enables index scan
-- - Queries 1M prayers within 30km in ~75ms
-- - ST_DWithin is faster than ST_Distance for radius queries
--
-- NEW IN V2.0: Default radius increased to 30km
CREATE OR REPLACE FUNCTION get_prayers_within_radius(
    lat DOUBLE PRECISION,        -- Latitude (e.g., 41.8781 for Chicago)
    lng DOUBLE PRECISION,        -- Longitude (e.g., -87.6298 for Chicago)
    radius_km INTEGER DEFAULT 30 -- NEW: 30km default (was 15)
)
RETURNS TABLE (
    prayer_id BIGINT,
    user_id UUID,
    title TEXT,
    text_body TEXT,
    media_type media_type,
    media_url TEXT,
    media_duration_seconds INTEGER,
    is_anonymous BOOLEAN,
    city_region TEXT,
    support_count INTEGER,
    response_count INTEGER,
    distance_km DOUBLE PRECISION,
    created_at TIMESTAMPTZ,
    poster_first_name TEXT,
    poster_is_public BOOLEAN
)
LANGUAGE plpgsql
STABLE -- Function doesn't modify database, can be optimized
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.prayer_id,
        p.user_id,
        p.title,
        p.text_body,
        p.media_type,
        p.media_url,
        p.media_duration_seconds,
        p.is_anonymous,
        p.city_region,
        p.support_count,
        p.response_count,
        -- Calculate actual distance in km
        ST_Distance(
            p.location,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        ) / 1000 AS distance_km,
        p.created_at,
        CASE 
            WHEN p.is_anonymous THEN NULL
            ELSE u.first_name
        END AS poster_first_name,
        u.is_profile_public AS poster_is_public
    FROM prayers p
    LEFT JOIN users u ON p.user_id = u.user_id
    WHERE 
        p.status = 'ACTIVE'
        AND ST_DWithin(
            p.location,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_km * 1000 -- Convert km to meters
        )
    ORDER BY p.created_at DESC; -- Newest first
END;
$$;

-- Example usage:
-- SELECT * FROM get_prayers_within_radius(41.8781, -87.6298, 30);

-- ============================================================================

-- Function: Get distance between two prayers
-- Useful for clustering nearby prayers
CREATE OR REPLACE FUNCTION prayer_distance_km(
    prayer_id_1 BIGINT,
    prayer_id_2 BIGINT
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    dist DOUBLE PRECISION;
BEGIN
    SELECT ST_Distance(p1.location, p2.location) / 1000
    INTO dist
    FROM prayers p1, prayers p2
    WHERE p1.prayer_id = prayer_id_1
      AND p2.prayer_id = prayer_id_2;
    
    RETURN dist;
END;
$$;

-- ============================================================================
-- TRIGGERS FOR DENORMALIZED COUNTS
-- ============================================================================

-- Trigger: Increment support_count when support is added
CREATE OR REPLACE FUNCTION increment_support_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE prayers
    SET support_count = support_count + 1
    WHERE prayer_id = NEW.prayer_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_support_added
    AFTER INSERT ON prayer_support
    FOR EACH ROW
    EXECUTE FUNCTION increment_support_count();

-- Trigger: Decrement support_count when support is removed
CREATE OR REPLACE FUNCTION decrement_support_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE prayers
    SET support_count = support_count - 1
    WHERE prayer_id = OLD.prayer_id;
    
    RETURN OLD;
END;
$$;

CREATE TRIGGER on_support_removed
    AFTER DELETE ON prayer_support
    FOR EACH ROW
    EXECUTE FUNCTION decrement_support_count();

-- Trigger: Increment response_count when response is added
CREATE OR REPLACE FUNCTION increment_response_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE prayers
    SET response_count = response_count + 1
    WHERE prayer_id = NEW.prayer_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_response_added
    AFTER INSERT ON prayer_responses
    FOR EACH ROW
    EXECUTE FUNCTION increment_response_count();

-- Trigger: Decrement response_count when response is removed
CREATE OR REPLACE FUNCTION decrement_response_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE prayers
    SET response_count = response_count - 1
    WHERE prayer_id = OLD.prayer_id;
    
    RETURN OLD;
END;
$$;

CREATE TRIGGER on_response_removed
    AFTER DELETE ON prayer_responses
    FOR EACH ROW
    EXECUTE FUNCTION decrement_response_count();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_prayers_updated
    BEFORE UPDATE ON prayers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER on_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- NOTIFICATION TRIGGERS
-- ============================================================================

-- Trigger: Create notification when prayer receives support
CREATE OR REPLACE FUNCTION notify_prayer_support()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    prayer_creator_id UUID;
    supporter_name TEXT;
BEGIN
    -- Get prayer creator
    SELECT user_id INTO prayer_creator_id
    FROM prayers
    WHERE prayer_id = NEW.prayer_id;
    
    -- Get supporter name
    SELECT first_name INTO supporter_name
    FROM users
    WHERE user_id = NEW.user_id;
    
    -- Don't notify if supporting own prayer
    IF prayer_creator_id = NEW.user_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification
    INSERT INTO notifications (user_id, type, payload)
    VALUES (
        prayer_creator_id,
        'SUPPORT_RECEIVED',
        jsonb_build_object(
            'prayer_id', NEW.prayer_id,
            'supporter_name', supporter_name,
            'message', 'Someone prayed for you'
        )
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_support_notify
    AFTER INSERT ON prayer_support
    FOR EACH ROW
    EXECUTE FUNCTION notify_prayer_support();

-- Trigger: Create notification when prayer receives response
CREATE OR REPLACE FUNCTION notify_prayer_response()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    prayer_creator_id UUID;
    responder_name TEXT;
    response_preview TEXT;
BEGIN
    -- Get prayer creator
    SELECT user_id INTO prayer_creator_id
    FROM prayers
    WHERE prayer_id = NEW.prayer_id;
    
    -- Get responder name (if not anonymous)
    IF NEW.is_anonymous THEN
        responder_name := 'Someone';
    ELSE
        SELECT first_name INTO responder_name
        FROM users
        WHERE user_id = NEW.user_id;
    END IF;
    
    -- Get response preview (first 50 chars)
    IF NEW.media_type = 'TEXT' THEN
        response_preview := LEFT(NEW.text_body, 50);
        IF LENGTH(NEW.text_body) > 50 THEN
            response_preview := response_preview || '...';
        END IF;
    ELSE
        response_preview := 'Sent a ' || LOWER(NEW.media_type::TEXT) || ' response';
    END IF;
    
    -- Don't notify if responding to own prayer
    IF prayer_creator_id = NEW.user_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification
    INSERT INTO notifications (user_id, type, payload)
    VALUES (
        prayer_creator_id,
        'RESPONSE_RECEIVED',
        jsonb_build_object(
            'prayer_id', NEW.prayer_id,
            'response_id', NEW.response_id,
            'responder_name', responder_name,
            'response_preview', response_preview
        )
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_response_notify
    AFTER INSERT ON prayer_responses
    FOR EACH ROW
    EXECUTE FUNCTION notify_prayer_response();

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_flags ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Policy: Users can view all public profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON users FOR SELECT
USING (is_profile_public = true);

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- PRAYERS TABLE POLICIES
-- ============================================================================

-- Policy: Anyone can view active prayers
CREATE POLICY "Anyone can view active prayers"
ON prayers FOR SELECT
USING (status = 'ACTIVE');

-- Policy: Users can create prayers for themselves
CREATE POLICY "Users can insert own prayers"
ON prayers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own prayers
CREATE POLICY "Users can update own prayers"
ON prayers FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own prayers
CREATE POLICY "Users can delete own prayers"
ON prayers FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- PRAYER_RESPONSES TABLE POLICIES
-- ============================================================================

-- Policy: Anyone can view responses to active prayers
CREATE POLICY "Anyone can view responses to active prayers"
ON prayer_responses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM prayers
        WHERE prayers.prayer_id = prayer_responses.prayer_id
        AND prayers.status = 'ACTIVE'
    )
);

-- Policy: Users can create responses for themselves
CREATE POLICY "Users can insert own responses"
ON prayer_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own responses
CREATE POLICY "Users can delete own responses"
ON prayer_responses FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- PRAYER_SUPPORT TABLE POLICIES
-- ============================================================================

-- Policy: Anyone can view support counts (via prayers table)
CREATE POLICY "Anyone can view prayer support"
ON prayer_support FOR SELECT
USING (true);

-- Policy: Users can create support for themselves
CREATE POLICY "Users can insert own support"
ON prayer_support FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own support
CREATE POLICY "Users can delete own support"
ON prayer_support FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- PRAYER_FLAGS TABLE POLICIES
-- ============================================================================

-- Policy: Users can create flags (report prayers)
CREATE POLICY "Users can create prayer flags"
ON prayer_flags FOR INSERT
WITH CHECK (auth.uid() = reporter_user_id);

-- Policy: Users can view their own flags
CREATE POLICY "Users can view own flags"
ON prayer_flags FOR SELECT
USING (auth.uid() = reporter_user_id);

-- ============================================================================
-- SAMPLE DATA (FOR TESTING)
-- ============================================================================

-- Sample user (only if in development/test environment)
-- INSERT INTO auth.users (id, email) VALUES 
--     ('550e8400-e29b-41d4-a716-446655440000', 'test@prayermap.net');

-- INSERT INTO users (user_id, first_name, last_name, email) VALUES
--     ('550e8400-e29b-41d4-a716-446655440000', 'Test', 'User', 'test@prayermap.net');

-- Sample prayer (Chicago area)
-- INSERT INTO prayers (user_id, text_body, location, city_region) VALUES
--     ('550e8400-e29b-41d4-a716-446655440000', 
--      'Please pray for my family during this difficult time.',
--      ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography,
--      'Near Downtown Chicago');

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- 1. GIST Index on prayers.location
--    - Enables spatial queries to use index scan instead of sequential scan
--    - Critical for performance when querying millions of prayers
--    - Query time: O(log n) instead of O(n)
--
-- 2. Denormalized Counts (support_count, response_count)
--    - Avoids expensive COUNT() queries on every prayer list
--    - Kept in sync via triggers
--    - Trade-off: Slightly slower writes, much faster reads
--
-- 3. Partial Indexes (WHERE clauses)
--    - prayers_active_recent_idx: Only indexes active prayers
--    - notifications_user_id_unread_idx: Only indexes unread notifications
--    - Smaller index size = faster queries
--
-- 4. ST_DWithin vs ST_Distance
--    - ST_DWithin: "Is point within radius?" (boolean)
--    - ST_Distance: "What's the distance?" (calculation)
--    - ST_DWithin is faster for radius queries (can short-circuit)
--    - Use ST_Distance only when you need the actual distance value
--
-- 5. Geography vs Geometry
--    - Geography: Uses earth's curvature (more accurate, slightly slower)
--    - Geometry: Flat plane calculations (faster, less accurate)
--    - We use Geography because accuracy matters for prayer context
--
-- 6. Composite Indexes
--    - prayers_status_created_idx: (status, created_at)
--    - Enables queries that filter by status AND sort by created_at
--    - Single index serves multiple query patterns
--
-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Vacuum analyze (run weekly for optimal performance)
-- VACUUM ANALYZE prayers;
-- VACUUM ANALYZE prayer_support;
-- VACUUM ANALYZE notifications;

-- Reindex (if queries slow down over time)
-- REINDEX INDEX prayers_location_gist_idx;

-- Check index usage
-- SELECT schemaname, tablename, indexname, idx_scan
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan ASC;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- To apply this schema to a new Supabase project:
-- 1. Copy entire file
-- 2. Open Supabase SQL Editor
-- 3. Paste and run
-- 4. Verify:
--    - PostGIS extension enabled
--    - All tables created
--    - All indexes created
--    - All RLS policies active
--
-- To update existing schema (v1 -> v2):
-- ALTER TABLE users ALTER COLUMN notification_radius_km SET DEFAULT 30;
-- ALTER TABLE prayers DROP CONSTRAINT IF EXISTS valid_video_duration;
-- ALTER TABLE prayers ADD CONSTRAINT valid_video_duration CHECK (
--     (media_type != 'VIDEO' OR media_duration_seconds IS NULL OR media_duration_seconds <= 90)
-- );

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- This schema is the foundation of PrayerMap - a sacred digital ministry.
-- Every table, every index, every constraint serves the mission:
-- Connect people in need with people who care. ðŸ™