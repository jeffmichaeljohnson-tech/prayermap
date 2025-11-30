#!/usr/bin/env node
/**
 * Enhanced Migration Script: Extract → Enrich → Regenerate → Upload
 * 
 * This script:
 * 1. Extracts text and metadata from old index (1536-dim)
 * 2. Enhances metadata using GPT-4o with sophisticated analysis
 * 3. Regenerates embeddings with text-embedding-3-large (3072-dim)
 * 4. Uploads to new index with enriched metadata
 * 
 * USAGE:
 *   npx tsx scripts/migrate-with-enhanced-metadata.ts \
 *     --old-index ora-prayermap \
 *     --new-index ora-prayermap-knowledge \
 *     --batch-size 10
 */

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import * as readline from 'readline';
import { initLangSmith, withTrace, startTrace, createChildTrace, endTrace, calculateOpenAICost } from '../src/lib/langsmith';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface MigrationOptions {
  oldIndexName: string;
  newIndexName: string;
  batchSize?: number;
  enableEnrichment?: boolean;
  model?: string;
}

interface ExtractedVector {
  id: string;
  text: string;
  existingMetadata: Record<string, any>;
  embedding?: number[];
}

interface EnhancedMetadata {
  // Core identification
  conversationId?: string;
  timestamp?: Date | string;
  source?: string;
  type?: string;
  
  // Participants and context
  participants?: string[];
  duration?: number;
  messageCount?: number;
  
  // Enhanced content analysis
  topics: string[];
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
    relationships?: string[];
  }>;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  
  // Technical deep dive
  technologies: string[];
  domains: string[];
  codeLanguages: string[];
  frameworks?: string[];
  libraries?: string[];
  tools?: string[];
  
  // Project context
  projectName?: string;
  feature?: string;
  component?: string;
  filePaths?: string[];
  
  // Semantic understanding
  intent: string[];
  outcome?: string;
  decisions?: string[];
  actionItems?: string[];
  blockers?: string[];
  
  // Quality and impact metrics
  importance: 'low' | 'medium' | 'high' | 'critical';
  quality: number; // 0-1 score
  technicalDebt?: number; // 0-1 score
  securityRisk?: 'none' | 'low' | 'medium' | 'high';
  performanceImpact?: 'none' | 'low' | 'medium' | 'high';
  userImpact?: 'none' | 'low' | 'medium' | 'high';
  
  // Relationships and context
  relatedConversations?: string[];
  references?: string[];
  dependencies?: string[];
  affectedSystems?: string[];
  
  // Search optimization
  searchKeywords: string[];
  semanticTags: string[];
  categories?: string[];
  
  // Temporal and lifecycle
  phase?: 'planning' | 'development' | 'testing' | 'deployment' | 'maintenance';
  status?: 'active' | 'completed' | 'blocked' | 'archived';
  
  // Code-specific metadata
  codeSnippets?: Array<{
    language: string;
    purpose: string;
    complexity: number;
  }>;
  patterns?: string[];
  antiPatterns?: string[];
  bestPractices?: string[];
  
  // Migration metadata
  migratedFrom?: string;
  migrationDate?: string;
  originalDimension?: number;
  newDimension?: number;
}

/**
 * Create readline interface
 */
function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask user for confirmation
 */
function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Extract text and metadata from old index
 * Note: Pinecone doesn't support direct export, so we query all vectors
 * Can filter by project/source if specified
 */
