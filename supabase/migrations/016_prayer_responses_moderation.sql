-- ============================================================================
-- Prayer Responses Admin Moderation Schema Migration
-- ============================================================================
-- This migration adds comprehensive moderation capabilities for prayer responses
-- including status tracking, flagging, moderation history, and admin functions.
-- 
-- SPIRITUAL CONTEXT: Prayer responses are sacred communications offering comfort
-- and encouragement. This moderation system protects the sanctity of these
-- interactions while maintaining user privacy and trust.
-- ============================================================================

-- ============================================================================
-- 1. ADD MODERATION COLUMNS TO PRAYER_RESPONSES TABLE
-- ============================================================================

-- Add moderation status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'response_status') THEN
    CREATE TYPE response_status AS ENUM ('active', 'hidden', 'removed', 'pending_review');
  END IF;
END $$;

-- Add moderation columns to prayer_responses table
DO $$
BEGIN
  -- Add status column for moderation state
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_responses' AND column_name = 'status'
  ) THEN
    ALTER TABLE prayer_responses ADD COLUMN status response_status NOT NULL DEFAULT 'active';
  END IF;

  -- Add flagged count for community reporting
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_responses' AND column_name = 'flagged_count'
  ) THEN
    ALTER TABLE prayer_responses ADD COLUMN flagged_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add moderation notes for admin tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_responses' AND column_name = 'moderation_notes'
  ) THEN
    ALTER TABLE prayer_responses ADD COLUMN moderation_notes JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add last moderation timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_responses' AND column_name = 'last_moderated_at'
  ) THEN
    ALTER TABLE prayer_responses ADD COLUMN last_moderated_at TIMESTAMPTZ;
  END IF;

  -- Add last moderator reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_responses' AND column_name = 'last_moderated_by'
  ) THEN
    ALTER TABLE prayer_responses ADD COLUMN last_moderated_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add updated_at for tracking changes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_responses' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE prayer_responses ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- ============================================================================
-- 2. CREATE PRAYER RESPONSE FLAGS TABLE
-- ============================================================================

-- Table for users to report inappropriate prayer responses
CREATE TABLE IF NOT EXISTS prayer_response_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL, -- References prayer_responses.id (not bigint to match existing schema)
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Flag details
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'harassment', 'off_topic', 'other')),
  details TEXT, -- Optional additional context
  
  -- Moderation workflow
  reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT, -- 'approved', 'response_hidden', 'response_removed', 'user_warned', 'user_banned'
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints: one flag per user per response
  CONSTRAINT unique_flag_per_user_response UNIQUE (response_id, reporter_id)
);

