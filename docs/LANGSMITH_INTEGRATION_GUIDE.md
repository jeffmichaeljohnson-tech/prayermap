# 🔍 LangSmith Integration Guide

## Overview

LangSmith provides comprehensive observability for all AI operations in PrayerMap. This guide covers the complete integration strategy.

## Current Status

✅ **Partially Integrated:**
- LangSmith SDK installed in `mcp-memory-server`
- Basic tracing for embeddings in MCP server
- Environment variable configured (`LANGSMITH_API_KEY`)

❌ **Needs Integration:**
- Main application (`src/`) services
- RAG operations
- OpenAI chat completions
- Pinecone operations
- Migration scripts
- Performance metrics

---

## Integration Checklist

### Phase 1: Foundation Setup

#### ✅ Task 1: Install LangSmith SDK
**File**: `package.json`
```bash
npm install langsmith
```

**Action**: Add to dependencies

#### ✅ Task 2: Create Centralized Tracing Service
**File**: `src/lib/langsmith.ts`

Create a centralized LangSmith service that:
- Initializes LangSmith client
- Provides tracing utilities
- Handles project configuration
- Manages trace lifecycle

**Key Features:**
- Singleton pattern
- Automatic initialization
- Error handling
- Project separation (embeddings, rag, memory, etc.)

#### ✅ Task 3: Environment Variables
**File**: `.env`

Ensure these are set:
```bash
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=prayermap-main  # Main project
LANGSMITH_ENDPOINT=https://api.smith.langchain.com  # Optional, defaults to this
```

**Projects to Configure:**
- `prayermap-main` - Main application traces
- `prayermap-embeddings` - Embedding operations
- `prayermap-rag` - RAG queries and generation
- `prayermap-memory` - Memory system operations
- `prayermap-migrations` - Migration operations

---

### Phase 2: Core Service Integration

#### ✅ Task 4: Embedding Operations Tracing
**Files**: 
- `src/memory/logger.ts`
- `src/memory/query.ts`
- `src/services/pineconeService.ts`
- `mcp-memory-server/src/embeddings.ts` (already done)

**What to Trace:**
- Embedding generation (OpenAI API calls)
- Embedding dimensions and model
- Text length and truncation
- Latency and costs
- Errors

**Trace Structure:**
```typescript
{
  name: "generate_embedding",
  run_type: "embedding",
  inputs: {
    text_length: number,
    model: "text-embedding-3-large",
    truncated: boolean
  },
  outputs: {
    dimension: 3072,
    latency_ms: number,
    cost_estimate: number
  }
}
```

#### ✅ Task 5: Pinecone Operations Tracing
**File**: `src/services/pineconeService.ts`

**What to Trace:**
- Vector uploads (batch operations)
- Vector queries (semantic search)
- Index stats retrieval
- Metadata enrichment operations
- Errors and retries

**Trace Structure:**
```typescript
{
  name: "pinecone_upload",
  run_type: "retriever",
  inputs: {
    vector_count: number,
    batch_size: number,
    index_name: string,
    namespace: string
  },
  outputs: {
    uploaded_count: number,
    latency_ms: number,
    errors: number
  }
}
```

#### ✅ Task 6: RAG Service Tracing
**File**: `src/services/ragService.ts`

**What to Trace:**
- RAG query processing
- Context retrieval from Pinecone
- LLM generation (GPT-4o)
- Citation extraction
- End-to-end latency
- Token usage and costs

**Trace Structure:**
```typescript
{
  name: "rag_query",
  run_type: "chain",
  inputs: {
    query: string,
    topK: number,
    model: "gpt-4o"
  },
  outputs: {
    response: string,
    citations: number,
    context_chunks: number,
    latency_ms: number,
    tokens_used: number,
    cost_estimate: number
  }
}
```

#### ✅ Task 7: OpenAI Chat Completions Tracing
**Files**:
- `src/services/ragService.ts` (GPT-4o calls)
- Any other GPT-4o usage

**What to Trace:**
- Chat completion requests
- Model and parameters
- Token usage (input/output)
- Latency
- Costs
- Errors

---

### Phase 3: Advanced Features

#### ✅ Task 8: Project Organization
**Strategy**: Use separate LangSmith projects for different concerns

**Projects:**
1. **prayermap-main** - Main application operations
2. **prayermap-embeddings** - All embedding operations
3. **prayermap-rag** - RAG queries and generation
4. **prayermap-memory** - Memory system (already configured)
5. **prayermap-migrations** - Migration operations