async function extractFromOldIndex(
  pinecone: Pinecone,
  indexName: string,
  filterByProject?: string
): Promise<ExtractedVector[]> {
  console.log(`📤 Extracting data from old index "${indexName}"...`);
  if (filterByProject) {
    console.log(`   Filtering by project: "${filterByProject}"`);
  }
  
  const index = pinecone.index(indexName);
  const stats = await index.describeIndexStats();
  const totalVectors = stats.totalRecordCount || 0;
  
  console.log(`   Found ${totalVectors} total vectors in index`);
  
  if (totalVectors === 0) {
    console.log(`   ⚠️  No vectors found in old index`);
    return [];
  }
  
  const extracted: ExtractedVector[] = [];
  
  // Generate a zero vector for querying (1536 dimensions for old index)
  const zeroVector = new Array(1536).fill(0);
  
  try {
    // Build filter if project specified
    const filter: any = filterByProject ? {
      $or: [
        { projectName: { $eq: filterByProject.toLowerCase() } },
        { projectName: { $eq: filterByProject } },
        { project: { $eq: filterByProject.toLowerCase() } },
        { project: { $eq: filterByProject } },
        { source: { $eq: filterByProject.toLowerCase() } },
        { source: { $eq: filterByProject } },
        // Also check if project path contains the project name
        { projectPath: { $regex: filterByProject.toLowerCase() } },
      ]
    } : undefined;
    
    // Query with zero vector to get all results (may need multiple queries)
    const queryResult = await index.query({
      vector: zeroVector,
      topK: Math.min(10000, totalVectors), // Pinecone limit
      includeMetadata: true,
      filter,
    });
    
    let prayerMapCount = 0;
    let otherCount = 0;
    
    for (const match of queryResult.matches || []) {
      // Extract text from metadata or use ID as fallback
      const text = match.metadata?.text || 
                   match.metadata?.content || 
                   match.metadata?.message ||
                   match.id;
      
      // Detect if this is a PrayerMap vector
      const metadata = match.metadata || {};
      const projectName = (metadata.projectName || metadata.project || '').toLowerCase();
      const projectPath = (metadata.projectPath || '').toLowerCase();
      const source = (metadata.source || '').toLowerCase();
      const isPrayerMap = projectName.includes('prayermap') || 
                         projectPath.includes('prayermap') ||
                         source.includes('prayermap') ||
                         match.id.includes('prayermap');
      
      if (isPrayerMap) {
        prayerMapCount++;
      } else {
        otherCount++;
      }
      
      extracted.push({
        id: match.id,
        text: String(text),
        existingMetadata: {
          ...metadata,
          _detectedProject: isPrayerMap ? 'prayermap' : 'other',
        },
      });
    }
    
    console.log(`   ✅ Extracted ${extracted.length} vectors`);
    if (!filterByProject) {
      console.log(`   📊 Breakdown: ${prayerMapCount} PrayerMap, ${otherCount} other`);
    }
  } catch (error) {
    console.error(`   ❌ Error extracting:`, error);
    throw error;
  }
  
  return extracted;
}

/**
 * Enhanced metadata enrichment using GPT-4o
 */
