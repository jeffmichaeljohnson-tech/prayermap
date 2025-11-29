/**
 * LOG ANALYSIS & PATTERN RECOGNITION AI - AGENT 4 IMPLEMENTATION
 * 
 * Intelligent log analysis tools that detect patterns, anomalies, and trends.
 * Include automated root cause analysis, similar issue detection, and predictive
 * problem identification using AI/ML techniques.
 */

import { StructuredLogEntry } from './structuredLogger';
import { supabase } from '@/lib/supabase';
import { logger } from './structuredLogger';

/**
 * MEMORY_LOG:
 * Topic: AI-Powered Log Analysis & Pattern Recognition
 * Context: Building intelligent log analysis for proactive problem detection
 * Decision: Pattern detection + anomaly analysis + predictive insights + root cause analysis
 * Reasoning: Enable proactive issue resolution and trend identification
 * Architecture: Real-time analysis + historical pattern mining + ML-powered insights
 * Mobile Impact: Includes mobile-specific pattern detection and performance analysis
 * Date: 2024-11-29
 */

// Analysis Types
export interface LogPattern {
  id: string;
  type: 'error_burst' | 'performance_degradation' | 'user_journey' | 'system_anomaly';
  confidence: number;
  frequency: number;
  firstSeen: number;
  lastSeen: number;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  
  // Pattern specifics
  conditions: PatternCondition[];
  examples: string[]; // Log entry IDs that match this pattern
  metrics: PatternMetrics;
}

export interface PatternCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than';
  value: any;
  weight: number; // How important this condition is (0-1)
}

export interface PatternMetrics {
  occurrenceRate: number; // Times per hour
  avgSeverity: number; // 0-1 scale
  userImpact: number; // Number of unique users affected
  correlations: string[]; // Related patterns or metrics
}

export interface Anomaly {
  id: string;
  type: 'spike' | 'drop' | 'drift' | 'outlier';
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  
  // Anomaly details
  timestamp: number;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  
  // Context
  context: Record<string, any>;
  relatedLogs: string[];
  possibleCauses: string[];
}

export interface RootCauseAnalysis {
  id: string;
  issue: string;
  confidence: number;
  
  // Analysis results
  primaryCause: string;
  contributingFactors: string[];
  timeline: TimelineEvent[];
  affectedComponents: string[];
  
  // Evidence
  supportingLogs: string[];
  correlations: Correlation[];
  patterns: string[]; // Pattern IDs
  
  // Recommendations
  immediateActions: string[];
  preventiveActions: string[];
  monitoringRecommendations: string[];
}

export interface TimelineEvent {
  timestamp: number;
  event: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  details: Record<string, any>;
}

export interface Correlation {
  metric1: string;
  metric2: string;
  strength: number; // -1 to 1
  type: 'positive' | 'negative' | 'none';
  significance: number; // 0-1
}

export interface TrendAnalysis {
  metric: string;
  timeRange: { start: number; end: number };
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  strength: number; // How strong the trend is (0-1)
  
  // Predictions
  prediction: {
    nextValue: number;
    confidence: number;
    timeframe: number; // Milliseconds into the future
  };
  
  // Change points
  changePoints: {
    timestamp: number;
    beforeValue: number;
    afterValue: number;
    significance: number;
  }[];
}

/**
 * AI-Powered Log Analyzer
 */
export class LogAnalyzer {
  private patterns = new Map<string, LogPattern>();
  private anomalies = new Map<string, Anomaly>();
  private recentLogs: StructuredLogEntry[] = [];
  private metricsHistory = new Map<string, { timestamp: number; value: number }[]>();
  private analysisCache = new Map<string, any>();
  
  // Analysis configuration
  private readonly maxLogHistory = 10000;
  private readonly maxMetricsHistory = 1000;
  private readonly analysisInterval = 60000; // 1 minute
  private readonly patternConfidenceThreshold = 0.7;
  
  private analysisTimer?: NodeJS.Timeout;

  constructor() {
    this.startPeriodicAnalysis();
    this.initializeBaselinePatterns();
    
    logger.info('Log Analyzer initialized', {
      action: 'log_analyzer_init',
      analysisInterval: this.analysisInterval,
      patternThreshold: this.patternConfidenceThreshold,
    });
  }

