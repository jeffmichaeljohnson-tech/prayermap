import { useState, useCallback, useMemo } from 'react';
import { IntelligentPineconeUploader } from '../services/pineconeService';
import { useQuery } from '@tanstack/react-query';

/**
 * React hook for searching Pinecone conversations with intelligent features
 */

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: {
    conversationId: string;
    timestamp: string;
    source: string;
    type: string;
    participants: string;
    topics: string;
    technologies: string;
    importance: string;
    [key: string]: any;
  };
}

export interface SearchFilters {
  sources?: string[];
  types?: string[];
  technologies?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  importance?: string[];
  participants?: string[];
  topicTags?: string[];
}

export interface UseSearchOptions {
  enabled?: boolean;
  topK?: number;
  namespace?: string;
  includeMetadata?: boolean;
  debounceMs?: number;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  suggestions: string[];
  totalResults: number;
}

export function usePineconeSearch(options: UseSearchOptions = {}) {
  const {
    enabled = true,
    topK = 20,
    namespace,
    includeMetadata = true,
    debounceMs = 300
  } = options;

  // State management
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    filters: {},
    results: [],
    isLoading: false,
    error: null,
    suggestions: [],
    totalResults: 0
  });

  // Initialize uploader (in a real app, this would come from a context or service)
  const uploader = useMemo(() => new IntelligentPineconeUploader(), []);

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Debounce effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchState.query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchState.query, debounceMs]);

  // Search query with React Query
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
    refetch: executeSearch
  } = useQuery({
    queryKey: ['pinecone-search', debouncedQuery, searchState.filters, topK, namespace],
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        return { results: [], total: 0, suggestions: [] };
      }

      // Build filter object for Pinecone
      const pineconeFilter = buildPineconeFilter(searchState.filters);

      try {
        // Execute search
        const results = await uploader.searchConversations(debouncedQuery, {
          topK,
          namespace,
          filter: pineconeFilter,
          includeMetadata
        });

        // Process and format results
        const formattedResults = results.map(formatSearchResult);
        
        // Generate search suggestions based on results
        const suggestions = generateSearchSuggestions(formattedResults, debouncedQuery);

        return {
          results: formattedResults,
          total: formattedResults.length,
          suggestions
        };
      } catch (error) {
        console.error('Search failed:', error);
        throw new Error('Search failed. Please try again.');
      }
    },
    enabled: enabled && debouncedQuery.trim().length > 0,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2
  });

  // Update state when search results change
  React.useEffect(() => {
    setSearchState(prev => ({
      ...prev,
      results: searchResults?.results || [],
      totalResults: searchResults?.total || 0,
      suggestions: searchResults?.suggestions || [],
      isLoading: isSearching,
      error: searchError?.message || null
    }));
  }, [searchResults, isSearching, searchError]);

  // Search functions
  const updateQuery = useCallback((query: string) => {
    setSearchState(prev => ({
      ...prev,
      query: query.trim(),
      error: null
    }));
  }, []);

  const updateFilters = useCallback((filters: Partial<SearchFilters>) => {
    setSearchState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...filters
      },
      error: null
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      filters: {},
      error: null
    }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchState({
      query: '',
      filters: {},
      results: [],
      isLoading: false,
      error: null,
      suggestions: [],
      totalResults: 0
    });
    setDebouncedQuery('');
  }, []);

  // Semantic search helpers
  const searchSimilar = useCallback(async (referenceId: string) => {
    try {
      const result = searchState.results.find(r => r.id === referenceId);
      if (!result) return;

      // Use the content of the reference result as the query
      updateQuery(result.content.substring(0, 200));
    } catch (error) {
      console.error('Similar search failed:', error);
    }
  }, [searchState.results, updateQuery]);

  const searchByTopics = useCallback((topics: string[]) => {
    updateFilters({
      topicTags: topics
    });
    updateQuery(topics.join(' '));
  }, [updateFilters, updateQuery]);

  const searchByTechnology = useCallback((tech: string) => {
    updateFilters({
      technologies: [tech]
    });
    updateQuery(tech);
  }, [updateFilters, updateQuery]);

  // Analytics and insights
  const getSearchAnalytics = useCallback(() => {
    const { results } = searchState;
    
    if (results.length === 0) {
      return null;
    }

    // Analyze result patterns
    const sources = countOccurrences(results, 'metadata.source');
    const types = countOccurrences(results, 'metadata.type');
    const timeRange = getTimeRange(results);
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    
    return {
      sources,
      types,
      timeRange,
      averageRelevance: Math.round(avgScore * 100),
      resultCount: results.length
    };
  }, [searchState.results]);

  return {
    // State
    ...searchState,
    isSearching,

    // Search actions
    updateQuery,
    updateFilters,
    clearFilters,
    clearSearch,
    executeSearch,

    // Semantic search
    searchSimilar,
    searchByTopics,
    searchByTechnology,

    // Analytics
    getSearchAnalytics,

    // Utilities
    hasResults: searchState.results.length > 0,
    hasFilters: Object.keys(searchState.filters).length > 0,
    canSearch: searchState.query.trim().length > 0
  };
}

