/**
 * Unified RAG Pipeline Configuration
 *
 * Central configuration system for all RAG pipeline components.
 * Supports environment variable overrides for different deployments.
 *
 * Usage:
 *   import { loadConfig, getFeatureConfig } from './_shared/config.ts';
 *   const config = loadConfig();
 *   const rerankConfig = getFeatureConfig('rerank');
 *
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export interface RAGConfig {
  // Feature Flags
  features: {
    rerank_enabled: boolean;
    rerank_provider: 'cohere' | 'pinecone' | 'none';
    hybrid_search_enabled: boolean;
    query_expansion_enabled: boolean;
    recency_weighting_enabled: boolean;
    semantic_chunking_enabled: boolean;
  };

  // Reranking Configuration
  rerank: {
    model: string;
    pinecone_model: string;
    top_n: number;
    timeout_ms: number;
    fallback_enabled: boolean;
    fallback_provider: 'pinecone' | 'none';
    score_weight: number; // Weight for rerank score vs semantic (default: 0.7)
  };

  // Hybrid Search Configuration
  hybrid: {
    default_alpha: number;
    alpha_by_data_type: Record<string, number>;
    keyword_boost_terms: string[];
    auto_tune_enabled: boolean;
  };

  // Query Expansion Configuration
  query_expansion: {
    use_llm: boolean;
    max_expansion_terms: number;
    expansion_timeout_ms: number;
    synonyms_enabled: boolean;
    related_terms_enabled: boolean;
  };

  // Recency Configuration
  recency: {
    default_half_life_days: number;
    half_life_by_data_type: Record<string, number>;
    min_decay: number;
    boost_recent_days: number;
    boost_multiplier: number;
  };

  // Chunking Configuration
  chunking: {
    default_strategy: 'fixed' | 'semantic' | 'hybrid';
    max_chunk_size: number;
    target_chunk_size: number;
    overlap_percentage: number;
    preserve_parent_reference: boolean;
  };

  // Search Configuration
  search: {
    default_limit: number;
    max_limit: number;
    include_metadata: boolean;
    similarity_threshold: number;
    fetch_multiplier_for_rerank: number;
  };

  // Embedding Configuration
  embedding: {
    model: string;
    dimensions: number;
    max_input_tokens: number;
  };

  // API Rate Limits (requests per minute)
  rate_limits: {
    openai_rpm: number;
    openai_tpm: number; // tokens per minute
    cohere_rpm: number;
    pinecone_rpm: number;
    anthropic_rpm: number;
  };

  // Ingestion Configuration
  ingestion: {
    batch_size: number;
    max_concurrent_batches: number;
    retry_attempts: number;
    retry_delay_ms: number;
    timeout_ms: number;
    deduplication_enabled: boolean;
    max_retries_for_dlq: number;
  };

  // Observability
  observability: {
    log_level: 'debug' | 'info' | 'warn' | 'error';
    metrics_enabled: boolean;
    trace_requests: boolean;
  };
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  features: {
    rerank_enabled: true,
    rerank_provider: 'pinecone',  // Using Pinecone's native model (included with plan)
    hybrid_search_enabled: true,
    query_expansion_enabled: true,
    recency_weighting_enabled: true,
    semantic_chunking_enabled: true,
  },

  rerank: {
    model: 'rerank-v3.5',
    pinecone_model: 'pinecone-rerank-v0',
    top_n: 10,
    timeout_ms: 5000,
    fallback_enabled: true,
    fallback_provider: 'pinecone',
    score_weight: 0.7,
  },

  hybrid: {
    default_alpha: 0.5,
    alpha_by_data_type: {
      session: 0.7,      // More semantic - natural language conversations
      learning: 0.65,    // Concepts + specific terms
      research: 0.6,     // Mix of ideas and references
      deployment: 0.5,   // Mix of logs and descriptions
      error: 0.45,       // Error messages + stack traces
      system_snapshot: 0.4,
      metric: 0.35,      // Numbers and specific identifiers
      code: 0.3,         // Function names, variables matter
      config: 0.25,      // Exact config keys are important
    },
    keyword_boost_terms: [
      'RLS', 'JWT', 'OAuth', 'API', 'SQL', 'UUID', 'CORS',
      'SSR', 'SSG', 'CSR', 'PWA', 'REST', 'gRPC', 'WebSocket',
      'Supabase', 'Pinecone', 'Vercel', 'Mapbox', 'OpenAI',
      'TypeScript', 'React', 'Tailwind', 'PostgreSQL', 'PostGIS',
    ],
    auto_tune_enabled: true,
  },

  query_expansion: {
    use_llm: false, // Start with rule-based only, enable LLM later
    max_expansion_terms: 10,
    expansion_timeout_ms: 500,
    synonyms_enabled: true,
    related_terms_enabled: true,
  },

  recency: {
    default_half_life_days: 14,
    half_life_by_data_type: {
      session: 7,       // Sessions decay faster
      error: 3,         // Errors are most relevant when fresh
      deployment: 14,   // Deployments stay relevant longer
      learning: 60,     // Learning materials stay relevant much longer
      code: 30,         // Code changes stay relevant moderately long
      config: 30,       // Configs stay relevant
      metric: 1,        // Metrics are very time-sensitive
    },
    min_decay: 0.1,     // Never decay below 10%
    boost_recent_days: 3,
    boost_multiplier: 1.2,
  },

  chunking: {
    default_strategy: 'semantic',
    max_chunk_size: 512,
    target_chunk_size: 384,
    overlap_percentage: 15,
    preserve_parent_reference: true,
  },

  search: {
    default_limit: 10,
    max_limit: 50,
    include_metadata: true,
    similarity_threshold: 0.7,
    fetch_multiplier_for_rerank: 5,
  },

  embedding: {
    model: 'text-embedding-3-large',
    dimensions: 3072,
    max_input_tokens: 8191,
  },

  rate_limits: {
    openai_rpm: 3000,
    openai_tpm: 1000000,
    cohere_rpm: 100,
    pinecone_rpm: 100,
    anthropic_rpm: 50,
  },

  ingestion: {
    batch_size: 10,
    max_concurrent_batches: 2,
    retry_attempts: 3,
    retry_delay_ms: 2000,
    timeout_ms: 60000,
    deduplication_enabled: true,
    max_retries_for_dlq: 3,
  },

  observability: {
    log_level: 'info',
    metrics_enabled: true,
    trace_requests: false,
  },
};

// ============================================
// CONFIG LOADING
// ============================================

let cachedConfig: RAGConfig | null = null;

/**
 * Deep merge two objects (target is modified)
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
      } else {
        (target as Record<string, unknown>)[key] = source[key];
      }
    }
  }
  return target;
}

/**
 * Load configuration with environment variable overrides
 *
 * Environment variables:
 *   RAG_CONFIG_OVERRIDES: JSON string of partial config to merge
 *   RAG_RERANK_ENABLED: "true" or "false"
 *   RAG_HYBRID_SEARCH_ENABLED: "true" or "false"
 *   RAG_QUERY_EXPANSION_ENABLED: "true" or "false"
 *   RAG_RECENCY_ENABLED: "true" or "false"
 *   RAG_LOG_LEVEL: "debug", "info", "warn", "error"
 */
