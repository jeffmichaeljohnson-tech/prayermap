# 🔄 Pinecone Index Upgrade Guide

**Important**: Before deleting any indexes, read this guide carefully!

---

## ⚠️ Critical Warning

**DO NOT DELETE INDEXES WITHOUT BACKING UP DATA FIRST!**

Pinecone indexes cannot be upgraded in-place. You must:
1. **Export data** from the old index
2. **Create a new index** with upgraded configuration
3. **Import data** to the new index
4. **Verify migration** success
5. **Then** delete the old index (optional)

---

## 🤔 What Type of Upgrade Are You Doing?

### Option 1: Upgrading Pinecone Plan/Tier

**If you're upgrading your Pinecone plan** (Free → Starter → Standard, etc.):
- ✅ **You DON'T need to delete indexes**
- ✅ Indexes automatically get upgraded resources
- ✅ No data migration needed
- ✅ Just upgrade your plan in Pinecone dashboard

**Action**: Go to [Pinecone Dashboard](https://app.pinecone.io/) → Settings → Billing → Upgrade Plan

### Option 2: Changing Index Configuration

**If you're changing index settings** (dimension, metric, region, etc.):
- ⚠️ **You MUST migrate data**
- ⚠️ Cannot change these settings in-place
- ⚠️ Requires data export/import

**Action**: Follow the migration guide below

### Option 3: Upgrading Index Type (Pod → Serverless)

**If you're upgrading from Pod-based to Serverless**:
- ⚠️ **You MUST migrate data**
- ⚠️ Different architecture, requires migration
- ✅ Serverless is better for most use cases

**Action**: Follow the migration guide below

---

## 📋 Safe Migration Process

### Step 1: Check Your Current Indexes

```bash
# Check what indexes you have
npx tsx scripts/check-pinecone-index.ts
```

**Your current indexes:**
- `ora-prayermap` (dimension: 1536)
- `mcp-wp-knowledge` (dimension: 1536)
- `mcp-wp-prod` (dimension: 1536)

### Step 2: Export Data from Old Index

**Option A: Use Pinecone Dashboard (Recommended)**

1. Go to [Pinecone Dashboard](https://app.pinecone.io/)
2. Select your index (`ora-prayermap`)
3. Go to **Data** → **Export**
4. Export all vectors to a file (JSON or CSV)
5. Save the export file securely

**Option B: Use Pinecone Export API**

```bash
# Use Pinecone's export API (requires API key)
curl -X POST "https://api.pinecone.io/indexes/ora-prayermap/export" \
  -H "Api-Key: $PINECONE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"s3Bucket": "your-bucket", "s3Key": "export.json"}'
```

**Option C: Query All Vectors (Slow, for small indexes)**

```typescript
// Use the migration script (see scripts/migrate-pinecone-index.ts)
// This queries all vectors but is slow for large indexes
```

### Step 3: Create New Index with Upgraded Configuration

```bash
# Create new index with upgraded settings
npx tsx scripts/migrate-pinecone-index.ts \
  --old-index ora-prayermap \
  --new-index ora-prayermap-v2 \
  --dimension 1536 \
  --metric cosine \
  --cloud aws \
  --region us-east-1
```

**Or manually:**

```typescript
import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

await pinecone.createIndex({
  name: 'ora-prayermap-v2',
  dimension: 1536,
  metric: 'cosine',
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1',
    },
  },
});
```

### Step 4: Import Data to New Index

**Option A: Use Pinecone Dashboard**

1. Go to new index (`ora-prayermap-v2`)
2. Go to **Data** → **Import**
3. Upload your export file
4. Wait for import to complete

**Option B: Use Pinecone Import API**

```bash
# Import from S3
curl -X POST "https://api.pinecone.io/indexes/ora-prayermap-v2/import" \
  -H "Api-Key: $PINECONE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"s3Bucket": "your-bucket", "s3Key": "export.json"}'
```

**Option C: Use SDK (for programmatic import)**

```typescript
import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index('ora-prayermap-v2');

// Import vectors in batches
const vectors = [/* your exported vectors */];
const batchSize = 100;

for (let i = 0; i < vectors.length; i += batchSize) {
  const batch = vectors.slice(i, i + batchSize);
  await index.upsert(batch);
}
```

### Step 5: Verify Migration

```bash
# Check both indexes have same vector count
npx tsx scripts/check-pinecone-index.ts
```

**Verify:**
- ✅ New index has same or more vectors
- ✅ Test a query on new index
- ✅ Compare results between old and new

### Step 6: Update Environment Variables

```bash
# Update .env file
PINECONE_INDEX=ora-prayermap-v2
# or
PINECONE_INDEX_NAME=ora-prayermap-v2
```

### Step 7: Test Your Application

```bash
# Test RAG system with new index
npm run dev
# Try a query to verify it works
```

### Step 8: Delete Old Index (Optional, After Verification)

**⚠️ ONLY DELETE AFTER VERIFICATION!**

```bash
# Delete old index (with confirmation)
npx tsx scripts/migrate-pinecone-index.ts \
  --old-index ora-prayermap \
  --new-index ora-prayermap-v2 \
  --delete-old
```

**Or manually:**

```typescript
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
await pinecone.deleteIndex('ora-prayermap');
```

---

## 🎯 Recommended Approach

### For Your Current Setup

**If you're just upgrading your Pinecone plan:**
1. ✅ **Don't delete anything**
2. ✅ Upgrade plan in dashboard
3. ✅ Indexes automatically get more resources

**If you're changing index configuration:**
1. ⚠️ Export data first (use dashboard export)
2. ⚠️ Create new index with new settings
3. ⚠️ Import data to new index
4. ⚠️ Test thoroughly
5. ⚠️ Update environment variables
6. ⚠️ Delete old index only after everything works

---

## 💡 Best Practices

### 1. Always Backup First

- Export data before any migration
- Keep export files for at least 30 days
- Verify export file integrity

### 2. Test Before Deleting

- Run queries on new index
- Compare results with old index
- Test your application thoroughly
- Keep old index for at least 1 week

### 3. Use Serverless (Recommended)

- Serverless indexes are better for most use cases
- Auto-scaling, pay-per-use
- No pod management needed
- Easier to upgrade/downgrade

### 4. Monitor Costs

- Serverless costs based on usage
- Monitor in Pinecone dashboard
- Set up usage alerts

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T Delete Indexes Without Backup

**Bad:**
```bash
# DON'T DO THIS!
pinecone.deleteIndex('ora-prayermap')  # Data lost forever!
```

**Good:**
```bash
# Export first, then delete
# 1. Export data
# 2. Create new index
# 3. Import data
# 4. Verify
# 5. Then delete old index
```

### ❌ DON'T Skip Verification

Always verify migration before deleting:
- Check vector counts match
- Test queries work
- Compare results

### ❌ DON'T Update Environment Variables Too Early

Wait until:
- Migration is complete
- Data is imported
- Tests pass
- Then update `.env`

---

## 📊 Migration Checklist

- [ ] Identified what type of upgrade you need
- [ ] Exported data from old index
- [ ] Verified export file integrity
- [ ] Created new index with upgraded settings
- [ ] Imported data to new index
- [ ] Verified vector counts match
- [ ] Tested queries on new index
- [ ] Updated environment variables
- [ ] Tested application with new index
- [ ] Kept old index for 1 week (safety)
- [ ] Deleted old index (after verification)

---

## 🆘 If Something Goes Wrong

### Data Loss Prevention

1. **Stop immediately** if migration fails
2. **Don't delete old index** until new one works
3. **Restore from backup** if needed
4. **Contact Pinecone support** for help

### Recovery Steps

1. Old index still exists → Use it
2. Export failed → Retry export
3. Import failed → Retry import
4. New index broken → Delete and recreate
5. Data corrupted → Restore from backup

---

## ✅ Summary

**For Plan Upgrades**: ✅ No migration needed, just upgrade plan

**For Configuration Changes**: ⚠️ Must migrate data:
1. Export → 2. Create → 3. Import → 4. Verify → 5. Delete old

**Golden Rule**: **Never delete indexes without backing up data first!**

---

**Need Help?** Check [Pinecone Documentation](https://docs.pinecone.io/) or contact support.

