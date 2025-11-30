# Memory System Configuration Guide

This guide covers the complete configuration for PrayerMap's memory system using Pinecone and LangSmith.

## 🚨 Critical Configuration Issues Fixed

### Index Name Standardization
**Problem**: MCP server and main client were using different Pinecone index names.

**Solution**: Both now use `ora-prayermap-knowledge` as the default (your actual index), configurable via `PINECONE_INDEX` or `PINECONE_INDEX_NAME` environment variables.

### LangSmith Project Standardization
**Problem**: Different services were using inconsistent LangSmith project names.

**Solution**: All services now use consistent project names with environment variable support.

---

## Required Environment Variables

### Pinecone (REQUIRED)

```bash
# Required: Your Pinecone API key
PINECONE_API_KEY=your_pinecone_api_key_here

# Optional: Index name (defaults to ora-prayermap-knowledge)
PINECONE_INDEX=ora-prayermap-knowledge
# OR
PINECONE_INDEX_NAME=ora-prayermap-knowledge

# Optional: Namespace (defaults to memories)
PINECONE_NAMESPACE=memories
```

**Get your Pinecone API key**: https://app.pinecone.io/

**Your Pinecone Index**:
- Name: `ora-prayermap-knowledge` ✅ (already exists)
- Dimensions: `3072` (for text-embedding-3-large) ✅
- Metric: `cosine`
- Type: `Serverless` ✅

### OpenAI (REQUIRED)

```bash
# Required: Your OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here
```

**Get your OpenAI API key**: https://platform.openai.com/api-keys

**Model Used**: `text-embedding-3-large` (3072 dimensions)

### LangSmith (OPTIONAL but recommended)

```bash
# Optional: Your LangSmith API key
LANGSMITH_API_KEY=your_langsmith_api_key_here

# Optional: Project names (defaults provided)
LANGSMITH_PROJECT=prayermap-main
LANGSMITH_PROJECT_EMBEDDINGS=prayermap-embeddings
LANGSMITH_PROJECT_RAG=prayermap-rag
LANGSMITH_PROJECT_MEMORY=prayermap-memory
LANGSMITH_PROJECT_MIGRATIONS=prayermap-migrations
LANGSMITH_PROJECT_PINECONE=prayermap-pinecone

# Optional: Endpoint (defaults to https://api.smith.langchain.com)
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

**Get your LangSmith API key**: https://smith.langchain.com/

---

## Configuration Files

### MCP Memory Server (`mcp-memory-server/`)

**File**: `mcp-memory-server/src/index.ts`

**Environment Variables Used**:
- `OPENAI_API_KEY` (required)
- `PINECONE_API_KEY` (required)
- `PINECONE_INDEX` or `PINECONE_INDEX_NAME` (optional, defaults to `ora-prayermap-knowledge`)
- `LANGSMITH_API_KEY` (optional)
- `LANGSMITH_PROJECT` or `LANGSMITH_PROJECT_MEMORY` (optional, defaults to `prayermap-memory`)
- `CLAUDE_CODE_PROJECTS` (optional, defaults to `~/.claude/projects`)

**Initialization**:
- Automatically initializes on first tool call
- Provides clear error messages if required variables are missing
- Logs initialization status including index name and LangSmith status

### Main Application (`src/memory/`)

**File**: `src/memory/pinecone-client.ts`

**Environment Variables Used**:
- `PINECONE_API_KEY` (required)
- `PINECONE_INDEX` or `PINECONE_INDEX_NAME` (optional, defaults to `ora-prayermap-knowledge`)
- `PINECONE_NAMESPACE` (optional, defaults to `memories`)

**Initialization**:
- Lazy initialization on first use
- Throws descriptive errors if API key is missing

**File**: `src/lib/langsmith.ts`

**Environment Variables Used**:
- `LANGSMITH_API_KEY` (optional)
- `LANGSMITH_PROJECT` (optional, defaults to `prayermap-main`)
- `LANGSMITH_PROJECT_EMBEDDINGS` (optional, defaults to `prayermap-embeddings`)
- `LANGSMITH_PROJECT_RAG` (optional, defaults to `prayermap-rag`)
- `LANGSMITH_PROJECT_MEMORY` (optional, defaults to `prayermap-memory`)
- `LANGSMITH_PROJECT_MIGRATIONS` (optional, defaults to `prayermap-migrations`)
- `LANGSMITH_PROJECT_PINECONE` (optional, defaults to `prayermap-pinecone`)
- `LANGSMITH_ENDPOINT` (optional, defaults to `https://api.smith.langchain.com`)

