# ðŸ™ PrayerMap REST API Specification v2.0

**Base URL**: `https://api.prayermap.app` (or your Supabase project URL)

**Authentication**: JWT Bearer tokens via Supabase Auth

**Response Format**: JSON

**Date Format**: ISO 8601 (e.g., `2025-01-15T14:30:00Z`)

---

## ðŸ“‹ Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Prayers](#prayers)
4. [Prayer Responses](#prayer-responses)
5. [Prayer Support](#prayer-support)
6. [Notifications](#notifications)
7. [Media Upload](#media-upload)
8. [Error Handling](#error-handling)

---

## ðŸ” Authentication

### Register New User

```http
POST /auth/v1/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "data": {
    "first_name": "John"
  }
}
```

**Response** (201 Created):
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "created_at": "2025-01-15T14:30:00Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJI...",
    "refresh_token": "v1.refresh-token...",
    "expires_in": 3600,
    "token_type": "bearer"
  }
}
```

### Login

```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJI...",
  "refresh_token": "v1.refresh-token...",
  "expires_in": 3600,
  "token_type": "bearer"
}
```

### Refresh Token

```http
POST /auth/v1/token?grant_type=refresh_token
Content-Type: application/json

{
  "refresh_token": "v1.refresh-token..."
}
```

### Get Current User

```http
GET /auth/v1/user
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "created_at": "2025-01-15T14:30:00Z",
  "user_metadata": {
    "first_name": "John"
  }
}
```

---

## ðŸ‘¤ Users

### Get User Profile

```http
GET /rest/v1/users?user_id=eq.{user_id}
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "user_id": "uuid-here",
  "email": "user@example.com",
  "first_name": "John",
  "notification_radius_km": 15,
  "last_known_location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "last_location_update": "2025-01-15T14:30:00Z",
  "created_at": "2025-01-15T14:00:00Z",
  "updated_at": "2025-01-15T14:30:00Z",
  "is_profile_public": false,
  "total_prayers_sent": 42,
  "total_prayers_received": 7
}
```

### Update User Profile

```http
PATCH /rest/v1/users?user_id=eq.{user_id}
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=representation

{
  "first_name": "Jonathan",
  "notification_radius_km": 25,
  "is_profile_public": true
}
```

**Response** (200 OK):
```json
{
  "user_id": "uuid-here",
  "first_name": "Jonathan",
  "notification_radius_km": 25,
  "is_profile_public": true,
  "updated_at": "2025-01-15T15:00:00Z"
}
```

### Update User Location

```http
PATCH /rest/v1/users?user_id=eq.{user_id}
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=minimal

{
  "last_known_location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "last_location_update": "2025-01-15T15:30:00Z"
}
```

**Response** (204 No Content)

---

## ðŸ™ Prayers

### Get Prayers Within Radius

**Option 1: Using PostGIS Function (Recommended)**

```http
POST /rest/v1/rpc/get_prayers_within_radius
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "user_lat": 37.7749,
  "user_lng": -122.4194,
  "radius_km": 15,
  "limit_count": 50,
  "offset_count": 0
}
```

**Response** (200 OK):
```json
[
  {
    "prayer_id": 12345,
    "user_id": "uuid-here",
    "title": "Healing for my mother",
    "text_body": "Please pray for my mother who is recovering from surgery...",
    "media_type": "TEXT",
    "media_url": null,
    "is_anonymous": false,
    "poster_name": "Sarah",
    "distance_km": 2.3,
    "support_count": 8,
    "response_count": 3,
    "created_at": "2025-01-15T14:00:00Z"
  },
  {
    "prayer_id": 12346,
    "title": null,
    "text_body": "Praying for strength during this difficult season",
    "media_type": "AUDIO",
    "media_url": "https://storage.supabase.co/prayers/audio-uuid.m4a",
    "is_anonymous": true,
    "poster_name": "Anonymous",
    "distance_km": 5.7,
    "support_count": 12,
    "response_count": 5,
    "created_at": "2025-01-15T13:30:00Z"
  }
]
```

**Option 2: Direct Query with Filters**

```http
GET /rest/v1/prayers?status=eq.ACTIVE&order=created_at.desc&limit=50
Authorization: Bearer {access_token}
```

### Get Single Prayer

```http
GET /rest/v1/prayers?prayer_id=eq.{prayer_id}
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "prayer_id": 12345,
  "user_id": "uuid-here",
  "title": "Healing for my mother",
  "text_body": "Please pray for my mother who is recovering...",
  "media_type": "TEXT",
  "media_url": null,
  "media_duration_seconds": null,
  "is_anonymous": false,
  "location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "city_region": "San Francisco, CA",
  "status": "ACTIVE",
  "support_count": 8,
  "response_count": 3,
  "view_count": 45,
  "is_answered": false,
  "answered_at": null,
  "created_at": "2025-01-15T14:00:00Z",
  "updated_at": "2025-01-15T14:00:00Z"
}
```

### Create Prayer (Text)

```http
POST /rest/v1/prayers
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=representation

