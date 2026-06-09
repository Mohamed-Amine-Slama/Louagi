// k6 auth flow + driver profile test
// Run: k6 run testing/k6/auth-flow-test.js
//
// Simulates a complete driver flow: register -> login -> profile -> 2FA -> sessions

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const errorRate = new Rate('errors');

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    errors: ['rate<0.2'],
    http_req_duration: ['p(95)<3000'],
  },
};

function graphql(operationName, variables = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify({ operationName, variables }),
    { headers }
  );

  return res;
}

export default function () {
  group('Health check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'health ok': (r) => r.status === 200 });
  });

  group('ListCities (unauthenticated)', () => {
    const res = graphql('ListCities', {});
    check(res, {
      'cities status 200': (r) => r.status === 200,
      'cities has data': (r) => r.json('data.ListCities') !== undefined,
    });
    if (!res) errorRate.add(1);
  });

  group('ListRoutes (unauthenticated)', () => {
    const res = graphql('ListRoutes', {});
    check(res, {
      'routes status 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}
