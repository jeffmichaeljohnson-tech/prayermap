#!/usr/bin/env node
/**
 * Manual ingestion script for conversation summary
 * Ingests the research workflow hierarchy fix conversation into Pinecone
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Import from memory server (using relative paths from project root)
import { initOpenAI, generateEmbedding } from "../mcp-memory-server/dist/embeddings.js";
import { initPinecone, upsertConversations } from "../mcp-memory-server/dist/pinecone.js";
import { analyzeContent } from "../mcp-memory-server/dist/tagging.js";
import type { ConversationMessage } from "../mcp-memory-server/dist/parsers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
// Use the index name from .mcp.json: "prayermap-conversations" or check PINECONE_INDEX_NAME
const PINECONE_INDEX = process.env.PINECONE_INDEX || process.env.PINECONE_INDEX_NAME || "prayermap-conversations";

// ConversationMessage type imported from parsers

async function main() {
  // Check environment variables
  if (!OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable not set");
    process.exit(1);
  }

  if (!PINECONE_API_KEY) {
    console.error("ERROR: PINECONE_API_KEY environment variable not set");
    process.exit(1);
  }

  // Read the summary document
  const summaryPath = path.join(__dirname, "../docs/memory/research-workflow-hierarchy-fix-2024-12-01.md");
  
  if (!fs.existsSync(summaryPath)) {
    console.error(`ERROR: Summary file not found at ${summaryPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(summaryPath, "utf-8");

  console.log("Initializing OpenAI and Pinecone...");
  
  // Initialize clients
  initOpenAI(OPENAI_API_KEY);
  await initPinecone(PINECONE_API_KEY, PINECONE_INDEX);

  // Create conversation message
  const timestamp = new Date().toISOString();
  const sessionId = `research-workflow-fix-2024-12-01`;
  const messageId = `msg-${sessionId}-${Date.now()}`;
  
  const projectPath = "/Users/computer/jeffmichaeljohnson-tech/projects/prayermap";

  const message: ConversationMessage = {
    id: messageId,
    sessionId,
    role: "assistant",
    content: content,
    source: "cursor",
    projectPath,
    timestamp,
    model: "claude-sonnet-4",
  };

  console.log("Generating embedding...");
  
  // Generate embedding
  const embedding = await generateEmbedding(content);

  console.log("Analyzing content and creating metadata...");
  
  // Create enriched metadata
  const enrichedMetadata = analyzeContent(
    content,
    "assistant",
    {
      id: message.id,
      sessionId: message.sessionId,
      source: message.source,
      projectPath: message.projectPath,
      timestamp: message.timestamp,
      model: message.model,
    }
  );

  console.log("Metadata generated:");
  console.log(`- Topics: ${enrichedMetadata.topics.join(", ")}`);
  console.log(`- Message Type: ${enrichedMetadata.messageType}`);
  console.log(`- Tags: ${enrichedMetadata.tags.slice(0, 5).join(", ")}...`);
  console.log(`- Complexity: ${enrichedMetadata.complexity}`);

  console.log("\nUpserting to Pinecone...");
  
  // Upsert to Pinecone
  const result = await upsertConversations([message], [embedding]);

  console.log("\n✅ Successfully ingested conversation summary!");
  console.log(`- Upserted: ${result.upserted} vector(s)`);
  console.log(`- Errors: ${result.errors}`);
  console.log(`- Vector ID: ${messageId}`);
  console.log(`- Session ID: ${sessionId}`);
  
  console.log("\nYou can now search for this conversation using:");
  console.log(`memory_search({ query: "research workflow hierarchy fix", project: "prayermap" })`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

