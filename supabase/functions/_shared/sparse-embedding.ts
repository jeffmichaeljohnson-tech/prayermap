/**
 * Sparse Embedding Generation
 * 
 * Generates sparse vectors for hybrid search using Pinecone's hosted sparse model.
 * Sparse vectors capture keyword/lexical importance for precise term matching.
 * 
 * Combined with dense vectors, this enables hybrid search that gets both:
 * - Semantic understanding (dense vectors)
 * - Keyword precision (sparse vectors)
 * 
 * 💭 ➡️ 📈
 */

import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@2';

// ============================================
// TYPES
// ============================================

export interface SparseValues {
  indices: number[];
  values: number[];
}

export interface SparseEmbeddingResult {
  sparse_values: SparseValues;
  token_count: number;
}

export interface SparseEmbeddingOptions {
  inputType: 'passage' | 'query';
  model?: string;
}

// ============================================
// CONSTANTS
// ============================================

// Pinecone's hosted sparse model - context-aware lexical importance
// Based on DeepImpact architecture
export const SPARSE_MODEL = 'pinecone-sparse-english-v0';

// Maximum text length for sparse embedding (in characters)
export const MAX_SPARSE_TEXT_LENGTH = 8000;

// ============================================
// SPARSE EMBEDDING GENERATION
// ============================================

/**
 * Generate sparse embedding using Pinecone Inference API
 * 
 * @param pinecone - Initialized Pinecone client
 * @param text - Text to embed
 * @param options - Embedding options
 * @returns Sparse embedding result
 */
export async function generateSparseEmbedding(
  pinecone: Pinecone,
  text: string,
  options: SparseEmbeddingOptions = { inputType: 'passage' }
): Promise<SparseEmbeddingResult> {
  // Prepare text
  const preparedText = text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SPARSE_TEXT_LENGTH);

  if (!preparedText) {
    return {
      sparse_values: { indices: [], values: [] },
      token_count: 0,
    };
  }

  try {
    // Use Pinecone Inference API for sparse embeddings
    const response = await pinecone.inference.embed(
      options.model || SPARSE_MODEL,
      [preparedText],
      { inputType: options.inputType }
    );

    // Extract sparse values from response
    const embedding = response.data?.[0];
    
    if (!embedding || !embedding.sparseValues) {
      console.warn('No sparse values in Pinecone response, returning empty');
      return {
        sparse_values: { indices: [], values: [] },
        token_count: 0,
      };
    }

    return {
      sparse_values: {
        indices: embedding.sparseValues.indices || [],
        values: embedding.sparseValues.values || [],
      },
      token_count: embedding.sparseValues.indices?.length || 0,
    };
  } catch (error) {
    console.error('Failed to generate sparse embedding:', error);
    
    // Return empty sparse values on error - allows graceful degradation
    // The dense vector will still work for semantic search
    return {
      sparse_values: { indices: [], values: [] },
      token_count: 0,
    };
  }
}

/**
 * Generate sparse embeddings for multiple texts in batch
 * 
 * @param pinecone - Initialized Pinecone client
 * @param texts - Array of texts to embed
 * @param options - Embedding options
 * @returns Array of sparse embedding results
 */
