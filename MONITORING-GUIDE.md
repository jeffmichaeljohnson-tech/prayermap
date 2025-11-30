# MONITORING-GUIDE.md - Observability & Quality Gates

> **Consolidated observability requirements for PrayerMap.** This guide covers all monitoring, logging, performance tracking, and quality gate implementations.

> **Prerequisites:** Read [ARTICLE.md](./ARTICLE.md) for quality standards, then [PROJECT-GUIDE.md](./PROJECT-GUIDE.md).

---

## 🎯 Observability Philosophy

PrayerMap follows **2024 industry standards** for AI-assisted development observability:
- **EU AI Act compliance** - Comprehensive audit trails
- **NIST AI Risk Management Framework** - Risk-based monitoring
- **Google SRE Golden Signals** - Latency, traffic, errors, saturation
- **OpenTelemetry standards** - Industry-standard instrumentation

**Core Principle:** Every operation is tracked, every error is analyzed, every performance bottleneck is identified automatically.

---

## 📊 Golden Signals Monitoring

### 1. Latency Monitoring
```typescript
// hooks/usePerformanceMonitor.ts
import { useEffect } from 'react';

export function usePerformanceMonitor(operationName: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      
      // Log performance data
      logPerformance({
        operation: operationName,
        duration,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
      
      // Alert on slow operations
      if (duration > PERFORMANCE_THRESHOLDS[operationName]) {
        trackError(new Error(`Slow operation: ${operationName} took ${duration}ms`), {
          type: 'performance',
          threshold: PERFORMANCE_THRESHOLDS[operationName],
          actual: duration
        });
      }
    };
  }, [operationName]);
}

// Usage in components
function PrayerMap() {
  usePerformanceMonitor('PrayerMap.render');
  
  // Component logic...
}
```

### 2. Traffic Monitoring
```typescript
// lib/analytics/trafficMonitor.ts
export class TrafficMonitor {
  private static instance: TrafficMonitor;
  private metrics: Map<string, number> = new Map();
  
  static getInstance() {
    if (!TrafficMonitor.instance) {
      TrafficMonitor.instance = new TrafficMonitor();
    }
    return TrafficMonitor.instance;
  }
  
  trackRequest(endpoint: string) {
    const current = this.metrics.get(endpoint) || 0;
    this.metrics.set(endpoint, current + 1);
    
    // Log traffic patterns
    logTraffic({
      endpoint,
      count: current + 1,
      timestamp: Date.now(),
      userId: getCurrentUserId()
    });
  }
  
  getTopEndpoints(limit = 10) {
    return Array.from(this.metrics.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit);
  }
}

// Usage in service layers
export const prayerService = {
  async getPrayers(filters: PrayerFilters) {
    TrafficMonitor.getInstance().trackRequest('prayers.get');
    
    try {
      const result = await supabase.from('prayers').select('*');
      return result;
    } catch (error) {
      trackError(error, { operation: 'prayers.get', filters });
      throw error;
    }
  }
};
```

