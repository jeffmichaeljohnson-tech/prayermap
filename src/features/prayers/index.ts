/**
 * Prayers Feature Module
 *
 * Public API - Export only what other features need.
 * See docs/MODULAR-STRUCTURE-POLICY.md
 *
 * MIGRATION STATUS: Complete
 */

// Components
export { PrayerMap } from './components/PrayerMap';
export { PrayerMarker } from './components/PrayerMarker';
export { PrayerDetailModal } from './components/PrayerDetailModal';
export { RequestPrayerModal } from './components/RequestPrayerModal';
export { PrayerConnection } from './components/PrayerConnection';
export { PrayerAnimationLayer } from './components/PrayerAnimationLayer';
export { PrayerCreationAnimation } from './components/PrayerCreationAnimation';

// Hooks
export { usePrayers } from './hooks/usePrayers';
export { usePrayerConnections } from './hooks/usePrayerConnections';

// Services
export {
  fetchNearbyPrayers,
  createPrayer,
  updatePrayer,
  deletePrayer,
  respondToPrayer,
  fetchPrayerResponses,
  fetchUserInbox,
  subscribeToNearbyPrayers,
  subscribeToPrayerResponses,
  subscribeToUserInbox,
  markResponseAsRead,
  markAllResponsesRead,
  getUnreadCount,
  fetchPrayerConnections,
  subscribeToPrayerConnections,
} from './services/prayerService';

// Types
export type { Prayer, PrayerResponse, PrayerConnection as PrayerConnectionType } from './types/prayer';

// Adapters
export { toLegacyPrayer, fromLegacyPrayer, toLegacyPrayers } from './lib/prayerAdapters';
export type { LegacyPrayer } from './lib/prayerAdapters';
