-- ============================================================================
-- PrayerMap Initial Schema Migration
-- PostgreSQL 15 + PostGIS 3.3 + Supabase
-- ============================================================================
--
-- This migration creates the foundational schema for PrayerMap, a geospatial
-- prayer request application that connects people through location-based
-- prayer requests and responses.
--
-- Key Features:
-- - PostGIS geography for accurate earth distance calculations
-- - GIST indexes for fast spatial queries
-- - Row-Level Security (RLS) for multi-tenant security
-- - Triggers for real-time notifications
-- - Support for text, audio, and video content
--
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

-- Content type for prayers and responses (text, audio, or video)
CREATE TYPE content_type AS ENUM ('text', 'audio', 'video');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table (extends Supabase auth.users)
-- Stores additional user profile information beyond authentication
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Profile information
    display_name TEXT,
    avatar_url TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for profile lookups
CREATE INDEX profiles_display_name_idx ON profiles (display_name);

-- ============================================================================

-- Prayers table (the core of the app)
-- Each prayer is a geospatial point with text/audio/video content
CREATE TABLE prayers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Content
    title TEXT, -- Optional title (max 200 chars at app level)
    content TEXT NOT NULL, -- Required text content
    content_type content_type NOT NULL DEFAULT 'text',
    media_url TEXT, -- S3/CloudFront URL for audio/video

    -- Location (PostGIS geography type for accurate distance calculations)
    location GEOGRAPHY(POINT, 4326) NOT NULL, -- WGS84 coordinate system

    -- Privacy
    is_anonymous BOOLEAN NOT NULL DEFAULT false,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT valid_content_length CHECK (LENGTH(content) >= 10),
    CONSTRAINT valid_title_length CHECK (title IS NULL OR LENGTH(title) <= 200),
    CONSTRAINT valid_media_url CHECK (
        (content_type = 'text' AND media_url IS NULL) OR
        (content_type IN ('audio', 'video') AND media_url IS NOT NULL)
    )
);

-- Critical indexes for performance
CREATE INDEX prayers_location_gist_idx ON prayers USING GIST (location);
-- ^ Most important index - enables fast spatial queries
CREATE INDEX prayers_user_id_idx ON prayers (user_id);
CREATE INDEX prayers_created_at_idx ON prayers (created_at DESC);

-- ============================================================================

-- Prayer Responses table
-- Users can respond to prayers with encouragement (text/audio/video)
CREATE TABLE prayer_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Content
    message TEXT,
    content_type content_type NOT NULL DEFAULT 'text',
    media_url TEXT, -- S3/CloudFront URL for audio/video

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT valid_response_content CHECK (
        (content_type = 'text' AND message IS NOT NULL AND LENGTH(message) >= 1) OR
        (content_type IN ('audio', 'video') AND media_url IS NOT NULL)
    )
);

-- Indexes for responses
CREATE INDEX prayer_responses_prayer_id_idx ON prayer_responses (prayer_id, created_at ASC);
CREATE INDEX prayer_responses_responder_id_idx ON prayer_responses (responder_id);

-- ============================================================================

-- Prayer Connections table
-- Tracks the visual connections between prayer requester and prayer supporter
-- Connections expire after one year
CREATE TABLE prayer_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Prayer requester
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,   -- Prayer supporter

    -- Locations for drawing the connection line
    from_location GEOGRAPHY(POINT, 4326) NOT NULL,
    to_location GEOGRAPHY(POINT, 4326) NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 year'),

    -- Prevent duplicate connections
    CONSTRAINT unique_prayer_connection UNIQUE (prayer_id, from_user_id, to_user_id)
);

-- Indexes for connections
CREATE INDEX prayer_connections_prayer_id_idx ON prayer_connections (prayer_id);
CREATE INDEX prayer_connections_from_user_idx ON prayer_connections (from_user_id);
CREATE INDEX prayer_connections_to_user_idx ON prayer_connections (to_user_id);
CREATE INDEX prayer_connections_expires_at_idx ON prayer_connections (expires_at);

-- ============================================================================
-- FUNCTIONS FOR GEOSPATIAL QUERIES
-- ============================================================================

