/**
 * Admin Hooks
 * Central export for all admin dashboard hooks
 */

export { useAdminAuth } from './useAuth'
export { usePrayers, usePrayer, useUpdatePrayer, useDeletePrayer } from './usePrayers'
export { useUsers, useUser, useUpdateUser, useDeleteUser } from './useUsers'
export { useStats } from './useStats'
export { useAuditLogs } from './useAuditLogs'
export {
  useModerationQueue,
  useModeratePrayer,
  useBanUser,
  useUnbanUser,
  useUserBanStatus,
  useActiveBans,
  useFlagPrayer,
} from './useModeration'
export { useSearch } from './useSearch'

export type { AdminPrayer } from './usePrayers'
export type { AdminUser } from './useUsers'
export type { AdminStats } from './useStats'
export type { AuditLog } from './useAuditLogs'
export type { ModerationPrayer, UserBan, UserBanStatus } from './useModeration'
export type { SearchResult } from './useSearch'
