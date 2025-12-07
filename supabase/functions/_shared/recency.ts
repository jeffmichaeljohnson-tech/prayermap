/**
 * Recency Weighting Module
 * 
 * Implements time-decay scoring for development memory retrieval.
 * Recent content is prioritized over older content because:
 * - Yesterday's decision is more relevant than last year's
 * - Recent errors are active problems
 * - Current patterns supersede old approaches
 * 
 * Formula: final_score = semantic_score * decay_factor * boost_factor
 */

// ============================================
// TYPES
// ============================================

export type DecayFunction = 'exponential' | 'linear' | 'gaussian' | 'step';

export interface RecencyOptions {
  decay_function: DecayFunction;
  half_life_days: number;      // Days until score is halved
  min_decay: number;           // Minimum multiplier (never fully zero)
  reference_date?: Date;       // Compare against this date (default: now)
}

export interface BoostOptions {
  boost_recent_days: number;   // Days to apply boost
  boost_multiplier: number;    // How much to boost (e.g., 1.5x)
}

export type RecencyWeight = 'none' | 'light' | 'normal' | 'heavy' | 'critical';

export interface TemporalMetadata {
  timestamp: string;           // ISO 8601, when content was created
  session_date: string;        // YYYY-MM-DD
  week?: string;               // YYYY-WXX format
  indexed_at?: string;         // When it was added to Pinecone
}

export interface RecencyResult {
  decay: number;
  boost: number;
  final_multiplier: number;
  age_days: number;
  data_type: string;
  decay_function: DecayFunction;
}

// ============================================
// DECAY FUNCTIONS
// ============================================

/**
 * Exponential decay: score * e^(-λ * age_days)
 * λ = ln(2) / half_life_days
 * 
 * Properties:
 * - Smooth, continuous decay
 * - At half_life_days: 50% remaining
 * - At 2x half_life_days: 25% remaining
 * - Never reaches exactly 0
 */
function exponentialDecay(ageDays: number, halfLifeDays: number): number {
  if (ageDays <= 0) return 1.0;
  const lambda = Math.LN2 / halfLifeDays;
  return Math.exp(-lambda * ageDays);
}

/**
 * Linear decay: score * max(0, 1 - age_days / max_days)
 * 
 * Properties:
 * - Simple, predictable
 * - Reaches 0 at max_days
 * - At half max_days: 50% remaining
 */
function linearDecay(ageDays: number, maxDays: number): number {
  if (ageDays <= 0) return 1.0;
  return Math.max(0, 1 - ageDays / maxDays);
}

/**
 * Gaussian decay: smoother falloff
 * score * e^(-(age^2) / (2 * sigma^2))
 * 
 * Properties:
 * - Slow initial decay, then accelerates
 * - Good for "plateau then drop" patterns
 */
function gaussianDecay(ageDays: number, sigma: number): number {
  if (ageDays <= 0) return 1.0;
  return Math.exp(-(ageDays ** 2) / (2 * sigma ** 2));
}

/**
 * Step decay: full score for X days, then reduced
 * 
 * Properties:
 * - Binary: either fresh or stale
 * - Simple mental model
 */
function stepDecay(ageDays: number, freshDays: number, staleMultiplier: number): number {
  return ageDays <= freshDays ? 1.0 : staleMultiplier;
}

// ============================================
// RECENCY CONFIGURATIONS BY DATA TYPE
// ============================================

/**
 * Each data type has different temporal relevance characteristics:
 * 
 * - Sessions: Very recent is much more relevant (7-day half-life)
 * - Code: Moderate decay, code patterns last longer (30-day)
 * - Errors: Very recent errors are active problems (3-day)
 * - Learning: Concepts don't expire quickly (60-day, higher floor)
 * - Deployments: Recent deployments are critical (14-day)
 * - Config: Moderate decay (30-day step)
 * - System snapshots: Very time-sensitive (1-day)
 * - Metrics: Time-sensitive performance data (7-day)
 */
