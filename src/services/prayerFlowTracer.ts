/**
 * Prayer Flow Tracer - AGENT 10 Implementation
 * 
 * Traces and validates the complete prayer response flow:
 * "Pray for someone" → memorial line creation → real-time connection → database persistence
 * 
 * SPIRITUAL MISSION: Ensure every prayer response creates proper eternal memorial lines
 */

import { supabase } from '../lib/supabase';
import type { Prayer, PrayerConnection } from '../types/prayer';
import { realtimeMonitor } from './realtimeMonitor';

interface FlowTraceOptions {
  enableLogging?: boolean;
  timeoutMs?: number;
  validateMemorialLine?: boolean;
  onStepComplete?: (step: FlowStep) => void;
}

interface FlowStep {
  step: string;
  status: 'pending' | 'success' | 'error';
  timestamp: Date;
  data?: any;
  error?: string;
  duration?: number;
}

interface PrayerFlowTrace {
  flowId: string;
  prayerId: string;
  responderId: string;
  startTime: Date;
  endTime?: Date;
  steps: FlowStep[];
  memorialLine?: PrayerConnection;
  success: boolean;
  totalDuration?: number;
}

interface FlowValidationResult {
  isValid: boolean;
  missingSteps: string[];
  errors: string[];
  memorialLineCreated: boolean;
  realtimeUpdated: boolean;
  databasePersisted: boolean;
}

/**
 * Prayer Response Flow Tracer
 * Ensures complete end-to-end prayer response experience
 */
export class PrayerFlowTracer {
  private options: Required<FlowTraceOptions>;
  private activeTraces = new Map<string, PrayerFlowTrace>();
  private traceTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(options: FlowTraceOptions = {}) {
    this.options = {
      enableLogging: options.enableLogging ?? true,
      timeoutMs: options.timeoutMs ?? 10000, // 10 seconds max for complete flow
      validateMemorialLine: options.validateMemorialLine ?? true,
      onStepComplete: options.onStepComplete ?? (() => {})
    };
  }

  /**
   * Start tracing a prayer response flow
   */
  startTrace(prayerId: string, responderId: string): string {
    const flowId = `${prayerId}_${responderId}_${Date.now()}`;
    
    const trace: PrayerFlowTrace = {
      flowId,
      prayerId,
      responderId,
      startTime: new Date(),
      steps: [],
      success: false
    };

    this.activeTraces.set(flowId, trace);
    
    // Set timeout for flow completion
    const timeout = setTimeout(() => {
      this.handleFlowTimeout(flowId);
    }, this.options.timeoutMs);
    
    this.traceTimeouts.set(flowId, timeout);

    this.log(`🎯 Starting prayer flow trace: ${flowId}`);
    this.addStep(flowId, 'flow_started', 'success', { prayerId, responderId });

    return flowId;
  }

  /**
   * Trace prayer response submission
   */
  tracePrayerResponseSubmission(flowId: string, responseData: any): void {
    const stepStart = Date.now();
    
    try {
      this.addStep(flowId, 'response_submission_started', 'pending', responseData);
      
      // Validate response data
      if (!responseData.message || !responseData.contentType) {
        this.addStep(flowId, 'response_validation', 'error', {
          error: 'Missing required response data'
        });
        return;
      }

      this.addStep(flowId, 'response_validation', 'success', {
        message: responseData.message.substring(0, 50) + '...',
        contentType: responseData.contentType,
        isAnonymous: responseData.isAnonymous
      });

      this.addStep(flowId, 'response_submission_complete', 'success', {
        duration: Date.now() - stepStart
      });

    } catch (error) {
      this.addStep(flowId, 'response_submission', 'error', {
        error: error.message,
        duration: Date.now() - stepStart
      });
    }
  }

