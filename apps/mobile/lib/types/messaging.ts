export type MessageContentType = 'text' | 'audio' | 'video';

export interface Conversation {
  id: string;
  prayer_id: string;
  prayer_title: string | null;
  prayer_content: string;
  prayer_response_id: string;
  prayer_response_message: string;
  other_participant_id: string;
  other_participant_name: string;
  other_participant_anonymous: boolean;
  last_message_content: string;
  last_message_type: MessageContentType;
  last_message_sender_id: string;
  last_message_at: string;
  unread_count: number;
  conversation_created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  content_type: MessageContentType;
  media_url: string | null;
  media_duration_seconds: number | null;
  read_at: string | null;
  created_at: string;
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
  contentType?: MessageContentType;
  mediaUri?: string;
  mediaDuration?: number;
}
