/**
 * RAG (Retrieval-Augmented Generation) Service
 * 
 * Combines semantic search with LLM generation to provide context-aware responses
 * based on PrayerMap's conversation history and documentation.
 * 
 * Architecture:
 * 1. User query → Generate embedding
 * 2. Search Pinecone for relevant context
 * 3. Format context into LLM prompt
 * 4. Generate response with citations
 * 5. Return response + sources
 */

import { openai } from '../lib/openai';
import { IntelligentPineconeUploader } from './pineconeService';
import { withTrace, startTrace, createChildTrace, endTrace, calculateOpenAICost } from '../lib/langsmith';
import type { SearchResult } from '../hooks/usePineconeSearch';

export interface Citation {
  id: string;
  source: string;
  content: string;
  score: number;
  metadata: {
    conversationId?: string;
    timestamp?: string;
    type?: string;
    topics?: string[];
    technologies?: string[];
    [key: string]: any;
  };
}

export interface RAGResponse {
  response: string;
  citations: Citation[];
  sources: SearchResult[];
  metadata: {
    tokensUsed: number;
    latency: number;
    model: string;
    query: string;
    contextChunks: number;
    promptTokens: number;
    completionTokens: number;
  };
}

export interface RAGOptions {
  topK?: number;
  namespace?: string;
  model?: 'gpt-4o' | 'gpt-4-turbo' | 'gpt-4' | 'gpt-3.5-turbo';
  temperature?: number;
  maxTokens?: number;
  includeCitations?: boolean;
  systemPrompt?: string;
  filters?: Record<string, any>;
}

/**
 * Default system prompt for RAG responses
 */
const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant for the PrayerMap project, a location-based spiritual platform for sharing prayer requests.

Your role is to provide accurate, helpful answers based on the provided context from past conversations, documentation, and code discussions.

Guidelines:
- Only use information from the provided context
- If the context doesn't contain enough information, say "I don't have enough information in the provided context to answer this question"
- Cite specific sources when referencing information
- Be concise but thorough
- Focus on practical, actionable answers
- If discussing code, include relevant file paths and function names when available

