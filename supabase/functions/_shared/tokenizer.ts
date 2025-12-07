/**
 * Token counting utilities for chunking
 * 
 * Uses a character-based approximation for cl100k_base encoding
 * (used by OpenAI text-embedding-3-large).
 * 
 * Approximation: ~4 characters per token for English text
 * This is intentionally conservative to avoid exceeding limits.
 * 
 * For production accuracy, consider using tiktoken-wasm or similar.
 * 
 * 💭 ➡️ 📈
 */

// ============================================
// CONSTANTS
// ============================================

// Average characters per token for cl100k_base encoding
// Conservative estimate: 3.5-4 chars/token for mixed English/code
const CHARS_PER_TOKEN = 3.8;

// Maximum tokens for text-embedding-3-large input
export const MAX_EMBEDDING_TOKENS = 8191;

// Default chunk sizes (in tokens)
export const DEFAULT_CHUNK_SIZE = 512;
export const DEFAULT_CHUNK_OVERLAP = 50;

// ============================================
// TOKEN COUNTING
// ============================================

/**
 * Estimate the number of tokens in a text string.
 * 
 * Uses character-based approximation for cl100k_base encoding.
 * Accuracy: ~90% for English text, ~85% for code.
 * 
 * @param text - The text to count tokens for
 * @returns Estimated token count
 */
