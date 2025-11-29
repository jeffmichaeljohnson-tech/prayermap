/**
 * Pinecone vector database integration with enriched metadata
 */

import { Pinecone, Index } from "@pinecone-database/pinecone";
import { ConversationMessage } from "./parsers.js";
import { analyzeContent, EnrichedMetadata } from "./tagging.js";

let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index | null = null;

// Extended metadata interface for Pinecone storage
export interface VectorMetadata extends EnrichedMetadata {}

/**
 * Initialize Pinecone client and index
 */
export async function initPinecone(apiKey: string, indexName: string): Promise<void> {
  pineconeClient = new Pinecone({ apiKey });
  pineconeIndex = pineconeClient.index(indexName);

  // Verify connection
  const stats = await pineconeIndex.describeIndexStats();
  console.error(`Connected to Pinecone index "${indexName}". Vector count: ${stats.totalRecordCount}`);
}

/**
 * Upsert conversation messages to Pinecone with enriched metadata
 */
export async function upsertConversations(
  messages: ConversationMessage[],
  embeddings: number[][]
): Promise<{ upserted: number; errors: number }> {
  if (!pineconeIndex) {
    throw new Error("Pinecone not initialized. Call initPinecone first.");
  }

  let upserted = 0;
  let errors = 0;

  // Process in batches of 100 (Pinecone limit)
  const batchSize = 100;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batchMessages = messages.slice(i, i + batchSize);
    const batchEmbeddings = embeddings.slice(i, i + batchSize);

    const vectors = batchMessages.map((msg, idx) => {
      // Generate enriched metadata using content analysis
      const enrichedMetadata = analyzeContent(
        msg.content,
        msg.role,
        {
          id: msg.id,
          sessionId: msg.sessionId,
          source: msg.source,
          projectPath: msg.projectPath || "",
          timestamp: msg.timestamp,
          model: msg.model,
        }
      );

      // Convert to Pinecone-compatible format (plain object with primitive values)
      const pineconeMetadata: Record<string, string | number | boolean | string[]> = {
        id: enrichedMetadata.id,
        sessionId: enrichedMetadata.sessionId,
        source: enrichedMetadata.source,
        projectPath: enrichedMetadata.projectPath,
        projectName: enrichedMetadata.projectName,
        timestamp: enrichedMetadata.timestamp,
        date: enrichedMetadata.date,
        week: enrichedMetadata.week,
        month: enrichedMetadata.month,
        quarter: enrichedMetadata.quarter,
        role: enrichedMetadata.role,
        messageType: enrichedMetadata.messageType,
        topics: enrichedMetadata.topics,
        tags: enrichedMetadata.tags,
        tools: enrichedMetadata.tools,
        hasCode: enrichedMetadata.hasCode,
        hasError: enrichedMetadata.hasError,
        complexity: enrichedMetadata.complexity,
        content: enrichedMetadata.content,
        contentLength: enrichedMetadata.contentLength,
      };

      return {
        id: msg.id,
        values: batchEmbeddings[idx],
        metadata: pineconeMetadata,
      };
    });

    try {
      await pineconeIndex.upsert(vectors);
      upserted += vectors.length;

      // Log progress for large batches
      if ((i + batchSize) % 500 === 0 || i + batchSize >= messages.length) {
        console.error(`Upserted ${Math.min(i + batchSize, messages.length)}/${messages.length} vectors...`);
      }
    } catch (error) {
      console.error(`Error upserting batch starting at ${i}:`, error);
      errors += vectors.length;
    }
  }

  return { upserted, errors };
}

/**
 * Query Pinecone for similar conversations
 */
export async function queryConversations(
  embedding: number[],
  options: {
    topK?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter?: Record<string, any>;
    includeMetadata?: boolean;
  } = {}
): Promise<Array<{ id: string; score: number; metadata: VectorMetadata }>> {
  if (!pineconeIndex) {
    throw new Error("Pinecone not initialized. Call initPinecone first.");
  }

  const { topK = 10, filter, includeMetadata = true } = options;

  const results = await pineconeIndex.query({
    vector: embedding,
    topK,
    filter,
    includeMetadata,
  });

  return (results.matches || []).map((match) => ({
    id: match.id,
    score: match.score || 0,
    metadata: (match.metadata as unknown) as VectorMetadata,
  }));
}

/**
 * Query with advanced filters
 */
export async function queryWithFilters(
  embedding: number[],
  options: {
    topK?: number;
    topics?: string[];
    sources?: string[];
    projects?: string[];
    dateRange?: { start: string; end: string };
    messageTypes?: string[];
    hasCode?: boolean;
    hasError?: boolean;
    complexity?: string[];
  } = {}
): Promise<Array<{ id: string; score: number; metadata: VectorMetadata }>> {
  const filter: Record<string, any> = {};

  // Build filter conditions
  if (options.topics && options.topics.length > 0) {
    filter.topics = { $in: options.topics };
  }

  if (options.sources && options.sources.length > 0) {
    filter.source = { $in: options.sources };
  }

  if (options.projects && options.projects.length > 0) {
    filter.projectName = { $in: options.projects };
  }

  if (options.messageTypes && options.messageTypes.length > 0) {
    filter.messageType = { $in: options.messageTypes };
  }

  if (options.hasCode !== undefined) {
    filter.hasCode = { $eq: options.hasCode };
  }

  if (options.hasError !== undefined) {
    filter.hasError = { $eq: options.hasError };
  }

  if (options.complexity && options.complexity.length > 0) {
    filter.complexity = { $in: options.complexity };
  }

  if (options.dateRange) {
    filter.date = {
      $gte: options.dateRange.start,
      $lte: options.dateRange.end,
    };
  }

  return queryConversations(embedding, {
    topK: options.topK || 10,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });
}

/**
 * Delete vectors by session ID
 */
export async function deleteBySessionId(sessionId: string): Promise<void> {
  if (!pineconeIndex) {
    throw new Error("Pinecone not initialized. Call initPinecone first.");
  }

  await pineconeIndex.deleteMany({
    filter: { sessionId: { $eq: sessionId } },
  });
}

/**
 * Delete vectors by project
 */
export async function deleteByProject(projectName: string): Promise<void> {
  if (!pineconeIndex) {
    throw new Error("Pinecone not initialized. Call initPinecone first.");
  }

  await pineconeIndex.deleteMany({
    filter: { projectName: { $eq: projectName } },
  });
}

/**
 * Get index statistics
 */
export async function getIndexStats(): Promise<{
  totalVectors: number;
  dimension: number;
}> {
  if (!pineconeIndex) {
    throw new Error("Pinecone not initialized. Call initPinecone first.");
  }

  const stats = await pineconeIndex.describeIndexStats();

  return {
    totalVectors: stats.totalRecordCount || 0,
    dimension: stats.dimension || 0,
  };
}
