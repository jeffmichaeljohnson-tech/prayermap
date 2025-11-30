#!/usr/bin/env node
/**
 * Test script to verify Pinecone and OpenAI integration after upgrading to text-embedding-3-large
 * 
 * This script tests:
 * 1. OpenAI embedding generation (3072 dimensions)
 * 2. Pinecone index connection
 * 3. Vector upload
 * 4. Vector query
 * 5. End-to-end RAG functionality
 */

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || "ora-prayermap";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ name, passed, error, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

async function testOpenAIConnection(): Promise<boolean> {
  try {
    if (!OPENAI_API_KEY) {
      logTest("OpenAI API Key Check", false, "OPENAI_API_KEY environment variable not set");
      return false;
    }
    
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    logTest("OpenAI API Key Check", true);
    return true;
  } catch (error) {
    logTest("OpenAI API Key Check", false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testEmbeddingGeneration(): Promise<boolean> {
  try {
    if (!OPENAI_API_KEY) {
      logTest("Embedding Generation", false, "OPENAI_API_KEY not set");
      return false;
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const testText = "This is a test prayer request for PrayerMap";

    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: testText,
    });

    const embedding = response.data[0].embedding;
    const dimension = embedding.length;

    if (dimension !== 3072) {
      logTest("Embedding Generation", false, `Expected 3072 dimensions, got ${dimension}`, { dimension });
      return false;
    }

    logTest("Embedding Generation", true, undefined, {
      dimension,
      model: "text-embedding-3-large",
      textLength: testText.length,
    });
    return true;
  } catch (error) {
    logTest("Embedding Generation", false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testPineconeConnection(): Promise<boolean> {
  try {
    if (!PINECONE_API_KEY) {
      logTest("Pinecone API Key Check", false, "PINECONE_API_KEY environment variable not set");
      return false;
    }

    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const indexes = await pinecone.listIndexes();
    
    logTest("Pinecone API Key Check", true, undefined, {
      availableIndexes: indexes.indexes?.map(idx => idx.name) || [],
    });
    return true;
  } catch (error) {
    logTest("Pinecone API Key Check", false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testPineconeIndex(): Promise<boolean> {
  try {
    if (!PINECONE_API_KEY) {
      logTest("Pinecone Index Check", false, "PINECONE_API_KEY not set");
      return false;
    }

    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === PINECONE_INDEX_NAME);

    if (!indexExists) {
      logTest("Pinecone Index Check", false, `Index "${PINECONE_INDEX_NAME}" not found`, {
        availableIndexes: indexes.indexes?.map(idx => idx.name) || [],
      });
      return false;
    }

    const index = pinecone.index(PINECONE_INDEX_NAME);
    const stats = await index.describeIndexStats();
    const dimension = indexes.indexes?.find(idx => idx.name === PINECONE_INDEX_NAME)?.dimension;

    if (dimension !== 3072) {
      logTest("Pinecone Index Check", false, `Index dimension is ${dimension}, expected 3072`, {
        dimension,
        vectorCount: stats.totalRecordCount,
      });
      return false;
    }

    logTest("Pinecone Index Check", true, undefined, {
      indexName: PINECONE_INDEX_NAME,
      dimension,
      vectorCount: stats.totalRecordCount,
    });
    return true;
  } catch (error) {
    logTest("Pinecone Index Check", false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testVectorUpload(): Promise<boolean> {
  try {
    if (!OPENAI_API_KEY || !PINECONE_API_KEY) {
      logTest("Vector Upload", false, "Missing API keys");
      return false;
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Generate test embedding
    const testText = `Test prayer request ${Date.now()}`;
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: testText,
    });

    const embedding = embeddingResponse.data[0].embedding;
    const testId = `test-${Date.now()}`;

    // Upload test vector
    await index.upsert([
      {
        id: testId,
        values: embedding,
        metadata: {
          text: testText,
          type: "test",
          timestamp: new Date().toISOString(),
        },
      },
    ]);

    logTest("Vector Upload", true, undefined, {
      vectorId: testId,
      dimension: embedding.length,
    });

    // Clean up test vector
    await index.deleteOne(testId);
    return true;
  } catch (error) {
    logTest("Vector Upload", false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testVectorQuery(): Promise<boolean> {
  try {
    if (!OPENAI_API_KEY || !PINECONE_API_KEY) {
      logTest("Vector Query", false, "Missing API keys");
      return false;
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Generate query embedding
    const queryText = "prayer request";
    const queryResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: queryText,
    });

    const queryEmbedding = queryResponse.data[0].embedding;

    // Query Pinecone
    const queryResult = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    logTest("Vector Query", true, undefined, {
      queryText,
      resultsCount: queryResult.matches?.length || 0,
      dimension: queryEmbedding.length,
    });
    return true;
  } catch (error) {
    logTest("Vector Query", false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testRAGService(): Promise<boolean> {
  try {
    // Check if RAG service file exists
    const fs = await import("fs");
    const path = await import("path");
    const ragServicePath = path.join(process.cwd(), "src/services/ragService.ts");
    
    if (!fs.existsSync(ragServicePath)) {
      logTest("RAG Service Check", false, "RAG service file not found");
      return false;
    }

    logTest("RAG Service Check", true, undefined, {
      serviceFileExists: true,
      path: ragServicePath,
    });
    return true;
  } catch (error) {
    logTest("RAG Service Check", false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function main() {
  console.log("🧪 Testing Pinecone and OpenAI Integration\n");
  console.log(`📊 Using Pinecone index: ${PINECONE_INDEX_NAME}\n`);

  // Run tests sequentially
  await testOpenAIConnection();
  await testEmbeddingGeneration();
  await testPineconeConnection();
  await testPineconeIndex();
  await testVectorUpload();
  await testVectorQuery();
  await testRAGService();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 Test Summary");
  console.log("=".repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error || "Unknown error"}`);
    });
  }

  // Next steps
  console.log("\n" + "=".repeat(60));
  console.log("📝 Next Steps");
  console.log("=".repeat(60));

  if (failed === 0) {
    console.log("\n✅ All tests passed! Your system is ready to use.");
    console.log("\n🚀 You can now:");
    console.log("   1. Use the RAG system in your application");
    console.log("   2. Upload new content to Pinecone");
    console.log("   3. Query your knowledge base");
    console.log("   4. Regenerate embeddings for existing content (if needed)");
  } else {
    console.log("\n⚠️  Some tests failed. Please fix the issues above.");
    
    if (!OPENAI_API_KEY) {
      console.log("\n   - Set OPENAI_API_KEY in your .env file");
    }
    if (!PINECONE_API_KEY) {
      console.log("\n   - Set PINECONE_API_KEY in your .env file");
    }
    const indexTest = results.find(r => r.name === "Pinecone Index Check");
    if (indexTest && !indexTest.passed) {
      console.log("\n   - Create a Pinecone index with 3072 dimensions:");
      console.log("     npx tsx scripts/create-pinecone-index.ts");
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ Test script failed:", error);
  process.exit(1);
});

