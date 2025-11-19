# ðŸ”Œ PrayerMap REST API Specification v2.0

**Complete API Documentation with AWS S3 Integration**

---

## ðŸ“‹ Document Information

- **Version**: 2.0
- **Last Updated**: November 2025
- **Base URL**: `https://<your-project>.supabase.co`
- **Authentication**: JWT Bearer Token
- **Data Format**: JSON
- **NEW**: AWS S3 Presigned URL Upload Flow

---

## ðŸ” Authentication

### Overview

PrayerMap uses **JWT-based authentication** provided by Supabase Auth.

**Auth Flow**:
1. User signs up â†’ Receives access token + refresh token
2. Access token expires in 1 hour
3. Refresh token valid for 30 days
4. Client refreshes access token before expiration

**Authorization Header**:
```
Authorization: Bearer <access_token>
```

---

### Endpoints

#### 1. Sign Up

**POST** `/auth/v1/signup`

Create a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "data": {
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "xyz123...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

**Errors**:
- `400`: Email already registered
- `422`: Invalid email format or weak password

---

#### 2. Sign In

**POST** `/auth/v1/token?grant_type=password`

Authenticate existing user.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "xyz123...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  }
}
```

**Errors**:
- `400`: Invalid credentials
- `429`: Too many attempts (rate limited)

---

#### 3. Refresh Token

**POST** `/auth/v1/token?grant_type=refresh_token`

Get new access token using refresh token.

**Request Body**:
```json
{
  "refresh_token": "xyz123..."
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "abc456..."
}
```

**Errors**:
- `401`: Invalid or expired refresh token

---

#### 4. Sign Out

**POST** `/auth/v1/logout`

Invalidate current session.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (204 No Content)

---

## ðŸ—ºï¸ Prayer Endpoints

### 1. Get Prayers Within Radius

**POST** `/rest/v1/rpc/get_prayers_within_radius`

Fetch all active prayers within a specified radius of a location.

**Request Body**:
```json
{
  "lat": 41.8781,
  "lng": -87.6298,
  "radius_km": 30
}
```

**Response** (200 OK):
```json
[
  {
    "prayer_id": 123,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Please pray for us",
    "text_body": "We just got evicted and don't know where to go...",
    "media_type": "TEXT",
    "media_url": null,
    "is_anonymous": false,
    "city_region": "Near Downtown Chicago",
    "support_count": 12,
    "response_count": 3,
    "distance_km": 2.34,
    "created_at": "2025-01-15T10:30:00Z",
    "poster_first_name": "Sarah",
    "poster_is_public": true
  },
  {
    "prayer_id": 124,
    "title": null,
    "text_body": "Lost my job yesterday. Scared about providing for my family.",
    "media_type": "AUDIO",
    "media_url": "https://cdn.prayermap.net/audio/abc123.mp3",
    "media_duration_seconds": 90,
    "is_anonymous": true,
    "city_region": "Near Suburbs",
    "support_count": 8,
    "response_count": 0,
    "distance_km": 5.12,
    "created_at": "2025-01-15T09:45:00Z",
    "poster_first_name": null,
    "poster_is_public": false
  }
]
```

**Query Parameters**:
- `lat` (required): Latitude (e.g., 41.8781)
- `lng` (required): Longitude (e.g., -87.6298)
- `radius_km` (optional): Radius in kilometers (default: 30, max: 100)

**Sorting**: Always sorted by `created_at DESC` (newest first)

**Privacy Rules**:
- If `is_anonymous = true` â†’ `poster_first_name` = null
- If `is_anonymous = false` â†’ Shows first name only (e.g., "Sarah")
- Last initial shown in UI, not in API (frontend logic)

**Performance**: Queries 1M prayers in ~75ms (PostGIS GIST index)

---

### 2. Get Prayer by ID

**GET** `/rest/v1/prayers?prayer_id=eq.{prayer_id}&select=*,users(first_name,is_profile_public)`

Fetch detailed information about a specific prayer.

**Example**:
```
GET /rest/v1/prayers?prayer_id=eq.123&select=*,users(first_name,is_profile_public)
```

**Response** (200 OK):
```json
{
  "prayer_id": 123,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Please pray for us",
  "text_body": "We just got evicted and don't know where to go. Please pray for guidance and provision.",
  "media_type": "TEXT",
  "media_url": null,
  "media_duration_seconds": null,
  "is_anonymous": false,
  "location": "POINT(-87.6298 41.8781)",
  "city_region": "Near Downtown Chicago",
  "status": "ACTIVE",
  "support_count": 12,
  "response_count": 3,
  "view_count": 45,
  "is_answered": false,
  "answered_at": null,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z",
  "users": {
    "first_name": "Sarah",
    "is_profile_public": true
  }
}
```

**Errors**:
- `404`: Prayer not found or hidden
- `403`: Prayer is private (shouldn't happen in v1)

---

### 3. Create Prayer (Text Only - MVP)

**POST** `/rest/v1/prayers`

Create a new text prayer request.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "Job Loss Prayer",
  "text_body": "I just lost my job and don't know how I'll provide for my family. Please pray for guidance and a new opportunity.",
  "is_anonymous": false,
  "location": "POINT(-87.6298 41.8781)",
  "city_region": "Near Chicago"
}
```

