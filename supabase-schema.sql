-- PrayerMap Database Schema for Supabase
-- This file contains the SQL schema needed for PrayerMap to work with Supabase

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Prayers Table
CREATE TABLE IF NOT EXISTS prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'audio', 'video')),
  content_url TEXT, -- Storage URL for audio/video content
  location GEOGRAPHY(POINT, 4326) NOT NULL, -- PostGIS geography type for lat/lng
  user_name TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Prayer Responses Table
CREATE TABLE IF NOT EXISTS prayer_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  responder_name TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'audio', 'video')),
  content_url TEXT, -- Storage URL for audio/video responses
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prayer Connections Table (for visualizing prayer connections on the map)
CREATE TABLE IF NOT EXISTS prayer_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  prayer_response_id UUID NOT NULL REFERENCES prayer_responses(id) ON DELETE CASCADE,
  from_location GEOGRAPHY(POINT, 4326) NOT NULL, -- Prayer location
  to_location GEOGRAPHY(POINT, 4326) NOT NULL, -- Responder location
  requester_name TEXT NOT NULL,
  replier_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prayers_location ON prayers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_prayers_user_id ON prayers(user_id);
CREATE INDEX IF NOT EXISTS idx_prayers_created_at ON prayers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_responses_prayer_id ON prayer_responses(prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_responses_responder_id ON prayer_responses(responder_id);
CREATE INDEX IF NOT EXISTS idx_prayer_connections_prayer_id ON prayer_connections(prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_connections_expires_at ON prayer_connections(expires_at);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_connections ENABLE ROW LEVEL SECURITY;

-- Prayers policies
-- Anyone can read prayers (they're meant to be public)
CREATE POLICY "Anyone can read prayers"
  ON prayers FOR SELECT
  USING (true);

-- Users can insert their own prayers
CREATE POLICY "Users can insert their own prayers"
  ON prayers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own prayers
CREATE POLICY "Users can update their own prayers"
  ON prayers FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own prayers
CREATE POLICY "Users can delete their own prayers"
  ON prayers FOR DELETE
  USING (auth.uid() = user_id);

-- Prayer Responses policies
-- Anyone can read responses (to see who prayed)
CREATE POLICY "Anyone can read prayer responses"
  ON prayer_responses FOR SELECT
  USING (true);

-- Users can create responses
CREATE POLICY "Users can create responses"
  ON prayer_responses FOR INSERT
  WITH CHECK (auth.uid() = responder_id);

-- Prayer Connections policies
-- Anyone can read connections (for visualization)
CREATE POLICY "Anyone can read prayer connections"
  ON prayer_connections FOR SELECT
  USING (true);

-- System can create connections (via RPC function)
CREATE POLICY "Service role can create connections"
  ON prayer_connections FOR INSERT
  WITH CHECK (true);

-- Function to get nearby prayers using PostGIS
CREATE OR REPLACE FUNCTION get_nearby_prayers(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50000
)
RETURNS SETOF prayers
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM prayers
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_meters
  )
  ORDER BY created_at DESC;
$$;

-- Function to create a prayer connection when someone responds
CREATE OR REPLACE FUNCTION create_prayer_connection(
  p_prayer_id UUID,
  p_prayer_response_id UUID,
  p_responder_id UUID
)
RETURNS prayer_connections
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prayer prayers;
  v_responder_location GEOGRAPHY(POINT, 4326);
  v_connection prayer_connections;
BEGIN
  -- Get the prayer details
  SELECT * INTO v_prayer
  FROM prayers
  WHERE id = p_prayer_id;

  -- For now, we'll use the prayer location as responder location
  -- In a real app, you'd get this from user profile or request
  v_responder_location := v_prayer.location;

  -- Create the connection
  INSERT INTO prayer_connections (
    prayer_id,
    prayer_response_id,
    from_location,
    to_location,
    requester_name,
    replier_name
  )
  VALUES (
    p_prayer_id,
    p_prayer_response_id,
    v_prayer.location,
    v_responder_location,
    COALESCE(v_prayer.user_name, 'Anonymous'),
    (SELECT COALESCE(responder_name, 'Anonymous') FROM prayer_responses WHERE id = p_prayer_response_id)
  )
  RETURNING * INTO v_connection;

  RETURN v_connection;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prayers_updated_at
  BEFORE UPDATE ON prayers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Cleanup expired connections (optional - can be run as a scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_connections()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM prayer_connections
  WHERE expires_at < NOW();
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE prayers IS 'Prayer requests created by users, stored with geospatial location';
COMMENT ON TABLE prayer_responses IS 'Responses to prayers (prayers from other users)';
COMMENT ON TABLE prayer_connections IS 'Visual connections between prayer requesters and responders, displayed on the map';
COMMENT ON FUNCTION get_nearby_prayers IS 'Fetches prayers within a given radius using PostGIS';
COMMENT ON FUNCTION create_prayer_connection IS 'Creates a prayer connection when someone responds to a prayer';