**Initialization**:
- Auto-initializes when module loads (Node.js only)
- Gracefully handles missing API key (tracing disabled)

---

## Verification Steps

### 1. Check Environment Variables

```bash
# Verify required variables are set
echo $PINECONE_API_KEY
echo $OPENAI_API_KEY

# Verify optional variables (if using LangSmith)
echo $LANGSMITH_API_KEY
```

### 2. Test MCP Memory Server

```bash
cd mcp-memory-server
npm run build
npm start
```

**Expected Output**:
```
✅ Memory server initialized successfully
   Pinecone Index: ora-prayermap-knowledge
   OpenAI Model: text-embedding-3-large
   LangSmith: ✅ Enabled
```

**If errors occur**:
- Check that `PINECONE_API_KEY` is set
- Check that `OPENAI_API_KEY` is set
- Verify index exists in Pinecone dashboard
- Check index name matches `PINECONE_INDEX` value

### 3. Test Main Application Memory Client

```typescript
import { pineconeClient } from '@/memory/pinecone-client';

// This will throw descriptive error if misconfigured
await pineconeClient.initialize();
const stats = await pineconeClient.getStats();
console.log('Pinecone stats:', stats);
```

### 4. Test LangSmith Integration

```typescript
import { initLangSmith, isTracingEnabled } from '@/lib/langsmith';

initLangSmith();
if (isTracingEnabled()) {
  console.log('✅ LangSmith tracing enabled');
} else {
  console.log('⚠️  LangSmith tracing disabled (API key not set)');
}
```

---

## Common Issues and Solutions

### Issue 1: "PINECONE_API_KEY environment variable is not set"

**Solution**:
1. Create `.env` file in project root
2. Add `PINECONE_API_KEY=your_key_here`
3. Ensure `.env` is loaded (check your runtime environment)

### Issue 2: "Index ora-prayermap-knowledge not found"

**Solution**:
1. Verify index exists in Pinecone dashboard: https://app.pinecone.io/
2. Your index should be: `ora-prayermap-knowledge` with dimensions `3072`
3. If using a different index, set `PINECONE_INDEX` environment variable to match your index name

### Issue 3: "Invalid vector dimension: expected 3072"

**Solution**:
- Ensure you're using `text-embedding-3-large` model (3072 dimensions)
- Check that your Pinecone index was created with dimension 3072
- Verify `EMBEDDING_DIMENSION` constant matches your index

### Issue 4: LangSmith tracing not working

**Solution**:
1. Verify `LANGSMITH_API_KEY` is set
2. Check LangSmith dashboard: https://smith.langchain.com/
3. Verify project names match between code and dashboard
4. Check network connectivity to `api.smith.langchain.com`

### Issue 5: MCP server and main app using different indexes

**Solution**:
- Both now use `ora-prayermap-knowledge` as default (your actual index)
- Set `PINECONE_INDEX` environment variable to override if needed
- Ensure both services read from same `.env` file or have matching env vars

---

## Best Practices

1. **Use `.env` file**: Never commit API keys to git
2. **Consistent naming**: Using `ora-prayermap-knowledge` as the index name (your actual index)
3. **Environment-specific configs**: Use different indexes for dev/staging/prod if needed
4. **Monitor costs**: Track Pinecone and OpenAI usage via LangSmith
5. **Test initialization**: Always verify initialization succeeds before deploying

---

## Quick Reference

| Service | Required Env Vars | Optional Env Vars |
|---------|------------------|-------------------|
| MCP Memory Server | `PINECONE_API_KEY`, `OPENAI_API_KEY` | `PINECONE_INDEX` (defaults to `ora-prayermap-knowledge`), `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT` |
| Main App Memory | `PINECONE_API_KEY` | `PINECONE_INDEX` (defaults to `ora-prayermap-knowledge`), `PINECONE_NAMESPACE` |
| LangSmith Service | None | `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT_*` |

---

**Last Updated**: 2024-11-30  
**Status**: ✅ Configuration standardized and verified

