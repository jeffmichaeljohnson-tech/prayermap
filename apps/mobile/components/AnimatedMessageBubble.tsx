import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  FadeIn,
  SlideInRight,
  SlideInLeft,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { AudioPlayer } from './AudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import type { Message } from '@/lib/types/messaging';

interface AnimatedMessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  index: number;
  animateEntry?: boolean;
}

// Format time for message bubbles
function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AnimatedMessageBubble({
  message,
  isOwnMessage,
  index,
  animateEntry = true,
}: AnimatedMessageBubbleProps) {
  const scale = useSharedValue(animateEntry ? 0.8 : 1);
  const opacity = useSharedValue(animateEntry ? 0 : 1);

  useEffect(() => {
    if (animateEntry) {
      const delay = Math.min(index * 50, 300);
      scale.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 200 }));
      opacity.value = withDelay(delay, withSpring(1));
    }
  }, [animateEntry, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
        animatedStyle,
      ]}
    >
      {/* Audio message */}
      {message.content_type === 'audio' && message.media_url && (
        <View style={styles.mediaContainer}>
          <AudioPlayer
            uri={message.media_url}
            duration={message.media_duration_seconds}
            compact
          />
        </View>
      )}

      {/* Video message */}
      {message.content_type === 'video' && message.media_url && (
        <View style={styles.videoContainer}>
          <VideoPlayer
            uri={message.media_url}
            duration={message.media_duration_seconds}
            compact
          />
        </View>
      )}

      {/* Text content */}
      {message.content_type === 'text' && (
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {message.content}
        </Text>
      )}

      {/* Timestamp */}
      <Text
        style={[
          styles.messageTime,
          isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
        ]}
      >
        {formatMessageTime(message.created_at)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4169E1',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1a1a1a',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#9CA3AF',
  },
  mediaContainer: {
    marginBottom: 4,
  },
  videoContainer: {
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default AnimatedMessageBubble;
