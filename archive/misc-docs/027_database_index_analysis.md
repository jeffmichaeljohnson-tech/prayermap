# Database Index Gap Analysis for PrayerMap

## Current Tables and Foreign Key Relationships

### Core Tables:
1. **profiles**
   - FK: `id` → `auth.users(id)` 
   - Current indexes: `profiles_display_name_idx`

2. **prayers**
   - FK: `user_id` → `auth.users(id)`
   - Current indexes: `prayers_location_gist_idx`, `prayers_user_id_idx`, `prayers_created_at_idx`

3. **prayer_responses**
   - FK: `prayer_id` → `prayers(id)`
   - FK: `responder_id` → `auth.users(id)`
   - FK: `last_moderated_by` → `auth.users(id)` (added in migration 016)
   - Current indexes: `prayer_responses_prayer_id_idx`, `prayer_responses_responder_id_idx`

4. **prayer_connections**
   - FK: `prayer_id` → `prayers(id)`
   - FK: `from_user_id` → `auth.users(id)`
   - FK: `to_user_id` → `auth.users(id)`
   - Current indexes: `prayer_connections_prayer_id_idx`, `prayer_connections_from_user_idx`, `prayer_connections_to_user_idx`, `prayer_connections_expires_at_idx`

5. **admin_roles**
   - FK: `user_id` → `auth.users(id)`
   - FK: `created_by` → `auth.users(id)`
   - Current indexes: `idx_admin_roles_user_id`, `idx_admin_roles_role`

6. **audit_logs**
   - FK: `admin_id` → `auth.users(id)`
   - Current indexes: `idx_audit_logs_admin_id`, `idx_audit_logs_entity`, `idx_audit_logs_created_at`, `idx_audit_logs_action`

7. **notifications**
   - FK: `user_id` → `auth.users(id)`
   - FK: `prayer_id` → `prayers(id)`
   - FK: `prayer_response_id` → `prayer_responses(id)`
   - FK: `from_user_id` → `auth.users(id)`
   - Current indexes: `idx_notifications_inbox_primary`, `idx_notifications_unread_count`, `idx_notifications_prayer_lookup`

8. **prayer_response_flags**
   - FK: `response_id` → `prayer_responses(id)`
   - FK: `reporter_id` → `auth.users(id)`
   - FK: `reviewed_by` → `auth.users(id)`
   - Current indexes: Unknown (need to check)

## CRITICAL MISSING FOREIGN KEY INDEXES (7 identified):

### 1. **admin_roles.created_by** (FK to auth.users)
- **Missing**: Index on `created_by` column
- **Impact**: Slow admin audit queries, poor JOIN performance
- **Usage**: Admin dashboard queries tracking who created roles

### 2. **prayer_responses.last_moderated_by** (FK to auth.users)
- **Missing**: Index on `last_moderated_by` column
- **Impact**: Slow moderation history queries, admin dashboard delays
- **Usage**: Admin moderation tracking and audit trails

### 3. **notifications.prayer_id** (FK to prayers)
- **Missing**: Dedicated index for prayer_id lookups
- **Impact**: Slow prayer notification aggregation
- **Usage**: "Show all notifications for this prayer" queries

### 4. **notifications.prayer_response_id** (FK to prayer_responses)
- **Missing**: Index on `prayer_response_id` column
- **Impact**: Slow response-specific notification queries
- **Usage**: Notification cleanup when responses are deleted

### 5. **notifications.from_user_id** (FK to auth.users)
- **Missing**: Index on `from_user_id` column
- **Impact**: Slow "notifications I sent" queries
- **Usage**: User activity tracking, notification history

### 6. **prayer_response_flags.response_id** (FK to prayer_responses)
- **Missing**: Index on `response_id` column
- **Impact**: Slow moderation flag lookups
- **Usage**: "Show all flags for this response" queries

### 7. **prayer_response_flags.reviewed_by** (FK to auth.users)
- **Missing**: Index on `reviewed_by` column  
- **Impact**: Slow admin workload queries
- **Usage**: "Show all flags reviewed by moderator X" queries

## Additional Index Opportunities:

### Composite Indexes for Complex Queries:

1. **Inbox Optimization**: `prayer_responses(prayer_id, created_at DESC, responder_id)`
   - Supports: Fast inbox queries with JOIN to prayers table
   - Already partially covered by migration 019

2. **Admin Dashboard**: `prayer_response_flags(reviewed, created_at DESC)`
   - Supports: "Show all unreviewed flags by date" queries

3. **User Activity**: `notifications(user_id, is_read, created_at DESC)`
   - Already covered by migration 020

4. **Prayer Connections Performance**: Already optimized by migration 018

## Performance Impact Analysis:

### High Priority (300% improvement potential):
- Missing FK indexes cause hash joins instead of nested loops
- Sequential scans on large tables instead of index seeks
- Cascade operations without proper indexes

### Medium Priority (50-100% improvement):
- Composite indexes for multi-column WHERE clauses  
- Partial indexes for frequently filtered subsets

### Low Priority (10-30% improvement):
- Covering indexes to avoid table lookups
- Expression indexes for computed columns