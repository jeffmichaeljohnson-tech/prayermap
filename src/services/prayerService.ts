/**
 * PrayerMap Prayer Service
 *
 * GLOBAL LIVING MAP CONCEPT:
 * PrayerMap is a GLOBAL LIVING MAP where all prayers are visible to everyone worldwide.
 * Every prayer, every response, every connection creates a living tapestry of faith
 * connecting people across the globe in real-time. This is not a local or regional
 * prayer map - it's a worldwide community where geographic boundaries fade away
 * and spiritual connections transcend distance.
 */

import { supabase } from '../lib/supabase';
import type { Prayer, PrayerResponse } from '../types/prayer';
import { withRetry, CircuitBreaker, createResilientOperation } from '../lib/resilience';
import { prayerSchema, prayerResponseSchema } from '../lib/validation';
import { sanitizeUserContent, validators } from '../lib/security';

// Circuit breaker for Supabase operations
const supabaseCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  halfOpenRequests: 3,
});

// Database table schemas
interface PrayerRow {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  media_url?: string; // Database column is media_url, not content_url
  location: { lat: number; lng: number } | string; // PostGIS POINT or JSON
  user_name?: string;
  is_anonymous: boolean;
  status?: 'pending' | 'approved' | 'active' | 'hidden' | 'removed';
  created_at: string;
  updated_at?: string;
}

interface PrayerResponseRow {
  id: string;
  prayer_id: string;
  responder_id: string;
  responder_name?: string;
  is_anonymous: boolean;
  message: string;
  content_type: 'text' | 'audio' | 'video';
  content_url?: string;
  created_at: string;
  read_at?: string | null;
}

interface PrayerConnectionRow {
  id: string;
  prayer_id: string;
  prayer_response_id: string;
  from_location: { lat: number; lng: number } | string;
  to_location: { lat: number; lng: number } | string;
  requester_name: string;
  replier_name: string;
  created_at: string;
  expires_at: string;
}

export interface PrayerConnection {
  id: string;
  prayer_id: string;
  prayer_response_id: string;
  from_location: { lat: number; lng: number };
  to_location: { lat: number; lng: number };
  requester_name: string;
  replier_name: string;
  created_at: Date;
  expires_at: Date;
}

// Type guards and converters
function isPointString(location: any): location is string {
  return typeof location === 'string' && location.startsWith('POINT(');
}

function parsePostGISPoint(point: string): { lat: number; lng: number } {
  // POINT(lng lat) format
  const match = point.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (match) {
    return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  }
  throw new Error('Invalid PostGIS point format');
}

function convertLocation(location: { lat: number; lng: number } | string | null | undefined): { lat: number; lng: number } {
  if (!location) {
    console.warn('Missing location data');
    return { lat: 0, lng: 0 };
  }

  if (isPointString(location)) {
    return parsePostGISPoint(location);
  }

  // Handle object with lat/lng
  if (typeof location === 'object') {
    const lat = Number(location.lat);
    const lng = Number(location.lng);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn('Invalid location coordinates:', location);
      return { lat: 0, lng: 0 };
    }

    return { lat, lng };
  }

  console.warn('Unknown location format:', location);
  return { lat: 0, lng: 0 };
}

