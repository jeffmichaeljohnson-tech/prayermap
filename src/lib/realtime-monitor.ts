/**
 * Realtime Connection Health Monitor
 * 
 * Monitors Supabase Realtime WebSocket connections for:
 * - Connection status
 * - Message delivery latency
 * - Reconnection attempts
 * - Subscription health
 * 
 * Reports metrics to Datadog for full visibility into messaging system.
 */

import { datadogRum } from '@datadog/browser-rum';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChannelConnection {
  channel: RealtimeChannel;
  status: 'connected' | 'disconnected' | 'error' | 'subscribing';
  reconnectAttempts: number;
  lastMessageTime: number;
  messageCount: number;
  subscribeStartTime: number;
  totalLatency: number;
}

export class RealtimeMonitor {
  private connections = new Map<string, ChannelConnection>();
  private healthCheckInterval: number | null = null;

  /**
   * Monitor a Supabase Realtime channel
   */
  monitorChannel(channelName: string, channel: RealtimeChannel): void {
    const subscribeStartTime = Date.now();
    
    // Initialize connection tracking
    this.connections.set(channelName, {
      channel,
      status: 'subscribing',
      reconnectAttempts: 0,
      lastMessageTime: 0,
      messageCount: 0,
      subscribeStartTime,
      totalLatency: 0,
    });

    // Track subscription status changes
    const statusCallback = (status: string) => {
      const conn = this.connections.get(channelName);
      if (!conn) return;

      if (status === 'SUBSCRIBED') {
        const subscribeLatency = Date.now() - subscribeStartTime;
        conn.status = 'connected';
        conn.lastMessageTime = Date.now();
        conn.reconnectAttempts = 0;

        // Report successful subscription
        datadogRum.addAction('realtime.subscribed', () => {}, {
          channel: channelName,
          subscribe_latency_ms: subscribeLatency,
        });

        // Track subscription latency
        datadogRum.addTiming(`realtime.subscribe.${channelName}.latency`, subscribeLatency);

        // Alert if subscription takes too long (>5 seconds)
        if (subscribeLatency > 5000) {
          datadogRum.addError(new Error(`Slow subscription: ${channelName} took ${subscribeLatency}ms`), {
            type: 'realtime_slow_subscription',
            channel: channelName,
            latency: subscribeLatency,
          });
        }
      } else if (status === 'CHANNEL_ERROR') {
        conn.status = 'error';
        conn.reconnectAttempts++;

        datadogRum.addError(new Error(`Channel error: ${channelName}`), {
          type: 'realtime_channel_error',
          channel: channelName,
          reconnectAttempts: conn.reconnectAttempts,
        });
      } else if (status === 'TIMED_OUT') {
        conn.status = 'disconnected';
        conn.reconnectAttempts++;

        datadogRum.addAction('realtime.timeout', () => {}, {
          channel: channelName,
          reconnectAttempts: conn.reconnectAttempts,
        });
      } else if (status === 'CLOSED') {
        conn.status = 'disconnected';
      }
    };

    // Subscribe to status changes
    channel.subscribe(statusCallback);

    // Wrap channel.on to track messages
    const originalOn = channel.on.bind(channel);
    channel.on = (event: string, callback: any) => {
      return originalOn(event, (payload: any) => {
        const conn = this.connections.get(channelName);
        if (conn) {
          const now = Date.now();
          conn.lastMessageTime = now;
          conn.messageCount++;

          // Track message delivery latency
          if (payload.new?.created_at) {
            const messageTime = new Date(payload.new.created_at).getTime();
            const latency = now - messageTime;
            conn.totalLatency += latency;

            datadogRum.addTiming(`realtime.message.${channelName}.latency`, latency);

            // Alert on slow message delivery (>2 seconds for real-time)
            if (latency > 2000) {
              datadogRum.addError(new Error(`Slow message delivery: ${latency}ms`), {
                type: 'realtime_slow_message',
                channel: channelName,
                latency,
                messageId: payload.new.id,
              });
            }
          }

          // Track message event
          datadogRum.addAction(`realtime.message.${channelName}.${event}`, () => {}, {
            channel: channelName,
            event,
            messageId: payload.new?.id || payload.old?.id,
          });
        }

        return callback(payload);
      });
    };
  }

