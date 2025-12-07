/**
 * Intent Detection Service
 *
 * Analyzes user queries to infer intent type and extract filters.
 * Helps the retrieval system understand WHAT the user is looking for
 * and apply appropriate filters automatically.
 *
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export type IntentType = 'factual' | 'procedural' | 'debugging' | 'history' | 'comparison' | 'exploration';

export interface TimeRange {
  start: string;  // ISO timestamp
  end: string;    // ISO timestamp
  description: string;  // Human-readable, e.g., "yesterday", "last week"
}

export interface InferredFilters {
  data_type?: string[];
  source?: string[];
  status?: string[];
  importance?: string[];
  domain?: string[];
  time_range?: TimeRange;
}

export interface QueryIntent {
  intent_type: IntentType;
  inferred_filters: InferredFilters;
  confidence: number;
  reasoning: string;
}

interface PatternMatch {
  pattern: RegExp;
  intent_type?: IntentType;
  data_type_hint?: string[];
  status_hint?: string[];
  importance_hint?: string[];
  time_hint?: 'today' | 'yesterday' | 'week' | 'month' | 'recent';
  confidence: number;
}

// ============================================
// INTENT PATTERNS
// ============================================

const INTENT_PATTERNS: PatternMatch[] = [
  // Question patterns - factual intent
  {
    pattern: /^(what|which)\b.*\?$/i,
    intent_type: 'factual',
    confidence: 0.8,
  },
  {
    pattern: /^where\b.*\?$/i,
    intent_type: 'factual',
    confidence: 0.85,
  },
  {
    pattern: /^who\b/i,
    intent_type: 'factual',
    confidence: 0.7,
  },

  // Procedural - how to do something
  {
    pattern: /^how (do|did|can|could|should|would|to)\b/i,
    intent_type: 'procedural',
    data_type_hint: ['session', 'learning', 'code'],
    confidence: 0.9,
  },
  {
    pattern: /\b(implement|create|build|make|set up|setup|configure)\b/i,
    intent_type: 'procedural',
    data_type_hint: ['session', 'code', 'config'],
    confidence: 0.8,
  },
  {
    pattern: /\b(step[s]?|instruction|guide|tutorial|walkthrough)\b/i,
    intent_type: 'procedural',
    confidence: 0.75,
  },

  // Debugging - error-related queries
  {
    pattern: /\b(error|bug|issue|problem|fail(ed|ing|ure)?|broke|broken|crash(ed|ing)?)\b/i,
    intent_type: 'debugging',
    data_type_hint: ['error', 'session'],
    status_hint: ['error', 'failed'],
    confidence: 0.9,
  },
  {
    pattern: /\b(fix|debug|troubleshoot|diagnose|solve|resolve)\b/i,
    intent_type: 'debugging',
    data_type_hint: ['error', 'session'],
    confidence: 0.85,
  },
  {
    pattern: /\b(not working|doesn't work|won't work|stopped working)\b/i,
    intent_type: 'debugging',
    data_type_hint: ['error', 'session'],
    status_hint: ['error', 'failed'],
    confidence: 0.9,
  },
  {
    pattern: /\b(exception|stack\s*trace|traceback)\b/i,
    intent_type: 'debugging',
    data_type_hint: ['error'],
    confidence: 0.95,
  },

  // History - what happened in the past
  {
    pattern: /\b(history|timeline|chronolog|sequence of events)\b/i,
    intent_type: 'history',
    data_type_hint: ['session', 'deployment'],
    confidence: 0.85,
  },
  {
    pattern: /^when (did|was|were)\b/i,
    intent_type: 'history',
    confidence: 0.8,
  },
  {
    pattern: /\b(last|previous|earlier|before)\b.*\b(deploy|release|change|update)\b/i,
    intent_type: 'history',
    data_type_hint: ['deployment', 'session'],
    confidence: 0.85,
  },

  // Comparison queries
  {
    pattern: /\b(vs|versus|compared? to|difference between|differ(ent|ence)?)\b/i,
    intent_type: 'comparison',
    confidence: 0.9,
  },
  {
    pattern: /\b(better|worse|alternative|instead of|rather than)\b/i,
    intent_type: 'comparison',
    confidence: 0.7,
  },

  // Deployment-specific
  {
    pattern: /\b(deploy(ed|ment|ing)?|release|production|staging|build)\b/i,
    data_type_hint: ['deployment'],
    confidence: 0.85,
  },

  // Code-specific
  {
    pattern: /\b(function|class|component|hook|service|module)\b\s+\w+/i,
    data_type_hint: ['code', 'session'],
    confidence: 0.8,
  },
  {
    pattern: /\.(ts|tsx|js|jsx|sql|css|json)(\s|$)/i,
    data_type_hint: ['code'],
    confidence: 0.9,
  },

  // Config-specific
  {
    pattern: /\b(config|configuration|setting|environment|env var)\b/i,
    data_type_hint: ['config'],
    confidence: 0.85,
  },

  // Learning/knowledge queries
  {
    pattern: /\b(learn(ed|ing)?|understand|concept|explain|documentation)\b/i,
    data_type_hint: ['learning', 'session'],
    confidence: 0.75,
  },

  // Time-based patterns
  {
    pattern: /\btoday\b/i,
    time_hint: 'today',
    confidence: 0.95,
  },
  {
    pattern: /\byesterday\b/i,
    time_hint: 'yesterday',
    confidence: 0.95,
  },
  {
    pattern: /\blast\s+week\b/i,
    time_hint: 'week',
    confidence: 0.9,
  },
  {
    pattern: /\bthis\s+week\b/i,
    time_hint: 'week',
    confidence: 0.85,
  },
  {
    pattern: /\blast\s+month\b/i,
    time_hint: 'month',
    confidence: 0.9,
  },
  {
    pattern: /\b(recent(ly)?|latest|newest)\b/i,
    time_hint: 'recent',
    confidence: 0.8,
  },

  // Importance patterns
  {
    pattern: /\b(important|critical|crucial|essential|key|major)\b/i,
    importance_hint: ['high', 'critical'],
    confidence: 0.75,
  },
  {
    pattern: /\b(minor|small|trivial|quick)\b/i,
    importance_hint: ['low'],
    confidence: 0.7,
  },
];

// ============================================
// TIME RANGE INFERENCE
// ============================================

/**
 * Get start of day in ISO format
 */