function rowToPrayer(row: PrayerRow): Prayer {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    content: row.content,
    content_type: row.content_type,
    content_url: row.media_url, // Database uses media_url, frontend uses content_url
    location: convertLocation(row.location),
    user_name: row.user_name,
    is_anonymous: row.is_anonymous,
    status: row.status,
    created_at: new Date(row.created_at),
    updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

function rowToPrayerResponse(row: PrayerResponseRow): PrayerResponse {
  return {
    id: row.id,
    prayer_id: row.prayer_id,
    responder_id: row.responder_id,
    responder_name: row.responder_name,
    is_anonymous: row.is_anonymous,
    message: row.message,
    content_type: row.content_type,
    content_url: row.content_url,
    created_at: new Date(row.created_at),
    read_at: row.read_at ? new Date(row.read_at) : null,
  };
}

function rowToPrayerConnection(row: PrayerConnectionRow): PrayerConnection {
  return {
    id: row.id,
    prayer_id: row.prayer_id,
    prayer_response_id: row.prayer_response_id,
    from_location: convertLocation(row.from_location),
    to_location: convertLocation(row.to_location),
    requester_name: row.requester_name,
    replier_name: row.replier_name,
    created_at: new Date(row.created_at),
    expires_at: new Date(row.expires_at),
  };
}

/**
 * Fetch ALL prayers globally for the GLOBAL LIVING MAP
 *
 * This function retrieves every active prayer from around the world,
 * making them visible to all users. This is the core of the Living Map concept -
 * a worldwide view of prayers connecting people across all geographic boundaries.
 *
 * @returns Promise<Prayer[]> - Array of all active prayers worldwide
 */
export async function fetchAllPrayers(): Promise<Prayer[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  // Create resilient operation with retry and circuit breaker
  const resilientFetch = createResilientOperation({
    operation: async () => {
      const { data, error } = await supabase.rpc('get_all_prayers');

      if (error) {
        console.error('Error fetching all prayers:', error);
        throw error;
      }

      return data as PrayerRow[];
    },
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      retryCondition: (error: Error) => {
        // Retry on network errors and transient failures
        const message = error.message.toLowerCase();
        return message.includes('network') || message.includes('timeout') || message.includes('fetch');
      },
    },
    timeout: 10000, // 10 second timeout
    circuitBreaker: supabaseCircuitBreaker,
    fallback: [],
  });

  try {
    const data = await resilientFetch();

    // Filter out moderated prayers (hidden or removed)
    // Only include prayers with no status, pending, approved, or active status
    const filteredData = data.filter(row => {
      const status = row.status;
      return !status || status === 'pending' || status === 'approved' || status === 'active';
    });

    return filteredData.map(rowToPrayer);
  } catch (error) {
    console.error('Failed to fetch all prayers:', error);
    return [];
  }
}

/**
 * Fetch ALL prayer connections globally for the GLOBAL LIVING MAP
 *
 * Prayer connections are the visual lines drawn on the map between
 * a prayer location and the location of someone who responded to it.
 * These connections represent the living web of faith and support
 * spanning across the globe.
 *
 * @returns Promise<PrayerConnection[]> - Array of all active prayer connections worldwide
 */
export async function fetchAllConnections(): Promise<PrayerConnection[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  try {
    // Call the Supabase RPC function to get all prayer connections globally
    const { data, error } = await supabase.rpc('get_all_connections');

    if (error) {
      console.error('Error fetching all connections:', error);
      throw error;
    }

    if (!data) {
      return [];
    }

    return (data as PrayerConnectionRow[]).map(rowToPrayerConnection);
  } catch (error) {
    console.error('Failed to fetch all connections:', error);
    return [];
  }
}

/**
 * Fetch prayers within a radius using PostGIS
 *
 * @deprecated Use fetchAllPrayers() instead for the GLOBAL LIVING MAP.
 * This function is kept for backward compatibility but the Living Map
 * concept displays all prayers globally, not just nearby ones.
 *
 * @param lat - Latitude of center point
 * @param lng - Longitude of center point
 * @param radiusKm - Radius in kilometers (default: 50km)
 */
export async function fetchNearbyPrayers(
  lat: number,
  lng: number,
  radiusKm: number = 50
): Promise<Prayer[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  try {
    // Using PostGIS ST_DWithin for efficient radius search
    // The database function expects lat, lng, and radius_km
    const { data, error } = await supabase
      .rpc('get_nearby_prayers', {
        lat: lat,
        lng: lng,
        radius_km: radiusKm,
      });

    if (error) {
      console.error('Error fetching nearby prayers:', error);
      throw error;
    }

    // Filter out moderated prayers (hidden or removed)
    // Only include prayers with no status, pending, approved, or active status
    const filteredData = (data as PrayerRow[]).filter(row => {
      const status = row.status;
      return !status || status === 'pending' || status === 'approved' || status === 'active';
    });

    return filteredData.map(rowToPrayer);
  } catch (error) {
    console.error('Failed to fetch nearby prayers:', error);
    return [];
  }
}

/**
 * Create a new prayer using RPC function for proper PostGIS geography handling
 */
