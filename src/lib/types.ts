/**
 * Database types generated from Supabase schema
 * Based on prayermap_schema_v2.sql
 * 
 * To generate types from your Supabase schema:
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. Run: supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types.ts
 * 
 * Or use the Supabase MCP tool to generate types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================================
// ENUMS (from database schema)
// ============================================================================

/**
 * Media type for prayers/responses
 */
export type MediaType = 'TEXT' | 'AUDIO' | 'VIDEO'

/**
 * Prayer status for moderation
 */
export type PrayerStatus = 'ACTIVE' | 'HIDDEN' | 'FLAGGED' | 'REMOVED'

/**
 * Notification types
 */
export type NotificationType =
  | 'SUPPORT_RECEIVED' // Someone pressed "Prayer Sent"
  | 'RESPONSE_RECEIVED' // Someone responded to your prayer
  | 'PRAYER_ANSWERED' // Someone marked prayer as answered (future)

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string
          first_name: string
          last_name: string | null
          email: string
          is_profile_public: boolean
          notification_radius_km: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          first_name: string
          last_name?: string | null
          email: string
          is_profile_public?: boolean
          notification_radius_km?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          first_name?: string
          last_name?: string | null
          email?: string
          is_profile_public?: boolean
          notification_radius_km?: number
          created_at?: string
          updated_at?: string
        }
      }
      prayers: {
        Row: {
          prayer_id: number
          user_id: string
          title: string | null
          text_body: string
          media_type: MediaType
          media_url: string | null
          media_duration_seconds: number | null
          is_anonymous: boolean
          city_region: string | null
          status: PrayerStatus
          support_count: number
          response_count: number
          view_count: number
          is_answered: boolean
          answered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          prayer_id?: number
          user_id: string
          title?: string | null
          text_body: string
          media_type?: MediaType
          media_url?: string | null
          media_duration_seconds?: number | null
          is_anonymous?: boolean
          city_region?: string | null
          status?: PrayerStatus
          support_count?: number
          response_count?: number
          view_count?: number
          is_answered?: boolean
          answered_at?: string | null
          created_at?: string
          updated_at?: string
          // PostGIS geography point (stored as string in JSON)
          location?: string
        }
        Update: {
          prayer_id?: number
          user_id?: string
          title?: string | null
          text_body?: string
          media_type?: MediaType
          media_url?: string | null
          media_duration_seconds?: number | null
          is_anonymous?: boolean
          city_region?: string | null
          status?: PrayerStatus
          support_count?: number
          response_count?: number
          view_count?: number
          is_answered?: boolean
          answered_at?: string | null
          created_at?: string
          updated_at?: string
          location?: string
        }
      }
      prayer_responses: {
        Row: {
          response_id: number
          prayer_id: number
          user_id: string
          text_body: string | null
          media_type: MediaType
          media_url: string | null
          media_duration_seconds: number | null
          is_anonymous: boolean
          created_at: string
        }
        Insert: {
          response_id?: number
          prayer_id: number
          user_id: string
          text_body?: string | null
          media_type?: MediaType
          media_url?: string | null
          media_duration_seconds?: number | null
          is_anonymous?: boolean
          created_at?: string
        }
        Update: {
          response_id?: number
          prayer_id?: number
          user_id?: string
          text_body?: string | null
          media_type?: MediaType
          media_url?: string | null
          media_duration_seconds?: number | null
          is_anonymous?: boolean
          created_at?: string
        }
      }
      prayer_support: {
        Row: {
          support_id: number
          prayer_id: number
          user_id: string
          created_at: string
        }
        Insert: {
          support_id?: number
          prayer_id: number
          user_id: string
          created_at?: string
        }
        Update: {
          support_id?: number
          prayer_id?: number
          user_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          notification_id: number
          user_id: string
          type: NotificationType
          payload: Json
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          notification_id?: number
          user_id: string
          type: NotificationType
          payload: Json
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          notification_id?: number
          user_id?: string
          type?: NotificationType
          payload?: Json
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      prayer_flags: {
        Row: {
          flag_id: number
          prayer_id: number
          reporter_user_id: string
          reason: string
          additional_notes: string | null
          is_reviewed: boolean
          reviewed_by: string | null
          reviewed_at: string | null
          action_taken: string | null
          created_at: string
        }
        Insert: {
          flag_id?: number
          prayer_id: number
          reporter_user_id: string
          reason: string
          additional_notes?: string | null
          is_reviewed?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          action_taken?: string | null
          created_at?: string
        }
        Update: {
          flag_id?: number
          prayer_id?: number
          reporter_user_id?: string
          reason?: string
          additional_notes?: string | null
          is_reviewed?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          action_taken?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      prayers_with_engagement: {
        Row: {
          prayer_id: number
          user_id: string
          title: string | null
          text_body: string
          media_type: MediaType
          media_url: string | null
          media_duration_seconds: number | null
          is_anonymous: boolean
          city_region: string | null
          status: PrayerStatus
          support_count: number
          response_count: number
          view_count: number
          is_answered: boolean
          answered_at: string | null
          created_at: string
          updated_at: string
          poster_first_name: string | null
          poster_is_public: boolean
          actual_support_count: number
          actual_response_count: number
        }
      }
    }
    Functions: {
      get_prayers_within_radius: {
        Args: {
          lat: number
          lng: number
          radius_km?: number
        }
        Returns: {
          prayer_id: number
          user_id: string
          title: string | null
          text_body: string
          media_type: MediaType
          media_url: string | null
          media_duration_seconds: number | null
          is_anonymous: boolean
          city_region: string | null
          support_count: number
          response_count: number
          distance_km: number
          created_at: string
          poster_first_name: string | null
          poster_is_public: boolean
        }[]
      }
      prayer_distance_km: {
        Args: {
          prayer_id_1: number
          prayer_id_2: number
        }
        Returns: number
      }
    }
    Enums: {
      media_type: MediaType
      prayer_status: PrayerStatus
      notification_type: NotificationType
    }
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Extract table row type
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/**
 * Extract enum type
 */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// ============================================================================
// USER TYPES (from Supabase Auth)
// ============================================================================

/**
 * Supabase Auth User
 */
export interface User {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

/**
 * Supabase Auth Session
 */
export interface Session {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  token_type: string
  user: User
}

/**
 * User profile (from users table)
 */
export type UserProfile = Tables<'users'>

/**
 * User profile with auth data
 */
export interface UserWithProfile extends User {
  profile?: UserProfile
}

// ============================================================================
// PRAYER TYPES
// ============================================================================

/**
 * Prayer data from prayers table
 */
export type PrayerRow = Tables<'prayers'>

/**
 * Prayer data returned from get_prayers_within_radius RPC function
 * Includes distance and poster information
 */
export interface Prayer {
  prayer_id: number
  user_id: string
  title: string | null
  text_body: string
  media_type: MediaType
  media_url: string | null
  media_duration_seconds: number | null
  is_anonymous: boolean
  city_region: string | null
  support_count: number
  response_count: number
  distance_km?: number // Only available from RPC queries
  created_at: string
  poster_first_name?: string | null // Only available from RPC queries
  poster_is_public?: boolean // Only available from RPC queries
}

/**
 * Prayer with full details (includes all fields from table)
 */
export interface PrayerDetail extends PrayerRow {
  poster_first_name?: string | null
  poster_is_public?: boolean
}

/**
 * Parameters for fetching prayers within radius
 */
export interface GetPrayersParams {
  lat: number
  lng: number
  radiusKm?: number
}

/**
 * Create prayer input
 */
export interface CreatePrayerInput {
  title?: string | null
  textBody: string
  mediaType?: MediaType
  mediaUrl?: string | null
  mediaDurationSeconds?: number | null
  isAnonymous: boolean
  latitude: number
  longitude: number
  cityRegion?: string | null
}

// ============================================================================
// PRAYER RESPONSE TYPES
// ============================================================================

/**
 * Prayer response data
 */
export type PrayerResponse = Tables<'prayer_responses'>

/**
 * Create prayer response input
 */
export interface CreatePrayerResponseInput {
  prayerId: number
  textBody?: string | null
  mediaType?: MediaType
  mediaUrl?: string | null
  mediaDurationSeconds?: number | null
  isAnonymous: boolean
}

// ============================================================================
// PRAYER SUPPORT TYPES
// ============================================================================

/**
 * Prayer support data
 */
export type PrayerSupport = Tables<'prayer_support'>

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Notification data
 */
export type Notification = Tables<'notifications'>

/**
 * Notification payload types
 */
export interface SupportReceivedPayload {
  prayer_id: number
  supporter_name: string
  message: string
}

export interface ResponseReceivedPayload {
  prayer_id: number
  response_id: number
  responder_name: string
  response_preview: string
}

export interface PrayerAnsweredPayload {
  prayer_id: number
  responder_name: string
  message: string
}

export type NotificationPayload =
  | SupportReceivedPayload
  | ResponseReceivedPayload
  | PrayerAnsweredPayload

// ============================================================================
// PRAYER FLAG TYPES
// ============================================================================

/**
 * Prayer flag/report data
 */
export type PrayerFlag = Tables<'prayer_flags'>

/**
 * Create prayer flag input
 */
export interface CreatePrayerFlagInput {
  prayerId: number
  reason: string
  additionalNotes?: string | null
}

// ============================================================================
// LOCATION TYPES
// ============================================================================

/**
 * Geographic coordinates
 */
export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Location with city/region name
 */
export interface Location extends Coordinates {
  cityRegion?: string | null
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Error response from API
 */
export interface ApiError {
  message: string
  code?: string
  details?: string
}

/**
 * Success response wrapper
 */
export interface ApiSuccess<T> {
  data: T
  message?: string
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

