/**
 * K6 Load Test for Prayer Queries
 *
 * Tests the performance of optimized prayer queries under load.
 *
 * Usage:
 *   k6 run tests/load/k6-prayers.js
 *   k6 run --vus 50 --duration 30s tests/load/k6-prayers.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const prayerLoadTime = new Trend('prayer_load_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    errors: ['rate<0.01'],              // Error rate under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const SUPABASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';

export default function () {
  // Test 1: Fetch all prayers with default limit
  const prayersRes = http.post(
    `${SUPABASE_URL}/rest/v1/rpc/get_all_prayers`,
    JSON.stringify({ limit_count: 500 }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  check(prayersRes, {
    'prayers status 200': (r) => r.status === 200,
    'prayers response time < 500ms': (r) => r.timings.duration < 500,
    'prayers has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data);
      } catch {
        return false;
      }
    },
  });

  errorRate.add(prayersRes.status !== 200);
  prayerLoadTime.add(prayersRes.timings.duration);

  sleep(1);

  // Test 2: Paginated prayers
  const paginatedRes = http.post(
    `${SUPABASE_URL}/rest/v1/rpc/get_prayers_paginated`,
    JSON.stringify({ page_size: 50 }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  check(paginatedRes, {
    'paginated status 200': (r) => r.status === 200,
    'paginated response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'tests/load/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const { metrics } = data;
  return `
=== Load Test Summary ===

Requests:
  Total: ${metrics.http_reqs?.values?.count || 0}
  Rate:  ${metrics.http_reqs?.values?.rate?.toFixed(2) || 0}/s

Response Time:
  Avg: ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms
  P95: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms
  Max: ${metrics.http_req_duration?.values?.max?.toFixed(2) || 0}ms

Prayer Load Time:
  Avg: ${metrics.prayer_load_time?.values?.avg?.toFixed(2) || 0}ms
  P95: ${metrics.prayer_load_time?.values?.['p(95)']?.toFixed(2) || 0}ms

Errors: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
`;
}
