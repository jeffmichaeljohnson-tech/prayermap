/**
 * Semantic Chunking Service
 * 
 * Breaks development memory content into optimally-sized, semantically
 * coherent chunks for improved retrieval quality.
 * 
 * Key features:
 * - Data-type specific chunking strategies
 * - Code block preservation
 * - Parent-child relationship tracking
 * - Token-aware splitting
 * 
 * 💭 ➡️ 📈
 */

import {
  countTokens,
  splitAtBoundaries,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from './tokenizer.ts';

// ============================================
// TYPES
// ============================================

export interface Chunk {
  id: string;                    // Unique chunk ID (format: {parent_id}_chunk_{index})
  parent_id: string;             // Reference to parent document
  content: string;               // Chunk text
  chunk_index: number;           // Position in parent (0, 1, 2...)
  total_chunks: number;          // Total chunks in parent
  token_count: number;           // Approximate token count
  metadata: ChunkMetadata;       // Inherited + chunk-specific metadata
}

export interface ChunkMetadata {
  // Inherited from parent
  source: string;
  data_type: string;
  session_date: string;
  project?: string;
  
  // Auto-tagged fields (from Claude Haiku)
  domain?: string;
  action?: string;
  status?: string;
  entities?: string[];
  summary?: string;
  importance?: string;
  
  // Temporal
  timestamp: string;
  week?: string;
  
  // Chunk-specific
  chunk_index: number;
  total_chunks: number;
  is_chunk: boolean;             // Flag to identify chunked vectors
  has_code_block: boolean;
  has_error: boolean;
  has_header: boolean;
  section_title?: string;        // If we can detect it
  
  // Preview for Pinecone metadata (500 chars max)
  content_preview: string;
}

export interface ChunkingConfig {
  target_size: number;           // Target chunk size in tokens
  overlap: number;               // Overlap between chunks in tokens
  preserve_code_blocks: boolean; // Keep code blocks together
  preserve_errors: boolean;      // Keep error messages together
  min_chunk_size: number;        // Minimum chunk size (don't create tiny chunks)
}

export interface ParentMetadata {
  source: string;
  data_type: string;
  session_date: string;
  project?: string;
  domain?: string;
  action?: string;
  status?: string;
  entities?: string[];
  summary?: string;
  importance?: string;
  timestamp: string;
  week?: string;
  [key: string]: unknown;
}

// ============================================
// CHUNKING STRATEGIES BY DATA TYPE
// ============================================

const CHUNKING_CONFIGS: Record<string, ChunkingConfig> = {
  // Session transcripts: semantic chunking, preserve code blocks
  session: {
    target_size: 512,
    overlap: 50,
    preserve_code_blocks: true,
    preserve_errors: true,
    min_chunk_size: 100,
  },
  
  // Code files: respect function/class boundaries
  // TUNED 2025-12-04: Increased target_size to reduce mid-function splits
  code: {
    target_size: 1500,        // Was 1024 - larger to fit more complete functions
    overlap: 0,               // No overlap for code - functions are atomic
    preserve_code_blocks: true,
    preserve_errors: false,
    min_chunk_size: 100,      // Was 50 - increase to avoid tiny chunks
  },
  
  // Deployment logs: smaller chunks, timestamp awareness
  deployment: {
    target_size: 256,
    overlap: 25,
    preserve_code_blocks: false,
    preserve_errors: true,
    min_chunk_size: 50,
  },
  
  // Learning notes: semantic + header awareness
  // TUNED 2025-12-04: Increased min_chunk_size to reduce orphaned chunks
  learning: {
    target_size: 512,
    overlap: 50,
    preserve_code_blocks: true,
    preserve_errors: false,
    min_chunk_size: 150,      // Was 100 - increase to merge small trailing chunks
  },
  
  // Error logs: keep errors together, more overlap
  error: {
    target_size: 512,
    overlap: 100,             // More overlap for context
    preserve_code_blocks: true,
    preserve_errors: true,
    min_chunk_size: 100,
  },
  
  // Config files: smaller, no overlap
  config: {
    target_size: 256,
    overlap: 0,
    preserve_code_blocks: true,
    preserve_errors: false,
    min_chunk_size: 50,
  },
  
  // System snapshots: larger chunks
  system_snapshot: {
    target_size: 1024,
    overlap: 100,
    preserve_code_blocks: true,
    preserve_errors: true,
    min_chunk_size: 200,
  },
  
  // Metrics: small, atomic chunks
  metric: {
    target_size: 256,
    overlap: 0,
    preserve_code_blocks: false,
    preserve_errors: false,
    min_chunk_size: 50,
  },
  
  // Default fallback
  default: {
    target_size: DEFAULT_CHUNK_SIZE,
    overlap: DEFAULT_CHUNK_OVERLAP,
    preserve_code_blocks: true,
    preserve_errors: true,
    min_chunk_size: 100,
  },
};

// ============================================
// CONTENT ANALYSIS
// ============================================

/**
 * Detect if a segment contains a code block.
 */
function hasCodeBlock(text: string): boolean {
  // Markdown code fences
  if (/```[\s\S]*```/.test(text)) return true;
  
  // Indented code (4+ spaces at start of multiple lines)
  if (/\n {4,}\S.*\n {4,}\S/.test(text)) return true;
  
  // Common code patterns
  if (/function\s+\w+\s*\(/.test(text)) return true;
  if (/class\s+\w+/.test(text)) return true;
  if (/const\s+\w+\s*=/.test(text)) return true;
  if (/import\s+.*from/.test(text)) return true;
  
  return false;
}

/**
 * Detect if a segment contains an error message.
 */
function hasError(text: string): boolean {
  const errorPatterns = [
    /error:/i,
    /exception:/i,
    /failed:/i,
    /failure:/i,
    /stack\s*trace/i,
    /at\s+\w+\.\w+\s*\(/,  // Stack trace line pattern
    /TypeError|ReferenceError|SyntaxError|Error/,
    /ERR_|ENOENT|EACCES/,
  ];
  
  return errorPatterns.some(pattern => pattern.test(text));
}

/**
 * Detect if a segment starts with a header.
 */
function hasHeader(text: string): boolean {
  // Markdown headers
  if (/^#{1,6}\s+\S/.test(text)) return true;
  
  // Underlined headers
  if (/^\S.*\n[=-]+\s*$/.test(text)) return true;
  
  return false;
}

/**
 * Extract section title from text if present.
 */
function extractSectionTitle(text: string): string | undefined {
  // Markdown header
  const mdMatch = text.match(/^(#{1,6})\s+(.+?)(?:\n|$)/);
  if (mdMatch) return mdMatch[2].trim().slice(0, 100);
  
  // Underlined header
  const underlineMatch = text.match(/^(.+?)\n[=-]+\s*$/m);
  if (underlineMatch) return underlineMatch[1].trim().slice(0, 100);
  
  return undefined;
}

// ============================================
// SPECIAL BLOCK EXTRACTION
// ============================================

/**
 * Extract code blocks from text, returning both blocks and remaining text.
 */
function extractCodeBlocks(text: string): { blocks: string[]; remaining: string } {
  const blocks: string[] = [];
  
  // Extract fenced code blocks
  let remaining = text.replace(/```[\s\S]*?```/g, (match) => {
    blocks.push(match);
    return '\n[CODE_BLOCK_PLACEHOLDER]\n';
  });
  
  return { blocks, remaining };
}

/**
 * Extract error blocks (stack traces, error messages).
 */
function extractErrorBlocks(text: string): { blocks: string[]; remaining: string } {
  const blocks: string[] = [];
  
  // Look for error patterns with surrounding context
  // This is a simplified version - real implementation would be more sophisticated
  const errorPattern = /((?:^|\n)(?:Error|TypeError|ReferenceError|SyntaxError|Exception|Failed|FATAL)[^\n]*(?:\n(?:\s+at\s+[^\n]+|\s{2,}[^\n]+))*)/gi;
  
  const remaining = text.replace(errorPattern, (match) => {
    if (match.trim().length > 50) { // Only preserve substantial error blocks
      blocks.push(match.trim());
      return '\n[ERROR_BLOCK_PLACEHOLDER]\n';
    }
    return match;
  });
  
  return { blocks, remaining };
}

// ============================================
// MAIN CHUNKING FUNCTION
// ============================================

/**
 * Get the chunking configuration for a data type.
 */
export function getChunkingConfig(dataType: string): ChunkingConfig {
  return CHUNKING_CONFIGS[dataType] || CHUNKING_CONFIGS.default;
}

/**
 * Chunk content based on data type.
 * 
 * @param content - Raw content to chunk
 * @param parentId - ID for the parent document
 * @param parentMetadata - Metadata from parent (source, data_type, etc.)
 * @returns Array of chunks with metadata
 */
export function chunkContent(
  content: string,
  parentId: string,
  parentMetadata: ParentMetadata
): Chunk[] {
  if (!content || content.trim().length === 0) {
    return [];
  }
  
  const config = getChunkingConfig(parentMetadata.data_type);
  const contentTokens = countTokens(content);
  
  // If content is small enough, return as single chunk
  if (contentTokens <= config.target_size) {
    return [createChunk(content, parentId, 0, 1, parentMetadata)];
  }
  
  // Extract special blocks if configured to preserve them
  let processedContent = content;
  const preservedBlocks: { type: 'code' | 'error'; content: string }[] = [];
  
  if (config.preserve_code_blocks) {
    const { blocks, remaining } = extractCodeBlocks(processedContent);
    blocks.forEach(block => preservedBlocks.push({ type: 'code', content: block }));
    processedContent = remaining;
  }
  
  if (config.preserve_errors) {
    const { blocks, remaining } = extractErrorBlocks(processedContent);
    blocks.forEach(block => preservedBlocks.push({ type: 'error', content: block }));
    processedContent = remaining;
  }
  
  // Split remaining content at natural boundaries
  const segments = splitAtBoundaries(
    processedContent,
    config.target_size,
    config.overlap
  );
  
  // Reintegrate preserved blocks
  // Strategy: Add preserved blocks as separate chunks, or merge with adjacent small chunks
  const allSegments: string[] = [];
  let placeholderIndex = 0;
  
  for (const segment of segments) {
    if (segment.includes('[CODE_BLOCK_PLACEHOLDER]') || segment.includes('[ERROR_BLOCK_PLACEHOLDER]')) {
      // Replace placeholders with actual blocks
      let processedSegment = segment;
      while (
        (processedSegment.includes('[CODE_BLOCK_PLACEHOLDER]') ||
         processedSegment.includes('[ERROR_BLOCK_PLACEHOLDER]')) &&
        placeholderIndex < preservedBlocks.length
      ) {
        const placeholder = processedSegment.includes('[CODE_BLOCK_PLACEHOLDER]')
          ? '[CODE_BLOCK_PLACEHOLDER]'
          : '[ERROR_BLOCK_PLACEHOLDER]';
        processedSegment = processedSegment.replace(
          placeholder,
          preservedBlocks[placeholderIndex].content
        );
        placeholderIndex++;
      }
      allSegments.push(processedSegment);
    } else {
      allSegments.push(segment);
    }
  }
  
  // Add any remaining preserved blocks as separate chunks
  while (placeholderIndex < preservedBlocks.length) {
    allSegments.push(preservedBlocks[placeholderIndex].content);
    placeholderIndex++;
  }
  
  // Filter out chunks that are too small
  const filteredSegments = allSegments.filter(
    segment => countTokens(segment) >= config.min_chunk_size
  );
  
  // Merge very small trailing chunks with previous
  const mergedSegments: string[] = [];
  for (const segment of filteredSegments) {
    if (
      mergedSegments.length > 0 &&
      countTokens(segment) < config.min_chunk_size &&
      countTokens(mergedSegments[mergedSegments.length - 1]) < config.target_size * 0.7
    ) {
      // Merge with previous
      mergedSegments[mergedSegments.length - 1] += '\n\n' + segment;
    } else {
      mergedSegments.push(segment);
    }
  }
  
  // Create chunks
  const totalChunks = mergedSegments.length;
  return mergedSegments.map((segment, index) =>
    createChunk(segment, parentId, index, totalChunks, parentMetadata)
  );
}

/**
 * Create a single chunk with full metadata.
 */
function createChunk(
  content: string,
  parentId: string,
  chunkIndex: number,
  totalChunks: number,
  parentMetadata: ParentMetadata
): Chunk {
  const chunkId = `${parentId}_chunk_${chunkIndex}`;
  
  const metadata: ChunkMetadata = {
    // Inherited from parent
    source: parentMetadata.source,
    data_type: parentMetadata.data_type,
    session_date: parentMetadata.session_date,
    project: parentMetadata.project,
    domain: parentMetadata.domain,
    action: parentMetadata.action,
    status: parentMetadata.status,
    entities: parentMetadata.entities,
    summary: parentMetadata.summary,
    importance: parentMetadata.importance,
    timestamp: parentMetadata.timestamp,
    week: parentMetadata.week,
    
    // Chunk-specific
    chunk_index: chunkIndex,
    total_chunks: totalChunks,
    is_chunk: true,
    has_code_block: hasCodeBlock(content),
    has_error: hasError(content),
    has_header: hasHeader(content),
    section_title: extractSectionTitle(content),
    
    // Preview for Pinecone (500 chars max)
    content_preview: content.slice(0, 500),
  };
  
  return {
    id: chunkId,
    parent_id: parentId,
    content,
    chunk_index: chunkIndex,
    total_chunks: totalChunks,
    token_count: countTokens(content),
    metadata,
  };
}

// ============================================
// CODE-AWARE CHUNKING (FOR code DATA TYPE)
// ============================================

/**
 * Parse code into function/class blocks for atomic chunking.
 * 
 * This is a simplified version - a full implementation would use
 * a proper AST parser for the specific language.
 */
export function chunkCodeContent(
  content: string,
  parentId: string,
  parentMetadata: ParentMetadata
): Chunk[] {
  // For now, use the standard chunking with code config
  // Future: implement proper AST-based chunking
  return chunkContent(content, parentId, {
    ...parentMetadata,
    data_type: 'code',
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get summary statistics for chunked content.
 */
export interface ChunkStats {
  total_chunks: number;
  total_tokens: number;
  avg_tokens_per_chunk: number;
  min_chunk_tokens: number;
  max_chunk_tokens: number;
  chunks_with_code: number;
  chunks_with_errors: number;
}

export function getChunkStats(chunks: Chunk[]): ChunkStats {
  if (chunks.length === 0) {
    return {
      total_chunks: 0,
      total_tokens: 0,
      avg_tokens_per_chunk: 0,
      min_chunk_tokens: 0,
      max_chunk_tokens: 0,
      chunks_with_code: 0,
      chunks_with_errors: 0,
    };
  }
  
  const tokenCounts = chunks.map(c => c.token_count);
  
  return {
    total_chunks: chunks.length,
    total_tokens: tokenCounts.reduce((a, b) => a + b, 0),
    avg_tokens_per_chunk: Math.round(tokenCounts.reduce((a, b) => a + b, 0) / chunks.length),
    min_chunk_tokens: Math.min(...tokenCounts),
    max_chunk_tokens: Math.max(...tokenCounts),
    chunks_with_code: chunks.filter(c => c.metadata.has_code_block).length,
    chunks_with_errors: chunks.filter(c => c.metadata.has_error).length,
  };
}

/**
 * Reassemble parent content from chunks.
 * 
 * Note: Due to overlap, this may not be identical to original.
 * For exact original, use document_content.full_content.
 */
export function reassembleFromChunks(chunks: Chunk[]): string {
  // Sort by chunk index
  const sorted = [...chunks].sort((a, b) => a.chunk_index - b.chunk_index);
  
  // Simple join - for exact content, use stored full_content
  return sorted.map(c => c.content).join('\n\n---\n\n');
}