  /**
   * Trace database operations
   */
  traceDatabaseOperation(flowId: string, operation: string, result: any, error?: any): void {
    const stepName = `database_${operation}`;
    
    if (error) {
      this.addStep(flowId, stepName, 'error', {
        operation,
        error: error.message || error,
        details: error.details
      });
      return;
    }

    this.addStep(flowId, stepName, 'success', {
      operation,
      recordId: result?.id,
      recordType: result?.prayer_id ? 'prayer_connection' : 'prayer_response'
    });

    // Check for memorial line creation
    if (operation === 'create_connection' && result) {
      const trace = this.activeTraces.get(flowId);
      if (trace) {
        trace.memorialLine = result;
        this.log(`✨ Memorial line created for flow ${flowId}: ${result.id}`);
      }
    }
  }

  /**
   * Trace real-time update propagation
   */
  traceRealtimeUpdate(flowId: string, updateType: 'prayer' | 'connection', updateData: any): void {
    this.addStep(flowId, `realtime_${updateType}_update`, 'success', {
      updateType,
      recordId: updateData.id,
      propagationDelay: Date.now() - new Date(updateData.created_at).getTime()
    });

    // Check if this completes the flow
    if (updateType === 'connection') {
      this.checkFlowCompletion(flowId);
    }
  }

  /**
   * Trace animation execution
   */
  traceAnimation(flowId: string, animationType: string, status: 'started' | 'completed'): void {
    this.addStep(flowId, `animation_${animationType}_${status}`, 'success', {
      animationType,
      status
    });
  }

  /**
   * Validate complete prayer flow
   */
  async validateFlow(flowId: string): Promise<FlowValidationResult> {
    const trace = this.activeTraces.get(flowId);
    if (!trace) {
      return {
        isValid: false,
        missingSteps: ['trace_not_found'],
        errors: ['Flow trace not found'],
        memorialLineCreated: false,
        realtimeUpdated: false,
        databasePersisted: false
      };
    }

    const requiredSteps = [
      'flow_started',
      'response_submission_started',
      'response_validation',
      'database_create_response',
      'database_create_connection'
    ];

    const completedSteps = trace.steps
      .filter(step => step.status === 'success')
      .map(step => step.step);

    const missingSteps = requiredSteps.filter(step => 
      !completedSteps.includes(step)
    );

    const errors = trace.steps
      .filter(step => step.status === 'error')
      .map(step => step.error || 'Unknown error');

    // Check memorial line creation
    const memorialLineCreated = !!trace.memorialLine || 
      completedSteps.includes('database_create_connection');

    // Check real-time updates
    const realtimeUpdated = completedSteps.includes('realtime_connection_update');

    // Verify database persistence
    let databasePersisted = false;
    if (trace.memorialLine) {
      try {
        const { data } = await supabase
          .from('prayer_connections')
          .select('id')
          .eq('id', trace.memorialLine.id)
          .single();
        
        databasePersisted = !!data;
      } catch (error) {
        this.log(`Database verification failed for ${flowId}:`, error);
      }
    }

    const result: FlowValidationResult = {
      isValid: missingSteps.length === 0 && errors.length === 0,
      missingSteps,
      errors,
      memorialLineCreated,
      realtimeUpdated,
      databasePersisted
    };

    this.log(`🔍 Flow validation for ${flowId}:`, result);
    return result;
  }

  /**
   * Check if flow is complete
   */
  private checkFlowCompletion(flowId: string): void {
    const trace = this.activeTraces.get(flowId);
    if (!trace) return;

    const hasResponse = trace.steps.some(step => 
      step.step === 'database_create_response' && step.status === 'success'
    );
    
    const hasConnection = trace.steps.some(step => 
      step.step === 'database_create_connection' && step.status === 'success'
    );

    const hasRealtimeUpdate = trace.steps.some(step => 
      step.step === 'realtime_connection_update' && step.status === 'success'
    );

    if (hasResponse && hasConnection && hasRealtimeUpdate) {
      this.completeFlow(flowId, true);
    }
  }