async function enrichMetadata(
  openai: OpenAI,
  vector: ExtractedVector,
  model: string = 'gpt-4o'
): Promise<EnhancedMetadata> {
  return withTrace(
    'enrich_vector_metadata',
    'chain',
    'migrations',
    {
      vector_id: vector.id,
      text_length: vector.text.length,
      model,
    },
    async () => {
      const prompt = `You are an expert technical content analyst. Analyze this content and extract comprehensive, structured metadata.

CONTENT:
${vector.text.slice(0, 4000)}

EXISTING METADATA:
${JSON.stringify(vector.existingMetadata, null, 2)}

Provide a comprehensive JSON analysis with these fields:

{
  "topics": ["main topics", "up to 15 topics"],
  "entities": [
    {
      "text": "entity name",
      "type": "technology|person|file|function|bug|feature|concept|pattern",
      "confidence": 0.9,
      "relationships": ["related entities"]
    }
  ],
  "sentiment": "positive|negative|neutral|mixed",
  "complexity": "simple|moderate|complex|expert",
  "technologies": ["react", "typescript", "supabase", "etc"],
  "domains": ["frontend", "backend", "mobile", "devops", "etc"],
  "codeLanguages": ["typescript", "sql", "css", "etc"],
  "frameworks": ["react", "next.js", "etc"],
  "libraries": ["framer-motion", "mapbox", "etc"],
  "tools": ["vite", "playwright", "etc"],
  "intent": ["bug_fix", "feature_request", "code_review", "optimization", "etc"],
  "outcome": "brief description of resolution or outcome",
  "decisions": ["key decisions made"],
  "actionItems": ["action items identified"],
  "blockers": ["blockers mentioned"],
  "importance": "low|medium|high|critical",
  "quality": 0.85,
  "technicalDebt": 0.3,
  "securityRisk": "none|low|medium|high",
  "performanceImpact": "none|low|medium|high",
  "userImpact": "none|low|medium|high",
  "relatedConversations": ["related conversation IDs if any"],
  "references": ["referenced files, docs, etc"],
  "dependencies": ["dependencies mentioned"],
  "affectedSystems": ["systems affected"],
  "searchKeywords": ["key", "search", "terms", "up to 25"],
  "semanticTags": ["semantic", "classification", "tags", "up to 20"],
  "categories": ["primary", "secondary", "categories"],
  "phase": "planning|development|testing|deployment|maintenance",
  "status": "active|completed|blocked|archived",
  "codeSnippets": [
    {
      "language": "typescript",
      "purpose": "what it does",
      "complexity": 0.7
    }
  ],
  "patterns": ["design patterns used"],
  "antiPatterns": ["anti-patterns identified"],
  "bestPractices": ["best practices mentioned"]
}

Focus on accuracy, depth, and actionable insights. Be thorough but precise.`;

      try {
        const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are an expert technical content analyst specializing in software development, architecture, and code quality. Provide detailed, accurate metadata extraction.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 2000, // Increased for comprehensive analysis
      response_format: { type: "json_object" },
    });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response from OpenAI');

        // Parse JSON response
        const analysis = JSON.parse(content);
        
        // Merge with existing metadata and add migration info
        const detectedProject = vector.existingMetadata._detectedProject || 'unknown';
        
        const enriched = {
          ...analysis,
          migratedFrom: vector.existingMetadata.conversationId || vector.id,
          migrationDate: new Date().toISOString(),
          originalDimension: 1536,
          newDimension: 3072,
          // Preserve important existing metadata
          conversationId: vector.existingMetadata.conversationId,
          timestamp: vector.existingMetadata.timestamp || new Date(),
          source: vector.existingMetadata.source || 'migration',
          type: vector.existingMetadata.type || 'conversation',
          participants: vector.existingMetadata.participants || [],
          // Add project identification
          projectName: detectedProject === 'prayermap' ? 'prayermap' : 
                       vector.existingMetadata.projectName || 
                       vector.existingMetadata.project || 
                       detectedProject,
        };
        
        return enriched;
      } catch (error) {
        console.warn(`⚠️  Metadata enrichment failed for ${vector.id}:`, error);
        // Fallback to basic metadata
        return createBasicMetadata(vector);
      }
    },
    {
      operation: 'metadata_enrichment',
    }
  );
}

/**
 * Create basic metadata as fallback
 */
function createBasicMetadata(vector: ExtractedVector): EnhancedMetadata {
  return {
    topics: [],
    entities: [],
    sentiment: 'neutral',
    complexity: 'moderate',
    technologies: [],
    domains: [],
    codeLanguages: [],
    intent: [],
    importance: 'medium',
    quality: 0.6,
    searchKeywords: [],
    semanticTags: [],
    migratedFrom: vector.id,
    migrationDate: new Date().toISOString(),
    originalDimension: 1536,
    newDimension: 3072,
  };
}

/**
 * Regenerate embeddings with text-embedding-3-large
 */
async function regenerateEmbeddings(
  openai: OpenAI,
  texts: string[]
): Promise<number[][]> {
  return withTrace(
    'regenerate_batch_embeddings',
    'embedding',
    'migrations',
    {
      texts_count: texts.length,
      total_chars: texts.reduce((sum, text) => sum + text.length, 0),
      model: 'text-embedding-3-large',
    },
    async () => {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: texts,
      });
      
      const tokensUsed = response.usage?.total_tokens || 0;
      const cost = calculateOpenAICost('text-embedding-3-large', tokensUsed);
      
      return response.data.map(item => item.embedding);
    },
    {
      dimension: 3072,
      operation: 'batch_regeneration',
    }
  );
}

