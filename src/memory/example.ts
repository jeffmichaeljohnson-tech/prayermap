/**
 * Example Usage of PrayerMap Memory System
 *
 * This file demonstrates how to use the memory system in different scenarios.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  // Logging functions
  logTask,
  logDecision,
  logError,
  logResearch,
  logLearning,
  logHandoff,

  // Query functions
  findSimilar,
  findByDomain,
  findDecisions,
  findErrorSolution,
  getPreQueryContext,

  // Cache functions
  getHotCache,
  CacheHelper,

  // Types
  type DecisionNode,
  type ErrorFingerprint,
  type ResearchEntry,
} from './index';

/**
 * Example 1: Multi-agent workflow with handoff
 */
async function exampleMultiAgentWorkflow() {
  console.log('\n=== Example 1: Multi-Agent Workflow ===\n');

  // 1. Researcher investigates a problem
  const researchId = await logResearch({
    id: uuidv4(),
    session_id: 'example-session',
    timestamp: new Date(),
    topic: 'Prayer map marker clustering performance',
    findings: [
      'Current implementation re-renders all markers on zoom',
      'Supercluster library can reduce markers by 80%',
      'Need to implement clustering above 50 markers',
    ],
    sources: [
      {
        type: 'code',
        location: '/src/components/Map.tsx',
        excerpt: 'markers.map(m => <Marker key={m.id} ... />)',
        accessed_at: new Date(),
        reliability: 'high',
      },
    ],
    confidence: 'high',
    domain: 'map',
    agent_role: 'researcher',
    summary: 'Map performance degrades with many markers. Clustering is the solution.',
    recommendations: [
      'Install supercluster library',
      'Implement clustering logic in Map component',
      'Add zoom-based cluster expansion',
    ],
    files_analyzed: ['/src/components/Map.tsx'],
  });

  console.log('Research logged:', researchId);

  // 2. Architect makes a decision based on research
  const decision: DecisionNode = {
    id: uuidv4(),
    session_id: 'example-session',
    timestamp: new Date(),
    topic: 'Map Marker Clustering Strategy',
    decision: 'Use Supercluster for map marker clustering',
    rationale: 'Research shows 80% performance improvement. Library is battle-tested and maintained by Mapbox.',
    alternatives: ['Custom clustering', 'Google Maps clustering', 'Leaflet.markercluster'],
    rejected_reasons: {
      'Custom clustering': 'Too complex to implement and maintain',
      'Google Maps clustering': 'Vendor lock-in',
      'Leaflet.markercluster': 'Not compatible with React',
    },
    domain: 'map',
    related_domains: ['performance'],
    files_affected: ['/src/components/Map.tsx', '/src/hooks/useMapClusters.ts'],
    agent_role: 'architect',
    impact: 'high',
    reversible: true,
    status: 'approved',
    tags: ['performance', 'map', 'clustering', 'supercluster'],
    depends_on: [researchId],
  };

  const decisionId = await logDecision(decision);
  console.log('Decision logged:', decisionId);

  // 3. Hand off to developer
  await logHandoff({
    from_agent: 'architect',
    to_agent: 'developer',
    context: 'Implement Supercluster for map marker clustering',
    domain: 'map',
    files: ['/src/components/Map.tsx', '/src/hooks/useMapClusters.ts'],
    next_steps: [
      'Install supercluster package',
      'Create useMapClusters hook',
      'Update Map component to use clusters',
      'Add tests for clustering logic',
    ],
  });

  console.log('Handoff logged\n');
}

/**
 * Example 2: Error tracking and resolution
 */
async function exampleErrorTracking() {
  console.log('\n=== Example 2: Error Tracking ===\n');

  // 1. Error is discovered
  const errorHash = 'prayer_creation_auth_e4f2a';

  const error: ErrorFingerprint = {
    id: uuidv4(),
    session_id: 'example-session',
    timestamp: new Date(),
    error_hash: errorHash,
    message: 'Session expired during prayer creation',
    stack_trace: 'Error: Session expired\n  at createPrayer (/src/services/prayerService.ts:42)',
    error_type: 'AuthenticationError',
    file: '/src/services/prayerService.ts',
    line_number: 42,
    domain: 'prayers',
    root_cause: 'No token refresh logic before API calls',
    resolved: false,
    related_errors: [],
    occurrence_count: 1,
    severity: 'high',
    tags: ['authentication', 'session', 'prayer-creation'],
    agent_role: 'debugger',
  };

  const errorId = await logError(error);
  console.log('Error logged:', errorId);

  // 2. Developer implements a fix
  const fixedError: ErrorFingerprint = {
    ...error,
    id: uuidv4(),
    timestamp: new Date(),
    resolved: true,
    solution: {
      id: uuidv4(),
      description: 'Added token refresh before prayer creation API call',
      files_changed: ['/src/services/prayerService.ts', '/src/services/authService.ts'],
      changes: 'Added refreshTokenIfNeeded() call before createPrayer',
      steps: [
        'Create refreshTokenIfNeeded() function in authService',
        'Call refreshTokenIfNeeded() before all authenticated API calls',
        'Add retry logic if refresh fails',
      ],
      agent_role: 'developer',
      timestamp: new Date(),
      verified: true,
      verification_method: 'Manual testing + integration tests',
      success_rate: 1.0,
    },
  };

  await logError(fixedError);
  console.log('Fix logged');

  // 3. Later, check if we've seen this error before
  const solution = await findErrorSolution(errorHash);
  if (solution) {
    console.log('Found existing solution:', solution.description);
    console.log('Steps:', solution.steps);
  }

  console.log('');
}

