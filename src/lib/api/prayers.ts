/**
 * Prayer API functions
 * 
 * Handles all prayer-related API calls to Supabase
 * Uses the get_prayers_within_radius RPC function for geospatial queries
 * 
 * NOTE: Viewing prayers (SELECT) does NOT require authentication.
 * Anonymous users can see prayers on the map to create curiosity and drive conversions.
 * Only creating/supporting prayers requires authentication.
 * 
 * RLS Policy Requirements (to be updated in database):
 * - SELECT on prayers: Allow anonymous (anon role)
 * - INSERT/UPDATE: Require authenticated user
 */

import { supabase } from '../supabase'
import type { Prayer, GetPrayersParams } from '../types'
import { MILES_TO_KM, MAX_RADIUS_KM, MIN_RADIUS_KM } from '../constants'

/**
 * Error class for API errors
 */
export class PrayerApiError extends Error {
  code?: string
  details?: string
  
  constructor(
    message: string,
    code?: string,
    details?: string
  ) {
    super(message)
    this.name = 'PrayerApiError'
    this.code = code
    this.details = details
  }
}

/**
 * Fetches prayers within a specified radius of a location (in miles)
 * 
 * Converts miles to kilometers internally and calls the PostGIS-enabled
 * get_prayers_within_radius RPC function for efficient geospatial queries
 * with GIST index optimization.
 * 
 * NOTE: The current schema function doesn't support pagination (limit/offset).
 * To add pagination, update the schema function to accept limit_count and offset_count.
 * For now, pagination is handled client-side if needed.
 * 
 * @param lat - Latitude (-90 to 90)
 * @param lng - Longitude (-180 to 180)
 * @param radiusMiles - Search radius in miles (1-100)
 * @param limit - Maximum number of results (default: 50, handled client-side)
 * @param offset - Number of results to skip (default: 0, handled client-side)
 * @returns Array of prayers sorted by recency (newest first)
 * @throws PrayerApiError if the request fails
 * 
 * @example
 * ```typescript
 * const prayers = await getPrayersNearby(41.8781, -87.6298, 30)
 * ```
 */
