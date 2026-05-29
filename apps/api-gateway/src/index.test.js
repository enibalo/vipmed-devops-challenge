const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const { app, server } = require('./index');

const makeRequest = (path, method = 'GET') => {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port: server.address().port, path, method },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
};

describe('API Gateway', () => {
  after(() => {
    server.close();
  });

  it('GET /health should return healthy status', async () => {
    const res = await makeRequest('/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'api-gateway');
  });

  it('GET /health/live should return alive', async () => {
    const res = await makeRequest('/health/live');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'alive');
  });

  it('GET /unknown should return 404', async () => {
    const res = await makeRequest('/unknown');
    assert.strictEqual(res.statusCode, 404);
  });
});
