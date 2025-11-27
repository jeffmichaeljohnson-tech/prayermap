export interface Prayer {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  content_url?: string; // For audio/video storage URLs
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
  read_at?: Date | null; // When the response was marked as read
}

export interface PrayerConnection {
  id: string;
  prayerId: string;
  prayerResponseId?: string; // Links to the prayer_response that created this connection
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