/**
 * LangSmith tracing integration for observability
 */
import { Client } from "langsmith";
import { RunTree } from "langsmith/run_trees";
/**
 * Initialize LangSmith client
 */
export declare function initTracing(): boolean;
/**
 * Check if tracing is enabled
 */
export declare function isTracingEnabled(): boolean;
/**
 * Create a new traced run for an operation
 */
export declare function startTrace(name: string, runType: "chain" | "tool" | "retriever" | "embedding", inputs: Record<string, any>, metadata?: Record<string, any>): Promise<RunTree | null>;
/**
 * End a traced run with outputs
 */
export declare function endTrace(runTree: RunTree | null, outputs: Record<string, any>, error?: Error): Promise<void>;
/**
 * Create a child run within a parent trace
 */
export declare function createChildTrace(parent: RunTree | null, name: string, runType: "chain" | "tool" | "retriever" | "embedding", inputs: Record<string, any>): Promise<RunTree | null>;
/**
 * Trace wrapper for async functions
 */
export declare function withTrace<T>(name: string, runType: "chain" | "tool" | "retriever" | "embedding", inputs: Record<string, any>, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>;
/**
 * Log feedback for a run (useful for evaluating retrieval quality)
 */
export declare function logFeedback(runId: string, key: string, score: number, comment?: string): Promise<void>;
/**
 * Get the LangSmith client for advanced operations
 */
export declare function getClient(): Client | null;
