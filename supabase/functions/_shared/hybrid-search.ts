/**
 * Hybrid Search Utilities
 * 
 * Combines dense semantic vectors with sparse keyword vectors for hybrid search.
 * This gives us the best of both worlds:
 * - Semantic understanding: "auth" matches "authentication"
 * - Keyword precision: "RLS" finds exact "RLS" mentions
 * 
 * The alpha parameter controls the balance:
 * - alpha = 1.0: Pure dense (semantic only)
 * - alpha = 0.5: Equal weight
 * - alpha = 0.0: Pure sparse (keyword only)
 * 
 * 💭 ➡️ 📈
 */

import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2';
import OpenAI from 'https://esm.sh/openai@4';
import { 
  generateSparseEmbedding, 
  containsBoostKeywords,
  type SparseValues 
} from './sparse-embedding.ts';

// ============================================
// TYPES
// ============================================

export interface HybridVector {
  id: string;
  values: number[];           // Dense vector (3072 dims)
  sparseValues?: SparseValues; // Sparse vector (variable dims)
  metadata: Record<string, unknown>;
}

export interface HybridSearchOptions {
  query: string;
  topK: number;
  alpha?: number;             // 0.0 (pure sparse) to 1.0 (pure dense), default 0.5
  filter?: Record<string, unknown>;
  dataType?: string;          // For data-type specific alpha
  autoTuneAlpha?: boolean;    // Auto-adjust alpha based on query content
}

export interface HybridSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface HybridQueryInfo {
  alpha_used: number;
  alpha_source: 'explicit' | 'data_type' | 'auto_tuned' | 'default';
  dense_embedding_time_ms: number;
  sparse_embedding_time_ms: number;
  query_time_ms: number;
  keyword_boost_applied: boolean;
}

// ============================================
// ALPHA TUNING CONFIGURATION
// ============================================

/**
 * Alpha values by data_type
 * Lower alpha = more keyword weight
 * Higher alpha = more semantic weight
 */
export const DATA_TYPE_ALPHA: Record<string, number> = {
  // More semantic (natural language)
  session: 0.7,      // Conversations are natural language
  learning: 0.65,    // Concepts + specific terms
  research: 0.6,     // Mix of ideas and references
  
  // Balanced
  deployment: 0.5,   // Mix of logs and descriptions
  error: 0.45,       // Error messages + stack traces
  system_snapshot: 0.4,
  
  // More keyword (precise terms matter)
  metric: 0.35,      // Numbers and specific identifiers
  code: 0.3,         // Function names, variables matter
  config: 0.25,      // Exact config keys are important
};

/**
 * Default alpha when no data type specified
 */
export const DEFAULT_ALPHA = 0.5;

/**
 * Get alpha value for a data type
 */
export function getAlphaForDataType(dataType: string): number {
  return DATA_TYPE_ALPHA[dataType] ?? DEFAULT_ALPHA;
}

/**
 * Auto-tune alpha based on query characteristics
 * 
 * Queries with technical terms, acronyms, or specific identifiers
 * should lean more toward keyword matching (lower alpha)
 */
export function autoTuneAlpha(query: string, baseAlpha: number): number {
  // Check for boost keywords (technical terms)
  if (containsBoostKeywords(query)) {
    // Reduce alpha by 0.15 (more keyword weight)
    return Math.max(0.1, baseAlpha - 0.15);
  }

  // Check for uppercase acronyms (likely technical)
  const acronyms = query.match(/\b[A-Z]{2,}\b/g);
  if (acronyms && acronyms.length > 0) {
    // Reduce alpha by 0.1 per acronym (max 0.3 reduction)
    const reduction = Math.min(0.3, acronyms.length * 0.1);
    return Math.max(0.1, baseAlpha - reduction);
  }

  // Check for code patterns (function names, file paths)
  const codePatterns = [
    /\.[a-z]{2,4}\b/i,        // File extensions
    /\w+\(\)/,                 // Function calls
    /\w+\.\w+/,                // Object.property
    /[a-z]+_[a-z]+/i,          // snake_case
    /[a-z]+[A-Z][a-z]+/,       // camelCase
  ];
  
  const hasCodePattern = codePatterns.some(pattern => pattern.test(query));
  if (hasCodePattern) {
    return Math.max(0.1, baseAlpha - 0.1);
  }

  // Check for question words (more semantic)
  const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which'];
  const startsWithQuestion = questionWords.some(w => 
    query.toLowerCase().startsWith(w)
  );
  if (startsWithQuestion) {
    // Increase alpha by 0.1 (more semantic weight)
    return Math.min(0.9, baseAlpha + 0.1);
  }

  return baseAlpha;
}

