# Content Moderation - Quick Start Guide

## Installation (5 minutes)

### Step 1: Run Database Migration
```bash
# Open Supabase SQL Editor
# Paste contents of: /admin/moderation-schema-migration.sql
# Click "Run"
```

### Step 2: Verify Installation
The Moderation link should now appear in your admin sidebar.

### Step 3: Access Dashboard
Navigate to: `https://your-app.com/admin/moderation`

## Common Tasks

### Review Flagged Content

1. Click **Moderation** in sidebar
2. Select **Flagged** tab
3. Click prayer to view details
4. Choose action:
   - **Approve** ✅ - Content is fine
   - **Hide** ⚠️ - Borderline content
   - **Remove** ❌ - Violates guidelines
5. Add note (optional)
6. Confirm

### Ban a User

1. In moderation queue, find user's prayer
2. Click **Ban User**
3. Select ban type:
   - **Soft Ban**: Hides content, prevents posting
   - **Hard Ban**: Blocks all access
4. Enter reason
5. Set duration (blank = permanent)
6. Confirm

### Unban a User

1. Go to **Users** page
2. Find banned user (marked with 🚫)
3. Click **Unban**
4. Confirm

## Prayer Status Guide

| Status | Meaning | Visibility |
|--------|---------|------------|
| **Active** | Approved content | Public map |
| **Hidden** | Soft-removed | User only |
| **Removed** | Hard-removed | Admin only |
| **Pending Review** | Awaiting moderation | Admin only |

## Ban Types

### Soft Ban
- Hides all user prayers
- Prevents new posts
- User can still log in
- **Use for**: Spam, minor violations

### Hard Ban
- Blocks platform access
- Cannot log in
- All content hidden
- **Use for**: Serious violations, repeat offenders

## Flag Reasons

Users can flag content as:
- **Inappropriate** - Not suitable for platform
- **Spam** - Unwanted/promotional content
- **Offensive** - Rude or insulting
- **Harassment** - Targeted abuse
- **Violence** - Threats or violent content
- **Other** - Doesn't fit categories

## Auto-Moderation Rules

Prayers are automatically marked for review when:
- Flagged 3+ times by different users
- Contains banned keywords (if configured)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `A` | Approve selected prayer |
| `H` | Hide selected prayer |
| `R` | Remove selected prayer |
| `Esc` | Close modal/dialog |
| `←` / `→` | Navigate pages |

## Best Practices

✅ **DO:**
- Review full context before acting
- Add notes explaining decisions
- Start with lighter actions (hide before remove)
- Be consistent across similar cases
- Check user history for patterns

❌ **DON'T:**
- Act on single flags without review
- Ban without clear reason
- Remove content without note
- Make inconsistent decisions
- Rush through queue

## Response Time Guidelines

| Priority | Response Time |
|----------|---------------|
| **High** (violence, harassment) | < 1 hour |
| **Medium** (spam, inappropriate) | < 24 hours |
| **Low** (borderline) | < 48 hours |

## Troubleshooting

### "Function does not exist" error
**Fix**: Run the SQL migration in Supabase

### "Access denied" error
**Fix**: Ensure you're in the `admin_roles` table

### Moderation page is empty
**Fix**: Check that prayers exist and have flags

### Can't see banned users
**Fix**: Go to Users page, banned users show 🚫 icon

## Support Commands

### Check if migration ran
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'prayers' AND column_name = 'status';
```

### View moderation queue
```sql
SELECT * FROM get_moderation_queue(50, 0, 'flagged');
```

### Check user ban status
```sql
SELECT * FROM get_user_ban_status('user-uuid-here');
```

### View audit logs
```sql
SELECT * FROM audit_logs
WHERE action IN ('approve_prayer', 'hide_prayer', 'remove_prayer', 'ban_user')
ORDER BY created_at DESC
LIMIT 20;
```

## Quick Reference

### File Locations
- Migration: `/admin/moderation-schema-migration.sql`
- Hooks: `/admin/src/hooks/useModeration.ts`
- Page: `/admin/src/pages/ModerationPage.tsx`
- Full docs: `/admin/MODERATION_FEATURE_README.md`

### Key Functions
- `get_moderation_queue()` - Fetch items to review
- `moderate_prayer()` - Approve/hide/remove
- `ban_user()` - Ban a user
- `unban_user()` - Remove ban
- `get_user_ban_status()` - Check ban status

### React Hooks
- `useModerationQueue()` - Get queue
- `useModeratePrayer()` - Moderate prayer
- `useBanUser()` - Ban user
- `useUnbanUser()` - Unban user
- `useUserBanStatus()` - Get ban info

## Need Help?

1. Check full documentation: `MODERATION_FEATURE_README.md`
2. Review SQL migration file for database structure
3. Inspect browser console for errors
4. Check Supabase logs for backend issues
5. Verify admin role in database

---

**Last Updated**: 2024
**Version**: 1.0.0
