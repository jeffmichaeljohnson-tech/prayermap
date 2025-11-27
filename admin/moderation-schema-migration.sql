-- ============================================================================
-- PrayerMap Content Moderation - Database Schema Migration
-- ============================================================================
-- This migration adds content moderation capabilities to the PrayerMap app
-- Run this in the Supabase SQL Editor after the main and admin schemas
-- ============================================================================

-- ============================================================================
-- 1. ADD MODERATION COLUMNS TO PRAYERS TABLE
-- ============================================================================

-- Add status column to track prayer moderation state
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'prayers' AND column_name = 'status') THEN
    ALTER TABLE public.prayers
    ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'hidden', 'removed', 'pending_review'));
  END IF;
END $$;

-- Add flagged_count to track how many times a prayer has been flagged
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'prayers' AND column_name = 'flagged_count') THEN
    ALTER TABLE public.prayers
    ADD COLUMN flagged_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add moderation_notes for admin notes (JSONB for flexibility)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'prayers' AND column_name = 'moderation_notes') THEN
    ALTER TABLE public.prayers
    ADD COLUMN moderation_notes JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add last_moderated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'prayers' AND column_name = 'last_moderated_at') THEN
    ALTER TABLE public.prayers
    ADD COLUMN last_moderated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add last_moderated_by to track which admin took action
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'prayers' AND column_name = 'last_moderated_by') THEN
    ALTER TABLE public.prayers
    ADD COLUMN last_moderated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Create indexes for moderation queries
CREATE INDEX IF NOT EXISTS idx_prayers_status ON public.prayers(status);
CREATE INDEX IF NOT EXISTS idx_prayers_flagged_count ON public.prayers(flagged_count DESC);
CREATE INDEX IF NOT EXISTS idx_prayers_pending_review ON public.prayers(status, created_at DESC)
  WHERE status = 'pending_review';

-- ============================================================================
-- 2. USER BANS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  ban_type TEXT NOT NULL DEFAULT 'soft' CHECK (ban_type IN ('soft', 'hard')),
  notes JSONB DEFAULT '[]'::jsonb,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL means permanent ban
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, is_active) -- Only one active ban per user
);

-- Enable RLS
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- Policies for user_bans
CREATE POLICY "Admins can view all bans"
  ON public.user_bans FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can create bans"
  ON public.user_bans FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can update bans"
  ON public.user_bans FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role IN ('admin', 'moderator'))
  );

-- Indexes for user_bans
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON public.user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON public.user_bans(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_bans_banned_at ON public.user_bans(banned_at DESC);

-- ============================================================================
-- 3. PRAYER FLAGS TABLE (for user reporting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prayer_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES public.prayers(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'inappropriate',
    'spam',
    'offensive',
    'harassment',
    'violence',
    'other'
  )),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(prayer_id, flagged_by) -- User can only flag a prayer once
);

-- Enable RLS
ALTER TABLE public.prayer_flags ENABLE ROW LEVEL SECURITY;

-- Policies for prayer_flags
CREATE POLICY "Users can create flags"
  ON public.prayer_flags FOR INSERT
  WITH CHECK (auth.uid() = flagged_by);

CREATE POLICY "Admins can view all flags"
  ON public.prayer_flags FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role IN ('admin', 'moderator'))
  );

CREATE POLICY "Admins can update flags"
  ON public.prayer_flags FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role IN ('admin', 'moderator'))
  );

