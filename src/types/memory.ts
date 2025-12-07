/**
 * Memory System Types for Pinecone RAG
 * 
 * This module defines the types used by the development memory system
 * that stores, tags, and retrieves development activity data in Pinecone.
 * 
 * @module types/memory
 */

// ============================================
// ENUMERATION TYPES
// ============================================

/**
 * Types of data that can be stored in the memory system
 */
export type DataType = 
  | 'session'          // AI conversation sessions
  | 'config'           // Configuration changes
  | 'code'             // Commits, PRs, code changes
  | 'deployment'       // Vercel/production deployments
  | 'learning'         // Research, principles, patterns
  | 'system_snapshot'  // Periodic state captures
  | 'error'            // Errors and incidents
  | 'metric';          // Performance/usage metrics

/**
 * Sources where data originates from
 */
export type Source = 
  | 'claude_code'      // Claude Code sessions
  | 'cursor'           // Cursor AI sessions
  | 'claude_desktop'   // Claude Desktop conversations
  | 'terminal'         // Terminal commands
  | 'github'           // Commits, PRs, issues
  | 'vercel'           // Deployments, logs
  | 'supabase'         // Database logs, auth events
  | 'datadog'          // Metrics, alerts
  | 'langsmith'        // LLM traces
  | 'automated';       // System-generated

/**
 * Project identifiers
 */
export type Project = 
  | 'prayermap'        // PrayerMap app
  | 'ora'              // Other project
  | 'infrastructure'   // Cross-project infra
  | 'general';         // Not project-specific

/**
 * Domain areas of development activity
 */
export type Domain = 
  | 'frontend'         // React, UI components
  | 'backend'          // API, server logic
  | 'database'         // Supabase, PostgreSQL
  | 'infrastructure'   // Vercel, AWS, configs
  | 'design'           // UI/UX, Figma
  | 'research'         // Investigation, learning
  | 'debugging'        // Bug investigation/fixing
  | 'testing'          // Tests, QA
  | 'security'         // Auth, RLS, permissions
  | 'performance';     // Optimization

/**
 * Types of actions performed
 */
export type Action = 
  | 'create'           // New feature/file/resource
  | 'update'           // Modify existing
  | 'delete'           // Remove something
  | 'fix'              // Bug fix
  | 'research'         // Investigation
  | 'deploy'           // Deployment
  | 'configure'        // Configuration change
  | 'troubleshoot'     // Debugging activity
  | 'document'         // Writing docs/learnings
  | 'refactor';        // Code improvement

/**
 * Status of the activity
 */
export type Status = 
  | 'success'          // Completed successfully
  | 'failure'          // Failed
  | 'in_progress'      // Still working
  | 'abandoned'        // Gave up on approach
  | 'partial';         // Partially complete

/**
 * Importance level for prioritization
 */
export type Importance = 'low' | 'medium' | 'high';


// ============================================
// DOCUMENT TYPES
// ============================================

/**
 * Base interface for all memory documents
 */
export interface MemoryDocumentBase {
  /** Unique identifier for the document */
  id: string;
  /** Type of data */
  data_type: DataType;
  /** Source system */
  source: Source;
  /** Project this relates to */
  project: Project;
  /** Domain area */
  domain: Domain;
  /** Action type */
  action: Action;
  /** Status of the activity */
  status: Status;
  /** Extracted entity names */
  entities: string[];
  /** Brief summary (max 100 chars) */
  summary: string;
  /** Importance level */
  importance: Importance;
  /** ISO8601 timestamp */
  timestamp: string;
  /** Date in YYYY-MM-DD format */
  session_date: string;
  /** ISO week in YYYY-Wxx format */
  week: string;
}

/**
 * Full memory document with content
 */
export interface MemoryDocument extends MemoryDocumentBase {
  /** Full content of the document */
  content: string;
  /** First 500 chars for preview */
  content_preview: string;
}


// ============================================
// SESSION-SPECIFIC TYPES
// ============================================

/**
 * Session document with additional session-specific fields
 */
export interface SessionDocument extends MemoryDocument {
  data_type: 'session';
  /** Duration of session in minutes */
  duration_minutes?: number;
  /** Files changed during session */
  files_changed?: string[];
}


// ============================================
// CODE-SPECIFIC TYPES
// ============================================

/**
 * Code/commit document with git-specific fields
 */
export interface CodeDocument extends MemoryDocument {
  data_type: 'code';
  /** Git commit hash */
  commit_hash?: string;
  /** Files changed */
  files_changed?: string[];
  /** Lines added */
  lines_added?: number;
  /** Lines removed */
  lines_removed?: number;
  /** Branch name */
  branch?: string;
  /** PR number if applicable */
  pr_number?: number;
}


// ============================================
// DEPLOYMENT-SPECIFIC TYPES
// ============================================

/**
 * Deployment document with deployment-specific fields
 */
export interface DeploymentDocument extends MemoryDocument {
  data_type: 'deployment';
  /** Deployment ID from provider */
  deployment_id?: string;
  /** Environment (production, preview, development) */
  environment?: 'production' | 'preview' | 'development';
  /** Error type if failed */
  error_type?: string;
  /** Error message if failed */
  error_message?: string;
  /** Build time in seconds */
  build_time_seconds?: number;
  /** Git ref (branch or commit) */
  git_ref?: string;
}


// ============================================
// CONFIG-SPECIFIC TYPES
// ============================================

/**
 * Configuration change document
 */
