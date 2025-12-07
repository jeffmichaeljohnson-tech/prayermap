/**
 * Feature Flag Management System
 *
 * Provides feature flag evaluation with support for:
 * - Global enable/disable
 * - Gradual rollout percentages
 * - User-based allowlist/blocklist
 * - Environment-based overrides
 *
 * Usage:
 *   import { isFeatureFlagEnabled, getFeatureFlags } from './_shared/feature-flags.ts';
 *   if (isFeatureFlagEnabled('cohere-rerank', userId)) {
 *     // Use Cohere reranking
 *   }
 *
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  rollout_percentage?: number; // 0-100
  user_allowlist?: string[];
  user_blocklist?: string[];
  environments?: string[]; // Only enabled in these environments
  metadata?: Record<string, unknown>;
}

export interface FeatureFlagEvaluation {
  flag_name: string;
  enabled: boolean;
  reason: 'disabled' | 'blocklist' | 'allowlist' | 'rollout' | 'environment' | 'global';
}

// ============================================
// FEATURE FLAG DEFINITIONS
// ============================================

/**
 * Default feature flags for the RAG pipeline
 *
 * These can be overridden via environment variable:
 *   FEATURE_FLAGS_OVERRIDE='{"cohere-rerank":{"enabled":false}}'
 */
const DEFAULT_FEATURE_FLAGS: Record<string, FeatureFlag> = {
  'cohere-rerank': {
    name: 'cohere-rerank',
    description: 'Use Cohere Rerank API for result reranking',
    enabled: true,
    rollout_percentage: 100,
  },

  'pinecone-rerank': {
    name: 'pinecone-rerank',
    description: 'Use Pinecone Inference API for reranking (fallback)',
    enabled: true,
    rollout_percentage: 100,
  },

  'hybrid-search': {
    name: 'hybrid-search',
    description: 'Combine dense and sparse vectors for hybrid search',
    enabled: true,
    rollout_percentage: 100,
  },

  'query-expansion': {
    name: 'query-expansion',
    description: 'Expand queries with synonyms and related terms',
    enabled: true,
    rollout_percentage: 100,
  },

  'query-expansion-llm': {
    name: 'query-expansion-llm',
    description: 'Use LLM for query expansion (more expensive)',
    enabled: false, // Start with rule-based only
    rollout_percentage: 0,
  },

  'intent-detection': {
    name: 'intent-detection',
    description: 'Detect query intent for automatic filtering',
    enabled: true,
    rollout_percentage: 100,
  },

  'recency-weighting': {
    name: 'recency-weighting',
    description: 'Apply time-decay scoring to results',
    enabled: true,
    rollout_percentage: 100,
  },

  'semantic-chunking': {
    name: 'semantic-chunking',
    description: 'Use semantic-aware chunking for ingestion',
    enabled: true,
    rollout_percentage: 100,
  },

  'content-deduplication': {
    name: 'content-deduplication',
    description: 'Skip duplicate content during ingestion',
    enabled: true,
    rollout_percentage: 100,
  },

  'auto-tagging': {
    name: 'auto-tagging',
    description: 'Use Claude to auto-tag ingested content',
    enabled: true,
    rollout_percentage: 100,
  },

  'batch-processing': {
    name: 'batch-processing',
    description: 'Process ingestion items in batches',
    enabled: true,
    rollout_percentage: 100,
  },

  'rate-limiting': {
    name: 'rate-limiting',
    description: 'Apply rate limiting to external API calls',
    enabled: true,
    rollout_percentage: 100,
  },

  'metrics-collection': {
    name: 'metrics-collection',
    description: 'Collect and log processing metrics',
    enabled: true,
    rollout_percentage: 100,
  },

  'query-decomposition': {
    name: 'query-decomposition',
    description: 'Decompose complex queries for RAG Fusion',
    enabled: false, // Experimental
    rollout_percentage: 0,
  },

  'sparse-embedding-cache': {
    name: 'sparse-embedding-cache',
    description: 'Cache sparse embeddings for repeated queries',
    enabled: false, // Not implemented yet
    rollout_percentage: 0,
  },
};