**Field Validation**:
- `title` (optional): Max 200 characters
- `text_body` (required): 10-500 characters
- `is_anonymous` (optional): Boolean, default false
- `location` (required): PostGIS POINT format `"POINT(lng lat)"`
- `city_region` (optional): String, e.g., "Near Downtown Chicago"

**Response** (201 Created):
```json
{
  "prayer_id": 125,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Job Loss Prayer",
  "text_body": "I just lost my job...",
  "media_type": "TEXT",
  "is_anonymous": false,
  "location": "POINT(-87.6298 41.8781)",
  "support_count": 0,
  "response_count": 0,
  "created_at": "2025-01-15T11:00:00Z"
}
```

**Errors**:
- `401`: Unauthorized (no token)
- `400`: Validation failed (text too short/long)
- `422`: Invalid location format

---

### 4. Create Prayer with Media (Phase 2)

**POST** `/rest/v1/prayers` (with S3 URL)

Create audio or video prayer (after uploading to S3).

**Flow** (see "Media Upload Flow" below):
1. Get presigned S3 URL from `/api/media/upload-url`
2. Upload media directly to S3
3. Create prayer with `media_url` from S3

**Request Body**:
```json
{
  "title": "Audio Prayer Request",
  "text_body": "Please listen to my prayer need",
  "media_type": "AUDIO",
  "media_url": "https://cdn.prayermap.net/audio/uuid-123.mp3",
  "media_duration_seconds": 90,
  "is_anonymous": false,
  "location": "POINT(-87.6298 41.8781)",
  "city_region": "Near Chicago"
}
```

**Media Constraints**:
- **Audio**: Max 120 seconds, max 10MB
- **Video**: Max 90 seconds, max 50MB (NEW: was 30s)
- **Formats**: Audio (MP3, AAC, WAV), Video (MP4, WebM)

**Response** (201 Created):
```json
{
  "prayer_id": 126,
  "media_type": "AUDIO",
  "media_url": "https://cdn.prayermap.net/audio/uuid-123.mp3",
  "media_duration_seconds": 90,
  "created_at": "2025-01-15T11:10:00Z"
}
```

---

### 5. Update Prayer

**PATCH** `/rest/v1/prayers?prayer_id=eq.{prayer_id}`

Update own prayer (only creator can edit).

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body** (partial update):
```json
{
  "is_answered": true,
  "answered_at": "2025-01-20T14:30:00Z"
}
```

**Response** (200 OK):
```json
{
  "prayer_id": 123,
  "is_answered": true,
  "answered_at": "2025-01-20T14:30:00Z",
  "updated_at": "2025-01-20T14:30:00Z"
}
```

**Allowed Updates**:
- `is_answered` (boolean)
- `answered_at` (timestamp)
- Cannot edit: title, text_body, location (immutable)

**Errors**:
- `403`: Not the creator (RLS policy enforces)
- `404`: Prayer not found

---

### 6. Delete Prayer

**DELETE** `/rest/v1/prayers?prayer_id=eq.{prayer_id}`

Delete own prayer (only creator can delete).

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (204 No Content)

**Effects**:
- Prayer removed from map immediately
- Cascade deletes: All supports, responses, notifications
- Cannot be undone

**Errors**:
- `403`: Not the creator
- `404`: Prayer not found

---

## ðŸ™ Prayer Support Endpoints

### 1. Send Prayer Support

**POST** `/rest/v1/prayer_support`

