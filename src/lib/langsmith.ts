/**
 * LangSmith Tracing Service for PrayerMap
 * 
 * Centralized observability for all AI operations:
 * - OpenAI embeddings and chat completions
 * - Pinecone vector operations
 * - RAG queries and generation
 * - Migration operations
 * 
 * Provides structured tracing with project organization,
 * performance metrics, and error tracking.
 */

import { Client } from "langsmith";
import { RunTree } from "langsmith/run_trees";

// Singleton client instance
let langsmithClient: Client | null = null;
let tracingEnabled = false;

// Environment variables
const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY;
const LANGSMITH_ENDPOINT = process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com";

// Project organization - separate projects for different concerns
export const LANGSMITH_PROJECTS = {
  main: process.env.LANGSMITH_PROJECT || "prayermap-main",
  embeddings: process.env.LANGSMITH_PROJECT_EMBEDDINGS || "prayermap-embeddings",
  rag: process.env.LANGSMITH_PROJECT_RAG || "prayermap-rag",
  memory: process.env.LANGSMITH_PROJECT_MEMORY || "prayermap-memory",
  migrations: process.env.LANGSMITH_PROJECT_MIGRATIONS || "prayermap-migrations",
  pinecone: process.env.LANGSMITH_PROJECT_PINECONE || "prayermap-pinecone",
} as const;

export type LangSmithProject = keyof typeof LANGSMITH_PROJECTS;
export type RunType = "chain" | "tool" | "retriever" | "embedding" | "llm";

/**
 * Initialize LangSmith client
 * Should be called early in application lifecycle
 */
export function initLangSmith(): boolean {
  if (tracingEnabled && langsmithClient) {
    return true; // Already initialized
  }

  if (!LANGSMITH_API_KEY) {
    console.warn("⚠️  LANGSMITH_API_KEY not set - tracing disabled");
    return false;
  }

  try {
    langsmithClient = new Client({
      apiKey: LANGSMITH_API_KEY,
      apiUrl: LANGSMITH_ENDPOINT,
    });
    tracingEnabled = true;
    console.log(`✅ LangSmith tracing enabled for project: ${LANGSMITH_PROJECTS.main}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize LangSmith:", error);
    return false;
  }
}

/**
 * Check if tracing is enabled
 */
export function isTracingEnabled(): boolean {
  return tracingEnabled && langsmithClient !== null;
}

/**
 * Get the LangSmith client (for advanced operations)
 */
export function getLangSmithClient(): Client | null {
  return langsmithClient;
}

/**
 * Create a new traced run
 */
export async function startTrace(
  name: string,
  runType: RunType,
  project: LangSmithProject = "main",
  inputs: Record<string, any> = {},
  metadata?: Record<string, any>
): Promise<RunTree | null> {
  if (!isTracingEnabled() || !langsmithClient) {
    return null;
  }

  try {
    const runTree = new RunTree({
      name,
      run_type: runType,
      inputs,
      project_name: LANGSMITH_PROJECTS[project],
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
  outputs: Record<string, any> = {},
  error?: Error
): Promise<void> {
  if (!runTree) return;

  try {
    if (error) {
      runTree.end({ error: error.message, stack: error.stack });
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
  runType: RunType,
  inputs: Record<string, any> = {}
): Promise<RunTree | null> {
  if (!parent) {
    return null;
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
 * Automatically handles trace lifecycle
 */
export async function withTrace<T>(
  name: string,
  runType: RunType,
  project: LangSmithProject,
  inputs: Record<string, any>,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const trace = await startTrace(name, runType, project, inputs, metadata);
  const startTime = Date.now();

  try {
    const result = await fn();
    const latency = Date.now() - startTime;
    
    await endTrace(trace, {
      result: typeof result === 'object' ? JSON.stringify(result).slice(0, 1000) : result,
      latency_ms: latency,
    });
    
    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    await endTrace(trace, { latency_ms: latency }, error as Error);
    throw error;
  }
}

/**
 * Log feedback for a run (useful for evaluating quality)
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
 * Calculate cost estimate for OpenAI operations
 */
export function calculateOpenAICost(
  model: string,
  promptTokens: number,
  completionTokens: number = 0
): number {
  // Pricing per 1M tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 2.50, output: 10.00 },
    "gpt-4-turbo": { input: 10.00, output: 30.00 },
    "gpt-4": { input: 30.00, output: 60.00 },
    "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
    "text-embedding-3-large": { input: 0.13, output: 0 },
    "text-embedding-3-small": { input: 0.02, output: 0 },
  };

  const modelPricing = pricing[model] || pricing["gpt-4o"];
  const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
  const outputCost = (completionTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Initialize LangSmith automatically when module loads
 * (if API key is present)
 * Only in Node.js environment (not browser)
 */
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  initLangSmith();
}

