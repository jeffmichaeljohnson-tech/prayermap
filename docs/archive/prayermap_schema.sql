-- ============================================================================
-- PRAYERMAP DATABASE SCHEMA v2.0
-- PostgreSQL 15 + PostGIS + Supabase
-- Optimized for geospatial queries, scalability, and Row-Level Security
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- Media types for prayers and responses
CREATE TYPE media_type AS ENUM ('TEXT', 'AUDIO', 'VIDEO');

-- Prayer status for future moderation
CREATE TYPE prayer_status AS ENUM ('ACTIVE', 'FLAGGED', 'REMOVED');

-- Notification types
CREATE TYPE notification_type AS ENUM (
    'NEW_PRAYER_NEARBY',
    'PRAYER_SUPPORT_RECEIVED',
    'NEW_RESPONSE_RECEIVED'
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table
-- Note: Supabase creates auth.users automatically, this is our profile extension
CREATE TABLE users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    
    -- User preferences
    notification_radius_km INTEGER NOT NULL DEFAULT 15 
        CHECK (notification_radius_km IN (1, 5, 10, 15, 25)),
    
    -- Location tracking (for "prayers near me")
    last_known_location GEOGRAPHY(POINT, 4326), -- PostGIS geography type
    last_location_update TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Privacy settings
    is_profile_public BOOLEAN NOT NULL DEFAULT false,
    
    -- Analytics
    total_prayers_sent INTEGER NOT NULL DEFAULT 0,
    total_prayers_received INTEGER NOT NULL DEFAULT 0
);

-- Index for geospatial queries on user location
CREATE INDEX users_location_gist_idx ON users USING GIST (last_known_location);
CREATE INDEX users_email_idx ON users (LOWER(email));
CREATE INDEX users_created_at_idx ON users (created_at DESC);

-- ============================================================================

-- Prayers table (the core of the app)
CREATE TABLE prayers (
    prayer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Content
    title TEXT, -- Optional
    text_body TEXT, -- Required for TEXT type, optional summary for AUDIO/VIDEO
    media_type media_type NOT NULL DEFAULT 'TEXT',
    media_url TEXT, -- Supabase Storage URL
    media_duration_seconds INTEGER, -- For audio/video
    
    -- Privacy
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    
    -- Location (PostGIS geography type for accurate distance calculations)
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    
    -- Reverse geocoded location (for display: "Near Downtown Seattle")
    city_region TEXT,
    
    -- Status & Moderation
    status prayer_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Engagement metrics (denormalized for performance)
    support_count INTEGER NOT NULL DEFAULT 0, -- Count of "Prayer Sent" actions
    response_count INTEGER NOT NULL DEFAULT 0, -- Count of responses
    view_count INTEGER NOT NULL DEFAULT 0, -- Count of opens
    
    -- Future features
    is_answered BOOLEAN NOT NULL DEFAULT false,
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
    )
);

-- Critical indexes for performance
CREATE INDEX prayers_location_gist_idx ON prayers USING GIST (location);
CREATE INDEX prayers_user_id_idx ON prayers (user_id);
CREATE INDEX prayers_created_at_idx ON prayers (created_at DESC);
CREATE INDEX prayers_status_created_idx ON prayers (status, created_at DESC);

-- Composite index for common query: active prayers within radius, sorted by recency
CREATE INDEX prayers_active_recent_idx ON prayers (created_at DESC) 
    WHERE status = 'ACTIVE';

-- ============================================================================