"Pray First. Then Press." - Record that user prayed for this prayer.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "prayer_id": 123
}
```

**Response** (201 Created):
```json
{
  "support_id": 456,
  "prayer_id": 123,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-15T11:05:00Z"
}
```

**Side Effects**:
1. `prayers.support_count` increments by 1
2. Creator receives notification: "Someone prayed for you"
3. If already supported â†’ Returns existing record (idempotent)

**Errors**:
- `401`: Unauthorized
- `404`: Prayer not found
- `409`: Already supported (unique constraint)

---

### 2. Get My Supports

**GET** `/rest/v1/prayer_support?user_id=eq.{user_id}&select=*,prayers(*)`

Fetch all prayers the current user has supported.

**Example**:
```
GET /rest/v1/prayer_support?user_id=eq.550e8400&select=*,prayers(*)
```

**Response** (200 OK):
```json
[
  {
    "support_id": 456,
    "prayer_id": 123,
    "created_at": "2025-01-15T11:05:00Z",
    "prayers": {
      "prayer_id": 123,
      "title": "Please pray for us",
      "text_body": "We just got evicted...",
      "support_count": 12
    }
  }
]
```

**Use Case**: Show "Prayers I've Prayed For" in user profile

---

## ðŸ’¬ Prayer Response Endpoints (Phase 2)

### 1. Create Response

**POST** `/rest/v1/prayer_responses`

Respond to a prayer with encouragement.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "prayer_id": 123,
  "text_body": "Praying for you! God's got this. Philippians 4:6-7 ðŸ™",
  "is_anonymous": false
}
```

**Response** (201 Created):
```json
{
  "response_id": 789,
  "prayer_id": 123,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "text_body": "Praying for you! God's got this...",
  "is_anonymous": false,
  "created_at": "2025-01-15T11:15:00Z"
}
```

**Side Effects**:
1. `prayers.response_count` increments by 1
2. Creator receives notification: "Sarah J. responded to your prayer"

---

### 2. Get Responses for Prayer

**GET** `/rest/v1/prayer_responses?prayer_id=eq.{prayer_id}&select=*,users(first_name)&order=created_at.asc`

Fetch all responses for a specific prayer.

**Example**:
```
GET /rest/v1/prayer_responses?prayer_id=eq.123&select=*,users(first_name)&order=created_at.asc
```

**Response** (200 OK):
```json
[
  {
    "response_id": 789,
    "prayer_id": 123,
    "text_body": "Praying for you! God's got this...",
    "is_anonymous": false,
    "created_at": "2025-01-15T11:15:00Z",
    "users": {
      "first_name": "Marcus"
    }
  },
  {
    "response_id": 790,
    "text_body": "You're not alone. We're all praying.",
    "is_anonymous": true,
    "created_at": "2025-01-15T11:20:00Z",
    "users": null
  }
]
```

---

## ðŸ”” Notification Endpoints

### 1. Get My Notifications

**GET** `/rest/v1/notifications?user_id=eq.{user_id}&order=created_at.desc&limit=20`

Fetch recent notifications for current user.

**Example**:
```
GET /rest/v1/notifications?user_id=eq.550e8400&order=created_at.desc&limit=20
```

**Response** (200 OK):
```json
[
  {
    "notification_id": 1001,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "SUPPORT_RECEIVED",
    "payload": {
      "prayer_id": 123,
      "supporter_name": "Marcus",
      "message": "Someone prayed for you"
    },
    "is_read": false,
    "created_at": "2025-01-15T11:05:00Z"
  },
  {
    "notification_id": 1002,
    "type": "RESPONSE_RECEIVED",
    "payload": {
      "prayer_id": 123,
      "responder_name": "Emily J.",
      "response_preview": "Praying for you! God's got this..."
    },
    "is_read": true,
    "read_at": "2025-01-15T11:18:00Z",
    "created_at": "2025-01-15T11:15:00Z"
  }
]
```

**Notification Types**:
- `SUPPORT_RECEIVED`: Someone pressed "Prayer Sent"
- `RESPONSE_RECEIVED`: Someone responded with text/audio/video
- `PRAYER_ANSWERED`: (Future) Prayer marked as answered

---

### 2. Mark Notification as Read

**PATCH** `/rest/v1/notifications?notification_id=eq.{notification_id}`

Mark a notification as read.

