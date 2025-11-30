# 🎯 Enhanced Metadata Migration Guide

## Overview

This guide explains how to migrate your Pinecone index from `text-embedding-3-small` (1536 dimensions) to `text-embedding-3-large` (3072 dimensions) **with sophisticated metadata enrichment**.

## Why Enhanced Metadata?

During migration, you have a unique opportunity to:

1. **Extract existing metadata** from old vectors
2. **Enrich with GPT-4o** for deeper analysis
3. **Add sophisticated categorization** that wasn't possible before
4. **Improve search quality** with better metadata
5. **Enable advanced filtering** and RAG capabilities

## What Gets Enhanced?

### Core Metadata (Preserved)
- Conversation IDs
- Timestamps
- Participants
- Source information

### Enhanced Analysis (New/Improved)
- **Topics**: Up to 15 main topics
- **Entities**: Named entities with relationships
- **Sentiment**: Positive/negative/neutral/mixed
- **Complexity**: Simple/moderate/complex/expert
- **Technologies**: Frameworks, libraries, tools
- **Domains**: Frontend, backend, mobile, devops, etc.
- **Intent**: Bug fix, feature request, code review, etc.
- **Outcome**: Resolution or outcome description
- **Decisions**: Key decisions made
- **Action Items**: Identified action items
- **Blockers**: Mentioned blockers

### Quality Metrics (New)
- **Quality Score**: 0-1 rating
- **Technical Debt**: 0-1 score
- **Security Risk**: None/low/medium/high
- **Performance Impact**: None/low/medium/high
- **User Impact**: None/low/medium/high

### Code Analysis (New)
- **Code Snippets**: Language, purpose, complexity
- **Patterns**: Design patterns used
- **Anti-Patterns**: Anti-patterns identified
- **Best Practices**: Best practices mentioned

### Relationships (New)
- **Related Conversations**: Linked conversation IDs
- **References**: Referenced files, docs
- **Dependencies**: Dependencies mentioned
- **Affected Systems**: Systems affected

### Search Optimization (Enhanced)
- **Search Keywords**: Up to 25 keywords
- **Semantic Tags**: Up to 20 semantic tags
- **Categories**: Primary/secondary categories

### Lifecycle Metadata (New)
- **Phase**: Planning/development/testing/deployment/maintenance
- **Status**: Active/completed/blocked/archived

## Migration Process

### Step 1: Prerequisites

```bash
# Ensure environment variables are set
export PINECONE_API_KEY=your_key
export OPENAI_API_KEY=your_key
export PINECONE_INDEX_NAME=ora-prayermap-knowledge
```

### Step 2: Run Migration

```bash
# Basic migration with enrichment
npx tsx scripts/migrate-with-enhanced-metadata.ts \
  --old-index ora-prayermap \
  --new-index ora-prayermap-knowledge \
  --batch-size 10

# With custom model
npx tsx scripts/migrate-with-enhanced-metadata.ts \
  --old-index ora-prayermap \
  --new-index ora-prayermap-knowledge \
  --batch-size 10 \
  --model gpt-4o

# Skip enrichment (faster, but less metadata)
npx tsx scripts/migrate-with-enhanced-metadata.ts \
  --old-index ora-prayermap \
  --new-index ora-prayermap-knowledge \
  --no-enrichment
```

### Step 3: Verify Migration

```bash
# Test the new index
PINECONE_INDEX_NAME=ora-prayermap-knowledge npx tsx scripts/test-embedding-upgrade.ts
```

## Cost Considerations

### OpenAI API Costs

**Metadata Enrichment:**
- GPT-4o: ~$0.005 per 1K tokens (input) + ~$0.015 per 1K tokens (output)
- Average: ~$0.02-0.05 per vector (depending on content length)
- For 1000 vectors: ~$20-50

**Embedding Regeneration:**
- text-embedding-3-large: $0.13 per 1M tokens
- Average: ~$0.0001-0.0005 per vector
- For 1000 vectors: ~$0.10-0.50

**Total Cost per 1000 vectors:**
- With enrichment: ~$20-50
- Without enrichment: ~$0.10-0.50

### Recommendation

- **Small indexes (<1000 vectors)**: Use enrichment
- **Medium indexes (1000-10000 vectors)**: Use enrichment with batching
- **Large indexes (>10000 vectors)**: Consider selective enrichment or skip

## Benefits of Enhanced Metadata

### 1. Better Search Quality

**Before:**
```typescript
// Basic search
query: "prayer response bug"
results: Generic matches
```

**After:**
```typescript
// Enhanced search with metadata filters
query: "prayer response bug"
filters: {
  intent: ["bug_fix"],
  technologies: ["react", "supabase"],
  status: "completed"
}
results: Highly relevant, filtered matches
```

### 2. Advanced Filtering

```typescript
// Filter by quality metrics
filters: {
  quality: { $gte: 0.8 },
  technicalDebt: { $lt: 0.3 },
  securityRisk: "none"
}

// Filter by impact
filters: {
  userImpact: "high",
  performanceImpact: { $in: ["medium", "high"] }
}

// Filter by phase
filters: {
  phase: "development",
  status: "active"
}
```

### 3. Better RAG Context

Enhanced metadata provides:
- **Better context selection**: Filter by relevance, quality, impact
- **Relationship mapping**: Find related conversations
- **Code understanding**: Identify code patterns and anti-patterns
- **Decision tracking**: Track decisions and outcomes

### 4. Analytics and Insights

With enriched metadata, you can:
- Analyze technical debt trends
- Track security risks over time
- Measure performance impact
- Understand user impact patterns
- Identify common blockers

## Metadata Schema

See `src/services/pineconeService.ts` for the full `ConversationMetadata` interface.

## Troubleshooting

### "No vectors found in old index"
- Check index name is correct
- Verify index has vectors: `npx tsx scripts/check-pinecone-index.ts`

### "Metadata enrichment failed"
- Check OpenAI API key is valid
- Verify you have GPT-4o access
- Check rate limits
- Try smaller batch size

### "Embedding generation failed"
- Check OpenAI API key
- Verify text-embedding-3-large access
- Check rate limits
- Ensure text length < 8000 chars

### "Upload failed"
- Verify new index exists
- Check index dimension is 3072
- Verify Pinecone API key
- Check rate limits

## Best Practices

1. **Test with small batch first**: Start with `--batch-size 5` to test
2. **Monitor costs**: Track OpenAI API usage during migration
3. **Backup old index**: Don't delete old index until migration verified
4. **Verify results**: Check sample vectors after migration
5. **Update environment**: Update `.env` with new index name

## Next Steps

After migration:

1. ✅ Update `.env` with new index name
2. ✅ Test RAG system with new index
3. ✅ Verify search quality improved
4. ✅ Test advanced filtering
5. ✅ Monitor costs and performance
6. ✅ Archive or delete old index (after verification)

---

**Ready to migrate?** Run the migration script and watch your metadata get supercharged! 🚀