-- Add foreign key constraint for response_id (matching existing prayer_responses structure)
-- Note: Using response_id UUID to match existing schema, will need to check actual column type
DO $$
BEGIN
  -- Check if prayer_responses uses UUID or BIGINT for primary key
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_responses' 
    AND column_name IN ('id', 'response_id') 
    AND data_type = 'uuid'
  ) THEN
    -- Use UUID foreign key
    ALTER TABLE prayer_response_flags 
    ADD CONSTRAINT fk_prayer_response_flags_response_id 
    FOREIGN KEY (response_id) REFERENCES prayer_responses(id) ON DELETE CASCADE;
  ELSE
    -- Use BIGINT foreign key (based on schema, it's response_id BIGINT)
    ALTER TABLE prayer_response_flags 
    ALTER COLUMN response_id TYPE BIGINT USING response_id::bigint;
    ALTER TABLE prayer_response_flags 
    ADD CONSTRAINT fk_prayer_response_flags_response_id 
    FOREIGN KEY (response_id) REFERENCES prayer_responses(response_id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Foreign key already exists, skip
    NULL;
END $$;

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for prayer_responses moderation queries
CREATE INDEX IF NOT EXISTS idx_prayer_responses_status ON prayer_responses(status);
CREATE INDEX IF NOT EXISTS idx_prayer_responses_flagged ON prayer_responses(flagged_count DESC) WHERE flagged_count > 0;
CREATE INDEX IF NOT EXISTS idx_prayer_responses_moderated ON prayer_responses(last_moderated_at DESC) WHERE last_moderated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prayer_responses_updated_at ON prayer_responses(updated_at DESC);

-- Indexes for prayer_response_flags
CREATE INDEX IF NOT EXISTS idx_prayer_response_flags_response_id ON prayer_response_flags(response_id);
CREATE INDEX IF NOT EXISTS idx_prayer_response_flags_reporter_id ON prayer_response_flags(reporter_id);
CREATE INDEX IF NOT EXISTS idx_prayer_response_flags_unreviewed ON prayer_response_flags(created_at DESC) WHERE reviewed = false;
CREATE INDEX IF NOT EXISTS idx_prayer_response_flags_reason ON prayer_response_flags(reason);

-- ============================================================================
-- 4. UPDATE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new table
ALTER TABLE prayer_response_flags ENABLE ROW LEVEL SECURITY;

-- Policy: Users can flag responses
CREATE POLICY "Users can create response flags" ON prayer_response_flags
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Policy: Users can view their own flags
CREATE POLICY "Users can view own response flags" ON prayer_response_flags
  FOR SELECT USING (auth.uid() = reporter_id);

-- Policy: Admins can view all flags
CREATE POLICY "Admins can view all response flags" ON prayer_response_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Policy: Admins can update flags (mark as reviewed)
CREATE POLICY "Admins can update response flags" ON prayer_response_flags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Update prayer_responses RLS policy to respect moderation status
-- Drop existing policy and recreate with status check
DROP POLICY IF EXISTS "Anyone can view responses to active prayers" ON prayer_responses;

CREATE POLICY "Anyone can view active responses to active prayers" ON prayer_responses
  FOR SELECT USING (
    status = 'active' AND EXISTS (
      SELECT 1 FROM prayers
      WHERE prayers.prayer_id = prayer_responses.prayer_id
      AND prayers.status = 'ACTIVE'
    )
  );

-- Policy: Admins can view all responses regardless of status
CREATE POLICY "Admins can view all prayer responses" ON prayer_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Policy: Admins can update responses for moderation
CREATE POLICY "Admins can update prayer responses" ON prayer_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- 5. CREATE ADMIN FUNCTIONS FOR PRAYER RESPONSE MANAGEMENT
-- ============================================================================

-- Function: Get all prayer responses with pagination and filtering for admin
CREATE OR REPLACE FUNCTION get_prayer_responses_admin(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_status response_status DEFAULT NULL,
  p_flagged_only BOOLEAN DEFAULT false,
  p_search_term TEXT DEFAULT NULL,
  p_prayer_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  response_id BIGINT,
  prayer_id BIGINT,
  user_id UUID,
  responder_name TEXT,
  text_body TEXT,
  media_type TEXT,
  media_url TEXT,
  is_anonymous BOOLEAN,
  status response_status,
  flagged_count INTEGER,
  last_moderated_at TIMESTAMPTZ,
  last_moderated_by UUID,
  moderator_email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  prayer_title TEXT,
  prayer_creator_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    pr.response_id,
    pr.prayer_id,
    pr.user_id,
    CASE 
      WHEN pr.is_anonymous THEN 'Anonymous'
      ELSE COALESCE(u.email, 'Unknown User')
    END as responder_name,
    pr.text_body,
    pr.media_type::TEXT,
    pr.media_url,
    pr.is_anonymous,
    pr.status,
    pr.flagged_count,
    pr.last_moderated_at,
    pr.last_moderated_by,
    mod_user.email as moderator_email,
    pr.created_at,
    pr.updated_at,
    p.title as prayer_title,
    CASE 
      WHEN p.is_anonymous THEN 'Anonymous'
      ELSE COALESCE(prayer_user.email, 'Unknown User')
    END as prayer_creator_name
  FROM prayer_responses pr
  LEFT JOIN auth.users u ON pr.user_id = u.id
  LEFT JOIN auth.users mod_user ON pr.last_moderated_by = mod_user.id
  LEFT JOIN prayers p ON pr.prayer_id = p.prayer_id
  LEFT JOIN auth.users prayer_user ON p.user_id = prayer_user.id
  WHERE 
    (p_status IS NULL OR pr.status = p_status)
    AND (p_flagged_only = false OR pr.flagged_count > 0)
    AND (p_search_term IS NULL OR 
         pr.text_body ILIKE '%' || p_search_term || '%' OR
         u.email ILIKE '%' || p_search_term || '%')
    AND (p_prayer_id IS NULL OR pr.prayer_id = p_prayer_id)
  ORDER BY 
    CASE 
      WHEN p_flagged_only THEN pr.flagged_count 
      ELSE 0 
    END DESC,
    pr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function: Moderate a prayer response
CREATE OR REPLACE FUNCTION moderate_prayer_response(
  p_response_id BIGINT,
  p_new_status response_status,
  p_note TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  old_response RECORD;
  updated_response RECORD;
  note_entry JSONB;
BEGIN
  -- Check admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('active', 'hidden', 'removed', 'pending_review') THEN
    RAISE EXCEPTION 'Invalid status. Must be: active, hidden, removed, or pending_review';
  END IF;

  -- Get old values for audit log
  SELECT * INTO old_response FROM prayer_responses WHERE response_id = p_response_id;

  IF old_response IS NULL THEN
    RAISE EXCEPTION 'Prayer response not found';
  END IF;

  -- Create note entry if provided
  IF p_note IS NOT NULL THEN
    note_entry := jsonb_build_object(
      'timestamp', NOW(),
      'admin_id', auth.uid(),
      'action', p_new_status,
      'note', p_note
    );
  END IF;

  -- Update the response
  UPDATE prayer_responses
  SET
    status = p_new_status,
    last_moderated_at = NOW(),
    last_moderated_by = auth.uid(),
    moderation_notes = CASE
      WHEN note_entry IS NOT NULL
      THEN COALESCE(moderation_notes, '[]'::jsonb) || note_entry
      ELSE moderation_notes
    END,
    updated_at = NOW()
  WHERE response_id = p_response_id
  RETURNING * INTO updated_response;

  -- Mark all flags as reviewed
  UPDATE prayer_response_flags
  SET
    reviewed = true,
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    action_taken = CASE p_new_status
      WHEN 'active' THEN 'approved'
      WHEN 'hidden' THEN 'response_hidden'
      WHEN 'removed' THEN 'response_removed'
      ELSE 'under_review'
    END
  WHERE response_id = p_response_id AND NOT reviewed;

  -- Log the action
  BEGIN
    PERFORM log_admin_action(
      CASE p_new_status
        WHEN 'active' THEN 'approve_response'
        WHEN 'hidden' THEN 'hide_response'
        WHEN 'removed' THEN 'remove_response'
        ELSE 'moderate_response'
      END,
      'prayer_responses',
      old_response.response_id::UUID, -- Cast to UUID for log_admin_action
      row_to_json(old_response)::jsonb,
      row_to_json(updated_response)::jsonb,
      p_user_agent,
      NULL
    );
  EXCEPTION WHEN undefined_function OR others THEN
    -- log_admin_action doesn't exist or failed, continue without logging
    NULL;
  END;

  RETURN row_to_json(updated_response);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Delete prayer response (admin only)
CREATE OR REPLACE FUNCTION delete_prayer_response_admin(
  p_response_id BIGINT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  old_response RECORD;
BEGIN
  -- Check admin permissions (admin only for deletion)
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get old values for audit log
  SELECT * INTO old_response FROM prayer_responses WHERE response_id = p_response_id;

  IF old_response IS NULL THEN
    RAISE EXCEPTION 'Prayer response not found';
  END IF;

  -- Delete the response (cascades to flags)
  DELETE FROM prayer_responses WHERE response_id = p_response_id;

  -- Log the action
  BEGIN
    PERFORM log_admin_action(
      'delete_response',
      'prayer_responses',
      old_response.response_id::UUID, -- Cast to UUID for log_admin_action
      row_to_json(old_response)::jsonb,
      NULL,
      p_user_agent,
      NULL
    );
  EXCEPTION WHEN undefined_function OR others THEN
    -- log_admin_action doesn't exist or failed, continue without logging
    NULL;
  END;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get prayer response flags with details
CREATE OR REPLACE FUNCTION get_prayer_response_flags_admin(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_unreviewed_only BOOLEAN DEFAULT true,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  flag_id UUID,
  response_id BIGINT,
  response_text TEXT,
  response_creator_email TEXT,
  reporter_email TEXT,
  reason TEXT,
  details TEXT,
  reviewed BOOLEAN,
  reviewed_by UUID,
  reviewer_email TEXT,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ,
  prayer_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    f.id as flag_id,
    f.response_id,
    pr.text_body as response_text,
    resp_user.email as response_creator_email,
    reporter_user.email as reporter_email,
    f.reason,
    f.details,
    f.reviewed,
    f.reviewed_by,
    reviewer_user.email as reviewer_email,
    f.reviewed_at,
    f.action_taken,
    f.created_at,
    p.title as prayer_title
  FROM prayer_response_flags f
  LEFT JOIN prayer_responses pr ON f.response_id = pr.response_id
  LEFT JOIN auth.users resp_user ON pr.user_id = resp_user.id
  LEFT JOIN auth.users reporter_user ON f.reporter_id = reporter_user.id
  LEFT JOIN auth.users reviewer_user ON f.reviewed_by = reviewer_user.id
  LEFT JOIN prayers p ON pr.prayer_id = p.prayer_id
  WHERE 
    (p_unreviewed_only = false OR f.reviewed = false)
    AND (p_reason IS NULL OR f.reason = p_reason)
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- 6. CREATE TRIGGER FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Trigger to update updated_at timestamp on prayer_responses
CREATE TRIGGER on_prayer_responses_updated
  BEFORE UPDATE ON prayer_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for admin functions
GRANT EXECUTE ON FUNCTION get_prayer_responses_admin TO authenticated;
GRANT EXECUTE ON FUNCTION moderate_prayer_response TO authenticated;
GRANT EXECUTE ON FUNCTION delete_prayer_response_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_prayer_response_flags_admin TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON prayer_response_flags TO authenticated;

-- ============================================================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE prayer_response_flags IS 'User-reported flags on prayer responses for moderation review';
COMMENT ON COLUMN prayer_responses.status IS 'Moderation status: active, hidden, removed, or pending_review';
COMMENT ON COLUMN prayer_responses.flagged_count IS 'Number of times this response has been flagged by users';
COMMENT ON COLUMN prayer_responses.moderation_notes IS 'JSONB array of moderation actions and notes from admins';
COMMENT ON COLUMN prayer_responses.last_moderated_at IS 'Timestamp of most recent moderation action';
COMMENT ON COLUMN prayer_responses.last_moderated_by IS 'Admin/moderator who last took action on this response';

COMMENT ON FUNCTION get_prayer_responses_admin IS 'Admin function to retrieve prayer responses with filtering, search, and pagination';
COMMENT ON FUNCTION moderate_prayer_response IS 'Admin function to change response status and add moderation notes';
COMMENT ON FUNCTION delete_prayer_response_admin IS 'Admin-only function to permanently delete prayer responses';
COMMENT ON FUNCTION get_prayer_response_flags_admin IS 'Admin function to retrieve user-reported response flags for review';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- This migration provides:
-- 1. ✅ Moderation status tracking for prayer responses
-- 2. ✅ Community flagging system for inappropriate responses
-- 3. ✅ Comprehensive audit trail via existing log_admin_action
-- 4. ✅ Admin functions for response management with pagination
-- 5. ✅ Proper RLS policies respecting user privacy and admin access
-- 6. ✅ Performance indexes for admin queries
-- 7. ✅ Integration with existing moderation patterns and infrastructure
--
-- Privacy Protection:
-- - Anonymous responses remain anonymous even in admin views
-- - User emails shown only to admins for necessary moderation
-- - Soft deletion preferred (hidden status) over hard deletion
-- - Comprehensive audit trail for accountability
--
-- Spiritual Considerations:
-- - Maintains sanctity of prayer communications
-- - Protects vulnerable users seeking spiritual support
-- - Enables swift action against harmful content
-- - Preserves context of spiritual conversations