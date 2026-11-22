// k6 load test for Louagi backend
// Run: k6 run testing/k6/load-test.js            (500 VUs by default)
//      k6 run -e VUS=100 -e HOLD=1m testing/k6/load-test.js
// Docker (no local k6), from louagi-app/:
//      docker run --rm -i --network louagi-app_default -e BASE_URL=http://api:3000 grafana/k6 run - < testing/k6/load-test.js
//
// Read-only public operations. SearchRides uses random city pairs/dates so it
// misses the 30s Redis cache and reaches Postgres; ListCities/ListRoutes are
// 24h-cached. Per-IP rate limits (GRAPHQL_RATE_LIMIT_MAX, RATE_LIMIT_MAX) must
// be raised for the run, otherwise every VU shares one IP budget and gets 429s.

import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const VUS = Number(__ENV.VUS || 500);
const HOLD = __ENV.HOLD || '3m';

export const options = {
  stages: [
    { duration: '1m', target: VUS },
    { duration: HOLD, target: VUS },
    { duration: '30s', target: 0 },
  ],
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    // SLO at 500 VUs: 0% failures, p99 < 300ms. checks also catches 200s without data.
    // The abort entry stops a wedged run early instead of piling up timeouts for minutes.
    http_req_failed: ['rate==0', { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
    checks: ['rate==1'],
    http_req_duration: ['p(99)<300'],
    // k6 only breaks a tag out in the summary when a threshold names it.
    'http_req_duration{operation:ListCities}': ['p(99)<300'],
    'http_req_duration{operation:ListRoutes}': ['p(99)<300'],
    'http_req_duration{operation:SearchRides}': ['p(99)<300'],
    'http_req_duration{operation:Health}': ['p(99)<300'],
  },
};

function graphql(operationName, variables = {}) {
  const res = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify({ operationName, variables }),
    { headers: { 'Content-Type': 'application/json' }, tags: { operation: operationName }, timeout: '10s' }
  );
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has data': (r) => r.status === 200 && r.json(`data.${operationName}`) !== undefined,
  });
  return res;
}

export function setup() {
  const cities = graphql('ListCities').json('data.ListCities');
  if (!Array.isArray(cities) || cities.length < 2) throw new Error('ListCities returned no cities');
  return { cities };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function ({ cities }) {
  group('ListCities', () => {
    graphql('ListCities');
    sleep(1);
  });

  group('ListRoutes', () => {
    graphql('ListRoutes');
    sleep(1);
  });

  group('SearchRides', () => {
    const origin = pick(cities);
    let destination = pick(cities);
    while (destination === origin) destination = pick(cities);
    const dayOffset = Math.floor(Math.random() * 14);
    graphql('SearchRides', {
      origin,
      destination,
      date: new Date(Date.now() + dayOffset * 86400000).toISOString().split('T')[0],
      seats: 1,
    });
    sleep(2);
  });

  group('Health', () => {
    const res = http.get(`${BASE_URL}/health`, { tags: { operation: 'Health' }, timeout: '10s' });
    check(res, { 'health status 200': (r) => r.status === 200 });
    sleep(1);
  });
}