**Request Body**:
```json
{
  "is_read": true,
  "read_at": "2025-01-15T11:18:00Z"
}
```

**Response** (200 OK):
```json
{
  "notification_id": 1001,
  "is_read": true,
  "read_at": "2025-01-15T11:18:00Z"
}
```

---

### 3. Mark All as Read

**PATCH** `/rest/v1/notifications?user_id=eq.{user_id}&is_read=eq.false`

Mark all unread notifications as read.

**Request Body**:
```json
{
  "is_read": true,
  "read_at": "2025-01-15T11:20:00Z"
}
```

**Response** (200 OK): Returns count of updated records

---

## ðŸ“¤ Media Upload Flow (AWS S3)

### Overview

**Why S3?**: 50% cheaper at scale, better for video, industry standard

**Upload Flow** (Presigned URLs):
1. Client requests presigned URL from backend
2. Backend generates S3 presigned URL (5-min expiration)
3. Client uploads directly to S3 (no backend proxy)
4. On success, client creates prayer with `media_url`

### 1. Get Presigned Upload URL

**POST** `/api/media/upload-url`

Request a presigned S3 URL for uploading media.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "file_type": "video/mp4",
  "file_size": 5242880,
  "media_type": "VIDEO"
}
```

**Field Validation**:
- `file_type` (required): MIME type (e.g., "video/mp4", "audio/mpeg")
- `file_size` (required): Size in bytes (max 50MB for video, 10MB for audio)
- `media_type` (required): "AUDIO" or "VIDEO"

**Response** (200 OK):
```json
{
  "upload_url": "https://prayermap-media.s3.amazonaws.com/videos/uuid-123.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
  "media_url": "https://cdn.prayermap.net/videos/uuid-123.mp4",
  "file_key": "videos/uuid-123.mp4",
  "expires_in": 300
}
```

**Field Descriptions**:
- `upload_url`: Presigned S3 URL (expires in 5 minutes)
- `media_url`: Final CloudFront CDN URL (use when creating prayer)
- `file_key`: S3 object key (for reference)
- `expires_in`: Seconds until URL expires (300 = 5 minutes)

**Errors**:
- `400`: Invalid file type or size exceeds limit
- `401`: Unauthorized
- `429`: Rate limit exceeded (10 uploads/minute)

---

### 2. Upload to S3 (Client-Side)

**PUT** `{upload_url}`

Direct upload to S3 using presigned URL.

**Headers**:
```
Content-Type: video/mp4
Content-Length: 5242880
```

**Body**: Raw file bytes

**Example** (JavaScript):
```javascript
const file = document.getElementById('videoInput').files[0];

// Step 1: Get presigned URL
const response = await fetch('/api/media/upload-url', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    file_type: file.type,
    file_size: file.size,
    media_type: 'VIDEO'
  })
});

const { upload_url, media_url } = await response.json();

// Step 2: Upload directly to S3
await fetch(upload_url, {
  method: 'PUT',
  headers: {
    'Content-Type': file.type,
    'Content-Length': file.size
  },
  body: file
});

// Step 3: Create prayer with media_url
await fetch('/rest/v1/prayers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text_body: 'Please watch my prayer video',
    media_type: 'VIDEO',
    media_url: media_url,
    media_duration_seconds: 90,
    location: 'POINT(-87.6298 41.8781)'
  })
});
```

**Response** (200 OK): Empty response (S3 confirms upload)

**Errors**:
- `403`: Presigned URL expired or invalid
- `413`: File size exceeds S3 limit

---

### 3. S3 Upload Progress (Optional)

**Monitor upload progress** (for large files):

```javascript
const xhr = new XMLHttpRequest();

xhr.upload.addEventListener('progress', (event) => {
  if (event.lengthComputable) {
    const percentComplete = (event.loaded / event.total) * 100;
    console.log(`Upload ${percentComplete}% complete`);
  }
});

xhr.open('PUT', upload_url);
xhr.setRequestHeader('Content-Type', file.type);
xhr.send(file);
```

---

## ðŸ‘¤ User Endpoints

### 1. Get Current User Profile

**GET** `/rest/v1/users?user_id=eq.{user_id}`

Fetch profile for current authenticated user.

**Example**:
```
GET /rest/v1/users?user_id=eq.550e8400
```

**Response** (200 OK):
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "is_profile_public": true,
  "notification_radius_km": 30,
  "created_at": "2025-01-10T08:00:00Z"
}
```

