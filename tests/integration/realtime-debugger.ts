/**
 * Real-time debugging utilities for WebSocket/Realtime features
 */

import type { Page } from '@playwright/test';

export interface WebSocketMessage {
  type: 'sent' | 'received';
  payload: string | object;
  timestamp: number;
}

export interface RealtimeMetrics {
  messagesSent: number;
  messagesReceived: number;
  averageLatency: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

/**
 * Real-time debugging utilities
 */
export class RealtimeDebugger {
  private static messageLog: WebSocketMessage[] = [];
  
  /**
   * Monitor WebSocket connections and messages
   * 
   * @param page - Playwright page instance
   */
  static async monitorWebSockets(page: Page): Promise<void> {
    this.messageLog = [];
    
    page.on('websocket', ws => {
      console.log(`🔌 WebSocket opened: ${ws.url()}`);
      
      ws.on('framesent', event => {
        const message: WebSocketMessage = {
          type: 'sent',
          payload: typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload),
          timestamp: Date.now(),
        };
        this.messageLog.push(message);
        console.log('📤 WebSocket sent:', message.payload);
      });
      
      ws.on('framereceived', event => {
        const message: WebSocketMessage = {
          type: 'received',
          payload: typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload),
          timestamp: Date.now(),
        };
        this.messageLog.push(message);
        console.log('📥 WebSocket received:', message.payload);
      });
      
      ws.on('close', () => {
        console.log('🔌 WebSocket closed');
      });
    });
  }
  
  /**
   * Wait for real-time message delivery with verification
   * 
   * @param page - Playwright page instance
   * @param expectedContent - Expected message content
   * @param timeout - Maximum wait time in milliseconds
   * @returns True if message appears within timeout
   */
  static async waitForRealtimeMessage(
    page: Page,
    expectedContent: string,
    timeout = 10000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check DOM for message
      const messages = await page.locator('[data-testid="message"], [class*="message"], [data-testid="inbox-message"]').all();
      
      for (const message of messages) {
        try {
          const text = await message.textContent();
          if (text?.includes(expectedContent)) {
            const deliveryTime = Date.now() - startTime;
            console.log(`✅ Real-time message delivered in ${deliveryTime}ms`);
            return true;
          }
        } catch (error) {
          // Continue checking other messages
        }
      }
      
      // Also check WebSocket messages if monitoring is active
      if (this.messageLog.length > 0) {
        const recentMessages = this.messageLog.filter(
          msg => Date.now() - msg.timestamp < timeout
        );
        
        for (const msg of recentMessages) {
          const payloadStr = typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload);
          if (payloadStr.includes(expectedContent)) {
            const deliveryTime = Date.now() - startTime;
            console.log(`✅ Real-time message found in WebSocket log in ${deliveryTime}ms`);
            return true;
          }
        }
      }
      
      await page.waitForTimeout(100);
    }
    
    console.log(`❌ Real-time message not delivered within ${timeout}ms`);
    return false;
  }
  
  /**
   * Verify Supabase Realtime subscription is active
   * 
   * @param page - Playwright page instance
   * @param channel - Channel name to check
   * @returns True if channel is subscribed
   */
  static async verifyRealtimeSubscription(
    page: Page,
    channel: string
  ): Promise<boolean> {
    try {
      const isSubscribed = await page.evaluate((ch) => {
        // Try to access Supabase client from window (if exposed for debugging)
        const supabase = (window as any).__SUPABASE_CLIENT__;
        if (!supabase) {
          // Fallback: check for channel in DOM or console logs
          return false;
        }
        
        // Check if channel is subscribed
        try {
          const channelInstance = supabase.channel(ch);
          return channelInstance.state === 'SUBSCRIBED';
        } catch {
          return false;
        }
      }, channel);
      
      return isSubscribed;
    } catch (error) {
      console.warn('Could not verify subscription status:', error);
      return false;
    }
  }
  
  /**
   * Get real-time metrics
   * 
   * @param page - Playwright page instance
   * @returns Real-time metrics
   */
  static async getRealtimeMetrics(page: Page): Promise<RealtimeMetrics> {
    const sentMessages = this.messageLog.filter(msg => msg.type === 'sent');
    const receivedMessages = this.messageLog.filter(msg => msg.type === 'received');
    
    // Calculate average latency (time between sent and received)
    let totalLatency = 0;
    let latencyCount = 0;
    
    for (const sent of sentMessages) {
      const received = receivedMessages.find(
        recv => recv.timestamp > sent.timestamp && recv.timestamp - sent.timestamp < 5000
      );
      
      if (received) {
        totalLatency += received.timestamp - sent.timestamp;
        latencyCount++;
      }
    }
    
    const averageLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;
    
    // Check connection status
    const hasRecentActivity = this.messageLog.some(
      msg => Date.now() - msg.timestamp < 5000
    );
    
    return {
      messagesSent: sentMessages.length,
      messagesReceived: receivedMessages.length,
      averageLatency,
      connectionStatus: hasRecentActivity ? 'connected' : 'disconnected',
    };
  }
  
  /**
   * Clear message log
   */
  static clearLog(): void {
    this.messageLog = [];
  }
  
  /**
   * Get message log
   */
  static getLog(): WebSocketMessage[] {
    return [...this.messageLog];
  }
}

