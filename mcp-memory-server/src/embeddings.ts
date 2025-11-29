/**
 * OpenAI Embeddings integration
 */

import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client
 */
export function initOpenAI(apiKey: string): void {
  openaiClient = new OpenAI({ apiKey });
}

/**
 * Generate embeddings for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Call initOpenAI first.");
  }

  // Truncate text if too long (OpenAI has token limits)
  const maxChars = 8000; // Approximately 2000 tokens
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) + "..." : text;

  const response = await openaiClient.embeddings.create({
    model: "text-embedding-3-small",
    input: truncatedText,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(
  texts: string[],
  batchSize: number = 100
): Promise<number[][]> {
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Call initOpenAI first.");
  }

  const allEmbeddings: number[][] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    // Truncate texts
    const truncatedBatch = batch.map((text) => {
      const maxChars = 8000;
      return text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
    });

    const response = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
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
}

/**
 * Create a combined embedding for a conversation turn (user + assistant)
 */
export async function generateConversationEmbedding(
  userMessage: string,
  assistantMessage: string
): Promise<number[]> {
  // Combine user and assistant messages for context
  const combined = `User: ${userMessage}\n\nAssistant: ${assistantMessage}`;
  return generateEmbedding(combined);
}
