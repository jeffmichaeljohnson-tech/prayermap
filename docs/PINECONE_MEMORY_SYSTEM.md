# 🧠 Pinecone Memory System

**Intelligent conversation upload and semantic search for PrayerMap**

The Pinecone Memory System enables you to upload conversations, documentation, and project data with intelligent tagging and semantic search capabilities. This creates an institutional memory that learns from past decisions and conversations.

---

## 🚀 Quick Start

### Prerequisites

1. **Pinecone Account** - [Sign up](https://www.pinecone.io/)
2. **OpenAI API Key** - [Get API key](https://platform.openai.com/api-keys)
3. **Environment Setup**:

```bash
# Add to .env.local
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=prayermap-conversations
OPENAI_API_KEY=your_openai_api_key
```

### Basic Usage

```bash
# Upload all documentation
npm run pinecone:upload:docs

# Preview what would be uploaded
npm run pinecone:upload:dry-run

# Upload specific directory
npx tsx src/scripts/uploadToPinecone.ts --source ./path --type directory
```

---

## ✨ Features

### 🏷️ Intelligent Tagging System

Every uploaded conversation gets automatically tagged with:

- **Topics** - Main subjects discussed
- **Technologies** - React, Supabase, TypeScript, etc.
- **Domains** - Frontend, backend, mobile, DevOps
- **Intent** - Bug fix, feature request, code review
- **Sentiment** - Positive, negative, neutral, mixed
- **Complexity** - Simple, moderate, complex, expert
- **Importance** - Low, medium, high, critical
- **Entities** - People, files, functions mentioned

### 🔍 Semantic Search

Find relevant conversations using natural language:

```typescript
import { usePineconeSearch } from '@/hooks/usePineconeSearch';

function SearchExample() {
  const { updateQuery, results, searchByTechnology } = usePineconeSearch();
  
  // Natural language search
  updateQuery("How to fix authentication issues on mobile");
  
  // Technology-specific search
  searchByTechnology("react");
  
  // Results include similarity scores and rich metadata
  return (
    <div>
      {results.map(result => (
        <div key={result.id}>
          <h3>{result.metadata.type}</h3>
          <p>{result.content}</p>
          <span>Relevance: {Math.round(result.score * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
```

### 📊 Content Processing

- **Smart Chunking** - Splits content while preserving context
- **Overlap Management** - Maintains continuity between chunks  
- **Metadata Enrichment** - AI analyzes and categorizes content
- **Batch Processing** - Handles large document sets efficiently
- **Error Recovery** - Retry logic for failed uploads

---

## 📋 Upload Options

### CLI Upload Tool

The `uploadToPinecone.ts` script provides flexible upload options:

```bash
# Upload all markdown files from docs
npx tsx src/scripts/uploadToPinecone.ts --source ./docs --type directory

# Upload JSON conversation export
npx tsx src/scripts/uploadToPinecone.ts --source ./conversations.json --type json

# Custom patterns and filters
npx tsx src/scripts/uploadToPinecone.ts \
  --source ./src \
  --include "**/*.ts,**/*.md" \
  --exclude "**/node_modules/**,**/dist/**" \
  --batch-size 25 \
  --chunk-size 800

# Dry run to preview
npx tsx src/scripts/uploadToPinecone.ts --source ./docs --dry-run

# Specific namespace
npx tsx src/scripts/uploadToPinecone.ts --source ./docs --namespace project-docs
```

### Available Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--source` | Path to source files/directory | Current directory |
| `--type` | Source type: directory, markdown, json, cursor, github | directory |
| `--namespace` | Pinecone namespace | default |
| `--dry-run` | Preview without uploading | false |
| `--batch-size` | Chunks per batch | 50 |
| `--chunk-size` | Characters per chunk | 1000 |
| `--recursive` | Scan subdirectories | true |
| `--include` | Include patterns (comma-separated) | `**/*.md,**/*.txt,**/*.json` |
| `--exclude` | Exclude patterns (comma-separated) | `**/node_modules/**,**/dist/**` |

### NPM Scripts

```json
{
  "scripts": {
    "pinecone:upload": "tsx src/scripts/uploadToPinecone.ts",
    "pinecone:upload:docs": "tsx src/scripts/uploadToPinecone.ts --source ./docs --type directory",
    "pinecone:upload:dry-run": "tsx src/scripts/uploadToPinecone.ts --dry-run"
  }
}
```

---

## 🔍 Search Capabilities

### React Hook API

```typescript
// Basic search
const search = usePineconeSearch({
  topK: 20,
  namespace: 'project-docs',
  debounceMs: 300
});

// Update search query
search.updateQuery("authentication mobile");

// Apply filters
search.updateFilters({
  technologies: ['react', 'supabase'],
  importance: ['high', 'critical'],
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date()
  }
});

// Semantic search helpers
search.searchSimilar(resultId);
search.searchByTopics(['auth', 'mobile']);
search.searchByTechnology('typescript');
```

### Advanced Search Features

```typescript
// Technology-specific search
const techSearch = useTechnologySearch('react');

// Recent conversations
const recentSearch = useRecentConversations(7); // Last 7 days

// Bug reports only
const bugSearch = useBugReports();

// Search analytics
const analytics = search.getSearchAnalytics();
// Returns: sources breakdown, time range, average relevance
```

### Search Filters

Available filters for narrowing results:

- **Sources** - cursor, github, slack, manual
- **Types** - conversation, document, bug_report, feature_request
- **Technologies** - react, typescript, supabase, etc.
- **Date Range** - Filter by conversation timestamp
- **Importance** - low, medium, high, critical
- **Participants** - Filter by conversation participants
- **Topic Tags** - Semantic topic categories

---

## 🛠️ Configuration

### Pinecone Setup

1. **Create Index**:
   - Dimension: `3072` (for OpenAI text-embedding-3-large)
   - Metric: `cosine`
   - Pod Type: `p1.x1` or `s1.x1`

2. **Environment Variables**:
```bash
PINECONE_API_KEY=your_api_key_here
PINECONE_INDEX_NAME=prayermap-conversations
```

### OpenAI Configuration

1. **Get API Key** from [platform.openai.com](https://platform.openai.com/api-keys)
2. **Add to Environment**:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Upload Configuration

Customize upload behavior via `PineconeUploadConfig`:

```typescript
const config = {
  batchSize: 50,           // Vectors per batch
  chunkSize: 1000,         // Characters per chunk
  chunkOverlap: 100,       // Overlap between chunks
  enableMetadataEnrichment: true,  // Use AI analysis
  retryAttempts: 3,        // Upload retry attempts
  retryDelay: 1000,        // Delay between retries (ms)
  namespace: 'my-project'  // Pinecone namespace
};
```

---

## 📊 Data Structure

### Conversation Data Format

```typescript
interface ConversationData {
  id: string;                    // Unique identifier
  timestamp: Date;               // Conversation timestamp
  participants: string[];        // Who was involved
  content: string;               // Full conversation text
  type: 'conversation' | 'document' | 'bug_report' | 'feature_request';
  source: 'cursor' | 'github' | 'slack' | 'manual';
  metadata?: Record<string, any>; // Additional context
}
```

### Generated Metadata

AI analysis produces rich metadata:

```typescript
interface ConversationMetadata {
  // Core identification
  conversationId: string;
  timestamp: Date;
  source: string;
  type: string;
  
  // Content analysis  
  topics: string[];             // ["authentication", "mobile"]
  entities: ExtractedEntity[];  // People, technologies, files
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  
  // Technical classification
  technologies: string[];       // ["react", "typescript", "supabase"]
  domains: string[];           // ["frontend", "mobile"]
  codeLanguages: string[];     // ["typescript", "sql"]
  
  // Intent and outcomes
  intent: string[];            // ["bug_fix", "feature_request"]
  outcome?: string;            // Summary of resolution
  decisions?: string[];        // Key decisions made
  
  // Quality metrics
  importance: 'low' | 'medium' | 'high' | 'critical';
  quality: number;             // 0-1 score
  
  // Search optimization
  searchKeywords: string[];    // Extracted key terms
  semanticTags: string[];      // AI-generated categories
}
```

### Search Results

```typescript
interface SearchResult {
  id: string;
  score: number;              // Similarity score (0-1)
  content: string;            // Matched text chunk
  metadata: {
    conversationId: string;
    timestamp: string;
    source: string;
    type: string;
    topics: string;           // JSON array as string
    technologies: string;     // JSON array as string
    importance: string;
    // ... other metadata
  };
}
```

---

## 🎯 Use Cases

### 1. **Decision History**

Search past architectural decisions:
```typescript
search.updateQuery("why did we choose Supabase over Firebase");
// Returns: conversations discussing database choices
```

### 2. **Bug Pattern Recognition**

Find similar issues:
```typescript
search.updateFilters({ types: ['bug_report'] });
search.updateQuery("authentication timeout on iOS");
// Returns: previous auth-related mobile bugs and solutions
```

### 3. **Onboarding New Developers**

```typescript
search.searchByTopics(['getting started', 'setup', 'development']);
// Returns: setup guides and onboarding conversations
```

### 4. **Feature Development Research**

```typescript
search.updateQuery("implement push notifications mobile");
// Returns: previous discussions about mobile notifications
```

### 5. **Code Review Context**

```typescript
search.searchSimilar(currentFeatureId);
// Returns: related conversations and decisions
```

---

## 📈 Best Practices

### 📝 Content Organization

**Good Sources for Upload:**
- Team conversations (Slack, Discord)
- Code review discussions  
- Architecture decision records
- Bug reports and solutions
- Feature specifications
- Meeting notes and recordings
- Documentation and guides

**Organize by Namespace:**
```typescript
// Separate namespaces for different content types
'conversations'   // Daily team chats
'decisions'      // Architectural decisions
'bugs'          // Bug reports and fixes
'features'      // Feature discussions
'docs'          // Documentation
```

### 🔍 Effective Searching

**Search Query Tips:**
```typescript
// ❌ Too vague
"login"

// ✅ Specific and contextual  
"mobile login authentication timeout iOS"

// ✅ Use technical terms
"React component state management Zustand"

// ✅ Include outcome
"fix memory leak useEffect cleanup"
```

**Use Filters Strategically:**
```typescript
// Find recent critical bugs
search.updateFilters({
  types: ['bug_report'],
  importance: ['critical', 'high'],
  dateRange: { start: thirtyDaysAgo, end: now }
});

// Find React-specific discussions
search.updateFilters({
  technologies: ['react'],
  domains: ['frontend']
});
```

### 🏷️ Tagging Strategy

**Consistent Naming:**
- Use standard technology names (`react` not `React.js`)
- Consistent domain categories (`frontend`, `backend`, `mobile`, `devops`)
- Clear importance levels based on business impact
- Descriptive entity types for better filtering

### 🔄 Maintenance

**Regular Updates:**
```bash
# Weekly documentation upload
npm run pinecone:upload:docs

# Monthly conversation archive
npm run pinecone:upload -- --source ./archived-chats --namespace archived
```

**Quality Monitoring:**
- Review search result relevance regularly
- Update metadata enrichment rules
- Remove outdated or irrelevant content
- Monitor Pinecone usage and costs

---

## 🐛 Troubleshooting

### Common Issues

**Upload Failures:**
```bash
# Check API keys
echo $PINECONE_API_KEY
echo $OPENAI_API_KEY

# Verify index exists and has correct dimension
npx tsx -e "console.log(await pinecone.describeIndex('prayermap-conversations'))"

# Test with smaller batch
npx tsx src/scripts/uploadToPinecone.ts --batch-size 10
```

**Search Not Working:**
```typescript
// Check if content was uploaded
const stats = await uploader.getIndexStats();
console.log(`Vectors in index: ${stats.totalVectorCount}`);

// Test with simpler query
search.updateQuery("test");

// Clear all filters
search.clearFilters();
```

**AI Analysis Failing:**
```bash
# Verify OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.openai.com/v1/models

# Disable AI enrichment for testing
# Set enableMetadataEnrichment: false in config
```

### Performance Optimization

**Large Uploads:**
- Reduce batch size for stability
- Increase chunk overlap for better context
- Use specific include/exclude patterns
- Upload during off-peak hours

**Search Performance:**
- Use filters to narrow results
- Cache frequent queries
- Implement pagination for large result sets
- Consider pre-computing common searches

### Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| `API key invalid` | Wrong Pinecone key | Check environment variable |
| `Index not found` | Missing index | Create index in Pinecone console |
| `Dimension mismatch` | Wrong embedding size | Use 3072 dimensions |
| `Rate limit exceeded` | Too many requests | Reduce batch size |
| `Quota exceeded` | Usage limits | Check Pinecone billing |

---

## 📚 References

### API Documentation
- [Pinecone Docs](https://docs.pinecone.io/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [React Query](https://tanstack.com/query/latest)

### Source Code
- [`pineconeService.ts`](../src/services/pineconeService.ts) - Core upload service
- [`uploadToPinecone.ts`](../src/scripts/uploadToPinecone.ts) - CLI upload tool  
- [`usePineconeSearch.ts`](../src/hooks/usePineconeSearch.ts) - React search hook

### Configuration Files
- [`.env.example`](../.env.example) - Environment setup
- [`package.json`](../package.json) - NPM scripts

---

## 🚀 Advanced Features

### Custom Metadata Extractors

Add domain-specific analysis:

```typescript
class CustomPrayerMapUploader extends IntelligentPineconeUploader {
  protected async analyzeConversationWithAI(conversation: ConversationData) {
    const baseAnalysis = await super.analyzeConversationWithAI(conversation);
    
    // Add PrayerMap-specific analysis
    const prayerMapAnalysis = await this.analyzePrayerMapContent(conversation);
    
    return {
      ...baseAnalysis,
      ...prayerMapAnalysis,
      // Custom categories for prayer app
      prayerTopics: this.extractPrayerTopics(conversation.content),
      spiritualTags: this.extractSpiritualTags(conversation.content),
      userJourneyStage: this.classifyUserJourney(conversation.content)
    };
  }
}
```

### Batch Operations

Process multiple sources efficiently:

```typescript
const sources = [
  { path: './docs', type: 'directory' },
  { path: './conversations.json', type: 'json' },
  { path: './github-issues.json', type: 'json' }
];

for (const source of sources) {
  await cli.run({
    source: source.path,
    type: source.type,
    namespace: `prayermap-${source.type}`
  });
}
```

### Real-time Sync

Automatically upload new conversations:

```typescript
// Watch for new conversation files
import chokidar from 'chokidar';

const watcher = chokidar.watch('./conversations/*.json');
watcher.on('add', async (path) => {
  console.log(`New conversation: ${path}`);
  await uploader.uploadConversations([
    await ConversationDataUtils.loadFromJSON(path)
  ]);
});
```

---

## 🎉 Success Stories

### Developer Productivity

**Before Pinecone Memory:**
- "How did we handle auth issues?" → 30 minutes searching Slack
- "What was the decision on state management?" → Ask team members
- "Similar bugs?" → Manual GitHub issue search

**After Pinecone Memory:**
- Query: "authentication mobile timeout" → Instant relevant results
- Query: "Zustand vs Redux decision" → Complete decision context
- Query: "iOS location permission issues" → All related discussions

### Team Knowledge Sharing

- **New developers** get instant access to project history
- **Decisions** are documented and searchable
- **Patterns** emerge from analyzing conversation metadata
- **Best practices** are discoverable through semantic search

---

**Ready to build institutional memory for your project? Start with the Quick Start guide above! 🧠✨**