// ============================================
// DENSE EMBEDDING GENERATION
// ============================================

/**
 * Generate dense embedding using OpenAI
 */
export async function generateDenseEmbedding(
  openai: OpenAI,
  text: string
): Promise<number[]> {
  const preparedText = text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: preparedText,
    dimensions: 3072,
  });

  return response.data[0].embedding;
}

// ============================================
// HYBRID VECTOR GENERATION
// ============================================

/**
 * Generate hybrid vector with both dense and sparse components
 * 
 * @param pinecone - Pinecone client
 * @param openai - OpenAI client
 * @param text - Text to embed
 * @param id - Vector ID
 * @param metadata - Metadata to attach
 * @returns Hybrid vector ready for upsert
 */
export async function generateHybridVector(
  pinecone: Pinecone,
  openai: OpenAI,
  text: string,
  id: string,
  metadata: Record<string, unknown>
): Promise<HybridVector> {
  // Generate both embeddings in parallel
  const [denseEmbedding, sparseResult] = await Promise.all([
    generateDenseEmbedding(openai, text),
    generateSparseEmbedding(pinecone, text, { inputType: 'passage' }),
  ]);

  return {
    id,
    values: denseEmbedding,
    sparseValues: sparseResult.sparse_values,
    metadata,
  };
}

// ============================================
// HYBRID QUERY
// ============================================

/**
 * Execute hybrid search combining dense and sparse vectors
 * 
 * @param pinecone - Pinecone client
 * @param openai - OpenAI client
 * @param indexName - Pinecone index name
 * @param options - Search options
 * @returns Search results and query info
 */
export async function hybridQuery(
  pinecone: Pinecone,
  openai: OpenAI,
  indexName: string,
  options: HybridSearchOptions
): Promise<{
  results: HybridSearchResult[];
  queryInfo: HybridQueryInfo;
}> {
  const { query, topK, filter, dataType, autoTuneAlpha: shouldAutoTune } = options;

  // Determine alpha value
  let alpha: number;
  let alphaSource: 'explicit' | 'data_type' | 'auto_tuned' | 'default';
  let keywordBoostApplied = false;

  if (options.alpha !== undefined) {
    // Explicit alpha provided
    alpha = options.alpha;
    alphaSource = 'explicit';
  } else if (dataType) {
    // Use data-type specific alpha
    alpha = getAlphaForDataType(dataType);
    alphaSource = 'data_type';
  } else {
    // Use default
    alpha = DEFAULT_ALPHA;
    alphaSource = 'default';
  }

  // Auto-tune if enabled and not explicitly set
  if (shouldAutoTune !== false && alphaSource !== 'explicit') {
    const originalAlpha = alpha;
    alpha = autoTuneAlpha(query, alpha);
    if (alpha !== originalAlpha) {
      alphaSource = 'auto_tuned';
      keywordBoostApplied = containsBoostKeywords(query);
    }
  }

  // Generate embeddings
  const denseStart = Date.now();
  const denseEmbedding = await generateDenseEmbedding(openai, query);
  const denseTime = Date.now() - denseStart;

  const sparseStart = Date.now();
  const sparseResult = await generateSparseEmbedding(pinecone, query, { inputType: 'query' });
  const sparseTime = Date.now() - sparseStart;

  // Get index
  const index = pinecone.index(indexName);

  // Execute hybrid query
  const queryStart = Date.now();
  
  // Build query request
  const queryRequest: {
    vector: number[];
    sparseVector?: SparseValues;
    topK: number;
    filter?: Record<string, unknown>;
    includeMetadata: boolean;
  } = {
    vector: denseEmbedding,
    topK,
    includeMetadata: true,
  };

  // Add sparse vector if available
  if (sparseResult.sparse_values.indices.length > 0) {
    queryRequest.sparseVector = sparseResult.sparse_values;
  }

  // Add filter if provided
  if (filter && Object.keys(filter).length > 0) {
    queryRequest.filter = filter;
  }

  const searchResults = await index.query(queryRequest);
  const queryTime = Date.now() - queryStart;

  // Format results
  const results: HybridSearchResult[] = (searchResults.matches || []).map(match => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata as Record<string, unknown> | undefined,
  }));

  return {
    results,
    queryInfo: {
      alpha_used: alpha,
      alpha_source: alphaSource,
      dense_embedding_time_ms: denseTime,
      sparse_embedding_time_ms: sparseTime,
      query_time_ms: queryTime,
      keyword_boost_applied: keywordBoostApplied,
    },
  };
}

