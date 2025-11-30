/**
 * Living Map Integration Service
 * 
 * Connects conversation threading with Living Map memorial lines,
 * creating visual prayer journey connections on the map.
 */

import { supabase } from '../lib/supabase';
import { ConversationService } from './conversationService';
import type {
  ThreadMessage,
  ConversationThread,
  MemorialLineData,
  PrayerJourney
} from '../types/conversation';
import type { Prayer, PrayerConnection } from '../types/prayer';

export interface MemorialLineConnection {
  id: string;
  conversationId: string;
  messageId: string;
  prayerId: string;
  fromUserId: string;
  toUserId: string;
  fromLocation: { lat: number; lng: number };
  toLocation: { lat: number; lng: number };
  connectionType: 'prayer_response' | 'ongoing_prayer' | 'answered_prayer';
  isEternal: boolean;
  visualStyle: {
    color: string;
    thickness: number;
    animation: 'pulse' | 'flow' | 'static';
    opacity: number;
  };
  createdAt: Date;
  expiresAt?: Date;
  metadata: {
    conversationTitle: string;
    messageType: string;
    prayerCategory?: string;
    scriptureReference?: string;
    participantCount: number;
  };
}

export interface LiveMapUpdate {
  type: 'memorial_line_created' | 'memorial_line_updated' | 'prayer_answered' | 'conversation_activity';
  memorialLineId: string;
  data: Partial<MemorialLineConnection>;
  timestamp: Date;
}

export class LivingMapIntegrationService {
  
  /**
   * Creates a memorial line when a prayer response is sent
   */
  static async createPrayerResponseMemorialLine(
    message: ThreadMessage,
    conversation: ConversationThread,
    prayer: Prayer
  ): Promise<MemorialLineConnection | null> {
    try {
      // Get user locations for the memorial line
      const fromLocation = await this.getUserLocation(message.senderId);
      const toLocation = prayer.location;
      
      if (!fromLocation || !toLocation) {
        console.log('Missing location data for memorial line creation');
        return null;
      }
      
      // Determine visual style based on message type and spiritual context
      const visualStyle = this.getVisualStyleForMessage(message);
      
      // Create memorial line data
      const memorialData: MemorialLineData = {
        fromLocation,
        toLocation,
        prayerId: prayer.id,
        connectionType: 'prayer_response',
        isEternal: message.messageType === 'testimony' || 
                  message.spiritualContext?.isAnsweredPrayer || false,
        visualStyle
      };
      
      // Insert into database
      const { data, error } = await supabase
        .from('prayer_connections')
        .insert({
          prayer_id: prayer.id,
          from_user_id: message.senderId,
          to_user_id: prayer.user_id,
          from_location: `POINT(${fromLocation.lng} ${fromLocation.lat})`,
          to_location: `POINT(${toLocation.lng} ${toLocation.lat})`,
          message_id: message.id,
          conversation_id: conversation.id,
          connection_type: memorialData.connectionType,
          is_eternal: memorialData.isEternal,
          visual_style: JSON.stringify(visualStyle),
          expires_at: memorialData.isEternal 
            ? null 
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          metadata: JSON.stringify({
            conversationTitle: conversation.title,
            messageType: message.messageType,
            prayerCategory: message.prayerCategory,
            scriptureReference: message.scriptureReference,
            participantCount: conversation.participantIds.length
          })
        })
        .select('*')
        .single();
      
      if (error) throw error;
      
      console.log('Created memorial line for prayer response:', {
        memorialLineId: data.id,
        prayerId: prayer.id,
        messageId: message.id,
        conversationId: conversation.id,
        isEternal: memorialData.isEternal
      });
      
      // Return formatted memorial line connection
      return this.formatMemorialLineConnection(data);
      
    } catch (error) {
      console.error('Failed to create memorial line:', error);
      return null;
    }
  }
  