{
  "title": "Healing for my mother",
  "text_body": "Please pray for my mother who is recovering from surgery. She's been struggling with pain and could use encouragement.",
  "media_type": "TEXT",
  "is_anonymous": false,
  "location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "city_region": "San Francisco, CA"
}
```

**Response** (201 Created):
```json
{
  "prayer_id": 12347,
  "user_id": "uuid-here",
  "title": "Healing for my mother",
  "text_body": "Please pray for my mother...",
  "media_type": "TEXT",
  "media_url": null,
  "is_anonymous": false,
  "location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "city_region": "San Francisco, CA",
  "status": "ACTIVE",
  "support_count": 0,
  "response_count": 0,
  "view_count": 0,
  "created_at": "2025-01-15T15:00:00Z"
}
```

### Create Prayer (Audio/Video)

**Step 1: Upload media file (see Media Upload section)**

**Step 2: Create prayer with media URL**

```http
POST /rest/v1/prayers
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=representation

{
  "text_body": "A prayer for peace in my community",
  "media_type": "AUDIO",
  "media_url": "prayers/audio-uuid.m4a",
  "media_duration_seconds": 87,
  "is_anonymous": false,
  "location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "city_region": "San Francisco, CA"
}
```

### Update Prayer

```http
PATCH /rest/v1/prayers?prayer_id=eq.{prayer_id}
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=representation

{
  "title": "Updated title",
  "text_body": "Updated prayer text"
}
```

### Delete Prayer

```http
DELETE /rest/v1/prayers?prayer_id=eq.{prayer_id}
Authorization: Bearer {access_token}
```

**Response** (204 No Content)

### Increment Prayer View Count

```http
POST /rest/v1/rpc/increment_prayer_view
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "p_prayer_id": 12345
}
```

---

## ðŸ’¬ Prayer Responses

### Get Responses for Prayer

```http
GET /rest/v1/prayer_responses?prayer_id=eq.{prayer_id}&order=created_at.asc
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
[
  {
    "response_id": 5001,
    "prayer_id": 12345,
    "user_id": "uuid-here",
    "text_body": "Praying for healing and comfort for your mother!",
    "media_type": "TEXT",
    "media_url": null,
    "is_anonymous": false,
    "created_at": "2025-01-15T14:15:00Z"
  },
  {
    "response_id": 5002,
    "prayer_id": 12345,
    "text_body": "Sending strength",
    "media_type": "AUDIO",
    "media_url": "responses/audio-uuid.m4a",
    "media_duration_seconds": 45,
    "is_anonymous": true,
    "created_at": "2025-01-15T14:30:00Z"
  }
]
```

### Create Response (Text)

```http
POST /rest/v1/prayer_responses
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=representation

{
  "prayer_id": 12345,
  "text_body": "Praying for your mother's complete healing!",
  "media_type": "TEXT",
  "is_anonymous": false
}
```

**Response** (201 Created):
```json
{
  "response_id": 5003,
  "prayer_id": 12345,
  "user_id": "uuid-here",
  "text_body": "Praying for your mother's complete healing!",
  "media_type": "TEXT",
  "media_url": null,
  "is_anonymous": false,
  "created_at": "2025-01-15T15:00:00Z"
}
```

### Create Response (Audio/Video)

**Step 1: Upload media**
**Step 2: Create response**

```http
POST /rest/v1/prayer_responses
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=representation

{
  "prayer_id": 12345,
  "media_type": "AUDIO",
  "media_url": "responses/audio-uuid.m4a",
  "media_duration_seconds": 32,
  "is_anonymous": false
}
```

### Delete Response

```http
DELETE /rest/v1/prayer_responses?response_id=eq.{response_id}
Authorization: Bearer {access_token}
```

**Response** (204 No Content)

---

## âœ¨ Prayer Support

### Add Prayer Support ("Pray First. Then Press.")

```http
POST /rest/v1/prayer_support
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=representation

