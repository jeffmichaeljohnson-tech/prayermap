/**
 * Prayer Connection Types
 * For the Prayer Memorial Lines feature - visual connections between prayers and responders
 */

export interface PrayerConnection {
  id: string;
  prayer_id: string;
  from_user_id: string;
  to_user_id: string;
  // Responder location (the source - where prayer originates from)
  from_lat: number;
  from_lng: number;
  // Prayer location (the destination - where prayer is going to)
  to_lat: number;
  to_lng: number;
  // When this connection was created
  created_at: string;
  expires_at: string | null;
}

// Bounding box for spatial queries
export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

// Ethereal color palette from design system
// Full spectrum gradient: Purple → Blue → Green → Yellow → Gold
// Direction: Responder (start/purple) → Prayer destination (end/gold)
export const CONNECTION_COLORS = {
  // Phase 1: Gold light traveling outward (responder → prayer)
  outbound: {
    start: '#F39C12', // Gold
    end: '#F1C40F',   // Yellow
    glow: 'rgba(243, 156, 18, 0.6)',
  },
  // Phase 2: Purple light returning (prayer → responder)
  inbound: {
    start: '#9B59B6', // Purple
    end: '#3498DB',   // Blue
    glow: 'rgba(155, 89, 182, 0.6)',
  },
  // Full spectrum gradient colors (matching web app)
  gradient: {
    purple: '#9B59B6',   // 0% - Start (responder location)
    blue: '#3498DB',     // 25%
    green: '#2ECC71',    // 50%
    yellow: '#F1C40F',   // 75%
    gold: '#F39C12',     // 100% - End (prayer destination)
  },
  // Phase 3: Permanent gradient connection line
  permanent: {
    start: '#9B59B6', // Purple (responder side)
    end: '#F39C12',   // Gold (prayer side)
    glow: 'rgba(155, 89, 182, 0.3)',
  },
  // Dawn blue for accents
  dawnBlue: '#3498DB',
};

// Animation timing constants (from design system)
export const ANIMATION_TIMING = {
  // Total sequence duration
  totalDuration: 6000, // 6 seconds
  // Phase 1: Yellow light travels from responder to prayer (0-2.4s)
  phase1: {
    start: 0,
    end: 2400,
  },
  // Phase 2: Purple light returns from prayer to responder (3.6-5.7s)
  phase2: {
    start: 3600,
    end: 5700,
  },
  // Phase 3: Permanent connection fades in (5.5-6.0s)
  phase3: {
    start: 5500,
    end: 6000,
  },
};
