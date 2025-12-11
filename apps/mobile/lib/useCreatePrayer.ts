import { create } from 'zustand';
import { supabase } from './supabase';
import * as Location from 'expo-location';
import type { PrayerCategory } from './types/prayer';
import { uploadMedia, type MediaType } from './mediaUpload';

type ContentType = 'text' | 'audio' | 'video';

// Text overlay type for video prayers
export interface TextOverlay {
  id: string;
  text: string;
  x: number; // 0-1 relative position
  y: number; // 0-1 relative position
  scale: number;
  rotation: number; // degrees
  color: string;
  fontStyle: 'default' | 'bold' | 'serif' | 'script';
}

interface CreatePrayerInput {
  title?: string;
  content: string;
  category: PrayerCategory;
  isAnonymous: boolean;
  contentType?: ContentType;
  mediaUri?: string; // Local file URI for audio/video
  mediaDuration?: number; // Duration in seconds for audio/video
  textOverlays?: TextOverlay[]; // Text overlays for video prayers
}

interface CreatePrayerState {
  isCreating: boolean;
  error: string | null;
  lastCreatedPrayerId: string | null;

  // Actions
  createPrayer: (input: CreatePrayerInput) => Promise<{ success: boolean; error?: string; prayerId?: string; location?: { lat: number; lng: number } }>;
  clearError: () => void;
  reset: () => void;
}

export const useCreatePrayerStore = create<CreatePrayerState>((set, get) => ({
  isCreating: false,
  error: null,
  lastCreatedPrayerId: null,

  createPrayer: async (input) => {
    set({ isCreating: true, error: null });

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        set({ isCreating: false, error: 'Please sign in to create a prayer' });
        return { success: false, error: 'Please sign in to create a prayer' };
      }

      // Get user's current location
      let userLocation: { lat: number; lng: number } | null = null;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          userLocation = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
        }
      } catch (locError) {
        console.warn('Could not get location for prayer:', locError);
      }

      if (!userLocation) {
        set({ isCreating: false, error: 'Location is required to post a prayer. Please enable location services.' });
        return { success: false, error: 'Location is required to post a prayer. Please enable location services.' };
      }

      // Get user name from metadata
      const userName = user.user_metadata?.display_name
        || user.user_metadata?.full_name
        || user.email?.split('@')[0]
        || null;

      // Determine content type and handle media upload if needed
      const contentType = input.contentType || 'text';
      let mediaUrl: string | null = null;

      if ((contentType === 'audio' || contentType === 'video') && input.mediaUri) {
        const mediaType: MediaType = contentType === 'audio' ? 'audio' : 'video';
        const uploadResult = await uploadMedia(input.mediaUri, mediaType, 'prayers');

        if (!uploadResult.success) {
          set({ isCreating: false, error: uploadResult.error || 'Failed to upload media' });
          return { success: false, error: uploadResult.error || 'Failed to upload media' };
        }

        mediaUrl = uploadResult.url || null;
      }

      // Create prayer with PostGIS point format
      const { data, error: insertError } = await supabase
        .from('prayers')
        .insert({
          user_id: user.id,
          title: input.title || null,
          content: input.content,
          content_type: contentType,
          media_url: mediaUrl,
          media_duration: input.mediaDuration ? Math.round(input.mediaDuration) : null,
          text_overlays: input.textOverlays && input.textOverlays.length > 0 ? input.textOverlays : null,
          category: input.category,
          location: `POINT(${userLocation.lng} ${userLocation.lat})`,
          user_name: input.isAnonymous ? null : userName,
          is_anonymous: input.isAnonymous,
          status: 'active',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating prayer:', insertError);
        set({ isCreating: false, error: insertError.message });
        return { success: false, error: insertError.message };
      }

      set({
        isCreating: false,
        lastCreatedPrayerId: data.id,
        error: null,
      });

      return { success: true, prayerId: data.id, location: userLocation };
    } catch (error) {
      console.error('Failed to create prayer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create prayer';
      set({ isCreating: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      isCreating: false,
      error: null,
      lastCreatedPrayerId: null,
    });
  },
}));

// Convenience hook
export function useCreatePrayer() {
  return useCreatePrayerStore();
}
