import { supabase } from '../lib/supabase';

// ============================================================================
// Types
// ============================================================================

export type ReportReason =
  | 'inappropriate'
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'self_harm'
  | 'other';

export type ReportTargetType = 'prayer' | 'user' | 'response';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export interface ReportData {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

// ============================================================================
// Report Functions
// ============================================================================

/**
 * Submit a report for inappropriate content or behavior
 */
export async function submitReport(data: ReportData): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  try {
    const { error } = await supabase.from('reports').insert({
      reporter_id: data.reporterId,
      target_type: data.targetType,
      target_id: data.targetId,
      reason: data.reason,
      details: data.details || null,
      status: 'pending',
    });

    if (error) {
      console.error('Failed to submit report:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error submitting report:', error);
    return false;
  }
}

/**
 * Get reports submitted by the current user
 */
export async function getUserReports(userId: string): Promise<Report[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch user reports:', error);
      return [];
    }

    return data as Report[];
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return [];
  }
}

// ============================================================================
// Block Functions
// ============================================================================

/**
 * Block a user - their content will be hidden from you
 */
export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  // Prevent blocking yourself
  if (blockerId === blockedId) {
    console.warn('Cannot block yourself');
    return false;
  }

  try {
    const { error } = await supabase.from('user_blocks').insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });

    if (error) {
      // Unique violation = already blocked, consider success
      if (error.code === '23505') {
        return true;
      }
      console.error('Failed to block user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error blocking user:', error);
    return false;
  }
}

/**
 * Unblock a previously blocked user
 */
export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  try {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) {
      console.error('Failed to unblock user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error unblocking user:', error);
    return false;
  }
}

/**
 * Get list of user IDs that the current user has blocked
 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) {
      console.error('Failed to fetch blocked users:', error);
      return [];
    }

    return data.map((row) => row.blocked_id);
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return [];
  }
}

/**
 * Check if a specific user is blocked
 */
export async function isUserBlocked(
  blockerId: string,
  targetId: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', targetId)
      .maybeSingle();

    if (error) {
      console.error('Failed to check block status:', error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error('Error checking block status:', error);
    return false;
  }
}

/**
 * Get full block records for a user (useful for settings/management)
 */
export async function getBlockedUsersWithDetails(
  userId: string
): Promise<UserBlock[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch blocked users:', error);
      return [];
    }

    return data as UserBlock[];
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return [];
  }
}

// ============================================================================
// Report Reason Labels (for UI)
// ============================================================================

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'hate_speech', label: 'Hate speech' },
  { id: 'self_harm', label: 'Self-harm concerns' },
  { id: 'other', label: 'Other' },
];

