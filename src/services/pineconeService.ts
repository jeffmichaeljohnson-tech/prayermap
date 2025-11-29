import { PineconeRecord } from '@pinecone-database/pinecone';
import { openai } from '@/lib/openai';

/**
 * MEMORY_LOG:
 * Topic: Intelligent Pinecone Upload System Design
 * Context: Creating comprehensive system to upload conversations and data with intelligent tagging
 * Decision: Multi-layer tagging system with semantic analysis, entity extraction, and context awareness
 * Reasoning: Need to make uploaded data searchable and retrievable across multiple dimensions
 * Architecture:
 *   1. Content chunking with overlap for context preservation
 *   2. Multi-modal embeddings (text + metadata)
 *   3. Hierarchical tagging system
 *   4. Batch processing with retry logic
 *   5. Metadata enrichment with AI analysis
 * Date: 2024-11-29
 */

export interface ConversationData {
  id: string;
  timestamp: Date;
  participants: string[];
  content: string;
  type: 'conversation' | 'document' | 'code' | 'bug_report' | 'feature_request';
  source: 'claude' | 'cursor' | 'github' | 'slack' | 'email' | 'manual';
  metadata?: Record<string, any>;
}

export interface ChunkedContent {
  id: string;
  parentId: string;
  chunkIndex: number;
  content: string;
  overlap: string;
  metadata: ConversationMetadata;
}

export interface ConversationMetadata {
  // Core identification
  conversationId: string;
  timestamp: Date;
  source: string;
  type: string;
  
  // Participants and context
  participants: string[];
  duration?: number;
  messageCount?: number;
  
  // Content analysis
  topics: string[];
  entities: ExtractedEntity[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  
  // Technical tags
  technologies: string[];
  domains: string[];
  codeLanguages: string[];
  
  // Project context
  projectName?: string;
  feature?: string;
  component?: string;
  
  // Semantic tags
  intent: string[];
  outcome?: string;
  decisions?: string[];
  
  // Quality and importance
  importance: 'low' | 'medium' | 'high' | 'critical';
  quality: number; // 0-1 score
  
  // Relationships
  relatedConversations?: string[];
  references?: string[];
  
  // Search optimization
  searchKeywords: string[];
  semanticTags: string[];
}

export interface ExtractedEntity {
  text: string;
  type: 'person' | 'technology' | 'file' | 'function' | 'bug' | 'feature' | 'date' | 'metric';
  confidence: number;
  context?: string;
}

export interface PineconeUploadConfig {
  namespace?: string;
  batchSize: number;
  chunkSize: number;
  chunkOverlap: number;
  enableMetadataEnrichment: boolean;
  retryAttempts: number;
  retryDelay: number;
}

export class IntelligentPineconeUploader {
  private config: PineconeUploadConfig;
  private pinecone: any; // Will be initialized with actual Pinecone client
  
