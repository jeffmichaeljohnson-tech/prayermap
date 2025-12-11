import { create } from 'zustand';
import { supabase } from './supabase';
import * as Location from 'expo-location';
import { uploadMedia, type MediaType } from './mediaUpload';

type ContentType = 'text' | 'audio' | 'video';

interface RespondToPrayerInput {
  prayerId: string;
  message?: string;
  isAnonymous?: boolean;
  contentType?: ContentType;
  mediaUri?: string;
  mediaDuration?: number;
}

interface PrayerActionsState {
  isResponding: boolean;
  error: string | null;
  lastResponsePrayerId: string | null;

  // Actions
  respondToPrayer: (
    input: RespondToPrayerInput | string, // Support legacy string (prayerId) for backwards compatibility
    message?: string,
    isAnonymous?: boolean
  ) => Promise<{ success: boolean; error?: string }>;

  clearError: () => void;
}

export const usePrayerActionsStore = create<PrayerActionsState>((set, get) => ({
  isResponding: false,
  error: null,
  lastResponsePrayerId: null,

  respondToPrayer: async (inputOrPrayerId, legacyMessage = '', legacyIsAnonymous = false) => {
    set({ isResponding: true, error: null });

    // Handle legacy call pattern (just prayerId string)
    let input: RespondToPrayerInput;
    if (typeof inputOrPrayerId === 'string') {
      input = {
        prayerId: inputOrPrayerId,
        message: legacyMessage,
        isAnonymous: legacyIsAnonymous,
        contentType: 'text',
      };
    } else {
      input = inputOrPrayerId;
    }

    const { prayerId, message = '', isAnonymous = false, contentType = 'text', mediaUri, mediaDuration } = input;

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        set({ isResponding: false, error: 'Please sign in to pray for others' });
        return { success: false, error: 'Please sign in to pray for others' };
      }

      // Get user's current location for the connection line
      let responderLocation: { lat: number; lng: number } | null = null;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          responderLocation = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
        }
      } catch (locError) {
        console.warn('Could not get location for prayer connection:', locError);
      }

      // Get responder name from user metadata or email
      const responderName = user.user_metadata?.display_name
        || user.user_metadata?.full_name
        || user.email?.split('@')[0]
        || 'A fellow believer';

      // Handle media upload if needed
      let mediaUrl: string | null = null;
      if ((contentType === 'audio' || contentType === 'video') && mediaUri) {
        const mediaType: MediaType = contentType === 'audio' ? 'audio' : 'video';
        const uploadResult = await uploadMedia(mediaUri, mediaType, 'responses');

        if (!uploadResult.success) {
          set({ isResponding: false, error: uploadResult.error || 'Failed to upload media' });
          return { success: false, error: uploadResult.error || 'Failed to upload media' };
        }

        mediaUrl = uploadResult.url || null;
      }

      // Build message for audio/video responses
      const finalMessage = contentType === 'audio'
        ? `[Audio response - ${Math.floor(mediaDuration || 0)}s]`
        : contentType === 'video'
          ? `[Video response]`
          : message;

      // Create prayer response
      const { data: responseData, error: responseError } = await supabase
        .from('prayer_responses')
        .insert({
          prayer_id: prayerId,
          responder_id: user.id,
          responder_name: isAnonymous ? null : responderName,
          is_anonymous: isAnonymous,
          message: finalMessage || null,
          content_type: contentType,
          media_url: mediaUrl,
        })
        .select()
        .single();

      if (responseError) {
        console.error('Error creating prayer response:', responseError);
        set({ isResponding: false, error: responseError.message });
        return { success: false, error: responseError.message };
      }

      // Create prayer connection if we have the responder's location
      if (responderLocation && responseData) {
        const { error: connectionError } = await supabase.rpc('create_prayer_connection', {
          p_prayer_id: prayerId,
          p_prayer_response_id: responseData.id,
          p_responder_lat: responderLocation.lat,
          p_responder_lng: responderLocation.lng,
        });

        if (connectionError) {
          console.warn('Error creating prayer connection (non-fatal):', connectionError);
          // Don't fail the response - connection is optional
        }
      }

      set({
        isResponding: false,
        lastResponsePrayerId: prayerId,
        error: null
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to respond to prayer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to respond to prayer';
      set({ isResponding: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Convenience hook
export function usePrayerActions() {
  return usePrayerActionsStore();
}
