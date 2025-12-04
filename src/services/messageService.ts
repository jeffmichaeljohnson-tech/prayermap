/**
 * ============================================
 * MESSAGING SERVICE
 * ============================================
 * Handles all messaging operations for PrayerMap.
 *
 * Key concepts:
 * - Conversations are 1:1 between prayer requester and responder
 * - Conversations are linked to a specific prayer_response
 * - Responders can be anonymous (we track their ID but hide their name)
 * - Real-time updates via Supabase Realtime
 */

import { supabase } from '../lib/supabase';
import type {
  Message,
  MessageRow,
  ConversationRow,
  ConversationWithDetails,
  ConversationWithPreview,
  SendMessageInput,
  GetMessagesOptions,
  Participant,
  ConversationPrayerContext,
} from '../types/messaging';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_CONTENT_LENGTH = 2000;
const ANONYMOUS_NAME = 'Prayer Partner';
const DEFAULT_NAME = 'Someone';

// ============================================
// CONVERSATION OPERATIONS
// ============================================

/**
 * Gets an existing conversation or creates one from a prayer_response.
 * Called when user clicks "Reply" or "Continue Conversation" from inbox.
 *
 * @param prayerResponseId - The ID of the prayer_response that initiated contact
 * @param currentUserId - The ID of the current user (for verification)
 * @returns The conversation object with basic info
 * @throws Error if user is not a participant or prayer_response not found
 */
export async function getOrCreateConversation(
  prayerResponseId: string,
  currentUserId: string
): Promise<ConversationWithDetails> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Use the database function to get or create the conversation
  const { data: conversationId, error: rpcError } = await supabase
    .rpc('get_or_create_conversation', {
      p_prayer_response_id: prayerResponseId,
    });

  if (rpcError) {
    console.error('Error getting/creating conversation:', rpcError);
    throw new Error(`Failed to get or create conversation: ${rpcError.message}`);
  }

  if (!conversationId) {
    throw new Error('Failed to get or create conversation: no ID returned');
  }

  // Fetch the full conversation with related data
  const { data: conversation, error: fetchError } = await supabase
    .from('conversations')
    .select(`
      *,
      prayer:prayers (
        id,
        title,
        content,
        content_type
      ),
      prayer_response:prayer_responses (
        responder_id,
        is_anonymous
      )
    `)
    .eq('id', conversationId)
    .single();

  if (fetchError) {
    console.error('Error fetching conversation:', fetchError);
    throw new Error(`Failed to fetch conversation: ${fetchError.message}`);
  }

  if (!conversation) {
    throw new Error('Conversation not found after creation');
  }

  // Verify user is a participant
  const isParticipant = 
    conversation.participant_1_id === currentUserId ||
    conversation.participant_2_id === currentUserId;

  if (!isParticipant) {
    throw new Error('User is not a participant in this conversation');
  }

  // Get the other participant's info
  const otherParticipantId = conversation.participant_1_id === currentUserId
    ? conversation.participant_2_id
    : conversation.participant_1_id;

  const isOtherAnonymous = conversation.participant_2_id === otherParticipantId && 
    conversation.participant_2_anonymous;

  const otherParticipant = await getParticipantInfo(
    otherParticipantId,
    isOtherAnonymous
  );

  // Build the enriched conversation
  const prayerData = conversation.prayer as { id: string; title: string | null; content: string; content_type: string };
  
  return {
    id: conversation.id,
    prayer_id: conversation.prayer_id,
    prayer_response_id: conversation.prayer_response_id,
    participant_1_id: conversation.participant_1_id,
    participant_2_id: conversation.participant_2_id,
    participant_2_anonymous: conversation.participant_2_anonymous,
    last_message_at: conversation.last_message_at,
    created_at: conversation.created_at,
    prayer: {
      id: prayerData.id,
      title: prayerData.title,
      content: prayerData.content,
      contentType: prayerData.content_type as 'text' | 'audio' | 'video',
    },
    otherParticipant,
  };
}

/**
 * Gets all conversations for a user with preview info.
 * Used to populate the inbox/conversations list.
 *
 * @param userId - The user's ID
 * @returns Array of conversations with last message preview and unread count
 */
