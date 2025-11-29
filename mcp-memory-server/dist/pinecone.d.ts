/**
 * Pinecone vector database integration
 */
import { ConversationMessage } from "./parsers.js";
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
export declare function initPinecone(apiKey: string, indexName: string): Promise<void>;
/**
 * Upsert conversation messages to Pinecone
 */
export declare function upsertConversations(messages: ConversationMessage[], embeddings: number[][]): Promise<{
    upserted: number;
    errors: number;
}>;
/**
 * Query Pinecone for similar conversations
 */
export declare function queryConversations(embedding: number[], options?: {
    topK?: number;
    filter?: Record<string, any>;
    includeMetadata?: boolean;
}): Promise<Array<{
    id: string;
    score: number;
    metadata: VectorMetadata;
}>>;
/**
 * Delete vectors by session ID
 */
export declare function deleteBySessionId(sessionId: string): Promise<void>;
/**
 * Get index statistics
 */
export declare function getIndexStats(): Promise<{
    totalVectors: number;
    dimension: number;
}>;
