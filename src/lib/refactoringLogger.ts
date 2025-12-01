/**
 * Refactoring Logger - Structured logging for refactoring work
 * 
 * Use this to track refactoring progress, mark milestones, and debug issues
 * during code refactoring. All logs are sent to Datadog for analysis.
 * 
 * Usage:
 * ```typescript
 * import { refactoringLogger } from '@/lib/refactoringLogger';
 * 
 * // Mark start of refactoring
 * refactoringLogger.start('PrayerMap component extraction');
 * 
 * // Log component changes
 * refactoringLogger.component('PrayerMap', 'extracted', {
 *   new_components: ['MapContainer', 'PrayerMarkers'],
 *   lines_reduced: 150
 * });
 * 
 * // Mark milestone
 * refactoringLogger.milestone('Component extraction complete');
 * 
 * // Mark completion
 * refactoringLogger.complete('PrayerMap refactoring', {
 *   total_time_ms: 5000,
 *   components_created: 3
 * });
 * ```
 */

import { logger } from './datadog';

interface RefactoringContext {
  refactoring_id?: string;
  component?: string;
  file?: string;
  [key: string]: any;
}

class RefactoringLogger {
  private activeRefactorings: Map<string, number> = new Map();

  /**
   * Start tracking a refactoring task
   */
  start(task: string, context?: RefactoringContext): string {
    const refactoringId = `refactor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    this.activeRefactorings.set(refactoringId, startTime);
    
    logger.refactoring(`Refactoring started: ${task}`, {
      refactoring_id: refactoringId,
      task,
      start_time: new Date().toISOString(),
      ...context,
    });
    
    return refactoringId;
  }

  /**
   * Log a component change during refactoring
   */
  component(component: string, action: 'extracted' | 'created' | 'modified' | 'removed', context?: RefactoringContext): void {
    logger.component(component, action, {
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Log a file change
   */
  file(file: string, action: 'created' | 'modified' | 'deleted', context?: RefactoringContext): void {
    logger.info(`File ${action}: ${file}`, {
      type: 'file_change',
      file,
      action,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Log a milestone during refactoring
   */
  milestone(milestone: string, context?: RefactoringContext): void {
    logger.milestone(milestone, {
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Log performance before/after comparison
   */
  performance(metric: string, before: number, after: number, context?: RefactoringContext): void {
    const improvement = ((before - after) / before) * 100;
    const improved = after < before;
    
    logger.performance(metric, after, {
      before,
      after,
      improvement_percent: improvement.toFixed(2),
      improved,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Log a potential issue found during refactoring
   */
  issue(issue: string, severity: 'low' | 'medium' | 'high', context?: RefactoringContext): void {
    logger.warn(`Refactoring issue: ${issue}`, {
      type: 'refactoring_issue',
      issue,
      severity,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Complete a refactoring task
   */
  complete(task: string, refactoringId?: string, context?: RefactoringContext): void {
    const startTime = refactoringId ? this.activeRefactorings.get(refactoringId) : undefined;
    const duration = startTime ? Date.now() - startTime : undefined;
    
    if (refactoringId) {
      this.activeRefactorings.delete(refactoringId);
    }
    
    logger.refactoring(`Refactoring completed: ${task}`, {
      refactoring_id: refactoringId,
      task,
      duration_ms: duration,
      completion_time: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Log a test result during refactoring
   */
  test(testName: string, passed: boolean, context?: RefactoringContext): void {
    logger.info(`Test ${passed ? 'passed' : 'failed'}: ${testName}`, {
      type: 'test_result',
      test_name: testName,
      passed,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Log a code quality metric
   */
  quality(metric: string, value: number, target?: number, context?: RefactoringContext): void {
    const meetsTarget = target ? value <= target : undefined;
    
    logger.info(`Code quality: ${metric} = ${value}${target ? ` (target: ${target})` : ''}`, {
      type: 'code_quality',
      metric,
      value,
      target,
      meets_target: meetsTarget,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }
}

export const refactoringLogger = new RefactoringLogger();

