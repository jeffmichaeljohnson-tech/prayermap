# PrayerMap Notifications System Migration Guide

## Migration 020: Complete Notifications System Implementation

This migration implements a comprehensive notification system for PrayerMap to enable real-time inbox messaging when users receive prayer responses.

### 📋 Migration Overview

**Files Created:**
- `020_notifications_system.sql` - Main migration script
- `020_rollback_notifications_system.sql` - Complete rollback procedure
- `020_MIGRATION_GUIDE.md` - This documentation file

**Components Implemented:**
1. ✅ **Notifications Table** - Central table for all notification types
2. ✅ **Automatic Triggers** - Auto-create notifications on prayer responses
3. ✅ **Performance Indexes** - Optimized for inbox queries
4. ✅ **Security Policies** - Complete RLS implementation
5. ✅ **Management Functions** - Mark read, get counts, pagination
6. ✅ **Rollback Procedures** - Safe migration reversal

### 🗄️ Database Schema Changes

#### New Table: `notifications`

```sql
notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type notification_type NOT NULL,
  title TEXT NOT NULL CHECK (LENGTH(title) BETWEEN 1 AND 200),
  message TEXT NOT NULL CHECK (LENGTH(message) BETWEEN 1 AND 1000),
  prayer_id UUID REFERENCES prayers(id),
  prayer_response_id UUID REFERENCES prayer_responses(id),
  from_user_id UUID REFERENCES auth.users(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### New Enum: `notification_type`

```sql
CREATE TYPE notification_type AS ENUM (
  'prayer_response',    -- Someone responded to your prayer
  'prayer_support',     -- Someone is praying for your request  
  'prayer_mention',     -- You were mentioned in a prayer
  'system_announcement' -- System-wide announcements
);
```

#### Performance Indexes

| Index Name | Purpose | Performance Impact |
|------------|---------|------------------|
| `idx_notifications_inbox_primary` | Main inbox queries | O(log n) |
| `idx_notifications_unread_count` | Unread count queries | O(log n) |
| `idx_notifications_prayer_lookup` | Prayer-specific notifications | O(log n) |
| `idx_notifications_response_lookup` | Response notifications | O(log n) |
| `idx_notifications_from_user` | User filtering | O(log n) |
| `idx_notifications_type` | Type-based filtering | O(log n) |
| `idx_notifications_expiry` | Cleanup queries | O(log n) |
| `idx_notifications_read_at` | Analytics queries | O(log n) |

### 🔧 New Database Functions

#### User Functions
- `mark_notification_read(UUID)` - Mark single notification as read
- `mark_notifications_read(UUID[])` - Mark multiple notifications as read
- `mark_all_notifications_read()` - Mark all user notifications as read
- `get_notification_count()` - Get unread notification count
- `get_notifications(limit, offset, unread_only)` - Paginated notifications

#### Admin Functions
- `cleanup_old_notifications(days_old)` - Remove old read notifications

#### Trigger Functions
- `create_prayer_response_notification()` - Auto-create notifications on prayer responses

### 🔒 Security Implementation

#### Row Level Security (RLS) Policies

```sql
-- Users can view their own notifications
"Users can view own notifications" - SELECT using (auth.uid() = user_id)

-- Users can update their own notifications (mark as read)
"Users can update own notifications" - UPDATE using (auth.uid() = user_id)

-- System can create notifications
"System can create notifications" - INSERT with check (true)

-- Admins can view all notifications
"Admins can view all notifications" - SELECT using (admin check)

-- Admins can delete inappropriate notifications
"Admins can delete notifications" - DELETE using (admin check)
```

### 🚀 Deployment Procedures

#### Pre-Deployment Checklist

1. **Backup Database**
   ```sql
   -- Create backup of prayer_responses table
   CREATE TABLE prayer_responses_backup AS SELECT * FROM prayer_responses;
   ```

2. **Verify Dependencies**
   - Confirm `auth.users` table exists
   - Confirm `prayers` table exists
   - Confirm `prayer_responses` table exists
   - Confirm `admin_roles` table exists (for admin policies)

3. **Check Database Permissions**
   - Verify authenticated users have necessary permissions
   - Confirm RLS is properly configured on existing tables

#### Deployment Steps

1. **Apply Migration**
   ```bash
   # For Supabase Cloud
   npx supabase db push

   # For local development
   npx supabase db reset  # applies all migrations
   ```

2. **Verify Migration Success**
   ```sql
   -- Check notifications table exists
   SELECT to_regclass('public.notifications');

   -- Check enum type exists  
   SELECT 1 FROM pg_type WHERE typname = 'notification_type';

   -- Check trigger exists
   SELECT 1 FROM pg_trigger WHERE tgname = 'on_prayer_response_created';

   -- Check indexes exist
   SELECT indexname FROM pg_indexes WHERE tablename = 'notifications';
   ```

3. **Test Notification Creation**
   ```sql
   -- Insert a test prayer response (as authenticated user)
   -- Should automatically create a notification
   ```

#### Post-Deployment Actions

1. **Update Application Code**
   - Update notification service to use new functions
   - Test inbox functionality
   - Verify real-time subscriptions work

2. **Monitor Performance**
   - Check notification creation performance
   - Monitor inbox query performance
   - Watch for notification table growth

3. **Schedule Maintenance**
   - Set up periodic cleanup job for old notifications
   - Monitor storage usage

### 🔄 Rollback Procedures

#### Emergency Rollback

If immediate rollback is needed:

```bash
# Apply the rollback migration
psql -f supabase/migrations/020_rollback_notifications_system.sql

