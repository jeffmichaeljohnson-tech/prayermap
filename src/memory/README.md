# PrayerMap Memory System Core

A Pinecone-based agent memory architecture for multi-agent development workflows.

## Overview

The Memory System Core provides persistent, searchable memory for AI agents working on PrayerMap. It enables:

- **Semantic Search**: Find relevant context using natural language queries
- **Decision Tracking**: Record and retrieve architectural decisions
- **Error Fingerprinting**: Match and solve recurring errors instantly
- **Research Repository**: Store and query research findings
- **Auto-Context**: Automatically gather relevant context for new tasks
- **Hot Cache**: Fast access to frequently used data

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Memory System Core                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Logger   │  │  Query   │  │  Cache   │  │  Types   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘   │
│       │             │             │                          │
│       └─────────────┴─────────────┘                          │
│                     │                                        │
│              ┌──────▼───────┐                               │
│              │   Pinecone   │                               │
│              │    Client    │                               │
│              └──────────────┘                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
npm install @pinecone-database/pinecone uuid
npm install --save-dev @types/uuid
```

### 2. Set Environment Variables

```bash
# .env
PINECONE_API_KEY=your_api_key_here
SESSION_ID=optional_session_identifier
```

### 3. Create Pinecone Index

Create an index in the Pinecone dashboard with:
- **Name**: `prayermap-agent-memory`
- **Dimensions**: `3072` (for OpenAI text-embedding-3-large)
- **Metric**: `cosine`

### 4. Configure OpenAI API Key

The memory system uses OpenAI's text-embedding-3-large model for generating embeddings:

```bash
# Add to .env
OPENAI_API_KEY=your_openai_api_key_here
```

Get your API key from: https://platform.openai.com/api-keys

**Note**: The OpenAI integration is already implemented in `logger.ts` and `query.ts` using the latest `text-embedding-3-large` model, which provides maximum semantic search accuracy and better performance on complex queries.

## Usage

### Logging Memories

```typescript
import { logTask, logDecision, logError, logResearch } from './memory';

// Log a completed task
await logTask({
  agent_role: 'developer',
  content: 'Implemented user authentication with Supabase',
  files_touched: ['/src/services/authService.ts'],
  domain: 'authentication',
  tags: ['auth', 'supabase'],
});

// Log a decision
await logDecision({
  id: uuidv4(),
  session_id: 'session-123',
  timestamp: new Date(),
  topic: 'State Management',
  decision: 'Use Zustand for global state',
  rationale: 'Lightweight, TypeScript-friendly, no boilerplate',
  alternatives: ['Redux', 'Context API', 'Jotai'],
  domain: 'ui',
  files_affected: ['/src/store/userStore.ts'],
  agent_role: 'architect',
  impact: 'high',
  reversible: true,
  status: 'implemented',
  tags: ['state-management', 'zustand'],
});

// Log an error
await logError({
  id: uuidv4(),
  session_id: 'session-123',
  timestamp: new Date(),
  error_hash: 'auth_session_expired_e4f2a',
  message: 'Session expired during prayer creation',
  error_type: 'AuthenticationError',
  file: '/src/services/prayerService.ts',
  line_number: 42,
  domain: 'prayers',
  resolved: false,
  occurrence_count: 3,
  severity: 'high',
  tags: ['auth', 'session'],
  agent_role: 'debugger',
});

// Log research
await logResearch({
  id: uuidv4(),
  session_id: 'session-123',
  timestamp: new Date(),
  topic: 'Map marker clustering performance',
  findings: [
    'Supercluster is the most performant library',
    'Should cluster above 100 markers',
    'Can reduce render time by 80%',
  ],
  sources: [
    {
      type: 'external',
      location: 'https://github.com/mapbox/supercluster',
      accessed_at: new Date(),
      reliability: 'high',
    },
  ],
  confidence: 'high',
  domain: 'map',
  agent_role: 'researcher',
  summary: 'Supercluster provides excellent performance for map marker clustering',
  files_analyzed: ['/src/components/Map.tsx'],
});
```

### Querying Memories

```typescript
import {
  findSimilar,
  findByDomain,
  findDecisions,
  findErrorSolution,
  getPreQueryContext,
} from './memory';

// Semantic search for similar content
const similar = await findSimilar('authentication issues with Supabase', 10);

// Get all memories in a domain
const prayerMemories = await findByDomain('prayers');

// Find decisions related to a topic
const decisions = await findDecisions('state management');

// Find solution for a known error
const solution = await findErrorSolution('auth_session_expired_e4f2a');

// Get automatic context for a new task
const context = await getPreQueryContext(
  'Add push notifications for new prayers',
  ['/src/services/notificationService.ts']
);

console.log('Context Summary:', context.context_summary);
console.log('Relevant Decisions:', context.relevant_decisions.length);
console.log('Known Issues:', context.known_issues.length);
console.log('Similar Tasks:', context.similar_tasks.length);
```

### Using the Cache

```typescript
import {
  getHotCache,
  refreshCache,
  CacheHelper,
  getFromCache,
  setInCache,
} from './memory';

// Get hot cache (refreshes every 5 minutes)
const hotCache = getHotCache();
console.log('Recent Decisions:', hotCache?.recent_decisions);
console.log('Recent Errors:', hotCache?.recent_errors);
console.log('Common Patterns:', hotCache?.common_patterns);

