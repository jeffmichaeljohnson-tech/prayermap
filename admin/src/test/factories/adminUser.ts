/**
 * Admin User Mock Factory
 * Generates mock admin user objects for testing
 */

import type { User, Session } from '@supabase/supabase-js'
import type { AdminUser, AdminRole } from '../../types/admin'

let idCounter = 0

export function createMockAuthUser(overrides?: Partial<User>): User {
  idCounter++

  return {
    id: `user-${idCounter}`,
    aud: 'authenticated',
    role: 'authenticated',
    email: `admin${idCounter}@example.com`,
    email_confirmed_at: new Date().toISOString(),
    phone: null,
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as User
}

export function createMockAdminUser(overrides?: Partial<AdminUser>): AdminUser {
  const authUser = createMockAuthUser()

  return {
    id: authUser.id,
    email: authUser.email!,
    role: 'admin' as AdminRole,
    createdAt: authUser.created_at,
    user: authUser,
    ...overrides,
  }
}

export function createMockModeratorUser(overrides?: Partial<AdminUser>): AdminUser {
  return createMockAdminUser({
    role: 'moderator' as AdminRole,
    ...overrides,
  })
}

export function createMockSession(user?: User): Session {
  const sessionUser = user || createMockAuthUser()

  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: sessionUser,
  }
}

export function resetMockUserCounter() {
  idCounter = 0
}
