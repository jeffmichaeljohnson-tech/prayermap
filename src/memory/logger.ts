/**
 * Automatic Logging Service for PrayerMap Memory System
 * Handles automatic logging of tasks, decisions, errors, and research
 */

import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { pineconeClient } from './pinecone-client';
import { withTrace, calculateOpenAICost } from '../lib/langsmith';
import type {
  AgentMemoryEntry,
  DecisionNode,
  ErrorFingerprint,
  ResearchEntry,
  Domain,
  AgentRole,
  EntryType,
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
 * Generate embedding for content using OpenAI's text-embedding-3-large model
 *
 * Uses the latest OpenAI embedding model (text-embedding-3-large) which:
 * - Produces 3072-dimensional vectors (matches Pinecone index)
 * - Maximum semantic search accuracy
 * - Better performance on complex queries
 * - Optimized for nuanced understanding
 *
 * @see https://platform.openai.com/docs/guides/embeddings
 * @see https://platform.openai.com/docs/models/text-embedding-3-large
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const maxChars = 8000;
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) + '...' : text;
  
  return withTrace(
    'generate_embedding',
    'embedding',
    'embeddings',
    {
      text_length: text.length,
      truncated: text.length > maxChars,
      model: 'text-embedding-3-large',
    },
    async () => {
      const client = getOpenAIClient();
      const startTime = Date.now();

      const response = await client.embeddings.create({
        model: 'text-embedding-3-large',
        input: truncatedText,
      });

      const latency = Date.now() - startTime;
      const embedding = response.data[0].embedding;
      const tokensUsed = response.usage?.total_tokens || 0;
      const cost = calculateOpenAICost('text-embedding-3-large', tokensUsed);

      return embedding;
    },
    {
      dimension: 3072,
      latency_ms: Date.now() - Date.now(), // Will be calculated in wrapper
      cost_estimate: 0, // Will be calculated in wrapper
    }
  );
}

/**
 * Auto-tag content based on keyword analysis
 */
function autoTag(content: string, files?: string[]): string[] {
  const tags = new Set<string>();
  const contentLower = content.toLowerCase();

  // Technology tags
  if (contentLower.includes('react') || contentLower.includes('component')) tags.add('react');
  if (contentLower.includes('typescript') || contentLower.includes('type')) tags.add('typescript');
  if (contentLower.includes('supabase') || contentLower.includes('database')) tags.add('supabase');
  if (contentLower.includes('api') || contentLower.includes('endpoint')) tags.add('api');
  if (contentLower.includes('auth') || contentLower.includes('login')) tags.add('authentication');
  if (contentLower.includes('test') || contentLower.includes('jest')) tags.add('testing');
  if (contentLower.includes('bug') || contentLower.includes('error') || contentLower.includes('fix')) tags.add('bug');
  if (contentLower.includes('performance') || contentLower.includes('optimization')) tags.add('performance');
  if (contentLower.includes('security') || contentLower.includes('vulnerability')) tags.add('security');
  if (contentLower.includes('ui') || contentLower.includes('interface')) tags.add('ui');
  if (contentLower.includes('mobile') || contentLower.includes('responsive')) tags.add('mobile');
  if (contentLower.includes('animation') || contentLower.includes('framer')) tags.add('animations');
  if (contentLower.includes('map') || contentLower.includes('location')) tags.add('map');
  if (contentLower.includes('prayer')) tags.add('prayers');
  if (contentLower.includes('notification') || contentLower.includes('push')) tags.add('notifications');
  if (contentLower.includes('admin') || contentLower.includes('dashboard')) tags.add('admin');

  // File-based tags
  if (files) {
    files.forEach((file) => {
      const fileLower = file.toLowerCase();
      if (fileLower.includes('test')) tags.add('testing');
      if (fileLower.includes('component')) tags.add('component');
      if (fileLower.includes('service')) tags.add('service');
      if (fileLower.includes('hook')) tags.add('hooks');
      if (fileLower.includes('util')) tags.add('utilities');
      if (fileLower.endsWith('.tsx') || fileLower.endsWith('.jsx')) tags.add('react');
      if (fileLower.endsWith('.ts') || fileLower.endsWith('.tsx')) tags.add('typescript');
      if (fileLower.includes('style') || fileLower.includes('.css')) tags.add('styling');
    });
  }

  return Array.from(tags);
}

/**
 * Infer domain from content and files
 */
