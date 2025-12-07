/**
 * Query Decomposition Service
 *
 * Breaks complex queries into sub-queries and combines results using
 * Reciprocal Rank Fusion (RRF). Essential for multi-part queries like:
 * "How did we implement messaging and what issues did we hit?"
 *
 * Based on RAG-Fusion paper: https://arxiv.org/abs/2402.03367
 *
 * 💭 ➡️ 📈
 */

// ============================================
// TYPES
// ============================================

export interface DecomposedQuery {
  original: string;
  sub_queries: string[];
  fusion_strategy: 'union' | 'intersection' | 'ranked';
  decomposition_method: 'rule_based' | 'llm';
  reasoning?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
  content?: string;
}

export interface FusedResult {
  id: string;
  fused_score: number;
  original_ranks: number[];
  appearances: number;
  metadata?: Record<string, unknown>;
  content?: string;
}

export interface DecompositionOptions {
  useLLM?: boolean;
  anthropicApiKey?: string;
  maxSubQueries?: number;
}

// ============================================
// CONJUNCTION PATTERNS
// ============================================

// Patterns that indicate query should be split
const SPLIT_PATTERNS: Array<{ pattern: RegExp; splitAt: string }> = [
  { pattern: /\b(and)\b/i, splitAt: 'and' },
  { pattern: /\b(also)\b/i, splitAt: 'also' },
  { pattern: /\b(plus)\b/i, splitAt: 'plus' },
  { pattern: /\b(as well as)\b/i, splitAt: 'as well as' },
  { pattern: /\b(along with)\b/i, splitAt: 'along with' },
  { pattern: /\b(in addition to)\b/i, splitAt: 'in addition to' },
  { pattern: /\b(but also)\b/i, splitAt: 'but also' },
  { pattern: /\b(then)\b/i, splitAt: 'then' },
];

// Question patterns that might have multiple parts
const MULTI_PART_QUESTION_PATTERNS = [
  /^(what|which).*\b(and|or)\b.*\?$/i,
  /^how.*\b(and|but)\b.*\?$/i,
  /^(what|when|where|why).*,.*\?$/i,
];

// Patterns that should NOT be split (false positive protection)
const NO_SPLIT_PATTERNS = [
  /\band\s+or\b/i,  // "and or" as a phrase
  /\bpros\s+and\s+cons\b/i,  // "pros and cons"
  /\btry\s+and\b/i,  // "try and"
  /\bcome\s+and\s+(go|see)\b/i,  // "come and go"
  /\bread\s+and\s+write\b/i,  // "read and write"
  /\bback\s+and\s+forth\b/i,  // "back and forth"
];

// ============================================
// RULE-BASED DECOMPOSITION
// ============================================

/**
 * Check if a query should be split based on patterns
 */
function shouldSplit(query: string): boolean {
  // Check for exclusion patterns first
  for (const pattern of NO_SPLIT_PATTERNS) {
    if (pattern.test(query)) {
      return false;
    }
  }

  // Check for split patterns
  for (const { pattern } of SPLIT_PATTERNS) {
    if (pattern.test(query)) {
      return true;
    }
  }

  // Check multi-part question patterns
  for (const pattern of MULTI_PART_QUESTION_PATTERNS) {
    if (pattern.test(query)) {
      return true;
    }
  }

  return false;
}

/**
 * Clean up a sub-query part
 */
function cleanSubQuery(part: string, originalQuery: string): string {
  let cleaned = part.trim();

  // Remove leading conjunctions
  cleaned = cleaned.replace(/^(and|also|plus|but|then|however)\s+/i, '');

  // If this part is too short, it might need context from the original
  if (cleaned.split(/\s+/).length < 3 && originalQuery.includes('?')) {
    // This is likely a fragment from a question - it might need the question structure
    // For now, just clean it up
  }

  return cleaned.trim();
}

/**
 * Split a query into sub-queries using rule-based approach
 */
