import { datadogRum } from '@datadog/browser-rum';

// Datadog RUM configuration
const DATADOG_APP_ID = import.meta.env.VITE_DATADOG_APP_ID;
const DATADOG_CLIENT_TOKEN = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;
const DATADOG_ENABLE_DEV = import.meta.env.VITE_DATADOG_ENABLE_DEV === 'true';

// Initialize Datadog RUM
export function initDatadogRum() {
  // Skip if not configured
  if (!DATADOG_APP_ID || !DATADOG_CLIENT_TOKEN) {
    console.warn('[Datadog] RUM not configured - missing APP_ID or CLIENT_TOKEN');
    return;
  }

  // Skip in development unless explicitly enabled
  const isDev = import.meta.env.DEV;
  if (isDev && !DATADOG_ENABLE_DEV) {
    console.log('[Datadog] RUM disabled in development');
    return;
  }

  console.log('[Datadog] Initializing RUM with Session Replay...');

  datadogRum.init({
    applicationId: DATADOG_APP_ID,
    clientToken: DATADOG_CLIENT_TOKEN,
    site: 'datadoghq.com',
    service: 'prayermap',
    env: isDev ? 'development' : 'production',
    version: '1.0.0',
    sessionSampleRate: 100, // Track all sessions
    sessionReplaySampleRate: 100, // Record all sessions for replay
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input',
    // Enable developer mode for better debugging
    silentMultipleInit: true,
  });

  // Start session replay recording
  datadogRum.startSessionReplayRecording();

  console.log('[Datadog] RUM initialized with Session Replay enabled');
}

// Custom action tracking for memorial lines
export const datadogActions = {
  // Track when connections are loaded from database
  connectionsLoaded: (count: number) => {
    datadogRum.addAction('connections_loaded', {
      count,
      timestamp: Date.now(),
    });
    console.log(`[Datadog] Action: connections_loaded (${count})`);
  },

  // Track when a new connection is added (prayer response)
  connectionCreated: (connectionId: string, prayerId: string) => {
    datadogRum.addAction('connection_created', {
      connectionId,
      prayerId,
      timestamp: Date.now(),
    });
    console.log(`[Datadog] Action: connection_created (${connectionId})`);
  },

  // Track when connection is rendered on map
  connectionRendered: (connectionId: string) => {
    datadogRum.addAction('connection_rendered', {
      connectionId,
      timestamp: Date.now(),
    });
  },

  // Track if connection unexpectedly disappears (THIS IS THE BUG WE'RE MONITORING)
  connectionMissing: (connectionId: string, reason: string) => {
    datadogRum.addError(new Error(`Connection missing: ${connectionId}`), {
      connectionId,
      reason,
      timestamp: Date.now(),
    });
    console.error(`[Datadog] ERROR: connection_missing (${connectionId}) - ${reason}`);
  },

  // Track real-time subscription status
  realtimeStatus: (status: string, table: string) => {
    datadogRum.addAction('realtime_status', {
      status,
      table,
      timestamp: Date.now(),
    });
    console.log(`[Datadog] Action: realtime_status (${table}: ${status})`);
  },

  // Track prayer response submission
  prayerResponseSubmitted: (prayerId: string, success: boolean) => {
    datadogRum.addAction('prayer_response_submitted', {
      prayerId,
      success,
      timestamp: Date.now(),
    });
  },
};

// Export for use elsewhere
export { datadogRum };