export async function generateSparseEmbeddingsBatch(
  pinecone: Pinecone,
  texts: string[],
  options: SparseEmbeddingOptions = { inputType: 'passage' }
): Promise<SparseEmbeddingResult[]> {
  if (texts.length === 0) {
    return [];
  }

  // Prepare all texts
  const preparedTexts = texts.map(text =>
    text.replace(/\s+/g, ' ').trim().slice(0, MAX_SPARSE_TEXT_LENGTH)
  );

  // Filter out empty texts and track their positions
  const validTexts: { index: number; text: string }[] = [];
  for (let i = 0; i < preparedTexts.length; i++) {
    if (preparedTexts[i]) {
      validTexts.push({ index: i, text: preparedTexts[i] });
    }
  }

  if (validTexts.length === 0) {
    return texts.map(() => ({
      sparse_values: { indices: [], values: [] },
      token_count: 0,
    }));
  }

  try {
    // Batch request to Pinecone
    const response = await pinecone.inference.embed(
      options.model || SPARSE_MODEL,
      validTexts.map(v => v.text),
      { inputType: options.inputType }
    );

    // Build results array preserving original order
    const results: SparseEmbeddingResult[] = texts.map(() => ({
      sparse_values: { indices: [], values: [] },
      token_count: 0,
    }));

    // Fill in valid results
    if (response.data) {
      for (let i = 0; i < validTexts.length; i++) {
        const embedding = response.data[i];
        if (embedding?.sparseValues) {
          results[validTexts[i].index] = {
            sparse_values: {
              indices: embedding.sparseValues.indices || [],
              values: embedding.sparseValues.values || [],
            },
            token_count: embedding.sparseValues.indices?.length || 0,
          };
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to generate batch sparse embeddings:', error);
    
    // Return empty sparse values for all - graceful degradation
    return texts.map(() => ({
      sparse_values: { indices: [], values: [] },
      token_count: 0,
    }));
  }
}

// ============================================
// FALLBACK: Simple TF-IDF Style Sparse Vectors
// ============================================

/**
 * Simple fallback sparse vector generation using term frequency
 * Used when Pinecone Inference API is unavailable
 * 
 * This is a basic implementation - Pinecone's model is much better
 * for production use.
 */
export function generateSimpleSparseVector(text: string): SparseValues {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);

  if (words.length === 0) {
    return { indices: [], values: [] };
  }

  // Count term frequencies
  const termFreq = new Map<string, number>();
  for (const word of words) {
    termFreq.set(word, (termFreq.get(word) || 0) + 1);
  }

  // Simple hash function to convert words to indices
  // Note: This is a simplified version - real BM25 would use a vocabulary
  const hashWord = (word: string): number => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 1000000; // Limit to 1M dimensions
  };

  // Build sparse vector
  const sparseMap = new Map<number, number>();
  const totalTerms = words.length;

  for (const [term, freq] of termFreq) {
    const index = hashWord(term);
    const tf = freq / totalTerms; // Normalized term frequency
    
    // Accumulate if collision (rare)
    sparseMap.set(index, (sparseMap.get(index) || 0) + tf);
  }

  // Sort by index for deterministic output
  const entries = Array.from(sparseMap.entries()).sort((a, b) => a[0] - b[0]);

  return {
    indices: entries.map(e => e[0]),
    values: entries.map(e => e[1]),
  };
}

// ============================================
// TECHNICAL TERM BOOSTING
// ============================================

/**
 * Keywords that should get boosted weight in sparse vectors
 * These are technical terms that are important for exact matching
 */
export const BOOST_KEYWORDS = new Set([
  // Database
  'rls', 'jwt', 'oauth', 'api', 'sql', 'uuid', 'postgres', 'postgis',
  // Services
  'supabase', 'pinecone', 'vercel', 'claude', 'openai', 'mapbox',
  // Actions
  'migration', 'deployment', 'error', 'bug', 'fix', 'create', 'delete',
  // PrayerMap specific
  'prayer', 'memorial', 'marker', 'realtime', 'websocket',
  // Technical
  'typescript', 'react', 'vite', 'tailwind', 'edge', 'function',
]);

/**
 * Check if query contains boost-worthy keywords
 * If so, sparse component should be weighted higher (lower alpha)
 */
export function containsBoostKeywords(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  return words.some(word => BOOST_KEYWORDS.has(word));
}

/**
 * Get boost multiplier based on keyword presence
 */
export function getKeywordBoostMultiplier(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  const boostCount = words.filter(word => BOOST_KEYWORDS.has(word)).length;
  
  if (boostCount === 0) return 1.0;
  if (boostCount === 1) return 1.2;
  if (boostCount === 2) return 1.4;
  return 1.5; // Max boost for 3+ keywords
}







