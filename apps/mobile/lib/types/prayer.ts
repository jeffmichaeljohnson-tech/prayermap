export type PrayerCategory =
  | 'pray_for'
  | 'prayer_request'
  | 'gratitude'
  // Legacy categories (for existing data)
  | 'health'
  | 'family'
  | 'work'
  | 'relationships'
  | 'spiritual'
  | 'financial'
  | 'guidance'
  | 'other';

export type PrayerStatus = 'active' | 'hidden' | 'removed' | 'pending_review';

export type ContentType = 'text' | 'audio' | 'video';

// Text overlay for video prayers (TikTok-style text on video)
export interface TextOverlay {
  id: string;
  text: string;
  x: number; // 0-1 relative position
  y: number; // 0-1 relative position
  scale: number;
  rotation: number; // degrees
  color: string;
  fontStyle: 'default' | 'bold' | 'serif' | 'script';
}

export interface Prayer {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  content_type: ContentType;
  media_url: string | null;
  media_duration: number | null; // Duration in seconds for audio/video
  text_overlays: TextOverlay[] | null; // TikTok-style text overlays for video prayers
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  is_anonymous: boolean;
  user_name: string | null;
  category: PrayerCategory;
  status: PrayerStatus;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  // Computed fields
  response_count?: number;
  distance_km?: number;
}

// Category colors matching the ethereal design
export const CATEGORY_COLORS: Record<PrayerCategory, string> = {
  pray_for: '#93C5FD',     // blue-300 - praying for others
  prayer_request: '#C4B5FD', // purple-300 - requesting prayer
  gratitude: '#FDE68A',    // amber-200 - thankfulness
  // Legacy categories
  health: '#FCA5A5',      // red-300
  family: '#FDA4AF',      // pink-300
  work: '#FCD34D',        // amber-300
  relationships: '#F9A8D4', // pink-300
  spiritual: '#C4B5FD',   // purple-300
  financial: '#86EFAC',   // green-300
  guidance: '#A78BFA',    // violet-400
  other: '#FEF08A',       // yellow-200
};

// Glow colors for markers (30% opacity versions)
export const CATEGORY_GLOW_COLORS: Record<PrayerCategory, string> = {
  pray_for: 'rgba(147, 197, 253, 0.3)',     // blue glow
  prayer_request: 'rgba(196, 181, 253, 0.3)', // purple glow
  gratitude: 'rgba(253, 230, 138, 0.3)',     // amber glow
  // Legacy categories
  health: 'rgba(252, 165, 165, 0.3)',
  family: 'rgba(253, 164, 175, 0.3)',
  work: 'rgba(252, 211, 77, 0.3)',
  relationships: 'rgba(249, 168, 212, 0.3)',
  spiritual: 'rgba(196, 181, 253, 0.3)',
  financial: 'rgba(134, 239, 172, 0.3)',
  guidance: 'rgba(167, 139, 250, 0.3)',
  other: 'rgba(254, 240, 138, 0.3)',
};

// Category emojis
export const CATEGORY_EMOJIS: Record<PrayerCategory, string> = {
  pray_for: '🙏',         // Praying for someone/something
  prayer_request: '💙',   // Requesting prayer
  gratitude: '💛',        // Thankfulness
  // Legacy categories
  health: '💚',
  family: '👨‍👩‍👧‍👦',
  work: '💼',
  relationships: '💕',
  spiritual: '🙏',
  financial: '💰',
  guidance: '🧭',
  other: '🙏',
};

// Human-readable category labels
export const CATEGORY_LABELS: Record<PrayerCategory, string> = {
  pray_for: 'Pray For',
  prayer_request: 'Prayer Request',
  gratitude: 'Gratitude',
  // Legacy categories
  health: 'Health',
  family: 'Family',
  work: 'Work',
  relationships: 'Relationships',
  spiritual: 'Spiritual',
  financial: 'Financial',
  guidance: 'Guidance',
  other: 'Other',
};