export function countTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  
  // Basic character count
  let baseCount = text.length / CHARS_PER_TOKEN;
  
  // Adjust for common patterns that affect tokenization:
  
  // 1. Whitespace tends to combine with adjacent tokens
  const whitespaceCount = (text.match(/\s+/g) || []).length;
  baseCount -= whitespaceCount * 0.2;
  
  // 2. Numbers often get split into individual digits
  const numberCount = (text.match(/\d+/g) || []).length;
  baseCount += numberCount * 0.3;
  
  // 3. Code patterns (camelCase, snake_case) split differently
  const camelCaseCount = (text.match(/[a-z][A-Z]/g) || []).length;
  baseCount += camelCaseCount * 0.5;
  
  // 4. Special characters often become individual tokens
  const specialCharCount = (text.match(/[{}()\[\]<>:;,.!?@#$%^&*+=|\\/-]/g) || []).length;
  baseCount += specialCharCount * 0.3;
  
  return Math.max(1, Math.ceil(baseCount));
}

/**
 * Check if text is within the embedding model's token limit.
 */
export function isWithinTokenLimit(text: string, maxTokens: number = MAX_EMBEDDING_TOKENS): boolean {
  return countTokens(text) <= maxTokens;
}

// ============================================
// TEXT MANIPULATION
// ============================================

/**
 * Truncate text to approximately fit within a token limit.
 * 
 * Tries to truncate at sentence or word boundaries for cleaner output.
 * 
 * @param text - Text to truncate
 * @param maxTokens - Maximum tokens allowed
 * @param suffix - Suffix to append when truncated (default: "...")
 * @returns Truncated text
 */
export function truncateToTokens(
  text: string, 
  maxTokens: number, 
  suffix: string = '...'
): string {
  if (!text) return '';
  
  const currentTokens = countTokens(text);
  if (currentTokens <= maxTokens) return text;
  
  // Calculate approximate character limit
  const targetChars = Math.floor(maxTokens * CHARS_PER_TOKEN);
  let truncated = text.slice(0, targetChars);
  
  // Try to find a good break point
  // Priority: sentence end > paragraph > word boundary
  
  // Look for sentence end (., !, ?)
  const sentenceMatch = truncated.match(/^([\s\S]*[.!?])\s+[A-Z]/);
  if (sentenceMatch && sentenceMatch[1].length > targetChars * 0.5) {
    return sentenceMatch[1];
  }
  
  // Look for paragraph break
  const paragraphMatch = truncated.match(/^([\s\S]*)\n\n/);
  if (paragraphMatch && paragraphMatch[1].length > targetChars * 0.5) {
    return paragraphMatch[1] + suffix;
  }
  
  // Look for word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > targetChars * 0.7) {
    return truncated.slice(0, lastSpace) + suffix;
  }
  
  return truncated + suffix;
}

// ============================================
// SPLITTING UTILITIES
// ============================================

/**
 * Split text into segments at natural boundaries.
 * 
 * Tries to split at (in order of preference):
 * 1. Double newlines (paragraphs)
 * 2. Single newlines
 * 3. Sentences (., !, ?)
 * 4. Words (spaces)
 * 
 * @param text - Text to split
 * @param targetSize - Target size in tokens for each segment
 * @param overlap - Overlap in tokens between segments
 */
export function splitAtBoundaries(
  text: string,
  targetSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): string[] {
  if (!text || text.trim().length === 0) return [];
  
  const tokens = countTokens(text);
  if (tokens <= targetSize) return [text];
  
  const segments: string[] = [];
  const targetChars = Math.floor(targetSize * CHARS_PER_TOKEN);
  const overlapChars = Math.floor(overlap * CHARS_PER_TOKEN);
  
  // Safety: ensure overlap doesn't exceed target (prevents infinite loops)
  const safeOverlapChars = Math.min(overlapChars, Math.floor(targetChars * 0.5));
  
  let startIndex = 0;
  let iterations = 0;
  const maxIterations = Math.ceil(text.length / (targetChars - safeOverlapChars)) + 10;
  
  while (startIndex < text.length && iterations < maxIterations) {
    iterations++;
    
    // Calculate end point
    let endIndex = Math.min(startIndex + targetChars, text.length);
    
    // If not at the end, find a good break point
    if (endIndex < text.length) {
      const searchRegion = text.slice(startIndex, endIndex);
      
      // Try paragraph break
      let breakPoint = searchRegion.lastIndexOf('\n\n');
      
      // Try newline
      if (breakPoint < targetChars * 0.5) {
        breakPoint = searchRegion.lastIndexOf('\n');
      }
      
      // Try sentence end
      if (breakPoint < targetChars * 0.5) {
        const sentenceMatch = searchRegion.match(/([\s\S]*[.!?])\s+/);
        if (sentenceMatch && sentenceMatch[1].length > targetChars * 0.5) {
          breakPoint = sentenceMatch[1].length;
        }
      }
      
      // Try word boundary
      if (breakPoint < targetChars * 0.5) {
        breakPoint = searchRegion.lastIndexOf(' ');
      }
      
      // Use break point if found
      if (breakPoint > targetChars * 0.3) {
        endIndex = startIndex + breakPoint + 1;
      }
    }
    
    // Extract segment
    const segment = text.slice(startIndex, endIndex).trim();
    if (segment.length > 0) {
      segments.push(segment);
    }
    
    // Calculate next start with overlap, ensuring we always make progress
    const nextStart = endIndex - safeOverlapChars;
    startIndex = Math.max(nextStart, startIndex + 1); // Always advance at least 1 char
    
    // If we're near the end and would create a tiny segment, just include it
    if (text.length - startIndex < targetChars * 0.3) {
      const remaining = text.slice(startIndex).trim();
      if (remaining.length > 0 && remaining !== segments[segments.length - 1]) {
        segments.push(remaining);
      }
      break;
    }
  }
  
  return segments;
}

/**
 * Calculate the approximate token overlap between two consecutive segments.
 * 
 * Useful for verifying chunking is working correctly.
 */
export function calculateOverlap(segment1: string, segment2: string): number {
  // Find the longest common suffix/prefix
  const maxCheckLength = Math.min(segment1.length, segment2.length, 500);
  
  for (let len = maxCheckLength; len > 0; len--) {
    const suffix = segment1.slice(-len);
    if (segment2.startsWith(suffix)) {
      return countTokens(suffix);
    }
  }
  
  return 0;
}

