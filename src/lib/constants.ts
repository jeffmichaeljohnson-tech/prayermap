/**
 * Application constants
 * Based on prayermap_schema_v2.sql and PROJECT_STRUCTURE_v2.md
 */

// ============================================================================
// DISTANCE CONVERSION CONSTANTS
// ============================================================================

/**
 * Conversion factor: miles to kilometers
 * 1 mile = 1.60934 km
 */
export const MILES_TO_KM = 1.60934

/**
 * Conversion factor: kilometers to miles
 * 1 km = 0.621371 miles
 */
export const KM_TO_MILES = 1 / MILES_TO_KM

/**
 * Default search radius in miles
 * Database stores in km (30 miles = 48.2802 km)
 */
export const DEFAULT_RADIUS_MILES = 30

/**
 * Default search radius in kilometers
 * Calculated from DEFAULT_RADIUS_MILES
 */
export const DEFAULT_RADIUS_KM = DEFAULT_RADIUS_MILES * MILES_TO_KM

/**
 * Maximum search radius in miles
 * Database constraint: max 100 miles = 161 km
 */
export const MAX_RADIUS_MILES = 100

/**
 * Maximum search radius in kilometers
 */
export const MAX_RADIUS_KM = MAX_RADIUS_MILES * MILES_TO_KM

/**
 * Minimum search radius in miles
 */
export const MIN_RADIUS_MILES = 1

/**
 * Minimum search radius in kilometers
 */
export const MIN_RADIUS_KM = MIN_RADIUS_MILES * MILES_TO_KM

// ============================================================================
// PRAYER CONSTANTS
// ============================================================================

/**
 * Maximum length for prayer text body
 */
export const MAX_PRAYER_LENGTH = 1000

/**
 * Minimum length for prayer text body
 * Database constraint: minimum 10 characters
 */
export const MIN_PRAYER_LENGTH = 10

/**
 * Maximum length for prayer title
 * Database constraint: maximum 200 characters
 */
export const MAX_PRAYER_TITLE_LENGTH = 200

/**
 * Maximum video duration in seconds
 * Database constraint: 90 seconds max
 */
export const MAX_VIDEO_DURATION_SECONDS = 90

/**
 * Maximum audio duration in seconds
 * Database constraint: 120 seconds max
 */
export const MAX_AUDIO_DURATION_SECONDS = 120

// ============================================================================
// APP CONFIGURATION
// ============================================================================

/**
 * Application name
 */
export const APP_NAME = 'PrayerMap'

/**
 * Application version
 */
export const APP_VERSION = '0.0.0'

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Supabase API endpoints
 */
export const API_ENDPOINTS = {
  AUTH: '/auth/v1',
  REST: '/rest/v1',
  STORAGE: '/storage/v1',
  REALTIME: '/realtime/v1',
} as const

// ============================================================================
// MAP CONFIGURATION
// ============================================================================

/**
 * MapBox configuration constants
 */
export const MAP_CONFIG = {
  DEFAULT_ZOOM: 10,
  DEFAULT_CENTER: {
    lat: 0,
    lng: 0,
  },
  MIN_ZOOM: 3,
  MAX_ZOOM: 18,
} as const

// ============================================================================
// UI CONSTANTS
// ============================================================================

/**
 * UI timing and interaction constants
 */
export const UI = {
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  TOAST_DURATION: 3000,
} as const

// ============================================================================
// STORAGE BUCKETS
// ============================================================================

/**
 * Supabase storage bucket names
 */
export const STORAGE_BUCKETS = {
  // Add your storage bucket names here
  // Example: AVATARS: 'avatars',
} as const

// ============================================================================
// QUERY KEYS (for React Query)
// ============================================================================

/**
 * Query keys for React Query cache
 */
export const QUERY_KEYS = {
  PRAYERS: 'prayers',
  PRAYERS_NEARBY: (lat: number, lng: number, radiusKm: number) =>
    ['prayers', 'nearby', lat, lng, radiusKm] as const,
  PRAYER: (id: number) => ['prayers', id] as const,
} as const

// ============================================================================
// PRAYER DEFAULTS
// ============================================================================

/**
 * Default values for prayer-related operations
 */
export const PRAYER_DEFAULTS = {
  DEFAULT_RADIUS_KM,
  STALE_TIME_MS: 60_000, // 1 minute
} as const

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Application routes
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  PROFILE: '/profile',
  // Add more routes as needed
} as const

// ============================================================================
// NOTIFICATION CONSTANTS
// ============================================================================

/**
 * Default notification radius in kilometers
 * Database default: 48 km (30 miles)
 */
export const DEFAULT_NOTIFICATION_RADIUS_KM = 48

/**
 * Default notification radius in miles
 */
export const DEFAULT_NOTIFICATION_RADIUS_MILES = DEFAULT_NOTIFICATION_RADIUS_KM * KM_TO_MILES

/**
 * Maximum notification radius in kilometers
 * Database constraint: max 161 km (100 miles)
 */
export const MAX_NOTIFICATION_RADIUS_KM = 161

/**
 * Maximum notification radius in miles
 */
export const MAX_NOTIFICATION_RADIUS_MILES = 100

