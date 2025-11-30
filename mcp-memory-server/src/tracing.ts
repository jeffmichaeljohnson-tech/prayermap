/**
 * LangSmith tracing integration for observability
 */

import { Client } from "langsmith";
import { RunTree } from "langsmith/run_trees";

let langsmithClient: Client | null = null;
let tracingEnabled = false;

// Environment variables
const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY;
// Use consistent project name - prioritize env var, fallback to standard name
const LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT || process.env.LANGSMITH_PROJECT_MEMORY || "prayermap-memory";

/**
 * Initialize LangSmith client
 */
export function initTracing(): boolean {
  if (!LANGSMITH_API_KEY) {
    console.error("LANGSMITH_API_KEY not set - tracing disabled");
    return false;
  }

  try {
    langsmithClient = new Client({
      apiKey: LANGSMITH_API_KEY,
    });
    tracingEnabled = true;
    console.error(`LangSmith tracing enabled for project: ${LANGSMITH_PROJECT}`);
    return true;
  } catch (error) {
    console.error("Failed to initialize LangSmith:", error);
    return false;
  }
}

/**
 * Check if tracing is enabled
 */
export function isTracingEnabled(): boolean {
  return tracingEnabled;
}

/**
 * Create a new traced run for an operation
 */
export async function startTrace(
  name: string,
  runType: "chain" | "tool" | "retriever" | "embedding",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
): Promise<RunTree | null> {
  if (!tracingEnabled || !langsmithClient) {
    return null;
  }

  try {
    const runTree = new RunTree({
      name,
      run_type: runType,
      inputs,
      project_name: LANGSMITH_PROJECT,
      extra: metadata ? { metadata } : undefined,
    });

    return runTree;
  } catch (error) {
    console.error(`Failed to start trace for ${name}:`, error);
    return null;
  }
}

/**
 * End a traced run with outputs
 */
export async function endTrace(
  runTree: RunTree | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outputs: Record<string, any>,
  error?: Error
): Promise<void> {
  if (!runTree) return;

  try {
    if (error) {
      runTree.end({ error: error.message });
    } else {
      runTree.end(outputs);
    }
    await runTree.postRun();
  } catch (err) {
    console.error("Failed to end trace:", err);
  }
}

/**
 * Create a child run within a parent trace
 */
export async function createChildTrace(
  parent: RunTree | null,
  name: string,
  runType: "chain" | "tool" | "retriever" | "embedding",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: Record<string, any>
): Promise<RunTree | null> {
  if (!parent) {
    return startTrace(name, runType, inputs);
  }

  try {
    const childRun = await parent.createChild({
      name,
      run_type: runType,
      inputs,
    });
    return childRun;
  } catch (error) {
    console.error(`Failed to create child trace for ${name}:`, error);
    return null;
  }
}

/**
 * Trace wrapper for async functions
 */
export async function withTrace<T>(
  name: string,
  runType: "chain" | "tool" | "retriever" | "embedding",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: Record<string, any>,
  fn: () => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
): Promise<T> {
  const trace = await startTrace(name, runType, inputs, metadata);

  try {
    const result = await fn();
    await endTrace(trace, { result });
    return result;
  } catch (error) {
    await endTrace(trace, {}, error as Error);
    throw error;
  }
}

/**
 * Log feedback for a run (useful for evaluating retrieval quality)
 */
export async function logFeedback(
  runId: string,
  key: string,
  score: number,
  comment?: string
): Promise<void> {
  if (!langsmithClient) return;

  try {
    await langsmithClient.createFeedback(runId, key, {
      score,
      comment,
    });
  } catch (error) {
    console.error("Failed to log feedback:", error);
  }
}

/**
 * Get the LangSmith client for advanced operations
 */
export function getClient(): Client | null {
  return langsmithClient;
}
