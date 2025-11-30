#!/usr/bin/env node
/**
 * Analyze index contents to understand what's in there
 * Helps identify project distribution, sources, and content types
 */

import { Pinecone } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || process.env.PINECONE_INDEX || "ora-prayermap";

interface AnalysisResult {
  totalVectors: number;
  projects: Record<string, number>;
  sources: Record<string, number>;
  types: Record<string, number>;
  sampleVectors: Array<{
    id: string;
    project?: string;
    source?: string;
    type?: string;
    hasText: boolean;
  }>;
}

async function analyzeIndex(): Promise<AnalysisResult> {
  if (!PINECONE_API_KEY) {
    console.error("ERROR: PINECONE_API_KEY environment variable not set");
    process.exit(1);
  }

  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pinecone.index(INDEX_NAME);
  
  console.log(`🔍 Analyzing index "${INDEX_NAME}"...\n`);
  
  const stats = await index.describeIndexStats();
  const totalVectors = stats.totalRecordCount || 0;
  
  console.log(`📊 Total vectors: ${totalVectors}`);
  
  if (totalVectors === 0) {
    console.log(`   ⚠️  No vectors found`);
    return {
      totalVectors: 0,
      projects: {},
      sources: {},
      types: {},
      sampleVectors: [],
    };
  }
  
  // Generate zero vector for querying (1536 for old index, 3072 for new)
  // Try both dimensions
  let queryResult;
  try {
    const zeroVector1536 = new Array(1536).fill(0);
    queryResult = await index.query({
      vector: zeroVector1536,
      topK: Math.min(1000, totalVectors),
      includeMetadata: true,
    });
  } catch (error) {
    // Try 3072 dimensions
    try {
      const zeroVector3072 = new Array(3072).fill(0);
      queryResult = await index.query({
        vector: zeroVector3072,
        topK: Math.min(1000, totalVectors),
        includeMetadata: true,
      });
    } catch (e) {
      console.error(`❌ Error querying index:`, error);
      throw error;
    }
  }
  
  const projects: Record<string, number> = {};
  const sources: Record<string, number> = {};
  const types: Record<string, number> = {};
  const sampleVectors: Array<{
    id: string;
    project?: string;
    source?: string;
    type?: string;
    hasText: boolean;
  }> = [];
  
  let prayerMapCount = 0;
  let otherCount = 0;
  
  for (const match of queryResult.matches || []) {
    const metadata = match.metadata || {};
    
    // Extract project info
    const projectName = (metadata.projectName || metadata.project || '').toLowerCase();
    const projectPath = (metadata.projectPath || '').toLowerCase();
    const source = (metadata.source || '').toLowerCase();
    const type = (metadata.type || '').toLowerCase();
    
    // Detect if PrayerMap
    const isPrayerMap = projectName.includes('prayermap') || 
                       projectPath.includes('prayermap') ||
                       source.includes('prayermap') ||
                       match.id.includes('prayermap');
    
    if (isPrayerMap) {
      prayerMapCount++;
      projects['prayermap'] = (projects['prayermap'] || 0) + 1;
    } else {
      otherCount++;
      const detectedProject = projectName || projectPath.split('/').pop() || 'unknown';
      projects[detectedProject] = (projects[detectedProject] || 0) + 1;
    }
    
    if (source) {
      sources[source] = (sources[source] || 0) + 1;
    }
    
    if (type) {
      types[type] = (types[type] || 0) + 1;
    }
    
    // Collect sample vectors
    if (sampleVectors.length < 20) {
      sampleVectors.push({
        id: match.id,
        project: projectName || (isPrayerMap ? 'prayermap' : 'other'),
        source: source || 'unknown',
        type: type || 'unknown',
        hasText: !!(metadata.text || metadata.content || metadata.message),
      });
    }
  }
  
  console.log(`\n📈 Project Distribution:`);
  console.log(`   PrayerMap: ${prayerMapCount} (${((prayerMapCount / queryResult.matches!.length) * 100).toFixed(1)}%)`);
  console.log(`   Other: ${otherCount} (${((otherCount / queryResult.matches!.length) * 100).toFixed(1)}%)`);
  
  if (Object.keys(projects).length > 0) {
    console.log(`\n📁 Projects Found:`);
    Object.entries(projects)
      .sort((a, b) => b[1] - a[1])
      .forEach(([project, count]) => {
        console.log(`   ${project}: ${count}`);
      });
  }
  
  if (Object.keys(sources).length > 0) {
    console.log(`\n🔗 Sources:`);
    Object.entries(sources)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
      });
  }
  
  if (Object.keys(types).length > 0) {
    console.log(`\n📝 Content Types:`);
    Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
  }
  
  console.log(`\n📋 Sample Vectors (first 10):`);
  sampleVectors.slice(0, 10).forEach((v, i) => {
    console.log(`   ${i + 1}. ${v.id}`);
    console.log(`      Project: ${v.project || 'unknown'}`);
    console.log(`      Source: ${v.source || 'unknown'}`);
    console.log(`      Type: ${v.type || 'unknown'}`);
    console.log(`      Has Text: ${v.hasText ? '✅' : '❌'}`);
  });
  
  return {
    totalVectors,
    projects,
    sources,
    types,
    sampleVectors,
  };
}

analyzeIndex().catch((error) => {
  console.error("Analysis failed:", error);
  process.exit(1);
});

