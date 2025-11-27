-- PrayerMap Database Schema for Supabase (Fixed)
-- Run this in Supabase SQL Editor

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Prayers Table (without foreign key constraint initially)
CREATE TABLE IF NOT EXISTS prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'audio', 'video')),
  content_url TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  user_name TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Prayer Responses Table
CREATE TABLE IF NOT EXISTS prayer_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL,
  responder_name TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'audio', 'video')),
  content_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prayer Connections Table
CREATE TABLE IF NOT EXISTS prayer_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES prayers(id) ON DELETE CASCADE,
  prayer_response_id UUID NOT NULL REFERENCES prayer_responses(id) ON DELETE CASCADE,
  from_location GEOGRAPHY(POINT, 4326) NOT NULL,
  to_location GEOGRAPHY(POINT, 4326) NOT NULL,
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

-- Enable RLS
ALTER TABLE prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_connections ENABLE ROW LEVEL SECURITY;

-- Prayers policies
CREATE POLICY "Anyone can read prayers"
  ON prayers FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own prayers"
  ON prayers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prayers"
  ON prayers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prayers"
  ON prayers FOR DELETE
  USING (auth.uid() = user_id);

-- Prayer Responses policies
CREATE POLICY "Anyone can read prayer responses"
  ON prayer_responses FOR SELECT
  USING (true);

CREATE POLICY "Users can create responses"
  ON prayer_responses FOR INSERT
  WITH CHECK (auth.uid() = responder_id);

-- Prayer Connections policies
CREATE POLICY "Anyone can read prayer connections"
  ON prayer_connections FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create connections"
  ON prayer_connections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Function to get nearby prayers
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

-- Function to create a prayer connection
CREATE OR REPLACE FUNCTION create_prayer_connection(
  p_prayer_id UUID,
  p_prayer_response_id UUID,
  p_responder_lat DOUBLE PRECISION,
  p_responder_lng DOUBLE PRECISION
)
RETURNS prayer_connections
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prayer prayers;
  v_response prayer_responses;
  v_connection prayer_connections;
BEGIN
  SELECT * INTO v_prayer FROM prayers WHERE id = p_prayer_id;
  SELECT * INTO v_response FROM prayer_responses WHERE id = p_prayer_response_id;

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
    ST_SetSRID(ST_MakePoint(p_responder_lng, p_responder_lat), 4326)::geography,
    COALESCE(v_prayer.user_name, 'Anonymous'),
    COALESCE(v_response.responder_name, 'Anonymous')
  )
  RETURNING * INTO v_connection;

  RETURN v_connection;
END;
$$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_prayers_updated_at ON prayers;
CREATE TRIGGER update_prayers_updated_at
  BEFORE UPDATE ON prayers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