/**
 * Example 3: Pre-query context for new task
 */
async function examplePreQueryContext() {
  console.log('\n=== Example 3: Pre-Query Context ===\n');

  // Developer is about to start a new task
  const taskDescription = 'Add push notifications when someone prays for your prayer request';
  const affectedFiles = [
    '/src/services/notificationService.ts',
    '/src/components/PrayerCard.tsx',
  ];

  // Get automatic context
  const context = await getPreQueryContext(taskDescription, affectedFiles);

  console.log('Task:', context.task_description);
  console.log('Confidence:', context.confidence);
  console.log('\nContext Summary:');
  console.log(context.context_summary);
  console.log('\nRelevant Decisions:', context.relevant_decisions.length);
  console.log('Similar Tasks:', context.similar_tasks.length);
  console.log('Known Issues:', context.known_issues.length);
  console.log('Relevant Research:', context.relevant_research.length);

  // Use the context to inform implementation
  if (context.known_issues.length > 0) {
    console.log('\n⚠️  Known Issues to be aware of:');
    context.known_issues.forEach((issue) => {
      console.log(`  - ${issue.message} (${issue.file})`);
    });
  }

  if (context.relevant_decisions.length > 0) {
    console.log('\n📋 Relevant Decisions:');
    context.relevant_decisions.forEach((decision) => {
      console.log(`  - ${decision.topic}: ${decision.decision}`);
    });
  }

  console.log('');
}

/**
 * Example 4: Using the hot cache
 */
async function exampleHotCache() {
  console.log('\n=== Example 4: Hot Cache ===\n');

  // Get hot cache (refreshed automatically every 5 minutes)
  const hotCache = getHotCache();

  if (hotCache) {
    console.log('Last Refresh:', hotCache.last_refresh);
    console.log('Recent Decisions:', hotCache.recent_decisions.length);
    console.log('Recent Errors:', hotCache.recent_errors.length);
    console.log('Common Patterns:', hotCache.common_patterns.length);
    console.log('Important Memories:', hotCache.important_memories.length);
  } else {
    console.log('Hot cache not yet initialized');
  }

  // Use cache helpers for common queries
  const recentDecisions = await CacheHelper.getRecentDecisions();
  console.log('\nRecent Decisions from Cache:', recentDecisions.length);

  const unresolvedErrors = await CacheHelper.getUnresolvedErrors();
  console.log('Unresolved Errors from Cache:', unresolvedErrors.length);

  console.log('');
}

/**
 * Example 5: Learning and pattern detection
 */
async function exampleLearningAndPatterns() {
  console.log('\n=== Example 5: Learning and Patterns ===\n');

  // Log a learning
  const learningId = await logLearning({
    agent_role: 'developer',
    title: 'Supabase RLS Policy Pattern',
    description: 'When creating RLS policies for prayers, always include user_id check AND privacy_level check. Single condition is not enough.',
    domain: 'database',
    files: ['/supabase/migrations/create_prayers_table.sql'],
    tags: ['security', 'rls', 'best-practice'],
    pattern: 'RLS policies should combine user ownership with privacy settings',
    auto_include: true,
  });

  console.log('Learning logged:', learningId);

  // Later, find similar patterns
  const similar = await findSimilar('database security policies', 5);
  console.log('Found', similar.length, 'similar memories');

  console.log('');
}

/**
 * Example 6: Domain-specific queries
 */
async function exampleDomainQueries() {
  console.log('\n=== Example 6: Domain Queries ===\n');

  // Get all authentication-related memories
  const authMemories = await findByDomain('authentication', 20);
  console.log('Authentication memories:', authMemories.length);

  // Get all map-related memories
  const mapMemories = await findByDomain('map', 20);
  console.log('Map memories:', mapMemories.length);

  // Get all prayer-related memories
  const prayerMemories = await findByDomain('prayers', 20);
  console.log('Prayer memories:', prayerMemories.length);

  console.log('');
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await exampleMultiAgentWorkflow();
    await exampleErrorTracking();
    await examplePreQueryContext();
    await exampleHotCache();
    await exampleLearningAndPatterns();
    await exampleDomainQueries();

    console.log('✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Uncomment to run examples
// runExamples();

export {
  exampleMultiAgentWorkflow,
  exampleErrorTracking,
  examplePreQueryContext,
  exampleHotCache,
  exampleLearningAndPatterns,
  exampleDomainQueries,
};