  /**
   * Updates memorial line when prayer is answered
   */
  static async markPrayerAsAnswered(
    prayerId: string,
    testimonyMessage: ThreadMessage,
    conversation: ConversationThread
  ): Promise<void> {
    try {
      // Update existing memorial lines to eternal status
      const { error } = await supabase
        .from('prayer_connections')
        .update({
          is_eternal: true,
          connection_type: 'answered_prayer',
          expires_at: null,
          visual_style: JSON.stringify(this.getAnsweredPrayerVisualStyle()),
          updated_at: new Date().toISOString(),
          testimony_message_id: testimonyMessage.id
        })
        .eq('prayer_id', prayerId);
      
      if (error) throw error;
      
      console.log('Updated memorial lines for answered prayer:', {
        prayerId,
        testimonyMessageId: testimonyMessage.id,
        conversationId: conversation.id
      });
      
      // Broadcast real-time update
      await this.broadcastLiveMapUpdate({
        type: 'prayer_answered',
        memorialLineId: prayerId, // Using prayer ID as identifier
        data: {
          connectionType: 'answered_prayer',
          isEternal: true,
          visualStyle: this.getAnsweredPrayerVisualStyle()
        },
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Failed to update memorial lines for answered prayer:', error);
    }
  }
  
  /**
   * Gets all memorial lines for a specific prayer journey
   */
  static async getPrayerJourneyMemorialLines(prayerId: string): Promise<MemorialLineConnection[]> {
    try {
      const { data, error } = await supabase
        .from('prayer_connections')
        .select('*')
        .eq('prayer_id', prayerId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data.map(row => this.formatMemorialLineConnection(row));
      
    } catch (error) {
      console.error('Failed to get prayer journey memorial lines:', error);
      return [];
    }
  }
  
  /**
   * Gets all active memorial lines for map display
   */
  static async getActiveMemorialLines(
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    limit: number = 500
  ): Promise<MemorialLineConnection[]> {
    try {
      let query = supabase
        .from('prayer_connections')
        .select('*')
        .or('is_eternal.eq.true,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Apply spatial bounds if provided
      if (bounds) {
        query = query
          .gte('from_location->coordinates[1]', bounds.south)
          .lte('from_location->coordinates[1]', bounds.north)
          .gte('from_location->coordinates[0]', bounds.west)
          .lte('from_location->coordinates[0]', bounds.east);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.map(row => this.formatMemorialLineConnection(row));
      
    } catch (error) {
      console.error('Failed to get active memorial lines:', error);
      return [];
    }
  }
  
  /**
   * Gets conversation-related memorial lines
   */
  static async getConversationMemorialLines(conversationId: string): Promise<MemorialLineConnection[]> {
    try {
      const { data, error } = await supabase
        .from('prayer_connections')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data.map(row => this.formatMemorialLineConnection(row));
      
    } catch (error) {
      console.error('Failed to get conversation memorial lines:', error);
      return [];
    }
  }
  
  /**
   * Creates memorial lines for scripture sharing
   */
  static async createScriptureShareMemorialLine(
    message: ThreadMessage,
    conversation: ConversationThread
  ): Promise<MemorialLineConnection | null> {
    try {
      if (!message.scriptureReference || !message.scriptureText) {
        return null;
      }
      
      const senderLocation = await this.getUserLocation(message.senderId);
      if (!senderLocation) return null;
      
      // Create a scripture sharing memorial line that connects to multiple participants
      const memorialLines: MemorialLineConnection[] = [];
      
      for (const participantId of conversation.participantIds) {
        if (participantId === message.senderId) continue;
        
        const participantLocation = await this.getUserLocation(participantId);
        if (!participantLocation) continue;
        
        const { data, error } = await supabase
          .from('prayer_connections')
          .insert({
            prayer_id: conversation.prayerId,
            from_user_id: message.senderId,
            to_user_id: participantId,
            from_location: `POINT(${senderLocation.lng} ${senderLocation.lat})`,
            to_location: `POINT(${participantLocation.lng} ${participantLocation.lat})`,
            message_id: message.id,
            conversation_id: conversation.id,
            connection_type: 'ongoing_prayer',
            is_eternal: false,
            visual_style: JSON.stringify(this.getScriptureShareVisualStyle()),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            metadata: JSON.stringify({
              conversationTitle: conversation.title,
              messageType: message.messageType,
              scriptureReference: message.scriptureReference,
              scriptureText: message.scriptureText?.substring(0, 200),
              participantCount: conversation.participantIds.length
            })
          })
          .select('*')
          .single();
        
        if (!error && data) {
          memorialLines.push(this.formatMemorialLineConnection(data));
        }
      }
      
      return memorialLines[0] || null;
      
    } catch (error) {
      console.error('Failed to create scripture share memorial line:', error);
      return null;
    }
  }
  
  /**
   * Gets prayer journey with full context including conversations and memorial lines
   */
  static async getCompletePrayerJourney(prayerId: string): Promise<PrayerJourney> {
    try {
      // Use conversation service to get the basic prayer journey
      const journey = await ConversationService.getPrayerJourney(prayerId);
      
      // Enhance with memorial lines data
      const memorialLines = await this.getPrayerJourneyMemorialLines(prayerId);
      
      // Add visual journey data
      const visualJourney = this.createVisualPrayerJourney(journey, memorialLines);
      
      return {
        ...journey,
        memorialLines: memorialLines,
        visualJourney
      } as any; // Extended interface
      
    } catch (error) {
      console.error('Failed to get complete prayer journey:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  private static async getUserLocation(userId: string): Promise<{ lat: number; lng: number } | null> {
    try {
      // In a real implementation, this would get the user's current or last known location
      // For now, we'll use a placeholder implementation
      const { data, error } = await supabase
        .from('user_locations')
        .select('latitude, longitude')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        // Fallback to a default location or return null
        return null;
      }
      
      return {
        lat: data.latitude,
        lng: data.longitude
      };
    } catch (error) {
      console.error('Failed to get user location:', error);
      return null;
    }
  }
  
  private static getVisualStyleForMessage(message: ThreadMessage) {
    const baseStyle = {
      thickness: 2,
      opacity: 0.8,
      animation: 'pulse' as const
    };
    
    switch (message.messageType) {
      case 'prayer_response':
        return {
          ...baseStyle,
          color: '#3B82F6', // Blue
          animation: 'flow' as const
        };
      case 'testimony':
        return {
          ...baseStyle,
          color: '#10B981', // Green
          thickness: 3,
          animation: 'pulse' as const
        };
      case 'scripture_share':
        return {
          ...baseStyle,
          color: '#F59E0B', // Amber
          animation: 'static' as const
        };
      case 'encouragement':
        return {
          ...baseStyle,
          color: '#EC4899', // Pink
          animation: 'pulse' as const
        };
      default:
        return {
          ...baseStyle,
          color: '#6B7280' // Gray
        };
    }
  }
  
  private static getAnsweredPrayerVisualStyle() {
    return {
      color: '#10B981', // Green for answered prayers
      thickness: 4,
      opacity: 1.0,
      animation: 'pulse' as const
    };
  }
  
  private static getScriptureShareVisualStyle() {
    return {
      color: '#F59E0B', // Amber for scripture
      thickness: 2,
      opacity: 0.7,
      animation: 'static' as const
    };
  }
  
  private static formatMemorialLineConnection(data: any): MemorialLineConnection {
    const fromCoords = data.from_location?.coordinates || [0, 0];
    const toCoords = data.to_location?.coordinates || [0, 0];
    
    return {
      id: data.id,
      conversationId: data.conversation_id,
      messageId: data.message_id,
      prayerId: data.prayer_id,
      fromUserId: data.from_user_id,
      toUserId: data.to_user_id,
      fromLocation: {
        lat: fromCoords[1],
        lng: fromCoords[0]
      },
      toLocation: {
        lat: toCoords[1],
        lng: toCoords[0]
      },
      connectionType: data.connection_type,
      isEternal: data.is_eternal,
      visualStyle: data.visual_style ? JSON.parse(data.visual_style) : this.getVisualStyleForMessage({} as any),
      createdAt: new Date(data.created_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      metadata: data.metadata ? JSON.parse(data.metadata) : {}
    };
  }
  
  private static createVisualPrayerJourney(
    journey: PrayerJourney, 
    memorialLines: MemorialLineConnection[]
  ) {
    // Create a visual representation of the prayer journey
    return {
      totalConnections: memorialLines.length,
      eternalConnections: memorialLines.filter(ml => ml.isEternal).length,
      geographicSpread: this.calculateGeographicSpread(memorialLines),
      timeline: journey.prayerTimeline,
      visualElements: memorialLines.map(ml => ({
        id: ml.id,
        type: 'memorial_line',
        coordinates: [ml.fromLocation, ml.toLocation],
        style: ml.visualStyle,
        metadata: ml.metadata
      }))
    };
  }
  
  private static calculateGeographicSpread(memorialLines: MemorialLineConnection[]) {
    if (memorialLines.length === 0) return { distance: 0, center: null };
    
    const allPoints = memorialLines.flatMap(ml => [ml.fromLocation, ml.toLocation]);
    
    // Calculate bounding box
    const minLat = Math.min(...allPoints.map(p => p.lat));
    const maxLat = Math.max(...allPoints.map(p => p.lat));
    const minLng = Math.min(...allPoints.map(p => p.lng));
    const maxLng = Math.max(...allPoints.map(p => p.lng));
    
    // Calculate center point
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Calculate approximate distance in km
    const latDistance = (maxLat - minLat) * 111; // Rough km per degree
    const lngDistance = (maxLng - minLng) * 111 * Math.cos(centerLat * Math.PI / 180);
    const maxDistance = Math.sqrt(latDistance * latDistance + lngDistance * lngDistance);
    
    return {
      distance: Math.round(maxDistance),
      center: { lat: centerLat, lng: centerLng },
      bounds: { minLat, maxLat, minLng, maxLng }
    };
  }
  
  private static async broadcastLiveMapUpdate(update: LiveMapUpdate): Promise<void> {
    try {
      // Broadcast to all connected clients via Supabase realtime
      const channel = supabase.channel('living_map_updates');
      
      await channel.send({
        type: 'broadcast',
        event: 'map_update',
        payload: update
      });
      
    } catch (error) {
      console.error('Failed to broadcast live map update:', error);
    }
  }
  
  /**
   * Sets up real-time subscription for memorial line updates
   */
  static subscribeToMemorialLineUpdates(
    callback: (update: LiveMapUpdate) => void
  ): () => void {
    const channel = supabase.channel('living_map_updates');
    
    channel
      .on('broadcast', { event: 'map_update' }, (payload) => {
        callback(payload.payload as LiveMapUpdate);
      })
      .subscribe();
    
    console.log('Subscribed to living map updates');
    
    return () => {
      channel.unsubscribe();
      console.log('Unsubscribed from living map updates');
    };
  }
  
  /**
   * Gets memorial line statistics for analytics
   */
  static async getMemorialLineStats(): Promise<{
    totalLines: number;
    eternalLines: number;
    activeLines: number;
    topPrayerCategories: string[];
    recentActivity: number;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_memorial_line_statistics');
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Failed to get memorial line statistics:', error);
      return {
        totalLines: 0,
        eternalLines: 0,
        activeLines: 0,
        topPrayerCategories: [],
        recentActivity: 0
      };
    }
  }
}

// Database function for memorial line statistics (to be added to migration)
export const MEMORIAL_LINE_STATS_FUNCTION = `
CREATE OR REPLACE FUNCTION get_memorial_line_statistics()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result JSON;
BEGIN
    WITH stats AS (
        SELECT 
            COUNT(*) as total_lines,
            COUNT(*) FILTER (WHERE is_eternal = true) as eternal_lines,
            COUNT(*) FILTER (WHERE expires_at > now() OR is_eternal = true) as active_lines,
            COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '7 days') as recent_activity
        FROM prayer_connections
    ),
    top_categories AS (
        SELECT 
            metadata->>'prayerCategory' as category,
            COUNT(*) as count
        FROM prayer_connections
        WHERE metadata->>'prayerCategory' IS NOT NULL
        GROUP BY metadata->>'prayerCategory'
        ORDER BY count DESC
        LIMIT 5
    )
    SELECT json_build_object(
        'totalLines', s.total_lines,
        'eternalLines', s.eternal_lines,
        'activeLines', s.active_lines,
        'recentActivity', s.recent_activity,
        'topPrayerCategories', array_agg(tc.category)
    ) INTO result
    FROM stats s
    CROSS JOIN top_categories tc;
    
    RETURN result;
END;
$$;
`;