**Implementation:**
```typescript
const PROJECTS = {
  main: process.env.LANGSMITH_PROJECT || 'prayermap-main',
  embeddings: 'prayermap-embeddings',
  rag: 'prayermap-rag',
  memory: 'prayermap-memory',
  migrations: 'prayermap-migrations',
};
```

#### ✅ Task 9: Performance Metrics
**Track:**
- Latency (p50, p95, p99)
- Error rates
- Cost per operation
- Token usage
- Vector counts
- Query success rates

**Implementation:**
- Use LangSmith's built-in metrics
- Create custom dashboards
- Set up alerts for anomalies

#### ✅ Task 10: Feedback Collection
**Purpose**: Improve RAG quality through user feedback

**Implementation:**
- Add feedback buttons in UI
- Collect relevance scores
- Track user corrections
- Use for model fine-tuning

**LangSmith Integration:**
```typescript
await langsmithClient.createFeedback(runId, 'relevance', {
  score: 0.8,
  comment: 'Very helpful response'
});
```

---

### Phase 4: Migration & Scripts

#### ✅ Task 11: Migration Script Tracing
**File**: `scripts/migrate-with-enhanced-metadata.ts`

**What to Trace:**
- Migration progress
- Vector extraction
- Metadata enrichment
- Embedding regeneration
- Upload operations
- Errors and retries

**Benefits:**
- Monitor migration progress
- Debug issues
- Track costs
- Measure performance

---

### Phase 5: Testing & Validation

#### ✅ Task 12: Integration Testing
**Tests:**
- Verify traces are created
- Check trace data accuracy
- Validate project separation
- Test error handling
- Measure performance impact

#### ✅ Task 13: Dashboard Setup
**LangSmith Dashboards:**
1. **Overview Dashboard**
   - Total operations
   - Success rate
   - Average latency
   - Total costs

2. **Embeddings Dashboard**
   - Embedding generation metrics
   - Model usage
   - Cost tracking

3. **RAG Dashboard**
   - Query performance
   - Context retrieval quality
   - Generation latency
   - Citation accuracy

4. **Error Dashboard**
   - Error rates by operation
   - Common error patterns
   - Retry success rates

---

### Phase 6: Documentation

#### ✅ Task 14: Update Documentation
**Files to Update:**
- `README.md` - Add LangSmith section
- `MONITORING-GUIDE.md` - Add LangSmith observability
- `docs/LANGSMITH_INTEGRATION_GUIDE.md` - This file
- Code comments - Document tracing usage

---

## Implementation Priority

### High Priority (Do First)
1. ✅ Install LangSmith SDK
2. ✅ Create centralized tracing service
3. ✅ Integrate RAG service tracing
4. ✅ Integrate embedding tracing

### Medium Priority (Do Next)
5. ✅ Pinecone operations tracing
6. ✅ OpenAI chat completions tracing
7. ✅ Project organization
8. ✅ Performance metrics

### Low Priority (Polish)
9. ✅ Migration script tracing
10. ✅ Feedback collection
11. ✅ Dashboard setup
12. ✅ Documentation updates

---

## Code Examples

### Basic Tracing Pattern

```typescript
import { withTrace } from '@/lib/langsmith';

// Wrap async operations
const result = await withTrace(
  'operation_name',
  'chain', // or 'tool', 'retriever', 'embedding'
  { input: 'data' },
  async () => {
    // Your operation here
    return await someOperation();
  },
  { metadata: 'additional info' }
);
```

### Nested Tracing

```typescript
import { startTrace, createChildTrace, endTrace } from '@/lib/langsmith';

const parentTrace = await startTrace('rag_query', 'chain', { query });
const contextTrace = await createChildTrace(parentTrace, 'retrieve_context', 'retriever', {});
// ... retrieve context
await endTrace(contextTrace, { context });
const generationTrace = await createChildTrace(parentTrace, 'generate_response', 'llm', {});
// ... generate response
await endTrace(generationTrace, { response });
await endTrace(parentTrace, { final_result });
```

---

## Cost Tracking

LangSmith helps track:
- **OpenAI Costs**: Token usage × model pricing
- **Pinecone Costs**: Vector operations × pricing tier
- **Total AI Spend**: Aggregated across all operations

**Benefits:**
- Budget monitoring
- Cost optimization
- Usage patterns
- ROI analysis

---

## Next Steps

1. **Start with Foundation** (Tasks 1-3)
2. **Integrate Core Services** (Tasks 4-7)
3. **Add Advanced Features** (Tasks 8-10)
4. **Test & Validate** (Tasks 12-13)
5. **Document** (Task 14)

---

**Ready to integrate?** Start with the foundation tasks and work through systematically!

