/**
 * Admin type definitions
 */

import { User } from '@supabase/supabase-js'

/**
 * Admin role types
 */
export type AdminRole = 'admin' | 'moderator'

/**
 * Admin user interface combining auth user with admin role
 */
export interface AdminUser {
  id: string
  email: string
  role: AdminRole
  createdAt: string
  user: User
}

/**
 * Database row for admin_roles table
 */
export interface AdminRoleRow {
  id: string
  user_id: string
  role: AdminRole
  created_at: string
  created_by: string | null
}

/**
 * Audit log entry for tracking admin actions
 */
export interface AuditLog {
  id: string
  admin_id: string
  admin_email: string
  action: AuditAction
  entity_type: EntityType
  entity_id: string
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

/**
 * Types of actions that can be audited
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'flag'
  | 'unflag'
  | 'ban_user'
  | 'unban_user'
  | 'login'
  | 'logout'
  | 'approve_prayer'
  | 'hide_prayer'
  | 'remove_prayer'
  | 'moderate_prayer'
  | 'update_prayer'
  | 'delete_prayer'
  | 'update_user'
  | 'approve_prayer_response'
  | 'hide_prayer_response'
  | 'remove_prayer_response'
  | 'moderate_prayer_response'
  | 'update_prayer_response'
  | 'delete_prayer_response'
  | 'flag_prayer_response'
  | 'resolve_prayer_response_flag'
  | 'toggle_response_content_visibility'
  | 'add_response_moderation_note'

/**
 * Entity types that can be managed by admins
 */
export type EntityType =
  | 'prayer'
  | 'prayer_response'
  | 'user'
  | 'admin_role'
  | 'audit_log'

/**
 * Database schema for admin tables
 */
export interface AdminDatabase {
  public: {
    Tables: {
      admin_roles: {
        Row: AdminRoleRow
        Insert: Omit<AdminRoleRow, 'id' | 'created_at'>
        Update: Partial<Omit<AdminRoleRow, 'id' | 'user_id' | 'created_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never // Audit logs are immutable
      }
      prayer_response_flags: {
        Row: PrayerResponseFlag
        Insert: Omit<PrayerResponseFlag, 'id' | 'created_at'>
        Update: Partial<Omit<PrayerResponseFlag, 'id' | 'response_id' | 'flagged_by' | 'created_at'>>
      }
    }
  }
}

/**
 * Prayer response flag for content moderation
 */
export interface PrayerResponseFlag {
  id: string
  response_id: string
  flagged_by: string
  reason: string
  details: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}
