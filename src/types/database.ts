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
      notifications: {
        Row: {
          notification_id: string
          user_id: string
          type: 'SUPPORT_RECEIVED' | 'RESPONSE_RECEIVED' | 'PRAYER_ANSWERED'
          payload: Json
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          notification_id?: string
          user_id: string
          type: 'SUPPORT_RECEIVED' | 'RESPONSE_RECEIVED' | 'PRAYER_ANSWERED'
          payload: Json
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          notification_id?: string
          user_id?: string
          type?: 'SUPPORT_RECEIVED' | 'RESPONSE_RECEIVED' | 'PRAYER_ANSWERED'
          payload?: Json
          is_read?: boolean
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
    }
    Enums: {
      [_ in never]: never
    }
  }
}
