/**
 * Query Expansion Service
 *
 * Enriches user queries with synonyms and related terms to improve
 * retrieval recall. Supports both rule-based (fast) and LLM-based
 * (intelligent) expansion.
 *
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export interface ExpandedQuery {
  original: string;
  expanded: string;
  synonyms: string[];
  related_terms: string[];
  detected_entities: string[];
  expansion_method: 'rule_based' | 'llm' | 'hybrid';
}

export interface ExpansionOptions {
  useLLM?: boolean;
  maxExpansionTerms?: number;
  anthropicApiKey?: string;
}

// ============================================
// EXPANSION DICTIONARY
// ============================================

/**
 * Comprehensive expansion dictionary for development terms.
 * Key: trigger word (lowercase)
 * Value: array of related terms to add
 *
 * Categories:
 * - Authentication & Authorization (7 terms)
 * - Database & SQL (12 terms)
 * - Frontend & React (10 terms)
 * - Backend & API (5 terms)
 * - DevOps & Deployment (8 terms)
 * - Debugging & Errors (7 terms)
 * - Testing (5 terms)
 * - PrayerMap Domain - Core (10 terms)
 * - PrayerMap Domain - Spiritual (8 terms)
 * - PrayerMap Domain - Map/Geo (12 terms)
 * - PrayerMap Domain - Design (10 terms)
 * - Memory System (6 terms)
 * - Tools & Services (8 terms)
 * - Mobile & Platform (8 terms)
 * - Real-time (6 terms)
 * - Config & Settings (3 terms)
 * - Performance (5 terms)
 * - Security (4 terms)
 *
 * TOTAL: 152 terms (including Additional terms from Iteration 2)
 */
