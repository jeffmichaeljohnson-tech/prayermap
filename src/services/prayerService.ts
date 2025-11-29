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
  message: string;
  content_type: 'text' | 'audio' | 'video';
  media_url?: string; // Database uses media_url, not content_url
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

function rowToPrayerResponse(row: PrayerResponseRow & { responder_name?: string; is_anonymous?: boolean }): PrayerResponse {
  return {
    id: row.id,
    prayer_id: row.prayer_id,
    responder_id: row.responder_id,
    responder_name: row.responder_name || null, // Will be populated when joined with profiles
    is_anonymous: row.is_anonymous || false, // Default to false for now
    message: row.message,
    content_type: row.content_type,
    content_url: row.media_url, // Map media_url to content_url for frontend consistency
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
 * Fetch prayers globally for the GLOBAL LIVING MAP
 *
 * This function retrieves active prayers from around the world,
 * making them visible to all users. This is the core of the Living Map concept -
 * a worldwide view of prayers connecting people across all geographic boundaries.
 *
 * PERFORMANCE: Server-side limiting via RPC function for optimal mobile performance.
 * The limit is enforced at the database level, reducing data transfer and improving
 * battery life on mobile devices.
 *
 * NOTE: Requires database migration to add limit_count parameter to get_all_prayers RPC.
 * See MIGRATION_NEEDED_limit_count.md for details.
 *
 * @param limit - Maximum number of prayers to return (default: 500, max: 1000)
 * @returns Promise<Prayer[]> - Array of active prayers worldwide
 */
export async function fetchAllPrayers(limit: number = 500): Promise<Prayer[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  // Enforce hard limit for mobile performance
  const safeLimit = Math.min(limit, 1000);

  try {
    // Call the Supabase RPC function to get all prayers globally
    // Pass limit_count parameter for server-side limiting (better mobile performance)
    const { data, error } = await supabase.rpc('get_all_prayers', {
      limit_count: safeLimit
    });

    if (error) {
      console.error('Error fetching all prayers:', error);
      throw error;
    }

    // Filter out moderated prayers (hidden or removed)
    // Only include prayers with no status, pending, approved, or active status
    // Note: This is still needed client-side because RLS policies may return
    // user's own prayers regardless of status
    const filteredData = (data as PrayerRow[]).filter(row => {
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
 * Fetch prayer connections globally for the GLOBAL LIVING MAP
 *
 * Prayer connections are the visual lines drawn on the map between
 * a prayer location and the location of someone who responded to it.
 * These connections represent the living web of faith and support
 * spanning across the globe.
 *
 * PERFORMANCE: Limited to 200 connections for mobile performance.
 *
 * @param limit - Maximum connections to return (default: 200, max: 500)
 * @returns Promise<PrayerConnection[]> - Array of active prayer connections worldwide
 */
export async function fetchAllConnections(limit: number = 200): Promise<PrayerConnection[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  // Enforce hard limit for mobile performance
  const safeLimit = Math.min(limit, 500);

  try {
    // Call the Supabase RPC function to get all prayer connections globally
    // Note: RPC function doesn't support limit yet, applying client-side
    const { data, error } = await supabase.rpc('get_all_connections');

    if (error) {
      console.error('Error fetching all connections:', error);
      throw error;
    }

    if (!data) {
      return [];
    }

    // Apply client-side limit for mobile performance
    const limitedData = (data as PrayerConnectionRow[]).slice(0, safeLimit);

    return limitedData.map(rowToPrayerConnection);
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

  try {
    // Use RPC function to properly create prayer with PostGIS geography
    const { data, error } = await supabase.rpc('create_prayer', {
      p_user_id: prayer.user_id,
      p_title: prayer.title || '',
      p_content: prayer.content,
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
      console.error('No prayer data returned from create_prayer');
      return null;
    }

    return rowToPrayer(prayerData as PrayerRow);
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

  try {
    // Create prayer response
    console.log('Creating prayer response:', { prayerId, responderId, message, contentType, isAnonymous });
    const { data: responseData, error: responseError } = await supabase
      .from('prayer_responses')
      .insert({
        prayer_id: prayerId,
        responder_id: responderId,
        message,
        content_type: contentType,
        media_url: contentUrl, // Changed from content_url to media_url to match schema
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
 *
 * PERFORMANCE: Optimized for mobile with:
 * - Specific column selection (no SELECT *)
 * - Limited to 50 prayers with responses
 * - Responses limited to 20 most recent per prayer
 *
 * @param userId - The user's ID
 * @param limit - Maximum prayers to return (default: 50)
 */
export async function fetchUserInbox(
  userId: string,
  limit: number = 50
): Promise<
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
    console.log('Fetching inbox for user:', userId);
    
    // Step 1: Get all prayers by the user 
    const { data: userPrayers, error: prayersError } = await supabase
      .from('prayers')
      .select('id, user_id, title, content, content_type, media_url, location, user_name, is_anonymous, status, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (prayersError) {
      console.error('Error fetching user prayers:', prayersError);
      throw prayersError;
    }

    console.log('Found', userPrayers?.length || 0, 'prayers by user');

    if (!userPrayers || userPrayers.length === 0) {
      console.log('User has no prayers, returning empty inbox');
      return [];
    }

    const prayerIds = userPrayers.map(p => p.id);

    // Step 2: Get all responses to those prayers with responder profiles
    const { data: responseData, error: responseError } = await supabase
      .from('prayer_responses')
      .select(`
        id, prayer_id, responder_id, message, content_type, media_url, created_at, read_at,
        profiles!prayer_responses_responder_id_fkey (
          display_name
        )
      `)
      .in('prayer_id', prayerIds)
      .order('created_at', { ascending: false });

    if (responseError) {
      console.error('Error fetching prayer responses:', responseError);
      throw responseError;
    }

    console.log('Found', responseData?.length || 0, 'responses to user prayers');

    if (!responseData || responseData.length === 0) {
      console.log('No responses found, returning empty inbox');
      return [];
    }

    // Step 3: Group responses by prayer and create inbox items
    const responsesByPrayer = new Map<string, any[]>();
    responseData.forEach((response: any) => {
      const prayerId = response.prayer_id;
      if (!responsesByPrayer.has(prayerId)) {
        responsesByPrayer.set(prayerId, []);
      }
      responsesByPrayer.get(prayerId)!.push(response);
    });

    // Step 4: Create inbox items only for prayers that have responses
    const inboxItems = userPrayers
      .filter(prayer => responsesByPrayer.has(prayer.id))
      .map(prayerRow => {
        const responses = responsesByPrayer.get(prayerRow.id) || [];
        
        // Convert prayer row to Prayer object
        const prayer = rowToPrayer(prayerRow as PrayerRow);
        
        // Limit responses to 20 most recent per prayer for performance
        const sortedResponses = responses
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20)
          .map(response => rowToPrayerResponse({
            ...response,
            responder_name: response.profiles?.display_name || 'Anonymous',
            is_anonymous: !response.profiles?.display_name
          }));

        // Calculate unread count based on read_at being NULL
        const unreadCount = responses.filter(r => !r.read_at).length;

        return {
          prayer,
          responses: sortedResponses,
          unreadCount,
        };
      })
      .sort((a, b) => b.prayer.created_at.getTime() - a.prayer.created_at.getTime())
      .slice(0, limit);

    console.log('Returning', inboxItems.length, 'inbox items with responses');
    inboxItems.forEach(item => {
      console.log('- Prayer:', item.prayer.id, 'has', item.responses.length, 'responses,', item.unreadCount, 'unread');
    });

    return inboxItems;

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
