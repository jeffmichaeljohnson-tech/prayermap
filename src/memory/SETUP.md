# Memory System Setup Guide

Quick setup guide for the PrayerMap Memory System.

## Prerequisites

- Node.js 18+
- Pinecone account (free tier available)
- OpenAI API key (for production embeddings)

## Installation Steps

### 1. Install Required Packages

```bash
npm install @pinecone-database/pinecone uuid
npm install --save-dev @types/uuid
```

For production with OpenAI embeddings:
```bash
npm install openai
```

### 2. Create Pinecone Index

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new index with these settings:
   - **Name**: `prayermap-agent-memory`
   - **Dimensions**: `3072`
   - **Metric**: `cosine`
   - **Environment**: Choose your preferred region

### 3. Configure Environment Variables

Add to your `.env` file:

```bash
# Required
PINECONE_API_KEY=your_pinecone_api_key_here

# Optional
SESSION_ID=your_session_identifier
OPENAI_API_KEY=your_openai_api_key_here  # For production embeddings
```

### 4. Verify Installation

Create a test file `test-memory.ts`:

```typescript
import { pineconeClient } from './memory';

async function test() {
  try {
    await pineconeClient.initialize();
    const stats = await pineconeClient.getStats();
    console.log('✅ Pinecone connected!');
    console.log('Stats:', stats);
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

test();
```

Run it:
```bash
npx tsx test-memory.ts
```

### 5. (Optional) Setup OpenAI Embeddings

For production, replace the placeholder embedding functions in `logger.ts` and `query.ts`:

**In logger.ts:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}
```

**In query.ts:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateQueryEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}
```

## Usage

### Basic Example

```typescript
import { logTask, findSimilar } from './memory';

// Log a task
await logTask({
  agent_role: 'developer',
  content: 'Fixed prayer creation bug',
  files_touched: ['/src/services/prayerService.ts'],
  domain: 'prayers',
});

// Find similar tasks
const similar = await findSimilar('prayer creation', 5);
console.log('Similar tasks:', similar);
```

See `example.ts` for more comprehensive usage examples.

## Troubleshooting

### "PINECONE_API_KEY environment variable is not set"
- Make sure your `.env` file is in the project root
- Verify the variable name matches exactly
- Restart your development server after adding the variable

### "Index prayermap-agent-memory not found"
- Create the index in Pinecone dashboard
- Verify the index name matches exactly
- Check that the index is in the active state

### "Invalid embedding: expected dimension 3072"
- Make sure you're using OpenAI's text-embedding-3-large model (3072 dimensions)
- If using a different model, update `EMBEDDING_DIMENSION` in `pinecone-client.ts`

### Placeholder embeddings warning
- This is expected in development
- Replace with OpenAI implementation for production
- Placeholder embeddings won't provide accurate semantic search

## Next Steps

1. Review the [README.md](./README.md) for detailed documentation
2. Check out [example.ts](./example.ts) for usage patterns
3. Integrate memory logging into your agent workflows
4. Set up automatic context retrieval for new tasks
5. Monitor cache performance and adjust TTL as needed

## Configuration Options

### Cache Settings

Edit `cache.ts` to adjust:
```typescript
const CACHE_CONFIG = {
  REFRESH_INTERVAL_MS: 5 * 60 * 1000, // Cache refresh interval
  DEFAULT_TTL_MS: 10 * 60 * 1000,      // Default cache TTL
  MAX_CACHE_SIZE: 1000,                 // Maximum cache entries
};
```

### Retry Settings

Edit `pinecone-client.ts` to adjust:
```typescript
const MAX_RETRIES = 3;           // Maximum retry attempts
const RETRY_DELAY_MS = 1000;     // Base retry delay
```

## Support

For issues or questions:
1. Check the [README.md](./README.md) for documentation
2. Review [example.ts](./example.ts) for usage patterns
3. Check Pinecone documentation: https://docs.pinecone.io/
4. Check OpenAI documentation: https://platform.openai.com/docs/

## Performance Tips

1. **Batch operations**: Use `upsertMemories()` for bulk inserts
2. **Use filters**: Narrow searches with metadata filters
3. **Cache hot data**: Leverage the hot cache for frequent queries
4. **Set importance**: Mark critical memories with high importance
5. **Tag effectively**: Use tags for faster metadata filtering

## Security

- Never commit `.env` file to version control
- Rotate API keys regularly
- Use environment-specific keys (dev/staging/prod)
- Monitor API usage in Pinecone dashboard
- Implement rate limiting if exposed via API