export const EXPANSION_DICTIONARY: Record<string, string[]> = {
  // ============================================
  // AUTHENTICATION & AUTHORIZATION (7 terms)
  // ============================================
  auth: [
    'authentication',
    'authorization',
    'login',
    'logout',
    'session',
    'JWT',
    'token',
    'OAuth',
    'SSO',
  ],
  login: ['authentication', 'sign in', 'signin', 'auth', 'session'],
  logout: ['sign out', 'signout', 'session', 'auth'],
  jwt: ['JSON Web Token', 'token', 'authentication', 'bearer'],
  oauth: ['authentication', 'SSO', 'provider', 'social login', 'Apple Sign-In'],
  session: ['authentication', 'cookie', 'token', 'user state'],
  mfa: ['multi-factor', 'two-factor', '2FA', 'authentication', 'security'],

  // ============================================
  // DATABASE & SQL (12 terms)
  // ============================================
  db: ['database', 'postgres', 'postgresql', 'supabase', 'sql', 'query', 'table'],
  database: ['postgres', 'sql', 'table', 'schema', 'migration'],
  rls: ['row level security', 'RLS', 'policy', 'policies', 'permission', 'access control'],
  policy: ['RLS', 'row level security', 'permission', 'access'],
  migration: ['schema', 'database', 'alter', 'create table', 'sql', 'DDL'],
  sql: ['query', 'postgres', 'database', 'select', 'insert', 'update'],
  table: ['schema', 'database', 'columns', 'rows', 'records'],
  schema: ['database', 'table', 'migration', 'DDL'],
  query: ['sql', 'select', 'database', 'fetch'],
  postgres: ['postgresql', 'database', 'sql', 'supabase'],
  postgis: ['geography', 'geometry', 'spatial', 'coordinates', 'ST_Distance', 'geospatial'],
  spatial: ['PostGIS', 'geography', 'geometry', 'coordinates', 'distance'],

  // ============================================
  // FRONTEND & REACT (10 terms)
  // ============================================
  ui: ['user interface', 'component', 'frontend', 'react', 'tsx', 'design', 'layout'],
  component: ['react', 'tsx', 'ui', 'frontend', 'render', 'props'],
  frontend: ['react', 'ui', 'component', 'client', 'browser'],
  react: ['component', 'hook', 'state', 'props', 'tsx', 'jsx'],
  hook: ['useEffect', 'useState', 'custom hook', 'react'],
  state: ['useState', 'store', 'zustand', 'react query', 'TanStack'],
  modal: ['dialog', 'popup', 'overlay', 'component', 'AnimatePresence'],
  animation: ['framer motion', 'transition', 'motion', 'animate', 'spring'],
  tailwind: ['css', 'utility classes', 'styling', 'className', 'responsive'],
  tanstack: ['react query', 'TanStack Query', 'useQuery', 'cache', 'data fetching'],

  // ============================================
  // BACKEND & API (5 terms)
  // ============================================
  api: ['endpoint', 'REST', 'route', 'handler', 'function', 'edge function'],
  endpoint: ['api', 'route', 'handler', 'REST'],
  edge: ['edge function', 'serverless', 'supabase function', 'deno'],
  function: ['edge function', 'serverless', 'handler', 'supabase'],
  serverless: ['edge function', 'lambda', 'function'],

  // ============================================
  // DEVOPS & DEPLOYMENT (8 terms)
  // ============================================
  deploy: ['deployment', 'vercel', 'production', 'build', 'release', 'ci/cd'],
  deployment: ['deploy', 'release', 'production', 'vercel', 'hosting'],
  build: ['compile', 'bundle', 'vite', 'typescript', 'tsc', 'production'],
  vercel: ['deployment', 'hosting', 'serverless', 'edge', 'production'],
  ci: ['continuous integration', 'github actions', 'pipeline', 'build'],
  cd: ['continuous deployment', 'release', 'pipeline', 'deploy'],
  production: ['prod', 'live', 'deployment', 'release'],
  staging: ['preview', 'test environment', 'pre-production'],

  // ============================================
  // DEBUGGING & ERRORS (7 terms)
  // ============================================
  error: ['exception', 'bug', 'issue', 'fail', 'crash', 'problem', 'stack trace'],
  bug: ['error', 'issue', 'fix', 'debug', 'problem', 'defect'],
  debug: ['troubleshoot', 'fix', 'investigate', 'log', 'console', 'breakpoint'],
  fix: ['bug', 'patch', 'resolve', 'repair', 'solution'],
  crash: ['error', 'exception', 'fail', 'bug'],
  issue: ['bug', 'problem', 'error', 'ticket'],
  log: ['console', 'debug', 'trace', 'print', 'datadog', 'observability'],

  // ============================================
  // TESTING (5 terms)
  // ============================================
  test: ['testing', 'unit test', 'integration', 'jest', 'vitest', 'spec'],
  testing: ['test', 'unit', 'integration', 'e2e', 'spec'],
  unit: ['test', 'jest', 'vitest', 'spec', 'assertion'],
  integration: ['test', 'e2e', 'end to end'],
  e2e: ['end to end', 'integration', 'playwright', 'cypress'],

  // ============================================
  // PRAYERMAP DOMAIN - CORE (10 terms)
  // ============================================
  prayer: ['request', 'petition', 'intercession', 'plea', 'supplication', 'respond'],
  request: ['prayer', 'petition', 'ask', 'need', 'submission'],
  response: ['prayer response', 'reply', 'answer', 'support', 'intercession'],
  message: ['conversation', 'thread', 'chat', 'communication'],
  messaging: ['conversation', 'thread', 'message', 'chat', 'communication'],
  conversation: ['thread', 'message', 'chat', 'discussion', 'inbox'],
  inbox: ['messages', 'conversations', 'notifications', 'responses'],
  notification: ['alert', 'push', 'inbox', 'update', 'realtime'],
  responder: ['prayer partner', 'supporter', 'intercessor', 'helper'],
  requester: ['prayer author', 'poster', 'user', 'person in need'],

  // ============================================
  // PRAYERMAP DOMAIN - SPIRITUAL (8 terms)
  // ============================================
  memorial: ['remembrance', 'tribute', 'connection', 'line', 'answered', 'eternal'],
  answered: ['resolved', 'completed', 'fulfilled', 'received', 'memorial'],
  blessing: ['benediction', 'grace', 'favor', 'gift', 'support'],
  intercession: ['prayer', 'petition', 'standing in the gap', 'support'],
  support: ['encourage', 'uplift', 'stand with', 'agree in prayer', 'respond'],
  community: ['congregation', 'group', 'believers', 'fellowship', 'users'],
  anonymous: ['private', 'hidden', 'unnamed', 'incognito', 'anonymous mode'],
  witness: ['see', 'observe', 'watch', 'live', 'realtime', 'living map'],

  // ============================================
  // PRAYERMAP DOMAIN - MAP/GEO (12 terms)
  // ============================================
  map: ['mapbox', 'location', 'marker', 'geolocation', 'coordinates', 'living map'],
  marker: ['pin', 'point', 'icon', 'dot', 'location', 'mapbox marker'],
  location: ['coordinates', 'geolocation', 'lat', 'lng', 'position', 'place'],
  cluster: ['grouping', 'aggregation', 'clustered markers', 'supercluster'],
  viewport: ['bounds', 'visible area', 'map extent', 'zoom level'],
  nearby: ['close', 'local', 'around', 'within radius', 'near me', 'proximity'],
  radius: ['distance', 'range', 'within', 'nearby', 'miles', 'kilometers'],
  coordinates: ['lat', 'lng', 'latitude', 'longitude', 'position', 'geolocation'],
  geolocation: ['GPS', 'location', 'coordinates', 'position', 'navigator'],
  layer: ['map layer', 'source', 'style', 'tiles', 'overlay'],
  zoom: ['scale', 'level', 'viewport', 'map zoom', 'fly to'],
  fly: ['flyTo', 'animate', 'pan', 'zoom', 'map transition'],

  // ============================================
  // PRAYERMAP DOMAIN - DESIGN (10 terms)
  // ============================================
  glassmorphism: ['glass', 'blur', 'transparency', 'frosted', 'backdrop'],
  glass: ['glassmorphism', 'blur', 'transparent', 'frosted', 'overlay'],
  ethereal: ['soft', 'dreamy', 'light', 'spiritual', 'divine', 'design'],
  blur: ['backdrop-blur', 'glassmorphism', 'frosted', 'effect'],
  framer: ['framer motion', 'animation', 'motion', 'transition', 'spring'],
  motion: ['framer motion', 'animation', 'animate', 'transition', 'spring'],
  spring: ['animation', 'bounce', 'damping', 'stiffness', 'physics'],
  transition: ['animation', 'fade', 'slide', 'motion', 'duration'],
  gradient: ['color', 'background', 'linear', 'radial', 'design'],
  theme: ['dark mode', 'light mode', 'colors', 'design system', 'styling'],

  // ============================================
  // MEMORY SYSTEM (6 terms)
  // ============================================
  memory: ['pinecone', 'rag', 'vector', 'embedding', 'retrieval', 'knowledge'],
  rag: ['retrieval augmented generation', 'memory', 'vector', 'semantic search'],
  vector: ['embedding', 'pinecone', 'semantic', 'similarity'],
  embedding: ['vector', 'openai', 'semantic', 'dense'],
  retrieval: ['search', 'query', 'fetch', 'rag'],
  pinecone: ['vector', 'embedding', 'semantic search', 'rag', 'index'],

  // ============================================
  // TOOLS & SERVICES (8 terms)
  // ============================================
  claude: ['anthropic', 'ai', 'llm', 'assistant', 'claude-3'],
  anthropic: ['claude', 'ai', 'llm'],
  openai: ['gpt', 'embedding', 'ai', 'llm'],
  supabase: ['database', 'postgres', 'auth', 'storage', 'edge function', 'realtime'],
  mapbox: ['map', 'tiles', 'geolocation', 'markers', 'gl js'],
  github: ['git', 'repository', 'commit', 'pr', 'pull request'],
  datadog: ['monitoring', 'logs', 'observability', 'metrics', 'tracing'],
  cohere: ['rerank', 'reranking', 'retrieval', 'semantic', 'nlp'],

  // ============================================
  // MOBILE & PLATFORM (8 terms)
  // ============================================
  capacitor: ['native', 'ios', 'android', 'mobile', 'app', 'hybrid'],
  ios: ['iPhone', 'iPad', 'Apple', 'Swift', 'mobile', 'capacitor'],
  android: ['mobile', 'Google', 'Kotlin', 'app', 'capacitor'],
  mobile: ['ios', 'android', 'capacitor', 'responsive', 'touch'],
  native: ['capacitor', 'ios', 'android', 'platform', 'device'],
  pwa: ['progressive web app', 'installable', 'offline', 'service worker'],
  responsive: ['mobile', 'breakpoint', 'adaptive', 'viewport', 'media query'],
  touch: ['tap', 'swipe', 'gesture', 'mobile', 'interaction'],

  // ============================================
  // REAL-TIME (6 terms)
  // ============================================
  realtime: ['websocket', 'subscription', 'live', 'sync', 'push', 'supabase realtime'],
  websocket: ['realtime', 'socket', 'connection', 'live', 'push'],
  subscription: ['realtime', 'subscribe', 'listen', 'channel', 'broadcast'],
  live: ['realtime', 'live updates', 'sync', 'witness', 'living map'],
  sync: ['synchronize', 'realtime', 'update', 'refresh'],
  presence: ['online', 'status', 'active', 'channel', 'realtime'],

  // ============================================
  // CONFIG & SETTINGS (3 terms)
  // ============================================
  config: ['configuration', 'settings', 'environment', 'env', 'options'],
  env: ['environment', 'variable', 'config', '.env'],
  settings: ['config', 'preferences', 'options'],

  // ============================================
  // PERFORMANCE (5 terms)
  // ============================================
  performance: ['speed', 'optimization', 'latency', 'cache', 'slow'],
  cache: ['caching', 'redis', 'memory', 'performance', 'stale'],
  optimization: ['performance', 'speed', 'efficient'],
  slow: ['performance', 'latency', 'optimization', 'bottleneck'],
  latency: ['delay', 'response time', 'performance', 'slow'],

  // ============================================
  // SECURITY (4 terms)
  // ============================================
  security: ['vulnerability', 'auth', 'rls', 'permission', 'access'],
  vulnerability: ['security', 'exploit', 'risk', 'CVE'],
  permission: ['access', 'rls', 'policy', 'authorization'],
  access: ['permission', 'authorization', 'rls', 'control'],

  // ============================================
  // ADDITIONAL TERMS (12 terms) - Added in Iteration 2
  // ============================================
  rerank: ['cohere', 'relevance', 'score', 'ranking', 'retrieval'],
  chunk: ['chunking', 'segment', 'split', 'window', 'overlap'],
  ingest: ['ingestion', 'import', 'process', 'pipeline', 'upload'],
  sparse: ['bm25', 'keyword', 'lexical', 'sparse embedding'],
  dense: ['semantic', 'vector', 'embedding', 'dense vector'],
  alpha: ['hybrid', 'balance', 'weight', 'semantic ratio'],
  decay: ['recency', 'time decay', 'age', 'freshness'],
  boost: ['weight', 'priority', 'importance', 'score boost'],
  evaluation: ['eval', 'metrics', 'MRR', 'precision', 'recall'],
  pipeline: ['flow', 'process', 'stages', 'steps', 'workflow'],
  fallback: ['backup', 'failover', 'alternative', 'default'],
  timeout: ['delay', 'latency', 'slow', 'hang', 'freeze'],
};