export async function getPrayersNearby(
  lat: number,
  lng: number,
  radiusMiles: number,
  limit: number = 50,
  offset: number = 0
): Promise<Prayer[]> {
  // Validate input parameters
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    throw new PrayerApiError(
      'Invalid latitude. Must be a number between -90 and 90.',
      'INVALID_LATITUDE'
    )
  }

  if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
    throw new PrayerApiError(
      'Invalid longitude. Must be a number between -180 and 180.',
      'INVALID_LONGITUDE'
    )
  }

  // Convert miles to kilometers
  const radiusKm = radiusMiles * MILES_TO_KM

  // Validate radius (in km after conversion)
  if (radiusKm < MIN_RADIUS_KM || radiusKm > MAX_RADIUS_KM) {
    throw new PrayerApiError(
      `Invalid radius. Must be between ${MIN_RADIUS_KM / MILES_TO_KM} and ${MAX_RADIUS_KM / MILES_TO_KM} miles.`,
      'INVALID_RADIUS'
    )
  }

  // Validate pagination parameters
  if (typeof limit !== 'number' || limit < 1 || limit > 100) {
    throw new PrayerApiError(
      'Invalid limit. Must be a number between 1 and 100.',
      'INVALID_LIMIT'
    )
  }

  if (typeof offset !== 'number' || offset < 0) {
    throw new PrayerApiError(
      'Invalid offset. Must be a non-negative number.',
      'INVALID_OFFSET'
    )
  }

  try {
    // Call the RPC function
    // NOTE: Current schema function signature: get_prayers_within_radius(lat, lng, radius_km)
    // Pagination (limit/offset) would require schema update to:
    // get_prayers_within_radius(lat, lng, radius_km, limit_count, offset_count)
    const { data, error } = await supabase.rpc(
      'get_prayers_within_radius',
      {
        lat,
        lng,
        radius_km: Math.round(radiusKm), // Round to integer as schema expects INTEGER
      } as any
    )

    if (error) {
      // Handle Supabase-specific errors
      throw new PrayerApiError(
        error.message || 'Failed to fetch prayers',
        error.code || 'RPC_ERROR',
        error.details || error.hint
      )
    }

    // Ensure we return an array even if data is null
    if (!data) {
      return []
    }

    // Validate response structure
    if (!Array.isArray(data)) {
      throw new PrayerApiError(
        'Invalid response format from server',
        'INVALID_RESPONSE'
      )
    }

    // Apply client-side pagination until schema supports it
    // Schema function returns results sorted by created_at DESC (newest first)
    const paginatedData = data.slice(offset, offset + limit)

    return paginatedData as Prayer[]
  } catch (error) {
    // Re-throw PrayerApiError as-is
    if (error instanceof PrayerApiError) {
      throw error
    }

    // Wrap unexpected errors
    if (error instanceof Error) {
      throw new PrayerApiError(
        `Unexpected error: ${error.message}`,
        'UNEXPECTED_ERROR',
        error.stack
      )
    }

    // Handle non-Error objects
    throw new PrayerApiError(
      'An unknown error occurred while fetching prayers',
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * Fetches prayers within a specified radius of a location (in kilometers)
 * 
 * Uses the PostGIS-enabled get_prayers_within_radius RPC function
 * for efficient geospatial queries with GIST index optimization
 * 
 * @param params - Location and radius parameters
 * @returns Array of prayers sorted by distance and recency
 * @throws PrayerApiError if the request fails
 * 
 * @example
 * ```typescript
 * const prayers = await getPrayersWithinRadius({
 *   lat: 41.8781,
 *   lng: -87.6298,
 *   radiusKm: 30
 * })
 * ```
 */
export async function getPrayersWithinRadius(
  params: GetPrayersParams
): Promise<Prayer[]> {
  const { lat, lng, radiusKm = 30 } = params

  // Validate input parameters
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    throw new PrayerApiError(
      'Invalid latitude. Must be a number between -90 and 90.',
      'INVALID_LATITUDE'
    )
  }

  if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
    throw new PrayerApiError(
      'Invalid longitude. Must be a number between -180 and 180.',
      'INVALID_LONGITUDE'
    )
  }

  if (typeof radiusKm !== 'number' || radiusKm < MIN_RADIUS_KM || radiusKm > MAX_RADIUS_KM) {
    throw new PrayerApiError(
      `Invalid radius. Must be a number between ${MIN_RADIUS_KM} and ${MAX_RADIUS_KM} km.`,
      'INVALID_RADIUS'
    )
  }

  try {
    // Call the RPC function
    // Note: Type assertion needed until Supabase types are generated from schema
    const { data, error } = await supabase.rpc(
      'get_prayers_within_radius',
      {
        lat,
        lng,
        radius_km: Math.round(radiusKm), // Round to integer as schema expects INTEGER
      } as any
    )

    if (error) {
      // Handle Supabase-specific errors
      throw new PrayerApiError(
        error.message || 'Failed to fetch prayers',
        error.code || 'RPC_ERROR',
        error.details || error.hint
      )
    }

    // Ensure we return an array even if data is null
    if (!data) {
      return []
    }

    // Validate response structure
    if (!Array.isArray(data)) {
      throw new PrayerApiError(
        'Invalid response format from server',
        'INVALID_RESPONSE'
      )
    }

    return data as Prayer[]
  } catch (error) {
    // Re-throw PrayerApiError as-is
    if (error instanceof PrayerApiError) {
      throw error
    }

    // Wrap unexpected errors
    if (error instanceof Error) {
      throw new PrayerApiError(
        `Unexpected error: ${error.message}`,
        'UNEXPECTED_ERROR',
        error.stack
      )
    }

    // Handle non-Error objects
    throw new PrayerApiError(
      'An unknown error occurred while fetching prayers',
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * Fetches a single prayer by ID
 * 
 * @param prayerId - The ID of the prayer to fetch
 * @returns The prayer data or null if not found
 * @throws PrayerApiError if the request fails
 */
export async function getPrayerById(prayerId: number): Promise<Prayer | null> {
  if (!Number.isInteger(prayerId) || prayerId <= 0) {
    throw new PrayerApiError(
      'Invalid prayer ID. Must be a positive integer.',
      'INVALID_PRAYER_ID'
    )
  }

  try {
    const { data, error } = await supabase
      .from('prayers')
      .select('*')
      .eq('prayer_id', prayerId)
      .eq('status', 'ACTIVE')
      .single()

    if (error) {
      // Handle "not found" case gracefully
      if (error.code === 'PGRST116') {
        return null
      }

      throw new PrayerApiError(
        error.message || 'Failed to fetch prayer',
        error.code || 'QUERY_ERROR',
        error.details || error.hint
      )
    }

    return data as Prayer | null
  } catch (error) {
    if (error instanceof PrayerApiError) {
      throw error
    }

    if (error instanceof Error) {
      throw new PrayerApiError(
        `Unexpected error: ${error.message}`,
        'UNEXPECTED_ERROR',
        error.stack
      )
    }

    throw new PrayerApiError(
      'An unknown error occurred while fetching prayer',
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * Interface for creating a new prayer
 */
export interface CreatePrayerParams {
  title?: string | null
  text_body: string
  is_anonymous?: boolean
  latitude: number
  longitude: number
  city_region?: string | null
}

/**
 * Creates a new prayer request
 * 
 * Validates input, captures geolocation, and inserts into prayers table
 * 
 * @param params - Prayer creation parameters
 * @returns The created prayer data
 * @throws PrayerApiError if validation fails or creation fails
 * 
 * @example
 * ```typescript
 * const prayer = await createPrayer({
 *   title: 'Healing for my mother',
 *   text_body: 'Please pray for my mother who is recovering from surgery...',
 *   is_anonymous: false,
 *   latitude: 41.8781,
 *   longitude: -87.6298,
 *   city_region: 'Chicago, IL'
 * })
 * ```
 */
export async function createPrayer(
  params: CreatePrayerParams
): Promise<Prayer> {
  const {
    title,
    text_body,
    is_anonymous = false,
    latitude,
    longitude,
    city_region = null,
  } = params

  // Validate text_body (required, min 10 chars)
  if (!text_body || typeof text_body !== 'string') {
    throw new PrayerApiError(
      'Prayer text is required',
      'INVALID_TEXT_BODY'
    )
  }

  if (text_body.trim().length < 10) {
    throw new PrayerApiError(
      'Prayer text must be at least 10 characters long',
      'TEXT_TOO_SHORT'
    )
  }

  if (text_body.trim().length > 1000) {
    throw new PrayerApiError(
      'Prayer text must be 1000 characters or less',
      'TEXT_TOO_LONG'
    )
  }

  // Validate title (optional, max 200 chars if provided)
  if (title !== null && title !== undefined) {
    if (typeof title !== 'string') {
      throw new PrayerApiError(
        'Title must be a string',
        'INVALID_TITLE'
      )
    }

    if (title.length > 200) {
      throw new PrayerApiError(
        'Title must be 200 characters or less',
        'TITLE_TOO_LONG'
      )
    }
  }

  // Validate location
  if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new PrayerApiError(
      'Invalid latitude. Must be a number between -90 and 90.',
      'INVALID_LATITUDE'
    )
  }

  if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new PrayerApiError(
      'Invalid longitude. Must be a number between -180 and 180.',
      'INVALID_LONGITUDE'
    )
  }

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new PrayerApiError(
      'You must be signed in to create a prayer',
      'UNAUTHORIZED'
    )
  }

  try {
    // Format location as PostGIS POINT (longitude latitude order for WGS84)
    // PostGIS uses POINT(longitude latitude) format
    const locationString = `POINT(${longitude} ${latitude})`

    // Insert prayer into database
    const { data, error } = await supabase
      .from('prayers')
      .insert({
        user_id: user.id,
        title: title?.trim() || null,
        text_body: text_body.trim(),
        media_type: 'TEXT', // Phase 1: TEXT only
        is_anonymous: is_anonymous,
        location: locationString,
        city_region: city_region?.trim() || null,
        status: 'ACTIVE',
      } as never)
      .select()
      .single()

    if (error) {
      // Handle specific database errors
      if (error.code === '23505') {
        throw new PrayerApiError(
          'A prayer with this information already exists',
          'DUPLICATE_PRAYER'
        )
      }

      if (error.code === '23503') {
        throw new PrayerApiError(
          'User profile not found. Please complete your profile.',
          'USER_NOT_FOUND'
        )
      }

      throw new PrayerApiError(
        error.message || 'Failed to create prayer',
        error.code || 'INSERT_ERROR',
        error.details || error.hint
      )
    }

    if (!data) {
      throw new PrayerApiError(
        'Prayer was created but no data was returned',
        'NO_DATA_RETURNED'
      )
    }

    return data as Prayer
  } catch (error) {
    // Re-throw PrayerApiError as-is
    if (error instanceof PrayerApiError) {
      throw error
    }

    // Wrap unexpected errors
    if (error instanceof Error) {
      throw new PrayerApiError(
        `Unexpected error: ${error.message}`,
        'UNEXPECTED_ERROR',
        error.stack
      )
    }

    // Handle non-Error objects
    throw new PrayerApiError(
      'An unknown error occurred while creating prayer',
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * Send prayer support ("Pray First. Then Press.")
 * 
 * @param prayerId - The ID of the prayer to support
 * @returns Support data or indicates if already supported
 * @throws PrayerApiError if the request fails
 */
export async function sendPrayerSupport(prayerId: number): Promise<{ support_id?: number; alreadySupported?: boolean }> {
  if (!Number.isInteger(prayerId) || prayerId <= 0) {
    throw new PrayerApiError(
      'Invalid prayer ID. Must be a positive integer.',
      'INVALID_PRAYER_ID'
    )
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new PrayerApiError(
      'You must be signed in to support a prayer',
      'UNAUTHORIZED'
    )
  }

  try {
    const { data, error } = await supabase
      .from('prayer_support')
      .insert({
        prayer_id: prayerId,
        user_id: user.id,
      } as never)
      .select()
      .single()

    if (error) {
      // If already supported, return success (idempotent)
      if (error.code === '23505') {
        return { alreadySupported: true }
      }

      throw new PrayerApiError(
        error.message || 'Failed to send prayer support',
        error.code || 'INSERT_ERROR',
        error.details || error.hint
      )
    }

    return data
  } catch (error) {
    if (error instanceof PrayerApiError) {
      throw error
    }

    if (error instanceof Error) {
      throw new PrayerApiError(
        `Unexpected error: ${error.message}`,
        'UNEXPECTED_ERROR',
        error.stack
      )
    }

    throw new PrayerApiError(
      'An unknown error occurred while sending prayer support',
      'UNKNOWN_ERROR'
    )
  }
}

/**
 * Check if user has already supported a prayer
 * 
 * @param prayerId - The ID of the prayer
 * @param userId - The ID of the user
 * @returns True if user has supported, false otherwise
 */
export async function checkIfSupported(
  prayerId: number,
  userId: string
): Promise<boolean> {
  if (!Number.isInteger(prayerId) || prayerId <= 0) {
    return false
  }

  try {
    const { data } = await supabase
      .from('prayer_support')
      .select('support_id')
      .eq('prayer_id', prayerId)
      .eq('user_id', userId)
      .maybeSingle()

    return !!data
  } catch (error) {
    console.error('Error checking support status:', error)
    return false
  }
}

