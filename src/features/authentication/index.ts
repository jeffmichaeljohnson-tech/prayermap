/**
 * Authentication Feature Module
 *
 * Public API - Export only what other features need.
 * See docs/MODULAR-STRUCTURE-POLICY.md
 *
 * MIGRATION STATUS: Complete
 */

// Components
export { AuthModal } from './components/AuthModal';

// Contexts
export { AuthProvider, useAuth } from './contexts/AuthContext';

// Hooks (standalone hook version)
export { useAuth as useAuthHook } from './hooks/useAuth';