-- Function: Get prayers within radius of a point
-- This is the core query of the entire app!
-- Uses PostGIS geography type for accurate earth distance calculations
--
-- Performance:
-- - GIST index on prayers.location enables index scan
-- - ST_DWithin is faster than ST_Distance for radius queries
CREATE OR REPLACE FUNCTION get_prayers_within_radius(
    lat DOUBLE PRECISION,         -- Latitude (e.g., 41.8781 for Chicago)
    lng DOUBLE PRECISION,         -- Longitude (e.g., -87.6298 for Chicago)
    radius_km INTEGER DEFAULT 30  -- Search radius in kilometers
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    content TEXT,
    content_type content_type,
    media_url TEXT,
    is_anonymous BOOLEAN,
    distance_km DOUBLE PRECISION,
    created_at TIMESTAMPTZ,
    display_name TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.user_id,
        p.title,
        p.content,
        p.content_type,
        p.media_url,
        p.is_anonymous,
        -- Calculate actual distance in km
        ST_Distance(
            p.location,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        ) / 1000 AS distance_km,
        p.created_at,
        CASE
            WHEN p.is_anonymous THEN NULL
            ELSE pr.display_name
        END AS display_name
    FROM prayers p
    LEFT JOIN profiles pr ON p.user_id = pr.id
    WHERE
        ST_DWithin(
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

-- Function: Get active prayer connections (not expired)
-- Useful for displaying connection lines on the map
CREATE OR REPLACE FUNCTION get_active_connections(
    user_id_param UUID DEFAULT NULL  -- Optional: filter by user
)
RETURNS TABLE (
    id UUID,
    prayer_id UUID,
    from_user_id UUID,
    to_user_id UUID,
    from_location GEOGRAPHY,
    to_location GEOGRAPHY,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    requester_name TEXT,
    replier_name TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pc.id,
        pc.prayer_id,
        pc.from_user_id,
        pc.to_user_id,
        pc.from_location,
        pc.to_location,
        pc.created_at,
        pc.expires_at,
        COALESCE(from_profile.display_name, 'Anonymous') AS requester_name,
        COALESCE(to_profile.display_name, 'Anonymous') AS replier_name
    FROM prayer_connections pc
    LEFT JOIN profiles from_profile ON pc.from_user_id = from_profile.id
    LEFT JOIN profiles to_profile ON pc.to_user_id = to_profile.id
    WHERE
        pc.expires_at > now()
        AND (user_id_param IS NULL OR pc.from_user_id = user_id_param OR pc.to_user_id = user_id_param)
    ORDER BY pc.created_at DESC;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================

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

CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_connections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Anyone can view profiles (for displaying names on prayers)
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- ============================================================================
-- PRAYERS TABLE POLICIES
-- ============================================================================

-- Anyone can view all prayers (public feed)
CREATE POLICY "Prayers are viewable by everyone"
ON prayers FOR SELECT
USING (true);

-- Users can create prayers for themselves
CREATE POLICY "Users can insert own prayers"
ON prayers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own prayers
CREATE POLICY "Users can update own prayers"
ON prayers FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own prayers
CREATE POLICY "Users can delete own prayers"
ON prayers FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- PRAYER_RESPONSES TABLE POLICIES
-- ============================================================================

-- Anyone can view all responses
CREATE POLICY "Prayer responses are viewable by everyone"
ON prayer_responses FOR SELECT
USING (true);

-- Users can create responses for themselves
CREATE POLICY "Users can insert own responses"
ON prayer_responses FOR INSERT
WITH CHECK (auth.uid() = responder_id);

-- Users can delete their own responses
CREATE POLICY "Users can delete own responses"
ON prayer_responses FOR DELETE
USING (auth.uid() = responder_id);

-- ============================================================================
-- PRAYER_CONNECTIONS TABLE POLICIES
-- ============================================================================

-- Anyone can view all active connections (for the map visualization)
CREATE POLICY "Prayer connections are viewable by everyone"
ON prayer_connections FOR SELECT
USING (expires_at > now());

-- Users can create connections when they pray for someone
CREATE POLICY "Users can insert connections when praying"
ON prayer_connections FOR INSERT
WITH CHECK (auth.uid() = to_user_id);

-- Users can view their own connections (including expired)
CREATE POLICY "Users can view own connections"
ON prayer_connections FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- ============================================================================
-- SAMPLE DATA (FOR TESTING)
-- ============================================================================

-- Note: In production, users are created via Supabase Auth signup
-- These are examples for testing in development environment

-- Example: Create a test prayer (after user signup)
-- INSERT INTO prayers (user_id, title, content, content_type, location, is_anonymous) VALUES
--     ('user-uuid-here',
--      'Health and healing',
--      'Please pray for my mother who is recovering from surgery.',
--      'text',
--      ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography,
--      false);

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- 1. GIST Index on prayers.location
--    - Enables spatial queries to use index scan instead of sequential scan
--    - Critical for performance when querying many prayers
--    - Query time: O(log n) instead of O(n)
--
-- 2. Geography vs Geometry
--    - Geography: Uses earth's curvature (more accurate, slightly slower)
--    - Geometry: Flat plane calculations (faster, less accurate)
--    - We use Geography because accuracy matters for prayer context
--
-- 3. ST_DWithin vs ST_Distance
--    - ST_DWithin: "Is point within radius?" (boolean)
--    - ST_Distance: "What's the distance?" (calculation)
--    - ST_DWithin is faster for radius queries (can short-circuit)

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Vacuum analyze (run periodically for optimal performance)
-- VACUUM ANALYZE prayers;
-- VACUUM ANALYZE prayer_connections;

-- Clean up expired connections (run as a scheduled job)
-- DELETE FROM prayer_connections WHERE expires_at < now() - INTERVAL '30 days';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
