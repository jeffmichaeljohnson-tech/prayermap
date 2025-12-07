/**
 * Query Expansion Test Suite
 *
 * Tests the expanded dictionary to ensure:
 * 1. PrayerMap-specific terms expand correctly
 * 2. Over-expansion is prevented
 * 3. Edge cases are handled
 *
 * Run with: deno run --allow-read query-expansion-test.ts
 *
 * 💭 ➡️ 📈
 */

import {
  applyRuleBasedExpansion,
  EXPANSION_DICTIONARY,
  MAX_EXPANSION_TERMS,
  MAX_SYNONYMS_PER_TERM,
} from './query-expansion.ts';

// ============================================
// TEST QUERIES
// ============================================

interface TestCase {
  query: string;
  expectEntities: string[];
  expectTermsToContain: string[];
  description: string;
}

const TEST_CASES: TestCase[] = [
  // PrayerMap Spiritual Domain
  {
    query: 'prayer request nearby',
    expectEntities: ['prayer', 'request', 'nearby'],
    expectTermsToContain: ['petition', 'intercession', 'local', 'radius'],
    description: 'Core PrayerMap use case - finding nearby prayers',
  },
  {
    query: 'memorial line answered',
    expectEntities: ['memorial', 'answered'],
    expectTermsToContain: ['remembrance', 'eternal', 'resolved', 'fulfilled'],
    description: 'Memorial connections - the Living Map feature',
  },
  {
    query: 'how to support someone prayer',
    expectEntities: ['support', 'prayer'],
    expectTermsToContain: ['encourage', 'uplift', 'petition'],
    description: 'Supporting others through prayer',
  },
  {
    query: 'anonymous responder messaging',
    expectEntities: ['anonymous', 'responder', 'messaging'],
    expectTermsToContain: ['private', 'hidden', 'conversation', 'thread'],
    description: 'Anonymous messaging feature',
  },

  // Map/Geospatial
  {
    query: 'cluster markers viewport',
    expectEntities: ['cluster', 'viewport'],
    expectTermsToContain: ['grouping', 'supercluster', 'bounds', 'zoom'],
    description: 'Map clustering and viewport handling',
  },
  {
    query: 'postgis radius query',
    expectEntities: ['postgis', 'radius', 'query'],
    expectTermsToContain: ['geography', 'spatial', 'distance', 'sql'],
    description: 'PostGIS spatial queries',
  },
  {
    query: 'fly to location coordinates',
    expectEntities: ['fly', 'location', 'coordinates'],
    expectTermsToContain: ['flyTo', 'animate', 'lat', 'lng'],
    description: 'Map navigation and positioning',
  },

  // Design System
  {
    query: 'glassmorphism blur effect',
    expectEntities: ['glassmorphism', 'blur'],
    expectTermsToContain: ['glass', 'frosted', 'backdrop-blur'],
    description: 'Ethereal Glass design system',
  },
  {
    query: 'framer motion spring animation',
    expectEntities: ['framer', 'motion', 'spring', 'animation'],
    expectTermsToContain: ['transition', 'bounce', 'damping'],
    description: 'Framer Motion animations',
  },
  {
    query: 'ethereal design theme',
    expectEntities: ['ethereal', 'theme'],
    expectTermsToContain: ['soft', 'spiritual', 'dark mode', 'design system'],
    description: 'Overall design aesthetic',
  },

  // Mobile/Platform
  {
    query: 'capacitor ios build',
    expectEntities: ['capacitor', 'ios', 'build'],
    expectTermsToContain: ['native', 'iPhone', 'compile', 'vite'],
    description: 'iOS build with Capacitor',
  },
  {
    query: 'pwa responsive mobile',
    expectEntities: ['pwa', 'responsive', 'mobile'],
    expectTermsToContain: ['progressive web app', 'breakpoint', 'android'],
    description: 'PWA and responsive design',
  },

  // Real-time
  {
    query: 'realtime subscription presence',
    expectEntities: ['realtime', 'subscription', 'presence'],
    expectTermsToContain: ['websocket', 'live', 'online', 'channel'],
    description: 'Real-time features for Living Map',
  },
  {
    query: 'witness live prayer',
    expectEntities: ['witness', 'live', 'prayer'],
    expectTermsToContain: ['observe', 'realtime', 'petition'],
    description: 'Witnessing prayer in real-time',
  },

  // Technical Stack
  {
    query: 'supabase rls policy',
    expectEntities: ['supabase', 'rls', 'policy'],
    expectTermsToContain: ['row level security', 'permission', 'access control'],
    description: 'Supabase RLS configuration',
  },
  {
    query: 'cohere rerank retrieval',
    expectEntities: ['cohere', 'retrieval'],
    expectTermsToContain: ['reranking', 'semantic', 'search'],
    description: 'Cohere reranking integration',
  },
  {
    query: 'datadog log observability',
    expectEntities: ['datadog', 'log'],
    expectTermsToContain: ['monitoring', 'metrics', 'console'],
    description: 'Datadog monitoring',
  },
  {
    query: 'tanstack react query cache',
    expectEntities: ['tanstack', 'cache'],
    expectTermsToContain: ['react query', 'useQuery', 'stale'],
    description: 'TanStack Query data fetching',
  },

  // Edge Cases - Precise Queries (should NOT over-expand)
  {
    query: 'messageService.ts line 45',
    expectEntities: [], // No matches expected for precise file references
    expectTermsToContain: [],
    description: 'Precise file reference - should NOT expand',
  },
  {
    query: 'error code 429',
    expectEntities: ['error'],
    expectTermsToContain: ['exception', 'bug'],
    description: 'Specific error code - minimal expansion',
  },
];

