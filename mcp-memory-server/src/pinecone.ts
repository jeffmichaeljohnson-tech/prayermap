/**
 * Pinecone vector database integration
 */

import { Pinecone, Index } from "@pinecone-database/pinecone";
import { ConversationMessage } from "./parsers.js";

let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index | null = null;

export interface VectorMetadata {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  source: string;
  sessionId: string;
  projectPath?: string;
  model?: string;
}

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
 * Upsert conversation messages to Pinecone
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

    const vectors = batchMessages.map((msg, idx) => ({
      id: msg.id,
      values: batchEmbeddings[idx],
      metadata: {
        role: msg.role,
        content: truncateContent(msg.content, 1000), // Pinecone metadata size limit
        timestamp: msg.timestamp,
        source: msg.source,
        sessionId: msg.sessionId,
        projectPath: msg.projectPath || "",
        model: msg.model || "",
      },
    }));

    try {
      await pineconeIndex.upsert(vectors);
      upserted += vectors.length;
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

/**
 * Truncate content to fit metadata size limits
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength - 3) + "...";
}