export interface ConfigDocument extends MemoryDocument {
  data_type: 'config';
  /** Type of configuration */
  config_type?: 'mcp_server' | 'environment' | 'package' | 'settings';
  /** State before change */
  before?: Record<string, unknown>;
  /** State after change */
  after?: Record<string, unknown>;
}


// ============================================
// LEARNING-SPECIFIC TYPES
// ============================================

/**
 * Learning/research document
 */
export interface LearningDocument extends MemoryDocument {
  data_type: 'learning';
  /** Type of learning */
  learning_type?: 'principle' | 'pattern' | 'anti_pattern' | 'research' | 'discovery';
  /** Category of the learning */
  category?: 'best_practice' | 'gotcha' | 'performance' | 'security' | 'architecture';
  /** Domains this applies to */
  applicability?: Domain[];
}


// ============================================
// SYSTEM SNAPSHOT TYPES
// ============================================

/**
 * System snapshot document
 */
export interface SystemSnapshotDocument extends MemoryDocument {
  data_type: 'system_snapshot';
  /** MCP server status */
  mcp_servers?: {
    connected: number;
    failed: number;
    list?: string[];
  };
  /** Build status */
  build_status?: 'passing' | 'failing' | 'unknown';
  /** Test status */
  test_status?: {
    passing: number;
    failing: number;
    skipped: number;
  };
  /** Git status */
  git_status?: {
    branch: string;
    uncommitted_files: number;
    last_commit?: string;
  };
  /** Package versions */
  package_versions?: Record<string, string>;
}


// ============================================
// QUERY TYPES
// ============================================

/**
 * Filters for querying the memory system
 */
export interface QueryFilters {
  /** Filter by data types */
  data_type?: DataType[];
  /** Filter by sources */
  source?: Source[];
  /** Filter by project */
  project?: Project;
  /** Filter by domains */
  domain?: Domain[];
  /** Filter by actions */
  action?: Action[];
  /** Filter by statuses */
  status?: Status[];
  /** Filter by date range start (ISO date) */
  date_from?: string;
  /** Filter by date range end (ISO date) */
  date_to?: string;
  /** Filter by entities (must contain any of these) */
  entities?: string[];
  /** Filter by importance */
  importance?: Importance[];
}

/**
 * Request to query the memory system
 */
export interface QueryRequest {
  /** Natural language query */
  query: string;
  /** Optional filters to narrow results */
  filters?: QueryFilters;
  /** Number of results to return (default: 10) */
  top_k?: number;
  /** Whether to include full content preview */
  include_content?: boolean;
}

/**
 * Single result from a memory query
 */
export interface QueryResult {
  /** Document ID */
  id: string;
  /** Relevance score (0-1) */
  score: number;
  /** Document metadata */
  metadata: MemoryDocumentBase;
  /** Content preview (if requested) */
  content?: string;
}

/**
 * Response from a memory query
 */
export interface QueryResponse {
  /** List of matching results */
  results: QueryResult[];
  /** Total count of matches (may be approximate) */
  total_count?: number;
  /** Query processing time in ms */
  processing_time_ms?: number;
}


// ============================================
// INGESTION TYPES
// ============================================

/**
 * Payload for submitting data to the memory system
 */
export interface IngestionPayload {
  /** Source of the data */
  source: Source;
  /** Type of data */
  data_type: DataType;
  /** Raw content to process */
  content: string;
  /** Optional pre-computed metadata */
  metadata?: Partial<MemoryDocumentBase>;
  /** Optional timestamp override (defaults to now) */
  timestamp?: string;
}

/**
 * Response from ingestion API
 */
export interface IngestionResponse {
  /** Whether ingestion was successful */
  success: boolean;
  /** Queue ID for tracking */
  queue_id: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Status of a queued ingestion item
 */
export type IngestionStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Database record for ingestion queue
 */
export interface IngestionQueueRecord {
  id: string;
  source: Source;
  data_type: DataType;
  content: string;
  metadata: Record<string, unknown>;
  status: IngestionStatus;
  error_message?: string;
  pinecone_id?: string;
  created_at: string;
  processed_at?: string;
}


// ============================================
// AUTO-TAGGING TYPES
// ============================================

/**
 * Result from the auto-tagger (Claude Haiku)
 */
export interface TaggingResult {
  /** Inferred domain */
  domain: Domain;
  /** Inferred action type */
  action: Action;
  /** Inferred status */
  status: Status;
  /** Extracted entities */
  entities: string[];
  /** Generated summary */
  summary: string;
  /** Assessed importance */
  importance: Importance;
}


// ============================================
// PINECONE METADATA TYPES
// ============================================

/**
 * Metadata stored in Pinecone vectors
 * Note: Pinecone metadata must be primitives or arrays of strings
 */
export interface PineconeMetadata {
  id: string;
  data_type: string;
  source: string;
  project: string;
  domain: string;
  action: string;
  status: string;
  entities: string[];
  summary: string;
  importance: string;
  timestamp: string;
  session_date: string;
  week: string;
  content_preview: string;
}


// ============================================
// UTILITY TYPES
// ============================================

/**
 * Union type for any memory document
 */
export type AnyMemoryDocument = 
  | SessionDocument
  | CodeDocument
  | DeploymentDocument
  | ConfigDocument
  | LearningDocument
  | SystemSnapshotDocument
  | MemoryDocument;

/**
 * Helper type for creating partial updates
 */
export type MemoryDocumentUpdate = Partial<Omit<MemoryDocument, 'id' | 'timestamp' | 'created_at'>>;

