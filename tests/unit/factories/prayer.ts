/**
 * Factory functions for creating mock prayer-related test data
 * Provides realistic default values with ability to override specific fields
 */

import type { Prayer, PrayerResponse, PrayerConnection } from '@/types/prayer';
import type { User, Session } from '@supabase/supabase-js';

// ============================================================================
// Sequence Generators
// ============================================================================

let prayerIdCounter = 1;
let userIdCounter = 1;
let responseIdCounter = 1;
let connectionIdCounter = 1;

/**
 * Generate a unique prayer ID
 */
function generatePrayerId(): string {
  return `prayer-${String(prayerIdCounter++).padStart(8, '0')}`;
}

/**
 * Generate a unique user ID
 */
function generateUserId(): string {
  return `user-${String(userIdCounter++).padStart(8, '0')}`;
}

/**
 * Generate a unique response ID
 */
function generateResponseId(): string {
  return `response-${String(responseIdCounter++).padStart(8, '0')}`;
}

/**
 * Generate a unique connection ID
 */
function generateConnectionId(): string {
  return `connection-${String(connectionIdCounter++).padStart(8, '0')}`;
}

/**
 * Reset all ID counters (useful for test isolation)
 */
export function resetIdCounters(): void {
  prayerIdCounter = 1;
  userIdCounter = 1;
  responseIdCounter = 1;
  connectionIdCounter = 1;
}

// ============================================================================
// Location Factories
// ============================================================================

/**
 * Generate a random coordinate within a reasonable range
 * Default: New York City area
 */
export function createMockLocation(overrides?: {
  lat?: number;
  lng?: number;
}): { lat: number; lng: number } {
  return {
    lat: overrides?.lat ?? 40.7128 + (Math.random() - 0.5) * 0.1,
    lng: overrides?.lng ?? -74.006 + (Math.random() - 0.5) * 0.1,
  };
}

/**
 * Generate specific city locations for testing
 */
export const mockLocations = {
  newYork: { lat: 40.7128, lng: -74.006 },
  london: { lat: 51.5074, lng: -0.1278 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  paris: { lat: 48.8566, lng: 2.3522 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  losAngeles: { lat: 34.0522, lng: -118.2437 },
  toronto: { lat: 43.6532, lng: -79.3832 },
};

// ============================================================================
// Blob Factories
// ============================================================================

/**
 * Create a mock audio blob
 */
export function createMockAudioBlob(size = 1024): Blob {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  return new Blob([data], { type: 'audio/webm;codecs=opus' });
}

/**
 * Create a mock video blob
 */
export function createMockVideoBlob(size = 4096): Blob {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  return new Blob([data], { type: 'video/webm;codecs=vp8,opus' });
}

/**
 * Create a mock File object
 */
export function createMockFile(
  filename: string,
  type: string,
  size = 1024
): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], filename, { type });
}

// ============================================================================
// User Factories
// ============================================================================

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides?: Partial<User>): User {
  const id = overrides?.id || generateUserId();

  return {
    id,
    app_metadata: {},
    user_metadata: {
      name: overrides?.user_metadata?.name || `Test User ${id}`,
      avatar_url: overrides?.user_metadata?.avatar_url || null,
      ...overrides?.user_metadata,
    },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: overrides?.email || `user-${id}@test.com`,
    ...overrides,
  } as User;
}

/**
 * Create a mock session for testing
 */
export function createMockSession(overrides?: Partial<Session>): Session {
  return {
    access_token: overrides?.access_token || 'mock-access-token',
    refresh_token: overrides?.refresh_token || 'mock-refresh-token',
    expires_in: overrides?.expires_in || 3600,
    expires_at: overrides?.expires_at || Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: overrides?.user || createMockUser(),
    ...overrides,
  } as Session;
}

// ============================================================================
// Prayer Factories
// ============================================================================

/**
 * Create a mock prayer for testing
 */
export function createMockPrayer(overrides?: Partial<Prayer>): Prayer {
  const id = overrides?.id || generatePrayerId();
  const userId = overrides?.user_id || generateUserId();
  const isAnonymous = overrides?.is_anonymous ?? false;

  return {
    id,
    user_id: userId,
    title: overrides?.title,
    content: overrides?.content || 'Please pray for my family and friends',
    content_type: overrides?.content_type || 'text',
    content_url: overrides?.content_url,
    location: overrides?.location || createMockLocation(),
    user_name: isAnonymous
      ? undefined
      : overrides?.user_name || `User ${userId.slice(-4)}`,
    is_anonymous: isAnonymous,
    status: overrides?.status || 'active',
    created_at: overrides?.created_at || new Date(),
    updated_at: overrides?.updated_at,
    prayedBy: overrides?.prayedBy || [],
  };
}

/**
 * Create a mock text prayer
 */
export function createMockTextPrayer(
  content?: string,
  overrides?: Partial<Prayer>
): Prayer {
  return createMockPrayer({
    content: content || 'Please pray for healing and strength',
    content_type: 'text',
    ...overrides,
  });
}

/**
 * Create a mock audio prayer
 */
export function createMockAudioPrayer(overrides?: Partial<Prayer>): Prayer {
  return createMockPrayer({
    content: 'Audio prayer request',
    content_type: 'audio',
    content_url: overrides?.content_url || 'https://storage.example.com/audio/prayer-1.webm',
    ...overrides,
  });
}

/**
 * Create a mock video prayer
 */