export function loadConfig(forceReload = false): RAGConfig {
  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  // Start with defaults
  const config = JSON.parse(JSON.stringify(DEFAULT_RAG_CONFIG)) as RAGConfig;

  // Apply JSON overrides from environment
  const envOverrides = Deno.env.get('RAG_CONFIG_OVERRIDES');
  if (envOverrides) {
    try {
      const overrides = JSON.parse(envOverrides);
      deepMerge(config, overrides);
    } catch (error) {
      console.warn('Failed to parse RAG_CONFIG_OVERRIDES:', error);
    }
  }

  // Apply individual environment variable overrides
  const booleanEnvOverrides: Array<{
    envVar: string;
    path: (config: RAGConfig) => { obj: Record<string, unknown>; key: string };
  }> = [
    {
      envVar: 'RAG_RERANK_ENABLED',
      path: (c) => ({ obj: c.features, key: 'rerank_enabled' }),
    },
    {
      envVar: 'RAG_HYBRID_SEARCH_ENABLED',
      path: (c) => ({ obj: c.features, key: 'hybrid_search_enabled' }),
    },
    {
      envVar: 'RAG_QUERY_EXPANSION_ENABLED',
      path: (c) => ({ obj: c.features, key: 'query_expansion_enabled' }),
    },
    {
      envVar: 'RAG_RECENCY_ENABLED',
      path: (c) => ({ obj: c.features, key: 'recency_weighting_enabled' }),
    },
    {
      envVar: 'RAG_METRICS_ENABLED',
      path: (c) => ({ obj: c.observability, key: 'metrics_enabled' }),
    },
  ];

  for (const override of booleanEnvOverrides) {
    const value = Deno.env.get(override.envVar);
    if (value !== undefined) {
      const { obj, key } = override.path(config);
      obj[key] = value.toLowerCase() === 'true';
    }
  }

  // Log level override
  const logLevel = Deno.env.get('RAG_LOG_LEVEL');
  if (logLevel && ['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    config.observability.log_level = logLevel as RAGConfig['observability']['log_level'];
  }

  // Rerank provider override
  const rerankProvider = Deno.env.get('RAG_RERANK_PROVIDER');
  if (rerankProvider && ['cohere', 'pinecone', 'none'].includes(rerankProvider)) {
    config.features.rerank_provider = rerankProvider as RAGConfig['features']['rerank_provider'];
  }

  cachedConfig = config;
  return config;
}

/**
 * Get configuration for a specific component
 */
export function getFeatureConfig<K extends keyof RAGConfig>(component: K): RAGConfig[K] {
  return loadConfig()[component];
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof RAGConfig['features']
): boolean {
  const features = getFeatureConfig('features');
  return features[feature] as boolean;
}

/**
 * Get alpha value for a data type
 */
export function getAlphaForDataType(dataType?: string): number {
  const hybridConfig = getFeatureConfig('hybrid');
  if (!dataType) return hybridConfig.default_alpha;
  return hybridConfig.alpha_by_data_type[dataType] ?? hybridConfig.default_alpha;
}

/**
 * Get half-life for a data type
 */
export function getHalfLifeForDataType(dataType?: string): number {
  const recencyConfig = getFeatureConfig('recency');
  if (!dataType) return recencyConfig.default_half_life_days;
  return recencyConfig.half_life_by_data_type[dataType] ?? recencyConfig.default_half_life_days;
}

/**
 * Clear cached config (for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

// ============================================
// CONFIG VALIDATION
// ============================================

/**
 * Validate configuration values
 */
export function validateConfig(config: RAGConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate alpha values
  if (config.hybrid.default_alpha < 0 || config.hybrid.default_alpha > 1) {
    errors.push('hybrid.default_alpha must be between 0 and 1');
  }

  for (const [dataType, alpha] of Object.entries(config.hybrid.alpha_by_data_type)) {
    if (alpha < 0 || alpha > 1) {
      errors.push(`hybrid.alpha_by_data_type.${dataType} must be between 0 and 1`);
    }
  }

  // Validate rerank config
  if (config.rerank.top_n < 1 || config.rerank.top_n > 100) {
    errors.push('rerank.top_n must be between 1 and 100');
  }

  if (config.rerank.timeout_ms < 100 || config.rerank.timeout_ms > 30000) {
    warnings.push('rerank.timeout_ms should be between 100ms and 30000ms');
  }

  // Validate search config
  if (config.search.default_limit > config.search.max_limit) {
    errors.push('search.default_limit cannot exceed search.max_limit');
  }

  // Validate chunking config
  if (config.chunking.target_chunk_size > config.chunking.max_chunk_size) {
    errors.push('chunking.target_chunk_size cannot exceed chunking.max_chunk_size');
  }

  if (config.chunking.overlap_percentage < 0 || config.chunking.overlap_percentage > 50) {
    errors.push('chunking.overlap_percentage must be between 0 and 50');
  }

  // Validate rate limits
  if (config.rate_limits.openai_rpm < 1) {
    errors.push('rate_limits.openai_rpm must be positive');
  }

  // Validate recency config
  if (config.recency.min_decay < 0 || config.recency.min_decay > 1) {
    errors.push('recency.min_decay must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// ENVIRONMENT INFO
// ============================================

/**
 * Get current environment information
 */
export function getEnvironmentInfo(): {
  environment: string;
  config_overrides_set: boolean;
  features_enabled: string[];
  features_disabled: string[];
} {
  const config = loadConfig();
  const features = config.features;

  const featuresEnabled: string[] = [];
  const featuresDisabled: string[] = [];

  for (const [key, value] of Object.entries(features)) {
    if (typeof value === 'boolean') {
      if (value) {
        featuresEnabled.push(key);
      } else {
        featuresDisabled.push(key);
      }
    }
  }

  return {
    environment: Deno.env.get('ENVIRONMENT') || 'development',
    config_overrides_set: !!Deno.env.get('RAG_CONFIG_OVERRIDES'),
    features_enabled: featuresEnabled,
    features_disabled: featuresDisabled,
  };
}