{
  "prayer_id": 12345
}
```

**Response** (201 Created):
```json
{
  "support_id": 8001,
  "prayer_id": 12345,
  "user_id": "uuid-here",
  "created_at": "2025-01-15T15:00:00Z"
}
```

**Note**: Due to UNIQUE constraint, sending support for the same prayer twice returns 409 Conflict.

### Check if User Sent Support

```http
GET /rest/v1/prayer_support?prayer_id=eq.{prayer_id}&user_id=eq.{user_id}
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
[
  {
    "support_id": 8001,
    "prayer_id": 12345,
    "user_id": "uuid-here",
    "created_at": "2025-01-15T15:00:00Z"
  }
]
```

If empty array `[]`, user hasn't sent support yet.

### Remove Prayer Support

```http
DELETE /rest/v1/prayer_support?prayer_id=eq.{prayer_id}&user_id=eq.{user_id}
Authorization: Bearer {access_token}
```

**Response** (204 No Content)

---

## ðŸ”” Notifications

### Get User Notifications

```http
GET /rest/v1/notifications?user_id=eq.{user_id}&order=created_at.desc&limit=20
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
[
  {
    "notification_id": 9001,
    "user_id": "uuid-here",
    "type": "PRAYER_SUPPORT_RECEIVED",
    "payload": {
      "prayer_id": 12345,
      "prayer_title": "Healing for my mother",
      "supporter_name": "Michael"
    },
    "is_read": false,
    "read_at": null,
    "created_at": "2025-01-15T15:30:00Z"
  },
  {
    "notification_id": 9002,
    "type": "NEW_RESPONSE_RECEIVED",
    "payload": {
      "prayer_id": 12345,
      "response_id": 5003,
      "responder_name": "Sarah"
    },
    "is_read": true,
    "read_at": "2025-01-15T15:45:00Z",
    "created_at": "2025-01-15T15:00:00Z"
  },
  {
    "notification_id": 9003,
    "type": "NEW_PRAYER_NEARBY",
    "payload": {
      "prayer_id": 12348,
      "distance_km": 3.2,
      "prayer_snippet": "Praying for wisdom in a difficult decision..."
    },
    "is_read": false,
    "read_at": null,
    "created_at": "2025-01-15T14:45:00Z"
  }
]
```

### Get Unread Notification Count

```http
GET /rest/v1/notifications?user_id=eq.{user_id}&is_read=eq.false&select=count
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "count": 5
}
```

### Mark Notification as Read

```http
PATCH /rest/v1/notifications?notification_id=eq.{notification_id}
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=minimal

{
  "is_read": true,
  "read_at": "2025-01-15T16:00:00Z"
}
```

**Response** (204 No Content)

### Mark All Notifications as Read

```http
PATCH /rest/v1/notifications?user_id=eq.{user_id}&is_read=eq.false
Authorization: Bearer {access_token}
Content-Type: application/json
Prefer: return=minimal

{
  "is_read": true,
  "read_at": "2025-01-15T16:00:00Z"
}
```

**Response** (204 No Content)

---

## ðŸ“¤ Media Upload

### Upload Audio/Video to Supabase Storage

**Step 1: Get upload URL**

```http
POST /storage/v1/object/prayers/{file-name}
Authorization: Bearer {access_token}
Content-Type: audio/mp4 (or video/mp4)
Body: [binary file data]
```

**Response** (200 OK):
```json
{
  "Key": "prayers/audio-uuid-123.m4a",
  "Id": "uuid-here"
}
```

**Step 2: Construct public URL**

Format: `https://{project-ref}.supabase.co/storage/v1/object/public/prayers/{file-name}`

Example: `https://abc123.supabase.co/storage/v1/object/public/prayers/audio-uuid-123.m4a`

### Storage Buckets

- **`prayers`**: Audio/video for prayer requests
- **`responses`**: Audio/video for responses
- **`avatars`**: User profile pictures (future)

### File Naming Convention

Format: `{user_id}_{timestamp}_{random}.{ext}`

Example: `uuid-123_1705334400_r4nd0m.m4a`

### File Size Limits

- **Audio**: Max 10MB (2 minutes at 128kbps)
- **Video**: Max 25MB (30 seconds at standard quality)

### Accepted Formats

- **Audio**: `.m4a`, `.mp3`, `.wav`, `.aac`
- **Video**: `.mp4`, `.mov`, `.m4v`

---

