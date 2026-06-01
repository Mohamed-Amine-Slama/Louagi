import http from 'http';

const API_URL = 'http://127.0.0.1:3000/graphql';
const TOTAL_REQUESTS = 1000;
const CONCURRENCY = 50;

async function fetchGraphQL(operationName) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      operationName,
      variables: {},
      query: `query ${operationName}($input: JSON) { ${operationName}(input: $input) }`
    });

    const req = http.request(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve();
        else reject(new Error(`Status ${res.statusCode}`));
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runLoadTest() {
  console.log(`\n--- Running Heavy Load Test ---`);
  console.log(`Target: ${API_URL}`);
  console.log(`Requests: ${TOTAL_REQUESTS}`);
  console.log(`Concurrency: ${CONCURRENCY}`);

  const start = Date.now();
  let completed = 0;
  let errors = 0;

  async function worker() {
    while (completed + errors < TOTAL_REQUESTS) {
      try {
        await fetchGraphQL('ListCities');
        completed++;
      } catch (e) {
        errors++;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }).map(() => worker());
  await Promise.all(workers);

  const duration = (Date.now() - start) / 1000;
  console.log(`\nResults:`);
  console.log(`Time taken: ${duration.toFixed(2)}s`);
  console.log(`Successful: ${completed}`);
  console.log(`Failed: ${errors}`);
  console.log(`RPS: ${(TOTAL_REQUESTS / duration).toFixed(2)} req/sec`);

  if (errors > TOTAL_REQUESTS * 0.1) {
    throw new Error('Too many errors during load test. Backend might be crashing.');
  }
}

runLoadTest().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});
