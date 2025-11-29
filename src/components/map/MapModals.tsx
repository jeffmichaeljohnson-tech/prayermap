/**
 * MapModals - Lazy-loaded modal components for PrayerMap
 *
 * Handles:
 * - Prayer detail modal
 * - Inbox modal
 * - Request prayer modal
 * - Info modal
 *
 * All modals are lazy-loaded to reduce initial bundle size.
 */

import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Prayer } from '../../types/prayer';
import type { PrayerReplyData } from '../PrayerDetailModal';

// CODE SPLITTING: Lazy-load modals
const PrayerDetailModal = lazy(() =>
  import('../PrayerDetailModal').then(m => ({ default: m.PrayerDetailModal }))
);
const RequestPrayerModal = lazy(() =>
  import('../RequestPrayerModal').then(m => ({ default: m.RequestPrayerModal }))
);
const InboxModal = lazy(() =>
  import('../InboxModal').then(m => ({ default: m.InboxModal }))
);
const InfoModal = lazy(() =>
  import('../InfoModal').then(m => ({ default: m.InfoModal }))
);

// Loading component
const ModalLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm" style={{ zIndex: 50 }}>
    <div className="glass-strong p-6 rounded-2xl animate-pulse">
      <div className="text-gray-700">Loading...</div>
    </div>
  </div>
);

export interface MapModalsProps {
  // Prayer detail modal
  selectedPrayer: Prayer | null;
  onClosePrayerDetail: () => void;
  onPray: (prayer: Prayer, replyData?: PrayerReplyData) => void;
  userLocation: { lat: number; lng: number };

  // Inbox modal
  showInbox: boolean;
  onCloseInbox: () => void;

  // Request prayer modal
  showRequestModal: boolean;
  onCloseRequestModal: () => void;
  onSubmitPrayer: (newPrayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>) => void;

  // Info modal
  showInfo: boolean;
  onCloseInfo: () => void;
}

/**
 * MapModals component
 *
 * Renders all modals with lazy loading and proper AnimatePresence handling.
 */
export function MapModals({
  selectedPrayer,
  onClosePrayerDetail,
  onPray,
  userLocation,
  showInbox,
  onCloseInbox,
  showRequestModal,
  onCloseRequestModal,
  onSubmitPrayer,
  showInfo,
  onCloseInfo,
}: MapModalsProps) {
  return (
    <>
      {/* Prayer Detail Modal */}
      <AnimatePresence>
        {selectedPrayer && (
          <Suspense fallback={<ModalLoader />}>
            <PrayerDetailModal
              prayer={selectedPrayer}
              userLocation={userLocation}
              onClose={onClosePrayerDetail}
              onPray={onPray}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Inbox Modal */}
      <AnimatePresence>
        {showInbox && (
          <Suspense fallback={<ModalLoader />}>
            <InboxModal onClose={onCloseInbox} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Request Prayer Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <Suspense fallback={<ModalLoader />}>
            <RequestPrayerModal
              userLocation={userLocation}
              onClose={onCloseRequestModal}
              onSubmit={onSubmitPrayer}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <Suspense fallback={<ModalLoader />}>
            <InfoModal onClose={onCloseInfo} />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
}