function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Get end of day in ISO format
 */
function endOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Subtract days from a date
 */
function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Subtract months from a date
 */
function subMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

/**
 * Infer time range from query text
 */
export function inferTimeRange(query: string): TimeRange | undefined {
  const now = new Date();
  const lowerQuery = query.toLowerCase();

  // Today
  if (/\btoday\b/.test(lowerQuery)) {
    return {
      start: startOfDay(now),
      end: now.toISOString(),
      description: 'today',
    };
  }

  // Yesterday
  if (/\byesterday\b/.test(lowerQuery)) {
    const yesterday = subDays(now, 1);
    return {
      start: startOfDay(yesterday),
      end: endOfDay(yesterday),
      description: 'yesterday',
    };
  }

  // Last week / this week
  if (/\b(last|this)\s+week\b/.test(lowerQuery)) {
    return {
      start: subDays(now, 7).toISOString(),
      end: now.toISOString(),
      description: 'last 7 days',
    };
  }

  // Last month
  if (/\blast\s+month\b/.test(lowerQuery)) {
    return {
      start: subMonths(now, 1).toISOString(),
      end: now.toISOString(),
      description: 'last month',
    };
  }

  // Recent / recently / latest
  if (/\b(recent(ly)?|latest|newest)\b/.test(lowerQuery)) {
    return {
      start: subDays(now, 3).toISOString(),
      end: now.toISOString(),
      description: 'last 3 days',
    };
  }

  // "X days ago" pattern
  const daysAgoMatch = lowerQuery.match(/(\d+)\s+days?\s+ago/);
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1], 10);
    const targetDate = subDays(now, daysAgo);
    return {
      start: startOfDay(targetDate),
      end: endOfDay(targetDate),
      description: `${daysAgo} days ago`,
    };
  }

  return undefined;
}

// ============================================
// MAIN DETECTION
// ============================================

/**
 * Detect query intent and infer appropriate filters.
 *
 * @param query - The user's query string
 * @returns QueryIntent with intent type, filters, and confidence
 */
