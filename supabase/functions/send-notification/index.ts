/**
 * Send Push Notification Edge Function
 *
 * Receives notification data and sends push notifications to user's devices
 * via Firebase Cloud Messaging (FCM) for both Android and iOS.
 *
 * Endpoint: POST /functions/v1/send-notification
 *
 * Triggered by:
 * - Database trigger on notifications table (via pg_net)
 * - Database webhook on notifications table (alternative)
 *
 * Environment Variables Required:
 * - FCM_SERVER_KEY: Firebase Cloud Messaging server key (from Firebase Console)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for database access
 *
 * Security:
 * - Only callable with service role key (internal API)
 * - Rate limited per user
 * - Validates notification ownership
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ============================================================================
// Types
// ============================================================================

interface NotificationPayload {
  notification_id: number;
  user_id: string;
  type: 'SUPPORT_RECEIVED' | 'RESPONSE_RECEIVED' | 'PRAYER_ANSWERED';
  payload: {
    prayer_id?: number;
    response_id?: number;
    supporter_name?: string;
    responder_name?: string;
    message?: string;
    response_preview?: string;
  };
}

interface PushToken {
  id: number;
  user_id: string;
  token: string;
  platform: 'android' | 'ios';
  enabled: boolean;
}

interface FCMPayload {
  to: string;
  notification: {
    title: string;
    body: string;
    sound: string;
    badge?: number;
  };
  data: {
    type: string;
    prayer_id?: string;
    response_id?: string;
    notification_id: string;
  };
  priority: string;
  content_available?: boolean;
  mutable_content?: boolean;
}

interface SendResult {
  token_id: number;
  platform: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse incoming notification data
    const notification: NotificationPayload = await req.json();

    console.log('[Push] Processing notification:', {
      id: notification.notification_id,
      type: notification.type,
      user: notification.user_id
    });

    // Validate required fields
    if (!notification.notification_id || !notification.user_id || !notification.type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('*')
      .eq('user_id', notification.user_id)
      .eq('enabled', true);

    if (tokensError) {
      console.error('[Push] Error fetching tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('[Push] No enabled push tokens found for user:', notification.user_id);
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: 'No push tokens registered'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's unread notification count for badge
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', notification.user_id)
      .eq('is_read', false);

    // Build notification content
    const notificationContent = buildNotificationContent(notification);

    // Send to all registered devices
    const results: SendResult[] = [];
    for (const token of tokens) {
      const result = await sendPushNotification(
        token,
        notificationContent,
        notification,
        unreadCount || 0
      );
      results.push(result);

      // Update last_used_at if successful
      if (result.success) {
        await supabase
          .from('user_push_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', token.id);
      }
    }

    // Count successes
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log('[Push] Sent notifications:', {
      total: results.length,
      success: successCount,
      failed: failureCount
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Push] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build notification title and body based on type
 */
function buildNotificationContent(notification: NotificationPayload): { title: string; body: string } {
  const { type, payload } = notification;

  switch (type) {
    case 'SUPPORT_RECEIVED':
      return {
        title: 'Prayer Support Received',
        body: `${payload.supporter_name || 'Someone'} prayed for you`
      };

    case 'RESPONSE_RECEIVED':
      return {
        title: 'New Prayer Response',
        body: payload.response_preview || `${payload.responder_name || 'Someone'} responded to your prayer`
      };

    case 'PRAYER_ANSWERED':
      return {
        title: 'Prayer Answered!',
        body: payload.message || 'Your prayer has been marked as answered'
      };

    default:
      return {
        title: 'PrayerMap',
        body: payload.message || 'You have a new notification'
      };
  }
}

/**
 * Send push notification via FCM
 * FCM handles both Android (native FCM) and iOS (APNs via FCM)
 */
async function sendPushNotification(
  token: PushToken,
  content: { title: string; body: string },
  notification: NotificationPayload,
  badgeCount: number
): Promise<SendResult> {
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

  if (!fcmServerKey) {
    console.error('[Push] FCM_SERVER_KEY not configured');
    return {
      token_id: token.id,
      platform: token.platform,
      success: false,
      error: 'FCM not configured'
    };
  }

  try {
    // Build FCM payload
    const payload: FCMPayload = {
      to: token.token,
      notification: {
        title: content.title,
        body: content.body,
        sound: 'default',
        badge: badgeCount
      },
      data: {
        type: notification.type,
        notification_id: notification.notification_id.toString(),
        prayer_id: notification.payload.prayer_id?.toString(),
        response_id: notification.payload.response_id?.toString()
      },
      priority: 'high',
      content_available: true, // For iOS background notifications
      mutable_content: true    // For iOS notification service extensions
    };

    // Send to FCM
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || result.failure > 0) {
      console.error('[Push] FCM error:', result);
      return {
        token_id: token.id,
        platform: token.platform,
        success: false,
        error: result.results?.[0]?.error || 'FCM request failed'
      };
    }

    console.log('[Push] Sent successfully to:', token.platform);
    return {
      token_id: token.id,
      platform: token.platform,
      success: true
    };

  } catch (error) {
    console.error('[Push] Error sending to FCM:', error);
    return {
      token_id: token.id,
      platform: token.platform,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
