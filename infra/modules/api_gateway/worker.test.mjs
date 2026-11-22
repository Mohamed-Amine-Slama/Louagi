// node --test infra/modules/api_gateway/worker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

const env = { GATEWAY_SECRET: 's3cret' };
const url = 'https://admin-api.example.com';
let forwarded;
globalThis.fetch = async (req) => { forwarded = req; return new Response('ok'); };

test('stamps POST /graphql with the gateway secret and keeps auth + body', async () => {
  const res = await worker.fetch(new Request(`${url}/graphql`, {
    method: 'POST',
    headers: { authorization: 'Bearer t', 'x-louagi-gateway': 'forged' },
    body: '{"query":"{ Me }"}',
  }), env);
  assert.equal(res.status, 200);
  assert.equal(forwarded.headers.get('x-louagi-gateway'), 's3cret');
  assert.equal(forwarded.headers.get('authorization'), 'Bearer t');
  assert.equal(await forwarded.text(), '{"query":"{ Me }"}');
});

test('lets the CORS preflight through', async () => {
  const res = await worker.fetch(new Request(`${url}/graphql`, { method: 'OPTIONS' }), env);
  assert.equal(res.status, 200);
});

test('rejects other methods and paths without reaching the API', async () => {
  forwarded = null;
  assert.equal((await worker.fetch(new Request(`${url}/graphql`), env)).status, 405);
  assert.equal((await worker.fetch(new Request(`${url}/health`), env)).status, 404);
  assert.equal(forwarded, null);
});
