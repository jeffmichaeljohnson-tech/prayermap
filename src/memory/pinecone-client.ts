/**
 * Pinecone Client Service for PrayerMap Memory System
 * Handles all interactions with Pinecone vector database
 */

import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import type { AgentMemoryEntry, QueryFilter } from './types';

/**
 * Pinecone configuration
 */
const PINECONE_INDEX_NAME = 'prayermap-agent-memory';
const PINECONE_NAMESPACE = 'memories';
const EMBEDDING_DIMENSION = 3072; // OpenAI text-embedding-3-large dimension
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Pinecone client singleton
 */
class PineconeClient {
  private pinecone: Pinecone | null = null;
  private indexName: string = PINECONE_INDEX_NAME;
  private namespace: string = PINECONE_NAMESPACE;

  /**
   * Initialize Pinecone client
   */
  async initialize(): Promise<void> {
    if (this.pinecone) {
      return; // Already initialized
    }

    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }

    try {
      this.pinecone = new Pinecone({
        apiKey,
      });

      // Verify index exists
      await this.verifyIndex();
    } catch (error) {
      console.error('Failed to initialize Pinecone client:', error);
      throw new Error(`Pinecone initialization failed: ${error}`);
    }
  }

  /**
   * Verify that the index exists, create if it doesn't
   */
  private async verifyIndex(): Promise<void> {
    if (!this.pinecone) {
      throw new Error('Pinecone client not initialized');
    }

    try {
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(
        (index) => index.name === this.indexName
      );

      if (!indexExists) {
        console.warn(`Index ${this.indexName} does not exist. Please create it in Pinecone dashboard.`);
        console.warn(`Recommended settings: dimension=${EMBEDDING_DIMENSION}, metric=cosine`);
        throw new Error(`Index ${this.indexName} not found`);
      }
    } catch (error) {
      console.error('Failed to verify index:', error);
      throw error;
    }
  }

  /**
   * Get the Pinecone index
   */
  private getIndex() {
    if (!this.pinecone) {
      throw new Error('Pinecone client not initialized. Call initialize() first.');
    }
    return this.pinecone.index(this.indexName);
  }

  /**
   * Retry logic wrapper
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${i + 1}/${retries} failed:`, error);

        if (i < retries - 1) {
          // Wait before retrying (exponential backoff)
          const delay = RETRY_DELAY_MS * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Operation failed after ${retries} attempts: ${lastError?.message}`);
  }

  /**
   * Convert AgentMemoryEntry to Pinecone metadata
   */
  private entryToMetadata(entry: AgentMemoryEntry): RecordMetadata {
    return {
      session_id: entry.session_id,
      agent_role: entry.agent_role,
      timestamp: entry.timestamp.toISOString(),
      entry_type: entry.entry_type,
      status: entry.status,
      content: entry.content,
      files_touched: JSON.stringify(entry.files_touched),
      tags: JSON.stringify(entry.tags),
      domain: entry.domain,
      related_domains: entry.related_domains ? JSON.stringify(entry.related_domains) : undefined,
      related_entries: entry.related_entries ? JSON.stringify(entry.related_entries) : undefined,
      parent_id: entry.parent_id,
      importance: entry.importance,
      auto_include: entry.auto_include,
      expires_at: entry.expires_at?.toISOString(),
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
    };
  }

  /**
   * Convert Pinecone metadata to AgentMemoryEntry
   */
  private metadataToEntry(id: string, metadata: RecordMetadata): AgentMemoryEntry {
    return {
      id,
      session_id: metadata.session_id as string,
      agent_role: metadata.agent_role as any,
      timestamp: new Date(metadata.timestamp as string),
      entry_type: metadata.entry_type as any,
      status: metadata.status as any,
      content: metadata.content as string,
      files_touched: JSON.parse(metadata.files_touched as string || '[]'),
      tags: JSON.parse(metadata.tags as string || '[]'),
      domain: metadata.domain as any,
      related_domains: metadata.related_domains ? JSON.parse(metadata.related_domains as string) : undefined,
      related_entries: metadata.related_entries ? JSON.parse(metadata.related_entries as string) : undefined,
      parent_id: metadata.parent_id as string | undefined,
      importance: metadata.importance as number | undefined,
      auto_include: metadata.auto_include as boolean | undefined,
      expires_at: metadata.expires_at ? new Date(metadata.expires_at as string) : undefined,
      metadata: metadata.metadata ? JSON.parse(metadata.metadata as string) : undefined,
    };
  }

  /**
   * Upsert a memory entry into Pinecone
   */
  async upsertMemory(entry: AgentMemoryEntry): Promise<void> {
    await this.initialize();

    if (!entry.embedding || entry.embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(`Invalid embedding: expected dimension ${EMBEDDING_DIMENSION}`);
    }

    const index = this.getIndex();
    const metadata = this.entryToMetadata(entry);

    await this.withRetry(async () => {
      await index.namespace(this.namespace).upsert([
        {
          id: entry.id,
          values: entry.embedding!,
          metadata,
        },
      ]);
    });
  }

  /**
   * Batch upsert multiple memory entries
   */
  async upsertMemories(entries: AgentMemoryEntry[]): Promise<void> {
    await this.initialize();

    if (entries.length === 0) {
      return;
    }

    const index = this.getIndex();
    const records = entries.map((entry) => {
      if (!entry.embedding || entry.embedding.length !== EMBEDDING_DIMENSION) {
        throw new Error(`Invalid embedding for entry ${entry.id}: expected dimension ${EMBEDDING_DIMENSION}`);
      }

      return {
        id: entry.id,
        values: entry.embedding,
        metadata: this.entryToMetadata(entry),
      };
    });

    // Pinecone recommends batches of 100
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await this.withRetry(async () => {
        await index.namespace(this.namespace).upsert(batch);
      });
    }
  }

  /**
   * Query by vector similarity
   */
  async queryByVector(
    vector: number[],
    limit: number = 10,
    filter?: QueryFilter
  ): Promise<AgentMemoryEntry[]> {
    await this.initialize();

    if (vector.length !== EMBEDDING_DIMENSION) {
      throw new Error(`Invalid vector dimension: expected ${EMBEDDING_DIMENSION}, got ${vector.length}`);
    }

    const index = this.getIndex();
    const pineconeFilter = this.buildPineconeFilter(filter);

    const results = await this.withRetry(async () => {
      return await index.namespace(this.namespace).query({
        vector,
        topK: limit,
        includeMetadata: true,
        filter: pineconeFilter,
      });
    });

    return results.matches
      ?.filter((match) => match.metadata)
      .map((match) => this.metadataToEntry(match.id, match.metadata!)) || [];
  }

  /**
   * Query by metadata only (no vector)
   */
  async queryByMetadata(
    filter: QueryFilter,
    limit: number = 100
  ): Promise<AgentMemoryEntry[]> {
    await this.initialize();

    const index = this.getIndex();
    const pineconeFilter = this.buildPineconeFilter(filter);

    // Create a zero vector for metadata-only search
    const zeroVector = new Array(EMBEDDING_DIMENSION).fill(0);

    const results = await this.withRetry(async () => {
      return await index.namespace(this.namespace).query({
        vector: zeroVector,
        topK: limit,
        includeMetadata: true,
        filter: pineconeFilter,
      });
    });

    return results.matches
      ?.filter((match) => match.metadata)
      .map((match) => this.metadataToEntry(match.id, match.metadata!)) || [];
  }

  /**
   * Build Pinecone filter from QueryFilter
   */
  private buildPineconeFilter(filter?: QueryFilter): Record<string, any> | undefined {
    if (!filter) {
      return undefined;
    }

    const pineconeFilter: Record<string, any> = {};

    if (filter.agent_role) {
      pineconeFilter.agent_role = Array.isArray(filter.agent_role)
        ? { $in: filter.agent_role }
        : filter.agent_role;
    }

    if (filter.entry_type) {
      pineconeFilter.entry_type = Array.isArray(filter.entry_type)
        ? { $in: filter.entry_type }
        : filter.entry_type;
    }

    if (filter.domain) {
      pineconeFilter.domain = Array.isArray(filter.domain)
        ? { $in: filter.domain }
        : filter.domain;
    }

    if (filter.status) {
      pineconeFilter.status = Array.isArray(filter.status)
        ? { $in: filter.status }
        : filter.status;
    }

    if (filter.session_id) {
      pineconeFilter.session_id = filter.session_id;
    }

    if (filter.min_importance !== undefined) {
      pineconeFilter.importance = { $gte: filter.min_importance };
    }

    if (filter.auto_include_only) {
      pineconeFilter.auto_include = true;
    }

    // Note: Pinecone has limitations on complex filters
    // Tags and files filtering may need to be done post-query

    return Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined;
  }

  /**
   * Delete a memory entry
   */
  async deleteMemory(id: string): Promise<void> {
    await this.initialize();

    const index = this.getIndex();

    await this.withRetry(async () => {
      await index.namespace(this.namespace).deleteOne(id);
    });
  }

  /**
   * Delete multiple memory entries
   */
  async deleteMemories(ids: string[]): Promise<void> {
    await this.initialize();

    if (ids.length === 0) {
      return;
    }

    const index = this.getIndex();

    await this.withRetry(async () => {
      await index.namespace(this.namespace).deleteMany(ids);
    });
  }

  /**
   * Delete all memories in a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.initialize();

    const index = this.getIndex();

    await this.withRetry(async () => {
      await index.namespace(this.namespace).deleteMany({
        session_id: sessionId,
      });
    });
  }

  /**
   * Fetch a specific memory by ID
   */
  async fetchMemory(id: string): Promise<AgentMemoryEntry | null> {
    await this.initialize();

    const index = this.getIndex();

    const result = await this.withRetry(async () => {
      return await index.namespace(this.namespace).fetch([id]);
    });

    const record = result.records?.[id];
    if (!record || !record.metadata) {
      return null;
    }

    return this.metadataToEntry(id, record.metadata);
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<any> {
    await this.initialize();

    const index = this.getIndex();

    return await this.withRetry(async () => {
      return await index.describeIndexStats();
    });
  }
}

// Export singleton instance
export const pineconeClient = new PineconeClient();