const RECENCY_CONFIGS: Record<string, RecencyOptions> = {
  // Sessions: Very recent is much more relevant
  session: {
    decay_function: 'exponential',
    half_life_days: 7,   // 50% relevance after 1 week
    min_decay: 0.1       // Never below 10%
  },

  // Code: Moderate decay, code can be relevant longer
  code: {
    decay_function: 'exponential',
    half_life_days: 30,  // 50% relevance after 1 month
    min_decay: 0.2
  },

  // Deployments: Recent deployments are critical
  deployment: {
    decay_function: 'exponential',
    half_life_days: 14,  // 50% after 2 weeks
    min_decay: 0.1
  },

  // Errors: Very recent errors are most relevant
  error: {
    decay_function: 'exponential',
    half_life_days: 3,   // 50% after 3 days
    min_decay: 0.05
  },

  // Learning: Stays relevant longer (concepts don't expire)
  learning: {
    decay_function: 'linear',
    half_life_days: 60,  // Linear decay over 2 months
    min_decay: 0.3       // Always at least 30% relevant
  },

  // Config: Moderate decay
  config: {
    decay_function: 'step',
    half_life_days: 30,  // Full relevance for 30 days
    min_decay: 0.5       // Then 50%
  },

  // System snapshots: Very time-sensitive
  system_snapshot: {
    decay_function: 'exponential',
    half_life_days: 1,   // 50% after 1 day
    min_decay: 0.01
  },

  // Metrics: Time-sensitive
  metric: {
    decay_function: 'exponential',
    half_life_days: 7,
    min_decay: 0.1
  },

  // Decision: Important but context-dependent
  decision: {
    decay_function: 'exponential',
    half_life_days: 21,  // 3 weeks
    min_decay: 0.15
  },

  // Architecture: Longer lasting
  architecture: {
    decay_function: 'exponential',
    half_life_days: 45,
    min_decay: 0.25
  },

  // Bug: Similar to error but slightly longer
  bug: {
    decay_function: 'exponential',
    half_life_days: 7,
    min_decay: 0.1
  },

  // Feature: Moderate relevance
  feature: {
    decay_function: 'exponential',
    half_life_days: 21,
    min_decay: 0.15
  },

  // Documentation: Longer lasting
  documentation: {
    decay_function: 'linear',
    half_life_days: 90,
    min_decay: 0.35
  },

  // Default for unknown types
  default: {
    decay_function: 'exponential',
    half_life_days: 14,
    min_decay: 0.2
  }
};

/**
 * Get recency configuration for a data type
 */
export function getRecencyConfig(dataType: string): RecencyOptions {
  return RECENCY_CONFIGS[dataType] || RECENCY_CONFIGS.default;
}

// ============================================
// BOOST CONFIGURATIONS
// ============================================

/**
 * Boost factors for contextual relevance.
 * Very recent documents get a temporary boost.
 */
const BOOST_CONFIGS: Record<string, BoostOptions> = {
  // Boost very recent sessions
  session: { boost_recent_days: 1, boost_multiplier: 1.5 },

  // Boost today's errors significantly
  error: { boost_recent_days: 1, boost_multiplier: 2.0 },

  // Boost recent deployments
  deployment: { boost_recent_days: 3, boost_multiplier: 1.3 },

  // Boost recent bugs
  bug: { boost_recent_days: 2, boost_multiplier: 1.4 },

  // Boost very recent system snapshots
  system_snapshot: { boost_recent_days: 0.5, boost_multiplier: 2.5 },

  // Boost recent metrics
  metric: { boost_recent_days: 1, boost_multiplier: 1.3 },
};

/**
 * Get boost configuration for a data type
 */
export function getBoostConfig(dataType: string): BoostOptions | null {
  return BOOST_CONFIGS[dataType] || null;
}

// ============================================
// RECENCY WEIGHT MULTIPLIERS
// ============================================

/**
 * Query-time recency weight override.
 * Allows users to control how much recency affects results.
 * 
 * - none: No recency weighting applied
 * - light: Subtle recency effect (half decay)
 * - normal: Standard decay configuration
 * - heavy: Increased decay effect (1.5x)
 * - critical: Very aggressive decay (2x) - only recent matters
 */
const RECENCY_WEIGHT_MULTIPLIERS: Record<RecencyWeight, number> = {
  none: 0,       // No recency weighting
  light: 0.5,    // Half the normal decay effect
  normal: 1.0,   // Standard decay
  heavy: 1.5,    // 1.5x decay effect
  critical: 2.0  // 2x decay effect (very time-sensitive)
};