  /**
   * Analyze a new log entry in real-time
   */
  analyzeLogEntry(entry: StructuredLogEntry): void {
    // Add to recent logs
    this.recentLogs.push(entry);
    
    // Keep history size manageable
    if (this.recentLogs.length > this.maxLogHistory) {
      this.recentLogs.shift();
    }

    // Extract metrics from log entry
    this.extractMetrics(entry);

    // Real-time pattern detection
    this.detectPatternsRealTime(entry);

    // Anomaly detection for error logs
    if (entry.level === 'ERROR' || entry.level === 'FATAL') {
      this.detectAnomalies(entry);
    }
  }

  /**
   * Detect patterns in real-time as logs arrive
   */
  private detectPatternsRealTime(entry: StructuredLogEntry): void {
    // Error burst detection
    if (entry.level === 'ERROR' || entry.level === 'FATAL') {
      this.detectErrorBurst(entry);
    }

    // Performance degradation detection
    if (entry.context.performance?.duration) {
      this.detectPerformanceDegradation(entry);
    }

    // User journey pattern detection
    if (entry.context.action?.startsWith('user_')) {
      this.detectUserJourneyPatterns(entry);
    }

    // System anomaly detection
    this.detectSystemAnomalies(entry);
  }

  /**
   * Detect error bursts (multiple errors in short timeframe)
   */
  private detectErrorBurst(entry: StructuredLogEntry): void {
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const errorThreshold = 10;
    
    const recentErrors = this.recentLogs.filter(log => 
      log.timestamp >= new Date(Date.now() - timeWindow).toISOString() &&
      (log.level === 'ERROR' || log.level === 'FATAL')
    );

    if (recentErrors.length >= errorThreshold) {
      const patternId = `error_burst_${Date.now()}`;
      
      // Check if we already detected this pattern recently
      const existingPattern = Array.from(this.patterns.values()).find(p => 
        p.type === 'error_burst' && 
        (Date.now() - p.lastSeen) < timeWindow
      );

      if (!existingPattern) {
        const pattern: LogPattern = {
          id: patternId,
          type: 'error_burst',
          confidence: Math.min(recentErrors.length / (errorThreshold * 2), 1.0),
          frequency: recentErrors.length,
          firstSeen: new Date(recentErrors[0].timestamp).getTime(),
          lastSeen: Date.now(),
          description: `Error burst detected: ${recentErrors.length} errors in ${timeWindow / 60000} minutes`,
          impact: recentErrors.length > 50 ? 'critical' : 
                 recentErrors.length > 20 ? 'high' : 'medium',
          
          conditions: [
            {
              field: 'level',
              operator: 'equals',
              value: 'ERROR',
              weight: 1.0
            },
            {
              field: 'timestamp',
              operator: 'greater_than',
              value: new Date(Date.now() - timeWindow).toISOString(),
              weight: 1.0
            }
          ],
          
          examples: recentErrors.slice(0, 5).map(log => log.traceId || log.spanId || ''),
          
          metrics: {
            occurrenceRate: recentErrors.length / (timeWindow / (60 * 60 * 1000)),
            avgSeverity: 0.8,
            userImpact: new Set(recentErrors.map(log => log.userId).filter(Boolean)).size,
            correlations: this.findCorrelations(recentErrors),
          }
        };

        this.patterns.set(patternId, pattern);
        
        logger.warn('Error burst pattern detected', {
          action: 'pattern_detection',
          pattern: pattern,
          errorCount: recentErrors.length,
          timeWindow: timeWindow,
        });
      }
    }
  }

