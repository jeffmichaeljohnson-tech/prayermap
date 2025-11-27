import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get the current user's profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>
): Promise<UserProfile | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return null;
  }
}

/**
 * Change the user's password
 */
export async function changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Error changing password:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to change password:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: 'Failed to send password reset email' };
  }
}

/**
 * Submit a suggestion/feedback
 */
export async function submitSuggestion(
  userId: string,
  suggestion: string,
  userEmail?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    // For now, we'll log suggestions to a simple table
    // In production, you might want to send an email or use a dedicated feedback service
    const { error } = await supabase
      .from('suggestions')
      .insert({
        user_id: userId,
        user_email: userEmail,
        content: suggestion,
      });

    if (error) {
      // If suggestions table doesn't exist, that's okay - just log it
      if (error.code === '42P01') {
        console.log('Suggestion received (table not created):', suggestion);
        return { success: true };
      }
      console.error('Error submitting suggestion:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to submit suggestion:', error);
    return { success: false, error: 'Failed to submit suggestion' };
  }
}