/**
 * Upload enriched vectors to new index
 */
async function uploadToNewIndex(
  pinecone: Pinecone,
  indexName: string,
  vectors: Array<{
    id: string;
    values: number[];
    metadata: EnhancedMetadata;
  }>,
  namespace?: string
): Promise<void> {
  console.log(`📥 Uploading ${vectors.length} vectors to new index "${indexName}"...`);
  if (namespace) {
    console.log(`   Using namespace: "${namespace}"`);
  }
  
  const index = pinecone.index(indexName);
  const targetIndex = namespace ? index.namespace(namespace) : index;
  const batchSize = 100;
  let uploaded = 0;
  
  // Add namespace to metadata for tracking
  const vectorsWithNamespace = vectors.map(v => ({
    ...v,
    metadata: {
      ...v.metadata,
      namespace: namespace || 'default',
    },
  }));
  
  for (let i = 0; i < vectorsWithNamespace.length; i += batchSize) {
    const batch = vectorsWithNamespace.slice(i, i + batchSize);
    
    try {
      await targetIndex.upsert(batch);
      uploaded += batch.length;
      console.log(`   📊 Uploaded ${uploaded}/${vectors.length} vectors...`);
    } catch (error) {
      console.error(`   ❌ Error uploading batch ${i}-${i + batchSize}:`, error);
      throw error;
    }
  }
  
  console.log(`   ✅ Successfully uploaded ${uploaded} vectors`);
}

/**
 * Main migration function
 */
