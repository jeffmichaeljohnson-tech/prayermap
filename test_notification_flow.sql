-- ============================================================================
-- TEST SCRIPT: Notification System Database Flow
-- Purpose: Validate the complete prayer response → notification flow
-- ============================================================================
-- This script demonstrates how the notification system works end-to-end
-- and can be used to verify the migration works correctly.
-- ============================================================================

-- ============================================================================
-- SETUP TEST DATA (assumes migration 020 has been applied)
-- ============================================================================

-- Test users (these would be created via Supabase Auth in real app)
INSERT INTO auth.users (id, email, created_at) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'prayer_requester@test.com', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'prayer_responder@test.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Test profiles (created via trigger or manually)
INSERT INTO profiles (id, display_name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Prayer Requester'),
  ('22222222-2222-2222-2222-222222222222', 'Kind Helper')
ON CONFLICT (id) DO NOTHING;

-- Test prayer (User A creates a prayer request)
INSERT INTO prayers (
  id,
  user_id, 
  title,
  content,
  content_type,
  location,
  is_anonymous,
  created_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111', -- Prayer Requester
  'Need prayer for healing',
  'Please pray for my recovery from surgery. I could really use some encouragement.',
  'text',
  ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography, -- Chicago
  false,
  NOW() - INTERVAL '1 hour'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST 1: CREATE PRAYER RESPONSE AND VERIFY NOTIFICATION TRIGGER
-- ============================================================================

-- Before: Check current notification count for prayer requester
SELECT 'BEFORE: Notification count for prayer requester' as test_step;
SELECT COUNT(*) as notification_count 
FROM notifications 
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- ACTION: User B responds to User A's prayer
-- This should trigger the notification system
INSERT INTO prayer_responses (
  id,
  prayer_id,
  responder_id,
  message,
  content_type,
  created_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333', -- Prayer ID
  '22222222-2222-2222-2222-222222222222', -- Kind Helper responds
  'I am praying for your healing and recovery. You are not alone in this journey!',
  'text',
  NOW()
);

-- After: Verify notification was created automatically
SELECT 'AFTER: Notification created by trigger' as test_step;
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.user_id as recipient_id,
  n.actor_id as sender_id,
  n.prayer_id,
  n.response_id,
  n.read,
  n.created_at
FROM notifications n
WHERE n.user_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- TEST 2: VERIFY NOTIFICATION FUNCTIONS WORK
-- ============================================================================

-- Test get_user_notifications function
SELECT 'TEST: get_user_notifications function' as test_step;
SELECT * FROM get_user_notifications(
  '11111111-1111-1111-1111-111111111111', -- Prayer Requester's ID
  10, -- limit
  0,  -- offset
  false -- include read notifications
);

-- Test unread count function
SELECT 'TEST: get_unread_notification_count function' as test_step;
SELECT get_unread_notification_count('11111111-1111-1111-1111-111111111111') as unread_count;

-- ============================================================================
-- TEST 3: TEST NOTIFICATION MARKING AS READ
-- ============================================================================

-- Get the notification ID to mark as read
SELECT 'TEST: Mark notification as read' as test_step;

-- Mark the notification as read
-- Note: This would normally be done with proper auth.uid() in real app
UPDATE notifications 
SET read = true, read_at = NOW()
WHERE user_id = '11111111-1111-1111-1111-111111111111'
  AND read = false;

-- Verify notification was marked as read
SELECT 
  'Notification read status after update' as test_step,
  read,
  read_at
FROM notifications 
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- TEST 4: TEST EDGE CASES
-- ============================================================================

-- Test self-response (should NOT create notification)
SELECT 'TEST: Self-response should not create notification' as test_step;

-- Count notifications before self-response
SELECT COUNT(*) as notifications_before_self_response
FROM notifications 
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Prayer requester responds to their own prayer (should not trigger notification)
INSERT INTO prayer_responses (
  id,
  prayer_id,
  responder_id,
  message,
  content_type,
  created_at
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333', -- Same prayer
  '11111111-1111-1111-1111-111111111111', -- Prayer requester responds to own prayer
  'Thank you all for the prayers!',
  'text',
  NOW()
);

-- Count notifications after self-response (should be same)
SELECT COUNT(*) as notifications_after_self_response
FROM notifications 
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- TEST 5: TEST ANONYMOUS RESPONSE
-- ============================================================================

-- Test anonymous response (actor with no display name)
SELECT 'TEST: Anonymous response notification' as test_step;

-- Create anonymous user
INSERT INTO auth.users (id, email, created_at) VALUES 
  ('66666666-6666-6666-6666-666666666666', 'anonymous@test.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- No profile created for this user (simulates anonymous)

-- Anonymous user responds
INSERT INTO prayer_responses (
  id,
  prayer_id,
  responder_id,
  message,
  content_type,
  created_at
) VALUES (
  '77777777-7777-7777-7777-777777777777',
  '33333333-3333-3333-3333-333333333333', -- Same prayer
  '66666666-6666-6666-6666-666666666666', -- Anonymous user
  'Praying for you!',
  'text',
  NOW()
);

-- Check notification created for anonymous response
SELECT 
  'Anonymous notification created' as test_step,
  n.title,
  n.message,
  n.data->>'responder_anonymous' as is_anonymous_response
FROM notifications n
WHERE n.response_id = '77777777-7777-7777-7777-777777777777';

-- ============================================================================
-- CLEANUP TEST DATA
-- ============================================================================

-- Clean up test data (optional)
-- DELETE FROM notifications WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
-- DELETE FROM prayer_responses WHERE prayer_id = '33333333-3333-3333-3333-333333333333';
-- DELETE FROM prayers WHERE id = '33333333-3333-3333-3333-333333333333';
-- DELETE FROM profiles WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- ============================================================================
-- EXPECTED RESULTS SUMMARY
-- ============================================================================

-- ✅ BEFORE: 0 notifications for prayer requester
-- ✅ AFTER prayer response: 1 notification created automatically via trigger  
-- ✅ get_user_notifications returns the notification with proper details
-- ✅ get_unread_notification_count returns 1 (or 2 after anonymous response)
-- ✅ Mark as read updates the notification properly
-- ✅ Self-response does NOT create a notification (same count before/after)
-- ✅ Anonymous response creates notification with proper "Someone" attribution

-- ============================================================================
-- INTEGRATION NOTES
-- ============================================================================

-- This notification system can now be integrated with the existing inbox:
-- 
-- 1. Update prayerService.ts fetchUserInbox() to query notifications table:
--    Instead of complex joins on prayer_responses, simply query:
--    SELECT * FROM get_user_notifications(userId, limit, offset, unread_only)
--
-- 2. Real-time subscriptions can listen to notifications table:
--    supabase.from('notifications').on('INSERT', callback).subscribe()
--
-- 3. Unread count for UI badges:
--    SELECT get_unread_notification_count(userId)
--
-- 4. Mark notifications read when user views them:
--    SELECT mark_notification_read(notificationId)
--
-- ============================================================================