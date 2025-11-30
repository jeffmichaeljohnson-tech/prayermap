-- ============================================================================
-- Living Map Integration with Conversation Threading
-- PostgreSQL 15 + PostGIS + Supabase
-- ============================================================================
--
-- This migration enhances the prayer_connections table to support
-- sophisticated memorial line creation from conversation messages,
-- real-time updates, and visual prayer journey mapping.
--
-- ============================================================================

-- ============================================================================
-- ENHANCE PRAYER_CONNECTIONS TABLE
-- ============================================================================

-- Add conversation threading support to prayer connections
DO $$
BEGIN
  -- Add conversation and message references if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prayer_connections' AND column_name = 'conversation_id') THEN
    ALTER TABLE prayer_connections ADD COLUMN conversation_id UUID REFERENCES conversation_threads(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prayer_connections' AND column_name = 'message_id') THEN
    ALTER TABLE prayer_connections ADD COLUMN message_id UUID REFERENCES thread_messages(id) ON DELETE SET NULL;
  END IF;
  
  -- Add enhanced connection type if column exists but needs updating
  BEGIN
    ALTER TABLE prayer_connections DROP CONSTRAINT IF EXISTS prayer_connections_connection_type_check;
    ALTER TABLE prayer_connections ADD CONSTRAINT prayer_connections_connection_type_check 
      CHECK (connection_type IN ('prayer_response', 'ongoing_prayer', 'answered_prayer'));
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  -- Add visual style and metadata support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prayer_connections' AND column_name = 'visual_style') THEN
    ALTER TABLE prayer_connections ADD COLUMN visual_style JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prayer_connections' AND column_name = 'metadata') THEN
    ALTER TABLE prayer_connections ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prayer_connections' AND column_name = 'is_eternal') THEN
    ALTER TABLE prayer_connections ADD COLUMN is_eternal BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prayer_connections' AND column_name = 'connection_type') THEN
    ALTER TABLE prayer_connections ADD COLUMN connection_type TEXT DEFAULT 'prayer_response';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'prayer_connections' AND column_name = 'testimony_message_id') THEN
    ALTER TABLE prayer_connections ADD COLUMN testimony_message_id UUID REFERENCES thread_messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS prayer_connections_conversation_idx ON prayer_connections (conversation_id);
CREATE INDEX IF NOT EXISTS prayer_connections_message_idx ON prayer_connections (message_id);
CREATE INDEX IF NOT EXISTS prayer_connections_eternal_idx ON prayer_connections (is_eternal) WHERE is_eternal = true;
CREATE INDEX IF NOT EXISTS prayer_connections_type_idx ON prayer_connections (connection_type);
CREATE INDEX IF NOT EXISTS prayer_connections_visual_style_gin ON prayer_connections USING GIN (visual_style);
CREATE INDEX IF NOT EXISTS prayer_connections_metadata_gin ON prayer_connections USING GIN (metadata);

-- ============================================================================
-- USER LOCATIONS TABLE
-- ============================================================================

-- Create user locations table for tracking user positions for memorial lines
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Location data
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    
    -- Location metadata
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    accuracy INTEGER, -- meters
    
    -- Location type and source
    location_type TEXT DEFAULT 'current', -- 'current', 'prayer_location', 'home', 'work'
    source TEXT DEFAULT 'manual', -- 'manual', 'gps', 'geocoded'
    
    -- Privacy settings
    is_public BOOLEAN DEFAULT false,
    is_approximate BOOLEAN DEFAULT true, -- For privacy, show approximate location
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_coordinates CHECK (
        latitude >= -90 AND latitude <= 90 AND
        longitude >= -180 AND longitude <= 180
    )
);

-- Indexes for user locations
CREATE INDEX IF NOT EXISTS user_locations_user_id_idx ON user_locations (user_id);
CREATE INDEX IF NOT EXISTS user_locations_type_idx ON user_locations (location_type);
CREATE INDEX IF NOT EXISTS user_locations_created_at_idx ON user_locations (created_at DESC);
CREATE INDEX IF NOT EXISTS user_locations_location_gist_idx ON user_locations USING GIST (location);

-- RLS for user locations
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public locations"
ON user_locations FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can manage own locations"
ON user_locations FOR ALL
USING (auth.uid() = user_id);