### 3. Error Tracking
```typescript
// lib/monitoring/errorTracker.ts
export interface ErrorContext {
  userId?: string;
  sessionId: string;
  url: string;
  userAgent: string;
  timestamp: number;
  operation?: string;
  additionalContext?: Record<string, any>;
}

export class ErrorTracker {
  private static instance: ErrorTracker;
  private errorBuffer: Array<{error: Error, context: ErrorContext}> = [];
  private readonly BUFFER_SIZE = 100;
  
  static getInstance() {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }
  
  trackError(error: Error, context: Partial<ErrorContext> = {}) {
    const fullContext: ErrorContext = {
      sessionId: getSessionId(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      ...context
    };
    
    // Add to buffer
    this.errorBuffer.push({ error, context: fullContext });
    if (this.errorBuffer.length > this.BUFFER_SIZE) {
      this.errorBuffer.shift();
    }
    
    // Immediate logging
    logError({
      message: error.message,
      stack: error.stack,
      name: error.name,
      context: fullContext
    });
    
    // Pattern analysis
    this.analyzeErrorPatterns();
    
    // Auto-recovery attempt
    this.attemptAutoRecovery(error, fullContext);
  }
  
  private analyzeErrorPatterns() {
    const recent = this.errorBuffer.slice(-10);
    const errorTypes = recent.map(({error}) => error.name);
    
    // Detect error spikes
    if (recent.length >= 5) {
      const timeSpan = recent[recent.length - 1].context.timestamp - recent[0].context.timestamp;
      if (timeSpan < 30000) { // 5 errors in 30 seconds
        this.alertErrorSpike(recent);
      }
    }
    
    // Detect repeated errors
    const duplicates = errorTypes.filter((type, index) => 
      errorTypes.indexOf(type) !== index
    );
    if (duplicates.length > 2) {
      this.alertRepeatedErrors(duplicates);
    }
  }
  
  private async attemptAutoRecovery(error: Error, context: ErrorContext) {
    const recoveryStrategies = [
      this.retryWithExponentialBackoff,
      this.clearLocalStorage,
      this.refreshAuthToken,
      this.fallbackToOfflineMode
    ];
    
    for (const strategy of recoveryStrategies) {
      try {
        const recovered = await strategy.call(this, error, context);
        if (recovered) {
          logRecovery({
            error: error.message,
            strategy: strategy.name,
            context
          });
          return true;
        }
      } catch (recoveryError) {
        logError({
          message: `Recovery failed: ${strategy.name}`,
          originalError: error.message,
          recoveryError: recoveryError.message,
          context
        });
      }
    }
    
    // Escalate if auto-recovery fails
    this.escalateToHuman(error, context);
    return false;
  }
}

// Global error tracking hook
export function useErrorTracking() {
  const errorTracker = ErrorTracker.getInstance();
  
  const trackError = useCallback((error: Error, context?: Partial<ErrorContext>) => {
    errorTracker.trackError(error, context);
  }, [errorTracker]);
  
  return { trackError };
}
```

### 4. Saturation Monitoring
```typescript
// lib/monitoring/saturationMonitor.ts
export class SaturationMonitor {
  private static instance: SaturationMonitor;
  private resourceUsage: Map<string, number[]> = new Map();
  
  static getInstance() {
    if (!SaturationMonitor.instance) {
      SaturationMonitor.instance = new SaturationMonitor();
      SaturationMonitor.instance.startMonitoring();
    }
    return SaturationMonitor.instance;
  }
  
  private startMonitoring() {
    // Monitor browser memory usage
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.recordMetric('memory.used', memory.usedJSHeapSize);
        this.recordMetric('memory.total', memory.totalJSHeapSize);
        this.recordMetric('memory.limit', memory.jsHeapSizeLimit);
      }
    }, 5000);
    
    // Monitor network connectivity
    setInterval(() => {
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        this.recordMetric('network.effectiveType', conn.effectiveType);
        this.recordMetric('network.downlink', conn.downlink);
      }
    }, 10000);
    
    // Monitor render performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'measure') {
            this.recordMetric(`render.${entry.name}`, entry.duration);
          }
        });
      });
      observer.observe({ entryTypes: ['measure'] });
    }
  }
  
  private recordMetric(name: string, value: number) {
    if (!this.resourceUsage.has(name)) {
      this.resourceUsage.set(name, []);
    }
    
    const values = this.resourceUsage.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
    
    // Check for saturation
    this.checkSaturation(name, values);
  }
  
  private checkSaturation(metric: string, values: number[]) {
    if (values.length < 10) return;
    
    const recent = values.slice(-10);
    const average = recent.reduce((a, b) => a + b) / recent.length;
    const threshold = SATURATION_THRESHOLDS[metric];
    
    if (threshold && average > threshold) {
      trackError(new Error(`Resource saturation detected: ${metric}`), {
        type: 'saturation',
        metric,
        average,
        threshold,
        recentValues: recent
      });
    }
  }
}
```

---

## 🔍 Structured Logging Implementation

