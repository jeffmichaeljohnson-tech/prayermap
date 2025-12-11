import { create } from 'zustand';
import { supabase } from './supabase';
import { uploadMedia, type MediaType } from './mediaUpload';
import type { Conversation, Message, SendMessageInput, MessageContentType } from './types/messaging';

interface MessagingState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  unreadCount: number;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;

  // Actions
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (input: SendMessageInput) => Promise<{ success: boolean; error?: string }>;
  markConversationRead: (conversationId: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  getOrCreateConversation: (prayerResponseId: string) => Promise<{ success: boolean; conversationId?: string; error?: string }>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  unreadCount: 0,
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoadingConversations: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoadingConversations: false, error: 'Please sign in to view messages' });
        return;
      }

      const { data, error } = await supabase
        .rpc('get_user_conversations', { p_user_id: user.id });

      if (error) {
        console.error('Failed to fetch conversations:', error);
        set({ isLoadingConversations: false, error: error.message });
        return;
      }

      // Transform snake_case to camelCase
      const conversations: Conversation[] = (data || []).map((c: any) => ({
        id: c.conversation_id,
        prayer_id: c.prayer_id,
        prayer_title: c.prayer_title,
        prayer_content: c.prayer_content,
        prayer_response_id: c.prayer_response_id,
        prayer_response_message: c.prayer_response_message,
        other_participant_id: c.other_participant_id,
        other_participant_name: c.other_participant_name,
        other_participant_anonymous: c.other_participant_anonymous,
        last_message_content: c.last_message_content,
        last_message_type: c.last_message_type,
        last_message_sender_id: c.last_message_sender_id,
        last_message_at: c.last_message_at,
        unread_count: c.unread_count,
        conversation_created_at: c.conversation_created_at,
      }));

      set({ conversations, isLoadingConversations: false });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      set({ isLoadingConversations: false, error: 'Failed to load conversations' });
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true, error: null });

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch messages:', error);
        set({ isLoadingMessages: false, error: error.message });
        return;
      }

      set({ messages: data || [], isLoadingMessages: false });
    } catch (error) {
      console.error('Error fetching messages:', error);
      set({ isLoadingMessages: false, error: 'Failed to load messages' });
    }
  },

  sendMessage: async (input: SendMessageInput) => {
    set({ isSendingMessage: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isSendingMessage: false, error: 'Please sign in to send messages' });
        return { success: false, error: 'Please sign in to send messages' };
      }

      const contentType = input.contentType || 'text';
      let mediaUrl: string | null = null;

      // Upload media if needed
      if ((contentType === 'audio' || contentType === 'video') && input.mediaUri) {
        const mediaType: MediaType = contentType === 'audio' ? 'audio' : 'video';
        const uploadResult = await uploadMedia(input.mediaUri, mediaType, 'messages');

        if (!uploadResult.success) {
          set({ isSendingMessage: false, error: uploadResult.error || 'Failed to upload media' });
          return { success: false, error: uploadResult.error || 'Failed to upload media' };
        }

        mediaUrl = uploadResult.url || null;
      }

      // Insert message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: input.conversationId,
          sender_id: user.id,
          content: input.content,
          content_type: contentType,
          media_url: mediaUrl,
          media_duration_seconds: input.mediaDuration ? Math.round(input.mediaDuration) : null,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to send message:', error);
        set({ isSendingMessage: false, error: error.message });
        return { success: false, error: error.message };
      }

      // Add message to local state
      set((state) => ({
        messages: [...state.messages, data],
        isSendingMessage: false,
      }));

      // Refresh conversations to update preview
      get().fetchConversations();

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      set({ isSendingMessage: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  markConversationRead: async (conversationId: string) => {
    try {
      await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });

      // Update local conversation unread count
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ),
      }));

      // Refresh unread count
      get().fetchUnreadCount();
    } catch (error) {
      console.error('Failed to mark conversation read:', error);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_unread_message_count', { p_user_id: user.id });

      if (error) {
        console.error('Failed to fetch unread count:', error);
        return;
      }

      set({ unreadCount: data || 0 });
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  },

  getOrCreateConversation: async (prayerResponseId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_prayer_response_id: prayerResponseId,
      });

      if (error) {
        console.error('Failed to get/create conversation:', error);
        return { success: false, error: error.message };
      }

      return { success: true, conversationId: data };
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      return { success: false, error: errorMessage };
    }
  },

  setCurrentConversation: (conversation: Conversation | null) => {
    set({ currentConversation: conversation });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      unreadCount: 0,
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSendingMessage: false,
      error: null,
    });
  },
}));

// Convenience hook
export function useMessaging() {
  return useMessagingStore();
}
