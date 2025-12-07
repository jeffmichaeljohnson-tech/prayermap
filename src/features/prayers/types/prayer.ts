// Prayer Categories - used for organizing and filtering prayers
export const PRAYER_CATEGORIES = [
  { id: 'request', label: 'Request', emoji: '🙏', color: 'purple' },
  { id: 'gratitude', label: 'Gratitude', emoji: '💛', color: 'yellow' },
] as const;

export type PrayerCategory = typeof PRAYER_CATEGORIES[number]['id'];

export interface Prayer {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  content_url?: string; // For audio/video storage URLs
  category?: PrayerCategory; // Prayer category for organization
  location: {
    lat: number;
    lng: number;
  };
  user_name?: string;
  is_anonymous: boolean;
  created_at: Date;
  updated_at?: Date;
  // Client-side only fields (not in DB)
  prayedBy?: string[];
}

export interface PrayerResponse {
  id: string;
  prayer_id: string;
  responder_id: string;
  responder_name?: string;
  is_anonymous: boolean;
  message: string;
  content_type: 'text' | 'audio' | 'video';
  content_url?: string;
  created_at: Date;
}

export interface PrayerConnection {
  id: string;
  prayerId: string;
  fromLocation: {
    lat: number;
    lng: number;
  };
  toLocation: {
    lat: number;
    lng: number;
  };
  requesterName: string; // Person who requested prayer
  replierName: string; // Person who prayed
  createdAt: Date;
  expiresAt: Date; // One year from creation
}