// ============================================
// EXPANSION LIMITS
// ============================================

/**
 * Maximum number of expansion terms to add to a query.
 * Prevents over-expansion which can hurt precision.
 */
export const MAX_EXPANSION_TERMS = 15;

/**
 * Maximum synonyms per term to include.
 * First N synonyms from each matching term's array.
 */
export const MAX_SYNONYMS_PER_TERM = 3;

// ============================================
// INTENT-BASED EXPANSION TERMS
// ============================================

/**
 * Additional terms to inject based on detected query intent.
 * These supplement the dictionary expansion with intent-specific context.
 */
export const INTENT_EXPANSION_TERMS: Record<string, string[]> = {
  debugging: ['error', 'bug', 'issue', 'fix', 'crash', 'exception', 'stack trace', 'log'],
  procedural: ['how to', 'implement', 'create', 'build', 'setup', 'configure', 'steps', 'guide'],
  history: ['when', 'changed', 'updated', 'modified', 'added', 'removed', 'previous', 'last'],
  factual: ['what', 'which', 'where', 'definition', 'explanation'],
  comparison: ['vs', 'versus', 'difference', 'compare', 'better', 'alternative'],
  exploration: ['overview', 'about', 'general', 'introduction'],
};

/**
 * Queries matching these patterns should NOT be heavily expanded
 * (they're looking for specific things, expansion would add noise)
 */
