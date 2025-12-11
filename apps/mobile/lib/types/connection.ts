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
export const CONNECTION_COLORS = {
  // Phase 1: Yellow/Gold light traveling outward (responder → prayer)
  outbound: {
    start: '#FCC114', // amber-300 / Soft Gold
    end: '#FBBF24',   // amber-400
    glow: 'rgba(252, 193, 20, 0.6)',
  },
  // Phase 2: Purple light returning (prayer → responder)
  inbound: {
    start: '#C399F2', // purple-400 / Gentle Purple
    end: '#A78BFA',   // violet-400
    glow: 'rgba(195, 153, 242, 0.6)',
  },
  // Phase 3: Permanent gradient connection line
  permanent: {
    start: '#FCC114', // Gold (responder side)
    end: '#C399F2',   // Purple (prayer side)
    glow: 'rgba(195, 153, 242, 0.3)',
  },
  // Dawn blue for accents
  dawnBlue: '#61C2F7',
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