-- Prayer Responses table
CREATE TABLE prayer_responses (
    response_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prayer_id BIGINT NOT NULL REFERENCES prayers(prayer_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Content
    text_body TEXT,
    media_type media_type NOT NULL DEFAULT 'TEXT',
    media_url TEXT,
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
CREATE TABLE notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    type notification_type NOT NULL,
    
    -- Polymorphic payload (stores related IDs and data)
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
    WHERE is_read = false;
CREATE INDEX notifications_created_at_idx ON notifications (created_at DESC);

-- ============================================================================

-- Prayer Flags/Reports table (for moderation)
CREATE TABLE prayer_flags (
    flag_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prayer_id BIGINT NOT NULL REFERENCES prayers(prayer_id) ON DELETE CASCADE,
    reporter_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    reason TEXT NOT NULL,
    additional_notes TEXT,
    
    -- Moderation workflow
    is_reviewed BOOLEAN NOT NULL DEFAULT false,
    reviewed_by UUID REFERENCES users(user_id),
    reviewed_at TIMESTAMPTZ,
    action_taken TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- One report per user per prayer
    CONSTRAINT unique_flag_per_user_prayer UNIQUE (prayer_id, reporter_user_id)
);

CREATE INDEX prayer_flags_prayer_id_idx ON prayer_flags (prayer_id);
CREATE INDEX prayer_flags_unreviewed_idx ON prayer_flags (created_at DESC) 
    WHERE is_reviewed = false;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Enriched prayers with support counts and response counts
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
LEFT JOIN prayer_responses pr ON p.prayer_id = pr.response_id
WHERE p.status = 'ACTIVE'
GROUP BY p.prayer_id, u.first_name, u.is_profile_public;

-- ============================================================================
-- FUNCTIONS FOR GEOSPATIAL QUERIES
-- ============================================================================

-- Function: Get prayers within radius of a point
CREATE OR REPLACE FUNCTION get_prayers_within_radius(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km INTEGER DEFAULT 15,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    prayer_id BIGINT,
    user_id UUID,
    title TEXT,
    text_body TEXT,
    media_type media_type,
    media_url TEXT,
    is_anonymous BOOLEAN,
    poster_name TEXT,
    distance_km DOUBLE PRECISION,
    support_count INTEGER,
    response_count INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.prayer_id,
        p.user_id,
        p.title,
        p.text_body,
        p.media_type,
        p.media_url,
        p.is_anonymous,
        CASE 
            WHEN p.is_anonymous THEN 'Anonymous'::TEXT
            ELSE u.first_name
        END as poster_name,
        ST_Distance(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000.0 as distance_km,
        p.support_count,
        p.response_count,
        p.created_at
    FROM prayers p
    LEFT JOIN users u ON p.user_id = u.user_id
    WHERE 
        p.status = 'ACTIVE'
        AND ST_DWithin(
            p.location::geography,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            radius_km * 1000  -- Convert km to meters
        )
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS FOR MAINTAINING DENORMALIZED COUNTS
-- ============================================================================

-- Trigger: Update prayer support_count when support is added/removed
CREATE OR REPLACE FUNCTION update_prayer_support_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE prayers 
        SET support_count = support_count + 1 
        WHERE prayer_id = NEW.prayer_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE prayers 
        SET support_count = GREATEST(support_count - 1, 0)
        WHERE prayer_id = OLD.prayer_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prayer_support_count
AFTER INSERT OR DELETE ON prayer_support
FOR EACH ROW
EXECUTE FUNCTION update_prayer_support_count();

-- Trigger: Update prayer response_count when response is added/removed
CREATE OR REPLACE FUNCTION update_prayer_response_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE prayers 
        SET response_count = response_count + 1 
        WHERE prayer_id = NEW.prayer_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE prayers 
        SET response_count = GREATEST(response_count - 1, 0)
        WHERE prayer_id = OLD.prayer_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prayer_response_count
AFTER INSERT OR DELETE ON prayer_responses
FOR EACH ROW
EXECUTE FUNCTION update_prayer_response_count();

-- Trigger: Update user's total prayer counts
CREATE OR REPLACE FUNCTION update_user_prayer_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET total_prayers_received = total_prayers_received + 1 
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_received_count
AFTER INSERT ON prayers
FOR EACH ROW
EXECUTE FUNCTION update_user_prayer_counts();

CREATE OR REPLACE FUNCTION update_user_sent_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET total_prayers_sent = total_prayers_sent + 1 
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_sent_count
AFTER INSERT ON prayer_support
FOR EACH ROW
EXECUTE FUNCTION update_user_sent_count();

-- Trigger: Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_prayers_updated_at
BEFORE UPDATE ON prayers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

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

-- Users table policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = user_id);

-- Prayers table policies
CREATE POLICY "Anyone can view active prayers"
    ON prayers FOR SELECT
    USING (status = 'ACTIVE');

CREATE POLICY "Users can create prayers"
    ON prayers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prayers"
    ON prayers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prayers"
    ON prayers FOR DELETE
    USING (auth.uid() = user_id);

-- Prayer responses policies
CREATE POLICY "Anyone can view responses to active prayers"
    ON prayer_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM prayers 
            WHERE prayers.prayer_id = prayer_responses.prayer_id 
            AND prayers.status = 'ACTIVE'
        )
    );

CREATE POLICY "Authenticated users can create responses"
    ON prayer_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own responses"
    ON prayer_responses FOR DELETE
    USING (auth.uid() = user_id);

-- Prayer support policies
CREATE POLICY "Users can view all support"
    ON prayer_support FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can add support"
    ON prayer_support FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own support"
    ON prayer_support FOR DELETE
    USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can only view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Prayer flags policies
CREATE POLICY "Users can view flags they created"
    ON prayer_flags FOR SELECT
    USING (auth.uid() = reporter_user_id);

CREATE POLICY "Authenticated users can create flags"
    ON prayer_flags FOR INSERT
    WITH CHECK (auth.uid() = reporter_user_id);

-- ============================================================================
-- INDEXES FOR ANALYTICS (Future)
-- ============================================================================

-- Index for finding trending prayers
CREATE INDEX prayers_trending_idx ON prayers (
    (support_count + response_count * 2) DESC,
    created_at DESC
) WHERE status = 'ACTIVE';

-- ============================================================================
-- SAMPLE DATA (for development)
-- ============================================================================

-- Note: In production, users are created via Supabase Auth
-- This is just for local testing

-- Insert sample user (requires corresponding auth.users entry)
-- INSERT INTO users (user_id, email, first_name, last_known_location)
-- VALUES (
--     '00000000-0000-0000-0000-000000000001',
--     'demo@prayermap.com',
--     'Demo',
--     ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography  -- San Francisco
-- );

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

/*
CRITICAL INDEXES FOR PERFORMANCE:
1. prayers_location_gist_idx - Makes ST_DWithin queries fast
2. prayers_active_recent_idx - Partial index for common query pattern
3. prayer_support_prayer_id_idx - Fast support count lookups
4. notifications_user_id_unread_idx - Efficient notification queries

GEOSPATIAL QUERY PERFORMANCE:
- ST_DWithin uses the GIST index automatically
- Geography type gives accurate distances (vs geometry)
- For 1M prayers, queries within 15km take ~5-10ms

DENORMALIZATION STRATEGY:
- support_count and response_count on prayers table
- Updated via triggers, not application code
- Prevents expensive COUNT(*) queries on hot path
- Trade-off: Slight write overhead for massive read performance

FUTURE OPTIMIZATIONS:
- Partition prayers table by created_at (after 10M+ rows)
- Add BRIN index on created_at if partitioned
- Consider materialized view for "trending prayers" if analytics get complex
*/

-- ============================================================================
-- MAINTENANCE COMMANDS
-- ============================================================================

-- Analyze tables after bulk inserts
-- ANALYZE users;
-- ANALYZE prayers;
-- ANALYZE prayer_responses;

-- Check table sizes
-- SELECT 
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
