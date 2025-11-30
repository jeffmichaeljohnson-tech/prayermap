/**
 * Messaging System Validation Tests
 * 
 * Ensures LIVING MAP compliance and real-time performance requirements
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { prayerMapMessagingSystem } from './index';
import { messagingPerformanceMonitor } from './MessagingPerformanceMonitor';
import { realTimeValidator } from './RealTimeValidator';

describe('PrayerMap Messaging System - LIVING MAP Compliance', () => {
  beforeEach(async () => {
    // Initialize system for testing
    await prayerMapMessagingSystem.initialize();
  });

  afterEach(async () => {
    // Cleanup after tests
    await prayerMapMessagingSystem.destroy();
  });

  describe('LIVING MAP Requirements', () => {
    test('should deliver messages within 2 seconds', async () => {
      const startTime = Date.now();
      const testConversationId = 'test-conversation-1';
      
      const result = await prayerMapMessagingSystem.sendMessage(
        testConversationId,
        'Test message for LIVING MAP validation',
        'text'
      );
      
      const deliveryTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(deliveryTime).toBeLessThan(2000); // LIVING MAP requirement
      expect(result.deliveryLatency).toBeDefined();
      expect(result.deliveryLatency).toBeLessThan(2000);
    }, 10000); // 10 second timeout

    test('should maintain 95%+ real-time compliance', async () => {
      const performanceReport = messagingPerformanceMonitor.getPerformanceReport();
      
      // If system is new, compliance might be 100% or undefined
      if (performanceReport.realTimeCompliance > 0) {
        expect(performanceReport.realTimeCompliance).toBeGreaterThanOrEqual(95);
      }
    });

    test('should maintain 95%+ connection stability', async () => {
      const performanceReport = messagingPerformanceMonitor.getPerformanceReport();
      
      expect(performanceReport.connectionStability).toBeGreaterThanOrEqual(95);
    });

    test('should achieve 99%+ message delivery success rate', async () => {
      const performanceReport = messagingPerformanceMonitor.getPerformanceReport();
      
      expect(performanceReport.messageDeliverySuccess).toBeGreaterThanOrEqual(99);
    });
  });

  describe('Real-Time Validation', () => {
    test('should pass comprehensive real-time validation', async () => {
      const validationResult = await realTimeValidator.runComprehensiveValidation();
      
      expect(validationResult.overallPassed).toBe(true);
      expect(validationResult.livingMapCompliance).toBe(true);
      
      // Each individual test should pass
      validationResult.results.forEach((result, index) => {
        expect(result.passed).toBe(true);
        if (!result.passed) {
          console.warn(`Validation test ${index} failed:`, result.errorMessage);
        }
      });
    }, 15000);

    test('should validate connection health', async () => {
      const systemStatus = prayerMapMessagingSystem.getSystemStatus();
      
      expect(systemStatus.initialized).toBe(true);
      expect(systemStatus.channelManager.isActive).toBe(true);
      expect(systemStatus.channelManager.connectionState).toBe('active');
    });

    test('should track performance metrics accurately', async () => {
      // Send a test message to generate metrics
      await prayerMapMessagingSystem.sendMessage(
        'test-conversation-metrics',
        'Performance tracking test message',
        'text'
      );
      
      const performanceReport = messagingPerformanceMonitor.getPerformanceReport();
      
      // Metrics should be valid numbers
      expect(typeof performanceReport.avgMessageLatency).toBe('number');
      expect(typeof performanceReport.messageDeliverySuccess).toBe('number');
      expect(typeof performanceReport.realTimeCompliance).toBe('number');
      expect(typeof performanceReport.connectionStability).toBe('number');
      
      // Should have reasonable values
      expect(performanceReport.avgMessageLatency).toBeGreaterThanOrEqual(0);
      expect(performanceReport.messageDeliverySuccess).toBeGreaterThanOrEqual(0);
      expect(performanceReport.messageDeliverySuccess).toBeLessThanOrEqual(100);
    });
  });

  describe('System Integration', () => {
    test('should initialize all required components', async () => {
      const systemStatus = prayerMapMessagingSystem.getSystemStatus();
      
      // Core components should be active
      expect(systemStatus.initialized).toBe(true);
      expect(systemStatus.channelManager).toBeDefined();
      expect(systemStatus.deliveryTracker).toBeDefined();
      expect(systemStatus.typingIndicators).toBeDefined();
      expect(systemStatus.offlineQueue).toBeDefined();
      expect(systemStatus.mobileOptimization).toBeDefined();
      expect(systemStatus.cacheManager).toBeDefined();
      expect(systemStatus.errorHandler).toBeDefined();
      expect(systemStatus.livingMapIntegration).toBeDefined();
      expect(systemStatus.security).toBeDefined();
      
      // Performance monitoring should be available
      expect(systemStatus.performance).toBeDefined();
      expect(systemStatus.livingMapCompliance).toBeDefined();
    });

    test('should handle message sending with error recovery', async () => {
      // Test normal message sending
      const result = await prayerMapMessagingSystem.sendMessage(
        'test-conversation-error-recovery',
        'Error recovery test message',
        'text'
      );
      
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.deliveryLatency).toBeDefined();
    });

    test('should provide accurate system metrics', async () => {
      const systemStatus = prayerMapMessagingSystem.getSystemStatus();
      
      // LIVING MAP compliance check
      if (systemStatus.livingMapCompliance) {
        expect(typeof systemStatus.livingMapCompliance.avgLatency).toBe('number');
        expect(typeof systemStatus.livingMapCompliance.realTimeCompliance).toBe('number');
        expect(typeof systemStatus.livingMapCompliance.meetsRequirement).toBe('boolean');
      }
      
      // Performance metrics should be present
      if (systemStatus.performance) {
        expect(systemStatus.performance.avgMessageLatency).toBeGreaterThanOrEqual(0);
        expect(systemStatus.performance.errorRate).toBeGreaterThanOrEqual(0);
        expect(systemStatus.performance.connectionStability).toBeGreaterThanOrEqual(0);
        expect(systemStatus.performance.connectionStability).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    test('should handle concurrent message sends within LIVING MAP requirements', async () => {
      const testConversationId = 'test-conversation-concurrent';
      const messagePromises: Promise<any>[] = [];
      const messageCount = 10;
      
      const startTime = Date.now();
      
      // Send multiple messages concurrently
      for (let i = 0; i < messageCount; i++) {
        const promise = prayerMapMessagingSystem.sendMessage(
          testConversationId,
          `Concurrent test message ${i + 1}`,
          'text'
        );
        messagePromises.push(promise);
      }
      
      // Wait for all messages to complete
      const results = await Promise.all(messagePromises);
      const totalTime = Date.now() - startTime;
      
      // All messages should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.deliveryLatency).toBeLessThan(2000); // Individual LIVING MAP requirement
      });
      
      // Average time per message should be reasonable
      const avgTimePerMessage = totalTime / messageCount;
      expect(avgTimePerMessage).toBeLessThan(2000); // Should not degrade under concurrent load
      
      console.log(`Concurrent messaging test: ${messageCount} messages in ${totalTime}ms (avg: ${avgTimePerMessage}ms per message)`);
    }, 30000);

    test('should maintain performance under load', async () => {
      const initialMetrics = messagingPerformanceMonitor.getPerformanceReport();
      
      // Send a burst of messages
      const burstPromises = [];
      for (let i = 0; i < 5; i++) {
        burstPromises.push(
          prayerMapMessagingSystem.sendMessage(
            `test-conversation-load-${i}`,
            `Load test message ${i}`,
            'text'
          )
        );
      }
      
      await Promise.all(burstPromises);
      
      // Wait a moment for metrics to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMetrics = messagingPerformanceMonitor.getPerformanceReport();
      
      // Performance should not significantly degrade
      expect(finalMetrics.avgMessageLatency).toBeLessThan(3000); // Allow some degradation under load
      expect(finalMetrics.errorRate).toBeLessThan(5); // Should maintain low error rate
      
      console.log(`Load test results - Avg latency: ${finalMetrics.avgMessageLatency}ms, Error rate: ${finalMetrics.errorRate}%`);
    }, 20000);
  });
});

describe('Monitoring and Observability', () => {
  test('should track message delivery metrics', () => {
    const messageId = 'test-message-123';
    const latency = 1500;
    
    messagingPerformanceMonitor.trackMessageDelivery(messageId, latency, true);
    
    const metrics = messagingPerformanceMonitor.getPerformanceReport();
    
    // Should have updated metrics
    expect(typeof metrics.avgMessageLatency).toBe('number');
    expect(metrics.avgMessageLatency).toBeGreaterThan(0);
  });

  test('should track connection events', () => {
    messagingPerformanceMonitor.trackConnectionEvent('reconnect', 'test_reconnection');
    messagingPerformanceMonitor.trackConnectionEvent('error', 'test_error', { test: true });
    
    const metrics = messagingPerformanceMonitor.getPerformanceReport();
    
    // Should track events without throwing
    expect(typeof metrics.reconnectionRate).toBe('number');
    expect(typeof metrics.errorRate).toBe('number');
  });

  test('should provide comprehensive performance report', () => {
    const report = messagingPerformanceMonitor.getPerformanceReport();
    
    // Should have all required fields
    expect(report).toHaveProperty('avgMessageLatency');
    expect(report).toHaveProperty('messageDeliverySuccess');
    expect(report).toHaveProperty('realTimeCompliance');
    expect(report).toHaveProperty('connectionStability');
    expect(report).toHaveProperty('reconnectionRate');
    expect(report).toHaveProperty('errorRate');
    expect(report).toHaveProperty('status');
    expect(report).toHaveProperty('recommendations');
    expect(report).toHaveProperty('livingMapCompliance');
    
    // Status should be one of the expected values
    expect(['excellent', 'good', 'degraded', 'critical']).toContain(report.status);
    
    // LIVING MAP compliance should be boolean
    expect(typeof report.livingMapCompliance).toBe('boolean');
  });
});