/**
 * Enhanced Conversation List Component
 * 
 * Sophisticated conversation organization with prayer-centric categorization,
 * smart filtering, and WhatsApp-level usability.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  Pin, 
  Archive, 
  VolumeX, 
  Heart, 
  Users, 
  Book, 
  MessageCircle,
  Clock,
  ChevronDown,
  Star,
  MapPin,
  Zap,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';

import { useConversationManager } from '../hooks/useConversationManager';
import { useAuth } from '../contexts/AuthContext';
import type { 
  ConversationThread, 
  ConversationFilters, 
  ConversationType,
  PrayerCategory 
} from '../types/conversation';

interface ConversationListProps {
  onSelectConversation: (threadId: string) => void;
  onCreateConversation: () => void;
  className?: string;
}

export function ConversationList({
  onSelectConversation,
  onCreateConversation,
  className = ''
}: ConversationListProps) {
  const { user } = useAuth();
  const {
    conversations,
    loading,
    syncing,
    error,
    totalUnreadCount,
    isOnline,
    lastSyncTime,
    loadConversations,
    searchConversations,
    getCacheStats
  } = useConversationManager({
    userId: user?.id || '',
    enableRealtime: true,
    enableOffline: true
  });

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');
  const [conversationTypeFilter, setConversationTypeFilter] = useState<ConversationType | 'all'>('all');
  const [prayerCategoryFilter, setPrayerCategoryFilter] = useState<PrayerCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'activity' | 'created' | 'unread'>('activity');
  const [showCacheStats, setShowCacheStats] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter and organize conversations
  const organizedConversations = useMemo(() => {
    let filtered = conversations;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.title.toLowerCase().includes(query) ||
        conv.customTitle?.toLowerCase().includes(query) ||
        conv.originalPrayerTitle?.toLowerCase().includes(query) ||
        conv.prayerTags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    switch (selectedCategory) {
      case 'unread':
        filtered = filtered.filter(conv => conv.unreadCount > 0);
        break;
      case 'pinned':
        filtered = filtered.filter(conv => conv.isPinned);
        break;
      case 'archived':
        filtered = filtered.filter(conv => conv.isArchived);
        break;
      default:
        filtered = filtered.filter(conv => !conv.isArchived);
    }

    // Apply conversation type filter
    if (conversationTypeFilter !== 'all') {
      filtered = filtered.filter(conv => conv.type === conversationTypeFilter);
    }

    // Apply prayer category filter
    if (prayerCategoryFilter !== 'all') {
      filtered = filtered.filter(conv => conv.prayerCategory === prayerCategoryFilter);
    }

    // Sort conversations
    filtered.sort((a, b) => {
      // Always sort pinned to top
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      switch (sortBy) {
        case 'activity':
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'unread':
          if (a.unreadCount !== b.unreadCount) {
            return b.unreadCount - a.unreadCount;
          }
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        default:
          return 0;
      }
    });

    // Group conversations by categories for better organization
    const groups = {
      pinned: filtered.filter(conv => conv.isPinned),
      unread: filtered.filter(conv => conv.unreadCount > 0 && !conv.isPinned),
      recent: filtered.filter(conv => 
        conv.unreadCount === 0 && 
        !conv.isPinned && 
        new Date(conv.lastActivityAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      ),
      older: filtered.filter(conv => 
        conv.unreadCount === 0 && 
        !conv.isPinned && 
        new Date(conv.lastActivityAt).getTime() <= Date.now() - 7 * 24 * 60 * 60 * 1000
      )
    };

    return groups;
  }, [conversations, searchQuery, selectedCategory, conversationTypeFilter, prayerCategoryFilter, sortBy]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length > 2) {
      // Use the search service for advanced search
      const filters: ConversationFilters = {};
      if (conversationTypeFilter !== 'all') {
        filters.type = [conversationTypeFilter];
      }
      if (prayerCategoryFilter !== 'all') {
        filters.prayerCategories = [prayerCategoryFilter];
      }
      
      await searchConversations(query, filters);
    }
  };

  const cacheStats = getCacheStats();

  return (
    <div className={`flex flex-col h-full bg-white/10 backdrop-blur-sm ${className}`}>
      {/* Header with Search and Actions */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{conversations.length} conversations</span>
              {totalUnreadCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 font-medium">{totalUnreadCount} unread</span>
                </>
              )}
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <Wifi className="w-3 h-3 text-green-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-500" />
                )}
                <span className="text-xs">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {syncing && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
            <button
              onClick={onCreateConversation}
              className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 rounded-full transition-all"
              title="Start new conversation"
            >
              <Plus className="w-5 h-5 text-gray-800" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search conversations, prayers, scripture..."
            className="w-full pl-10 pr-10 py-2 glass-strong rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-sm"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors ${
              showFilters ? 'bg-purple-500/20 text-purple-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 p-3 glass rounded-xl space-y-3"
            >
              <ConversationFilters
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                conversationTypeFilter={conversationTypeFilter}
                setConversationTypeFilter={setConversationTypeFilter}
                prayerCategoryFilter={prayerCategoryFilter}
                setPrayerCategoryFilter={setPrayerCategoryFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Conversation Groups */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <div className="text-4xl mb-2">😞</div>
            <p className="text-gray-600 text-sm">{error}</p>
            <button
              onClick={() => loadConversations()}
              className="mt-2 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState onCreateConversation={onCreateConversation} />
        ) : (
          <div className="space-y-4 p-4">
            <AnimatePresence mode="popLayout">
              {/* Pinned Conversations */}
              {organizedConversations.pinned.length > 0 && (
                <ConversationGroup
                  title="Pinned"
                  icon={Pin}
                  conversations={organizedConversations.pinned}
                  onSelectConversation={onSelectConversation}
                />
              )}

              {/* Unread Conversations */}
              {organizedConversations.unread.length > 0 && (
                <ConversationGroup
                  title={`Unread (${organizedConversations.unread.length})`}
                  icon={Zap}
                  conversations={organizedConversations.unread}
                  onSelectConversation={onSelectConversation}
                  highlight
                />
              )}

              {/* Recent Conversations */}
              {organizedConversations.recent.length > 0 && (
                <ConversationGroup
                  title="Recent"
                  icon={Clock}
                  conversations={organizedConversations.recent}
                  onSelectConversation={onSelectConversation}
                />
              )}

              {/* Older Conversations */}
              {organizedConversations.older.length > 0 && (
                <ConversationGroup
                  title="Older"
                  icon={Archive}
                  conversations={organizedConversations.older}
                  onSelectConversation={onSelectConversation}
                  collapsed={organizedConversations.older.length > 10}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer with Status and Cache Info */}
      <div className="p-3 border-t border-white/20 bg-white/5">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            {lastSyncTime && (
              <span>Last sync: {lastSyncTime.toLocaleTimeString()}</span>
            )}
          </div>
          <button
            onClick={() => setShowCacheStats(!showCacheStats)}
            className="hover:text-gray-800 transition-colors"
          >
            {cacheStats.totalSize} cached
          </button>
        </div>
        
        <AnimatePresence>
          {showCacheStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 p-2 glass rounded text-xs text-gray-600"
            >
              <div>Conversations: {cacheStats.conversations}</div>
              <div>Messages: {cacheStats.messages}</div>
              <div>Storage: {cacheStats.totalSize}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Helper Components

function ConversationFilters({
  selectedCategory,
  setSelectedCategory,
  conversationTypeFilter,
  setConversationTypeFilter,
  prayerCategoryFilter,
  setPrayerCategoryFilter,
  sortBy,
  setSortBy
}: {
  selectedCategory: string;
  setSelectedCategory: (category: any) => void;
  conversationTypeFilter: any;
  setConversationTypeFilter: (type: any) => void;
  prayerCategoryFilter: any;
  setPrayerCategoryFilter: (category: any) => void;
  sortBy: string;
  setSortBy: (sort: any) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Category Filters */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Show</label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
            { value: 'pinned', label: 'Pinned' },
            { value: 'archived', label: 'Archived' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectedCategory(value)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                selectedCategory === value
                  ? 'bg-purple-500/20 text-purple-700 ring-1 ring-purple-400/30'
                  : 'bg-gray-100/50 text-gray-600 hover:bg-gray-100/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Type and Category Filters */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <select
            value={conversationTypeFilter}
            onChange={(e) => setConversationTypeFilter(e.target.value)}
            className="w-full px-2 py-1 glass-strong rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-400/50"
          >
            <option value="all">All Types</option>
            <option value="prayer_response">Prayer Response</option>
            <option value="group_prayer">Group Prayer</option>
            <option value="scripture_sharing">Scripture Sharing</option>
            <option value="direct_message">Direct Message</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Prayer Category</label>
          <select
            value={prayerCategoryFilter}
            onChange={(e) => setPrayerCategoryFilter(e.target.value)}
            className="w-full px-2 py-1 glass-strong rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-400/50"
          >
            <option value="all">All Categories</option>
            <option value="healing">Healing</option>
            <option value="family">Family</option>
            <option value="guidance">Guidance</option>
            <option value="thanksgiving">Thanksgiving</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Sort Options */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Sort by</label>
        <div className="flex gap-2">
          {[
            { value: 'activity', label: 'Activity' },
            { value: 'unread', label: 'Unread' },
            { value: 'created', label: 'Created' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSortBy(value)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                sortBy === value
                  ? 'bg-purple-500/20 text-purple-700 ring-1 ring-purple-400/30'
                  : 'bg-gray-100/50 text-gray-600 hover:bg-gray-100/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConversationGroup({
  title,
  icon: Icon,
  conversations,
  onSelectConversation,
  highlight = false,
  collapsed = false
}: {
  title: string;
  icon: any;
  conversations: ConversationThread[];
  onSelectConversation: (id: string) => void;
  highlight?: boolean;
  collapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  if (conversations.length === 0) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-2"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          highlight 
            ? 'bg-blue-500/10 hover:bg-blue-500/20' 
            : 'hover:bg-white/10'
        }`}
      >
        <Icon className={`w-4 h-4 ${highlight ? 'text-blue-600' : 'text-gray-600'}`} />
        <span className={`font-medium text-sm ${highlight ? 'text-blue-800' : 'text-gray-700'}`}>
          {title}
        </span>
        <div className="flex-1" />
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isCollapsed ? '-rotate-90' : ''
          }`} 
        />
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1"
          >
            {conversations.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                onSelect={onSelectConversation}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ConversationItem({
  conversation,
  onSelect
}: {
  conversation: ConversationThread;
  onSelect: (id: string) => void;
}) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type: ConversationType) => {
    switch (type) {
      case 'prayer_response':
        return Heart;
      case 'group_prayer':
        return Users;
      case 'scripture_sharing':
        return Book;
      case 'prayer_circle':
        return Star;
      default:
        return MessageCircle;
    }
  };

  const TypeIcon = getTypeIcon(conversation.type);

  return (
    <motion.button
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(conversation.id)}
      className={`w-full text-left p-3 rounded-xl transition-all relative ${
        conversation.unreadCount > 0
          ? 'bg-blue-500/10 border border-blue-200/50 shadow-sm'
          : 'glass hover:glass-strong'
      }`}
    >
      {/* Status Indicators */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        {conversation.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
        {conversation.isMuted && <VolumeX className="w-3 h-3 text-gray-400" />}
        {conversation.unreadCount > 0 && (
          <div className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full min-w-[20px] text-center">
            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
          </div>
        )}
      </div>

      <div className="pr-16">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <TypeIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <h3 className={`font-medium text-sm truncate ${
            conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'
          }`}>
            {conversation.customTitle || conversation.title}
          </h3>
        </div>

        {/* Prayer Context */}
        {conversation.prayerId && conversation.originalPrayerTitle && (
          <div className="flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-blue-600 truncate">
              {conversation.originalPrayerTitle}
            </span>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>{conversation.participantIds.length} participants</span>
          {conversation.totalMessages > 0 && (
            <>
              <span>•</span>
              <span>{conversation.totalMessages} messages</span>
            </>
          )}
          <span>•</span>
          <span>{formatTime(conversation.lastActivityAt)}</span>
        </div>

        {/* Prayer Tags */}
        {conversation.prayerTags && conversation.prayerTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {conversation.prayerTags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-purple-100/50 text-purple-600 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {conversation.prayerTags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{conversation.prayerTags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

function EmptyState({ onCreateConversation }: { onCreateConversation: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 px-4">
      <div className="text-6xl mb-4">💬</div>
      <h3 className="text-gray-800 font-medium mb-2">No Conversations Yet</h3>
      <p className="text-gray-600 text-sm text-center mb-4">
        Start connecting with the prayer community by responding to prayers or starting a new conversation.
      </p>
      <button
        onClick={onCreateConversation}
        className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 rounded-xl transition-all flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Start Conversation
      </button>
    </div>
  );
}