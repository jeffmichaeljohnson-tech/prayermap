# PrayerMap Type Definitions

Core TypeScript interfaces used throughout the application.

## Prayer Types

### Prayer
```typescript
interface Prayer {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  content_url?: string;           // Media URL for audio/video
  location: {
    lat: number;
    lng: number;
  };
  user_name?: string;             // Display name (null if anonymous)
  is_anonymous: boolean;
  status?: 'pending' | 'approved' | 'active' | 'hidden' | 'removed';
  created_at: Date;
  updated_at?: Date;
  prayedBy?: string[];            // Client-side tracking only
}
```

### PrayerResponse
```typescript
interface PrayerResponse {
  id: string;
  prayer_id: string;
  responder_id: string;
  responder_name?: string;        // Null if anonymous
  is_anonymous: boolean;
  message: string;
  content_type: 'text' | 'audio' | 'video';
  content_url?: string;
  created_at: Date;
  read_at?: Date | null;          // For inbox tracking
}
```

### PrayerConnection
```typescript
interface PrayerConnection {
  id: string;
  prayerId: string;
  prayerResponseId?: string;
  fromLocation: {                 // Prayer creator location
    lat: number;
    lng: number;
  };
  toLocation: {                   // Responder location
    lat: number;
    lng: number;
  };
  requesterName: string;
  replierName: string;
  createdAt: Date;
  expiresAt: Date;               // 1 year from creation
}
```

## User Types

### Profile
```typescript
interface Profile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}
```

## Input Types

### CreatePrayerInput
```typescript
interface CreatePrayerInput {
  userId: string;
  title?: string;
  content: string;
  contentType: 'text' | 'audio' | 'video';
  mediaUrl?: string;
  location: {
    lat: number;
    lng: number;
  };
  isAnonymous: boolean;
}
```

## Location Type

**Always use this format:**
```typescript
interface Location {
  lat: number;
  lng: number;
}
```

## Content Types

```typescript
type ContentType = 'text' | 'audio' | 'video';
type PrayerStatus = 'pending' | 'approved' | 'active' | 'hidden' | 'removed';
```

## Database ↔ Frontend Mapping

| Database (snake_case) | Frontend (camelCase) |
|-----------------------|----------------------|
| `user_id` | `userId` |
| `content_type` | `contentType` |
| `media_url` | `contentUrl` |
| `is_anonymous` | `isAnonymous` |
| `created_at` | `createdAt` |
| `prayer_id` | `prayerId` |

## PostGIS Location Handling

### Conversion Function
```typescript
function parseLocation(point: any): { lat: number; lng: number } | null {
  if (!point) return null;
  if (point.coordinates) {
    return {
      lat: point.coordinates[1],  // latitude is second
      lng: point.coordinates[0],  // longitude is first
    };
  }
  return null;
}
```