// ============================================
// FLAG LOADING
// ============================================

let cachedFlags: Record<string, FeatureFlag> | null = null;

/**
 * Load feature flags with environment overrides
 */
function loadFeatureFlags(forceReload = false): Record<string, FeatureFlag> {
  if (cachedFlags && !forceReload) {
    return cachedFlags;
  }

  // Start with defaults
  const flags = JSON.parse(JSON.stringify(DEFAULT_FEATURE_FLAGS)) as Record<string, FeatureFlag>;

  // Apply environment overrides
  const envOverrides = Deno.env.get('FEATURE_FLAGS_OVERRIDE');
  if (envOverrides) {
    try {
      const overrides = JSON.parse(envOverrides) as Record<string, Partial<FeatureFlag>>;
      for (const [name, override] of Object.entries(overrides)) {
        if (flags[name]) {
          flags[name] = { ...flags[name], ...override };
        } else {
          // Allow adding new flags via environment
          flags[name] = {
            name,
            description: override.description || 'Custom flag',
            enabled: override.enabled ?? false,
            ...override,
          } as FeatureFlag;
        }
      }
    } catch (error) {
      console.warn('Failed to parse FEATURE_FLAGS_OVERRIDE:', error);
    }
  }

  // Apply individual flag overrides (e.g., FF_COHERE_RERANK=false)
  for (const flagName of Object.keys(flags)) {
    const envVarName = `FF_${flagName.toUpperCase().replace(/-/g, '_')}`;
    const envValue = Deno.env.get(envVarName);
    if (envValue !== undefined) {
      flags[flagName].enabled = envValue.toLowerCase() === 'true';
    }
  }

  cachedFlags = flags;
  return flags;
}

/**
 * Clear cached flags (for testing)
 */
export function clearFeatureFlagCache(): void {
  cachedFlags = null;
}

// ============================================
// FLAG EVALUATION
// ============================================

/**
 * Generate a consistent hash for a user ID
 * Used for percentage-based rollouts
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if a feature flag is enabled
 *
 * Evaluation order:
 * 1. Check if flag exists → false if not
 * 2. Check if globally disabled → false
 * 3. Check user blocklist → false if blocked
 * 4. Check user allowlist → true if allowed
 * 5. Check environment restriction → false if not in allowed env
 * 6. Check rollout percentage → based on user hash
 *
 * @param flagName - Name of the feature flag
 * @param userId - Optional user ID for percentage rollouts
 * @returns Whether the feature is enabled
 */
export function isFeatureFlagEnabled(
  flagName: string,
  userId?: string
): boolean {
  return evaluateFeatureFlag(flagName, userId).enabled;
}

/**
 * Evaluate a feature flag with detailed reasoning
 */
export function evaluateFeatureFlag(
  flagName: string,
  userId?: string
): FeatureFlagEvaluation {
  const flags = loadFeatureFlags();
  const flag = flags[flagName];

  // Flag doesn't exist
  if (!flag) {
    return {
      flag_name: flagName,
      enabled: false,
      reason: 'disabled',
    };
  }

  // Globally disabled
  if (!flag.enabled) {
    return {
      flag_name: flagName,
      enabled: false,
      reason: 'disabled',
    };
  }

  // Check blocklist
  if (userId && flag.user_blocklist?.includes(userId)) {
    return {
      flag_name: flagName,
      enabled: false,
      reason: 'blocklist',
    };
  }

  // Check allowlist (overrides rollout)
  if (userId && flag.user_allowlist?.includes(userId)) {
    return {
      flag_name: flagName,
      enabled: true,
      reason: 'allowlist',
    };
  }

  // Check environment restriction
  if (flag.environments && flag.environments.length > 0) {
    const currentEnv = Deno.env.get('ENVIRONMENT') || 'development';
    if (!flag.environments.includes(currentEnv)) {
      return {
        flag_name: flagName,
        enabled: false,
        reason: 'environment',
      };
    }
  }

  // Check rollout percentage
  if (flag.rollout_percentage !== undefined && flag.rollout_percentage < 100) {
    if (flag.rollout_percentage === 0) {
      return {
        flag_name: flagName,
        enabled: false,
        reason: 'rollout',
      };
    }

    // Use user ID for consistent rollout, or random for anonymous
    const hashInput = userId || crypto.randomUUID();
    const hash = simpleHash(hashInput);
    const bucket = hash % 100;

    return {
      flag_name: flagName,
      enabled: bucket < flag.rollout_percentage,
      reason: 'rollout',
    };
  }

  // All checks passed
  return {
    flag_name: flagName,
    enabled: true,
    reason: 'global',
  };
}

