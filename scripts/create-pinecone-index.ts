#!/usr/bin/env node
/**
 * Create Pinecone index if it doesn't exist
 */

import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX || "ora-prayermap";
const DIMENSION = 3072; // OpenAI text-embedding-3-large dimension

async function main() {
  if (!PINECONE_API_KEY) {
    console.error("ERROR: PINECONE_API_KEY environment variable not set");
    process.exit(1);
  }

  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  
  console.log(`Checking if index "${INDEX_NAME}" exists...`);
  
  const indexes = await pinecone.listIndexes();
  const exists = indexes.indexes?.some(idx => idx.name === INDEX_NAME);
  
  if (exists) {
    console.log(`✅ Index "${INDEX_NAME}" already exists!`);
    return;
  }
  
  console.log(`Creating index "${INDEX_NAME}" with dimension ${DIMENSION}...`);
  
  await pinecone.createIndex({
    name: INDEX_NAME,
    dimension: DIMENSION,
    metric: "cosine",
    spec: {
      serverless: {
        cloud: "aws",
        region: "us-east-1"
      }
    }
  });
  
  console.log(`✅ Index "${INDEX_NAME}" created successfully!`);
  console.log("Note: It may take a few minutes for the index to be ready.");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

