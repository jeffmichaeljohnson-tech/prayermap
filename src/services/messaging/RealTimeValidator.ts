/**
 * Real-Time Messaging Validator
 * 
 * Ensures LIVING MAP principle compliance:
 * - Message delivery < 2 seconds
 * - Universal shared reality
 * - Connection health validation
 * - Real-time sync verification
 */

import { trackEvent, trackError, datadogRum } from '../../lib/datadog';
import { messagingPerformanceMonitor } from './MessagingPerformanceMonitor';
import { realtimeMonitor } from '../../lib/realtime-monitor';

export interface ValidationResult {
  passed: boolean;
  latency: number;
  errorMessage?: string;
  recommendations?: string[];
}

export interface RealTimeTest {
  id: string;
  testType: 'message_delivery' | 'sync_validation' | 'connection_health';
  startTime: number;
  endTime?: number;
  result?: ValidationResult;
}

export class RealTimeValidator {
  private activeTests = new Map<string, RealTimeTest>();
  private validationHistory: RealTimeTest[] = [];
  private continuousValidation = false;
  private validationInterval: number | null = null;

  /**
   * Start continuous real-time validation
   */
  startContinuousValidation(intervalMs = 60000): void {
    if (this.continuousValidation) return;

    this.continuousValidation = true;
    
    trackEvent('realtime_validator.started', {
      interval_ms: intervalMs,
      timestamp: Date.now(),
    });

    this.validationInterval = window.setInterval(() => {
      this.runComprehensiveValidation();
    }, intervalMs);

    // Run initial validation
    setTimeout(() => this.runComprehensiveValidation(), 5000);
  }

  /**
   * Stop continuous validation
   */
  stopContinuousValidation(): void {
    this.continuousValidation = false;
    
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }

