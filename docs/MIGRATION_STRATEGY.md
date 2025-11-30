# 🎯 Migration Strategy for Mixed-Project Index

## Current Situation

Your `ora-prayermap` index contains:
- **~33% PrayerMap vectors** (1 out of 3 currently)
- **~67% Other project vectors** (2 out of 3 currently)

**Note**: The actual distribution may vary, but you mentioned about half are PrayerMap.

## Migration Options

### Option 1: Migrate Only PrayerMap Vectors (Recommended)

**Best for**: Clean separation, PrayerMap-specific index

```bash
# Migrate only PrayerMap vectors
npx tsx scripts/migrate-with-enhanced-metadata.ts \
  --old-index ora-prayermap \
  --new-index ora-prayermap-knowledge \
  --filter-project prayermap \
  --namespace prayermap \
  --batch-size 10
```

**Benefits:**
- ✅ Clean PrayerMap-only index
- ✅ Better organization with namespace
- ✅ Lower cost (only migrate what you need)
- ✅ Easier to manage and query

**Result:**
- New index: `ora-prayermap-knowledge`
- Namespace: `prayermap`
- Contains: Only PrayerMap vectors with enhanced metadata

### Option 2: Migrate All Vectors with Namespace Separation

**Best for**: Preserving all data, organizing by project

```bash
# Migrate all vectors, use namespaces to separate
npx tsx scripts/migrate-with-enhanced-metadata.ts \
  --old-index ora-prayermap \
  --new-index ora-prayermap-knowledge \
  --namespace default \
  --batch-size 10
```

Then migrate PrayerMap separately:
```bash
# Migrate PrayerMap to its own namespace
npx tsx scripts/migrate-with-enhanced-metadata.ts \
  --old-index ora-prayermap \
  --new-index ora-prayermap-knowledge \
  --filter-project prayermap \
  --namespace prayermap \
  --batch-size 10
```

**Benefits:**
- ✅ Preserves all data
- ✅ Organized by namespace
- ✅ Can query by namespace or across all

**Result:**
- New index: `ora-prayermap-knowledge`
- Namespaces: `default` (all), `prayermap` (PrayerMap only)
- Contains: All vectors with enhanced metadata

### Option 3: Separate Indexes

**Best for**: Complete separation, different projects

```bash
# Create PrayerMap-only index
npx tsx scripts/migrate-with-enhanced-metadata.ts \
  --old-index ora-prayermap \
  --new-index ora-prayermap-knowledge \
  --filter-project prayermap \
  --batch-size 10

# Create other projects index (if needed)
npx tsx scripts/migrate-with-enhanced-metadata.ts \
  --old-index ora-prayermap \
  --new-index other-projects-knowledge \
  --filter-project other \
  --batch-size 10
```

**Benefits:**
- ✅ Complete separation
- ✅ Independent management
- ✅ Different configurations possible

## Recommended Approach

**For PrayerMap project**: Use **Option 1** (PrayerMap-only with namespace)

**Why:**
1. Clean separation of concerns
2. Lower migration cost
3. Better organization
4. Easier to query PrayerMap-specific content
5. Can always migrate other projects later if needed

## Step-by-Step Migration

### Step 1: Analyze Current Index

```bash
# See what's in your index
npx tsx scripts/analyze-index-contents.ts
```

This will show you:
- Total vectors
- Project distribution
- Sources
- Content types
- Sample vectors

### Step 2: Migrate PrayerMap Vectors

```bash
# Migrate only PrayerMap vectors with enhanced metadata
npx tsx scripts/migrate-with-enhanced-metadata.ts \
  --old-index ora-prayermap \
  --new-index ora-prayermap-knowledge \
  --filter-project prayermap \
  --namespace prayermap \
  --batch-size 10 \
  --model gpt-4o
```

### Step 3: Verify Migration

```bash
# Test the new index
PINECONE_INDEX_NAME=ora-prayermap-knowledge npx tsx scripts/test-embedding-upgrade.ts
```

### Step 4: Update Environment Variables

```bash
# Update .env
PINECONE_INDEX_NAME=ora-prayermap-knowledge
```

### Step 5: Update Code to Use Namespace

If you used a namespace, update your queries:

```typescript
// In your Pinecone queries, specify namespace
const index = pinecone.index('ora-prayermap-knowledge');
const namespaceIndex = index.namespace('prayermap');

// Query PrayerMap namespace
const results = await namespaceIndex.query({
  vector: embedding,
  topK: 10,
});
```

## Cost Estimate

**For PrayerMap vectors only** (assuming ~50% of total):

If you have 1000 total vectors:
- PrayerMap vectors: ~500
- Cost with enrichment: ~$10-25
- Cost without enrichment: ~$0.05-0.25

**Much more cost-effective** than migrating everything!

## Metadata Enhancement Benefits

Even with filtering, you still get:
- ✅ Enhanced metadata for PrayerMap vectors
- ✅ Better search quality
- ✅ Advanced filtering capabilities
- ✅ Relationship mapping
- ✅ Quality metrics

## Next Steps

1. **Analyze your index** to see exact distribution
2. **Choose migration option** (recommend Option 1)
3. **Run migration** with PrayerMap filter
4. **Verify results** and test queries
5. **Update code** to use new index/namespace

---

**Ready to migrate?** Start with the analysis script to see your exact distribution!

