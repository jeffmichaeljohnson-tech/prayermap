# PrayerMap Content Moderation Feature

## Overview

This document describes the content moderation feature added to the PrayerMap admin dashboard. The feature provides comprehensive tools for moderating user-generated prayer content and managing user behavior.

## Features

### 1. Moderation Queue

A centralized interface for reviewing prayers that need attention:

- **Flagged Prayers**: Prayers that users have reported
- **Pending Review**: Prayers awaiting admin approval
- **All Items**: Complete view of all moderation activities

### 2. Prayer Moderation Actions

For each prayer, moderators can:

- **Approve**: Mark prayer as active and visible on the public map
- **Hide**: Hide prayer from public view (user can still see it)
- **Remove**: Permanently remove prayer from public map
- **View Details**: See full prayer content, user info, flag history

Each action can include an optional note for audit trail.

### 3. User Management

- **Soft Ban**: Hide all user's prayers and prevent new posts
- **Hard Ban**: Block user from accessing the platform
- **Temporary Bans**: Set expiration dates (in days)
- **Unban**: Remove active bans
- **Ban History**: Track all bans and moderation notes

### 4. Flag System

Users can flag inappropriate content with reasons:
- Inappropriate
- Spam
- Offensive
- Harassment
- Violence
- Other

Prayers flagged 3+ times automatically enter "pending_review" status.

### 5. Audit Trail

All moderation actions are logged:
- What action was taken
- Who took the action
- When it occurred
- Why (moderation notes)

## Database Schema

### New Tables

#### `user_bans`
Tracks banned users with soft/hard ban types and expiration dates.

#### `prayer_flags`
Records user-reported content with reasons and review status.

### Updated Tables

#### `prayers`
New columns:
- `status`: 'active' | 'hidden' | 'removed' | 'pending_review'
- `flagged_count`: Number of times flagged
- `moderation_notes`: JSONB array of admin notes
- `last_moderated_at`: Timestamp of last moderation
- `last_moderated_by`: UUID of moderating admin

## Installation

### 1. Run Database Migration

Execute the SQL migration in Supabase SQL Editor:

```bash
# File location
/admin/moderation-schema-migration.sql
```

This will:
- Add moderation columns to prayers table
- Create user_bans table
- Create prayer_flags table
- Create moderation functions
- Update RLS policies

### 2. Verify Installation

```sql
-- Check prayers table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'prayers'
AND column_name IN ('status', 'flagged_count', 'moderation_notes');

-- Check new tables exist
SELECT * FROM information_schema.tables
WHERE table_name IN ('user_bans', 'prayer_flags');
```

### 3. Access Moderation Dashboard

Navigate to `/admin/moderation` in your admin dashboard.

## Usage Guide

### Reviewing Flagged Content

1. Go to **Moderation** page
2. Select **Flagged** tab to see reported prayers
3. Click **View Details** to see full information
4. Choose action:
   - **Approve** if content is acceptable
   - **Hide** if borderline (visible to user only)
   - **Remove** if violates guidelines
5. Add optional note explaining decision
6. Confirm action

### Banning a User

1. Find problematic prayer in queue
2. Click **Ban User** button
3. Choose ban type:
   - **Soft Ban**: Hides prayers, prevents posting
   - **Hard Ban**: Blocks platform access
4. Provide reason (required)
5. Set duration (optional, blank = permanent)
6. Add notes if needed
7. Confirm ban

### Unbanning a User

1. Go to **Users** page
2. Find banned user
3. Click **Unban** action
4. Confirm unbanning

## API Functions

### `get_moderation_queue()`
Fetches prayers needing review with pagination and filtering.

**Parameters:**
- `p_limit`: Number of results (default: 50)
- `p_offset`: Offset for pagination (default: 0)
- `p_filter`: 'all' | 'flagged' | 'pending' (default: NULL)

**Returns:** Array of prayers with moderation metadata

### `moderate_prayer()`
Changes prayer status and logs action.

**Parameters:**
- `p_prayer_id`: UUID of prayer
- `p_new_status`: 'active' | 'hidden' | 'removed' | 'pending_review'
- `p_note`: Optional moderation note

**Returns:** Updated prayer object

### `ban_user()`
Bans a user from the platform.

**Parameters:**
- `p_user_id`: UUID of user to ban
- `p_reason`: Reason for ban (required)
- `p_ban_type`: 'soft' | 'hard' (default: 'soft')
- `p_duration_days`: Number of days (NULL = permanent)
- `p_note`: Optional admin note

**Returns:** Ban record

### `unban_user()`
Removes active ban from user.

**Parameters:**
- `p_user_id`: UUID of user to unban
- `p_note`: Optional note

