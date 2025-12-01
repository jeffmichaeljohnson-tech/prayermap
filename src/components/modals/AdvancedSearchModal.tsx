/**
 * Advanced Search Modal Component
 * 
 * Sophisticated search interface for conversations and messages with
 * spiritual context filtering, scripture search, and prayer journey exploration.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Filter, 
  Calendar, 
  User, 
  Book, 
  Heart, 
  MessageCircle,
  Clock,
  MapPin,
  Star,
  Zap,
  Users,
  Archive,
  ChevronDown,
  Loader2
} from 'lucide-react';

import { useConversationManager } from '../../hooks/useConversationManager';
import { useAuth } from '../../contexts/AuthContext';
import type { 
  MessageSearchFilters, 
  ConversationFilters, 
  SearchResult,
  MessageType,
  PrayerCategory,
  MessageUrgency
} from '../../types/conversation';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult?: (type: 'conversation' | 'message', id: string) => void;
}

export function AdvancedSearchModal({
  isOpen,
  onClose,
  onSelectResult
}: AdvancedSearchModalProps) {
  const { user } = useAuth();
  const {
    searchMessages,
    searchConversations,
    searchResults,
    syncing
  } = useConversationManager({
    userId: user?.id || ''
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'conversations' | 'messages'>('all');
  const [results, setResults] = useState<{
    conversations: any[];
    messages: SearchResult[];
  }>({ conversations: [], messages: [] });

  // Filter state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [messageFilters, setMessageFilters] = useState<MessageSearchFilters>({});
  const [conversationFilters, setConversationFilters] = useState<ConversationFilters>({});

  // UI state
  const [activeTab, setActiveTab] = useState<'results' | 'filters'>('results');
  const [loading, setLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setResults({ conversations: [], messages: [] });
      return;
    }

    setLoading(true);
    try {
      const promises: Promise<any>[] = [];

      if (searchType === 'all' || searchType === 'messages') {
        promises.push(searchMessages({
          query,
          ...messageFilters
        }));
      }

      if (searchType === 'all' || searchType === 'conversations') {
        promises.push(searchConversations(query, conversationFilters));
      }

      await Promise.all(promises);

      // Results are updated through the hook
      setResults({
        conversations: [], // This would be populated from searchConversations
        messages: searchResults
      });

    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [searchType, messageFilters, conversationFilters, searchMessages, searchConversations, searchResults]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setResults({ conversations: [], messages: [] });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Search className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Advanced Search</h3>
              <p className="text-sm text-gray-600">
                Search conversations, messages, scripture, and prayer journeys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search for conversations, messages, scripture references, prayer topics..."
            className="w-full pl-12 pr-12 py-4 glass-strong rounded-2xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-lg"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100/50 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { value: 'all', label: 'All', icon: Search },
            { value: 'conversations', label: 'Conversations', icon: MessageCircle },
            { value: 'messages', label: 'Messages', icon: Heart }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSearchType(value as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                searchType === value
                  ? 'bg-purple-500/20 text-purple-700 ring-1 ring-purple-400/30'
                  : 'glass text-gray-600 hover:glass-strong'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="flex items-center gap-2 px-3 py-2 glass hover:glass-strong rounded-lg mb-4 self-start transition-all"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Advanced Filters</span>
          <ChevronDown 
            className={`w-4 h-4 transition-transform ${
              showAdvancedFilters ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 p-4 glass rounded-2xl space-y-4"
            >
              <AdvancedFilters
                messageFilters={messageFilters}
                setMessageFilters={setMessageFilters}
                conversationFilters={conversationFilters}
                setConversationFilters={setConversationFilters}
                searchType={searchType}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <div className="flex-1 overflow-hidden">
          {loading || syncing ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span className="ml-3 text-gray-600">Searching...</span>
            </div>
          ) : searchQuery.length < 2 ? (
            <SearchSuggestions onSearchSuggestion={handleSearchChange} />
          ) : (
            <SearchResults
              query={searchQuery}
              conversations={results.conversations}
              messages={results.messages}
              onSelectResult={onSelectResult}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Advanced Filters Component
function AdvancedFilters({
  messageFilters,
  setMessageFilters,
  conversationFilters,
  setConversationFilters,
  searchType
}: {
  messageFilters: MessageSearchFilters;
  setMessageFilters: (filters: MessageSearchFilters) => void;
  conversationFilters: ConversationFilters;
  setConversationFilters: (filters: ConversationFilters) => void;
  searchType: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Message Filters */}
      {(searchType === 'all' || searchType === 'messages') && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800 flex items-center gap-2">
            <Heart className="w-4 h-4 text-purple-500" />
            Message Filters
          </h4>
          
          <div className="space-y-3">
            {/* Message Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message Types</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'prayer_request', label: 'Prayer Requests', icon: '🙏' },
                  { value: 'prayer_response', label: 'Responses', icon: '💙' },
                  { value: 'scripture_share', label: 'Scripture', icon: '📖' },
                  { value: 'testimony', label: 'Testimonies', icon: '✨' },
                  { value: 'encouragement', label: 'Encouragement', icon: '💪' }
                ].map(({ value, label, icon }) => (
                  <FilterChip
                    key={value}
                    label={`${icon} ${label}`}
                    selected={messageFilters.messageTypes?.includes(value as MessageType)}
                    onToggle={(selected) => {
                      const types = messageFilters.messageTypes || [];
                      setMessageFilters({
                        ...messageFilters,
                        messageTypes: selected
                          ? [...types, value as MessageType]
                          : types.filter(t => t !== value)
                      });
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Prayer Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prayer Categories</label>
              <div className="flex flex-wrap gap-2">
                {[
                  'healing', 'family', 'guidance', 'thanksgiving', 'financial'
                ].map((category) => (
                  <FilterChip
                    key={category}
                    label={category.charAt(0).toUpperCase() + category.slice(1)}
                    selected={messageFilters.prayerCategories?.includes(category as PrayerCategory)}
                    onToggle={(selected) => {
                      const categories = messageFilters.prayerCategories || [];
                      setMessageFilters({
                        ...messageFilters,
                        prayerCategories: selected
                          ? [...categories, category as PrayerCategory]
                          : categories.filter(c => c !== category)
                      });
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Urgency Levels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
              <div className="flex gap-2">
                {[
                  { value: 'emergency', label: 'Urgent', color: 'bg-red-100 text-red-700' },
                  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
                  { value: 'medium', label: 'Normal', color: 'bg-gray-100 text-gray-700' },
                  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' }
                ].map(({ value, label, color }) => (
                  <FilterChip
                    key={value}
                    label={label}
                    selected={messageFilters.urgency?.includes(value as MessageUrgency)}
                    className={color}
                    onToggle={(selected) => {
                      const urgencies = messageFilters.urgency || [];
                      setMessageFilters({
                        ...messageFilters,
                        urgency: selected
                          ? [...urgencies, value as MessageUrgency]
                          : urgencies.filter(u => u !== value)
                      });
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Content Filters */}
            <div className="space-y-2">
              <FilterToggle
                label="Has Scripture References"
                checked={messageFilters.hasScripture || false}
                onChange={(checked) => setMessageFilters({
                  ...messageFilters,
                  hasScripture: checked
                })}
                icon={Book}
              />
              <FilterToggle
                label="Has Media (Audio/Video)"
                checked={messageFilters.hasMedia || false}
                onChange={(checked) => setMessageFilters({
                  ...messageFilters,
                  hasMedia: checked
                })}
                icon={Star}
              />
              <FilterToggle
                label="Unread Only"
                checked={messageFilters.isUnread || false}
                onChange={(checked) => setMessageFilters({
                  ...messageFilters,
                  isUnread: checked
                })}
                icon={Zap}
              />
            </div>
          </div>
        </div>
      )}

      {/* Conversation Filters */}
      {(searchType === 'all' || searchType === 'conversations') && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-purple-500" />
            Conversation Filters
          </h4>
          
          <div className="space-y-3">
            {/* Conversation Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Types</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'prayer_response', label: 'Prayer Response' },
                  { value: 'group_prayer', label: 'Group Prayer' },
                  { value: 'scripture_sharing', label: 'Scripture Sharing' },
                  { value: 'direct_message', label: 'Direct Message' }
                ].map(({ value, label }) => (
                  <FilterChip
                    key={value}
                    label={label}
                    selected={conversationFilters.type?.includes(value as any)}
                    onToggle={(selected) => {
                      const types = conversationFilters.type || [];
                      setConversationFilters({
                        ...conversationFilters,
                        type: selected
                          ? [...types, value as any]
                          : types.filter(t => t !== value)
                      });
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Status Filters */}
            <div className="space-y-2">
              <FilterToggle
                label="Pinned Conversations"
                checked={conversationFilters.isPinned || false}
                onChange={(checked) => setConversationFilters({
                  ...conversationFilters,
                  isPinned: checked
                })}
                icon={Star}
              />
              <FilterToggle
                label="Unread Messages"
                checked={conversationFilters.isUnread || false}
                onChange={(checked) => setConversationFilters({
                  ...conversationFilters,
                  isUnread: checked
                })}
                icon={Zap}
              />
              <FilterToggle
                label="Archived"
                checked={conversationFilters.isArchived || false}
                onChange={(checked) => setConversationFilters({
                  ...conversationFilters,
                  isArchived: checked
                })}
                icon={Archive}
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={conversationFilters.dateRange?.start?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setConversationFilters({
                    ...conversationFilters,
                    dateRange: {
                      ...conversationFilters.dateRange,
                      start: e.target.value ? new Date(e.target.value) : undefined
                    } as any
                  })}
                  className="px-3 py-2 glass-strong rounded-lg text-sm"
                />
                <input
                  type="date"
                  value={conversationFilters.dateRange?.end?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setConversationFilters({
                    ...conversationFilters,
                    dateRange: {
                      ...conversationFilters.dateRange,
                      end: e.target.value ? new Date(e.target.value) : undefined
                    } as any
                  })}
                  className="px-3 py-2 glass-strong rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Filter Components
function FilterChip({
  label,
  selected,
  onToggle,
  className = ''
}: {
  label: string;
  selected: boolean;
  onToggle: (selected: boolean) => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => onToggle(!selected)}
      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
        selected
          ? 'ring-2 ring-purple-400/50 bg-purple-500/20 text-purple-700'
          : className || 'bg-gray-100/50 text-gray-600 hover:bg-gray-100/70'
      }`}
    >
      {label}
    </button>
  );
}

function FilterToggle({
  label,
  checked,
  onChange,
  icon: Icon
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: any;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
        checked 
          ? 'bg-purple-500 border-purple-500' 
          : 'border-gray-300 hover:border-purple-400'
      }`}>
        {checked && <div className="w-2 h-2 bg-white rounded-sm" />}
      </div>
      <Icon className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// Search Suggestions Component