/**
 * Get recency weight multiplier
 */
export function getRecencyWeightMultiplier(weight: RecencyWeight): number {
  return RECENCY_WEIGHT_MULTIPLIERS[weight] ?? 1.0;
}

// ============================================
// CORE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate decay factor for a document based on its age and type.
 */
export function calculateDecay(
  documentDate: Date,
  options: RecencyOptions
): number {
  const now = options.reference_date || new Date();
  const ageDays = (now.getTime() - documentDate.getTime()) / (1000 * 60 * 60 * 24);

  let decay: number;

  switch (options.decay_function) {
    case 'exponential':
      decay = exponentialDecay(ageDays, options.half_life_days);
      break;
    case 'linear':
      // For linear, max_days = half_life_days * 2
      decay = linearDecay(ageDays, options.half_life_days * 2);
      break;
    case 'gaussian':
      decay = gaussianDecay(ageDays, options.half_life_days);
      break;
    case 'step':
      decay = stepDecay(ageDays, options.half_life_days, 0.5);
      break;
    default:
      decay = 1.0;
  }

  // Apply minimum decay floor - documents never become fully irrelevant
  return Math.max(options.min_decay, decay);
}

/**
 * Calculate boost factor for very recent documents.
 */
export function calculateBoost(
  documentDate: Date,
  dataType: string,
  referenceDate?: Date
): number {
  const config = getBoostConfig(dataType);
  if (!config) return 1.0;

  const now = referenceDate || new Date();
  const ageDays = (now.getTime() - documentDate.getTime()) / (1000 * 60 * 60 * 24);

  return ageDays <= config.boost_recent_days ? config.boost_multiplier : 1.0;
}

/**
 * Adjust decay based on query-time recency weight.
 * 
 * For weight > 1: decay^weight (increases decay effect)
 * For weight < 1: decay^weight (decreases decay effect)
 * For weight = 0: returns 1.0 (no decay)
 */
export function adjustedDecay(baseDecay: number, weight: RecencyWeight): number {
  const multiplier = getRecencyWeightMultiplier(weight);
  if (multiplier === 0) return 1.0; // No decay

  // Increase/decrease decay effect: decay^multiplier
  return Math.pow(baseDecay, multiplier);
}

/**
 * Calculate complete recency weighting for a document.
 * Returns detailed breakdown for transparency.
 */
export function calculateRecencyWeighting(
  documentDate: Date,
  dataType: string,
  options: {
    apply_decay?: boolean;
    apply_boost?: boolean;
    recency_weight?: RecencyWeight;
    reference_date?: Date;
  } = {}
): RecencyResult {
  const {
    apply_decay = true,
    apply_boost = true,
    recency_weight = 'normal',
    reference_date
  } = options;

  const now = reference_date || new Date();
  const ageDays = (now.getTime() - documentDate.getTime()) / (1000 * 60 * 60 * 24);

  // Calculate base decay
  const recencyConfig = getRecencyConfig(dataType);
  let decay = apply_decay ? calculateDecay(documentDate, { ...recencyConfig, reference_date }) : 1.0;

  // Apply recency weight adjustment
  if (recency_weight !== 'normal' && apply_decay) {
    decay = adjustedDecay(decay, recency_weight);
  }

  // Calculate boost
  const boost = apply_boost ? calculateBoost(documentDate, dataType, reference_date) : 1.0;

  // Final multiplier
  const final_multiplier = decay * boost;

  return {
    decay,
    boost,
    final_multiplier,
    age_days: Math.max(0, ageDays),
    data_type: dataType,
    decay_function: recencyConfig.decay_function
  };
}

// ============================================
// TEMPORAL METADATA VALIDATION
// ============================================

/**
 * Validate that a document has proper temporal metadata for recency weighting.
 */
