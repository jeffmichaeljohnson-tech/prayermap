/**
 * OpenAI Embeddings integration
 */
/**
 * Initialize OpenAI client
 */
export declare function initOpenAI(apiKey: string): void;
/**
 * Generate embeddings for a single text
 */
export declare function generateEmbedding(text: string): Promise<number[]>;
/**
 * Generate embeddings for multiple texts in batch
 */
export declare function generateEmbeddings(texts: string[], batchSize?: number): Promise<number[][]>;
/**
 * Create a combined embedding for a conversation turn (user + assistant)
 */
export declare function generateConversationEmbedding(userMessage: string, assistantMessage: string): Promise<number[]>;