-- ============================================================================
-- LIVING MAP FUNCTIONS
-- ============================================================================

-- Function: Create memorial line from conversation message
CREATE OR REPLACE FUNCTION create_memorial_line_from_message(
    message_id_param UUID,
    visual_style_param JSONB DEFAULT '{}',
    is_eternal_param BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_memorial_id UUID;
    v_message RECORD;
    v_conversation RECORD;
    v_prayer RECORD;
    v_sender_location RECORD;
    v_prayer_location RECORD;
BEGIN
    -- Get message details
    SELECT tm.*, ct.prayer_id, ct.participant_ids
    INTO v_message
    FROM thread_messages tm
    JOIN conversation_threads ct ON ct.id = tm.thread_id
    WHERE tm.id = message_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found';
    END IF;
    
    -- Get prayer details
    SELECT * INTO v_prayer
    FROM prayers
    WHERE id = v_message.prayer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Related prayer not found';
    END IF;
    
    -- Get sender location (most recent)
    SELECT latitude, longitude, location
    INTO v_sender_location
    FROM user_locations
    WHERE user_id = v_message.sender_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sender location not found';
    END IF;
    
    -- Create memorial line
    INSERT INTO prayer_connections (
        prayer_id,
        from_user_id,
        to_user_id,
        from_location,
        to_location,
        conversation_id,
        message_id,
        connection_type,
        is_eternal,
        visual_style,
        metadata,
        expires_at
    ) VALUES (
        v_prayer.id,
        v_message.sender_id,
        v_prayer.user_id,
        v_sender_location.location,
        v_prayer.location,
        v_message.thread_id,
        v_message.id,
        CASE 
            WHEN v_message.message_type = 'testimony' THEN 'answered_prayer'
            WHEN v_message.message_type = 'prayer_response' THEN 'prayer_response'
            ELSE 'ongoing_prayer'
        END,
        is_eternal_param OR v_message.message_type = 'testimony',
        visual_style_param,
        jsonb_build_object(
            'conversationTitle', (SELECT title FROM conversation_threads WHERE id = v_message.thread_id),
            'messageType', v_message.message_type,
            'prayerCategory', v_message.prayer_category,
            'scriptureReference', v_message.scripture_reference,
            'participantCount', array_length(v_message.thread_participants, 1)
        ),
        CASE 
            WHEN is_eternal_param OR v_message.message_type = 'testimony' THEN NULL
            ELSE (now() + INTERVAL '1 year')
        END
    ) RETURNING id INTO v_memorial_id;
    
    RETURN v_memorial_id;
END;
$$;

-- Function: Get memorial line statistics
CREATE OR REPLACE FUNCTION get_memorial_line_statistics()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
BEGIN
    WITH stats AS (
        SELECT 
            COUNT(*) as total_lines,
            COUNT(*) FILTER (WHERE is_eternal = true) as eternal_lines,
            COUNT(*) FILTER (WHERE expires_at > now() OR is_eternal = true) as active_lines,
            COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '7 days') as recent_activity
        FROM prayer_connections
    ),
    top_categories AS (
        SELECT 
            metadata->>'prayerCategory' as category,
            COUNT(*) as count
        FROM prayer_connections
        WHERE metadata->>'prayerCategory' IS NOT NULL
        GROUP BY metadata->>'prayerCategory'
        ORDER BY count DESC
        LIMIT 5
    )
    SELECT json_build_object(
        'totalLines', s.total_lines,
        'eternalLines', s.eternal_lines,
        'activeLines', s.active_lines,
        'recentActivity', s.recent_activity,
        'topPrayerCategories', COALESCE(array_agg(tc.category), ARRAY[]::text[])
    ) INTO result
    FROM stats s
    LEFT JOIN top_categories tc ON true;
    
    RETURN result;
END;
$$;

