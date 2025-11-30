/**
 * Mobile-Optimized Conversation State Management Hook
 * 
 * Sophisticated state management for conversation threading with
 * offline support, real-time updates, and mobile performance optimization.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ConversationService } from '../services/conversationService';
import { supabase } from '../lib/supabase';
import type {
  ConversationThread,
  ThreadMessage,
  ConversationState,
  ConversationFilters,
  MessageSearchFilters,
  SendMessageRequest,
  CreateConversationRequest,
  UpdateConversationRequest,
  SearchResult,
  TypingIndicator,
  MobileConversationCache,
  OfflineAction
} from '../types/conversation';

interface UseConversationManagerOptions {
  userId: string;
  enableRealtime?: boolean;
  enableOffline?: boolean;
  maxCachedConversations?: number;
  maxMessagesPerThread?: number;
  preloadPriorityThreads?: boolean;
}

interface UseConversationManagerReturn {
  // Core state
  conversations: ConversationThread[];
  messages: Map<string, ThreadMessage[]>;
  activeConversation: ConversationThread | null;
  
  // Loading states
  loading: boolean;
  syncing: boolean;
  error: string | null;
  
  // Counts and metadata
  totalUnreadCount: number;
  unreadByConversation: Map<string, number>;
  
  // Search and filtering
  searchResults: SearchResult[];
  filteredConversations: ConversationThread[];
  
  // Real-time features
  typingIndicators: Map<string, TypingIndicator[]>;
  isOnline: boolean;
  lastSyncTime: Date | null;
  
  // Core actions
  loadConversations: (filters?: ConversationFilters) => Promise<void>;
  loadMessages: (threadId: string, limit?: number, cursor?: string) => Promise<void>;
  sendMessage: (request: SendMessageRequest) => Promise<ThreadMessage>;
  createConversation: (request: CreateConversationRequest) => Promise<ConversationThread>;
  updateConversation: (threadId: string, updates: UpdateConversationRequest) => Promise<void>;
  
  // Thread management
  setActiveConversation: (threadId: string | null) => void;
  markAsRead: (threadId: string, messageId?: string) => Promise<void>;
  searchMessages: (filters: MessageSearchFilters) => Promise<void>;
  searchConversations: (query: string, filters?: ConversationFilters) => Promise<void>;
  
  // Real-time features
  sendTypingIndicator: (threadId: string) => void;
  stopTypingIndicator: (threadId: string) => void;
  
  // Offline features
  offlineActions: OfflineAction[];
  syncOfflineActions: () => Promise<void>;
  
  // Mobile optimization
  preloadConversation: (threadId: string) => Promise<void>;
  clearCache: () => void;
  getCacheStats: () => { conversations: number; messages: number; totalSize: string };
}

export function useConversationManager({
  userId,
  enableRealtime = true,
  enableOffline = true,
  maxCachedConversations = 50,
  maxMessagesPerThread = 100,
  preloadPriorityThreads = true
}: UseConversationManagerOptions): UseConversationManagerReturn {
  
  // Core state
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [messages, setMessages] = useState<Map<string, ThreadMessage[]>>(new Map());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  // Loading and sync state
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Search and filtering state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [conversationFilters, setConversationFilters] = useState<ConversationFilters>({});
  const [filteredConversations, setFilteredConversations] = useState<ConversationThread[]>([]);
  
  // Real-time state
  const [typingIndicators, setTypingIndicators] = useState<Map<string, TypingIndicator[]>>(new Map());
  
  // Offline state
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([]);
  const [mobileCache, setMobileCache] = useState<MobileConversationCache>({
    conversationList: [],
    lastCacheUpdate: new Date(),
    messageCacheByThread: new Map(),
    priorityConversations: new Set(),
    pendingMessages: new Map(),
    offlineActions: [],
    cachedMediaUrls: new Set(),
    maxConversationsCached: maxCachedConversations,
    maxMessagesPerThread,
    cacheExpiryHours: 24
  });
  
  // Refs for real-time subscriptions
  const subscriptionsRef = useRef<Map<string, any>>(new Map());
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Computed values
  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );
  
  const totalUnreadCount = useMemo(() =>
    conversations.reduce((total, conv) => total + conv.unreadCount, 0),
    [conversations]
  );
  
  const unreadByConversation = useMemo(() => {
    const map = new Map<string, number>();
    conversations.forEach(conv => {
      if (conv.unreadCount > 0) {
        map.set(conv.id, conv.unreadCount);
      }
    });
    return map;
  }, [conversations]);

  // ============================================================================
  // CORE ACTIONS
  // ============================================================================

  const loadConversations = useCallback(async (filters?: ConversationFilters) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load from cache first for immediate UI response
      if (mobileCache.conversationList.length > 0 && !filters) {
        setConversations(mobileCache.conversationList);
        setFilteredConversations(mobileCache.conversationList);
      }
      
      // Fetch fresh data
      const fetchedConversations = await ConversationService.getUserConversations(
        userId, 
        filters || conversationFilters
      );
      
      setConversations(fetchedConversations);
      setFilteredConversations(fetchedConversations);
      
      // Update cache
      setMobileCache(prev => ({
        ...prev,
        conversationList: fetchedConversations,
        lastCacheUpdate: new Date()
      }));
      
      // Preload priority conversations if enabled
      if (preloadPriorityThreads) {
        const priorityThreads = fetchedConversations
          .filter(c => c.isPinned || c.unreadCount > 0)
          .slice(0, 5);
        
        for (const thread of priorityThreads) {
          preloadConversation(thread.id);
        }
      }
      
      setLastSyncTime(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      console.error('Failed to load conversations:', err);
      
      // Fall back to cached data in offline mode
      if (!isOnline && mobileCache.conversationList.length > 0) {
        setConversations(mobileCache.conversationList);
        setFilteredConversations(mobileCache.conversationList);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, conversationFilters, mobileCache.conversationList, isOnline, preloadPriorityThreads]);

  const loadMessages = useCallback(async (
    threadId: string, 
    limit = 50, 
    cursor?: string
  ) => {
    try {
      setSyncing(true);
      
      // Load from cache first for immediate response
      const cached = mobileCache.messageCacheByThread.get(threadId);
      if (cached && !cursor) {
        setMessages(prev => new Map(prev).set(threadId, cached.messages));
      }
      
      // Fetch fresh messages
      const { messages: fetchedMessages } = await ConversationService.getThreadMessages(
        threadId, 
        limit, 
        cursor
      );
      
      // Update messages state
      setMessages(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(threadId) || [];
        const combined = cursor 
          ? [...existing, ...fetchedMessages]
          : fetchedMessages;
        
        newMap.set(threadId, combined);
        return newMap;
      });
      
      // Update cache
      setMobileCache(prev => {
        const newCache = new Map(prev.messageCacheByThread);
        newCache.set(threadId, {
          messages: fetchedMessages,
          lastMessageId: fetchedMessages[fetchedMessages.length - 1]?.id || '',
          totalCached: fetchedMessages.length,
          hasMore: fetchedMessages.length === limit
        });
        
        return {
          ...prev,
          messageCacheByThread: newCache
        };
      });
      
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages');
    } finally {
      setSyncing(false);
    }
  }, [mobileCache.messageCacheByThread]);

  const sendMessage = useCallback(async (request: SendMessageRequest): Promise<ThreadMessage> => {
    if (!isOnline && enableOffline) {
      // Queue for offline
      const offlineAction: OfflineAction = {
        id: `send_${Date.now()}`,
        type: 'send_message',
        payload: request,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3
      };
      
      setOfflineActions(prev => [...prev, offlineAction]);
      
      // Create optimistic message
      const optimisticMessage: ThreadMessage = {
        id: `temp_${Date.now()}`,
        threadId: request.threadId,
        content: request.content,
        contentType: request.contentType || 'text',
        messageType: request.messageType || 'general_message',
        senderId: userId,
        senderName: 'You',
        isAnonymous: request.isAnonymous || false,
        urgency: request.urgency || 'medium',
        createsMemorialLine: false,
        isEdited: false,
        isDeleted: false,
        replyCount: 0,
        readBy: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        spiritualContext: request.spiritualContext,
        prayerTags: request.spiritualContext?.prayerTags || []
      };
      
      // Add to local state immediately
      setMessages(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(request.threadId) || [];
        newMap.set(request.threadId, [...existing, optimisticMessage]);
        return newMap;
      });
      
      return optimisticMessage;
    }
    
    try {
      setSyncing(true);
      const message = await ConversationService.sendMessage(request);
      
      // Update messages state
      setMessages(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(request.threadId) || [];
        newMap.set(request.threadId, [...existing, message]);
        return newMap;
      });
      
      // Update conversation last activity
      setConversations(prev => prev.map(conv =>
        conv.id === request.threadId
          ? { ...conv, lastActivityAt: new Date(), totalMessages: conv.totalMessages + 1 }
          : conv
      ));
      
      return message;
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [userId, isOnline, enableOffline]);

  const createConversation = useCallback(async (request: CreateConversationRequest): Promise<ConversationThread> => {
    try {
      setLoading(true);
      const conversation = await ConversationService.createConversation(request);
      
      setConversations(prev => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      
      return conversation;
    } catch (err) {
      console.error('Failed to create conversation:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConversation = useCallback(async (
    threadId: string, 
    updates: UpdateConversationRequest
  ) => {
    try {
      await ConversationService.updateConversation(threadId, updates);
      
      setConversations(prev => prev.map(conv =>
        conv.id === threadId ? { ...conv, ...updates } : conv
      ));
    } catch (err) {
      console.error('Failed to update conversation:', err);
      throw err;
    }
  }, []);

  // ============================================================================
  // THREAD MANAGEMENT
  // ============================================================================

  const setActiveConversation = useCallback((threadId: string | null) => {
    setActiveConversationId(threadId);
    
    // Load messages if not already loaded
    if (threadId && !messages.has(threadId)) {
      loadMessages(threadId);
    }
    
    // Mark as priority conversation
    if (threadId) {
      setMobileCache(prev => ({
        ...prev,
        priorityConversations: new Set([...prev.priorityConversations, threadId])
      }));
    }
  }, [messages, loadMessages]);

  const markAsRead = useCallback(async (threadId: string, messageId?: string) => {
    try {
      await ConversationService.markMessagesAsRead(threadId, userId, messageId);
      
      // Update local state optimistically
      setConversations(prev => prev.map(conv =>
        conv.id === threadId ? { ...conv, unreadCount: 0 } : conv
      ));
      
      // Update messages read status
      setMessages(prev => {
        const newMap = new Map(prev);
        const threadMessages = newMap.get(threadId);
        if (threadMessages) {
          const updatedMessages = threadMessages.map(msg => ({
            ...msg,
            readBy: { ...msg.readBy, [userId]: new Date() }
          }));
          newMap.set(threadId, updatedMessages);
        }
        return newMap;
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [userId]);

  const searchMessages = useCallback(async (filters: MessageSearchFilters) => {
    try {
      setSyncing(true);
      const results = await ConversationService.searchMessages(userId, filters);
      setSearchResults(results);
    } catch (err) {
      console.error('Failed to search messages:', err);
      setError('Failed to search messages');
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  const searchConversations = useCallback(async (
    query: string, 
    filters?: ConversationFilters
  ) => {
    try {
      setSyncing(true);
      const results = await ConversationService.searchConversations(userId, query, filters);
      setFilteredConversations(results);
    } catch (err) {
      console.error('Failed to search conversations:', err);
      setError('Failed to search conversations');
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  // ============================================================================
  // REAL-TIME FEATURES
  // ============================================================================

  const sendTypingIndicator = useCallback((threadId: string) => {
    if (!enableRealtime) return;
    
    // Clear existing timeout
    const existing = typingTimeoutRef.current.get(threadId);
    if (existing) {
      clearTimeout(existing);
    }
    
    // Send typing indicator (in real implementation, this would be via websocket)
    console.log('Sending typing indicator for thread:', threadId);
    
    // Set timeout to stop typing indicator
    const timeout = setTimeout(() => {
      stopTypingIndicator(threadId);
    }, 3000);
    
    typingTimeoutRef.current.set(threadId, timeout);
  }, [enableRealtime]);

  const stopTypingIndicator = useCallback((threadId: string) => {
    console.log('Stopping typing indicator for thread:', threadId);
    
    const timeout = typingTimeoutRef.current.get(threadId);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutRef.current.delete(threadId);
    }
  }, []);

  // ============================================================================
  // OFFLINE FEATURES
  // ============================================================================

  const syncOfflineActions = useCallback(async () => {
    if (!isOnline || offlineActions.length === 0) return;
    
    setSyncing(true);
    const successfulActions: string[] = [];
    
    try {
      for (const action of offlineActions) {
        try {
          switch (action.type) {
            case 'send_message':
              await ConversationService.sendMessage(action.payload);
              successfulActions.push(action.id);
              break;
            case 'mark_read':
              await ConversationService.markMessagesAsRead(
                action.payload.threadId,
                userId,
                action.payload.messageId
              );
              successfulActions.push(action.id);
              break;
            default:
              console.warn('Unknown offline action type:', action.type);
          }
        } catch (err) {
          console.error('Failed to sync offline action:', action.id, err);
          
          // Increment retry count
          setOfflineActions(prev => prev.map(a => 
            a.id === action.id 
              ? { ...a, retryCount: a.retryCount + 1 }
              : a
          ));
        }
      }
      
      // Remove successful actions
      setOfflineActions(prev => 
        prev.filter(action => !successfulActions.includes(action.id))
      );
      
      // Reload conversations to get fresh data
      if (successfulActions.length > 0) {
        await loadConversations();
      }
      
    } finally {
      setSyncing(false);
    }
  }, [isOnline, offlineActions, userId, loadConversations]);

  // ============================================================================
  // MOBILE OPTIMIZATION
  // ============================================================================

  const preloadConversation = useCallback(async (threadId: string) => {
    if (messages.has(threadId)) return;
    
    try {
      await loadMessages(threadId, 20); // Load first 20 messages
    } catch (err) {
      console.error('Failed to preload conversation:', threadId, err);
    }
  }, [messages, loadMessages]);

  const clearCache = useCallback(() => {
    setMobileCache(prev => ({
      ...prev,
      conversationList: [],
      messageCacheByThread: new Map(),
      cachedMediaUrls: new Set(),
      lastCacheUpdate: new Date()
    }));
    
    setMessages(new Map());
    setConversations([]);
  }, []);

  const getCacheStats = useCallback(() => {
    const conversationCount = mobileCache.conversationList.length;
    const messageCount = Array.from(mobileCache.messageCacheByThread.values())
      .reduce((total, cache) => total + cache.totalCached, 0);
    
    // Rough size estimation (this would be more sophisticated in practice)
    const estimatedSize = (conversationCount * 1000) + (messageCount * 500); // bytes
    const totalSize = estimatedSize > 1024 * 1024 
      ? `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(estimatedSize / 1024)} KB`;
    
    return {
      conversations: conversationCount,
      messages: messageCount,
      totalSize
    };
  }, [mobileCache]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineActions();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineActions]);

  // Real-time subscriptions
  useEffect(() => {
    if (!enableRealtime || !userId) return;
    
    // Subscribe to conversation updates
    const conversationSubscription = supabase
      .channel(`user_conversations:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_threads',
        filter: `participant_ids.cs.{${userId}}`
      }, (payload) => {
        console.log('Conversation update:', payload);
        // Handle real-time conversation updates
      })
      .subscribe();
    
    subscriptionsRef.current.set('conversations', conversationSubscription);
    
    // Subscribe to message updates for active conversations
    conversations.forEach(conv => {
      const messageSubscription = supabase
        .channel(`thread_messages:${conv.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'thread_messages',
          filter: `thread_id=eq.${conv.id}`
        }, (payload) => {
          console.log('New message:', payload);
          // Handle new messages
        })
        .subscribe();
      
      subscriptionsRef.current.set(`messages:${conv.id}`, messageSubscription);
    });
    
    return () => {
      subscriptionsRef.current.forEach(sub => {
        if (sub) sub.unsubscribe();
      });
      subscriptionsRef.current.clear();
    };
  }, [enableRealtime, userId, conversations]);

  // Initial load
  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId, loadConversations]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, []);

  return {
    // Core state
    conversations: filteredConversations,
    messages,
    activeConversation,
    
    // Loading states
    loading,
    syncing,
    error,
    
    // Counts and metadata
    totalUnreadCount,
    unreadByConversation,
    
    // Search and filtering
    searchResults,
    filteredConversations,
    
    // Real-time features
    typingIndicators,
    isOnline,
    lastSyncTime,
    
    // Core actions
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation,
    updateConversation,
    
    // Thread management
    setActiveConversation,
    markAsRead,
    searchMessages,
    searchConversations,
    
    // Real-time features
    sendTypingIndicator,
    stopTypingIndicator,
    
    // Offline features
    offlineActions,
    syncOfflineActions,
    
    // Mobile optimization
    preloadConversation,
    clearCache,
    getCacheStats
  };
}