---

### 2. Update User Profile

**PATCH** `/rest/v1/users?user_id=eq.{user_id}`

Update user profile settings.

**Request Body**:
```json
{
  "first_name": "Jonathan",
  "notification_radius_km": 50,
  "is_profile_public": false
}
```

**Response** (200 OK):
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "Jonathan",
  "notification_radius_km": 50,
  "is_profile_public": false,
  "updated_at": "2025-01-15T12:00:00Z"
}
```

**Allowed Updates**:
- `first_name`, `last_name`: String
- `notification_radius_km`: Integer (1-100)
- `is_profile_public`: Boolean

---

## ðŸ›¡ï¸ Error Handling

### Standard Error Format

All errors follow this structure:

```json
{
  "error": "validation_error",
  "message": "Text body must be between 10 and 500 characters",
  "details": {
    "field": "text_body",
    "length": 8,
    "min": 10,
    "max": 500
  }
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Successful GET/PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed JSON |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | RLS policy blocks access |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Unique constraint violation |
| 422 | Unprocessable Entity | Semantic error (invalid format) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server bug (rare) |

### Common Error Codes

**Authentication Errors**:
- `invalid_credentials`: Wrong email/password
- `token_expired`: Access token expired (refresh it)
- `token_invalid`: Malformed or revoked token

**Validation Errors**:
- `validation_error`: Field validation failed
- `missing_field`: Required field not provided
- `invalid_format`: Field format incorrect (e.g., location)

**Business Logic Errors**:
- `duplicate_support`: Already supported this prayer
- `prayer_not_found`: Prayer ID doesn't exist
- `permission_denied`: RLS policy blocks action

**Rate Limit Errors**:
- `rate_limit_exceeded`: Too many requests
- `upload_limit_exceeded`: Too many uploads

---

## ðŸš¦ Rate Limits

### Limits Per User

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Auth (signup/login) | 5 requests | 1 minute |
| GET requests | 100 requests | 1 minute |
| POST/PATCH/DELETE | 30 requests | 1 minute |
| Media uploads | 10 uploads | 1 minute |
| Prayer creation | 5 prayers | 1 hour |

### Rate Limit Headers

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1642275600
```

### Handling Rate Limits

**When rate limited** (429 response):
1. Read `X-RateLimit-Reset` header (Unix timestamp)
2. Wait until reset time
3. Implement exponential backoff for retries

**Example** (JavaScript):
```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const waitMs = (resetTime * 1000) - Date.now();
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}
```

---

## ðŸ” Querying (Supabase PostgREST)

### Filtering

Supabase uses **PostgREST** query syntax.

**Examples**:

1. **Equality**:
```
GET /rest/v1/prayers?prayer_id=eq.123
```

2. **Greater/Less Than**:
```
GET /rest/v1/prayers?support_count=gte.10
GET /rest/v1/prayers?created_at=gt.2025-01-01T00:00:00Z
```

3. **Text Search**:
```
GET /rest/v1/prayers?text_body=ilike.*family*
```

4. **Multiple Filters**:
```
GET /rest/v1/prayers?status=eq.ACTIVE&support_count=gte.5
```

### Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equal | `?prayer_id=eq.123` |
| `neq` | Not equal | `?status=neq.HIDDEN` |
| `gt` | Greater than | `?support_count=gt.10` |
| `gte` | Greater/equal | `?support_count=gte.10` |
| `lt` | Less than | `?distance_km=lt.5` |
| `lte` | Less/equal | `?distance_km=lte.5` |
| `like` | Pattern match | `?text_body=like.*prayer*` |
| `ilike` | Case-insensitive | `?text_body=ilike.*PRAYER*` |
| `in` | In list | `?prayer_id=in.(1,2,3)` |

### Ordering

```
GET /rest/v1/prayers?order=created_at.desc
GET /rest/v1/prayers?order=support_count.desc,created_at.desc
```

### Limiting & Pagination

```
GET /rest/v1/prayers?limit=20
GET /rest/v1/prayers?limit=20&offset=40
```

### Selecting Fields

```
GET /rest/v1/prayers?select=prayer_id,title,created_at
GET /rest/v1/prayers?select=*,users(first_name)
```

---

## ðŸ”’ Security Best Practices

### 1. Token Storage

**âœ… DO**:
- Store `access_token` in memory (React state)
- Store `refresh_token` in `httpOnly` cookie (if backend supports)
- Or use secure localStorage (mobile apps)

**âŒ DON'T**:
- Store tokens in regular cookies (XSS risk)
- Store tokens in URL parameters
- Log tokens to console

### 2. HTTPS Only

- Always use HTTPS in production
- Supabase enforces HTTPS (can't downgrade)
- Never send tokens over HTTP

### 3. Input Validation

- Validate all inputs client-side before sending
- Don't trust client validation alone (server validates too)
- Sanitize user-generated content (XSS prevention)

### 4. Error Handling

- Don't expose stack traces in error messages
- Log errors server-side for debugging
- Show user-friendly messages to clients

---

## ðŸ“Š Best Practices

### 1. Batch Queries

**Instead of**:
```javascript
for (const id of prayerIds) {
  await fetch(`/rest/v1/prayers?prayer_id=eq.${id}`);
}
```

**Do this**:
```javascript
const ids = prayerIds.join(',');
await fetch(`/rest/v1/prayers?prayer_id=in.(${ids})`);
```

### 2. Optimistic Updates

**For "Prayer Sent" button**:
```javascript
// 1. Update UI immediately
setSupportCount(prev => prev + 1);
setIsSupported(true);