**Returns:** Boolean success

### `is_user_banned()`
Checks if user is currently banned.

**Parameters:**
- `p_user_id`: UUID of user

**Returns:** Boolean

### `get_user_ban_status()`
Gets detailed ban status for user.

**Parameters:**
- `p_user_id`: UUID of user

**Returns:** Ban details or NULL

## React Hooks

### `useModerationQueue(options)`
Fetches moderation queue with pagination.

```typescript
const { data, isLoading, error } = useModerationQueue({
  page: 0,
  pageSize: 20,
  filter: 'flagged'
})
```

### `useModeratePrayer()`
Moderates a prayer.

```typescript
const moderatePrayer = useModeratePrayer()
await moderatePrayer.mutateAsync({
  prayerId: 'uuid',
  status: 'hidden',
  note: 'Borderline content'
})
```

### `useBanUser()`
Bans a user.

```typescript
const banUser = useBanUser()
await banUser.mutateAsync({
  userId: 'uuid',
  reason: 'Spam',
  banType: 'soft',
  durationDays: 30
})
```

### `useUserBanStatus(userId)`
Gets user's ban status.

```typescript
const { data: banStatus } = useUserBanStatus(userId)
if (banStatus?.is_banned) {
  // User is banned
}
```

## Security

### Row Level Security (RLS)

All moderation tables have RLS enabled:

- **user_bans**: Only admins/moderators can view/modify
- **prayer_flags**: Users can create, admins can view/update
- **prayers**: Public can only see 'active' status prayers

### Audit Logging

All moderation actions are logged to `audit_logs` table with:
- Admin user ID
- Action type
- Affected entity
- Old and new values
- Timestamp

### Admin Permissions

Moderation actions require:
- **Moderator or Admin role**: Approve, hide prayers, soft ban users
- **Admin role only**: Remove prayers, hard ban users, delete content

## Best Practices

### Moderation Guidelines

1. **Review Context**: Read full prayer and user history
2. **Document Decisions**: Always add notes explaining actions
3. **Start Light**: Try hiding before removing
4. **Warn Users**: Use soft bans before hard bans
5. **Be Consistent**: Apply same standards to similar cases

### Response Times

- **High Priority** (violence, harassment): < 1 hour
- **Medium Priority** (spam, inappropriate): < 24 hours
- **Low Priority** (borderline content): < 48 hours

### Escalation

If unsure:
1. Mark as 'pending_review'
2. Add note with concern
3. Consult with other admins
4. Document decision rationale

## Monitoring

### Key Metrics

Track these in your dashboard:
- Flagged prayers per day
- Average moderation response time
- Ban rate (soft vs hard)
- False positive rate (approved after flagging)

### Reports

Generate regular reports:
- Weekly moderation summary
- Top flagged users
- Most common flag reasons
- Moderation action breakdown

## Troubleshooting

### Migration fails

**Issue**: SQL migration errors

**Solution**:
- Ensure main schema is installed first
- Run admin schema before moderation schema
- Check PostgreSQL logs for specific errors

### Functions not found

**Issue**: RPC function errors in UI

**Solution**:
- Verify migration ran successfully
- Check Supabase function permissions
- Ensure user has admin role in `admin_roles` table

### Policies blocking actions

**Issue**: "Access denied" errors

**Solution**:
- Verify user is in `admin_roles` table
- Check role is 'admin' or 'moderator'
- Review RLS policies in Supabase dashboard

## Future Enhancements

Potential additions:
- Automated content filtering with AI
- Appeal system for banned users
- Bulk moderation actions
- Custom moderation rules/filters
- User reputation system
- Moderation analytics dashboard

## Support

For issues or questions:
1. Check audit logs for action history
2. Review SQL function code
3. Test with Supabase SQL Editor
4. Contact admin dashboard maintainers

## Files Modified

### New Files
- `/admin/moderation-schema-migration.sql` - Database migration
- `/admin/src/hooks/useModeration.ts` - React Query hooks
- `/admin/src/pages/ModerationPage.tsx` - Moderation UI
- `/admin/MODERATION_FEATURE_README.md` - This file

### Modified Files
- `/admin/src/App.tsx` - Added moderation route
- `/admin/src/components/layout/Sidebar.tsx` - Added moderation nav item
- `/admin/src/hooks/index.ts` - Export moderation hooks
- `/admin/src/pages/index.ts` - Export moderation page
- `/admin/src/types/admin.ts` - Added moderation audit actions

## Version History

### v1.0.0 (Initial Release)
- Moderation queue with filtering
- Prayer approval/hide/remove actions
- User soft/hard bans with expiration
- Flag system with auto-review threshold
- Comprehensive audit logging
- Admin dashboard integration
