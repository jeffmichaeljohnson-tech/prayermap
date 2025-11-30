-- ===============================================================================
-- MIGRATION 013: Fix create_prayer_connection Function Signature
-- ===============================================================================
-- 
-- ISSUE: Frontend calls create_prayer_connection with lat/lng parameters but
-- the database function expects different parameters. This causes memorial
-- lines to never be created in the database.
--
-- FRONTEND CALLS:
--   p_prayer_id, p_prayer_response_id, p_responder_lat, p_responder_lng
--
-- DATABASE FUNCTION EXPECTS: 
--   p_prayer_id, p_prayer_response_id, p_responder_id
--
-- SOLUTION: Update function to match frontend expectations and properly
-- create memorial lines between prayer location and responder location.
-- ===============================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS create_prayer_connection(UUID, UUID, UUID);

-- Create the corrected function with matching signature
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
  v_responder_location GEOGRAPHY(POINT, 4326);
  v_requester_name TEXT;
  v_responder_name TEXT;
BEGIN
  -- Get the prayer details
  SELECT * INTO v_prayer
  FROM prayers
  WHERE id = p_prayer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prayer not found: %', p_prayer_id;
  END IF;

  -- Get the response details
  SELECT * INTO v_response
  FROM prayer_responses
  WHERE id = p_prayer_response_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prayer response not found: %', p_prayer_response_id;
  END IF;

  -- Create responder location from lat/lng
  v_responder_location := ST_SetSRID(ST_MakePoint(p_responder_lng, p_responder_lat), 4326)::geography;

  -- Get display names (handle anonymous users)
  v_requester_name := CASE 
    WHEN v_prayer.is_anonymous THEN 'Anonymous'
    ELSE COALESCE(v_prayer.user_name, 'Anonymous')
  END;

  -- For responder name, check if prayer response has responder info
  v_responder_name := CASE 
    WHEN v_response.is_anonymous THEN 'Anonymous'
    ELSE COALESCE(
      (SELECT display_name FROM profiles WHERE id = v_response.responder_id),
      'Anonymous'
    )
  END;

  -- Create the memorial line connection
  INSERT INTO prayer_connections (
    prayer_id,
    from_user_id,
    to_user_id,
    from_location,      -- Prayer location
    to_location,        -- Responder location  
    created_at,
    expires_at          -- Set to 1 year from now (though we show all connections)
  ) VALUES (
    p_prayer_id,
    v_prayer.user_id,           -- Prayer requester
    v_response.responder_id,    -- Prayer responder
    v_prayer.location,          -- Prayer location
    v_responder_location,       -- Responder location
    NOW(),
    NOW() + INTERVAL '1 year'
  )
  RETURNING * INTO v_connection;

  RETURN v_connection;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_prayer_connection(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION create_prayer_connection(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;

-- ===============================================================================
-- COMMENTS AND DOCUMENTATION
-- ===============================================================================

COMMENT ON FUNCTION create_prayer_connection(UUID, UUID, DOUBLE PRECISION, DOUBLE PRECISION) IS 'Creates a memorial line connection between prayer requester and responder locations. Called when someone responds to a prayer.';

-- ===============================================================================
-- MIGRATION COMPLETE
-- ===============================================================================
-- The create_prayer_connection function now properly:
-- 1. Accepts lat/lng parameters as expected by frontend
-- 2. Creates connections between prayer location and responder location
-- 3. Handles anonymous users correctly
-- 4. Sets proper expiration (though get_all_connections shows all)
-- ===============================================================================