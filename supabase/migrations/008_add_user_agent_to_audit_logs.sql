-- ============================================================================
-- Add IP Address and User Agent Support to Audit Logs
-- ============================================================================
-- This migration updates the log_admin_action function to accept and store
-- ip_address and user_agent for better audit trail tracking
-- ============================================================================

-- Update the audit_logs table to match the new schema if columns don't exist
DO $$
BEGIN
  -- Check and add old_values column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'old_values'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN old_values JSONB;
  END IF;

  -- Check and add new_values column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'new_values'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN new_values JSONB;
  END IF;
END $$;

-- Drop ALL existing versions of log_admin_action to avoid conflicts
-- We need to drop all overloaded versions before creating the new one
DROP FUNCTION IF EXISTS log_admin_action(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS log_admin_action(TEXT, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB);
DROP FUNCTION IF EXISTS log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB, TEXT);
DROP FUNCTION IF EXISTS log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT);

-- Create the new unified log_admin_action function with user_agent and ip_address support
CREATE FUNCTION log_admin_action(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_email TEXT;
  v_log_id UUID;
BEGIN
  -- Get admin email
  SELECT email INTO v_admin_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Insert audit log
  INSERT INTO audit_logs (
    admin_id,
    admin_email,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    user_agent,
    ip_address
  )
  VALUES (
    auth.uid(),
    v_admin_email,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    p_user_agent,
    p_ip_address
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB, TEXT, TEXT) IS 'Helper function to create audit log entries with IP address and user agent tracking';
