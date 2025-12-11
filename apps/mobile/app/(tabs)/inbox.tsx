import { useEffect, useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useInboxStore, type InboxItem } from '@/lib/useInbox';
import { useMessagingStore } from '@/lib/useMessaging';
import { useAuthStore } from '@/lib/useAuthStore';
import { CATEGORY_EMOJIS } from '@/lib/types/prayer';
import type { Conversation } from '@/lib/types/messaging';
import { router } from 'expo-router';
import { AnimatedTabs, EtherealBackground } from '@/components';
import { colors, glass, borderRadius, shadows } from '@/constants/theme';

type TabType = 'responses' | 'messages';

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('responses');

  // Responses store
  const { items, isLoading: isLoadingResponses, error: responsesError, fetchInbox, markAsRead } = useInboxStore();

  // Messaging store
  const {
    conversations,
    isLoadingConversations,
    error: messagingError,
    fetchConversations,
    getOrCreateConversation,
    setCurrentConversation,
  } = useMessagingStore();

  const { user } = useAuthStore();

  // Fetch inbox and conversations on mount
  useEffect(() => {
    if (user) {
      fetchInbox();
      fetchConversations();
    }
  }, [user, fetchInbox, fetchConversations]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    if (activeTab === 'responses') {
      fetchInbox();
    } else {
      fetchConversations();
    }
  }, [activeTab, fetchInbox, fetchConversations]);

  // Handle response item press
  const handleResponsePress = useCallback((item: InboxItem) => {
    if (!item.read_at) {
      markAsRead(item.id);
    }
  }, [markAsRead]);

  // Handle reply button press - start conversation
  const handleReplyPress = useCallback(async (item: InboxItem) => {
    const result = await getOrCreateConversation(item.id);
    if (result.success && result.conversationId) {
      router.push(`/conversation/${result.conversationId}`);
    }
  }, [getOrCreateConversation]);

  // Handle conversation press
  const handleConversationPress = useCallback((conversation: Conversation) => {
    setCurrentConversation(conversation);
    router.push(`/conversation/${conversation.id}`);
  }, [setCurrentConversation]);

  // Render empty state for non-logged-in users
  if (!user) {
    return (
      <EtherealBackground>
        <View style={[styles.container, styles.centerContent]}>
          <View style={styles.emptyIconContainer}>
            <FontAwesome name="inbox" size={48} color={colors.gray[300]} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to view your inbox</Text>
          <Text style={styles.emptySubtitle}>
            See when others pray for your requests and message them
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </EtherealBackground>
    );
  }

  // Render response item
  const renderResponseItem = ({ item }: { item: InboxItem }) => {
    const isUnread = !item.read_at;
    const responderName = item.is_anonymous
      ? 'Someone'
      : item.responder_name || 'A fellow believer';
    const emoji = CATEGORY_EMOJIS[item.prayer_category] || '🙏';

    return (
      <Pressable
        style={[styles.itemCard, isUnread && styles.itemCardUnread]}
        onPress={() => handleResponsePress(item)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.itemTitleRow}>
              <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]}>
                {responderName} prayed for you
              </Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.itemTime}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        {/* Prayer preview */}
        <View style={styles.prayerPreview}>
          <Text style={styles.prayerLabel}>Your prayer:</Text>
          <Text style={styles.prayerText} numberOfLines={2}>
            {item.prayer_title || item.prayer_content}
          </Text>
        </View>

        {/* Response message if any */}
        {item.message && (
          <View style={styles.messageContainer}>
            <FontAwesome name="quote-left" size={12} color="#9CA3AF" />
            <Text style={styles.messageText} numberOfLines={2}>
              {item.message}
            </Text>
          </View>
        )}

        {/* Reply button */}
        <Pressable
          style={({ pressed }) => [
            styles.replyButton,
            pressed && styles.replyButtonPressed,
          ]}
          onPress={() => handleReplyPress(item)}
        >
          <FontAwesome name="reply" size={14} color={colors.purple[400]} />
          <Text style={styles.replyButtonText}>Reply</Text>
        </Pressable>
      </Pressable>
    );
  };

  // Render conversation item
  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unread_count > 0;

    return (
      <Pressable
        style={[styles.itemCard, hasUnread && styles.itemCardUnread]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.itemHeader}>
          <View style={[styles.avatarContainer, item.other_participant_anonymous && styles.avatarAnonymous]}>
            <FontAwesome
              name={item.other_participant_anonymous ? 'user-secret' : 'user'}
              size={20}
              color={item.other_participant_anonymous ? '#6B7280' : '#4169E1'}
            />
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.itemTitleRow}>
              <Text style={[styles.itemTitle, hasUnread && styles.itemTitleUnread]} numberOfLines={1}>
                {item.other_participant_name}
              </Text>
              {hasUnread && (
                <View style={styles.unreadBadgeSmall}>
                  <Text style={styles.unreadBadgeTextSmall}>{item.unread_count}</Text>
                </View>
              )}
            </View>
            <Text style={styles.itemTime}>{formatDate(item.last_message_at)}</Text>
          </View>
        </View>

        {/* Last message preview */}
        <View style={styles.lastMessagePreview}>
          {item.last_message_type === 'audio' && (
            <FontAwesome name="microphone" size={12} color="#6B7280" style={{ marginRight: 4 }} />
          )}
          {item.last_message_type === 'video' && (
            <FontAwesome name="video-camera" size={12} color="#6B7280" style={{ marginRight: 4 }} />
          )}
          <Text style={[styles.lastMessageText, hasUnread && styles.lastMessageTextUnread]} numberOfLines={2}>
            {item.last_message_content}
          </Text>
        </View>

        {/* Prayer context */}
        <View style={styles.prayerContext}>
          <FontAwesome name="comment" size={10} color="#9CA3AF" />
          <Text style={styles.prayerContextText} numberOfLines={1}>
            Re: {item.prayer_title || item.prayer_content}
          </Text>
        </View>
      </Pressable>
    );
  };

  const isLoading = activeTab === 'responses' ? isLoadingResponses : isLoadingConversations;
  const error = activeTab === 'responses' ? responsesError : messagingError;
  const data = activeTab === 'responses' ? items : conversations;
  const unreadResponsesCount = items.filter(i => !i.read_at).length;
  const unreadMessagesCount = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const tabs = useMemo(() => [
    { key: 'responses', label: 'Responses', badge: unreadResponsesCount },
    { key: 'messages', label: 'Messages', badge: unreadMessagesCount },
  ], [unreadResponsesCount, unreadMessagesCount]);

  const handleTabPress = useCallback((key: string) => {
    setActiveTab(key as TabType);
  }, []);

  return (
    <EtherealBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Inbox</Text>
        </View>

      {/* Animated Tab Selector */}
      <AnimatedTabs
        tabs={tabs}
        activeKey={activeTab}
        onTabPress={handleTabPress}
      />

      {/* Loading state */}
      {isLoading && data.length === 0 && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4169E1" />
          <Text style={styles.loadingText}>
            Loading {activeTab === 'responses' ? 'responses' : 'messages'}...
          </Text>
        </View>
      )}

      {/* Error state */}
      {error && (
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Responses List */}
      {activeTab === 'responses' && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingResponses && items.length > 0}
              onRefresh={handleRefresh}
              tintColor="#4169E1"
            />
          }
          ListEmptyComponent={
            !isLoadingResponses ? (
              <View style={styles.emptyState}>
                <FontAwesome name="inbox" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>No prayer responses yet</Text>
                <Text style={styles.emptySubtitle}>
                  When someone prays for your requests, you'll see it here
                </Text>
              </View>
            ) : null
          }
          renderItem={renderResponseItem}
        />
      )}

      {/* Messages List */}
      {activeTab === 'messages' && (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            conversations.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingConversations && conversations.length > 0}
              onRefresh={handleRefresh}
              tintColor="#4169E1"
            />
          }
          ListEmptyComponent={
            !isLoadingConversations ? (
              <View style={styles.emptyState}>
                <FontAwesome name="comments" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>No conversations yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start a conversation by replying to a prayer response
                </Text>
              </View>
            ) : null
          }
          renderItem={renderConversationItem}
        />
      )}
      </View>
    </EtherealBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Cinzel-Bold',
    color: colors.gray[800],
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Account for tab bar
  },
  listContentEmpty: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: colors.glass.white85,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glass.white30,
    padding: 16,
    marginBottom: 12,
    ...shadows.default,
  },
  itemCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.purple[400],
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emojiContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.white92,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarAnonymous: {
    backgroundColor: colors.glass.white92,
  },
  emoji: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: colors.gray[600],
    flex: 1,
  },
  itemTitleUnread: {
    fontFamily: 'Inter-SemiBold',
    color: colors.gray[800],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.purple[400],
    marginLeft: 8,
  },
  unreadBadgeSmall: {
    backgroundColor: colors.purple[400],
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeTextSmall: {
    color: colors.white,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  itemTime: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: colors.gray[400],
    marginTop: 2,
  },
  prayerPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glass.white30,
  },
  prayerLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: colors.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  prayerText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: colors.gray[500],
    lineHeight: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glass.white30,
    gap: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter',
    color: colors.gray[600],
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // Reply button
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    borderRadius: 16,
  },
  replyButtonPressed: {
    opacity: 0.8,
  },
  replyButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: colors.purple[400],
  },
  // Conversation-specific styles
  lastMessagePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glass.white30,
  },
  lastMessageText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter',
    color: colors.gray[500],
    lineHeight: 20,
  },
  lastMessageTextUnread: {
    fontFamily: 'Inter-Medium',
    color: colors.gray[700],
  },
  prayerContext: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  prayerContextText: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: colors.gray[400],
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.glass.white85,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadows.default,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Cinzel-SemiBold',
    color: colors.gray[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: colors.gray[500],
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  signInButton: {
    marginTop: 24,
    backgroundColor: colors.purple[400],
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  signInButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter',
    color: colors.gray[400],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: colors.error,
    flex: 1,
  },
});
