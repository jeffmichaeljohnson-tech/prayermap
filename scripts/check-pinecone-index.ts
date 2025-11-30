#!/usr/bin/env node
/**
 * Check available Pinecone indexes
 */

import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

async function main() {
  if (!PINECONE_API_KEY) {
    console.error("ERROR: PINECONE_API_KEY environment variable not set");
    process.exit(1);
  }

  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  
  console.log("Fetching available indexes...");
  const indexes = await pinecone.listIndexes();
  
  console.log("\nAvailable indexes:");
  indexes.indexes?.forEach((index) => {
    console.log(`- ${index.name} (dimension: ${index.dimension})`);
  });
  
  if (!indexes.indexes || indexes.indexes.length === 0) {
    console.log("\nNo indexes found. You may need to create one first.");
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

