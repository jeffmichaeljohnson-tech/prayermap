/**
 * Memory System Core Types for PrayerMap
 * Pinecone-based agent memory architecture
 */

/**
 * Entry types for different kinds of memory entries
 */
export type EntryType =
  | 'task_completed'
  | 'bug_found'
  | 'bug_fixed'
  | 'decision'
  | 'research'
  | 'handoff'
  | 'learning'
  | 'pattern'
  | 'code_change'
  | 'test_result'
  | 'deployment'
  | 'configuration'
  | 'user_feedback'
  | 'performance_metric'
  | 'security_finding';

/**
 * Agent roles in the multi-agent system
 */
export type AgentRole =
  | 'researcher'
  | 'archivist'
  | 'architect'
  | 'developer'
  | 'tester'
  | 'reviewer'
  | 'debugger'
  | 'optimizer'
  | 'security'
  | 'devops';

/**
 * PrayerMap application domains
 */
export type Domain =
  | 'authentication'
  | 'prayers'
  | 'map'
  | 'notifications'
  | 'admin'
  | 'storage'
  | 'mobile'
  | 'animations'
  | 'database'
  | 'api'
  | 'ui'
  | 'testing'
  | 'deployment'
  | 'general';

/**
 * Status of a memory entry
 */
export type EntryStatus =
  | 'active'
  | 'completed'
  | 'archived'
  | 'superseded'
  | 'pending'
  | 'failed';

/**
 * Confidence level for research and findings
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'verified';

/**
 * Core agent memory entry structure
 */
export interface AgentMemoryEntry {
  /** Unique identifier for the memory entry */
  id: string;

  /** Session identifier for grouping related entries */
  session_id: string;

  /** Agent that created this entry */
  agent_role: AgentRole;

  /** Timestamp when the entry was created */
  timestamp: Date;

  /** Type of memory entry */
  entry_type: EntryType;

  /** Current status of this entry */
  status: EntryStatus;

  /** Main content of the memory entry */
  content: string;

  /** List of files affected or related to this entry */
  files_touched: string[];

  /** Tags for categorization and search */
  tags: string[];

  /** Primary domain this entry belongs to */
  domain: Domain;

  /** Secondary domains this entry relates to */
  related_domains?: Domain[];

  /** Vector embedding for semantic search (stored in Pinecone) */
  embedding?: number[];

  /** Related memory entry IDs */
  related_entries?: string[];

  /** Parent entry ID for hierarchical relationships */
  parent_id?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** Importance score (0-1) */
  importance?: number;

  /** Whether this entry should be included in context automatically */
  auto_include?: boolean;

  /** Expiration date for temporary entries */
  expires_at?: Date;
}

/**
 * Decision node for tracking architectural and implementation decisions
 */
export interface DecisionNode {
  /** Unique decision identifier */
  id: string;

  /** Session when decision was made */
  session_id: string;

  /** Timestamp of the decision */
  timestamp: Date;

  /** Topic or area of the decision */
  topic: string;

  /** The decision that was made */
  decision: string;

  /** Rationale behind the decision */
  rationale: string;

  /** Alternatives that were considered */
  alternatives: string[];

  /** Why alternatives were rejected */
  rejected_reasons?: Record<string, string>;

  /** Domain this decision affects */
  domain: Domain;

  /** Related domains */
  related_domains?: Domain[];

  /** Files affected by this decision */
  files_affected: string[];

  /** Agent that made the decision */
  agent_role: AgentRole;

  /** Impact level (low, medium, high, critical) */
  impact: 'low' | 'medium' | 'high' | 'critical';

  /** Whether this decision is reversible */
  reversible: boolean;

  /** Dependencies on other decisions */
  depends_on?: string[];

  /** Decisions that depend on this one */
  dependents?: string[];

  /** Current status */
  status: 'proposed' | 'approved' | 'implemented' | 'superseded';

  /** If superseded, the ID of the decision that replaced this */
  superseded_by?: string;

  /** Tags for categorization */
  tags: string[];

  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Error fingerprint for instant error matching
 */
export interface ErrorFingerprint {
  /** Unique error identifier */
  id: string;

  /** Session where error occurred */
  session_id: string;

  /** Timestamp when error was recorded */
  timestamp: Date;

  /** Hash of the error for matching */
  error_hash: string;

  /** Error message */
  message: string;

  /** Stack trace */
  stack_trace?: string;

  /** Error type/class */
  error_type: string;

  /** File where error occurred */
  file: string;

  /** Line number */
  line_number?: number;

  /** Domain where error occurred */
  domain: Domain;

  /** Root cause analysis */
  root_cause?: string;

  /** Solution that fixed the error */
  solution?: Solution;

  /** Whether this error is resolved */
  resolved: boolean;

  /** Related error IDs (similar errors) */
  related_errors?: string[];

  /** How many times this error has occurred */
  occurrence_count: number;

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Tags for categorization */
  tags: string[];

  /** Agent that logged the error */
  agent_role: AgentRole;
}

/**
 * Solution for a specific error or problem
 */
export interface Solution {
  /** Solution identifier */
  id: string;

  /** Description of the solution */
  description: string;

  /** Files that were changed */
  files_changed: string[];

  /** Code changes or patches */
  changes?: string;

  /** Steps to apply the solution */
  steps: string[];

  /** Agent that provided the solution */
  agent_role: AgentRole;

  /** Timestamp when solution was created */
  timestamp: Date;

  /** Whether the solution was verified to work */
  verified: boolean;

  /** Verification method */
  verification_method?: string;

  /** Success rate (0-1) */
  success_rate?: number;
}

/**
 * Research entry with sources and findings
 */
export interface ResearchEntry {
  /** Unique research identifier */
  id: string;