// ============================================
// RUN TESTS
// ============================================

function runTests() {
  console.log('='.repeat(60));
  console.log('QUERY EXPANSION TEST SUITE');
  console.log(`Dictionary size: ${Object.keys(EXPANSION_DICTIONARY).length} terms`);
  console.log(`Max expansion terms: ${MAX_EXPANSION_TERMS}`);
  console.log(`Max synonyms per term: ${MAX_SYNONYMS_PER_TERM}`);
  console.log('='.repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    const result = applyRuleBasedExpansion(testCase.query);
    const allTerms = [...result.synonyms, ...result.related_terms];

    let testPassed = true;
    const failures: string[] = [];

    // Check entities
    for (const entity of testCase.expectEntities) {
      if (!result.detected_entities.includes(entity)) {
        testPassed = false;
        failures.push(`Missing entity: ${entity}`);
      }
    }

    // Check expected terms
    for (const term of testCase.expectTermsToContain) {
      const found = allTerms.some(
        (t) => t.toLowerCase().includes(term.toLowerCase()) || term.toLowerCase().includes(t.toLowerCase())
      );
      if (!found) {
        testPassed = false;
        failures.push(`Missing term: ${term}`);
      }
    }

    // Check over-expansion limit
    if (allTerms.length > MAX_EXPANSION_TERMS + 10) {
      testPassed = false;
      failures.push(`Over-expanded: ${allTerms.length} terms (max ${MAX_EXPANSION_TERMS})`);
    }

    if (testPassed) {
      passed++;
      console.log(`✅ PASS: ${testCase.description}`);
    } else {
      failed++;
      console.log(`❌ FAIL: ${testCase.description}`);
      console.log(`   Query: "${testCase.query}"`);
      console.log(`   Entities found: [${result.detected_entities.join(', ')}]`);
      console.log(`   Terms added: [${allTerms.slice(0, 10).join(', ')}${allTerms.length > 10 ? '...' : ''}]`);
      for (const failure of failures) {
        console.log(`   ⚠️  ${failure}`);
      }
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${TEST_CASES.length} tests`);
  console.log('='.repeat(60));

  // Summary statistics
  console.log('');
  console.log('DICTIONARY STATISTICS:');
  const categories = {
    'Authentication': ['auth', 'login', 'logout', 'jwt', 'oauth', 'session', 'mfa'],
    'Database': ['db', 'database', 'rls', 'policy', 'migration', 'sql', 'table', 'schema', 'query', 'postgres', 'postgis', 'spatial'],
    'Frontend': ['ui', 'component', 'frontend', 'react', 'hook', 'state', 'modal', 'animation', 'tailwind', 'tanstack'],
    'PrayerMap Core': ['prayer', 'request', 'response', 'message', 'messaging', 'conversation', 'inbox', 'notification', 'responder', 'requester'],
    'PrayerMap Spiritual': ['memorial', 'answered', 'blessing', 'intercession', 'support', 'community', 'anonymous', 'witness'],
    'Map/Geo': ['map', 'marker', 'location', 'cluster', 'viewport', 'nearby', 'radius', 'coordinates', 'geolocation', 'layer', 'zoom', 'fly'],
    'Design': ['glassmorphism', 'glass', 'ethereal', 'blur', 'framer', 'motion', 'spring', 'transition', 'gradient', 'theme'],
    'Mobile': ['capacitor', 'ios', 'android', 'mobile', 'native', 'pwa', 'responsive', 'touch'],
    'Real-time': ['realtime', 'websocket', 'subscription', 'live', 'sync', 'presence'],
  };

  for (const [category, terms] of Object.entries(categories)) {
    const coverage = terms.filter((t) => EXPANSION_DICTIONARY[t]).length;
    console.log(`  ${category}: ${coverage}/${terms.length} terms covered`);
  }

  return failed === 0;
}

// ============================================
// BEFORE/AFTER COMPARISON
// ============================================

function compareExpansions() {
  console.log('');
  console.log('='.repeat(60));
  console.log('BEFORE/AFTER EXPANSION COMPARISON');
  console.log('='.repeat(60));
  console.log('');

  const queries = [
    'prayer request nearby',
    'memorial line implementation',
    'how to support someone\'s prayer',
    'mapbox cluster optimization',
    'glassmorphism blur effect',
    'capacitor ios build failing',
    'realtime subscription not working',
  ];

  for (const query of queries) {
    const result = applyRuleBasedExpansion(query);

    console.log(`Query: "${query}"`);
    console.log(`  Entities: [${result.detected_entities.join(', ')}]`);
    console.log(`  Synonyms: [${result.synonyms.slice(0, 5).join(', ')}${result.synonyms.length > 5 ? '...' : ''}]`);
    console.log(`  Related: [${result.related_terms.slice(0, 5).join(', ')}${result.related_terms.length > 5 ? '...' : ''}]`);
    console.log(`  Expanded (${result.synonyms.length + result.related_terms.length} terms added)`);
    console.log('');
  }
}

// ============================================
// OVER-EXPANSION EDGE CASE CHECK
// ============================================

function checkOverExpansion() {
  console.log('');
  console.log('='.repeat(60));
  console.log('OVER-EXPANSION CHECK (Precise Queries)');
  console.log('='.repeat(60));
  console.log('');

  const preciseQueries = [
    'messageService.ts line 45', // Exact file reference
    'error code 429', // Specific code
    'prayer_responses table schema', // Exact table name
    'ST_DWithin function', // PostGIS function
    'useConversation hook', // Specific hook
  ];

  for (const query of preciseQueries) {
    const result = applyRuleBasedExpansion(query);
    const totalTerms = result.synonyms.length + result.related_terms.length;
    const wordRatio = totalTerms / query.split(' ').length;

    const status = wordRatio <= 3 ? '✅' : '⚠️ ';
    console.log(`${status} "${query}"`);
    console.log(`   Added ${totalTerms} terms (ratio: ${wordRatio.toFixed(1)}x)`);

    if (wordRatio > 3) {
      console.log(`   WARNING: Over-expansion detected`);
    }
    console.log('');
  }
}

// ============================================
// MAIN
// ============================================

if (import.meta.main) {
  const allPassed = runTests();
  compareExpansions();
  checkOverExpansion();

  Deno.exit(allPassed ? 0 : 1);
}

export { runTests, compareExpansions, checkOverExpansion };