export function createMockVideoPrayer(overrides?: Partial<Prayer>): Prayer {
  return createMockPrayer({
    content: 'Video prayer request',
    content_type: 'video',
    content_url: overrides?.content_url || 'https://storage.example.com/video/prayer-1.webm',
    ...overrides,
  });
}

/**
 * Create multiple mock prayers
 */
export function createMockPrayers(count: number, overrides?: Partial<Prayer>): Prayer[] {
  return Array.from({ length: count }, (_, index) =>
    createMockPrayer({
      ...overrides,
      content: overrides?.content || `Prayer request ${index + 1}`,
    })
  );
}

// ============================================================================
// Prayer Response Factories
// ============================================================================

/**
 * Create a mock prayer response
 */
export function createMockPrayerResponse(
  overrides?: Partial<PrayerResponse>
): PrayerResponse {
  const id = overrides?.id || generateResponseId();
  const responderId = overrides?.responder_id || generateUserId();
  const isAnonymous = overrides?.is_anonymous ?? false;

  return {
    id,
    prayer_id: overrides?.prayer_id || generatePrayerId(),
    responder_id: responderId,
    responder_name: isAnonymous
      ? undefined
      : overrides?.responder_name || `Responder ${responderId.slice(-4)}`,
    is_anonymous: isAnonymous,
    message: overrides?.message || 'Praying for you!',
    content_type: overrides?.content_type || 'text',
    content_url: overrides?.content_url,
    created_at: overrides?.created_at || new Date(),
    read_at: overrides?.read_at,
  };
}

/**
 * Create a mock text response
 */
export function createMockTextResponse(
  message?: string,
  overrides?: Partial<PrayerResponse>
): PrayerResponse {
  return createMockPrayerResponse({
    message: message || 'Praying for you and your situation',
    content_type: 'text',
    ...overrides,
  });
}

/**
 * Create a mock audio response
 */
export function createMockAudioResponse(
  overrides?: Partial<PrayerResponse>
): PrayerResponse {
  return createMockPrayerResponse({
    message: 'Audio prayer response',
    content_type: 'audio',
    content_url: overrides?.content_url || 'https://storage.example.com/audio/response-1.webm',
    ...overrides,
  });
}

/**
 * Create a mock video response
 */
export function createMockVideoResponse(
  overrides?: Partial<PrayerResponse>
): PrayerResponse {
  return createMockPrayerResponse({
    message: 'Video prayer response',
    content_type: 'video',
    content_url: overrides?.content_url || 'https://storage.example.com/video/response-1.webm',
    ...overrides,
  });
}

/**
 * Create multiple mock responses for a prayer
 */
export function createMockResponses(
  prayerId: string,
  count: number,
  overrides?: Partial<PrayerResponse>
): PrayerResponse[] {
  return Array.from({ length: count }, (_, index) =>
    createMockPrayerResponse({
      prayer_id: prayerId,
      message: overrides?.message || `Response ${index + 1}`,
      ...overrides,
    })
  );
}

// ============================================================================
// Prayer Connection Factories
// ============================================================================

/**
 * Create a mock prayer connection
 */
export function createMockPrayerConnection(
  overrides?: Partial<PrayerConnection>
): PrayerConnection {
  const id = overrides?.id || generateConnectionId();
  const createdAt = overrides?.createdAt || new Date();
  const expiresAt = new Date(createdAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Expires in 1 year

  return {
    id,
    prayerId: overrides?.prayerId || generatePrayerId(),
    prayerResponseId: overrides?.prayerResponseId || generateResponseId(),
    fromLocation: overrides?.fromLocation || createMockLocation(),
    toLocation: overrides?.toLocation || createMockLocation(),
    requesterName: overrides?.requesterName || 'Prayer Requester',
    replierName: overrides?.replierName || 'Prayer Warrior',
    createdAt,
    expiresAt: overrides?.expiresAt || expiresAt,
  };
}

/**
 * Create multiple mock connections
 */
export function createMockConnections(
  count: number,
  overrides?: Partial<PrayerConnection>
): PrayerConnection[] {
  return Array.from({ length: count }, () =>
    createMockPrayerConnection(overrides)
  );
}

// ============================================================================
// Scenario Builders
// ============================================================================

/**
 * Create a complete prayer scenario with responses and connections
 */
export function createPrayerScenario(options?: {
  prayer?: Partial<Prayer>;
  responseCount?: number;
  connectionCount?: number;
}) {
  const prayer = createMockPrayer(options?.prayer);
  const responses = createMockResponses(
    prayer.id,
    options?.responseCount || 3
  );
  const connections = createMockConnections(options?.connectionCount || 2, {
    prayerId: prayer.id,
  });

  return {
    prayer,
    responses,
    connections,
  };
}

/**
 * Create an anonymous prayer scenario
 */
export function createAnonymousPrayerScenario() {
  return createPrayerScenario({
    prayer: { is_anonymous: true, user_name: undefined },
  });
}

/**
 * Create a multimedia prayer scenario
 */
export function createMultimediaPrayerScenario() {
  const textPrayer = createMockTextPrayer();
  const audioPrayer = createMockAudioPrayer();
  const videoPrayer = createMockVideoPrayer();

  return {
    textPrayer,
    audioPrayer,
    videoPrayer,
    textResponse: createMockTextResponse(undefined, {
      prayer_id: textPrayer.id,
    }),
    audioResponse: createMockAudioResponse({ prayer_id: audioPrayer.id }),
    videoResponse: createMockVideoResponse({ prayer_id: videoPrayer.id }),
  };
}