// 2. Send request
try {
  await fetch('/rest/v1/prayer_support', {
    method: 'POST',
    body: JSON.stringify({ prayer_id: 123 })
  });
} catch (error) {
  // 3. Rollback on error
  setSupportCount(prev => prev - 1);
  setIsSupported(false);
}
```

### 3. Caching

- Cache user profile (changes rarely)
- Cache prayers list (revalidate every 30s)
- Don't cache notifications (always fresh)

**Example** (React Query):
```javascript
const { data: prayers } = useQuery(
  ['prayers', lat, lng],
  () => fetchPrayers(lat, lng),
  { staleTime: 30000 } // 30 seconds
);
```

### 4. Error Retry Logic

```javascript
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## ðŸ§ª Testing

### Test Accounts

**Email**: `test@prayermap.net`  
**Password**: `TestPass123!`

### Test Data

**Sample Prayer IDs**:
- `123`: Text prayer (Sarah's eviction)
- `124`: Audio prayer (anonymous job loss)
- `125`: Video prayer (family crisis)

### Postman Collection

Import this collection: `prayermap-api.postman_collection.json`

Includes:
- All endpoints
- Sample requests
- Environment variables

---

## ðŸ“š Resources

### Documentation Links

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [PostgREST API Reference](https://postgrest.org/en/stable/api.html)
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

### Code Examples

See: `/examples` folder in project repo
- `auth-flow.ts`: Complete auth implementation
- `prayer-crud.ts`: Prayer CRUD operations
- `s3-upload.ts`: Media upload flow
- `geospatial-query.ts`: Radius search

---

## ðŸŽ¯ Quick Start

### 1. Get Access Token

```bash
curl -X POST https://your-project.supabase.co/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'
```

### 2. Fetch Nearby Prayers

```bash
curl -X POST https://your-project.supabase.co/rest/v1/rpc/get_prayers_within_radius \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":41.8781,"lng":-87.6298,"radius_km":30}'
```

### 3. Create Prayer

```bash
curl -X POST https://your-project.supabase.co/rest/v1/prayers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text_body":"Please pray for my family",
    "location":"POINT(-87.6298 41.8781)"
  }'
```

### 4. Send Prayer Support

```bash
curl -X POST https://your-project.supabase.co/rest/v1/prayer_support \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prayer_id":123}'
```

---

## âœ… API Checklist

**Before Launch**:
- [ ] All endpoints tested
- [ ] Rate limits configured
- [ ] RLS policies active
- [ ] Error handling consistent
- [ ] CORS configured
- [ ] S3 bucket created (Phase 2)
- [ ] CloudFront distribution set up (Phase 2)
- [ ] Presigned URL generation working (Phase 2)

---

**API Version**: 2.0  
**Last Updated**: November 2025  
**Status**: Ready for 1-Week MVP

---

# Let's Build Something Sacred ðŸ™

This API is the foundation of a **ministry**, not just an app.

Every endpoint serves the mission: **Connect people in need with people who care.**

Now go build! ðŸš€