    trackEvent('realtime_validator.stopped', {
      total_tests_run: this.validationHistory.length,
      timestamp: Date.now(),
    });
  }

  /**
   * Run comprehensive real-time validation suite
   */
  async runComprehensiveValidation(): Promise<{
    overallPassed: boolean;
    results: ValidationResult[];
    livingMapCompliance: boolean;
  }> {
    const results: ValidationResult[] = [];
    
    try {
      // Test 1: Connection Health
      const connectionHealth = await this.validateConnectionHealth();
      results.push(connectionHealth);

      // Test 2: Message Delivery Latency
      const messageDelivery = await this.validateMessageDelivery();
      results.push(messageDelivery);

      // Test 3: Sync Validation
      const syncValidation = await this.validateSyncPerformance();
      results.push(syncValidation);

      // Test 4: LIVING MAP Compliance
      const livingMapCompliance = await this.validateLivingMapCompliance();
      results.push(livingMapCompliance);

      const overallPassed = results.every(r => r.passed);
      const livingMapCompliant = this.checkLivingMapCompliance(results);

      // Report comprehensive results
      trackEvent('realtime_validator.comprehensive_test', {
        overall_passed: overallPassed,
        living_map_compliant: livingMapCompliant,
        test_results: results.map(r => ({
          passed: r.passed,
          latency: r.latency,
          error: r.errorMessage || null,
        })),
        timestamp: Date.now(),
      });

      if (!livingMapCompliant) {
        trackError(new Error('LIVING MAP compliance validation failed'), {
          type: 'living_map_compliance_failure',
          test_results: results,
          recommendations: this.generateLivingMapRecommendations(results),
          severity: 'critical',
        });
      }

      return {
        overallPassed,
        results,
        livingMapCompliance: livingMapCompliant,
      };

    } catch (error) {
      trackError(error as Error, {
        context: 'realtime_validation_exception',
        test_count: results.length,
      });

      return {
        overallPassed: false,
        results,
        livingMapCompliance: false,
      };
    }
  }

  /**
   * Validate connection health across all channels
   */
  private async validateConnectionHealth(): Promise<ValidationResult> {
    const testId = `health_${Date.now()}`;
    const startTime = Date.now();
    
    this.activeTests.set(testId, {
      id: testId,
      testType: 'connection_health',
      startTime,
    });

    try {
      const healthMetrics = realtimeMonitor.getHealthMetrics();
      const latency = Date.now() - startTime;

      let passed = true;
      let errorMessage: string | undefined;
      const recommendations: string[] = [];

      // Check connection health criteria
      if (healthMetrics.disconnectedChannels > 0) {
        passed = false;
        errorMessage = `${healthMetrics.disconnectedChannels} disconnected channels detected`;
        recommendations.push('Investigate disconnected channels');
      }

      if (healthMetrics.errorChannels > 0) {
        passed = false;
        errorMessage = `${healthMetrics.errorChannels} channels with errors`;
        recommendations.push('Check channel error logs');
      }

      if (healthMetrics.avgMessageLatency > 2000) {
        passed = false;
        errorMessage = `Average message latency ${healthMetrics.avgMessageLatency}ms exceeds 2 second LIVING MAP requirement`;
        recommendations.push('Optimize message delivery pipeline');
      }

      const result: ValidationResult = {
        passed,
        latency,
        errorMessage,
        recommendations,
      };

      const test = this.activeTests.get(testId)!;
      test.endTime = Date.now();
      test.result = result;
      this.validationHistory.push(test);
      this.activeTests.delete(testId);

      return result;

    } catch (error) {
      const result: ValidationResult = {
        passed: false,
        latency: Date.now() - startTime,
        errorMessage: `Connection health validation failed: ${(error as Error).message}`,
        recommendations: ['Check network connectivity', 'Restart messaging service'],
      };

      return result;
    }
  }

  /**
   * Validate message delivery latency
   */
  private async validateMessageDelivery(): Promise<ValidationResult> {
    const testId = `delivery_${Date.now()}`;
    const startTime = Date.now();

    try {
      // Get recent performance metrics
      const performanceReport = messagingPerformanceMonitor.getPerformanceReport();
      const latency = Date.now() - startTime;

      let passed = true;
      let errorMessage: string | undefined;
      const recommendations: string[] = [];

      // Check LIVING MAP requirement
      if (performanceReport.avgMessageLatency > 2000) {
        passed = false;
        errorMessage = `Average delivery latency ${performanceReport.avgMessageLatency}ms exceeds LIVING MAP requirement`;
        recommendations.push('Optimize database queries', 'Improve network routing', 'Enable message batching');
      }

      if (performanceReport.realTimeCompliance < 95) {
        passed = false;
        errorMessage = `Real-time compliance ${performanceReport.realTimeCompliance}% below 95% threshold`;
        recommendations.push('Investigate slow message paths', 'Check server performance');
      }

      return {
        passed,
        latency,
        errorMessage,
        recommendations,
      };

    } catch (error) {
      return {
        passed: false,
        latency: Date.now() - startTime,
        errorMessage: `Message delivery validation failed: ${(error as Error).message}`,
        recommendations: ['Check messaging service status'],
      };
    }
  }

  /**
   * Validate synchronization performance
   */
  private async validateSyncPerformance(): Promise<ValidationResult> {
    const testId = `sync_${Date.now()}`;
    const startTime = Date.now();

    try {
      // Test database round-trip time
      const { supabase } = await import('../../lib/supabase');
      
      const queryStart = Date.now();
      await supabase.from('prayers').select('count', { count: 'exact', head: true });
      const dbLatency = Date.now() - queryStart;

      const totalLatency = Date.now() - startTime;

      let passed = true;
      let errorMessage: string | undefined;
      const recommendations: string[] = [];

      // Check database response time
      if (dbLatency > 1000) {
        passed = false;
        errorMessage = `Database latency ${dbLatency}ms too high for real-time sync`;
        recommendations.push('Optimize database queries', 'Check database connection pool');
      }

      return {
        passed,
        latency: totalLatency,
        errorMessage,
        recommendations,
      };

    } catch (error) {
      return {
        passed: false,
        latency: Date.now() - startTime,
        errorMessage: `Sync validation failed: ${(error as Error).message}`,
        recommendations: ['Check database connectivity', 'Verify authentication'],
      };
    }
  }

  /**
   * Validate LIVING MAP principle compliance
   */
  private async validateLivingMapCompliance(): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const performanceReport = messagingPerformanceMonitor.getPerformanceReport();
      const healthMetrics = realtimeMonitor.getHealthMetrics();
      
      const latency = Date.now() - startTime;

      // LIVING MAP requirements:
      // 1. Real-time updates < 2 seconds
      // 2. Universal shared reality (all users see same state)
      // 3. Connection stability > 95%
      // 4. Message delivery success > 99%

      let passed = true;
      const issues: string[] = [];
      const recommendations: string[] = [];

      if (performanceReport.avgMessageLatency > 2000) {
        passed = false;
        issues.push(`Message latency ${performanceReport.avgMessageLatency}ms exceeds 2 second requirement`);
        recommendations.push('Optimize message delivery pipeline');
      }

      if (performanceReport.connectionStability < 95) {
        passed = false;
        issues.push(`Connection stability ${performanceReport.connectionStability}% below 95%`);
        recommendations.push('Improve connection management');
      }

      if (performanceReport.messageDeliverySuccess < 99) {
        passed = false;
        issues.push(`Message delivery success ${performanceReport.messageDeliverySuccess}% below 99%`);
        recommendations.push('Investigate message failures');
      }

      if (healthMetrics.connectedChannels === 0 && healthMetrics.totalChannels > 0) {
        passed = false;
        issues.push('No active connections for real-time updates');
        recommendations.push('Restart messaging service', 'Check network connectivity');
      }

      const errorMessage = issues.length > 0 ? issues.join('; ') : undefined;

      return {
        passed,
        latency,
        errorMessage,
        recommendations,
      };

    } catch (error) {
      return {
        passed: false,
        latency: Date.now() - startTime,
        errorMessage: `LIVING MAP validation failed: ${(error as Error).message}`,
        recommendations: ['Check all messaging components'],
      };
    }
  }

  /**
   * Check overall LIVING MAP compliance from test results
   */
  private checkLivingMapCompliance(results: ValidationResult[]): boolean {
    return results.every(result => result.passed) && 
           results.some(result => result.latency < 2000);
  }

  /**
   * Generate recommendations for LIVING MAP compliance
   */
  private generateLivingMapRecommendations(results: ValidationResult[]): string[] {
    const recommendations = new Set<string>();
    
    results.forEach(result => {
      result.recommendations?.forEach(rec => recommendations.add(rec));
    });

    // Add LIVING MAP specific recommendations
    recommendations.add('Ensure message delivery < 2 seconds for universal real-time experience');
    recommendations.add('Maintain 99%+ connection stability for eternal memorial visibility');
    recommendations.add('Implement aggressive caching for immediate prayer visibility');

    return Array.from(recommendations);
  }

  /**
   * Get validation history for analysis
   */
  getValidationHistory(): RealTimeTest[] {
    return [...this.validationHistory].sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get current validation status
   */
  getCurrentStatus(): {
    isRunning: boolean;
    activeTests: number;
    lastValidation?: RealTimeTest;
    overallHealth: 'excellent' | 'good' | 'degraded' | 'critical';
  } {
    const lastValidation = this.validationHistory[this.validationHistory.length - 1];
    const recentTests = this.validationHistory.slice(-10);
    const passRate = recentTests.filter(t => t.result?.passed).length / recentTests.length;

    let overallHealth: 'excellent' | 'good' | 'degraded' | 'critical';
    if (passRate > 0.95) overallHealth = 'excellent';
    else if (passRate > 0.8) overallHealth = 'good';
    else if (passRate > 0.5) overallHealth = 'degraded';
    else overallHealth = 'critical';

    return {
      isRunning: this.continuousValidation,
      activeTests: this.activeTests.size,
      lastValidation,
      overallHealth,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopContinuousValidation();
    this.activeTests.clear();
  }
}

// Global singleton instance
export const realTimeValidator = new RealTimeValidator();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realTimeValidator.destroy();
  });
}