// k6 load test for Louagi backend
// Run: k6 run testing/k6/load-test.js
//
// Tests the most common GraphQL operations under concurrency.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';

const errorRate = new Rate('errors');
const latencyTrend = new Trend('graphql_latency');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.1'],
    http_req_duration: ['p(95)<2000'],
    graphql_latency: ['p(95)<1000'],
  },
};

function graphql(operationName, variables = {}) {
  const body = JSON.stringify({
    operationName,
    variables,
    query: `query ${operationName}($input: JSON) { ${operationName}(input: $input) }`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { operation: operationName },
  };

  const res = http.post(`${BASE_URL}/graphql`, body, params);
  latencyTrend.add(res.timings.duration);

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'has data': (r) => r.json('data') !== undefined,
  });

  if (!ok) errorRate.add(1);
  return res;
}

export default function () {
  group('ListCities', () => {
    graphql('ListCities');
    sleep(1);
  });

  group('ListRoutes', () => {
    graphql('ListRoutes');
    sleep(1);
  });

  group('SearchRides', () => {
    graphql('SearchRides', {
      origin: 'Tunis',
      destination: 'Sousse',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      seats: 1,
    });
    sleep(2);
  });

  group('Health', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'health status 200': (r) => r.status === 200 });
    sleep(1);
  });
}
