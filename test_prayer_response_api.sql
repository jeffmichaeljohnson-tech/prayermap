-- Test script to validate prayer response API endpoint fixes
-- Run this in Supabase SQL Editor to test the changes

-- ============================================================================
-- 1. Add is_anonymous field to prayer_responses if missing
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prayer_responses' AND column_name = 'is_anonymous') THEN
        ALTER TABLE prayer_responses ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_anonymous column to prayer_responses table';
    ELSE
        RAISE NOTICE 'is_anonymous column already exists in prayer_responses table';
    END IF;
END $$;

-- ============================================================================
-- 2. Test prayer response insertion with correct field names
-- ============================================================================

-- Create a test prayer first
INSERT INTO prayers (
  user_id, 
  title, 
  content, 
  content_type, 
  location, 
  user_name, 
  is_anonymous
) 
SELECT 
  auth.uid(),
  'Test Prayer for API Validation',
  'This is a test prayer to validate the response API',
  'text',
  ST_GeomFromText('POINT(-122.4194 37.7749)', 4326), -- San Francisco
  'Test User',
  false
WHERE auth.uid() IS NOT NULL;

-- Get the test prayer ID
DO $$
DECLARE
    test_prayer_id UUID;
    test_response_id UUID;
    notification_count INTEGER;
BEGIN
    -- Find the test prayer
    SELECT id INTO test_prayer_id 
    FROM prayers 
    WHERE title = 'Test Prayer for API Validation' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_prayer_id IS NULL THEN
        RAISE EXCEPTION 'Test prayer not found - user may not be authenticated';
    END IF;
    
    RAISE NOTICE 'Found test prayer ID: %', test_prayer_id;
    
    -- Test prayer response insertion with all required fields
    INSERT INTO prayer_responses (
        prayer_id,
        responder_id,
        message,
        content_type,
        media_url,
        is_anonymous
    ) VALUES (
        test_prayer_id,
        auth.uid(),
        'This is a test prayer response to validate the API',
        'text',
        NULL,
        false
    )
    RETURNING id INTO test_response_id;
    
    RAISE NOTICE 'Created test prayer response ID: %', test_response_id;
    
    -- Check if notification was created
    SELECT COUNT(*) INTO notification_count
    FROM notifications
    WHERE prayer_id = test_prayer_id 
    AND prayer_response_id = test_response_id
    AND type = 'prayer_response';
    
    RAISE NOTICE 'Notifications created: %', notification_count;
    
    IF notification_count = 0 THEN
        RAISE WARNING 'No notification was created - notification trigger may not be working';
    ELSE
        RAISE NOTICE 'SUCCESS: Prayer response and notification created successfully';
    END IF;
    
    -- Clean up test data
    DELETE FROM prayer_responses WHERE id = test_response_id;
    DELETE FROM prayers WHERE id = test_prayer_id;
    DELETE FROM notifications WHERE prayer_id = test_prayer_id;
    
    RAISE NOTICE 'Cleaned up test data';
END $$;

-- ============================================================================
-- 3. Validate table structure
-- ============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'prayer_responses'
ORDER BY ordinal_position;

-- ============================================================================
-- 4. Validate notification trigger exists
-- ============================================================================
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'prayer_responses'
AND trigger_name = 'on_prayer_response_created';

-- ============================================================================
-- 5. Check RLS policies
-- ============================================================================
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'prayer_responses';