-- Function: Get active memorial lines with spatial filtering
CREATE OR REPLACE FUNCTION get_active_memorial_lines(
    bounds_north DOUBLE PRECISION DEFAULT NULL,
    bounds_south DOUBLE PRECISION DEFAULT NULL,
    bounds_east DOUBLE PRECISION DEFAULT NULL,
    bounds_west DOUBLE PRECISION DEFAULT NULL,
    limit_param INTEGER DEFAULT 500
) RETURNS TABLE (
    id UUID,
    prayer_id UUID,
    conversation_id UUID,
    message_id UUID,
    from_user_id UUID,
    to_user_id UUID,
    from_location_lat DOUBLE PRECISION,
    from_location_lng DOUBLE PRECISION,
    to_location_lat DOUBLE PRECISION,
    to_location_lng DOUBLE PRECISION,
    connection_type TEXT,
    is_eternal BOOLEAN,
    visual_style JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.prayer_id,
        pc.conversation_id,
        pc.message_id,
        pc.from_user_id,
        pc.to_user_id,
        ST_Y(pc.from_location::geometry) as from_location_lat,
        ST_X(pc.from_location::geometry) as from_location_lng,
        ST_Y(pc.to_location::geometry) as to_location_lat,
        ST_X(pc.to_location::geometry) as to_location_lng,
        pc.connection_type,
        pc.is_eternal,
        pc.visual_style,
        pc.metadata,
        pc.created_at,
        pc.expires_at
    FROM prayer_connections pc
    WHERE 
        (pc.is_eternal = true OR pc.expires_at > now())
        AND (
            bounds_north IS NULL OR 
            (ST_Y(pc.from_location::geometry) BETWEEN bounds_south AND bounds_north AND
             ST_X(pc.from_location::geometry) BETWEEN bounds_west AND bounds_east)
        )
    ORDER BY 
        pc.is_eternal DESC,
        pc.created_at DESC
    LIMIT limit_param;
END;
$$;

-- Function: Get prayer journey memorial lines
CREATE OR REPLACE FUNCTION get_prayer_journey_memorial_lines(prayer_id_param UUID)
RETURNS TABLE (
    id UUID,
    conversation_id UUID,
    message_id UUID,
    from_user_id UUID,
    to_user_id UUID,
    from_location_lat DOUBLE PRECISION,
    from_location_lng DOUBLE PRECISION,
    to_location_lat DOUBLE PRECISION,
    to_location_lng DOUBLE PRECISION,
    connection_type TEXT,
    is_eternal BOOLEAN,
    visual_style JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    sender_name TEXT,
    message_type TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.conversation_id,
        pc.message_id,
        pc.from_user_id,
        pc.to_user_id,
        ST_Y(pc.from_location::geometry) as from_location_lat,
        ST_X(pc.from_location::geometry) as from_location_lng,
        ST_Y(pc.to_location::geometry) as to_location_lat,
        ST_X(pc.to_location::geometry) as to_location_lng,
        pc.connection_type,
        pc.is_eternal,
        pc.visual_style,
        pc.metadata,
        pc.created_at,
        tm.sender_name,
        tm.message_type::TEXT
    FROM prayer_connections pc
    LEFT JOIN thread_messages tm ON tm.id = pc.message_id
    WHERE pc.prayer_id = prayer_id_param
    ORDER BY pc.created_at ASC;
END;
$$;

-- Function: Update user location
CREATE OR REPLACE FUNCTION update_user_location(
    user_id_param UUID,
    latitude_param DOUBLE PRECISION,
    longitude_param DOUBLE PRECISION,
    location_type_param TEXT DEFAULT 'current',
    address_param TEXT DEFAULT NULL,
    is_public_param BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_location_id UUID;
BEGIN
    -- Verify the user is updating their own location
    IF user_id_param != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Can only update your own location';
    END IF;
    
    -- Insert new location
    INSERT INTO user_locations (
        user_id,
        latitude,
        longitude,
        location,
        location_type,
        address,
        is_public,
        source
    ) VALUES (
        user_id_param,
        latitude_param,
        longitude_param,
        ST_SetSRID(ST_MakePoint(longitude_param, latitude_param), 4326)::geography,
        location_type_param,
        address_param,
        is_public_param,
        'manual'
    ) RETURNING id INTO v_location_id;
    
    RETURN v_location_id;
END;
$$;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC MEMORIAL LINE CREATION
-- ============================================================================

-- Function: Auto-create memorial line when prayer response is sent
CREATE OR REPLACE FUNCTION auto_create_memorial_line()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_memorial_id UUID;
    v_visual_style JSONB;
BEGIN
    -- Only create memorial lines for prayer responses and testimonies
    IF NEW.message_type NOT IN ('prayer_response', 'testimony', 'scripture_share') THEN
        RETURN NEW;
    END IF;
    
    -- Only create if the thread is linked to a prayer
    IF NOT EXISTS (
        SELECT 1 FROM conversation_threads 
        WHERE id = NEW.thread_id AND prayer_id IS NOT NULL
    ) THEN
        RETURN NEW;
    END IF;
    
    -- Define visual style based on message type
    v_visual_style := CASE 
        WHEN NEW.message_type = 'prayer_response' THEN 
            '{"color": "#3B82F6", "thickness": 2, "opacity": 0.8, "animation": "flow"}'::jsonb
        WHEN NEW.message_type = 'testimony' THEN 
            '{"color": "#10B981", "thickness": 3, "opacity": 1.0, "animation": "pulse"}'::jsonb
        WHEN NEW.message_type = 'scripture_share' THEN 
            '{"color": "#F59E0B", "thickness": 2, "opacity": 0.7, "animation": "static"}'::jsonb
        ELSE 
            '{"color": "#6B7280", "thickness": 2, "opacity": 0.8, "animation": "pulse"}'::jsonb
    END;
    
    -- Try to create memorial line (will fail gracefully if locations not available)
    BEGIN
        SELECT create_memorial_line_from_message(
            NEW.id,
            v_visual_style,
            NEW.message_type = 'testimony'
        ) INTO v_memorial_id;
        
        -- Log successful creation
        RAISE NOTICE 'Created memorial line % for message %', v_memorial_id, NEW.id;
        
    EXCEPTION 
        WHEN OTHERS THEN
            -- Log but don't fail the message creation
            RAISE NOTICE 'Failed to create memorial line for message %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- Create trigger on thread_messages
DROP TRIGGER IF EXISTS on_thread_message_memorial_line ON thread_messages;
CREATE TRIGGER on_thread_message_memorial_line
    AFTER INSERT ON thread_messages
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_memorial_line();

-- ============================================================================
-- ENHANCED RLS POLICIES
-- ============================================================================

-- Memorial lines should be viewable by conversation participants
DROP POLICY IF EXISTS "Memorial lines viewable by participants" ON prayer_connections;
CREATE POLICY "Memorial lines viewable by participants"
ON prayer_connections FOR SELECT
USING (
    -- Always allow viewing eternal memorial lines (answered prayers)
    is_eternal = true
    OR
    -- Allow viewing if user is in the related conversation
    EXISTS (
        SELECT 1 FROM conversation_threads ct
        WHERE ct.id = conversation_id
        AND auth.uid() = ANY(ct.participant_ids)
    )
    OR
    -- Allow viewing if user is involved in the prayer connection
    (auth.uid() = from_user_id OR auth.uid() = to_user_id)
);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION create_memorial_line_from_message IS 'Creates a memorial line connection from a conversation message with proper visual styling';
COMMENT ON FUNCTION get_memorial_line_statistics IS 'Returns comprehensive statistics about memorial lines for analytics';
COMMENT ON FUNCTION get_active_memorial_lines IS 'Gets all active memorial lines with optional spatial filtering for map display';
COMMENT ON FUNCTION get_prayer_journey_memorial_lines IS 'Gets all memorial lines related to a specific prayer for journey visualization';
COMMENT ON FUNCTION update_user_location IS 'Updates user location for memorial line creation';
COMMENT ON FUNCTION auto_create_memorial_line IS 'Automatically creates memorial lines when prayer response messages are sent';

COMMENT ON TABLE user_locations IS 'Stores user location data for creating memorial line connections between prayer participants';
COMMENT ON COLUMN prayer_connections.conversation_id IS 'Links memorial line to the conversation that created it';
COMMENT ON COLUMN prayer_connections.message_id IS 'Links memorial line to the specific message that triggered its creation';
COMMENT ON COLUMN prayer_connections.visual_style IS 'JSON configuration for how the memorial line appears on the map';
COMMENT ON COLUMN prayer_connections.metadata IS 'Additional context about the memorial line including spiritual significance';
COMMENT ON COLUMN prayer_connections.is_eternal IS 'Whether this memorial line represents an answered prayer and should never expire';

-- ============================================================================
-- END OF LIVING MAP INTEGRATION MIGRATION
-- ============================================================================