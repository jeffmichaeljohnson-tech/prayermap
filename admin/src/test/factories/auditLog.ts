/**
 * Audit Log Mock Factory
 * Generates mock audit log entries for testing
 */

import type { AuditLog, AuditAction, EntityType } from '../../types/admin'

let idCounter = 0

export function createMockAuditLog(overrides?: Partial<AuditLog>): AuditLog {
  idCounter++

  return {
    id: `audit-${idCounter}`,
    admin_id: `admin-${idCounter}`,
    admin_email: `admin${idCounter}@example.com`,
    action: 'update' as AuditAction,
    entity_type: 'prayer' as EntityType,
    entity_id: `entity-${idCounter}`,
    details: { note: `Action ${idCounter}` },
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0 (Test)',
    created_at: new Date(Date.now() - idCounter * 1000 * 60).toISOString(),
    ...overrides,
  }
}

export function createMockPrayerUpdateLog(overrides?: Partial<AuditLog>): AuditLog {
  return createMockAuditLog({
    action: 'update_prayer',
    entity_type: 'prayer',
    details: {
      field: 'title',
      old_value: 'Old Title',
      new_value: 'New Title',
    },
    ...overrides,
  })
}

export function createMockModerationLog(overrides?: Partial<AuditLog>): AuditLog {
  return createMockAuditLog({
    action: 'moderate_prayer',
    entity_type: 'prayer',
    details: {
      status: 'approved',
      note: 'Content approved',
    },
    ...overrides,
  })
}

export function createMockBanLog(overrides?: Partial<AuditLog>): AuditLog {
  return createMockAuditLog({
    action: 'ban_user',
    entity_type: 'user',
    details: {
      reason: 'Inappropriate content',
      ban_type: 'soft',
      duration_days: 7,
    },
    ...overrides,
  })
}

export function createMockAuditLogList(count: number, overrides?: Partial<AuditLog>): AuditLog[] {
  return Array.from({ length: count }, () => createMockAuditLog(overrides))
}

export function resetMockAuditLogCounter() {
  idCounter = 0
}
