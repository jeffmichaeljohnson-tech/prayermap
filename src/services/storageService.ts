import { supabase } from '../lib/supabase';

/**
 * Upload audio file to Supabase Storage
 * @param audioBlob - The audio blob to upload
 * @param userId - The user's ID (for organizing files)
 * @returns The public URL of the uploaded file, or null if failed
 */
export async function uploadAudio(audioBlob: Blob, userId: string): Promise<string | null> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const extension = audioBlob.type.includes('webm') ? 'webm' : 'mp4';
    const fileName = `${userId}/${timestamp}.${extension}`;

    // Upload to the 'prayers' bucket
    const { data, error } = await supabase.storage
      .from('prayers')
      .upload(fileName, audioBlob, {
        contentType: audioBlob.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading audio:', error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('prayers')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload audio:', error);
    return null;
  }
}

/**
 * Upload video file to Supabase Storage
 * @param videoBlob - The video blob to upload
 * @param userId - The user's ID (for organizing files)
 * @returns The public URL of the uploaded file, or null if failed
 */
export async function uploadVideo(videoBlob: Blob, userId: string): Promise<string | null> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const extension = videoBlob.type.includes('webm') ? 'webm' : 'mp4';
    const fileName = `${userId}/${timestamp}.${extension}`;

    // Upload to the 'prayers' bucket
    const { data, error } = await supabase.storage
      .from('prayers')
      .upload(fileName, videoBlob, {
        contentType: videoBlob.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading video:', error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('prayers')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload video:', error);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 * @param filePath - The path of the file to delete
 * @returns True if successful, false otherwise
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from('prayers')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
}

// ============================================
// MESSAGE MEDIA STORAGE FUNCTIONS
// ============================================

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload message media (audio or video) to Supabase Storage
 * @param mediaBlob - The media blob to upload
 * @param type - 'audio' or 'video'
 * @param conversationId - The conversation ID for organizing files
 * @param userId - The user's ID
 * @param onProgress - Optional progress callback (0-100)
 * @returns Upload result with URL and path, or null if failed
 */
export async function uploadMessageMedia(
  mediaBlob: Blob,
  type: 'audio' | 'video',
  conversationId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult | null> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const timestamp = Date.now();
    const extension = mediaBlob.type.includes('webm') ? 'webm' : type === 'audio' ? 'mp3' : 'mp4';
    const fileName = `messages/${conversationId}/${userId}/${timestamp}.${extension}`;

    // Signal start of upload
    onProgress?.(0);

    const { data, error } = await supabase.storage
      .from('messages')
      .upload(fileName, mediaBlob, {
        contentType: mediaBlob.type,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (error) {
      console.error(`Error uploading ${type}:`, error);
      return null;
    }

    onProgress?.(100);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('messages')
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error(`Failed to upload ${type}:`, error);
    return null;
  }
}

/**
 * Upload video thumbnail to Supabase Storage
 * @param thumbnailDataUrl - The thumbnail as a data URL
 * @param conversationId - The conversation ID
 * @param messageId - The message ID or temporary ID
 * @returns The public URL of the thumbnail, or null if failed
 */
export async function uploadThumbnail(
  thumbnailDataUrl: string,
  conversationId: string,
  messageId: string
): Promise<string | null> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    // Convert data URL to blob
    const response = await fetch(thumbnailDataUrl);
    const blob = await response.blob();

    const fileName = `messages/${conversationId}/thumbnails/${messageId}.jpg`;

    const { data, error } = await supabase.storage
      .from('messages')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading thumbnail:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('messages')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload thumbnail:', error);
    return null;
  }
}

/**
 * Delete message media from Supabase Storage
 * @param filePath - The path of the file to delete
 * @returns True if successful, false otherwise
 */
export async function deleteMessageMedia(filePath: string): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from('messages')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting message media:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete message media:', error);
    return false;
  }
}
