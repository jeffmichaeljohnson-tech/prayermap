-- ============================================================================
-- Test Data for Moderation Feature
-- ============================================================================
-- This script creates test data to help test the moderation features
-- WARNING: Only run this on development/staging environments
-- ============================================================================

-- Step 1: Create test prayers with different statuses
-- (Requires existing user - replace USER_ID with actual user UUID)
DO $$
DECLARE
  v_user_id UUID;
  v_prayer_id_1 UUID;
  v_prayer_id_2 UUID;
  v_prayer_id_3 UUID;
  v_prayer_id_4 UUID;
BEGIN
  -- Get first available user (or use specific UUID)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found. Create a user first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Using user ID: %', v_user_id;

  -- Create prayer 1: Active (normal prayer)
  INSERT INTO public.prayers (
    user_id,
    title,
    content,
    content_type,
    location,
    status,
    user_name
  ) VALUES (
    v_user_id,
    'Prayer for peace',
    'Please pray for peace in our community and around the world.',
    'text',
    ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography, -- San Francisco
    'active',
    'Test User'
  ) RETURNING id INTO v_prayer_id_1;

  RAISE NOTICE 'Created active prayer: %', v_prayer_id_1;

  -- Create prayer 2: Flagged once (borderline)
  INSERT INTO public.prayers (
    user_id,
    title,
    content,
    content_type,
    location,
    status,
    flagged_count,
    user_name
  ) VALUES (
    v_user_id,
    'Need help',
    'I am struggling with some personal issues and could use prayer.',
    'text',
    ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326)::geography, -- Los Angeles
    'active',
    1,
    'Test User'
  ) RETURNING id INTO v_prayer_id_2;

  RAISE NOTICE 'Created flagged prayer (1 flag): %', v_prayer_id_2;

  -- Create prayer 3: Flagged multiple times (pending review)
  INSERT INTO public.prayers (
    user_id,
    title,
    content,
    content_type,
    location,
    status,
    flagged_count,
    user_name
  ) VALUES (
    v_user_id,
    'Controversial prayer',
    'This is a test prayer that has been flagged multiple times for testing.',
    'text',
    ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography, -- Chicago
    'pending_review',
    3,
    'Test User'
  ) RETURNING id INTO v_prayer_id_3;

  RAISE NOTICE 'Created pending review prayer (3 flags): %', v_prayer_id_3;

  -- Create prayer 4: Hidden (already moderated)
  INSERT INTO public.prayers (
    user_id,
    title,
    content,
    content_type,
    location,
    status,
    flagged_count,
    user_name,
    last_moderated_at,
    moderation_notes
  ) VALUES (
    v_user_id,
    'Hidden prayer',
    'This prayer was hidden by a moderator for testing purposes.',
    'text',
    ST_SetSRID(ST_MakePoint(-73.9352, 40.7306), 4326)::geography, -- Brooklyn
    'hidden',
    2,
    'Test User',
    NOW(),
    jsonb_build_array(
      jsonb_build_object(
        'timestamp', NOW(),
        'admin_id', v_user_id,
        'action', 'hidden',
        'note', 'Test moderation - borderline content'
      )
    )
  ) RETURNING id INTO v_prayer_id_4;

  RAISE NOTICE 'Created hidden prayer: %', v_prayer_id_4;

  -- Create test flags for the prayers
  -- Flag prayer 2 once
  INSERT INTO public.prayer_flags (
    prayer_id,
    flagged_by,
    reason,
    details
  ) VALUES (
    v_prayer_id_2,
    v_user_id,
    'inappropriate',
    'Test flag - checking moderation queue'
  );

  -- Flag prayer 3 multiple times with different reasons
  INSERT INTO public.prayer_flags (
    prayer_id,
    flagged_by,
    reason,
    details
  ) VALUES
    (v_prayer_id_3, v_user_id, 'spam', 'Test flag - spam'),
    (v_prayer_id_3, v_user_id, 'offensive', 'Test flag - offensive'),
    (v_prayer_id_3, v_user_id, 'inappropriate', 'Test flag - inappropriate');

  -- Mark flags on hidden prayer as reviewed
  INSERT INTO public.prayer_flags (
    prayer_id,
    flagged_by,
    reason,
    details,
    reviewed,
    reviewed_by,
    reviewed_at
  ) VALUES
    (v_prayer_id_4, v_user_id, 'spam', 'Test flag - reviewed', true, v_user_id, NOW()),
    (v_prayer_id_4, v_user_id, 'offensive', 'Test flag - reviewed', true, v_user_id, NOW());

  RAISE NOTICE 'Created test flags for prayers';

  -- Summary
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Created 4 test prayers:';
  RAISE NOTICE '  1. Active prayer (no flags)';
  RAISE NOTICE '  2. Active prayer (1 flag)';
  RAISE NOTICE '  3. Pending review (3 flags)';
  RAISE NOTICE '  4. Hidden prayer (2 reviewed flags)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Go to /admin/moderation';
  RAISE NOTICE '  2. Select "Flagged" tab';
  RAISE NOTICE '  3. You should see prayers 2 and 3';
  RAISE NOTICE '  4. Select "Pending Review" tab';
  RAISE NOTICE '  5. You should see prayer 3';
  RAISE NOTICE '===========================================';

