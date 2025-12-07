/**
 * Content Deduplication Service
 * 
 * Prevents duplicate content from being ingested by hashing content
 * and checking against existing records.
 * 
 * Features:
 * - SHA-256 based content hashing
 * - Configurable normalization
 * - Batch deduplication support
 * - Similarity detection (optional)
 * 
 * 💭 ➡️ 📈
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// TYPES
// ============================================

export interface DeduplicationConfig {
  /** Normalize whitespace before hashing (default: true) */
  normalize_whitespace: boolean;
  /** Convert to lowercase before hashing (default: true) */
  case_insensitive: boolean;
  /** Remove leading/trailing whitespace (default: true) */
  trim_content: boolean;
  /** Hash length (first N characters of SHA-256, default: 16) */
  hash_length: number;
  /** Include metadata in hash (default: false) */
  include_metadata: boolean;
}

export interface DeduplicationResult {
  /** Items that are unique (not duplicates) */
  unique_items: DedupItem[];
  /** Items that are duplicates of existing content */
  duplicates: DuplicateRecord[];
  /** Statistics about the deduplication */
  stats: DeduplicationStats;
}

export interface DedupItem {
  /** Original item with all properties */
  [key: string]: unknown;
  /** Content to check for duplicates */
  content: string;
  /** Generated content hash */
  content_hash: string;
}

export interface DuplicateRecord {
  /** The duplicate item */
  item: DedupItem;
  /** ID of the existing document */
  existing_id: string;
  /** Pinecone ID of existing document */
  existing_pinecone_id?: string;
  /** When the original was created */
  existing_created_at?: string;
}

export interface DeduplicationStats {
  total_items: number;
  unique_count: number;
  duplicate_count: number;
  duplicate_rate: number;
}

// ============================================
// DEFAULTS
// ============================================

export const DEFAULT_DEDUP_CONFIG: DeduplicationConfig = {
  normalize_whitespace: true,
  case_insensitive: true,
  trim_content: true,
  hash_length: 16,
  include_metadata: false,
};

// ============================================
// CRYPTO HELPERS
// ============================================

/**
 * Generate SHA-256 hash of content
 * Uses Web Crypto API available in Deno
 */
async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Normalize content before hashing based on config
 */
function normalizeContent(
  content: string,
  config: DeduplicationConfig
): string {
  let normalized = content;
  
  if (config.trim_content) {
    normalized = normalized.trim();
  }
  
  if (config.normalize_whitespace) {
    // Replace multiple whitespace with single space
    normalized = normalized.replace(/\s+/g, ' ');
  }
  
  if (config.case_insensitive) {
    normalized = normalized.toLowerCase();
  }
  
  return normalized;
}

// ============================================
// CONTENT HASHING
// ============================================

/**
 * Generate a content hash for deduplication
 * 
 * @param content The content to hash
 * @param metadata Optional metadata to include in hash
 * @param config Deduplication configuration
 * @returns Content hash string
 */
export async function hashContent(
  content: string,
  metadata?: Record<string, unknown>,
  config: Partial<DeduplicationConfig> = {}
): Promise<string> {
  const mergedConfig = { ...DEFAULT_DEDUP_CONFIG, ...config };
  
  // Normalize content
  let toHash = normalizeContent(content, mergedConfig);
  
  // Optionally include metadata
  if (mergedConfig.include_metadata && metadata) {
    // Sort keys for consistent hashing
    const sortedMetadata = JSON.stringify(metadata, Object.keys(metadata).sort());
    toHash = `${toHash}::${sortedMetadata}`;
  }
  
  // Generate hash
  const fullHash = await sha256(toHash);
  
  // Return truncated hash
  return fullHash.substring(0, mergedConfig.hash_length);
}

/**
 * Generate content hashes for multiple items in batch
 */
export async function hashContentBatch(
  items: Array<{ content: string; metadata?: Record<string, unknown> }>,
  config: Partial<DeduplicationConfig> = {}
): Promise<string[]> {
  return Promise.all(
    items.map(item => hashContent(item.content, item.metadata, config))
  );
}

// ============================================
// DEDUPLICATION WITH SUPABASE
// ============================================

/**
 * Check for duplicates against existing content in Supabase
 * 
 * @param items Items to check for duplicates
 * @param supabase Supabase client
 * @param config Deduplication configuration
 * @returns Deduplication result with unique and duplicate items
 */