export function detectIntent(query: string): QueryIntent {
  const matches: Array<{
    pattern: PatternMatch;
    match: RegExpMatchArray;
  }> = [];

  // Apply all patterns
  for (const pattern of INTENT_PATTERNS) {
    const match = query.match(pattern.pattern);
    if (match) {
      matches.push({ pattern, match });
    }
  }

  // Default values
  let intentType: IntentType = 'exploration';
  let confidence = 0.5;
  const dataTypes = new Set<string>();
  const statuses = new Set<string>();
  const importances = new Set<string>();
  const reasoningParts: string[] = [];

  // Process matches
  for (const { pattern } of matches) {
    // Intent type - take highest confidence one
    if (pattern.intent_type && pattern.confidence > confidence) {
      intentType = pattern.intent_type;
      confidence = pattern.confidence;
      reasoningParts.push(`Detected ${intentType} intent from pattern`);
    }

    // Accumulate hints
    if (pattern.data_type_hint) {
      for (const dt of pattern.data_type_hint) {
        dataTypes.add(dt);
      }
    }
    if (pattern.status_hint) {
      for (const s of pattern.status_hint) {
        statuses.add(s);
      }
    }
    if (pattern.importance_hint) {
      for (const i of pattern.importance_hint) {
        importances.add(i);
      }
    }
  }

  // Build filters
  const inferred_filters: InferredFilters = {};

  if (dataTypes.size > 0) {
    inferred_filters.data_type = [...dataTypes];
    reasoningParts.push(`Inferred data types: ${[...dataTypes].join(', ')}`);
  }

  if (statuses.size > 0) {
    inferred_filters.status = [...statuses];
    reasoningParts.push(`Inferred statuses: ${[...statuses].join(', ')}`);
  }

  if (importances.size > 0) {
    inferred_filters.importance = [...importances];
    reasoningParts.push(`Inferred importance: ${[...importances].join(', ')}`);
  }

  // Time range
  const timeRange = inferTimeRange(query);
  if (timeRange) {
    inferred_filters.time_range = timeRange;
    reasoningParts.push(`Inferred time range: ${timeRange.description}`);
  }

  // Adjust confidence based on number of matches
  if (matches.length > 2) {
    confidence = Math.min(0.95, confidence + 0.1);
  }

  const reasoning =
    reasoningParts.length > 0
      ? reasoningParts.join('. ')
      : 'No specific patterns matched, using exploration intent';

  return {
    intent_type: intentType,
    inferred_filters,
    confidence,
    reasoning,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if query is likely looking for an error
 */
export function isErrorQuery(query: string): boolean {
  return /\b(error|bug|issue|problem|fail|crash|exception|broke|broken)\b/i.test(query);
}

/**
 * Check if query is asking "how to" do something
 */
export function isProceduralQuery(query: string): boolean {
  return /^how (do|did|can|could|should|would|to)\b/i.test(query) ||
    /\b(implement|create|build|set up|configure)\b/i.test(query);
}

/**
 * Check if query is time-bounded
 */
export function hasTimeConstraint(query: string): boolean {
  return inferTimeRange(query) !== undefined;
}

/**
 * Get suggested alpha value for hybrid search based on intent
 * (Lower alpha = more keyword-based, higher alpha = more semantic)
 */
export function getAlphaForIntent(intent: QueryIntent): number {
  // Debugging queries benefit from keyword matching (error codes, stack traces)
  if (intent.intent_type === 'debugging') {
    return 0.4;
  }

  // Procedural queries benefit from semantic understanding
  if (intent.intent_type === 'procedural') {
    return 0.7;
  }

  // Factual queries - balanced
  if (intent.intent_type === 'factual') {
    return 0.6;
  }

  // History queries - slightly more keyword for exact event matching
  if (intent.intent_type === 'history') {
    return 0.5;
  }

  // Comparison - semantic to understand context
  if (intent.intent_type === 'comparison') {
    return 0.7;
  }

  // Default: balanced
  return 0.55;
}

/**
 * Combine intent-inferred filters with explicit user filters.
 * User filters take precedence.
 */
export function mergeFilters(
  intentFilters: InferredFilters,
  userFilters?: InferredFilters
): InferredFilters {
  if (!userFilters) {
    return intentFilters;
  }

  return {
    data_type: userFilters.data_type ?? intentFilters.data_type,
    source: userFilters.source ?? intentFilters.source,
    status: userFilters.status ?? intentFilters.status,
    importance: userFilters.importance ?? intentFilters.importance,
    domain: userFilters.domain ?? intentFilters.domain,
    time_range: userFilters.time_range ?? intentFilters.time_range,
  };
}