  /**
   * Track message sent (for delivery latency calculation)
   */
  trackMessageSent(channelName: string, messageId: string): void {
    const conn = this.connections.get(channelName);
    if (conn) {
      // Store sent time for latency calculation
      localStorage.setItem(`msg_sent_${messageId}`, Date.now().toString());
    }
  }

  /**
   * Track message received (calculate end-to-end latency)
   */
  trackMessageReceived(channelName: string, messageId: string): void {
    const sentTime = localStorage.getItem(`msg_sent_${messageId}`);
    if (sentTime) {
      const latency = Date.now() - parseInt(sentTime);
      const conn = this.connections.get(channelName);
      
      if (conn) {
        conn.totalLatency += latency;
      }

      datadogRum.addTiming(`realtime.message.${channelName}.e2e_latency`, latency);
      localStorage.removeItem(`msg_sent_${messageId}`);
    }
  }

  /**
   * Get connection health metrics
   */
  getHealthMetrics() {
    const metrics = {
      totalChannels: this.connections.size,
      connectedChannels: 0,
      disconnectedChannels: 0,
      errorChannels: 0,
      subscribingChannels: 0,
      totalReconnectAttempts: 0,
      totalMessages: 0,
      avgMessageLatency: 0,
      oldestStaleConnection: 0, // Time since last message
    };

    let totalLatency = 0;
    let latencyCount = 0;
    const now = Date.now();

    this.connections.forEach((conn) => {
      if (conn.status === 'connected') metrics.connectedChannels++;
      else if (conn.status === 'disconnected') metrics.disconnectedChannels++;
      else if (conn.status === 'error') metrics.errorChannels++;
      else if (conn.status === 'subscribing') metrics.subscribingChannels++;

      metrics.totalReconnectAttempts += conn.reconnectAttempts;
      metrics.totalMessages += conn.messageCount;

      if (conn.messageCount > 0) {
        totalLatency += conn.totalLatency;
        latencyCount += conn.messageCount;
      }

      // Track stale connections (no messages in >30 seconds)
      if (conn.lastMessageTime > 0) {
        const staleTime = now - conn.lastMessageTime;
        if (staleTime > metrics.oldestStaleConnection) {
          metrics.oldestStaleConnection = staleTime;
        }
      }
    });

    if (latencyCount > 0) {
      metrics.avgMessageLatency = totalLatency / latencyCount;
    }

    return metrics;
  }

  /**
   * Report metrics to Datadog (call periodically)
   */
  reportMetrics(): void {
    const metrics = this.getHealthMetrics();

    datadogRum.addAction('realtime.health', () => {}, {
      ...metrics,
      timestamp: Date.now(),
    });

    // Alert if connection health is poor
    if (
      metrics.errorChannels > 0 ||
      (metrics.disconnectedChannels > metrics.connectedChannels && metrics.totalChannels > 0) ||
      metrics.avgMessageLatency > 2000
    ) {
      datadogRum.addError(new Error('Poor realtime connection health'), {
        type: 'realtime_health_warning',
        ...metrics,
      });
    }

    // Alert on stale connections
    if (metrics.oldestStaleConnection > 60000) {
      datadogRum.addAction('realtime.stale_connection', () => {}, {
        staleTime: metrics.oldestStaleConnection,
        ...metrics,
      });
    }
  }

  /**
   * Start periodic health reporting
   */
  startHealthReporting(intervalMs = 30000): void {
    if (this.healthCheckInterval !== null) {
      return; // Already started
    }

    this.healthCheckInterval = window.setInterval(() => {
      this.reportMetrics();
    }, intervalMs);
  }

  /**
   * Stop health reporting
   */
  stopHealthReporting(): void {
    if (this.healthCheckInterval !== null) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get status of a specific channel
   */
  getChannelStatus(channelName: string): ChannelConnection | undefined {
    return this.connections.get(channelName);
  }
}

// Global instance
export const realtimeMonitor = new RealtimeMonitor();

// Auto-start health reporting
if (typeof window !== 'undefined') {
  realtimeMonitor.startHealthReporting();
}

