-- Admin Tables Migration
-- Creates tables for admin authentication and audit logging

-- Admin Roles Table
-- Tracks which users have admin or moderator privileges
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Audit Logs Table
-- Immutable log of all admin actions for compliance and tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON admin_roles(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Row Level Security (RLS)

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin Roles Policies
-- Only admins can read admin roles
CREATE POLICY "Admins can read admin roles"
  ON admin_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Only admins can insert admin roles
CREATE POLICY "Admins can insert admin roles"
  ON admin_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update admin roles
CREATE POLICY "Admins can update admin roles"
  ON admin_roles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete admin roles
CREATE POLICY "Admins can delete admin roles"
  ON admin_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Audit Logs Policies
-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Audit logs are immutable - no updates or deletes allowed
-- (No UPDATE or DELETE policies)

-- Function to automatically log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_details JSONB DEFAULT NULL
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
    details
  )
  VALUES (
    auth.uid(),
    v_admin_email,
    p_action,
    p_entity_type,
    p_entity_id,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant permissions
GRANT SELECT ON admin_roles TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- Comments for documentation
COMMENT ON TABLE admin_roles IS 'Stores admin and moderator role assignments for users';
COMMENT ON TABLE audit_logs IS 'Immutable log of all admin actions for compliance and security auditing';
COMMENT ON FUNCTION log_admin_action IS 'Helper function to create audit log entries for admin actions';
