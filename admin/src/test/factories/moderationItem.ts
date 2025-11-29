/**
 * Moderation Item Mock Factory
 * Generates mock moderation queue items for testing
 */

import type { ModerationPrayer, ModerationNote } from '../../hooks/useModeration'

let idCounter = 0

export function createMockModerationNote(overrides?: Partial<ModerationNote>): ModerationNote {
  return {
    timestamp: new Date().toISOString(),
    admin_id: 'admin-1',
    action: 'reviewed',
    note: 'Content reviewed',
    ...overrides,
  }
}

export function createMockModerationPrayer(overrides?: Partial<ModerationPrayer>): ModerationPrayer {
  idCounter++

  return {
    id: `moderation-${idCounter}`,
    user_id: `user-${idCounter}`,
    user_email: `user${idCounter}@example.com`,
    user_name: `User ${idCounter}`,
    title: `Flagged Prayer ${idCounter}`,
    content: `This content has been flagged ${idCounter}`,
    content_type: 'text',
    media_url: null,
    latitude: 40.7128 + (idCounter * 0.01),
    longitude: -74.0060 + (idCounter * 0.01),
    is_anonymous: false,
    status: 'pending_review',
    flagged_count: 1,
    flag_reasons: ['inappropriate'],
    moderation_notes: [],
    created_at: new Date(Date.now() - idCounter * 1000 * 60 * 60).toISOString(),
    updated_at: new Date(Date.now() - idCounter * 1000 * 60 * 30).toISOString(),
    last_moderated_at: null,
    last_moderated_by: null,
    total_count: 50,
    ...overrides,
  }
}

export function createMockFlaggedPrayer(overrides?: Partial<ModerationPrayer>): ModerationPrayer {
  return createMockModerationPrayer({
    flagged_count: 3,
    flag_reasons: ['inappropriate', 'spam', 'offensive'],
    ...overrides,
  })
}

export function createMockHiddenPrayer(overrides?: Partial<ModerationPrayer>): ModerationPrayer {
  return createMockModerationPrayer({
    status: 'hidden',
    last_moderated_at: new Date().toISOString(),
    last_moderated_by: 'admin-1',
    moderation_notes: [
      createMockModerationNote({
        action: 'hidden',
        note: 'Hidden due to policy violation',
      }),
    ],
    ...overrides,
  })
}

export function createMockRemovedPrayer(overrides?: Partial<ModerationPrayer>): ModerationPrayer {
  return createMockModerationPrayer({
    status: 'removed',
    last_moderated_at: new Date().toISOString(),
    last_moderated_by: 'admin-1',
    moderation_notes: [
      createMockModerationNote({
        action: 'removed',
        note: 'Removed for severe violation',
      }),
    ],
    ...overrides,
  })
}

export function createMockModerationPrayerList(count: number, overrides?: Partial<ModerationPrayer>): ModerationPrayer[] {
  return Array.from({ length: count }, () => createMockModerationPrayer(overrides))
}

export function resetMockModerationCounter() {
  idCounter = 0
}