  /**
   * Complete a flow trace
   */
  completeFlow(flowId: string, success: boolean): void {
    const trace = this.activeTraces.get(flowId);
    if (!trace) return;

    trace.endTime = new Date();
    trace.success = success;
    trace.totalDuration = trace.endTime.getTime() - trace.startTime.getTime();

    // Clear timeout
    const timeout = this.traceTimeouts.get(flowId);
    if (timeout) {
      clearTimeout(timeout);
      this.traceTimeouts.delete(flowId);
    }

    this.addStep(flowId, 'flow_completed', success ? 'success' : 'error', {
      success,
      totalDuration: trace.totalDuration,
      stepCount: trace.steps.length
    });

    this.log(`${success ? '✅' : '❌'} Prayer flow ${success ? 'completed' : 'failed'}: ${flowId}`, {
      duration: trace.totalDuration + 'ms',
      steps: trace.steps.length,
      memorialLineCreated: !!trace.memorialLine
    });

    // Keep trace for analysis but remove timeout
    setTimeout(() => {
      this.activeTraces.delete(flowId);
    }, 30000); // Keep for 30 seconds for debugging
  }

  /**
   * Handle flow timeout
   */
  private handleFlowTimeout(flowId: string): void {
    this.addStep(flowId, 'flow_timeout', 'error', {
      timeoutMs: this.options.timeoutMs,
      message: 'Flow did not complete within timeout period'
    });

    this.completeFlow(flowId, false);
  }

  /**
   * Add a step to the flow trace
   */
  private addStep(flowId: string, step: string, status: FlowStep['status'], data?: any): void {
    const trace = this.activeTraces.get(flowId);
    if (!trace) return;

    const stepData: FlowStep = {
      step,
      status,
      timestamp: new Date(),
      data
    };

    // Calculate duration from previous step
    const lastStep = trace.steps[trace.steps.length - 1];
    if (lastStep) {
      stepData.duration = stepData.timestamp.getTime() - lastStep.timestamp.getTime();
    }

    trace.steps.push(stepData);

    if (this.options.onStepComplete) {
      this.options.onStepComplete(stepData);
    }

    if (this.options.enableLogging && status === 'error') {
      this.log(`❌ Flow step error in ${flowId}:`, stepData);
    }
  }

  /**
   * Get all active traces
   */
  getActiveTraces(): PrayerFlowTrace[] {
    return Array.from(this.activeTraces.values());
  }

  /**
   * Get trace by flow ID
   */
  getTrace(flowId: string): PrayerFlowTrace | undefined {
    return this.activeTraces.get(flowId);
  }

  /**
   * Clear all traces
   */
  clearAllTraces(): void {
    // Clear timeouts
    this.traceTimeouts.forEach(timeout => clearTimeout(timeout));
    this.traceTimeouts.clear();
    
    // Clear traces
    this.activeTraces.clear();
    
    this.log('🧹 Cleared all flow traces');
  }

  /**
   * Log with prefix
   */
  private log(message: string, data?: any): void {
    if (this.options.enableLogging) {
      console.log(`[PrayerFlowTracer] ${message}`, data || '');
    }
  }
}

// Global instance for the application
export const prayerFlowTracer = new PrayerFlowTracer({
  enableLogging: process.env.NODE_ENV === 'development',
  timeoutMs: 10000,
  validateMemorialLine: true
});

/**
 * Helper functions for easy integration
 */

export function startPrayerResponseTrace(prayerId: string, responderId: string): string {
  return prayerFlowTracer.startTrace(prayerId, responderId);
}

export function traceResponseSubmission(flowId: string, responseData: any): void {
  prayerFlowTracer.tracePrayerResponseSubmission(flowId, responseData);
}

export function traceDatabaseOp(flowId: string, operation: string, result: any, error?: any): void {
  prayerFlowTracer.traceDatabaseOperation(flowId, operation, result, error);
}

export function traceRealtimeUpdate(flowId: string, updateType: 'prayer' | 'connection', updateData: any): void {
  prayerFlowTracer.traceRealtimeUpdate(flowId, updateType, updateData);
}

export function validatePrayerFlow(flowId: string): Promise<FlowValidationResult> {
  return prayerFlowTracer.validateFlow(flowId);
}

export function completePrayerFlow(flowId: string, success: boolean): void {
  prayerFlowTracer.completeFlow(flowId, success);
}

export default prayerFlowTracer;