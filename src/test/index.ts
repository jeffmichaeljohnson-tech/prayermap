/**
 * Test utilities and helpers index
 * Central export point for all testing infrastructure
 */

// ============================================================================
// Setup and Configuration
// ============================================================================

// Setup is automatically loaded via vitest.config.ts setupFiles

// ============================================================================
// Mocks
// ============================================================================

export * from './mocks/supabase';
export * from './mocks/mediaRecorder';
export * from './mocks/mediaDevices';
export * from './mocks/framer-motion';

// ============================================================================
// Factories
// ============================================================================

export * from './factories';

// ============================================================================
// Utilities
// ============================================================================

export * from './utils/render';
export * from './utils/async';

// ============================================================================
// MSW
// ============================================================================

export { server, enableRequestLogging, disableRequestLogging } from './msw/server';
export { handlers, authHandlers, databaseHandlers, storageHandlers, mapboxHandlers } from './msw/handlers';