export async function createPrayer(
  prayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>
): Promise<Prayer | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return null;
  }

  // Validate prayer data
  const validationResult = prayerSchema.validate({
    title: prayer.title,
    content: prayer.content,
    content_type: prayer.content_type,
    is_anonymous: prayer.is_anonymous,
    location: prayer.location,
  });

  if (!validationResult.valid) {
    console.error('Prayer validation failed:', validationResult.errors);
    throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
  }

  // Validate coordinates
  if (!validators.coordinates(prayer.location.lat, prayer.location.lng)) {
    throw new Error('Invalid coordinates');
  }

  // Sanitize content
  const sanitizedContent = prayer.content_type === 'text'
    ? sanitizeUserContent(prayer.content)
    : prayer.content;

  const sanitizedTitle = prayer.title
    ? sanitizeUserContent(prayer.title)
    : undefined;

  // Create resilient operation
  const resilientCreate = createResilientOperation({
    operation: async () => {
      const { data, error } = await supabase.rpc('create_prayer', {
        p_user_id: prayer.user_id,
        p_title: sanitizedTitle || '',
        p_content: sanitizedContent,
        p_content_type: prayer.content_type,
        p_content_url: prayer.content_url || '',
        p_lat: prayer.location.lat,
        p_lng: prayer.location.lng,
        p_user_name: prayer.user_name || '',
        p_is_anonymous: prayer.is_anonymous,
      });

      if (error) {
        console.error('Error creating prayer:', error);
        throw error;
      }

      // RPC returns an array, get the first element
      const prayerData = Array.isArray(data) ? data[0] : data;
      if (!prayerData) {
        throw new Error('No prayer data returned from create_prayer');
      }

      return prayerData as PrayerRow;
    },
    retry: {
      maxAttempts: 2, // Only retry once for mutations
      baseDelay: 1000,
    },
    timeout: 15000, // 15 second timeout for creation
    circuitBreaker: supabaseCircuitBreaker,
  });

  try {
    const prayerData = await resilientCreate();
    return rowToPrayer(prayerData);
  } catch (error) {
    console.error('Failed to create prayer:', error);
    return null;
  }
}

/**
 * Update an existing prayer
 */
export async function updatePrayer(
  prayerId: string,
  userId: string,
  updates: Partial<Pick<Prayer, 'title' | 'content' | 'content_url'>>
): Promise<Prayer | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return null;
  }

  try {
    // Map content_url to media_url for database
    const dbUpdates: {
      updated_at: string;
      title?: string;
      content?: string;
      media_url?: string;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.content_url !== undefined) dbUpdates.media_url = updates.content_url;

    const { data, error } = await supabase
      .from('prayers')
      .update(dbUpdates as never)
      .eq('id', prayerId)
      .eq('user_id', userId) // Ensure user owns the prayer
      .select()
      .single();

    if (error) {
      console.error('Error updating prayer:', error);
      throw error;
    }

    return rowToPrayer(data as PrayerRow);
  } catch (error) {
    console.error('Failed to update prayer:', error);
    return null;
  }
}

/**
 * Delete a prayer (and all associated responses/connections via CASCADE)
 */
export async function deletePrayer(
  prayerId: string,
  userId: string
): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return false;
  }

  try {
    const { error } = await supabase
      .from('prayers')
      .delete()
      .eq('id', prayerId)
      .eq('user_id', userId); // Ensure user owns the prayer

    if (error) {
      console.error('Error deleting prayer:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete prayer:', error);
    return false;
  }
}

/**
 * Delete a prayer response
 */
export async function deletePrayerResponse(
  responseId: string,
  responderId: string
): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return false;
  }

  try {
    const { error } = await supabase
      .from('prayer_responses')
      .delete()
      .eq('id', responseId)
      .eq('responder_id', responderId); // Ensure user owns the response

    if (error) {
      console.error('Error deleting prayer response:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete prayer response:', error);
    return false;
  }
}

/**
 * Respond to a prayer and create a connection
 */