export const PRECISE_QUERY_PATTERNS = [
  /^[a-zA-Z_]+\.ts$/i, // Exact filename (e.g., "messageService.ts")
  /line \d+/i, // Line number reference
  /error code \d+/i, // Specific error code
  /^[a-z_]+_[a-z_]+$/i, // Table names like "prayer_responses"
  /^[A-Z][a-zA-Z]+\.[a-zA-Z]+\(\)$/, // Method calls like "Service.method()"
  /^v\d+\.\d+/i, // Version numbers
  /sha[:\s]+[a-f0-9]{7,}/i, // Git SHAs
];

// ============================================
// RULE-BASED EXPANSION
// ============================================

/**
 * Extract individual words from a query for expansion lookup
 */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

/**
 * Check if a query is "precise" and should not be heavily expanded.
 * Precise queries are looking for specific things (file names, line numbers, etc.)
 */
export function isPreciseQuery(query: string): boolean {
  return PRECISE_QUERY_PATTERNS.some((pattern) => pattern.test(query));
}

/**
 * Detect intent from query text (simple pattern-based detection)
 * Used for intent-based expansion. For full intent detection, use intent-detection.ts
 */
function detectSimpleIntent(
  query: string
): 'debugging' | 'procedural' | 'history' | 'factual' | 'comparison' | 'exploration' {
  const lowerQuery = query.toLowerCase();

  // Debugging patterns
  if (/\b(error|bug|issue|crash|fail|exception|broken|not working)\b/i.test(query)) {
    return 'debugging';
  }

  // Procedural patterns
  if (/^how (do|did|can|to|should)\b/i.test(query) || /\b(implement|create|build|setup)\b/i.test(query)) {
    return 'procedural';
  }

  // History patterns
  if (/^when (did|was|were)\b/i.test(query) || /\b(last|previous|changed|history)\b/i.test(lowerQuery)) {
    return 'history';
  }

  // Comparison patterns
  if (/\b(vs|versus|compared? to|difference between|better than)\b/i.test(query)) {
    return 'comparison';
  }

  // Factual patterns
  if (/^(what|which|where)\b.*\?$/i.test(query)) {
    return 'factual';
  }

  return 'exploration';
}

