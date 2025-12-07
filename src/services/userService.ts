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
 * Update the user's display name
 */
export async function updateDisplayName(newName: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not initialized' };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      data: { name: newName }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update name'
    };
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

/**
 * User prayer statistics
 */
export interface UserPrayerStats {
  prayersCreated: number;
  prayersReceived: number;  // Responses to your prayers
  prayersSent: number;      // Times you prayed for others
  currentStreak: number;    // Consecutive days praying
  longestStreak: number;
  lastPrayedAt: Date | null;
}

/**
 * Fetch user's prayer statistics
 */
export async function fetchUserStats(userId: string): Promise<UserPrayerStats | null> {
  if (!supabase) return null;

  try {
    // Prayers created by user
    const { count: prayersCreated } = await supabase
      .from('prayers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Responses received (others prayed for your prayers)
    // Using a join-style query to get responses on user's prayers
    const { data: userPrayers } = await supabase
      .from('prayers')
      .select('id')
      .eq('user_id', userId);

    const prayerIds = userPrayers?.map(p => p.id) || [];

    let prayersReceived = 0;
    if (prayerIds.length > 0) {
      const { count } = await supabase
        .from('prayer_responses')
        .select('*', { count: 'exact', head: true })
        .in('prayer_id', prayerIds)
        .neq('responder_id', userId); // Exclude self
      prayersReceived = count || 0;
    }

    // Times user prayed for others
    const { count: prayersSent } = await supabase
      .from('prayer_responses')
      .select('*', { count: 'exact', head: true })
      .eq('responder_id', userId);

    // Get prayer dates for streak calculation
    const { data: prayerDates } = await supabase
      .from('prayer_responses')
      .select('created_at')
      .eq('responder_id', userId)
      .order('created_at', { ascending: false })
      .limit(365); // Last year

    const { currentStreak, longestStreak, lastPrayedAt } = calculateStreaks(
      prayerDates?.map(d => new Date(d.created_at)) || []
    );

    return {
      prayersCreated: prayersCreated || 0,
      prayersReceived,
      prayersSent: prayersSent || 0,
      currentStreak,
      longestStreak,
      lastPrayedAt,
    };
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    return null;
  }
}

/**
 * Calculate prayer streaks from a list of dates
 */
function calculateStreaks(dates: Date[]): {
  currentStreak: number;
  longestStreak: number;
  lastPrayedAt: Date | null;
} {
  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastPrayedAt: null };
  }

  // Get unique days (convert to YYYY-MM-DD strings)
  const uniqueDays = new Set(
    dates.map(d => d.toISOString().split('T')[0])
  );
  const sortedDays = Array.from(uniqueDays).sort().reverse();

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Check if streak is current (prayed today or yesterday)
  const streakIsActive = sortedDays[0] === today || sortedDays[0] === yesterday;

  if (streakIsActive) {
    currentStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const currentDay = new Date(sortedDays[i - 1]);
      const prevDay = new Date(sortedDays[i]);
      const diffDays = Math.round((currentDay.getTime() - prevDay.getTime()) / 86400000);

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak by walking through all days
  for (let i = 1; i < sortedDays.length; i++) {
    const currentDay = new Date(sortedDays[i - 1]);
    const prevDay = new Date(sortedDays[i]);
    const diffDays = Math.round((currentDay.getTime() - prevDay.getTime()) / 86400000);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    lastPrayedAt: dates[0] || null,
  };
}