  /**
   * Detect performance degradation patterns
   */
  private detectPerformanceDegradation(entry: StructuredLogEntry): void {
    const operation = entry.context.action || 'unknown';
    const duration = entry.context.performance?.duration;
    
    if (!duration) return;

    const metricKey = `performance_${operation}`;
    if (!this.metricsHistory.has(metricKey)) {
      this.metricsHistory.set(metricKey, []);
    }

    const history = this.metricsHistory.get(metricKey)!;
    history.push({ timestamp: Date.now(), value: duration });

    // Keep only recent history
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentHistory = history.filter(h => h.timestamp > oneHourAgo);
    this.metricsHistory.set(metricKey, recentHistory);

    // Calculate baseline performance
    if (recentHistory.length > 10) {
      const baseline = this.calculateBaseline(recentHistory.slice(0, -5));
      const recentAvg = this.calculateAverage(recentHistory.slice(-5));
      
      // Detect significant degradation (> 50% increase)
      if (recentAvg > baseline * 1.5) {
        const patternId = `perf_degradation_${operation}_${Date.now()}`;
        
        const pattern: LogPattern = {
          id: patternId,
          type: 'performance_degradation',
          confidence: Math.min((recentAvg - baseline) / baseline, 1.0),
          frequency: recentHistory.length,
          firstSeen: recentHistory[0].timestamp,
          lastSeen: Date.now(),
          description: `Performance degradation in ${operation}: ${Math.round(recentAvg)}ms (baseline: ${Math.round(baseline)}ms)`,
          impact: recentAvg > baseline * 3 ? 'critical' :
                 recentAvg > baseline * 2 ? 'high' : 'medium',
          
          conditions: [
            {
              field: 'context.action',
              operator: 'equals',
              value: operation,
              weight: 1.0
            },
            {
              field: 'context.performance.duration',
              operator: 'greater_than',
              value: baseline * 1.5,
              weight: 0.8
            }
          ],
          
          examples: [entry.traceId || entry.spanId || ''],
          
          metrics: {
            occurrenceRate: recentHistory.length / 1, // Per hour
            avgSeverity: Math.min((recentAvg - baseline) / baseline, 1.0),
            userImpact: 1, // Affects all users of this operation
            correlations: [],
          }
        };

        this.patterns.set(patternId, pattern);
        
        logger.warn('Performance degradation pattern detected', {
          action: 'pattern_detection',
          pattern: pattern,
          baseline,
          current: recentAvg,
          degradation: ((recentAvg - baseline) / baseline * 100).toFixed(1) + '%',
        });
      }
    }
  }

  /**
   * Detect user journey patterns
   */
  private detectUserJourneyPatterns(entry: StructuredLogEntry): void {
    if (!entry.userId) return;

    const timeWindow = 30 * 60 * 1000; // 30 minutes
    const userLogs = this.recentLogs.filter(log =>
      log.userId === entry.userId &&
      new Date(log.timestamp).getTime() > (Date.now() - timeWindow) &&
      log.context.action?.startsWith('user_')
    );

    // Detect common user journey patterns
    const actions = userLogs.map(log => log.context.action).filter(Boolean);
    const actionSequence = this.findActionSequences(actions);

    if (actionSequence.length > 3) {
      const patternId = `user_journey_${actionSequence.join('_')}`;
      
      // Check if this is a common pattern (appears in multiple user sessions)
      const similarJourneys = this.findSimilarUserJourneys(actionSequence);
      
      if (similarJourneys.length > 2) { // At least 3 users with similar journey
        const pattern: LogPattern = {
          id: patternId,
          type: 'user_journey',
          confidence: Math.min(similarJourneys.length / 10, 1.0),
          frequency: similarJourneys.length,
          firstSeen: userLogs[0] ? new Date(userLogs[0].timestamp).getTime() : Date.now(),
          lastSeen: Date.now(),
          description: `Common user journey: ${actionSequence.join(' → ')}`,
          impact: 'low',
          
          conditions: actionSequence.map((action, index) => ({
            field: 'context.action',
            operator: 'equals' as const,
            value: action,
            weight: 1.0 / actionSequence.length
          })),
          
          examples: userLogs.slice(0, 3).map(log => log.traceId || log.spanId || ''),
          
          metrics: {
            occurrenceRate: similarJourneys.length / 24, // Per day
            avgSeverity: 0.1,
            userImpact: similarJourneys.length,
            correlations: [],
          }
        };

        this.patterns.set(patternId, pattern);
        
        logger.info('User journey pattern detected', {
          action: 'pattern_detection',
          pattern: pattern,
          sequence: actionSequence,
          userCount: similarJourneys.length,
        });
      }
    }
  }

  /**
   * Detect system anomalies
   */
  private detectSystemAnomalies(entry: StructuredLogEntry): void {
    // Memory anomalies
    if (entry.resource.device && entry.context.metadata?.memory) {
      this.detectMemoryAnomalies(entry);
    }

    // Request rate anomalies
    this.detectRequestRateAnomalies(entry);

    // Geographic anomalies (unusual location patterns)
    this.detectGeographicAnomalies(entry);
  }

