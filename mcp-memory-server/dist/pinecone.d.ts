/**
 * Pinecone vector database integration with enriched metadata
 */
import { ConversationMessage } from "./parsers.js";
import { EnrichedMetadata } from "./tagging.js";
export interface VectorMetadata extends EnrichedMetadata {
}
/**
 * Initialize Pinecone client and index
 */
export declare function initPinecone(apiKey: string, indexName: string): Promise<void>;
/**
 * Upsert conversation messages to Pinecone with enriched metadata
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
 * Query with advanced filters
 */
export declare function queryWithFilters(embedding: number[], options?: {
    topK?: number;
    topics?: string[];
    sources?: string[];
    projects?: string[];
    dateRange?: {
        start: string;
        end: string;
    };
    messageTypes?: string[];
    hasCode?: boolean;
    hasError?: boolean;
    complexity?: string[];
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
 * Delete vectors by project
 */
export declare function deleteByProject(projectName: string): Promise<void>;
/**
 * Get index statistics
 */
export declare function getIndexStats(): Promise<{
    totalVectors: number;
    dimension: number;
}>;