### Core Logging Service
```typescript
// lib/logging/structuredLogger.ts
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | error';
  message: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  operation?: string;
  duration?: number;
  context?: Record<string, any>;
  tags?: string[];
}

export class StructuredLogger {
  private static instance: StructuredLogger;
  private logBuffer: LogEntry[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  
  static getInstance() {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
      StructuredLogger.instance.startPeriodicFlush();
    }
    return StructuredLogger.instance;
  }
  
  private log(entry: Omit<LogEntry, 'timestamp' | 'sessionId'>) {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: Date.now(),
      sessionId: getSessionId(),
      userId: getCurrentUserId()
    };
    
    // Add to buffer
    this.logBuffer.push(logEntry);
    
    // Console output (development)
    if (import.meta.env.DEV) {
      console.log(`[${entry.level.toUpperCase()}]`, entry.message, entry.context);
    }
    
    // Immediate flush for errors
    if (entry.level === 'error') {
      this.flush();
    }
    
    // Manage buffer size
    if (this.logBuffer.length > this.BUFFER_SIZE) {
      this.flush();
    }
  }
  
  info(message: string, context?: Record<string, any>) {
    this.log({ level: 'info', message, context });
  }
  
  warn(message: string, context?: Record<string, any>) {
    this.log({ level: 'warn', message, context });
  }
  
  error(message: string, context?: Record<string, any>) {
    this.log({ level: 'error', message, context });
  }
  
  performance(operation: string, duration: number, context?: Record<string, any>) {
    this.log({
      level: 'info',
      message: `Performance: ${operation}`,
      operation,
      duration,
      context,
      tags: ['performance']
    });
  }
  
  private async flush() {
    if (this.logBuffer.length === 0) return;
    
    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      // Send to Supabase logging table
      await supabase
        .from('application_logs')
        .insert(logsToFlush.map(entry => ({
          ...entry,
          context: JSON.stringify(entry.context || {}),
          tags: entry.tags || []
        })));
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Re-add logs to buffer
      this.logBuffer.unshift(...logsToFlush);
    }
  }
  
  private startPeriodicFlush() {
    setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }
}

// Convenience functions
export const logger = StructuredLogger.getInstance();
export const logInfo = (message: string, context?: Record<string, any>) => 
  logger.info(message, context);
export const logWarning = (message: string, context?: Record<string, any>) => 
  logger.warn(message, context);
export const logError = (message: string, context?: Record<string, any>) => 
  logger.error(message, context);
export const logPerformance = (operation: string, duration: number, context?: Record<string, any>) => 
  logger.performance(operation, duration, context);
```

---

## 📈 Quality Gates & Thresholds

### Performance Thresholds
```typescript
// lib/monitoring/thresholds.ts
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  'first-contentful-paint': 1500,        // ms
  'largest-contentful-paint': 2500,      // ms
  'time-to-interactive': 2000,           // ms
  'cumulative-layout-shift': 0.1,        // score
  'first-input-delay': 100,              // ms
  
  // Component Performance
  'PrayerMap.render': 100,               // ms
  'PrayerCard.render': 50,               // ms
  'PrayerModal.render': 75,              // ms
  
  // API Performance
  'prayers.get': 500,                    // ms
  'prayers.create': 1000,                // ms
  'auth.signIn': 2000,                   // ms
  
  // Bundle Size
  'bundle.main': 500,                    // KB gzipped
  'bundle.vendor': 200,                  // KB gzipped
};

export const SATURATION_THRESHOLDS = {
  'memory.used': 50 * 1024 * 1024,      // 50MB
  'network.downlink': 1,                 // Mbps (slow connection)
  'render.frame-time': 16.67,            // ms (60fps)
};

export const ERROR_RATE_THRESHOLDS = {
  'prayers.get': 0.01,                   // 1% error rate
  'prayers.create': 0.005,               // 0.5% error rate
  'auth.signIn': 0.02,                   // 2% error rate
};
```

