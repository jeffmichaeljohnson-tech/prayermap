/**
 * React hook for RAG (Retrieval-Augmented Generation) queries
 * 
 * Provides a simple interface for asking questions and getting AI-generated
 * responses based on PrayerMap's conversation history and documentation.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ragService, type RAGResponse, type RAGOptions, type Citation } from '../services/ragService';

export interface UseRAGOptions {
  enabled?: boolean;
  topK?: number;
  namespace?: string;
  model?: 'gpt-4o' | 'gpt-4-turbo' | 'gpt-4' | 'gpt-3.5-turbo';
  temperature?: number;
  maxTokens?: number;
  includeCitations?: boolean;
  systemPrompt?: string;
  filters?: Record<string, any>;
  debounceMs?: number;
}

export interface UseRAGRreturn {
  // State
  query: string;
  response: string | null;
  citations: Citation[];
  sources: RAGResponse['sources'];
  isLoading: boolean;
  error: string | null;
  metadata: RAGResponse['metadata'] | null;

  // Actions
  ask: (question: string) => void;
  clear: () => void;
  retry: () => void;

  // Utilities
  hasResponse: boolean;
  hasCitations: boolean;
  canAsk: boolean;
}

/**
 * Hook for RAG queries
 */
export function useRAG(options: UseRAGOptions = {}): UseRAGRreturn {
  const {
    enabled = true,
    topK = 10,
    namespace,
    model = 'gpt-4o', // Upgraded to GPT-4o for superior reasoning
    temperature = 0.7,
    maxTokens = 1000,
    includeCitations = true,
    systemPrompt,
    filters,
    debounceMs = 500,
  } = options;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // RAG query with React Query
  const {
    data: ragResponse,
    isLoading,
    error,
    refetch: retry,
  } = useQuery({
    queryKey: [
      'rag',
      debouncedQuery,
      topK,
      namespace,
      model,
      temperature,
      maxTokens,
      includeCitations,
      filters,
    ],
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        return null;
      }

      const response = await ragService.generateRAGResponse(debouncedQuery, {
        topK,
        namespace,
        model,
        temperature,
        maxTokens,
        includeCitations,
        systemPrompt,
        filters,
      });

      return response;
    },
    enabled: enabled && debouncedQuery.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Actions
  const ask = useCallback((question: string) => {
    setQuery(question.trim());
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  // Computed values
  const hasResponse = ragResponse !== null && ragResponse !== undefined;
  const hasCitations = ragResponse?.citations.length > 0;
  const canAsk = query.trim().length > 0;

  return {
    // State
    query,
    response: ragResponse?.response || null,
    citations: ragResponse?.citations || [],
    sources: ragResponse?.sources || [],
    isLoading,
    error: error?.message || null,
    metadata: ragResponse?.metadata || null,

    // Actions
    ask,
    clear,
    retry,

    // Utilities
    hasResponse,
    hasCitations,
    canAsk,
  };
}

/**
 * Hook for streaming RAG responses (future enhancement)
 * Currently returns same as useRAG, but can be extended for streaming
 */
export function useRAGStreaming(options: UseRAGOptions = {}): UseRAGRreturn {
  // For now, use regular RAG
  // Future: Implement streaming with Server-Sent Events or WebSockets
  return useRAG(options);
}