export async function respondToPrayer(
  prayerId: string,
  responderId: string,
  responderName: string,
  message: string,
  contentType: 'text' | 'audio' | 'video',
  contentUrl?: string,
  isAnonymous: boolean = false,
  responderLocation?: { lat: number; lng: number }
): Promise<{ response: PrayerResponse; connection: any } | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return null;
  }

  // Validate response data
  const validationResult = prayerResponseSchema.validate({
    message,
    content_type: contentType,
    is_anonymous: isAnonymous,
  });

  if (!validationResult.valid) {
    console.error('Response validation failed:', validationResult.errors);
    throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
  }

  // Validate coordinates if provided
  if (responderLocation && !validators.coordinates(responderLocation.lat, responderLocation.lng)) {
    throw new Error('Invalid responder coordinates');
  }

  // Sanitize message
  const sanitizedMessage = contentType === 'text'
    ? sanitizeUserContent(message)
    : message;

  // Create resilient operation
  const resilientRespond = createResilientOperation({
    operation: async () => {
      // Create prayer response
      const { data: responseData, error: responseError } = await supabase
        .from('prayer_responses')
        .insert({
          prayer_id: prayerId,
          responder_id: responderId,
          responder_name: isAnonymous ? null : responderName,
          is_anonymous: isAnonymous,
          message: sanitizedMessage,
          content_type: contentType,
          content_url: contentUrl,
        })
        .select()
        .single();

      if (responseError) {
        console.error('Error creating prayer response:', responseError);
        throw responseError;
      }

      const response = rowToPrayerResponse(responseData as PrayerResponseRow);

      // Create prayer connection with RPC function if we have the responder's location
      let connectionData = null;
      if (responderLocation) {
        const { data, error: connectionError } = await supabase
          .rpc('create_prayer_connection', {
            p_prayer_id: prayerId,
            p_prayer_response_id: response.id,
            p_responder_lat: responderLocation.lat,
            p_responder_lng: responderLocation.lng,
          });

        if (connectionError) {
          console.error('Error creating prayer connection:', connectionError);
          // Don't throw - the response was created successfully
        } else {
          connectionData = data;
        }
      }

      return { response, connection: connectionData };
    },
    retry: {
      maxAttempts: 2,
      baseDelay: 1000,
    },
    timeout: 15000,
    circuitBreaker: supabaseCircuitBreaker,
  });

  try {
    return await resilientRespond();
  } catch (error) {
    console.error('Failed to respond to prayer:', error);
    return null;
  }
}

/**
 * Fetch all responses for a prayer
 */
export async function fetchPrayerResponses(prayerId: string): Promise<PrayerResponse[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('prayer_responses')
      .select('*')
      .eq('prayer_id', prayerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prayer responses:', error);
      throw error;
    }

    return (data as PrayerResponseRow[]).map(rowToPrayerResponse);
  } catch (error) {
    console.error('Failed to fetch prayer responses:', error);
    return [];
  }
}

/**
 * Fetch inbox - prayers where the user has received responses
 */
export async function fetchUserInbox(userId: string): Promise<
  Array<{
    prayer: Prayer;
    responses: PrayerResponse[];
    unreadCount: number;
  }>
> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  try {
    // Get all prayers created by the user that have responses
    const { data: prayers, error: prayersError } = await supabase
      .from('prayers')
      .select(`
        *,
        prayer_responses (*)
      `)
      .eq('user_id', userId)
      .not('prayer_responses', 'is', null);

    if (prayersError) {
      console.error('Error fetching inbox:', prayersError);
      throw prayersError;
    }

    // Transform the data
    return (prayers as any[]).map((row) => {
      const prayer = rowToPrayer(row as PrayerRow);
      const responses = (row.prayer_responses as PrayerResponseRow[]).map(rowToPrayerResponse);

      // Calculate unread count based on read_at being NULL
      const unreadCount = responses.filter((r: any) => !r.read_at).length;

      return {
        prayer,
        responses,
        unreadCount,
      };
    });
  } catch (error) {
    console.error('Failed to fetch user inbox:', error);
    return [];
  }
}

/**
 * Subscribe to ALL prayers globally in real-time for the GLOBAL LIVING MAP
 *
 * This subscription listens for any changes to prayers worldwide and
 * automatically fetches the updated global prayer list. This keeps the
 * Living Map dynamic and responsive to new prayers and updates from
 * anywhere in the world.
 *
 * @param callback - Function to call with updated prayer list
 * @returns Unsubscribe function
 */
