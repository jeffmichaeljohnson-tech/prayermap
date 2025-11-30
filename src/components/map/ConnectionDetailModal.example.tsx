/**
 * ConnectionDetailModal Example Usage
 *
 * Demonstrates how to use the ConnectionDetailModal component
 * to display detailed information about prayer connections.
 */

import { useState } from 'react';
import { ConnectionDetailModal } from './ConnectionDetailModal';
import type { PrayerConnection, Prayer, PrayerResponse } from '../../types/prayer';

export function ConnectionDetailModalExample() {
  const [isOpen, setIsOpen] = useState(true);

  // Example connection data
  const mockConnection: PrayerConnection = {
    id: 'conn-123',
    prayerId: 'prayer-456',
    prayerResponseId: 'response-789',
    fromLocation: {
      lat: 40.7128,
      lng: -74.0060,
    },
    toLocation: {
      lat: 34.0522,
      lng: -118.2437,
    },
    requesterName: 'John Doe',
    replierName: 'Jane Smith',
    createdAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
    expiresAt: new Date(Date.now() + 86400000 * 362), // ~1 year from now
  };

  // Example prayer data
  const mockPrayer: Prayer = {
    id: 'prayer-456',
    user_id: 'user-123',
    title: 'Prayer for healing',
    content: 'Please pray for my family during this difficult time. We need strength and guidance.',
    content_type: 'text',
    location: {
      lat: 40.7128,
      lng: -74.0060,
    },
    user_name: 'John Doe',
    is_anonymous: false,
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 5), // 5 days ago
  };

  // Example response data
  const mockResponse: PrayerResponse = {
    id: 'response-789',
    prayer_id: 'prayer-456',
    responder_id: 'user-456',
    responder_name: 'Jane Smith',
    is_anonymous: false,
    message: 'I am praying for you and your family. May you find peace and strength during this time.',
    content_type: 'text',
    created_at: new Date(Date.now() - 86400000 * 3), // 3 days ago
  };

  // Handler functions
  const handleClose = () => {
    console.log('Modal closed');
    setIsOpen(false);
  };

  const handleViewPrayer = (prayerId: string) => {
    console.log('View prayer:', prayerId);
    // Navigate to prayer detail page or open prayer detail modal
  };

  const handleViewResponse = (responseId: string) => {
    console.log('View response:', responseId);
    // Navigate to response detail or open response viewer
  };

  const handleAddPrayer = (prayerId: string) => {
    console.log('Add your prayer to:', prayerId);
    // Open prayer submission modal or navigate to prayer form
  };

  const handleShare = () => {
    console.log('Share connection');
    // Implement custom share logic (social media, copy link, etc.)
    const shareUrl = `${window.location.origin}/connection/${mockConnection.id}`;

    // Try native share API if available
    if (navigator.share) {
      navigator.share({
        title: 'Prayer Connection',
        text: `${mockConnection.replierName} prayed for ${mockConnection.requesterName}`,
        url: shareUrl,
      }).catch((err) => console.log('Share cancelled or failed:', err));
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Connection link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Connection Detail Modal Example</h1>
        <button
          onClick={() => setIsOpen(true)}
          className="px-6 py-3 bg-gradient-to-r from-prayer-purple to-primary-blue text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Open Connection Detail
        </button>
      </div>

      <ConnectionDetailModal
        connection={mockConnection}
        prayer={mockPrayer}
        response={mockResponse}
        isOpen={isOpen}
        onClose={handleClose}
        onViewPrayer={handleViewPrayer}
        onViewResponse={handleViewResponse}
        onAddPrayer={handleAddPrayer}
        onShare={handleShare}
      />
    </div>
  );
}

/**
 * USAGE NOTES:
 *
 * 1. Basic Usage (minimal props):
 * ```tsx
 * <ConnectionDetailModal
 *   connection={connection}
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onViewPrayer={handleViewPrayer}
 * />
 * ```
 *
 * 2. With Full Data (recommended):
 * ```tsx
 * <ConnectionDetailModal
 *   connection={connection}
 *   prayer={prayer}         // Provides prayer content preview
 *   response={response}     // Provides response content preview
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onViewPrayer={handleViewPrayer}
 *   onViewResponse={handleViewResponse}
 *   onAddPrayer={handleAddPrayer}
 *   onShare={handleShare}
 * />
 * ```
 *
 * 3. Mobile Gestures:
 * - Swipe down to dismiss (mobile only)
 * - Tap backdrop to close
 * - Click X button to close
 *
 * 4. Visual Features:
 * - Rainbow gradient header matching memorial line colors
 * - Glassmorphic design
 * - Smooth animations
 * - Responsive layout (full-screen mobile, card on desktop)
 *
 * 5. Accessibility:
 * - Proper ARIA labels
 * - Keyboard navigation support
 * - Screen reader friendly
 * - Respects prefers-reduced-motion
 *
 * 6. Data Requirements:
 * - connection: Required - contains IDs, locations, names, dates
 * - prayer: Optional - enhances preview with actual content
 * - response: Optional - shows response preview if available
 *
 * 7. Location Labels:
 * - Currently shows formatted coordinates
 * - TODO: Implement reverse geocoding for city names
 * - Format: "40.71°N, 74.01°W" or "New York, NY" (when geocoding added)
 */
