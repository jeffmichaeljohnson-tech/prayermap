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