  constructor(config: Partial<PineconeUploadConfig> = {}) {
    this.config = {
      batchSize: 50,
      chunkSize: 1000,
      chunkOverlap: 100,
      enableMetadataEnrichment: true,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Main entry point for uploading conversations to Pinecone
   */
  async uploadConversations(conversations: ConversationData[]): Promise<void> {
    console.log(`📤 Starting upload of ${conversations.length} conversations...`);
    
    try {
      // Process conversations in parallel with rate limiting
      const chunks = await this.processConversationsInBatches(conversations);
      
      // Upload to Pinecone with intelligent batching
      await this.uploadChunksToPinecone(chunks);
      
      console.log(`✅ Successfully uploaded ${chunks.length} chunks from ${conversations.length} conversations`);
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  /**
   * Process conversations into chunks with metadata enrichment
   */
  private async processConversationsInBatches(conversations: ConversationData[]): Promise<ChunkedContent[]> {
    const allChunks: ChunkedContent[] = [];
    
    for (let i = 0; i < conversations.length; i += 10) {
      const batch = conversations.slice(i, i + 10);
      console.log(`🔄 Processing batch ${Math.floor(i/10) + 1}/${Math.ceil(conversations.length/10)}`);
      
      const batchChunks = await Promise.all(
        batch.map(conv => this.processConversation(conv))
      );
      
      allChunks.push(...batchChunks.flat());
    }
    
    return allChunks;
  }

  /**
   * Process a single conversation into chunks with metadata
   */
  private async processConversation(conversation: ConversationData): Promise<ChunkedContent[]> {
    // Step 1: Chunk the content
    const textChunks = this.chunkText(conversation.content);
    
    // Step 2: Analyze conversation for metadata
    const baseMetadata = await this.extractMetadata(conversation);
    
    // Step 3: Create chunks with enriched metadata
    const chunks: ChunkedContent[] = textChunks.map((chunk, index) => ({
      id: `${conversation.id}_chunk_${index}`,
      parentId: conversation.id,
      chunkIndex: index,
      content: chunk.text,
      overlap: chunk.overlap || '',
      metadata: {
        ...baseMetadata,
        // Chunk-specific metadata
        chunkIndex: index,
        totalChunks: textChunks.length,
        chunkSize: chunk.text.length
      }
    }));

    return chunks;
  }

  /**
   * Intelligent text chunking with context preservation
   */
  private chunkText(text: string): Array<{ text: string; overlap?: string }> {
    const chunks: Array<{ text: string; overlap?: string }> = [];
    const words = text.split(/\s+/);
    
    let currentChunk: string[] = [];
    let currentSize = 0;
    
    for (const word of words) {
      // If adding this word would exceed chunk size, finalize current chunk
      if (currentSize + word.length > this.config.chunkSize && currentChunk.length > 0) {
        const chunkText = currentChunk.join(' ');
        
        // Calculate overlap for context preservation
        const overlapWords = Math.min(
          this.config.chunkOverlap / 6, // Rough estimate: 6 chars per word
          currentChunk.length / 4 // Max 25% overlap
        );
        
        const overlap = overlapWords > 0 
          ? currentChunk.slice(-overlapWords).join(' ')
          : '';
        
        chunks.push({ text: chunkText, overlap });
        
        // Start new chunk with overlap
        currentChunk = overlapWords > 0 ? currentChunk.slice(-overlapWords) : [];
        currentSize = currentChunk.join(' ').length;
      }
      
      currentChunk.push(word);
      currentSize += word.length + 1; // +1 for space
    }
    
    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({ text: currentChunk.join(' ') });
    }
    
    return chunks;
  }

  /**
   * Extract comprehensive metadata from conversation using AI analysis
   */
  private async extractMetadata(conversation: ConversationData): Promise<ConversationMetadata> {
    const baseMetadata: ConversationMetadata = {
      conversationId: conversation.id,
      timestamp: conversation.timestamp,
      source: conversation.source,
      type: conversation.type,
      participants: conversation.participants,
      topics: [],
      entities: [],
      sentiment: 'neutral',
      complexity: 'moderate',
      technologies: [],
      domains: [],
      codeLanguages: [],
      intent: [],
      importance: 'medium',
      quality: 0.5,
      searchKeywords: [],
      semanticTags: []
    };

    if (!this.config.enableMetadataEnrichment) {
      return baseMetadata;
    }

    try {
      // Use AI to analyze conversation content
      const analysis = await this.analyzeConversationWithAI(conversation);
      
      return {
        ...baseMetadata,
        ...analysis
      };
    } catch (error) {
      console.warn(`⚠️ Failed to enrich metadata for conversation ${conversation.id}:`, error);
      return baseMetadata;
    }
  }

  /**
   * AI-powered conversation analysis for metadata extraction
   */
  private async analyzeConversationWithAI(conversation: ConversationData): Promise<Partial<ConversationMetadata>> {
    const prompt = `
Analyze this conversation and extract structured metadata:

CONVERSATION:
Type: ${conversation.type}
Source: ${conversation.source}
Participants: ${conversation.participants.join(', ')}
Content: ${conversation.content.slice(0, 3000)}...

Please respond with JSON containing:
{
  "topics": ["array", "of", "main topics discussed"],
  "technologies": ["react", "supabase", "etc"],
  "domains": ["frontend", "backend", "mobile", "etc"],
  "codeLanguages": ["typescript", "sql", "etc"],
  "intent": ["bug_fix", "feature_request", "code_review", "etc"],
  "sentiment": "positive|negative|neutral|mixed",
  "complexity": "simple|moderate|complex|expert",
  "importance": "low|medium|high|critical",
  "quality": 0.85,
  "entities": [
    {"text": "entity name", "type": "technology|person|file|function|bug|feature", "confidence": 0.9}
  ],
  "searchKeywords": ["key", "search", "terms"],
  "semanticTags": ["semantic", "classification", "tags"],
  "outcome": "brief description of resolution or outcome",
  "decisions": ["decision 1", "decision 2"]
}

Focus on accuracy and relevance. Omit fields if uncertain.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from OpenAI');

      // Parse JSON response
      const analysis = JSON.parse(content);
      
      // Validate and sanitize the analysis
      return this.validateAndSanitizeAnalysis(analysis);
    } catch (error) {
      console.warn('AI analysis failed, using basic extraction:', error);
      return this.extractBasicMetadata(conversation);
    }
  }

  /**
   * Validate and sanitize AI analysis results
   */
  private validateAndSanitizeAnalysis(analysis: any): Partial<ConversationMetadata> {
    const sanitized: any = {};
    
    // Validate arrays
    if (Array.isArray(analysis.topics)) sanitized.topics = analysis.topics.slice(0, 10);
    if (Array.isArray(analysis.technologies)) sanitized.technologies = analysis.technologies.slice(0, 15);
    if (Array.isArray(analysis.domains)) sanitized.domains = analysis.domains.slice(0, 10);
    if (Array.isArray(analysis.codeLanguages)) sanitized.codeLanguages = analysis.codeLanguages.slice(0, 10);
    if (Array.isArray(analysis.intent)) sanitized.intent = analysis.intent.slice(0, 5);
    if (Array.isArray(analysis.searchKeywords)) sanitized.searchKeywords = analysis.searchKeywords.slice(0, 20);
    if (Array.isArray(analysis.semanticTags)) sanitized.semanticTags = analysis.semanticTags.slice(0, 15);
    if (Array.isArray(analysis.decisions)) sanitized.decisions = analysis.decisions.slice(0, 5);
    
    // Validate enums
    const validSentiments = ['positive', 'negative', 'neutral', 'mixed'];
    if (validSentiments.includes(analysis.sentiment)) sanitized.sentiment = analysis.sentiment;
    
    const validComplexities = ['simple', 'moderate', 'complex', 'expert'];
    if (validComplexities.includes(analysis.complexity)) sanitized.complexity = analysis.complexity;
    
    const validImportance = ['low', 'medium', 'high', 'critical'];
    if (validImportance.includes(analysis.importance)) sanitized.importance = analysis.importance;
    
    // Validate numbers
    if (typeof analysis.quality === 'number' && analysis.quality >= 0 && analysis.quality <= 1) {
      sanitized.quality = analysis.quality;
    }
    
    // Validate entities
    if (Array.isArray(analysis.entities)) {
      sanitized.entities = analysis.entities
        .filter((e: any) => e.text && e.type && typeof e.confidence === 'number')
        .slice(0, 20);
    }
    
    // Validate strings
    if (typeof analysis.outcome === 'string') sanitized.outcome = analysis.outcome.slice(0, 500);
    
    return sanitized;
  }

  /**
   * Fallback basic metadata extraction without AI
   */
  private extractBasicMetadata(conversation: ConversationData): Partial<ConversationMetadata> {
    const content = conversation.content.toLowerCase();
    
    // Basic keyword extraction
    const technologies = this.extractTechnologies(content);
    const codeLanguages = this.extractCodeLanguages(content);
    const domains = this.extractDomains(content);
    const topics = this.extractBasicTopics(content);
    
    return {
      technologies,
      codeLanguages,
      domains,
      topics,
      searchKeywords: [...technologies, ...codeLanguages, ...topics].slice(0, 20),
      quality: 0.6 // Default quality for basic extraction
    };
  }

  private extractTechnologies(content: string): string[] {
    const techKeywords = [
      'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt',
      'typescript', 'javascript', 'python', 'java', 'go', 'rust',
      'supabase', 'firebase', 'aws', 'vercel', 'netlify',
      'postgresql', 'mongodb', 'redis', 'mysql',
      'docker', 'kubernetes', 'github', 'gitlab',
      'tailwind', 'css', 'sass', 'styled-components',
      'framer-motion', 'three.js', 'mapbox', 'leaflet'
    ];
    
    return techKeywords.filter(tech => content.includes(tech));
  }

  private extractCodeLanguages(content: string): string[] {
    const langPatterns = [
      { lang: 'typescript', patterns: ['typescript', '.ts', '.tsx'] },
      { lang: 'javascript', patterns: ['javascript', '.js', '.jsx'] },
      { lang: 'python', patterns: ['python', '.py', 'def '] },
      { lang: 'sql', patterns: ['sql', 'select ', 'insert ', 'update '] },
      { lang: 'css', patterns: ['css', '.css', 'style'] },
      { lang: 'html', patterns: ['html', '.html', '<div'] },
    ];
    
    return langPatterns
      .filter(({ patterns }) => patterns.some(pattern => content.includes(pattern)))
      .map(({ lang }) => lang);
  }

  private extractDomains(content: string): string[] {
    const domainKeywords = [
      { domain: 'frontend', keywords: ['ui', 'component', 'react', 'vue', 'css'] },
      { domain: 'backend', keywords: ['api', 'server', 'database', 'auth'] },
      { domain: 'mobile', keywords: ['ios', 'android', 'capacitor', 'react native'] },
      { domain: 'devops', keywords: ['docker', 'deploy', 'ci/cd', 'build'] },
      { domain: 'testing', keywords: ['test', 'jest', 'cypress', 'playwright'] }
    ];
    
    return domainKeywords
      .filter(({ keywords }) => keywords.some(keyword => content.includes(keyword)))
      .map(({ domain }) => domain);
  }

  private extractBasicTopics(content: string): string[] {
    const topicKeywords = [
      'authentication', 'authorization', 'security',
      'performance', 'optimization', 'caching',
      'bug fix', 'feature', 'improvement',
      'migration', 'deployment', 'configuration',
      'user interface', 'user experience', 'design'
    ];
    
    return topicKeywords.filter(topic => 
      content.includes(topic.replace(' ', '')) || content.includes(topic)
    );
  }

  /**
   * Upload chunks to Pinecone with embeddings
   */
  private async uploadChunksToPinecone(chunks: ChunkedContent[]): Promise<void> {
    console.log(`📊 Generating embeddings for ${chunks.length} chunks...`);
    
    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += this.config.batchSize) {
      const batch = chunks.slice(i, i + this.config.batchSize);
      console.log(`🚀 Uploading batch ${Math.floor(i/this.config.batchSize) + 1}/${Math.ceil(chunks.length/this.config.batchSize)}`);
      
      try {
        await this.uploadBatchWithRetry(batch);
      } catch (error) {
        console.error(`❌ Failed to upload batch starting at index ${i}:`, error);
        throw error;
      }
    }
  }

  /**
   * Upload a batch of chunks with retry logic
   */
  private async uploadBatchWithRetry(chunks: ChunkedContent[]): Promise<void> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Generate embeddings
        const embeddings = await this.generateEmbeddings(chunks);
        
        // Create Pinecone records
        const records: PineconeRecord[] = chunks.map((chunk, index) => ({
          id: chunk.id,
          values: embeddings[index],
          metadata: {
            content: chunk.content,
            overlap: chunk.overlap,
            ...this.flattenMetadata(chunk.metadata)
          }
        }));
        
        // Upload to Pinecone
        await this.pinecone.upsert(records);
        
        console.log(`✅ Successfully uploaded ${chunks.length} chunks`);
        return;
        
      } catch (error) {
        console.warn(`⚠️ Attempt ${attempt} failed:`, error);
        
        if (attempt === this.config.retryAttempts) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
      }
    }
  }

  /**
   * Generate embeddings for text content
   */
  private async generateEmbeddings(chunks: ChunkedContent[]): Promise<number[][]> {
    const texts = chunks.map(chunk => chunk.content);
    
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Flatten metadata for Pinecone storage (no nested objects)
   */
  private flattenMetadata(metadata: ConversationMetadata): Record<string, any> {
    const flattened: Record<string, any> = {};
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        flattened[key] = JSON.stringify(value);
      } else if (value instanceof Date) {
        flattened[key] = value.toISOString();
      } else if (typeof value === 'object' && value !== null) {
        flattened[key] = JSON.stringify(value);
      } else {
        flattened[key] = value;
      }
    });
    
    return flattened;
  }

  /**
   * Search uploaded conversations by semantic similarity
   */
  async searchConversations(
    query: string, 
    options: {
      topK?: number;
      namespace?: string;
      filter?: Record<string, any>;
      includeMetadata?: boolean;
    } = {}
  ): Promise<any[]> {
    const {
      topK = 10,
      namespace = this.config.namespace,
      filter = {},
      includeMetadata = true
    } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbeddings([{ content: query } as ChunkedContent]);
      
      // Search Pinecone
      const searchResults = await this.pinecone.query({
        vector: queryEmbedding[0],
        topK,
        filter,
        includeMetadata,
        namespace
      });
      
      return searchResults.matches || [];
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }
}

/**
 * Utility functions for conversation data processing
 */
export class ConversationDataUtils {
  /**
   * Load conversations from various sources
   */
  static async loadFromCursor(): Promise<ConversationData[]> {
    // Implementation for loading Cursor conversations
    return [];
  }

  static async loadFromGitHub(repo: string): Promise<ConversationData[]> {
    // Implementation for loading GitHub issues, PRs, discussions
    return [];
  }

  static async loadFromSlack(channel: string): Promise<ConversationData[]> {
    // Implementation for loading Slack conversations
    return [];
  }

  /**
   * Convert various formats to ConversationData
   */
  static fromMarkdown(content: string, metadata: Partial<ConversationData>): ConversationData {
    return {
      id: metadata.id || this.generateId(),
      timestamp: metadata.timestamp || new Date(),
      participants: metadata.participants || ['unknown'],
      content,
      type: metadata.type || 'document',
      source: metadata.source || 'manual',
      metadata: metadata.metadata || {}
    };
  }

  static fromJSON(json: any): ConversationData {
    return {
      id: json.id || this.generateId(),
      timestamp: new Date(json.timestamp),
      participants: json.participants || [],
      content: json.content || '',
      type: json.type || 'conversation',
      source: json.source || 'manual',
      metadata: json.metadata || {}
    };
  }

  private static generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default IntelligentPineconeUploader;