### Quality Gate Implementation
```typescript
// lib/monitoring/qualityGates.ts
export class QualityGateMonitor {
  private static instance: QualityGateMonitor;
  private metrics: Map<string, number[]> = new Map();
  
  static getInstance() {
    if (!QualityGateMonitor.instance) {
      QualityGateMonitor.instance = new QualityGateMonitor();
    }
    return QualityGateMonitor.instance;
  }
  
  recordMetric(name: string, value: number, tags: string[] = []) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(value);
    
    // Log metric
    logInfo(`Metric recorded: ${name}`, { value, tags });
    
    // Check quality gates
    this.checkQualityGate(name, value);
  }
  
  private checkQualityGate(metric: string, value: number) {
    const threshold = PERFORMANCE_THRESHOLDS[metric];
    if (!threshold) return;
    
    if (value > threshold) {
      const violation = {
        metric,
        value,
        threshold,
        severity: this.calculateSeverity(value, threshold),
        timestamp: Date.now()
      };
      
      // Log violation
      logWarning(`Quality gate violation: ${metric}`, violation);
      
      // Trigger alerts for severe violations
      if (violation.severity === 'critical') {
        this.triggerAlert(violation);
      }
    }
  }
  
  private calculateSeverity(value: number, threshold: number): 'warning' | 'critical' {
    const ratio = value / threshold;
    return ratio > 2 ? 'critical' : 'warning';
  }
  
  private triggerAlert(violation: any) {
    // Send to monitoring service
    logError(`CRITICAL: Quality gate violation`, violation);
    
    // Could integrate with Slack, PagerDuty, etc.
    if (typeof window !== 'undefined' && 'Notification' in window) {
      new Notification(`PrayerMap Quality Alert`, {
        body: `${violation.metric} exceeded threshold by ${Math.round((violation.value / violation.threshold - 1) * 100)}%`,
        icon: '/favicon.ico'
      });
    }
  }
  
  getQualityReport(): QualityReport {
    const report: QualityReport = {
      timestamp: Date.now(),
      metrics: {},
      violations: 0,
      overallScore: 100
    };
    
    for (const [metric, values] of this.metrics.entries()) {
      const recent = values.slice(-10);
      const average = recent.reduce((a, b) => a + b) / recent.length;
      const threshold = PERFORMANCE_THRESHOLDS[metric];
      
      report.metrics[metric] = {
        average,
        threshold,
        violations: values.filter(v => threshold && v > threshold).length,
        trend: this.calculateTrend(values)
      };
      
      if (threshold && average > threshold) {
        report.violations++;
        report.overallScore -= 10;
      }
    }
    
    return report;
  }
  
  private calculateTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 6) return 'stable';
    
    const first = values.slice(0, 3).reduce((a, b) => a + b) / 3;
    const last = values.slice(-3).reduce((a, b) => a + b) / 3;
    
    const change = (last - first) / first;
    
    if (change < -0.1) return 'improving';
    if (change > 0.1) return 'degrading';
    return 'stable';
  }
}

export interface QualityReport {
  timestamp: number;
  metrics: Record<string, {
    average: number;
    threshold?: number;
    violations: number;
    trend: 'improving' | 'stable' | 'degrading';
  }>;
  violations: number;
  overallScore: number;
}
```

---

## 🔄 Real-time Monitoring Dashboard