export function subscribeToPrayers(
  callback: (prayers: Prayer[]) => void
) {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return () => {};
  }

  // Subscribe to all prayer inserts/updates globally
  const subscription = supabase
    .channel('global_prayers_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'prayers',
      },
      async () => {
        // Fetch all prayers globally when any change occurs
        const prayers = await fetchAllPrayers();
        callback(prayers);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Alias for subscribeToPrayers for backward compatibility
 * @see subscribeToPrayers
 */
export const subscribeToAllPrayers = subscribeToPrayers;

/**
 * Subscribe to nearby prayers in real-time
 *
 * @deprecated Use subscribeToPrayers() instead for the GLOBAL LIVING MAP.
 * The Living Map displays all prayers globally, not just nearby ones.
 */
export function subscribeToNearbyPrayers(
  lat: number,
  lng: number,
  radiusKm: number,
  callback: (prayers: Prayer[]) => void
) {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return () => {};
  }

  // Subscribe to all prayer inserts/updates
  const subscription = supabase
    .channel('prayers_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'prayers',
      },
      async () => {
        // Fetch updated nearby prayers
        const prayers = await fetchNearbyPrayers(lat, lng, radiusKm);
        callback(prayers);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Subscribe to prayer responses for a specific prayer
 */
export function subscribeToPrayerResponses(
  prayerId: string,
  callback: (responses: PrayerResponse[]) => void
) {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return () => {};
  }

  const subscription = supabase
    .channel(`prayer_responses_${prayerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'prayer_responses',
        filter: `prayer_id=eq.${prayerId}`,
      },
      async () => {
        const responses = await fetchPrayerResponses(prayerId);
        callback(responses);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Subscribe to user's inbox updates
 */
export function subscribeToUserInbox(userId: string, callback: (inbox: any[]) => void) {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return () => {};
  }

  const subscription = supabase
    .channel(`user_inbox_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'prayer_responses',
      },
      async () => {
        const inbox = await fetchUserInbox(userId);
        callback(inbox);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * GLOBAL LIVING MAP: Subscribe to ALL prayer connections worldwide in real-time
 *
 * Real-time updates for all prayer connections as they're created anywhere
 * in the world, making the Living Map truly dynamic and responsive.
 *
 * @param callback - Function called with updated global connections list on any change
 * @returns Unsubscribe function
 */
export function subscribeToAllConnections(callback: (connections: PrayerConnection[]) => void) {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return () => {};
  }

  // Subscribe to all connection inserts/updates globally
  const subscription = supabase
    .channel('global_connections_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'prayer_connections',
      },
      async () => {
        // Fetch all updated connections globally
        const connections = await fetchAllConnections();
        callback(connections);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Mark a single prayer response as read
 */
export async function markResponseAsRead(responseId: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return false;
  }

  try {
    const { data, error } = await supabase
      .rpc('mark_response_as_read', {
        response_id: responseId,
      });

    if (error) {
      console.error('Error marking response as read:', error);
      throw error;
    }

    return data === true;
  } catch (error) {
    console.error('Failed to mark response as read:', error);
    return false;
  }
}

/**
 * Mark all responses for a prayer as read
 */
export async function markAllResponsesRead(prayerId: string): Promise<number> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return 0;
  }

  try {
    const { data, error } = await supabase
      .rpc('mark_all_responses_read', {
        prayer_id_param: prayerId,
      });

    if (error) {
      console.error('Error marking all responses as read:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('Failed to mark all responses as read:', error);
    return 0;
  }
}

/**
 * Get total unread response count for the current user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return 0;
  }

  try {
    const { data, error } = await supabase
      .rpc('get_unread_count', {
        user_id_param: userId,
      });

    if (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }

    return data || 0;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}

/**
 * Get unread counts per prayer for the current user
 */
export async function getUnreadCountsByPrayer(userId: string): Promise<
  Array<{ prayer_id: string; unread_count: number }>
> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  try {
    const { data, error } = await supabase
      .rpc('get_unread_counts_by_prayer', {
        user_id_param: userId,
      });

    if (error) {
      console.error('Error getting unread counts by prayer:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get unread counts by prayer:', error);
    return [];
  }
}