Format citations as [1], [2], etc. when referencing sources.`;

/**
 * RAG Service Class
 */
class RAGService {
  private uploader: IntelligentPineconeUploader;
  private defaultOptions: Required<Omit<RAGOptions, 'systemPrompt' | 'filters'>>;

  constructor() {
    this.uploader = new IntelligentPineconeUploader({
      batchSize: 10,
      chunkSize: 2000,
      chunkOverlap: 200,
      enableMetadataEnrichment: true,
      retryAttempts: 3,
      retryDelay: 1000
    });

    this.defaultOptions = {
      topK: 10,
      namespace: undefined,
      model: 'gpt-4o', // Upgraded to GPT-4o for superior reasoning
      temperature: 0.7,
      maxTokens: 2000, // Increased for GPT-4's better context handling
      includeCitations: true,
    };
  }

  /**
   * Generate RAG response from user query
   */
  async generateRAGResponse(
    query: string,
    options: RAGOptions = {}
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };

    return withTrace(
      'rag_query',
      'chain',
      'rag',
      {
        query: query.substring(0, 200), // Truncate for trace
        model: opts.model,
        topK: opts.topK,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      },
      async () => {
        // Step 1: Retrieve relevant context from Pinecone
        const contextTrace = await startTrace('retrieve_context', 'retriever', 'rag', {
          query: query.substring(0, 200),
          topK: opts.topK,
        });
        
        const searchResults = await this.retrieveContext(query, opts);
        await endTrace(contextTrace, {
          results_count: searchResults.length,
          top_scores: searchResults.slice(0, 3).map(r => r.score),
        });
        
        if (searchResults.length === 0) {
          return this.createNoContextResponse(query, startTime, opts.model);
        }

        // Step 2: Format context for LLM
        const { formattedContext, citations } = this.formatContext(searchResults, opts.includeCitations);

        // Step 3: Build prompt with context
        const prompt = this.buildRAGPrompt(query, formattedContext, opts.systemPrompt);

        // Step 4: Generate response with LLM
        const llmTrace = await createChildTrace(contextTrace, 'generate_llm_response', 'llm', {
          model: opts.model,
          prompt_tokens_estimate: Math.ceil(formattedContext.length / 4), // Rough estimate
        });
        
        const llmResponse = await this.generateLLMResponse(prompt, opts);
        
        const cost = calculateOpenAICost(
          opts.model,
          llmResponse.usage.prompt_tokens,
          llmResponse.usage.completion_tokens
        );
        
        await endTrace(llmTrace, {
          tokens_used: llmResponse.usage.total_tokens,
          prompt_tokens: llmResponse.usage.prompt_tokens,
          completion_tokens: llmResponse.usage.completion_tokens,
          cost_estimate: cost,
        });

        // Step 5: Extract citations from response
        const extractedCitations = opts.includeCitations
          ? this.extractCitations(llmResponse.content, citations)
          : citations;

        // Step 6: Calculate metadata
        const latency = Date.now() - startTime;
        const metadata = {
          tokensUsed: llmResponse.usage.total_tokens,
          latency,
          model: opts.model,
          query,
          contextChunks: searchResults.length,
          promptTokens: llmResponse.usage.prompt_tokens,
          completionTokens: llmResponse.usage.completion_tokens,
        };

        return {
          response: llmResponse.content,
          citations: extractedCitations,
          sources: searchResults,
          metadata,
        };
      },
      {
        include_citations: opts.includeCitations,
      }
    );
  }

  /**
   * Retrieve relevant context from Pinecone
   */
  private async retrieveContext(
    query: string,
    options: RAGOptions
  ): Promise<SearchResult[]> {
    try {
      const results = await this.uploader.searchConversations(query, {
        topK: options.topK || 10,
        namespace: options.namespace,
        filter: options.filters,
        includeMetadata: true,
      });

      // Format results to match SearchResult interface
      return results.map((result: any) => ({
        id: result.id,
        score: result.score || 0,
        content: result.metadata?.content || result.metadata?.message || '',
        metadata: {
          conversationId: result.metadata?.conversationId || result.metadata?.id,
          timestamp: result.metadata?.timestamp,
          source: result.metadata?.source || 'unknown',
          type: result.metadata?.type || 'conversation',
          participants: result.metadata?.participants || '[]',
          topics: result.metadata?.topics || '[]',
          technologies: result.metadata?.technologies || '[]',
          importance: result.metadata?.importance || 'medium',
          ...result.metadata,
        },
      }));
    } catch (error) {
      console.error('Context retrieval failed:', error);
      return [];
    }
  }

  /**
   * Format context chunks for LLM prompt
   */
  private formatContext(
    results: SearchResult[],
    includeCitations: boolean
  ): { formattedContext: string; citations: Citation[] } {
    const citations: Citation[] = [];
    const contextParts: string[] = [];

    results.forEach((result, index) => {
      const citationNumber = index + 1;
      const citation: Citation = {
        id: result.id,
        source: this.formatSourceName(result.metadata),
        content: result.content.substring(0, 500), // Limit content length
        score: result.score,
        metadata: result.metadata,
      };
      citations.push(citation);

      // Format context chunk with citation marker
      const citationMarker = includeCitations ? `[${citationNumber}]` : '';
      const sourceInfo = this.formatSourceInfo(result.metadata);
      
      contextParts.push(
        `--- Context ${citationNumber} ${citationMarker} ---\n` +
        `Source: ${sourceInfo}\n` +
        `Content: ${result.content}\n`
      );
    });

    return {
      formattedContext: contextParts.join('\n\n'),
      citations,
    };
  }

  /**
   * Format source name for citation
   */
  private formatSourceName(metadata: SearchResult['metadata']): string {
    const parts: string[] = [];

    if (metadata.type) {
      parts.push(metadata.type);
    }

    if (metadata.source && metadata.source !== 'unknown') {
      parts.push(`from ${metadata.source}`);
    }

    if (metadata.timestamp) {
      const date = new Date(metadata.timestamp);
      parts.push(`(${date.toLocaleDateString()})`);
    }

    return parts.length > 0 ? parts.join(' ') : 'Unknown source';
  }

  /**
   * Format source info for context
   */
  private formatSourceInfo(metadata: SearchResult['metadata']): string {
    const parts: string[] = [];

    if (metadata.type) {
      parts.push(`Type: ${metadata.type}`);
    }

    if (metadata.source && metadata.source !== 'unknown') {
      parts.push(`Source: ${metadata.source}`);
    }

    if (metadata.topics) {
      try {
        const topics = typeof metadata.topics === 'string' 
          ? JSON.parse(metadata.topics) 
          : metadata.topics;
        if (Array.isArray(topics) && topics.length > 0) {
          parts.push(`Topics: ${topics.slice(0, 3).join(', ')}`);
        }
      } catch {
        // Ignore parsing errors
      }
    }

    if (metadata.timestamp) {
      const date = new Date(metadata.timestamp);
      parts.push(`Date: ${date.toLocaleDateString()}`);
    }

    return parts.join(' | ');
  }

  /**
   * Build RAG prompt with context
   */
  private buildRAGPrompt(
    query: string,
    context: string,
    customSystemPrompt?: string
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;

    return [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Based on the following context from PrayerMap project conversations and documentation, please answer the question.

If the context doesn't contain enough information to answer the question, please say so clearly.

CONTEXT:
${context}

QUESTION: ${query}

Please provide a helpful answer based on the context above. Include citation numbers [1], [2], etc. when referencing specific sources.`,
      },
    ];
  }

  /**
   * Generate LLM response
   */
  private async generateLLMResponse(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    options: RAGOptions
  ): Promise<{
    content: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }> {
    const model = options.model || 'gpt-4o';
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens || 1000;

    return withTrace(
      'openai_chat_completion',
      'llm',
      'rag',
      {
        model,
        temperature,
        max_tokens: maxTokens,
        messages_count: messages.length,
      },
      async () => {
        const startTime = Date.now();
        const response = await openai.chat.completions.create({
          model,
          messages: messages as any,
          temperature,
          max_tokens: maxTokens,
        });

        const choice = response.choices[0];
        if (!choice || !choice.message) {
          throw new Error('No response from LLM');
        }

        const latency = Date.now() - startTime;
        const cost = calculateOpenAICost(
          model,
          response.usage?.prompt_tokens || 0,
          response.usage?.completion_tokens || 0
        );

        return {
          content: choice.message.content || '',
          usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('LLM generation failed:', error);
      throw error;
    }
  }

  /**
   * Extract citations from LLM response
   */
  private extractCitations(
    response: string,
    availableCitations: Citation[]
  ): Citation[] {
    const citationNumbers = new Set<number>();
    const citationRegex = /\[(\d+)\]/g;
    let match;

    while ((match = citationRegex.exec(response)) !== null) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num <= availableCitations.length) {
        citationNumbers.add(num - 1); // Convert to 0-based index
      }
    }

    return Array.from(citationNumbers)
      .sort()
      .map((index) => availableCitations[index])
      .filter(Boolean);
  }

  /**
   * Create response when no context is found
   */
  private createNoContextResponse(
    query: string,
    startTime: number,
    model: string
  ): RAGResponse {
    const latency = Date.now() - startTime;

    return {
      response: "I don't have enough information in the PrayerMap knowledge base to answer this question. The search didn't return any relevant context.\n\nTry rephrasing your question or asking about a different topic.",
      citations: [],
      sources: [],
      metadata: {
        tokensUsed: 0,
        latency,
        model,
        query,
        contextChunks: 0,
        promptTokens: 0,
        completionTokens: 0,
      },
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate context to fit token budget
   */
  private truncateContext(
    context: string,
    maxTokens: number,
    reservedTokens: number = 500
  ): string {
    const availableTokens = maxTokens - reservedTokens;
    const estimatedTokens = this.estimateTokens(context);

    if (estimatedTokens <= availableTokens) {
      return context;
    }

    // Truncate to fit token budget
    const maxChars = availableTokens * 4;
    return context.substring(0, maxChars) + '\n\n[... context truncated ...]';
  }
}

// Export singleton instance
export const ragService = new RAGService();

// Export for testing
export { RAGService };