async function migrateWithEnrichment(options: MigrationOptions): Promise<void> {
  if (!PINECONE_API_KEY) {
    console.error("ERROR: PINECONE_API_KEY environment variable not set");
    process.exit(1);
  }
  
  if (!OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable not set");
    process.exit(1);
  }

  // Initialize LangSmith tracing
  initLangSmith();

  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const rl = createReadline();

  return withTrace(
    'enhanced_metadata_migration',
    'chain',
    'migrations',
    {
      old_index: options.oldIndexName,
      new_index: options.newIndexName,
      model: options.model || 'gpt-4o',
      batch_size: options.batchSize || 10,
      enable_enrichment: options.enableEnrichment !== false,
    },
    async () => {
      try {
        console.log(`🚀 Starting Enhanced Migration`);
        console.log(`   Old Index: ${options.oldIndexName}`);
        console.log(`   New Index: ${options.newIndexName}`);
        console.log(`   Model: ${options.model || 'gpt-4o'}`);
        console.log(`   Batch Size: ${options.batchSize || 10}`);
        console.log(``);

        // Step 1: Extract from old index
        const extractTrace = await startTrace('extract_from_old_index', 'retriever', 'migrations', {
          old_index: options.oldIndexName,
          filter_project: options.filterByProject,
        });
        
        console.log(`Step 1: Extracting from old index...`);
        const extracted = await extractFromOldIndex(
          pinecone, 
          options.oldIndexName,
          options.filterByProject
        );
        
        await endTrace(extractTrace, {
          vectors_extracted: extracted.length,
        });
        
        if (extracted.length === 0) {
          console.log(`❌ No vectors to migrate`);
          return;
        }

        // Step 2: Enrich metadata
        const enrichTrace = await startTrace('enrich_metadata', 'chain', 'migrations', {
          vectors_count: extracted.length,
          model: options.model || 'gpt-4o',
          batch_size: options.batchSize || 10,
        });
        
        console.log(``);
        console.log(`Step 2: Enriching metadata with GPT-4o...`);
        const enriched: Array<{
          id: string;
          text: string;
          metadata: EnhancedMetadata;
        }> = [];
        
        const batchSize = options.batchSize || 10;
        for (let i = 0; i < extracted.length; i += batchSize) {
          const batch = extracted.slice(i, i + batchSize);
          
          console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(extracted.length / batchSize)}...`);
          
          const enrichmentPromises = batch.map(async (vector) => {
            const metadata = await enrichMetadata(openai, vector, options.model);
            return {
              id: vector.id,
              text: vector.text,
              metadata,
            };
          });
          
          const batchResults = await Promise.all(enrichmentPromises);
          enriched.push(...batchResults);
          
          console.log(`   ✅ Enriched ${enriched.length}/${extracted.length} vectors`);
          
          // Small delay to avoid rate limits
          if (i + batchSize < extracted.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        await endTrace(enrichTrace, {
          vectors_enriched: enriched.length,
        });

        // Step 3: Regenerate embeddings
        const embedTrace = await startTrace('regenerate_embeddings', 'embedding', 'migrations', {
          vectors_count: enriched.length,
          model: 'text-embedding-3-large',
          dimension: 3072,
        });
        
        console.log(``);
        console.log(`Step 3: Regenerating embeddings with text-embedding-3-large...`);
        const texts = enriched.map(e => e.text);
        const embeddings = await regenerateEmbeddings(openai, texts);
        
        await endTrace(embedTrace, {
          embeddings_generated: embeddings.length,
          dimension: 3072,
        });
        
        // Step 4: Prepare vectors for upload
        console.log(``);
        console.log(`Step 4: Preparing vectors for upload...`);
        const vectorsToUpload = enriched.map((item, index) => ({
          id: item.id,
          values: embeddings[index],
          metadata: item.metadata,
        }));

        // Step 5: Upload to new index
        const uploadTrace = await startTrace('upload_to_new_index', 'retriever', 'migrations', {
          new_index: options.newIndexName,
          vectors_count: vectorsToUpload.length,
          namespace: options.namespace,
        });
        
        console.log(``);
        console.log(`Step 5: Uploading to new index...`);
        await uploadToNewIndex(
          pinecone, 
          options.newIndexName, 
          vectorsToUpload,
          options.namespace
        );
        
        await endTrace(uploadTrace, {
          vectors_uploaded: vectorsToUpload.length,
        });

        console.log(``);
        console.log(`✅ Migration complete!`);
        console.log(`   Migrated: ${extracted.length} vectors`);
        console.log(`   Enriched: ${enriched.length} vectors`);
        console.log(`   New dimension: 3072`);
        console.log(`   Enhanced metadata: ✅`);
        
        return {
          vectors_migrated: extracted.length,
          vectors_enriched: enriched.length,
          dimension: 3072,
        };

  } catch (error) {
    console.error(`❌ Migration failed:`, error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Parse command line arguments
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    oldIndexName: '',
    newIndexName: '',
    batchSize: 10,
    enableEnrichment: true,
    model: 'gpt-4o',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--old-index' && args[i + 1]) {
      options.oldIndexName = args[i + 1];
      i++;
    } else if (arg === '--new-index' && args[i + 1]) {
      options.newIndexName = args[i + 1];
      i++;
    } else if (arg === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--model' && args[i + 1]) {
      options.model = args[i + 1];
      i++;
    } else if (arg === '--filter-project' && args[i + 1]) {
      options.filterByProject = args[i + 1];
      i++;
    } else if (arg === '--namespace' && args[i + 1]) {
      options.namespace = args[i + 1];
      i++;
    } else if (arg === '--no-enrichment') {
      options.enableEnrichment = false;
    }
  }

  if (!options.oldIndexName || !options.newIndexName) {
    console.error('Usage: npx tsx scripts/migrate-with-enhanced-metadata.ts --old-index <name> --new-index <name> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --old-index <name>     Name of existing index to migrate from');
    console.error('  --new-index <name>    Name of new index to create');
    console.error('  --batch-size <num>    Batch size for processing (default: 10)');
    console.error('  --model <name>        OpenAI model for enrichment (default: gpt-4o)');
    console.error('  --filter-project <name> Filter by project name (e.g., "prayermap")');
    console.error('  --namespace <name>    Optional namespace for new index');
    console.error('  --no-enrichment       Skip metadata enrichment');
    process.exit(1);
  }

  return options;
}

// Run migration
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  const options = parseArgs();
  migrateWithEnrichment(options).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

