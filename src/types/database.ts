/**
 * Database type definitions for Supabase
 * Auto-generated types would go here in production
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      prayers: {
        Row: {
          id: string
          user_id: string
          title: string | null
          content: string
          content_type: 'text' | 'audio' | 'video'
          content_url: string | null
          location: unknown // PostGIS GEOGRAPHY type
          user_name: string | null
          is_anonymous: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          content: string
          content_type: 'text' | 'audio' | 'video'
          content_url?: string | null
          location: unknown
          user_name?: string | null
          is_anonymous?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          content?: string
          content_type?: 'text' | 'audio' | 'video'
          content_url?: string | null
          location?: unknown
          user_name?: string | null
          is_anonymous?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      prayer_responses: {
        Row: {
          id: string
          prayer_id: string
          responder_id: string
          responder_name: string | null
          is_anonymous: boolean
          message: string
          content_type: 'text' | 'audio' | 'video'
          content_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prayer_id: string
          responder_id: string
          responder_name?: string | null
          is_anonymous?: boolean
          message: string
          content_type: 'text' | 'audio' | 'video'
          content_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prayer_id?: string
          responder_id?: string
          responder_name?: string | null
          is_anonymous?: boolean
          message?: string
          content_type?: 'text' | 'audio' | 'video'
          content_url?: string | null
          created_at?: string
        }
      }
      prayer_connections: {
        Row: {
          id: string
          prayer_id: string
          prayer_response_id: string
          from_location: unknown // PostGIS GEOGRAPHY type
          to_location: unknown // PostGIS GEOGRAPHY type
          requester_name: string
          replier_name: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          prayer_id: string
          prayer_response_id: string
          from_location: unknown
          to_location: unknown
          requester_name: string
          replier_name: string
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          prayer_id?: string
          prayer_response_id?: string
          from_location?: unknown
          to_location?: unknown
          requester_name?: string
          replier_name?: string
          created_at?: string
          expires_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          prayer_id: string
          prayer_response_id: string
          participant_1_id: string // Prayer requester
          participant_2_id: string // Responder
          participant_2_anonymous: boolean
          last_message_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          prayer_id: string
          prayer_response_id: string
          participant_1_id: string
          participant_2_id: string
          participant_2_anonymous?: boolean
          last_message_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          prayer_id?: string
          prayer_response_id?: string
          participant_1_id?: string
          participant_2_id?: string
          participant_2_anonymous?: boolean
          last_message_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          content_type: 'text' | 'audio' | 'video'
          media_url: string | null
          media_duration_seconds: number | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          content_type?: 'text' | 'audio' | 'video'
          media_url?: string | null
          media_duration_seconds?: number | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          content_type?: 'text' | 'audio' | 'video'
          media_url?: string | null
          media_duration_seconds?: number | null
          read_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_nearby_prayers: {
        Args: {
          user_lat: number
          user_lng: number
          radius_meters?: number
        }
        Returns: Database['public']['Tables']['prayers']['Row'][]
      }
      create_prayer_connection: {
        Args: {
          p_prayer_id: string
          p_prayer_response_id: string
          p_responder_id: string
        }
        Returns: Database['public']['Tables']['prayer_connections']['Row']
      }
      cleanup_expired_connections: {
        Args: Record<string, never>
        Returns: void
      }
      get_or_create_conversation: {
        Args: {
          p_prayer_response_id: string
        }
        Returns: string // UUID of conversation
      }
      get_user_conversations: {
        Args: {
          p_user_id: string
        }
        Returns: ConversationPreview[]
      }
      get_unread_message_count: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      mark_conversation_read: {
        Args: {
          p_conversation_id: string
        }
        Returns: number // Number of messages marked as read
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ============================================
// MESSAGING SYSTEM TYPES
// ============================================

/**
 * Raw conversation row from database
 */
export interface ConversationRow {
  id: string
  prayer_id: string
  prayer_response_id: string
  participant_1_id: string // Prayer requester
  participant_2_id: string // Responder
  participant_2_anonymous: boolean
  last_message_at: string
  created_at: string
  updated_at: string
}

/**
 * Raw message row from database
 */
export interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  content_type: 'text' | 'audio' | 'video'
  media_url: string | null
  media_duration_seconds: number | null
  read_at: string | null
  created_at: string
}

/**
 * Return type from get_user_conversations function
 */
export interface ConversationPreview {
  conversation_id: string
  prayer_id: string
  prayer_title: string | null
  prayer_content: string
  prayer_response_id: string
  prayer_response_message: string | null
  other_participant_id: string
  other_participant_name: string
  other_participant_anonymous: boolean
  last_message_content: string | null
  last_message_type: string
  last_message_sender_id: string
  last_message_at: string
  unread_count: number
  conversation_created_at: string
}

/**
 * Enriched conversation for frontend use
 */
export interface Conversation extends ConversationRow {
  prayer: {
    id: string
    title: string | null
    content: string
  }
  otherParticipant: {
    id: string
    name: string
    isAnonymous: boolean
  }
  lastMessage: Message | null
  unreadCount: number
}

/**
 * Enriched message for frontend use
 */
export interface Message extends Omit<MessageRow, 'read_at' | 'created_at'> {
  sender: {
    id: string
    name: string
    isAnonymous: boolean
  }
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}

/**
 * Payload for creating a new message
 */
export interface CreateMessagePayload {
  conversation_id: string
  content: string
  content_type?: 'text' | 'audio' | 'video'
  media_url?: string
  media_duration_seconds?: number
}
