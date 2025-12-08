---
name: senior-prompt-engineer
description: World-class prompt engineering skill for LLM optimization, prompt patterns, structured outputs, and AI product development. Expertise in Claude, GPT-4, prompt design patterns, few-shot learning, chain-of-thought, and AI evaluation. Includes RAG optimization, agent design, and LLM system architecture. Use when building AI products, optimizing LLM performance, designing agentic systems, or implementing advanced prompting techniques.
---

# Senior Prompt Engineer

World-class senior prompt engineer skill for production-grade AI/ML/Data systems.

## Core Expertise

This skill covers world-class capabilities in:

- **RAG Systems** - Retrieval-Augmented Generation with vector databases (Pinecone, Weaviate)
- **Prompt Optimization** - Advanced prompting techniques for Claude and GPT-4
- **Agent Design** - Multi-agent orchestration and tool use patterns
- **LLM Evaluation** - Benchmarking, A/B testing, and quality metrics
- **Structured Outputs** - JSON mode, function calling, and schema validation

## Tech Stack

**LLM Frameworks:** LangChain, LlamaIndex, DSPy, Claude SDK
**Vector Databases:** Pinecone, Weaviate, Qdrant, Chroma
**Embedding Models:** OpenAI Ada, Cohere, Sentence Transformers
**Deployment:** Docker, Kubernetes, AWS/GCP/Azure
**Monitoring:** LangSmith, Weights & Biases, Helicone

## RAG Architecture Patterns

### Pattern 1: Hybrid Search RAG

Combine dense and sparse retrieval for optimal results:

```
Query → [BM25 Sparse] + [Dense Embeddings] → Reciprocal Rank Fusion → Rerank → LLM
```

Key components:
- Dense embeddings via OpenAI/Cohere
- Sparse retrieval via BM25/TF-IDF
- Fusion with RRF or weighted scoring
- Cross-encoder reranking for precision

### Pattern 2: Hierarchical RAG

For large document collections:

```
Query → Summary Index → Chunk Index → Context Assembly → LLM
```

Benefits:
- Better context selection
- Reduced token usage
- Improved coherence

### Pattern 3: Agentic RAG

Self-improving retrieval with feedback loops:

```
Query → Agent → [Retrieve → Evaluate → Refine Query] → Final Answer
```

## Prompt Engineering Patterns

### Chain-of-Thought (CoT)
```
Let's solve this step by step:
1. First, I'll analyze...
2. Next, I'll consider...
3. Finally, I'll conclude...
```

### Few-Shot Learning
```
Example 1: Input → Output
Example 2: Input → Output
Now, for this input: {user_input}
```

### Self-Consistency
Run multiple reasoning paths, select by majority vote.

### Tree-of-Thoughts
Explore multiple solution branches, backtrack as needed.

## Chunking Strategies

| Strategy | Use Case | Chunk Size |
|----------|----------|------------|
| Fixed | Simple documents | 500-1000 tokens |
| Semantic | Technical docs | Varies by section |
| Recursive | Mixed content | 200-500 tokens |
| Agentic | Complex queries | Dynamic |

## Evaluation Metrics

### Retrieval Quality
- **Recall@K**: Relevant docs in top K
- **MRR**: Mean Reciprocal Rank
- **NDCG**: Normalized Discounted Cumulative Gain

### Generation Quality
- **Faithfulness**: Grounded in retrieved context
- **Relevance**: Answers the question
- **Coherence**: Well-structured response

## Best Practices

### Prompt Design
- Be specific and explicit
- Provide examples when possible
- Use structured output formats
- Include guardrails and constraints

### RAG Optimization
- Tune chunk size for your domain
- Use metadata filtering
- Implement query expansion
- Add reranking for precision

### Production
- Cache embeddings and responses
- Monitor latency and costs
- A/B test prompt variations
- Log everything for debugging

## Performance Targets

**Retrieval:**
- Recall@10: > 90%
- Latency: < 200ms

**Generation:**
- Faithfulness: > 95%
- Latency: < 2s

**System:**
- Uptime: 99.9%
- Cost per query: < $0.01

## Common Patterns for PrayerMap

### Prayer Context Retrieval
```python
# Semantic search for related prayers
results = index.query(
    vector=embed(prayer_text),
    top_k=5,
    filter={"user_id": user_id}
)
```

### Memory-Augmented Responses
```python
# Combine user history with current context
context = retrieve_user_prayers(user_id)
system_prompt = f"User prayer history: {context}"
response = claude.complete(system_prompt + query)
```

### Location-Based Prayer Discovery
```python
# Geospatial + semantic hybrid search
nearby = spatial_search(lat, lng, radius_km=10)
similar = semantic_search(prayer_intent)
results = fuse(nearby, similar, weights=[0.4, 0.6])
```