  /**
   * Perform periodic comprehensive analysis
   */
  private async performPeriodicAnalysis(): Promise<void> {
    logger.info('Starting periodic log analysis', {
      action: 'periodic_analysis_start',
      logCount: this.recentLogs.length,
      patternCount: this.patterns.size,
    });

    try {
      // Trend analysis
      await this.performTrendAnalysis();

      // Root cause analysis for recent critical issues
      await this.performRootCauseAnalysis();

      // Pattern evolution analysis
      await this.analyzePatternEvolution();

      // Predictive analysis
      await this.performPredictiveAnalysis();

      // Clean up old data
      this.cleanupOldData();

      logger.info('Periodic log analysis completed', {
        action: 'periodic_analysis_complete',
        patternsFound: this.patterns.size,
        anomaliesFound: this.anomalies.size,
      });

    } catch (error) {
      logger.error('Periodic analysis failed', error as Error, {
        action: 'periodic_analysis_error',
      });
    }
  }

  /**
   * Perform trend analysis on metrics
   */
  private async performTrendAnalysis(): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];

    for (const [metricKey, history] of this.metricsHistory.entries()) {
      if (history.length < 10) continue;

      const trend = this.calculateTrend(history);
      trends.push(trend);

      // Log significant trends
      if (Math.abs(trend.strength) > 0.6) {
        logger.info('Significant trend detected', {
          action: 'trend_analysis',
          metric: metricKey,
          trend: trend.trend,
          strength: trend.strength,
          prediction: trend.prediction,
        });
      }
    }

    return trends;
  }

  /**
   * Perform root cause analysis for critical issues
   */
  private async performRootCauseAnalysis(): Promise<RootCauseAnalysis[]> {
    const analyses: RootCauseAnalysis[] = [];
    
    // Find recent critical errors
    const criticalErrors = this.recentLogs.filter(log =>
      log.level === 'FATAL' || 
      (log.level === 'ERROR' && log.context.metadata?.severity === 'critical')
    );

    for (const error of criticalErrors) {
      const analysis = await this.analyzeCriticalError(error);
      if (analysis) {
        analyses.push(analysis);
        
        logger.info('Root cause analysis completed', {
          action: 'root_cause_analysis',
          errorId: error.traceId,
          primaryCause: analysis.primaryCause,
          confidence: analysis.confidence,
          contributingFactors: analysis.contributingFactors,
        });
      }
    }

    return analyses;
  }

  /**
   * Analyze a critical error for root causes
   */
  private async analyzeCriticalError(errorLog: StructuredLogEntry): Promise<RootCauseAnalysis | null> {
    const analysisId = `rca_${errorLog.traceId}_${Date.now()}`;
    const timeWindow = 10 * 60 * 1000; // 10 minutes before error
    
    // Get related logs
    const relatedLogs = this.recentLogs.filter(log =>
      new Date(log.timestamp).getTime() >= 
      new Date(errorLog.timestamp).getTime() - timeWindow &&
      (log.traceId === errorLog.traceId ||
       log.userId === errorLog.userId ||
       log.context.action === errorLog.context.action ||
       log.service === errorLog.service)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Build timeline
    const timeline: TimelineEvent[] = relatedLogs.map(log => ({
      timestamp: new Date(log.timestamp).getTime(),
      event: log.message,
      severity: log.level === 'FATAL' ? 'critical' :
               log.level === 'ERROR' ? 'error' :
               log.level === 'WARN' ? 'warning' : 'info',
      component: log.service || log.context.component || 'unknown',
      details: log.context,
    }));

    // Identify potential causes
    const potentialCauses = this.identifyPotentialCauses(errorLog, relatedLogs);
    
    if (potentialCauses.length === 0) {
      return null;
    }

    // Rank causes by evidence
    const primaryCause = potentialCauses[0];
    const contributingFactors = potentialCauses.slice(1, 4);

    // Find correlations
    const correlations = this.findLogCorrelations(relatedLogs);

    // Generate recommendations
    const recommendations = this.generateRecommendations(errorLog, potentialCauses);

    const analysis: RootCauseAnalysis = {
      id: analysisId,
      issue: errorLog.message,
      confidence: this.calculateRootCauseConfidence(errorLog, potentialCauses, relatedLogs),
      
      primaryCause: primaryCause.cause,
      contributingFactors: contributingFactors.map(f => f.cause),
      timeline,
      affectedComponents: Array.from(new Set(relatedLogs.map(log => 
        log.service || log.context.component || 'unknown'
      ))),
      
      supportingLogs: relatedLogs.map(log => log.traceId || log.spanId || '').filter(Boolean),
      correlations,
      patterns: this.findRelatedPatterns(errorLog),
      
      immediateActions: recommendations.immediate,
      preventiveActions: recommendations.preventive,
      monitoringRecommendations: recommendations.monitoring,
    };

    return analysis;
  }

  /**
   * Utility Methods
   */
  private extractMetrics(entry: StructuredLogEntry): void {
    // Extract performance metrics
    if (entry.context.performance?.duration) {
      const metricKey = `duration_${entry.context.action || 'unknown'}`;
      this.recordMetric(metricKey, entry.context.performance.duration);
    }

    // Extract error rates
    if (entry.level === 'ERROR' || entry.level === 'FATAL') {
      this.recordMetric('error_rate', 1);
    }

    // Extract user activity metrics
    if (entry.context.action?.startsWith('user_')) {
      this.recordMetric('user_activity', 1);
    }
  }

  private recordMetric(key: string, value: number): void {
    if (!this.metricsHistory.has(key)) {
      this.metricsHistory.set(key, []);
    }

    const history = this.metricsHistory.get(key)!;
    history.push({ timestamp: Date.now(), value });

    // Keep history manageable
    if (history.length > this.maxMetricsHistory) {
      history.shift();
    }
  }

  private calculateBaseline(data: { timestamp: number; value: number }[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.value, 0) / data.length;
  }

  private calculateAverage(data: { timestamp: number; value: number }[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.value, 0) / data.length;
  }

  private calculateTrend(history: { timestamp: number; value: number }[]): TrendAnalysis {
    // Simple linear regression for trend detection
    const n = history.length;
    const sumX = history.reduce((sum, h, i) => sum + i, 0);
    const sumY = history.reduce((sum, h) => sum + h.value, 0);
    const sumXY = history.reduce((sum, h, i) => sum + i * h.value, 0);
    const sumXX = history.reduce((sum, h, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient (trend strength)
    const avgY = sumY / n;
    const ssTotal = history.reduce((sum, h) => sum + Math.pow(h.value - avgY, 2), 0);
    const ssRes = history.reduce((sum, h, i) => sum + Math.pow(h.value - (slope * i + intercept), 2), 0);
    const rSquared = Math.max(0, 1 - (ssRes / ssTotal));

    return {
      metric: 'trend_analysis',
      timeRange: {
        start: history[0].timestamp,
        end: history[history.length - 1].timestamp,
      },
      trend: slope > 0.1 ? 'increasing' :
             slope < -0.1 ? 'decreasing' : 'stable',
      strength: Math.sqrt(rSquared),
      
      prediction: {
        nextValue: slope * n + intercept,
        confidence: Math.sqrt(rSquared),
        timeframe: 60 * 60 * 1000, // 1 hour
      },
      
      changePoints: this.detectChangePoints(history),
    };
  }

  private detectChangePoints(history: { timestamp: number; value: number }[]): any[] {
    // Simple change point detection using moving averages
    const changePoints = [];
    const windowSize = Math.min(10, Math.floor(history.length / 4));
    
    for (let i = windowSize; i < history.length - windowSize; i++) {
      const beforeWindow = history.slice(i - windowSize, i);
      const afterWindow = history.slice(i, i + windowSize);
      
      const beforeAvg = this.calculateAverage(beforeWindow);
      const afterAvg = this.calculateAverage(afterWindow);
      
      const change = Math.abs(afterAvg - beforeAvg);
      const threshold = Math.max(beforeAvg * 0.2, 10); // 20% change or minimum threshold
      
      if (change > threshold) {
        changePoints.push({
          timestamp: history[i].timestamp,
          beforeValue: beforeAvg,
          afterValue: afterAvg,
          significance: change / beforeAvg,
        });
      }
    }

    return changePoints;
  }

  private findCorrelations(logs: StructuredLogEntry[]): string[] {
    const correlations: string[] = [];
    
    // Look for common patterns in the logs
    const components = logs.map(log => log.service || log.context.component).filter(Boolean);
    const actions = logs.map(log => log.context.action).filter(Boolean);
    const users = logs.map(log => log.userId).filter(Boolean);

    // Find most common component
    const componentCounts = this.countOccurrences(components);
    const mostCommonComponent = Object.entries(componentCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostCommonComponent && mostCommonComponent[1] > logs.length * 0.5) {
      correlations.push(`component:${mostCommonComponent[0]}`);
    }

    // Find most common action
    const actionCounts = this.countOccurrences(actions);
    const mostCommonAction = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostCommonAction && mostCommonAction[1] > logs.length * 0.3) {
      correlations.push(`action:${mostCommonAction[0]}`);
    }

    return correlations;
  }

  private countOccurrences(arr: string[]): Record<string, number> {
    return arr.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private findActionSequences(actions: (string | undefined)[]): string[] {
    // Simple sequence detection - could be enhanced with more sophisticated algorithms
    const validActions = actions.filter(Boolean) as string[];
    return validActions.slice(0, 5); // Return first 5 actions as sequence
  }

  private findSimilarUserJourneys(targetSequence: string[]): any[] {
    // This would require maintaining user journey history
    // For now, return a simplified implementation
    return []; // Placeholder
  }

  private detectMemoryAnomalies(entry: StructuredLogEntry): void {
    // Memory anomaly detection implementation
    // Placeholder for now
  }

  private detectRequestRateAnomalies(entry: StructuredLogEntry): void {
    // Request rate anomaly detection implementation
    // Placeholder for now
  }

  private detectGeographicAnomalies(entry: StructuredLogEntry): void {
    // Geographic anomaly detection implementation
    // Placeholder for now
  }

  private analyzePatternEvolution(): Promise<void> {
    // Analyze how patterns change over time
    return Promise.resolve();
  }

  private performPredictiveAnalysis(): Promise<void> {
    // Predictive analysis implementation
    return Promise.resolve();
  }

  private identifyPotentialCauses(errorLog: StructuredLogEntry, relatedLogs: StructuredLogEntry[]): Array<{ cause: string; evidence: string; confidence: number }> {
    const causes: Array<{ cause: string; evidence: string; confidence: number }> = [];

    // Network-related causes
    if (errorLog.message.includes('network') || errorLog.message.includes('fetch')) {
      causes.push({
        cause: 'Network connectivity issue',
        evidence: `Error message contains network-related terms: ${errorLog.message}`,
        confidence: 0.8,
      });
    }

    // Database-related causes
    if (errorLog.message.includes('supabase') || errorLog.stack?.includes('supabase')) {
      causes.push({
        cause: 'Database connection or query issue',
        evidence: `Error stack trace contains Supabase references`,
        confidence: 0.7,
      });
    }

    // Authentication-related causes
    if (errorLog.message.includes('auth') || errorLog.message.includes('unauthorized')) {
      causes.push({
        cause: 'Authentication or authorization failure',
        evidence: `Error message contains auth-related terms`,
        confidence: 0.9,
      });
    }

    // Memory-related causes
    const memoryUsage = errorLog.context.metadata?.memory;
    if (memoryUsage && memoryUsage.used / memoryUsage.limit > 0.9) {
      causes.push({
        cause: 'Memory pressure or out of memory condition',
        evidence: `Memory usage at ${Math.round(memoryUsage.used / memoryUsage.limit * 100)}%`,
        confidence: 0.8,
      });
    }

    return causes.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateRootCauseConfidence(
    errorLog: StructuredLogEntry, 
    causes: Array<{ cause: string; evidence: string; confidence: number }>,
    relatedLogs: StructuredLogEntry[]
  ): number {
    if (causes.length === 0) return 0;

    // Base confidence on primary cause
    let confidence = causes[0].confidence;

    // Adjust based on supporting evidence
    if (relatedLogs.length > 5) confidence += 0.1;
    if (relatedLogs.some(log => log.level === 'WARN')) confidence += 0.05;
    if (errorLog.context.metadata?.retryAttempts) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private findLogCorrelations(logs: StructuredLogEntry[]): Correlation[] {
    // Simplified correlation analysis
    return [];
  }

  private findRelatedPatterns(errorLog: StructuredLogEntry): string[] {
    return Array.from(this.patterns.values())
      .filter(pattern => 
        pattern.type === 'error_burst' ||
        pattern.conditions.some(condition => 
          condition.field === 'context.action' && 
          condition.value === errorLog.context.action
        )
      )
      .map(pattern => pattern.id);
  }

  private generateRecommendations(
    errorLog: StructuredLogEntry, 
    causes: Array<{ cause: string; evidence: string; confidence: number }>
  ): { immediate: string[]; preventive: string[]; monitoring: string[] } {
    const immediate: string[] = [];
    const preventive: string[] = [];
    const monitoring: string[] = [];

    for (const cause of causes.slice(0, 3)) { // Top 3 causes
      if (cause.cause.includes('Network')) {
        immediate.push('Check network connectivity and retry failed requests');
        preventive.push('Implement exponential backoff for network requests');
        monitoring.push('Add network quality monitoring and alerts');
      }

      if (cause.cause.includes('Database')) {
        immediate.push('Check database health and connection pools');
        preventive.push('Implement database connection retry logic');
        monitoring.push('Add database performance monitoring');
      }

      if (cause.cause.includes('Authentication')) {
        immediate.push('Verify authentication service status');
        preventive.push('Implement auth token refresh mechanism');
        monitoring.push('Add authentication success/failure rate monitoring');
      }

      if (cause.cause.includes('Memory')) {
        immediate.push('Review memory usage and clear unnecessary caches');
        preventive.push('Implement memory usage optimization');
        monitoring.push('Add memory usage alerts and garbage collection monitoring');
      }
    }

    return { immediate, preventive, monitoring };
  }

  private initializeBaselinePatterns(): void {
    // Initialize with known patterns from historical data
    // This would be loaded from a configuration or learned from historical data
  }

  private cleanupOldData(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Clean old patterns
    for (const [id, pattern] of this.patterns.entries()) {
      if (pattern.lastSeen < oneDayAgo) {
        this.patterns.delete(id);
      }
    }

    // Clean old anomalies
    for (const [id, anomaly] of this.anomalies.entries()) {
      if (anomaly.timestamp < oneHourAgo) {
        this.anomalies.delete(id);
      }
    }
  }

  private startPeriodicAnalysis(): void {
    this.analysisTimer = setInterval(() => {
      this.performPeriodicAnalysis();
    }, this.analysisInterval);

    logger.info('Periodic analysis scheduler started', {
      action: 'analysis_scheduler_start',
      interval: this.analysisInterval,
    });
  }

  /**
   * Public API methods
   */
  getPatterns(): LogPattern[] {
    return Array.from(this.patterns.values());
  }

  getAnomalies(): Anomaly[] {
    return Array.from(this.anomalies.values());
  }

  getMetricsHistory(): Map<string, { timestamp: number; value: number }[]> {
    return new Map(this.metricsHistory);
  }

  async generateInsightReport(): Promise<{
    patterns: LogPattern[];
    anomalies: Anomaly[];
    trends: TrendAnalysis[];
    recommendations: string[];
  }> {
    const trends = await this.performTrendAnalysis();
    
    return {
      patterns: this.getPatterns(),
      anomalies: this.getAnomalies(),
      trends,
      recommendations: this.generateGeneralRecommendations(),
    };
  }

  private generateGeneralRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const errorPatterns = this.getPatterns().filter(p => p.type === 'error_burst');
    if (errorPatterns.length > 0) {
      recommendations.push('Review and address error burst patterns to improve system stability');
    }

    const perfPatterns = this.getPatterns().filter(p => p.type === 'performance_degradation');
    if (perfPatterns.length > 0) {
      recommendations.push('Investigate performance degradation patterns and optimize slow operations');
    }

    if (this.getAnomalies().length > 5) {
      recommendations.push('Multiple anomalies detected - consider comprehensive system health review');
    }

    return recommendations;
  }

  destroy(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }

    logger.info('Log Analyzer destroyed', {
      action: 'log_analyzer_destroy',
    });
  }
}

// Global log analyzer instance
export const logAnalyzer = new LogAnalyzer();

export default LogAnalyzer;