export function decomposeQueryRuleBased(query: string): DecomposedQuery {
  if (!shouldSplit(query)) {
    return {
      original: query,
      sub_queries: [query],
      fusion_strategy: 'union',
      decomposition_method: 'rule_based',
      reasoning: 'No decomposition needed',
    };
  }

  const subQueries: string[] = [];
  let workingQuery = query;
  let splitFound = false;

  // Try each split pattern
  for (const { pattern, splitAt } of SPLIT_PATTERNS) {
    if (pattern.test(workingQuery)) {
      const parts = workingQuery.split(new RegExp(`\\b${splitAt}\\b`, 'i'));
      
      for (const part of parts) {
        const cleaned = cleanSubQuery(part, query);
        if (cleaned.length > 3) {  // Minimum viable sub-query
          subQueries.push(cleaned);
        }
      }
      
      splitFound = true;
      break;  // Only split on first matching pattern
    }
  }

  // If we found splits but ended up with just one query, return as-is
  if (subQueries.length <= 1) {
    return {
      original: query,
      sub_queries: [query],
      fusion_strategy: 'union',
      decomposition_method: 'rule_based',
      reasoning: 'Split attempted but resulted in single query',
    };
  }

  return {
    original: query,
    sub_queries: subQueries.slice(0, 5),  // Max 5 sub-queries
    fusion_strategy: 'union',
    decomposition_method: 'rule_based',
    reasoning: `Split on conjunction into ${subQueries.length} sub-queries`,
  };
}

// ============================================
// LLM-BASED DECOMPOSITION
// ============================================

/**
 * Use LLM to decompose complex queries intelligently
 */
export async function decomposeQueryWithLLM(
  query: string,
  anthropicApiKey: string
): Promise<DecomposedQuery> {
  const systemPrompt = `You are a query decomposition assistant. Given a complex query, break it into simpler sub-queries that can be searched independently.

Rules:
1. Only decompose if the query has multiple distinct aspects
2. Keep sub-queries concise but complete
3. Maximum 4 sub-queries
4. Return JSON only

Example input: "How did we implement messaging and what issues did we hit?"
Example output: {"sub_queries": ["messaging implementation", "messaging issues errors problems"], "reasoning": "Query asks about both implementation and issues separately"}

Example input: "authentication flow"
Example output: {"sub_queries": ["authentication flow"], "reasoning": "Simple query, no decomposition needed"}`;

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
      console.error('LLM decomposition failed:', response.status);
      return decomposeQueryRuleBased(query);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return decomposeQueryRuleBased(query);
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return decomposeQueryRuleBased(query);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const subQueries = Array.isArray(parsed.sub_queries) ? parsed.sub_queries : [query];

    return {
      original: query,
      sub_queries: subQueries.slice(0, 5),
      fusion_strategy: subQueries.length > 1 ? 'union' : 'union',
      decomposition_method: 'llm',
      reasoning: parsed.reasoning || 'LLM decomposition',
    };
  } catch (error) {
    console.error('LLM decomposition error:', error);
    return decomposeQueryRuleBased(query);
  }
}

// ============================================
// RECIPROCAL RANK FUSION (RRF)
// ============================================

/**
 * Combine multiple result sets using Reciprocal Rank Fusion.
 * 
 * RRF Formula: score = Σ 1/(k + rank)
 * where k is a constant (typically 60) and rank is 1-indexed position.
 *
 * This gives higher weight to documents that appear in multiple result sets
 * and/or appear at higher ranks.
 *
 * @param resultSets - Array of result sets from different sub-queries
 * @param k - RRF constant (default 60, higher = more uniform weighting)
 * @returns Fused results sorted by combined score
 */
export function reciprocalRankFusion(
  resultSets: SearchResult[][],
  k: number = 60
): FusedResult[] {
  // Track scores and metadata for each document ID
  const scoreMap = new Map<string, {
    fused_score: number;
    ranks: number[];
    appearances: number;
    metadata?: Record<string, unknown>;
    content?: string;
  }>();

  // Process each result set
  for (const results of resultSets) {
    for (let rank = 0; rank < results.length; rank++) {
      const doc = results[rank];
      const rrfScore = 1 / (k + rank + 1);  // rank is 0-indexed, RRF uses 1-indexed

      const existing = scoreMap.get(doc.id);
      if (existing) {
        existing.fused_score += rrfScore;
        existing.ranks.push(rank + 1);
        existing.appearances += 1;
      } else {
        scoreMap.set(doc.id, {
          fused_score: rrfScore,
          ranks: [rank + 1],
          appearances: 1,
          metadata: doc.metadata,
          content: doc.content,
        });
      }
    }
  }

  // Convert to array and sort by fused score
  const fusedResults: FusedResult[] = Array.from(scoreMap.entries())
    .map(([id, data]) => ({
      id,
      fused_score: data.fused_score,
      original_ranks: data.ranks,
      appearances: data.appearances,
      metadata: data.metadata,
      content: data.content,
    }))
    .sort((a, b) => b.fused_score - a.fused_score);

  return fusedResults;
}

