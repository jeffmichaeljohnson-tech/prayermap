-- ============================================================================
-- ROLLBACK: PrayerMap Notifications System Migration
-- ============================================================================
-- This file contains the complete rollback procedure for migration 020
-- to safely undo the notifications system if needed.
--
-- ⚠️  WARNING: This rollback will permanently delete all notification data.
-- Make sure to backup the notifications table before running in production.
--
-- Usage:
-- 1. Backup notifications: CREATE TABLE notifications_backup AS SELECT * FROM notifications;
-- 2. Run this rollback script to undo migration 020
-- 3. Verify the rollback completed successfully
-- ============================================================================

-- ============================================================================
-- BACKUP NOTIFICATION DATA (OPTIONAL BUT RECOMMENDED)
-- ============================================================================

-- Uncomment the following lines to backup notification data before rollback
-- CREATE TABLE IF NOT EXISTS notifications_backup_$(date +%Y%m%d) AS 
-- SELECT * FROM notifications;

-- ============================================================================
-- STEP 1: DROP TRIGGERS
-- ============================================================================

-- Drop notification creation trigger
DROP TRIGGER IF EXISTS on_prayer_response_created ON prayer_responses;

-- Drop updated_at trigger
DROP TRIGGER IF EXISTS on_notifications_updated ON notifications;

-- ============================================================================
-- STEP 2: DROP FUNCTIONS
-- ============================================================================

-- Drop notification management functions
DROP FUNCTION IF EXISTS create_prayer_response_notification();
DROP FUNCTION IF EXISTS mark_notification_read(UUID);
DROP FUNCTION IF EXISTS mark_notifications_read(UUID[]);
DROP FUNCTION IF EXISTS mark_all_notifications_read();
DROP FUNCTION IF EXISTS get_notification_count();
DROP FUNCTION IF EXISTS get_notifications(INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS cleanup_old_notifications(INTEGER);

-- ============================================================================
-- STEP 3: DROP RLS POLICIES
-- ============================================================================

-- Drop all RLS policies on notifications table
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON notifications;

-- ============================================================================
-- STEP 4: DROP INDEXES
-- ============================================================================

-- Drop all notification indexes
DROP INDEX IF EXISTS idx_notifications_inbox_primary;
DROP INDEX IF EXISTS idx_notifications_unread_count;
DROP INDEX IF EXISTS idx_notifications_prayer_lookup;
DROP INDEX IF EXISTS idx_notifications_response_lookup;
DROP INDEX IF EXISTS idx_notifications_from_user;
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_expiry;
DROP INDEX IF EXISTS idx_notifications_read_at;

-- ============================================================================
-- STEP 5: DROP TABLE
-- ============================================================================

-- Drop the notifications table (this will cascade to any remaining dependencies)
DROP TABLE IF EXISTS notifications CASCADE;

-- ============================================================================
-- STEP 6: DROP ENUM TYPE
-- ============================================================================

-- Drop the notification_type enum
DROP TYPE IF EXISTS notification_type;

-- ============================================================================
-- STEP 7: REVOKE PERMISSIONS
-- ============================================================================

-- Note: Permissions are automatically revoked when functions/tables are dropped
-- This section is for documentation purposes only

/*
The following permissions were revoked automatically:
- EXECUTE permissions on notification functions
- SELECT, UPDATE permissions on notifications table
*/

-- ============================================================================
-- ROLLBACK VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify the rollback completed successfully:

-- 1. Verify notifications table doesn't exist
-- SELECT to_regclass('public.notifications');
-- Expected result: NULL

-- 2. Verify notification_type enum doesn't exist
-- SELECT 1 FROM pg_type WHERE typname = 'notification_type';
-- Expected result: 0 rows

-- 3. Verify trigger doesn't exist
-- SELECT 1 FROM pg_trigger WHERE tgname = 'on_prayer_response_created';
-- Expected result: 0 rows

-- 4. Verify functions don't exist
-- SELECT 1 FROM pg_proc WHERE proname LIKE '%notification%';
-- Expected result: 0 rows (or only unrelated functions)

-- ============================================================================
-- POST-ROLLBACK ACTIONS REQUIRED
-- ============================================================================

/*
After running this rollback, you will need to:

1. Update your application code to:
   - Remove notification-related API calls
   - Disable notification UI components
   - Remove notification subscriptions

2. Consider alternative approaches:
   - Use existing prayer_responses table for inbox functionality
   - Implement client-side notification logic
   - Use external notification service

3. If re-applying the migration later:
   - Make sure to test thoroughly in development first
   - Consider data migration if notifications were created before rollback
   - Update any application code that depends on the notifications system
*/

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- Rollback of migration 020_notifications_system.sql completed.
-- The database is now in the state it was before the notifications migration.
--
-- ⚠️  IMPORTANT REMINDERS:
-- - All notification data has been permanently deleted (unless backed up)
-- - Application code may need updates to handle missing notification features
-- - Consider the impact on user experience when notifications are removed
-- - Test your application thoroughly after this rollback