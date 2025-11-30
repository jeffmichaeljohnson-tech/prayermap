/**
 * OpenAI Embeddings integration with LangSmith tracing
 */
import OpenAI from "openai";
import { withTrace, isTracingEnabled } from "./tracing.js";
let openaiClient = null;
/**
 * Initialize OpenAI client
 */
export function initOpenAI(apiKey) {
    openaiClient = new OpenAI({ apiKey });
}
/**
 * Generate embeddings for a single text
 */
export async function generateEmbedding(text) {
    if (!openaiClient) {
        throw new Error("OpenAI client not initialized. Call initOpenAI first.");
    }
    // Truncate text if too long (OpenAI has token limits)
    const maxChars = 8000; // Approximately 2000 tokens
    const truncatedText = text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
    const generateFn = async () => {
        const response = await openaiClient.embeddings.create({
            model: "text-embedding-3-large",
            input: truncatedText,
        });
        return response.data[0].embedding;
    };
    // Wrap with tracing if enabled
    if (isTracingEnabled()) {
        return withTrace("generate_embedding", "embedding", {
            text_length: text.length,
            truncated: text.length > maxChars,
            model: "text-embedding-3-large",
        }, generateFn, { operation: "single_embedding" });
    }
    return generateFn();
}
/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts, batchSize = 100) {
    if (!openaiClient) {
        throw new Error("OpenAI client not initialized. Call initOpenAI first.");
    }
    const generateBatchFn = async () => {
        const allEmbeddings = [];
        // Process in batches to avoid rate limits
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            // Truncate texts
            const truncatedBatch = batch.map((text) => {
                const maxChars = 8000;
                return text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
            });
            const response = await openaiClient.embeddings.create({
                model: "text-embedding-3-large",
                input: truncatedBatch,
            });
            for (const item of response.data) {
                allEmbeddings.push(item.embedding);
            }
            // Small delay between batches to avoid rate limits
            if (i + batchSize < texts.length) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        return allEmbeddings;
    };
    // Wrap with tracing if enabled
    if (isTracingEnabled()) {
        return withTrace("generate_embeddings_batch", "embedding", {
            total_texts: texts.length,
            batch_size: batchSize,
            num_batches: Math.ceil(texts.length / batchSize),
            model: "text-embedding-3-large",
        }, generateBatchFn, { operation: "batch_embedding" });
    }
    return generateBatchFn();
}
/**
 * Create a combined embedding for a conversation turn (user + assistant)
 */
export async function generateConversationEmbedding(userMessage, assistantMessage) {
    // Combine user and assistant messages for context
    const combined = `User: ${userMessage}\n\nAssistant: ${assistantMessage}`;
    return generateEmbedding(combined);
}
