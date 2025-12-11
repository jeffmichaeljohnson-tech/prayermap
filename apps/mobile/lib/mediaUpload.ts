import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export type MediaType = 'audio' | 'video' | 'image';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a media file to Supabase Storage
 * @param localUri - The local file URI (file://...)
 * @param mediaType - Type of media: 'audio', 'video', or 'image'
 * @param folder - Subfolder in the bucket (e.g., 'prayers', 'responses', 'messages')
 */
export async function uploadMedia(
  localUri: string,
  mediaType: MediaType,
  folder: string = 'prayers'
): Promise<UploadResult> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Must be authenticated to upload' };
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Generate unique filename
    const timestamp = Date.now();
    const extension = getExtension(mediaType, localUri);
    const filename = `${folder}/${user.id}/${timestamp}.${extension}`;

    // Get content type
    const contentType = getContentType(mediaType, extension);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filename, decode(base64), {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filename);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Media upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a media file from Supabase Storage
 */
export async function deleteMedia(url: string): Promise<boolean> {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/media\/(.+)/);
    if (!pathMatch) {
      console.warn('Could not extract path from URL:', url);
      return false;
    }

    const path = pathMatch[1];
    const { error } = await supabase.storage
      .from('media')
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Media delete failed:', error);
    return false;
  }
}

function getExtension(mediaType: MediaType, uri: string): string {
  // Try to get extension from URI
  const uriParts = uri.split('.');
  const uriExt = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : null;

  if (uriExt && ['m4a', 'mp3', 'wav', 'aac', 'mp4', 'mov', 'jpg', 'jpeg', 'png'].includes(uriExt)) {
    return uriExt;
  }

  // Default extensions by type
  switch (mediaType) {
    case 'audio': return 'm4a';
    case 'video': return 'mp4';
    case 'image': return 'jpg';
  }
}

function getContentType(mediaType: MediaType, extension: string): string {
  const contentTypes: Record<string, string> = {
    'm4a': 'audio/m4a',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'aac': 'audio/aac',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
  };

  return contentTypes[extension] || `${mediaType}/*`;
}

/**
 * Format duration in seconds to mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
