import { supabase } from '../lib/supabase';
import type { Prayer, PrayerResponse, PrayerConnection } from '../types/prayer';

// Database table schemas
interface PrayerRow {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  content_type: 'text' | 'audio' | 'video';
  media_url?: string; // Database column name (maps to content_url in Prayer type)
  location: { lat: number; lng: number } | string; // PostGIS POINT or JSON
  user_name?: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at?: string;
}

interface PrayerResponseRow {
  id: string;
  prayer_id: string;
  responder_id: string;
  is_anonymous: boolean | null;
  message: string | null;
  content_type: 'text' | 'audio' | 'video';
  media_url?: string | null; // Database column (maps to content_url in PrayerResponse type)
  created_at: string;
  read_at?: string | null;
}

interface PrayerConnectionRow {
  id: string;
  prayer_id: string;
  from_user_id: string;
  to_user_id: string;
  from_location: { lat: number; lng: number } | string;
  to_location: { lat: number; lng: number } | string;
  created_at: string;
  expires_at: string | null;
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

  // Handle WKB hex string format from PostGIS (e.g., "0101000020E6100000...")
  if (typeof location === 'string' && location.startsWith('0101000020')) {
    // WKB format - we need to use ST_AsText in the query instead
    // For now, return placeholder and fix the query to use ST_AsText
    console.warn('WKB format detected - query should use ST_AsText:', location.substring(0, 20) + '...');
    return { lat: 0, lng: 0 };
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
    content_url: row.media_url, // Map database 'media_url' to Prayer 'content_url'
    location: convertLocation(row.location),
    user_name: row.user_name,
    is_anonymous: row.is_anonymous,
    created_at: new Date(row.created_at),
    updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

function rowToPrayerResponse(row: PrayerResponseRow): PrayerResponse {
  return {
    id: row.id,
    prayer_id: row.prayer_id,
    responder_id: row.responder_id,
    responder_name: undefined, // Not stored in database - lookup separately if needed
    is_anonymous: row.is_anonymous,
    message: row.message,
    content_type: row.content_type,
    content_url: row.media_url ?? undefined, // Map database 'media_url' to PrayerResponse 'content_url'
    created_at: new Date(row.created_at),
  };
}

function rowToPrayerConnection(row: PrayerConnectionRow): PrayerConnection {
  // Calculate expiresAt: if null, default to 1 year from creation (memorial lines are eternal)
  const createdAt = new Date(row.created_at);
  const expiresAt = row.expires_at
    ? new Date(row.expires_at)
    : new Date(createdAt.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from creation

  return {
    id: row.id,
    prayerId: row.prayer_id,
    fromLocation: convertLocation(row.from_location),
    toLocation: convertLocation(row.to_location),
    // Names not stored in DB - use placeholder (component should look these up if needed)
    requesterName: 'Prayer Requester',
    replierName: 'Prayer Supporter',
    createdAt,
    expiresAt,
  };
}

/**
 * Fetch prayers within a radius using PostGIS
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

    return (data as PrayerRow[]).map(rowToPrayer);
  } catch (error) {
    console.error('Failed to fetch nearby prayers:', error);
    return [];
  }
}

/**
 * Create a new prayer using direct table insert with PostGIS point
 */
export async function createPrayer(
  prayer: Omit<Prayer, 'id' | 'created_at' | 'updated_at'>
): Promise<Prayer | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return null;
  }

  try {
    // Use direct insert with ST_MakePoint for PostGIS compatibility
    // Note: database column is 'media_url', but Prayer type uses 'content_url'
    const { data, error } = await supabase
      .from('prayers')
      .insert({
        user_id: prayer.user_id,
        title: prayer.title || null,
        content: prayer.content,
        content_type: prayer.content_type,
        media_url: prayer.content_url || null,
        location: `POINT(${prayer.location.lng} ${prayer.location.lat})`,
        user_name: prayer.user_name || null,
        is_anonymous: prayer.is_anonymous,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prayer:', error);
      throw error;
    }

    return rowToPrayer(data as PrayerRow);
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
    const { data, error } = await supabase
      .from('prayers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
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
    // Note: responder_name column doesn't exist in DB, is_anonymous and media_url do
    const { data: responseData, error: responseError } = await supabase
      .from('prayer_responses')
      .insert({
        prayer_id: prayerId,
        responder_id: responderId,
        is_anonymous: isAnonymous,
        message,
        content_type: contentType,
        media_url: contentUrl || null,
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
    // Get all prayers created by the user with their responses
    const { data: prayers, error: prayersError } = await supabase
      .from('prayers')
      .select(`
        *,
        prayer_responses (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (prayersError) {
      console.error('Error fetching inbox:', prayersError);
      throw prayersError;
    }

    console.log('[Inbox] Raw prayers data:', prayers?.length, 'prayers for user', userId);

    // Filter to only prayers that have responses and transform the data
    const inboxItems = (prayers as any[])
      .filter((row) => row.prayer_responses && row.prayer_responses.length > 0)
      .map((row) => {
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

    console.log('[Inbox] Prayers with responses:', inboxItems.length);

    return inboxItems;
  } catch (error) {
    console.error('Failed to fetch user inbox:', error);
    return [];
  }
}

/**
 * Subscribe to nearby prayers in real-time
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

/**
 * Fetch all prayer connections (memorial lines) that haven't expired
 * These are the eternal lines connecting prayers to those who responded
 */
export async function fetchPrayerConnections(): Promise<PrayerConnection[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  try {
    // Use RPC to get connections with properly extracted lat/lng from PostGIS
    const { data, error } = await supabase
      .rpc('get_prayer_connections');

    if (error) {
      console.error('Error fetching prayer connections:', error);
      // Fallback to direct query if RPC doesn't exist
      return fetchPrayerConnectionsFallback();
    }

    console.log('[PrayerService] Fetched prayer connections via RPC:', data?.length || 0);

    // RPC returns: id, prayer_id, from_user_id, to_user_id, from_lat, from_lng, to_lat, to_lng, created_at, expires_at
    return (data || []).map((row: any) => ({
      id: row.id,
      prayerId: row.prayer_id,
      fromLocation: { lat: row.from_lat, lng: row.from_lng },
      toLocation: { lat: row.to_lat, lng: row.to_lng },
      requesterName: 'Prayer Requester',
      replierName: 'Prayer Supporter',
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at
        ? new Date(row.expires_at)
        : new Date(new Date(row.created_at).getTime() + 365 * 24 * 60 * 60 * 1000),
    }));
  } catch (error) {
    console.error('Failed to fetch prayer connections:', error);
    return [];
  }
}

/**
 * Fallback for fetching connections without RPC (may have coordinate issues)
 */
async function fetchPrayerConnectionsFallback(): Promise<PrayerConnection[]> {
  if (!supabase) return [];

  try {
    // Fetch all connections - expires_at is NULL for eternal lines
    const { data, error } = await supabase
      .from('prayer_connections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error in fallback fetch:', error);
      return [];
    }

    console.log('[PrayerService] Fetched connections (fallback):', data?.length || 0);
    return (data as PrayerConnectionRow[]).map(rowToPrayerConnection);
  } catch (error) {
    console.error('Failed fallback fetch:', error);
    return [];
  }
}

/**
 * Fetch prayer connections within a geographic radius
 * @param lat - Latitude of center point
 * @param lng - Longitude of center point
 * @param radiusKm - Radius in kilometers
 */
export async function fetchNearbyPrayerConnections(
  lat: number,
  lng: number,
  radiusKm: number = 50
): Promise<PrayerConnection[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return [];
  }

  try {
    // For now, fetch all connections and filter client-side
    // TODO: Add PostGIS spatial query for connections if needed for performance
    const { data, error } = await supabase
      .from('prayer_connections')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching nearby prayer connections:', error);
      throw error;
    }

    console.log('[PrayerService] Fetched nearby connections:', data?.length || 0);
    return (data as PrayerConnectionRow[]).map(rowToPrayerConnection);
  } catch (error) {
    console.error('Failed to fetch nearby prayer connections:', error);
    return [];
  }
}

/**
 * Subscribe to prayer connections in real-time
 * Memorial lines should appear instantly when someone prays
 */
export function subscribeToPrayerConnections(
  callback: (connections: PrayerConnection[]) => void
): () => void {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return () => {};
  }

  console.log('[PrayerService] Setting up prayer connections subscription');

  const subscription = supabase
    .channel('prayer_connections_channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'prayer_connections',
      },
      async (payload) => {
        console.log('[PrayerService] Prayer connection change detected:', payload.eventType);
        // Fetch all current connections
        const connections = await fetchPrayerConnections();
        callback(connections);
      }
    )
    .subscribe((status) => {
      console.log('[PrayerService] Prayer connections subscription status:', status);
    });

  return () => {
    console.log('[PrayerService] Unsubscribing from prayer connections');
    subscription.unsubscribe();
  };
}