export async function deduplicateItems<T extends { content: string; metadata?: Record<string, unknown> }>(
  items: T[],
  supabase: SupabaseClient,
  config: Partial<DeduplicationConfig> = {}
): Promise<DeduplicationResult> {
  const mergedConfig = { ...DEFAULT_DEDUP_CONFIG, ...config };
  
  // Generate hashes for all items
  const itemsWithHashes: DedupItem[] = await Promise.all(
    items.map(async (item) => ({
      ...item,
      content_hash: await hashContent(item.content, item.metadata, mergedConfig),
    }))
  );
  
  // Extract unique hashes
  const hashes = [...new Set(itemsWithHashes.map(i => i.content_hash))];
  
  // Query existing content with these hashes
  const { data: existing, error } = await supabase
    .from('document_content')
    .select('id, pinecone_id, content_hash, created_at')
    .in('content_hash', hashes);
  
  if (error) {
    console.error('[Deduplication] Failed to query existing hashes:', error);
    // On error, treat all as unique (fail open)
    return {
      unique_items: itemsWithHashes,
      duplicates: [],
      stats: {
        total_items: items.length,
        unique_count: items.length,
        duplicate_count: 0,
        duplicate_rate: 0,
      },
    };
  }
  
  // Build lookup map
  const existingMap = new Map<string, { id: string; pinecone_id?: string; created_at?: string }>(
    existing?.map(e => [e.content_hash, { 
      id: e.id, 
      pinecone_id: e.pinecone_id,
      created_at: e.created_at,
    }]) || []
  );
  
  // Separate unique from duplicates
  const unique_items: DedupItem[] = [];
  const duplicates: DuplicateRecord[] = [];
  const seenHashes = new Set<string>();
  
  for (const item of itemsWithHashes) {
    const existingRecord = existingMap.get(item.content_hash);
    
    if (existingRecord) {
      // Duplicate of existing content
      duplicates.push({
        item,
        existing_id: existingRecord.id,
        existing_pinecone_id: existingRecord.pinecone_id,
        existing_created_at: existingRecord.created_at,
      });
    } else if (seenHashes.has(item.content_hash)) {
      // Duplicate within the current batch
      duplicates.push({
        item,
        existing_id: 'in-batch-duplicate',
      });
    } else {
      // Unique item
      unique_items.push(item);
      seenHashes.add(item.content_hash);
    }
  }
  
  const stats: DeduplicationStats = {
    total_items: items.length,
    unique_count: unique_items.length,
    duplicate_count: duplicates.length,
    duplicate_rate: items.length > 0 
      ? Math.round((duplicates.length / items.length) * 100) 
      : 0,
  };
  
  console.log(
    `[Deduplication] ${stats.unique_count}/${stats.total_items} unique items ` +
    `(${stats.duplicate_rate}% duplicate rate)`
  );
  
  return { unique_items, duplicates, stats };
}

// ============================================
// IN-MEMORY DEDUPLICATION
// ============================================

/**
 * Simple in-memory deduplication (no database check)
 * Useful for deduplicating items within a single batch
 */
export async function deduplicateInMemory<T extends { content: string }>(
  items: T[],
  config: Partial<DeduplicationConfig> = {}
): Promise<{ unique: T[]; duplicates: T[] }> {
  const seenHashes = new Set<string>();
  const unique: T[] = [];
  const duplicates: T[] = [];
  
  for (const item of items) {
    const hash = await hashContent(item.content, undefined, config);
    
    if (seenHashes.has(hash)) {
      duplicates.push(item);
    } else {
      unique.push(item);
      seenHashes.add(hash);
    }
  }
  
  return { unique, duplicates };
}

// ============================================
// SIMILARITY DETECTION (OPTIONAL)
// ============================================

/**
 * Calculate Jaccard similarity between two sets of tokens
 */
function jaccardSimilarity(tokens1: Set<string>, tokens2: Set<string>): number {
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  return intersection.size / union.size;
}

/**
 * Tokenize content for similarity comparison
 */
function tokenize(content: string): Set<string> {
  // Simple word tokenization
  return new Set(
    content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

/**
 * Find near-duplicates based on content similarity
 * 
 * @param items Items to check
 * @param similarityThreshold Minimum similarity to consider duplicate (default: 0.85)
 * @returns Groups of similar items
 */
export function findSimilarItems<T extends { content: string }>(
  items: T[],
  similarityThreshold = 0.85
): Array<{ items: T[]; similarity: number }> {
  const groups: Array<{ items: T[]; similarity: number }> = [];
  const processed = new Set<number>();
  
  const tokenizedItems = items.map(item => ({
    item,
    tokens: tokenize(item.content),
  }));
  
  for (let i = 0; i < tokenizedItems.length; i++) {
    if (processed.has(i)) continue;
    
    const group: T[] = [tokenizedItems[i].item];
    processed.add(i);
    let maxSimilarity = 0;
    
    for (let j = i + 1; j < tokenizedItems.length; j++) {
      if (processed.has(j)) continue;
      
      const similarity = jaccardSimilarity(
        tokenizedItems[i].tokens,
        tokenizedItems[j].tokens
      );
      
      if (similarity >= similarityThreshold) {
        group.push(tokenizedItems[j].item);
        processed.add(j);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
    }
    
    if (group.length > 1) {
      groups.push({ items: group, similarity: maxSimilarity });
    }
  }
  
  return groups;
}

// ============================================
// EXPORTS
// ============================================

export default {
  hashContent,
  hashContentBatch,
  deduplicateItems,
  deduplicateInMemory,
  findSimilarItems,
  DEFAULT_DEDUP_CONFIG,
};

