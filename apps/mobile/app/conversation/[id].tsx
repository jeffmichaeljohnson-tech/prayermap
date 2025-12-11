import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, router } from 'expo-router';
import { useMessagingStore } from '@/lib/useMessaging';
import { useAuthStore } from '@/lib/useAuthStore';
import { AudioRecorder, AudioPlayer, VideoPicker, VideoPlayer, AnimatedMessageBubble, SuccessAnimation } from '@/components';
import { supabase } from '@/lib/supabase';
import type { Message, Conversation } from '@/lib/types/messaging';

type InputMode = 'text' | 'audio' | 'video';

// Format time for message bubbles
function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Format date for message grouping
function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString();
}

// Group messages by date
function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: { [key: string]: Message[] } = {};

  messages.forEach((message) => {
    const dateKey = new Date(message.created_at).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });

  return Object.entries(groups).map(([dateKey, msgs]) => ({
    date: formatMessageDate(msgs[0].created_at),
    messages: msgs,
  }));
}

export default function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const flatListRef = useRef<FlatList>(null);

  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [textMessage, setTextMessage] = useState('');
  const [isShowingRecorder, setIsShowingRecorder] = useState(false);
  const [isShowingVideoPicker, setIsShowingVideoPicker] = useState(false);
  const [conversationDetails, setConversationDetails] = useState<Conversation | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { user } = useAuthStore();
  const {
    messages,
    currentConversation,
    isLoadingMessages,
    isSendingMessage,
    error,
    fetchMessages,
    sendMessage,
    markConversationRead,
    setCurrentConversation,
  } = useMessagingStore();

  // Fetch conversation details if not already set
  useEffect(() => {
    const fetchConversationDetails = async () => {
      if (!id) return;

      // If we have current conversation, use it
      if (currentConversation && currentConversation.id === id) {
        setConversationDetails(currentConversation);
        return;
      }

      // Otherwise fetch from conversations
      const { conversations } = useMessagingStore.getState();
      const found = conversations.find((c) => c.id === id);
      if (found) {
        setConversationDetails(found);
        setCurrentConversation(found);
      }
    };

    fetchConversationDetails();
  }, [id, currentConversation, setCurrentConversation]);

  // Fetch messages on mount
  useEffect(() => {
    if (id) {
      fetchMessages(id);
    }
  }, [id, fetchMessages]);

  // Mark conversation as read when entering
  useEffect(() => {
    if (id) {
      markConversationRead(id);
    }
  }, [id, markConversationRead]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          // Refetch messages when a new one arrives
          fetchMessages(id);
          // Mark as read since we're in the conversation
          markConversationRead(id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchMessages, markConversationRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setCurrentConversation(null);
    };
  }, [setCurrentConversation]);

  // Handle sending text message
  const handleSendText = useCallback(async () => {
    if (!textMessage.trim() || !id) return;

    const result = await sendMessage({
      conversationId: id,
      content: textMessage.trim(),
      contentType: 'text',
    });

    if (result.success) {
      setTextMessage('');
    } else {
      Alert.alert('Error', result.error || 'Failed to send message');
    }
  }, [textMessage, id, sendMessage]);

  // Handle sending audio message
  const handleSendAudio = useCallback(
    async (uri: string, duration: number) => {
      if (!id) return;

      setIsShowingRecorder(false);

      const result = await sendMessage({
        conversationId: id,
        content: `Voice message (${Math.round(duration)}s)`,
        contentType: 'audio',
        mediaUri: uri,
        mediaDuration: duration,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send voice message');
      }
    },
    [id, sendMessage]
  );

  // Handle sending video message
  const handleSendVideo = useCallback(
    async (uri: string, duration?: number) => {
      if (!id) return;

      setIsShowingVideoPicker(false);

      const result = await sendMessage({
        conversationId: id,
        content: `Video message${duration ? ` (${Math.round(duration)}s)` : ''}`,
        contentType: 'video',
        mediaUri: uri,
        mediaDuration: duration,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send video message');
      }
    },
    [id, sendMessage]
  );

  // Render message bubble with animation
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === user?.id;

    return (
      <AnimatedMessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        index={index}
        animateEntry={true}
      />
    );
  };

  // Render date separator
  const renderDateSeparator = (date: string) => (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{date}</Text>
      <View style={styles.dateLine} />
    </View>
  );

  // Grouped messages for rendering
  const messageGroups = groupMessagesByDate(messages);

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Please sign in to view messages</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={18} color="#4169E1" />
        </Pressable>
        <View style={styles.headerInfo}>
          <View
            style={[
              styles.headerAvatar,
              conversationDetails?.other_participant_anonymous && styles.headerAvatarAnonymous,
            ]}
          >
            <FontAwesome
              name={conversationDetails?.other_participant_anonymous ? 'user-secret' : 'user'}
              size={16}
              color={conversationDetails?.other_participant_anonymous ? '#6B7280' : '#4169E1'}
            />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName} numberOfLines={1}>
              {conversationDetails?.other_participant_name || 'Conversation'}
            </Text>
            {conversationDetails?.prayer_title && (
              <Text style={styles.headerContext} numberOfLines={1}>
                Re: {conversationDetails.prayer_title}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Prayer Context Card */}
      {conversationDetails && (
        <View style={styles.contextCard}>
          <View style={styles.contextHeader}>
            <FontAwesome name="bookmark" size={12} color="#9CA3AF" />
            <Text style={styles.contextLabel}>Original Prayer</Text>
          </View>
          <Text style={styles.contextText} numberOfLines={2}>
            {conversationDetails.prayer_content}
          </Text>
          {conversationDetails.prayer_response_message && (
            <>
              <View style={styles.contextDivider} />
              <View style={styles.contextHeader}>
                <FontAwesome name="comment" size={12} color="#9CA3AF" />
                <Text style={styles.contextLabel}>Their Response</Text>
              </View>
              <Text style={styles.contextText} numberOfLines={2}>
                {conversationDetails.prayer_response_message}
              </Text>
            </>
          )}
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={14} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading State */}
      {isLoadingMessages && messages.length === 0 && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4169E1" />
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          !isLoadingMessages ? (
            <View style={styles.emptyMessages}>
              <FontAwesome name="comments-o" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.emptySubtitle}>
                Send a message to begin your dialogue
              </Text>
            </View>
          ) : null
        }
      />

      {/* Audio Recorder Overlay */}
      {isShowingRecorder && (
        <View style={styles.recorderOverlay}>
          <AudioRecorder
            onRecordingComplete={handleSendAudio}
            onCancel={() => setIsShowingRecorder(false)}
            maxDuration={60}
          />
        </View>
      )}

      {/* Video Picker Overlay */}
      {isShowingVideoPicker && (
        <View style={styles.videoPickerOverlay}>
          <VideoPicker
            onVideoSelected={handleSendVideo}
            onCancel={() => setIsShowingVideoPicker(false)}
            maxDuration={60}
          />
        </View>
      )}

      {/* Input Area */}
      {!isShowingRecorder && !isShowingVideoPicker && (
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
          {/* Media type buttons */}
          <View style={styles.mediaButtons}>
            <Pressable
              style={[styles.mediaButton, inputMode === 'audio' && styles.mediaButtonActive]}
              onPress={() => setIsShowingRecorder(true)}
            >
              <FontAwesome
                name="microphone"
                size={20}
                color={inputMode === 'audio' ? '#4169E1' : '#6B7280'}
              />
            </Pressable>
            <Pressable
              style={[styles.mediaButton, inputMode === 'video' && styles.mediaButtonActive]}
              onPress={() => setIsShowingVideoPicker(true)}
            >
              <FontAwesome
                name="video-camera"
                size={18}
                color={inputMode === 'video' ? '#4169E1' : '#6B7280'}
              />
            </Pressable>
          </View>

          {/* Text Input */}
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={textMessage}
              onChangeText={setTextMessage}
              multiline
              maxLength={1000}
            />
          </View>

          {/* Send Button */}
          <Pressable
            style={[
              styles.sendButton,
              (!textMessage.trim() || isSendingMessage) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendText}
            disabled={!textMessage.trim() || isSendingMessage}
          >
            {isSendingMessage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <FontAwesome name="send" size={16} color="#fff" />
            )}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerAvatarAnonymous: {
    backgroundColor: '#F3F4F6',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerContext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  headerSpacer: {
    width: 40,
  },
  // Context Card
  contextCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contextText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  contextDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  // Messages
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 12,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  // Input Area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 4,
    paddingBottom: 8,
  },
  mediaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaButtonActive: {
    backgroundColor: '#EEF2FF',
  },
  textInputContainer: {
    flex: 1,
    marginHorizontal: 8,
    paddingBottom: 8,
  },
  textInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#1a1a1a',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4169E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  // Recorder overlay
  recorderOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    paddingBottom: 40,
  },
  videoPickerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    paddingBottom: 40,
  },
  // Message bubble styles are now in AnimatedMessageBubble component
});
