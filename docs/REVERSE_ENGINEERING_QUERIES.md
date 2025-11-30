# 🔍 Reverse Engineering Query Patterns

**Purpose**: Pre-generated query patterns to enable reverse engineering of the PrayerMap build process.

---

## 🎯 Core Reverse Engineering Queries

### Build Process Reconstruction

```typescript
// How did we build PrayerMap?
const buildProcessQueries = [
  "How did we set up the PrayerMap project initially?",
  "What was the first feature we built?",
  "How did we implement the prayer map visualization?",
  "How did we add real-time updates?",
  "How did we implement the inbox system?",
  "How did we set up mobile deployment with Capacitor?",
  "How did we implement RAG?",
  "How did we integrate LangSmith?",
  "What was our database schema evolution?",
  "How did we handle authentication?",
  "How did we implement location services?",
  "What was our testing strategy?",
  "How did we deploy to production?",
  "What was our performance optimization approach?",
  "How did we handle errors and debugging?"
];
```

### Success Pattern Queries

```typescript
// What worked really well?
const successQueries = [
  "What were our biggest wins in building PrayerMap?",
  "What patterns worked exceptionally well?",
  "What decisions unlocked major progress?",
  "What optimizations had the biggest impact?",
  "What architecture decisions were game-changers?",
  "What features were completed fastest?",
  "What approaches led to zero bugs?",
  "What integrations were smoothest?",
  "What refactors improved code quality most?",
  "What documentation was most valuable?"
];
```

### Learning Extraction Queries

```typescript
// What did we learn?
const learningQueries = [
  "What did we learn about React 19?",
  "What Supabase patterns worked best?",
  "What mobile deployment lessons did we learn?",
  "What RAG implementation insights did we gain?",
  "What observability patterns were most valuable?",
  "What testing strategies were most effective?",
  "What performance optimizations worked?",
  "What error handling patterns were best?",
  "What real-time patterns worked well?",
  "What authentication patterns were most secure?"
];
```

### Decision Tracking Queries

```typescript
// Why did we choose X?
const decisionQueries = [
  "Why did we choose Supabase over Firebase?",
  "Why did we use React Query instead of Redux?",
  "Why did we choose Mapbox over Google Maps?",
  "Why did we use Capacitor instead of React Native?",
  "Why did we implement notifications table?",
  "Why did we upgrade to text-embedding-3-large?",
  "Why did we integrate LangSmith?",
  "Why did we use Pinecone for memory?",
  "Why did we choose GPT-4o for RAG?",
  "What alternatives did we consider and reject?"
];
```

### Problem-Solving Queries

```typescript
// How did we solve X?
const problemSolvingQueries = [
  "How did we solve the message delivery issue?",
  "How did we fix the real-time subscription problem?",
  "How did we resolve the mobile build errors?",
  "How did we optimize the map performance?",
  "How did we handle the embedding dimension upgrade?",
  "How did we debug the RAG context retrieval?",
  "How did we fix the authentication flow?",
  "How did we resolve the database query performance?",
  "How did we handle the Pinecone migration?",
  "What problems took longest to solve and why?"
];
```

### Anti-Pattern Queries

```typescript
// What didn't work?
const antiPatternQueries = [
  "What approaches didn't work?",
  "What mistakes did we make?",
  "What patterns should we avoid next time?",
  "What took longer than expected?",
  "What caused the most bugs?",
  "What refactors were necessary?",
  "What decisions did we regret?",
  "What shortcuts caused problems later?",
  "What testing gaps caused issues?",
  "What documentation gaps caused confusion?"
];
```

### Reusability Queries

```typescript
// What can we reuse?
const reusabilityQueries = [
  "What components can be reused for the next app?",
  "What patterns can be copied to the next project?",
  "What workflows worked well and are reusable?",
  "What services are framework-agnostic?",
  "What utilities are universal?",
  "What hooks can be reused?",
  "What testing patterns are reusable?",
  "What deployment processes can be replicated?",
  "What documentation templates worked?",
  "What CI/CD configurations are reusable?"
];
```

---

## 🔄 Query Generation Strategy

### Auto-Generate Queries During Metadata Enrichment

When analyzing a conversation, automatically generate relevant reverse engineering queries:

```typescript
{
  reverseEngineeringQueries: [
    // Generated based on content
    "How did we implement ${feature}?",
    "What was our approach to ${problem}?",
    "Why did we choose ${technology}?",
    "What worked well with ${pattern}?",
    "What didn't work with ${approach}?"
  ],
  
  queryPatterns: {
    "how-did-we": [
      "implement ${feature}",
      "solve ${problem}",
      "build ${component}"
    ],
    "what-worked": [
      "${approach} for ${problem}",
      "${pattern} in ${context}"
    ],
    "what-didnt-work": [
      "${approach} for ${problem}",
      "${pattern} in ${context}"
    ],
    "why-did-we": [
      "choose ${technology}",
      "avoid ${approach}",
      "use ${pattern}"
    ]
  }
}
```

---

## 📊 Query Execution Examples

### Example 1: Reconstruct Feature Build

**Query**: "How did we implement the inbox system?"

**Expected Results**:
- Conversations about inbox design
- Decisions about notification architecture
- Implementation steps
- Problems encountered and solved
- Success patterns used

### Example 2: Extract Success Pattern

**Query**: "What were our biggest wins?"

**Expected Results**:
- Conversations tagged with `successLevel: 5`
- Big win descriptions
- What made them successful
- Reusable patterns
- Recommendations for next app

### Example 3: Learn from Mistakes

**Query**: "What mistakes did we make with message delivery?"

**Expected Results**:
- Conversations about message delivery issues
- What went wrong
- How it was fixed
- What could prevent it next time
- Anti-patterns to avoid

---

## 🎯 Implementation

These queries will be:
1. **Pre-generated** during metadata enrichment
2. **Stored** in Pinecone metadata
3. **Searchable** via semantic search
4. **Executable** via RAG system

**Result**: Complete reverse engineering capability! 🚀