  /** Session identifier */
  session_id: string;

  /** Timestamp of research */
  timestamp: Date;

  /** Research topic or question */
  topic: string;

  /** Key findings from the research */
  findings: string[];

  /** Sources consulted */
  sources: Source[];

  /** Confidence level in the findings */
  confidence: ConfidenceLevel;

  /** Domain of research */
  domain: Domain;

  /** Related domains */
  related_domains?: Domain[];

  /** Agent that conducted the research */
  agent_role: AgentRole;

  /** Summary of the research */
  summary: string;

  /** Recommendations based on findings */
  recommendations?: string[];

  /** Follow-up questions or areas for further research */
  follow_up?: string[];

  /** Tags for categorization */
  tags: string[];

  /** Related research entry IDs */
  related_research?: string[];

  /** Files analyzed during research */
  files_analyzed: string[];
}

/**
 * Source for research entries
 */
export interface Source {
  /** Source type (file, documentation, external) */
  type: 'file' | 'documentation' | 'external' | 'code' | 'comment' | 'test';

  /** Source location (file path, URL, etc.) */
  location: string;

  /** Relevant excerpt or quote */
  excerpt?: string;

  /** Reliability of the source */
  reliability?: ConfidenceLevel;

  /** When the source was accessed */
  accessed_at: Date;
}

/**
 * Conversation thread for linking related conversations
 */
export interface ConversationThread {
  /** Thread identifier */
  id: string;

  /** Thread title or topic */
  title: string;

  /** When thread started */
  started_at: Date;

  /** When thread was last updated */
  updated_at: Date;

  /** Participants (agent roles) */
  participants: AgentRole[];

  /** Memory entries in this thread */
  entries: string[];

  /** Domain of conversation */
  domain: Domain;

  /** Related domains */
  related_domains?: Domain[];

  /** Thread status */
  status: 'active' | 'resolved' | 'archived';

  /** Summary of the conversation */
  summary?: string;

  /** Key outcomes or decisions */
  outcomes?: string[];

  /** Tags for categorization */
  tags: string[];
}

/**
 * Pre-query context for automatic context retrieval
 */
export interface PreQueryContext {
  /** Task description that triggered the query */
  task_description: string;

  /** Files that will be affected */
  affected_files: string[];

  /** Relevant memory entries */
  relevant_memories: AgentMemoryEntry[];

  /** Recent decisions in related domains */
  relevant_decisions: DecisionNode[];

  /** Similar past tasks */
  similar_tasks: AgentMemoryEntry[];

  /** Known issues in affected files */
  known_issues: ErrorFingerprint[];

  /** Relevant research */
  relevant_research: ResearchEntry[];

  /** Suggested context to include */
  context_summary: string;

  /** Confidence in the context relevance */
  confidence: ConfidenceLevel;

  /** When context was generated */
  generated_at: Date;
}

/**
 * Insight report for periodic analysis
 */
export interface InsightReport {
  /** Report identifier */
  id: string;

  /** Report generation timestamp */
  generated_at: Date;

  /** Time period covered */
  period: {
    start: Date;
    end: Date;
  };

  /** Domains analyzed */
  domains: Domain[];

  /** Key patterns discovered */
  patterns: Pattern[];

  /** Trending issues */
  trending_issues: ErrorFingerprint[];

  /** Most impactful decisions */
  key_decisions: DecisionNode[];

  /** Research highlights */
  research_highlights: ResearchEntry[];

  /** Productivity metrics */
  metrics: {
    tasks_completed: number;
    bugs_fixed: number;
    decisions_made: number;
    research_conducted: number;
    files_modified: number;
  };

  /** Recommendations for improvement */
  recommendations: string[];

  /** Areas needing attention */
  attention_areas: {
    domain: Domain;
    reason: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }[];

  /** Overall health score (0-1) */
  health_score: number;
}

/**
 * Pattern discovered through analysis
 */
export interface Pattern {
  /** Pattern identifier */
  id: string;

  /** Pattern name */
  name: string;

  /** Pattern description */
  description: string;

  /** How often this pattern occurs */
  frequency: number;

  /** Domains where pattern is found */
  domains: Domain[];

  /** Files where pattern is found */
  files: string[];

  /** Type of pattern */
  type: 'code' | 'bug' | 'decision' | 'workflow' | 'performance';

  /** Whether this is a positive or negative pattern */
  valence: 'positive' | 'negative' | 'neutral';

  /** Confidence in pattern detection */
  confidence: ConfidenceLevel;

  /** When pattern was first detected */
  first_detected: Date;

  /** When pattern was last observed */
  last_observed: Date;

  /** Related memory entries */
  related_entries: string[];
}

/**
 * Query filter options for memory retrieval
 */
export interface QueryFilter {
  /** Filter by agent role */
  agent_role?: AgentRole | AgentRole[];

  /** Filter by entry type */
  entry_type?: EntryType | EntryType[];

  /** Filter by domain */
  domain?: Domain | Domain[];

  /** Filter by status */
  status?: EntryStatus | EntryStatus[];

  /** Filter by tags */
  tags?: string[];

  /** Filter by date range */
  date_range?: {
    start?: Date;
    end?: Date;
  };

  /** Filter by session */
  session_id?: string;

  /** Filter by files */
  files?: string[];

  /** Minimum importance score */
  min_importance?: number;

  /** Include only auto-include entries */
  auto_include_only?: boolean;
}

/**
 * Query result with metadata
 */
export interface QueryResult<T = AgentMemoryEntry> {
  /** The result item */
  item: T;

  /** Similarity score (0-1) for vector searches */
  score?: number;

  /** Matched metadata fields */
  matched_fields?: string[];

  /** Relevance explanation */
  relevance?: string;
}