export async function getUserConversations(
  userId: string
): Promise<ConversationWithPreview[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Fetch all conversations where user is a participant
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      prayer:prayers (
        id,
        title,
        content,
        content_type
      )
    `)
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('Error fetching user conversations:', error);
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  if (!conversations || conversations.length === 0) {
    return [];
  }

  // Fetch additional data for each conversation
  const enrichedConversations = await Promise.all(
    conversations.map(async (conversation) => {
      const prayerData = conversation.prayer as { id: string; title: string | null; content: string; content_type: string };
      
      // Determine the other participant
      const otherParticipantId = conversation.participant_1_id === userId
        ? conversation.participant_2_id
        : conversation.participant_1_id;

      const isOtherAnonymous = conversation.participant_2_id === otherParticipantId && 
        conversation.participant_2_anonymous;

      // Get other participant info
      const otherParticipant = await getParticipantInfo(otherParticipantId, isOtherAnonymous);

      // Get last message
      const { data: lastMessageData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get unread count (messages sent by the other person that haven't been read)
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id)
        .neq('sender_id', userId)
        .is('read_at', null);

      // Enrich last message if exists
      let lastMessage: Message | null = null;
      if (lastMessageData) {
        const senderIsOther = lastMessageData.sender_id === otherParticipantId;
        const senderIsAnonymous = senderIsOther && isOtherAnonymous;
        
        lastMessage = {
          ...lastMessageData,
          sender: senderIsOther 
            ? otherParticipant 
            : await getParticipantInfo(userId, false),
        };
      }

      return {
        id: conversation.id,
        prayer_id: conversation.prayer_id,
        prayer_response_id: conversation.prayer_response_id,
        participant_1_id: conversation.participant_1_id,
        participant_2_id: conversation.participant_2_id,
        participant_2_anonymous: conversation.participant_2_anonymous,
        last_message_at: conversation.last_message_at,
        created_at: conversation.created_at,
        prayer: {
          id: prayerData.id,
          title: prayerData.title,
          content: prayerData.content,
          contentType: prayerData.content_type as 'text' | 'audio' | 'video',
        },
        otherParticipant,
        lastMessage,
        unreadCount: unreadCount || 0,
      } satisfies ConversationWithPreview;
    })
  );

  return enrichedConversations;
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

/**
 * Sends a message in a conversation.
 * Handles text, audio, and video messages.
 *
 * @param input - The message data
 * @returns The created message
 * @throws Error if user is not a participant or validation fails
 */
export async function sendMessage(
  input: SendMessageInput
): Promise<Message> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { conversationId, senderId, content, contentType, mediaUrl, mediaDurationSeconds } = input;

  // Validate content length
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error(`Message content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`);
  }

  // Validate media URL for non-text messages
  if (contentType !== 'text' && !mediaUrl) {
    throw new Error(`Media URL is required for ${contentType} messages`);
  }

  // Verify user is a participant (RLS will enforce this, but check upfront for better errors)
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('participant_1_id, participant_2_id, participant_2_anonymous')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error('Conversation not found');
  }

  const isParticipant = 
    conversation.participant_1_id === senderId ||
    conversation.participant_2_id === senderId;

  if (!isParticipant) {
    throw new Error('User is not a participant in this conversation');
  }

  // Insert the message
  const { data: messageData, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      content_type: contentType,
      media_url: mediaUrl || null,
      media_duration_seconds: mediaDurationSeconds || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error sending message:', insertError);
    throw new Error(`Failed to send message: ${insertError.message}`);
  }

  // Determine if sender is anonymous
  const senderIsAnonymous = 
    conversation.participant_2_id === senderId && 
    conversation.participant_2_anonymous;

  // Get sender info
  const senderInfo = await getParticipantInfo(senderId, senderIsAnonymous);

  return {
    ...messageData,
    sender: senderInfo,
  };
}

/**
 * Gets paginated messages for a conversation.
 * Returns newest messages first (for initial load), with cursor-based pagination.
 *
 * @param conversationId - The conversation to fetch messages from
 * @param options - Pagination options
 * @returns Array of messages with sender info
 */
export async function getConversationMessages(
  conversationId: string,
  options: GetMessagesOptions = {}
): Promise<Message[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { limit = DEFAULT_MESSAGE_LIMIT, before, after } = options;

  // First, get the conversation to understand anonymity
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('participant_1_id, participant_2_id, participant_2_anonymous')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error('Conversation not found');
  }

  // Build the query
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Apply cursor-based pagination
  if (before) {
    // Get messages older than the cursor
    const { data: cursorMessage } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', before)
      .single();

    if (cursorMessage) {
      query = query.lt('created_at', cursorMessage.created_at);
    }
  } else if (after) {
    // Get messages newer than the cursor
    const { data: cursorMessage } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', after)
      .single();

    if (cursorMessage) {
      query = query.gt('created_at', cursorMessage.created_at);
    }
  }

  const { data: messages, error } = await query;

  if (error) {
    console.error('Error fetching messages:', error);
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // Fetch participant info once (batch lookup)
  const participantIds = [conversation.participant_1_id, conversation.participant_2_id];
  const participantInfoMap = new Map<string, Participant>();

  for (const participantId of participantIds) {
    const isAnonymous = 
      participantId === conversation.participant_2_id && 
      conversation.participant_2_anonymous;
    
    participantInfoMap.set(participantId, await getParticipantInfo(participantId, isAnonymous));
  }

  // Enrich messages with sender info
  const enrichedMessages: Message[] = messages.map((message) => ({
    ...message,
    sender: participantInfoMap.get(message.sender_id) || {
      id: message.sender_id,
      name: DEFAULT_NAME,
      isAnonymous: false,
    },
  }));

  return enrichedMessages;
}

/**
 * Marks all messages in a conversation as read.
 * Only marks messages sent BY the other person TO the current user.
 *
 * @param conversationId - The conversation ID
 * @param userId - The current user's ID (reader)
 * @returns Number of messages marked as read
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<number> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('messages')
    .update({ read_at: now })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)  // Only mark messages from OTHER person
    .is('read_at', null)       // Only mark unread messages
    .select();

  if (error) {
    console.error('Error marking messages as read:', error);
    throw new Error(`Failed to mark messages as read: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Gets total unread message count across all conversations.
 * Used for badge/notification count.
 *
 * @param userId - The user's ID
 * @returns Total number of unread messages
 */
export async function getUnreadMessageCount(
  userId: string
): Promise<number> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // First, get all conversation IDs where user is a participant
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);

  if (convError) {
    console.error('Error fetching conversations for unread count:', convError);
    throw new Error(`Failed to get unread count: ${convError.message}`);
  }

  if (!conversations || conversations.length === 0) {
    return 0;
  }

  const conversationIds = conversations.map(c => c.id);

  // Count unread messages across all conversations
  const { count, error: countError } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', conversationIds)
    .neq('sender_id', userId)  // Messages from others
    .is('read_at', null);      // That are unread

  if (countError) {
    console.error('Error counting unread messages:', countError);
    throw new Error(`Failed to get unread count: ${countError.message}`);
  }

  return count || 0;
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribes to real-time updates for a specific conversation.
 * Returns an unsubscribe function.
 *
 * @param conversationId - The conversation to subscribe to
 * @param onNewMessage - Callback when a new message arrives
 * @param onMessageRead - Callback when a message is marked as read (optional)
 * @returns Unsubscribe function
 */