/**
 * Get intent-based expansion terms
 */
export function getIntentExpansionTerms(intent: string): string[] {
  return INTENT_EXPANSION_TERMS[intent] || [];
}

/**
 * Apply rule-based expansion using the dictionary
 *
 * @param query - The original query
 * @param options.includeIntentExpansion - Include intent-based terms (default: true)
 * @param options.respectPreciseQueries - Limit expansion for precise queries (default: true)
 */
export function applyRuleBasedExpansion(
  query: string,
  options: { includeIntentExpansion?: boolean; respectPreciseQueries?: boolean } = {}
): ExpandedQuery {
  const { includeIntentExpansion = true, respectPreciseQueries = true } = options;

  // Check if this is a precise query that shouldn't be heavily expanded
  const isPrecise = respectPreciseQueries && isPreciseQuery(query);

  // Adjust limits for precise queries
  const maxTerms = isPrecise ? 5 : MAX_EXPANSION_TERMS;
  const maxSynonyms = isPrecise ? 1 : MAX_SYNONYMS_PER_TERM;

  const tokens = tokenize(query);
  const synonyms = new Set<string>();
  const relatedTerms = new Set<string>();
  const detectedEntities = new Set<string>();

  for (const token of tokens) {
    const expansions = EXPANSION_DICTIONARY[token];
    if (expansions) {
      // Add synonyms (limited by MAX_SYNONYMS_PER_TERM or reduced for precise queries)
      const synonymCount = Math.min(expansions.length, maxSynonyms);
      for (let i = 0; i < synonymCount; i++) {
        synonyms.add(expansions[i]);
      }
      // Rest are related terms (skip for precise queries)
      if (!isPrecise) {
        for (let i = synonymCount; i < expansions.length; i++) {
          relatedTerms.add(expansions[i]);
        }
      }
      // The original token is an entity we recognized
      detectedEntities.add(token);
    }
  }

  // Also check for multi-word patterns (e.g., "living map", "row level security")
  const lowerQuery = query.toLowerCase();
  for (const [key, expansions] of Object.entries(EXPANSION_DICTIONARY)) {
    if (key.includes(' ') && lowerQuery.includes(key)) {
      for (const term of expansions) {
        relatedTerms.add(term);
      }
      detectedEntities.add(key);
    }
  }

  // Add intent-based expansion terms (skip for precise queries)
  if (includeIntentExpansion && !isPrecise) {
    const intent = detectSimpleIntent(query);
    const intentTerms = getIntentExpansionTerms(intent);

    // Add intent terms as related terms (max 3)
    for (const term of intentTerms.slice(0, 3)) {
      // Only add if not already in synonyms
      if (!synonyms.has(term)) {
        relatedTerms.add(term);
      }
    }
  }

  // Build expanded query string (limited by maxTerms)
  const expansionTerms = [...synonyms, ...relatedTerms].slice(0, maxTerms);
  const expanded = expansionTerms.length > 0 ? `${query} ${expansionTerms.join(' ')}` : query;

  return {
    original: query,
    expanded,
    synonyms: [...synonyms],
    related_terms: [...relatedTerms],
    detected_entities: [...detectedEntities],
    expansion_method: 'rule_based',
  };
}