### Dashboard Component
```typescript
// components/MonitoringDashboard.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QualityGateMonitor, QualityReport } from '@/lib/monitoring/qualityGates';

export function MonitoringDashboard() {
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Show dashboard on Ctrl+Shift+M
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        setIsVisible(!isVisible);
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isVisible]);
  
  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        const monitor = QualityGateMonitor.getInstance();
        const report = monitor.getQualityReport();
        setQualityReport(report);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isVisible]);
  
  if (!isVisible || !qualityReport) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 w-96 z-50"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Performance Monitor</h3>
        <button onClick={() => setIsVisible(false)}>✕</button>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between">
          <span>Overall Score</span>
          <span className={`font-bold ${qualityReport.overallScore >= 80 ? 'text-green-600' : 'text-red-600'}`}>
            {qualityReport.overallScore}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div 
            className={`h-2 rounded-full ${qualityReport.overallScore >= 80 ? 'bg-green-600' : 'bg-red-600'}`}
            style={{ width: `${qualityReport.overallScore}%` }}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        {Object.entries(qualityReport.metrics).map(([metric, data]) => (
          <div key={metric} className="text-sm">
            <div className="flex justify-between">
              <span className="truncate">{metric}</span>
              <span className={data.violations > 0 ? 'text-red-600' : 'text-green-600'}>
                {Math.round(data.average)}ms
              </span>
            </div>
            {data.threshold && (
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full ${data.average > data.threshold ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, (data.average / data.threshold) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {qualityReport.violations > 0 && (
        <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700 text-sm">
            ⚠️ {qualityReport.violations} quality gate violation{qualityReport.violations > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </motion.div>
  );
}
```

---

## 🚨 AI-Powered Error Analysis

### Error Pattern Recognition
```typescript
// lib/monitoring/errorAnalyzer.ts
export class ErrorAnalyzer {
  private static instance: ErrorAnalyzer;
  private errorHistory: Array<{error: Error, context: ErrorContext, timestamp: number}> = [];
  
  static getInstance() {
    if (!ErrorAnalyzer.instance) {
      ErrorAnalyzer.instance = new ErrorAnalyzer();
    }
    return ErrorAnalyzer.instance;
  }
  
  analyzeError(error: Error, context: ErrorContext): ErrorAnalysis {
    this.errorHistory.push({ error, context, timestamp: Date.now() });
    
    const analysis: ErrorAnalysis = {
      errorType: this.classifyError(error),
      severity: this.calculateSeverity(error, context),
      patterns: this.detectPatterns(error),
      suggestedFixes: this.suggestFixes(error, context),
      affectedUsers: this.estimateAffectedUsers(error),
      recurrenceRisk: this.calculateRecurrenceRisk(error)
    };
    
    // Log analysis
    logInfo('Error analysis completed', { error: error.message, analysis });
    
    return analysis;
  }
  
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return 'authentication';
    }
    if (stack.includes('react') || stack.includes('component')) {
      return 'ui';
    }
    if (message.includes('database') || message.includes('sql')) {
      return 'database';
    }
    if (message.includes('permission') || message.includes('rls')) {
      return 'authorization';
    }
    
    return 'unknown';
  }
  
  private detectPatterns(error: Error): ErrorPattern[] {
    const recent = this.errorHistory.slice(-50);
    const patterns: ErrorPattern[] = [];
    
    // Time-based clustering
    const timeGroups = this.groupByTimeWindow(recent, 60000); // 1 minute
    for (const group of timeGroups) {
      if (group.length >= 3) {
        patterns.push({
          type: 'time_cluster',
          description: `${group.length} similar errors in 1 minute`,
          confidence: 0.8,
          affectedOperations: group.map(e => e.context.operation).filter(Boolean)
        });
      }
    }
    
    // User-based clustering
    const userGroups = this.groupByUser(recent);
    for (const [userId, errors] of userGroups.entries()) {
      if (errors.length >= 3) {
        patterns.push({
          type: 'user_specific',
          description: `Multiple errors for user ${userId}`,
          confidence: 0.9,
          affectedUsers: [userId]
        });
      }
    }
    
    // Operation-based clustering
    const opGroups = this.groupByOperation(recent);
    for (const [operation, errors] of opGroups.entries()) {
      if (errors.length >= 3) {
        patterns.push({
          type: 'operation_specific',
          description: `Repeated failures in ${operation}`,
          confidence: 0.85,
          affectedOperations: [operation]
        });
      }
    }
    
    return patterns;
  }
  
  private suggestFixes(error: Error, context: ErrorContext): string[] {
    const fixes: string[] = [];
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      fixes.push('Implement retry with exponential backoff');
      fixes.push('Add offline mode support');
      fixes.push('Check network connectivity before requests');
    }
    
    if (message.includes('auth') || message.includes('unauthorized')) {
      fixes.push('Refresh authentication token');
      fixes.push('Redirect to login page');
      fixes.push('Check token expiration');
    }
    
    if (message.includes('rls') || message.includes('permission')) {
      fixes.push('Review Row Level Security policies');
      fixes.push('Check user permissions');
      fixes.push('Verify user context in request');
    }
    
    if (message.includes('component') || error.stack?.includes('react')) {
      fixes.push('Add error boundary');
      fixes.push('Validate props before render');
      fixes.push('Check component state consistency');
    }
    
    return fixes;
  }
}

export interface ErrorAnalysis {
  errorType: ErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  patterns: ErrorPattern[];
  suggestedFixes: string[];
  affectedUsers: number;
  recurrenceRisk: number;
}

export type ErrorType = 'network' | 'authentication' | 'authorization' | 'ui' | 'database' | 'unknown';

export interface ErrorPattern {
  type: 'time_cluster' | 'user_specific' | 'operation_specific';
  description: string;
  confidence: number;
  affectedUsers?: string[];
  affectedOperations?: string[];
}
```

