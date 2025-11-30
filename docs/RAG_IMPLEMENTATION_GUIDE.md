# 🚀 RAG Implementation Guide

**Status**: ✅ **IMPLEMENTED** - Ready for use  
**Date**: 2024-11-30

---

## 🎉 What Was Built

The RAG (Retrieval-Augmented Generation) system is now fully implemented! You can ask questions and get AI-generated responses based on PrayerMap's conversation history and documentation.

### Components Created

1. **`src/services/ragService.ts`** - Core RAG service
2. **`src/hooks/useRAG.ts`** - React hook for RAG queries
3. **`src/components/RAGQuery.tsx`** - UI component for RAG queries

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { useRAG } from '@/hooks/useRAG';

function MyComponent() {
  const { query, response, citations, isLoading, ask, clear } = useRAG();

  return (
    <div>
      <input
        value={query}
        onChange={(e) => ask(e.target.value)}
        placeholder="Ask a question..."
      />
      {isLoading && <p>Thinking...</p>}
      {response && <p>{response}</p>}
      {citations.length > 0 && (
        <div>
          <h3>Sources:</h3>
          {citations.map((citation, i) => (
            <div key={i}>
              [{i + 1}] {citation.source}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Using the UI Component

```typescript
import { RAGQuery } from '@/components/RAGQuery';

function MyPage() {
  return (
    <div className="p-6">
      <RAGQuery
        initialQuery="How do I implement push notifications?"
        model="gpt-3.5-turbo"
        onClose={() => console.log('Closed')}
      />
    </div>
  );
}
```

### Using the Service Directly

```typescript
import { ragService } from '@/services/ragService';

async function askQuestion() {
  const response = await ragService.generateRAGResponse(
    "How does the inbox system work?",
    {
      topK: 10,
      model: 'gpt-3.5-turbo',
      includeCitations: true,
    }
  );

  console.log('Response:', response.response);
  console.log('Citations:', response.citations);
  console.log('Metadata:', response.metadata);
}
```

---

## 📚 API Reference

### `useRAG` Hook

```typescript
interface UseRAGOptions {
  enabled?: boolean;              // Enable/disable queries
  topK?: number;                 // Number of context chunks (default: 10)
  namespace?: string;            // Pinecone namespace
  model?: 'gpt-4-turbo-preview' | 'gpt-4' | 'gpt-3.5-turbo';
  temperature?: number;          // LLM temperature (default: 0.7)
  maxTokens?: number;            // Max response tokens (default: 1000)
  includeCitations?: boolean;    // Include source citations (default: true)
  systemPrompt?: string;         // Custom system prompt
  filters?: Record<string, any>; // Pinecone filters
  debounceMs?: number;           // Query debounce (default: 500ms)
}

interface UseRAGRreturn {
  // State
  query: string;
  response: string | null;
  citations: Citation[];
  sources: SearchResult[];
  isLoading: boolean;
  error: string | null;
  metadata: RAGResponse['metadata'] | null;

  // Actions
  ask: (question: string) => void;
  clear: () => void;
  retry: () => void;

  // Utilities
  hasResponse: boolean;
  hasCitations: boolean;
  canAsk: boolean;
}
```

### `ragService` Service

```typescript
interface RAGOptions {
  topK?: number;
  namespace?: string;
  model?: 'gpt-4-turbo-preview' | 'gpt-4' | 'gpt-3.5-turbo';
  temperature?: number;
  maxTokens?: number;
  includeCitations?: boolean;
  systemPrompt?: string;
  filters?: Record<string, any>;
}

interface RAGResponse {
  response: string;
  citations: Citation[];
  sources: SearchResult[];
  metadata: {
    tokensUsed: number;
    latency: number;
    model: string;
    query: string;
    contextChunks: number;
    promptTokens: number;
    completionTokens: number;
  };
}

async function generateRAGResponse(
  query: string,
  options?: RAGOptions
): Promise<RAGResponse>
```

---

## 🎯 Use Cases

### 1. Developer Assistant

```typescript
const { ask, response } = useRAG({
  model: 'gpt-3.5-turbo',
  topK: 15,
});

// Ask technical questions
ask("How do I implement push notifications for iOS?");
```

### 2. Architecture Decisions

```typescript
const { ask, response, citations } = useRAG({
  model: 'gpt-4-turbo-preview',
  topK: 20,
});

// Get decision context
ask("Why did we choose Supabase over Firebase?");
```

### 3. Bug Pattern Recognition

```typescript
const { ask, response } = useRAG({
  filters: {
    type: { $eq: 'bug_report' },
  },
  topK: 10,
});

// Find similar issues
ask("Similar bugs to authentication timeout on mobile");
```

### 4. Onboarding Assistant

```typescript
const { ask, response } = useRAG({
  filters: {
    topics: { $in: ['setup', 'getting-started', 'onboarding'] },
  },
});

// Get setup instructions
ask("How do I set up the development environment?");
```

---

## ⚙️ Configuration

### Environment Variables

Make sure these are set in your `.env`:

```bash
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=ora-prayermap  # or your index name
```

### Model Selection

**GPT-3.5-turbo** (Recommended for most use cases):
- ✅ Fast (~1-2 seconds)
- ✅ Cost-effective (~$0.50-1.50 per 1M tokens)
- ✅ Good quality for most questions
- ✅ Default choice

**GPT-4-turbo-preview** (For complex questions):
- ✅ Higher quality responses
- ⚠️ Slower (~3-5 seconds)
- ⚠️ More expensive (~$10-30 per 1M tokens)
- Use for: Architecture decisions, complex debugging

**GPT-4** (For critical questions):
- ✅ Highest quality
- ⚠️ Slowest (~5-10 seconds)
- ⚠️ Most expensive
- Use sparingly for: Critical decisions, complex analysis

### Cost Optimization

```typescript
// Use GPT-3.5-turbo for simple queries
const simpleRAG = useRAG({
  model: 'gpt-3.5-turbo',
  maxTokens: 500,  // Limit response length
});

// Use GPT-4 only for complex queries
const complexRAG = useRAG({
  model: 'gpt-4-turbo-preview',
  maxTokens: 2000,
});
```

---

## 🔍 Advanced Usage

### Custom System Prompt

```typescript
const customRAG = useRAG({
  systemPrompt: `You are a PrayerMap mobile development expert.
Focus on iOS and Android deployment patterns.
Always mention Capacitor when relevant.`,
});
```

### Filtered Queries

```typescript
const filteredRAG = useRAG({
  filters: {
    technologies: { $in: ['react', 'typescript'] },
    importance: { $eq: 'high' },
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date(),
    },
  },
});
```

### Multiple Namespaces

```typescript
// Search documentation
const docsRAG = useRAG({
  namespace: 'documentation',
});

// Search conversations
const convRAG = useRAG({
  namespace: 'conversations',
});
```

---

## 🎨 UI Component Options

### RAGQuery Component Props

```typescript
interface RAGQueryProps {
  onClose?: () => void;           // Callback when closed
  initialQuery?: string;          // Pre-populate query
  namespace?: string;             // Pinecone namespace
  model?: 'gpt-4-turbo-preview' | 'gpt-4' | 'gpt-3.5-turbo';
}
```

### Example: Modal Integration

```typescript
import { useState } from 'react';
import { RAGQuery } from '@/components/RAGQuery';
import { Dialog } from '@/components/ui/dialog';

function RAGModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <RAGQuery
        onClose={() => setOpen(false)}
        model="gpt-3.5-turbo"
      />
    </Dialog>
  );
}
```

---

## 📊 Performance Tips

### 1. Debounce Queries

The hook automatically debounces queries (default: 500ms). Adjust if needed:

```typescript
const { ask } = useRAG({
  debounceMs: 1000,  // Wait 1 second before querying
});
```

### 2. Limit Context Size

```typescript
const { ask } = useRAG({
  topK: 5,  // Use fewer chunks for faster responses
});
```

### 3. Cache Responses

React Query automatically caches responses for 5 minutes. Adjust if needed:

```typescript
// In useRAG.ts, modify staleTime:
staleTime: 10 * 60 * 1000,  // 10 minutes
```

### 4. Use Streaming (Future)

For long responses, consider implementing streaming:

```typescript
const { response } = useRAGStreaming({
  // Streaming implementation coming soon
});
```

---

## 🐛 Troubleshooting

### No Response

**Problem**: Query returns but no response

**Solutions**:
1. Check OpenAI API key is set
2. Verify Pinecone index exists
3. Check browser console for errors
4. Ensure query is not empty

### Slow Responses

**Problem**: Responses take > 5 seconds

**Solutions**:
1. Use GPT-3.5-turbo instead of GPT-4
2. Reduce `topK` (fewer context chunks)
3. Reduce `maxTokens` (shorter responses)
4. Check network latency

### No Citations

**Problem**: Response has no citations

**Solutions**:
1. Ensure `includeCitations: true`
2. Check that sources have metadata
3. Verify citations are being extracted from response

### High Costs

**Problem**: API costs are high

**Solutions**:
1. Use GPT-3.5-turbo (10x cheaper)
2. Reduce `maxTokens`
3. Cache common queries
4. Implement rate limiting

---

## 🚀 Next Steps

### Immediate Enhancements

1. **Streaming Responses** - Show partial results as they generate
2. **Query History** - Save and replay past queries
3. **Better Citations** - Clickable links to source documents
4. **Query Suggestions** - Auto-complete based on knowledge base

### Future Features

1. **Multi-turn Conversations** - Follow-up questions with context
2. **Code Generation** - Generate code snippets from examples
3. **Visualizations** - Show knowledge graph connections
4. **Export** - Save responses as markdown/docs

---

## 📚 Related Documentation

- [RAG Readiness Analysis](./RAG_READINESS_ANALYSIS.md) - Original analysis
- [Pinecone Memory System](./PINECONE_MEMORY_SYSTEM.md) - Vector database setup
- [AI Agents Guide](../AI-AGENTS.md) - Agent coordination

---

## ✅ Implementation Checklist

- [x] Core RAG service (`ragService.ts`)
- [x] React hook (`useRAG.ts`)
- [x] UI component (`RAGQuery.tsx`)
- [x] Source citations
- [x] Error handling
- [x] TypeScript types
- [x] Documentation
- [ ] Streaming responses (future)
- [ ] Query history (future)
- [ ] Advanced filtering UI (future)

---

**🎉 RAG is ready to use! Start asking questions and get AI-powered answers from your knowledge base.**

