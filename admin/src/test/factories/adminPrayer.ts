/**
 * Admin Prayer Mock Factory
 * Generates mock AdminPrayer objects for testing
 */

import type { AdminPrayer } from '../../hooks/usePrayers'

let idCounter = 0

export function createMockAdminPrayer(overrides?: Partial<AdminPrayer>): AdminPrayer {
  idCounter++

  return {
    id: `prayer-${idCounter}`,
    user_id: `user-${idCounter}`,
    user_email: `user${idCounter}@example.com`,
    user_name: `User ${idCounter}`,
    title: `Prayer ${idCounter}`,
    content: `This is prayer content ${idCounter}`,
    content_type: 'text',
    media_url: null,
    latitude: 40.7128 + (idCounter * 0.01),
    longitude: -74.0060 + (idCounter * 0.01),
    is_anonymous: false,
    created_at: new Date(Date.now() - idCounter * 1000 * 60 * 60).toISOString(),
    updated_at: new Date(Date.now() - idCounter * 1000 * 60 * 30).toISOString(),
    total_count: 100,
    ...overrides,
  }
}

export function createMockAudioPrayer(overrides?: Partial<AdminPrayer>): AdminPrayer {
  return createMockAdminPrayer({
    content_type: 'audio',
    media_url: 'https://example.com/audio.mp3',
    title: 'Audio Prayer',
    content: 'Audio prayer content',
    ...overrides,
  })
}

export function createMockVideoPrayer(overrides?: Partial<AdminPrayer>): AdminPrayer {
  return createMockAdminPrayer({
    content_type: 'video',
    media_url: 'https://example.com/video.mp4',
    title: 'Video Prayer',
    content: 'Video prayer content',
    ...overrides,
  })
}

export function createMockAnonymousPrayer(overrides?: Partial<AdminPrayer>): AdminPrayer {
  return createMockAdminPrayer({
    is_anonymous: true,
    user_email: null,
    user_name: null,
    ...overrides,
  })
}

export function createMockPrayerList(count: number, overrides?: Partial<AdminPrayer>): AdminPrayer[] {
  return Array.from({ length: count }, () => createMockAdminPrayer(overrides))
}

export function resetMockPrayerCounter() {
  idCounter = 0
}