// ============================================
// PURE DENSE QUERY (FALLBACK)
// ============================================

/**
 * Execute pure dense search (for comparison or when sparse not available)
 */
export async function denseOnlyQuery(
  pinecone: Pinecone,
  openai: OpenAI,
  indexName: string,
  query: string,
  topK: number,
  filter?: Record<string, unknown>
): Promise<HybridSearchResult[]> {
  const denseEmbedding = await generateDenseEmbedding(openai, query);
  const index = pinecone.index(indexName);

  const queryRequest: {
    vector: number[];
    topK: number;
    filter?: Record<string, unknown>;
    includeMetadata: boolean;
  } = {
    vector: denseEmbedding,
    topK,
    includeMetadata: true,
  };

  if (filter && Object.keys(filter).length > 0) {
    queryRequest.filter = filter;
  }

  const searchResults = await index.query(queryRequest);

  return (searchResults.matches || []).map(match => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata as Record<string, unknown> | undefined,
  }));
}

// ============================================
// BATCH UPSERT HELPER
// ============================================

/**
 * Upsert hybrid vectors in batch
 * 
 * @param pinecone - Pinecone client
 * @param indexName - Index name
 * @param vectors - Hybrid vectors to upsert
 */
export async function upsertHybridVectors(
  pinecone: Pinecone,
  indexName: string,
  vectors: HybridVector[]
): Promise<void> {
  if (vectors.length === 0) return;

  const index = pinecone.index(indexName);

  // Format for Pinecone upsert
  const upsertVectors = vectors.map(v => ({
    id: v.id,
    values: v.values,
    sparseValues: v.sparseValues,
    metadata: v.metadata,
  }));

  // Upsert in batches of 100 (Pinecone limit)
  const batchSize = 100;
  for (let i = 0; i < upsertVectors.length; i += batchSize) {
    const batch = upsertVectors.slice(i, i + batchSize);
    await index.upsert(batch);
  }
}

// ============================================
// ALPHA RECOMMENDATIONS
// ============================================

/**
 * Get recommended alpha based on query analysis
 * Returns explanation for debugging/logging
 */
export function explainAlphaRecommendation(
  query: string,
  dataType?: string
): {
  recommended_alpha: number;
  explanation: string;
  factors: string[];
} {
  const factors: string[] = [];
  let alpha = DEFAULT_ALPHA;

  // Start with data type
  if (dataType) {
    alpha = getAlphaForDataType(dataType);
    factors.push(`Data type "${dataType}" suggests alpha=${alpha}`);
  }

  // Check for technical terms
  if (containsBoostKeywords(query)) {
    factors.push('Query contains technical keywords - reducing alpha');
    alpha = Math.max(0.1, alpha - 0.15);
  }

  // Check for acronyms
  const acronyms = query.match(/\b[A-Z]{2,}\b/g);
  if (acronyms && acronyms.length > 0) {
    factors.push(`Found ${acronyms.length} acronym(s): ${acronyms.join(', ')}`);
    alpha = Math.max(0.1, alpha - Math.min(0.3, acronyms.length * 0.1));
  }

  // Check for question format
  const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which'];
  if (questionWords.some(w => query.toLowerCase().startsWith(w))) {
    factors.push('Query is a question - favoring semantic understanding');
    alpha = Math.min(0.9, alpha + 0.1);
  }

  const explanation = factors.length > 0
    ? factors.join('. ')
    : `Using default alpha=${DEFAULT_ALPHA} (no special factors detected)`;

  return {
    recommended_alpha: Math.round(alpha * 100) / 100,
    explanation,
    factors,
  };
}