export function subscribeToConversation(
  conversationId: string,
  onNewMessage: (message: Message) => void,
  onMessageRead?: (messageId: string, readAt: string) => void
): () => void {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return () => {};
  }

  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        try {
          const message = await enrichMessage(payload.new as MessageRow);
          onNewMessage(message);
        } catch (error) {
          console.error('Error processing new message:', error);
        }
      }
    );

  if (onMessageRead) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const updated = payload.new as MessageRow;
        const old = payload.old as { read_at?: string | null };
        if (updated.read_at && !old.read_at) {
          onMessageRead(updated.id, updated.read_at);
        }
      }
    );
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[MessageService] Subscribed to conversation ${conversationId}`);
    }
  });

  return () => {
    console.log(`[MessageService] Unsubscribing from conversation ${conversationId}`);
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to updates across all user's conversations.
 * Used for inbox badge and new message notifications.
 *
 * @param userId - The user's ID
 * @param onUpdate - Callback when any conversation updates
 * @returns Unsubscribe function
 */
export function subscribeToUserConversations(
  userId: string,
  onUpdate: (conversationId: string, latestMessage: Message) => void
): () => void {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return () => {};
  }

  // Subscribe to conversation updates (when last_message_at changes)
  const channel = supabase
    .channel(`user:${userId}:conversations`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      },
      async (payload) => {
        const conversation = payload.new as ConversationRow;
        
        // Check if user is a participant
        if (conversation.participant_1_id !== userId && conversation.participant_2_id !== userId) {
          return; // Not this user's conversation
        }

        try {
          // Fetch the latest message
          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (messages && messages[0]) {
            const enrichedMessage = await enrichMessage(messages[0]);
            onUpdate(conversation.id, enrichedMessage);
          }
        } catch (error) {
          console.error('Error processing conversation update:', error);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[MessageService] Subscribed to user ${userId} conversations`);
      }
    });

  return () => {
    console.log(`[MessageService] Unsubscribing from user ${userId} conversations`);
    supabase.removeChannel(channel);
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Enriches a raw message row with sender information.
 * Handles anonymous senders by returning "Prayer Partner" as the name.
 */
async function enrichMessage(row: MessageRow): Promise<Message> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Get conversation to check anonymity
  const { data: conversation } = await supabase
    .from('conversations')
    .select('participant_2_id, participant_2_anonymous')
    .eq('id', row.conversation_id)
    .single();

  const isAnonymous = conversation?.participant_2_anonymous &&
                      row.sender_id === conversation?.participant_2_id;

  const senderInfo = await getParticipantInfo(row.sender_id, isAnonymous);

  return {
    ...row,
    sender: senderInfo,
  };
}

/**
 * Gets participant info, handling anonymous case.
 * Fetches from users table unless anonymous.
 */
async function getParticipantInfo(
  userId: string,
  isAnonymous: boolean
): Promise<Participant> {
  if (isAnonymous) {
    return {
      id: userId,
      name: ANONYMOUS_NAME,
      isAnonymous: true,
    };
  }

  if (!supabase) {
    return {
      id: userId,
      name: DEFAULT_NAME,
      isAnonymous: false,
    };
  }

  // Try to get from users table
  const { data: user } = await supabase
    .from('users')
    .select('first_name')
    .eq('user_id', userId)
    .single();

  return {
    id: userId,
    name: user?.first_name || DEFAULT_NAME,
    isAnonymous: false,
  };
}
