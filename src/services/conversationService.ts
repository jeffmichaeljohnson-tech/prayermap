/**
 * PrayerMap Conversation Management Service
 * 
 * Sophisticated conversation threading and message management service
 * with prayer-centric workflows and Living Map integration.
 */

import { supabase } from '../lib/supabase';
import type {
  ConversationThread,
  ThreadMessage,
  ConversationParticipant,
  ConversationFilters,
  MessageSearchFilters,
  CreateConversationRequest,
  SendMessageRequest,
  UpdateConversationRequest,
  SearchResult,
  ConversationAnalytics,
  PrayerJourney,
  SpiritualContext,
  MemorialLineData
} from '../types/conversation';
import type { Prayer } from '../types/prayer';

// ============================================================================
// CONVERSATION THREAD MANAGEMENT
// ============================================================================

export class ConversationService {
  
  /**
   * Creates a new conversation thread from a prayer response
   */
  static async createPrayerConversation(
    prayerId: string,
    responderId: string,
    initialMessage: string,
    messageType: 'prayer_response' | 'encouragement' = 'prayer_response'
  ): Promise<ConversationThread> {
    try {
      // Call the database function to create the conversation
      const { data, error } = await supabase
        .rpc('create_prayer_conversation', {
          prayer_id_param: prayerId,
          responder_id_param: responderId,
          initial_message: initialMessage
        });

      if (error) throw error;

      // Fetch the created conversation with full details
      const conversation = await this.getConversation(data);
      
      // Log successful creation for observability
      console.log('Created prayer conversation:', {
        threadId: data,
        prayerId,
        responderId,
        messageType
      });

      return conversation;
    } catch (error) {
      console.error('Failed to create prayer conversation:', error);
      throw new Error(`Failed to create prayer conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a general conversation thread
   */
  static async createConversation(request: CreateConversationRequest): Promise<ConversationThread> {
    try {
      const { data, error } = await supabase
        .from('conversation_threads')
        .insert({
          type: request.type,
          title: request.title || this.generateDefaultTitle(request),
          prayer_id: request.prayerId,
          participant_ids: request.participantIds,
          creator_id: request.participantIds[0], // First participant is creator
          prayer_category: request.prayerCategory,
          prayer_tags: request.prayerTags || [],
          allow_anonymous: request.settings?.allowAnonymousMessages || false,
          notifications_enabled: request.settings?.defaultNotifications !== false
        })
        .select('*')
        .single();

      if (error) throw error;

      // Add participants
      await this.addParticipants(data.id, request.participantIds);

      // Send initial message if provided
      if (request.initialMessage) {
        await this.sendMessage({
          threadId: data.id,
          content: request.initialMessage,
          messageType: 'general_message'
        });
      }

      return this.mapConversationFromDb(data);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw new Error(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets a conversation thread with full details
   */
  static async getConversation(threadId: string): Promise<ConversationThread> {
    try {
      const { data, error } = await supabase
        .from('conversation_threads')
        .select(`
          *,
          participants:conversation_participants(*),
          last_message:thread_messages!last_message_id(*),
          prayer:prayers(*)
        `)
        .eq('id', threadId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Conversation not found');

      return this.mapConversationFromDb(data);
    } catch (error) {
      console.error('Failed to get conversation:', error);
      throw new Error(`Failed to get conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets user's conversation list with smart filtering and organization
   */
  static async getUserConversations(
    userId: string,
    filters: ConversationFilters = {},
    limit: number = 50
  ): Promise<ConversationThread[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_conversations', {
          user_id_param: userId,
          conversation_type_filter: filters.type?.[0] || null,
          include_archived: filters.isArchived || false,
          limit_param: limit
        });

      if (error) throw error;

      return data.map((row: any) => this.mapConversationFromRow(row));
    } catch (error) {
      console.error('Failed to get user conversations:', error);
      throw new Error(`Failed to get user conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates a conversation thread
   */
  static async updateConversation(
    threadId: string,
    updates: UpdateConversationRequest
  ): Promise<ConversationThread> {
    try {
      const { data, error } = await supabase
        .from('conversation_threads')
        .update({
          title: updates.title,
          custom_title: updates.customTitle,
          is_pinned: updates.isPinned,
          is_muted: updates.isMuted,
          is_archived: updates.isArchived,
          prayer_tags: updates.prayerTags,
          prayer_category: updates.prayerCategory,
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId)
        .select('*')
        .single();

      if (error) throw error;

      return this.mapConversationFromDb(data);
    } catch (error) {
      console.error('Failed to update conversation:', error);
      throw new Error(`Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================

  /**
   * Sends a message to a conversation thread
   */
  static async sendMessage(request: SendMessageRequest): Promise<ThreadMessage> {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error('User not authenticated');

      const messageData: any = {
        thread_id: request.threadId,
        content: request.content,
        content_type: request.contentType || 'text',
        media_url: request.mediaUrl,
        message_type: request.messageType || 'general_message',
        parent_message_id: request.parentMessageId,
        sender_id: currentUser.id,
        sender_name: currentUser.user_metadata?.name || 'Anonymous',
        is_anonymous: request.isAnonymous || false,
        urgency: request.urgency || 'medium',
        prayer_tags: request.spiritualContext?.prayerTags || [],
        prayer_category: request.spiritualContext?.prayerCategory,
        spiritual_context: request.spiritualContext ? JSON.stringify(request.spiritualContext) : '{}',
        scripture_reference: request.spiritualContext?.scriptureReference,
        scripture_text: request.spiritualContext?.scriptureText,
        creates_memorial_line: request.createsMemorialLine || false,
        memorial_line_data: request.memorialLineData ? JSON.stringify(request.memorialLineData) : null,
        related_prayer_id: request.spiritualContext?.relatedPrayerIds?.[0]
      };

      const { data, error } = await supabase
        .from('thread_messages')
        .insert(messageData)
        .select('*')
        .single();

      if (error) throw error;

      // Create memorial line if requested
      if (request.createsMemorialLine && request.memorialLineData) {
        await this.createMemorialLine(request.memorialLineData, data.id);
      }

      // Log message sent for observability
      console.log('Message sent successfully:', {
        messageId: data.id,
        threadId: request.threadId,
        messageType: request.messageType,
        hasSpiritual: !!request.spiritualContext,
        createsMemorial: request.createsMemorialLine
      });

      return this.mapMessageFromDb(data);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets messages for a conversation thread with pagination
   */
  static async getThreadMessages(
    threadId: string,
    limit: number = 50,
    cursor?: string,
    includeReplies: boolean = true
  ): Promise<{ messages: ThreadMessage[]; hasMore: boolean; nextCursor?: string }> {
    try {
      let query = supabase
        .from('thread_messages')
        .select('*')
        .eq('thread_id', threadId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (cursor) {
        query = query.gt('created_at', cursor);
      }

      const { data, error } = await query;

      if (error) throw error;

      const messages = data.map(row => this.mapMessageFromDb(row));
      
      // Load reply threads if requested
      if (includeReplies) {
        for (const message of messages) {
          if (message.replyCount > 0) {
            message.replies = await this.getMessageReplies(message.id);
          }
        }
      }

      const hasMore = data.length === limit;
      const nextCursor = hasMore ? data[data.length - 1].created_at : undefined;

      return { messages, hasMore, nextCursor };
    } catch (error) {
      console.error('Failed to get thread messages:', error);
      throw new Error(`Failed to get thread messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets replies to a specific message
   */
  static async getMessageReplies(parentMessageId: string): Promise<ThreadMessage[]> {
    try {
      const { data, error } = await supabase
        .from('thread_messages')
        .select('*')
        .eq('parent_message_id', parentMessageId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(row => this.mapMessageFromDb(row));
    } catch (error) {
      console.error('Failed to get message replies:', error);
      return [];
    }
  }

  /**
   * Marks messages as read in a conversation
   */
  static async markMessagesAsRead(
    threadId: string,
    userId: string,
    upToMessageId?: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('mark_thread_messages_read', {
          thread_id_param: threadId,
          user_id_param: userId,
          up_to_message_id: upToMessageId || null
        });

      if (error) throw error;

      console.log('Marked messages as read:', {
        threadId,
        userId,
        messagesMarked: data
      });

      return data;
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      throw new Error(`Failed to mark messages as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // SEARCH AND FILTERING
  // ============================================================================

  /**
   * Advanced message search with spiritual context
   */
  static async searchMessages(
    userId: string,
    filters: MessageSearchFilters,
    limit: number = 20
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_messages', {
          user_id_param: userId,
          search_query: filters.query || '',
          message_types: filters.messageTypes || null,
          prayer_categories: filters.prayerCategories || null,
          date_range_start: filters.dateRange?.start?.toISOString() || null,
          date_range_end: filters.dateRange?.end?.toISOString() || null,
          limit_param: limit
        });

      if (error) throw error;

      return data.map((row: any) => ({
        messageId: row.message_id,
        threadId: row.thread_id,
        content: row.content,
        messageType: row.message_type,
        senderName: row.sender_name,
        createdAt: new Date(row.created_at),
        threadTitle: row.thread_title,
        prayerContext: row.prayer_context,
        relevanceScore: row.relevance_score,
        highlightedContent: this.highlightSearchTerms(row.content, filters.query || '')
      }));
    } catch (error) {
      console.error('Failed to search messages:', error);
      throw new Error(`Failed to search messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Searches conversations with intelligent filtering
   */
  static async searchConversations(
    userId: string,
    query: string,
    filters: ConversationFilters = {},
    limit: number = 20
  ): Promise<ConversationThread[]> {
    try {
      let dbQuery = supabase
        .from('conversation_threads')
        .select(`
          *,
          participants:conversation_participants!inner(*),
          last_message:thread_messages!last_message_id(*)
        `)
        .contains('participant_ids', [userId]);

      // Apply text search
      if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,custom_title.ilike.%${query}%`);
      }

      // Apply filters
      if (filters.type?.length) {
        dbQuery = dbQuery.in('type', filters.type);
      }
      if (filters.prayerCategories?.length) {
        dbQuery = dbQuery.in('prayer_category', filters.prayerCategories);
      }
      if (filters.isPinned !== undefined) {
        dbQuery = dbQuery.eq('is_pinned', filters.isPinned);
      }
      if (filters.isArchived !== undefined) {
        dbQuery = dbQuery.eq('is_archived', filters.isArchived);
      }

      dbQuery = dbQuery
        .order('last_activity_at', { ascending: false })
        .limit(limit);

      const { data, error } = await dbQuery;

      if (error) throw error;

      return data.map(row => this.mapConversationFromDb(row));
    } catch (error) {
      console.error('Failed to search conversations:', error);
      throw new Error(`Failed to search conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // PARTICIPANT MANAGEMENT
  // ============================================================================

  /**
   * Adds participants to a conversation
   */
  static async addParticipants(threadId: string, userIds: string[]): Promise<void> {
    try {
      const participants = userIds.map(userId => ({
        thread_id: threadId,
        user_id: userId,
        role: 'member',
        joined_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (error) throw error;

      // Update participant_ids array in conversation_threads
      const { error: updateError } = await supabase
        .rpc('add_conversation_participants', {
          thread_id_param: threadId,
          user_ids_param: userIds
        });

      if (updateError) throw updateError;

      console.log('Added participants to conversation:', {
        threadId,
        userIds: userIds.length
      });
    } catch (error) {
      console.error('Failed to add participants:', error);
      throw new Error(`Failed to add participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Removes a participant from a conversation
   */
  static async removeParticipant(threadId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('thread_id', threadId)
        .eq('user_id', userId);

      if (error) throw error;

      console.log('Removed participant from conversation:', {
        threadId,
        userId
      });
    } catch (error) {
      console.error('Failed to remove participant:', error);
      throw new Error(`Failed to remove participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // LIVING MAP INTEGRATION
  // ============================================================================

  /**
   * Creates a memorial line connection for prayer responses
   */
  private static async createMemorialLine(
    memorialData: MemorialLineData,
    messageId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('prayer_connections')
        .insert({
          prayer_id: memorialData.prayerId,
          from_user_id: await this.getUserFromLocation(memorialData.fromLocation),
          to_user_id: await this.getUserFromLocation(memorialData.toLocation),
          from_location: `POINT(${memorialData.fromLocation.lng} ${memorialData.fromLocation.lat})`,
          to_location: `POINT(${memorialData.toLocation.lng} ${memorialData.toLocation.lat})`,
          message_id: messageId,
          connection_type: memorialData.connectionType,
          is_eternal: memorialData.isEternal || false,
          expires_at: memorialData.expiresAt?.toISOString() || (new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)).toISOString()
        });

      if (error) throw error;

      console.log('Created memorial line for message:', {
        messageId,
        prayerId: memorialData.prayerId,
        connectionType: memorialData.connectionType
      });
    } catch (error) {
      console.error('Failed to create memorial line:', error);
      // Don't throw here as this is supplementary to the main message
    }
  }

  /**
   * Gets prayer journey with all related conversations and memorial lines
   */
  static async getPrayerJourney(prayerId: string): Promise<PrayerJourney> {
    try {
      // Get the original prayer
      const { data: prayer, error: prayerError } = await supabase
        .from('prayers')
        .select('*')
        .eq('id', prayerId)
        .single();

      if (prayerError) throw prayerError;

      // Get related conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('prayer_id', prayerId);

      if (convError) throw convError;

      // Get memorial lines
      const { data: memorialLines, error: memorialError } = await supabase
        .from('prayer_connections')
        .select('*')
        .eq('prayer_id', prayerId);

      if (memorialError) throw memorialError;

      // Build timeline
      const timeline = await this.buildPrayerTimeline(prayerId);

      return {
        prayerId,
        originalPrayer: prayer,
        conversations: conversations.map(row => this.mapConversationFromDb(row)),
        memorialLines: memorialLines || [],
        prayerTimeline: timeline,
        totalResponseCount: timeline.filter(t => t.event === 'response_received').length,
        uniqueRespondersCount: new Set(timeline.map(t => t.participantName).filter(Boolean)).size,
        isAnswered: timeline.some(t => t.event === 'prayer_answered'),
        answeredAt: timeline.find(t => t.event === 'prayer_answered')?.date
      };
    } catch (error) {
      console.error('Failed to get prayer journey:', error);
      throw new Error(`Failed to get prayer journey: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // ANALYTICS AND INSIGHTS
  // ============================================================================

  /**
   * Gets conversation analytics and engagement metrics
   */
  static async getConversationAnalytics(threadId: string): Promise<ConversationAnalytics> {
    try {
      // Get conversation details
      const conversation = await this.getConversation(threadId);
      
      // Get message analytics
      const { data: messages, error } = await supabase
        .from('thread_messages')
        .select('*')
        .eq('thread_id', threadId)
        .eq('is_deleted', false);

      if (error) throw error;

      // Calculate metrics
      const messageCount = messages.length;
      const participantIds = new Set(messages.map(m => m.sender_id));
      const prayerCategories = messages.map(m => m.prayer_category).filter(Boolean);
      const scriptureCount = messages.filter(m => m.scripture_reference).length;
      const testimonyCount = messages.filter(m => m.message_type === 'testimony').length;
      const prayerRequestCount = messages.filter(m => m.message_type === 'prayer_request').length;
      const answeredPrayerCount = messages.filter(m => m.message_type === 'prayer_update' && 
        m.spiritual_context?.isAnsweredPrayer).length;

      // Calculate response time
      const responseTimes = this.calculateResponseTimes(messages);
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      return {
        threadId,
        participantCount: conversation.participantIds.length,
        messageCount,
        avgResponseTime,
        mostActiveParticipants: Array.from(participantIds).slice(0, 5),
        commonPrayerCategories: [...new Set(prayerCategories)],
        scriptureShareCount: scriptureCount,
        testimonyCount,
        prayerRequestCount,
        answeredPrayerCount,
        spiritualEngagementScore: this.calculateSpiritualEngagement(messages),
        prayerFulfillmentRate: prayerRequestCount > 0 ? answeredPrayerCount / prayerRequestCount : 0,
        communitySupport: this.calculateCommunitySupport(messages),
        activityTimeline: this.buildActivityTimeline(messages)
      };
    } catch (error) {
      console.error('Failed to get conversation analytics:', error);
      throw new Error(`Failed to get conversation analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static mapConversationFromDb(data: any): ConversationThread {
    return {
      id: data.id,
      type: data.type,
      title: data.title,
      customTitle: data.custom_title,
      prayerId: data.prayer_id,
      originalPrayerTitle: data.original_prayer_title,
      originalPrayerLocation: data.original_prayer_location ? {
        lat: data.original_prayer_location.coordinates[1],
        lng: data.original_prayer_location.coordinates[0]
      } : undefined,
      memorialLineId: data.memorial_line_id,
      participantIds: data.participant_ids || [],
      creatorId: data.creator_id,
      isPinned: data.is_pinned || false,
      isMuted: data.is_muted || false,
      isArchived: data.is_archived || false,
      allowAnonymous: data.allow_anonymous || false,
      notificationsEnabled: data.notifications_enabled !== false,
      readReceiptsEnabled: data.read_receipts_enabled !== false,
      prayerTags: data.prayer_tags || [],
      prayerCategory: data.prayer_category,
      lastActivityAt: new Date(data.last_activity_at),
      lastMessageId: data.last_message_id,
      unreadCount: data.unread_count || 0,
      totalMessages: data.total_messages || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private static mapConversationFromRow(row: any): ConversationThread {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      customTitle: row.custom_title,
      prayerId: row.prayer_id,
      participantIds: [], // Will be populated separately if needed
      creatorId: '', // Will be populated separately if needed
      isPinned: row.is_pinned || false,
      isMuted: row.is_muted || false,
      isArchived: false,
      allowAnonymous: false,
      notificationsEnabled: true,
      readReceiptsEnabled: true,
      prayerCategory: row.prayer_category,
      lastActivityAt: new Date(row.last_activity_at),
      unreadCount: row.unread_count || 0,
      totalMessages: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private static mapMessageFromDb(data: any): ThreadMessage {
    return {
      id: data.id,
      threadId: data.thread_id,
      parentMessageId: data.parent_message_id,
      content: data.content,
      contentType: data.content_type,
      mediaUrl: data.media_url,
      messageType: data.message_type,
      senderId: data.sender_id,
      senderName: data.sender_name,
      isAnonymous: data.is_anonymous || false,
      spiritualContext: data.spiritual_context ? JSON.parse(data.spiritual_context) : undefined,
      prayerCategory: data.prayer_category,
      urgency: data.urgency || 'medium',
      prayerTags: data.prayer_tags || [],
      scriptureReference: data.scripture_reference,
      scriptureText: data.scripture_text,
      createsMemorialLine: data.creates_memorial_line || false,
      memorialLineData: data.memorial_line_data ? JSON.parse(data.memorial_line_data) : undefined,
      relatedPrayerId: data.related_prayer_id,
      isEdited: data.is_edited || false,
      editHistory: data.edit_history || [],
      isDeleted: data.is_deleted || false,
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
      replyCount: data.reply_count || 0,
      threadParticipants: data.thread_participants || [],
      readBy: data.read_by || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private static generateDefaultTitle(request: CreateConversationRequest): string {
    switch (request.type) {
      case 'prayer_response':
        return 'Prayer Response';
      case 'direct_message':
        return 'Private Message';
      case 'group_prayer':
        return 'Group Prayer';
      case 'prayer_circle':
        return 'Prayer Circle';
      case 'scripture_sharing':
        return 'Scripture Sharing';
      case 'prayer_update':
        return 'Prayer Update';
      default:
        return 'Conversation';
    }
  }

  private static highlightSearchTerms(text: string, query: string): string {
    if (!query) return text;
    
    const terms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    let highlighted = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    
    return highlighted;
  }

  private static async getUserFromLocation(location: { lat: number; lng: number }): Promise<string> {
    // This is a placeholder - in a real implementation, you'd need to
    // determine the user ID from the location context
    const currentUser = (await supabase.auth.getUser()).data.user;
    return currentUser?.id || '';
  }

  private static async buildPrayerTimeline(prayerId: string): Promise<any[]> {
    // Implementation would build a timeline of prayer events
    // This is a placeholder for the complex timeline building logic
    return [];
  }

  private static calculateResponseTimes(messages: any[]): number[] {
    // Calculate time between messages for response time analysis
    const responseTimes: number[] = [];
    
    for (let i = 1; i < messages.length; i++) {
      const prevTime = new Date(messages[i - 1].created_at).getTime();
      const currTime = new Date(messages[i].created_at).getTime();
      const diffMinutes = (currTime - prevTime) / (1000 * 60);
      responseTimes.push(diffMinutes);
    }
    
    return responseTimes;
  }

  private static calculateSpiritualEngagement(messages: any[]): number {
    // Calculate spiritual engagement score based on prayer activities
    let score = 0;
    
    messages.forEach(msg => {
      switch (msg.message_type) {
        case 'prayer_request': score += 3; break;
        case 'prayer_response': score += 2; break;
        case 'scripture_share': score += 2; break;
        case 'testimony': score += 3; break;
        case 'prayer_update': score += 1; break;
        default: score += 0.5; break;
      }
    });
    
    return Math.min(100, (score / messages.length) * 10);
  }

  private static calculateCommunitySupport(messages: any[]): number {
    // Calculate community support based on participation patterns
    const uniqueSenders = new Set(messages.map(m => m.sender_id));
    const supportMessages = messages.filter(m => 
      ['prayer_response', 'encouragement', 'scripture_share'].includes(m.message_type)
    );
    
    return Math.min(100, (supportMessages.length / messages.length) * uniqueSenders.size * 20);
  }

  private static buildActivityTimeline(messages: any[]): any[] {
    // Group messages by date and build activity timeline
    const timeline = new Map();
    
    messages.forEach(msg => {
      const date = new Date(msg.created_at).toDateString();
      if (!timeline.has(date)) {
        timeline.set(date, { 
          date: new Date(date), 
          messageCount: 0, 
          prayerCount: 0, 
          testimonyCount: 0 
        });
      }
      
      const dayData = timeline.get(date);
      dayData.messageCount++;
      
      if (msg.message_type === 'prayer_request') dayData.prayerCount++;
      if (msg.message_type === 'testimony') dayData.testimonyCount++;
    });
    
    return Array.from(timeline.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}