/**
 * Alternative: Linear combination fusion with weighted scores
 */
export function linearCombinationFusion(
  resultSets: SearchResult[][],
  weights?: number[]
): FusedResult[] {
  // Default to equal weights
  const w = weights || resultSets.map(() => 1 / resultSets.length);

  const scoreMap = new Map<string, {
    fused_score: number;
    ranks: number[];
    appearances: number;
    metadata?: Record<string, unknown>;
    content?: string;
  }>();

  for (let setIndex = 0; setIndex < resultSets.length; setIndex++) {
    const results = resultSets[setIndex];
    const weight = w[setIndex] || (1 / resultSets.length);

    for (let rank = 0; rank < results.length; rank++) {
      const doc = results[rank];
      const weightedScore = doc.score * weight;

      const existing = scoreMap.get(doc.id);
      if (existing) {
        existing.fused_score += weightedScore;
        existing.ranks.push(rank + 1);
        existing.appearances += 1;
      } else {
        scoreMap.set(doc.id, {
          fused_score: weightedScore,
          ranks: [rank + 1],
          appearances: 1,
          metadata: doc.metadata,
          content: doc.content,
        });
      }
    }
  }

  return Array.from(scoreMap.entries())
    .map(([id, data]) => ({
      id,
      fused_score: data.fused_score,
      original_ranks: data.ranks,
      appearances: data.appearances,
      metadata: data.metadata,
      content: data.content,
    }))
    .sort((a, b) => b.fused_score - a.fused_score);
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Decompose a query into sub-queries for RAG Fusion.
 *
 * @param query - The original query
 * @param options - Decomposition options
 * @returns DecomposedQuery with sub-queries
 */
export async function decomposeQuery(
  query: string,
  options: DecompositionOptions = {}
): Promise<DecomposedQuery> {
  const { useLLM = false, anthropicApiKey, maxSubQueries = 5 } = options;

  // Always try rule-based first
  const ruleBased = decomposeQueryRuleBased(query);

  // If rule-based didn't decompose and LLM is requested
  if (ruleBased.sub_queries.length === 1 && useLLM && anthropicApiKey) {
    // Check if query is complex enough to warrant LLM decomposition
    const wordCount = query.split(/\s+/).length;
    if (wordCount > 5 || query.includes('?')) {
      return decomposeQueryWithLLM(query, anthropicApiKey);
    }
  }

  return {
    ...ruleBased,
    sub_queries: ruleBased.sub_queries.slice(0, maxSubQueries),
  };
}

/**
 * Quick synchronous decomposition using only rule-based approach.
 */
export function decomposeQuerySync(query: string): DecomposedQuery {
  return decomposeQueryRuleBased(query);
}

// ============================================
// QUERY GENERATION FOR RAG-FUSION
// ============================================

/**
 * Generate query variations for RAG-Fusion approach.
 * Creates multiple perspectives on the same query.
 */
export function generateQueryVariations(query: string): string[] {
  const variations: string[] = [query];

  // Add rephrased versions
  const lowerQuery = query.toLowerCase();

  // If it's a question, try statement form
  if (query.endsWith('?')) {
    const statement = query.slice(0, -1).replace(/^(how|what|when|where|why|which)\s+/i, '');
    if (statement.length > 10) {
      variations.push(statement);
    }
  }

  // If asking "how to", also search for documentation
  if (/^how (to|do|can)/i.test(query)) {
    const topic = query.replace(/^how (to|do|can)\s+/i, '');
    variations.push(`${topic} documentation`);
    variations.push(`${topic} guide`);
  }

  // If asking about errors, also search for solutions
  if (/\b(error|bug|issue|problem)\b/i.test(query)) {
    variations.push(query.replace(/\b(error|bug|issue|problem)\b/gi, 'fix'));
    variations.push(query.replace(/\b(error|bug|issue|problem)\b/gi, 'solution'));
  }

  // Dedupe and limit
  return [...new Set(variations)].slice(0, 4);
}