-- Indexes for prayer_flags
CREATE INDEX IF NOT EXISTS idx_prayer_flags_prayer_id ON public.prayer_flags(prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_flags_reviewed ON public.prayer_flags(reviewed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_flags_flagged_by ON public.prayer_flags(flagged_by);

-- ============================================================================
-- 4. UPDATE EXISTING QUERIES TO FILTER HIDDEN/REMOVED PRAYERS
-- ============================================================================

-- Update the public prayer viewing policy to exclude hidden/removed prayers
DROP POLICY IF EXISTS "Anyone can read prayers" ON public.prayers;

-- New policy: Only show active prayers to public
CREATE POLICY "Anyone can read active prayers"
  ON public.prayers FOR SELECT
  USING (
    status = 'active'
    OR auth.uid() = user_id -- Users can see their own prayers regardless of status
    OR auth.uid() IN (SELECT user_id FROM public.admin_roles WHERE role IN ('admin', 'moderator'))
  );

-- ============================================================================
-- 5. MODERATION FUNCTIONS
-- ============================================================================

-- Function to get flagged/pending prayers for moderation queue
CREATE OR REPLACE FUNCTION get_moderation_queue(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_filter TEXT DEFAULT NULL -- 'flagged', 'pending', 'all'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  title TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_anonymous BOOLEAN,
  status TEXT,
  flagged_count INTEGER,
  flag_reasons TEXT[],
  moderation_notes JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_moderated_at TIMESTAMPTZ,
  last_moderated_by UUID,
  total_count BIGINT
) AS $$
DECLARE
  total BIGINT;
BEGIN
  -- Check if user has admin access
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total
  FROM public.prayers p
  WHERE
    (p_filter IS NULL OR p_filter = 'all') OR
    (p_filter = 'flagged' AND p.flagged_count > 0) OR
    (p_filter = 'pending' AND p.status = 'pending_review');

  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    u.email::TEXT as user_email,
    pr.display_name as user_name,
    p.title,
    p.content,
    p.content_type,
    p.content_url as media_url,
    ST_Y(p.location::geometry) as latitude,
    ST_X(p.location::geometry) as longitude,
    p.is_anonymous,
    p.status,
    p.flagged_count,
    ARRAY(
      SELECT DISTINCT pf.reason
      FROM public.prayer_flags pf
      WHERE pf.prayer_id = p.id AND NOT pf.reviewed
    ) as flag_reasons,
    p.moderation_notes,
    p.created_at,
    p.updated_at,
    p.last_moderated_at,
    p.last_moderated_by,
    total as total_count
  FROM public.prayers p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN public.profiles pr ON p.user_id = pr.id
  WHERE
    (p_filter IS NULL OR p_filter = 'all') OR
    (p_filter = 'flagged' AND p.flagged_count > 0) OR
    (p_filter = 'pending' AND p.status = 'pending_review')
  ORDER BY
    CASE
      WHEN p.status = 'pending_review' THEN 0
      WHEN p.flagged_count > 0 THEN 1
      ELSE 2
    END,
    p.flagged_count DESC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to moderate a prayer (approve, hide, remove)
CREATE OR REPLACE FUNCTION moderate_prayer(
  p_prayer_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  old_prayer RECORD;
  updated_prayer RECORD;
  note_entry JSONB;
BEGIN
  -- Check if user is admin or moderator
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('active', 'hidden', 'removed', 'pending_review') THEN
    RAISE EXCEPTION 'Invalid status. Must be: active, hidden, removed, or pending_review';
  END IF;

  -- Get old values for audit log
  SELECT * INTO old_prayer FROM public.prayers WHERE id = p_prayer_id;

  IF old_prayer IS NULL THEN
    RAISE EXCEPTION 'Prayer not found';
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

  -- Update the prayer
  UPDATE public.prayers
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
  WHERE id = p_prayer_id
  RETURNING * INTO updated_prayer;

  -- Mark all flags as reviewed
  UPDATE public.prayer_flags
  SET
    reviewed = true,
    reviewed_by = auth.uid(),
    reviewed_at = NOW()
  WHERE prayer_id = p_prayer_id AND NOT reviewed;

  -- Log the action
  PERFORM log_admin_action(
    CASE p_new_status
      WHEN 'active' THEN 'approve_prayer'
      WHEN 'hidden' THEN 'hide_prayer'
      WHEN 'removed' THEN 'remove_prayer'
      ELSE 'moderate_prayer'
    END,
    'prayers',
    p_prayer_id,
    row_to_json(old_prayer)::jsonb,
    row_to_json(updated_prayer)::jsonb
  );

  RETURN row_to_json(updated_prayer);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban a user
CREATE OR REPLACE FUNCTION ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_ban_type TEXT DEFAULT 'soft',
  p_duration_days INTEGER DEFAULT NULL, -- NULL = permanent
  p_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_ban RECORD;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Check if user is admin or moderator
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  -- Validate ban type
  IF p_ban_type NOT IN ('soft', 'hard') THEN
    RAISE EXCEPTION 'Invalid ban type. Must be: soft or hard';
  END IF;

  -- Calculate expiry if duration provided
  IF p_duration_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;
  END IF;

  -- Deactivate any existing active bans for this user
  UPDATE public.user_bans
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  -- Create new ban
  INSERT INTO public.user_bans (
    user_id,
    banned_by,
    reason,
    ban_type,
    expires_at,
    notes
  )
  VALUES (
    p_user_id,
    auth.uid(),
    p_reason,
    p_ban_type,
    v_expires_at,
    CASE
      WHEN p_note IS NOT NULL
      THEN jsonb_build_array(jsonb_build_object(
        'timestamp', NOW(),
        'admin_id', auth.uid(),
        'note', p_note
      ))
      ELSE '[]'::jsonb
    END
  )
  RETURNING * INTO v_ban;

  -- If soft ban, hide all user's prayers
  IF p_ban_type = 'soft' THEN
    UPDATE public.prayers
    SET
      status = 'hidden',
      last_moderated_at = NOW(),
      last_moderated_by = auth.uid()
    WHERE user_id = p_user_id AND status = 'active';
  END IF;

  -- Log the action
  PERFORM log_admin_action(
    'ban_user',
    'user_bans',
    v_ban.id,
    NULL,
    row_to_json(v_ban)::jsonb
  );

  RETURN row_to_json(v_ban);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unban a user
CREATE OR REPLACE FUNCTION unban_user(
  p_user_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_ban RECORD;
BEGIN
  -- Check if user is admin or moderator
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or moderator privileges required';
  END IF;

  -- Get active ban
  SELECT * INTO v_ban
  FROM public.user_bans
  WHERE user_id = p_user_id AND is_active = true;

  IF v_ban IS NULL THEN
    RAISE EXCEPTION 'No active ban found for this user';
  END IF;

  -- Deactivate the ban
  UPDATE public.user_bans
  SET
    is_active = false,
    notes = CASE
      WHEN p_note IS NOT NULL
      THEN notes || jsonb_build_object(
        'timestamp', NOW(),
        'admin_id', auth.uid(),
        'action', 'unbanned',
        'note', p_note
      )
      ELSE notes
    END
  WHERE id = v_ban.id;

  -- Log the action
  PERFORM log_admin_action(
    'unban_user',
    'user_bans',
    v_ban.id,
    row_to_json(v_ban)::jsonb,
    jsonb_build_object('unbanned_by', auth.uid(), 'unbanned_at', NOW())
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is banned
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_bans
    WHERE user_id = p_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user ban status
CREATE OR REPLACE FUNCTION get_user_ban_status(p_user_id UUID)
RETURNS TABLE (
  is_banned BOOLEAN,
  ban_type TEXT,
  reason TEXT,
  banned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  banned_by_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    true as is_banned,
    ub.ban_type,
    ub.reason,
    ub.banned_at,
    ub.expires_at,
    u.email::TEXT as banned_by_email
  FROM public.user_bans ub
  LEFT JOIN auth.users u ON ub.banned_by = u.id
  WHERE ub.user_id = p_user_id
  AND ub.is_active = true
  AND (ub.expires_at IS NULL OR ub.expires_at > NOW())
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update flagged_count when flags are added
CREATE OR REPLACE FUNCTION update_prayer_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.prayers
    SET flagged_count = flagged_count + 1
    WHERE id = NEW.prayer_id;

    -- Auto-flag for review if flagged multiple times
    UPDATE public.prayers
    SET status = 'pending_review'
    WHERE id = NEW.prayer_id
    AND flagged_count >= 3
    AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prayer_flag_count_trigger ON public.prayer_flags;
CREATE TRIGGER prayer_flag_count_trigger
  AFTER INSERT ON public.prayer_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_prayer_flag_count();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_bans TO authenticated;
GRANT SELECT, INSERT ON public.prayer_flags TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- To verify the migration was successful, run:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'prayers' AND column_name IN ('status', 'flagged_count', 'moderation_notes');
-- SELECT * FROM information_schema.tables WHERE table_name IN ('user_bans', 'prayer_flags');