function SearchSuggestions({
  onSearchSuggestion
}: {
  onSearchSuggestion: (query: string) => void;
}) {
  const suggestions = [
    { query: 'healing prayers', icon: '🙏', description: 'Find prayers about healing and recovery' },
    { query: 'John 3:16', icon: '📖', description: 'Search for specific scripture references' },
    { query: 'testimony', icon: '✨', description: 'Find answered prayer testimonies' },
    { query: 'family guidance', icon: '👨‍👩‍👧‍👦', description: 'Prayers about family decisions' },
    { query: 'urgent prayer', icon: '🚨', description: 'High priority prayer requests' },
    { query: 'thanksgiving', icon: '🙏', description: 'Prayers of gratitude and thanks' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          Discover Prayer Conversations
        </h3>
        <p className="text-gray-600">
          Search through messages, scripture, and spiritual conversations
        </p>
      </div>

      <div>
        <h4 className="font-medium text-gray-800 mb-3">Popular Searches</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSearchSuggestion(suggestion.query)}
              className="flex items-center gap-3 p-3 glass hover:glass-strong rounded-xl transition-all text-left"
            >
              <span className="text-2xl">{suggestion.icon}</span>
              <div>
                <div className="font-medium text-gray-800">{suggestion.query}</div>
                <div className="text-xs text-gray-600">{suggestion.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Search Results Component
function SearchResults({
  query,
  conversations,
  messages,
  onSelectResult
}: {
  query: string;
  conversations: any[];
  messages: SearchResult[];
  onSelectResult?: (type: 'conversation' | 'message', id: string) => void;
}) {
  const totalResults = conversations.length + messages.length;

  if (totalResults === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">No Results Found</h3>
        <p className="text-gray-600">
          Try adjusting your search terms or filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-800">
          {totalResults} results for "{query}"
        </h3>
      </div>

      <div className="space-y-6">
        {/* Conversation Results */}
        {conversations.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Conversations ({conversations.length})
            </h4>
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <ConversationSearchResult
                  key={conversation.id}
                  conversation={conversation}
                  query={query}
                  onSelect={() => onSelectResult?.('conversation', conversation.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Message Results */}
        {messages.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Messages ({messages.length})
            </h4>
            <div className="space-y-2">
              {messages.map((message) => (
                <MessageSearchResult
                  key={message.messageId}
                  message={message}
                  query={query}
                  onSelect={() => onSelectResult?.('message', message.messageId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationSearchResult({
  conversation,
  query,
  onSelect
}: {
  conversation: any;
  query: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full p-4 glass hover:glass-strong rounded-xl transition-all text-left"
    >
      <div className="flex items-center gap-3">
        <MessageCircle className="w-5 h-5 text-purple-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-gray-800 truncate">{conversation.title}</h5>
          <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
            <Users className="w-3 h-3" />
            <span>{conversation.participantCount} participants</span>
            <Clock className="w-3 h-3 ml-2" />
            <span>{new Date(conversation.lastActivity).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function MessageSearchResult({
  message,
  query,
  onSelect
}: {
  message: SearchResult;
  query: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full p-4 glass hover:glass-strong rounded-xl transition-all text-left"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-800">
              {message.senderName}
            </span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {message.messageType.replace('_', ' ')}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(message.createdAt).toLocaleDateString()}
          </span>
        </div>
        
        <div 
          className="text-sm text-gray-700"
          dangerouslySetInnerHTML={{ __html: message.highlightedContent || message.content }}
        />
        
        {message.prayerContext && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <MapPin className="w-3 h-3" />
            <span>{message.prayerContext}</span>
          </div>
        )}
      </div>
    </button>
  );
}