// ============================================
// LLM-BASED EXPANSION
// ============================================

/**
 * Determine if LLM expansion should be used based on query complexity
 */
export function shouldUseLLM(query: string): boolean {
  // Use LLM for complex queries that rule-based might miss
  const indicators = [
    // Questions
    /\b(how|what|why|when|where|which)\b.*\?$/i.test(query),
    // Multi-part queries
    /\b(and|also|plus|as well as)\b/i.test(query),
    // Long queries (likely complex)
    query.split(/\s+/).length > 10,
    // Negative queries
    /\b(not|without|except|excluding)\b/i.test(query),
    // Comparison queries
    /\b(vs|versus|compared to|difference between)\b/i.test(query),
  ];

  // Also use LLM if rule-based found nothing
  const ruleBasedResult = applyRuleBasedExpansion(query);
  const noExpansions =
    ruleBasedResult.synonyms.length === 0 && ruleBasedResult.related_terms.length === 0;

  return indicators.some(Boolean) || noExpansions;
}

/**
 * LLM-based query expansion using Claude Haiku for speed
 */
export async function expandQueryWithLLM(
  query: string,
  anthropicApiKey: string
): Promise<Partial<ExpandedQuery>> {
  const systemPrompt = `You are a query expansion assistant for a software development memory system.
Given a query, output ONLY a valid JSON object with these fields:
- synonyms: array of 2-5 synonym terms (words/phrases that mean the same thing)
- related_terms: array of 3-8 related technical concepts
- detected_entities: array of specific technologies, files, features, or concepts mentioned

Be concise. Focus on software development context. Output ONLY JSON, no explanation.

Example input: "auth bug"
Example output: {"synonyms":["authentication error","login issue"],"related_terms":["JWT","session","token","RLS","security"],"detected_entities":["authentication"]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: query }],
      }),
    });

    if (!response.ok) {
      console.error('LLM expansion failed:', response.status, response.statusText);
      return {};
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return {};
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in LLM response');
      return {};
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [],
      related_terms: Array.isArray(parsed.related_terms) ? parsed.related_terms : [],
      detected_entities: Array.isArray(parsed.detected_entities) ? parsed.detected_entities : [],
    };
  } catch (error) {
    console.error('LLM expansion error:', error);
    return {};
  }
}

// ============================================
// MERGE EXPANSIONS
// ============================================

/**
 * Merge rule-based and LLM expansions, deduplicating terms
 */
function mergeExpansions(
  ruleBased: ExpandedQuery,
  llmExpansion: Partial<ExpandedQuery>
): ExpandedQuery {
  const synonyms = new Set([...ruleBased.synonyms, ...(llmExpansion.synonyms || [])]);
  const relatedTerms = new Set([...ruleBased.related_terms, ...(llmExpansion.related_terms || [])]);
  const entities = new Set([
    ...ruleBased.detected_entities,
    ...(llmExpansion.detected_entities || []),
  ]);

  // Remove duplicates between synonyms and related terms
  for (const syn of synonyms) {
    relatedTerms.delete(syn);
  }

  // Build expanded query (limited by MAX_EXPANSION_TERMS for hybrid too)
  const allTerms = [...synonyms, ...relatedTerms].slice(0, MAX_EXPANSION_TERMS + 5); // Allow a bit more for hybrid
  const expanded =
    allTerms.length > 0 ? `${ruleBased.original} ${allTerms.join(' ')}` : ruleBased.original;

  return {
    original: ruleBased.original,
    expanded,
    synonyms: [...synonyms],
    related_terms: [...relatedTerms],
    detected_entities: [...entities],
    expansion_method: 'hybrid',
  };
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Expand a query using rule-based and optionally LLM-based expansion.
 *
 * @param query - The original user query
 * @param options - Expansion options
 * @returns ExpandedQuery with enriched terms
 */
export async function expandQuery(
  query: string,
  options: ExpansionOptions = {}
): Promise<ExpandedQuery> {
  const { useLLM = false, anthropicApiKey } = options;

  // Always start with rule-based expansion (fast)
  const ruleBasedResult = applyRuleBasedExpansion(query);

  // If LLM requested and we have an API key
  if ((useLLM || shouldUseLLM(query)) && anthropicApiKey) {
    try {
      const llmResult = await expandQueryWithLLM(query, anthropicApiKey);
      return mergeExpansions(ruleBasedResult, llmResult);
    } catch (error) {
      console.warn('LLM expansion failed, using rule-based only:', error);
      return ruleBasedResult;
    }
  }

  return ruleBasedResult;
}

/**
 * Quick synchronous expansion using only rule-based approach.
 * Use this when speed is critical and LLM latency is unacceptable.
 */
export function expandQuerySync(query: string): ExpandedQuery {
  return applyRuleBasedExpansion(query);
}



