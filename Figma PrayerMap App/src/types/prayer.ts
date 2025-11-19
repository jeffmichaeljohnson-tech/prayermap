export interface Prayer {
  id: string;
  title?: string;
  content: string;
  contentType: 'text' | 'audio' | 'video';
  location: {
    lat: number;
    lng: number;
  };
  userName?: string;
  isAnonymous: boolean;
  createdAt: Date;
  prayedBy?: string[];
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