// Manually refresh cache
await refreshCache();

// Use cache helper
const recentDecisions = await CacheHelper.getRecentDecisions();
const unresolvedErrors = await CacheHelper.getUnresolvedErrors();

// Custom caching
setInCache('my-data', { foo: 'bar' }, 60000); // 1 minute TTL
const data = getFromCache('my-data');
```

## Key Concepts

### Agent Roles

- `researcher`: Conducts research and gathers information
- `archivist`: Organizes and maintains memories
- `architect`: Makes architectural decisions
- `developer`: Writes code and implements features
- `tester`: Writes and runs tests
- `reviewer`: Reviews code and provides feedback
- `debugger`: Finds and fixes bugs
- `optimizer`: Improves performance
- `security`: Handles security concerns
- `devops`: Manages deployment and infrastructure

### Domains

PrayerMap-specific domains:
- `authentication`: User auth, sessions, permissions
- `prayers`: Prayer CRUD, sharing, privacy
- `map`: Map display, markers, clustering
- `notifications`: Push notifications, alerts
- `admin`: Admin dashboard, user management
- `storage`: File upload, media handling
- `mobile`: Mobile-specific features
- `animations`: UI animations, transitions
- `database`: Database schema, queries
- `api`: API endpoints, routes
- `ui`: UI components, layouts
- `testing`: Tests, test utilities
- `deployment`: CI/CD, builds, releases

### Entry Types

- `task_completed`: A task was finished
- `bug_found`: A bug was discovered
- `bug_fixed`: A bug was resolved
- `decision`: An architectural decision was made
- `research`: Research was conducted
- `handoff`: Work was handed off between agents
- `learning`: A pattern or lesson was learned
- `pattern`: A code pattern was identified
- `code_change`: Code was modified
- `test_result`: A test was run
- `deployment`: Code was deployed
- `configuration`: Configuration was changed

### Importance Scoring

Memories are automatically scored for importance (0-1):
- **0.9+**: Critical decisions, security findings
- **0.7-0.8**: Important decisions, bug fixes, deployment
- **0.5-0.7**: Research, learning, patterns
- **0.3-0.5**: Task completions, code changes
- **< 0.3**: Minor updates, temporary notes

Entries with `importance > 0.7` are automatically included in context retrieval.

## Pre-Query Context

The `getPreQueryContext` function is the key feature for automatic context retrieval:

```typescript
const context = await getPreQueryContext(
  'Fix prayer creation validation',
  ['/src/services/prayerService.ts']
);
```

It automatically gathers:
1. **Similar Past Tasks**: Previous work on similar topics
2. **Relevant Decisions**: Architectural decisions affecting the task
3. **Known Issues**: Errors in the affected files
4. **Relevant Research**: Research on related topics
5. **Important Memories**: High-importance entries in related domains

Returns a `PreQueryContext` with:
- Organized context data
- Confidence level (low/medium/high/verified)
- Human-readable summary
- Timestamp

## Best Practices

### 1. Log Consistently

Log important events as they happen:
```typescript
// After completing a task
await logTask({ ... });

// After making a decision
await logDecision({ ... });

// When encountering an error
await logError({ ... });
```

### 2. Use Descriptive Content

Write clear, searchable descriptions:
```typescript
// Good
content: 'Implemented JWT token refresh logic to prevent session expiration during long prayer sessions'

// Bad
content: 'Fixed auth thing'
```

### 3. Tag Appropriately

Use relevant tags for better filtering:
```typescript
tags: ['authentication', 'jwt', 'session', 'prayer-creation']
```

### 4. Link Related Entries

Build a knowledge graph:
```typescript
{
  parent_id: 'original-decision-id',
  related_entries: ['related-task-1', 'related-research-1'],
}
```

### 5. Leverage Pre-Query Context

Always get context before starting a task:
```typescript
const context = await getPreQueryContext(taskDescription, affectedFiles);
// Use context to inform your implementation
```

## Performance

- **Vector Search**: ~100ms for similarity queries
- **Metadata Search**: ~50ms for filtered queries
- **Hot Cache**: <1ms for cached data
- **Batch Upserts**: 100 entries per batch
- **Auto-refresh**: Every 5 minutes

## Monitoring

```typescript
import { pineconeClient, getCacheStats } from './memory';

// Pinecone stats
const stats = await pineconeClient.getStats();
console.log('Total vectors:', stats.totalRecordCount);

// Cache stats
const cacheStats = getCacheStats();
console.log('Cache size:', cacheStats.size);
console.log('Hot cache:', cacheStats.hotCache);
```

## Error Handling

All functions include retry logic and error handling:
- **3 retries** with exponential backoff
- Detailed error messages
- Fallback to empty results on failure

## Future Enhancements

- [x] Integrate OpenAI embeddings (✅ Completed - using text-embedding-3-large)
- [ ] Add graph visualization of decision dependencies
- [ ] Implement automatic insight generation
- [ ] Add conversation threading
- [ ] Build LLM context injection helpers
- [ ] Create CLI for memory management
- [ ] Add memory export/import
- [ ] Implement memory versioning

## License

Part of PrayerMap - All rights reserved.