## âŒ Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context",
    "code": "ERROR_CODE"
  },
  "timestamp": "2025-01-15T16:00:00Z",
  "path": "/rest/v1/prayers"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE, PATCH with no return |
| 400 | Bad Request | Invalid request body, missing fields |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Valid token, but no permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., already sent support) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Examples

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "code": 401
}
```

**422 Validation Error**
```json
{
  "error": "ValidationError",
  "message": "Prayer text must be at least 10 characters",
  "details": {
    "field": "text_body",
    "value_length": 5,
    "min_length": 10
  },
  "code": 422
}
```

**409 Conflict**
```json
{
  "error": "Conflict",
  "message": "You have already sent support for this prayer",
  "details": {
    "prayer_id": 12345,
    "existing_support_id": 8001
  },
  "code": 409
}
```

---

## ðŸ” Query Parameters Reference

### Pagination

- `limit`: Number of results (default: 50, max: 100)
- `offset`: Skip N results (for pagination)

### Ordering

- `order`: Sort field and direction
  - Example: `order=created_at.desc`
  - Example: `order=support_count.desc,created_at.desc` (multi-sort)

### Filtering

- `field=eq.value`: Exact match
- `field=neq.value`: Not equal
- `field=gt.value`: Greater than
- `field=gte.value`: Greater than or equal
- `field=lt.value`: Less than
- `field=lte.value`: Less than or equal
- `field=like.*value*`: Pattern match
- `field=ilike.*value*`: Case-insensitive pattern match
- `field=in.(val1,val2)`: In list

### Selection

- `select`: Specify fields to return
  - Example: `select=prayer_id,title,created_at`
  - Example: `select=*,users(first_name)` (join)

---

## ðŸ“Š Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth (signup/login) | 5 requests | 1 minute |
| GET requests | 100 requests | 1 minute |
| POST/PATCH/DELETE | 30 requests | 1 minute |
| Media uploads | 10 uploads | 1 minute |

---

## ðŸ”’ Security Notes

1. **HTTPS only**: All requests must use HTTPS
2. **JWT expiration**: Access tokens expire in 1 hour, use refresh tokens
3. **RLS enforcement**: Row-level security prevents unauthorized data access
4. **Rate limiting**: Protects against abuse
5. **Input validation**: All inputs validated on server-side
6. **CORS**: Configured for web and mobile origins

---

## ðŸŽ¯ Best Practices

1. **Use batch queries** when fetching multiple resources
2. **Cache static data** (e.g., user profile) on client
3. **Implement exponential backoff** for retries
4. **Validate locally** before sending to server
5. **Handle offline gracefully** (queue actions)
6. **Use WebSocket subscriptions** for real-time updates (prayers, notifications)

---

## ðŸ“ Example Client Implementation

```typescript
// TypeScript/React example

const API_BASE = 'https://your-project.supabase.co';
const supabase = createClient(API_BASE, API_KEY);

// Get prayers within radius
async function getPrayersNearby(lat: number, lng: number, radius: number) {
  const { data, error } = await supabase
    .rpc('get_prayers_within_radius', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radius,
      limit_count: 50,
      offset_count: 0
    });
  
  if (error) throw error;
  return data;
}

// Create prayer
async function createPrayer(prayer: CreatePrayerDto) {
  const { data, error } = await supabase
    .from('prayers')
    .insert(prayer)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Send prayer support
async function sendPrayerSupport(prayerId: number) {
  const { data, error } = await supabase
    .from('prayer_support')
    .insert({ prayer_id: prayerId })
    .select()
    .single();
  
  if (error) {
    if (error.code === '23505') { // Duplicate key
      throw new Error('You already sent support for this prayer');
    }
    throw error;
  }
  return data;
}

// Subscribe to new prayers nearby
function subscribeToNearbyPrayers(callback: (prayer: Prayer) => void) {
  return supabase
    .channel('prayers')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'prayers' },
      (payload) => callback(payload.new as Prayer)
    )
    .subscribe();
}
```

---

## ðŸš€ Quick Start Checklist

- [ ] Set up Supabase project
- [ ] Run schema migration
- [ ] Configure storage buckets
- [ ] Set up authentication
- [ ] Test API endpoints
- [ ] Implement error handling
- [ ] Add rate limiting
- [ ] Configure CORS
- [ ] Set up monitoring

---

**API Version**: 2.0  
**Last Updated**: January 2025  
**Maintained By**: PrayerMap Engineering Team