END $$;

-- ============================================================================
-- Optional: Create a test banned user scenario
-- ============================================================================
-- Uncomment this section to test ban functionality

/*
DO $$
DECLARE
  v_banned_user_id UUID;
  v_admin_user_id UUID;
BEGIN
  -- Get user to ban (second user if exists)
  SELECT id INTO v_banned_user_id FROM auth.users OFFSET 1 LIMIT 1;

  -- Get admin user
  SELECT id INTO v_admin_user_id FROM auth.users LIMIT 1;

  IF v_banned_user_id IS NULL THEN
    RAISE NOTICE 'Need at least 2 users to test banning. Skipping.';
    RETURN;
  END IF;

  -- Create test soft ban
  INSERT INTO public.user_bans (
    user_id,
    banned_by,
    reason,
    ban_type,
    expires_at,
    notes
  ) VALUES (
    v_banned_user_id,
    v_admin_user_id,
    'Test ban - spam violations',
    'soft',
    NOW() + INTERVAL '7 days',
    jsonb_build_array(
      jsonb_build_object(
        'timestamp', NOW(),
        'admin_id', v_admin_user_id,
        'note', 'First offense - 7 day soft ban'
      )
    )
  );

  RAISE NOTICE 'Created test soft ban for user: %', v_banned_user_id;
  RAISE NOTICE 'Ban expires in 7 days';

END $$;
*/

-- ============================================================================
-- View test data
-- ============================================================================

-- View all test prayers
SELECT
  id,
  title,
  status,
  flagged_count,
  SUBSTRING(content, 1, 50) as content_preview,
  created_at
FROM public.prayers
WHERE user_name = 'Test User'
ORDER BY created_at DESC;

-- View all test flags
SELECT
  pf.id,
  p.title as prayer_title,
  pf.reason,
  pf.reviewed,
  pf.created_at
FROM public.prayer_flags pf
JOIN public.prayers p ON pf.prayer_id = p.id
WHERE p.user_name = 'Test User'
ORDER BY pf.created_at DESC;

-- ============================================================================
-- Cleanup test data (run this when done testing)
-- ============================================================================

/*
-- WARNING: This will delete all test data created by this script
-- Uncomment and run only when you want to clean up

DO $$
BEGIN
  -- Delete test flags
  DELETE FROM public.prayer_flags
  WHERE prayer_id IN (
    SELECT id FROM public.prayers WHERE user_name = 'Test User'
  );

  -- Delete test prayers
  DELETE FROM public.prayers
  WHERE user_name = 'Test User';

  -- Delete test bans (if created)
  DELETE FROM public.user_bans
  WHERE notes::text LIKE '%Test ban%';

  RAISE NOTICE 'Test data cleaned up successfully';
END $$;
*/
