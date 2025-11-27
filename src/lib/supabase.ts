import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Database Types
// ============================================================================

export type ContentType = 'text' | 'audio' | 'video'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Prayer {
  id: string
  user_id: string
  title: string | null
  content: string
  content_type: ContentType
  media_url: string | null
  location: {
    lat: number
    lng: number
  }
  is_anonymous: boolean
  created_at: string
  updated_at: string
}

export interface PrayerResponse {
  id: string
  prayer_id: string
  responder_id: string
  message: string | null
  content_type: ContentType
  media_url: string | null
  created_at: string
}

export interface PrayerConnection {
  id: string
  prayer_id: string
  from_user_id: string
  to_user_id: string
  from_location: {
    lat: number
    lng: number
  }
  to_location: {
    lat: number
    lng: number
  }
  created_at: string
  expires_at: string
}

// ============================================================================
// Database Schema Type
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      prayers: {
        Row: Prayer
        Insert: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Prayer, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      prayer_responses: {
        Row: PrayerResponse
        Insert: Omit<PrayerResponse, 'id' | 'created_at'>
        Update: Partial<Omit<PrayerResponse, 'id' | 'prayer_id' | 'responder_id' | 'created_at'>>
      }
      prayer_connections: {
        Row: PrayerConnection
        Insert: Omit<PrayerConnection, 'id' | 'created_at' | 'expires_at'>
        Update: Partial<Omit<PrayerConnection, 'id' | 'created_at' | 'expires_at'>>
      }
    }
    Functions: {
      get_prayers_within_radius: {
        Args: {
          lat: number
          lng: number
          radius_km?: number
        }
        Returns: Array<Prayer & { distance_km: number; display_name: string | null }>
      }
      get_active_connections: {
        Args: {
          user_id_param?: string
        }
        Returns: Array<PrayerConnection & { requester_name: string; replier_name: string }>
      }
    }
  }
}

// ============================================================================
// Supabase Client
// ============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - some features may not work')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get prayers within a radius of a location
 * @param lat Latitude
 * @param lng Longitude
 * @param radius_km Radius in kilometers (default: 30)
 */
export async function getPrayersWithinRadius(
  lat: number,
  lng: number,
  radius_km: number = 30
) {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase.rpc('get_prayers_within_radius', {
    lat,
    lng,
    radius_km,
  })

  if (error) throw error
  return data
}

/**
 * Get active prayer connections (not expired)
 * @param user_id Optional: filter by user
 */
export async function getActiveConnections(user_id?: string) {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase.rpc('get_active_connections', {
    user_id_param: user_id,
  })

  if (error) throw error
  return data
}

/**
 * Create a new prayer
 */
export async function createPrayer(prayer: Database['public']['Tables']['prayers']['Insert']) {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('prayers')
    .insert(prayer)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Create a prayer response
 */
export async function createPrayerResponse(
  response: Database['public']['Tables']['prayer_responses']['Insert']
) {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('prayer_responses')
    .insert(response)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Create a prayer connection (when someone prays for a request)
 */
export async function createPrayerConnection(
  connection: Database['public']['Tables']['prayer_connections']['Insert']
) {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('prayer_connections')
    .insert(connection)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get current user's profile
 */
export async function getCurrentUserProfile() {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select()
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

/**
 * Update current user's profile
 */
export async function updateCurrentUserProfile(
  updates: Database['public']['Tables']['profiles']['Update']
) {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}
