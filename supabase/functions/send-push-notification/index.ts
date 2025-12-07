/**
 * send-push-notification Edge Function
 *
 * Triggered when a prayer_response is created via database webhook.
 * Sends push notifications to the prayer owner's registered devices.
 *
 * Flow:
 * 1. Database trigger fires on prayer_responses INSERT
 * 2. Trigger calls this Edge Function via pg_net webhook
 * 3. Function fetches prayer owner's push tokens
 * 4. Function sends push via FCM (Android) / APNs (iOS)
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - FCM_SERVER_KEY (optional, for Android/iOS via FCM)
 *
 * 💭 ➡️ 📈
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

// ============================================
// TYPES
// ============================================

interface PrayerResponsePayload {
  id: string;
  prayer_id: string;
  responder_id: string;
  responder_name?: string;
  message: string;
  is_anonymous: boolean;
  content_type: 'text' | 'audio' | 'video';
  created_at: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'prayer_responses';
  record: PrayerResponsePayload;
  schema: 'public';
}

interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

interface NotificationContent {
  title: string;
  body: string;
  data: Record<string, string>;
}

interface FCMResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

// ============================================
// FCM SENDER
// ============================================

async function sendFCM(
  token: string,
  notification: NotificationContent,
  fcmServerKey: string
): Promise<FCMResult> {
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: notification.title,
          body: notification.body,
          sound: 'default',
          badge: '1',
        },
        data: notification.data,
        priority: 'high',
        // iOS specific
        content_available: true,
        mutable_content: true,
      }),
    });

    const result = await response.json();
    
    // Check for FCM errors
    if (result.failure && result.failure > 0) {
      const errorInfo = result.results?.[0]?.error || 'Unknown FCM error';
      console.warn(`FCM delivery failed for token: ${errorInfo}`);
      return { success: false, error: errorInfo, result };
    }
    
    return { success: response.ok, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('FCM send error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================
// TOKEN CLEANUP (for invalid tokens)
// ============================================

async function removeInvalidToken(
  supabase: ReturnType<typeof createClient>,
  token: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .delete()
      .eq('token', token);
    
    if (error) {
      console.warn('Failed to remove invalid token:', error.message);
    } else {
      console.log('Removed invalid push token');
    }
  } catch (e) {
    console.warn('Error removing invalid token:', e);
  }
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  const startTime = Date.now();

  try {
    // Parse webhook payload
    const payload: WebhookPayload = await req.json();

    // Only handle INSERT events on prayer_responses
    if (payload.type !== 'INSERT') {
      console.log(`Ignoring ${payload.type} event on ${payload.table}`);
      return jsonResponse({ message: `Ignored ${payload.type} event` });
    }

    if (payload.table !== 'prayer_responses') {
      console.log(`Ignoring event on ${payload.table}`);
      return jsonResponse({ message: `Ignored table ${payload.table}` });
    }

    const response = payload.record;
    console.log('Processing prayer response:', response.id);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return errorResponse('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Get the prayer to find the owner
    const { data: prayer, error: prayerError } = await supabase
      .from('prayers')
      .select('id, user_id, title, content, user_name')
      .eq('id', response.prayer_id)
      .single();

    if (prayerError || !prayer) {
      console.error('Failed to fetch prayer:', prayerError?.message);
      return errorResponse('Prayer not found', 404);
    }

    // 2. Don't notify if user is responding to their own prayer
    if (prayer.user_id === response.responder_id) {
      console.log('Self-response detected, skipping notification');
      return jsonResponse({ 
        message: 'Self-response, skipping notification',
        prayer_id: response.prayer_id,
      });
    }

    // 3. Get push tokens for the prayer owner
    const { data: tokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('token, platform')
      .eq('user_id', prayer.user_id);

    if (tokensError) {
      console.error('Failed to fetch push tokens:', tokensError.message);
      return errorResponse('Failed to fetch push tokens', 500);
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for prayer owner:', prayer.user_id);
      return jsonResponse({ 
        message: 'No push tokens registered',
        prayer_owner_id: prayer.user_id,
      });
    }

    console.log(`Found ${tokens.length} push token(s) for user ${prayer.user_id}`);

    // 4. Build notification content
    const senderName = response.is_anonymous
      ? 'Anonymous'
      : (response.responder_name || 'Anonymous');
    
    // Create a friendly preview of the prayer
    const prayerPreview = prayer.title 
      || (prayer.content?.substring(0, 30) + (prayer.content?.length > 30 ? '...' : ''))
      || 'your prayer';

    // Customize message based on content type
    let bodyMessage: string;
    switch (response.content_type) {
      case 'audio':
        bodyMessage = `${senderName} sent a voice prayer for "${prayerPreview}"`;
        break;
      case 'video':
        bodyMessage = `${senderName} sent a video prayer for "${prayerPreview}"`;
        break;
      default:
        bodyMessage = `${senderName} prayed for "${prayerPreview}"`;
    }

    const notification: NotificationContent = {
      title: '🙏 Prayer Received',
      body: bodyMessage,
      data: {
        type: 'prayer_response',
        prayer_id: response.prayer_id,
        response_id: response.id,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // For mobile deep linking
      },
    };

    // 5. Send to each token (fire and forget - don't block on failures)
    const results: FCMResult[] = [];

    if (!fcmServerKey) {
      console.warn('FCM_SERVER_KEY not configured - push notifications disabled');
      return jsonResponse({
        message: 'Push notifications not configured',
        tokens_found: tokens.length,
        fcm_configured: false,
      });
    }

    const sendPromises = tokens.map(async ({ token, platform }: PushToken) => {
      // FCM handles both Android and iOS (if configured with APNs in Firebase)
      if (platform === 'android' || platform === 'ios') {
        const result = await sendFCM(token, notification, fcmServerKey);
        
        // Clean up invalid tokens
        if (!result.success && 
            (result.error === 'InvalidRegistration' || 
             result.error === 'NotRegistered' ||
             result.error === 'MismatchSenderId')) {
          await removeInvalidToken(supabase, token);
        }
        
        return { platform, token: token.substring(0, 10) + '...', ...result };
      }
      
      // Web push not yet implemented
      if (platform === 'web') {
        console.log('Web push not yet implemented');
        return { platform, success: false, error: 'Web push not implemented' };
      }

      return { platform, success: false, error: 'Unknown platform' };
    });

    // Wait for all notifications to be sent
    const sendResults = await Promise.all(sendPromises);
    
    const successCount = sendResults.filter(r => r.success).length;
    const failureCount = sendResults.filter(r => !r.success).length;

    const processingTime = Date.now() - startTime;
    
    console.log(`Push notification results: ${successCount} success, ${failureCount} failed in ${processingTime}ms`);

    return jsonResponse({
      success: successCount > 0,
      message: `Sent to ${successCount}/${tokens.length} devices`,
      processing_time_ms: processingTime,
      results: sendResults,
      notification_preview: {
        title: notification.title,
        body: notification.body,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Edge function error:', errorMessage);
    
    return errorResponse('Internal server error', 500, {
      error: errorMessage,
      processing_time_ms: Date.now() - startTime,
    });
  }
});