function inferDomain(content: string, files?: string[]): Domain {
  const contentLower = content.toLowerCase();
  const allFiles = (files || []).join(' ').toLowerCase();

  // Check content and files for domain keywords
  if (contentLower.includes('auth') || contentLower.includes('login') || allFiles.includes('auth')) {
    return 'authentication';
  }
  if (contentLower.includes('prayer') || allFiles.includes('prayer')) {
    return 'prayers';
  }
  if (contentLower.includes('map') || contentLower.includes('location') || allFiles.includes('map')) {
    return 'map';
  }
  if (contentLower.includes('notification') || contentLower.includes('push') || allFiles.includes('notification')) {
    return 'notifications';
  }
  if (contentLower.includes('admin') || contentLower.includes('dashboard') || allFiles.includes('admin')) {
    return 'admin';
  }
  if (contentLower.includes('storage') || contentLower.includes('upload') || allFiles.includes('storage')) {
    return 'storage';
  }
  if (contentLower.includes('mobile') || contentLower.includes('responsive') || allFiles.includes('mobile')) {
    return 'mobile';
  }
  if (contentLower.includes('animation') || contentLower.includes('framer') || allFiles.includes('animation')) {
    return 'animations';
  }
  if (contentLower.includes('database') || contentLower.includes('supabase') || allFiles.includes('database')) {
    return 'database';
  }
  if (contentLower.includes('api') || contentLower.includes('endpoint') || allFiles.includes('api')) {
    return 'api';
  }
  if (contentLower.includes('ui') || contentLower.includes('component') || allFiles.includes('component')) {
    return 'ui';
  }
  if (contentLower.includes('test') || allFiles.includes('test')) {
    return 'testing';
  }

  return 'general';
}

/**
 * Calculate importance score based on content
 */
