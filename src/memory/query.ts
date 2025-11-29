/**
 * Query Service for PrayerMap Memory System
 * Fast retrieval and context gathering
 */

import OpenAI from 'openai';
import { pineconeClient } from './pinecone-client';
import type {
  AgentMemoryEntry,
  Domain,
  DecisionNode,
  ErrorFingerprint,
  ResearchEntry,
  PreQueryContext,
  QueryFilter,
  Solution,
  ConfidenceLevel,
} from './types';

/**
 * Initialize OpenAI client
 */
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not set. Please add it to your .env file.'
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Generate embedding for query text using OpenAI's text-embedding-3-small model
 *
 * Uses the same model as logger.ts to ensure embedding consistency for semantic search.
 * The text-embedding-3-small model:
 * - Produces 1536-dimensional vectors (matches Pinecone index)
 * - More cost-effective than ada-002
 * - Better performance on benchmarks
 * - Optimized for latency and storage
 *
 * @see https://platform.openai.com/docs/guides/embeddings
 * @see https://platform.openai.com/docs/models/text-embedding-3-small
 */
async function generateQueryEmbedding(text: string): Promise<number[]> {
  try {
    const client = getOpenAIClient();

    // Truncate text if too long (OpenAI has token limits)
    // ~8000 chars ≈ 2000 tokens (conservative estimate)
    const maxChars = 8000;
    const truncatedText = text.length > maxChars ? text.slice(0, maxChars) + '...' : text;

    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: truncatedText,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw new Error(
      `Failed to generate query embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Find similar memories using semantic search
 */
export async function findSimilar(
  text: string,
  limit: number = 10,
  filter?: QueryFilter
): Promise<AgentMemoryEntry[]> {
  const embedding = await generateQueryEmbedding(text);
  const results = await pineconeClient.queryByVector(embedding, limit, filter);
  return results;
}

/**
 * Find memories by domain
 */
export async function findByDomain(
  domain: Domain,
  limit: number = 50
): Promise<AgentMemoryEntry[]> {
  const filter: QueryFilter = { domain };
  const results = await pineconeClient.queryByMetadata(filter, limit);
  return results;
}

/**
 * Find decisions, optionally filtered by topic
 */
export async function findDecisions(
  topic?: string,
  limit: number = 20
): Promise<DecisionNode[]> {
  let results: AgentMemoryEntry[];

  if (topic) {
    // Semantic search for topic
    const embedding = await generateQueryEmbedding(topic);
    const filter: QueryFilter = { entry_type: 'decision' };
    results = await pineconeClient.queryByVector(embedding, limit, filter);
  } else {
    // Get all decisions
    const filter: QueryFilter = { entry_type: 'decision' };
    results = await pineconeClient.queryByMetadata(filter, limit);
  }

  // Extract decision nodes from metadata
  const decisions: DecisionNode[] = results
    .filter((entry) => entry.metadata?.decision_node)
    .map((entry) => entry.metadata!.decision_node as DecisionNode);

  return decisions;
}

/**
 * Find solution for a specific error by hash
 */
export async function findErrorSolution(errorHash: string): Promise<Solution | null> {
  // Query for errors with matching hash
  const filter: QueryFilter = {
    entry_type: ['bug_found', 'bug_fixed'],
  };

  const results = await pineconeClient.queryByMetadata(filter, 100);

  // Find matching error
  for (const entry of results) {
    const errorFingerprint = entry.metadata?.error_fingerprint as ErrorFingerprint | undefined;
    if (errorFingerprint?.error_hash === errorHash && errorFingerprint.solution) {
      return errorFingerprint.solution;
    }
  }

  return null;
}

/**
 * Find research on a specific topic
 */
export async function findResearch(
  topic: string,
  limit: number = 10
): Promise<ResearchEntry[]> {
  const embedding = await generateQueryEmbedding(topic);
  const filter: QueryFilter = { entry_type: 'research' };
  const results = await pineconeClient.queryByVector(embedding, limit, filter);

  // Extract research entries from metadata
  const research: ResearchEntry[] = results
    .filter((entry) => entry.metadata?.research_entry)
    .map((entry) => entry.metadata!.research_entry as ResearchEntry);

  return research;
}

/**
 * Find errors in specific files
 */
export async function findErrorsInFiles(files: string[]): Promise<ErrorFingerprint[]> {
  const filter: QueryFilter = {
    entry_type: ['bug_found', 'bug_fixed'],
  };

  const results = await pineconeClient.queryByMetadata(filter, 100);

  // Filter by files and extract error fingerprints
  const errors: ErrorFingerprint[] = results
    .filter((entry) => {
      const errorFingerprint = entry.metadata?.error_fingerprint as ErrorFingerprint | undefined;
      return errorFingerprint && files.includes(errorFingerprint.file);
    })
    .map((entry) => entry.metadata!.error_fingerprint as ErrorFingerprint);

  return errors;
}

/**
 * Find recent tasks in a domain
 */
export async function findRecentTasks(
  domain: Domain,
  limit: number = 20
): Promise<AgentMemoryEntry[]> {
  const filter: QueryFilter = {
    domain,
    entry_type: ['task_completed', 'code_change'],
  };

  const results = await pineconeClient.queryByMetadata(filter, limit);

  // Sort by timestamp (most recent first)
  results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return results;
}

/**
 * Find patterns of a specific type
 */
export async function findPatterns(
  patternType?: string,
  limit: number = 20
): Promise<AgentMemoryEntry[]> {
  const filter: QueryFilter = {
    entry_type: 'pattern',
  };

  const results = await pineconeClient.queryByMetadata(filter, limit);

  // Filter by pattern type if specified
  if (patternType) {
    return results.filter((entry) =>
      entry.content.toLowerCase().includes(patternType.toLowerCase())
    );
  }

  return results;
}

/**
 * Get pre-query context for a task
 * This is the key function for automatic context retrieval
 */
export async function getPreQueryContext(
  taskDescription: string,
  affectedFiles: string[] = []
): Promise<PreQueryContext> {
  const generatedAt = new Date();

  // 1. Find similar past tasks
  const similarTasks = await findSimilar(taskDescription, 5, {
    entry_type: ['task_completed', 'code_change', 'learning'],
  });

  // 2. Extract domains from task and files
  const domains = extractDomainsFromContext(taskDescription, affectedFiles);
  const primaryDomain = domains[0] || 'general';

  // 3. Find relevant decisions in these domains
  const relevantDecisions: DecisionNode[] = [];
  for (const domain of domains.slice(0, 3)) {
    const domainDecisions = await findDecisions(taskDescription, 5);
    const filteredDecisions = domainDecisions.filter(
      (d) => d.domain === domain || d.related_domains?.includes(domain)
    );
    relevantDecisions.push(...filteredDecisions);
  }

  // 4. Find known issues in affected files
  const knownIssues = affectedFiles.length > 0
    ? await findErrorsInFiles(affectedFiles)
    : [];

  // 5. Find relevant research
  const relevantResearch = await findResearch(taskDescription, 5);

  // 6. Get relevant memories from affected domains
  const relevantMemories: AgentMemoryEntry[] = [];
  for (const domain of domains.slice(0, 2)) {
    const domainMemories = await findByDomain(domain, 10);
    const filtered = domainMemories.filter(
      (m) => m.auto_include || m.importance > 0.7
    );
    relevantMemories.push(...filtered.slice(0, 5));
  }

  // Remove duplicates
  const uniqueMemories = Array.from(
    new Map(relevantMemories.map((m) => [m.id, m])).values()
  );

  // 7. Generate context summary
  const contextSummary = generateContextSummary(
    taskDescription,
    uniqueMemories,
    relevantDecisions,
    similarTasks,
    knownIssues,
    relevantResearch
  );

  // 8. Calculate confidence
  const confidence = calculateContextConfidence(
    uniqueMemories,
    relevantDecisions,
    similarTasks,
    knownIssues,
    relevantResearch
  );

  return {
    task_description: taskDescription,
    affected_files: affectedFiles,
    relevant_memories: uniqueMemories,
    relevant_decisions: relevantDecisions,
    similar_tasks: similarTasks,
    known_issues: knownIssues,
    relevant_research: relevantResearch,
    context_summary: contextSummary,
    confidence,
    generated_at: generatedAt,
  };
}

/**
 * Extract domains from task description and files
 */
function extractDomainsFromContext(description: string, files: string[]): Domain[] {
  const domains = new Set<Domain>();
  const descLower = description.toLowerCase();
  const filesStr = files.join(' ').toLowerCase();

  const domainKeywords: Record<Domain, string[]> = {
    authentication: ['auth', 'login', 'user', 'session'],
    prayers: ['prayer', 'pray'],
    map: ['map', 'location', 'marker', 'geo'],
    notifications: ['notification', 'push', 'alert'],
    admin: ['admin', 'dashboard'],
    storage: ['storage', 'upload', 'file', 'media'],
    mobile: ['mobile', 'responsive', 'touch'],
    animations: ['animation', 'framer', 'motion'],
    database: ['database', 'supabase', 'query', 'table'],
    api: ['api', 'endpoint', 'route', 'http'],
    ui: ['ui', 'component', 'interface', 'button'],
    testing: ['test', 'jest', 'spec'],
    deployment: ['deploy', 'build', 'ci', 'cd'],
    general: [],
  };

  Object.entries(domainKeywords).forEach(([domain, keywords]) => {
    if (keywords.some((kw) => descLower.includes(kw) || filesStr.includes(kw))) {
      domains.add(domain as Domain);
    }
  });

  const result = Array.from(domains);
  return result.length > 0 ? result : ['general'];
}

/**
 * Generate a context summary from gathered information
 */
function generateContextSummary(
  taskDescription: string,
  memories: AgentMemoryEntry[],
  decisions: DecisionNode[],
  similarTasks: AgentMemoryEntry[],
  issues: ErrorFingerprint[],
  research: ResearchEntry[]
): string {
  const parts: string[] = [];

  parts.push(`Task: ${taskDescription}\n`);

  if (decisions.length > 0) {
    parts.push(`\nRelevant Decisions (${decisions.length}):`);
    decisions.slice(0, 3).forEach((d) => {
      parts.push(`- ${d.topic}: ${d.decision}`);
    });
  }

  if (similarTasks.length > 0) {
    parts.push(`\nSimilar Past Tasks (${similarTasks.length}):`);
    similarTasks.slice(0, 3).forEach((t) => {
      parts.push(`- ${t.content.substring(0, 100)}...`);
    });
  }

  if (issues.length > 0) {
    const unresolvedIssues = issues.filter((i) => !i.resolved);
    if (unresolvedIssues.length > 0) {
      parts.push(`\nKnown Issues (${unresolvedIssues.length} unresolved):`);
      unresolvedIssues.slice(0, 3).forEach((i) => {
        parts.push(`- ${i.message} (${i.file})`);
      });
    }
  }

  if (research.length > 0) {
    parts.push(`\nRelevant Research (${research.length}):`);
    research.slice(0, 2).forEach((r) => {
      parts.push(`- ${r.topic}: ${r.summary.substring(0, 100)}...`);
    });
  }

  if (memories.length > 0) {
    parts.push(`\nOther Relevant Context (${memories.length} entries)`);
  }

  return parts.join('\n');
}

/**
 * Calculate confidence in the retrieved context
 */
function calculateContextConfidence(
  memories: AgentMemoryEntry[],
  decisions: DecisionNode[],
  similarTasks: AgentMemoryEntry[],
  issues: ErrorFingerprint[],
  research: ResearchEntry[]
): ConfidenceLevel {
  let score = 0;

  // Weight different factors
  if (decisions.length > 0) score += 0.3;
  if (similarTasks.length > 0) score += 0.2;
  if (research.length > 0) score += 0.2;
  if (memories.length > 5) score += 0.2;
  if (issues.filter((i) => i.resolved).length > 0) score += 0.1;

  if (score >= 0.8) return 'verified';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

/**
 * Find handoffs to a specific agent
 */
export async function findHandoffsToAgent(
  agentRole: string,
  limit: number = 10
): Promise<AgentMemoryEntry[]> {
  const filter: QueryFilter = {
    entry_type: 'handoff',
  };

  const results = await pineconeClient.queryByMetadata(filter, limit);

  // Filter by target agent
  return results.filter(
    (entry) => entry.metadata?.to_agent === agentRole && entry.status === 'active'
  );
}

/**
 * Get session summary
 */
export async function getSessionSummary(sessionId: string): Promise<{
  total_entries: number;
  by_type: Record<string, number>;
  by_domain: Record<string, number>;
  decisions: number;
  errors_found: number;
  errors_fixed: number;
  research_conducted: number;
}> {
  const filter: QueryFilter = { session_id: sessionId };
  const entries = await pineconeClient.queryByMetadata(filter, 1000);

  const byType: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  let decisions = 0;
  let errorsFound = 0;
  let errorsFixed = 0;
  let researchConducted = 0;

  entries.forEach((entry) => {
    byType[entry.entry_type] = (byType[entry.entry_type] || 0) + 1;
    byDomain[entry.domain] = (byDomain[entry.domain] || 0) + 1;

    if (entry.entry_type === 'decision') decisions++;
    if (entry.entry_type === 'bug_found') errorsFound++;
    if (entry.entry_type === 'bug_fixed') errorsFixed++;
    if (entry.entry_type === 'research') researchConducted++;
  });

  return {
    total_entries: entries.length,
    by_type: byType,
    by_domain: byDomain,
    decisions,
    errors_found: errorsFound,
    errors_fixed: errorsFixed,
    research_conducted: researchConducted,
  };
}