// ============================================
// FLAG MANAGEMENT
// ============================================

/**
 * Get all feature flags
 */
export function getFeatureFlags(): Record<string, FeatureFlag> {
  return loadFeatureFlags();
}

/**
 * Get a specific feature flag definition
 */
export function getFeatureFlag(flagName: string): FeatureFlag | undefined {
  const flags = loadFeatureFlags();
  return flags[flagName];
}

/**
 * Get all enabled feature flags for a user
 */
export function getEnabledFeatures(userId?: string): string[] {
  const flags = loadFeatureFlags();
  const enabled: string[] = [];

  for (const flagName of Object.keys(flags)) {
    if (isFeatureFlagEnabled(flagName, userId)) {
      enabled.push(flagName);
    }
  }

  return enabled;
}

/**
 * Get all disabled feature flags for a user
 */
export function getDisabledFeatures(userId?: string): string[] {
  const flags = loadFeatureFlags();
  const disabled: string[] = [];

  for (const flagName of Object.keys(flags)) {
    if (!isFeatureFlagEnabled(flagName, userId)) {
      disabled.push(flagName);
    }
  }

  return disabled;
}

// ============================================
// FLAG STATUS SUMMARY
// ============================================

/**
 * Get a summary of all feature flags status
 */
export function getFeatureFlagSummary(userId?: string): {
  total: number;
  enabled: number;
  disabled: number;
  flags: Array<{
    name: string;
    enabled: boolean;
    reason: string;
    rollout_percentage?: number;
  }>;
} {
  const flags = loadFeatureFlags();
  const summary: Array<{
    name: string;
    enabled: boolean;
    reason: string;
    rollout_percentage?: number;
  }> = [];

  for (const [name, flag] of Object.entries(flags)) {
    const evaluation = evaluateFeatureFlag(name, userId);
    summary.push({
      name,
      enabled: evaluation.enabled,
      reason: evaluation.reason,
      rollout_percentage: flag.rollout_percentage,
    });
  }

  const enabledCount = summary.filter((f) => f.enabled).length;

  return {
    total: summary.length,
    enabled: enabledCount,
    disabled: summary.length - enabledCount,
    flags: summary,
  };
}

// ============================================
// CONVENIENCE CHECKS
// ============================================

/**
 * Quick check for reranking feature
 */
export function isRerankEnabled(userId?: string): boolean {
  return isFeatureFlagEnabled('cohere-rerank', userId) ||
         isFeatureFlagEnabled('pinecone-rerank', userId);
}

/**
 * Quick check for hybrid search feature
 */
export function isHybridSearchEnabled(userId?: string): boolean {
  return isFeatureFlagEnabled('hybrid-search', userId);
}

/**
 * Quick check for query expansion feature
 */
export function isQueryExpansionEnabled(userId?: string): boolean {
  return isFeatureFlagEnabled('query-expansion', userId);
}

/**
 * Quick check for LLM query expansion
 */
export function isLLMQueryExpansionEnabled(userId?: string): boolean {
  return isFeatureFlagEnabled('query-expansion-llm', userId);
}

/**
 * Quick check for recency weighting
 */
export function isRecencyWeightingEnabled(userId?: string): boolean {
  return isFeatureFlagEnabled('recency-weighting', userId);
}

/**
 * Quick check for semantic chunking
 */
export function isSemanticChunkingEnabled(userId?: string): boolean {
  return isFeatureFlagEnabled('semantic-chunking', userId);
}