function calculateImportance(
  entryType: EntryType,
  content: string,
  impact?: 'low' | 'medium' | 'high' | 'critical'
): number {
  let score = 0.5; // Base score

  // Adjust by entry type
  const typeScores: Record<string, number> = {
    decision: 0.8,
    bug_fixed: 0.7,
    bug_found: 0.6,
    research: 0.6,
    learning: 0.7,
    pattern: 0.7,
    security_finding: 0.9,
    deployment: 0.8,
    task_completed: 0.5,
    handoff: 0.6,
  };
  score = typeScores[entryType] || 0.5;

  // Adjust by impact if provided
  if (impact) {
    const impactBonus = {
      low: 0,
      medium: 0.1,
      high: 0.2,
      critical: 0.3,
    };
    score += impactBonus[impact];
  }

  // Adjust by content keywords
  const contentLower = content.toLowerCase();
  if (contentLower.includes('critical') || contentLower.includes('urgent')) score += 0.1;
  if (contentLower.includes('breaking') || contentLower.includes('major')) score += 0.1;
  if (contentLower.includes('security') || contentLower.includes('vulnerability')) score += 0.15;
  if (contentLower.includes('performance') && contentLower.includes('issue')) score += 0.1;

  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * Log a task completion
 */
export async function logTask(entry: Partial<AgentMemoryEntry>): Promise<string> {
  const id = entry.id || uuidv4();
  const timestamp = entry.timestamp || new Date();
  const sessionId = entry.session_id || process.env.SESSION_ID || 'default-session';

  const content = entry.content || '';
  const files = entry.files_touched || [];
  const domain = entry.domain || inferDomain(content, files);
  const tags = entry.tags || autoTag(content, files);
  const importance = entry.importance || calculateImportance(entry.entry_type || 'task_completed', content);

  // Generate embedding
  const embedding = await generateEmbedding(content);

  const memoryEntry: AgentMemoryEntry = {
    id,
    session_id: sessionId,
    agent_role: entry.agent_role || 'developer',
    timestamp,
    entry_type: entry.entry_type || 'task_completed',
    status: entry.status || 'completed',
    content,
    files_touched: files,
    tags,
    domain,
    related_domains: entry.related_domains,
    embedding,
    related_entries: entry.related_entries,
    parent_id: entry.parent_id,
    metadata: entry.metadata,
    importance,
    auto_include: entry.auto_include || importance > 0.7,
    expires_at: entry.expires_at,
  };

  await pineconeClient.upsertMemory(memoryEntry);
  console.log(`Logged task: ${id} (${domain})`);

  return id;
}

/**
 * Log a decision
 */
export async function logDecision(decision: DecisionNode): Promise<string> {
  const id = decision.id || uuidv4();
  const sessionId = decision.session_id || process.env.SESSION_ID || 'default-session';

  // Create content from decision
  const content = `Decision: ${decision.decision}\nRationale: ${decision.rationale}\nTopic: ${decision.topic}\nAlternatives: ${decision.alternatives.join(', ')}`;
  const files = decision.files_affected;
  const tags = autoTag(content, files);
  tags.push('decision', decision.impact);

  const importance = calculateImportance('decision', content, decision.impact);

  // Generate embedding
  const embedding = await generateEmbedding(content);

  const memoryEntry: AgentMemoryEntry = {
    id,
    session_id: sessionId,
    agent_role: decision.agent_role,
    timestamp: decision.timestamp,
    entry_type: 'decision',
    status: decision.status === 'implemented' ? 'completed' : 'active',
    content,
    files_touched: files,
    tags,
    domain: decision.domain,
    related_domains: decision.related_domains,
    embedding,
    metadata: {
      decision_node: decision,
    },
    importance,
    auto_include: importance > 0.7,
  };

  await pineconeClient.upsertMemory(memoryEntry);
  console.log(`Logged decision: ${id} (${decision.topic})`);

  return id;
}

/**
 * Log an error
 */
export async function logError(error: ErrorFingerprint): Promise<string> {
  const id = error.id || uuidv4();
  const sessionId = error.session_id || process.env.SESSION_ID || 'default-session';

  // Create content from error
  const content = `Error: ${error.message}\nType: ${error.error_type}\nFile: ${error.file}\nHash: ${error.error_hash}\nRoot Cause: ${error.root_cause || 'Unknown'}`;
  const files = [error.file];
  const tags = autoTag(content, files);
  tags.push('error', error.severity, error.resolved ? 'resolved' : 'unresolved');

  const importance = calculateImportance(
    error.resolved ? 'bug_fixed' : 'bug_found',
    content,
    error.severity
  );

  // Generate embedding
  const embedding = await generateEmbedding(content);

  const memoryEntry: AgentMemoryEntry = {
    id,
    session_id: sessionId,
    agent_role: error.agent_role,
    timestamp: error.timestamp,
    entry_type: error.resolved ? 'bug_fixed' : 'bug_found',
    status: error.resolved ? 'completed' : 'active',
    content,
    files_touched: files,
    tags,
    domain: error.domain,
    embedding,
    metadata: {
      error_fingerprint: error,
    },
    importance,
    auto_include: !error.resolved && importance > 0.6,
  };

  await pineconeClient.upsertMemory(memoryEntry);
  console.log(`Logged error: ${id} (${error.error_type})`);

  return id;
}

/**
 * Log research findings
 */
export async function logResearch(research: ResearchEntry): Promise<string> {
  const id = research.id || uuidv4();
  const sessionId = research.session_id || process.env.SESSION_ID || 'default-session';

  // Create content from research
  const content = `Research: ${research.topic}\nSummary: ${research.summary}\nFindings: ${research.findings.join('; ')}\nConfidence: ${research.confidence}`;
  const files = research.files_analyzed;
  const tags = autoTag(content, files);
  tags.push('research', research.confidence);

  const importance = calculateImportance('research', content);

  // Generate embedding
  const embedding = await generateEmbedding(content);

  const memoryEntry: AgentMemoryEntry = {
    id,
    session_id: sessionId,
    agent_role: research.agent_role,
    timestamp: research.timestamp,
    entry_type: 'research',
    status: 'completed',
    content,
    files_touched: files,
    tags,
    domain: research.domain,
    related_domains: research.related_domains,
    embedding,
    related_entries: research.related_research,
    metadata: {
      research_entry: research,
    },
    importance,
    auto_include: research.confidence === 'high' || research.confidence === 'verified',
  };

  await pineconeClient.upsertMemory(memoryEntry);
  console.log(`Logged research: ${id} (${research.topic})`);

  return id;
}

/**
 * Log a learning or pattern discovery
 */
export async function logLearning(params: {
  agent_role: AgentRole;
  title: string;
  description: string;
  domain: Domain;
  files?: string[];
  tags?: string[];
  pattern?: string;
  auto_include?: boolean;
}): Promise<string> {
  const id = uuidv4();
  const sessionId = process.env.SESSION_ID || 'default-session';
  const timestamp = new Date();

  const content = `Learning: ${params.title}\n${params.description}${params.pattern ? `\nPattern: ${params.pattern}` : ''}`;
  const files = params.files || [];
  const tags = [...(params.tags || []), ...autoTag(content, files), 'learning'];

  const importance = calculateImportance('learning', content);
  const embedding = await generateEmbedding(content);

  const memoryEntry: AgentMemoryEntry = {
    id,
    session_id: sessionId,
    agent_role: params.agent_role,
    timestamp,
    entry_type: 'learning',
    status: 'completed',
    content,
    files_touched: files,
    tags,
    domain: params.domain,
    embedding,
    importance,
    auto_include: params.auto_include !== undefined ? params.auto_include : importance > 0.7,
  };

  await pineconeClient.upsertMemory(memoryEntry);
  console.log(`Logged learning: ${id} (${params.title})`);

  return id;
}

/**
 * Log a handoff between agents
 */
export async function logHandoff(params: {
  from_agent: AgentRole;
  to_agent: AgentRole;
  context: string;
  domain: Domain;
  files?: string[];
  next_steps?: string[];
}): Promise<string> {
  const id = uuidv4();
  const sessionId = process.env.SESSION_ID || 'default-session';
  const timestamp = new Date();

  const content = `Handoff from ${params.from_agent} to ${params.to_agent}\nContext: ${params.context}${params.next_steps ? `\nNext Steps: ${params.next_steps.join('; ')}` : ''}`;
  const files = params.files || [];
  const tags = autoTag(content, files);
  tags.push('handoff', params.from_agent, params.to_agent);

  const embedding = await generateEmbedding(content);

  const memoryEntry: AgentMemoryEntry = {
    id,
    session_id: sessionId,
    agent_role: params.from_agent,
    timestamp,
    entry_type: 'handoff',
    status: 'active',
    content,
    files_touched: files,
    tags,
    domain: params.domain,
    embedding,
    importance: 0.6,
    auto_include: true,
    metadata: {
      from_agent: params.from_agent,
      to_agent: params.to_agent,
      next_steps: params.next_steps,
    },
  };

  await pineconeClient.upsertMemory(memoryEntry);
  console.log(`Logged handoff: ${id} (${params.from_agent} -> ${params.to_agent})`);

  return id;
}