export function validateTemporalMetadata(metadata: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check timestamp
  if (typeof metadata.timestamp !== 'string') {
    errors.push('Missing or invalid timestamp field (must be ISO 8601 string)');
  } else if (isNaN(Date.parse(metadata.timestamp))) {
    errors.push(`Invalid timestamp format: ${metadata.timestamp}`);
  }

  // Check session_date
  if (typeof metadata.session_date !== 'string') {
    errors.push('Missing or invalid session_date field (must be YYYY-MM-DD string)');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.session_date)) {
    errors.push(`Invalid session_date format: ${metadata.session_date} (expected YYYY-MM-DD)`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract date from document metadata, with fallback options.
 */
export function extractDocumentDate(metadata: Record<string, unknown>): Date {
  // Try timestamp first (most precise)
  if (typeof metadata.timestamp === 'string') {
    const date = new Date(metadata.timestamp);
    if (!isNaN(date.getTime())) return date;
  }

  // Try session_date
  if (typeof metadata.session_date === 'string') {
    const date = new Date(metadata.session_date);
    if (!isNaN(date.getTime())) return date;
  }

  // Try indexed_at as last resort
  if (typeof metadata.indexed_at === 'string') {
    const date = new Date(metadata.indexed_at);
    if (!isNaN(date.getTime())) return date;
  }

  // Default to now (no decay) if no date found
  console.warn('No valid date found in metadata, defaulting to now (no decay)');
  return new Date();
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Apply recency weighting to a batch of search results.
 * Returns results sorted by final_score (semantic * recency).
 */
export interface PineconeResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface WeightedResult {
  id: string;
  semantic_score: number;       // Original Pinecone score
  recency_decay: number;        // Decay multiplier applied
  recency_boost: number;        // Boost multiplier applied
  final_score: number;          // semantic_score * decay * boost
  age_days: number;             // Document age in days
  decay_function: string;       // Which decay function was used
  metadata: Record<string, unknown>;
}

export function applyRecencyWeighting(
  results: PineconeResult[],
  options: {
    apply_decay?: boolean;
    apply_boost?: boolean;
    recency_weight?: RecencyWeight;
    reference_date?: Date;
  } = {}
): WeightedResult[] {
  const { apply_decay = true, apply_boost = true, recency_weight = 'normal' } = options;

  const weighted = results.map(result => {
    const docDate = extractDocumentDate(result.metadata);
    const dataType = (result.metadata.data_type as string) || 'default';

    // Calculate recency weighting
    const recency = calculateRecencyWeighting(docDate, dataType, {
      apply_decay,
      apply_boost,
      recency_weight,
      reference_date: options.reference_date
    });

    // Final score
    const finalScore = result.score * recency.final_multiplier;

    return {
      id: result.id,
      semantic_score: result.score,
      recency_decay: recency.decay,
      recency_boost: recency.boost,
      final_score: finalScore,
      age_days: recency.age_days,
      decay_function: recency.decay_function,
      metadata: result.metadata
    };
  });

  // Sort by final score (highest first)
  return weighted.sort((a, b) => b.final_score - a.final_score);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all configured data types for documentation/debugging.
 */
export function getConfiguredDataTypes(): string[] {
  return Object.keys(RECENCY_CONFIGS).filter(k => k !== 'default');
}

/**
 * Generate decay curve data for visualization.
 * Returns decay values for 0 to maxDays.
 */
export function generateDecayCurve(
  dataType: string,
  maxDays: number = 90,
  stepDays: number = 1
): Array<{ day: number; decay: number }> {
  const config = getRecencyConfig(dataType);
  const now = new Date();
  const curve: Array<{ day: number; decay: number }> = [];

  for (let day = 0; day <= maxDays; day += stepDays) {
    const docDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    const decay = calculateDecay(docDate, { ...config, reference_date: now });
    curve.push({ day, decay });
  }

  return curve;
}

/**
 * Get human-readable description of decay behavior for a data type.
 */
export function describeDecayBehavior(dataType: string): string {
  const config = getRecencyConfig(dataType);
  const boostConfig = getBoostConfig(dataType);

  let description = `Data type "${dataType}": `;
  description += `${config.decay_function} decay with ${config.half_life_days}-day half-life, `;
  description += `minimum ${(config.min_decay * 100).toFixed(0)}% relevance.`;

  if (boostConfig) {
    description += ` Boost: ${boostConfig.boost_multiplier}x for first ${boostConfig.boost_recent_days} day(s).`;
  }

  return description;
}