# OR manually run the rollback SQL
```

#### Rollback Checklist

1. **Backup Current Data**
   ```sql
   CREATE TABLE notifications_backup_$(date +%Y%m%d) AS 
   SELECT * FROM notifications;
   ```

2. **Apply Rollback Script**
   - Run `020_rollback_notifications_system.sql`

3. **Verify Rollback Success**
   ```sql
   -- Verify table doesn't exist
   SELECT to_regclass('public.notifications'); -- Should return NULL
   ```

4. **Update Application**
   - Disable notification features
   - Update inbox to use prayer_responses directly
   - Remove notification-related API calls

### ⚡ Performance Considerations

#### Query Performance

**Inbox Query (Primary Use Case):**
```sql
-- Optimized with idx_notifications_inbox_primary
SELECT * FROM notifications 
WHERE user_id = $1 AND is_read = false 
ORDER BY created_at DESC 
LIMIT 50;
-- Expected: ~1ms for 10k notifications per user
```

**Unread Count Query:**
```sql
-- Optimized with idx_notifications_unread_count
SELECT COUNT(*) FROM notifications 
WHERE user_id = $1 AND is_read = false;
-- Expected: ~0.5ms for 10k notifications per user
```

#### Storage Estimates

| Users | Avg Notifications/User | Storage per Year |
|-------|----------------------|------------------|
| 1,000 | 100 | ~10 MB |
| 10,000 | 100 | ~100 MB |
| 100,000 | 100 | ~1 GB |

#### Memory Usage

- **Trigger overhead:** ~1ms per prayer response
- **Index memory:** ~5% of table size
- **Connection overhead:** Negligible with proper indexing

### 🛠️ Troubleshooting

#### Common Issues

1. **Migration Fails on Constraint**
   ```
   Error: relation "admin_roles" does not exist
   ```
   **Solution:** Create admin_roles table or modify admin policies

2. **Trigger Not Creating Notifications**
   ```sql
   -- Check trigger exists
   SELECT * FROM pg_trigger WHERE tgname = 'on_prayer_response_created';
   
   -- Check function exists
   SELECT * FROM pg_proc WHERE proname = 'create_prayer_response_notification';
   ```

3. **Performance Issues**
   ```sql
   -- Check if indexes are being used
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM notifications 
   WHERE user_id = $1 AND is_read = false 
   ORDER BY created_at DESC;
   ```

4. **RLS Policy Blocking Queries**
   ```sql
   -- Check current user
   SELECT auth.uid();
   
   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'notifications';
   ```

#### Debug Queries

```sql
-- Check notification creation
SELECT 
  n.type, n.title, n.created_at,
  p.title as prayer_title,
  pr.message as response_message
FROM notifications n
LEFT JOIN prayers p ON n.prayer_id = p.id  
LEFT JOIN prayer_responses pr ON n.prayer_response_id = pr.id
ORDER BY n.created_at DESC
LIMIT 10;

-- Check notification performance
SELECT 
  schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE tablename = 'notifications';
```

### 📈 Monitoring & Maintenance

#### Key Metrics to Monitor

1. **Notification Creation Rate**
   - Target: < 5ms per notification
   - Alert: > 10ms per notification

2. **Inbox Query Performance**
   - Target: < 2ms for inbox load
   - Alert: > 5ms for inbox load

3. **Storage Growth**
   - Target: Predictable linear growth
   - Alert: Exponential growth (possible data leak)

4. **Unread Notification Count**
   - Target: < 1000 unread per active user
   - Alert: > 5000 unread per user

#### Maintenance Tasks

**Weekly:**
- Monitor notification creation trends
- Check for failed notification triggers

**Monthly:**  
- Run cleanup for old read notifications
- Analyze notification engagement metrics

**Quarterly:**
- Review notification types and content
- Optimize indexes if needed
- Update notification cleanup policies

### 🔮 Future Enhancements

#### Planned Features

1. **Push Notification Integration**
   - Mobile push notifications via Capacitor
   - Web push notifications via Service Worker
   - Email notifications for offline users

2. **Notification Preferences**
   - User settings for notification types
   - Frequency controls (immediate, daily digest, etc.)
   - Quiet hours support

3. **Advanced Filtering**
   - Notification categories
   - Priority levels
   - Custom user filters

4. **Analytics & Insights**
   - Notification engagement tracking
   - Response time analytics
   - User notification preferences

#### Database Schema Evolution

**Next Migration (021):**
- Add notification preferences table
- Add push notification tokens table
- Add notification analytics tracking

### 📞 Support & Contact

**For Migration Issues:**
1. Check this guide first
2. Review migration logs
3. Test in development environment
4. Create detailed issue report with SQL logs

**Migration Author:** Claude Code Agent 8 - Database Migration Creator  
**Created:** 2024-11-29  
**Version:** 1.0  
**Status:** Ready for Production Deployment

---

**Remember:** This migration represents sacred digital infrastructure that connects people through prayer. Every notification is a spiritual bond between community members. Handle with care and test thoroughly.