/**
 * Helper functions
 */

function buildPineconeFilter(filters: SearchFilters): Record<string, any> {
  const pineconeFilter: Record<string, any> = {};

  if (filters.sources?.length) {
    pineconeFilter.source = { $in: filters.sources };
  }

  if (filters.types?.length) {
    pineconeFilter.type = { $in: filters.types };
  }

  if (filters.technologies?.length) {
    // Technologies are stored as JSON arrays in metadata
    pineconeFilter.technologies = { 
      $in: filters.technologies.map(tech => `"${tech}"`)
    };
  }

  if (filters.importance?.length) {
    pineconeFilter.importance = { $in: filters.importance };
  }

  if (filters.participants?.length) {
    pineconeFilter.participants = {
      $in: filters.participants.map(p => `"${p}"`)
    };
  }

  if (filters.dateRange) {
    pineconeFilter.timestamp = {
      $gte: filters.dateRange.start.toISOString(),
      $lte: filters.dateRange.end.toISOString()
    };
  }

  return pineconeFilter;
}

function formatSearchResult(result: any): SearchResult {
  return {
    id: result.id,
    score: result.score,
    content: result.metadata?.content || '',
    metadata: {
      conversationId: result.metadata?.conversationId || result.id,
      timestamp: result.metadata?.timestamp || new Date().toISOString(),
      source: result.metadata?.source || 'unknown',
      type: result.metadata?.type || 'unknown',
      participants: result.metadata?.participants || '[]',
      topics: result.metadata?.topics || '[]',
      technologies: result.metadata?.technologies || '[]',
      importance: result.metadata?.importance || 'medium',
      ...result.metadata
    }
  };
}

function generateSearchSuggestions(results: SearchResult[], query: string): string[] {
  const suggestions = new Set<string>();
  
  // Extract common topics and technologies from top results
  results.slice(0, 5).forEach(result => {
    try {
      const topics = JSON.parse(result.metadata.topics || '[]');
      const technologies = JSON.parse(result.metadata.technologies || '[]');
      
      [...topics, ...technologies].forEach(item => {
        if (item && typeof item === 'string' && !query.toLowerCase().includes(item.toLowerCase())) {
          suggestions.add(item);
        }
      });
    } catch (e) {
      // Handle parsing errors silently
    }
  });

  return Array.from(suggestions).slice(0, 8);
}

function countOccurrences(results: SearchResult[], path: string): Record<string, number> {
  const counts: Record<string, number> = {};
  
  results.forEach(result => {
    const value = getNestedValue(result, path);
    if (value) {
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  return counts;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function getTimeRange(results: SearchResult[]): { oldest: string; newest: string } {
  const timestamps = results.map(r => new Date(r.metadata.timestamp));
  const oldest = new Date(Math.min(...timestamps.map(d => d.getTime())));
  const newest = new Date(Math.max(...timestamps.map(d => d.getTime())));
  
  return {
    oldest: oldest.toLocaleDateString(),
    newest: newest.toLocaleDateString()
  };
}

/**
 * Higher-level hooks for specific search patterns
 */

export function useRecentConversations(days: number = 7) {
  const search = usePineconeSearch({
    enabled: true,
    topK: 50
  });

  React.useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    search.updateFilters({
      dateRange: { start: startDate, end: endDate }
    });
    search.updateQuery('recent conversations');
  }, [days]);

  return search;
}

export function useTechnologySearch(technology: string) {
  const search = usePineconeSearch({
    enabled: !!technology,
    topK: 30
  });

  React.useEffect(() => {
    if (technology) {
      search.searchByTechnology(technology);
    }
  }, [technology]);

  return search;
}

export function useBugReports() {
  const search = usePineconeSearch({
    enabled: true,
    topK: 40
  });

  React.useEffect(() => {
    search.updateFilters({
      types: ['bug_report'],
      importance: ['high', 'critical']
    });
    search.updateQuery('bug error issue problem');
  }, []);

  return search;
}