---

## 📋 Observability Checklist

### Pre-Deployment Checklist
- [ ] **Structured logging implemented** - All operations log to structured format
- [ ] **Performance monitoring active** - Golden signals tracked
- [ ] **Error tracking configured** - Auto-recovery mechanisms in place
- [ ] **Quality gates defined** - Performance thresholds set and enforced
- [ ] **Dashboard accessible** - Monitoring dashboard available (Ctrl+Shift+M)
- [ ] **Log retention configured** - 30-day retention in Supabase
- [ ] **Alert thresholds set** - Critical errors trigger immediate alerts
- [ ] **Recovery procedures tested** - Auto-healing strategies verified

### Runtime Monitoring Tasks
- [ ] **Daily quality reports** - Review performance trends
- [ ] **Error pattern analysis** - Check for recurring issues
- [ ] **Performance regression detection** - Monitor for degradation
- [ ] **User experience impact assessment** - Correlation with user metrics
- [ ] **Resource utilization review** - Memory, network, CPU usage
- [ ] **Security audit trails** - Review authentication and authorization logs

---

## 🔗 Integration Points

### Supabase Integration
```sql
-- application_logs table for structured logging
CREATE TABLE application_logs (
  id BIGSERIAL PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  operation TEXT,
  duration INTEGER,
  context JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_application_logs_timestamp ON application_logs(timestamp);
CREATE INDEX idx_application_logs_level ON application_logs(level);
CREATE INDEX idx_application_logs_operation ON application_logs(operation);
CREATE INDEX idx_application_logs_user_id ON application_logs(user_id);

-- RLS policies
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs" ON application_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all logs" ON application_logs
  FOR ALL USING (auth.role() = 'service_role');
```

### External Monitoring Services
```typescript
// Optional integrations for production
export const externalMonitoring = {
  // Sentry for error tracking
  sentry: {
    enabled: process.env.VITE_SENTRY_DSN !== undefined,
    dsn: process.env.VITE_SENTRY_DSN,
  },
  
  // PostHog for product analytics
  posthog: {
    enabled: process.env.VITE_POSTHOG_KEY !== undefined,
    key: process.env.VITE_POSTHOG_KEY,
  },
  
  // LogRocket for session replay
  logrocket: {
    enabled: process.env.VITE_LOGROCKET_ID !== undefined,
    appId: process.env.VITE_LOGROCKET_ID,
  }
};
```

---

## 🔗 Related Documentation

- **[PROJECT-GUIDE.md](./PROJECT-GUIDE.md)** - Main project navigation
- **[IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)** - Implementation patterns
- **[AI-AGENTS.md](./AI-AGENTS.md)** - AI agent coordination
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and monitoring

---

**Last Updated:** 2024-11-30  
**Version:** 1.0 (Comprehensive observability guide)  
**Next Review:** After observability system implementation