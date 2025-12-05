/**
 * ============================================
 * useConversation Hook
 * ============================================
 * Manages conversation state with real-time updates.
 * Handles message fetching, sending, pagination, and read receipts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../authentication/hooks/useAuth';
import {
  getOrCreateConversation,
  getConversationMessages,
  sendMessage as sendMessageService,
  markMessagesAsRead,
  subscribeToConversation,
} from '../services/messageService';
import type {
  Message,
  ConversationWithDetails,
  GetMessagesOptions,
} from '../types/messaging';

interface UseConversationOptions {
  /** The prayer_response ID to create/get conversation from */
  prayerResponseId: string;
  /** Auto-fetch messages on mount */
  autoFetch?: boolean;
  /** Enable real-time message updates */
  enableRealtime?: boolean;
  /** Initial messages to show (optimistic) */
  initialMessages?: Message[];
}

interface UseConversationReturn {
  /** The conversation metadata */
  conversation: ConversationWithDetails | null;
  /** All messages in the conversation */
  messages: Message[];
  /** Loading state for initial fetch */
  loading: boolean;
  /** Loading state for sending a message */
  sending: boolean;
  /** Error message if any */
  error: string | null;
  /** Send a new message */
  sendMessage: (
    content: string,
    contentType?: 'text' | 'audio' | 'video',
    mediaUrl?: string,
    mediaDurationSeconds?: number
  ) => Promise<void>;
  /** Load older messages */
  loadMoreMessages: () => Promise<void>;
  /** Whether there are more messages to load */
  hasMoreMessages: boolean;
  /** Refresh messages */
  refresh: () => Promise<void>;
}

export function useConversation({
  prayerResponseId,
  autoFetch = true,
  enableRealtime = true,
  initialMessages = [],
}: UseConversationOptions): UseConversationReturn {
  const { user } = useAuth();
  const [conversation, setConversation] =
    useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const oldestMessageIdRef = useRef<string | null>(null);

  // Track the oldest message ID for pagination
  useEffect(() => {
    if (messages.length > 0) {
      // Messages are sorted newest first, so find the oldest
      const sorted = [...messages].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      oldestMessageIdRef.current = sorted[0]?.id || null;
    }
  }, [messages]);

  // Initialize conversation and fetch messages
  const initialize = useCallback(async () => {
    if (!user?.id || !prayerResponseId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get or create the conversation
      const conv = await getOrCreateConversation(prayerResponseId, user.id);
      setConversation(conv);

      // Fetch initial messages
      const msgs = await getConversationMessages(conv.id, { limit: 50 });
      setMessages(msgs);
      setHasMoreMessages(msgs.length === 50);

      // Mark messages as read
      await markMessagesAsRead(conv.id, user.id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load conversation';
      setError(errorMessage);
      console.error('Error initializing conversation:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, prayerResponseId]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      initialize();
    }
  }, [autoFetch, initialize]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealtime || !conversation?.id || !user?.id) {
      return;
    }

    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to new messages
    const unsubscribe = subscribeToConversation(
      conversation.id,
      (newMessage) => {
        // Add new message to the list (avoid duplicates)
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });

        // Mark as read if it's from the other person
        if (newMessage.sender.id !== user.id) {
          markMessagesAsRead(conversation.id, user.id).catch(console.error);
        }
      },
      (messageId, readAt) => {
        // Update message read status
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, read_at: readAt } : m))
        );
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [conversation?.id, user?.id, enableRealtime]);

  // Send a message
  const sendMessage = useCallback(
    async (
      content: string,
      contentType: 'text' | 'audio' | 'video' = 'text',
      mediaUrl?: string,
      mediaDurationSeconds?: number
    ) => {
      if (!conversation?.id || !user?.id) {
        throw new Error('No conversation or user');
      }

      if (!content.trim() && contentType === 'text') {
        throw new Error('Message cannot be empty');
      }

      setSending(true);
      setError(null);

      // Optimistic update - add message immediately
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversation.id,
        sender_id: user.id,
        content,
        content_type: contentType,
        media_url: mediaUrl || null,
        media_duration_seconds: mediaDurationSeconds || null,
        read_at: null,
        created_at: new Date().toISOString(),
        sender: {
          id: user.id,
          name: user.user_metadata?.name || 'You',
          isAnonymous: false,
        },
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const realMessage = await sendMessageService({
          conversationId: conversation.id,
          senderId: user.id,
          content,
          contentType,
          mediaUrl,
          mediaDurationSeconds,
        });

        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? realMessage : m))
        );
      } catch (err) {
        // Remove optimistic message on failure
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMessage.id)
        );

        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [conversation?.id, user?.id, user?.user_metadata?.name]
  );

  // Load older messages
  const loadMoreMessages = useCallback(async () => {
    if (!conversation?.id || !oldestMessageIdRef.current || !hasMoreMessages) {
      return;
    }

    try {
      const olderMessages = await getConversationMessages(conversation.id, {
        limit: 50,
        before: oldestMessageIdRef.current,
      });

      if (olderMessages.length === 0) {
        setHasMoreMessages(false);
        return;
      }

      setMessages((prev) => {
        // Merge and deduplicate
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = olderMessages.filter((m) => !existingIds.has(m.id));
        return [...newMessages, ...prev];
      });

      setHasMoreMessages(olderMessages.length === 50);
    } catch (err) {
      console.error('Error loading more messages:', err);
    }
  }, [conversation?.id, hasMoreMessages]);

  // Refresh all messages
  const refresh = useCallback(async () => {
    if (!conversation?.id) return;

    try {
      const msgs = await getConversationMessages(conversation.id, { limit: 50 });
      setMessages(msgs);
      setHasMoreMessages(msgs.length === 50);
    } catch (err) {
      console.error('Error refreshing messages:', err);
    }
  }, [conversation?.id]);

  return {
    conversation,
    messages,
    loading,
    sending,
    error,
    sendMessage,
    loadMoreMessages,
    hasMoreMessages,
    refresh,
  };
}

